import { BotBrain } from './ai';
import { Body, Fighter } from './entities';
import type { Game } from './game';
import type { Intent, MapDef, Platform } from './types';
import { weapon } from './weapons';

/*
 * PHYLISHIEUS: the final secret boss (unlock all 28 achievements), fought in The Forbidden Tome Keep.
 * He floats at the very top of the map raining meteors, swords and fireballs (phase 2 adds chasing spell books,
 * lasers and shockwaves) and can't be hurt up there. When he gets tired he comes down and you can hit him.
 * After the first round he says "YOU ALL SHOULD DIE." and drops a 500,000 bomb: only the two glowing bottom corners
 * are safe. Then the Tome Golem rises to fight on your side, until "WHY ARE YOU STILL HERE?" at 25,000 HP.
 */

export const PHYL = {
  hp: { 1: 75000, 2: 100000 } as Record<1 | 2, number>,
  /** Seconds up at the top attacking, and seconds tired on the ground. */
  attack: { 1: 25, 2: 22 } as Record<1 | 2, number>,
  tired: 8,
  intro: 3,
  /** Seconds from "YOU ALL SHOULD DIE." to the bomb going off. */
  bombWarn: 8,
  bomb: 500000,
  /** How far in from each end of the floor the safe corners reach. */
  corner: 520,
  dying: 3.6,
  golemHp: 30000,
  meteor: 120,
  meteorR: 170,
  sword: 100,
  fire: 45,
  book: 40,
  laser: 140,
  wave: 80,
};

/** Append only (online sends the index). */
export const PHY_STATES = ['intro', 'attack', 'bomb', 'fall', 'tired', 'rise', 'dying'] as const;
export type PhyStateId = (typeof PHY_STATES)[number];
/** Append only (online sends the index). */
export const HAZ_KINDS = ['meteor', 'sword', 'fire', 'book', 'laser', 'wave'] as const;
export type HazKind = (typeof HAZ_KINDS)[number];
/** How he looks: floating, tired on the floor, holding up the bomb, or going down. */
export const PHY_POSES = { float: 0, tired: 1, bomb: 2, dying: 3 };

/** Something he throws at you. Swords and lasers warn first (t counts up from 0). */
export interface Hazard {
  k: HazKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  /** Swords: where it stops. Lasers: where the beam points. */
  tx: number;
  ty: number;
  /** A huge laser (the one that finishes off the Tome Golem). */
  big?: boolean;
  hit?: Set<Body>;
  dead?: boolean;
}

export interface PhylState {
  boss: Fighter;
  phase: 1 | 2;
  /** The real mode (the story, the Golem and the lines). Sandbox only has the fight. */
  story: boolean;
  st: PhyStateId;
  t: number;
  hz: Hazard[];
  clocks: Record<HazKind, number>;
  bombs: number;
  /** The white flash when the bomb goes off (1 to 0). */
  flash: number;
  golem: Fighter | null;
  why: boolean;
  /** HP he can't be pushed below in one tired spell (the last one is 0). */
  checks: number[];
  peak: { x: number; y: number };
  floor: Platform | null;
  /** The last blow has landed: now he may really go down. */
  final: boolean;
}

const rand = Math.random;
const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------- the map ----------

const P = (x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h });
const B = (kind: Platform['kind'], x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h, kind });
const M = (x: number, y: number, w: number, dx: number, dy: number, period: number, phase = 0): Platform => ({ x, y, w, h: 22, move: { dx, dy, period, phase } });

