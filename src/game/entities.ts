import type { Controller, Intent, SecretKind, Vec, XBossKind } from './types';
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
export const PIGEON_HP = 500000;
/** The October 20 bosses. */
export const XBOSS_HP: Record<XBossKind, number> = { elephant: 12500, scarecrow: 7000, robo: 9000 };
/** The secret bosses. */
export const SECRET_HP: Record<SecretKind, number> = { queen: 12000, tide: 15000, guardian: 18000 };

let nextId = 1;
/** Pistol shots before it reloads. */
export const PISTOL_AMMO = 5;

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
  /** Index of the platform this body stands on (moving platforms carry it along). */
  standOn = -1;
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
  /** Seconds left slowed down (Ice Shard, Root Trap). */
  slowT = 0;
  /** Pie: seconds left knocked flat on the ground (can't move). */
  downT = 0;
  /** Blanket: seconds left asleep under a blanket (a hit wakes them up). */
  sleepT = 0;
  /** Map editor portals: seconds before this body can go through a portal again. */
  warpT = 0;
  /** Bubble Wand: seconds left floating in a bubble (pops for damage at the end). */
  bubbleT = 0;
  bubbleSrc: Body | null = null;
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
  /** One of the secret bosses. */
  secret?: SecretKind;
  /** The giant Pigeon (flies, and KOs with one peck). */
  pigeon?: boolean;
  /** Hat id (or 'none'). */
  hat?: string;
  /** Summoner's Clone: the fighter this bot is a copy of. */
  cloneOf?: Fighter;
  /** The Magical Elephant, the Giant Scarecrow or Robo Stick. */
  xboss?: XBossKind;
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
  secret: SecretKind | null;
  pigeon: boolean;
  /** The Pigeon: what it is doing, the fighter it is going for, and seconds until the next dive. */
  pigeonState: 'hover' | 'dive' | 'up' = 'hover';
  pigeonTarget: Body | null = null;
  pigeonT = 2.5;
  /** Hat id ('none' = no hat). */
  hat: string;
  /** Summoner's Clone: the fighter this bot copies (null = not a clone). */
  cloneOf: Fighter | null;
  /** The October 20 bosses (null = none of them). */
  xboss: XBossKind | null;
  /** The Magical Elephant: what it is doing, seconds left in it, its next move and who it is after. */
  /** PHYLISHIEUS (his phase, 1 or 2; 0 = not him) and how he looks right now (see PHY_POSES). */
  phyl = 0;
  phyPose = 0;
  /** The giant Tome Golem that helps you against PHYLISHIEUS. */
  golem = false;
  elState: 'fly' | 'slam' | 'rise' | 'drop' | 'spray' | 'charge' = 'fly';
  elT = 2.5;
  elMove = 0;
  elTarget: Body | null = null;
  elTick = 0;
  /** The Outbreak: the zombies' hidden leader (never on screen, only owns the zombies). */
  horde = false;
  /** The Outbreak: lives left (going down costs one; at 0 you are out for good). */
  lives = 5;
  /** The Summoner also calls a zombie ally (you beat wave 10 of The Outbreak). */
  zombieAlly = false;
  /** Lollipop's Sugar Rush: seconds left of running faster. */
  sugarT = 0;
  /** Pistol: shots left before it reloads. */
  ammo: number[];
  /** Morning Star's Spin: seconds left spinning, and seconds to the next hit. */
  spinT = 0;
  spinTick = 0;
  /** Stickman Infection: this stickman is a zombie. */
  zombie = false;
  /** Random Events: the weapons from before Weapon Shuffle (given back when it ends). */
  homeWeapons: WeaponDef[] | null = null;
  /** The Tide King's Water Jet: seconds left and where it points. */
  jetT = 0;
  jetAngle = 0;
  jetTick = 0;
  /** The Ancient Guardian's Leaf Storm: seconds left. */
  leafT = 0;
  leafTick = 0;
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
  /** Who hit this stickman last, and when (for the kill feed when they fall off the map). */
  lastHitBy: Fighter | null = null;
  lastHitT = -99;
  /** For achievements: damage taken this match, hits landed in a row (and the best run), alive at 5 minutes. */
  dmgTaken = 0;
  streak = 0;
  bestStreak = 0;
  survived5 = false;
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
    const hp = o.hp ?? (o.xboss ? XBOSS_HP[o.xboss] : o.secret ? SECRET_HP[o.secret] : o.pigeon ? PIGEON_HP : o.mascot ? MASCOT_HP : o.cat ? CAT_BOSS_HP : o.buffalo ? BUFFALO_HP : o.fish ? FISH_HP : o.boss ? BOSS_HP : PLAYER_HP);
    // Buffalo walks on four legs: wide and low. The Pigeon is a big round bird. The Elephant is even bigger.
    const ele = o.xboss === 'elephant';
    super(o.x, o.y, o.buffalo ? 190 : o.pigeon ? 200 : ele ? 230 : 30 * scale, o.buffalo ? 150 : o.pigeon ? 160 : ele ? 170 : 80 * scale, hp, o.team, o.color);
    this.name = o.name;
    this.human = o.human;
    this.boss = !!o.boss;
    this.cat = !!o.cat;
    this.mascot = !!o.mascot;
    this.buffalo = !!o.buffalo;
    this.fish = !!o.fish;
    this.secret = o.secret ?? null;
    this.pigeon = !!o.pigeon;
    this.hat = o.boss ? 'none' : o.hat ?? 'none';
    this.cloneOf = o.cloneOf ?? null;
    this.xboss = o.xboss ?? null;
    this.scale = scale;
    this.dmgMult = o.boss ? 1.5 : 1;
    this.speed = o.boss ? 300 : 380;
    this.weapons = o.weapons;
    this.angles = o.weapons.map((_, i) => (i === 0 ? 0.9 : Math.PI - 0.9));
    this.angVel = o.weapons.map(() => 0);
    this.cds = o.weapons.map(() => 0);
    this.boomerangOut = o.weapons.map(() => false);
    this.ammo = o.weapons.map(() => PISTOL_AMMO);
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

