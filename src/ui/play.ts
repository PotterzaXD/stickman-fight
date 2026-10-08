import { BOSS_TEAM, Game, type FighterSpec, type MatchResult } from '../game/game';
import { JoystickManager } from '../game/input';
import { allMaps } from '../game/maps';
import { isBossMode, type MatchConfig, type Mode } from '../game/types';
import { t, teamName } from '../i18n';
import { save } from '../save';
import { sfx } from '../sfx';
import { h } from './dom';
import { slotLooks } from './lobby';
import { startLoop } from './loop';
import { go, register } from './router';

function buildSpecs(match: MatchConfig): FighterSpec[] {
  const owned = save.data.owned;
  const looks = slotLooks(match);
  return match.slots.map((s, i) => ({
    name: looks[i].name,
    color: looks[i].color,
    team: match.mode === 'team' ? s.team : isBossMode(match.mode) ? 0 : i,
    human: s.kind === 'human',
    weapon: s.weapon === 'random' ? owned[Math.floor(Math.random() * owned.length)] : s.weapon,
    difficulty: s.difficulty,
    playerIndex: looks[i].playerIndex,
  }));
}

/** Coins for beating the bosses: 500 for each boss. Grandfather Cat: 1,000. */
export const BOSS_COINS = 500;
export const CAT_COINS = 1000;
export const MASCOT_COINS = 5000;

/**
 * Give this device its coins after a match (and The Grandfather Cat Treasure the first time
 * Grandfather Cat is beaten). Returns the lines to show on the result screen.
 */
export function giveReward(mode: Mode, won: boolean, bosses: number): HTMLElement[] {
  const coins = !won ? 1 : mode === 'mascot' ? MASCOT_COINS : mode === 'cat' ? CAT_COINS : mode === 'boss' ? BOSS_COINS * bosses : 3 + Math.floor(Math.random() * 3);
  const treasure = won && mode === 'cat' && !save.data.owned.includes('treasure');
  const stick = won && mode === 'mascot' && !save.data.owned.includes('mascotstick');
  save.update((d) => {
    d.coins += coins;
    if (treasure) d.owned.push('treasure');
    if (stick) d.owned.push('mascotstick');
  });
  setTimeout(() => sfx.coin(), 400);
  const out = [h('p', { class: 'coins-earned' }, `🪙 ${t('coinsEarned', { n: coins })}`, h('small', {}, ` (${save.data.coins})`))];
  if (treasure) out.push(h('p', { class: 'treasure-got' }, t('treasureGot')));
  if (stick) out.push(h('p', { class: 'treasure-got' }, t('mascotStickGot')));
  return out;
}

export function resultTitle(r: Pick<MatchResult, 'mode' | 'winnerTeam' | 'winners'>, bosses = 1): string {
  if (r.mode === 'mascot') return r.winnerTeam === BOSS_TEAM ? t('mascotWon') : t('mascotDefeated');
  if (r.mode === 'cat') return r.winnerTeam === BOSS_TEAM ? t('catWon') : t('catDefeated');
  if (r.mode === 'boss') return r.winnerTeam === BOSS_TEAM ? t(bosses > 1 ? 'bossesWon' : 'bossWon') : t(bosses > 1 ? 'bossesDefeated' : 'bossDefeated');
  if (r.winnerTeam === null || !r.winners.length) return t('draw');
  if (r.mode === 'team') return t('teamWins', { name: teamName(r.winnerTeam) });
  return t('wins', { name: r.winners[0].name });
}

