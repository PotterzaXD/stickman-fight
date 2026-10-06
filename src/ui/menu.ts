import { currentUser, cloudEnabled, onUserChange } from '../cloud';
import { BOT_COLORS, Game, type FighterSpec } from '../game/game';
import { BUILTIN_MAPS } from '../game/maps';
import type { Difficulty } from '../game/types';
import { SHOP_WEAPONS } from '../game/weapons';
import { t } from '../i18n';
import { save } from '../save';
import { h, shareLink } from './dom';
import { startLoop } from './loop';
import { go, register } from './router';

function demoGame(): Game {
  const map = BUILTIN_MAPS[Math.floor(Math.random() * BUILTIN_MAPS.length)];
  const diffs: Difficulty[] = ['medium', 'hard'];
  const specs: FighterSpec[] = Array.from({ length: 5 }, (_, i) => ({
    name: '',
    color: BOT_COLORS[i],
    team: i,
    human: false,
    weapon: SHOP_WEAPONS[Math.floor(Math.random() * SHOP_WEAPONS.length)].id,
    difficulty: diffs[i % 2],
    playerIndex: -1,
  }));
  return new Game(map, specs, { mode: 'ffa', fallMode: 'bounce', demo: true });
}

export function coinChip() {
  const el = h('div', { class: 'chip coin' }, `🪙 ${save.data.coins}`);
  return el;
}

/** Who made the game. */
function showCredits() {
  const row = (role: string, name: string) => h('div', { class: 'credit-row' }, h('small', { class: 'muted' }, role), h('b', {}, name));
  const wrap = h(
    'div',
    { class: 'modal-wrap' },
    h(
      'div',
      { class: 'modal credits' },
      h('h2', {}, `⭐ ${t('credits')}`),
      row(t('creditCreator'), 'Taratorn'),
      row(t('creditHelper'), 'PotterzaXD'),
      h('button', { class: 'btn primary', onclick: () => wrap.remove() }, t('close')),
    ),
  );
  document.body.append(wrap);
}

export function shareGame() {
  void shareLink(location.origin + location.pathname, t('title'), t('shareText'), t('linkCopied'));
}

register('menu', (root) => {
  const canvas = h('canvas', { class: 'bg-canvas' });
  let game = demoGame();
  let restartAt = 0;
  game.onOver = () => (restartAt = performance.now() + 1500);
  const loop = startLoop(canvas, () => {
    if (restartAt && performance.now() > restartAt) {
      restartAt = 0;
      game = demoGame();
      game.onOver = () => (restartAt = performance.now() + 1500);
    }
    return game;
  });

  const account = h('button', { class: 'chip', onclick: () => go('settings') });
  const paintAccount = () => {
    const u = currentUser();
    account.textContent = u ? `👤 ${u.name.split(' ')[0]}` : '👤';
    account.style.display = cloudEnabled || u ? '' : 'none';
  };
  paintAccount();
  onUserChange(paintAccount);

  root.append(
    canvas,
    h(
      'div',
      { class: 'menu' },
      h('div', { class: 'topbar' }, coinChip(), h('div', { class: 'spacer' }), account, h('button', { class: 'chip', onclick: shareGame }, `🔗 ${t('share')}`)),
      h(
        'div',
        { class: 'menu-center' },
        h('h1', { class: 'logo' }, t('title')),
        h('p', { class: 'tagline' }, t('tagline')),
        h(
          'div',
          { class: 'menu-buttons' },
          h('button', { class: 'btn big primary', onclick: () => go('lobby') }, `⚔️ ${t('play')}`),
          h('button', { class: 'btn big online with-friends', onclick: () => go('online') }, `🌐 ${t('online')}`),
          h('button', { class: 'btn big friends', onclick: () => go('friends') }, `👥 ${t('friends')}`),
          h('button', { class: 'btn big', onclick: () => go('shop') }, `🛒 ${t('shop')}`),
          h('button', { class: 'btn big', onclick: () => go('maps') }, `🗺️ ${t('editor')}`),
          h('button', { class: 'btn big', onclick: () => go('settings') }, `⚙️ ${t('settings')}`),
        ),
        h('details', { class: 'howto' }, h('summary', {}, t('howTo')), h('p', {}, t('howToText'))),
        h('button', { class: 'chip credits-btn', onclick: showCredits }, `⭐ ${t('credits')}`),
      ),
    ),
  );
  return () => loop.stop();
});
