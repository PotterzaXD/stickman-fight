import { BotBrain, nearestEnemy, nearestPlatform, updateCat, updateSnowman } from './ai';
import {
  Body,
  CHICK,
  CHICKEN,
  Cat,
  DOG,
  FISH_HP,
  LIL_PIGEON,
  MAX_CHICKS,
  REVIVES,
  SKELETON,
  Fighter,
  GRAVITY,
  MAX_SNOWMEN,
  MEMORY_ALLY,
  PISTOL_AMMO,
  RED_GUY,
  RETRO,
  BEES,
  NINJAS,
  ZOMBIE_ALLY,
  ZOMBIES,
  BABY_ELE,
  DRONE,
  PENGUIN,
  isZombie,
  SB_ALLY,
  SOLDIER_HP,
  type CatVariant,
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
import { MELEE_FINISH, PROJ_FINISH, helperCorpse, makeCorpse, updateCorpses, type Corpse, type Finish } from './finish';
import { THEMES, pickSpawns } from './maps';
import { HELPER_KINDS, PIGEON_WEAPON, SB_CHICKS, isSbZombie, isXBoss, type OutbreakInfo, type SandboxHelper } from './types';
import { updateElephant, scarecrowSkill, roboSkill, steerCrow } from './bosses';
import { OutbreakState, startOutbreak, outbreakWinner, updateOutbreak, updateRise, updateZombieBosses, zombieBoom } from './outbreak';
import { feedCount, type FeedKind } from './killfeed';
import { HillState, hillWinner, raceKo, raceWinner, startHill, startRace, updateHill, updateRespawns } from './hill';
import { BOOGER, CHEF, CUPCAKE, FROG, GHOST, GINGER, KNIGHT, LOLLIPOP } from './entities';
import { oct23AttackGap, oct23Bit, oct23Hit, oct23Skill, oct23Splat, summonOct23, updateOct23 } from './oct23';
import { infectHit, infectionWinner, startInfection, turnZombie, updateInfection, type InfectionState } from './infection';
import { startEvents, updateEvents, type EventsState } from './events';
import { HELPER_STATS, meleeForce, oct30AttackGap, oct30Hit, oct30Skill, oct30Splat, pierces, summonOct30, updateOct30, wake } from './oct30';
import { helperArmour, oct22AttackGap, oct22Hit, oct22Skill, rushWinner, startRush, startStock, stockWinner, tennisBounce, updateRush, type RushState } from './oct22';
import { Juice, wallPush } from './juice';
import { BEACH_MAP, BEACH_MODES, isBossMode, isSecret, type BossKind, type Difficulty, type FallMode, type MapDef, type Mode, type Platform, type SandboxBoss } from './types';
import { SHOP_WEAPONS, weapon, type WeaponId } from './weapons';
import type { Key } from '../i18n';
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
  /** Sandbox: starting HP and damage in percent. */
  hp?: number;
  power?: number;
  /** Hat id ('none' = no hat). */
  hat?: string;
  /** The Outbreak: lives left (0 = out for good: watches from the side). */
  lives?: number;
  /** The Summoner also calls a zombie ally (beat wave 10 of The Outbreak). */
  zombie?: boolean;
}

export interface MatchResult {
  mode: Mode;
  winnerTeam: number | null;
  winners: Fighter[];
  humanWon: boolean;
  hadHumans: boolean;
  /** The Beach: the Fishy boss was beaten in this match. */
  fish: boolean;
  /** The Outbreak: the wave was cleared. */
  waveCleared?: boolean;
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
  /** Healing potions drop (on KO and from the sky). */
  potions?: boolean;
  /** Names for each kind of boss (in this device's language). */
  bossNames?: Partial<Record<BossKind, string>>;
  /** Sandbox: bosses added to the match. */
  extraBosses?: SandboxBoss[];
  /** Sandbox: helpers added to the match (cats, fish, the Recall Memory boss, spear soldiers). */
  helpers?: SandboxHelper[];
  /** Sandbox: Clones, each the fighter index (player or bot) it copies. */
  clones?: number[];
  /** Sandbox: Free For All, nobody is on anybody's team. */
  ffa?: boolean;
  /** The Outbreak: the wave to fight. */
  outbreak?: OutbreakInfo;
  /** Screen juice (Settings): hit-stop, slow motion and flashes. Default on. */
  juice?: boolean;
}

/** Potions: 25% chance on each KO and every 10 seconds from the sky. Heal 25% of max HP. */
export const POTION_CHANCE = 0.25;
export const POTION_HEAL = 0.25;
const POTION_EVERY = 10;
const POTION_LIFE = 15;

export interface Potion {
  id: number;
  x: number;
  y: number;
  vy: number;
  life: number;
}

/** A banana peel lying on the ground. */
export interface Peel {
  x: number;
  y: number;
  owner: Fighter;
  team: number;
  life: number;
}

/** A bullet's path (only a picture). */
export interface Tracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  color: string;
  w: number;
}

/** A lightning bolt from the Thunder Hammer (only a picture). */
export interface Bolt {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
}

/** The Mascot: touching it hurts, and its stick slam. */
export const MASCOT_TOUCH = 50;
export const MASCOT_SLAM = 299;
export const MASCOT_STICK_SLAM = 120;

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

/** Fire Sword: hits burn 5 a second for 8 s. Inferno Slash: 50, then 10 a second for 10 s. */
export const FIRE_SWORD = { burnS: 8, burn: 5, slash: 50, slashBurnS: 10, slashBurn: 10 };
/** Poison Dart: 15 on hit, then 10 a second for 5 s. */
export const POISON = { hit: 15, dmg: 10, s: 5 };
/** Recall Memory: the boss ally comes back every 21 s; Strike does 50. */
export const RECALL = { summonCd: 21, strike: 50 };
/** Buffalo: Horn Charge and two Head Butts. */
export const BUFFALO = { charge: 120, butt: 90 };
/** The Fishy boss: trident hits, Trident Strike (+ lightning half the time), and the fish it calls. */
export const FISHY = { melee: 30, strike: 99, lightning: 30, fish: { count: 4, hp: 50, dmg: 20, max: 12 } };
/** The Snow Queen: Ice Shard (+ slow) and Blizzard over the whole screen. */
export const QUEEN = { shard: 40, slowS: 2.5, blizzard: 25, blizzardS: 5, warnS: 1.3 };
/** The Tide King: Wave Crash, Water Jet (a beam that hits again and again) and Summon Fish. */
export const TIDE = { crash: 60, jet: 15, jetS: 2.2, jetEvery: 0.22, jetLen: 950, fish: { count: 3, hp: 80, dmg: 20, max: 9 } };
/** The Ancient Guardian: Vine Whip, Root Trap (slow + damage over time) and Leaf Storm. */
export const GUARDIAN = { vine: 50, root: 20, rootS: 3, leaf: 20, leafS: 5, leafR: 320, leafEvery: 0.5 };
/** Slowed fighters move at this much of their speed. */
export const SLOW_SPEED = 0.45;

/** Sniper: one shot, damage by where it hits. 10 s cooldown. */
export const SNIPER = { head: 250, body: 225, legs: 199, range: 2600 };
/** Shotgun: 180 up close (blown to pieces), 90 from far away (cut in half). */
export const SHOTGUN = { close: 180, far: 90, closeR: 140, range: 760, pellets: 7, spread: 0.15 };
/** Pistol: nerf bullets for 10, a second between shots, 3 s to reload after 5 shots. */
export const PISTOL = { dmg: 10, reload: 3 };
/** 67 Gun: one 100 damage bullet every 10 s. */
export const GUN67 = { dmg: 100 };
/**
 * Summoner: 3 cats and 3 fish (weaker than the bosses'), 3 snowmen, the Recall Memory boss, 3 spear soldiers, a Clone,
 * and one each of the Stick Brawl Snowman, the Stick Brawl Fire Ally and the red guy from WORST Stickman Fighter.
 */
/** October 20: the Summoner also calls the Retro Stickguy, bees, ninjas, and (after wave 10 of The Outbreak) a zombie ally. */
/** October 21: and the Baby Elephant, 2 Robo Drones and the Penguin. */
export const SUMMONER = { cats: { count: 3, hp: 60, dmg: 6, max: 6 }, fish: { count: 3, hp: 40, dmg: 12, max: 6 }, snowmen: 3, soldier: { count: 3, hp: SOLDIER_HP, dmg: 20, max: 6 } };
/** Summoner's Clone: a bot copy of you with a random weapon that can't summon. It blows up for 20 when it goes down. */
export const CLONE = { boom: 20, boomR: 170 };
/** Weapons a Clone never gets (they summon helpers). */
const SUMMON_WEAPONS = ['summoner', 'bravery', 'recall', 'snowball', 'catcall', 'chicklord', 'lilpigeon', 'bone', 'beehive', 'ninjascroll'];
/** Lord of the Chicks: chicks that charge with the Chicken. Summoner: chicks it calls. */
export const LORD_CHICKS = 20;
export const SUMMONER_CHICKS = 20;
/** Egg Launcher (a splat), Bubble Gum Blaster (sticky: slows for a while), Golden Drumstick (a bite that heals). */
export const EGG = { dmg: 18 };
export const GUM = { dmg: 12, slowS: 3 };
export const DRUMSTICK = { heal: 30 };
/** Spear of Bravery: 3 spear soldiers (500 HP, the spear at half strength). */
export const BRAVERY = { count: 3, hp: SOLDIER_HP, dmg: 12, max: 6 };
/** Frying Pan: BONK for 40 and seeing stars for 1.5 s. */
export const PAN = { dmg: 40, stun: 1.5 };
/** Water Gun: a spray of 6 drops (6 each) that push hard. */
export const WATER = { drops: 6, dmg: 6, push: 780 };
/** Bubble Wand: float in a bubble for 2 s, then it pops for 30. */
export const BUBBLE = { dmg: 30, float: 2 };
/** The Pigeon: dives at one fighter every 10 s; one peck is a KO, and KO'd fighters stay out. */
export const PIGEON = { diveEvery: 10, diveSpeed: 1150, giveUp: 2.6 };
/** Trumpet: a blast of sound in front of you (pushes hard). Plasma Blade: a spin that hits everyone around you. */
export const TRUMPET = { dmg: 25, range: 380, push: 1000 };
export const PLASMA = { spin: 55 };
/** Guitar: Power Chord, a ring of sound all around you. Baseball Bat: Home Run, a huge hit. Slingshot: pebbles. Flamethrower: a cone of fire that burns. */
export const GUITAR = { chord: 35, R: 260, push: 950, stun: 0.6 };
export const BAT = { homeRun: 45, push: 1500, lift: 1150 };
export const SLING = { dmg: 16 };
export const FLAME = { dmg: 6, flames: 9, burnS: 3, burn: 4 };
/** Bounce pads launch you this fast. Spikes hurt and bounce you up a little. */
export const BOUNCE_V = 1500;
export const SPIKE_DMG = 25;

/** Sandbox: more than this many bots, bosses, helpers and Clones up at once and the music turns into hard rock. */
export const SB_ROCK_AT = 10;
/** Seconds the crowd has to stay small before the old Sandbox music comes back. */
const ROCK_CALM = 4;

/** Damage the normal boss does to the Fishy boss in the Beach cutscene. */
export const CUTSCENE_DMG = 1000;

/** Big words across the screen (cutscene and the Beach). `who` = a fighter index for {name}. */
export interface Caption {
  key: Key;
  who: number;
  t: number;
}

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
  | ['s', string]
  | ['z', number, number, number, number]
  | ['l', number, number, number, number, string, number]
  | ['k', number, number, FeedKind, number, string?, string?]
  /** This fighter went through the Portal. */
  | ['p', number];

/** Ice Cream's ice spike: where it is, seconds until it melts, and its platform (host only). */
export interface IceSpike {
  x: number;
  y: number;
  w: number;
  h: number;
  life: number;
  max: number;
  head: boolean;
  plat: Platform | null;
}

