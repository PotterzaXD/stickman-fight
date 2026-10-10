import { ALL_OWNABLE } from './game/weapons';
import { t, type Key } from './i18n';
import { save } from './save';

/** Every achievement, in the order the Achievements screen shows them. */
export const ACHIEVEMENTS = ['buffalo', 'allWeapons', 'bossBeat', 'catBeat', 'mascotBeat', 'buffaloBeat', 'fishBeat'] as const;
export type AchievementId = (typeof ACHIEVEMENTS)[number];

export const achName = (id: AchievementId) => t(`ach.${id}` as Key);
export const achDesc = (id: AchievementId) => t(`achd.${id}` as Key);
export const hasAch = (id: AchievementId) => save.data.achievements.includes(id);

/** Give these achievements (and Collector if every weapon is owned). Returns the ones that are new. */
export function grant(ids: AchievementId[]): AchievementId[] {
  const want = [...ids];
  if (ALL_OWNABLE.every((w) => save.data.owned.includes(w.id))) want.push('allWeapons');
  const fresh = Array.from(new Set(want)).filter((id) => !hasAch(id));
  if (fresh.length) save.update((d) => d.achievements.push(...fresh));
  return fresh;
}
