import { ballisticAngle } from './ai';
import { Fighter, type Body, type Projectile } from './entities';
import type { Game } from './game';
import type { Platform } from './types';

/*
 * November 7: Jay mhuay, a giant girl boss (20,000 HP, 30 a hit).
 * Throw Macaroni (every 6 s): 40 damage and the one it hits burns for 1 every second for 10 s.
 * Fried Rice with Crabs (every 10 s): a box of fried rice for 60 (it bursts open where it lands, crabs everywhere).
 * Beat her and you get her Lunch Box: the same two skills taking turns, at half strength.
 */
export const JAY = { mac: 40, burnS: 10, burn: 1, rice: 60, riceR: 70, macSpeed: 1050, macG: 900, riceSpeed: 950, riceG: 1100, coins: 1500 };
/** The Lunch Box (the reward) hits half as hard as Jay herself. */
const LUNCH = 0.5;

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** How hard this fighter's macaroni and rice hit (1 = Jay's own numbers). */
function power(f: Fighter, id: string): number {
  const base = f.boss ? f.dmgMult / 1.5 : f.dmgMult;
  return id === 'jaylunch' ? base * LUNCH : base;
}

function throwMac(g: Game, f: Fighter, slot: number, angle: number, k: number) {
  const tip = f.tip(slot);
  g.spawnProj('macaroni', f, tip.x, tip.y, angle, JAY.macSpeed, JAY.macG, JAY.mac * k, slot);
  g.text(f.x, f.y - f.h - 30, '🍝 MACARONI!', '#ffcc80', f.boss ? 30 : 22);
}

function throwRice(g: Game, f: Fighter, slot: number, angle: number, k: number) {
  const tip = f.tip(slot);
  g.spawnProj('ricebox', f, tip.x, tip.y, angle, JAY.riceSpeed, JAY.riceG, JAY.rice * k, slot);
  g.text(f.x, f.y - f.h - 30, '🦀🍚 FRIED RICE!', '#fff59d', f.boss ? 30 : 22);
}

/** Jay's skills and the Lunch Box. Returns false for any other weapon. */
export function jaySkill(g: Game, f: Fighter, slot: number, angle: number): boolean {
  const id = f.weapons[slot].id;
  const k = power(f, id);
  switch (id) {
    case 'macaroni':
      throwMac(g, f, slot, angle, k);
      return true;
    case 'friedrice':
      throwRice(g, f, slot, angle, k);
      return true;
    case 'jaylunch': {
      // Takes turns: macaroni, then fried rice.
      const n = f.fishNext;
      f.fishNext = (n + 1) % 2;
      if (n === 0) throwMac(g, f, slot, angle, k);
      else throwRice(g, f, slot, angle, k);
      return true;
    }
  }
  return false;
}

/** A macaroni or rice box hit somebody. Returns false for other shots. */
export function jayHit(g: Game, p: Projectile, e: Body, dir: number): boolean {
  if (p.kind === 'macaroni') {
    // Hot macaroni: 40, then 1 every second for 10 s (the Lunch Box burns for the same time, at half).
    if (g.damage(e, p.dmg, p.owner, dir * 300, -260, 'ashes') && e.alive) g.setBurn(e, JAY.burnS, Math.max(1, Math.round(JAY.burn * (p.dmg / JAY.mac))), p.owner);
    g.burst(p.x, p.y, '#ffb74d', 12, 240);
    g.text(e.x, e.y - e.h - 30, '🍝🔥', '#ffab40', 22);
    p.dead = true;
    return true;
  }
  if (p.kind === 'ricebox') {
    riceBurst(g, p, p.x, p.y, e);
    return true;
  }
  return false;
}

/** A macaroni or rice box hit the floor. Returns false for other shots. */
export function jaySplat(g: Game, p: Projectile, pl: Platform | null): boolean {
  if (p.kind === 'macaroni') {
    p.dead = true;
    g.burst(p.x, pl ? Math.min(p.y, pl.y) : p.y, '#ffcc80', 10, 200);
    return true;
  }
  if (p.kind === 'ricebox') {
    riceBurst(g, p, p.x, pl ? Math.min(p.y, pl.y) : p.y, null);
    return true;
  }
  return false;
}

/** The box bursts open: 60 to the one it hit (or anyone right next to where it landed). */
function riceBurst(g: Game, p: Projectile, x: number, y: number, direct: Body | null) {
  p.dead = true;
  const hit = new Set<Body>();
  if (direct) hit.add(direct);
  for (const e of g.bodies()) {
    if (!e.alive || e.team === p.team || hit.has(e)) continue;
    if (Math.hypot(e.x - x, e.cy - y) <= JAY.riceR + e.w / 2) hit.add(e);
  }
  for (const e of hit) g.damage(e, p.dmg, p.owner, (sign(e.x - x) || 1) * 520, -480, 'pop');
  g.burst(x, y, '#fff59d', 18, 300);
  g.burst(x, y, '#ef5350', 8, 260);
  g.text(x, y - 50, '🦀🦀🍚', '#ffffff', 24);
  g.shake = Math.min(14, g.shake + 5);
  g.play('heavy');
}

/** When a bot (or Jay) uses these. Returns undefined for other weapons. */
export function jayBotSkill(f: Fighter, i: number, dx: number, dy: number, dist: number): number | null | undefined {
  switch (f.weapons[i].id) {
    case 'macaroni':
      return dist < 1100 ? ballisticAngle(dx, dy, JAY.macSpeed, JAY.macG) : null;
    case 'friedrice':
      return dist < 900 ? ballisticAngle(dx, dy, JAY.riceSpeed, JAY.riceG) : null;
    case 'jaylunch':
      return dist < 800 ? ballisticAngle(dx, dy, f.fishNext === 0 ? JAY.macSpeed : JAY.riceSpeed, f.fishNext === 0 ? JAY.macG : JAY.riceG) : null;
  }
  return undefined;
}