/**
 * What a helper looks like: a cat, a fish from the Fishy boss, the purple boss ally from Recall Memory, a spear soldier,
 * the Snowman and Fire Ally from Stick Brawl, the red guy from WORST Stickman Fighter,
 * chicks and their Chicken, the little pigeon, skeletons and the dog.
 */
export type CatVariant =
  | 'cat' | 'fish' | 'memory' | 'soldier' | 'sbsnow' | 'fireally' | 'redguy' | 'chick' | 'chicken' | 'lilpigeon' | 'skeleton' | 'dog'
  | 'retro' | 'zombie' | 'bee' | 'ninja'
  | ZombieKind
  | 'babyele' | 'drone' | 'penguin'
  | 'knight' | 'frog' | 'ghost'
  | 'ginger' | 'cupcake' | 'chef'
  | 'unicorn' | 'dino' | 'wizard' | 'panda';
/** The Outbreak's zombies (on the zombies' side). */
export type ZombieKind = 'znormal' | 'zshooter' | 'zmini' | 'zbig' | 'zrunner' | 'zexploder' | 'zboss';
export const ZOMBIE_KINDS: ZombieKind[] = ['znormal', 'zshooter', 'zmini', 'zbig', 'zrunner', 'zexploder', 'zboss'];
export const isZombie = (v: CatVariant): v is ZombieKind => (ZOMBIE_KINDS as string[]).includes(v);
/** Append only (online sends the index). */
export const CAT_VARIANTS: CatVariant[] = [
  'cat', 'fish', 'memory', 'soldier', 'sbsnow', 'fireally', 'redguy', 'chick', 'chicken', 'lilpigeon', 'skeleton', 'dog',
  'retro', 'zombie', 'bee', 'ninja', 'znormal', 'zshooter', 'zmini', 'zbig', 'zrunner', 'zexploder', 'zboss',
  'babyele', 'drone', 'penguin',
  'knight', 'frog', 'ghost',
  'ginger', 'cupcake', 'chef',
  'unicorn', 'dino', 'wizard', 'panda',
];
/** Helpers that don't vanish when beaten: they stay where they went down (the red guy frozen, skeletons as bones, the dog asleep) until their weapon or the Summoner brings them back. */
export const REVIVES = (v: CatVariant) => v === 'redguy' || v === 'skeleton' || v === 'dog';
/** A spear soldier (Spear of Bravery, Summoner, Sandbox): 500 HP, like a stickman. */
export const SOLDIER_HP = 500;
/** Recall Memory's boss ally: 1,000 HP, 30 damage, fades away after 20 seconds. */
export const MEMORY_ALLY = { hp: 1000, dmg: 30, life: 20 };
/** Summoner's Stick Brawl allies: the Snowman punches, the Fire Ally throws fireballs (no burning). */
export const SB_ALLY = { hp: 500, punch: 20, fire: 15, fireEvery: 1.3 };
/** Summoner's red guy from WORST Stickman Fighter: 100 HP, bumps for 10 (once a second per enemy). */
export const RED_GUY = { hp: 100, bump: 10, every: 1 };
/** Chicks: 20 HP, 1 damage. */
export const CHICK = { hp: 20, dmg: 1 };
/** The Chicken (half a stickman tall): 200 HP, 15 a peck, guards its chicks and calls 3 more every 3 seconds. */
export const CHICKEN = { hp: 200, dmg: 15, call: 3, every: 3, guard: 380 };
/** Most chicks one fighter can have at once (so the game doesn't freeze). */
export const MAX_CHICKS = 100;
/** One Little Pigeon: 250,000 HP, 10 a peck, about one peck a second. */
export const LIL_PIGEON = { hp: 250000, dmg: 10, every: 1 };
/** Bone: 2 skeletons (99 HP, 20 a hit) and a dog (250 HP, 50 a bite, 8 seconds between bites). */
export const SKELETON = { hp: 99, dmg: 20, count: 2 };
export const DOG = { hp: 250, dmg: 50, every: 8 };
/** The Retro Stickguy from The WORST Stickman Fighter v.2: 400 HP, 39 a knife hit (about one every 1.5 s). */
export const RETRO = { hp: 400, dmg: 39, every: 1.5 };
/** The zombie ally (beat wave 10 of The Outbreak): 100 HP like a normal zombie. */
export const ZOMBIE_ALLY = { hp: 100, dmg: 12 };
/** Bee Hive: bees fly at enemies and sting. Ninja Scroll: ninjas that dash next to enemies. */
export const BEES = { count: 5, hp: 30, dmg: 5, max: 15 };
export const NINJAS = { count: 2, hp: 300, dmg: 25, max: 4 };
/**
 * The October 21 helpers (Summoner and Sandbox): the Baby Elephant (a little Magical Elephant: trunk slap, and it sprays water),
 * the Robo Drone (flies over enemies and zaps them with a laser) and the Penguin (waddles, then belly-slides into enemies).
 */
