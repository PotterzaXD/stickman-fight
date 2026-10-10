import type { Controller, Intent, Vec } from './types';
import type { WeaponDef } from './weapons';
import type { BotBrain } from './ai';
import type { Finish } from './finish';

export const GRAVITY = 2400;
export const JUMP_V = 960;
export const SHIELD_MAX = 200;
export const PLAYER_HP = 500;
export const SNOWMAN_HP = 250;
export const BOSS_HP = 5000;
export const MAX_SNOWMEN = 10;
export const CAT_BOSS_HP = 10000;
export const MASCOT_HP = 50000;
export const BUFFALO_HP = 8000;
export const FISH_HP = 9999;

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
  /** Seconds left on fire (Magic Staff fireball). */
  burnT = 0;
  burnTick = 0;
  burnSrc: Body | null = null;
  /** Burn damage and seconds between ticks (fireball: 8 every 0.5 s, gang som soup: 10 every 1 s). */
  burnDmg = 8;
  burnEvery = 0.5;
  /** Seconds left frozen by the Ice Wand (can't move). */
  frozenT = 0;
  /** Poison Dart: seconds left poisoned, 10 damage every second. */
  poisonT = 0;
  poisonTick = 0;
  poisonSrc: Body | null = null;
  abstract readonly kind: 'fighter' | 'snowman' | 'cat';

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
  /** The Grandfather Cat boss. */
  cat?: boolean;
  /** The white Mascot boss from the game icon. */
  mascot?: boolean;
  /** The Buffalo boss (no normal attack: horn charge and head butt). */
  buffalo?: boolean;
  /** The Fishy boss from the Beach. */
  fish?: boolean;
  /** Starting HP (Sandbox), instead of the normal amount. */
  hp?: number;
}

export class Fighter extends Body {
  readonly kind = 'fighter' as const;
  name: string;
  human: boolean;
  boss: boolean;
  /** Grandfather Cat (drawn with cat ears and whiskers). */
  cat: boolean;
  /** The white Mascot boss (no eyes). */
  mascot: boolean;
  buffalo: boolean;
  fish: boolean;
  /** Fire Sword's Inferno Slash: the arm sweeps through the slash. */
  slashT = 0;
  slashAngle = 0;
  slashSlot = 0;
  /** Buffalo's Head Butt: butts left, seconds to the next one, and the head-down picture. */
  buttN = 0;
  buttT = 0;
  buttAnim = 0;
  /** Recall Memory: seconds until the boss ally can be called again. */
  summonCd = 0;
  /** The Fishy boss takes turns: 0 tidal waves, 1 call fish, 2 trident strike. */
  fishNext = 0;
  /** How this stickman was knocked out (the death finisher). */
  finish: Finish = 'pop';
  /** Next slam on landing: damage, radius and finisher (hammer, Mascot stick). */
  slamDmg = 0;
  slamR = 0;
  /** The Grandfather Cat Treasure takes turns: soup, then cats, then soup... */
  nextCats = false;
  scale: number;
  dmgMult: number;
  /** Sandbox: every hit does this much more (1 = normal). */
  power = 1;
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
    const hp = o.hp ?? (o.mascot ? MASCOT_HP : o.cat ? CAT_BOSS_HP : o.buffalo ? BUFFALO_HP : o.fish ? FISH_HP : o.boss ? BOSS_HP : PLAYER_HP);
    // Buffalo walks on four legs: wide and low.
    super(o.x, o.y, o.buffalo ? 190 : 30 * scale, o.buffalo ? 150 : 80 * scale, hp, o.team, o.color);
    this.name = o.name;
    this.human = o.human;
    this.boss = !!o.boss;
    this.cat = !!o.cat;
    this.mascot = !!o.mascot;
    this.buffalo = !!o.buffalo;
    this.fish = !!o.fish;
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
    const thrust = this.thrustT > 0 && i === this.thrustSlot;
    return w.length * this.scale * (thrust && w.id === 'spear' ? 2.4 : thrust && w.id === 'glove' ? 3.2 : thrust && w.id === 'trident' ? 1.8 : 1);
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

/** What a helper looks like: a cat, a fish from the Fishy boss, or the purple boss ally from Recall Memory. */
export type CatVariant = 'cat' | 'fish' | 'memory';
export const CAT_VARIANTS: CatVariant[] = ['cat', 'fish', 'memory'];
/** Recall Memory's boss ally: 1,000 HP, 30 damage, fades away after 20 seconds. */
export const MEMORY_ALLY = { hp: 1000, dmg: 30, life: 20 };

/**
 * A little helper that runs at enemies and hurts them on touch: an AI cat called by Grandfather Cat
 * (or the Treasure), a fish called by the Fishy boss, or the Recall Memory boss ally.
 */
export class Cat extends Body {
  readonly kind = 'cat' as const;
  owner: Fighter;
  touchDmg: number;
  variant: CatVariant;
  /** Seconds left before it fades away (Recall Memory ally). Infinity = stays. */
  life = Infinity;
  thinkT = 0;
  attackT = 0;
  moveX = 0;
  target: Body | null = null;
  walkPhase = 0;

  constructor(owner: Fighter, x: number, y: number, hp: number, touchDmg: number, variant: CatVariant = 'cat') {
    // The boss ally is bigger than a stickman (80) but smaller than the bosses (208).
    super(x, y, variant === 'memory' ? 46 : 34, variant === 'memory' ? 128 : 30, hp, owner.team, owner.color);
    this.owner = owner;
    this.touchDmg = touchDmg;
    this.facing = owner.facing;
    this.variant = variant;
    if (variant === 'memory') this.life = MEMORY_ALLY.life;
  }
}

export type ProjKind =
  | 'arrow'
  | 'snowball'
  | 'minisnow'
  | 'boomerang'
  | 'bomb'
  | 'axe'
  | 'shuriken'
  | 'laser'
  | 'fireball'
  | 'six7'
  | 'poop'
  | 'soup'
  | 'icebolt'
  | 'banana'
  | 'fireslash'
  | 'dart'
  | 'memorybox'
  | 'rocket'
  | 'wave';

/** Thrown weapons that fly out and come back to the hand. */
export const returns = (k: ProjKind) => k === 'boomerang' || k === 'axe' || k === 'six7';

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
  /** Gang som soup: burn damage each second for 5 seconds. */
  burnDmg?: number;
  /** Tidal waves: which way it pushes. */
  dir?: number;
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
