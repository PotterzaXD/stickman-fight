import { ballisticAngle } from './ai';
import {
  BABY_ELE, Body, CHEF, CUPCAKE, Cat, DINO, DRONE, FROG, Fighter, GHOST, GINGER, KNIGHT, PANDA, PENGUIN, RETRO, SB_ALLY, UNICORN, WIZARD, ZOMBIE_ALLY,
  type CatVariant, type Projectile,
} from './entities';
import type { Game } from './game';
import { knockDown } from './oct23';
import type { Platform } from './types';
import { summonCard, type WeaponId } from './weapons';

/*
 * The October 30 update: the free Broom, Paper Plane and Flying Slipper, the Water Balloon, Frisbee, Plunger, Fan and
 * Morning Star, the Blanket, a summon card for every helper that had no weapon to call it, and four new helpers
 * (the Unicorn, the Dino, the Wizard and the Panda). Also the map editor's portals.
 */

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const rand = Math.random;

/** Broom: Sweep knocks everyone in front off their feet. */
export const BROOM = { dmg: 25, down: 0.7 };
/** Paper Plane: glides straight and far. */
export const PLANE = { dmg: 28, speed: 900 };
/** Flying Slipper: a good throw stuns for a moment. */
export const SLIPPER = { dmg: 30, speed: 1000, g: 1100, stun: 0.6 };
/** Water Balloon: SPLASH, everyone close gets wet and slow. */
export const BALLOON = { dmg: 24, R: 100, speed: 850, g: 1300, slowS: 1.5 };
/** Plunger: sticks to whoever it hits and pulls them over to you. */
export const PLUNGER = { dmg: 20, speed: 1300, g: 200, pull: 900 };
/** Fan: a gust that blows everyone in front of you far away. */
export const FAN = { dmg: 10, range: 380, push: 1100 };
/** Frisbee: flies straight through everyone in its way. */
export const FRISBEE = { dmg: 22, speed: 1100 };
/** Morning Star: Spin, the ball whirls around you hitting everyone close a few times. */
export const SPIN = { dmg: 18, every: 0.3, s: 1.2 };
/** Blanket: thrown for 50, and whoever it lands on lies down asleep under it until somebody hits them (10 s at most). */
export const BLANKET = { dmg: 50, speed: 900, g: 1000, sleep: 10, knock: 2.2 };

// ---------- weapons ----------