/** The Forbidden Tome Keep: a Giant (4400 x 2400) library tower. He floats over the altar at the top. */
export const TOME_MAP: MapDef = {
  id: 'tomekeep',
  name: 'm.tomekeep',
  w: 4400,
  h: 2400,
  theme: 'tome',
  builtin: true,
  platforms: [
    // The great hall floor, wall to wall (the two ends are the safe corners).
    P(0, 2250, 4400, 150),
    B('wall', 0, 1500, 40, 750),
    B('wall', 4360, 1500, 40, 750),
    // Bookshelves, tier by tier.
    P(600, 1980, 480),
    P(1500, 1980, 480),
    P(2420, 1980, 480),
    P(3320, 1980, 480),
    P(260, 1690, 400),
    P(1060, 1690, 430),
    P(1985, 1690, 430),
    P(2910, 1690, 430),
    P(3740, 1690, 400),
    P(620, 1400, 430),
    B('glass', 1500, 1400, 380, 22),
    B('glass', 2520, 1400, 380, 22),
    P(3350, 1400, 430),
    P(240, 1110, 380),
    M(1020, 1110, 320, 300, 0, 6),
    P(1985, 1110, 430),
    M(3060, 1110, 320, -300, 0, 6),
    P(3780, 1110, 380),
    P(700, 820, 400),
    B('ice', 1520, 800, 300, 22),
    B('ice', 2580, 800, 300, 22),
    P(3300, 820, 400),
    // The altar at the peak, where he floats.
    B('concrete', 1900, 520, 600, 40),
    // Bounce pads up from the floor.
    B('bounce', 1180, 2230, 80, 20),
    B('bounce', 3140, 2230, 80, 20),
    B('bounce', 2160, 2230, 80, 20),
  ],
  spawns: [1300, 1500, 1700, 1900, 2100, 2300, 2500, 2700, 2900, 3100].map((x) => ({ x, y: 2250 })),
};

// ---------- start ----------

/** Make PHYLISHIEUS (phase 1 or 2). Bosses go after the fighters, so every device makes him at the same index. */
export function makePhyl(g: Game, phase: 1 | 2, name: string, team: number, hp?: number): Fighter {
  const f = new Fighter({ name, color: '#4a148c', team, human: false, weapons: [weapon('staff')], x: g.map.w / 2, y: -400, boss: true, hp: hp ?? PHYL.hp[phase] });
  f.phyl = phase;
  f.w = 140;
  f.h = 300;
  f.brain = new BotBrain('boss');
  g.fighters.push(f);
  // Only one of him runs the show (Sandbox may have both phases: the second just floats along).
  if (!g.phy) g.phy = startPhyl(g, f, phase, g.mode === 'phyl');
  return f;
}

function startPhyl(g: Game, boss: Fighter, phase: 1 | 2, story: boolean): PhylState {
  const top = Math.min(...g.map.platforms.filter((p) => p.kind !== 'lava').map((p) => p.y), g.map.h * 0.5);
  const floor = [...g.map.platforms].filter((p) => p.kind !== 'lava' && p.kind !== 'spikes' && p.kind !== 'wall' && !p.move).sort((a, b) => b.w - a.w)[0] ?? null;
  const max = boss.maxHp;
  const checks = (phase === 1 ? [2 / 3, 1 / 3, 0] : [3 / 4, 1 / 2, 1 / 4, 0]).map((k) => Math.round(max * k));
  const st: PhylState = {
    boss,
    phase,
    story,
    st: 'intro',
    t: PHYL.intro,
    hz: [],
    clocks: { meteor: 2, sword: 1.2, fire: 0.6, book: 3, laser: 3.5, wave: 4 },
    bombs: 0,
    flash: 0,
    golem: null,
    why: false,
    checks,
    peak: { x: g.map.w / 2, y: Math.max(330, top - 60) },
    floor,
    final: false,
  };
  boss.x = st.peak.x;
  boss.y = st.peak.y - 900;
  // The Tome Golem waits, asleep, until after the first bomb.
  if (story) {
    const gol = new Fighter({ name: g.golemName, color: '#8d6e63', team: 0, human: false, weapons: [weapon('hammer'), weapon('morningstar')], x: st.peak.x, y: floor?.y ?? g.map.h - 200, boss: true, hp: PHYL.golemHp });
    gol.golem = true;
    gol.w = 110;
    gol.h = 290;
    gol.scale = 3.6;
    gol.alive = false;
    gol.hp = 0;
    gol.brain = new BotBrain('boss');
    g.fighters.push(gol);
    st.golem = gol;
  }
  if (story) g.say(phase === 2 ? 'phyBack' : 'phyIntro', g.fighters.indexOf(boss), PHYL.intro);
  return st;
}

