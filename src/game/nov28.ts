import { BRICK_WALL, Body, Cat, Fighter, GREEN_AIR, MINI_AIR, RED_AIR, type CatVariant, type Projectile } from './entities';
import type { Game } from './game';
import { wallPush } from './juice';
import { bigBoom } from './nov21';
import type { Platform } from './types';

/*
 * The November 28 update (from Potter's LEGO builds):
 * - Three more aircraft, each with its LEGO pilot already sitting on it:
 *   the Mini Aircraft (30 HP, super fast, harmless shots from the gun on its back that make enemies chase it),
 *   the Red Aircraft (700 HP, very fast, explosions can't hurt it, stabs with its front spikes for 20)
 *   and the Green Aircraft (900 HP, slow, crashes into enemies for 40 and takes 20 itself).
 *   When one goes down it blows up like Aircraft 07, and its pilot always gets out.
 * - Fish (Summoner fish and betta fish) can't get hurt falling off a beach map: they swim back up.
 * - The Brick Sword: a LEGO sword. Its dash builds a brick wall when it hits someone (5 s; enemies can't get through).
 */

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const rand = Math.random;

/** Each new aircraft and its pilot. */
const AIRS: { v: CatVariant; o: typeof MINI_AIR | typeof RED_AIR | typeof GREEN_AIR; pilot: CatVariant; icon: string }[] = [
  { v: 'miniair', o: MINI_AIR, pilot: 'pilotmini', icon: '🛩️' },
  { v: 'redair', o: RED_AIR, pilot: 'pilotred', icon: '🔺' },
  { v: 'greenair', o: GREEN_AIR, pilot: 'pilotgreen', icon: '🟩' },
];

/** The Summoner and the Golden Pistol: the three new aircraft fly in (one of each at a time). */
export function callAirFleet(g: Game, f: Fighter) {
  let n = 0;
  AIRS.forEach(({ v, o }, k) => {
    if (g.cats.some((c) => c.alive && c.owner === f && c.variant === v)) return;
    const c = new Cat(f, f.x - f.facing * (110 + k * 70), f.y - 240 - k * 50, o.hp, o.dmg, v);
    c.vx = f.facing * 260;
    g.cats.push(c);
    g.burst(c.x, c.cy, v === 'redair' ? '#e53935' : v === 'greenair' ? '#43a047' : '#a5d6a7', 10, 240);
    n++;
  });
  if (n) g.text(f.x, f.y - f.h - 110, `✈️ ×${n}`, '#e8f5e9', 26);
}

