import { BOSS_TEAM, Game, TEAM_COLORS, type FighterSpec, type MatchResult } from '../game/game';
import { achName, checkKey, grant, hasAch, hasKey, type AchievementId } from '../achievements';
import type { Fighter } from '../game/entities';
import { PIGEON_WEAPON, SECRET_KINDS, isSecret, isXBoss, type BossKind, type PhylPhase, type SecretKind, type XBossKind } from '../game/types';
import { resolveHat } from '../game/hats';
import { ALL_OWNABLE, WEAPONS, isSummonCard } from '../game/weapons';
import { BUILTIN_MAPS, GUARDIAN_MAPS, OUTBREAK_MAP } from '../game/maps';
import { INFECTION_MAP, ZOMBIE_TEAM } from '../game/infection';
import { jingle, playMusic, type TrackId } from '../music';
import { JoystickManager } from '../game/input';
import { allMaps } from '../game/maps';
import { isBossMode, type MatchConfig, type Mode } from '../game/types';
import { t, teamName } from '../i18n';
import { save } from '../save';
import { sfx } from '../sfx';
import { h, toast } from './dom';
import { localName, slotLooks } from './lobby';
import { startLoop } from './loop';
import { go, register } from './router';
import { afterWave, livesOf, outbreakInfo, outbreakTitle } from './outbreak';
import { RUSH } from '../game/oct22';
import { phylMapFor } from '../game/phyl';
import { ME } from '../game/meBoss';
import { KRAKEN } from '../game/kraken';
import { goThroughPortal } from './portal';

