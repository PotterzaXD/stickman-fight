import { ALL_OWNABLE, WEAPONS } from './game/weapons';
import type { SecretKind } from './game/types';
import { t, type Key } from './i18n';
import { save } from './save';

/** Every achievement, in the order the Achievements screen shows them. */
export const ACHIEVEMENTS = [
  'buffalo',
  'allWeapons',
  'bossBeat',
  'catBeat',
  'mascotBeat',
  'buffaloBeat',
  'fishBeat',
  'pigeonBeat',
  'firstWin',
  'untouched',
  'lastBreath',
  'speedRunner',
  'teamPlayer',
  'perfectAim',
  'patience',
  'collector2',
  'trueChallenger',
  'winterWarrior',
  'oceanConqueror',
  'forestProtector',
  'getTricked',
  'greatJobBud',
  'kingOfHill',
  'raceWinner',
  'rockOn',
  'halfway',
  'rushDone',
  'lastLife',
] as const;
/** PHYLISHIEUS badges: one for each phase beaten. They don't count toward the 28 that wake him up. */
export const PHYL_BADGES = ['phylBeat1', 'phylBeat2', 'phylBeat3'] as const;
export type BadgeId = (typeof PHYL_BADGES)[number];
export type AchievementId = (typeof ACHIEVEMENTS)[number] | BadgeId;
/** Everything on the Achievements screen (the 28 plus the badges). */
export const ALL_ACH: AchievementId[] = [...ACHIEVEMENTS, ...PHYL_BADGES];
export const achTotal = () => ALL_ACH.length;
export const achHave = () => ALL_ACH.filter((id) => save.data.achievements.includes(id)).length;

/** PHYLISHIEUS wakes up once every achievement is done, and leaves for good (to Sandbox) once phase 2 is beaten. */
export const achDoneCount = () => (ACHIEVEMENTS as readonly string[]).filter((id) => save.data.achievements.includes(id)).length;
export const phylOpen = () => achDoneCount() >= ACHIEVEMENTS.length && !save.data.phyl.done;
/** The Tome Key: PHYLISHIEUS's final phase beaten and every achievement (badges too). It opens PHYLISHIEUS refights and 1D, for good. */
export const hasKey = () => save.data.phyl.key;
/** Get the key once you've earned it. Returns true the moment it's new. */
export function checkKey(): boolean {
  if (save.data.phyl.key || !save.data.phyl.done || achHave() < achTotal()) return false;
  save.update((d) => (d.phyl.key = true));
  return true;
}
/** The boss with your name: once PHYLISHIEUS's final phase is beaten. */
export const meOpen = () => save.data.phyl.done;
/** Locked: still shows as ??? (until the mode is gone). */
export const phylLocked = () => achDoneCount() < ACHIEVEMENTS.length && !save.data.phyl.done;

/** Achievements for the secret bosses stay hidden until that boss is unlocked (no spoilers). */
export const SECRET_ACH: Partial<Record<AchievementId, SecretKind>> = { winterWarrior: 'queen', oceanConqueror: 'tide', forestProtector: 'guardian' };

export const achName = (id: AchievementId) => t(`ach.${id}` as Key);
export const achDesc = (id: AchievementId) => t(`achd.${id}` as Key);
export const hasAch = (id: AchievementId) => save.data.achievements.includes(id);
export const achHidden = (id: AchievementId) => !hasAch(id) && !!SECRET_ACH[id] && !save.data.secrets.includes(SECRET_ACH[id]!);

/** Every weapon you can fight with in Sandbox (shop and rewards). */
const FIGHT_WEAPONS = WEAPONS.filter((w) => w.special !== 'boss').map((w) => w.id);

/** Give these achievements (plus the ones that come from what you own). Returns the ones that are new. */
export function grant(ids: AchievementId[]): AchievementId[] {
  const want = [...ids];
  if (ALL_OWNABLE.every((w) => save.data.owned.includes(w.id))) want.push('allWeapons');
  if (FIGHT_WEAPONS.every((id) => save.data.stats.usedWeapons.includes(id))) want.push('collector2');
  // A badge for every PHYLISHIEUS phase beaten (also for saves from before the badges).
  PHYL_BADGES.forEach((id, i) => save.data.phyl.beat > i && want.push(id));
  const fresh = Array.from(new Set(want)).filter((id) => !hasAch(id));
  if (fresh.length) save.update((d) => d.achievements.push(...fresh));
  return fresh;
}
