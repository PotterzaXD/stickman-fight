import { BOSS_TEAM, Game, TEAM_COLORS, type FighterSpec, type MatchResult } from '../game/game';
import { achName, grant, hasAch, type AchievementId } from '../achievements';
import type { Fighter } from '../game/entities';
import { PIGEON_WEAPON, SECRET_KINDS, isSecret, type BossKind, type SecretKind } from '../game/types';
import { resolveHat } from '../game/hats';
import { ALL_OWNABLE, WEAPONS } from '../game/weapons';
import { BUILTIN_MAPS } from '../game/maps';
import { jingle, playMusic, type TrackId } from '../music';
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
    // The Pigeon: everyone holds a shotgun.
    weapon: match.mode === 'pigeon' ? PIGEON_WEAPON : s.weapon === 'random' ? pool[Math.floor(Math.random() * pool.length)] : s.weapon,
    hat: resolveHat(s.hat, save.data.hats),
    difficulty: s.difficulty,
    playerIndex: looks[i].playerIndex,
    hp: sandbox ? s.hp : undefined,
    power: sandbox ? s.power : undefined,
  }));
}

/** Boss names in this device's language. */
export function bossNames(): Record<BossKind, string> {
  return {
    boss: t('boss_name'),
    cat: t('cat_name'),
    mascot: t('mascot_name'),
    buffalo: t('buffalo_name'),
    fish: t('fish_name'),
    pigeon: t('pigeon_name'),
    queen: t('queen_name'),
    tide: t('tide_name'),
    guardian: t('guardian_name'),
  };
}

export function bossNameFor(mode: Mode): string {
  if (isSecret(mode) || mode === 'mascot' || mode === 'cat' || mode === 'buffalo' || mode === 'pigeon') return bossNames()[mode];
  return t('boss_name');
}

/** Coins for beating the bosses: 500 for each boss. Grandfather Cat: 1,000. */
export const BOSS_COINS = 500;
export const CAT_COINS = 1000;
export const MASCOT_COINS = 5000;
export const BUFFALO_COINS = 3000;
export const FISH_COINS = 1000;
export const PIGEON_COINS = 5000;
export const SECRET_COINS: Record<SecretKind, number> = { queen: 4000, tide: 5000, guardian: 6000 };
const SECRET_ICON: Record<SecretKind, string> = { queen: '❄️', tide: '🌊', guardian: '🌲' };
/** Grandfather Cat wins on a snow map that wake the Snow Queen. */
const QUEEN_CAT_WINS = 3;
const SNOW_MAPS = ['snow', 'frozen'];
const SECRET_ACH: Record<SecretKind, AchievementId> = { queen: 'winterWarrior', tide: 'oceanConqueror', guardian: 'forestProtector' };

/** What happened in a match, for achievements and secret bosses (from this device's players). */
export interface MatchFacts {
  mapId: string;
  /** No bots were in the match (only players and bosses). */
  noBots: boolean;
  /** One of your stickmen won without taking any damage / with under 50 HP. */
  untouched: boolean;
  lastBreath: boolean;
  /** Fighters (not bosses) on the winning side. */
  teamSize: number;
  bestStreak: number;
  /** Seconds the match took. */
  time: number;
  startCoins: number;
  patience: boolean;
  weapons: string[];
  /** Boss kinds beaten on the other side. */
  beaten: BossKind[];
}

export function matchFacts(game: Game, r: Pick<MatchResult, 'winners' | 'winnerTeam'>, mine: Fighter[], startCoins: number): MatchFacts {
  const myWinners = r.winners.filter((f) => mine.includes(f) && f.alive);
  return {
    mapId: game.map.id,
    noBots: !game.fighters.some((f) => !f.boss && !f.human),
    untouched: myWinners.some((f) => f.dmgTaken === 0),
    lastBreath: myWinners.some((f) => f.hp > 0 && f.hp < 50),
    teamSize: r.winners.filter((f) => !f.boss).length,
    bestStreak: Math.max(0, ...mine.map((f) => f.bestStreak)),
    // The match ends 1.6 s after the last KO.
    time: Math.max(0, game.time - 1.6),
    startCoins,
    patience: mine.some((f) => f.survived5),
    weapons: mine.flatMap((f) => f.weapons.map((w) => w.id)),
    beaten: game.fighters.filter((f) => f.boss && !f.alive && f.team !== r.winnerTeam).map(bossKind),
  };
}

function bossKind(f: Fighter): BossKind {
  return f.secret ?? (f.mascot ? 'mascot' : f.cat ? 'cat' : f.buffalo ? 'buffalo' : f.fish ? 'fish' : f.pigeon ? 'pigeon' : 'boss');
}

