import { BotBrain } from './ai';
import { Body, Cat, Fighter, Snowman } from './entities';
import type { Game } from './game';
import { isBossMode, type Mode } from './types';
import { weapon } from './weapons';

/*
 * November 7: The Kraken lives under the Pirate Ship (nobody tells you).
 * It is a real kraken, not a stickman: it rises out of the sea in the middle of the ship and stays there.
 * 19,998 HP (twice the Fishy boss) and it can be hit any time. Its tentacles grab stickmen and slam them down (160)
 * or throw them away (100), and sometimes every tentacle comes down together in one huge slam (280, very wide).
 * Free For All / Teams: everyone fights it together first, then the match goes back to normal.
 * Boss fights: the bosses get dragged down into the water first, then the Kraken comes up.
 */
export const KRAKEN = {
  hp: 19998,
  slam: 160,
  throw: 100,
  combo: 280,
  comboR: 380,
  grabR: 75,
  coins: 2000,
  /** Seconds before it shows up (Free For All / Teams), or before it drags the bosses down. */
  wait: 6,
  waitBoss: 2.5,
  drag: 2.6,
  rise: 3,
  rest: 3.2,
  reach: 0.9,
  lift: 0.8,
  down: 0.22,
  gather: 1.7,
};
export const KRAKEN_MAP = 'pirate';
export const KRAKEN_TEAM = 99;

export type KrStage = 'wait' | 'drag' | 'rise' | 'fight' | 'done';
export const KR_STAGES: KrStage[] = ['wait', 'drag', 'rise', 'fight', 'done'];
type ArmSt = 'reach' | 'lift' | 'down' | 'back';
const ARM_STS: ArmSt[] = ['reach', 'lift', 'down', 'back'];

/** One tentacle that is going after somebody. */
export interface Arm {
  st: ArmSt;
  t: number;
  /** Where it comes out of the water, and its tip now. */
  bx: number;
  x: number;
  y: number;
  /** Where it is reaching for. */
  tx: number;
  ty: number;
  target: Body | null;
  held: Body | null;
  /** Slam them down, or throw them away. */
  throw: boolean;
}

export interface KrakenState {
  boss: Fighter;
  stage: KrStage;
  t: number;
  /** Free For All / Teams (everyone together first), or a boss fight (the bosses get dragged down). */
  bossMode: boolean;
  /** 0 = under the water, 1 = all the way up. */
  rise: number;
  /** Between moves (seconds left), and the last move. */
  rest: number;
  lastCombo: boolean;
  arms: Arm[];
  /** Every tentacle at once: where it will land, and seconds left gathering (then it smashes). */
  combo: { x: number; t: number; locked: boolean; target: Body | null } | null;
  /** The bosses being dragged down. */
  dragged: Fighter[];
  homeTeams: Map<Fighter, number>;
  beaten: boolean;
  /** The water level and the deck it sits behind. */
  deckY: number;
  cx: number;
}

/** Modes where the Kraken shows up on the Pirate Ship. */
export const krakenMode = (m: Mode) => m === 'ffa' || m === 'team' || (isBossMode(m) && m !== 'rush' && m !== 'phyl' && m !== 'me');

const rand = Math.random;
const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Put the (hidden) Kraken in the match. Call after every other fighter has been added. */
export function makeKraken(g: Game, name: string): KrakenState {
  const deck = [...g.map.platforms].sort((p, q) => q.w - p.w)[0];
  const deckY = deck ? deck.y : g.map.h * 0.75;
  const cx = g.map.w / 2;
  const f = new Fighter({ name, color: '#8e24aa', team: KRAKEN_TEAM, human: false, weapons: [weapon('tentacle')], x: cx, y: deckY, boss: true, hp: KRAKEN.hp });
  f.kraken = true;
  f.w = 240;
  f.h = 300;
  f.scale = 3;
  f.brain = new BotBrain('boss');
  // Under the water until it rises.
  f.alive = false;
  g.fighters.push(f);
  const bossMode = isBossMode(g.mode);
  return {
    boss: f,
    stage: 'wait',
    t: bossMode ? KRAKEN.waitBoss : KRAKEN.wait,
    bossMode,
    rise: 0,
    rest: KRAKEN.rest,
    lastCombo: false,
    arms: [],
    combo: null,
    dragged: [],
    homeTeams: new Map(),
    beaten: false,
    deckY,
    cx,
  };
}

/** The Kraken can't be hurt until it is all the way up. */
export const krakenGuard = (g: Game, b: Body) => !(b instanceof Fighter && b.kraken && g.kr?.stage !== 'fight');

/** Is this body held by a tentacle (or being dragged down)? */
export function krHeld(g: Game, b: Body): boolean {
  const k = g.kr;
  if (!k) return false;
  return k.arms.some((a) => a.held === b) || (b instanceof Fighter && k.dragged.includes(b));
}