/** Who to go after: the closest enemy (helpers count a little less). */
function nearestFoe(g: Game, c: Cat, range: number): Body | null {
  let best: Body | null = null;
  let bd = range;
  for (const b of g.bodies()) {
    if (!b.alive || b.team === c.team) continue;
    const d = Math.hypot(b.x - c.x, b.cy - c.cy);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

function retarget(g: Game, c: Cat, dt: number) {
  c.thinkT -= dt;
  if (c.thinkT <= 0 || !c.target?.alive) {
    c.thinkT = 0.35 + rand() * 0.2;
    c.target = nearestFoe(g, c, 2600);
  }
  return c.target && c.target.alive ? c.target : null;
}

/** Steer toward (tx, ty) at up to `sp` a second (no gravity: it flies). */
function fly(g: Game, c: Cat, dt: number, tx: number, ty: number, sp: number, grip: number) {
  c.vy -= g.gravity * dt;
  const dx = Math.max(60, Math.min(g.map.w - 60, tx)) - c.x;
  const dy = Math.max(-260, ty) - c.cy;
  const d = Math.hypot(dx, dy) || 1;
  const v = Math.min(sp, d * 3);
  c.vx += ((dx / d) * v - c.vx) * Math.min(1, grip * dt);
  c.vy += ((dy / d) * v - c.vy) * Math.min(1, grip * dt);
}

/** Nobody to fight: hang around behind the owner. */
function home(g: Game, c: Cat, dt: number, sp: number) {
  fly(g, c, dt, c.owner.x - c.owner.facing * 140, c.owner.y - c.owner.h - 150 + Math.sin(g.time * 2 + c.id) * 20, sp, 2.5);
  if (Math.abs(c.vx) > 30) c.facing = sign(c.vx);
}

/** Touching `e`? (A little forgiving.) */
const touching = (c: Cat, e: Body) => Math.abs(e.x - c.x) < (c.w + e.w) / 2 && Math.abs(e.cy - c.cy) < (c.h + e.h) / 2;

// ---------- the Mini Aircraft ----------

/** Zips around its target in fast circles, firing harmless shots from the gun on its back. */
export function updateMiniAir(c: Cat, dt: number, g: Game) {
  const t = retarget(g, c, dt);
  c.shootT -= dt;
  if (!t) return home(g, c, dt, MINI_AIR.speed * 0.6);
  const a = g.time * 2.6 + c.id;
  fly(g, c, dt, t.x + Math.cos(a) * 200, t.cy - 130 + Math.sin(a) * 80, MINI_AIR.speed, 5);
  if (Math.abs(c.vx) > 40) c.facing = sign(c.vx);
  if (c.shootT > 0 || c.stun > 0) return;
  // The gun is on its back.
  const gx = c.x - c.facing * 36;
  const gy = c.cy - 16;
  if (Math.hypot(t.x - gx, t.cy - gy) > MINI_AIR.range) return;
  c.shootT = MINI_AIR.every;
  c.attackT = 0.15;
  g.spawnProj('decoy', c, gx, gy, Math.atan2(t.cy - gy, t.x - gx) + (rand() - 0.5) * 0.08, 1300, 0, 0, 0);
}

/** The little pilot from the Mini Aircraft: no damage, but its shots still make enemies chase it. */
export function miniPilotShoot(c: Cat, dt: number, g: Game, t: Body | null) {
  if (t) c.facing = sign(t.x - c.x) || c.facing;
  c.shootT -= dt;
  if (!t || c.shootT > 0 || c.stun > 0 || c.sleepT > 0) return;
  const hx = c.x + c.facing * 14;
  const hy = c.y - 32;
  if (Math.hypot(t.x - hx, t.cy - hy) > 900) return;
  c.shootT = 2;
  c.attackT = 0.3;
  g.spawnProj('decoy', c, hx, hy, Math.atan2(t.cy - hy, t.x - hx), 1200, 0, 0, 0);
}

const shout = new WeakMap<Body, number>();

/** A harmless shot hit someone: no damage, but they come after whoever fired it for a while. */
function lure(g: Game, by: Body, e: Body) {
  if (!(by instanceof Cat) || !by.alive) return;
  if (e instanceof Fighter && e.brain && !e.human) e.brain.distract(by, MINI_AIR.lure);
  else if (e instanceof Cat) {
    e.target = by;
    e.thinkT = MINI_AIR.lure;
  }
  if ((shout.get(e) ?? 0) > g.time) return;
  shout.set(e, g.time + 2.5);
  g.text(e.x, e.y - e.h - 34, rand() < 0.5 ? '👀 HEY!' : '😠 Over there!', '#c5e1a5', 20);
}

// ---------- the Red Aircraft ----------

/** Charges straight at its target nose first and stabs with its front spikes, pulls back, and goes again. */
export function updateRedAir(c: Cat, dt: number, g: Game) {
  const t = retarget(g, c, dt);
  c.attackT -= dt;
  if (!t) return home(g, c, dt, RED_AIR.speed * 0.5);
  if (c.attackT > 0) {
    // Pull back to one side, nose still toward the target.
    fly(g, c, dt, t.x + (c.moveX || 1) * 330, t.cy - 140, RED_AIR.speed, 4);
    c.facing = sign(t.x - c.x) || c.facing;
    return;
  }
  fly(g, c, dt, t.x, t.cy, RED_AIR.speed, 6);
  c.facing = sign(t.x - c.x) || c.facing;
  if (c.stun > 0) return;
  let hit = false;
  for (const e of g.bodies()) {
    if (!e.alive || e.team === c.team || !touching(c, e)) continue;
    // Only the front (the spikes) stabs.
    if ((sign(e.x - c.x) || c.facing) !== c.facing) continue;
    if ((c.bumpCd.get(e.id) ?? 0) > g.time) continue;
    c.bumpCd.set(e.id, g.time + RED_AIR.every);
    g.damage(e, RED_AIR.dmg, c, c.facing * 520, -320, 'ragdoll');
    g.burst(c.x + c.facing * c.w * 0.5, c.cy, '#ff8a80', 8, 260);
    hit = true;
  }
  if (hit) {
    g.text(c.x + c.facing * 40, c.y - 70, '🔺 STAB!', '#ff8a80', 22);
    g.play('hit');
    c.attackT = RED_AIR.every;
    c.moveX = -c.facing;
    c.vx = -c.facing * 380;
    c.vy = -260;
  }
}

// ---------- the Green Aircraft ----------

/** Flies slowly at its target and crashes into it: 40 to them, 20 to itself. Then it backs off and tries again. */
export function updateGreenAir(c: Cat, dt: number, g: Game) {
  const t = retarget(g, c, dt);
  c.attackT -= dt;
  if (!t) return home(g, c, dt, GREEN_AIR.speed);
  if (c.attackT > 0) {
    fly(g, c, dt, c.x - c.facing * 200, t.cy - 180, GREEN_AIR.speed, 2);
    return;
  }
  fly(g, c, dt, t.x, t.cy, GREEN_AIR.speed, 3);
  c.facing = sign(t.x - c.x) || c.facing;
  if (c.stun > 0) return;
  let hit = false;
  for (const e of g.bodies()) {
    if (!e.alive || e.team === c.team || !touching(c, e)) continue;
    if ((c.bumpCd.get(e.id) ?? 0) > g.time) continue;
    c.bumpCd.set(e.id, g.time + GREEN_AIR.every);
    g.damage(e, GREEN_AIR.dmg, c, (sign(e.x - c.x) || c.facing) * 700, -560, 'fling');
    hit = true;
  }
  if (!hit) return;
  g.burst(c.x + c.facing * c.w * 0.45, c.cy, '#ffb300', 14, 340);
  g.burst(c.x + c.facing * c.w * 0.45, c.cy, '#2e9e44', 8, 300);
  g.text(c.x, c.y - 80, '💥 CRASH!', '#c8e6c9', 26);
  g.shake = Math.min(18, g.shake + 6);
  g.play('hit');
  c.attackT = GREEN_AIR.every;
  c.vx = -c.facing * 300;
  c.vy = -320;
  // It takes 20 itself every time.
  g.damage(c, GREEN_AIR.self, null, -c.facing * 100, -100, 'pop');
}

// ---------- going down ----------

/** The host: a new aircraft blows up (the Mini one does no blast damage), and its pilot always gets out. */
export function airDown(g: Game, c: Cat) {
  const a = AIRS.find((x) => x.v === c.variant);
  if (!a) return;
  bigBoom(g, c, c.variant === 'miniair' ? 0 : 40);
  const p = new Cat(c.owner, c.x, c.y - 10, a.o.pilotHp, a.o.pilotDmg, a.pilot);
  p.team = c.team;
  p.vx = (rand() < 0.5 ? -1 : 1) * (100 + rand() * 80);
  p.vy = -700;
  p.shootT = 0.8 + rand() * 0.3;
  g.cats.push(p);
  g.text(p.x, p.y - 60, '🪂 Still alive!', '#ffccbc', 20);
}

/** Pilots of the new aircraft for Sandbox and the summon stats: [HP, damage]. */
export const PILOT_STATS: Record<string, [number, number]> = {
  pilotmini: [MINI_AIR.pilotHp, MINI_AIR.pilotDmg],
  pilotred: [RED_AIR.pilotHp, RED_AIR.pilotDmg],
  pilotgreen: [GREEN_AIR.pilotHp, GREEN_AIR.pilotDmg],
};

// ---------- shots ----------

export function nov28Hit(g: Game, p: Projectile, e: Body): boolean {
  if (p.kind !== 'decoy') return false;
  lure(g, p.owner, e);
  g.burst(p.x, p.y, '#c5e1a5', 5, 160, false);
  return true;
}

export function nov28Splat(g: Game, p: Projectile, pl: Platform): boolean {
  if (p.kind !== 'decoy') return false;
  g.burst(p.x, Math.min(p.y, pl.y), '#c5e1a5', 3, 120, false);
  p.dead = true;
  return true;
}

// ---------- fish on the beach ----------

/** Fish that fall off a beach map (the Beach and the Pirate Ship) can't get hurt: they swim back up. */
export const fishSwims = (g: Game, b: Body) => b instanceof Cat && (b.variant === 'fish' || b.variant === 'betta') && (g.map.theme === 'beach' || g.map.theme === 'pirate');

// ---------- the Brick Sword ----------

export interface BrickWall {
  x: number;
  y: number;
  w: number;
  h: number;
  life: number;
  team: number;
}

const walls = new WeakMap<Game, BrickWall[]>();
export const wallsOf = (g: Game) => walls.get(g) ?? [];
export const setWalls = (g: Game, list: BrickWall[]) => walls.set(g, list);

/** Fighters whose Brick Sword dash has not built its wall yet. */
const armed = new WeakSet<Fighter>();
export const armBrick = (f: Fighter) => armed.add(f);

/** A Brick Sword dash hit someone: the first hit of the dash builds a brick wall between you and them. */
export function brickHit(g: Game, f: Fighter, e: Body) {
  if (!armed.has(f)) return;
  armed.delete(f);
  const dir = sign(e.x - f.x) || f.facing;
  const W = BRICK_WALL.w * Math.max(1, f.scale * 0.8);
  const H = BRICK_WALL.h * Math.max(1, f.scale * 0.8);
  const ground = f.onGround ? f.y : Math.max(f.y, e.y);
  const cx = f.x + dir * Math.max(f.w * 0.4 + W / 2 + 4, Math.abs(e.x - f.x) / 2);
  const list = wallsOf(g);
  list.push({ x: cx - W / 2, y: ground - H, w: W, h: H, life: BRICK_WALL.life, team: f.team });
  setWalls(g, list);
  for (const col of ['#e53935', '#1e88e5', '#fdd835', '#43a047']) g.burst(cx, ground - H / 2, col, 5, 300);
  g.text(cx, ground - H - 30, '🧱 BRICK WALL!', '#ffcc80', 26);
  g.play('block');
}

/** Enemies can't walk through a brick wall (you and your team can). */
export function brickWallPush(g: Game, b: Body, prevX: number, prevY: number) {
  for (const w of wallsOf(g)) if (b.team !== w.team) wallPush(b, w as Platform, prevX, prevY);
}

/** Walls stand 5 s and stop enemy shots; then they fall apart into bricks. */
export function updateNov28(g: Game, dt: number) {
  const list = wallsOf(g);
  if (!list.length) return;
  for (const w of list) {
    w.life -= dt;
    for (const p of g.projectiles) {
      if (p.dead || p.team === w.team) continue;
      if (p.x < w.x || p.x > w.x + w.w || p.y < w.y || p.y > w.y + w.h) continue;
      p.dead = true;
      g.burst(p.x, p.y, '#ffcc80', 5, 200, false);
    }
    if (w.life <= 0) {
      for (const col of ['#e53935', '#1e88e5', '#fdd835', '#43a047']) g.burst(w.x + w.w / 2, w.y + w.h / 2, col, 6, 320);
    }
  }
  setWalls(g, list.filter((w) => w.life > 0));
}
