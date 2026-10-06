import { BotBrain, nearestEnemy, nearestPlatform, updateCat, updateSnowman } from './ai';
import {
  Body,
  Cat,
  Fighter,
  GRAVITY,
  MAX_SNOWMEN,
  SHIELD_MAX,
  Snowman,
  type FloatText,
  type GroundBall,
  type Particle,
  type ProjKind,
  type Projectile,
  type Ring,
  returns,
} from './entities';
import { THEMES, pickSpawns } from './maps';
import { isBossMode, type Difficulty, type FallMode, type MapDef, type Mode } from './types';
import { SHOP_WEAPONS, weapon } from './weapons';
import { sfx } from '../sfx';

export const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00'];
export const BOT_COLORS = ['#ec407a', '#00acc1', '#9ccc65', '#8d6e63', '#78909c', '#5c6bc0'];
export const TEAM_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835'];
export const BOSS_TEAM = 99;
export const SNOWBALL_LIFE = 6;

export interface FighterSpec {
  name: string;
  color: string;
  team: number;
  human: boolean;
  weapon: string;
  difficulty: Difficulty;
  /** 0-5 for humans (which joystick), -1 for bots. */
  playerIndex: number;
}

export interface MatchResult {
  mode: Mode;
  winnerTeam: number | null;
  winners: Fighter[];
  humanWon: boolean;
  hadHumans: boolean;
}

export interface GameOpts {
  mode: Mode;
  fallMode: FallMode;
  bossName?: string;
  /** Menu background: no sound, no results. */
  demo?: boolean;
  /** Snowmen each fighter may have (online rooms use fewer). */
  maxSnowmen?: number;
  /** Host of an online room: remember effects so they can be sent to the other devices. */
  record?: boolean;
  /** Boss Fight: how many bosses (1-3). */
  bosses?: number;
  /** Weapon ids for each boss (online: the host picks them so every device matches). */
  bossWeapons?: string[][];
}

/** Seconds until broken glass comes back. */
export const GLASS_BACK = 10;
/** Lava: damage and how hard it throws you up. */
export const LAVA_DMG = 40;
const LAVA_JUMP = 1250;

/** Grandfather Cat: AI cats it may have at once, and the Treasure's (40% weaker) numbers. */
export const BOSS_CATS = { count: 5, hp: 100, dmg: 10, max: 15 };
export const TREASURE_CATS = { count: 3, hp: 60, dmg: 6, max: 6 };
export const SOUP = { dmg: 20, burn: 10 };
export const TREASURE_SOUP = { dmg: 12, burn: 6 };
const SOUP_BURN_S = 5;

/** Two different random weapons for a boss. */
export function randomBossWeapons(): string[] {
  const pool = [...SHOP_WEAPONS];
  const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  const b = pool[Math.floor(Math.random() * pool.length)];
  return [a.id, b.id];
}