export const BABY_ELE = { hp: 600, dmg: 25, spray: 8, drops: 4, every: 3 };
export const DRONE = { hp: 150, dmg: 12, every: 1.3, max: 2 };
export const PENGUIN = { hp: 120, dmg: 22, slideEvery: 3, slideS: 1.1 };
/**
 * The October 22 helpers: the Knight (a big armoured stickman with a sword and shield, it blocks half of every hit),
 * the Frog (hops around and whips its long tongue) and the Ghost (floats through everything and spooks enemies so they slow down).
 */
export const KNIGHT = { hp: 700, dmg: 30, speed: 250, every: 1.1 };
export const FROG = { hp: 160, dmg: 20, tongue: 70, every: 1.4, hop: 620 };
export const GHOST = { hp: 220, dmg: 14, spookS: 2, every: 1 };
/**
 * The October 23 helpers (Summoner and Sandbox): the Gingerbread Man (very fast, punches), the Cupcake (hops onto enemies,
 * and its frosting slows them down) and the Chef (a stickman in a chef's hat who keeps away and throws pies).
 */
export const GINGER = { hp: 180, dmg: 18, speed: 430, every: 0.6 };
export const CUPCAKE = { hp: 90, dmg: 12, slowS: 1.5, every: 0.9, hop: 560 };
export const CHEF = { hp: 350, dmg: 15, pie: 22, every: 1.8 };
/**
 * The October 30 helpers: the Unicorn (gallops fast and charges horn first), the little Dino (slow but bites hard),
 * the Wizard (keeps away and shoots magic bolts) and the Panda (rolls into enemies like a ball).
 */
export const UNICORN = { hp: 300, dmg: 26, speed: 400, every: 0.9, chargeEvery: 3 };
export const DINO = { hp: 550, dmg: 36, speed: 260, every: 1.3 };
export const WIZARD = { hp: 300, dmg: 12, bolt: 26, every: 1.6 };
export const PANDA = { hp: 450, dmg: 20, speed: 230, every: 1, rollEvery: 3.5 };
/** The October 22 weapons. Booger: 30 a flick, 30 a throw. Racket: a tennis ball that bounces. Lollipop: Sugar Rush (faster and heals).
 * Scythe: Reap, a big sweep that heals you for half of what it hits. Pillow: Pillow Fight, a burst of feathers that puts everyone close to sleep. */
