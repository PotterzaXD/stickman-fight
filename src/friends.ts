import type { RealtimeChannel } from '@supabase/supabase-js';
import { cloudEnabled, currentUid, currentUser, onUserChange, supabase } from './cloud';
import { t } from './i18n';
import { session, setSession } from './net/room';
import { save } from './save';
import { sfx } from './sfx';
import { h } from './ui/dom';
import { go } from './ui/router';

/**
 * Friends (only for players signed in with Google): a friend code, who is online, and room invites.
 * Everything goes through the sf_* functions in supabase/setup.sql, so nobody can read other players' data.
 */

export interface Friend {
  id: string;
  name: string;
  code: string;
  online: boolean;
}

export type AddResult = 'ok' | 'notFound' | 'self' | 'failed';
export type InviteResult = 'ok' | 'wait' | 'failed';

interface InviteRow {
  id: number;
  from_name: string;
  room_code: string;
  created_at: string;
}

/** "I'm online" ping. Friends seen in the last 2.5 minutes count as online (worked out by the server). */
const BEAT_MS = 60_000;
/** Invites older than this are ignored. */
const INVITE_MS = 120_000;

let activeUid: string | null = null;
let myCode = '';
let friends: Friend[] = [];
let missing = false;
let beat: number | undefined;
let inviteCh: RealtimeChannel | null = null;
const shown = new Set<number>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((f) => f());
const warn = (e: unknown) => console.warn('friends', e);

/** Friends need Google sign-in. */
export function canUseFriends() {
  return cloudEnabled && !!currentUid();
}

/** The database part of friends has not been set up yet (supabase/setup.sql). */
export function friendsMissing() {
  return missing;
}

export function myFriendCode() {
  return myCode;
}

export function friendList(): Friend[] {
  return friends;
}

export function onFriendsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function normalizeFriendCode(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function check(error: { code?: string } | null) {
  if (!error) return;
  // PGRST202: function not found. 42P01: table not found.
  if (error.code === 'PGRST202' || error.code === '42P01' || error.code === '42883') {
    missing = true;
    emit();
  }
  throw error;
}

async function heartbeat() {
  if (!currentUid() || document.hidden) return;
  const name = save.data.name || currentUser()?.name.split(' ')[0] || '';
  const { data, error } = await supabase().rpc('sf_me', { p_name: name });
  check(error);
  missing = false;
  if (typeof data === 'string' && data !== myCode) {
    myCode = data;
    emit();
  }
  await checkInvites();
}

export async function refreshFriends() {
  if (!currentUid()) return;
  const { data, error } = await supabase().rpc('sf_friends');
  check(error);
  const rows = (data ?? []) as { friend_id: string; name: string; friend_code: string; online: boolean }[];
  friends = rows
    .map((r) => ({ id: r.friend_id, name: r.name || '?', code: r.friend_code, online: !!r.online }))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  emit();
}

export async function addFriend(code: string): Promise<AddResult> {
  try {
    if (!myCode) await heartbeat();
    const { data, error } = await supabase().rpc('sf_add_friend', { p_code: normalizeFriendCode(code) });
    check(error);
    if (data === 'ok') await refreshFriends();
    return data === 'ok' || data === 'notFound' || data === 'self' ? data : 'failed';
  } catch (e) {
    warn(e);
    return 'failed';
  }
}

export async function removeFriend(id: string) {
  try {
    const { error } = await supabase().rpc('sf_remove_friend', { p_friend: id });
    check(error);
    await refreshFriends();
  } catch (e) {
    warn(e);
  }
}

export async function inviteFriend(id: string, room: string): Promise<InviteResult> {
  try {
    const { data, error } = await supabase().rpc('sf_invite', { p_friend: id, p_room: room });
    check(error);
    return data === 'ok' || data === 'wait' ? data : 'failed';
  } catch (e) {
    warn(e);
    return 'failed';
  }
}

// ---------- receiving invites ----------

async function checkInvites() {
  if (!currentUid()) return;
  const { data, error } = await supabase()
    .from('invites')
    .select('id, from_name, room_code, created_at')
    .gt('created_at', new Date(Date.now() - INVITE_MS).toISOString());
  if (error) return;
  for (const r of (data ?? []) as InviteRow[]) showInvite(r);
}

function forget(id: number) {
  void supabase().from('invites').delete().eq('id', id).then(({ error }) => error && warn(error));
}

function showInvite(r: InviteRow) {
  if (shown.has(r.id)) return;
  shown.add(r.id);
  if (Date.now() - Date.parse(r.created_at) > INVITE_MS * 2) return forget(r.id);
  // Already in that room.
  if (session()?.state?.code === r.room_code) return forget(r.id);
  const close = (join: boolean) => {
    wrap.remove();
    forget(r.id);
    if (!join) return;
    setSession(null);
    go('online', { code: r.room_code });
  };
  const wrap = h(
    'div',
    { class: 'modal-wrap' },
    h(
      'div',
      { class: 'modal' },
      h('h2', {}, `👥 ${t('inviteTitle')}`),
      h('p', {}, t('invitedYou', { name: r.from_name || '?', code: r.room_code })),
      h('div', { class: 'row gap' }, h('button', { class: 'btn ghost', onclick: () => close(false) }, t('notNow')), h('button', { class: 'btn primary', onclick: () => close(true) }, `🚪 ${t('join')}`)),
    ),
  );
  document.body.append(wrap);
  sfx.snowman();
}

// ---------- start / stop with sign-in ----------

function start(uid: string) {
  if (uid === activeUid) return;
  stop();
  activeUid = uid;
  void heartbeat()
    .then(refreshFriends)
    .catch(warn);
  beat = window.setInterval(() => void heartbeat().catch(warn), BEAT_MS);
  inviteCh = supabase()
    .channel(`sf-invites-${uid}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invites', filter: `to_user=eq.${uid}` }, (p) => showInvite(p.new as InviteRow))
    .subscribe();
}

function stop() {
  if (!activeUid) return;
  activeUid = null;
  clearInterval(beat);
  if (inviteCh) void supabase().removeChannel(inviteCh);
  inviteCh = null;
  myCode = '';
  friends = [];
  emit();
}

export function initFriends() {
  if (!cloudEnabled) return;
  onUserChange(() => {
    // Not inside Supabase's auth callback.
    setTimeout(() => {
      const uid = currentUid();
      if (uid) start(uid);
      else stop();
    }, 0);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && activeUid) void heartbeat().catch(warn);
  });
}
