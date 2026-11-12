import { BotBrain, ballisticAngle } from './ai';
import { Body, Fighter, type Projectile } from './entities';
import type { Game } from './game';
import { bringBack } from './hill';
import { knockDown } from './oct23';
import type { Platform } from './types';
import { weapon } from './weapons';

/*
 * The November 12 update: the free Blindfold, the Ghost Sword (and its ghost clones), and the betta fish.
 * The "." boss is in dot.ts.
 */

/** Blindfold: thrown for 60; whoever it lands on falls asleep (a hit wakes them up, 5 s at most). */
export const BLINDFOLD = { dmg: 60, speed: 950, g: 950, sleep: 5 };
/** Ghost Sword: the ghost life starts with 250 HP, +10 for every KO before it. Two ghost clones with 100 HP come too. */
export const GHOST_SWORD = { hp: 250, perKo: 10, clones: 2 };
export const GHOST_CLONE = { hp: 100 };
/** The Summoner's betta fish: twice the HP of its normal fish, half the bite. 10 at a time. */
export const BETTA = { count: 10, hp: 80, dmg: 6, max: 10 };

// ---------- Blindfold ----------

export function nov12Skill(g: Game, f: Fighter, slot: number, angle: number): boolean {
  if (f.weapons[slot].id !== 'blindfold') return false;
  const tip = f.tip(slot);
  g.spawnProj('blindfold', f, tip.x, tip.y, angle, BLINDFOLD.speed, BLINDFOLD.g, BLINDFOLD.dmg * f.dmgMult, slot);
  g.text(f.x, f.y - f.h - 30, '🙈 SLEEPY TIME!', '#d1c4e9', 22);
  g.play('throw');
  return true;
}

export function nov12Hit(g: Game, p: Projectile, e: Body, dir: number): boolean {
  if (p.kind !== 'blindfold') return false;
  const heavy = e instanceof Fighter && e.boss;
  if (g.damage(e, p.dmg, p.owner, dir * 120, -60, 'trip') && e.alive && !heavy) blindfold(g, e);
  g.burst(p.x, p.y, '#311b92', 10, 200);
  return true;
}

export function nov12Splat(g: Game, p: Projectile, pl: Platform): boolean {
  if (p.kind !== 'blindfold') return false;
  g.burst(p.x, Math.min(p.y, pl.y), '#5e35b1', 6, 160);
  p.dead = true;
  return true;
}

/** The blindfold lands on their head: they drop down asleep until somebody hits them. */
export function blindfold(g: Game, e: Body) {
  e.sleepT = BLINDFOLD.sleep;
  e.blind = true;
  knockDown(e, BLINDFOLD.sleep);
  e.vx *= 0.3;
  g.text(e.x, e.y - e.h - 40, '🙈 Zzz', '#d1c4e9', 26);
}

/** Every frame: a blindfold comes off when its sleep ends. */
export function updateNov12(g: Game) {
  for (const b of g.bodies()) if (b.blind && b.sleepT <= 0) b.blind = false;
}

export function nov12BotSkill(f: Fighter, i: number, dx: number, dy: number, dist: number): number | null | undefined {
  if (f.weapons[i].id !== 'blindfold') return undefined;
  return dist < 750 ? ballisticAngle(dx, dy, BLINDFOLD.speed, BLINDFOLD.g) : null;
}

// ---------- Ghost Sword ----------

/** Going down with the Ghost Sword for the first time this match: come back as a ghost instead. Returns true when it did. */
export function ghostRevive(g: Game, b: Body, how: string): boolean {
  if (!(b instanceof Fighter) || b.ghostUsed || b.cloneOf || b.boss || b.horde || b.zombie) return false;
  if (!b.weapons.some((w) => w.id === 'ghostsword')) return false;
  b.ghostUsed = true;
  b.ghost = true;
  b.maxHp = GHOST_SWORD.hp + GHOST_SWORD.perKo * b.kos;
  b.hp = b.maxHp;
  b.burnT = b.poisonT = b.frozenT = b.slowT = b.bubbleT = b.mattT = b.sleepT = b.downT = 0;
  b.blind = false;
  b.stun = 0;
  // Fell off the map: the ghost comes back somewhere safe.
  if (how === 'void' || b.y > g.map.h + 50) {
    const keep = b.maxHp;
    bringBack(g, b);
    b.maxHp = b.hp = keep;
  } else {
    b.vy = -500;
    b.onGround = false;
  }
  g.ring(b.x, b.cy, 120, 0.6, '#b3e5fc');
  g.burst(b.x, b.cy, '#e1f5fe', 24, 380);
  g.text(b.x, b.y - b.h - 40, `👻 GHOST LIFE! ${b.maxHp} HP`, '#b3e5fc', 28);
  g.play('snowman');
  callGhostClones(g, b, GHOST_SWORD.clones);
  return true;
}

/** Ghost clones of `f`: see-through copies with its name and colour, 100 HP, holding a Ghost Sword. */
export function callGhostClones(g: Game, f: Fighter, n: number, max = n): number {
  const have = g.fighters.filter((c) => c.alive && c.ghost && c.cloneOf === f).length;
  const k = Math.min(n, max - have);
  for (let i = 0; i < k; i++) {
    const c = g.addClone(f, 'ghostsword');
    makeGhost(c);
    c.brain = new BotBrain('hard');
    c.x = Math.max(20, Math.min(g.map.w - 20, f.x + (i % 2 === 0 ? -1 : 1) * (50 + 30 * Math.floor(i / 2))));
    c.vy = -500;
    g.burst(c.x, c.cy, '#e1f5fe', 12, 260);
  }
  if (k > 0) g.text(f.x, f.y - f.h - 60, `👻 ×${k}`, '#e1f5fe', 26);
  return k;
}

/** Turn a fresh Clone into a ghost clone. */
export function makeGhost(c: Fighter) {
  c.ghost = true;
  c.ghostUsed = true;
  c.maxHp = c.hp = GHOST_CLONE.hp;
  c.weapons = [weapon('ghostsword')];
}

/** A ghost clone goes down: it just fades away (no explosion). */
export function ghostFade(g: Game, c: Fighter) {
  g.burst(c.x, c.cy, '#e1f5fe', 16, 260, false);
  g.text(c.x, c.y - c.h - 30, '👻💨', '#e1f5fe', 22);
}