/** The new weapons' skills. Returns false for any other weapon. */
export function oct30Skill(g: Game, f: Fighter, slot: number, angle: number): boolean {
  const tip = f.tip(slot);
  const m = f.dmgMult;
  const id = f.weapons[slot].id;
  if (summonCard(id)) {
    useCard(g, f, id);
    return true;
  }
  switch (id) {
    case 'broom': {
      const dir = Math.cos(angle) >= 0 ? 1 : -1;
      f.facing = dir;
      f.slashT = 0.3;
      f.slashAngle = dir > 0 ? 0.5 : Math.PI - 0.5;
      f.slashSlot = slot;
      const R = f.reach(slot) + 60 * f.scale;
      for (const e of g.bodies()) {
        if (!e.alive || e.team === f.team) continue;
        const dx = e.x - f.x;
        if (dx * dir < -10 || Math.abs(dx) > R + e.w / 2 || Math.abs(e.y - f.y) > 90 * f.scale) continue;
        f.hitCd.set(e.id, g.time + 0.5);
        if (g.damage(e, BROOM.dmg * m, f, dir * 700, -140, 'trip') && e.alive && !(e instanceof Fighter && e.boss)) knockDown(e, BROOM.down);
      }
      g.burst(f.x + dir * R * 0.6, f.y - 6, '#d7ccc8', 14, 300);
      g.text(f.x, f.y - f.h - 30, '🧹 SWEEP!', '#ffe0b2', 24);
      g.play('throw');
      return true;
    }
    case 'paperplane':
      g.spawnProj('plane', f, tip.x, tip.y, angle, PLANE.speed, 0, PLANE.dmg * m, slot);
      g.text(f.x, f.y - f.h - 30, '✈️ WHOOSH!', '#e3f2fd', 22);
      g.play('throw');
      return true;
    case 'slipper':
      g.spawnProj('slipper', f, tip.x, tip.y, angle, SLIPPER.speed, SLIPPER.g, SLIPPER.dmg * m, slot);
      g.text(f.x, f.y - f.h - 30, '🩴 CHANCLA!', '#ffccbc', 22);
      g.play('throw');
      return true;
    case 'waterballoon':
      g.spawnProj('balloon', f, tip.x, tip.y, angle, BALLOON.speed, BALLOON.g, BALLOON.dmg * m, slot);
      g.play('throw');
      return true;
    case 'plunger':
      g.spawnProj('plunger', f, tip.x, tip.y, angle, PLUNGER.speed, PLUNGER.g, PLUNGER.dmg * m, slot);
      g.text(f.x, f.y - f.h - 30, '🪠 THWOMP!', '#ef9a9a', 22);
      g.play('throw');
      return true;
    case 'frisbee':
      g.spawnProj('frisbee', f, tip.x, tip.y, angle, FRISBEE.speed, 0, FRISBEE.dmg * m, slot);
      g.play('throw');
      return true;
    case 'fan': {
      const dir = Math.cos(angle) >= 0 ? 1 : -1;
      f.facing = dir;
      const sh = f.shoulder();
      for (const e of g.bodies()) {
        if (!e.alive || e.team === f.team) continue;
        const dx = e.x - sh.x;
        const dy = e.cy - sh.y;
        if (dx * dir < -10 || Math.hypot(dx, dy) > FAN.range * f.scale || Math.abs(dy) > Math.abs(dx) * 0.9 + 60) continue;
        const heavy = e instanceof Fighter && e.boss;
        f.hitCd.set(e.id, g.time + 0.5);
        g.damage(e, FAN.dmg * m, f, dir * (heavy ? FAN.push * 0.2 : FAN.push), heavy ? -60 : -300, 'fling');
      }
      for (let k = 0; k < 10; k++) g.burst(sh.x + dir * (40 + k * 30), sh.y + (rand() - 0.5) * 60, '#e1f5fe', 1, 200);
      g.text(f.x, f.y - f.h - 30, '🌬️ WHOOSH!', '#e1f5fe', 24);
      g.play('throw');
      return true;
    }
    case 'morningstar':
      f.spinT = SPIN.s;
      f.spinTick = 0;
      f.slashSlot = slot;
      g.text(f.x, f.y - f.h - 30, '🌀 SPIN!', '#cfd8dc', 24);
      g.play('heavy');
      return true;
    case 'blanket':
      g.spawnProj('blanket', f, tip.x, tip.y, angle, BLANKET.speed, BLANKET.g, BLANKET.dmg * m, slot);
      g.text(f.x, f.y - f.h - 30, '🛏️ NIGHT NIGHT!', '#b39ddb', 22);
      g.play('throw');
      return true;
  }
  return false;
}

/** How far a melee hit with this weapon throws people (the Blanket sends them flying). */
export const meleeForce = (id: WeaponId) => (id === 'blanket' ? BLANKET.knock : 1);

/** A summon card: call its helper (one at a time; the drone card calls up to two). */
function useCard(g: Game, f: Fighter, id: string) {
  const card = summonCard(id)!;
  const v = card.helper as CatVariant;
  const inward = f.x < g.map.w / 2 ? 1 : -1;
  const before = g.cats.filter((c) => c.alive && c.owner === f && c.variant === v).length;
  if (v === 'redguy') g.summonRedGuy(f);
  else if (v === 'drone') g.callCats(f, { count: DRONE.max, hp: DRONE.hp, dmg: DRONE.dmg, max: DRONE.max }, 'drone');
  else {
    const [hp, dmg] = HELPER_STATS[v] ?? [200, 15];
    g.summonOne(f, v, hp, dmg, inward * 60);
  }
  const after = g.cats.filter((c) => c.alive && c.owner === f && c.variant === v).length;
  if (after > before || v === 'redguy') {
    g.ring(f.x, f.y, 110 * f.scale, 0.45, '#e040fb');
    g.text(f.x, f.y - f.h - 30, `${card.icon} ✨`, '#e1bee7', 26);
    g.play('snowman');
  } else g.text(f.x, f.y - f.h - 30, `${card.icon} ✋`, '#ffffff', 22);
}

