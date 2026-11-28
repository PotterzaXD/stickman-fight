import { AIRCRAFT, Body, Cat, Fighter, GOLD_PISTOL, GUN_SOLDIER, PILOT, SPEAR_SQUAD, type Projectile } from './entities';
import type { Game } from './game';
import { callGhostClones } from './nov12';
import { callAirFleet } from './nov28';
import type { Intent, Platform } from './types';

/*
 * The November 21 update: the Golden Pistol, its pistol soldiers, and the Aircraft (a tan jet, number 07, with two
 * yellow pilots in red shirts riding on top).
 *
 * Golden Pistol (1,100 coins): drag the joystick and it fires on its own where you aim (10 a bullet, like the Pistol).
 * Let go for its skill: Squad Up, 3 pistol soldiers, 3 spear soldiers, 2 ghost clones, a Clone and the Aircraft.
 */

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const rand = Math.random;

export { AIRCRAFT, GOLD_PISTOL, GUN_SOLDIER, PILOT, SPEAR_SQUAD } from './entities';

// ---------- the Golden Pistol ----------

const autoT = new WeakMap<Fighter, number>();

/** Drag the joystick with the Golden Pistol: it fires on its own toward where you aim. */
export function goldAutoFire(g: Game, f: Fighter, it: Intent, dt: number) {
  const slot = f.weapons.findIndex((w) => w.id === 'goldpistol');
  if (slot < 0) return;
  let t = (autoT.get(f) ?? 0) - dt;
  if (it.aim !== null && f.stun <= 0 && !f.shielding && f.sleepT <= 0) {
    if (t <= 0) {
      t = GOLD_PISTOL.every;
      const tip = f.tip(slot);
      const a = f.angles[slot] + (rand() - 0.5) * 0.04;
      g.spawnProj('gold', f, tip.x, tip.y, a, GOLD_PISTOL.speed, 0, GOLD_PISTOL.dmg * f.dmgMult, slot);
      g.burst(tip.x, tip.y, '#ffd54f', 3, 160, false);
    }
  } else t = Math.max(t, 0);
  autoT.set(f, t);
}

export function nov21Skill(g: Game, f: Fighter, slot: number): boolean {
  if (f.weapons[slot].id !== 'goldpistol') return false;
  squadUp(g, f);
  return true;
}

/** Squad Up: 3 pistol soldiers, 3 spear soldiers, your 2 ghost clones, a Clone and the Aircraft. */
export function squadUp(g: Game, f: Fighter) {
  g.callCats(f, GUN_SOLDIER, 'gunsoldier');
  g.callCats(f, SPEAR_SQUAD, 'soldier');
  callGhostClones(g, f, 2, 2);
  g.summonClone(f);
  callAircraft(g, f);
  // November 28: the Mini, Red and Green Aircraft come too.
  callAirFleet(g, f);
  g.ring(f.x, f.y, 170, 0.5, '#ffd54f');
  g.text(f.x, f.y - f.h - 80, '🔫 SQUAD UP!', '#ffd54f', 30);
}

/** The Aircraft flies in from above (one at a time). */
export function callAircraft(g: Game, f: Fighter) {
  if (g.cats.some((c) => c.alive && c.owner === f && c.variant === 'aircraft')) return;
  const c = new Cat(f, f.x - f.facing * 80, f.y - 220, AIRCRAFT.hp, AIRCRAFT.dmg, 'aircraft');
  c.vx = f.facing * 200;
  g.cats.push(c);
  g.burst(c.x, c.cy, '#d7c49e', 12, 260);
  g.text(c.x, c.y - 60, '✈️ 07!', '#fff3e0', 26);
}

export function nov21BotSkill(f: Fighter, i: number, dist: number): number | null | undefined {
  if (f.weapons[i].id !== 'goldpistol') return undefined;
  return dist < 1100 ? -Math.PI / 2 : null;
}

// ---------- shots ----------

