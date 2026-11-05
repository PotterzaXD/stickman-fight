import { Fighter, type Body } from './entities';
import type { Game } from './game';
import type { MapDef, Platform, Vec } from './types';

/*
 * The November 5 maps.
 *
 * Tower of Doom: a very tall tower (about 6 screens high, the camera follows you). Bricks fall, axes swing,
 * some floors crumble under your feet, the wind blows at the top, lightning strikes and lava slowly rises from the bottom.
 *
 * The Plane: a plane flying high over the clouds. Spawn inside the cabin or outside on the roof.
 * (Not told anywhere in the game: the red button in the cockpit makes the plane dive and crash, and
 * whoever jumps out of the plane is out of the match.)
 */

const P = (x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h });
const C = (x: number, y: number, w: number): Platform => ({ x, y, w, h: 22, crumble: true });
const M = (x: number, y: number, w: number, dx: number, period: number): Platform => ({ x, y, w, h: 22, move: { dx, dy: 0, period } });
const B = (x: number, y: number, w: number, h: number): Platform => ({ x, y, w, h, kind: 'wall' });

// ---------- Tower of Doom ----------

export const DOOM = {
  w: 1800,
  h: 3800,
  ground: 3650,
  step: 190,
  levels: 16,
  /** Falling bricks: one every this many seconds, damage. */
  brickEvery: 0.7,
  brick: 25,
  /** Swinging axes: damage and seconds before the same axe can hit the same body again. */
  axe: 30,
  axeCd: 0.9,
  axeLen: 150,
  /** Crumbling floors: seconds you can stand on one, and seconds until it is back. */
  crumble: 0.8,
  crumbleBack: 5,
  /** Wind above this height. */
  windTop: 1150,
  wind: 650,
  /** Lightning: every few seconds, a warning, then a strike for this much (only the top half of the tower). */
  boltEvery: 5,
  boltWarn: 1.2,
  bolt: 40,
  boltW: 46,
  /** Lava: starts rising after this many seconds, this fast, up to this high. */
  lavaWait: 20,
  lavaSpeed: 9,
  lavaTop: 1700,
};

const levelY = (k: number) => DOOM.ground - DOOM.step * k;

function doomPlatforms(): Platform[] {
  const out: Platform[] = [P(100, DOOM.ground, 1600, 80)];
  for (let k = 1; k <= DOOM.levels; k++) {
    const y = levelY(k);
    if (k === 8) out.push(M(250, y, 420, 600, 6), P(1180, y, 420));
    else if (k % 3 === 0) out.push(P(200, y, 520), P(1080, y, 520));
    else if (k % 3 === 1) out.push(P(560, y, 680), P(130, y, 160), P(1510, y, 160));
    else out.push(P(150, y, 360), C(720, y, 360), P(1290, y, 360));
  }
  // The very top.
  out.push(P(650, levelY(DOOM.levels + 1), 500, 36));
  return out;
}

/** Swinging axes hang under these levels: [level, x, phase]. */
const AXES: [number, number, number][] = [
  [3, 900, 0],
  [6, 500, 1.2],
  [6, 1300, 2.6],
  [10, 900, 0.6],
  [13, 520, 1.9],
  [13, 1280, 0.3],
  [16, 900, 1.4],
];

export const TOWER_DOOM: MapDef = {
  id: 'doom',
  name: 'm.doom',
  w: DOOM.w,
  h: DOOM.h,
  theme: 'doom',
  builtin: true,
  tall: true,
  platforms: doomPlatforms(),
  // Everyone starts near the bottom: the only way is up.
  spawns: [
    { x: 250, y: DOOM.ground },
    { x: 1550, y: DOOM.ground },
    { x: 900, y: DOOM.ground },
    { x: 600, y: DOOM.ground },
    { x: 1200, y: DOOM.ground },
    { x: 650, y: levelY(1) },
    { x: 1150, y: levelY(1) },
    { x: 400, y: levelY(3) },
    { x: 1400, y: levelY(3) },
    { x: 900, y: levelY(4) },
    { x: 400, y: DOOM.ground },
    { x: 1400, y: DOOM.ground },
  ],
};

export interface Brick {
  x: number;
  y: number;
  vy: number;
  rot: number;
}