/** Effects and sounds that happened this frame, sent from the host to the other devices. */
export type NetEvent =
  | ['b', number, number, string, number, number]
  | ['t', number, number, string, string, number]
  | ['r', number, number, number, number, string]
  | ['s', string];

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class Game {
  map: MapDef;
  mode: Mode;
  fallMode: FallMode;
  demo: boolean;
  fighters: Fighter[] = [];
  snowmen: Snowman[] = [];
  projectiles: Projectile[] = [];
  groundBalls: GroundBall[] = [];
  particles: Particle[] = [];
  texts: FloatText[] = [];
  rings: Ring[] = [];
  time = 0;
  cam = { x: 0, y: 0, zoom: 1 };
  view = { w: 800, h: 450 };
  shake = 0;
  over = false;
  result: MatchResult | null = null;
  onOver: ((r: MatchResult) => void) | null = null;
  maxSnowmen: number;
  record: boolean;
  events: NetEvent[] = [];
  cats: Cat[] = [];
  /** Gravity on this map (the Space theme has low gravity). */
  gravity: number;
  /** For each platform: seconds until its glass comes back (0 = whole). */
  glassT: number[];
  private endT = -1;
  private camReady = false;

  constructor(map: MapDef, specs: FighterSpec[], opts: GameOpts) {
    this.map = map;
    this.mode = opts.mode;
    this.fallMode = opts.fallMode;
    this.demo = !!opts.demo;
    this.maxSnowmen = opts.maxSnowmen ?? MAX_SNOWMEN;
    this.record = !!opts.record;
    this.glassT = map.platforms.map(() => 0);
    this.gravity = GRAVITY * (THEMES[map.theme]?.gravity ?? 1);
    const spawns = pickSpawns(map, specs.length + (opts.mode === 'boss' ? 1 : 0));
    specs.forEach((s, i) => {
      const sp = spawns[i];
      const f = new Fighter({ name: s.name, color: s.color, team: s.team, human: s.human, weapons: [weapon(s.weapon)], x: sp.x, y: sp.y - 2 });
      f.facing = sp.x < map.w / 2 ? 1 : -1;
      if (!s.human) f.brain = new BotBrain(s.difficulty);
      this.fighters.push(f);
    });
    if (opts.mode === 'boss') {
      // Boss: a giant stickman holding two different random weapons. Up to 3 of them.
      const n = clamp(Math.round(opts.bosses ?? 1), 1, 3);
      const wide = [...map.platforms].filter((p) => p.kind !== 'lava').sort((p, q) => q.w - p.w);
      for (let k = 0; k < n; k++) {
        const ids = opts.bossWeapons?.[k] ?? randomBossWeapons();
        // Each boss on its own wide platform; if there are not enough, spread them on the widest.
        const own = wide[k] && (n === 1 || wide[k].w >= 200) ? wide[k] : null;
        const top = own ?? wide[0];
        const x = top ? (own ? top.x + top.w / 2 : top.x + (top.w * (k + 1)) / (n + 1)) : map.w / 2;
        const boss = new Fighter({
          name: `${opts.bossName ?? 'Boss'}${n > 1 ? ` ${k + 1}` : ''}`,
          color: '#263238',
          team: BOSS_TEAM,
          human: false,
          weapons: ids.map((id) => weapon(id)),
          x,
          y: (top?.y ?? map.h / 2) - 300,
          boss: true,
        });
        boss.brain = new BotBrain('boss');
        this.fighters.push(boss);
      }
    }
    if (opts.mode === 'cat') {
      // Grandfather Cat: 10,000 HP, the soup of gang som and a bell that calls AI cats.
      const top = [...map.platforms].filter((p) => p.kind !== 'lava').sort((p, q) => q.w - p.w)[0];
      const cat = new Fighter({
        name: opts.bossName ?? 'Grandfather Cat',
        color: '#ff9800',
        team: BOSS_TEAM,
        human: false,
        weapons: [weapon('soup'), weapon('catcall')],
        x: top ? top.x + top.w / 2 : map.w / 2,
        y: (top?.y ?? map.h / 2) - 300,
        boss: true,
        cat: true,
      });
      cat.brain = new BotBrain('boss');
      this.fighters.push(cat);
    }
  }

  get bosses(): Fighter[] {
    return this.fighters.filter((f) => f.boss);
  }

  /** Can you stand on platform i? (Broken glass is gone for a while.) */
  solid(i: number) {
    return !(this.glassT[i] > 0);
  }

  bodies(): Body[] {
    return [...this.fighters, ...this.snowmen, ...this.cats];
  }

  get boss(): Fighter | undefined {
    return this.fighters.find((f) => f.boss);
  }

  private play(name: keyof typeof sfx) {
    if (this.record) this.events.push(['s', name]);
    if (!this.demo) sfx[name]();
  }

  /** Joining device: the host runs the match; this only animates effects and the camera between updates. */
  clientTick(dt: number) {
    this.time += dt;
    for (const f of this.fighters) {
      if (!f.alive) continue;
      if (f.onGround) f.walkPhase += f.vx * dt * 0.045;
      const swinging = Math.abs(f.angVel[0]) > 3.5 || f.dashT > 0 || f.thrustT > 0;
      if (swinging) {
        f.trail.push(f.tip(0));
        if (f.trail.length > 7) f.trail.shift();
      } else if (f.trail.length) f.trail.shift();
    }
    for (const p of this.projectiles) {
      if (!returns(p.kind)) p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.updateEffects(dt);
    this.updateCamera(dt);
  }

  /** Replay effects sent by the host. */
  applyEvents(list: NetEvent[]) {
    for (const e of list) {
      if (e[0] === 'b') this.burst(e[1], e[2], e[3], e[4], e[5]);
      else if (e[0] === 't') this.text(e[1], e[2], e[3], e[4], e[5]);
      else if (e[0] === 'r') this.rings.push({ x: e[1], y: e[2], r: 10, maxR: e[3], life: e[4], max: e[4], color: e[5] });
      else if (e[0] === 's' && e[1] in sfx) (sfx as unknown as Record<string, () => void>)[e[1]]();
    }
  }

  private ring(x: number, y: number, maxR: number, life: number, color: string) {
    this.rings.push({ x, y, r: 10, maxR, life, max: life, color });
    if (this.record) this.events.push(['r', Math.round(x), Math.round(y), Math.round(maxR), life, color]);
  }

  /** A player left the room mid-match: a bot takes over their stickman. */
  handToBot(f: Fighter) {
    f.human = false;
    f.brain = new BotBrain('medium');
  }

  update(dt: number) {
    this.time += dt;
    for (const f of this.fighters) if (f.alive) this.updateFighter(f, dt);
    for (const s of this.snowmen) {
      if (!s.alive) continue;
      s.stun -= dt;
      s.hurtFlash -= dt;
      updateSnowman(s, dt, this);
      this.stepBody(s, dt);
    }
    for (const c of this.cats) {
      if (!c.alive) continue;
      c.stun -= dt;
      c.hurtFlash -= dt;
      updateCat(c, dt, this);
      this.stepBody(c, dt);
      if (c.onGround) c.walkPhase += c.vx * dt * 0.06;
    }
    this.meleeHits();
    this.updateProjectiles(dt);
    this.updateGroundBalls(dt);
    this.updateBurns(dt);
    this.updateGlass(dt);
    this.checkOffMap();
    this.snowmen = this.snowmen.filter((s) => s.alive);
    this.cats = this.cats.filter((c) => c.alive);
    this.updateEffects(dt);
    this.checkWin();
    this.updateCamera(dt);
  }

  // ---------- fighters ----------

  private updateFighter(f: Fighter, dt: number) {
    for (let i = 0; i < f.cds.length; i++) if (!f.boomerangOut[i]) f.cds[i] = Math.max(0, f.cds[i] - dt);
    f.stun -= dt;
    f.hurtFlash -= dt;
    f.dashT -= dt;
    f.thrustT -= dt;

    const it = f.human ? f.humanIntent(dt) : f.brain!.think(dt, f, this);

    if (f.shieldBroken && f.shieldHp >= SHIELD_MAX * 0.4) f.shieldBroken = false;
    f.shielding = it.shield && !f.shieldBroken && f.dashT <= 0;
    if (f.shielding) {
      f.shieldHp -= 25 * dt;
      if (f.shieldHp <= 0) this.breakShield(f);
    } else f.shieldHp = Math.min(SHIELD_MAX, f.shieldHp + 45 * dt);

    if (it.jump && !f.shielding && f.stun < 0.15) {
      f.jump();
      if (f.human) this.play('jump');
    }

    if (f.dashT > 0) f.vx = f.dashVx;
    else if (f.stun > 0) f.vx *= Math.max(0, 1 - 1.5 * dt);
    else {
      const target = f.shielding ? 0 : it.moveX * f.speed;
      f.vx += (target - f.vx) * Math.min(1, (f.onGround ? 14 : 6) * dt);
    }
    if (it.moveX && !f.shielding && f.dashT <= 0) f.facing = sign(it.moveX);

    for (let i = 0; i < f.weapons.length; i++) {
      if (f.thrustT > 0 && i === f.thrustSlot) {
        f.angles[i] = f.thrustAngle;
        f.angVel[i] = 0;
        continue;
      }
      const desired = i === 0 ? (it.aim ?? f.restAngle(0)) : it.aim === null ? f.restAngle(1) : f.angles[0] + Math.PI;
      const diff = wrap(desired - f.angles[i]);
      const step = clamp(diff, -f.weapons[i].turn * dt, f.weapons[i].turn * dt);
      f.angles[i] = wrap(f.angles[i] + step);
      f.angVel[i] = step / dt;
    }

    if (it.skill !== null) this.useSkill(f, it.skillSlot, it.skill);

    this.stepBody(f, dt, f.dashT > 0 ? 0.15 : 1);
    // Skills break glass: the sword's dash and the spear's thrust.
    if (f.dashT > 0) f.weapons.forEach((w, i) => w.id === 'sword' && this.breakGlassAt(f.tip(i).x, f.tip(i).y, 14, f));
    if (f.thrustT > 0) this.breakGlassAt(f.tip(f.thrustSlot).x, f.tip(f.thrustSlot).y, 10, f);
    if (f.onGround) f.airJumps = 1;
    if (f.slamming && f.onGround) {
      f.slamming = false;
      this.shockwave(f);
    }
    if (f.onGround) f.walkPhase += f.vx * dt * 0.045;

    const swinging = Math.abs(f.angVel[0]) > 3.5 || f.dashT > 0 || f.thrustT > 0;
    if (swinging) {
      f.trail.push(f.tip(0));
      if (f.trail.length > 7) f.trail.shift();
    } else if (f.trail.length) f.trail.shift();
  }

  stepBody(b: Body, dt: number, gScale = 1) {
    b.vy = Math.min(b.vy + this.gravity * gScale * dt, 2200);
    const prevY = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.onGround = false;
    if (b.vy >= 0) {
      const half = b.w * 0.35;
      let land: number | null = null;
      let lava = false;
      this.map.platforms.forEach((p, i) => {
        if (!this.solid(i)) return;
        if (b.x + half > p.x && b.x - half < p.x + p.w && prevY <= p.y + 2 && b.y >= p.y) {
          if (land === null || p.y < land) {
            land = p.y;
            lava = p.kind === 'lava';
          }
        }
      });
      if (land !== null) {
        b.y = land;
        b.vy = 0;
        b.onGround = true;
        if (lava) this.lavaHit(b);
      }
    }
  }

  /** Landed on lava: it hurts and throws you back up. */
  private lavaHit(b: Body) {
    if (!b.alive) return;
    b.vy = -LAVA_JUMP;
    b.onGround = false;
    b.hp -= LAVA_DMG;
    b.hurtFlash = 0.15;
    if (b instanceof Fighter) b.slamming = false;
    this.text(b.x, b.y - b.h - 10, `-${LAVA_DMG}`, '#ff7043', 26);
    this.burst(b.x, b.y, '#ff6d00', 14, 380);
    this.play('hit');
    if (b.hp <= 0) this.kill(b, null);
  }

  /** A skill hit glass around (x, y): it shatters and comes back after GLASS_BACK seconds. */
  breakGlassAt(x: number, y: number, r: number, by: Body | null) {
    if (!(by instanceof Fighter)) return;
    this.map.platforms.forEach((p, i) => {
      if (p.kind !== 'glass' || !this.solid(i)) return;
      const cx = clamp(x, p.x, p.x + p.w);
      const cy = clamp(y, p.y, p.y + p.h);
      if (Math.hypot(x - cx, y - cy) > r) return;
      this.glassT[i] = GLASS_BACK;
      const n = Math.max(1, Math.round(p.w / 120));
      for (let k = 0; k < n; k++) this.burst(p.x + ((k + 0.5) * p.w) / n, p.y + p.h / 2, '#b3e5fc', 10, 320);
      this.play('glass');
    });
  }

  private updateGlass(dt: number) {
    this.glassT.forEach((t, i) => {
      if (t <= 0) return;
      this.glassT[i] = Math.max(0, t - dt);
      if (this.glassT[i] === 0) {
        const p = this.map.platforms[i];
        this.burst(p.x + p.w / 2, p.y, '#e1f5fe', 8, 160);
      }
    });
  }

  /** On fire (Magic Staff fireball, gang som soup): a little damage every few moments. */
  private updateBurns(dt: number) {
    for (const b of this.bodies()) {
      if (!b.alive || b.burnT <= 0) continue;
      b.burnT -= dt;
      b.burnTick -= dt;
      if (b.burnTick > 0) continue;
      b.burnTick = b.burnEvery;
      b.hp -= b.burnDmg;
      b.hurtFlash = 0.1;
      this.text(b.x + (Math.random() - 0.5) * 20, b.y - b.h - 10, String(b.burnDmg), '#ff9800', 18);
      this.burst(b.x, b.cy, '#ff9800', 4, 160);
      if (b.hp <= 0) this.kill(b, b.burnSrc);
    }
  }

  private breakShield(f: Fighter) {
    f.shieldHp = 0;
    f.shieldBroken = true;
    f.shielding = false;
    f.stun = 0.7;
    this.text(f.x, f.y - f.h - 20, 'BREAK!', '#4fc3f7', 26);
  }

  // ---------- combat ----------

  damage(target: Body, amount: number, src: Body | null, kx: number, ky: number) {
    if (!target.alive || amount <= 0) return;
    amount = Math.round(amount);
    if (target instanceof Fighter && target.shielding) {
      target.shieldHp -= amount;
      target.vx += kx * 0.25;
      this.burst(target.x, target.cy, '#4fc3f7', 6, 200);
      this.play('block');
      if (target.shieldHp <= 0) this.breakShield(target);
      return;
    }
    const heavy = target instanceof Fighter && target.boss;
    if (heavy) {
      kx *= 0.25;
      ky *= 0.25;
    }
    target.hp -= amount;
    target.vx = kx;
    if (ky < 0) {
      target.vy = Math.min(target.vy, ky);
      target.onGround = false;
    }
    target.stun = heavy ? 0.05 : Math.min(0.6, 0.15 + amount / 250);
    target.hurtFlash = 0.15;
    this.text(target.x + (Math.random() - 0.5) * 20, target.y - target.h - 10, String(amount), amount >= 60 ? '#ff5252' : '#ffffff', 18 + Math.min(16, amount / 5));
    this.burst(target.x, target.cy, target.color, 5 + Math.floor(amount / 10), 260);
    this.shake = Math.min(14, this.shake + amount / 30);
    this.play('hit');
    if (target.hp <= 0) this.kill(target, src);
  }

  kill(b: Body, src: Body | null) {
    if (!b.alive) return;
    b.alive = false;
    b.hp = 0;
    this.burst(b.x, b.cy, b.color, 26, 520);
    this.burst(b.x, b.cy, '#ffffff', 10, 380);
    if (b.kind === 'fighter') {
      this.text(b.x, b.y - b.h - 30, 'KO!', '#ffeb3b', 34);
      this.shake = Math.min(18, this.shake + 8);
      this.play('ko');
    }
    const killer = src instanceof Snowman || src instanceof Cat ? src.owner : src;
    if (killer instanceof Fighter && killer !== b && b.kind === 'fighter') killer.kos++;
    if (b instanceof Fighter) for (const p of this.projectiles) if (p.owner === b && returns(p.kind)) p.dead = true;
  }

  private meleeHits() {
    const bodies = this.bodies();
    for (const f of this.fighters) {
      if (!f.alive || f.shielding) continue;
      for (let i = 0; i < f.weapons.length; i++) {
        const def = f.weapons[i];
        // A thrown axe is not in your hand.
        if ((def.id === 'axe' || def.id === 'six7') && f.boomerangOut[i]) continue;
        const speed = Math.abs(f.angVel[i]);
        const dash = f.dashT > 0;
        const thrust = f.thrustT > 0 && i === f.thrustSlot;
        if (speed < 3.5 && !dash && !thrust) continue;
        const dmg = dash ? 60 * f.dmgMult : thrust ? 70 * f.dmgMult : def.damage * f.dmgMult * clamp(speed / 12, 0.5, 1.3);
        const h = f.hand(i);
        const tp = f.tip(i);
        const pts = [0.25, 0.5, 0.75, 1].map((k) => ({ x: h.x + (tp.x - h.x) * k, y: h.y + (tp.y - h.y) * k }));
        for (const e of bodies) {
          if (!e.alive || e.team === f.team) continue;
          if ((f.hitCd.get(e.id) ?? 0) > this.time) continue;
          if (!pts.some((p) => e.contains(p.x, p.y, 4))) continue;
          f.hitCd.set(e.id, this.time + (dash || thrust ? 0.5 : 0.35));
          const dir = sign(e.x - f.x) || f.facing;
          const force = dash || thrust ? 1.4 : 1;
          this.damage(e, dmg, f, dir * (220 + dmg * 8) * force, -(260 + dmg * 5) * force);
        }
      }
    }
  }

  useSkill(f: Fighter, i: number, angle: number) {
    const def = f.weapons[i];
    if (!def || !f.alive || f.cds[i] > 0 || f.boomerangOut[i] || f.stun > 0.3 || f.shielding) return;
    f.cds[i] = def.cooldown;
    const s = f.scale;
    const m = f.dmgMult;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    f.angles[i] = angle;
    const tip = f.tip(i);
    switch (def.id) {
      case 'sword': {
        const dir = Math.abs(cos) < 0.2 ? f.facing : sign(cos);
        f.facing = dir;
        f.dashT = 0.22;
        f.dashVx = dir * 1500;
        f.vy = Math.min(f.vy, sin * 700);
        f.hitCd.clear();
        this.play('throw');
        break;
      }
      case 'spear':
        f.thrustT = 0.35;
        f.thrustAngle = angle;
        f.thrustSlot = i;
        f.hitCd.clear();
        this.play('throw');
        break;
      case 'hammer':
        if (f.onGround) this.shockwave(f);
        else {
          f.slamming = true;
          f.vy = 1800;
        }
        break;
      case 'bow':
        this.spawnProj('arrow', f, tip.x, tip.y, angle, 1500, 350, 45 * m, i);
        break;
      case 'boomerang':
        this.spawnProj('boomerang', f, tip.x, tip.y, angle, 950, 0, 40 * m, i);
        f.boomerangOut[i] = true;
        break;
      case 'bomb':
        this.spawnProj('bomb', f, tip.x, tip.y, angle, 850, 1400, 90 * m, i);
        break;
      case 'katana': {
        const t = nearestEnemy(this, f, 750 * s);
        this.burst(f.x, f.cy, '#212121', 14, 300);
        if (t) {
          const side = t.facing || 1;
          f.x = t.x - side * (t.w / 2 + 34 * s);
          f.y = t.y;
          f.vy = 0;
          f.facing = sign(t.x - f.x) || 1;
          f.hitCd.set(t.id, this.time + 0.5);
          this.damage(t, 80 * m, f, f.facing * 650, -500);
        } else f.x += f.facing * 220;
        this.burst(f.x, f.cy, '#212121', 14, 300);
        this.breakGlassAt(f.x, f.cy, 50 * s, f);
        this.play('throw');
        break;
      }
      case 'snowball':
        this.spawnProj('snowball', f, tip.x, tip.y, angle, 950, 1500, 20 * m, i);
        break;
      case 'axe':
        this.spawnProj('axe', f, tip.x, tip.y, angle, 900, 0, 55 * m, i);
        f.boomerangOut[i] = true;
        break;
      case 'shuriken':
        for (const spread of [-0.16, 0, 0.16]) this.spawnProj('shuriken', f, tip.x, tip.y, angle + spread, 1300, 300, 18 * m, i);
        break;
      case 'laser':
        this.spawnProj('laser', f, tip.x, tip.y, angle, 2600, 0, 38 * m, i);
        this.burst(tip.x, tip.y, '#ff1744', 6, 200);
        break;
      case 'staff':
        this.spawnProj('fireball', f, tip.x, tip.y, angle, 900, 300, 50 * m, i);
        break;
      case 'six7':
        this.spawnProj('six7', f, tip.x, tip.y, angle, 950, 0, 67, i);
        f.boomerangOut[i] = true;
        this.text(f.x, f.y - f.h - 30, '67!', '#ffeb3b', 30);
        break;
      case 'poop':
        this.spawnProj('poop', f, tip.x, tip.y, angle, 850, 1400, 6, i);
        break;
      case 'soup':
        this.throwSoup(f, i, tip.x, tip.y, angle, SOUP.dmg, SOUP.burn);
        break;
      case 'catcall':
        this.callCats(f, BOSS_CATS);
        break;
      case 'treasure':
        // Takes turns: soup, then cats, then soup...
        if (f.nextCats) this.callCats(f, TREASURE_CATS);
        else this.throwSoup(f, i, tip.x, tip.y, angle, TREASURE_SOUP.dmg, TREASURE_SOUP.burn);
        f.nextCats = !f.nextCats;
        break;
    }
  }

  /** Sud Gang Som: throw a splash of yellow gang som soup. */
  private throwSoup(f: Fighter, slot: number, x: number, y: number, angle: number, dmg: number, burn: number) {
    this.spawnProj('soup', f, x, y, angle, 850, 1400, dmg, slot);
    this.projectiles[this.projectiles.length - 1].burnDmg = burn;
  }

  /** Call Cat AI: little cats appear around the caller. */
  private callCats(f: Fighter, o: { count: number; hp: number; dmg: number; max: number }) {
    const have = this.cats.filter((c) => c.alive && c.owner === f).length;
    const n = Math.min(o.count, o.max - have);
    if (n <= 0) {
      this.text(f.x, f.y - f.h - 20, `🐱 ${o.max}/${o.max}`, '#ffffff', 22);
      return;
    }
    for (let k = 0; k < n; k++) {
      const x = f.x + (k - (n - 1) / 2) * 44;
      const c = new Cat(f, x, f.y - 10, o.hp, o.dmg);
      c.vy = -500 - Math.random() * 300;
      c.vx = (k - (n - 1) / 2) * 120;
      this.cats.push(c);
      this.burst(x, f.y - 20, '#ffcc80', 6, 220);
    }
    this.ring(f.x, f.y, 90 * f.scale, 0.4, '#ffb74d');
    this.text(f.x, f.y - f.h - 30, `🐱 ×${n}`, '#ffcc80', 28);
    this.play('snowman');
  }

  /** A cat touched an enemy. */
  catBite(c: Cat, e: Body) {
    c.attackT = 0.8;
    const dir = sign(e.x - c.x) || c.facing;
    this.damage(e, c.touchDmg, c, dir * 260, -220);
  }

  /** Soup lands: a yellow splash that hurts and burns every enemy close by. */
  private splash(p: Projectile) {
    const R = 95 * p.scale;
    this.ring(p.x, p.y, R, 0.35, '#ffeb3b');
    this.burst(p.x, p.y, '#ffeb3b', 22, 420);
    this.burst(p.x, p.y, '#fbc02d', 10, 260);
    this.breakGlassAt(p.x, p.y, R * 0.6, p.owner);
    this.play('hit');
    for (const e of this.bodies()) {
      if (!e.alive || e.team === p.team) continue;
      if (Math.hypot(e.x - p.x, e.cy - p.y) > R + e.w / 2) continue;
      this.damage(e, p.dmg, p.owner, (sign(e.x - p.x) || 1) * 300, -300);
      if (!e.alive) continue;
      // A hair over 5 s so the 5th tick still lands.
      e.burnT = SOUP_BURN_S + 0.05;
      e.burnTick = 1;
      e.burnDmg = p.burnDmg ?? SOUP.burn;
      e.burnEvery = 1;
      e.burnSrc = p.owner;
    }
  }

  spawnProj(kind: ProjKind, owner: Body, x: number, y: number, angle: number, speed: number, g: number, dmg: number, slot: number) {
    const scale = owner instanceof Fighter ? owner.scale : 1;
    const big = kind === 'boomerang' || kind === 'bomb' || kind === 'axe' || kind === 'fireball' || kind === 'six7' || kind === 'soup';
    const r = { arrow: 5, snowball: 11, minisnow: 8, boomerang: 16, bomb: 11, axe: 22, shuriken: 8, laser: 6, fireball: 14, six7: 24, poop: 10, soup: 14 }[kind] * (big ? scale : 1);
    const life = { arrow: 2, snowball: 3, minisnow: 3, boomerang: 3.5, bomb: 1.5, axe: 3.5, shuriken: 2, laser: 0.7, fireball: 2, six7: 3.5, poop: 3, soup: 3 }[kind];
    this.projectiles.push({
      kind,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      owner,
      team: owner.team,
      dmg,
      g,
      life,
      r,
      t: 0,
      scale,
      slot,
      hit: new Set(),
      returning: false,
      dead: false,
    });
    this.play('throw');
  }

  private finishProj(p: Projectile) {
    p.dead = true;
    if (returns(p.kind) && p.owner instanceof Fighter) {
      p.owner.boomerangOut[p.slot] = false;
      p.owner.cds[p.slot] = p.owner.weapons[p.slot].cooldown;
    }
  }

  private updateProjectiles(dt: number) {
    const bodies = this.bodies();
    for (const p of this.projectiles) {
      if (p.dead) {
        this.finishProj(p);
        continue;
      }
      p.t += dt;
      p.life -= dt;
      if (returns(p.kind)) {
        if (!p.returning && p.t > 0.42) {
          p.returning = true;
          p.hit.clear();
        }
        const o = p.owner as Fighter;
        if (p.returning && o.alive) {
          const h = o.hand(p.slot);
          const dx = h.x - p.x;
          const dy = h.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          p.vx = (dx / d) * 1150;
          p.vy = (dy / d) * 1150;
          if (d < 34 * p.scale) {
            this.finishProj(p);
            continue;
          }
        } else if (!p.returning) {
          p.vx *= Math.max(0, 1 - 2.2 * dt);
          p.vy *= Math.max(0, 1 - 2.2 * dt);
        }
      } else p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      for (const e of bodies) {
        if (!e.alive || e.team === p.team || p.hit.has(e.id) || !e.contains(p.x, p.y, p.r)) continue;
        const dir = sign(p.vx) || 1;
        if (p.kind === 'boomerang') {
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, dir * 450, -350);
          continue;
        }
        if (p.kind === 'axe' || p.kind === 'six7') {
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, dir * 600, -450);
          continue;
        }
        if (p.kind === 'laser') {
          // The beam goes through everyone in its way.
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, dir * 380, -220);
          this.burst(p.x, p.y, '#ff1744', 6, 220);
          continue;
        }
        if (p.kind === 'fireball') this.explode(p, 120 * p.scale, true);
        else if (p.kind === 'bomb') this.explode(p);
        else if (p.kind === 'soup') this.splash(p);
        else if (p.kind === 'poop') {
          this.damage(e, p.dmg, p.owner, dir * 220, -200);
          this.burst(p.x, p.y, '#6d4c41', 10, 240);
        } else {
          this.damage(e, p.dmg, p.owner, dir * (p.kind === 'arrow' ? 420 : 300), -260);
          if (p.kind !== 'arrow') this.burst(p.x, p.y, '#ffffff', 8, 220);
        }
        p.dead = true;
        break;
      }
      if (p.dead) {
        this.finishProj(p);
        continue;
      }

      // Thrown snowball meets your own snowball on the ground: build a snowman.
      if (p.kind === 'snowball' && p.owner instanceof Fighter) {
        const gb = this.groundBalls.find((b) => b.owner === p.owner && Math.hypot(b.x - p.x, b.y - 10 - p.y) < p.r + 18);
        if (gb) {
          this.buildSnowman(gb);
          p.dead = true;
          continue;
        }
      }

      if (returns(p.kind)) this.breakGlassAt(p.x, p.y, p.r, p.owner);
      else {
        for (const [pi, pl] of this.map.platforms.entries()) {
          if (!this.solid(pi)) continue;
          if (p.x < pl.x || p.x > pl.x + pl.w || p.y + p.r < pl.y || p.y - p.r > pl.y + pl.h) continue;
          // A skill shot breaks glass. Lasers and bombs keep going; everything else stops.
          if (pl.kind === 'glass' && p.owner instanceof Fighter) {
            this.breakGlassAt(p.x, p.y, p.r, p.owner);
            if (p.kind === 'laser' || p.kind === 'bomb') continue;
            if (p.kind === 'fireball') this.explode(p, 120 * p.scale, true);
            if (p.kind === 'soup') this.splash(p);
            p.dead = true;
            break;
          }
          if (p.kind === 'fireball') {
            this.explode(p, 120 * p.scale, true);
            p.dead = true;
            break;
          }
          if (p.kind === 'soup') {
            this.splash(p);
            p.dead = true;
            break;
          }
          if (p.kind === 'poop') {
            this.burst(p.x, Math.min(p.y, pl.y), '#6d4c41', 8, 200);
            p.dead = true;
            break;
          }
          if (p.kind === 'bomb') {
            if (p.vy > 0) {
              p.y = pl.y - p.r;
              p.vy *= -0.45;
              p.vx *= 0.8;
            } else {
              p.y = pl.y + pl.h + p.r;
              p.vy = Math.abs(p.vy) * 0.3;
            }
          } else if (p.kind === 'snowball' && p.vy > 0 && p.y < pl.y + 14 && p.owner instanceof Fighter) {
            this.groundBalls.push({ x: p.x, y: pl.y, owner: p.owner, team: p.team, life: SNOWBALL_LIFE });
            p.dead = true;
          } else {
            this.burst(p.x, p.y, p.kind === 'arrow' ? '#8d6e63' : '#ffffff', 5, 160);
            p.dead = true;
          }
          break;
        }
      }
      if (p.dead) continue;
      if (p.life <= 0) {
        if (p.kind === 'bomb') this.explode(p);
        if (p.kind === 'fireball') this.explode(p, 120 * p.scale, true);
        if (p.kind === 'soup') this.splash(p);
        this.finishProj(p);
        continue;
      }
      if (p.y > this.map.h + 400 || p.x < -800 || p.x > this.map.w + 800) this.finishProj(p);
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  private buildSnowman(gb: GroundBall) {
    this.groundBalls = this.groundBalls.filter((b) => b !== gb);
    const owner = gb.owner;
    const count = this.snowmen.filter((s) => s.alive && s.owner === owner).length;
    this.burst(gb.x, gb.y - 20, '#ffffff', 16, 300);
    if (count >= this.maxSnowmen) {
      this.text(gb.x, gb.y - 40, `${this.maxSnowmen}/${this.maxSnowmen}`, '#ffffff', 22);
      return;
    }
    this.snowmen.push(new Snowman(owner, gb.x, gb.y));
    this.ring(gb.x, gb.y - 25, 80, 0.4, owner.color);
    this.text(gb.x, gb.y - 70, `☃ ${count + 1}/${this.maxSnowmen}`, owner.color, 22);
    this.play('snowman');
  }

  private updateGroundBalls(dt: number) {
    const bodies = this.bodies();
    for (const gb of this.groundBalls) {
      gb.life -= dt;
      if (gb.life <= 0) continue;
      for (const e of bodies) {
        if (!e.alive || e.team === gb.team || !e.contains(gb.x, gb.y - 10, 12)) continue;
        // Enemy stepped on it: 60 damage and a big fling.
        const dir = sign(e.x - gb.x) || (Math.random() < 0.5 ? -1 : 1);
        this.damage(e, 60, gb.owner, dir * 750, -1050);
        this.burst(gb.x, gb.y - 10, '#ffffff', 14, 320);
        gb.life = 0;
        break;
      }
    }
    this.groundBalls = this.groundBalls.filter((b) => b.life > 0);
  }

  private explode(p: Projectile, R = 170 * p.scale, burn = false) {
    this.ring(p.x, p.y, R, 0.35, '#ff9800');
    this.breakGlassAt(p.x, p.y, R * 0.8, p.owner);
    this.burst(p.x, p.y, '#ff9800', 24, 500);
    this.burst(p.x, p.y, '#424242', 12, 300);
    this.shake = Math.min(18, this.shake + 10);
    this.play('boom');
    for (const e of this.bodies()) {
      if (!e.alive || e.team === p.team) continue;
      const dx = e.x - p.x;
      const dy = e.cy - p.y;
      const d = Math.hypot(dx, dy);
      if (d > R + e.w / 2) continue;
      const k = 1 - Math.min(1, d / (R * 1.3));
      const n = d || 1;
      this.damage(e, p.dmg * (0.4 + 0.6 * k), p.owner, (dx / n) * 900 * (0.4 + k), -700 * (0.5 + k));
      if (burn && e.alive) {
        e.burnT = 2;
        e.burnTick = 0.5;
        e.burnDmg = 8;
        e.burnEvery = 0.5;
        e.burnSrc = p.owner;
      }
    }
  }

  private shockwave(f: Fighter) {
    const R = 230 * f.scale;
    this.ring(f.x, f.y, R, 0.35, '#bcaaa4');
    this.burst(f.x, f.y, '#a1887f', 20, 420);
    this.shake = Math.min(18, this.shake + 12);
    this.play('boom');
    this.breakGlassAt(f.x, f.y, R * 0.6, f);
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - f.x;
      if (Math.abs(dx) > R + e.w / 2 || Math.abs(e.y - f.y) > 140 * f.scale) continue;
      this.damage(e, 80 * f.dmgMult, f, (sign(dx) || 1) * 700, -900);
    }
  }

  // ---------- map edges ----------

  private checkOffMap() {
    const m = this.map;
    for (const b of this.bodies()) {
      if (!b.alive) continue;
      if (b.y < m.h + 300 && b.x > -700 && b.x < m.w + 700) continue;
      if (b instanceof Snowman || b instanceof Cat) this.kill(b, null);
      else if (b instanceof Fighter) {
        if (b.boss) this.bounce(b, 250);
        else if (this.fallMode === 'ko') this.kill(b, null);
        else this.bounce(b, 25);
      }
    }
  }

  /** Fell off: lose HP and get launched back up under the nearest platform. */
  private bounce(f: Fighter, dmg: number) {
    const np = nearestPlatform(this, clamp(f.x, 0, this.map.w), this.map.h);
    const px = np ? clamp(f.x, np.x + 30, np.x + np.w - 30) : this.map.w / 2;
    const py = np ? np.y : this.map.h / 2;
    f.x = px;
    f.y = this.map.h + 200;
    f.vx = 0;
    f.vy = -Math.sqrt(2 * this.gravity * (f.y - py + 170));
    f.stun = 0;
    f.slamming = false;
    f.airJumps = 1;
    f.hp -= dmg;
    this.text(f.x, this.map.h - 40, `-${dmg}`, '#ff5252', 30);
    this.play('jump');
    if (f.hp <= 0) this.kill(f, null);
  }

  // ---------- end of match ----------

  private winnerTeam(): { decided: boolean; team: number | null } {
    const alive = this.fighters.filter((f) => f.alive);
    if (isBossMode(this.mode)) {
      const bosses = this.bosses;
      if (bosses.length && bosses.every((b) => !b.alive)) return { decided: true, team: 0 };
      if (!alive.some((f) => !f.boss)) return { decided: true, team: BOSS_TEAM };
      return { decided: false, team: null };
    }
    const teams = new Set(alive.map((f) => f.team));
    if (teams.size <= 1) return { decided: true, team: teams.size ? [...teams][0] : null };
    return { decided: false, team: null };
  }

  private checkWin() {
    if (this.over) return;
    const w = this.winnerTeam();
    if (!w.decided) {
      this.endT = -1;
      return;
    }
    if (this.endT < 0) this.endT = this.time + 1.6;
    if (this.time < this.endT) return;
    this.over = true;
    const winners = w.team === null ? [] : this.fighters.filter((f) => f.team === w.team && !f.boss);
    this.result = {
      mode: this.mode,
      winnerTeam: w.team,
      winners: w.team === BOSS_TEAM ? this.fighters.filter((f) => f.boss) : winners,
      humanWon: winners.some((f) => f.human) && w.team !== BOSS_TEAM,
      hadHumans: this.fighters.some((f) => f.human),
    };
    if (!this.demo && this.result.humanWon) sfx.win();
    this.onOver?.(this.result);
  }

  // ---------- effects ----------

  burst(x: number, y: number, color: string, n: number, speed: number) {
    if (this.record) this.events.push(['b', Math.round(x), Math.round(y), color, n, speed]);
    if (this.particles.length > 700) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      const life = 0.3 + Math.random() * 0.4;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life, max: life, color, size: 3 + Math.random() * 4, g: 1200 });
    }
  }

  text(x: number, y: number, text: string, color: string, size: number) {
    if (this.record) this.events.push(['t', Math.round(x), Math.round(y), text, color, Math.round(size)]);
    if (this.texts.length > 80) this.texts.shift();
    this.texts.push({ x, y, text, color, life: 0.9, size });
  }

  updateEffects(dt: number) {
    for (const p of this.particles) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 50 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      r.r = r.maxR * (1 - r.life / r.max);
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    this.shake = Math.max(0, this.shake - 40 * dt);
  }

  // ---------- camera ----------

  updateCamera(dt: number) {
    const { w: vw, h: vh } = this.view;
    let list: Body[] = this.fighters.filter((f) => f.alive);
    if (!list.length) list = this.snowmen;
    let minX: number, maxX: number, minY: number, maxY: number;
    if (list.length) {
      minX = Math.min(...list.map((b) => b.x - b.w));
      maxX = Math.max(...list.map((b) => b.x + b.w));
      minY = Math.min(...list.map((b) => b.y - b.h - 40));
      maxY = Math.max(...list.map((b) => b.y + 20));
    } else {
      minX = 0;
      maxX = this.map.w;
      minY = 0;
      maxY = this.map.h;
    }
    const pad = 170;
    const bw = Math.max(maxX - minX + pad * 2, 520);
    const bh = Math.max(maxY - minY + pad * 2, 360);
    const maxZoom = Math.min(1.6, Math.min(vw, vh) / 480);
    const minZoom = Math.min(vw / (this.map.w + 700), vh / (this.map.h + 600));
    const zoom = Math.max(minZoom, Math.min(maxZoom, vw / bw, vh / bh));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    if (!this.camReady) {
      this.cam = { x: cx, y: cy, zoom };
      this.camReady = true;
      return;
    }
    const k = 1 - Math.exp(-4 * dt);
    this.cam.x += (cx - this.cam.x) * k;
    this.cam.y += (cy - this.cam.y) * k;
    this.cam.zoom += (zoom - this.cam.zoom) * (1 - Math.exp(-2.5 * dt));
  }
}