export const BOOGER = { dmg: 30, speed: 1000, g: 1300 };
export const RACKET = { dmg: 22, speed: 1250, g: 900, bounces: 3 };
export const LOLLIPOP = { heal: 25, s: 5, speed: 1.6 };
export const SCYTHE = { dmg: 50, heal: 0.5 };
export const PILLOW = { dmg: 15, R: 210, sleep: 2 };
/** The Outbreak's zombies: HP, damage and speed. The Zombie Boss gets 1,000 more HP every 10 waves. */
export const ZOMBIES: Record<ZombieKind, { hp: number; dmg: number; speed: number }> = {
  znormal: { hp: 100, dmg: 10, speed: 150 },
  zshooter: { hp: 200, dmg: 12, speed: 130 },
  zmini: { hp: 50, dmg: 6, speed: 270 },
  zbig: { hp: 600, dmg: 35, speed: 105 },
  zrunner: { hp: 80, dmg: 8, speed: 340 },
  zexploder: { hp: 150, dmg: 60, speed: 190 },
  zboss: { hp: 3000, dmg: 50, speed: 125 },
};

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
  /** Spear soldiers: seconds until the spear thrust skill is ready, and seconds left in a thrust. */
  skillCd = 1;
  thrustT = 0;
  /** Fire Ally: seconds until the next fireball. */
  shootT = 1;
  /** Red guy: went down and stays frozen in place (the next Summoner brings it back). */
  frozen = false;
  /** Red guy: next game time it may bump each body id again. */
  bumpCd = new Map<number, number>();
  /** Lord of the Chicks: charging this way (1 or -1) until the edge of the platform. 0 = not charging. */
  chargeDir = 0;
  /** Seconds left in the charge (it also ends if something blocks the way). */
  chargeT = 0;
  /** The Chicken: seconds until it calls more chicks. */
  callT = CHICKEN.every;
  /** The Outbreak at the Castle Gate: seconds left climbing out of the ground, and the ground it climbs out onto. */
  rise = 0;
  riseTo = 0;

  constructor(owner: Fighter, x: number, y: number, hp: number, touchDmg: number, variant: CatVariant = 'cat') {
    // The boss ally is bigger than a stickman (80) but smaller than the bosses (208).
    // Stickman-sized: soldiers and the Stick Brawl allies. The red guy is as small as in WORST Stickman Fighter.
    // Chicks are tiny, the Chicken is half a stickman, the little pigeon is smaller than a stickman.
    // Zombies and ninjas are stickmen too; the mini zombie is small, the big one and the Zombie Boss are huge.
    const stick = variant === 'soldier' || variant === 'sbsnow' || variant === 'fireally' || variant === 'skeleton' || variant === 'ninja' || variant === 'zombie' || variant === 'znormal' || variant === 'zshooter' || variant === 'zrunner' || variant === 'zexploder';
    const [w, h] =
      variant === 'memory' ? [46, 128] : stick ? [30, 80] : variant === 'redguy' ? [16, 43] : variant === 'retro' ? [30, 60] : variant === 'bee' ? [16, 14] : variant === 'zmini' ? [20, 48] : variant === 'zbig' ? [52, 120] : variant === 'zboss' ? [80, 190] : variant === 'babyele' ? [56, 50] : variant === 'drone' ? [34, 18] : variant === 'penguin' ? [28, 40] : variant === 'knight' ? [34, 86] : variant === 'frog' ? [34, 26] : variant === 'ghost' ? [34, 44] : variant === 'ginger' ? [30, 56] : variant === 'cupcake' ? [28, 28] : variant === 'chef' || variant === 'wizard' ? [30, 80] : variant === 'unicorn' ? [52, 48] : variant === 'dino' ? [46, 56] : variant === 'panda' ? [44, 42] : variant === 'chick' ? [16, 16] : variant === 'chicken' ? [38, 42] : variant === 'lilpigeon' ? [28, 32] : variant === 'dog' ? [46, 34] : [34, 30];
    super(x, y, w, h, hp, owner.team, variant === 'sbsnow' ? '#bdeeff' : variant === 'fireally' ? '#ff7a1a' : variant === 'redguy' ? '#f66' : variant === 'skeleton' ? '#eeeeee' : variant === 'retro' ? '#111111' : variant === 'babyele' ? '#b0bec5' : variant === 'penguin' ? '#263238' : variant === 'frog' ? '#66bb6a' : variant === 'ghost' ? '#eceff1' : variant === 'ginger' ? '#b9773a' : variant === 'cupcake' ? '#f48fb1' : variant === 'unicorn' ? '#fafafa' : variant === 'dino' ? '#66bb6a' : variant === 'wizard' ? '#5e35b1' : variant === 'panda' ? '#fafafa' : isZombie(variant) || variant === 'zombie' ? '#7cb342' : owner.color);
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
  | 'wave'
  | 'shard'
  | 'crash'
  | 'vine'
  | 'nerf'
  | 'bullet67'
  | 'water'
  | 'bubble'
  | 'yoyo'
  | 'fishthrow'
  | 'allyfire'
  | 'egg'
  | 'gum'
  | 'crow'
  | 'hay'
  | 'goo'
  | 'sound'
  | 'pebble'
  | 'flame'
  | 'booger'
  | 'tennis'
  | 'pie'
  | 'ketchup'
  | 'popcorn'
  | 'plane'
  | 'slipper'
  | 'balloon'
  | 'plunger'
  | 'frisbee'
  | 'blanket'
  | 'magic';

/** Thrown weapons that fly out and come back to the hand. */
export const returns = (k: ProjKind) => k === 'boomerang' || k === 'axe' || k === 'six7' || k === 'yoyo';

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
  /** It hit someone (a shot that hits nobody breaks a Perfect Aim streak). */
  hitAny?: boolean;
  settled?: boolean;
  /** Tennis ball: bounces left. */
  bounces?: number;
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
