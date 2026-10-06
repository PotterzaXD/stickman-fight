import { Cat, Fighter, Snowman, type ProjKind, type Projectile } from '../game/entities';
import type { Game, NetEvent } from '../game/game';

/** One frame of the match as the host sees it, packed into small arrays of numbers. */
export interface Snapshot {
  t: 's';
  tm: number;
  sh: number;
  f: number[][];
  m: number[][];
  p: number[][];
  g: number[][];
  e: NetEvent[];
  /** AI cats: [id, owner, x, y, hp, facing, hurt, maxHp, vx]. */
  c?: number[][];
  /** Broken glass right now: [platform index, seconds until it comes back]. */
  gl?: number[][];
}

const KINDS: ProjKind[] = ['arrow', 'snowball', 'minisnow', 'boomerang', 'bomb', 'axe', 'shuriken', 'laser', 'fireball', 'six7', 'poop', 'soup'];
const r1 = (v: number) => Math.round(v);
const r2 = (v: number) => Math.round(v * 100) / 100;

// Fighter flag bits
const SHIELD = 1,
  STUN = 2,
  HURT = 4,
  DASH = 8,
  THRUST = 16,
  READY0 = 32,
  READY1 = 64,
  BOOM0 = 128,
  BOOM1 = 256,
  THRUST1 = 512,
  BURN = 1024;

function ownerIndex(g: Game, o: unknown): number {
  const f = o instanceof Snowman || o instanceof Cat ? o.owner : o;
  return g.fighters.indexOf(f as Fighter);
}

export function encodeSnapshot(g: Game): Snapshot {
  const snap: Snapshot = {
    t: 's',
    tm: r2(g.time),
    sh: r1(g.shake),
    f: g.fighters.map((f) => {
      let fl = 0;
      if (f.shielding) fl |= SHIELD;
      if (f.stun > 0.25) fl |= STUN;
      if (f.hurtFlash > 0) fl |= HURT;
      if (f.dashT > 0) fl |= DASH;
      if (f.thrustT > 0) fl |= THRUST;
      if (f.thrustSlot === 1) fl |= THRUST1;
      if (f.cds[0] <= 0) fl |= READY0;
      if ((f.cds[1] ?? 1) <= 0) fl |= READY1;
      if (f.boomerangOut[0]) fl |= BOOM0;
      if (f.boomerangOut[1]) fl |= BOOM1;
      if (f.burnT > 0) fl |= BURN;
      return [f.alive ? 1 : 0, r1(f.x), r1(f.y), r1(f.vx), r1(f.vy), r1(f.hp), f.facing, f.onGround ? 1 : 0, fl, r1(f.shieldHp), r2(f.angles[0]), r2(f.angVel[0]), r2(f.angles[1] ?? 0)];
    }),
    m: g.snowmen.map((s) => [s.id, ownerIndex(g, s.owner), r1(s.x), r1(s.y), r1(s.hp), s.facing, s.hurtFlash > 0 ? 1 : 0]),
    p: g.projectiles.map((p) => [KINDS.indexOf(p.kind), r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), ownerIndex(g, p.owner), r2(p.scale), r1(p.r), r1(p.g)]),
    g: g.groundBalls.map((b) => [r1(b.x), r1(b.y), ownerIndex(g, b.owner), r2(b.life)]),
    e: g.events,
    c: g.cats.map((c) => [c.id, ownerIndex(g, c.owner), r1(c.x), r1(c.y), r1(c.hp), c.facing, c.hurtFlash > 0 ? 1 : 0, c.maxHp, r1(c.vx)]),
    gl: g.glassT.flatMap((t, i) => (t > 0 ? [[i, r2(t)]] : [])),
  };
  g.events = [];
  return snap;
}

/** Smooth movement on joining devices: where each body should be heading. */
export class Mirror {
  private target = new Map<object, { x: number; y: number; a0: number; a1: number }>();
  private snowmen = new Map<number, Snowman>();
  private cats = new Map<number, Cat>();

  constructor(private g: Game) {}

