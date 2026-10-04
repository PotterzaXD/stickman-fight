import { normalize, save, type SaveData } from './save';

/**
 * Optional Google sign-in + online save (Firebase).
 * Works only when the VITE_FIREBASE_* settings are present; otherwise the game saves on this device only.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const cloudEnabled = Boolean(config.apiKey && config.projectId && config.authDomain);

export interface CloudUser {
  name: string;
  email: string;
}

type Fb = {
  auth: import('firebase/auth').Auth;
  db: import('firebase/firestore').Firestore;
  authMod: typeof import('firebase/auth');
  fsMod: typeof import('firebase/firestore');
};

let fb: Fb | null = null;
let uid: string | null = null;
let user: CloudUser | null = null;
let pushTimer: number | undefined;
let applyingRemote = false;
const listeners: ((u: CloudUser | null) => void)[] = [];

export function currentUser() {
  return user;
}

export function onUserChange(l: (u: CloudUser | null) => void) {
  listeners.push(l);
}

async function load(): Promise<Fb> {
  if (fb) return fb;
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  const app = initializeApp(config as Record<string, string>);
  fb = { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
  return fb;
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
    updatedAt: Date.now(),
  };
}

async function pull() {
  if (!fb || !uid) return;
  const ref = fb.fsMod.doc(fb.db, 'saves', uid);
  const snap = await fb.fsMod.getDoc(ref);
  applyingRemote = true;
  if (snap.exists()) save.replace(merge(save.data, normalize(snap.data())));
  applyingRemote = false;
  await push();
}

async function push() {
  if (!fb || !uid) return;
  const ref = fb.fsMod.doc(fb.db, 'saves', uid);
  // Firestore rejects undefined values; JSON round-trip drops them.
  await fb.fsMod.setDoc(ref, JSON.parse(JSON.stringify(save.data)));
}

export async function initCloud() {
  if (!cloudEnabled) return;
  try {
    const f = await load();
    await f.authMod.getRedirectResult(f.auth).catch(() => null);
    f.authMod.onAuthStateChanged(f.auth, (u) => {
      uid = u?.uid ?? null;
      user = u ? { name: u.displayName ?? u.email ?? 'Player', email: u.email ?? '' } : null;
      for (const l of listeners) l(user);
      if (u) void pull().catch((e) => console.warn('cloud pull failed', e));
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
  const f = await load();
  const provider = new f.authMod.GoogleAuthProvider();
  try {
    await f.authMod.signInWithPopup(f.auth, provider);
    return true;
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    if (code.includes('popup-blocked') || code.includes('operation-not-supported')) {
      await f.authMod.signInWithRedirect(f.auth, provider);
      return true;
    }
    if (code.includes('popup-closed') || code.includes('cancelled-popup')) return false;
    throw e;
  }
}

export async function signOut() {
  if (!fb) return;
  await fb.authMod.signOut(fb.auth);
}
