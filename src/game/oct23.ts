import { ballisticAngle, nearestEnemy, platformBelow } from './ai';
import { Body, CHEF, CUPCAKE, Cat, Fighter, GINGER, type Projectile } from './entities';
import type { Game } from './game';
import type { Platform } from './types';

/*
 * The October 23 update: food weapons (the free Pie, Ice Cream, Rolling Pin, Spatula, Ketchup and Popcorn),
 * the Gingerbread Man, the Cupcake and the Chef helpers, and the Portal map's purple portal.
 */

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const rand = Math.random;

/** Pie: thrown for 50, and whoever it lands on falls flat on the ground for 3 seconds. */
export const PIE = { dmg: 50, speed: 1050, g: 1200, down: 3 };
/** Ice Cream: Ice Spike (59) pops out on top of an enemy's head or right beside it, stays as a solid block for 5 seconds, then melts. */
export const ICE_SPIKE = { dmg: 59, life: 5, range: 1100 };
/** Rolling Pin: Flatten, a big bonk in front of you that squashes enemies flat for a moment. */
export const ROLLING_PIN = { dmg: 40, down: 1.2 };
/** Spatula: Flip, everyone in front of you goes flying up. */
export const SPATULA = { dmg: 30, up: 1500 };
/** Ketchup: a squirt of 6 drops that slow you down. */
export const KETCHUP = { dmg: 7, drops: 6, slowS: 2 };
/** Popcorn: 6 kernels that pop. */
export const POPCORN = { dmg: 12, kernels: 6 };

// ---------- weapons ----------

/** The new weapons' skills. Returns false for any other weapon. */
export function oct23Skill(g: Game, f: Fighter, slot: number, angle: number): boolean {
  const tip = f.tip(slot);
  const m = f.dmgMult;
  switch (f.weapons[slot].id) {
    case 'pie':
      // A new pie is in your hand when the skill is ready again.
      g.spawnProj('pie', f, tip.x, tip.y, angle, PIE.speed, PIE.g, PIE.dmg * m, slot);
      g.text(f.x, f.y - f.h - 30, '🥧 PIE!', '#ffe0b2', 22);
      g.play('throw');
      return true;
    case 'icecream':
      iceSpike(g, f);
      return true;
    case 'rollingpin':
      sweep(g, f, slot, angle, ROLLING_PIN.dmg * m, '#d7a86e', '🫓 FLATTEN!', (e, dir) => {
        e.vx = dir * 200;
        // Bosses are too big to squash.
        if (!(e instanceof Fighter && e.boss)) knockDown(e, ROLLING_PIN.down);
      });
      return true;
    case 'spatula':
      sweep(g, f, slot, angle, SPATULA.dmg * m, '#b0bec5', '🍳 FLIP!', (e, dir) => {
        const heavy = e instanceof Fighter && e.boss;
        e.vx = dir * (heavy ? 100 : 260);
        e.vy = -(heavy ? SPATULA.up * 0.25 : SPATULA.up);
        e.onGround = false;
      });
      return true;
    case 'ketchup':
      for (let k = 0; k < KETCHUP.drops; k++) {
        const spread = (k / (KETCHUP.drops - 1) - 0.5) * 0.3;
        g.spawnProj('ketchup', f, tip.x, tip.y, angle + spread, 900 + rand() * 250, 900, KETCHUP.dmg * m, slot);
      }
      g.text(f.x, f.y - f.h - 30, '🍅 SQUIRT!', '#ef5350', 22);
      g.play('splash');
      return true;
    case 'popcorn':
      for (let k = 0; k < POPCORN.kernels; k++) {
        const spread = (k / (POPCORN.kernels - 1) - 0.5) * 0.7;
        g.spawnProj('popcorn', f, tip.x, tip.y, angle + spread, 700 + rand() * 300, 1300, POPCORN.dmg * m, slot);
      }
      g.text(f.x, f.y - f.h - 30, '🍿 POP POP!', '#fff59d', 22);
      g.play('throw');
      return true;
  }
  return false;
}

/** A big swing in front of you that hits everyone in reach once. */
function sweep(g: Game, f: Fighter, slot: number, angle: number, dmg: number, color: string, word: string, then: (e: Body, dir: number) => void) {
  f.slashT = 0.3;
  f.slashAngle = angle;
  f.slashSlot = slot;
  const sh = f.shoulder();
  const R = f.reach(slot) + 50 * f.scale;
  const dir = Math.cos(angle) >= 0 ? 1 : -1;
  f.facing = dir;
  for (const e of g.bodies()) {
    if (!e.alive || e.team === f.team) continue;
    const dx = e.x - sh.x;
    if (Math.hypot(dx, e.cy - sh.y) > R + e.w / 2 || dx * dir < -10) continue;
    f.hitCd.set(e.id, g.time + 0.5);
    if (g.damage(e, dmg, f, dir * 300, -200, 'fling') && e.alive) then(e, dir);
  }
  g.burst(sh.x + dir * R * 0.6, sh.y, color, 12, 300);
  g.text(f.x, f.y - f.h - 30, word, '#ffffff', 24);
  g.play('heavy');
}

