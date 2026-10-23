import { t, type Key } from '../i18n';
import { save } from '../save';
import { h } from './dom';
import { coinChip } from './menu';
import { go, register, type Routes } from './router';

/** The other versions of the game. Each runs in its own frame with its own money, and its exit button comes back here. */
const VERSIONS: { route: keyof Routes & ('stickbrawl' | 'worst' | 'worst2' | 'arena' | 'sf2'); icon: string; name: Key; desc: Key; cls: string; secret?: boolean }[] = [
  { route: 'stickbrawl', icon: '🥊', name: 'stickBrawl', desc: 'verStickBrawl', cls: 'stickbrawl' },
  { route: 'worst', icon: '🤪', name: 'worstGame', desc: 'verWorst', cls: 'worst' },
  { route: 'worst2', icon: '🤪', name: 'worst2Game', desc: 'verWorst2', cls: 'worst worst2' },
  { route: 'arena', icon: '🏟️', name: 'arenaGame', desc: 'verArena', cls: 'arena' },
  // Hidden until you go through the Portal map's portal.
  { route: 'sf2', icon: '🌀', name: 'sf2Game', desc: 'verSf2', cls: 'sf2', secret: true },
];

register('versions', (root) => {
  root.append(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, `🕹️ ${t('otherVersions')}`), coinChip()),
      h(
        'div',
        { class: 'page-body' },
        h('p', { class: 'muted' }, t('otherVersionsDesc')),
        h(
          'div',
          { class: 'versions' },
          ...VERSIONS.filter((v) => !v.secret || save.data.sf2).map((v) =>
            h(
              'button',
              { class: `version-card ${v.cls}`, onclick: () => go(v.route) },
              h('span', { class: 'version-icon' }, v.icon),
              h('span', {}, h('b', {}, t(v.name)), h('small', {}, t(v.desc))),
            ),
          ),
        ),
      ),
    ),
  );
});