// ---------- the fight ----------

/** Is this body in one of the two glowing safe corners? */
export function inSafeCorner(p: PhylState, b: Body): boolean {
  const fl = p.floor;
  if (!fl) return false;
  const nearFloor = b.y > fl.y - 320 && b.y < fl.y + 40;
  const w = cornerW(p);
  return nearFloor && (b.x < fl.x + w || b.x > fl.x + fl.w - w);
}

/** How wide each safe corner is (smaller on small Sandbox maps, so the whole floor isn't safe). */
export function cornerW(p: PhylState): number {
  return Math.min(PHYL.corner, (p.floor?.w ?? 0) * 0.15);
}

/** His side's enemies: everyone he is fighting (players, bots, helpers and the Golem). */
function foes(g: Game, p: PhylState): Body[] {
  return g.bodies().filter((b) => b.alive && b.team !== p.boss.team);
}

function pickTarget(g: Game, p: PhylState): Body | null {
  const list = foes(g, p).filter((b) => b.kind === 'fighter');
  const pool = list.length ? list : foes(g, p);
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}

function go(p: PhylState, st: PhyStateId, t: number) {
  p.st = st;
  p.t = t;
}

/** Where he stands when he is tired: the middle of the floor. */
function restSpot(g: Game, p: PhylState) {
  const fl = p.floor;
  return fl ? { x: clamp(p.peak.x, fl.x + 200, fl.x + fl.w - 200), y: fl.y } : { x: g.map.w / 2, y: g.map.h - 100 };
}

