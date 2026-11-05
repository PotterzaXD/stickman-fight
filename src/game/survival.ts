import { BotBrain } from './ai';
import { Fighter } from './entities';
import type { Game } from './game';
import { bringBack } from './hill';
import { isSummoning } from './meBoss';
import { pickSpawns } from './maps';
import type { BossKind, Difficulty } from './types';
import { SHOP_WEAPONS, weapon } from './weapons';

/*
 * Survival (a fun mode, offline and online): you and your bots hold out against endless waves of enemy stickmen
 * with random weapons. Every 5th wave a boss comes with them. Between waves there is a short break: three glowing
 * upgrade orbs appear and each of your stickmen can grab one (bots grab theirs at the end of the break).
 * Anyone knocked out comes back at the start of the next wave. It ends when your whole side is down.
 */

export const SURV_TEAM = 1;
export const SURV = {
  /** Enemy stickmen made at the start and reused (online, every device has the same list). */
  pool: 14,
  first: 4,
  breakS: 10,
  spawnEvery: 0.7,
  orbR: 36,
  bossEvery: 5,
  /** Coins for each wave cleared: base + per wave. */
  coinBase: 10,
  coinPer: 5,
  heal: 0.3,
};

/** The upgrades. Append only (online sends the index). */
export const PERKS = ['hp', 'dmg', 'speed', 'steal', 'armor', 'cool'] as const;
export type Perk = (typeof PERKS)[number];
export const PERK_ICON: Record<Perk, string> = { hp: '❤️', dmg: '💪', speed: '⚡', steal: '🧛', armor: '🛡️', cool: '⏱️' };
export const PHASES = ['break', 'fight'] as const;

const BOSSES: BossKind[] = ['boss', 'cat', 'buffalo', 'elephant', 'scarecrow', 'robo', 'queen', 'tide', 'guardian'];
const FOE_COLORS = ['#b71c1c', '#4a148c', '#263238', '#bf360c', '#1b5e20', '#880e4f', '#3e2723'];

export interface Orb {
  perk: Perk;
  x: number;
  y: number;
}

export interface SurvState {
  wave: number;
  phase: (typeof PHASES)[number];
  /** Seconds left in the break. */
  t: number;
  /** Enemies still to come this wave, and seconds to the next one. */
  toSpawn: number;
  spawnT: number;
  orbs: Orb[];
  /** Fighters (by index) who already took an upgrade this break. */
  took: Set<number>;
  /** Waves cleared and the coins they paid. */
  cleared: number;
  coins: number;
  /** Bosses that came with the waves (index in the fighter list, kind, weapons), for joining devices. */
  bosses: [number, BossKind, string[]][];
}

/** Everyone on your side (not the enemies, not the hidden ones). */
export const allies = (g: Game) => g.fighters.filter((f) => !f.foe && f.team !== SURV_TEAM && !f.horde);
const foes = (g: Game) => g.fighters.filter((f) => f.team === SURV_TEAM);

/** Make the enemy pool (all knocked out until their wave). Same on every device. */
export function startSurvival(g: Game, name: string) {
  for (let k = 0; k < SURV.pool; k++) {
    const f = new Fighter({ name: `${name} ${k + 1}`, color: FOE_COLORS[k % FOE_COLORS.length], team: SURV_TEAM, human: false, weapons: [weapon('sword')], x: g.map.w / 2, y: -500 });
    f.alive = false;
    f.hp = 0;
    f.foe = true;
    f.brain = new BotBrain('easy');
    g.fighters.push(f);
  }
  g.surv = { wave: 0, phase: 'break', t: SURV.first, toSpawn: 0, spawnT: 0, orbs: [], took: new Set(), cleared: 0, coins: 0, bosses: [] };
}

const pool = SHOP_WEAPONS.filter((w) => !isSummoning(w.id)).map((w) => w.id);
const level = (wave: number): Difficulty => (wave < 4 ? 'easy' : wave < 10 ? 'medium' : 'hard');

/** How many enemies come in a wave, and how many may be up at once. */
const waveSize = (w: number) => Math.min(60, 3 + w * 2);
const atOnce = (w: number) => Math.min(SURV.pool, 3 + Math.floor(w / 2));

export function updateSurvival(g: Game, dt: number) {
  const s = g.surv!;
  if (s.phase === 'break') {
    s.t -= dt;
    // Walk into an orb to take it (one each per break).
    for (const [i, f] of g.fighters.entries()) {
      if (!f.alive || f.foe || f.boss || s.took.has(i)) continue;
      const orb = s.orbs.find((o) => Math.hypot(f.x - o.x, f.cy - o.y) < SURV.orbR + 20);
      if (!orb) continue;
      s.took.add(i);
      givePerk(g, f, orb.perk);
    }
    if (s.t <= 0) startWave(g);
    return;
  }
  // Fighting: bring in the next enemy when there's room.
  s.spawnT -= dt;
  const up = foes(g).filter((f) => f.alive && !f.boss).length;
  if (s.toSpawn > 0 && s.spawnT <= 0 && up < atOnce(s.wave)) {
    s.spawnT = SURV.spawnEvery;
    const f = foes(g).find((x) => !x.alive && !x.boss);
    if (f) {
      s.toSpawn--;
      sendIn(g, f, s.wave);
    }
  }
  if (s.toSpawn <= 0 && !foes(g).some((f) => f.alive)) waveCleared(g);
}