/** HP and damage of each helper a summon card calls (and that the Summoner and Sandbox use for the new ones). */
export const HELPER_STATS: Partial<Record<CatVariant, [number, number]>> = {
  sbsnow: [SB_ALLY.hp, SB_ALLY.punch],
  fireally: [SB_ALLY.hp, SB_ALLY.fire],
  retro: [RETRO.hp, RETRO.dmg],
  zombie: [ZOMBIE_ALLY.hp, ZOMBIE_ALLY.dmg],
  babyele: [BABY_ELE.hp, BABY_ELE.dmg],
  penguin: [PENGUIN.hp, PENGUIN.dmg],
  knight: [KNIGHT.hp, KNIGHT.dmg],
  frog: [FROG.hp, FROG.dmg],
  ghost: [GHOST.hp, GHOST.dmg],
  ginger: [GINGER.hp, GINGER.dmg],
  cupcake: [CUPCAKE.hp, CUPCAKE.dmg],
  chef: [CHEF.hp, CHEF.dmg],
  unicorn: [UNICORN.hp, UNICORN.dmg],
  dino: [DINO.hp, DINO.dmg],
  wizard: [WIZARD.hp, WIZARD.dmg],
  panda: [PANDA.hp, PANDA.dmg],
};

/** A new shot hit someone. Returns false for other shots. */
export function oct30Hit(g: Game, p: Projectile, e: Body, dir: number): boolean {
  const heavy = e instanceof Fighter && e.boss;
  switch (p.kind) {
    case 'plane':
      g.damage(e, p.dmg, p.owner, dir * 260, -200, 'fling');
      g.burst(p.x, p.y, '#ffffff', 8, 220);
      return true;
    case 'slipper':
      if (g.damage(e, p.dmg, p.owner, dir * 300, -220, 'trip') && e.alive && !heavy) e.stun = Math.max(e.stun, SLIPPER.stun);
      g.burst(p.x, p.y, '#ff8a65', 8, 240);
      g.text(e.x, e.y - e.h - 30, '🩴 SLAP!', '#ffccbc', 22);
      return true;
    case 'balloon':
      splash(g, p);
      return true;
    case 'plunger': {
      const o = p.owner;
      const toward = sign(o.x - e.x) || -dir;
      if (g.damage(e, p.dmg, o, 0, 0, 'fling') && e.alive && !heavy) {
        e.vx = toward * Math.min(PLUNGER.pull, Math.abs(o.x - e.x) * 2.2 + 200);
        e.vy = -380;
        e.onGround = false;
      }
      g.burst(p.x, p.y, '#e53935', 8, 200);
      g.text(e.x, e.y - e.h - 30, '🪠 YOINK!', '#ef9a9a', 22);
      return true;
    }
    case 'frisbee':
      g.damage(e, p.dmg, p.owner, dir * 320, -240, 'fling');
      g.burst(p.x, p.y, '#ffeb3b', 6, 200);
      // It keeps flying.
      p.dead = false;
      return true;
    case 'blanket':
      if (g.damage(e, p.dmg, p.owner, dir * 120, -80, 'trip') && e.alive && !heavy) tuckIn(g, e);
      g.burst(p.x, p.y, '#b39ddb', 12, 220);
      return true;
    case 'magic':
      g.damage(e, p.dmg, p.owner, dir * 260, -220, 'pop');
      g.burst(p.x, p.y, '#b388ff', 10, 260);
      return true;
  }
  return false;
}

/** Shots that fly through people instead of stopping at the first one. */
export const pierces = (p: Projectile) => p.kind === 'frisbee';

/** Water Balloon: everyone close gets hit and slowed down. */
function splash(g: Game, p: Projectile) {
  for (const e of g.bodies()) {
    if (!e.alive || e.team === p.team) continue;
    const d = Math.hypot(e.x - p.x, e.cy - p.y);
    if (d > BALLOON.R + e.w / 2) continue;
    if (g.damage(e, p.dmg, p.owner, (sign(e.x - p.x) || 1) * 220, -200, 'ragdoll') && e.alive) e.slowT = Math.max(e.slowT, BALLOON.slowS);
  }
  g.burst(p.x, p.y, '#4fc3f7', 18, 320);
  g.burst(p.x, p.y, '#e1f5fe', 10, 220);
  g.text(p.x, p.y - 30, '💦 SPLASH!', '#81d4fa', 24);
  g.play('splash');
  p.dead = true;
}

