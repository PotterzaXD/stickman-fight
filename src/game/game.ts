import { BotBrain, nearestEnemy, nearestPlatform, updateCat, updateSnowman } from './ai';
import {
  Body,
  Cat,
  FISH_HP,
  Fighter,
  GRAVITY,
  MAX_SNOWMEN,
  MEMORY_ALLY,
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
import { MELEE_FINISH, PROJ_FINISH, makeCorpse, updateCorpses, type Corpse, type Finish } from './finish';
import { THEMES, pickSpawns } from './maps';
import { BEACH_MAP, BEACH_MODES, isBossMode, type BossKind, type Difficulty, type FallMode, type MapDef, type Mode, type SandboxBoss } from './types';
import { SHOP_WEAPONS, weapon } from './weapons';
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
}

export interface MatchResult {
  mode: Mode;
  winnerTeam: number | null;
  winners: Fighter[];
  humanWon: boolean;
  hadHumans: boolean;
  /** The Beach: the Fishy boss was beaten in this match. */
  fish: boolean;
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
  | ['z', number, number, number, number];

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
  /** Bodies left behind by death finishers. */
  corpses: Corpse[] = [];
  potions: Potion[] = [];
  peels: Peel[] = [];
  bolts: Bolt[] = [];
  potionsOn: boolean;
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

  constructor(map: MapDef, specs: FighterSpec[], opts: GameOpts) {
    this.map = map;
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
      const f = new Fighter({ name: s.name, color: s.color, team: s.team, human: s.human, weapons: [weapon(s.weapon)], x: sp.x, y: sp.y - 2, hp: s.hp });
      if (s.power) f.power = s.power / 100;
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
    // Sandbox: any bosses, on any team, with any HP.
    (opts.extraBosses ?? []).forEach((b, k) => {
      const f = this.addBoss(b.kind, names[b.kind] ?? b.kind, b.team, k, b.hp);
      if (b.power) f.power = b.power / 100;
    });
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
  }