export function updatePhyl(g: Game, dt: number) {
  const p = g.phy!;
  const f = p.boss;
  p.flash = Math.max(0, p.flash - dt * 0.8);
  updateHazards(g, p, dt);
  if (!f.alive) return;
  f.stun = 0;
  f.frozenT = 0;
  f.bubbleT = 0;
  f.burnT = 0;
  f.poisonT = 0;
  f.slowT = 0;
  f.vx = 0;
  f.vy = 0;
  f.walkPhase += dt * 3;
  p.t -= dt;
  const hover = () => {
    f.x += (p.peak.x + Math.sin(g.time * 0.7) * 260 - f.x) * Math.min(1, dt * 2);
    f.y += (p.peak.y + Math.sin(g.time * 1.3) * 30 - f.y) * Math.min(1, dt * 2);
    f.onGround = false;
  };
  f.phyPose = p.st === 'tired' ? PHY_POSES.tired : p.st === 'bomb' ? PHY_POSES.bomb : p.st === 'dying' ? PHY_POSES.dying : PHY_POSES.float;
  switch (p.st) {
    case 'intro':
      f.y += (p.peak.y - f.y) * Math.min(1, dt * 2.2);
      f.x = p.peak.x;
      if (p.t <= 0) go(p, 'attack', PHYL.attack[p.phase]);
      break;
    case 'attack':
      hover();
      spawnHazards(g, p, dt);
      if (p.t <= 0) {
        // The bomb: after the first round (phase 2 also once he is down to half).
        const due = p.bombs === 0 || (p.phase === 2 && p.bombs === 1 && f.hp <= f.maxHp / 2);
        if (due) {
          go(p, 'bomb', PHYL.bombWarn);
          if (p.story || p.bombs === 0) g.say('phyDie', g.fighters.indexOf(f), 3);
          g.play('boom');
          g.shake = Math.min(18, g.shake + 8);
        } else go(p, 'fall', 3);
      }
      break;
    case 'bomb':
      hover();
      if (p.t <= 0) {
        bigBomb(g, p);
        go(p, 'fall', 3);
      }
      break;
    case 'fall': {
      const to = restSpot(g, p);
      f.x += (to.x - f.x) * Math.min(1, dt * 4);
      f.y = Math.min(to.y, f.y + 1700 * dt);
      if (f.y >= to.y || p.t <= 0) {
        f.y = to.y;
        f.onGround = true;
        slam(g, p, to.x, to.y);
        go(p, 'tired', PHYL.tired);
        g.text(f.x, f.y - f.h - 40, '😮‍💨 TIRED!', '#ffeb3b', 40);
        if (p.story) g.say('phyTired', -1, 2);
      }
      break;
    }
    case 'tired':
      f.onGround = true;
      f.y = restSpot(g, p).y;
      // Pushed down to the next mark: back up he goes (and at 0, the end).
      if (f.hp <= Math.max(1, p.checks[0] ?? 0)) {
        const mark = p.checks.shift() ?? 0;
        if (mark <= 0) {
          go(p, 'dying', PHYL.dying);
          p.hz = [];
          g.say(p.phase === 2 ? 'phyEnd2' : 'phyEnd1', g.fighters.indexOf(f), PHYL.dying);
          g.play('ko');
          break;
        }
        if (p.story && !p.why && p.golem?.alive && mark === Math.round(f.maxHp * (p.phase === 1 ? 1 / 3 : 1 / 4))) killGolem(g, p);
        go(p, 'rise', 2.5);
        g.text(f.x, f.y - f.h - 40, '⬆️', '#e1bee7', 40);
      } else if (p.t <= 0) go(p, 'rise', 2.5);
      break;
    case 'rise':
      f.y += (p.peak.y - f.y) * Math.min(1, dt * 2.5);
      f.x += (p.peak.x - f.x) * Math.min(1, dt * 2.5);
      f.onGround = false;
      if (p.t <= 0 || Math.abs(f.y - p.peak.y) < 20) go(p, 'attack', PHYL.attack[p.phase]);
      break;
    case 'dying':
      f.x += (rand() - 0.5) * 8;
      if (rand() < dt * 20) g.burst(f.x + (rand() - 0.5) * f.w, f.y - rand() * f.h, rand() < 0.5 ? '#e040fb' : '#ffffff', 4, 300);
      g.shake = Math.min(10, g.shake + dt * 20);
      if (p.t <= 0) {
        p.final = true;
        f.hp = 0;
        g.ring(f.x, f.cy, 900, 1, '#e040fb');
        for (const c of ['#e040fb', '#7c4dff', '#ffffff', '#ffd740']) g.burst(f.x, f.cy, c, 24, 900);
        g.shake = 18;
        g.play('boom');
        g.kill(f, null, 'pop');
      }
      break;
  }
}

/** Damage to him: none while he is up there, and he can't be pushed past his next mark in one go. Returns the damage that lands. */
export function phylGuard(g: Game, f: Fighter, amount: number): number {
  const p = g.phy;
  if (!p || p.boss !== f) return amount;
  if (p.st !== 'tired') {
    if (rand() < 0.15) g.text(f.x + (rand() - 0.5) * 60, f.y - f.h - 20, '🛡️ IMMUNE', '#b388ff', 20);
    return 0;
  }
  return Math.max(0, Math.min(amount, f.hp - Math.max(1, p.checks[0] ?? 0)));
}

/** He can only really go down at the very end. */
export function phylCanDie(g: Game, b: Body): boolean {
  const p = g.phy;
  return !p || p.boss !== b || p.final;
}

