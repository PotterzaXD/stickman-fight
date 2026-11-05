import { ballisticAngle } from './ai';
import { Body, Fighter, type Projectile } from './entities';
import type { Game } from './game';
import { knockDown } from './oct23';
import type { Platform } from './types';
import type { WeaponId } from './weapons';

/*
 * The November 5 update's weapons: the Mattress and the APhone.
 */

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const rand = Math.random;

/**
 * Mattress: throw it and it lands on the whole group there (20 each). Everyone under it is crushed flat:
 * stuck for 5 s, then they can't breathe and take 10 every second for 5 more seconds (still stuck). Nobody can free them.
 */
export const MATTRESS = { dmg: 20, speed: 850, g: 1100, R: 150, rise: 110, stuck: 5, choke: 5, chokeDmg: 10, knock: 1.6 };
/** APhone: thrown for 60 and the one it lands on burns (2 every second for 2 s). A miss explodes: 30 to everyone within about 3 stickmen. */
export const APHONE = { dmg: 60, speed: 1000, g: 900, burnS: 2, burn: 2, boom: 30, boomR: 110 };

/** The new weapons' skills. Returns false for any other weapon. */
export function nov05Skill(g: Game, f: Fighter, slot: number, angle: number): boolean {
  const tip = f.tip(slot);
  const m = f.dmgMult;
  switch (f.weapons[slot].id) {
    case 'mattress':
      g.spawnProj('mattress', f, tip.x, tip.y, angle, MATTRESS.speed, MATTRESS.g, MATTRESS.dmg * m, slot);
      g.text(f.x, f.y - f.h - 30, '🛏️ FLOP!', '#90caf9', 22);
      return true;
    case 'aphone':
      g.spawnProj('aphone', f, tip.x, tip.y, angle, APHONE.speed, APHONE.g, APHONE.dmg * m, slot);
      g.text(f.x, f.y - f.h - 30, '📱 CATCH!', '#e0e0e0', 22);
      return true;
  }
  return false;
}

/** How far a melee hit with these throws people. */
export const nov05Force = (id: WeaponId) => (id === 'mattress' ? MATTRESS.knock : null);

/** A new shot hit somebody. Returns false for other shots. */
export function nov05Hit(g: Game, p: Projectile, e: Body, dir: number): boolean {
  if (p.kind === 'mattress') {
    flop(g, p, e.x, e.y);
    return true;
  }
  if (p.kind === 'aphone') {
    if (g.damage(e, p.dmg, p.owner, dir * 320, -240, 'fling') && e.alive) g.setBurn(e, APHONE.burnS, APHONE.burn * (p.dmg / APHONE.dmg), p.owner);
    g.burst(p.x, p.y, '#ff6d00', 10, 240);
    g.text(e.x, e.y - e.h - 30, '📱🔥', '#ffab40', 22);
    p.dead = true;
    return true;
  }
  return false;
}

/** A new shot hit a platform (or flew out of time). Returns false for other shots. */
export function nov05Splat(g: Game, p: Projectile, pl: Platform | null): boolean {
  if (p.kind === 'mattress') {
    flop(g, p, p.x, pl ? pl.y : p.y);
    return true;
  }
  if (p.kind === 'aphone') {
    phoneBoom(g, p, pl ? Math.min(p.y, pl.y) : p.y);
    return true;
  }
  return false;
}

/** The mattress lands: everyone in the group under it takes 20 and gets crushed. */
function flop(g: Game, p: Projectile, x: number, y: number) {
  p.dead = true;
  const k = p.dmg / MATTRESS.dmg;
  for (const e of g.bodies()) {
    if (!e.alive || e.team === p.team) continue;
    if (Math.abs(e.x - x) > MATTRESS.R + e.w / 2 || Math.abs(e.y - y) > MATTRESS.rise) continue;
    const heavy = e instanceof Fighter && e.boss;
    if (g.damage(e, p.dmg, p.owner, (sign(e.x - x) || 1) * 60, 0, 'trip') && e.alive && !heavy) crush(e, p.owner, k);
  }
  g.burst(x, y - 10, '#90caf9', 16, 260);
  g.burst(x, y - 10, '#ffffff', 10, 200);
  g.text(x, y - 80, '🛏️ CRUSHED!', '#bbdefb', 26);
  g.shake = Math.min(14, g.shake + 6);
  g.play('heavy');
}

/** Stuck under the mattress (a hit doesn't free them). */
export function crush(e: Body, by: Body, power = 1) {
  e.mattT = MATTRESS.stuck + MATTRESS.choke;
  e.mattTick = MATTRESS.choke - 1;
  e.mattSrc = by;
  e.mattDmg = MATTRESS.chokeDmg * power;
  knockDown(e, 0.2);
  e.vx = 0;
}

/** APhone missed: it explodes. */
function phoneBoom(g: Game, p: Projectile, y: number) {
  p.dead = true;
  const k = p.dmg / APHONE.dmg;
  g.ring(p.x, y, APHONE.boomR, 0.3, '#ff9800');
  g.burst(p.x, y, '#ff9800', 18, 380);
  g.burst(p.x, y, '#424242', 8, 260);
  g.text(p.x, y - 40, '💥📱', '#ffcc80', 24);
  g.shake = Math.min(16, g.shake + 7);
  g.play('boom');
  for (const e of g.bodies()) {
    if (!e.alive || e.team === p.team) continue;
    const dx = e.x - p.x;
    if (Math.hypot(dx, e.cy - y) > APHONE.boomR + e.w / 2) continue;
    g.damage(e, APHONE.boom * k, p.owner, (sign(dx) || 1) * 500, -420, 'pop');
  }
}

/** Every frame: crushed under mattresses. */
export function updateNov05(g: Game, dt: number) {
  for (const b of g.bodies()) {
    if (b.mattT <= 0) continue;
    if (!b.alive) {
      b.mattT = 0;
      continue;
    }
    b.mattT -= dt;
    b.downT = Math.max(b.downT, 0.1);
    b.stun = Math.max(b.stun, 0.1);
    b.vx *= 0.5;
    // The first 5 s they are just stuck; then they can't breathe: 10 at 4, 3, 2, 1 and 0 seconds left.
    while (b.alive && b.mattTick >= 0 && b.mattT <= b.mattTick) {
      b.mattTick -= 1;
      g.damage(b, b.mattDmg, b.mattSrc, 0, 0, 'trip');
      if (rand() < 0.6) g.text(b.x, b.y - 50, '😵 ...', '#bbdefb', 18);
    }
    if (b.mattT <= 0) b.mattT = 0;
  }
}

/** When a bot uses the new weapons. Returns undefined for other weapons. */
export function nov05BotSkill(f: Fighter, i: number, dx: number, dy: number, dist: number): number | null | undefined {
  switch (f.weapons[i].id) {
    case 'mattress':
      return dist < 700 ? ballisticAngle(dx, dy, MATTRESS.speed, MATTRESS.g) : null;
    case 'aphone':
      return dist < 800 ? ballisticAngle(dx, dy, APHONE.speed, APHONE.g) : null;
  }
  return undefined;
}
