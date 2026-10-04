import type { Controller, Intent, Vec } from './types';
import type { WeaponDef } from './weapons';
import type { BotBrain } from './ai';

export const GRAVITY = 2400;
export const JUMP_V = 960;
export const SHIELD_MAX = 200;
export const PLAYER_HP = 500;
export const SNOWMAN_HP = 250;
export const BOSS_HP = 5000;
export const MAX_SNOWMEN = 10;

let nextId = 1;

export abstract class Body {
  readonly id = nextId++;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  team: number;
  color: string;
  alive = true;
  onGround = false;
  stun = 0;
  facing = 1;
  hurtFlash = 0;
  abstract readonly kind: 'fighter' | 'snowman';

  constructor(x: number, y: number, w: number, h: number, hp: number, team: number, color: string) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.hp = hp;
    this.maxHp = hp;
    this.team = team;
    this.color = color;
  }

  /** Centre of the body (x, y is the feet). */
  get cy() {
    return this.y - this.h / 2;
  }

  /** Is a point inside the body box (with some padding)? */
  contains(px: number, py: number, pad = 0) {
    return px > this.x - this.w / 2 - pad && px < this.x + this.w / 2 + pad && py > this.y - this.h - pad && py < this.y + pad;
  }
}

type Zone = 'none' | 'side' | 'up' | 'down';

export interface FighterOpts {
  name: string;
  color: string;
  team: number;
  human: boolean;
  weapons: WeaponDef[];
  x: number;
  y: number;
  boss?: boolean;
}

export class Fighter extends Body {
  readonly kind = 'fighter' as const;
  name: string;
  human: boolean;
  boss: boolean;
  scale: number;
  dmgMult: number;
  speed: number;
  weapons: WeaponDef[];
  angles: number[];
  angVel: number[];
  cds: number[];
  boomerangOut: boolean[];
  /** Joystick for humans; written by the input layer. */
  ctrl: Controller = { x: 0, y: 0, active: false };
  brain: BotBrain | null = null;

  shielding = false;
  shieldHp = SHIELD_MAX;
  shieldBroken = false;
  airJumps = 1;
  dashT = 0;
  dashVx = 0;
  thrustT = 0;
  thrustAngle = 0;
  thrustSlot = 0;
  slamming = false;
  kos = 0;
  walkPhase = 0;
  /** Next game time this fighter's weapon may hit each body id again. */
  hitCd = new Map<number, number>();
  trail: Vec[] = [];

  private prevActive = false;
  private prevZone: Zone = 'none';
  private dragTime = 0;
  private lastAim = 0;
  private lastZone: Zone = 'none';

  constructor(o: FighterOpts) {
    const scale = o.boss ? 2.6 : 1;
    super(o.x, o.y, 30 * scale, 80 * scale, o.boss ? BOSS_HP : PLAYER_HP, o.team, o.color);
    this.name = o.name;
    this.human = o.human;
    this.boss = !!o.boss;
    this.scale = scale;
    this.dmgMult = o.boss ? 1.5 : 1;
    this.speed = o.boss ? 300 : 380;
    this.weapons = o.weapons;
    this.angles = o.weapons.map((_, i) => (i === 0 ? 0.9 : Math.PI - 0.9));
    this.angVel = o.weapons.map(() => 0);
    this.cds = o.weapons.map(() => 0);
    this.boomerangOut = o.weapons.map(() => false);
  }

  shoulder(): Vec {
    return { x: this.x, y: this.y - 60 * this.scale };
  }

  hand(i: number): Vec {
    const s = this.shoulder();
    const a = this.angles[i];
    const arm = (i === 0 ? 16 : 14) * this.scale;
    return { x: s.x + Math.cos(a) * arm, y: s.y + Math.sin(a) * arm };
  }

  reach(i: number): number {
    const w = this.weapons[i];
    return w.length * this.scale * (this.thrustT > 0 && w.id === 'spear' && i === this.thrustSlot ? 2.4 : 1);
  }

  tip(i: number): Vec {
    const h = this.hand(i);
    const a = this.angles[i];
    const r = this.reach(i);
    return { x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r };
  }

  /**
   * Turn the joystick into actions.
   * Drag sideways: run and aim. Drag up: jump. Drag down: shield. Let go: skill.
   */
  humanIntent(dt: number): Intent {
    const c = this.ctrl;
    const mag = Math.hypot(c.x, c.y);
    let zone: Zone = 'none';
    if (c.active && mag > 0.3) {
      if (c.y > 0.6 && Math.abs(c.x) < 0.75) zone = 'down';
      else if (c.y < -0.6) zone = 'up';
      else zone = 'side';
    }
    const it: Intent = {
      moveX: zone !== 'down' && c.active && Math.abs(c.x) > 0.2 ? Math.max(-1, Math.min(1, c.x * 1.25)) : 0,
      aim: zone !== 'none' && zone !== 'down' ? Math.atan2(c.y, c.x) : null,
      shield: zone === 'down',
      jump: zone === 'up' && this.prevZone !== 'up',
      skill: null,
      skillSlot: 0,
    };
    if (this.prevActive && !c.active && this.dragTime > 0.08 && this.lastZone !== 'down') it.skill = this.lastAim;
    if (c.active) {
      this.dragTime += dt;
      if (zone !== 'none') this.lastZone = zone;
      if (it.aim !== null) this.lastAim = it.aim;
    } else {
      this.dragTime = 0;
      this.lastZone = 'none';
    }
    this.prevActive = c.active;
    this.prevZone = zone;
    return it;
  }

  restAngle(i: number) {
    const a = this.facing > 0 ? 0.9 : Math.PI - 0.9;
    return i === 0 ? a : Math.PI - a;
  }

  jump() {
    if (this.onGround) {
      this.vy = -JUMP_V;
      this.onGround = false;
      this.airJumps = 1;
    } else if (this.airJumps > 0) {
      this.vy = -JUMP_V * 0.9;
      this.airJumps--;
    }
  }
}

export class Snowman extends Body {
  readonly kind = 'snowman' as const;
  owner: Fighter;
  throwT: number;
  thinkT = 0;
  moveX = 0;
  target: Body | null = null;

  constructor(owner: Fighter, x: number, y: number) {
    super(x, y, 34, 58, SNOWMAN_HP, owner.team, owner.color);
    this.owner = owner;
    this.facing = owner.facing;
    this.throwT = 0.8 + Math.random();
  }
}

export type ProjKind = 'arrow' | 'snowball' | 'minisnow' | 'boomerang' | 'bomb';

export interface Projectile {
  kind: ProjKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: Body;
  team: number;
  dmg: number;
  g: number;
  life: number;
  r: number;
  t: number;
  scale: number;
  slot: number;
  hit: Set<number>;
  returning: boolean;
  dead: boolean;
}

export interface GroundBall {
  x: number;
  y: number;
  owner: Fighter;
  team: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  g: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  size: number;
}

export interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  max: number;
  color: string;
}