/** One line in the kill feed: fighter indexes (killer -1 = nobody), what happened, which joke. */
export interface FeedItem {
  victim: number;
  killer: number;
  /** The one who went down (vh) or did it (kh) is a helper of that fighter: its kind ('snowman' or a CatVariant). */
  vh?: string;
  kh?: string;
  kind: FeedKind;
  n: number;
  t: number;
}
/** Helpers with their own kill feed lines. */
const HELPER_FEED: Record<string, FeedKind> = { cat: 'meow', chick: 'chick', chicken: 'chicken', fish: 'fish', memory: 'memory', dog: 'dog', skeleton: 'skeleton', lilpigeon: 'lilpigeon', retro: 'retro', zombie: 'zombie', bee: 'bee' };
/** Seconds a kill feed line stays, and how many show at once. */
export const FEED_LIFE = 5;
export const FEED_MAX = 6;
/** Fell off within this many seconds of a hit: the hitter gets the credit. */
const BLAME_S = 5;

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
  /** Ice Cream's ice spikes (online, the joining devices get them from the host to draw). */
  iceSpikes: IceSpike[] = [];
  /** The Portal map: fighters (by index) who went through the portal, and what to do when one does. */
  portalGone = new Set<number>();
  onPortal?: (fighter: number) => void;
  cats: Cat[] = [];
  /** Bodies left behind by death finishers. */
  corpses: Corpse[] = [];
  potions: Potion[] = [];
  peels: Peel[] = [];
  bolts: Bolt[] = [];
  tracers: Tracer[] = [];
  potionsOn: boolean;
  /** The Pigeon: KO'd fighters come back. */
  private potionClock = POTION_EVERY;
  private potionId = 1;
  /** Gravity on this map (the Space theme has low gravity). */
  gravity: number;
  /** For each platform: seconds until its glass comes back (0 = whole). */
  glassT: number[];
  private endT = -1;
  private camReady = false;
  /** The Beach: the Fishy boss is in this match. */
  beach = false;
  fish: Fighter | null = null;
  /** Free For All / Teams on the Beach: everyone fights the Fishy boss first. */
  fishPhase = false;
  fishBeaten = false;
  private homeTeams = new Map<Fighter, number>();
  /** Boss Fight on the Beach: the Fishy boss takes out the bosses before the fight starts. */
  cut: { t: number; hits: number; nextHit: number; called: number; strikeAt: number; endAt: number; ticks: number; nextTick: number } | null = null;
  private cutMain: Fighter | null = null;
  private cutOthers: Fighter[] = [];
  private cutMove = new Map<Fighter, number>();
  caption: Caption | null = null;
  feed: FeedItem[] = [];
  /** The Snow Queen's Blizzard: warning seconds left, then seconds of storm left. */
  blizzard: { warn: number; t: number; tick: number; owner: Fighter | null } | null = null;
  /** Where each platform starts (moving platforms slide away from here and back). */
  private platBase: { x: number; y: number }[];
  private lastFeed = new Map<string, number>();
  /** The Outbreak: the wave going on (null in other modes). */
  ob: OutbreakState | null = null;
  /** Fighters whose Clone somebody knocked out (Get Tricked). */
  tricked = new Set<Fighter>();
  /** King of the Hill: the zone and everyone's time in it (null in other modes). */
  hill: HillState | null = null;
  /** Weapon Race: how far up the weapon ladder each fighter is (null in other modes). */
  race: Map<Fighter, number> | null = null;
  /** King of the Hill and Weapon Race: seconds until each KO'd fighter comes back. */
  respawn = new Map<Fighter, number>();
  /** Sandbox: it's crowded, so the music is hard rock. */
  rock = false;
  private calmT = 0;
  /** Boss Rush: which boss is up (null in other modes), and the bosses' names in this device's language. */
  rush: RushState | null = null;
  rushNames: Partial<Record<BossKind, string>> = {};
  /** Screen juice: hit-stop, slow motion, flashes and camera kicks (only on this device). */
  juice = new Juice();
  /** Stickman Infection: the round's clock and who was which colour (null in other modes). */
  inf: InfectionState | null = null;
  /** Random Events: the event going on, rising lava and things falling from the sky (null in other modes). */
  ev: EventsState | null = null;
  /** The fighters this device plays (Stickman Infection's big town: the camera follows them). */
  focus: number[] = [];

  constructor(map: MapDef, specs: FighterSpec[], opts: GameOpts) {
    // Each match gets its own copy of the platforms: moving platforms change their copy.
    this.map = { ...map, platforms: map.platforms.map((p) => ({ ...p })) };
    this.platBase = map.platforms.map((p) => ({ x: p.x, y: p.y }));
    map = this.map;
    this.mode = opts.mode;
    this.fallMode = opts.fallMode;
    this.demo = !!opts.demo;
    this.maxSnowmen = opts.maxSnowmen ?? MAX_SNOWMEN;
    this.record = !!opts.record;
    this.glassT = map.platforms.map(() => 0);
    this.gravity = GRAVITY * (THEMES[map.theme]?.gravity ?? 1);
    this.potionsOn = !!opts.potions && !opts.demo;
    const spawns = pickSpawns(map, specs.length + (opts.mode === 'boss' ? 1 : 0));
    specs.forEach((s, i) => {
      const sp = spawns[i];
      // The Pigeon: everyone holds a shotgun.
      const wid = opts.mode === 'pigeon' ? PIGEON_WEAPON : s.weapon;
      const f = new Fighter({ name: s.name, color: s.color, team: s.team, human: s.human, weapons: [weapon(wid)], x: sp.x, y: sp.y - 2, hp: s.hp, hat: s.hat });
      if (s.power) f.power = s.power / 100;
      f.zombieAlly = !!s.zombie;
      // The Outbreak: out of lives = out for good (they watch the rest).
      if (s.lives !== undefined) {
        f.lives = s.lives;
        if (s.lives <= 0) {
          f.alive = false;
          f.hp = 0;
        }
      }
      f.facing = sp.x < map.w / 2 ? 1 : -1;
      if (!s.human) f.brain = new BotBrain(s.difficulty);
      this.fighters.push(f);
    });
    this.beach = map.id === BEACH_MAP && BEACH_MODES.includes(this.mode) && !this.demo;
    if (opts.mode === 'boss') {
      // Boss: a giant stickman holding two different random weapons. Up to 3 of them.
      // On the Beach they are on your side (the Fishy boss beats them in the cutscene).
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
          team: this.beach ? 0 : BOSS_TEAM,
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
    if (opts.mode === 'mascot') {
      // The Mascot from the game icon: all white, a white stick, 50,000 HP.
      const top = [...map.platforms].filter((p) => p.kind !== 'lava').sort((p, q) => q.w - p.w)[0];
      const m = new Fighter({
        name: opts.bossName ?? 'Mascot',
        color: '#ffffff',
        team: BOSS_TEAM,
        human: false,
        weapons: [weapon('stick')],
        x: top ? top.x + top.w / 2 : map.w / 2,
        y: (top?.y ?? map.h / 2) - 300,
        boss: true,
        mascot: true,
      });
      m.brain = new BotBrain('boss');
      this.fighters.push(m);
    }
    const names = opts.bossNames ?? {};
    if (opts.mode === 'buffalo') this.addBoss('buffalo', names.buffalo ?? opts.bossName ?? 'Buffalo', BOSS_TEAM, 0);
    if (isSecret(opts.mode)) this.addBoss(opts.mode, names[opts.mode] ?? opts.bossName ?? 'Boss', BOSS_TEAM, 0);
    if (opts.mode === 'pigeon') this.addBoss('pigeon', names.pigeon ?? opts.bossName ?? 'Pigeon', BOSS_TEAM, 0);
    if (isXBoss(opts.mode)) this.addBoss(opts.mode, names[opts.mode] ?? opts.bossName ?? 'Boss', BOSS_TEAM, 0);
    // Sandbox: any bosses, on any team, with any HP. Free For All: everyone on their own team.
    (opts.extraBosses ?? []).forEach((b, k) => {
      const f = this.addBoss(b.kind, names[b.kind] ?? b.kind, opts.ffa ? 100 + k : b.team, k, b.hp);
      if (b.power) f.power = b.power / 100;
    });
    this.addHelpers(opts.helpers ?? [], !!opts.ffa);
    // Sandbox: Clones of the chosen players and bots.
    for (const i of opts.clones ?? []) {
      const of = this.fighters[i];
      if (!of || i >= specs.length) continue;
      this.summonClone(of, true);
      // Same HP and power as the one it copies.
      const c = this.fighters[this.fighters.length - 1];
      if (c.cloneOf === of) {
        c.hp = c.maxHp = of.maxHp;
        c.power = of.power;
        if (opts.ffa) c.team = 300 + this.fighters.length;
      }
    }
    // The Outbreak: the zombies' hidden leader, the zombie allies, and the first zombies.
    if (opts.outbreak && opts.mode === 'outbreak' && !opts.demo) startOutbreak(this, opts.outbreak, opts.bossName ?? 'Zombies');
    if (this.beach) {
      this.fish = this.addBoss('fish', names.fish ?? 'Fishy', BOSS_TEAM, 0);
      if (this.mode === 'boss') {
        // Stand away from the boss so it has to walk over (it spawned in the middle of the sand).
        const sand = this.map.platforms[0];
        this.fish.x = sand.x + sand.w * 0.85;
        this.fish.y = sand.y;
        this.startCutscene();
      }
      else this.startFishPhase();
    }
    if (this.mode === 'hill') startHill(this);
    if (this.mode === 'race') startRace(this);
    if (this.mode === 'stock') startStock(this);
    if (this.mode === 'rush' && !this.demo) startRush(this, names);
    if (this.mode === 'infection') startInfection(this);
    if (this.mode === 'events') startEvents(this);
    this.juice.on = !this.demo && opts.juice !== false;
    // Sandbox: crowded from the start, so the rock music starts right away.
    if (this.mode === 'sandbox' && !this.demo && this.crowd() > SB_ROCK_AT) {
      this.rock = true;
      this.calmT = ROCK_CALM;
    }
  }

  /** Put a boss on the k-th widest platform (Buffalo, the Fishy boss, and Sandbox bosses). */
  addBoss(kind: BossKind, name: string, team: number, k: number, hp?: number): Fighter {
    const wide = [...this.map.platforms].filter((p) => p.kind !== 'lava' && p.kind !== 'spikes').sort((p, q) => q.w - p.w);
    const top = wide.length ? wide[k % wide.length] : null;
    const weapons =
      kind === 'cat'
        ? ['soup', 'catcall']
        : kind === 'mascot'
        ? ['stick']
        : kind === 'buffalo'
        ? ['horns', 'headbutt']
        : kind === 'fish'
        ? ['trident']
        : kind === 'queen'
        ? ['scepter']
        : kind === 'tide'
        ? ['kingtrident']
        : kind === 'guardian'
        ? ['vinestaff']
        : kind === 'pigeon'
        ? ['beak']
        : kind === 'elephant'
        ? ['trunk']
        : kind === 'scarecrow'
        ? ['pitchfork']
        : kind === 'robo'
        ? ['robocannon']
        : randomBossWeapons();
    const color = {
      boss: '#263238', cat: '#ff9800', mascot: '#ffffff', buffalo: '#5d4037', fish: '#1e88e5', pigeon: '#90a4ae', queen: '#81d4fa', tide: '#0277bd', guardian: '#558b2f',
      elephant: '#9aa0a6', scarecrow: '#c49a5a', robo: '#78909c',
    }[kind];
    const f = new Fighter({
      name,
      color,
      team,
      human: false,
      weapons: weapons.map((id) => weapon(id)),
      x: top ? top.x + top.w / 2 + (k >= wide.length ? 60 : 0) : this.map.w / 2,
      y: (top?.y ?? this.map.h / 2) - 300,
      boss: true,
      cat: kind === 'cat',
      mascot: kind === 'mascot',
      buffalo: kind === 'buffalo',
      fish: kind === 'fish',
      secret: isSecret(kind) ? kind : undefined,
      pigeon: kind === 'pigeon',
      xboss: isXBoss(kind) ? kind : undefined,
      hp,
    });
    // The Pigeon and the Elephant fly in from above.
    if (f.pigeon || f.xboss === 'elephant') f.y -= 250;
    f.brain = new BotBrain('boss');
    this.fighters.push(f);
    return f;
  }

  /** Sandbox: helpers on any team (they fight for the first fighter on their team). */
  private addHelpers(list: SandboxHelper[], ffa: boolean) {
    if (!list.length || !this.fighters.length) return;
    const spots = pickSpawns(this.map, Math.min(24, list.length));
    list.forEach((hp, k) => {
      if (!HELPER_KINDS.includes(hp.kind as never) && !isSbZombie(hp.kind)) return;
      // Free For All: each helper is on its own (it still counts as the first fighter's for the kill feed).
      const team = ffa ? 200 + k : hp.team;
      const owner = ffa ? this.fighters[0] : this.fighters.find((f) => f.team === hp.team && !f.boss) ?? this.fighters.find((f) => f.team === hp.team) ?? this.fighters[0];
      const sp = spots[k % spots.length];
      const x = sp.x + (k >= spots.length ? 30 : 0);
      const color = ffa ? '#9e9e9e' : TEAM_COLORS[hp.team] ?? owner.color;
      if (hp.kind === 'snowman') {
        const m = new Snowman(owner, x, sp.y - 4);
        m.team = team;
        m.color = color;
        this.snowmen.push(m);
        return;
      }
      const o =
        isSbZombie(hp.kind) ? ZOMBIES[hp.kind]
        : hp.kind === 'babyele' ? BABY_ELE
        : hp.kind === 'drone' ? DRONE
        : hp.kind === 'penguin' ? PENGUIN
        : hp.kind === 'knight' ? KNIGHT
        : hp.kind === 'frog' ? FROG
        : hp.kind === 'ghost' ? GHOST
        : hp.kind === 'ginger' ? GINGER
        : hp.kind === 'cupcake' ? CUPCAKE
        : hp.kind === 'chef' ? CHEF
        : HELPER_STATS[hp.kind as CatVariant] ? { hp: HELPER_STATS[hp.kind as CatVariant]![0], dmg: HELPER_STATS[hp.kind as CatVariant]![1] }
        : hp.kind === 'cat' ? BOSS_CATS
        : hp.kind === 'fish' ? FISHY.fish
        : hp.kind === 'memory' ? MEMORY_ALLY
        : hp.kind === 'sbsnow' ? { hp: SB_ALLY.hp, dmg: SB_ALLY.punch }
        : hp.kind === 'fireally' ? { hp: SB_ALLY.hp, dmg: SB_ALLY.fire }
        : hp.kind === 'redguy' ? { hp: RED_GUY.hp, dmg: RED_GUY.bump }
        : hp.kind === 'chicken' ? CHICKEN
        : hp.kind === 'chick' ? CHICK
        : hp.kind === 'lilpigeon' ? LIL_PIGEON
        : hp.kind === 'skeleton' ? SKELETON
        : hp.kind === 'dog' ? DOG
        : hp.kind === 'retro' ? RETRO
        : hp.kind === 'bee' ? BEES
        : hp.kind === 'ninja' ? NINJAS
        : hp.kind === 'zombie' ? ZOMBIE_ALLY
        : { hp: SOLDIER_HP, dmg: SUMMONER.soldier.dmg };
      // A chick slot is 10 chicks (still at most MAX_CHICKS for each fighter).
      let n = 1;
      if (hp.kind === 'chick') n = Math.min(SB_CHICKS, MAX_CHICKS - this.cats.filter((c) => c.variant === 'chick' && c.owner === owner).length);
      for (let j = 0; j < n; j++) {
        const c = new Cat(owner, x + (n > 1 ? (j - (n - 1) / 2) * 12 : 0), sp.y - (hp.kind === 'drone' || hp.kind === 'ghost' ? 120 : 4), o.hp, o.dmg, hp.kind);
        // Sandbox helpers stay until they are beaten.
        c.life = Infinity;
        c.team = team;
        // The red guy, the Retro Stickguy, zombies and the Stick Brawl allies keep their own colours.
        c.color = hp.kind === 'redguy' || hp.kind === 'sbsnow' || hp.kind === 'fireally' || hp.kind === 'retro' || hp.kind === 'zombie' || hp.kind === 'babyele' || hp.kind === 'penguin' || hp.kind === 'frog' || hp.kind === 'ghost' || isZombie(hp.kind) ? c.color : color;
        this.cats.push(c);
      }
    });
  }

  // ---------- the Beach ----------

  /** Free For All / Teams on the Beach: everybody is on one side until the Fishy boss goes down. */
  private startFishPhase() {
    this.fishPhase = true;
    for (const f of this.fighters) {
      if (f.boss) continue;
      this.homeTeams.set(f, f.team);
      f.team = 0;
    }
    this.say('capFishPhase', -1, 3.5);
  }

  private endFishPhase() {
    this.fishPhase = false;
    for (const [f, team] of this.homeTeams) f.team = team;
    // Snowmen, helpers, snowballs and peels go back to their owner's side.
    for (const s of this.snowmen) s.team = s.owner.team;
    for (const c of this.cats) if (!c.owner.boss) c.team = c.owner.team;
    for (const b of this.groundBalls) b.team = b.owner.team;
    for (const p of this.peels) p.team = p.owner.team;
    this.say(this.mode === 'team' ? 'capBackTeams' : 'capBackFfa', -1, 3);
    this.play('ko');
  }

  say(key: Key, who: number, t: number) {
    this.caption = { key, who, t };
  }

  /** Boss Fight on the Beach: the normal boss hits the Fishy boss for 1,000, then gets beaten. */
  private startCutscene() {
    const allies = this.fighters.filter((f) => f.boss && !f.fish);
    this.cutMain = allies[0] ?? null;
    this.cutOthers = allies.slice(1);
    this.cut = { t: 0, hits: 0, nextHit: 0, called: -1, strikeAt: -1, endAt: -1, ticks: 0, nextTick: 0 };
    this.say('capFishAppears', -1, 2.2);
  }

  private updateCutscene(dt: number) {
    const c = this.cut!;
    const fish = this.fish!;
    const main = this.cutMain;
    c.t += dt;
    this.cutMove.clear();
    if (main && main.alive && c.hits < 5) {
      // The boss walks up to the Fishy boss and hits it 5 times for 200 each.
      const dx = fish.x - main.x;
      main.facing = sign(dx) || 1;
      fish.facing = -main.facing;
      const close = Math.abs(dx) < (main.w + fish.w) / 2 + 90;
      if (!close && c.t > 1) this.cutMove.set(main, sign(dx));
      if (c.t > 1 && c.hits === 0 && c.nextHit === 0) this.say('capBossAttacks', this.fighters.indexOf(main), 2.2);
      if ((close || c.t > 4.5) && c.t > 1.4 && c.t >= c.nextHit) {
        c.nextHit = c.t + 0.45;
        c.hits++;
        main.slashT = 0.3;
        main.slashAngle = main.facing > 0 ? 0 : Math.PI;
        main.slashSlot = 0;
        this.damage(fish, CUTSCENE_DMG / 5, main, main.facing * 200, -100);
        if (c.hits === 5) c.called = c.t + 0.8;
      }
      return;
    }
    if (c.called > 0 && c.t >= c.called && c.strikeAt < 0) {
      if (this.cutOthers.some((b) => b.alive)) {
        // The Fishy boss calls fish to take out the other bosses.
        this.say('capCallFish', -1, 2.2);
        for (const b of this.cutOthers) {
          for (let k = 0; k < 6; k++) {
            const x = b.x + (k - 2.5) * 34;
            const m = new Cat(fish, x, b.y - b.h * 0.6, FISHY.fish.hp, FISHY.fish.dmg, 'fish');
            m.vy = -300 - Math.random() * 300;
            this.cats.push(m);
            this.burst(x, b.y - 40, '#4fc3f7', 6, 220);
          }
        }
        this.ring(fish.x, fish.y, 90 * fish.scale, 0.4, '#4fc3f7');
        this.play('snowman');
        c.nextTick = c.t + 0.6;
        c.strikeAt = c.t + 3.2;
      } else c.strikeAt = c.t;
      return;
    }
    if (c.strikeAt > 0 && c.endAt < 0) {
      // The fish bite the other bosses until they go down.
      if (c.t >= c.nextTick && c.ticks < 8) {
        c.nextTick = c.t + 0.3;
        c.ticks++;
        for (const b of this.cutOthers) {
          if (!b.alive) continue;
          const biter = this.cats.find((m) => m.alive && m.variant === 'fish' && Math.abs(m.x - b.x) < 300);
          const dmg = c.ticks >= 8 ? b.hp : Math.ceil(b.maxHp / 8);
          if (biter) biter.attackT = 0.8;
          this.damage(b, dmg, biter ?? fish, 0, -100, 'trip');
        }
      }
      if (c.t >= c.strikeAt) {
        // Trident Strike with lightning: the normal boss is beaten too.
        if (main && main.alive) {
          this.say('capTrident', -1, 2.2);
          fish.thrustT = 0.4;
          fish.thrustSlot = 0;
          fish.thrustAngle = Math.atan2(main.cy - fish.shoulder().y, main.x - fish.x);
          this.lightning(main);
          this.damage(main, main.hp, fish, sign(main.x - fish.x) * 600, -700, 'zap');
        }
        c.endAt = c.t + 1.6;
      }
      return;
    }
    if (c.endAt > 0 && c.t >= c.endAt) {
      // The fish swim away, the Fishy boss is left with 8,999 HP, and the real fight starts.
      for (const m of this.cats) {
        if (m.owner !== fish) continue;
        m.alive = false;
        this.burst(m.x, m.cy, '#4fc3f7', 8, 260);
      }
      fish.hp = FISH_HP - CUTSCENE_DMG;
      // A moment to get ready before its first skill.
      fish.cds[0] = 2.5;
      this.cut = null;
      this.say('capFight', -1, 1.8);
      this.play('ko');
    }
  }

  /** A lightning bolt from the sky onto a body (picture only). */
  private lightning(t: Body) {
    const top = Math.min(t.y - 700, this.cam.y - 600);
    this.bolts.push({ x1: t.x, y1: top, x2: t.x, y2: t.cy, life: 0.3 });
    if (this.record) this.events.push(['z', Math.round(t.x), Math.round(top), Math.round(t.x), Math.round(t.cy)]);
    this.burst(t.x, t.cy, '#fff176', 18, 420);
    this.shake = Math.min(18, this.shake + 10);
    this.play('boom');
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

  play(name: keyof typeof sfx) {
    if (this.record) this.events.push(['s', name]);
    if (!this.demo) sfx[name]();
  }

  /** Joining device: the host runs the match; this only animates effects and the camera between updates. */
  clientTick(dt: number) {
    this.time += dt;
    this.movePlatforms(false);
    this.markSurvivors();
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
      else if (e[0] === 'z') this.bolts.push({ x1: e[1], y1: e[2], x2: e[3], y2: e[4], life: 0.3 });
      else if (e[0] === 'l') this.tracers.push({ x1: e[1], y1: e[2], x2: e[3], y2: e[4], life: 0.18, color: e[5], w: e[6] });
      else if (e[0] === 'p') this.onPortal?.(e[1]);
      else if (e[0] === 'k') {
        this.pushFeed({ victim: e[1], killer: e[2], kind: e[3], n: e[4], vh: e[5] || undefined, kh: e[6] || undefined, t: FEED_LIFE });
        // Get Tricked: somebody else knocked out a Clone.
        const v = this.fighters[e[1]];
        const k = this.fighters[e[2]];
        if (v?.cloneOf && !e[5] && !e[6] && k && k !== v && k !== v.cloneOf) this.tricked.add(v.cloneOf);
      }
    }
  }

  ring(x: number, y: number, maxR: number, life: number, color: string) {
    this.rings.push({ x, y, r: 10, maxR, life, max: life, color });
    if (this.record) this.events.push(['r', Math.round(x), Math.round(y), Math.round(maxR), life, color]);
  }

  /** Ice Cream's ice spikes: a solid block (an extra platform at the end of the map's list) until it melts. */
  addIceSpike(plat: Platform, life: number) {
    this.map.platforms.push(plat);
    this.glassT.push(0);
    this.iceSpikes.push({ x: plat.x, y: plat.y, w: plat.w, h: plat.h, life, max: life, head: plat.temp === 'head', plat });
  }

  /** Somebody went through the Portal (the screen they play on goes to Stickman Fight 2). */
  portalled(f: Fighter) {
    const i = this.fighters.indexOf(f);
    if (i < 0 || this.portalGone.has(i)) return;
    this.portalGone.add(i);
    if (this.record) this.events.push(['p', i]);
    this.onPortal?.(i);
  }

  /** A player left the room mid-match: a bot takes over their stickman. */
  handToBot(f: Fighter) {
    f.human = false;
    f.brain = new BotBrain('medium');
  }

  /** Patience: who is still standing at 5 minutes. */
  private markSurvivors() {
    if (this.time < 300) return;
    for (const f of this.fighters) if (f.alive) f.survived5 = true;
  }

  /** Slide the moving platforms to where they are at this moment, carrying whoever stands on them. */
  movePlatforms(carry = true) {
    this.map.platforms.forEach((p, i) => {
      if (!p.move) return;
      const base = this.platBase[i];
      const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * (this.time / p.move.period + (p.move.phase ?? 0)));
      const nx = base.x + p.move.dx * k;
      const ny = base.y + p.move.dy * k;
      const dx = nx - p.x;
      const dy = ny - p.y;
      p.x = nx;
      p.y = ny;
      if (!carry || (!dx && !dy)) return;
      for (const b of this.bodies()) {
        if (!b.alive || !b.onGround || b.standOn !== i) continue;
        b.x += dx;
        b.y += dy;
      }
      for (const gb of this.groundBalls) if (gb.x >= p.x - dx && gb.x <= p.x - dx + p.w && Math.abs(gb.y - (p.y - dy)) < 3) {
        gb.x += dx;
        gb.y += dy;
      }
    });
  }

  update(dt: number) {
    this.time += dt;
    this.movePlatforms();
    // Frozen by the Ice Wand: can't move until it melts.
    for (const b of this.bodies()) {
      if (b.frozenT <= 0) continue;
      b.frozenT -= dt;
      b.stun = Math.max(b.stun, b.frozenT);
      if (b.onGround) b.vx *= 0.8;
    }
    for (const b of this.bodies()) if (b.slowT > 0) b.slowT -= dt;
    updateOct23(this, dt);
    updateOct30(this, dt);
    this.updateBubbles(dt);
    this.markSurvivors();
    if (this.cut) this.updateCutscene(dt);
    this.updateBlizzard(dt);
    if (this.ob) updateOutbreak(this, dt);
    if (!this.cut) updateZombieBosses(this, dt);
    if (this.hill) updateHill(this, dt);
    if (this.inf && !this.over) updateInfection(this, dt);
    if (this.ev && !this.over) updateEvents(this, dt);
    if ((this.hill || this.race || this.inf || this.mode === 'stock') && !this.over) updateRespawns(this, dt);
    if (this.rush && !this.over) updateRush(this, dt);
    for (const f of this.fighters) if (f.alive) this.updateFighter(f, dt);
    for (const s of this.snowmen) {
      if (!s.alive) continue;
      s.stun -= dt;
      s.hurtFlash -= dt;
      updateSnowman(s, dt, this);
      this.stepBody(s, dt);
    }
    for (const c of this.cats) {
      if (!c.alive) {
        // A pile of bones or the sleeping dog drops to the ground (the red guy stays frozen in the air).
        if (c.frozen && c.variant !== 'redguy') {
          c.vx *= Math.max(0, 1 - 6 * dt);
          this.stepBody(c, dt);
          if (c.y > this.map.h + 400) c.frozen = false;
        }
        continue;
      }
      c.stun -= dt;
      c.hurtFlash -= dt;
      // The Recall Memory ally fades away after 20 seconds.
      c.life -= dt;
      if (c.life <= 0) {
        c.alive = false;
        this.helperRemains(c);
        continue;
      }
      // Climbing out of the ground (The Outbreak at the Castle Gate).
      if (updateRise(this, c, dt)) continue;
      if (this.cut) c.vx *= 0.8;
      else updateCat(c, dt, this);
      this.stepBody(c, dt);
      if (c.onGround) c.walkPhase += c.vx * dt * (c.variant === 'memory' ? 0.04 : 0.06);
    }
    this.meleeHits();
    this.updateProjectiles(dt);
    this.updateGroundBalls(dt);
    this.updateBurns(dt);
    this.updatePeels(dt);
    this.updatePotions(dt);
    this.updateGlass(dt);
    this.checkOffMap();
    this.snowmen = this.snowmen.filter((s) => s.alive);
    // A red guy, skeleton or dog that went down stays where it is.
    this.cats = this.cats.filter((c) => c.alive || c.frozen);
    this.updateEffects(dt);
    this.updateRock(dt);
    this.checkWin();
    this.updateCamera(dt);
  }

  /** How many bots, bosses, Clones, helpers and zombies are up (10 chicks count as one). */
  crowd(): number {
    let n = this.fighters.filter((f) => f.alive && !f.human && !f.horde).length + this.snowmen.filter((s) => s.alive).length;
    let chicks = 0;
    for (const c of this.cats) if (c.alive) c.variant === 'chick' ? chicks++ : n++;
    return n + Math.ceil(chicks / SB_CHICKS);
  }

  /** Sandbox: rock music as soon as it gets crowded, the old music again once it has been calm for a few seconds. */
  private updateRock(dt: number) {
    if (this.mode !== 'sandbox' || this.demo) return;
    if (this.crowd() > SB_ROCK_AT) {
      this.rock = true;
      this.calmT = ROCK_CALM;
    } else if (this.rock && (this.calmT -= dt) <= 0) this.rock = false;
  }

  // ---------- fighters ----------

  private updateFighter(f: Fighter, dt: number) {
    for (let i = 0; i < f.cds.length; i++) if (!f.boomerangOut[i]) f.cds[i] = Math.max(0, f.cds[i] - dt);
    f.stun -= dt;
    f.hurtFlash -= dt;
    f.dashT -= dt;
    f.thrustT -= dt;
    f.slashT -= dt;
    f.buttAnim -= dt;
    f.summonCd = Math.max(0, f.summonCd - dt);
    if (f.sugarT > 0) {
      f.sugarT -= dt;
      if (Math.random() < dt * 14) this.burst(f.x, f.y - 20, Math.random() < 0.5 ? '#f48fb1' : '#fff176', 1, 120, false);
    }
    if (f.pigeon) return this.updatePigeon(f, dt);
    if (f.xboss === 'elephant') return updateElephant(this, f, dt);

    let it = f.human ? f.humanIntent(dt) : f.brain!.think(dt, f, this);
    // Cutscene: nobody moves on their own.
    if (this.cut) it = { moveX: this.cutMove.get(f) ?? 0, aim: null, shield: false, jump: false, skill: null, skillSlot: 0 };

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
      const target = f.shielding ? 0 : it.moveX * f.speed * (f.slowT > 0 ? SLOW_SPEED : 1) * (f.sugarT > 0 ? LOLLIPOP.speed : 1);
      // Ice is slippery: you slide and take a while to turn around.
      const grip = f.onGround ? (this.onIce(f) ? 1.6 : 14) : 6;
      f.vx += (target - f.vx) * Math.min(1, grip * dt);
    }
    if (it.moveX && !f.shielding && f.dashT <= 0) f.facing = sign(it.moveX);

    for (let i = 0; i < f.weapons.length; i++) {
      if (f.thrustT > 0 && i === f.thrustSlot) {
        f.angles[i] = f.thrustAngle;
        f.angVel[i] = 0;
        continue;
      }
      if (f.slashT > 0 && i === f.slashSlot) {
        // Inferno Slash: a big sweep from over the head down through the aim.
        const dir = Math.cos(f.slashAngle) >= 0 ? 1 : -1;
        const k = 1 - f.slashT / 0.3;
        f.angles[i] = wrap(f.slashAngle + dir * (-1.5 + k * 2.6));
        f.angVel[i] = 9;
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
    if (f.mascot) this.mascotTouch(f);
    if (f.buffalo) this.updateBuffalo(f, dt);
    if (f.jetT > 0) this.updateJet(f, dt);
    if (f.leafT > 0) this.updateLeaves(f, dt);
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
    const prevX = b.x;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.onGround = false;
    if (b.vy >= 0) {
      const half = b.w * 0.35;
      let land: number | null = null;
      let lava = false;
      let kind: string | undefined;
      let on = -1;
      this.map.platforms.forEach((p, i) => {
        if (!this.solid(i)) return;
        // Rising platforms can catch you a little below their top.
        const catchUp = p.move && p.move.dy ? 14 : 2;
        if (b.x + half > p.x && b.x - half < p.x + p.w && prevY <= p.y + catchUp && b.y >= p.y) {
          if (land === null || p.y < land) {
            land = p.y;
            lava = p.kind === 'lava';
            kind = p.kind;
            on = i;
          }
        }
      });
      b.standOn = on;
      if (land !== null) {
        b.y = land;
        b.vy = 0;
        b.onGround = true;
        if (lava) this.lavaHit(b);
        else if (kind === 'bounce') this.bouncePad(b);
        else if (kind === 'spikes') this.spikeHit(b);
      }
    }
    // Walls: you can't walk through them or jump up through them (the Ghost floats through everything).
    if (!(b instanceof Cat && b.variant === 'ghost')) this.map.platforms.forEach((p, i) => p.kind === 'wall' && this.solid(i) && wallPush(b, p, prevX, prevY));
  }

  /** Standing on an ice block? */
  onIce(b: Body) {
    // Random Events: Slippery Ice turns every floor to ice.
    if (this.ev?.cur === 'ice') return b.onGround;
    return b.onGround && b.standOn >= 0 && this.map.platforms[b.standOn]?.kind === 'ice';
  }

  /** Bounce pad: BOING, way up into the air. */
  private bouncePad(b: Body) {
    if (!b.alive) return;
    b.vy = -BOUNCE_V;
    b.onGround = false;
    if (b instanceof Fighter) {
      b.airJumps = 1;
      b.slamming = false;
    }
    this.burst(b.x, b.y, '#ff4081', 6, 220, false);
    if (b instanceof Fighter && b.human && !this.demo) sfx.jump();
  }

  /** Spikes: they hurt and bounce you up a little. */
  private spikeHit(b: Body) {
    if (!b.alive) return;
    b.vy = -760;
    b.onGround = false;
    b.hp -= SPIKE_DMG;
    if (b instanceof Fighter) {
      b.dmgTaken += SPIKE_DMG;
      b.slamming = false;
    }
    b.hurtFlash = 0.15;
    this.text(b.x, b.y - b.h - 10, `-${SPIKE_DMG}`, '#e0e0e0', 24);
    this.burst(b.x, b.y, '#b71c1c', 8, 260);
    this.play('hit');
    if (b.hp <= 0) this.kill(b, null, 'ragdoll', 'spikes');
  }

  /** Landed on lava: it hurts and throws you back up. */
  lavaHit(b: Body) {
    if (!b.alive) return;
    b.vy = -LAVA_JUMP;
    b.onGround = false;
    b.hp -= LAVA_DMG;
    if (b instanceof Fighter) b.dmgTaken += LAVA_DMG;
    b.hurtFlash = 0.15;
    if (b instanceof Fighter) b.slamming = false;
    this.text(b.x, b.y - b.h - 10, `-${LAVA_DMG}`, '#ff7043', 26);
    this.burst(b.x, b.y, '#ff6d00', 14, 380);
    this.play('hit');
    if (b.hp <= 0) this.kill(b, null, 'pop', 'lava');
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
      // Poison Dart: 10 damage every second.
      if (b.alive && b.poisonT > 0) {
        b.poisonT -= dt;
        b.poisonTick -= dt;
        if (b.poisonTick <= 0) {
          b.poisonTick = 1;
          b.hp -= POISON.dmg;
          if (b instanceof Fighter) b.dmgTaken += POISON.dmg;
          b.hurtFlash = 0.1;
          this.text(b.x + (Math.random() - 0.5) * 20, b.y - b.h - 10, String(POISON.dmg), '#76ff03', 18);
          this.burst(b.x, b.cy, '#76ff03', 4, 140);
          if (b.hp <= 0) this.kill(b, b.poisonSrc, 'ragdoll');
        }
      }
      if (!b.alive || b.burnT <= 0) continue;
      b.burnT -= dt;
      b.burnTick -= dt;
      if (b.burnTick > 0) continue;
      b.burnTick = b.burnEvery;
      b.hp -= b.burnDmg;
      if (b instanceof Fighter) b.dmgTaken += b.burnDmg;
      b.hurtFlash = 0.1;
      this.text(b.x + (Math.random() - 0.5) * 20, b.y - b.h - 10, String(b.burnDmg), '#ff9800', 18);
      this.burst(b.x, b.cy, '#ff9800', 4, 160);
      if (b.hp <= 0) this.kill(b, b.burnSrc, 'ashes', 'burn');
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

  /** `how`: the death finisher if this hit knocks a stickman out (none = the original pop). */
  /** Returns true if the hit landed (not blocked by a shield). */
  damage(target: Body, amount: number, src: Body | null, kx: number, ky: number, how?: Finish): boolean {
    if (!target.alive || amount <= 0) return false;
    // Sandbox: stronger (or weaker) fighters, and their snowmen and helpers.
    const by = src instanceof Snowman || src instanceof Cat ? src.owner : src;
    if (by instanceof Fighter) amount *= by.power;
    amount *= helperArmour(target);
    amount = Math.round(amount);
    if (target instanceof Fighter && by instanceof Fighter && by !== target) {
      target.lastHitBy = by;
      target.lastHitT = this.time;
    }
    if (target instanceof Fighter && target.shielding) {
      target.shieldHp -= amount;
      target.vx += kx * 0.25;
      this.burst(target.x, target.cy, '#4fc3f7', 6, 200);
      this.play('block');
      if (target.shieldHp <= 0) this.breakShield(target);
      return false;
    }
    // Stickman Infection: a zombie's hit turns a human into a zombie.
    if (this.inf && infectHit(this, target, src)) return true;
    const heavy = target instanceof Fighter && target.boss;
    if (heavy) {
      kx *= 0.25;
      ky *= 0.25;
    }
    target.hp -= amount;
    if (target instanceof Fighter) target.dmgTaken += amount;
    if (by instanceof Fighter && by !== target) {
      by.streak++;
      by.bestStreak = Math.max(by.bestStreak, by.streak);
    }
    this.play(amount >= 60 ? 'heavy' : 'hit');
    target.vx = kx;
    if (ky < 0) {
      target.vy = Math.min(target.vy, ky);
      target.onGround = false;
    }
    target.stun = heavy ? 0.05 : Math.min(0.6, 0.15 + amount / 250);
    // Asleep under a blanket: a hit wakes them up.
    wake(target);
    target.hurtFlash = 0.15;
    this.text(target.x + (Math.random() - 0.5) * 20, target.y - target.h - 10, String(amount), amount >= 60 ? '#ff5252' : '#ffffff', 18 + Math.min(16, amount / 5));
    this.burst(target.x, target.cy, target.color, 5 + Math.floor(amount / 10), 260);
    this.shake = Math.min(14, this.shake + amount / 30);
    this.juice.hit(this, target, amount, kx);
    if (target.hp <= 0) this.kill(target, src, how);
    return true;
  }

  /** On fire: `dmg` every second for `secs` seconds. */
  setBurn(e: Body, secs: number, dmg: number, src: Body) {
    // A hair over so the last tick still lands.
    e.burnT = secs + 0.05;
    e.burnTick = 1;
    e.burnDmg = dmg;
    e.burnEvery = 1;
    e.burnSrc = src;
  }

  setPoison(e: Body, src: Body) {
    e.poisonT = POISON.s + 0.05;
    e.poisonTick = 1;
    e.poisonSrc = src;
  }

  /** `env`: what the map did (lava block, fire); falling off the map is worked out here. */
  kill(b: Body, src: Body | null, how: Finish = 'pop', env?: FeedKind) {
    if (!b.alive) return;
    b.alive = false;
    b.hp = 0;
    const fighter = b instanceof Fighter;
    // Buffalo isn't a stickman: it always goes down with the original pop.
    if (b instanceof Fighter && b.buffalo && how !== 'void') how = 'pop';
    // The Pigeon always comes down fried (any finisher but the void). The Elephant isn't a stickman either.
    if (b instanceof Fighter && b.pigeon && how !== 'void') how = 'trip';
    if (b instanceof Fighter && b.xboss === 'elephant' && how !== 'void') how = 'pop';
    // The Outbreak: going down costs a life.
    if (b instanceof Fighter && (this.ob || this.mode === 'stock') && !b.horde && !b.boss) b.lives = Math.max(0, b.lives - 1);
    // Stickman Infection: a human who goes down comes back as a zombie (once the first zombie has been picked).
    if (b instanceof Fighter && this.inf && this.inf.pick <= 0 && !b.boss) turnZombie(this, b);
    // An Exploder zombie blows up when it goes down.
    if (b instanceof Cat && b.variant === 'zexploder' && how !== 'void') zombieBoom(this, b);
    if (fighter) b.finish = how;
    // Fell into the void: nothing at all. Helpers leave their own remains (a grave, a cooked fish...).
    // The original pop for snowmen and 'pop' kills.
    if (b instanceof Cat) {
      // The red guy freezes in place, skeletons fall into a pile of bones and the dog lies down to rest:
      // no remains, the next summon brings them back.
      if (REVIVES(b.variant)) b.frozen = how !== 'void';
      else if (how !== 'void') this.helperRemains(b);
    } else if (!fighter && how === 'void') {
      // Nothing.
    } else if (!fighter || how === 'pop') {
      this.burst(b.x, b.cy, b.color, 26, 520);
      this.burst(b.x, b.cy, '#ffffff', 10, 380);
    } else if (how !== 'void') {
      const c = makeCorpse(b, how);
      if (c) {
        // The Portal map: a knocked-out player flung into the portal goes through it.
        c.who = b as Fighter;
        this.corpses.push(c);
      }
      if (how === 'pieces') {
        // Blown to pieces: confetti and a big KABOOM.
        for (const col of ['#ff5252', '#ffeb3b', '#69f0ae', '#40c4ff', '#e040fb']) this.burst(b.x, b.cy, col, 7, 560);
        this.text(b.x, b.y - b.h - 60, 'KABOOM! 🎉', '#ffeb3b', 32);
        this.play('boom');
      }
    }
    if (b.kind === 'fighter') {
      this.text(b.x, b.y - b.h - 30, 'KO!', '#ffeb3b', 34);
      if (how !== 'void') this.shake = Math.min(18, this.shake + 8);
      this.juice.ko(this, b as Fighter);
      this.play('ko');
      if (how !== 'void' && this.potionsOn && Math.random() < POTION_CHANCE) this.dropPotion(b.x, b.cy);
    }
    if (b instanceof Fighter && b.cloneOf && how !== 'void') this.cloneBoom(b);
    const killer = src instanceof Snowman || src instanceof Cat ? src.owner : src;
    // Get Tricked: somebody knocked out your Clone.
    if (b instanceof Fighter && b.cloneOf && killer instanceof Fighter && killer !== b.cloneOf && killer !== b) this.tricked.add(b.cloneOf);
    if (killer instanceof Fighter && killer !== b && b.kind === 'fighter') killer.kos++;
    // Weapon Race: knocking out a fighter gives you the next weapon.
    if (this.race && killer instanceof Fighter && killer !== b && b instanceof Fighter && !b.cloneOf) raceKo(this, killer);
    const kh = src instanceof Cat ? src.variant : src instanceof Snowman ? 'snowman' : undefined;
    const by = killer instanceof Fighter && killer !== b ? killer : null;
    if (!this.demo) {
      if (b instanceof Fighter) this.feedKill(b, by, how, env, undefined, by ? kh : undefined);
      // Helpers are in the kill feed too, named after their owner ("Potter's Snowman"). Not the Outbreak's zombies (too many).
      else if ((b instanceof Cat || b instanceof Snowman) && !b.owner.horde) {
        const v = b instanceof Cat ? b.variant : 'snowman';
        const k = by && by !== b.owner ? by : null;
        this.feedKill(b.owner, k, how, env, v, k ? kh : undefined);
      }
    }
    if (b instanceof Fighter) for (const p of this.projectiles) if (p.owner === b && returns(p.kind)) p.dead = true;
  }

  /** Stickman Infection: a line in the kill feed when a zombie gets someone. */
  feedInfect(v: Fighter, by: Fighter) {
    if (!this.demo) this.feedKill(v, by, 'pop', 'infect');
  }

  /** Add a goofy line to the kill feed (and send it to the other devices). */
  private feedKill(v: Fighter, killer: Fighter | null, how: Finish, env?: FeedKind, vh?: string, kh?: string) {
    let kind: FeedKind = env ?? (killer?.pigeon ? 'peck' : 'kill');
    if (how === 'void' && env !== 'portal') kind = this.map.theme === 'beach' || this.map.theme === 'pirate' ? 'water' : this.map.theme === 'lava' || this.map.theme === 'inferno' ? 'lava' : 'void';
    // A cat going down gets its own cute line, and so do the chicks, the Chicken, fish, the Recall Memory boss,
    // the dog, skeletons and the little pigeon (each in its own colour).
    const own = vh ? HELPER_FEED[vh] : undefined;
    if (own && env !== 'portal') kind = own;
    // Knocked off the map (or into lava) by someone a moment ago: they get the credit.
    if (!vh && !killer && v.lastHitBy && v.lastHitBy !== v && this.time - v.lastHitT < BLAME_S) killer = v.lastHitBy;
    const by = !!killer;
    const count = feedCount(kind, by);
    // Never the same joke twice in a row.
    let n = Math.floor(Math.random() * count);
    const key = `${kind}${by}`;
    if (count > 1 && n === this.lastFeed.get(key)) n = (n + 1) % count;
    this.lastFeed.set(key, n);
    const item: FeedItem = { victim: this.fighters.indexOf(v), killer: killer ? this.fighters.indexOf(killer) : -1, kind, n, vh, kh, t: FEED_LIFE };
    this.pushFeed(item);
    if (this.record) this.events.push(vh || kh ? ['k', item.victim, item.killer, kind, n, vh ?? '', kh ?? ''] : ['k', item.victim, item.killer, kind, n]);
  }

  private pushFeed(item: FeedItem) {
    this.feed.push(item);
    if (this.feed.length > FEED_MAX) this.feed.shift();
  }

  private meleeHits() {
    // The cutscene does its own hits.
    if (this.cut) return;
    const bodies = this.bodies();
    for (const f of this.fighters) {
      if (!f.alive || f.shielding) continue;
      for (let i = 0; i < f.weapons.length; i++) {
        const def = f.weapons[i];
        // A thrown axe is not in your hand. Buffalo has no normal attack.
        if ((def.id === 'axe' || def.id === 'six7') && f.boomerangOut[i]) continue;
        if (def.damage <= 0) continue;
        const speed = Math.abs(f.angVel[i]);
        const dash = f.dashT > 0;
        const thrust = f.thrustT > 0 && i === f.thrustSlot;
        if (speed < 3.5 && !dash && !thrust) continue;
        const glove = thrust && def.id === 'glove';
        const dmg = f.mascot
          ? MASCOT_TOUCH
          : f.fish || def.id === 'trident'
          ? FISHY.melee
          : dash
          ? 60 * f.dmgMult
          : glove
          ? 45 * f.dmgMult
          : thrust
          ? 70 * f.dmgMult
          : def.id === 'dart'
          ? POISON.hit
          : def.id === 'booger'
          ? BOOGER.dmg * f.dmgMult
          : def.damage * f.dmgMult * clamp(speed / 12, 0.5, 1.3);
        const h = f.hand(i);
        const tp = f.tip(i);
        const pts = [0.25, 0.5, 0.75, 1].map((k) => ({ x: h.x + (tp.x - h.x) * k, y: h.y + (tp.y - h.y) * k }));
        for (const e of bodies) {
          if (!e.alive || e.team === f.team) continue;
          if ((f.hitCd.get(e.id) ?? 0) > this.time) continue;
          if (!pts.some((p) => e.contains(p.x, p.y, 4))) continue;
          f.hitCd.set(e.id, this.time + (dash || thrust ? 0.5 : 0.35));
          const dir = sign(e.x - f.x) || f.facing;
          // Mega Punch sends them flying.
          const force = glove ? 2.4 : dash || thrust ? 1.4 : meleeForce(def.id);
          const hit = this.damage(e, dmg, f, dir * (220 + dmg * 8) * force, -(260 + dmg * 5) * force, MELEE_FINISH[def.id]);
          if (hit && e.alive && def.id === 'firesword') this.setBurn(e, FIRE_SWORD.burnS, FIRE_SWORD.burn, f);
          if (hit && e.alive && def.id === 'dart') this.setPoison(e, f);
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
        f.slamDmg = 0;
        f.slamR = 0;
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
      case 'ice':
        this.spawnProj('icebolt', f, tip.x, tip.y, angle, 1200, 200, 35 * m, i);
        break;
      case 'banana':
        this.spawnProj('banana', f, tip.x, tip.y, angle, 850, 1400, 25 * m, i);
        break;
      case 'thunder':
        this.thunder(f);
        break;
      case 'firesword': {
        // Inferno Slash: swing, and a curved air slash of fire flies out.
        f.slashT = 0.3;
        f.slashAngle = angle;
        f.slashSlot = i;
        f.hitCd.clear();
        const sh = f.shoulder();
        this.spawnProj('fireslash', f, sh.x + cos * 40 * s, sh.y + sin * 40 * s, angle, 1100, 0, FIRE_SWORD.slash * m, i);
        this.burst(sh.x + cos * 50 * s, sh.y + sin * 50 * s, '#ff6d00', 12, 300);
        break;
      }
      case 'chainsaw': {
        // Rev Dash: rush forward with the chainsaw roaring (hits like the sword's dash).
        const dir = Math.abs(cos) < 0.2 ? f.facing : sign(cos);
        f.facing = dir;
        f.dashT = 0.3;
        f.dashVx = dir * 1300;
        f.hitCd.clear();
        this.burst(f.x, f.cy, '#9e9e9e', 10, 240);
        this.text(f.x, f.y - f.h - 30, 'VRRRM!', '#ff7043', 24);
        this.play('throw');
        break;
      }
      case 'yoyo':
        // Walk the Dog: the yo-yo flies out and spins back to your hand.
        this.spawnProj('yoyo', f, tip.x, tip.y, angle, 1100, 0, 30 * m, i);
        f.boomerangOut[i] = true;
        this.play('throw');
        break;
      case 'crossbow':
        // A heavy bolt that flies straight and fast.
        this.spawnProj('arrow', f, tip.x, tip.y, angle, 2200, 0, 55 * m, i);
        this.play('throw');
        break;
      case 'whip':
        this.whipCrack(f);
        break;
      case 'fryfish':
        // Throw a fried fish. Bonk!
        this.spawnProj('fishthrow', f, tip.x, tip.y, angle, 850, 1400, 35 * m, i);
        this.play('throw');
        break;
      case 'recall':
        // The boss ally when it's ready, otherwise Strike.
        if (f.summonCd <= 0) {
          this.summonMemory(f);
          f.summonCd = RECALL.summonCd;
          f.cds[i] = 1;
        } else this.spawnProj('memorybox', f, tip.x, tip.y, angle, 1400, 0, RECALL.strike * m, i);
        break;
      case 'dart':
        this.spawnProj('dart', f, tip.x, tip.y, angle, 1500, 300, POISON.hit * m, i);
        break;
      case 'glove':
        // Mega Punch: the glove springs out.
        f.thrustT = 0.3;
        f.thrustAngle = angle;
        f.thrustSlot = i;
        f.hitCd.clear();
        this.play('throw');
        break;
      case 'magnet':
        this.magnet(f);
        break;
      case 'rocket':
        this.spawnProj('rocket', f, tip.x, tip.y, angle, 1000, 0, 85 * m, i);
        this.burst(tip.x, tip.y, '#ff9800', 8, 200);
        break;
      case 'horns': {
        // Horn Charge: run head first across the platform.
        const dir = Math.abs(cos) < 0.2 ? f.facing : sign(cos);
        f.facing = dir;
        f.dashT = 0.7;
        f.dashVx = dir * 1100;
        f.hitCd.clear();
        this.text(f.x, f.y - f.h - 20, '🐂💨', '#ffffff', 30);
        this.play('jump');
        break;
      }
      case 'headbutt':
        f.facing = Math.abs(cos) < 0.2 ? f.facing : sign(cos);
        f.buttN = 2;
        f.buttT = 0;
        break;
      case 'trident': {
        // The Fishy boss takes turns: Tidal Waves, Call Fish, Trident Strike.
        const n = f.fishNext;
        f.fishNext = (n + 1) % 3;
        if (n === 0) this.tidalWaves(f, i);
        else if (n === 1) this.callCats(f, FISHY.fish, 'fish');
        else this.tridentStrike(f, i);
        break;
      }
      case 'scepter': {
        // The Snow Queen takes turns: Ice Shard, then Blizzard (shards again if a storm is still going).
        const n = f.fishNext;
        f.fishNext = (n + 1) % 2;
        if (n === 1 && !this.blizzard) this.startBlizzard(f);
        else this.iceShards(f, i, angle);
        break;
      }
      case 'kingtrident': {
        // The Tide King: Wave Crash, Water Jet, Summon Fish.
        const n = f.fishNext;
        f.fishNext = (n + 1) % 3;
        if (n === 0) this.waveCrash(f, i);
        else if (n === 1) this.waterJet(f, angle);
        else this.callCats(f, TIDE.fish, 'fish');
        break;
      }
      case 'vinestaff': {
        // The Ancient Guardian: Vine Whip, Root Trap, Leaf Storm.
        const n = f.fishNext;
        f.fishNext = (n + 1) % 3;
        if (n === 0) this.vineWhip(f, i, angle);
        else if (n === 1) this.rootTrap(f);
        else this.leafStorm(f);
        break;
      }
      case 'sniper':
        this.sniperShot(f, tip.x, tip.y, angle);
        break;
      case 'shotgun':
        this.shotgunBlast(f, tip.x, tip.y, angle);
        break;
      case 'pistol':
        this.spawnProj('nerf', f, tip.x, tip.y, angle, 1500, 250, PISTOL.dmg, i);
        // After 5 shots it needs 3 seconds to reload.
        f.ammo[i]--;
        if (f.ammo[i] <= 0) {
          f.ammo[i] = PISTOL_AMMO;
          f.cds[i] = PISTOL.reload;
          this.text(f.x, f.y - f.h - 30, '🔄', '#ffffff', 22);
        }
        break;
      case 'gun67':
        this.spawnProj('bullet67', f, tip.x, tip.y, angle, 2100, 0, GUN67.dmg, i);
        this.burst(tip.x, tip.y, '#ffeb3b', 8, 220);
        this.text(f.x, f.y - f.h - 30, '67!', '#ffeb3b', 26);
        break;
      case 'summoner':
        this.summonAll(f);
        break;
      case 'chicklord':
        this.lordOfTheChicks(f);
        break;
      case 'lilpigeon':
        this.summonLilPigeon(f, true);
        break;
      case 'bone':
        this.summonBones(f, true);
        break;
      case 'egg':
        this.spawnProj('egg', f, tip.x, tip.y, angle, 1000, 900, EGG.dmg * m, i);
        this.play('throw');
        break;
      case 'gum':
        this.spawnProj('gum', f, tip.x, tip.y, angle, 1100, 300, GUM.dmg * m, i);
        this.play('throw');
        break;
      case 'drumstick': {
        // Take a bite: heal a little.
        const heal = Math.min(f.maxHp - f.hp, DRUMSTICK.heal);
        f.hp += heal;
        this.burst(f.x, f.y - f.h * 0.8, '#ffd54f', 12, 240);
        this.text(f.x, f.y - f.h - 30, `🍗 +${heal}`, '#69f0ae', 26);
        break;
      }
      case 'bravery':
        this.callCats(f, BRAVERY, 'soldier');
        this.text(f.x, f.y - f.h - 56, '⚔️ CHARGE!', '#ffd54f', 24);
        break;
      case 'pan':
        this.panBonk(f, i, angle);
        break;
      case 'watergun':
        for (let k = 0; k < WATER.drops; k++) {
          const spread = (k / (WATER.drops - 1) - 0.5) * 0.4 + (Math.random() - 0.5) * 0.06;
          this.spawnProj('water', f, tip.x, tip.y, angle + spread, 1150 + Math.random() * 250, 700, WATER.dmg, i);
        }
        this.play('splash');
        break;
      case 'bubble':
        this.spawnProj('bubble', f, tip.x, tip.y, angle, 620, -80, BUBBLE.dmg, i);
        break;
      case 'pitchfork':
        scarecrowSkill(this, f, i, angle);
        break;
      case 'robocannon':
        roboSkill(this, f, i, angle);
        break;
      case 'beehive':
        this.callCats(f, BEES, 'bee');
        break;
      case 'ninjascroll':
        this.callCats(f, NINJAS, 'ninja');
        break;
      case 'trumpet':
        this.trumpetBlast(f, angle);
        break;
      case 'plasma':
        this.plasmaSpin(f, i);
        break;
      case 'guitar':
        this.powerChord(f);
        break;
      case 'bat':
        this.homeRun(f, i, angle);
        break;
      case 'slingshot':
        this.spawnProj('pebble', f, tip.x, tip.y, angle, 1300, 600, SLING.dmg * m, i);
        this.play('throw');
        break;
      case 'flamethrower':
        for (let k = 0; k < FLAME.flames; k++) {
          const spread = (k / (FLAME.flames - 1) - 0.5) * 0.36 + (Math.random() - 0.5) * 0.05;
          this.spawnProj('flame', f, tip.x, tip.y, angle + spread, 650 + Math.random() * 350, -120, FLAME.dmg * m, i);
        }
        this.burst(tip.x, tip.y, '#ff6d00', 10, 260);
        this.text(f.x, f.y - f.h - 30, '🔥 FWOOSH!', '#ff9100', 24);
        break;
      default:
        if (!oct22Skill(this, f, i, angle) && !oct23Skill(this, f, i, angle)) oct30Skill(this, f, i, angle);
        break;
      case 'stick':
      case 'mascotstick': {
        // Giant stick slam: leap up, then smash down.
        const big = def.id === 'stick';
        f.slamDmg = big ? MASCOT_SLAM : MASCOT_STICK_SLAM;
        f.slamR = big ? 460 : 220;
        f.slamming = true;
        if (f.onGround) {
          f.vy = big ? -1150 : -950;
          f.onGround = false;
        } else f.vy = 1800;
        this.play('jump');
        break;
      }
    }
  }

  // ---------- guns and the new weapons ----------

  /** A bullet's path from (x, y): the first enemy it reaches, or the wall that stops it (sandbags stop bullets). */
  private rayCast(x: number, y: number, angle: number, maxLen: number, team: number, by: Body): { hit: Body | null; x: number; y: number } {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const bodies = this.bodies().filter((e) => e.alive && e.team !== team);
    const plats = this.map.platforms;
    // A platform you are standing inside doesn't stop your own shot.
    const inside = (i: number, px: number, py: number) => px >= plats[i].x && px <= plats[i].x + plats[i].w && py >= plats[i].y && py <= plats[i].y + plats[i].h;
    const start = new Set(plats.map((_, i) => i).filter((i) => inside(i, x, y)));
    for (let d = 0; d <= maxLen; d += 6) {
      const px = x + cos * d;
      const py = y + sin * d;
      for (const e of bodies) if (e.contains(px, py, 2)) return { hit: e, x: px, y: py };
      for (let i = 0; i < plats.length; i++) {
        if (!this.solid(i) || start.has(i) || !inside(i, px, py)) continue;
        if (plats[i].kind === 'glass') this.breakGlassAt(px, py, 8, by);
        else this.burst(px, py, plats[i].kind === 'sandbag' ? '#c8a165' : '#bdbdbd', 6, 180);
        return { hit: null, x: px, y: py };
      }
    }
    return { hit: null, x: x + cos * maxLen, y: y + sin * maxLen };
  }

  private tracer(x1: number, y1: number, x2: number, y2: number, color: string, w: number) {
    this.tracers.push({ x1, y1, x2, y2, life: 0.18, color, w });
    if (this.record) this.events.push(['l', Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2), color, w]);
  }

  /** Sniper: one shot that goes far. Headshot 250, body 225, legs 199. */
  private sniperShot(f: Fighter, x: number, y: number, angle: number) {
    const r = this.rayCast(x, y, angle, SNIPER.range, f.team, f);
    this.tracer(x, y, r.x, r.y, '#fff59d', 3);
    this.burst(x, y, '#ffeb3b', 10, 260);
    this.shake = Math.min(18, this.shake + 6);
    this.play('heavy');
    const e = r.hit;
    // A miss ends a Perfect Aim streak.
    if (!e) {
      f.streak = 0;
      return;
    }
    // Where on the body: the top of a stickman is the head, the bottom is the legs.
    const k = (r.y - (e.y - e.h)) / e.h;
    const zone = e instanceof Fighter && !e.buffalo && !e.pigeon ? (k < 0.24 ? 'head' : k > 0.58 ? 'legs' : 'body') : 'body';
    const dmg = SNIPER[zone];
    const dir = Math.cos(angle) >= 0 ? 1 : -1;
    if (zone === 'head') this.text(e.x, e.y - e.h - 48, 'HEADSHOT!', '#ff5252', 30);
    else if (zone === 'legs') this.text(e.x, e.y - e.h - 48, 'LEGSHOT', '#ffcc80', 22);
    this.damage(e, dmg, f, dir * 700, -400, zone === 'head' ? 'fling' : 'ragdoll');
  }

  /** Shotgun: 7 pellets in a spread. Each enemy hit takes 180 up close, 90 from far away. */
  private shotgunBlast(f: Fighter, x: number, y: number, angle: number) {
    const hits = new Set<Body>();
    for (let k = 0; k < SHOTGUN.pellets; k++) {
      const a = angle + (k / (SHOTGUN.pellets - 1) - 0.5) * 2 * SHOTGUN.spread + (Math.random() - 0.5) * 0.04;
      const r = this.rayCast(x, y, a, SHOTGUN.range, f.team, f);
      this.tracer(x, y, r.x, r.y, '#ffe082', 2);
      if (r.hit) hits.add(r.hit);
    }
    this.burst(x, y, '#ffb300', 14, 320);
    this.shake = Math.min(18, this.shake + 7);
    this.play('boom');
    const dir = Math.cos(angle) >= 0 ? 1 : -1;
    for (const e of hits) {
      const gap = Math.hypot(e.x - f.x, e.cy - f.cy) - e.w / 2;
      const close = gap <= SHOTGUN.closeR * (f.scale > 1 ? 1.6 : 1);
      this.damage(e, close ? SHOTGUN.close : SHOTGUN.far, f, dir * (close ? 900 : 500), close ? -650 : -350, close ? 'pieces' : 'half');
    }
    if (!hits.size) f.streak = 0;
  }

  /** Summoner: 3 cats, 3 fish, 3 snowmen, the Recall Memory boss and a spear soldier, all at once. */
  private summonAll(f: Fighter) {
    this.summonClone(f);
    this.callCats(f, SUMMONER.cats, 'cat');
    this.callCats(f, SUMMONER.fish, 'fish');
    this.callCats(f, SUMMONER.soldier, 'soldier');
    // The Recall Memory boss stays until it's beaten when the Summoner calls it (no 20 s timer).
    if (!this.cats.some((c) => c.alive && c.owner === f && c.variant === 'memory')) this.summonMemory(f).life = Infinity;
    // They appear on the side toward the middle of the map, so they don't drop off the edge.
    const inward = f.x < this.map.w / 2 ? 1 : -1;
    this.summonOne(f, 'sbsnow', SB_ALLY.hp, SB_ALLY.punch, inward * 60);
    this.summonOne(f, 'fireally', SB_ALLY.hp, SB_ALLY.fire, inward * 110);
    this.summonRedGuy(f);
    // October 19: the Chicken with 20 chicks, the little pigeon, and the skeletons with the dog.
    this.summonChicken(f, 0);
    this.callChicks(f, SUMMONER_CHICKS, 0);
    this.summonLilPigeon(f, false);
    this.summonBones(f, false);
    // October 20: the Retro Stickguy, bees, ninjas, and a zombie ally once you have beaten wave 10 of The Outbreak.
    this.summonOne(f, 'retro', RETRO.hp, RETRO.dmg, inward * 160);
    this.callCats(f, BEES, 'bee');
    this.callCats(f, NINJAS, 'ninja');
    if (f.zombieAlly) this.summonOne(f, 'zombie', ZOMBIE_ALLY.hp, ZOMBIE_ALLY.dmg, inward * 200);
    // October 21: the Baby Elephant, two Robo Drones and the Penguin.
    this.summonOne(f, 'babyele', BABY_ELE.hp, BABY_ELE.dmg, inward * 240);
    this.callCats(f, { count: DRONE.max, hp: DRONE.hp, dmg: DRONE.dmg, max: DRONE.max }, 'drone');
    this.summonOne(f, 'penguin', PENGUIN.hp, PENGUIN.dmg, inward * 90);
    // October 22: the Knight, the Frog and the Ghost.
    this.summonOne(f, 'knight', KNIGHT.hp, KNIGHT.dmg, inward * 130);
    this.summonOne(f, 'frog', FROG.hp, FROG.dmg, inward * 180);
    this.summonOne(f, 'ghost', GHOST.hp, GHOST.dmg, inward * 40);
    // October 23: the Gingerbread Man, the Cupcake and the Chef.
    summonOct23(this, f, inward);
    // October 30: the Unicorn, the Dino, the Wizard and the Panda.
    summonOct30(this, f, inward);
    for (let k = 0; k < SUMMONER.snowmen; k++) {
      if (this.snowmen.filter((m) => m.alive && m.owner === f).length >= this.maxSnowmen) break;
      const m = new Snowman(f, f.x + (k - 1) * 56, f.y - 6);
      m.vy = -400;
      this.snowmen.push(m);
      this.burst(m.x, m.y - 30, '#ffffff', 10, 260);
    }
    this.ring(f.x, f.y, 160, 0.5, '#e040fb');
    this.text(f.x, f.y - f.h - 56, '✨ SUMMON! ✨', '#e040fb', 28);
  }

  /** Trumpet: TOOT! A wave of sound flies out in front of you and pushes everyone away. */
  private trumpetBlast(f: Fighter, angle: number) {
    const dir = Math.cos(angle) >= 0 ? 1 : -1;
    f.facing = dir;
    const sh = f.shoulder();
    this.spawnProj('sound', f, sh.x + dir * 40, sh.y, dir > 0 ? 0 : Math.PI, 1300, 0, TRUMPET.dmg * f.dmgMult, 0);
    this.projectiles[this.projectiles.length - 1].dir = dir;
    this.text(f.x, f.y - f.h - 30, '🎺 TOOT!', '#fff59d', 26);
  }

  /** Plasma Blade: spin around and hit everyone close by. */
  private plasmaSpin(f: Fighter, slot: number) {
    f.slashT = 0.3;
    f.slashAngle = -Math.PI / 2;
    f.slashSlot = slot;
    const R = f.reach(slot) + 40 * f.scale;
    this.ring(f.x, f.cy, R, 0.35, '#18ffff');
    this.burst(f.x, f.cy, '#84ffff', 16, 360);
    this.play('throw');
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - f.x;
      if (Math.hypot(dx, e.cy - f.cy) > R + e.w / 2) continue;
      f.hitCd.set(e.id, this.time + 0.5);
      this.damage(e, PLASMA.spin * f.dmgMult, f, (sign(dx) || 1) * 650, -450, 'half');
    }
  }

  /** Guitar: Power Chord! A ring of sound blasts everyone around you away, and they're dizzy for a moment. */
  private powerChord(f: Fighter) {
    const R = GUITAR.R * f.scale;
    this.ring(f.x, f.cy, R, 0.45, '#ff4081');
    this.ring(f.x, f.cy, R * 0.6, 0.35, '#ffd740');
    this.burst(f.x, f.cy, '#ff4081', 14, 340);
    this.text(f.x, f.y - f.h - 34, '🎸 POWER CHORD!', '#ff4081', 26);
    this.shake = Math.min(18, this.shake + 6);
    this.play('boom');
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - f.x;
      if (Math.hypot(dx, e.cy - f.cy) > R + e.w / 2) continue;
      f.hitCd.set(e.id, this.time + 0.5);
      if (this.damage(e, GUITAR.chord * f.dmgMult, f, (sign(dx) || 1) * GUITAR.push, -650, 'fling') && e.alive) e.stun = Math.max(e.stun, GUITAR.stun);
    }
  }

  /** Baseball Bat: HOME RUN! One big swing that sends whoever is in front of you flying. */
  private homeRun(f: Fighter, slot: number, angle: number) {
    f.slashT = 0.3;
    f.slashAngle = angle;
    f.slashSlot = slot;
    const sh = f.shoulder();
    const R = f.reach(slot) + 40 * f.scale;
    const dir = Math.cos(angle) >= 0 ? 1 : -1;
    f.facing = dir;
    let any = false;
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - sh.x;
      if (Math.hypot(dx, e.cy - sh.y) > R + e.w / 2 || dx * dir < -10) continue;
      f.hitCd.set(e.id, this.time + 0.5);
      this.damage(e, BAT.homeRun * f.dmgMult, f, dir * BAT.push, -BAT.lift, 'sky');
      this.text(e.x, e.y - e.h - 36, '⚾ HOME RUN!', '#ffffff', 28);
      any = true;
    }
    if (any) this.play('heavy');
    else this.play('throw');
  }

  /** Frying Pan: BONK everyone in front of you. They see stars for a moment. */
  private panBonk(f: Fighter, slot: number, angle: number) {
    f.slashT = 0.3;
    f.slashAngle = angle;
    f.slashSlot = slot;
    const sh = f.shoulder();
    const R = f.reach(slot) + 50 * f.scale;
    const dir = Math.cos(angle) >= 0 ? 1 : -1;
    f.facing = dir;
    let any = false;
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - sh.x;
      if (Math.hypot(dx, e.cy - sh.y) > R + e.w / 2 || dx * dir < -10) continue;
      f.hitCd.set(e.id, this.time + 0.5);
      if (this.damage(e, PAN.dmg * f.dmgMult, f, dir * 380, -320, 'fling') && e.alive) {
        e.stun = Math.max(e.stun, PAN.stun);
        this.text(e.x, e.y - e.h - 36, 'BONK!', '#ffeb3b', 30);
      }
      any = true;
    }
    if (!any) this.play('throw');
  }

  /** Bubble Wand: trapped enemies float up, then the bubble pops. */
  private updateBubbles(dt: number) {
    for (const b of this.bodies()) {
      if (b.bubbleT <= 0) continue;
      b.bubbleT -= dt;
      if (!b.alive) {
        b.bubbleT = 0;
        continue;
      }
      b.stun = Math.max(b.stun, 0.4);
      b.vx *= Math.max(0, 1 - 3 * dt);
      b.vy = -150;
      b.onGround = false;
      if (b.bubbleT > 0) continue;
      b.bubbleT = 0;
      this.burst(b.x, b.cy, '#b3e5fc', 16, 320);
      this.text(b.x, b.y - b.h - 30, 'POP!', '#e1f5fe', 26);
      this.play('glass');
      this.damage(b, BUBBLE.dmg, b.bubbleSrc, 0, -250, 'ragdoll');
    }
  }

  // ---------- the Pigeon ----------

  /** Where the Pigeon hovers: high over the middle, drifting side to side. */
  private pigeonHome(f: Fighter) {
    const top = Math.min(...this.map.platforms.map((p) => p.y), this.map.h * 0.6);
    return { x: this.map.w / 2 + Math.sin(this.time * 0.45 + f.id) * this.map.w * 0.33, y: top - 160 };
  }

  /** The Pigeon flies, dives at one enemy at a time and KOs it with one peck. */
  private updatePigeon(f: Fighter, dt: number) {
    f.onGround = false;
    f.stun = 0;
    f.frozenT = 0;
    f.bubbleT = 0;
    if (this.cut) return;
    let tx = 0;
    let ty = 0;
    let speed = 420;
    if (f.pigeonState === 'hover') {
      const home = this.pigeonHome(f);
      tx = home.x;
      ty = home.y;
      f.pigeonT -= dt;
      if (f.pigeonT <= 0) {
        // Pick someone to peck (one at a time).
        const prey = this.bodies().filter((e) => e.alive && e.team !== f.team && !(e instanceof Fighter && e.boss));
        const fighters = prey.filter((e) => e instanceof Fighter);
        const pool = fighters.length ? fighters : prey;
        if (pool.length) {
          f.pigeonTarget = pool[Math.floor(Math.random() * pool.length)];
          f.pigeonState = 'dive';
          f.pigeonT = PIGEON.giveUp;
          this.text(f.x, f.y - f.h - 20, 'COO!', '#ffffff', 28);
          this.play('jump');
        } else f.pigeonT = 0.5;
      }
    } else if (f.pigeonState === 'dive') {
      const t = f.pigeonTarget;
      f.pigeonT -= dt;
      if (!t || !t.alive || f.pigeonT <= 0) {
        f.pigeonState = 'up';
      } else {
        tx = t.x;
        ty = t.y + 10;
        speed = PIGEON.diveSpeed;
        // Peck! (the beak is at the front of the bird)
        const bx = f.x + f.facing * f.w * 0.42;
        const by = f.y - f.h * 0.45;
        if (Math.hypot(t.x - bx, t.cy - by) < t.w / 2 + 46 || t.contains(bx, by, 20)) {
          this.text(t.x, t.y - t.h - 40, 'PECK!', '#ffeb3b', 32);
          this.burst(t.x, t.cy, '#eceff1', 14, 360);
          this.damage(t, Math.max(1, t.hp) * 100 + 99999, f, f.facing * 900, -900, 'fling');
          f.pigeonState = 'up';
        }
      }
    }
    if (f.pigeonState === 'up') {
      const home = this.pigeonHome(f);
      tx = home.x;
      ty = home.y;
      speed = 700;
      if (Math.hypot(home.x - f.x, home.y - f.y) < 90) {
        f.pigeonState = 'hover';
        f.pigeonT = PIGEON.diveEvery;
      }
    }
    // Fly toward (tx, ty).
    const dx = tx - f.x;
    const dy = ty - f.y;
    const d = Math.hypot(dx, dy) || 1;
    const want = Math.min(speed, d * 3);
    const k = Math.min(1, (f.pigeonState === 'dive' ? 7 : 3) * dt);
    f.vx += ((dx / d) * want - f.vx) * k;
    f.vy += ((dy / d) * want - f.vy) * k;
    f.x = clamp(f.x + f.vx * dt, -200, this.map.w + 200);
    f.y = clamp(f.y + f.vy * dt, -600, this.map.h + 100);
    if (Math.abs(f.vx) > 20) f.facing = sign(f.vx);
    f.walkPhase += dt * (f.pigeonState === 'dive' ? 22 : 12);
  }

  // ---------- the secret bosses ----------

  /** Ice Shard: three icy shards in a spread. Each does 40 and slows you down. */
  private iceShards(f: Fighter, slot: number, angle: number) {
    const sh = f.shoulder();
    for (const spread of [-0.14, 0, 0.14]) this.spawnProj('shard', f, sh.x + Math.cos(angle) * 60, sh.y + Math.sin(angle) * 60, angle + spread, 1250, 0, QUEEN.shard * (f.dmgMult / 1.5), slot);
    this.burst(sh.x, sh.y, '#b3e5fc', 14, 300);
    this.play('shard');
  }

  /** Blizzard: a warning, then the whole screen freezes: 25 damage every second for 5 seconds. */
  private startBlizzard(f: Fighter) {
    this.blizzard = { warn: QUEEN.warnS, t: QUEEN.blizzardS, tick: 0, owner: f };
    this.say('capBlizzard', -1, QUEEN.warnS + 0.6);
    this.text(f.x, f.y - f.h - 30, '❄️❄️❄️', '#e1f5fe', 34);
    this.play('chime');
  }

  private updateBlizzard(dt: number) {
    const bz = this.blizzard;
    if (!bz) return;
    if (bz.warn > 0) {
      bz.warn -= dt;
      return;
    }
    bz.t -= dt;
    bz.tick -= dt;
    const owner = bz.owner;
    if (bz.t <= 0 || !owner || !owner.alive) {
      this.blizzard = null;
      return;
    }
    if (bz.tick > 0) return;
    bz.tick = 1;
    this.play('wind');
    for (const e of this.bodies()) {
      if (!e.alive || e.team === owner.team) continue;
      this.damage(e, QUEEN.blizzard * (owner.dmgMult / 1.5), owner, e.vx * 0.6, 0, 'shatter');
      if (e.alive) this.burst(e.x, e.cy, '#e1f5fe', 4, 160);
    }
  }

  /** Wave Crash: two huge waves roll out both ways: 60 damage and a big knockback. */
  private waveCrash(f: Fighter, slot: number) {
    for (const d of [-1, 1]) {
      this.spawnProj('crash', f, f.x + d * 70, f.y - 60, d > 0 ? 0 : Math.PI, 820, 0, TIDE.crash * (f.dmgMult / 1.5), slot);
      this.projectiles[this.projectiles.length - 1].dir = d;
    }
    this.ring(f.x, f.y, 180, 0.5, '#0288d1');
    this.burst(f.x, f.y - 20, '#4fc3f7', 30, 480);
    this.shake = Math.min(18, this.shake + 8);
    this.text(f.x, f.y - f.h - 30, '🌊🌊', '#4fc3f7', 36);
    this.play('splash');
  }

  /** Water Jet: a beam that follows its target and hits again and again. */
  private waterJet(f: Fighter, angle: number) {
    f.jetT = TIDE.jetS;
    f.jetAngle = angle;
    f.jetTick = 0.3;
    this.play('splash');
  }

  private updateJet(f: Fighter, dt: number) {
    f.jetT -= dt;
    f.jetTick -= dt;
    // Turns slowly toward the closest enemy, so you can outrun it.
    const t = nearestEnemy(this, f, TIDE.jetLen + 200);
    const sh = f.shoulder();
    if (t) f.jetAngle += clamp(wrap(Math.atan2(t.cy - sh.y, t.x - f.x) - f.jetAngle), -1.1 * dt, 1.1 * dt);
    f.angles[0] = f.jetAngle;
    f.angVel[0] = 0;
    f.facing = Math.cos(f.jetAngle) >= 0 ? 1 : -1;
    if (f.jetTick > 0) return;
    f.jetTick = TIDE.jetEvery;
    const cos = Math.cos(f.jetAngle);
    const sin = Math.sin(f.jetAngle);
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - sh.x;
      const dy = e.cy - sh.y;
      const along = dx * cos + dy * sin;
      if (along < 0 || along > TIDE.jetLen) continue;
      if (Math.abs(-dx * sin + dy * cos) > e.w / 2 + 22) continue;
      this.damage(e, TIDE.jet * (f.dmgMult / 1.5), f, cos * 380, Math.min(-120, sin * 380), 'ragdoll');
      this.burst(e.x, e.cy, '#81d4fa', 5, 200);
    }
  }

  /** Vine Whip: a long vine lashes out and hits everyone along it for 50. */
  private vineWhip(f: Fighter, slot: number, angle: number) {
    const h = f.hand(slot);
    this.spawnProj('vine', f, h.x, h.y, angle, 2100, 0, GUARDIAN.vine * (f.dmgMult / 1.5), slot);
    this.burst(h.x, h.y, '#7cb342', 10, 260);
    this.play('whip');
  }

  /** Root Trap: roots grab every enemy close by: a hit, slowed down, and damage over time. */
  private rootTrap(f: Fighter) {
    this.text(f.x, f.y - f.h - 30, '🌿', '#9ccc65', 34);
    this.ring(f.x, f.y, 400, 0.5, '#7cb342');
    this.play('roots');
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team || Math.hypot(e.x - f.x, e.y - f.y) > 1000) continue;
      this.burst(e.x, e.y, '#6d4c41', 10, 260);
      this.burst(e.x, e.y, '#7cb342', 8, 220);
      if (!this.damage(e, GUARDIAN.root * (f.dmgMult / 1.5), f, 0, -200, 'ragdoll') || !e.alive) continue;
      e.slowT = Math.max(e.slowT, GUARDIAN.rootS);
      this.setPoison(e, f);
    }
  }

  /** Leaf Storm: sharp leaves swirl around the Guardian and cut anyone close. */
  private leafStorm(f: Fighter) {
    f.leafT = GUARDIAN.leafS;
    f.leafTick = 0.2;
    this.text(f.x, f.y - f.h - 30, '🍃🍃🍃', '#9ccc65', 34);
    this.play('wind');
  }

  private updateLeaves(f: Fighter, dt: number) {
    f.leafT -= dt;
    f.leafTick -= dt;
    if (f.leafTick > 0) return;
    f.leafTick = GUARDIAN.leafEvery;
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - f.x;
      if (Math.hypot(dx, e.cy - f.cy) > GUARDIAN.leafR + e.w / 2) continue;
      this.damage(e, GUARDIAN.leaf * (f.dmgMult / 1.5), f, (sign(dx) || 1) * 420, -300, 'ragdoll');
      this.burst(e.x, e.cy, '#9ccc65', 5, 220);
    }
  }

  /** Summoner: one Stick Brawl ally of this kind per owner (the Snowman or the Fire Ally), until it's beaten. */
  summonOne(f: Fighter, variant: CatVariant, hp: number, dmg: number, dx: number) {
    if (this.cats.some((c) => c.alive && c.owner === f && c.variant === variant)) return;
    const x = clamp(f.x + dx, 0, this.map.w);
    const c = new Cat(f, x, f.y - 6, hp, dmg, variant);
    c.vy = -450;
    this.cats.push(c);
    const look = { sbsnow: ['#eafbff', '⛄!'], retro: ['#9e9e9e', '🔪!'], zombie: ['#7cb342', '🧟!'], babyele: ['#b0bec5', '🐘!'], penguin: ['#e1f5fe', '🐧!'], knight: ['#cfd8dc', '🛡️!'], frog: ['#a5d6a7', '🐸!'], ghost: ['#ffffff', '👻!'] }[variant as string] ?? ['#ff7a1a', '🔥!'];
    this.burst(x, f.y - 40, look[0], 14, 300);
    this.text(x, f.y - 130, look[1], '#ffffff', 26);
  }

  /** Summoner: the red guy from WORST Stickman Fighter. If yours is frozen, it comes back to life with full HP instead. */
  summonRedGuy(f: Fighter) {
    const mine = this.cats.find((c) => c.owner === f && c.variant === 'redguy');
    if (mine?.alive) return;
    if (mine) {
      mine.alive = true;
      mine.frozen = false;
      mine.hp = mine.maxHp;
      mine.vy = -300;
      mine.bumpCd.clear();
      this.burst(mine.x, mine.cy, '#ff6666', 12, 260);
      this.text(mine.x, mine.y - 60, '❤️', '#ff6666', 22);
      return;
    }
    const x = clamp(f.x + (f.x < this.map.w / 2 ? 40 : -40), 0, this.map.w);
    const c = new Cat(f, x, f.y - 6, RED_GUY.hp, RED_GUY.bump, 'redguy');
    c.vy = -400;
    this.cats.push(c);
    this.burst(x, f.y - 20, '#ff6666', 10, 240);
  }

  /** Lord of the Chicks: the Chicken and 20 chicks charge to the edge of the platform, then stay and fight. */
  private lordOfTheChicks(f: Fighter) {
    const dir = f.facing || 1;
    this.summonChicken(f, dir);
    this.callChicks(f, LORD_CHICKS, dir);
    this.ring(f.x, f.y, 140, 0.5, '#ffd600');
    this.text(f.x, f.y - f.h - 56, '🐔 CHARGE! 🐥', '#ffd600', 26);
  }

  /** The Chicken: one per fighter. If yours is still around it just joins the charge. */
  private summonChicken(f: Fighter, charge: number) {
    const mine = this.cats.find((c) => c.alive && c.owner === f && c.variant === 'chicken');
    if (mine) {
      if (charge) {
        mine.chargeDir = charge;
        mine.chargeT = 4;
      }
      return;
    }
    const x = clamp(f.x + (charge || (f.x < this.map.w / 2 ? 1 : -1)) * 50, 0, this.map.w);
    const c = new Cat(f, x, f.y - 6, CHICKEN.hp, CHICKEN.dmg, 'chicken');
    c.vy = -420;
    c.chargeDir = charge;
    c.chargeT = 4;
    this.cats.push(c);
    this.burst(x, f.y - 30, '#ffffff', 12, 260);
    this.text(x, f.y - 90, '🐔!', '#ff5252', 26);
  }

  /** Chicks hatch around (x, y), up to MAX_CHICKS per fighter. `charge` = they run that way to the platform's edge. */
  callChicks(f: Fighter, n: number, charge: number, mom?: Cat) {
    const x = mom ? mom.x : f.x;
    const y = mom ? mom.y : f.y;
    const have = this.cats.filter((c) => c.alive && c.owner === f && c.variant === 'chick').length;
    n = Math.min(n, MAX_CHICKS - have);
    for (let k = 0; k < n; k++) {
      const cx = clamp(x + (k - (n - 1) / 2) * 12, 0, this.map.w);
      const c = new Cat(f, cx, y - 6, CHICK.hp, CHICK.dmg, 'chick');
      c.vy = -380 - Math.random() * 260;
      c.vx = (Math.random() - 0.5) * 200;
      c.chargeDir = charge;
      c.chargeT = 4;
      c.thinkT = Math.random() * 0.3;
      // A Sandbox Chicken's chicks are on its team.
      if (mom) {
        c.team = mom.team;
        c.color = mom.color;
      }
      this.cats.push(c);
    }
    if (n > 0) {
      this.burst(x, y - 14, '#fff176', Math.min(20, 4 + n), 220);
      this.text(x, y - 60, `🐥 ×${n}`, '#ffee58', 24);
    }
  }

  /** The Chicken calls 3 more chicks every 3 seconds. */
  chickenCall(c: Cat) {
    this.callChicks(c.owner, CHICKEN.call, 0, c);
  }

  /** One Little Pigeon: one per fighter. */
  private summonLilPigeon(f: Fighter, loud: boolean) {
    if (this.cats.some((c) => c.alive && c.owner === f && c.variant === 'lilpigeon')) {
      if (loud) this.text(f.x, f.y - f.h - 20, '🐦 1/1', '#ffffff', 22);
      return;
    }
    const x = clamp(f.x + (f.x < this.map.w / 2 ? 1 : -1) * 70, 0, this.map.w);
    const c = new Cat(f, x, f.y - 30, LIL_PIGEON.hp, LIL_PIGEON.dmg, 'lilpigeon');
    c.vy = -500;
    this.cats.push(c);
    this.burst(x, f.y - 40, '#b0bec5', 12, 260);
    this.text(x, f.y - 100, '🐦 coo!', '#cfd8dc', 24);
  }

  /** Bone: 2 skeletons and the dog. A pile of bones (or a sleeping dog) comes back to life with full HP. */
  private summonBones(f: Fighter, loud: boolean) {
    const inward = f.x < this.map.w / 2 ? 1 : -1;
    let any = false;
    for (let k = 0; k < SKELETON.count; k++) any = this.reviveOrSummon(f, 'skeleton', SKELETON.count, SKELETON.hp, SKELETON.dmg, inward * (40 + k * 45)) || any;
    any = this.reviveOrSummon(f, 'dog', 1, DOG.hp, DOG.dmg, inward * 140) || any;
    if (!any && loud) this.text(f.x, f.y - f.h - 20, '💀 2/2 🐕 1/1', '#ffffff', 22);
  }

  /** Bring back one of yours that went down (bones or asleep), or add a new one, while fewer than `max` are up. */
  private reviveOrSummon(f: Fighter, variant: CatVariant, max: number, hp: number, dmg: number, dx: number): boolean {
    const mine = this.cats.filter((c) => c.owner === f && c.variant === variant);
    if (mine.filter((c) => c.alive).length >= max) return false;
    const down = mine.find((c) => !c.alive && c.frozen);
    if (down) {
      down.alive = true;
      down.frozen = false;
      down.hp = down.maxHp;
      down.vy = -300;
      down.attackT = 0;
      this.burst(down.x, down.cy, variant === 'dog' ? '#80deea' : '#eeeeee', 12, 260);
      this.text(down.x, down.y - down.h - 20, variant === 'dog' ? '🐕 WOOF!' : '💀 rattle!', '#ffffff', 22);
      return true;
    }
    const x = clamp(f.x + dx, 0, this.map.w);
    const c = new Cat(f, x, f.y - 6, hp, dmg, variant);
    c.vy = -420;
    this.cats.push(c);
    this.burst(x, f.y - 30, variant === 'dog' ? '#80deea' : '#eeeeee', 12, 260);
    this.text(x, f.y - (variant === 'dog' ? 70 : 120), variant === 'dog' ? '🐕!' : '💀!', '#ffffff', 24);
    return true;
  }

  /** A charging chick or Chicken runs into an enemy: it gets bowled over (the charge keeps going). */
  chargeHit(c: Cat, e: Body) {
    c.bumpCd.set(e.id, this.time + 0.5);
    this.damage(e, c.touchDmg, c, c.chargeDir * (c.variant === 'chicken' ? 700 : 420), -360, 'fling');
  }

  /** The red guy bumps an enemy: 10 damage, and they bounce off each other. */
  redBump(c: Cat, e: Body) {
    c.bumpCd.set(e.id, this.time + RED_GUY.every);
    const dir = sign(e.x - c.x) || c.facing;
    this.damage(e, c.touchDmg, c, dir * 330, -200, 'fling');
    c.vx = -dir * 320;
    c.vy = Math.min(c.vy, -300);
    c.onGround = false;
  }

  /** Recall Memory: the purple boss ally appears next to you and fights for 20 seconds. */
  private summonMemory(f: Fighter): Cat {
    const x = f.x + f.facing * 50;
    const c = new Cat(f, x, f.y - 4, MEMORY_ALLY.hp, MEMORY_ALLY.dmg, 'memory');
    c.vy = -300;
    this.cats.push(c);
    this.burst(x, f.y - 60, '#b388ff', 24, 360);
    this.ring(x, f.y, 90, 0.5, '#b388ff');
    this.text(x, f.y - 160, '💭!', '#b388ff', 30);
    this.play('snowman');
    return c;
  }

  /** Magnet: pulls every enemy close by toward you, with a little damage. */
  private magnet(f: Fighter) {
    const R = 480 * f.scale;
    this.ring(f.x, f.cy, R, 0.4, '#e53935');
    this.burst(f.x, f.cy, '#90a4ae', 12, 260);
    this.play('throw');
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - f.x;
      if (Math.hypot(dx, e.cy - f.cy) > R) continue;
      this.damage(e, 15 * f.dmgMult, f, -(sign(dx) || 1) * Math.min(900, 300 + Math.abs(dx) * 1.6), -350, 'ragdoll');
    }
  }

  /** Buffalo: Horn Charge hits everyone it runs into; Head Butt hits twice. */
  private updateBuffalo(f: Fighter, dt: number) {
    if (f.dashT > 0) {
      if (f.onGround && Math.random() < 0.5) this.burst(f.x - f.facing * f.w * 0.4, f.y, '#a1887f', 2, 140);
      this.breakGlassAt(f.x + f.facing * f.w * 0.5, f.cy, 30, f);
      this.buffaloHit(f, f.w / 2 + 30, BUFFALO.charge, 1100, 0.8);
    }
    if (f.buttN > 0) {
      f.buttT -= dt;
      if (f.buttT <= 0) {
        f.buttN--;
        f.buttT = 0.55;
        f.buttAnim = 0.35;
        f.vx = f.facing * 650;
        f.hitCd.clear();
        this.buffaloHit(f, f.w / 2 + 90, BUFFALO.butt, 900, 0.3);
        this.burst(f.x + f.facing * f.w * 0.55, f.y - f.h * 0.5, '#ffffff', 10, 260);
        this.play('hit');
      }
    }
  }

  /** Hit enemies in front of Buffalo (within `reach` of its middle). */
  private buffaloHit(f: Fighter, reach: number, dmg: number, push: number, again: number) {
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - f.x;
      if (Math.abs(dx) > reach + e.w / 2 || (sign(dx) || f.facing) !== f.facing) continue;
      if (e.y < f.y - f.h - 20 || e.y - e.h > f.y + 10) continue;
      if ((f.hitCd.get(e.id) ?? 0) > this.time) continue;
      f.hitCd.set(e.id, this.time + again);
      this.damage(e, dmg * (f.dmgMult / 1.5), f, f.facing * push, -800, 'fling');
    }
  }

  /** The Fishy boss: two waves roll out both ways and push everyone away (no damage). */
  private tidalWaves(f: Fighter, slot: number) {
    for (const d of [-1, 1]) {
      this.spawnProj('wave', f, f.x + d * 60, f.y - 45, d > 0 ? 0 : Math.PI, 760, 0, 0, slot);
      this.projectiles[this.projectiles.length - 1].dir = d;
    }
    this.ring(f.x, f.y, 140 * f.scale, 0.5, '#4fc3f7');
    this.burst(f.x, f.y - 20, '#81d4fa', 24, 420);
    this.text(f.x, f.y - f.h - 30, '🌊', '#4fc3f7', 34);
  }

  /** The Fishy boss: Trident Strike for 99, and half the time lightning for 30 more. */
  private tridentStrike(f: Fighter, slot: number) {
    // A player's trident is just as strong as the Fishy boss's.
    const boss = f.boss ? f.dmgMult / 1.5 : 1;
    const t = nearestEnemy(this, f, f.boss ? 700 * (f.scale / 2.6) : 700);
    f.thrustT = 0.4;
    f.thrustSlot = slot;
    if (!t) {
      f.thrustAngle = f.facing > 0 ? 0 : Math.PI;
      return;
    }
    f.facing = sign(t.x - f.x) || f.facing;
    f.thrustAngle = Math.atan2(t.cy - f.shoulder().y, t.x - f.x);
    this.burst(t.x, t.cy, '#ffd54f', 14, 320);
    this.damage(t, FISHY.strike * boss, f, f.facing * 600, -600, 'ragdoll');
    if (Math.random() < 0.5 && t.alive) {
      this.lightning(t);
      this.damage(t, FISHY.lightning * boss, f, f.facing * 300, -500, 'zap');
    }
  }

  /** The Mascot hurts everyone who touches it. */
  private mascotTouch(f: Fighter) {
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      if (Math.abs(e.x - f.x) > (f.w + e.w) / 2 || e.y < f.y - f.h || e.y - e.h > f.y) continue;
      if ((f.hitCd.get(-e.id) ?? 0) > this.time) continue;
      f.hitCd.set(-e.id, this.time + 0.8);
      this.damage(e, MASCOT_TOUCH, f, (sign(e.x - f.x) || 1) * 650, -500, 'ragdoll');
    }
  }

  /** Thunder Hammer: lightning strikes the nearest enemy and shocks anyone close to it. */
  private thunder(f: Fighter) {
    const t = nearestEnemy(this, f, 750 * f.scale);
    if (!t) {
      this.text(f.x, f.y - f.h - 20, '⚡?', '#fff176', 22);
      return;
    }
    const top = Math.min(t.y - 700, this.cam.y - 600);
    this.bolts.push({ x1: t.x, y1: top, x2: t.x, y2: t.cy, life: 0.3 });
    if (this.record) this.events.push(['z', Math.round(t.x), Math.round(top), Math.round(t.x), Math.round(t.cy)]);
    this.burst(t.x, t.cy, '#fff176', 18, 420);
    this.shake = Math.min(18, this.shake + 10);
    this.play('boom');
    const m = f.dmgMult;
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      if (e === t) this.damage(e, 70 * m, f, (sign(e.x - f.x) || 1) * 300, -500, 'zap');
      else if (Math.hypot(e.x - t.x, e.cy - t.cy) < 110) this.damage(e, 35 * m, f, (sign(e.x - t.x) || 1) * 300, -400, 'zap');
    }
  }

  /** Lightning Whip: crack it and lightning jumps to the nearest enemy close by (45). */
  private whipCrack(f: Fighter) {
    const t = nearestEnemy(this, f, 480 * f.scale);
    const sh = f.shoulder();
    this.play('throw');
    if (!t) {
      this.text(f.x, f.y - f.h - 20, '⚡', '#fff176', 22);
      return;
    }
    this.bolts.push({ x1: sh.x, y1: sh.y, x2: t.x, y2: t.cy, life: 0.25 });
    if (this.record) this.events.push(['z', Math.round(sh.x), Math.round(sh.y), Math.round(t.x), Math.round(t.cy)]);
    this.burst(t.x, t.cy, '#fff176', 12, 320);
    this.damage(t, 45 * f.dmgMult, f, (sign(t.x - f.x) || 1) * 380, -380, 'zap');
    if (t.alive) t.stun = Math.max(t.stun, 0.5);
  }

  private dropPotion(x: number, y: number) {
    this.potions.push({ id: this.potionId++, x, y, vy: -400, life: POTION_LIFE });
  }

  private updatePotions(dt: number) {
    if (!this.potionsOn) return;
    this.potionClock -= dt;
    if (this.potionClock <= 0) {
      this.potionClock = POTION_EVERY;
      const safe = this.map.platforms.filter((p, i) => p.kind !== 'lava' && this.solid(i) && p.w >= 60);
      if (safe.length && Math.random() < POTION_CHANCE) {
        const p = safe[Math.floor(Math.random() * safe.length)];
        this.potions.push({ id: this.potionId++, x: p.x + 20 + Math.random() * (p.w - 40), y: Math.min(-100, this.cam.y - 700), vy: 0, life: POTION_LIFE + 5 });
      }
    }
    for (const po of this.potions) {
      po.life -= dt;
      const prevY = po.y;
      po.vy = Math.min(po.vy + this.gravity * 0.6 * dt, 900);
      po.y += po.vy * dt;
      if (po.vy >= 0) {
        this.map.platforms.forEach((p, i) => {
          if (!this.solid(i) || po.x < p.x || po.x > p.x + p.w) return;
          if (prevY <= p.y + 2 && po.y >= p.y) {
            po.y = p.y;
            po.vy = 0;
          }
        });
      }
      if (po.y > this.map.h + 400) po.life = 0;
      if (po.life <= 0) continue;
      for (const f of this.fighters) {
        if (!f.alive || f.boss || f.hp >= f.maxHp || !f.contains(po.x, po.y - 14, 14)) continue;
        const heal = Math.min(f.maxHp - f.hp, Math.round(f.maxHp * POTION_HEAL));
        f.hp += heal;
        this.text(f.x, f.y - f.h - 20, `+${heal}`, '#69f0ae', 26);
        this.burst(po.x, po.y - 14, '#69f0ae', 14, 260);
        this.play('coin');
        po.life = 0;
        break;
      }
    }
    this.potions = this.potions.filter((p) => p.life > 0);
  }

  /** Banana peels on the ground: enemies who step on one slip. */
  private updatePeels(dt: number) {
    const bodies = this.bodies();
    for (const pe of this.peels) {
      pe.life -= dt;
      if (pe.life <= 0) continue;
      for (const e of bodies) {
        if (!e.alive || e.team === pe.team || !e.onGround || !e.contains(pe.x, pe.y - 6, 10)) continue;
        this.slip(e, pe.owner, 30, sign(e.vx) || 1);
        pe.life = 0;
        break;
      }
    }
    this.peels = this.peels.filter((p) => p.life > 0);
  }

  private slip(e: Body, by: Body, dmg: number, dir: number) {
    this.damage(e, dmg, by, dir * 500, -750, 'slip');
    if (e.alive) e.stun = Math.max(e.stun, 0.9);
    this.text(e.x, e.y - e.h - 30, '🍌', '#fdd835', 26);
  }

  /** Sud Gang Som: throw a splash of yellow gang som soup. */
  private throwSoup(f: Fighter, slot: number, x: number, y: number, angle: number, dmg: number, burn: number) {
    this.spawnProj('soup', f, x, y, angle, 850, 1400, dmg, slot);
    this.projectiles[this.projectiles.length - 1].burnDmg = burn;
  }

  /** Summoner's Clone: one at a time. It looks just like you (name, hat and color). */
  private summonClone(f: Fighter, sandbox = false) {
    // Sandbox may add more than one Clone of the same fighter.
    if (!sandbox && (f.cloneOf || this.fighters.some((c) => c.alive && c.cloneOf === f))) return;
    const pool = SHOP_WEAPONS.filter((w) => !SUMMON_WEAPONS.includes(w.id));
    const c = this.addClone(f, pool[Math.floor(Math.random() * pool.length)].id);
    c.brain = new BotBrain('hard');
    c.vy = -500;
    this.ring(c.x, c.y, 90, 0.5, f.color);
    this.burst(c.x, c.cy, f.color, 18, 320);
    this.text(c.x, c.y - c.h - 30, '👥!', '#ffffff', 28);
  }

  /** Add a Clone of `owner` holding `wid` (also used on joining devices to match the host). */
  addClone(owner: Fighter, wid: WeaponId): Fighter {
    const c = new Fighter({
      name: owner.name,
      color: owner.color,
      team: owner.team,
      human: false,
      weapons: [weapon(wid)],
      x: clamp(owner.x + owner.facing * 50, 0, this.map.w),
      y: owner.y - 4,
      hat: owner.hat,
      cloneOf: owner,
    });
    c.facing = owner.facing;
    this.fighters.push(c);
    return c;
  }

  /** A Clone goes down: it blows up and hits every enemy close by for 20. */
  private cloneBoom(c: Fighter) {
    this.ring(c.x, c.cy, CLONE.boomR, 0.4, '#ff9800');
    this.burst(c.x, c.cy, '#ff9800', 22, 520);
    this.burst(c.x, c.cy, '#ffeb3b', 14, 380);
    this.text(c.x, c.y - c.h - 50, 'BOOM!', '#ff9800', 30);
    this.shake = Math.min(18, this.shake + 6);
    this.play('boom');
    for (const e of this.bodies()) {
      if (!e.alive || e.team === c.team) continue;
      const dx = e.x - c.x;
      if (Math.hypot(dx, e.cy - c.cy) > CLONE.boomR + e.w / 2) continue;
      this.damage(e, CLONE.boom, c, (sign(dx) || 1) * 500, -400, 'fling');
    }
  }

  /** What a helper leaves behind: a cat's grave, a cooked fish, a soldier's ragdoll, or the Recall Memory boss fading away. */
  helperRemains(c: Cat) {
    const corpse = helperCorpse(c);
    if (corpse) this.corpses.push(corpse);
    this.burst(c.x, c.cy, c.variant === 'memory' ? '#b388ff' : c.color, 8, 220, false);
  }

  /** Call Cat AI: little cats appear around the caller. */
  callCats(f: Fighter, o: { count: number; hp: number; dmg: number; max: number }, variant: CatVariant = 'cat') {
    const icon = variant === 'fish' ? '🐟' : variant === 'soldier' ? '💂' : variant === 'bee' ? '🐝' : variant === 'ninja' ? '🥷' : variant === 'drone' ? '🤖' : '🐱';
    const have = this.cats.filter((c) => c.alive && c.owner === f && c.variant === variant).length;
    const n = Math.min(o.count, o.max - have);
    if (n <= 0) {
      this.text(f.x, f.y - f.h - 20, `${icon} ${o.max}/${o.max}`, '#ffffff', 22);
      return;
    }
    for (let k = 0; k < n; k++) {
      const x = f.x + (k - (n - 1) / 2) * 44;
      const c = new Cat(f, x, f.y - (variant === 'bee' || variant === 'drone' ? 60 : 10), o.hp, o.dmg, variant);
      c.vy = -500 - Math.random() * 300;
      c.vx = (k - (n - 1) / 2) * 120;
      this.cats.push(c);
      this.burst(x, f.y - 20, '#ffcc80', 6, 220);
    }
    this.ring(f.x, f.y, 90 * f.scale, 0.4, variant === 'fish' ? '#4fc3f7' : variant === 'soldier' ? '#ffd54f' : '#ffb74d');
    this.text(f.x, f.y - f.h - 30, `${icon} ×${n}`, variant === 'fish' ? '#81d4fa' : '#ffcc80', 28);
    this.play('snowman');
  }

  /** A cat touched an enemy. */
  catBite(c: Cat, e: Body, dmg = c.touchDmg) {
    // The dog waits 8 seconds between bites; the little pigeon pecks about once a second; the Retro Stickguy's knife every 1.5 s.
    c.attackT = oct22AttackGap(c) ?? oct23AttackGap(c) ?? oct30AttackGap(c) ?? (c.variant === 'dog' ? DOG.every : c.variant === 'lilpigeon' ? LIL_PIGEON.every : c.variant === 'retro' ? RETRO.every : c.variant === 'zboss' || c.variant === 'zbig' || c.variant === 'babyele' ? 1.2 : 0.8);
    const dir = sign(e.x - c.x) || c.facing;
    c.facing = dir;
    const big =
      c.variant === 'memory' || c.variant === 'soldier' || c.variant === 'sbsnow' || c.variant === 'skeleton' || c.variant === 'dog' || c.variant === 'chicken' ||
      c.variant === 'retro' || c.variant === 'ninja' || c.variant === 'zbig' || c.variant === 'zboss' || c.variant === 'babyele' || c.variant === 'knight';
    this.damage(e, dmg, c, dir * (big ? 480 : 260), big ? -380 : -220, big ? 'ragdoll' : 'trip');
    oct23Bit(c, e);
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
      this.damage(e, p.dmg, p.owner, (sign(e.x - p.x) || 1) * 300, -300, 'ashes');
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
    const big = kind === 'boomerang' || kind === 'bomb' || kind === 'axe' || kind === 'fireball' || kind === 'six7' || kind === 'soup' || kind === 'hay';
    const r =
      { arrow: 5, snowball: 11, minisnow: 8, boomerang: 16, bomb: 11, axe: 22, shuriken: 8, laser: 6, fireball: 14, six7: 24, poop: 10, soup: 14, icebolt: 9, banana: 10, fireslash: 34, dart: 6, memorybox: 12, rocket: 10, wave: 60, shard: 10, crash: 80, vine: 14, nerf: 6, bullet67: 7, water: 7, bubble: 18, yoyo: 13, fishthrow: 14, allyfire: 12, egg: 10, gum: 11, crow: 14, hay: 34, goo: 10, sound: 40, pebble: 6, flame: 14, booger: 9, tennis: 9, pie: 13, ketchup: 7, popcorn: 7, plane: 12, slipper: 12, balloon: 12, plunger: 9, frisbee: 16, blanket: 22, magic: 10 }[kind] *
      (big || kind === 'fireslash' ? scale : 1);
    const life = { arrow: 2, snowball: 3, minisnow: 3, boomerang: 3.5, bomb: 1.5, axe: 3.5, shuriken: 2, laser: 0.7, fireball: 2, six7: 3.5, poop: 3, soup: 3, icebolt: 2, banana: 3, fireslash: 0.7, dart: 2, memorybox: 0.35, rocket: 2, wave: 1.7, shard: 1.6, crash: 1.9, vine: 0.42, nerf: 2, bullet67: 1.2, water: 0.9, bubble: 2.6, yoyo: 3.5, fishthrow: 3, allyfire: 2, egg: 2.5, gum: 2.5, crow: 3.5, hay: 2.4, goo: 2.5, sound: 0.45, pebble: 2, flame: 0.5, booger: 2.5, tennis: 3.5, pie: 2.5, ketchup: 1.2, popcorn: 1.5, plane: 2.2, slipper: 2.5, balloon: 2.5, plunger: 1.5, frisbee: 1.1, blanket: 2.5, magic: 1.6 }[kind];
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
    // A shot that hit nobody ends a Perfect Aim streak (once per shot).
    if (!p.settled && !p.hitAny && p.owner instanceof Fighter && p.kind !== 'snowball') p.owner.streak = 0;
    p.settled = true;
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
      if (p.kind === 'crow') steerCrow(this, p, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      for (const e of bodies) {
        if (!e.alive || e.team === p.team || p.hit.has(e.id) || !e.contains(p.x, p.y, p.r)) continue;
        const dir = sign(p.vx) || 1;
        p.hitAny = true;
        if (p.kind === 'boomerang' || p.kind === 'yoyo') {
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, dir * 450, -350, PROJ_FINISH[p.kind]);
          continue;
        }
        if (p.kind === 'axe' || p.kind === 'six7') {
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, dir * 600, -450, PROJ_FINISH[p.kind]);
          continue;
        }
        if (p.kind === 'wave') {
          // Tidal waves push you away but don't hurt.
          p.hit.add(e.id);
          if (e instanceof Fighter && e.shielding) {
            e.vx += (p.dir ?? dir) * 250;
            continue;
          }
          const heavy = e instanceof Fighter && e.boss;
          if (e instanceof Fighter && p.owner instanceof Fighter) {
            e.lastHitBy = p.owner;
            e.lastHitT = this.time;
          }
          e.vx = (p.dir ?? dir) * (heavy ? 300 : 720);
          e.vy = Math.min(e.vy, heavy ? -150 : -480);
          e.onGround = false;
          e.stun = Math.max(e.stun, heavy ? 0.05 : 0.4);
          this.burst(e.x, e.y - 10, '#81d4fa', 8, 240);
          continue;
        }
        if (p.kind === 'hay' || p.kind === 'sound') {
          // A rolling hay bale and a trumpet blast go through everyone in their way.
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, (p.dir ?? dir) * (p.kind === 'sound' ? TRUMPET.push : 900), -600, 'fling');
          this.burst(e.x, e.y - 10, p.kind === 'hay' ? '#e6c35c' : '#fff59d', 8, 240);
          continue;
        }
        if (p.kind === 'crash') {
          // Wave Crash goes through everyone: 60 and a huge knockback.
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, (p.dir ?? dir) * 1300, -750, 'fling');
          this.burst(e.x, e.y - 10, '#81d4fa', 10, 280);
          continue;
        }
        if (p.kind === 'vine') {
          // The vine lashes through everyone in its way.
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, dir * 650, -420, 'ragdoll');
          this.burst(e.x, e.cy, '#7cb342', 10, 260);
          continue;
        }
        if (p.kind === 'shard') {
          if (this.damage(e, p.dmg, p.owner, dir * 260, -200, 'shatter') && e.alive) {
            e.slowT = Math.max(e.slowT, QUEEN.slowS);
            this.text(e.x, e.y - e.h - 30, '🥶', '#b3e5fc', 24);
          }
          this.burst(p.x, p.y, '#e1f5fe', 12, 260);
          p.dead = true;
          break;
        }
        if (p.kind === 'fireslash') {
          // The air slash goes through everyone in its path and sets them on fire.
          p.hit.add(e.id);
          if (this.damage(e, p.dmg, p.owner, dir * 450, -350, PROJ_FINISH[p.kind]) && e.alive) this.setBurn(e, FIRE_SWORD.slashBurnS, FIRE_SWORD.slashBurn, p.owner);
          this.burst(e.x, e.cy, '#ff6d00', 10, 260);
          continue;
        }
        if (p.kind === 'flame') {
          // Flames go through everyone and set them on fire.
          p.hit.add(e.id);
          if (this.damage(e, p.dmg, p.owner, dir * 160, -120, PROJ_FINISH[p.kind]) && e.alive) this.setBurn(e, FLAME.burnS, FLAME.burn, p.owner);
          continue;
        }
        if (p.kind === 'laser') {
          // The beam goes through everyone in its way.
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, dir * 380, -220, PROJ_FINISH[p.kind]);
          this.burst(p.x, p.y, '#ff1744', 6, 220);
          continue;
        }
        if (pierces(p)) {
          // A frisbee flies through everyone in its way.
          p.hit.add(e.id);
          oct30Hit(this, p, e, dir);
          continue;
        }
        if (oct22Hit(this, p, e, dir) || oct23Hit(this, p, e, dir) || oct30Hit(this, p, e, dir)) {
          // Booger, tennis ball, pie, ketchup, popcorn and the October 30 shots (see oct22.ts, oct23.ts and oct30.ts).
        } else if (p.kind === 'fireball') this.explode(p, 120 * p.scale, true);
        else if (p.kind === 'bomb') this.explode(p);
        else if (p.kind === 'soup') this.splash(p);
        else if (p.kind === 'poop') {
          this.damage(e, p.dmg, p.owner, dir * 220, -200, PROJ_FINISH[p.kind]);
          this.burst(p.x, p.y, '#6d4c41', 10, 240);
        } else if (p.kind === 'icebolt') {
          this.damage(e, p.dmg, p.owner, dir * 200, -150, 'shatter');
          if (e.alive) e.frozenT = 1.2;
          this.burst(p.x, p.y, '#b3e5fc', 12, 260);
        } else if (p.kind === 'banana') this.slip(e, p.owner, p.dmg, dir);
        else if (p.kind === 'rocket') this.explode(p, 150 * p.scale);
        else if (p.kind === 'dart') {
          if (this.damage(e, p.dmg, p.owner, dir * 200, -150, PROJ_FINISH[p.kind]) && e.alive) this.setPoison(e, p.owner);
          this.burst(p.x, p.y, '#76ff03', 8, 200);
        } else if (p.kind === 'water') {
          // Water pushes hard.
          this.damage(e, p.dmg, p.owner, dir * WATER.push, -380, 'fling');
          this.burst(p.x, p.y, '#4fc3f7', 6, 200);
        } else if (p.kind === 'bubble') {
          // Trapped in a bubble: float up, then pop. Bosses are too big to float.
          this.burst(p.x, p.y, '#b3e5fc', 10, 220);
          if (e instanceof Fighter && e.boss) this.damage(e, p.dmg, p.owner, 0, 0, 'pop');
          else if (e.bubbleT <= 0) {
            e.bubbleT = BUBBLE.float;
            e.bubbleSrc = p.owner;
            this.text(e.x, e.y - e.h - 30, '🫧', '#e1f5fe', 28);
            if (e instanceof Fighter && p.owner instanceof Fighter) {
              e.lastHitBy = p.owner;
              e.lastHitT = this.time;
            }
          }
        } else if (p.kind === 'egg') {
          // SPLAT!
          this.damage(e, p.dmg, p.owner, dir * 260, -220, PROJ_FINISH[p.kind]);
          this.burst(p.x, p.y, '#fff59d', 10, 240);
          this.burst(p.x, p.y, '#ffffff', 6, 200);
          this.text(e.x, e.y - e.h - 30, 'SPLAT!', '#fff59d', 22);
        } else if (p.kind === 'gum') {
          // Sticky gum: slows them down for a while.
          if (this.damage(e, p.dmg, p.owner, dir * 120, -120, PROJ_FINISH[p.kind]) && e.alive) e.slowT = Math.max(e.slowT, GUM.slowS);
          this.burst(p.x, p.y, '#ff80ab', 10, 220);
        } else if (p.kind === 'crow') {
          this.damage(e, p.dmg, p.owner, dir * 300, -260, 'ragdoll');
          this.burst(p.x, p.y, '#212121', 10, 240);
          this.text(e.x, e.y - e.h - 30, 'CAW!', '#ffffff', 20);
        } else if (p.kind === 'goo') {
          // A shooter zombie's green goo: slows you down a little.
          if (this.damage(e, p.dmg, p.owner, dir * 200, -150, 'ragdoll') && e.alive) e.slowT = Math.max(e.slowT, 1.2);
          this.burst(p.x, p.y, '#76ff03', 10, 220);
        } else if (p.kind === 'allyfire') {
          // The Fire Ally's fireball: no burning.
          this.damage(e, p.dmg, p.owner, dir * 320, -260, PROJ_FINISH[p.kind]);
          this.burst(p.x, p.y, '#ff7a1a', 10, 240);
        } else if (p.kind === 'memorybox') {
          this.damage(e, p.dmg, p.owner, dir * 500, -350, PROJ_FINISH[p.kind]);
          this.burst(p.x, p.y, '#b388ff', 14, 300);
        } else {
          this.damage(e, p.dmg, p.owner, dir * (p.kind === 'arrow' ? 420 : 300), -260, PROJ_FINISH[p.kind]);
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
      else if (p.kind === 'wave' || p.kind === 'fireslash' || p.kind === 'crash' || p.kind === 'vine' || p.kind === 'shard' || p.kind === 'hay' || p.kind === 'sound' || p.kind === 'crow') {
        // Waves, air slashes, vines and ice shards go over and through platforms.
        if (p.kind === 'fireslash') this.breakGlassAt(p.x, p.y, p.r, p.owner);
      } else {
        for (const [pi, pl] of this.map.platforms.entries()) {
          if (!this.solid(pi)) continue;
          if (p.x < pl.x || p.x > pl.x + pl.w || p.y + p.r < pl.y || p.y - p.r > pl.y + pl.h) continue;
          // A skill shot breaks glass. Lasers and bombs keep going; everything else stops.
          if (pl.kind === 'glass' && p.owner instanceof Fighter) {
            this.breakGlassAt(p.x, p.y, p.r, p.owner);
            if (p.kind === 'laser' || p.kind === 'bomb') continue;
            if (p.kind === 'fireball') this.explode(p, 120 * p.scale, true);
            if (p.kind === 'rocket') this.explode(p, 150 * p.scale);
            if (p.kind === 'soup') this.splash(p);
            p.dead = true;
            break;
          }
          if (tennisBounce(p, pl) || oct23Splat(this, p, pl) || oct30Splat(this, p, pl)) break;
          if (p.kind === 'booger') {
            this.burst(p.x, Math.min(p.y, pl.y), '#9ccc65', 6, 160);
            p.dead = true;
            break;
          }
          if (p.kind === 'rocket') {
            this.explode(p, 150 * p.scale);
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
          if (p.kind === 'banana') {
            // Lands as a peel that stays for 8 seconds.
            if (p.vy > 0 && p.y < pl.y + 14 && p.owner instanceof Fighter) this.peels.push({ x: p.x, y: pl.y, owner: p.owner, team: p.team, life: 8 });
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
        if (p.kind === 'rocket') this.explode(p, 150 * p.scale);
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
      this.damage(e, p.dmg * (0.4 + 0.6 * k), p.owner, (dx / n) * 900 * (0.4 + k), -700 * (0.5 + k), PROJ_FINISH[p.kind]);
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
    // Hammer: 80 damage. The Mascot's stick slam: 299 (its reward stick: 120).
    const R = f.slamR || 230 * f.scale;
    const dmg = f.slamDmg || 80 * f.dmgMult;
    f.slamDmg = 0;
    f.slamR = 0;
    this.ring(f.x, f.y, R, 0.35, '#bcaaa4');
    this.burst(f.x, f.y, '#a1887f', 20, 420);
    this.shake = Math.min(18, this.shake + 12);
    this.play('boom');
    this.breakGlassAt(f.x, f.y, R * 0.6, f);
    for (const e of this.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - f.x;
      if (Math.abs(dx) > R + e.w / 2 || Math.abs(e.y - f.y) > 140 * f.scale) continue;
      this.damage(e, dmg, f, (sign(dx) || 1) * 700, -900, 'fling');
    }
  }

  // ---------- map edges ----------

  private checkOffMap() {
    const m = this.map;
    for (const b of this.bodies()) {
      if (!b.alive) continue;
      if (b.y < m.h + 300 && b.x > -700 && b.x < m.w + 700) continue;
      // Helpers (snowmen, cats, fish, soldiers, the Recall Memory boss) fall just like stickmen.
      if (b instanceof Fighter && b.boss) this.bounce(b, 250);
      else if (this.fallMode === 'ko') this.kill(b, null, 'void');
      else this.bounce(b, 25);
    }
  }

  /** Fell off: lose HP and get launched back up under the nearest platform. */
  private bounce(f: Body, dmg: number) {
    const np = nearestPlatform(this, clamp(f.x, 0, this.map.w), this.map.h);
    const px = np ? clamp(f.x, np.x + 30, np.x + np.w - 30) : this.map.w / 2;
    const py = np ? np.y : this.map.h / 2;
    f.x = px;
    f.y = this.map.h + 200;
    f.vx = 0;
    f.vy = -Math.sqrt(2 * this.gravity * (f.y - py + 170));
    f.stun = 0;
    f.hp -= dmg;
    if (f instanceof Fighter) {
      f.slamming = false;
      f.airJumps = 1;
      f.dmgTaken += dmg;
    }
    this.text(f.x, this.map.h - 40, `-${dmg}`, '#ff5252', 30);
    this.play('jump');
    if (f.hp <= 0) this.kill(f, null, 'void');
  }

  // ---------- end of match ----------

  private winnerTeam(): { decided: boolean; team: number | null } {
    const alive = this.fighters.filter((f) => f.alive);
    if (this.cut) return { decided: false, team: null };
    if (this.ob) return outbreakWinner(this);
    if (this.inf) return infectionWinner(this);
    if (this.hill) return hillWinner(this);
    if (this.race) return raceWinner(this);
    if (this.mode === 'stock') return stockWinner(this);
    if (this.rush) return rushWinner(this);
    if (this.fishPhase) {
      // Everyone against the Fishy boss first; then back to Free For All / Teams.
      if (!this.fish?.alive) {
        this.fishBeaten = true;
        this.endFishPhase();
      } else if (!alive.some((f) => !f.boss)) return { decided: true, team: BOSS_TEAM };
      else return { decided: false, team: null };
    }
    if (this.beach && this.fish && !this.fish.alive) this.fishBeaten = true;
    // Helpers that are still up (cats, snowmen, chicks...) keep their side in the match.
    // One Little Pigeon doesn't: with 250,000 HP a side left with only its pigeon would never lose.
    const helpers: Body[] = [...this.snowmen, ...this.cats].filter((h) => h.alive && !(h instanceof Cat && h.variant === 'lilpigeon'));
    if (isBossMode(this.mode)) {
      // Only the bosses you fight count (on the Beach the normal bosses were on your side).
      const bosses = this.bosses.filter((b) => b.team === BOSS_TEAM);
      if (bosses.length && bosses.every((b) => !b.alive) && !helpers.some((h) => h.team === BOSS_TEAM)) return { decided: true, team: 0 };
      if (!alive.some((f) => !f.boss) && !helpers.some((h) => h.team !== BOSS_TEAM)) return { decided: true, team: BOSS_TEAM };
      return { decided: false, team: null };
    }
    const teams = new Set([...alive, ...helpers].map((f) => f.team));
    if (teams.size <= 1) return { decided: true, team: teams.size ? [...teams][0] : null };
    return { decided: false, team: null };
  }

  /** One Little Pigeon never keeps its side in the match: once the match is decided, the ones on a losing side fly off. */
  private pigeonsFlyAway(winner: number | null) {
    for (const c of this.cats) {
      if (!c.alive || c.variant !== 'lilpigeon' || c.team === winner) continue;
      c.alive = false;
      c.hp = 0;
      this.burst(c.x, c.cy, '#cfd8dc', 12, 300);
      this.text(c.x, c.y - c.h - 20, '🐦💨', '#ffffff', 22);
    }
  }

  private checkWin() {
    if (this.over) return;
    const w = this.winnerTeam();
    if (!w.decided) {
      this.endT = -1;
      return;
    }
    // The battle is decided: a One Little Pigeon left on a losing side flies away, so it never looks like it is still fighting.
    this.pigeonsFlyAway(w.team);
    // The Outbreak ends right after its morning cutscene.
    if (this.endT < 0) {
      this.endT = this.time + (this.ob ? 0.2 : 1.6);
      // The last KO: a moment of slow motion.
      if (!this.ob) this.juice.finale();
    }
    if (this.time < this.endT) return;
    this.over = true;
    const winners = w.team === null ? [] : this.fighters.filter((f) => f.team === w.team && !f.boss && !f.cloneOf);
    this.result = {
      mode: this.mode,
      winnerTeam: w.team,
      winners: w.team === BOSS_TEAM ? this.fighters.filter((f) => f.boss && f.team === BOSS_TEAM) : winners,
      humanWon: winners.some((f) => f.human) && w.team !== BOSS_TEAM,
      hadHumans: this.fighters.some((f) => f.human),
      fish: this.fishBeaten,
      waveCleared: this.ob ? w.team === 0 : undefined,
    };
    if (!this.demo && this.result.humanWon) sfx.win();
    this.onOver?.(this.result);
  }

  // ---------- effects ----------

  /** `send` = false: only on this device (effects every device makes by itself). */
  burst(x: number, y: number, color: string, n: number, speed: number, send = true) {
    if (this.record && send) this.events.push(['b', Math.round(x), Math.round(y), color, n, speed]);
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
    for (const b of this.bolts) b.life -= dt;
    for (const tr of this.tracers) tr.life -= dt;
    this.tracers = this.tracers.filter((tr) => tr.life > 0);
    for (const f of this.feed) f.t -= dt;
    this.feed = this.feed.filter((f) => f.t > 0);
    this.bolts = this.bolts.filter((b) => b.life > 0);
    if (this.caption) {
      this.caption.t -= dt;
      if (this.caption.t <= 0) this.caption = null;
    }
    updateCorpses(this, dt);
    this.shake = Math.max(0, this.shake - 40 * dt);
  }

  // ---------- camera ----------

  updateCamera(dt: number) {
    const { w: vw, h: vh } = this.view;
    let list: Body[] = this.fighters.filter((f) => f.alive);
    // Stickman Infection's town is too big to see at once: follow this device's own stickmen.
    const mine = this.inf ? this.focus.map((i) => this.fighters[i]).filter((f) => f?.alive) : [];
    if (mine.length) list = mine;
    if (!list.length) list = this.snowmen;
    let minX: number, maxX: number, minY: number, maxY: number;
    if (list.length) {
      minX = Math.min(...list.map((b) => b.x - b.w));
      maxX = Math.max(...list.map((b) => b.x + b.w));
      minY = Math.min(...list.map((b) => b.y - b.h - 40));
      maxY = Math.max(...list.map((b) => b.y + 20));
      // King of the Hill: keep the zone on screen too.
      if (this.hill) {
        minX = Math.min(minX, this.hill.x - this.hill.w / 2);
        maxX = Math.max(maxX, this.hill.x + this.hill.w / 2);
        minY = Math.min(minY, this.hill.y - 220);
        maxY = Math.max(maxY, this.hill.y + 20);
      }
    } else {
      minX = 0;
      maxX = this.map.w;
      minY = 0;
      maxY = this.map.h;
    }
    // Following your own stickman in the big town: see more around you, so zombies don't come out of nowhere.
    const pad = mine.length ? 420 : 170;
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