function spawnHazards(g: Game, p: PhylState, dt: number) {
  const two = p.phase === 2;
  const every: Record<HazKind, number> = two
    ? { meteor: 1.2, sword: 0.8, fire: 0.3, book: 2.4, laser: 2.8, wave: 5 }
    : { meteor: 1.6, sword: 1.0, fire: 0.4, book: 0, laser: 0, wave: 0 };
  const f = p.boss;
  for (const k of HAZ_KINDS) {
    if (!every[k]) continue;
    p.clocks[k] -= dt;
    if (p.clocks[k] > 0) continue;
    p.clocks[k] = every[k] * (0.7 + rand() * 0.6);
    const tg = pickTarget(g, p);
    if (!tg) return;
    const near = clamp(tg.x + (rand() - 0.5) * 500, 40, g.map.w - 40);
    const floorY = p.floor?.y ?? g.map.h;
    switch (k) {
      case 'meteor': {
        const vx = (rand() < 0.5 ? -1 : 1) * (200 + rand() * 200);
        // Aim so it comes down near them (it starts above the top of the map, falling at an angle).
        const fallT = Math.sqrt((2 * (tg.y + 300)) / 1400);
        p.hz.push({ k, x: near - vx * fallT, y: -300, vx, vy: 300, t: 0, tx: near, ty: tg.y });
        break;
      }
      case 'sword':
        p.hz.push({ k, x: near, y: -200, vx: 0, vy: 0, t: 0, tx: near, ty: floorY });
        break;
      case 'fire':
        p.hz.push({ k, x: clamp(near + (rand() - 0.5) * 400, 20, g.map.w - 20), y: -100, vx: (rand() - 0.5) * 120, vy: 650 + rand() * 250, t: 0, tx: 0, ty: 0 });
        break;
      case 'book':
        for (const s of [-1, 1]) p.hz.push({ k, x: f.x + s * 90, y: f.y - f.h * 0.6, vx: s * 300, vy: -200, t: 0, tx: 0, ty: 0 });
        g.text(f.x, f.y - f.h - 30, '📚', '#ffffff', 30);
        break;
      case 'laser': {
        // From his staff, through them, all the way down.
        const sx = f.x;
        const sy = f.y - f.h * 0.75;
        const a = Math.atan2(tg.cy - sy, tg.x - sx);
        const len = Math.hypot(g.map.w, g.map.h);
        p.hz.push({ k, x: sx, y: sy, vx: 0, vy: 0, t: 0, tx: sx + Math.cos(a) * len, ty: sy + Math.sin(a) * len });
        break;
      }
      case 'wave':
        waves(p);
        break;
    }
  }
}

/** Phase 2: shockwaves run along the floor from where he is (jump over them). */
function waves(p: PhylState, at?: number) {
  const fl = p.floor;
  if (!fl) return;
  const x = at ?? clamp(p.boss.x, fl.x + 40, fl.x + fl.w - 40);
  for (const s of [-1, 1]) p.hz.push({ k: 'wave', x, y: fl.y, vx: s * 950, vy: 0, t: 0, tx: 0, ty: 0 });
}

const SWORD_WARN = 1.1;
const LASER_WARN = 1.0;
const LASER_FIRE = 0.45;

