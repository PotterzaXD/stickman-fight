import { ACHIEVEMENTS, achDesc, achName, grant, hasAch } from '../achievements';
import { t } from '../i18n';
import { h } from './dom';
import { coinChip } from './menu';
import { go, register } from './router';

register('achievements', (root) => {
  // Catch up on Collector for weapons owned before achievements existed.
  grant([]);
  const done = ACHIEVEMENTS.filter(hasAch).length;
  const list = h(
    'div',
    { class: 'ach-list' },
    ...ACHIEVEMENTS.map((id) =>
      h(
        'div',
        { class: `ach ${hasAch(id) ? 'have' : ''}` },
        h('span', { class: 'ach-icon' }, hasAch(id) ? '🏆' : '🔒'),
        h('div', {}, h('b', {}, achName(id)), h('p', { class: 'muted small' }, achDesc(id))),
      ),
    ),
  );
  root.append(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, `🏆 ${t('achievements')}`), coinChip()),
      h('div', { class: 'page-body narrow' }, h('section', {}, h('p', { class: 'muted' }, t('achDone', { n: done, total: ACHIEVEMENTS.length })), list)),
    ),
  );
});
