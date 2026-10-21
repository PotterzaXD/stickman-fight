import { nearestEnemy, platformBelow } from './ai';
import { BOOGER, Body, Cat, FROG, Fighter, GHOST, KNIGHT, LOLLIPOP, PILLOW, RACKET, SCYTHE, type Projectile } from './entities';
import type { Game } from './game';
import { bringBack } from './hill';
import type { BossKind, Platform } from './types';

/*
 * The October 22 update: the Booger and four more weapons, the Knight, the Frog and the Ghost,
 * walls you can't get past, and two modes: 3 Lives (offline and online) and Boss Rush (offline).
 */

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const rand = Math.random;

// ---------- weapons ----------

/** The new weapons' skills. Returns false for any other weapon. */
export function oct22Skill(g: Game, f: Fighter, slot: number, angle: number): boolean {
  const tip = f.tip(slot);
  const m = f.dmgMult;
  switch (f.weapons[slot].id) {
    case 'booger':
      // Flick it! A new one is ready a second later (the weapon's cooldown).
      g.spawnProj('booger', f, tip.x, tip.y, angle, BOOGER.speed, BOOGER.g, BOOGER.dmg * m, slot);
      g.play('throw');
      return true;
    case 'racket': {
      g.spawnProj('tennis', f, tip.x, tip.y, angle, RACKET.speed, RACKET.g, RACKET.dmg * m, slot);
      g.projectiles[g.projectiles.length - 1].bounces = RACKET.bounces;
      g.text(f.x, f.y - f.h - 30, '🎾 SERVE!', '#d4e157', 22);
      g.play('throw');
      return true;
    }
    case 'lollipop':
      f.sugarT = LOLLIPOP.s;
      f.hp = Math.min(f.maxHp, f.hp + LOLLIPOP.heal);
      g.ring(f.x, f.cy, 90 * f.scale, 0.4, '#f06292');
      g.burst(f.x, f.cy, '#f48fb1', 12, 260);
      g.text(f.x, f.y - f.h - 34, `🍭 SUGAR RUSH! +${LOLLIPOP.heal}`, '#f48fb1', 24);
      g.play('jump');
      return true;
    case 'scythe':
      reap(g, f, slot, angle);
      return true;
    case 'pillow':
      pillowFight(g, f);
      return true;
  }
  return false;
}

/** Scythe: Reap. A big sweep in front of you; you heal half of what it hits. */
function reap(g: Game, f: Fighter, slot: number, angle: number) {
  f.slashT = 0.3;
  f.slashAngle = angle;
  f.slashSlot = slot;
  const sh = f.shoulder();
  const R = f.reach(slot) + 50 * f.scale;
  const dir = Math.cos(angle) >= 0 ? 1 : -1;
  f.facing = dir;
  let healed = 0;
  for (const e of g.bodies()) {
    if (!e.alive || e.team === f.team) continue;
    const dx = e.x - sh.x;
    if (Math.hypot(dx, e.cy - sh.y) > R + e.w / 2 || dx * dir < -10) continue;
    f.hitCd.set(e.id, g.time + 0.5);
    const before = e.hp;
    if (g.damage(e, SCYTHE.dmg * f.dmgMult, f, dir * 520, -420, 'half')) healed += Math.max(0, before - Math.max(0, e.hp));
  }
  g.burst(sh.x + dir * R * 0.6, sh.y, '#7e57c2', 10, 280);
  if (healed > 0) {
    const add = Math.round(healed * SCYTHE.heal);
    f.hp = Math.min(f.maxHp, f.hp + add);
    g.text(f.x, f.y - f.h - 34, `💜 +${add}`, '#b39ddb', 24);
  }
  g.play('throw');
}

/** Pillow: Pillow Fight. Feathers everywhere, and everyone close falls asleep for a moment. */
function pillowFight(g: Game, f: Fighter) {
  const R = PILLOW.R * f.scale;
  g.ring(f.x, f.cy, R, 0.45, '#ffffff');
  g.burst(f.x, f.cy, '#ffffff', 22, 380);
  g.burst(f.x, f.cy, '#f8bbd0', 8, 260);
  g.text(f.x, f.y - f.h - 34, '🪶 PILLOW FIGHT!', '#ffffff', 24);
  g.play('hit');
  for (const e of g.bodies()) {
    if (!e.alive || e.team === f.team) continue;
    const dx = e.x - f.x;
    if (Math.hypot(dx, e.cy - f.cy) > R + e.w / 2) continue;
    f.hitCd.set(e.id, g.time + 0.5);
    // Bosses are too big to fall asleep.
    if (g.damage(e, PILLOW.dmg * f.dmgMult, f, (sign(dx) || 1) * 420, -300, 'trip') && e.alive && !(e instanceof Fighter && e.boss)) {
      e.stun = Math.max(e.stun, PILLOW.sleep);
      g.text(e.x, e.y - e.h - 30, '💤', '#ffffff', 26);
    }
  }
}