export function nov21Hit(g: Game, p: Projectile, e: Body, dir: number): boolean {
  if (p.kind !== 'gold') return false;
  g.damage(e, p.dmg, p.owner, dir * 180, -120, 'ragdoll');
  g.burst(p.x, p.y, '#ffe082', 5, 200, false);
  return true;
}

export function nov21Splat(g: Game, p: Projectile, pl: Platform): boolean {
  if (p.kind !== 'gold') return false;
  g.burst(p.x, Math.min(p.y, pl.y), '#ffe082', 3, 160, false);
  p.dead = true;
  return true;
}

// ---------- helpers ----------

const ammo = new WeakMap<Cat, number>();

/** Pistol soldiers: called from updateCat after they moved (they keep their distance like the Fire Ally). */
export function gunSoldierShoot(c: Cat, dt: number, g: Game, t: Body | null) {
  if (t) c.facing = sign(t.x - c.x) || c.facing;
  c.shootT -= dt;
  if (!t || c.shootT > 0 || c.stun > 0 || c.sleepT > 0) return;
  const hx = c.x + c.facing * 24;
  const hy = c.y - 54;
  const dx = t.x - hx;
  const dy = t.cy - hy;
  if (Math.hypot(dx, dy) > GUN_SOLDIER.range) return;
  const left = (ammo.get(c) ?? GUN_SOLDIER.ammo) - 1;
  c.attackT = 0.25;
  g.spawnProj('gold', c, hx, hy, Math.atan2(dy, dx) + (rand() - 0.5) * 0.05, GOLD_PISTOL.speed, 0, c.touchDmg, 0);
  g.burst(hx, hy, '#ffd54f', 3, 140, false);
  if (left <= 0) {
    ammo.set(c, GUN_SOLDIER.ammo);
    c.shootT = GUN_SOLDIER.reload;
    g.text(c.x, c.y - c.h - 26, '🔄', '#ffffff', 18);
  } else {
    ammo.set(c, left);
    c.shootT = GUN_SOLDIER.every;
  }
}

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

/** The Aircraft flies above and beside its target, banks as it turns, and fires both guns at once. */
export function updateAircraft(c: Cat, dt: number, g: Game) {
  c.thinkT -= dt;
  c.shootT -= dt;
  if (c.thinkT <= 0 || !c.target?.alive) {
    c.thinkT = 0.35 + rand() * 0.2;
    c.target = nearestFoe(g, c, 2400);
  }
  const t = c.target && c.target.alive ? c.target : null;
  // No gravity: it flies.
  c.vy -= g.gravity * dt;
  const side = Math.sin(g.time * 0.6 + c.id) > 0 ? 1 : -1;
  const tx = t ? t.x + side * 230 : c.owner.x - c.owner.facing * 120;
  const ty = (t ? t.y - t.h : c.owner.y - c.owner.h) - 170 + Math.sin(g.time * 2.2 + c.id) * 26;
  const dx = Math.max(60, Math.min(g.map.w - 60, tx)) - c.x;
  const dy = Math.max(-200, ty) - c.cy;
  const d = Math.hypot(dx, dy) || 1;
  const sp = Math.min(420, d * 2.6);
  c.vx += ((dx / d) * sp - c.vx) * Math.min(1, 2.6 * dt);
  c.vy += ((dy / d) * sp - c.vy) * Math.min(1, 2.6 * dt);
  // The nose points at the target when it has one.
  if (t) c.facing = sign(t.x - c.x) || c.facing;
  else if (Math.abs(c.vx) > 30) c.facing = sign(c.vx);
  if (!t || c.shootT > 0 || c.stun > 0) return;
  const ex = t.x - c.x;
  const ey = t.cy - c.cy;
  if (Math.hypot(ex, ey) > AIRCRAFT.range) return;
  c.shootT = AIRCRAFT.every;
  c.attackT = 0.2;
  const a = Math.atan2(ey, ex);
  // Two guns, one on each wing: two bullets side by side.
  for (const k of [-1, 1]) {
    const ox = -Math.sin(a) * 7 * k;
    const oy = Math.cos(a) * 7 * k;
    g.spawnProj('gold', c, c.x + c.facing * 30 + ox, c.cy + 4 + oy, a, 1900, 0, c.touchDmg, 0);
  }
  g.burst(c.x + c.facing * 34, c.cy + 4, '#ffd54f', 4, 160, false);
}

