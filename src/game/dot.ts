import { nearestEnemy } from './ai';
import { Fighter, type Body } from './entities';
import type { Game } from './game';
import type { Intent } from './types';
import { weapon, type WeaponId } from './weapons';

/*
 * The "." boss: every boss in one. It has 3 hearts instead of HP and the fight goes in turns.
 * Its turn: a chain of attacks from the other bosses, one after another. Your turn: it comes down, tired,
 * and the first hit takes one heart. Then it attacks again. The third hit beats it.
 */

export const DOT = {
  hearts: 3,
  /** Attacks in each of its turns (it picks a number in between). */
  chainMin: 5,
  chainMax: 8,
  /** Seconds between its attacks. */
  gap: 1.5,
  /** Seconds of your turn before it gets back up. */
  yourT: 7,
  size: 120,
  dive: 70,
  slam: 120,
  slamR: 230,
  zoneWarn: 1.1,
  shock: 60,
  shockR: 280,
  rain: 40,
};

/** Its attacks, each one from another boss. `w`: the boss weapon whose skill it borrows (none = its own move, below). */
export const DOT_MOVES: { icon: string; name: string; w?: WeaponId; color: string }[] = [
  { icon: '👹', name: 'Boss', w: 'thunder', color: '#ffeb3b' },
  { icon: '🐱', name: 'Grandfather Cat', w: 'soup', color: '#ff9800' },
  { icon: '⚪', name: 'Mascot', color: '#ffffff' },
  { icon: '🐃', name: 'Buffalo', w: 'horns', color: '#8d6e63' },
  { icon: '🐟', name: 'Fishy', w: 'trident', color: '#29b6f6' },
  { icon: '🐦', name: 'The Pigeon', color: '#90a4ae' },
  { icon: '❄️', name: 'Snow Queen', w: 'scepter', color: '#81d4fa' },
  { icon: '🌊', name: 'Tide King', w: 'kingtrident', color: '#0288d1' },
  { icon: '🌲', name: 'Ancient Guardian', w: 'vinestaff', color: '#7cb342' },
  { icon: '🐘', name: 'Magical Elephant', color: '#b0bec5' },
  { icon: '🌾', name: 'Giant Scarecrow', w: 'pitchfork', color: '#c49a5a' },
  { icon: '🤖', name: 'Robo Stick', w: 'robocannon', color: '#78909c' },
  { icon: '🍝', name: 'Jay mhuay', w: 'macaroni', color: '#ec407a' },
  { icon: '🦀', name: 'Jay mhuay', w: 'friedrice', color: '#ff7043' },
  { icon: '📖', name: 'PHYLISHIEUS', color: '#7e57c2' },
  { icon: '🐙', name: 'The Kraken', color: '#ad1457' },
];
const MASCOT = 2;
const PIGEON = 5;
const ELEPHANT = 9;
const PHYL = 14;
const KRAKEN = 15;

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = Math.random;

/** Make a boss fighter into the "." (a big round dot with eyes). */
export function initDot(f: Fighter) {
  f.w = DOT.size;
  f.h = DOT.size;
  f.scale = 1.8;
  f.speed = 320;
  f.hp = f.maxHp = DOT.hearts;
  f.weapons = [weapon('dotcore')];
  f.cds = [0];
  f.angles = [0.9];
  f.angVel = [0];
  f.boomerangOut = [false];
  f.dot = { turn: 'boss', t: 0, left: chain(), move: -1, moveT: 1.4, dive: 0, zoneT: 0, zoneX: 0, zoneY: 0, bob: rand() * 6 };
}

const chain = () => DOT.chainMin + Math.floor(rand() * (DOT.chainMax - DOT.chainMin + 1));

/** Its turn starts (it always goes first). */
function bossTurn(f: Fighter) {
  const d = f.dot!;
  d.turn = 'boss';
  d.left = chain();
  d.moveT = 1.2;
  d.dive = 0;
}

function yourTurn(g: Game, f: Fighter) {
  const d = f.dot!;
  d.turn = 'you';
  d.t = DOT.yourT;
  d.dive = 0;
  f.weapons = [weapon('dotcore')];
  f.cds = [0];
  g.say('dotYourTurn', g.fighters.indexOf(f), 2.5);
  g.text(f.x, f.y - f.h - 40, '😮‍💨', '#ffffff', 34);
  g.play('snowman');
}