function updateHazards(g: Game, p: PhylState, dt: number) {
  const list = foes(g, p);
  for (const h of p.hz) {
    h.t += dt;
    switch (h.k) {
      case 'meteor': {
        h.vy = Math.min(2400, h.vy + 1400 * dt);
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.y > 0 && (list.some((b) => b.contains(h.x, h.y, 34)) || hitsGround(g, h.x, h.y + 30) || h.y > g.map.h + 100)) {
          h.dead = true;
          boom(g, p, h.x, Math.min(h.y, g.map.h), PHYL.meteorR, PHYL.meteor, '#ff6d00');
          g.text(h.x, h.y - 60, '☄️ BOOM!', '#ffab40', 30);
        }
        break;
      }
      case 'sword': {
        if (h.t < SWORD_WARN) break;
        h.vy = Math.min(4200, h.vy + 9000 * dt);
        const y0 = h.y;
        h.y = Math.min(h.ty, h.y + h.vy * dt);
        h.hit ??= new Set();
        // Cuts through anyone in its path on the way down.
        for (const b of list) {
          if (h.hit.has(b) || Math.abs(b.x - h.x) > b.w / 2 + 24 || b.y < y0 - 20 || b.y - b.h > h.y) continue;
          h.hit.add(b);
          g.damage(b, PHYL.sword, p.boss, (sign(b.x - h.x) || 1) * 500, -700, 'ragdoll');
        }
        if (h.y >= h.ty && !h.dead && h.vx === 0) {
          // Stuck in the floor: a ringing strike.
          h.vx = 1;
          h.vy = 0;
          h.t = SWORD_WARN + 10;
          g.ring(h.x, h.ty, 160, 0.4, '#e0e0e0');
          g.burst(h.x, h.ty, '#ffffff', 14, 420);
          g.burst(h.x, h.ty, '#b388ff', 8, 300);
          g.text(h.x, h.ty - 80, '⚔️ SHING!', '#ffffff', 28);
          g.shake = Math.min(18, g.shake + 5);
          g.play('block');
        }
        if (h.t > SWORD_WARN + 10.6) h.dead = true;
        break;
      }
      case 'fire': {
        h.x += h.vx * dt + Math.sin(h.t * 8) * 60 * dt;
        h.y += h.vy * dt;
        const who = list.find((b) => b.contains(h.x, h.y, 20));
        if (who) {
          h.dead = true;
          if (g.damage(who, PHYL.fire, p.boss, sign(who.x - h.x) * 250, -300)) g.setBurn(who, 3, 6, p.boss);
          g.burst(h.x, h.y, '#ff9100', 10, 260);
        } else if (h.y > 0 && (hitsGround(g, h.x, h.y + 16) || h.y > g.map.h + 50)) {
          h.dead = true;
          boom(g, p, h.x, Math.min(h.y, g.map.h), 80, 30, '#ff9100');
        }
        break;
      }
      case 'book': {
        // Flies after the nearest one of you, flapping its pages.
        let best: Body | null = null;
        let bd = Infinity;
        for (const b of list) {
          const d = Math.hypot(b.x - h.x, b.cy - h.y);
          if (d < bd) {
            bd = d;
            best = b;
          }
        }
        if (best) {
          const a = Math.atan2(best.cy - h.y, best.x - h.x);
          h.vx += (Math.cos(a) * 430 - h.vx) * Math.min(1, dt * 1.6);
          h.vy += (Math.sin(a) * 430 - h.vy) * Math.min(1, dt * 1.6);
        }
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (best && best.contains(h.x, h.y, 22)) {
          h.dead = true;
          g.damage(best, PHYL.book, p.boss, sign(h.vx) * 400, -350);
          g.burst(h.x, h.y, '#ce93d8', 12, 300);
        }
        if (h.t > 7) {
          h.dead = true;
          g.burst(h.x, h.y, '#ce93d8', 8, 200);
        }
        break;
      }
      case 'laser':
        if (h.t >= LASER_WARN && h.t < LASER_WARN + LASER_FIRE) {
          if (!h.hit) {
            h.hit = new Set();
            g.shake = Math.min(18, g.shake + (h.big ? 14 : 6));
            g.play('boom');
          }
          for (const b of list) {
            if (h.hit.has(b) || (h.big && !(b instanceof Fighter && b.golem))) continue;
            if (segDist(b.x, b.cy, h.x, h.y, h.tx, h.ty) > b.w / 2 + (h.big ? 80 : 30)) continue;
            h.hit.add(b);
            g.damage(b, h.big ? b.hp * 10 + 1 : PHYL.laser, p.boss, sign(h.tx - h.x) * 500, -600, 'pieces');
          }
        }
        if (h.t >= LASER_WARN + LASER_FIRE) h.dead = true;
        break;
      case 'wave': {
        h.x += h.vx * dt;
        h.hit ??= new Set();
        for (const b of list) {
          if (h.hit.has(b) || !b.onGround || Math.abs(b.x - h.x) > b.w / 2 + 30 || Math.abs(b.y - h.y) > 12) continue;
          h.hit.add(b);
          g.damage(b, PHYL.wave, p.boss, sign(h.vx) * 600, -900, 'fling');
        }
        const fl = p.floor;
        if (!fl || h.x < fl.x - 50 || h.x > fl.x + fl.w + 50) h.dead = true;
        break;
      }
    }
  }
  p.hz = p.hz.filter((h) => !h.dead);
}