/** A pilot (out of a wrecked Aircraft, or from Sandbox): 30 HP, keeps a little away and fires a bullet for 2 every 10 s. */
export function pilotShoot(c: Cat, dt: number, g: Game, t: Body | null) {
  if (t) c.facing = sign(t.x - c.x) || c.facing;
  c.shootT -= dt;
  if (!t || c.shootT > 0 || c.stun > 0 || c.sleepT > 0) return;
  const hx = c.x + c.facing * 14;
  const hy = c.y - 32;
  if (Math.hypot(t.x - hx, t.cy - hy) > 1100) return;
  c.shootT = PILOT.every;
  c.attackT = 0.3;
  g.spawnProj('gold', c, hx, hy, Math.atan2(t.cy - hy, t.x - hx), 1500, 0, c.touchDmg, 0);
  g.text(c.x, c.y - c.h - 20, 'pew!', '#ffe082', 18);
}

// ---------- the Aircraft goes down ----------

/** A burning wreck falling slowly down the map, and the fireball where it blew up (drawn on every device). */
export interface Wreck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  t: number;
  facing: number;
  color: string;
  /** Which aircraft it was (they each fall as their own wreck). */
  kind: string;
  /** Where it blew up (the fireball and smoke stay there). */
  bx: number;
  by: number;
  /** Smoke puffs it leaves behind: x, y, age. */
  smoke: { x: number; y: number; t: number; r: number }[];
  /** Bricks flying off in the blast: start speed, spin, colour and size. */
  bits: { vx: number; vy: number; vr: number; color: string; w: number; h: number }[];
}

const wrecks = new WeakMap<Game, Wreck[]>();
export const wrecksOf = (g: Game) => wrecks.get(g) ?? [];

/** The host: the Aircraft blows up. It hurts enemies close by, and each pilot may get out alive. */
export function aircraftDown(g: Game, c: Cat) {
  bigBoom(g, c, AIRCRAFT.boom);
  // The pilots: 50% one gets out, 25% both do.
  const r = rand();
  const n = r < PILOT.two ? 2 : r < PILOT.two + PILOT.one ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? (rand() < 0.5 ? -1 : 1) : i ? 1 : -1;
    const p = new Cat(c.owner, c.x + k * 10, c.y - 10, PILOT.hp, PILOT.dmg, 'pilot');
    p.team = c.team;
    p.vx = k * (100 + rand() * 80);
    p.vy = -700;
    p.shootT = PILOT.aimS + rand() * 0.3;
    g.cats.push(p);
    g.text(p.x, p.y - 60, '🪂 Still alive!', '#ffccbc', 20);
  }
}