const enemies = (g: Game, k: KrakenState) =>
  g.bodies().filter((b) => b.alive && b.team !== k.boss.team && !(b instanceof Fighter && (b.horde || b.kraken)) && !k.arms.some((a) => a.held === b || a.target === b));

/** Every frame (host): the Kraken's whole fight. Runs after everybody has moved, so held stickmen stay in the tentacles. */
export function updateKraken(g: Game, dt: number) {
  const k = g.kr!;
  const f = k.boss;
  k.t -= dt;
  switch (k.stage) {
    case 'wait':
      if (k.t > 0) break;
      if (k.bossMode) {
        k.dragged = g.fighters.filter((b) => b.alive && b.boss && !b.kraken);
        if (k.dragged.length) {
          k.stage = 'drag';
          k.t = KRAKEN.drag;
          g.say('capKrakenDrag', -1, 3);
          g.play('splash');
          break;
        }
      }
      startRise(g, k);
      break;
    case 'drag':
      // Tentacles wrap around the bosses and pull them down through the deck into the sea.
      for (const b of k.dragged) {
        if (!b.alive) continue;
        b.stun = 0.3;
        b.vx = 0;
        b.vy = 0;
        const sink = 1 - k.t / KRAKEN.drag;
        b.y += (sink < 0.3 ? -30 : 260) * dt;
        b.x += (k.cx + sign(b.x - k.cx) * 300 - b.x) * Math.min(1, dt * 0.8);
        if (rand() < dt * 10) g.burst(b.x, k.deckY, '#4fc3f7', 3, 200);
      }
      if (k.t <= 0) {
        for (const b of k.dragged) {
          if (!b.alive) continue;
          g.burst(b.x, k.deckY, '#81d4fa', 24, 420);
          b.alive = false;
          b.hp = 0;
          b.finish = 'void';
        }
        k.dragged = [];
        g.play('splash');
        startRise(g, k);
      }
      break;
    case 'rise':
      k.rise = clamp(1 - k.t / KRAKEN.rise, 0, 1);
      g.shake = Math.max(g.shake, 6 * (1 - k.rise));
      if (rand() < dt * 18) g.burst(k.cx + (rand() - 0.5) * 400, k.deckY + 20, '#b3e5fc', 3, 260);
      if (k.t <= 0) {
        k.rise = 1;
        k.stage = 'fight';
        k.rest = 1.2;
        g.text(k.cx, k.deckY - 360, '🐙 ROAAAR!', '#e1bee7', 40);
      }
      break;
    case 'fight':
      if (!f.alive) {
        down(g, k);
        break;
      }
      // Nothing moves it: it just sits in the middle of the ship.
      f.x = k.cx;
      f.y = k.deckY;
      f.vx = f.vy = 0;
      f.stun = 0;
      f.frozenT = 0;
      f.bubbleT = 0;
      f.slowT = 0;
      f.mattT = 0;
      f.sleepT = 0;
      updateArms(g, k, dt);
      updateCombo(g, k, dt);
      if (!k.arms.length && !k.combo) {
        k.rest -= dt;
        if (k.rest <= 0) startMove(g, k);
      }
      break;
    case 'done':
      k.rise = Math.max(0, k.rise - dt * 0.5);
      break;
  }
}

function startRise(g: Game, k: KrakenState) {
  k.stage = 'rise';
  k.t = KRAKEN.rise;
  const f = k.boss;
  f.alive = true;
  f.hp = f.maxHp;
  // Free For All / Teams: everyone on one side until it goes down.
  if (!k.bossMode) {
    for (const b of g.fighters) {
      if (b.boss) continue;
      k.homeTeams.set(b, b.team);
      b.team = 0;
    }
    for (const s of g.snowmen) s.team = 0;
    for (const c of g.cats) if (!c.owner.boss) c.team = 0;
  }
  g.say('capKrakenRises', -1, 3.5);
  g.play('boom');
}

/** It's beaten: let go of everyone, sink back down, and (Free For All / Teams) back to the normal match. */
function down(g: Game, k: KrakenState) {
  k.beaten = true;
  k.stage = 'done';
  for (const a of k.arms) release(a);
  k.arms = [];
  k.combo = null;
  g.burst(k.cx, k.deckY - 150, '#ce93d8', 40, 620);
  g.burst(k.cx, k.deckY, '#81d4fa', 30, 520);
  g.shake = Math.min(20, g.shake + 14);
  if (!k.bossMode) {
    for (const [b, team] of k.homeTeams) b.team = team;
    for (const s of g.snowmen) s.team = s.owner.team;
    for (const c of g.cats) if (!c.owner.boss) c.team = c.owner.team;
    for (const b of g.groundBalls) b.team = b.owner.team;
    for (const p of g.peels) p.team = p.owner.team;
    g.say(g.mode === 'team' ? 'capKrakenBackTeams' : 'capKrakenBackFfa', -1, 3);
  }
}