/** Every frame, instead of a bot's brain: fly around, take its turns. */
export function dotThink(g: Game, f: Fighter, it: Intent, dt: number) {
  const d = f.dot!;
  // Nothing slows it down or knocks it over.
  f.stun = f.frozenT = f.bubbleT = f.sleepT = f.downT = f.burnT = f.poisonT = f.mattT = f.slowT = 0;
  it.jump = false;
  it.shield = false;
  it.skill = null;
  it.aim = null;
  d.bob += dt;
  const t = nearestEnemy(g, f);
  let tx = g.map.w / 2;
  let ty = g.map.h * 0.4;
  if (d.turn === 'you') {
    // Tired: it sinks down to the ground near you, where anyone can reach it.
    if (t) {
      tx = t.x + (f.x < t.x ? -1 : 1) * 110;
      ty = groundUnder(g, tx, t.y) - 4 + Math.sin(d.bob * 2) * 6;
    }
    d.t -= dt;
    if (d.t <= 0) {
      g.say('dotTooSlow', g.fighters.indexOf(f), 2);
      bossTurn(f);
    }
  } else {
    if (t) {
      tx = t.x + (f.x < t.x ? -1 : 1) * 220;
      ty = t.y - 230 + Math.sin(d.bob * 2.4) * 30;
    }
    if (d.dive > 0) {
      dive(g, f, t, dt);
      return;
    }
    if (d.zoneT > 0) {
      d.zoneT -= dt;
      if (d.zoneT <= 0) krakenSlam(g, f);
    }
    d.moveT -= dt;
    if (d.moveT <= 0) {
      if (d.left > 0 && t) {
        d.left--;
        d.moveT = DOT.gap;
        attack(g, f, t);
      } else if (d.zoneT <= 0) yourTurn(g, f);
    }
  }
  ty = clamp(ty, 60, g.map.h - 40);
  const dx = tx - f.x;
  it.moveX = Math.abs(dx) > 20 ? clamp(dx / 160, -1, 1) : 0;
  f.vy += ((ty - f.y) * 3 - f.vy) * Math.min(1, dt * 4);
  if (t && d.turn === 'boss') f.facing = sign(t.x - f.x) || f.facing;
}

/** The top of the first platform below (x, y), so it lands where you can reach it even while you jump. */
function groundUnder(g: Game, x: number, y: number): number {
  let best = Infinity;
  for (const p of g.map.platforms) if (x >= p.x && x <= p.x + p.w && p.y >= y - 10 && p.y < best) best = p.y;
  return best === Infinity ? y : best;
}

/** One attack, borrowed from a random boss (never the same one twice in a row). */
function attack(g: Game, f: Fighter, t: Body) {
  const d = f.dot!;
  let k = Math.floor(rand() * DOT_MOVES.length);
  if (k === d.move) k = (k + 1) % DOT_MOVES.length;
  d.move = k;
  const mv = DOT_MOVES[k];
  g.text(f.x, f.y - f.h - 50, `${mv.icon} ${mv.name}!`, mv.color, 26);
  g.burst(f.x, f.cy, mv.color, 14, 300);
  const angle = Math.atan2(t.cy - f.cy, t.x - f.x);
  if (mv.w) {
    f.weapons = [weapon(mv.w)];
    f.cds = [0];
    f.boomerangOut = [false];
    f.angles = [angle];
    f.angVel = [0];
    g.useSkill(f, 0, angle);
    return;
  }
  switch (k) {
    case MASCOT:
      shock(g, f);
      break;
    case PIGEON:
      d.dive = 0.9;
      f.hitCd.clear();
      g.play('jump');
      break;
    case ELEPHANT:
      for (let i = 0; i < 8; i++) g.spawnProj('water', f, f.x, f.cy, angle + (rand() - 0.5) * 0.35, 1000 + rand() * 300, 500, 14, 0);
      g.play('splash');
      break;
    case PHYL:
      // Burning books fall from the sky around you.
      for (let i = 0; i < 6; i++) {
        const x = t.x + (i - 2.5) * 110 + (rand() - 0.5) * 40;
        g.spawnProj('fireball', f, x, t.y - 700 - rand() * 150, Math.PI / 2, 650, 300, DOT.rain, 0);
      }
      g.play('boom');
      break;
    case KRAKEN:
      d.zoneT = DOT.zoneWarn;
      d.zoneX = t.x;
      d.zoneY = t.y;
      g.play('splash');
      break;
  }
}