/** A booger or tennis ball hit someone. Returns false for other shots. */
export function oct22Hit(g: Game, p: Projectile, e: Body, dir: number): boolean {
  if (p.kind === 'booger') {
    g.damage(e, p.dmg, p.owner, dir * 260, -220, 'trip');
    g.burst(p.x, p.y, '#9ccc65', 10, 240);
    g.text(e.x, e.y - e.h - 30, 'EWW!', '#c5e1a5', 22);
    return true;
  }
  if (p.kind === 'tennis') {
    g.damage(e, p.dmg, p.owner, dir * 380, -300, 'fling');
    g.burst(p.x, p.y, '#d4e157', 8, 220);
    return true;
  }
  return false;
}

/** A tennis ball bounces off the floor (and walls) a few times. Returns true if it bounced. */
export function tennisBounce(p: Projectile, pl: Platform): boolean {
  if (p.kind !== 'tennis' || !p.bounces) return false;
  p.bounces--;
  const fromTop = p.vy > 0 && p.y - p.vy * 0.02 <= pl.y + 2;
  const fromBelow = p.vy < 0 && p.y - p.vy * 0.02 >= pl.y + pl.h - 2;
  if (fromTop) {
    p.y = pl.y - p.r;
    p.vy = -Math.abs(p.vy) * 0.75;
  } else if (fromBelow) {
    p.y = pl.y + pl.h + p.r;
    p.vy = Math.abs(p.vy) * 0.5;
  } else {
    p.x = p.vx > 0 ? pl.x - p.r : pl.x + pl.w + p.r;
    p.vx = -p.vx * 0.8;
  }
  p.hit.clear();
  return true;
}

/**
 * Bots and walls: a bot walking into a wall heads for a bounce pad on its own side to get over it,
 * or just waits by the wall if there is none. Returns the new way to walk.
 */
export function wallDetour(g: Game, f: Fighter, moveX: number): number {
  if (!moveX || !f.onGround) return moveX;
  const dir = sign(moveX);
  const half = f.w * 0.35;
  const wall = g.map.platforms.find((p) => p.kind === 'wall' && f.y > p.y + 2 && f.y - f.h < p.y + p.h && (dir > 0 ? p.x - (f.x + half) : f.x - half - (p.x + p.w)) >= -2 && (dir > 0 ? p.x - (f.x + half) : f.x - half - (p.x + p.w)) < 30);
  if (!wall) return moveX;
  // A bounce pad on this side of the wall, close enough to walk to.
  const mySide = (x: number) => (dir > 0 ? x < wall.x : x > wall.x + wall.w);
  const pad = g.map.platforms.filter((p) => p.kind === 'bounce' && mySide(p.x + p.w / 2) && Math.abs(p.y - f.y) < 60 && Math.abs(p.x + p.w / 2 - f.x) < 500).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0];
  if (!pad) return 0;
  const cx = pad.x + pad.w / 2;
  return Math.abs(cx - f.x) > 8 ? sign(cx - f.x) : 0;
}

// ---------- helpers ----------

/** The Knight blocks half of every hit with its shield. */
export const helperArmour = (b: Body) => (b instanceof Cat && b.variant === 'knight' ? 0.5 : 1);

/** Walking speed and reach for the new helpers (null = not one of them). */
export function oct22Speed(c: Cat): number | null {
  return c.variant === 'knight' ? KNIGHT.speed : c.variant === 'frog' ? 260 : null;
}

export function oct22Reach(c: Cat): number | null {
  return c.variant === 'knight' ? c.w / 2 + 34 : c.variant === 'frog' ? c.w / 2 + FROG.tongue : null;
}

/** Seconds a new helper waits after a hit (null = not one of them). */
export function oct22AttackGap(c: Cat): number | null {
  return c.variant === 'knight' ? KNIGHT.every : c.variant === 'frog' ? FROG.every : c.variant === 'ghost' ? GHOST.every : null;
}

/** The Frog moves in hops (but not off the edge of its platform). */
export function frogHop(c: Cat, g: Game) {
  if (c.variant !== 'frog' || !c.onGround || !c.moveX || c.stun > 0) return;
  if (!platformBelow(g, c.x + c.moveX * 110, c.y, 300)) return;
  c.vy = -FROG.hop;
  c.vx = c.moveX * 300;
  c.onGround = false;
}