export interface RewardInfo {
  mode: Mode;
  won: boolean;
  bosses: number;
  /** The Beach: the Fishy boss was beaten. */
  fish?: boolean;
  /** Only one stickman (this device's player) fought. */
  solo?: boolean;
  /** Boss Fight on the Beach (the bosses were on your side). */
  beachBoss?: boolean;
  facts?: MatchFacts;
}

/** Achievements from this match (normal matches and Sandbox alike). */
function matchAchievements(r: RewardInfo): AchievementId[] {
  const { mode, won } = r;
  const f = r.facts;
  const ach: AchievementId[] = [];
  if (won && mode === 'boss' && !r.beachBoss) ach.push('bossBeat');
  if (won && mode === 'cat') ach.push('catBeat');
  if (won && mode === 'mascot') ach.push('mascotBeat');
  // Fight the Mascot all by yourself and get knocked out: Buffalo unlocks.
  if (mode === 'mascot' && r.solo) ach.push('buffalo');
  if (won && mode === 'buffalo') ach.push('buffaloBeat');
  if (r.fish) ach.push('fishBeat');
  // Beating the Pigeon also puts it in Sandbox.
  if (won && mode === 'pigeon') ach.push('pigeonBeat');
  if (won) ach.push('firstWin');
  if (!f) return ach;
  const beat = (k: BossKind) => won && (mode === k || f.beaten.includes(k));
  for (const k of SECRET_KINDS) if (beat(k)) ach.push(SECRET_ACH[k]);
  if (won && f.untouched) ach.push('untouched');
  if (won && f.lastBreath) ach.push('lastBreath');
  if (won && f.beaten.length && f.time < 120) ach.push('speedRunner');
  if (won && f.teamSize >= 4) ach.push('teamPlayer');
  if (f.bestStreak >= 20) ach.push('perfectAim');
  if (won && f.startCoins === 0) ach.push('comebackKid');
  if (f.patience) ach.push('patience');
  // True Challenger: everything unlocked, then beat the Mascot.
  if (beat('mascot') && ALL_OWNABLE.every((w) => save.data.owned.includes(w.id)) && hasAch('buffalo')) ach.push('trueChallenger');
  return ach;
}

/** Secret bosses wake up when you meet their conditions (normal matches only). Returns the new ones. */
function wakeSecrets(r: RewardInfo): SecretKind[] {
  const f = r.facts;
  if (!f) return [];
  save.update((d) => {
    if (r.won && r.mode === 'cat' && SNOW_MAPS.includes(f.mapId)) d.stats.catSnowWins++;
    if (r.won && BUILTIN_MAPS.some((m) => m.id === f.mapId) && !d.stats.mapsWon.includes(f.mapId)) d.stats.mapsWon.push(f.mapId);
  });
  const want: SecretKind[] = [];
  if (save.data.stats.catSnowWins >= QUEEN_CAT_WINS) want.push('queen');
  if (r.fish && f.noBots) want.push('tide');
  if (BUILTIN_MAPS.every((m) => save.data.stats.mapsWon.includes(m.id))) want.push('guardian');
  const fresh = want.filter((k) => !save.data.secrets.includes(k));
  if (fresh.length) save.update((d) => d.secrets.push(...fresh));
  return fresh;
}

/**
 * Give this device its coins after a match (and The Grandfather Cat Treasure the first time
 * Grandfather Cat is beaten), plus any achievements. Returns the lines to show on the result screen.
 */