export interface DoomState {
  bricks: Brick[];
  brickT: number;
  /** Seconds standing on each crumbling floor. */
  standT: number[];
  /** Lightning: where, seconds to the next one, and seconds left of the warning (0 = none) and of the flash. */
  boltX: number;
  boltT: number;
  warnT: number;
  flashT: number;
  lavaY: number;
  /** Each axe's last hit on each body. */
  axeHit: Map<string, number>;
}

export function startDoom(g: Game) {
  g.doom = { bricks: [], brickT: 2, standT: g.map.platforms.map(() => 0), boltX: 0, boltT: DOOM.boltEvery, warnT: 0, flashT: 0, lavaY: DOOM.h + 200, axeHit: new Map() };
}

/** Where each axe blade is right now (from the clock, so every device agrees). */
export function axeBlades(time: number): { px: number; py: number; x: number; y: number; a: number }[] {
  return AXES.map(([k, x, ph]) => {
    const py = levelY(k + 1) + 24;
    const a = Math.sin(time * 2.3 + ph) * 1.15;
    return { px: x, py, x: x + Math.sin(a) * DOOM.axeLen, y: py + Math.cos(a) * DOOM.axeLen, a };
  });
}

const riders = (g: Game) => g.bodies().filter((b) => b.alive);

export function updateDoom(g: Game, dt: number) {
  const d = g.doom!;
  const bodies = riders(g);
  // Bricks: mostly over someone's head.
  d.brickT -= dt;
  if (d.brickT <= 0) {
    d.brickT = DOOM.brickEvery * (0.6 + Math.random() * 0.8);
    const fs = g.fighters.filter((f) => f.alive);
    const near = fs.length ? fs[Math.floor(Math.random() * fs.length)] : null;
    const x = near ? near.x + (Math.random() - 0.5) * 600 : 150 + Math.random() * 1500;
    const y = near ? near.y - 650 : 0;
    d.bricks.push({ x: Math.max(130, Math.min(DOOM.w - 130, x)), y: Math.max(-100, y), vy: 150, rot: Math.random() * 6 });
  }
  for (const b of d.bricks) {
    b.vy = Math.min(1400, b.vy + 1600 * dt);
    b.y += b.vy * dt;
    b.rot += dt * 5;
    let hit = b.y > DOOM.h + 200;
    for (const e of bodies) {
      if (hit || !e.contains(b.x, b.y, 12)) continue;
      hit = true;
      g.damage(e, DOOM.brick, null, (Math.sign(e.x - b.x) || 1) * 160, -160, 'ragdoll');
      g.text(e.x, e.y - e.h - 30, '🧱 BONK!', '#ffccbc', 22);
    }
    if (!hit) for (const [i, p] of g.map.platforms.entries()) if (g.solid(i) && b.x > p.x && b.x < p.x + p.w && b.y + 10 > p.y && b.y < p.y + p.h) hit = true;
    if (!hit) continue;
    g.burst(b.x, b.y, '#a1887f', 8, 220);
    b.y = -99999;
  }
  d.bricks = d.bricks.filter((b) => b.y > -9000);
  // Swinging axes.
  const blades = axeBlades(g.time);
  blades.forEach((bl, i) => {
    for (const e of bodies) {
      if (Math.hypot(e.x - bl.x, e.cy - bl.y) > 46 + e.w / 2) continue;
      const key = `${i}:${e.id}`;
      if ((d.axeHit.get(key) ?? -99) > g.time) continue;
      d.axeHit.set(key, g.time + DOOM.axeCd);
      const dir = Math.sign(Math.cos(g.time * 2.3 + AXES[i][2])) || 1;
      g.damage(e, DOOM.axe, null, dir * 650, -380, 'fling');
      g.text(e.x, e.y - e.h - 30, '🪓', '#eceff1', 24);
    }
  });
  // Crumbling floors: stand on one too long and it falls apart (it's back after a while).
  g.map.platforms.forEach((p, i) => {
    if (!p.crumble || !g.solid(i)) return;
    const on = bodies.some((b) => b.onGround && b.standOn === i);
    d.standT[i] = on ? (d.standT[i] ?? 0) + dt : Math.max(0, (d.standT[i] ?? 0) - dt * 0.5);
    if (d.standT[i] < DOOM.crumble) return;
    d.standT[i] = 0;
    g.glassT[i] = DOOM.crumbleBack;
    for (let k = 0; k < 4; k++) g.burst(p.x + ((k + 0.5) * p.w) / 4, p.y + 8, '#8d6e63', 6, 240);
    g.play('heavy');
  });
  // Wind at the top: it changes direction now and then.
  const wind = Math.sin(g.time * 0.45) >= 0 ? 1 : -1;
  for (const e of bodies) {
    if (e.y > DOOM.windTop) continue;
    if (e instanceof Fighter && e.boss) continue;
    e.vx += wind * DOOM.wind * dt;
  }
  // Lightning on the top half.
  if (d.flashT > 0) d.flashT -= dt;
  if (d.warnT > 0) {
    d.warnT -= dt;
    if (d.warnT <= 0) strike(g, d);
  } else {
    d.boltT -= dt;
    if (d.boltT <= 0) {
      d.boltT = DOOM.boltEvery * (0.7 + Math.random() * 0.6);
      const up = g.fighters.filter((f) => f.alive && f.y < DOOM.h / 2);
      d.boltX = up.length && Math.random() < 0.75 ? up[Math.floor(Math.random() * up.length)].x : 150 + Math.random() * 1500;
      d.warnT = DOOM.boltWarn;
    }
  }
  // Lava: slowly rising from the bottom.
  if (g.time > DOOM.lavaWait) d.lavaY = Math.max(DOOM.lavaTop, Math.min(d.lavaY, DOOM.h + 60) - DOOM.lavaSpeed * dt);
  for (const e of bodies) if (e.y > d.lavaY && e.vy >= 0) g.lavaHit(e);
}