register('play', (root, { match, fromEditor }) => {
  const map = fromEditor ?? allMaps(save.data.customMaps).find((m) => m.id === match.mapId) ?? allMaps([])[0];
  let paused = false;
  let game!: Game;
  let sticks: JoystickManager | null = null;

  const canvas = h('canvas', { class: 'game-canvas' });
  const overlay = h('div', { class: 'overlay hidden' });
  root.append(h('div', { class: 'play' }, canvas, overlay));

  const back = () => (fromEditor ? go('editor', { map: fromEditor }) : go('menu'));

  const showPause = () => {
    if (game.over) return;
    paused = true;
    sfx.click();
    overlay.replaceChildren(
      h(
        'div',
        { class: 'modal' },
        h('h2', {}, `⏸ ${t('pause')}`),
        h('p', { class: 'muted small' }, t('howToText')),
        h(
          'div',
          { class: 'col gap' },
          h('button', { class: 'btn big primary', onclick: hidePause }, `▶ ${t('resume')}`),
          h('button', { class: 'btn', onclick: () => start() }, `🔄 ${t('restart')}`),
          h('button', { class: 'btn ghost', onclick: back }, `🚪 ${t('quit')}`),
        ),
      ),
    );
    overlay.classList.remove('hidden');
  };

  const hidePause = () => {
    paused = false;
    overlay.classList.add('hidden');
  };

  const showResult = (r: MatchResult) => {
    // Win: 3-5 coins (bosses: 500 each, Grandfather Cat: 1,000 + the Treasure). Bots (or the boss) win: 1 coin.
    const bosses = game.bosses.length;
    const reward = giveReward(r.mode, r.humanWon, bosses);
    const ranked = [...game.fighters].sort((a, b) => Number(b.alive) - Number(a.alive) || b.kos - a.kos);
    overlay.replaceChildren(
      h(
        'div',
        { class: 'modal result' },
        h('h2', {}, resultTitle(r, bosses)),
        ...reward,
        h(
          'ul',
          { class: 'scores' },
          ...ranked.map((f) => h('li', {}, h('span', { class: 'dot', style: `background:${f.color}` }), h('b', {}, f.name), h('span', { class: 'muted' }, `${f.alive ? '🏆' : '💀'} ${f.kos} KO`))),
        ),
        h('div', { class: 'row gap center' }, h('button', { class: 'btn ghost', onclick: back }, fromEditor ? `← ${t('back')}` : t('menu')), h('button', { class: 'btn big primary', onclick: () => start() }, `🔄 ${t('playAgain')}`)),
      ),
    );
    overlay.classList.remove('hidden');
  };

  const start = () => {
    hidePause();
    sticks?.destroy();
    game = new Game(map, buildSpecs(match), { mode: match.mode, fallMode: save.data.settings.fallMode, bossName: t(match.mode === 'mascot' ? 'mascot_name' : match.mode === 'cat' ? 'cat_name' : 'boss_name'),
      bosses: match.bosses,
      potions: save.data.settings.potions,
    });
    game.onOver = showResult;
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
    const humans = game.fighters.filter((f) => f.human);
    sticks = new JoystickManager(
      canvas,
      humans.map((f) => ({ color: f.color, label: f.name, hp: () => f.hp / f.maxHp })),
    );
    humans.forEach((f, i) => (f.ctrl = sticks!.sticks[i].state));
    sticks.onPause = showPause;
    const { w, h: hh } = loop.size();
    if (w) layout(w, hh);
  };

  const layout = (w: number, hh: number) => {
    sticks?.layout(w, hh);
    if (sticks) sticks.pauseRect = { x: w / 2 - 26, y: 4, w: 52, h: 46 };
  };

  const loop = startLoop(canvas, () => game, {
    paused: () => paused,
    onResize: layout,
    overlay: (ctx, w) => {
      sticks?.draw(ctx);
      // Pause button
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 22, 8, 44, 38, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(w / 2 - 8, 17, 5, 20);
      ctx.fillRect(w / 2 + 3, 17, 5, 20);
    },
  });
  start();

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyP') (paused ? hidePause : showPause)();
  };
  const onHide = () => {
    if (document.hidden && !game.over) showPause();
  };
  const noMenu = (e: Event) => e.preventDefault();
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
  canvas.addEventListener('contextmenu', noMenu);

  return () => {
    loop.stop();
    sticks?.destroy();
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
  };
});
