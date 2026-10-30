import { t, type Key } from '../i18n';
import { h } from './dom';
import { coinChip } from './menu';
import { go, register } from './router';

/** Other fun modes: Stickman Infection and Random Events (normal fights with a twist, also online), The Outbreak and Tower Defense (they pay out in your Stickman Fight coins), and Stick Chef (its own Chef cash). */
const MODES: { route: 'outbreak' | 'td' | 'chef' | 'infection' | 'events'; icon: string; name: Key; desc: Key; cls: string }[] = [
  { route: 'infection', icon: '🦠', name: 'infection', desc: 'infectionShort', cls: 'fun-infection' },
  { route: 'events', icon: '🌪️', name: 'events', desc: 'eventsShort', cls: 'fun-events' },
  { route: 'outbreak', icon: '🧟', name: 'outbreak', desc: 'outbreakShort', cls: 'fun-outbreak' },
  { route: 'td', icon: '🏰', name: 'towerDefense', desc: 'towerDefenseDesc', cls: 'fun-td' },
  { route: 'chef', icon: '👨‍🍳', name: 'stickChef', desc: 'stickChefDesc', cls: 'fun-chef' },
];

register('funModes', (root) => {
  root.append(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, `🎉 ${t('funModes')}`), coinChip()),
      h(
        'div',
        { class: 'page-body' },
        h('p', { class: 'muted' }, t('funModesDesc')),
        h(
          'div',
          { class: 'versions' },
          ...MODES.map((m) =>
            h(
              'button',
              { class: `version-card ${m.cls}`, onclick: () => (m.route === 'infection' || m.route === 'events' ? go('lobby', { mode: m.route }) : go(m.route)) },
              h('span', { class: 'version-icon' }, m.icon),
              h('span', {}, h('b', {}, t(m.name)), h('small', {}, t(m.desc))),
            ),
          ),
        ),
      ),
    ),
  );
});