function buildSpecs(match: MatchConfig): FighterSpec[] {
  const owned = save.data.owned;
  const looks = slotLooks(match);
  const sandbox = match.mode === 'sandbox';
  // The Outbreak: everyone is on one side, with the lives left on this save.
  const ob = match.mode === 'outbreak' ? save.data.outbreak[match.obSlot ?? 0] : null;
  // Sandbox lets you try any weapon you can own.
  // Random never hands a bot a summon card (players can still pick one themselves).
  const pool = (sandbox ? WEAPONS.filter((w) => w.special !== 'boss').map((w) => w.id) : owned).filter((id) => !isSummonCard(id));
  return match.slots.map((s, i) => ({
    name: looks[i].name,
    // Sandbox: team colours, so you can see who is on which side.
    // Free for all: everyone on their own team, in their own colour.
    color: sandbox && !match.ffa ? TEAM_COLORS[s.team] ?? TEAM_COLORS[0] : looks[i].color,
    team: sandbox && match.ffa ? i : match.mode === 'team' || sandbox ? s.team : isBossMode(match.mode) || ob || match.mode === 'survival' ? 0 : i,
    human: s.kind === 'human',
    // The Pigeon: everyone holds a shotgun.
    weapon: match.mode === 'pigeon' ? PIGEON_WEAPON : s.weapon === 'random' ? pool[Math.floor(Math.random() * pool.length)] : s.weapon,
    hat: resolveHat(s.hat, save.data.hats),
    difficulty: s.difficulty,
    playerIndex: looks[i].playerIndex,
    hp: sandbox ? s.hp : undefined,
    power: sandbox ? s.power : undefined,
    lives: ob ? livesOf(ob, i) : undefined,
    // Beat wave 10 of The Outbreak: the Summoner brings a zombie ally too.
    zombie: save.data.zombieAlly,
    physi: save.data.phyl.done,
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
    elephant: t('elephant_name'),
    scarecrow: t('scarecrow_name'),
    robo: t('robo_name'),
    jay: t('jay_name'),
    dot: t('dot_name'),
    phyl1: t('phyl1_name'),
    phyl2: t('phyl2_name'),
    phyl3: t('phyl3_name'),
    golem: t('golem_name'),
    me: localName(0),
  };
}

export function bossNameFor(mode: Mode): string {
  if (isSecret(mode) || isXBoss(mode) || mode === 'mascot' || mode === 'cat' || mode === 'buffalo' || mode === 'pigeon') return bossNames()[mode];
  if (mode === 'outbreak') return t('obZombies');
  if (mode === 'phyl') return t('phyl_name');
  if (mode === 'me') return localName(0);
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
export const XBOSS_COINS: Record<XBossKind, number> = { elephant: 5000, scarecrow: 2000, robo: 3000, jay: 1500, dot: 3000 };
/** PHYLISHIEUS: phase 1 and phase 2. */
export const PHYL_COINS: Record<PhylPhase, number> = { 1: 10000, 2: 20000, 3: 40000 };
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
  /** Somebody knocked out one of your Clones (Get Tricked). */
  tricked: boolean;
  /** 3 Lives: one of your stickmen won on its last life. */
  lastLife: boolean;
}

export function matchFacts(game: Game, r: Pick<MatchResult, 'winners' | 'winnerTeam'>, mine: Fighter[], startCoins: number): MatchFacts {
  const myWinners = r.winners.filter((f) => mine.includes(f) && f.alive);
  return {
    mapId: game.map.id,
    noBots: !game.fighters.some((f) => !f.boss && !f.human && !f.cloneOf),
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
    tricked: mine.some((f) => game.tricked.has(f)),
    lastLife: game.mode === 'stock' && myWinners.some((f) => f.lives === 1),
  };
}

function bossKind(f: Fighter): BossKind {
  if (f.phyl) return f.phyl === 3 ? 'phyl3' : f.phyl === 2 ? 'phyl2' : 'phyl1';
  if (f.golem) return 'golem';
  if (f.me) return 'me';
  return f.secret ?? f.xboss ?? (f.mascot ? 'mascot' : f.cat ? 'cat' : f.buffalo ? 'buffalo' : f.fish ? 'fish' : f.pigeon ? 'pigeon' : 'boss');
}

export interface RewardInfo {
  mode: Mode;
  won: boolean;
  bosses: number;
  /** The Beach: the Fishy boss was beaten. */
  fish?: boolean;
  /** The Pirate Ship: the Kraken was beaten (and in a boss fight there, the bosses were dragged away: only the Kraken pays). */
  kraken?: boolean;
  krakenBoss?: boolean;
  /** Only one stickman (this device's player) fought. */
  solo?: boolean;
  /** Boss Fight on the Beach (the bosses were on your side). */
  beachBoss?: boolean;
  /** PHYLISHIEUS: the phase that was fought. */
  phylPhase?: PhylPhase;
  /** Survival: waves cleared and the coins they paid. */
  surv?: { wave: number; coins: number };
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
  if (r.kraken) ach.push('krakenBeat');
  // Beating the Pigeon also puts it in Sandbox.
  if (won && mode === 'pigeon') ach.push('pigeonBeat');
  if (won) ach.push('firstWin');
  if (won && mode === 'hill') ach.push('kingOfHill');
  if (won && mode === 'race') ach.push('raceWinner');
  if (won && mode === 'rush') ach.push('rushDone');
  if (!f) return ach;
  if (won && f.lastLife) ach.push('lastLife');
  // Get Tricked: in Play and online only (not Sandbox).
  if (f.tricked && mode !== 'sandbox') ach.push('getTricked');
  const beat = (k: BossKind) => won && (mode === k || f.beaten.includes(k));
  for (const k of SECRET_KINDS) if (beat(k)) ach.push(SECRET_ACH[k]);
  if (won && f.untouched) ach.push('untouched');
  if (won && f.lastBreath) ach.push('lastBreath');
  if (won && f.beaten.length && f.time < 120) ach.push('speedRunner');
  if (won && f.teamSize >= 4) ach.push('teamPlayer');
  if (f.bestStreak >= 20) ach.push('perfectAim');
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
  if (GUARDIAN_MAPS.every((id) => save.data.stats.mapsWon.includes(id))) want.push('guardian');
  const fresh = want.filter((k) => !save.data.secrets.includes(k));
  if (fresh.length) save.update((d) => d.secrets.push(...fresh));
  return fresh;
}

/** One more match played (for the profile). */
export function countMatch() {
  save.update((d) => d.stats.matches++);
}

/**
 * Give this device its coins after a match (and The Grandfather Cat Treasure the first time
 * Grandfather Cat is beaten), plus any achievements. Returns the lines to show on the result screen.
 */
export function giveReward(r: RewardInfo): HTMLElement[] {
  const { mode, won, bosses } = r;
  countMatch();
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
  let coins = mode === 'survival'
    ? r.surv?.coins ?? 0
    : !won
    ? 1
    : r.krakenBoss
    ? 0
    : mode === 'phyl'
    ? PHYL_COINS[r.phylPhase ?? 1]
    : mode === 'me'
    ? ME.coins
    : isSecret(mode)
    ? SECRET_COINS[mode]
    : isXBoss(mode)
    ? XBOSS_COINS[mode]
    : mode === 'mascot'
    ? MASCOT_COINS
    : mode === 'cat'
    ? CAT_COINS
    : mode === 'buffalo'
    ? BUFFALO_COINS
    : mode === 'pigeon'
    ? PIGEON_COINS
    : mode === 'rush'
    ? RUSH.coins
    : mode === 'boss'
    ? beachBoss
      ? 0
      : BOSS_COINS * bosses
    : 3 + Math.floor(Math.random() * 3);
  if (r.fish) coins += FISH_COINS;
  if (r.kraken) coins += KRAKEN.coins;
  const treasure = won && mode === 'cat' && !r.krakenBoss && !save.data.owned.includes('treasure');
  // Beating Jay mhuay gives you her Lunch Box.
  const lunch = won && mode === 'jay' && !r.krakenBoss && !save.data.owned.includes('jaylunch');
  const stick = won && mode === 'mascot' && !r.krakenBoss && !save.data.owned.includes('mascotstick');
  // Beating the Fishy boss gives you its Trident.
  const trident = !!r.fish && !save.data.owned.includes('trident');
  save.update((d) => {
    d.coins += coins;
    if (treasure) d.owned.push('treasure');
    if (lunch) d.owned.push('jaylunch');
    if (stick) d.owned.push('mascotstick');
    if (trident) d.owned.push('trident');
  });
  const pigeonNew = won && mode === 'pigeon' && !hasAch('pigeonBeat');
  // Survival: a new best wave.
  const survBest = mode === 'survival' && (r.surv?.wave ?? 0) > save.data.survival.best;
  if (survBest) save.update((d) => (d.survival.best = r.surv!.wave));
  // The boss with your name: beaten once = it's in Sandbox.
  const meNew = won && mode === 'me' && !save.data.meBeat;
  if (meNew) save.update((d) => (d.meBeat = true));
  // PHYLISHIEUS: phase 1 beaten = phase 2 next, phase 2 beaten = the final phase next.
  // The final phase beaten = the mode is gone, his map is a normal map and he (and his PHYSICERTAS) move to Sandbox.
  // A refight with the Tome Key pays the same, but doesn't move the story on.
  const refight = save.data.phyl.done;
  const beatPhase = won && mode === 'phyl' ? r.phylPhase ?? 1 : 0;
  const phylNext = refight ? null : beatPhase === 3 ? 'done' : beatPhase === 2 ? 'phase3' : beatPhase === 1 ? 'phase2' : null;
  if (beatPhase) save.update((d) => {
    const beat = Math.max(d.phyl.beat, beatPhase);
    d.phyl = { beat, phase: Math.min(3, beat + 1) as PhylPhase, done: beat >= 3, key: d.phyl.key };
  });
  const fresh = grant(matchAchievements(r));
  const woke = wakeSecrets(r);
  setTimeout(() => sfx.coin(), 400);
  const out: HTMLElement[] = [h('p', { class: 'coins-earned' }, `🪙 ${t('coinsEarned', { n: coins })}`, h('small', {}, ` (${save.data.coins})`))];
  if (r.fish) out.push(h('p', { class: 'treasure-got' }, t('fishCoins')));
  if (r.kraken) out.push(h('p', { class: 'treasure-got' }, t('krakenCoins')));
  if (treasure) out.push(h('p', { class: 'treasure-got' }, t('treasureGot')));
  if (lunch) out.push(h('p', { class: 'treasure-got' }, t('lunchGot')));
  if (stick) out.push(h('p', { class: 'treasure-got' }, t('mascotStickGot')));
  if (trident) out.push(h('p', { class: 'treasure-got' }, t('tridentGot')));
  if (mode === 'survival') out.push(h('p', { class: 'treasure-got' }, `🛡️ ${t(survBest ? 'svNewBest' : 'svBest', { n: save.data.survival.best })}`));
  if (pigeonNew) out.push(h('p', { class: 'treasure-got' }, t('pigeonSandbox')));
  if (meNew) out.push(h('p', { class: 'treasure-got secret-got' }, `🪞 ${t('meSandbox', { name: localName(0) })}`));
  if (phylNext) out.push(h('p', { class: 'treasure-got secret-got' }, `📖 ${t(phylNext === 'done' ? 'phylGone3' : phylNext === 'phase3' ? 'phylPhase3Next' : 'phylPhase2Next')}`));
  out.push(...achLines(fresh));
  // Everything done: the Tome Key (PHYLISHIEUS refights and 1D).
  if (checkKey()) out.push(h('p', { class: 'treasure-got secret-got' }, `🗝️ ${t('keyGot')}`));
  for (const k of woke) out.push(h('p', { class: 'treasure-got secret-got' }, `${SECRET_ICON[k]} ${t('secretUnlocked', { name: bossNames()[k] })}`));
  if (woke.length) setTimeout(() => sfx.secret(), 1600);
  return out;
}

function achLines(ids: AchievementId[]): HTMLElement[] {
  if (ids.length) setTimeout(() => sfx.achievement(), 900);
  return ids.map((id) => h('p', { class: 'treasure-got' }, t('achNew', { name: achName(id) })));
}

export function resultTitle(r: Pick<MatchResult, 'mode' | 'winnerTeam' | 'winners'>, bosses = 1, beach = false, kraken: 'boss' | 'ffa' | null = null): string {
  // The Pirate Ship: the Kraken won, or (a boss fight there) it was beaten.
  if (kraken && r.winnerTeam === BOSS_TEAM) return t('krakenWon');
  if (kraken === 'boss') return t('krakenDefeated');
  // The Beach: the Fishy boss won, or (Boss Fight) it was beaten.
  if (beach && r.winnerTeam === BOSS_TEAM) return t('fishWon');
  if (beach && r.mode === 'boss') return t('fishDefeated');
  if (isSecret(r.mode) || isXBoss(r.mode)) return t(r.winnerTeam === BOSS_TEAM ? 'secretWon' : 'secretDefeated', { name: bossNames()[r.mode] });
  if (r.mode === 'phyl') return r.winnerTeam === BOSS_TEAM ? t('phylWon') : t('phylDefeated');
  if (r.mode === 'survival') return t('svOver');
  if (r.mode === 'me') return t(r.winnerTeam === BOSS_TEAM ? 'secretWon' : 'secretDefeated', { name: localName(0) });
  if (r.mode === 'buffalo') return r.winnerTeam === BOSS_TEAM ? t('buffaloWon') : t('buffaloDefeated');
  if (r.mode === 'pigeon') return t('pigeonDefeated');
  if (r.mode === 'rush') return t(r.winnerTeam === BOSS_TEAM ? 'rushLost' : 'rushWon');
  if (r.mode === 'mascot') return r.winnerTeam === BOSS_TEAM ? t('mascotWon') : t('mascotDefeated');
  if (r.mode === 'cat') return r.winnerTeam === BOSS_TEAM ? t('catWon') : t('catDefeated');
  if (r.mode === 'infection') return t(r.winnerTeam === ZOMBIE_TEAM ? 'infZombiesWin' : 'infHumansWin');
  if (r.mode === 'boss') return r.winnerTeam === BOSS_TEAM ? t(bosses > 1 ? 'bossesWon' : 'bossWon') : t(bosses > 1 ? 'bossesDefeated' : 'bossDefeated');
  if (r.winnerTeam === null || (!r.winners.length && r.mode !== 'sandbox')) return t('draw');
  if (r.mode === 'team' || (r.mode === 'sandbox' && r.winners.length !== 1)) return t('teamWins', { name: teamName(r.winnerTeam) });
  return t('wins', { name: r.winners[0].name });
}

/** The music for a match: the secret boss's own theme, boss music, Sandbox, or the map's theme. */
export function matchTrack(game: Game): TrackId {
  const secret = game.bosses.find((b) => b.secret && b.team !== 0)?.secret ?? game.bosses.find((b) => b.secret)?.secret;
  if (secret) return secret;
  if (game.phy) return 'phyl';
  if (game.mode === 'pigeon' || game.bosses.some((b) => b.pigeon)) return 'pigeon';
  if (game.mode === 'outbreak') return 'outbreak';
  if (game.mode === 'infection') return 'infect';
  if (game.mode === 'survival') return 'survival';
  if (game.map.id === 'doom' || game.map.id === 'plane') return game.map.id;
  if (game.mode === 'elephant' || game.bosses.some((b) => b.xboss === 'elephant')) return 'elephant';
  if (game.mode === 'sandbox' && game.rock) return 'rock';
  if (isBossMode(game.mode) || (game.mode === 'sandbox' && game.bosses.length)) return 'boss';
  if (game.mode === 'sandbox') return 'sandbox';
  return game.map.theme;
}

register('play', (root, { match, fromEditor }) => {
  // The Outbreak is always at the Castle Gate.
  // Stickman Infection is always in its own big town.
  // PHYLISHIEUS: always in The Forbidden Tome Keep.
  // PHYLISHIEUS: the story phase, or the one picked for a Tome Key refight.
  const phylPhase = (save.data.phyl.done && hasKey() ? match.phylPhase : undefined) ?? save.data.phyl.phase;
  const map = fromEditor ?? (match.mode === 'outbreak' ? OUTBREAK_MAP : match.mode === 'infection' ? INFECTION_MAP : match.mode === 'phyl' ? phylMapFor(phylPhase) : allMaps(save.data.customMaps).find((m) => m.id === match.mapId) ?? allMaps([])[0]);
  let paused = false;
  let game!: Game;
  let startCoins = 0;
  let sticks: JoystickManager | null = null;

  const canvas = h('canvas', { class: 'game-canvas' });
  const overlay = h('div', { class: 'overlay hidden' });
  root.append(h('div', { class: 'play' }, canvas, overlay));

  const outbreak = match.mode === 'outbreak';
  const back = () => (fromEditor ? go('editor', { map: fromEditor }) : match.mode === 'sandbox' ? go('sandbox') : outbreak ? go('outbreakLobby', { slot: match.obSlot ?? 0 }) : go('menu'));

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
          // The Outbreak can't be restarted (lives count).
          outbreak ? null : h('button', { class: 'btn', onclick: () => start() }, `🔄 ${t('restart')}`),
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

  const showOutbreakResult = (r: MatchResult) => {
    const wave = game.ob?.wave ?? 1;
    countMatch();
    const lines = afterWave(game, r, match.obSlot ?? 0, game.fighters.filter((f) => f.human));
    // Get Tricked counts here too.
    const tricked = grant(game.fighters.some((f) => f.human && game.tricked.has(f)) ? ['getTricked'] : []);
    for (const id of tricked) lines.push(h('p', { class: 'treasure-got' }, t('achNew', { name: achName(id) })));
    jingle(r.winnerTeam === 0 ? 'victory' : 'defeat');
    const ranked = game.fighters.filter((f) => !f.cloneOf && !f.horde).sort((a, b) => b.kos - a.kos);
    overlay.replaceChildren(
      h(
        'div',
        { class: 'modal result' },
        h('h2', {}, outbreakTitle(r, wave)),
        ...lines,
        h('ul', { class: 'scores' }, ...ranked.map((f) => h('li', {}, h('span', { class: 'dot', style: `background:${f.color}` }), h('b', {}, f.name), h('span', { class: 'muted' }, `${f.lives > 0 ? `❤️×${f.lives}` : '💀'} ${f.kos} KO`)))),
        h('div', { class: 'row gap center' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `🏠 ${t('menu')}`), h('button', { class: 'btn big primary', onclick: back }, r.winnerTeam === 0 ? t('obNext') : t('obBack'))),
      ),
    );
    overlay.classList.remove('hidden');
  };

  /** PHYLISHIEUS: after phase 1, back to his preparation menu for phase 2. After phase 2 the mode is gone. */
  const phylButtons = (r: MatchResult) => {
    if (match.mode !== 'phyl' || !r.humanWon) return null;
    // Refights with the Tome Key: fight again or go back.
    if (save.data.phyl.done && match.phylPhase && hasKey()) return null;
    if (save.data.phyl.done) return h('div', { class: 'row gap center' }, h('button', { class: 'btn big primary', onclick: () => go('menu') }, `🏠 ${t('menu')}`));
    return h('div', { class: 'row gap center' }, h('button', { class: 'btn big primary', onclick: () => go('lobby', { mode: 'phyl' }) }, `📖 ${t(save.data.phyl.phase === 3 ? 'phylToPhase3' : 'phylToPhase2')}`));
  };

  const showResult = (r: MatchResult) => {
    if (outbreak) return showOutbreakResult(r);
    // Win: 3-5 coins (bosses: 500 each, Grandfather Cat: 1,000 + the Treasure). Bots (or the boss) win: 1 coin.
    const bosses = game.bosses.length;
    const humans = game.fighters.filter((f) => !f.boss && !f.cloneOf);
    const reward = giveReward({
      mode: r.mode,
      won: r.humanWon,
      bosses,
      fish: r.fish,
      kraken: !!r.kraken,
      krakenBoss: !!game.kr?.bossMode,
      beachBoss: game.beach && r.mode === 'boss',
      phylPhase: game.phy?.phase,
      surv: game.surv ? { wave: game.surv.cleared, coins: game.surv.coins } : undefined,
      solo: humans.length === 1 && humans[0].human,
      facts: matchFacts(game, r, game.fighters.filter((f) => f.human), startCoins),
    });
    // Watching bots counts as a win for the music.
    jingle(r.humanWon || !r.hadHumans ? 'victory' : 'defeat');
    const ranked = game.fighters.filter((f) => !f.cloneOf && !f.foe).sort((a, b) => Number(b.alive) - Number(a.alive) || b.kos - a.kos);
    overlay.replaceChildren(
      h(
        'div',
        { class: 'modal result' },
        h('h2', {}, resultTitle(r, bosses, game.beach, game.kr ? (game.kr.bossMode ? 'boss' : 'ffa') : null)),
        ...reward,
        h(
          'ul',
          { class: 'scores' },
          ...ranked.map((f) => h('li', {}, h('span', { class: 'dot', style: `background:${f.color}` }), h('b', {}, f.name), h('span', { class: 'muted' }, `${f.alive ? '🏆' : '💀'} ${f.kos} KO`))),
        ),
        phylButtons(r) ??
          h('div', { class: 'row gap center' }, h('button', { class: 'btn ghost', onclick: back }, fromEditor || match.mode === 'sandbox' ? `← ${t('back')}` : t('menu')), h('button', { class: 'btn big primary', onclick: () => start() }, `🔄 ${t('playAgain')}`)),
      ),
    );
    overlay.classList.remove('hidden');
  };

  const obSave = outbreak ? save.data.outbreak[match.obSlot ?? 0] : null;
  const start = () => {
    hidePause();
    sticks?.destroy();
    game = new Game(map, buildSpecs(match), {
      mode: match.mode,
      fallMode: save.data.settings.fallMode,
      bossName: bossNameFor(match.mode),
      bossNames: bossNames(),
      krakenName: t('kraken_name'),
      bosses: match.bosses,
      potions: save.data.settings.potions,
      extraBosses: match.mode === 'sandbox' ? match.extraBosses : undefined,
      helpers: match.mode === 'sandbox' ? match.helpers : undefined,
      clones: match.mode === 'sandbox' ? match.clones : undefined,
      ghostClones: match.mode === 'sandbox' ? match.ghostClones : undefined,
      ffa: match.mode === 'sandbox' && !!match.ffa,
      outbreak: outbreak && obSave ? outbreakInfo(obSave) : undefined,
      juice: save.data.settings.juice,
      phylPhase,
      golemName: t('golem_name'),
      outside: !!match.planeOut,
      foeName: t('svFoe'),
      me: { name: localName(0), color: save.data.outfit.color, hat: save.data.outfit.hat, owned: save.data.owned },
    });
    game.onOver = showResult;
    // The camera follows this device's players (Stickman Infection's town is too big to fit everyone).
    game.focus = game.fighters.flatMap((f, i) => (f.human ? [i] : []));
    // The Portal map: a player who goes through the portal leaves for Stickman Fight 2.
    game.onPortal = (i) => {
      if (!game.fighters[i]?.human) return;
      paused = true;
      goThroughPortal();
    };
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
      // Sandbox: the music turns into hard rock when it gets crowded (and back when it calms down).
      if (game.mode === 'sandbox' && !game.over && !paused) {
        playMusic(matchTrack(game));
        // Rock On: get the Sandbox rocking.
        if (game.rock && !hasAch('rockOn')) {
          grant(['rockOn']);
          toast(t('achNew', { name: achName('rockOn') }));
        }
      }
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