function strike(g: Game, d: DoomState) {
  d.flashT = 0.35;
  g.shake = Math.min(18, g.shake + 8);
  g.play('boom');
  for (const e of riders(g)) {
    if (e.y > DOOM.h / 2 || Math.abs(e.x - d.boltX) > DOOM.boltW + e.w / 2) continue;
    g.damage(e, DOOM.bolt, null, (Math.sign(e.x - d.boltX) || 1) * 300, -300, 'ragdoll');
    g.text(e.x, e.y - e.h - 30, '⚡ ZAP!', '#fff59d', 24);
  }
  g.burst(d.boltX, DOOM.h / 2, '#fff59d', 14, 400);
}

/** Online: what joining devices need to draw it. */
export function encodeDoom(d: DoomState): number[] {
  return [Math.round(d.lavaY), Math.round(d.boltX), Math.round(d.warnT * 100) / 100, Math.round(d.flashT * 100) / 100, ...d.bricks.flatMap((b) => [Math.round(b.x), Math.round(b.y)])];
}

export function applyDoom(d: DoomState, a: number[]) {
  d.lavaY = a[0];
  d.boltX = a[1];
  d.warnT = a[2];
  d.flashT = a[3];
  d.bricks = [];
  for (let i = 4; i + 1 < a.length; i += 2) d.bricks.push({ x: a[i], y: a[i + 1], vy: 0, rot: a[i] * 0.1 });
}

// ---------- The Plane ----------

export const PLANE = {
  w: 3400,
  h: 1500,
  floor: 820,
  roof: 560,
  /** The cabin, from the open back door to the nose. */
  tail: 700,
  nose: 2700,
  /** The cockpit door (a wall with a gap under it) and the big red button. */
  cockpit: 2350,
  button: { x: 2610, y: 820 },
  /** Seconds of diving before the crash, and the ground it crashes on. */
  dive: 4,
  ground: 1300,
  /** Wind on the roof pushes you toward the tail. */
  wind: 260,
};

export const PLANE_MAP: MapDef = {
  id: 'plane',
  name: 'm.plane',
  w: PLANE.w,
  h: PLANE.h,
  theme: 'plane',
  builtin: true,
  platforms: [
    // The cabin floor and the cockpit floor.
    P(PLANE.tail, PLANE.floor, PLANE.nose - PLANE.tail, 40),
    // The roof (with a hatch in the middle to drop back inside).
    P(PLANE.tail + 60, PLANE.roof, 760, 26),
    P(1640, PLANE.roof, 1000, 26),
    // The cockpit door: you walk in under it.
    B(PLANE.cockpit, PLANE.roof + 26, 30, 134),
    // The nose: you can't walk out the front.
    B(PLANE.nose - 30, PLANE.roof + 26, 30, PLANE.floor - PLANE.roof - 26),
    // The tail fin.
    P(PLANE.tail + 20, 330, 170, 22),
    // Seats to hop on.
    P(1000, 760, 120, 14),
    P(1350, 760, 120, 14),
    P(1900, 760, 120, 14),
  ],
  spawns: [
    { x: 900, y: PLANE.floor },
    { x: 2200, y: PLANE.floor },
    { x: 1500, y: PLANE.floor },
    { x: 1200, y: PLANE.floor },
    { x: 1800, y: PLANE.floor },
    { x: 1050, y: PLANE.floor },
    { x: 2000, y: PLANE.floor },
    { x: 1650, y: PLANE.floor },
  ],
  spawnsOut: [
    { x: 900, y: PLANE.roof },
    { x: 2500, y: PLANE.roof },
    { x: 1300, y: PLANE.roof },
    { x: 2000, y: PLANE.roof },
    { x: 800, y: 330 },
    { x: 1100, y: PLANE.roof },
    { x: 2250, y: PLANE.roof },
    { x: 1750, y: PLANE.roof },
  ],
};