/** An enemy comes in with a random weapon, a bit tougher every wave. */
function sendIn(g: Game, f: Fighter, wave: number) {
  const id = pool[Math.floor(Math.random() * pool.length)];
  f.weapons = [weapon(id)];
  f.angles = [0.9];
  f.angVel = [0];
  f.cds = [0];
  f.boomerangOut = [false];
  f.ammo = [5];
  f.maxHp = Math.round(300 + 25 * (wave - 1));
  f.power = 1 + 0.04 * (wave - 1);
  f.brain = new BotBrain(level(wave));
  // From a spot far from your side.
  bringBack(g, f);
  f.hp = f.maxHp;
  f.y -= 200;
}

function startWave(g: Game) {
  const s = g.surv!;
  // Bots that didn't grab an upgrade get a random one.
  for (const [i, f] of g.fighters.entries()) {
    if (!f.alive || f.foe || f.boss || f.human || s.took.has(i) || !s.orbs.length) continue;
    givePerk(g, f, s.orbs[Math.floor(Math.random() * s.orbs.length)].perk);
  }
  s.orbs = [];
  s.took.clear();
  s.wave++;
  s.phase = 'fight';
  s.toSpawn = waveSize(s.wave);
  s.spawnT = 0.5;
  // Everyone knocked out comes back (half HP); everyone up gets a little healing.
  for (const f of allies(g)) {
    if (f.boss || f.cloneOf) continue;
    if (!f.alive) {
      bringBack(g, f);
      f.hp = Math.round(f.maxHp * 0.5);
    } else f.hp = Math.min(f.maxHp, f.hp + Math.round(f.maxHp * SURV.heal));
  }
  g.text(g.map.w / 2, g.map.h * 0.3, `🌊 ${s.wave}`, '#ffffff', 40);
  g.play('boom');
  if (s.wave % SURV.bossEvery === 0) {
    const kind = BOSSES[Math.floor(Math.random() * BOSSES.length)];
    const hp = 1500 + 400 * s.wave;
    const b = g.addBoss(kind, g.rushNames[kind] ?? kind, SURV_TEAM, 0, hp);
    b.foe = true;
    s.bosses.push([g.fighters.indexOf(b), kind, b.weapons.map((w) => w.id)]);
    g.text(b.x, b.y - b.h - 40, '👹 BOSS!', '#ff5252', 34);
  }
}

function waveCleared(g: Game) {
  const s = g.surv!;
  s.cleared = s.wave;
  s.coins += SURV.coinBase + SURV.coinPer * s.wave;
  s.phase = 'break';
  s.t = SURV.breakS;
  // Three different upgrades, spread over the middle of the map.
  const picks = [...PERKS].sort(() => Math.random() - 0.5).slice(0, 3);
  const spots = pickSpawns(g.map, 6).sort((a, b) => Math.abs(a.x - g.map.w / 2) - Math.abs(b.x - g.map.w / 2)).slice(0, 3);
  s.orbs = picks.map((perk, k) => ({ perk, x: spots[k % spots.length].x, y: spots[k % spots.length].y - 50 }));
  s.took.clear();
  g.text(g.map.w / 2, g.map.h * 0.3, '✅', '#c8e6c9', 40);
  g.play('coin');
}

/** An upgrade for one stickman (for the rest of the run). */
export function givePerk(g: Game, f: Fighter, perk: Perk) {
  switch (perk) {
    case 'hp':
      f.maxHp = Math.round(f.maxHp * 1.25);
      f.hp = f.maxHp;
      break;
    case 'dmg':
      f.power *= 1.2;
      break;
    case 'speed':
      f.speed *= 1.12;
      break;
    case 'steal':
      f.steal += 0.12;
      break;
    case 'armor':
      f.armor *= 0.85;
      break;
    case 'cool':
      f.coolMul *= 0.85;
      break;
  }
  g.burst(f.x, f.cy, '#ffd740', 14, 260);
  g.text(f.x, f.y - f.h - 30, PERK_ICON[perk], '#ffffff', 28);
}

/** Over when your whole side is down (helpers don't count). */
export function survivalWinner(g: Game): { decided: boolean; team: number | null } {
  const s = g.surv!;
  if (s.phase === 'fight' && !allies(g).some((f) => f.alive)) return { decided: true, team: SURV_TEAM };
  return { decided: false, team: null };
}

/** Online. */
export function encodeSurvival(g: Game): { sv: number[]; sw: string[]; sb: [number, string, string[]][] } {
  const s = g.surv!;
  return {
    sv: [s.wave, PHASES.indexOf(s.phase), Math.round(s.t * 10) / 10, s.cleared, s.coins, ...s.orbs.flatMap((o) => [PERKS.indexOf(o.perk), Math.round(o.x), Math.round(o.y)])],
    sw: foes(g).filter((f) => !f.boss).map((f) => f.weapons[0]?.id ?? 'sword'),
    sb: s.bosses,
  };
}

export function applySurvival(g: Game, sv: number[], sw: string[], sb: [number, string, string[]][]) {
  const s = g.surv!;
  s.wave = sv[0];
  s.phase = PHASES[sv[1]] ?? 'break';
  s.t = sv[2];
  s.cleared = sv[3];
  s.coins = sv[4];
  s.orbs = [];
  for (let i = 5; i + 2 < sv.length; i += 3) s.orbs.push({ perk: PERKS[sv[i]] ?? 'hp', x: sv[i + 1], y: sv[i + 2] });
  foes(g)
    .filter((f) => !f.boss)
    .forEach((f, k) => {
      const id = sw[k];
      if (id && f.weapons[0]?.id !== id) f.weapons = [weapon(id)];
    });
  for (const [i, kind, ws] of sb) {
    if (i !== g.fighters.length) continue;
    const b = g.addBoss(kind as BossKind, g.rushNames[kind as BossKind] ?? kind, SURV_TEAM, 0);
    b.weapons = ws.map((id) => weapon(id));
    b.foe = true;
    b.alive = false;
    s.bosses.push([i, kind as BossKind, ws]);
  }
}