/** The Ghost floats through everything to the closest enemy and spooks it (it slows down). */
export function updateGhost(c: Cat, dt: number, g: Game) {
  c.thinkT -= dt;
  c.attackT -= dt;
  if (c.thinkT <= 0 || !c.target?.alive) {
    c.thinkT = 0.3 + rand() * 0.2;
    c.target = nearestEnemy(g, c);
  }
  const t = c.target && c.target.alive ? c.target : null;
  // No gravity: it floats.
  c.vy -= g.gravity * dt;
  const tx = t ? t.x : c.owner.x - c.owner.facing * 60;
  const ty = t ? t.cy : c.owner.y - c.owner.h - 30;
  const dx = tx - c.x;
  const dy = ty - c.cy + Math.sin(g.time * 3 + c.id) * 18;
  const d = Math.hypot(dx, dy) || 1;
  const sp = t ? 230 : 160;
  c.vx += ((dx / d) * sp - c.vx) * Math.min(1, 3 * dt);
  c.vy += ((dy / d) * sp - c.vy) * Math.min(1, 3 * dt);
  if (Math.abs(c.vx) > 15) c.facing = sign(c.vx);
  if (c.attackT > 0 || c.stun > 0) return;
  for (const e of g.bodies()) {
    if (!e.alive || e.team === c.team || !e.contains(c.x, c.cy, c.w / 2)) continue;
    g.catBite(c, e);
    if (e.alive) {
      e.slowT = Math.max(e.slowT, GHOST.spookS);
      g.text(e.x, e.y - e.h - 30, 'BOO! 👻', '#eceff1', 22);
    }
    break;
  }
}

// ---------- 3 Lives ----------

export const STOCK_LIVES = 3;

export function startStock(g: Game) {
  for (const f of g.fighters) if (!f.boss) f.lives = STOCK_LIVES;
}

/** 3 Lives: the last one with lives left wins (you're out once your third life is gone). */
export function stockWinner(g: Game): { decided: boolean; team: number | null } {
  const teams = new Set(g.fighters.filter((f) => !f.boss && !f.cloneOf && !f.horde && (f.alive || f.lives > 0)).map((f) => f.team));
  if (teams.size <= 1) return { decided: true, team: teams.size ? [...teams][0] : null };
  return { decided: false, team: null };
}

// ---------- Boss Rush ----------

/** Boss Rush: these bosses one after another, each with this much of its normal HP. */
export const RUSH_BOSSES: BossKind[] = ['boss', 'cat', 'scarecrow', 'buffalo', 'robo', 'elephant'];
export const RUSH = { hpMult: 0.4, heal: 0.4, pause: 2.5, coins: 6000 };

export interface RushState {
  /** Which boss is up now (index in RUSH_BOSSES). */
  i: number;
  /** Seconds until the next boss comes in (0 = one is up). */
  wait: number;
  done: boolean;
}

export function startRush(g: Game, names: Partial<Record<BossKind, string>>) {
  g.rush = { i: -1, wait: 0.01, done: false };
  g.rushNames = names;
}

export function updateRush(g: Game, dt: number) {
  const r = g.rush!;
  if (r.done) return;
  const up = g.fighters.some((f) => f.boss && f.alive);
  if (up) return;
  if (r.wait <= 0) {
    // The boss went down: a short break, a heal, and everyone who went down gets back up.
    if (r.i >= RUSH_BOSSES.length - 1) {
      r.done = true;
      return;
    }
    r.wait = RUSH.pause;
    if (r.i >= 0) {
      g.text(g.map.w / 2, g.map.h * 0.3, '✅ NEXT!', '#69f0ae', 54);
      g.play('win');
    }
    for (const f of g.fighters) {
      if (f.boss || f.horde || f.cloneOf) continue;
      if (!f.alive && r.i >= 0) bringBack(g, f);
      else if (f.alive) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * RUSH.heal);
    }
    return;
  }
  r.wait -= dt;
  if (r.wait > 0) return;
  r.wait = 0;
  r.i++;
  const kind = RUSH_BOSSES[r.i];
  const b = g.addBoss(kind, g.rushNames[kind] ?? kind, 99, 0);
  b.hp = b.maxHp = Math.round(b.maxHp * RUSH.hpMult);
  g.text(g.map.w / 2, g.map.h * 0.3, `👹 ${r.i + 1}/${RUSH_BOSSES.length}`, '#ff8a80', 54);
  g.play('heavy');
}

/** Boss Rush: won after the last boss, lost when nobody on your side is up. */
export function rushWinner(g: Game): { decided: boolean; team: number | null } {
  const r = g.rush!;
  if (r.done) return { decided: true, team: 0 };
  const ours = g.fighters.some((f) => !f.boss && !f.horde && f.alive);
  if (!ours) return { decided: true, team: 99 };
  return { decided: false, team: null };
}