export interface PlaneState {
  /** Flying, diving (the button was pressed) or crashed. */
  phase: 'fly' | 'dive' | 'crashed';
  t: number;
}

export function startPlane(g: Game) {
  g.plane = { phase: 'fly', t: 0 };
}

/** On the plane right now (in the cabin, on the roof or the tail). */
const aboard = (b: Body) => b.x > PLANE.tail - 60 && b.x < PLANE.nose + 60 && b.y < PLANE.floor + 60;

export function updatePlane(g: Game, dt: number) {
  const pl = g.plane!;
  pl.t += dt;
  if (pl.phase === 'fly') {
    // Somebody in the cockpit touched the red button...
    const b = PLANE.button;
    // (Only players press it: bots know better.)
    const presser = g.fighters.find((f) => f.alive && f.human && Math.abs(f.x - b.x) < 26 && Math.abs(f.y - b.y) < 12);
    if (presser) {
      pl.phase = 'dive';
      pl.t = 0;
      g.text(b.x, b.y - 120, '🔴 *click*', '#ff5252', 24);
      g.play('boom');
    }
    // Wind on the roof.
    for (const e of g.bodies()) if (e.alive && e.y <= PLANE.roof + 4 && aboard(e) && !(e instanceof Fighter && e.boss)) e.vx -= PLANE.wind * dt;
  } else if (pl.phase === 'dive') {
    g.shake = Math.max(g.shake, 6 + pl.t * 3);
    if (Math.random() < dt * 3) g.text(PLANE.button.x - 200, PLANE.roof - 60, '⚠️', '#ff1744', 30);
    if (pl.t >= PLANE.dive) crash(g);
  }
}

/** The plane hits the ground: everyone on board loses half their HP. */
function crash(g: Game) {
  const pl = g.plane!;
  pl.phase = 'crashed';
  pl.t = 0;
  addGround(g);
  for (const e of g.bodies()) {
    if (!e.alive || !aboard(e)) continue;
    const half = Math.max(1, Math.floor(e.hp / 2));
    g.damage(e, half, null, (Math.random() - 0.5) * 600, -500, 'ragdoll');
  }
  for (let k = 0; k < 8; k++) g.burst(PLANE.tail + Math.random() * (PLANE.nose - PLANE.tail), PLANE.floor, k % 2 ? '#ff6d00' : '#424242', 16, 520);
  g.shake = 18;
  g.play('boom');
}

/** After the crash there is ground under the plane. */
export function addGround(g: Game) {
  if (g.map.platforms.some((p) => p.y === PLANE.ground)) return;
  g.addPlatform({ ...P(-600, PLANE.ground, PLANE.w + 1200, 300), hidden: true });
}

/** Jumped (or fell) out of the plane: out of the match, whatever the fall setting. */
export const planeOut = (g: Game) => !!g.plane && g.plane.phase !== 'crashed';

export const PLANE_PHASES: PlaneState['phase'][] = ['fly', 'dive', 'crashed'];

export function applyPlane(g: Game, a: number[]) {
  const pl = g.plane!;
  pl.phase = PLANE_PHASES[a[0]] ?? 'fly';
  pl.t = a[1];
  if (pl.phase === 'crashed') addGround(g);
}

/** Spawns for the Plane: inside the cabin, or outside on the roof. */
export function spawnsFor(map: MapDef, outside: boolean): MapDef {
  return outside && map.spawnsOut ? { ...map, spawns: map.spawnsOut } : map;
}

export type { Vec };