/** Blanket: lie down asleep under it. A hit wakes them up (see `wake`). */
export function tuckIn(g: Game, e: Body) {
  e.sleepT = BLANKET.sleep;
  knockDown(e, BLANKET.sleep);
  e.vx *= 0.3;
  g.text(e.x, e.y - e.h - 40, '😴 Zzz', '#d1c4e9', 26);
}

/** Somebody hit a sleeping body: it wakes right up. */
export function wake(e: Body) {
  if (e.sleepT <= 0) return;
  e.sleepT = 0;
  e.downT = 0;
  e.stun = Math.min(e.stun, 0.3);
}

/** A new shot hit a platform. Returns false for other shots. */
export function oct30Splat(g: Game, p: Projectile, pl: Platform): boolean {
  if (p.kind === 'balloon') {
    p.y = Math.min(p.y, pl.y);
    splash(g, p);
    return true;
  }
  const color = p.kind === 'plane' ? '#ffffff' : p.kind === 'slipper' ? '#ff8a65' : p.kind === 'plunger' ? '#e53935' : p.kind === 'blanket' ? '#b39ddb' : p.kind === 'magic' ? '#b388ff' : null;
  if (!color) return false;
  g.burst(p.x, Math.min(p.y, pl.y), color, 6, 160);
  p.dead = true;
  return true;
}

// ---------- every frame ----------

/** Sleeping under blankets, Morning Star spins, and the map editor's portals. */
export function updateOct30(g: Game, dt: number) {
  for (const b of g.bodies()) {
    if (b.warpT > 0) b.warpT -= dt;
    if (b.sleepT <= 0) continue;
    b.sleepT -= dt;
    if (b.sleepT <= 0 || !b.alive) wake(b);
    else {
      b.downT = Math.max(b.downT, 0.1);
      if (rand() < dt * 1.2) g.text(b.x + 10, b.y - 40, 'z', '#d1c4e9', 18);
    }
  }
  for (const f of g.fighters) {
    if (!f.alive || f.spinT <= 0) continue;
    f.spinT -= dt;
    f.spinTick -= dt;
    if (f.spinTick > 0) continue;
    f.spinTick = SPIN.every;
    const R = f.reach(f.slashSlot) + 24 * f.scale;
    const sh = f.shoulder();
    for (const e of g.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      if (Math.hypot(e.x - sh.x, e.cy - sh.y) > R + e.w / 2) continue;
      const dir = sign(e.x - f.x) || f.facing;
      g.damage(e, SPIN.dmg * f.dmgMult, f, dir * 420, -320, 'fling');
    }
    g.play('throw');
  }
  if (g.map.warps?.length) updateWarps(g);
}

/** The map editor's portals link up in pairs: 1 with 2, 3 with 4... (one left on its own goes nowhere). */
export function warpPartner(n: number, count: number): number {
  const p = n % 2 === 0 ? n + 1 : n - 1;
  return p < count ? p : -1;
}

export const WARP = { w: 70, h: 120 };

/** Is this point inside the portal standing at w (its bottom middle)? */
export function inWarp(w: { x: number; y: number }, x: number, y: number) {
  return Math.abs(x - w.x) < WARP.w / 2 && y < w.y && y > w.y - WARP.h;
}

function updateWarps(g: Game) {
  const ws = g.map.warps!;
  for (const b of g.bodies()) {
    if (!b.alive || b.warpT > 0) continue;
    // Bosses are too big to fit.
    if (b instanceof Fighter && b.boss) continue;
    const i = ws.findIndex((w) => inWarp(w, b.x, b.cy));
    if (i < 0) continue;
    const j = warpPartner(i, ws.length);
    if (j < 0) continue;
    g.burst(b.x, b.cy, '#40c4ff', 12, 260);
    b.x = ws[j].x;
    b.y = ws[j].y - 2;
    b.vy = Math.min(b.vy, -200);
    b.warpT = 0.8;
    g.burst(b.x, b.cy, '#ff9100', 12, 260);
    if (b instanceof Fighter && b.human) g.play('jump');
  }
}

// ---------- helpers ----------

export function oct30Speed(c: Cat): number | null {
  return c.variant === 'unicorn' ? UNICORN.speed : c.variant === 'dino' ? DINO.speed : c.variant === 'panda' ? PANDA.speed : c.variant === 'wizard' ? 280 : null;
}