export function giveReward(r: RewardInfo): HTMLElement[] {
  const { mode, won, bosses } = r;
  if (r.facts) save.update((d) => (d.stats.usedWeapons = Array.from(new Set([...d.stats.usedWeapons, ...r.facts!.weapons]))));
  if (mode === 'sandbox') {
    // Sandbox never changes your coins (but achievements count).
    const stick = won && !!r.facts?.beaten.includes('mascot') && !save.data.owned.includes('mascotstick');
    if (stick) save.update((d) => d.owned.push('mascotstick'));
    const out: HTMLElement[] = [h('p', { class: 'muted' }, `🧪 ${t('sbNoCoins')}`)];
    if (stick) out.push(h('p', { class: 'treasure-got' }, t('mascotStickGot')));
    out.push(...achLines(grant(matchAchievements(r))));
    return out;
  }
  // On the Beach your bosses were on your side: beating the Fishy boss is what pays.
  const beachBoss = mode === 'boss' && !!r.beachBoss;
  let coins = !won
    ? 1
    : isSecret(mode)
    ? SECRET_COINS[mode]
    : mode === 'mascot'
    ? MASCOT_COINS
    : mode === 'cat'
    ? CAT_COINS
    : mode === 'buffalo'
    ? BUFFALO_COINS
    : mode === 'pigeon'
    ? PIGEON_COINS
    : mode === 'boss'
    ? beachBoss
      ? 0
      : BOSS_COINS * bosses
    : 3 + Math.floor(Math.random() * 3);
  if (r.fish) coins += FISH_COINS;
  const treasure = won && mode === 'cat' && !save.data.owned.includes('treasure');
  const stick = won && mode === 'mascot' && !save.data.owned.includes('mascotstick');
  // Beating the Fishy boss gives you its Trident.
  const trident = !!r.fish && !save.data.owned.includes('trident');
  save.update((d) => {
    d.coins += coins;
    if (treasure) d.owned.push('treasure');
    if (stick) d.owned.push('mascotstick');
    if (trident) d.owned.push('trident');
  });
  const pigeonNew = won && mode === 'pigeon' && !hasAch('pigeonBeat');
  const fresh = grant(matchAchievements(r));
  const woke = wakeSecrets(r);
  setTimeout(() => sfx.coin(), 400);
  const out: HTMLElement[] = [h('p', { class: 'coins-earned' }, `🪙 ${t('coinsEarned', { n: coins })}`, h('small', {}, ` (${save.data.coins})`))];
  if (r.fish) out.push(h('p', { class: 'treasure-got' }, t('fishCoins')));
  if (treasure) out.push(h('p', { class: 'treasure-got' }, t('treasureGot')));
  if (stick) out.push(h('p', { class: 'treasure-got' }, t('mascotStickGot')));
  if (trident) out.push(h('p', { class: 'treasure-got' }, t('tridentGot')));
  if (pigeonNew) out.push(h('p', { class: 'treasure-got' }, t('pigeonSandbox')));
  out.push(...achLines(fresh));
  for (const k of woke) out.push(h('p', { class: 'treasure-got secret-got' }, `${SECRET_ICON[k]} ${t('secretUnlocked', { name: bossNames()[k] })}`));
  if (woke.length) setTimeout(() => sfx.secret(), 1600);
  return out;
}

function achLines(ids: AchievementId[]): HTMLElement[] {
  if (ids.length) setTimeout(() => sfx.achievement(), 900);
  return ids.map((id) => h('p', { class: 'treasure-got' }, t('achNew', { name: achName(id) })));
}

export function resultTitle(r: Pick<MatchResult, 'mode' | 'winnerTeam' | 'winners'>, bosses = 1, beach = false): string {
  // The Beach: the Fishy boss won, or (Boss Fight) it was beaten.
  if (beach && r.winnerTeam === BOSS_TEAM) return t('fishWon');
  if (beach && r.mode === 'boss') return t('fishDefeated');
  if (isSecret(r.mode)) return t(r.winnerTeam === BOSS_TEAM ? 'secretWon' : 'secretDefeated', { name: bossNames()[r.mode] });
  if (r.mode === 'buffalo') return r.winnerTeam === BOSS_TEAM ? t('buffaloWon') : t('buffaloDefeated');
  if (r.mode === 'pigeon') return t('pigeonDefeated');
  if (r.mode === 'mascot') return r.winnerTeam === BOSS_TEAM ? t('mascotWon') : t('mascotDefeated');
  if (r.mode === 'cat') return r.winnerTeam === BOSS_TEAM ? t('catWon') : t('catDefeated');
  if (r.mode === 'boss') return r.winnerTeam === BOSS_TEAM ? t(bosses > 1 ? 'bossesWon' : 'bossWon') : t(bosses > 1 ? 'bossesDefeated' : 'bossDefeated');
  if (r.winnerTeam === null || (!r.winners.length && r.mode !== 'sandbox')) return t('draw');
  if (r.mode === 'team' || (r.mode === 'sandbox' && r.winners.length !== 1)) return t('teamWins', { name: teamName(r.winnerTeam) });
  return t('wins', { name: r.winners[0].name });
}

/** The music for a match: the secret boss's own theme, boss music, Sandbox, or the map's theme. */
export function matchTrack(game: Game): TrackId {
  const secret = game.bosses.find((b) => b.secret && b.team !== 0)?.secret ?? game.bosses.find((b) => b.secret)?.secret;
  if (secret) return secret;
  if (game.mode === 'pigeon' || game.bosses.some((b) => b.pigeon)) return 'pigeon';
  if (isBossMode(game.mode) || (game.mode === 'sandbox' && game.bosses.length)) return 'boss';
  if (game.mode === 'sandbox') return 'sandbox';
  return game.map.theme;
}

register('play', (root, { match, fromEditor }) => {
  const map = fromEditor ?? allMaps(save.data.customMaps).find((m) => m.id === match.mapId) ?? allMaps([])[0];
  let paused = false;
  let game!: Game;
  let startCoins = 0;
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
      facts: matchFacts(game, r, game.fighters.filter((f) => f.human), startCoins),
    });
    // Watching bots counts as a win for the music.
    jingle(r.humanWon || !r.hadHumans ? 'victory' : 'defeat');
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
      helpers: match.mode === 'sandbox' ? match.helpers : undefined,
    });
    game.onOver = showResult;
    startCoins = save.data.coins;
    playMusic(matchTrack(game));
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