/** Knocked flat on the ground (the Pie and the Rolling Pin): can't move until it wears off. */
export function knockDown(e: Body, secs: number) {
  e.downT = Math.max(e.downT, secs);
  e.stun = Math.max(e.stun, secs);
}

/** Ice Cream: an ice spike on top of the closest enemy's head, or bursting up right beside it. */
function iceSpike(g: Game, f: Fighter) {
  const t = nearestEnemy(g, f, ICE_SPIKE.range);
  if (!t) {
    g.text(f.x, f.y - f.h - 30, '🍦 ?', '#e1f5fe', 22);
    return;
  }
  const onHead = rand() < 0.5;
  const top = t.y - t.h;
  let spike: Platform;
  if (onHead) spike = { x: t.x - 32, y: top - 46, w: 64, h: 42, kind: 'wall', temp: 'head' };
  else {
    const side = sign(f.x - t.x) || 1;
    const ground = t.onGround ? t.y : platformBelow(g, t.x, t.y, 2000)?.y ?? t.y;
    spike = { x: t.x + side * (t.w / 2 + 6) - (side < 0 ? 40 : 0), y: ground - 130, w: 40, h: 130, kind: 'wall', temp: 'side' };
  }
  g.addIceSpike(spike, ICE_SPIKE.life);
  const dir = onHead ? sign(t.x - f.x) || 1 : -(sign(f.x - t.x) || 1);
  g.damage(t, ICE_SPIKE.dmg * f.dmgMult, f, dir * 380, onHead ? 120 : -500, 'shatter');
  g.burst(spike.x + spike.w / 2, spike.y + spike.h / 2, '#e1f5fe', 18, 320);
  g.burst(spike.x + spike.w / 2, spike.y + spike.h / 2, '#81d4fa', 8, 240);
  g.text(t.x, top - 60, '🧊 ICE SPIKE!', '#b3e5fc', 24);
  g.play('hit');
}

/** A pie, ketchup or popcorn hit someone. Returns false for other shots. */
export function oct23Hit(g: Game, p: Projectile, e: Body, dir: number): boolean {
  if (p.kind === 'pie') {
    // SPLAT! Flat on the ground for 3 seconds (bosses are too big to fall over).
    // The Chef's pies only splat.
    if (g.damage(e, p.dmg, p.owner, dir * 220, -160, 'trip') && e.alive && p.owner instanceof Fighter && !(e instanceof Fighter && e.boss)) knockDown(e, PIE.down);
    g.burst(p.x, p.y, '#fff8e1', 14, 280);
    g.burst(p.x, p.y, '#d7a86e', 8, 220);
    g.text(e.x, e.y - e.h - 30, '🥧 SPLAT!', '#ffe0b2', 24);
    return true;
  }
  if (p.kind === 'ketchup') {
    if (g.damage(e, p.dmg, p.owner, dir * 120, -100, 'ragdoll') && e.alive) e.slowT = Math.max(e.slowT, KETCHUP.slowS);
    g.burst(p.x, p.y, '#e53935', 6, 180);
    return true;
  }
  if (p.kind === 'popcorn') {
    g.damage(e, p.dmg, p.owner, dir * 260, -260, 'pop');
    g.burst(p.x, p.y, '#fffde7', 10, 260);
    g.text(p.x, p.y - 20, 'POP!', '#fff59d', 18);
    return true;
  }
  return false;
}

/** A pie, ketchup or popcorn hit a platform. Returns false for other shots. */
export function oct23Splat(g: Game, p: Projectile, pl: Platform): boolean {
  const color = p.kind === 'pie' ? '#fff8e1' : p.kind === 'ketchup' ? '#e53935' : p.kind === 'popcorn' ? '#fffde7' : null;
  if (!color) return false;
  g.burst(p.x, Math.min(p.y, pl.y), color, p.kind === 'pie' ? 12 : 5, 180);
  p.dead = true;
  return true;
}

// ---------- every frame ----------

/** Knocked-down timers, melting ice spikes and the Portal. */
export function updateOct23(g: Game, dt: number) {
  for (const b of g.bodies()) {
    if (b.downT <= 0) continue;
    b.downT -= dt;
    b.stun = Math.max(b.stun, b.downT);
    if (b.onGround) b.vx *= 0.8;
  }
  for (const s of g.iceSpikes) {
    s.life -= dt;
    if (s.life <= 0 && s.plat) {
      // Melted: a puddle of drops, and the block is gone.
      g.burst(s.x + s.w / 2, s.y + s.h, '#b3e5fc', 10, 160);
      s.plat.x = -99999;
      s.plat.w = 0;
      s.plat = null;
    }
  }
  g.iceSpikes = g.iceSpikes.filter((s) => s.life > 0);
  if (g.map.portal) updatePortal(g);
}

