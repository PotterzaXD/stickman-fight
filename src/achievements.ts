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
] as const;
export type AchievementId = (typeof ACHIEVEMENTS)[number];

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
  const fresh = Array.from(new Set(want)).filter((id) => !hasAch(id));
  if (fresh.length) save.update((d) => d.achievements.push(...fresh));
  return fresh;
}