function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const k = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (x1 + dx * k), py - (y1 + dy * k));
}

function hitsGround(g: Game, x: number, y: number): boolean {
  return g.map.platforms.some((q) => x > q.x && x < q.x + q.w && y > q.y && y < q.y + q.h + 30);
}

function boom(g: Game, p: PhylState, x: number, y: number, r: number, dmg: number, color: string) {
  for (const b of foes(g, p)) {
    const d = Math.hypot(b.x - x, b.cy - y);
    if (d > r + b.w / 2) continue;
    g.damage(b, dmg * (1 - d / (r * 2.2)), p.boss, (sign(b.x - x) || 1) * 700, -800, 'fling');
  }
  g.breakGlassAt(x, y, r * 0.6, p.boss);
  g.ring(x, y, r, 0.45, color);
  g.burst(x, y, color, 18, 480);
  g.burst(x, y, '#ffeb3b', 10, 360);
  g.burst(x, y, '#5d4037', 8, 300);
  g.shake = Math.min(18, g.shake + r / 18);
  g.play('boom');
}

/** "YOU ALL SHOULD DIE.": 500,000 damage to everyone outside the two safe corners. */
function bigBomb(g: Game, p: PhylState) {
  p.bombs++;
  p.flash = 1;
  g.shake = 18;
  g.play('boom');
  g.ring(p.boss.x, p.boss.cy, Math.max(g.map.w, g.map.h), 1.2, '#ffffff');
  for (const c of ['#ffffff', '#e040fb', '#ffd740']) g.burst(p.boss.x, p.boss.cy, c, 30, 1400);
  g.text(p.boss.x, p.boss.y - p.boss.h - 60, '💥 500,000', '#ff1744', 64);
  for (const b of foes(g, p)) {
    if (inSafeCorner(p, b)) continue;
    // No shield can hold this.
    if (b instanceof Fighter) b.shielding = false;
    g.damage(b, PHYL.bomb, p.boss, (sign(b.x - p.boss.x) || 1) * 900, -1400, 'pieces');
  }
  // After the first bomb the Tome Golem rises to help you, for good.
  const gol = p.golem;
  if (p.story && gol && !gol.alive && !p.why && p.bombs === 1) {
    const fl = p.floor;
    gol.alive = true;
    gol.hp = gol.maxHp;
    gol.finish = 'pop';
    gol.x = fl ? fl.x + fl.w / 2 + 300 : g.map.w / 2;
    gol.y = (fl?.y ?? g.map.h) - 2;
    gol.vx = 0;
    gol.vy = 0;
    g.ring(gol.x, gol.y, 260, 0.8, '#ffd740');
    g.burst(gol.x, gol.cy, '#a1887f', 30, 600);
    g.burst(gol.x, gol.cy, '#ffd740', 16, 500);
    g.say('phyGolem', g.fighters.indexOf(gol), 3);
  }
}

/** Landing hard when he gets tired (phase 2 sends shockwaves along the floor). */
function slam(g: Game, p: PhylState, x: number, y: number) {
  g.ring(x, y, 420, 0.6, '#b388ff');
  g.burst(x, y, '#7e57c2', 26, 600);
  g.burst(x, y, '#d1c4e9', 14, 420);
  g.shake = 18;
  g.play('boom');
  if (p.phase === 2) waves(p, x);
}

/** "WHY ARE YOU STILL HERE?": a giant laser finishes off the Tome Golem. */
function killGolem(g: Game, p: PhylState) {
  p.why = true;
  const gol = p.golem!;
  g.say('phyWhy', g.fighters.indexOf(p.boss), 3.2);
  const sx = p.boss.x;
  const sy = p.boss.y - p.boss.h * 0.75;
  const a = Math.atan2(gol.cy - sy, gol.x - sx);
  const len = Math.hypot(g.map.w, g.map.h);
  p.hz.push({ k: 'laser', x: sx, y: sy, vx: 0, vy: 0, t: 0, tx: sx + Math.cos(a) * len, ty: sy + Math.sin(a) * len, big: true });
}