/** Grab and slam, grab and throw, or every tentacle at once. */
function startMove(g: Game, k: KrakenState) {
  const foes = enemies(g, k);
  if (!foes.length) {
    k.rest = 0.5;
    return;
  }
  const angry = k.boss.hp < k.boss.maxHp / 2;
  k.rest = KRAKEN.rest * (angry ? 0.75 : 1);
  if (!k.lastCombo && rand() < (angry ? 0.35 : 0.25)) {
    k.lastCombo = true;
    const target = foes[Math.floor(rand() * foes.length)];
    k.combo = { x: target.x, t: KRAKEN.gather, locked: false, target };
    g.text(k.cx, k.deckY - 380, '🐙 ALL TOGETHER!', '#ea80fc', 34);
    g.play('wind');
    return;
  }
  k.lastCombo = false;
  // Up to two tentacles go for the closest stickmen; each one slams or throws.
  const near = foes.sort((a, b) => Math.abs(a.x - k.cx) - Math.abs(b.x - k.cx)).slice(0, foes.length >= 3 ? (angry ? 3 : 2) : 1);
  const throwIt = rand() < 0.45;
  for (const t of near) {
    const side = sign(t.x - k.cx) || 1;
    const bx = k.cx + side * (140 + rand() * 120);
    k.arms.push({ st: 'reach', t: KRAKEN.reach, bx, x: bx, y: k.deckY - 120, tx: t.x, ty: t.cy, target: t, held: null, throw: throwIt });
  }
  g.text(k.cx, k.deckY - 360, throwIt ? '🐙 YOINK!' : '🐙 GRAB!', '#e1bee7', 30);
}

function updateArms(g: Game, k: KrakenState, dt: number) {
  for (const a of k.arms) {
    a.t -= dt;
    switch (a.st) {
      case 'reach': {
        // It follows its target until just before it grabs (so you can get away).
        if (a.target && a.target.alive && a.t > 0.3) {
          a.tx = a.target.x;
          a.ty = a.target.cy;
        }
        const k1 = Math.min(1, dt * 7);
        a.x += (a.tx - a.x) * k1;
        a.y += (a.ty - a.y) * k1;
        if (a.t > 0) break;
        // Grab whoever is right there (the one it went for, or anyone else in the way).
        const got = [a.target, ...enemies(g, k)].find((b) => b && b.alive && Math.hypot(b.x - a.x, b.cy - a.y) < KRAKEN.grabR + b.w / 2) ?? null;
        if (got && !krHeld(g, got)) {
          a.held = got;
          a.st = 'lift';
          a.t = KRAKEN.lift;
          g.text(got.x, got.y - got.h - 30, '😱', '#ffffff', 26);
          g.play('hit');
        } else {
          a.st = 'back';
          a.t = 0.6;
          g.text(a.x, a.y - 40, 'MISS', '#b0bec5', 20);
        }
        break;
      }
      case 'lift': {
        // Up high, swinging a little.
        const ty = k.deckY - 420;
        const k1 = Math.min(1, dt * 5);
        a.y += (ty - a.y) * k1;
        a.x += (a.bx + sign(a.bx - k.cx) * 60 - a.x) * k1;
        hold(a);
        if (a.t > 0) break;
        if (a.throw) {
          // Throw them far away from the ship's middle.
          const b = a.held;
          release(a);
          if (b && b.alive) {
            const dir = sign(b.x - k.cx) || 1;
            g.damage(b, KRAKEN.throw, k.boss, dir * 950, -1100, 'fling');
            g.text(b.x, b.y - b.h - 30, 'YEET!', '#ffeb3b', 28);
          }
          a.st = 'back';
          a.t = 0.6;
        } else {
          a.st = 'down';
          a.t = KRAKEN.down;
        }
        break;
      }
      case 'down': {
        // Slam them into the deck.
        a.y += (k.deckY - 10 - a.y) * Math.min(1, dt * 18);
        hold(a);
        if (a.t > 0) break;
        const b = a.held;
        release(a);
        if (b && b.alive) {
          b.y = k.deckY - 2;
          g.damage(b, KRAKEN.slam, k.boss, (sign(b.x - k.cx) || 1) * 200, -300, 'trip');
        }
        g.burst(a.x, k.deckY, '#8d6e63', 16, 360);
        g.ring(a.x, k.deckY, 120, 0.35, '#ce93d8');
        g.shake = Math.min(18, g.shake + 8);
        g.play('heavy');
        g.text(a.x, k.deckY - 90, 'SLAM!', '#ff80ab', 30);
        a.st = 'back';
        a.t = 0.6;
        break;
      }
      case 'back':
        a.x += (a.bx - a.x) * Math.min(1, dt * 4);
        a.y += (k.deckY + 40 - a.y) * Math.min(1, dt * 4);
        break;
    }
  }
  k.arms = k.arms.filter((a) => !(a.st === 'back' && a.t <= 0));
}

