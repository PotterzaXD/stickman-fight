import { BOSS_TEAM, Game, TEAM_COLORS, type FighterSpec, type MatchResult } from '../game/game';
import { achName, grant, type AchievementId } from '../achievements';
import type { BossKind } from '../game/types';
import { WEAPONS } from '../game/weapons';
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
  const sandbox = match.mode === 'sandbox';
  // Sandbox lets you try any weapon you can own.
  const pool = sandbox ? WEAPONS.filter((w) => w.special !== 'boss').map((w) => w.id) : owned;
  return match.slots.map((s, i) => ({
    name: looks[i].name,
    // Sandbox: team colours, so you can see who is on which side.
    color: sandbox ? TEAM_COLORS[s.team] ?? TEAM_COLORS[0] : looks[i].color,
    team: match.mode === 'team' || sandbox ? s.team : isBossMode(match.mode) ? 0 : i,
    human: s.kind === 'human',
    weapon: s.weapon === 'random' ? pool[Math.floor(Math.random() * pool.length)] : s.weapon,
    difficulty: s.difficulty,
    playerIndex: looks[i].playerIndex,
    hp: sandbox ? s.hp : undefined,
    power: sandbox ? s.power : undefined,
  }));
}

/** Boss names in this device's language. */
export function bossNames(): Record<BossKind, string> {
  return { boss: t('boss_name'), cat: t('cat_name'), mascot: t('mascot_name'), buffalo: t('buffalo_name'), fish: t('fish_name') };
}

export function bossNameFor(mode: Mode): string {
  return t(mode === 'mascot' ? 'mascot_name' : mode === 'cat' ? 'cat_name' : mode === 'buffalo' ? 'buffalo_name' : 'boss_name');
}


/** Coins for beating the bosses: 500 for each boss. Grandfather Cat: 1,000. */
export const BOSS_COINS = 500;
export const CAT_COINS = 1000;
export const MASCOT_COINS = 5000;
export const BUFFALO_COINS = 3000;
export const FISH_COINS = 1000;

export interface RewardInfo {
  mode: Mode;
  won: boolean;
  bosses: number;
  /** The Beach: the Fishy boss was beaten. */
  fish?: boolean;
  /** Only one stickman (this device's player) fought. */
  solo?: boolean;
  /** Sandbox: a Mascot was in the match and your side beat it. */
  sandboxMascot?: boolean;
  /** Boss Fight on the Beach (the bosses were on your side). */
  beachBoss?: boolean;
}

/**
 * Give this device its coins after a match (and The Grandfather Cat Treasure the first time
 * Grandfather Cat is beaten), plus any achievements. Returns the lines to show on the result screen.
 */
export function giveReward(r: RewardInfo): HTMLElement[] {
  const { mode, won, bosses } = r;
  if (mode === 'sandbox') {
    // Sandbox never changes your coins.
    const stick = won && !!r.sandboxMascot && !save.data.owned.includes('mascotstick');
    if (stick) save.update((d) => d.owned.push('mascotstick'));
    const out: HTMLElement[] = [h('p', { class: 'muted' }, `🧪 ${t('sbNoCoins')}`)];
    if (stick) out.push(h('p', { class: 'treasure-got' }, t('mascotStickGot')), ...achLines(grant([])));
    return out;
  }
  // On the Beach your bosses were on your side: beating the Fishy boss is what pays.
  const beachBoss = mode === 'boss' && !!r.beachBoss;
  let coins = !won
    ? 1
    : mode === 'mascot'
    ? MASCOT_COINS
    : mode === 'cat'
    ? CAT_COINS
    : mode === 'buffalo'
    ? BUFFALO_COINS
    : mode === 'boss'
    ? beachBoss
      ? 0
      : BOSS_COINS * bosses
    : 3 + Math.floor(Math.random() * 3);
  if (r.fish) coins += FISH_COINS;
  const treasure = won && mode === 'cat' && !save.data.owned.includes('treasure');
  const stick = won && mode === 'mascot' && !save.data.owned.includes('mascotstick');
  save.update((d) => {
    d.coins += coins;
    if (treasure) d.owned.push('treasure');
    if (stick) d.owned.push('mascotstick');
  });
  const ach: AchievementId[] = [];
  if (won && mode === 'boss' && !beachBoss) ach.push('bossBeat');
  if (won && mode === 'cat') ach.push('catBeat');
  if (won && mode === 'mascot') ach.push('mascotBeat');
  if (won && mode === 'mascot' && r.solo) ach.push('buffalo');
  if (won && mode === 'buffalo') ach.push('buffaloBeat');
  if (r.fish) ach.push('fishBeat');
  const fresh = grant(ach);
  setTimeout(() => sfx.coin(), 400);
  const out: HTMLElement[] = [h('p', { class: 'coins-earned' }, `🪙 ${t('coinsEarned', { n: coins })}`, h('small', {}, ` (${save.data.coins})`))];
  if (r.fish) out.push(h('p', { class: 'treasure-got' }, t('fishCoins')));
  if (treasure) out.push(h('p', { class: 'treasure-got' }, t('treasureGot')));
  if (stick) out.push(h('p', { class: 'treasure-got' }, t('mascotStickGot')));
  out.push(...achLines(fresh));
  return out;
}