  apply(s: Snapshot) {
    const g = this.g;
    g.shake = Math.max(g.shake, s.sh);
    s.f.forEach((a, i) => {
      const f = g.fighters[i];
      if (!f) return;
      const [alive, x, y, vx, vy, hp, facing, ground, fl, shieldHp, a0, av0, a1] = a;
      f.alive = alive === 1;
      f.vx = vx;
      f.vy = vy;
      f.hp = hp;
      f.facing = facing;
      f.onGround = ground === 1;
      f.shielding = !!(fl & SHIELD);
      f.stun = fl & STUN ? 1 : 0;
      if (fl & HURT) f.hurtFlash = 0.12;
      f.dashT = fl & DASH ? 0.1 : 0;
      f.thrustT = fl & THRUST ? 0.1 : 0;
      f.thrustSlot = fl & THRUST1 ? 1 : 0;
      f.cds[0] = fl & READY0 ? 0 : 1;
      if (f.cds.length > 1) f.cds[1] = fl & READY1 ? 0 : 1;
      f.boomerangOut[0] = !!(fl & BOOM0);
      if (f.boomerangOut.length > 1) f.boomerangOut[1] = !!(fl & BOOM1);
      f.burnT = fl & BURN ? 1 : 0;
      f.shieldHp = shieldHp;
      f.angVel[0] = av0;
      const prev = this.target.get(f);
      // Big jumps (katana teleport, bounce back up) snap instead of sliding.
      if (!prev || Math.hypot(x - f.x, y - f.y) > 260) {
        f.x = x;
        f.y = y;
        f.angles[0] = a0;
        if (f.angles.length > 1) f.angles[1] = a1;
      }
      this.target.set(f, { x, y, a0, a1 });
    });

    const seen = new Set<number>();
    const list: Snowman[] = [];
    for (const [id, oi, x, y, hp, facing, hurt] of s.m) {
      seen.add(id);
      let m = this.snowmen.get(id);
      const owner = g.fighters[oi] ?? g.fighters[0];
      if (!m) {
        m = new Snowman(owner, x, y);
        this.snowmen.set(id, m);
      }
      m.hp = hp;
      m.facing = facing;
      if (hurt) m.hurtFlash = 0.12;
      const prev = this.target.get(m);
      if (!prev || Math.hypot(x - m.x, y - m.y) > 260) {
        m.x = x;
        m.y = y;
      }
      this.target.set(m, { x, y, a0: 0, a1: 0 });
      list.push(m);
    }
    for (const [id, m] of [...this.snowmen]) {
      if (seen.has(id)) continue;
      this.snowmen.delete(id);
      this.target.delete(m);
    }
    g.snowmen = list;

    const seenCats = new Set<number>();
    const cats: Cat[] = [];
    for (const [id, oi, x, y, hp, facing, hurt, maxHp, vx] of s.c ?? []) {
      seenCats.add(id);
      let c = this.cats.get(id);
      if (!c) {
        c = new Cat(g.fighters[oi] ?? g.fighters[0], x, y, maxHp, 0);
        this.cats.set(id, c);
      }
      c.hp = hp;
      c.facing = facing;
      c.vx = vx;
      c.onGround = true;
      if (hurt) c.hurtFlash = 0.12;
      const prev = this.target.get(c);
      if (!prev || Math.hypot(x - c.x, y - c.y) > 260) {
        c.x = x;
        c.y = y;
      }
      this.target.set(c, { x, y, a0: 0, a1: 0 });
      cats.push(c);
    }
    for (const [id, c] of [...this.cats]) {
      if (seenCats.has(id)) continue;
      this.cats.delete(id);
      this.target.delete(c);
    }
    g.cats = cats;

    g.projectiles = s.p.map(([k, x, y, vx, vy, oi, scale, r, gr]) => {
      const owner = g.fighters[oi] ?? g.fighters[0];
      const p: Projectile = { kind: KINDS[k], x, y, vx, vy, owner, team: owner.team, dmg: 0, g: gr, life: 1, r, t: 0, scale, slot: 0, hit: new Set(), returning: false, dead: false };
      return p;
    });
    g.groundBalls = s.g.map(([x, y, oi, life]) => {
      const owner = g.fighters[oi] ?? g.fighters[0];
      return { x, y, owner, team: owner.team, life };
    });
    g.glassT = g.map.platforms.map(() => 0);
    for (const [i, t] of s.gl ?? []) if (i in g.glassT) g.glassT[i] = t;
    g.applyEvents(s.e);
  }

  /** Slide bodies toward the last positions from the host. */
  tick(dt: number) {
    const k = Math.min(1, dt * 16);
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    for (const [b, t] of this.target) {
      const body = b as Fighter | Snowman | Cat;
      body.x += (t.x - body.x) * k;
      body.y += (t.y - body.y) * k;
      if (body instanceof Fighter) {
        body.angles[0] = wrap(body.angles[0] + wrap(t.a0 - body.angles[0]) * Math.min(1, dt * 22));
        if (body.angles.length > 1) body.angles[1] = wrap(body.angles[1] + wrap(t.a1 - body.angles[1]) * Math.min(1, dt * 22));
        body.hurtFlash -= dt;
      } else {
        body.hurtFlash -= dt;
        if (body instanceof Cat) body.walkPhase += body.vx * dt * 0.06;
      }
    }
    this.g.clientTick(dt);
  }
}