/** The biggest boom in the game (every aircraft goes out this way): `dmg` to enemies close by (0 = just the show). */
export function bigBoom(g: Game, c: Cat, dmg: number) {
  const R = AIRCRAFT.boomR;
  // The biggest boom in the game: rings, fire, sparks, smoke, a white flash and a big shake.
  g.ring(c.x, c.cy, R, 0.35, '#ffffff');
  g.ring(c.x, c.cy, R * 1.5, 0.55, '#ffeb3b');
  g.ring(c.x, c.cy, R * 2.1, 0.8, '#ff6d00');
  g.ring(c.x, c.cy, R * 2.8, 1.1, '#ff1744');
  g.burst(c.x, c.cy, '#ffffff', 20, 700);
  g.burst(c.x, c.cy, '#fff59d', 34, 640);
  g.burst(c.x, c.cy, '#ffb300', 40, 560);
  g.burst(c.x, c.cy, '#ff5722', 36, 480);
  g.burst(c.x, c.cy, '#d32f2f', 22, 380);
  g.burst(c.x, c.cy, '#424242', 26, 300);
  g.burst(c.x, c.cy, '#d7c49e', 18, 520);
  g.text(c.x, c.y - 90, '💥 KA-BOOOOM! 💥', '#ffeb3b', 42);
  g.shake = Math.min(40, g.shake + 30);
  g.juice.flash = 0.85;
  g.juice.flashColor = '#fff8e1';
  g.play('boom');
  g.blastN++;
  for (const e of g.bodies()) {
    if (!e.alive || e.team === c.team || dmg <= 0) continue;
    const dx = e.x - c.x;
    if (Math.hypot(dx, e.cy - c.cy) > R + e.w / 2) continue;
    g.damage(e, dmg, c.owner, (sign(dx) || 1) * 650, -520, 'ashes');
  }
  g.blastN--;
}

/** Every device: the wreck and its fireball (from helperRemains, which also runs on joining devices). */
export function aircraftWreck(g: Game, c: Cat) {
  const list = wrecks.get(g) ?? [];
  list.push({ x: c.x, y: c.cy, vx: c.vx * 0.3, vy: -120, rot: 0, vr: c.facing * (0.5 + rand() * 0.35), t: 0, facing: c.facing, color: c.owner.color, kind: c.variant, bx: c.x, by: c.cy, smoke: [], bits: blastBits(c.variant) });
  wrecks.set(g, list);
}

const BIT_COLORS: Record<string, string[]> = {
  aircraft: ['#d8c9a3', '#d8c9a3', '#c4b48a', '#8a8f96', '#212121', '#ffd600', '#e53935', '#b3e5fc'],
  miniair: ['#43a047', '#43a047', '#8d5a3b', '#e53935', '#212121', '#ffd600'],
  redair: ['#c62828', '#c62828', '#e53935', '#d8893f', '#5d4037', '#ffb74d', '#cfd8dc'],
  greenair: ['#2e9e44', '#2e9e44', '#1b7a33', '#f9a825', '#212121', '#ffd600', '#6d4c41'],
};
function blastBits(kind: string): Wreck['bits'] {
  const BITS = BIT_COLORS[kind] ?? BIT_COLORS.aircraft;
  return Array.from({ length: 22 }, () => {
    const a = rand() * Math.PI * 2;
    const sp = 260 + rand() * 520;
    return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 320, vr: (rand() - 0.5) * 18, color: BITS[Math.floor(rand() * BITS.length)], w: 6 + rand() * 9, h: 4 + rand() * 6 };
  });
}

/** The wreck falls slowly (it drifts down like a leaf would, no faster than 170 a second), trailing fire and smoke. */
export function updateWrecks(g: Game, dt: number) {
  const list = wrecks.get(g);
  if (!list?.length) return;
  for (const w of list) {
    w.t += dt;
    w.vy = Math.min(170, w.vy + 260 * dt);
    w.vx *= Math.max(0, 1 - 0.6 * dt);
    w.x += w.vx * dt + Math.sin(w.t * 2.4) * 30 * dt;
    w.y += w.vy * dt;
    // It noses over slowly as it falls, rocking a little.
    w.rot = w.vr * Math.min(1, w.t * 0.45) + Math.sin(w.t * 3) * 0.08;
    if (rand() < dt * 18) w.smoke.push({ x: w.x + (rand() - 0.5) * 20, y: w.y + (rand() - 0.5) * 10, t: 0, r: 8 + rand() * 8 });
    for (const s of w.smoke) {
      s.t += dt;
      s.y -= 20 * dt;
    }
    w.smoke = w.smoke.filter((s) => s.t < 2.2);
  }
  wrecks.set(g, list.filter((w) => w.t < 4 || w.y < g.map.h + 500 || w.smoke.length));
}