function achLines(ids: AchievementId[]): HTMLElement[] {
  return ids.map((id) => h('p', { class: 'treasure-got' }, t('achNew', { name: achName(id) })));
}

export function resultTitle(r: Pick<MatchResult, 'mode' | 'winnerTeam' | 'winners'>, bosses = 1, beach = false): string {
  // The Beach: the Fishy boss won, or (Boss Fight) it was beaten.
  if (beach && r.winnerTeam === BOSS_TEAM) return t('fishWon');
  if (beach && r.mode === 'boss') return t('fishDefeated');
  if (r.mode === 'buffalo') return r.winnerTeam === BOSS_TEAM ? t('buffaloWon') : t('buffaloDefeated');
  if (r.mode === 'mascot') return r.winnerTeam === BOSS_TEAM ? t('mascotWon') : t('mascotDefeated');
  if (r.mode === 'cat') return r.winnerTeam === BOSS_TEAM ? t('catWon') : t('catDefeated');
  if (r.mode === 'boss') return r.winnerTeam === BOSS_TEAM ? t(bosses > 1 ? 'bossesWon' : 'bossWon') : t(bosses > 1 ? 'bossesDefeated' : 'bossDefeated');
  if (r.winnerTeam === null || (!r.winners.length && r.mode !== 'sandbox')) return t('draw');
  if (r.mode === 'team' || (r.mode === 'sandbox' && r.winners.length !== 1)) return t('teamWins', { name: teamName(r.winnerTeam) });
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

  const back = () => (fromEditor ? go('editor', { map: fromEditor }) : match.mode === 'sandbox' ? go('sandbox') : go('menu'));

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
    const humans = game.fighters.filter((f) => !f.boss);
    const reward = giveReward({
      mode: r.mode,
      won: r.humanWon,
      bosses,
      fish: r.fish,
      beachBoss: game.beach && r.mode === 'boss',
      solo: humans.length === 1 && humans[0].human,
      sandboxMascot: game.fighters.some((f) => f.mascot && !f.alive && f.team !== r.winnerTeam),
    });
    const ranked = [...game.fighters].sort((a, b) => Number(b.alive) - Number(a.alive) || b.kos - a.kos);
    overlay.replaceChildren(
      h(
        'div',
        { class: 'modal result' },
        h('h2', {}, resultTitle(r, bosses, game.beach)),
        ...reward,
        h(
          'ul',
          { class: 'scores' },
          ...ranked.map((f) => h('li', {}, h('span', { class: 'dot', style: `background:${f.color}` }), h('b', {}, f.name), h('span', { class: 'muted' }, `${f.alive ? '🏆' : '💀'} ${f.kos} KO`))),
        ),
        h('div', { class: 'row gap center' }, h('button', { class: 'btn ghost', onclick: back }, fromEditor || match.mode === 'sandbox' ? `← ${t('back')}` : t('menu')), h('button', { class: 'btn big primary', onclick: () => start() }, `🔄 ${t('playAgain')}`)),
      ),
    );
    overlay.classList.remove('hidden');
  };

  const start = () => {
    hidePause();
    sticks?.destroy();
    game = new Game(map, buildSpecs(match), {
      mode: match.mode,
      fallMode: save.data.settings.fallMode,
      bossName: bossNameFor(match.mode),
      bossNames: bossNames(),
      bosses: match.bosses,
      potions: save.data.settings.potions,
      extraBosses: match.mode === 'sandbox' ? match.extraBosses : undefined,
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