/** The Pigeon's dive: straight at you, and it hits everyone on the way. */
function dive(g: Game, f: Fighter, t: Body | null, dt: number) {
  const d = f.dot!;
  d.dive -= dt;
  if (t) {
    const dx = t.x - f.x;
    const dy = t.cy - f.cy;
    const len = Math.hypot(dx, dy) || 1;
    f.vx = (dx / len) * 1300;
    f.vy = (dy / len) * 1300;
  }
  f.x = clamp(f.x + f.vx * dt, 20, g.map.w - 20);
  f.y = clamp(f.y + f.vy * dt, 60, g.map.h - 20);
  for (const e of g.bodies()) {
    if (!e.alive || e.team === f.team || (f.hitCd.get(e.id) ?? 0) > g.time) continue;
    if (Math.hypot(e.x - f.x, e.cy - f.cy) > f.w / 2 + e.w / 2 + 10) continue;
    f.hitCd.set(e.id, g.time + 1);
    g.damage(e, DOT.dive, f, (sign(e.x - f.x) || 1) * 700, -600, 'fling');
  }
  if (d.dive <= 0) {
    f.vy = -500;
    d.dive = 0;
  }
}

/** The Mascot's smash: a shockwave all around it. */
function shock(g: Game, f: Fighter) {
  g.ring(f.x, f.cy, DOT.shockR, 0.45, '#ffffff');
  g.burst(f.x, f.cy, '#ffffff', 20, 420);
  g.shake = Math.min(18, g.shake + 8);
  g.play('boom');
  for (const e of g.bodies()) {
    if (!e.alive || e.team === f.team) continue;
    const dx = e.x - f.x;
    if (Math.hypot(dx, e.cy - f.cy) > DOT.shockR + e.w / 2) continue;
    g.damage(e, DOT.shock, f, (sign(dx) || 1) * 650, -650, 'fling');
  }
}

/** The Kraken's slam: tentacles come down over the marked zone. */
function krakenSlam(g: Game, f: Fighter) {
  const d = f.dot!;
  d.zoneT = 0;
  g.ring(d.zoneX, d.zoneY - 30, DOT.slamR, 0.4, '#ad1457');
  g.burst(d.zoneX, d.zoneY - 20, '#ad1457', 24, 460);
  g.burst(d.zoneX, d.zoneY - 20, '#4fc3f7', 14, 360);
  g.text(d.zoneX, d.zoneY - 140, '🐙 SLAM!', '#f48fb1', 30);
  g.shake = Math.min(18, g.shake + 12);
  g.play('boom');
  for (const e of g.bodies()) {
    if (!e.alive || e.team === f.team) continue;
    if (Math.abs(e.x - d.zoneX) > DOT.slamR + e.w / 2 || Math.abs(e.y - d.zoneY) > 260) continue;
    g.damage(e, DOT.slam, f, (sign(e.x - d.zoneX) || 1) * 500, -900, 'fling');
  }
}

/**
 * A hit about to land on the ".". Returns null for anyone else. On its turn nothing gets through (false);
 * on your turn the first hit takes a heart (true) and its turn starts again.
 */
export function dotGuard(g: Game, target: Body, src: Body | null): boolean | null {
  if (!(target instanceof Fighter) || !target.dot || !target.alive) return null;
  const d = target.dot;
  if (d.turn !== 'you' || !src) {
    if (src && rand() < 0.3) g.text(target.x, target.y - target.h - 20, '🛡️', '#ffffff', 22);
    return false;
  }
  target.hp -= 1;
  target.hurtFlash = 0.3;
  g.shake = Math.min(18, g.shake + 10);
  g.burst(target.x, target.cy, '#ff1744', 20, 420);
  g.text(target.x, target.y - target.h - 40, '💔', '#ff1744', 40);
  g.play('heavy');
  const by = src instanceof Fighter ? src : null;
  if (by && by !== target) {
    target.lastHitBy = by;
    target.lastHitT = g.time;
  }
  if (target.hp <= 0) {
    g.kill(target, src, 'pop');
    return true;
  }
  g.say(target.hp === 1 ? 'dotLastHeart' : 'dotHit', g.fighters.indexOf(target), 2.2);
  bossTurn(target);
  target.vy = -600;
  return true;
}