/** Hold the grabbed body at the tentacle's tip. */
function hold(a: Arm) {
  const b = a.held;
  if (!b) return;
  if (!b.alive) {
    a.held = null;
    return;
  }
  b.x = a.x;
  b.y = a.y + b.h / 2;
  b.vx = 0;
  b.vy = 0;
  b.stun = Math.max(b.stun, 0.25);
  b.onGround = false;
  if (b instanceof Fighter) b.shielding = false;
}

function release(a: Arm) {
  a.held = null;
  a.target = null;
}

/** Every tentacle comes up together over somebody, then everything comes down at once. */
function updateCombo(g: Game, k: KrakenState, dt: number) {
  const c = k.combo;
  if (!c) return;
  c.t -= dt;
  if (!c.locked) {
    if (c.target && c.target.alive) c.x += (c.target.x - c.x) * Math.min(1, dt * 3);
    c.x = clamp(c.x, k.cx - 700, k.cx + 700);
    if (c.t < 0.7) c.locked = true;
  }
  if (c.t > 0) return;
  k.combo = null;
  for (const e of g.bodies()) {
    if (!e.alive || e.team === k.boss.team || (e instanceof Fighter && e.kraken)) continue;
    if (Math.abs(e.x - c.x) > KRAKEN.comboR + e.w / 2 || e.y < k.deckY - 420 || e.y > k.deckY + 200) continue;
    g.damage(e, KRAKEN.combo, k.boss, (sign(e.x - c.x) || 1) * 900, -900, 'pieces');
  }
  g.ring(c.x, k.deckY, KRAKEN.comboR, 0.5, '#ea80fc');
  g.burst(c.x, k.deckY, '#ce93d8', 34, 600);
  g.burst(c.x, k.deckY, '#8d6e63', 20, 420);
  g.shake = Math.min(24, g.shake + 18);
  g.play('boom');
  g.text(c.x, k.deckY - 120, '💥 KRAKEN SLAM!', '#ea80fc', 38);
}

/** Who wins (null = the normal rules decide). */
export function krakenWinner(g: Game, helpers: Body[]): { decided: boolean; team: number | null } | null {
  const k = g.kr!;
  if (k.stage === 'done') return null;
  if (k.stage === 'wait') return k.bossMode ? { decided: false, team: null } : null;
  if (k.stage === 'drag' || k.stage === 'rise') return { decided: false, team: null };
  // Fighting it: the Kraken beaten (boss fights end there), or nobody left on your side.
  if (!k.boss.alive) return k.bossMode ? { decided: true, team: 0 } : null;
  const ours = g.fighters.some((f) => f.alive && !f.boss) || helpers.some((h) => h.team !== k.boss.team && !(h instanceof Cat && h.owner.boss) && !(h instanceof Snowman && h.owner.boss));
  if (!ours) return { decided: true, team: k.boss.team };
  return { decided: false, team: null };
}

// ---------- online ----------

export function encodeKraken(g: Game): number[] {
  const k = g.kr!;
  const r1 = Math.round;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const out = [KR_STAGES.indexOf(k.stage), r2(k.t), r2(k.rise), k.combo ? r1(k.combo.x) : -99999, k.combo ? r2(k.combo.t) : 0, k.beaten ? 1 : 0, k.arms.length];
  for (const a of k.arms) out.push(ARM_STS.indexOf(a.st), r1(a.bx), r1(a.x), r1(a.y), a.held ? 1 : 0);
  return out;
}

export function applyKraken(g: Game, d: number[]) {
  const k = g.kr!;
  k.stage = KR_STAGES[d[0]] ?? 'fight';
  k.t = d[1];
  k.rise = d[2];
  k.combo = d[3] === -99999 ? null : { x: d[3], t: d[4], locked: true, target: null };
  k.beaten = d[5] === 1;
  const n = d[6] ?? 0;
  k.arms = [];
  for (let i = 0; i < n; i++) {
    const o = 7 + i * 5;
    k.arms.push({ st: ARM_STS[d[o]] ?? 'back', t: 1, bx: d[o + 1], x: d[o + 2], y: d[o + 3], tx: d[o + 2], ty: d[o + 3], target: null, held: null, throw: d[o + 4] === 1 });
  }
}