export function oct30Reach(c: Cat): number | null {
  return c.variant === 'unicorn' ? c.w / 2 + 14 : c.variant === 'dino' ? c.w / 2 + 16 : c.variant === 'panda' ? c.w / 2 + 6 : c.variant === 'wizard' ? c.w / 2 + 14 : null;
}

export function oct30AttackGap(c: Cat): number | null {
  return c.variant === 'unicorn' ? UNICORN.every : c.variant === 'dino' ? DINO.every : c.variant === 'panda' ? PANDA.every : c.variant === 'wizard' ? 1.2 : null;
}

/** The Unicorn and the Panda charge (the Panda rolls); the Wizard keeps away and shoots magic. */
export function oct30Helper(c: Cat, dt: number, g: Game, t: Body | null) {
  if (c.variant === 'unicorn' || c.variant === 'panda') {
    c.skillCd -= dt;
    if (t && c.onGround && c.skillCd <= 0 && c.stun <= 0 && Math.abs(t.x - c.x) < 480 && Math.abs(t.y - c.y) < 50) {
      c.skillCd = c.variant === 'unicorn' ? UNICORN.chargeEvery : PANDA.rollEvery;
      c.chargeDir = sign(t.x - c.x) || c.facing;
      c.chargeT = c.variant === 'unicorn' ? 0.8 : 1.1;
      c.bumpCd.clear();
      g.text(c.x, c.y - c.h - 20, c.variant === 'unicorn' ? '🦄💨' : '🐼🌀', '#ffffff', 20);
    }
    return;
  }
  if (c.variant !== 'wizard') return;
  if (t) {
    c.facing = sign(t.x - c.x) || c.facing;
    const d = Math.abs(t.x - c.x);
    if (d < 240) c.moveX = -sign(t.x - c.x);
    else if (d < 480) c.moveX = 0;
  }
  c.shootT -= dt;
  if (t && c.shootT <= 0 && c.stun <= 0) {
    const hx = c.x + c.facing * 24;
    const hy = c.y - 62;
    const dx = t.x - hx;
    const dy = t.cy - hy;
    if (Math.hypot(dx, dy) < 900) {
      c.shootT = WIZARD.every;
      c.attackT = 0.4;
      g.spawnProj('magic', c, hx, hy, Math.atan2(dy, dx) + (rand() - 0.5) * 0.06, 800, 0, WIZARD.bolt, 0);
    }
  }
}

/** Summoner: the four October 30 helpers. */
export function summonOct30(g: Game, f: Fighter, inward: number) {
  for (const [v, dx] of [['unicorn', 100], ['dino', 190], ['wizard', 30], ['panda', 150]] as [CatVariant, number][]) {
    const [hp, dmg] = HELPER_STATS[v]!;
    g.summonOne(f, v, hp, dmg, inward * dx);
  }
}

// ---------- bots ----------

/** When a bot uses the new weapons. Returns undefined for other weapons. */
export function oct30BotSkill(f: Fighter, i: number, dx: number, dy: number, dist: number): number | null | undefined {
  const id = f.weapons[i].id;
  if (summonCard(id)) return dist < 900 ? Math.atan2(dy, dx) : null;
  switch (id) {
    case 'broom':
      return dist < f.reach(i) + 70 && Math.abs(dy) < 90 ? Math.atan2(dy, dx) : null;
    case 'paperplane':
    case 'frisbee':
      return dist < 900 && Math.abs(dy) < 160 ? Math.atan2(dy, dx) : null;
    case 'slipper':
      return dist < 800 ? ballisticAngle(dx, dy, SLIPPER.speed, SLIPPER.g) : null;
    case 'waterballoon':
      return dist < 700 ? ballisticAngle(dx, dy, BALLOON.speed, BALLOON.g) : null;
    case 'plunger':
      return dist > 200 && dist < 900 ? ballisticAngle(dx, dy, PLUNGER.speed, PLUNGER.g) : null;
    case 'fan':
      return dist < FAN.range * f.scale ? Math.atan2(dy, dx) : null;
    case 'morningstar':
      return dist < f.reach(i) + 40 ? Math.atan2(dy, dx) : null;
    case 'blanket':
      return dist < 750 ? ballisticAngle(dx, dy, BLANKET.speed, BLANKET.g) : null;
  }
  return undefined;
}

