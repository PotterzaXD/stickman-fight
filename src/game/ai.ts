import type { Game } from './game';
import { Body, Cat, Fighter, Snowman } from './entities';
import type { Difficulty, Intent, Platform } from './types';

const rand = Math.random;
const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** Closest living enemy. Snowmen count as a bit farther so bots go for stickmen first. */
export function nearestEnemy(g: Game, me: Body, maxD = Infinity): Body | null {
  let best: Body | null = null;
  let bestD = maxD;
  for (const b of g.bodies()) {
    if (!b.alive || b.team === me.team) continue;
    const d = Math.hypot(b.x - me.x, b.cy - me.cy) * (b.kind !== 'fighter' ? 1.3 : 1);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** Ground that is safe to stand on: not lava, not broken glass. */
function safe(g: Game, i: number) {
  return g.solid(i) && g.map.platforms[i].kind !== 'lava';
}

/** First platform under (x, y), within `depth` pixels. */
export function platformBelow(g: Game, x: number, y: number, depth: number): Platform | null {
  let best: Platform | null = null;
  for (const [i, p] of g.map.platforms.entries()) {
    if (!safe(g, i)) continue;
    if (x < p.x || x > p.x + p.w) continue;
    if (p.y < y - 4 || p.y > y + depth) continue;
    if (!best || p.y < best.y) best = p;
  }
  return best;
}

export function nearestPlatform(g: Game, x: number, y: number): Platform | null {
  let best: Platform | null = null;
  let bestD = Infinity;
  for (const [i, p] of g.map.platforms.entries()) {
    if (!safe(g, i)) continue;
    const px = Math.max(p.x + 10, Math.min(p.x + p.w - 10, x));
    const d = Math.abs(px - x) + Math.max(0, p.y - y) * 0.3 + Math.max(0, y - p.y) * 0.6;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Screen-space angle to throw at speed v (gravity g) so it lands on (dx, dy). Low arc when possible. */
export function ballisticAngle(dx: number, dy: number, v: number, g: number): number {
  const X = Math.abs(dx);
  const Y = -dy;
  const v2 = v * v;
  const disc = v2 * v2 - g * (g * X * X + 2 * Y * v2);
  const up = disc < 0 || X < 1 ? Math.PI / 4 : Math.atan((v2 - Math.sqrt(disc)) / (g * X));
  const dir = dx >= 0 ? 1 : -1;
  return Math.atan2(-Math.sin(up), dir * Math.cos(up));
}

interface Params {
  react: number;
  aimErr: number;
  swing: number;
  shieldP: number;
  skillP: number;
  edge: number;
  recover: number;
}

const PARAMS: Record<Difficulty | 'boss', Params> = {
  easy: { react: 0.55, aimErr: 0.4, swing: 4, shieldP: 0.12, skillP: 0.25, edge: 0.55, recover: 0.5 },
  medium: { react: 0.3, aimErr: 0.18, swing: 6, shieldP: 0.3, skillP: 0.5, edge: 0.9, recover: 0.85 },
  hard: { react: 0.12, aimErr: 0.05, swing: 8, shieldP: 0.55, skillP: 0.85, edge: 1, recover: 1 },
  boss: { react: 0.2, aimErr: 0.08, swing: 5, shieldP: 0, skillP: 0.6, edge: 1, recover: 1 },
};

export class BotBrain {
  private p: Params;
  private thinkT = 0;
  private time = rand() * 10;
  private target: Body | null = null;
  private shieldT = 0;
  private careEdge = true;
  private wander = 0;

  constructor(diff: Difficulty | 'boss') {
    this.p = PARAMS[diff];
  }

  think(dt: number, f: Fighter, g: Game): Intent {
    const p = this.p;
    this.time += dt;
    this.thinkT -= dt;
    this.shieldT -= dt;
    const it: Intent = { moveX: 0, aim: null, shield: false, jump: false, skill: null, skillSlot: 0 };
    const fresh = this.thinkT <= 0;
    if (fresh) {
      this.thinkT = p.react * (0.7 + rand() * 0.6);
      this.target = nearestEnemy(g, f);
      this.careEdge = rand() < p.edge;
      if (!f.boss && !f.shieldBroken && this.underThreat(f, g) && rand() < p.shieldP) this.shieldT = 0.3 + rand() * 0.4;
    }

    const t = this.target && this.target.alive ? this.target : null;
    if (!t) {
      // Nobody to fight: stroll around.
      if (fresh && rand() < 0.3) this.wander = rand() < 0.5 ? -1 : 1;
      it.moveX = this.wander * 0.5;
    } else {
      const sh = f.shoulder();
      const dx = t.x - f.x;
      const dy = t.cy - sh.y;
      const dist = Math.hypot(dx, dy);
      const w0 = f.weapons[0];
      const reach = f.reach(0) + 16 * f.scale + t.w / 2;

      if (f.boss) it.moveX = Math.abs(dx) > reach * 0.5 ? sign(dx) : 0;
      else if (w0.ranged) it.moveX = Math.abs(dx) > 520 ? sign(dx) : Math.abs(dx) < 240 ? -sign(dx) : 0;
      else it.moveX = Math.abs(dx) > reach * 0.7 ? sign(dx) : Math.abs(dx) < reach * 0.25 ? -sign(dx) * 0.5 : 0;

      // Target is up on another platform: jump to it.
      if (dy < -110 * f.scale && f.onGround && rand() < dt * 3) it.jump = true;
      // Near the top of the jump and still too low: use the air jump.
      if (dy < -60 * f.scale && !f.onGround && f.airJumps > 0 && f.vy > -150 && f.vy < 200) it.jump = true;

      const base = Math.atan2(dy, dx) + (rand() - 0.5) * p.aimErr;
      it.aim = !w0.ranged && dist < reach * 1.6 ? base + Math.sin(this.time * p.swing) * 1.25 : base;

      if (fresh) this.pickSkill(f, g, dx, dy, dist, it);
    }

    // Don't walk off edges (easy bots sometimes do).
    if (f.onGround && it.moveX !== 0 && this.careEdge) {
      const probe = f.x + sign(it.moveX) * (f.w / 2 + 34);
      if (!platformBelow(g, probe, f.y, 700)) {
        const across = t && Math.abs(t.x - f.x) > 160 && t.y < f.y + 120;
        if (across && rand() < 0.6) it.jump = true;
        else it.moveX = 0;
      }
    }

    // Falling with nothing below: steer back and use the air jump.
    if (!f.onGround && !platformBelow(g, f.x, f.y, 2000)) {
      const np = nearestPlatform(g, f.x, f.y);
      if (np && rand() < p.recover + 0.1) {
        const cx = Math.max(np.x + 30, Math.min(np.x + np.w - 30, f.x));
        it.moveX = sign(cx - f.x);
        if (f.vy > 100 && f.y > np.y - 60 && f.airJumps > 0) it.jump = true;
      }
    }

    if (this.shieldT > 0 && !f.shieldBroken) {
      it.shield = true;
      it.moveX = 0;
    }
    return it;
  }

  private underThreat(f: Fighter, g: Game): boolean {
    for (const pr of g.projectiles) {
      if (pr.team === f.team) continue;
      const dx = f.x - pr.x;
      const dy = f.cy - pr.y;
      if (Math.hypot(dx, dy) < 240 && dx * pr.vx + dy * pr.vy > 0) return true;
    }
    for (const e of g.fighters) {
      if (!e.alive || e.team === f.team) continue;
      const d = Math.hypot(e.x - f.x, e.y - f.y);
      if (d < e.reach(0) + 40 && Math.abs(e.angVel[0]) > 4) return true;
    }
    return false;
  }

  private pickSkill(f: Fighter, g: Game, dx: number, dy: number, dist: number, it: Intent) {
    const p = this.p;
    for (let i = 0; i < f.weapons.length; i++) {
      if (f.cds[i] > 0 || (f.boomerangOut[i] ?? false)) continue;
      if (rand() > p.skillP) continue;
      const s = f.scale;
      const err = (rand() - 0.5) * p.aimErr;
      let angle: number | null = null;
      switch (f.weapons[i].id) {
        case 'sword':
          if (Math.abs(dx) < 380 * s && Math.abs(dy) < 80 * s) angle = dx > 0 ? 0 : Math.PI;
          break;
        case 'spear':
          if (dist < f.weapons[i].length * s * 2.4) angle = Math.atan2(dy, dx);
          break;
        case 'hammer':
          if (dist < 230 * s) angle = Math.PI / 2;
          break;
        case 'bow':
          if (dist < 1100) angle = ballisticAngle(dx, dy, 1500, 350);
          break;
        case 'boomerang':
          if (dist < 520) angle = Math.atan2(dy, dx);
          break;
        case 'bomb':
          if (dist < 700) angle = ballisticAngle(dx, dy, 850, 1400);
          break;
        case 'katana':
          if (dist < 700 * s) angle = Math.atan2(dy, dx);
          break;
        case 'snowball': {
          // Build snowmen: throw at your own snowball on the ground.
          const mine = g.snowmen.filter((m) => m.alive && m.owner === f).length;
          const ball = mine < g.maxSnowmen ? g.groundBalls.find((b) => b.owner === f) : undefined;
          if (ball && rand() < p.skillP * 0.8) {
            const sh = f.shoulder();
            angle = ballisticAngle(ball.x - sh.x, ball.y - 8 - sh.y, 950, 1500);
          } else if (dist < 850) angle = ballisticAngle(dx, dy, 950, 1500);
          break;
        }
        case 'axe':
          if (dist < 480 * s) angle = Math.atan2(dy, dx);
          break;
        case 'shuriken':
          if (dist < 900) angle = ballisticAngle(dx, dy, 1300, 300);
          break;
        case 'laser':
          if (dist < 1500) angle = Math.atan2(dy, dx);
          break;
        case 'staff':
          if (dist < 900) angle = ballisticAngle(dx, dy, 900, 300);
          break;
        case 'six7':
          if (dist < 480 * s) angle = Math.atan2(dy, dx);
          break;
        case 'poop':
          if (dist < 700) angle = ballisticAngle(dx, dy, 850, 1400);
          break;
        case 'soup':
          if (dist < 750 * s) angle = ballisticAngle(dx, dy, 850, 1400);
          break;
        case 'catcall':
          angle = -Math.PI / 2;
          break;
        case 'treasure':
          if (f.nextCats || dist < 750) angle = ballisticAngle(dx, dy, 850, 1400);
          break;
        case 'ice':
          if (dist < 1000) angle = ballisticAngle(dx, dy, 1200, 200);
          break;
        case 'thunder':
          if (dist < 700 * s) angle = Math.atan2(dy, dx);
          break;
        case 'banana':
          if (dist < 700) angle = ballisticAngle(dx, dy, 850, 1400);
          break;
        case 'stick':
          if (dist < 420 * s * 0.5 + 200 && f.onGround) angle = Math.PI / 2;
          break;
        case 'mascotstick':
          if (dist < 230 && f.onGround) angle = Math.PI / 2;
          break;
      }
      if (angle !== null) {
        it.skill = angle + err;
        it.skillSlot = i;
        return;
      }
    }
  }
}

/** Snowmen walk around on their own and lob little snowballs at enemies. */
export function updateSnowman(s: Snowman, dt: number, g: Game) {
  s.thinkT -= dt;
  if (s.thinkT <= 0) {
    s.thinkT = 0.35 + rand() * 0.2;
    s.target = nearestEnemy(g, s);
    const t = s.target;
    s.moveX = 0;
    if (t) {
      const dx = t.x - s.x;
      if (Math.abs(dx) > 330) s.moveX = sign(dx);
      else if (Math.abs(dx) < 150) s.moveX = -sign(dx);
    } else if (rand() < 0.4) s.moveX = rand() < 0.5 ? -0.5 : 0.5;
    if (s.onGround && s.moveX !== 0 && !platformBelow(g, s.x + sign(s.moveX) * 40, s.y, 700)) s.moveX = 0;
  }
  if (!s.onGround && !platformBelow(g, s.x, s.y, 2000)) {
    const np = nearestPlatform(g, s.x, s.y);
    if (np) s.moveX = sign(np.x + np.w / 2 - s.x);
  }
  if (s.stun > 0) s.vx *= Math.max(0, 1 - 2 * dt);
  else s.vx += (s.moveX * 210 - s.vx) * Math.min(1, (s.onGround ? 10 : 4) * dt);
  if (s.moveX) s.facing = sign(s.moveX);

  const t = s.target && s.target.alive ? s.target : null;
  if (t && s.onGround && t.cy < s.cy - 120 && rand() < dt * 1.5) {
    s.vy = -860;
    s.onGround = false;
  }
  s.throwT -= dt;
  if (t && s.throwT <= 0) {
    const dx = t.x - s.x;
    const dy = t.cy - (s.y - s.h + 10);
    if (Math.hypot(dx, dy) < 760) {
      s.throwT = 1.4 + rand() * 0.9;
      s.facing = sign(dx) || s.facing;
      const a = ballisticAngle(dx, dy, 760, 1500) + (rand() - 0.5) * 0.12;
      g.spawnProj('minisnow', s, s.x + s.facing * 14, s.y - s.h + 18, a, 760, 1500, 12, 0);
    }
  }
}

/** AI cats run at the nearest enemy, jump up to reach it, and bite on touch. */
export function updateCat(c: Cat, dt: number, g: Game) {
  c.thinkT -= dt;
  c.attackT -= dt;
  if (c.thinkT <= 0) {
    c.thinkT = 0.25 + rand() * 0.2;
    c.target = nearestEnemy(g, c);
    const t = c.target;
    c.moveX = t ? (Math.abs(t.x - c.x) > 12 ? sign(t.x - c.x) : 0) : rand() < 0.4 ? (rand() < 0.5 ? -0.5 : 0.5) : 0;
    // Don't run off an edge unless the target is across a small gap.
    if (c.onGround && c.moveX !== 0 && !platformBelow(g, c.x + sign(c.moveX) * 30, c.y, 700)) {
      if (t && t.y < c.y + 80 && Math.abs(t.x - c.x) > 120 && rand() < 0.5) {
        c.vy = -900;
        c.onGround = false;
      } else c.moveX = 0;
    }
  }
  if (!c.onGround && !platformBelow(g, c.x, c.y, 2000)) {
    const np = nearestPlatform(g, c.x, c.y);
    if (np) c.moveX = sign(np.x + np.w / 2 - c.x);
  }
  if (c.stun > 0) c.vx *= Math.max(0, 1 - 2 * dt);
  else c.vx += (c.moveX * 330 - c.vx) * Math.min(1, (c.onGround ? 10 : 4) * dt);
  if (c.moveX) c.facing = sign(c.moveX);
  const t = c.target && c.target.alive ? c.target : null;
  if (t && c.onGround && t.cy < c.y - 90 && rand() < dt * 2.5) {
    c.vy = -900;
    c.onGround = false;
  }
  if (c.attackT > 0) return;
  for (const e of g.bodies()) {
    if (!e.alive || e.team === c.team || !e.contains(c.x, c.cy, c.w / 2)) continue;
    g.catBite(c, e);
    break;
  }
}