// ---------- bots ----------

/** Bots dodge too: run to a safe corner before the bomb, step out from under swords and meteors, jump the shockwaves. */
export function phylDodge(g: Game, f: Fighter, it: Intent): Intent {
  const p = g.phy;
  if (!p || f.team === p.boss.team || f.golem) return it;
  if (p.st === 'bomb') {
    if (inSafeCorner(p, f)) return { ...it, moveX: 0, jump: false, shield: false };
    const fl = p.floor;
    const mid = fl ? fl.x + fl.w / 2 : g.map.w / 2;
    const goal = f.x < mid ? (fl?.x ?? 0) + cornerW(p) / 2 : (fl ? fl.x + fl.w : g.map.w) - cornerW(p) / 2;
    return { ...it, moveX: sign(goal - f.x), jump: false, shield: false };
  }
  let away = 0;
  let jump = it.jump;
  let shield = it.shield;
  for (const h of p.hz) {
    switch (h.k) {
      case 'sword':
        if (h.vx === 0 && Math.abs(f.x - h.x) < 90) away = sign(f.x - h.x) || 1;
        break;
      case 'meteor': {
        if (h.y > f.y) break;
        const tFall = Math.max(0, (f.y - h.y) / Math.max(300, h.vy));
        const px = h.x + h.vx * tFall;
        if (Math.abs(f.x - px) < 210) away = sign(f.x - px) || 1;
        break;
      }
      case 'fire':
        if (h.y < f.y && Math.abs(f.x - h.x) < 50) away = sign(f.x - h.x) || 1;
        break;
      case 'laser':
        if (h.t < LASER_WARN + LASER_FIRE && segDist(f.x, f.cy, h.x, h.y, h.tx, h.ty) < 100) {
          // Step to whichever side of the beam we are already on.
          const cross = (h.tx - h.x) * (f.cy - h.y) - (h.ty - h.y) * (f.x - h.x);
          away = cross > 0 ? -1 : 1;
        }
        break;
      case 'wave':
        if (f.onGround && sign(f.x - h.x) === sign(h.vx) && Math.abs(f.x - h.x) < 170 && Math.abs(f.y - h.y) < 20) jump = true;
        break;
      case 'book':
        if (Math.hypot(f.x - h.x, f.cy - h.y) < 140) shield = true;
        break;
    }
  }
  return away ? { ...it, moveX: away, jump, shield: false } : { ...it, jump, shield };
}

// ---------- online ----------

/** The joining devices keep his hazards moving between snapshots from the host. */
export function phylClientTick(g: Game, dt: number) {
  const p = g.phy!;
  p.flash = Math.max(0, p.flash - dt * 0.8);
  for (const h of p.hz) {
    h.t += dt;
    if (h.k === 'sword' && h.t < SWORD_WARN) continue;
    if (h.k === 'laser') continue;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
  }
}

export function encodePhyl(p: PhylState): { py: number[]; hz: number[][] } {
  const r1 = Math.round;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    py: [PHY_STATES.indexOf(p.st), r2(p.t), p.bombs, r2(p.flash), p.boss.phyPose],
    hz: p.hz.map((h) => [HAZ_KINDS.indexOf(h.k), r1(h.x), r1(h.y), r1(h.k === 'sword' ? 0 : h.vx), r1(h.vy), r2(h.t), r1(h.tx), r1(h.ty), h.big ? 1 : 0]),
  };
}

export function applyPhyl(p: PhylState, py: number[], hz: number[][]) {
  p.st = PHY_STATES[py[0]] ?? 'attack';
  p.t = py[1];
  p.bombs = py[2];
  p.flash = Math.max(p.flash, py[3]);
  p.boss.phyPose = py[4] ?? 0;
  p.hz = hz.map(([k, x, y, vx, vy, t, tx, ty, big]) => ({ k: HAZ_KINDS[k] ?? 'fire', x, y, vx, vy, t, tx, ty, big: big === 1 }));
}
