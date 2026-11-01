import { ACHIEVEMENTS, PHYL_BADGES, achDesc, achHave, achHidden, achName, achTotal, grant, hasAch, type AchievementId } from '../achievements';
import { t } from '../i18n';
import { save } from '../save';
import { h } from './dom';
import { coinChip } from './menu';
import { go, register } from './router';

register('achievements', (root) => {
  // Catch up on Collector for weapons owned before achievements existed.
  grant([]);
  const done = achHave();
  const row = (id: AchievementId, icon = '🏆') =>
      h(
        'div',
        { class: `ach ${hasAch(id) ? 'have' : ''}` },
        h('span', { class: 'ach-icon' }, hasAch(id) ? icon : achHidden(id) ? '❔' : '🔒'),
        achHidden(id)
          ? h('div', {}, h('b', {}, `??? (${t('secretAch')})`), h('p', { class: 'muted small' }, t('secretAchDesc')))
          : h('div', {}, h('b', {}, achName(id)), h('p', { class: 'muted small' }, achDesc(id))),
      );
  const list = h('div', { class: 'ach-list' }, ...ACHIEVEMENTS.map((id) => row(id)));
  // PHYLISHIEUS badges: they show once he has woken up (no spoilers before that).
  const woke = save.data.phyl.beat > 0 || ACHIEVEMENTS.every(hasAch);
  const badges = woke ? h('section', {}, h('h3', {}, `📖 ${t('badges')}`), h('div', { class: 'ach-list' }, ...PHYL_BADGES.map((id) => row(id, ['📖', '📕', '📜'][PHYL_BADGES.indexOf(id as never)])))) : null;
  root.append(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, `🏆 ${t('achievements')}`), coinChip()),
      h('div', { class: 'page-body narrow' }, h('section', {}, h('p', { class: 'muted' }, t('achDone', { n: done, total: achTotal() })), list), badges),
    ),
  );
});