/** Is this point in the Portal? */
export function inPortal(g: Game, x: number, y: number): boolean {
  const p = g.map.portal;
  if (!p) return false;
  const dx = (x - p.x) / (p.r * 0.75);
  const dy = (y - p.y) / p.r;
  return dx * dx + dy * dy < 1;
}

/** Anyone who walks (or is flung) into the purple portal disappears into it. A player who goes in leaves for Stickman Fight 2. */
function updatePortal(g: Game) {
  for (const b of g.bodies()) {
    if (!b.alive || !inPortal(g, b.x, b.cy)) continue;
    // Bosses are too big to fit through.
    if (b instanceof Fighter && b.boss) continue;
    g.burst(b.x, b.cy, '#e040fb', 20, 360);
    g.burst(b.x, b.cy, '#7c4dff', 10, 260);
    g.play('jump');
    g.kill(b, null, 'void', 'portal');
    if (b instanceof Fighter && !b.cloneOf) g.portalled(b);
  }
  // Knocked out and flung in: the body goes through too.
  for (const c of g.corpses) {
    if (c.done || !c.who) continue;
    const pt = c.pts?.[0] ?? c;
    if (!inPortal(g, pt.x, pt.y - 30)) continue;
    c.done = true;
    c.life = 0;
    g.burst(pt.x, pt.y - 30, '#e040fb', 16, 320);
    if (!c.who.cloneOf) g.portalled(c.who);
  }
}

// ---------- helpers ----------

export function oct23Speed(c: Cat): number | null {
  return c.variant === 'ginger' ? GINGER.speed : c.variant === 'cupcake' ? 240 : c.variant === 'chef' ? 290 : null;
}

export function oct23Reach(c: Cat): number | null {
  return c.variant === 'ginger' ? c.w / 2 + 14 : c.variant === 'chef' ? c.w / 2 + 20 : c.variant === 'cupcake' ? c.w / 2 + 4 : null;
}

export function oct23AttackGap(c: Cat): number | null {
  return c.variant === 'ginger' ? GINGER.every : c.variant === 'cupcake' ? CUPCAKE.every : c.variant === 'chef' ? 1 : null;
}

/** A helper's hit landed: the Cupcake's frosting slows them down. */
export function oct23Bit(c: Cat, e: Body) {
  if (c.variant === 'cupcake' && e.alive) e.slowT = Math.max(e.slowT, CUPCAKE.slowS);
}

/**
 * The Cupcake hops toward enemies; the Chef keeps a little way off and throws pies (they don't knock you down like the Pie weapon).
 * Returns true when the helper is done for this frame.
 */
export function oct23Helper(c: Cat, dt: number, g: Game, t: Body | null): boolean {
  if (c.variant === 'cupcake' && c.onGround && c.moveX && c.stun <= 0 && platformBelow(g, c.x + c.moveX * 90, c.y, 300)) {
    c.vy = -CUPCAKE.hop;
    c.vx = c.moveX * 260;
    c.onGround = false;
  }
  if (c.variant !== 'chef') return false;
  if (t) {
    c.facing = sign(t.x - c.x) || c.facing;
    const d = Math.abs(t.x - c.x);
    // Keep a little way off.
    if (d < 200) c.moveX = -sign(t.x - c.x);
    else if (d < 420) c.moveX = 0;
  }
  c.shootT -= dt;
  if (t && c.shootT <= 0 && c.stun <= 0) {
    const hx = c.x + c.facing * 20;
    const hy = c.y - 56;
    const dx = t.x - hx;
    const dy = t.cy - hy;
    if (Math.hypot(dx, dy) < 850) {
      c.shootT = CHEF.every;
      c.attackT = 0.4;
      g.spawnProj('pie', c, hx, hy, ballisticAngle(dx, dy, 950, 1200) + (rand() - 0.5) * 0.08, 950, 1200, CHEF.pie, 0);
    }
  }
  return false;
}

/** Summoner: the three October 23 helpers. */
export function summonOct23(g: Game, f: Fighter, inward: number) {
  g.summonOne(f, 'ginger', GINGER.hp, GINGER.dmg, inward * 70);
  g.summonOne(f, 'cupcake', CUPCAKE.hp, CUPCAKE.dmg, inward * 150);
  g.summonOne(f, 'chef', CHEF.hp, CHEF.dmg, inward * 210);
}
