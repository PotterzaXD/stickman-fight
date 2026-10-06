import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanName, normalize, save, type SaveData } from './save';

/**
 * Google sign-in + online save + room signalling (Supabase).
 * The URL and publishable key are public by design; data is protected by row level security
 * (see supabase/setup.sql). Environment variables override them for a different project.
 */
const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://ifkotvvhauqqgsfiutyy.supabase.co';
const KEY = (import.meta.env.VITE_SUPABASE_KEY as string | undefined) || 'sb_publishable_pAKWgoKWvWD_ohhY5I6Eyw_orhCbjV-';

export const cloudEnabled = Boolean(URL && KEY);

export interface CloudUser {
  name: string;
  email: string;
}

let client: SupabaseClient | null = null;
let uid: string | null = null;
let user: CloudUser | null = null;
let pushTimer: number | undefined;
let applyingRemote = false;
const listeners: ((u: CloudUser | null) => void)[] = [];

export function supabase(): SupabaseClient {
  client ??= createClient(URL, KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
  return client;
}

export function currentUser() {
  return user;
}

/** Supabase user id while signed in with Google (friends use it). */
export function currentUid() {
  return uid;
}

export function onUserChange(l: (u: CloudUser | null) => void) {
  listeners.push(l);
}

/** Merge the device save with the online save so nothing bought is lost. */
function merge(local: SaveData, remote: SaveData): SaveData {
  const newer = remote.updatedAt >= local.updatedAt ? remote : local;
  const maps = new Map<string, SaveData['customMaps'][number]>();
  for (const m of [...local.customMaps, ...remote.customMaps]) maps.set(m.id, m);
  return {
    ...newer,
    owned: Array.from(new Set([...local.owned, ...remote.owned])),
    customMaps: [...maps.values()],
    name: newer.name || local.name || remote.name,
    updatedAt: Date.now(),
  };
}

async function pull() {
  if (!uid) return;
  const { data, error } = await supabase().from('saves').select('data').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  applyingRemote = true;
  if (data?.data) save.replace(merge(save.data, normalize(data.data)));
  applyingRemote = false;
  await push();
}

async function push() {
  if (!uid) return;
  const { error } = await supabase()
    .from('saves')
    .upsert({ user_id: uid, data: JSON.parse(JSON.stringify(save.data)), updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function initCloud() {
  if (!cloudEnabled) return;
  try {
    const sb = supabase();
    let lastUid: string | null = null;
    sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      uid = u?.id ?? null;
      const meta = (u?.user_metadata ?? {}) as Record<string, string>;
      user = u ? { name: meta.full_name || meta.name || u.email || 'Player', email: u.email ?? '' } : null;
      for (const l of listeners) l(user);
      if (u && uid !== lastUid) {
        // First sign-in: use the Google first name until the player picks one.
        if (!save.data.name && user) save.update((d) => (d.name = cleanName(user!.name.split(' ')[0])));
        // Run outside the auth callback (Supabase recommends not awaiting inside it).
        setTimeout(() => void pull().catch((e) => console.warn('cloud pull failed', e)), 0);
      }
      lastUid = uid;
    });
    save.onChange(() => {
      if (!uid || applyingRemote) return;
      clearTimeout(pushTimer);
      pushTimer = window.setTimeout(() => void push().catch((e) => console.warn('cloud save failed', e)), 1500);
    });
  } catch (e) {
    console.warn('cloud init failed', e);
  }
}

export async function signIn(): Promise<boolean> {
  if (!cloudEnabled) return false;
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
  return true;
}

export async function signOut() {
  await supabase().auth.signOut();
}