  /** Put a boss on the k-th widest platform (Buffalo, the Fishy boss, and Sandbox bosses). */
  private addBoss(kind: BossKind, name: string, team: number, k: number, hp?: number): Fighter {
    const wide = [...this.map.platforms].filter((p) => p.kind !== 'lava').sort((p, q) => q.w - p.w);
    const top = wide.length ? wide[k % wide.length] : null;
    const weapons =
      kind === 'cat' ? ['soup', 'catcall'] : kind === 'mascot' ? ['stick'] : kind === 'buffalo' ? ['horns', 'headbutt'] : kind === 'fish' ? ['trident'] : randomBossWeapons();
    const color = { boss: '#263238', cat: '#ff9800', mascot: '#ffffff', buffalo: '#5d4037', fish: '#1e88e5' }[kind];
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
      hp,
    });
    f.brain = new BotBrain('boss');
    this.fighters.push(f);
    return f;
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
      else if (e[0] === 'z') this.bolts.push({ x1: e[1], y1: e[2], x2: e[3], y2: e[4], life: 0.3 });
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
    // Frozen by the Ice Wand: can't move until it melts.
    for (const b of this.bodies()) {
      if (b.frozenT <= 0) continue;
      b.frozenT -= dt;
      b.stun = Math.max(b.stun, b.frozenT);
      if (b.onGround) b.vx *= 0.8;
    }
    if (this.cut) this.updateCutscene(dt);
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
      // The Recall Memory ally fades away after 20 seconds.
      c.life -= dt;
      if (c.life <= 0) {
        c.alive = false;
        this.burst(c.x, c.cy, '#b388ff', 18, 300);
        this.text(c.x, c.y - c.h - 10, '💭', '#b388ff', 26);
        continue;
      }
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
    f.slashT -= dt;
    f.buttAnim -= dt;
    f.summonCd = Math.max(0, f.summonCd - dt);

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
      // Poison Dart: 10 damage every second.
      if (b.alive && b.poisonT > 0) {
        b.poisonT -= dt;
        b.poisonTick -= dt;
        if (b.poisonTick <= 0) {
          b.poisonTick = 1;
          b.hp -= POISON.dmg;
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
      b.hurtFlash = 0.1;
      this.text(b.x + (Math.random() - 0.5) * 20, b.y - b.h - 10, String(b.burnDmg), '#ff9800', 18);
      this.burst(b.x, b.cy, '#ff9800', 4, 160);
      if (b.hp <= 0) this.kill(b, b.burnSrc, 'ashes');
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
    amount = Math.round(amount);
    if (target instanceof Fighter && target.shielding) {
      target.shieldHp -= amount;
      target.vx += kx * 0.25;
      this.burst(target.x, target.cy, '#4fc3f7', 6, 200);
      this.play('block');
      if (target.shieldHp <= 0) this.breakShield(target);
      return false;
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

  kill(b: Body, src: Body | null, how: Finish = 'pop') {
    if (!b.alive) return;
    b.alive = false;
    b.hp = 0;
    const fighter = b instanceof Fighter;
    // Buffalo isn't a stickman: it always goes down with the original pop.
    if (b instanceof Fighter && b.buffalo && how !== 'void') how = 'pop';
    if (fighter) b.finish = how;
    // The original pop for snowmen, cats and 'pop' kills. Fell into the void: nothing at all.
    if (!fighter || how === 'pop') {
      this.burst(b.x, b.cy, b.color, 26, 520);
      this.burst(b.x, b.cy, '#ffffff', 10, 380);
    } else if (how !== 'void') {
      const c = makeCorpse(b, how);
      if (c) this.corpses.push(c);
    }
    if (b.kind === 'fighter') {
      this.text(b.x, b.y - b.h - 30, 'KO!', '#ffeb3b', 34);
      if (how !== 'void') this.shake = Math.min(18, this.shake + 8);
      this.play('ko');
      if (how !== 'void' && this.potionsOn && Math.random() < POTION_CHANCE) this.dropPotion(b.x, b.cy);
    }
    const killer = src instanceof Snowman || src instanceof Cat ? src.owner : src;
    if (killer instanceof Fighter && killer !== b && b.kind === 'fighter') killer.kos++;
    if (b instanceof Fighter) for (const p of this.projectiles) if (p.owner === b && returns(p.kind)) p.dead = true;
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
          : f.fish
          ? FISHY.melee
          : dash
          ? 60 * f.dmgMult
          : glove
          ? 45 * f.dmgMult
          : thrust
          ? 70 * f.dmgMult
          : def.id === 'dart'
          ? POISON.hit
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
          const force = glove ? 2.4 : dash || thrust ? 1.4 : 1;
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

  /** Recall Memory: the purple boss ally appears next to you and fights for 20 seconds. */
  private summonMemory(f: Fighter) {
    const x = f.x + f.facing * 50;
    const c = new Cat(f, x, f.y - 4, MEMORY_ALLY.hp, MEMORY_ALLY.dmg, 'memory');
    c.vy = -300;
    this.cats.push(c);
    this.burst(x, f.y - 60, '#b388ff', 24, 360);
    this.ring(x, f.y, 90, 0.5, '#b388ff');
    this.text(x, f.y - 160, '💭!', '#b388ff', 30);
    this.play('snowman');
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
    const t = nearestEnemy(this, f, 700 * (f.scale / 2.6));
    f.thrustT = 0.4;
    f.thrustSlot = slot;
    if (!t) {
      f.thrustAngle = f.facing > 0 ? 0 : Math.PI;
      return;
    }
    f.facing = sign(t.x - f.x) || f.facing;
    f.thrustAngle = Math.atan2(t.cy - f.shoulder().y, t.x - f.x);
    this.burst(t.x, t.cy, '#ffd54f', 14, 320);
    this.damage(t, FISHY.strike * (f.dmgMult / 1.5), f, f.facing * 600, -600, 'ragdoll');
    if (Math.random() < 0.5 && t.alive) {
      this.lightning(t);
      this.damage(t, FISHY.lightning * (f.dmgMult / 1.5), f, f.facing * 300, -500, 'zap');
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

  /** Call Cat AI: little cats appear around the caller. */
  private callCats(f: Fighter, o: { count: number; hp: number; dmg: number; max: number }, variant: CatVariant = 'cat') {
    const icon = variant === 'fish' ? '🐟' : '🐱';
    const have = this.cats.filter((c) => c.alive && c.owner === f && c.variant === variant).length;
    const n = Math.min(o.count, o.max - have);
    if (n <= 0) {
      this.text(f.x, f.y - f.h - 20, `${icon} ${o.max}/${o.max}`, '#ffffff', 22);
      return;
    }
    for (let k = 0; k < n; k++) {
      const x = f.x + (k - (n - 1) / 2) * 44;
      const c = new Cat(f, x, f.y - 10, o.hp, o.dmg, variant);
      c.vy = -500 - Math.random() * 300;
      c.vx = (k - (n - 1) / 2) * 120;
      this.cats.push(c);
      this.burst(x, f.y - 20, '#ffcc80', 6, 220);
    }
    this.ring(f.x, f.y, 90 * f.scale, 0.4, variant === 'fish' ? '#4fc3f7' : '#ffb74d');
    this.text(f.x, f.y - f.h - 30, `${icon} ×${n}`, variant === 'fish' ? '#81d4fa' : '#ffcc80', 28);
    this.play('snowman');
  }

  /** A cat touched an enemy. */
  catBite(c: Cat, e: Body) {
    c.attackT = 0.8;
    const dir = sign(e.x - c.x) || c.facing;
    this.damage(e, c.touchDmg, c, dir * (c.variant === 'memory' ? 520 : 260), c.variant === 'memory' ? -420 : -220, c.variant === 'memory' ? 'ragdoll' : 'trip');
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
    const big = kind === 'boomerang' || kind === 'bomb' || kind === 'axe' || kind === 'fireball' || kind === 'six7' || kind === 'soup';
    const r =
      { arrow: 5, snowball: 11, minisnow: 8, boomerang: 16, bomb: 11, axe: 22, shuriken: 8, laser: 6, fireball: 14, six7: 24, poop: 10, soup: 14, icebolt: 9, banana: 10, fireslash: 34, dart: 6, memorybox: 12, rocket: 10, wave: 60 }[kind] *
      (big || kind === 'fireslash' ? scale : 1);
    const life = { arrow: 2, snowball: 3, minisnow: 3, boomerang: 3.5, bomb: 1.5, axe: 3.5, shuriken: 2, laser: 0.7, fireball: 2, six7: 3.5, poop: 3, soup: 3, icebolt: 2, banana: 3, fireslash: 0.7, dart: 2, memorybox: 0.35, rocket: 2, wave: 1.7 }[kind];
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
          e.vx = (p.dir ?? dir) * (heavy ? 300 : 720);
          e.vy = Math.min(e.vy, heavy ? -150 : -480);
          e.onGround = false;
          e.stun = Math.max(e.stun, heavy ? 0.05 : 0.4);
          this.burst(e.x, e.y - 10, '#81d4fa', 8, 240);
          continue;
        }
        if (p.kind === 'fireslash') {
          // The air slash goes through everyone in its path and sets them on fire.
          p.hit.add(e.id);
          if (this.damage(e, p.dmg, p.owner, dir * 450, -350, PROJ_FINISH[p.kind]) && e.alive) this.setBurn(e, FIRE_SWORD.slashBurnS, FIRE_SWORD.slashBurn, p.owner);
          this.burst(e.x, e.cy, '#ff6d00', 10, 260);
          continue;
        }
        if (p.kind === 'laser') {
          // The beam goes through everyone in its way.
          p.hit.add(e.id);
          this.damage(e, p.dmg, p.owner, dir * 380, -220, PROJ_FINISH[p.kind]);
          this.burst(p.x, p.y, '#ff1744', 6, 220);
          continue;
        }
        if (p.kind === 'fireball') this.explode(p, 120 * p.scale, true);
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
      else if (p.kind === 'wave' || p.kind === 'fireslash') {
        // Waves and air slashes go over and through platforms.
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
      if (b instanceof Snowman || b instanceof Cat) this.kill(b, null);
      else if (b instanceof Fighter) {
        if (b.boss) this.bounce(b, 250);
        else if (this.fallMode === 'ko') this.kill(b, null, 'void');
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
    if (f.hp <= 0) this.kill(f, null, 'void');
  }

  // ---------- end of match ----------

  private winnerTeam(): { decided: boolean; team: number | null } {
    const alive = this.fighters.filter((f) => f.alive);
    if (this.cut) return { decided: false, team: null };
    if (this.fishPhase) {
      // Everyone against the Fishy boss first; then back to Free For All / Teams.
      if (!this.fish?.alive) {
        this.fishBeaten = true;
        this.endFishPhase();
      } else if (!alive.some((f) => !f.boss)) return { decided: true, team: BOSS_TEAM };
      else return { decided: false, team: null };
    }
    if (this.beach && this.fish && !this.fish.alive) this.fishBeaten = true;
    if (isBossMode(this.mode)) {
      // Only the bosses you fight count (on the Beach the normal bosses were on your side).
      const bosses = this.bosses.filter((b) => b.team === BOSS_TEAM);
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
      winners: w.team === BOSS_TEAM ? this.fighters.filter((f) => f.boss && f.team === BOSS_TEAM) : winners,
      humanWon: winners.some((f) => f.human) && w.team !== BOSS_TEAM,
      hadHumans: this.fighters.some((f) => f.human),
      fish: this.fishBeaten,
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
