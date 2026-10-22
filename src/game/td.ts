/**
 * Tower Defense: enemies walk along a path to your castle, and you spend coins to put stickmen next to the path.
 * Melee stickmen run out and block enemies; ranged ones shoot from where they stand.
 * Everything here works in a 1000 × 600 world that the screen scales to fit.
 */

export const TD_W = 1000;
export const TD_H = 600;

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythical';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'legendary', 'mythical'];
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9e9e9e',
  uncommon: '#43a047',
  rare: '#1e88e5',
  legendary: '#ff9800',
  mythical: '#d500f9',
};
/** Stickman Fight coins for selling one copy of a unit. */
export const SELL_PRICE: Record<Rarity, number> = { common: 15, uncommon: 40, rare: 100, legendary: 300, mythical: 800 };

/** melee: runs out and blocks. ranged: one target. splash: hits everyone near the target. chain: jumps between enemies. */
export type UnitKind = 'melee' | 'ranged' | 'splash' | 'chain';
export type Shot = 'arrow' | 'rock' | 'bomb' | 'fire' | 'ice' | 'bullet' | 'bolt';

export interface UnitDef {
  id: string;
  rarity: Rarity;
  icon: string;
  color: string;
  hp: number;
  dmg: number;
  /** Seconds between attacks. */
  rate: number;
  range: number;
  kind: UnitKind;
  /** How many enemies a melee unit can hold back at once. */
  block?: number;
  shot?: Shot;
  /** Splash radius. */
  radius?: number;
  /** Slows what it hits (ice). */
  slow?: boolean;
  /** In-game coins to place one. */
  cost: number;
  /** Seconds before you can place another. */
  cd: number;
  /** What it holds, drawn in its hand. */
  weapon: 'sword' | 'bow' | 'spear' | 'shield' | 'sling' | 'axe' | 'katana' | 'bomb' | 'staff' | 'gun' | 'lance' | 'hammer' | 'crown';
  scale?: number;
}

export const UNITS: UnitDef[] = [
  // Common
  { id: 'swordman', rarity: 'common', icon: '🗡️', color: '#455a64', hp: 100, dmg: 20, rate: 1, range: 70, kind: 'melee', block: 1, cost: 40, cd: 2, weapon: 'sword' },
  { id: 'archer', rarity: 'common', icon: '🏹', color: '#6d4c41', hp: 60, dmg: 12, rate: 1, range: 190, kind: 'ranged', shot: 'arrow', cost: 60, cd: 3, weapon: 'bow' },
  { id: 'spearman', rarity: 'common', icon: '🔱', color: '#5d4037', hp: 120, dmg: 16, rate: 0.9, range: 85, kind: 'melee', block: 1, cost: 50, cd: 2.5, weapon: 'spear' },
  // Uncommon
  { id: 'shieldguy', rarity: 'uncommon', icon: '🛡️', color: '#1565c0', hp: 320, dmg: 10, rate: 1.1, range: 70, kind: 'melee', block: 2, cost: 90, cd: 4, weapon: 'shield' },
  { id: 'slingkid', rarity: 'uncommon', icon: '🪨', color: '#2e7d32', hp: 70, dmg: 20, rate: 1.1, range: 200, kind: 'ranged', shot: 'rock', cost: 100, cd: 4, weapon: 'sling' },
  { id: 'axeguy', rarity: 'uncommon', icon: '🪓', color: '#8d6e63', hp: 170, dmg: 38, rate: 1.4, range: 70, kind: 'melee', block: 1, cost: 110, cd: 4, weapon: 'axe' },
  // Rare
  { id: 'ninja', rarity: 'rare', icon: '🥷', color: '#212121', hp: 180, dmg: 28, rate: 0.5, range: 90, kind: 'melee', block: 1, cost: 160, cd: 6, weapon: 'katana' },
  { id: 'bomber', rarity: 'rare', icon: '💣', color: '#bf360c', hp: 90, dmg: 40, rate: 2, range: 190, kind: 'splash', shot: 'bomb', radius: 60, cost: 180, cd: 6, weapon: 'bomb' },
  { id: 'icewizard', rarity: 'rare', icon: '❄️', color: '#4fc3f7', hp: 100, dmg: 16, rate: 1.2, range: 210, kind: 'splash', shot: 'ice', radius: 45, slow: true, cost: 170, cd: 6, weapon: 'staff' },
  // Legendary
  { id: 'knight', rarity: 'legendary', icon: '⚔️', color: '#90a4ae', hp: 550, dmg: 50, rate: 1, range: 80, kind: 'melee', block: 2, cost: 280, cd: 9, weapon: 'lance', scale: 1.15 },
  { id: 'firemage', rarity: 'legendary', icon: '🔥', color: '#e53935', hp: 140, dmg: 60, rate: 1.6, range: 220, kind: 'splash', shot: 'fire', radius: 65, cost: 320, cd: 9, weapon: 'staff' },
  { id: 'gunner', rarity: 'legendary', icon: '🔫', color: '#37474f', hp: 160, dmg: 22, rate: 0.3, range: 260, kind: 'ranged', shot: 'bullet', cost: 300, cd: 9, weapon: 'gun' },
  // Mythical
  { id: 'dragonrider', rarity: 'mythical', icon: '🐉', color: '#2e7d32', hp: 650, dmg: 80, rate: 1.3, range: 230, kind: 'splash', shot: 'fire', radius: 80, cost: 500, cd: 14, weapon: 'lance', scale: 1.2 },
  { id: 'thundergod', rarity: 'mythical', icon: '⚡', color: '#fdd835', hp: 320, dmg: 110, rate: 1.5, range: 240, kind: 'chain', shot: 'bolt', cost: 550, cd: 14, weapon: 'hammer', scale: 1.1 },
  { id: 'stickking', rarity: 'mythical', icon: '👑', color: '#ffb300', hp: 1200, dmg: 100, rate: 0.9, range: 95, kind: 'melee', block: 3, cost: 600, cd: 14, weapon: 'crown', scale: 1.35 },
];
export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(UNITS.map((u) => [u.id, u]));
export const FREE_UNIT = 'swordman';
export const MAX_EQUIP = 5;

export interface EggDef {
  id: 'basic' | 'rare' | 'mythic';
  icon: string;
  /** Stickman Fight coins. */
  price: number;
  /** Chance of each rarity, in percent. */
  odds: Record<Rarity, number>;
}

export const EGGS: EggDef[] = [
  { id: 'basic', icon: '🥚', price: 150, odds: { common: 70, uncommon: 25, rare: 5, legendary: 0, mythical: 0 } },
  { id: 'rare', icon: '🪺', price: 600, odds: { common: 30, uncommon: 40, rare: 22, legendary: 7, mythical: 1 } },
  { id: 'mythic', icon: '🌟', price: 2000, odds: { common: 0, uncommon: 20, rare: 45, legendary: 27, mythical: 8 } },
];

/** Roll an egg: pick a rarity by its odds, then a unit of that rarity. */
export function hatch(egg: EggDef, rnd = Math.random): UnitDef {
  let r = rnd() * 100;
  let rarity: Rarity = 'common';
  for (const k of RARITIES) {
    if (r < egg.odds[k]) {
      rarity = k;
      break;
    }
    r -= egg.odds[k];
  }
  const pool = UNITS.filter((u) => u.rarity === rarity);
  return pool[Math.floor(rnd() * pool.length)];
}

// ---------- enemies ----------

export type EnemyId = 'basic' | 'runner' | 'tank' | 'shield' | 'archer' | 'bat' | 'brute' | 'boss';

export interface EnemyDef {
  id: EnemyId;
  hp: number;
  dmg: number;
  rate: number;
  speed: number;
  /** In-game coins for killing it. */
  reward: number;
  /** Lives you lose if it reaches the castle. */
  leak: number;
  color: string;
  scale: number;
  /** Flies over: melee units can't block or hit it. */
  flying?: boolean;
  /** Shoots units as it walks past. */
  shoots?: boolean;
  /** Takes half damage from arrows, rocks and bullets. */
  armored?: boolean;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  basic: { id: 'basic', hp: 30, dmg: 5, rate: 1, speed: 55, reward: 6, leak: 1, color: '#c62828', scale: 0.55 },
  runner: { id: 'runner', hp: 25, dmg: 4, rate: 0.8, speed: 110, reward: 6, leak: 1, color: '#ff7043', scale: 0.5 },
  tank: { id: 'tank', hp: 200, dmg: 12, rate: 1.3, speed: 32, reward: 14, leak: 2, color: '#6a1b9a', scale: 0.75 },
  shield: { id: 'shield', hp: 110, dmg: 8, rate: 1, speed: 45, reward: 10, leak: 1, color: '#37474f', scale: 0.6, armored: true },
  archer: { id: 'archer', hp: 50, dmg: 7, rate: 1.6, speed: 50, reward: 9, leak: 1, color: '#2e7d32', scale: 0.55, shoots: true },
  bat: { id: 'bat', hp: 40, dmg: 0, rate: 1, speed: 85, reward: 8, leak: 1, color: '#4a148c', scale: 0.6, flying: true },
  brute: { id: 'brute', hp: 450, dmg: 25, rate: 1.5, speed: 30, reward: 25, leak: 3, color: '#4e342e', scale: 0.95 },
  boss: { id: 'boss', hp: 900, dmg: 20, rate: 1.6, speed: 22, reward: 150, leak: 99, color: '#b71c1c', scale: 1.6 },
};

// ---------- maps ----------

export type TDDifficulty = 'easy' | 'medium' | 'hard' | 'insane';
export const TD_DIFFS: TDDifficulty[] = ['easy', 'medium', 'hard', 'insane'];

export interface Pt {
  x: number;
  y: number;
}

export interface TDMap {
  id: string;
  diff: TDDifficulty;
  /** One or more paths. Waves take turns between them. */
  paths: Pt[][];
  /** Grass, sand, snow... */
  ground: string;
  road: string;
  edge: string;
  deco: 'tree' | 'cactus' | 'pine' | 'rock' | 'candy';
}

/** Turn a list of numbers into points. */
const P = (...n: number[]): Pt[] => Array.from({ length: n.length / 2 }, (_, i) => ({ x: n[i * 2], y: n[i * 2 + 1] }));

/** A spiral path that winds in toward the middle. */
function spiral(): Pt[] {
  return P(-30, 70, 900, 70, 900, 530, 100, 530, 100, 170, 780, 170, 780, 430, 220, 430, 220, 270, 640, 270, 640, 340, 460, 340);
}

export const TD_MAPS: TDMap[] = [
  { id: 'meadow', diff: 'easy', ground: '#7cb342', road: '#d7b98e', edge: '#a1887f', deco: 'tree', paths: [P(-30, 120, 760, 120, 760, 300, 240, 300, 240, 480, 1030, 480)] },
  { id: 'beach', diff: 'easy', ground: '#ffe082', road: '#bcaaa4', edge: '#8d6e63', deco: 'rock', paths: [P(-30, 300, 160, 300, 160, 100, 360, 100, 360, 500, 560, 500, 560, 100, 760, 100, 760, 300, 1030, 300)] },
  { id: 'forest', diff: 'medium', ground: '#558b2f', road: '#c8a27a', edge: '#6d4c41', deco: 'pine', paths: [P(500, -30, 500, 140, 860, 140, 860, 460, 140, 460, 140, 140, 360, 140, 360, 310, 640, 310, 640, 630)] },
  { id: 'canyon', diff: 'medium', ground: '#e0a96d', road: '#f3d9b1', edge: '#a0522d', deco: 'cactus', paths: [P(-30, 520, 120, 520, 120, 80, 280, 80, 280, 520, 440, 520, 440, 80, 600, 80, 600, 520, 760, 520, 760, 80, 900, 80, 900, 300, 1030, 300)] },
  { id: 'snowpeak', diff: 'hard', ground: '#eceff1', road: '#b0bec5', edge: '#78909c', deco: 'pine', paths: [P(-30, 80, 880, 80, 880, 200, 120, 200, 120, 320, 880, 320, 880, 440, 120, 440, 120, 560, 1030, 560)] },
  { id: 'tworoads', diff: 'hard', ground: '#689f38', road: '#d7b98e', edge: '#795548', deco: 'tree', paths: [P(-30, 90, 300, 90, 300, 300, 600, 300, 760, 300, 760, 500, 1030, 500), P(-30, 520, 300, 520, 300, 300, 600, 300, 760, 300, 760, 500, 1030, 500)] },
  { id: 'lavaspiral', diff: 'insane', ground: '#3e2723', road: '#ff7043', edge: '#bf360c', deco: 'rock', paths: [spiral()] },
  { id: 'candyloop', diff: 'insane', ground: '#f8bbd0', road: '#fff3e0', edge: '#ec407a', deco: 'candy', paths: [P(-30, 300, 200, 300, 200, 90, 500, 90, 500, 510, 800, 510, 800, 90, 650, 90, 650, 300, 350, 300, 350, 510, 1030, 510), P(500, -30, 500, 90, 500, 510, 800, 510, 800, 90, 650, 90, 650, 300, 350, 300, 350, 510, 1030, 510)] },
];

export const DIFF_INFO: Record<TDDifficulty, { waves: number; hp: number; reward: number; lives: number; bossHp: number; bossDmg: number }> = {
  easy: { waves: 10, hp: 0.8, reward: 150, lives: 20, bossHp: 700, bossDmg: 20 },
  medium: { waves: 15, hp: 1.4, reward: 300, lives: 20, bossHp: 4000, bossDmg: 40 },
  hard: { waves: 20, hp: 1.9, reward: 600, lives: 15, bossHp: 9000, bossDmg: 55 },
  insane: { waves: 25, hp: 2.6, reward: 1200, lives: 10, bossHp: 20000, bossDmg: 70 },
};

/** Path length and a point some distance along it. */
export function pathLen(p: Pt[]) {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  return L;
}

export function pointAt(p: Pt[], dist: number): Pt & { dx: number } {
  let d = dist;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= seg || i === p.length - 1) {
      const k = seg ? Math.min(1, d / seg) : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dx: Math.sign(b.x - a.x) };
    }
    d -= seg;
  }
  return { ...p[p.length - 1], dx: 1 };
}

/** How far a point is from the nearest road. */
export function distToRoad(map: TDMap, x: number, y: number) {
  let best = Infinity;
  for (const p of map.paths)
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1];
      const b = p[i];
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const L = vx * vx + vy * vy || 1;
      const k = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / L));
      best = Math.min(best, Math.hypot(x - (a.x + vx * k), y - (a.y + vy * k)));
    }
  return best;
}

export const ROAD_W = 44;

// ---------- waves ----------

/** The enemies in a wave, in the order they come out. The wave after the last one is the boss. */
export function waveList(diff: TDDifficulty, wave: number): EnemyId[] {
  const n = DIFF_INFO[diff].waves;
  const out: EnemyId[] = [];
  if (wave > n) {
    // The boss wave: escorts first, then the boss walks the path.
    for (let i = 0; i < 6; i++) out.push(i % 2 ? 'tank' : 'runner');
    out.push('boss');
    return out;
  }
  const count = 5 + Math.floor(wave * 1.6);
  const pool: EnemyId[] = ['basic'];
  if (wave >= 3) pool.push('runner');
  if (wave >= 5) pool.push('tank');
  // Bats only from Medium up: on Easy you might only have the Swordman, who can't reach them.
  if (wave >= 6 && diff !== 'easy') pool.push('bat');
  if (wave >= 7) pool.push('shield');
  if (wave >= 9) pool.push('archer');
  if (wave >= 12) pool.push('brute');
  for (let i = 0; i < count; i++) out.push(i < 3 ? 'basic' : pool[(i * 7 + wave * 3) % pool.length]);
  // Every 5th wave ends with a few extra tough ones.
  if (wave % 5 === 0) out.push(wave >= 12 ? 'brute' : 'tank', 'tank');
  return out;
}

// ---------- the game ----------

export interface TDUnit {
  def: UnitDef;
  x: number;
  y: number;
  postX: number;
  postY: number;
  hp: number;
  cd: number;
  facing: number;
  /** Time since the last attack, for the swing animation. */
  swingT: number;
  walk: number;
  moving: boolean;
  /** Enemies it is holding back. */
  holding: TDEnemy[];
  dead: number;
}

export interface TDEnemy {
  def: EnemyDef;
  path: number;
  dist: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cd: number;
  slowT: number;
  facing: number;
  walk: number;
  swingT: number;
  blocker: TDUnit | null;
  dead: number;
  hurt: number;
}

export interface TDShot {
  kind: Shot;
  x: number;
  y: number;
  tx: number;
  ty: number;
  target: TDEnemy | TDUnit | null;
  speed: number;
  dmg: number;
  radius: number;
  slow: boolean;
  /** Fired by an enemy at a unit. */
  enemy: boolean;
  /** Lightning: shows for a moment instead of flying. */
  life: number;
  chain?: Pt[];
}

export interface TDPop {
  x: number;
  y: number;
  t: number;
  text: string;
  color: string;
}

export class TDGame {
  units: TDUnit[] = [];
  enemies: TDEnemy[] = [];
  shots: TDShot[] = [];
  pops: TDPop[] = [];
  booms: { x: number; y: number; r: number; t: number; color: string }[] = [];
  coins = 200;
  lives: number;
  /** The wave being fought (0 = not started yet). */
  wave = 0;
  readonly waves: number;
  /** Enemies still to come out this wave. */
  queue: EnemyId[] = [];
  spawnT = 0;
  /** Between waves: seconds until the next one starts by itself. */
  nextIn = 8;
  time = 0;
  over: 'win' | 'lose' | null = null;
  bossOut = false;
  /** When each loadout slot can be placed again. */
  cds: number[];
  readonly lens: number[];
  onEvent?: (e: 'place' | 'hit' | 'boom' | 'kill' | 'leak' | 'wave' | 'boss' | 'zap') => void;

  constructor(
    readonly map: TDMap,
    readonly loadout: UnitDef[],
  ) {
    const info = DIFF_INFO[map.diff];
    this.lives = info.lives;
    this.waves = info.waves;
    this.cds = loadout.map(() => 0);
    this.lens = map.paths.map(pathLen);
  }

  get inWave() {
    return this.queue.length > 0 || this.enemies.some((e) => !e.dead);
  }

  /** Can a unit stand here? Next to the road (not on it), inside the field, and not on top of another unit. */
  canPlace(x: number, y: number, def: UnitDef): boolean {
    if (x < 20 || x > TD_W - 20 || y < 30 || y > TD_H - 10) return false;
    const d = distToRoad(this.map, x, y);
    if (d < ROAD_W / 2 + 8) return false;
    // Melee units have to be close enough to reach the road.
    if (def.kind === 'melee' && d > def.range) return false;
    return !this.units.some((u) => !u.dead && Math.hypot(u.postX - x, u.postY - y) < 34);
  }

  place(slot: number, x: number, y: number): 'ok' | 'coins' | 'cd' | 'spot' {
    const def = this.loadout[slot];
    if (!def) return 'spot';
    if (this.cds[slot] > 0) return 'cd';
    if (this.coins < def.cost) return 'coins';
    if (!this.canPlace(x, y, def)) return 'spot';
    this.coins -= def.cost;
    this.cds[slot] = def.cd;
    this.units.push({ def, x, y, postX: x, postY: y, hp: def.hp, cd: 0.3, facing: 1, swingT: 9, walk: 0, moving: false, holding: [], dead: 0 });
    this.onEvent?.('place');
    return 'ok';
  }

  /** Take a unit back for half its cost. */
  sell(u: TDUnit) {
    if (u.dead) return;
    this.coins += Math.floor(u.def.cost / 2);
    this.release(u);
    u.dead = 0.01;
    u.hp = 0;
  }

  startWave() {
    if (this.over || this.inWave || this.wave > this.waves) return;
    this.wave++;
    this.queue = waveList(this.map.diff, this.wave);
    this.spawnT = 0;
    this.nextIn = 0;
    this.onEvent?.(this.wave > this.waves ? 'boss' : 'wave');
  }

  private spawn(id: EnemyId) {
    const def = ENEMIES[id];
    const info = DIFF_INFO[this.map.diff];
    const grow = 1 + (this.wave - 1) * 0.07;
    const hp = id === 'boss' ? info.bossHp : Math.round(def.hp * info.hp * grow);
    const path = this.enemies.length % this.map.paths.length;
    const p = pointAt(this.map.paths[path], 0);
    this.enemies.push({ def, path, dist: 0, x: p.x, y: p.y, hp, maxHp: hp, cd: 0.5, slowT: 0, facing: 1, walk: 0, swingT: 9, blocker: null, dead: 0, hurt: 0 });
    if (id === 'boss') this.bossOut = true;
  }

  update(dt: number) {
    if (this.over) return;
    this.time += dt;
    for (let i = 0; i < this.cds.length; i++) this.cds[i] = Math.max(0, this.cds[i] - dt);

    // Waves
    if (this.queue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const id = this.queue.shift()!;
        this.spawn(id);
        this.spawnT = id === 'boss' ? 2 : Math.max(0.45, 1 - this.wave * 0.025);
      }
    } else if (!this.inWave) {
      if (this.wave > this.waves) {
        this.over = 'win';
        return;
      }
      if (this.wave > 0 && this.nextIn <= 0) {
        // Wave just cleared: a bonus, and a short break.
        const bonus = 20 + this.wave * 5;
        this.coins += bonus;
        this.pops.push({ x: TD_W / 2, y: 60, t: 0, text: `+${bonus} 🪙`, color: '#ffd54f' });
        this.nextIn = 10;
      }
      if (this.wave === 0 || this.nextIn > 0) {
        this.nextIn -= dt;
        if (this.nextIn <= 0) {
          this.nextIn = 0;
          this.startWave();
        }
      }
    }

    for (const e of this.enemies) this.stepEnemy(e, dt);
    for (const u of this.units) this.stepUnit(u, dt);
    this.stepShots(dt);

    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 1);
    for (const b of this.booms) b.t += dt;
    this.booms = this.booms.filter((b) => b.t < 0.4);
    for (const e of this.enemies) if (e.dead) e.dead += dt;
    for (const u of this.units) if (u.dead) u.dead += dt;
    this.enemies = this.enemies.filter((e) => !e.dead || e.dead < 0.6);
    this.units = this.units.filter((u) => !u.dead || u.dead < 0.6);
  }

  private stepEnemy(e: TDEnemy, dt: number) {
    if (e.dead) return;
    e.cd -= dt;
    e.swingT += dt;
    e.hurt = Math.max(0, e.hurt - dt);
    e.slowT = Math.max(0, e.slowT - dt);
    if (e.blocker && (e.blocker.dead || !e.blocker.holding.includes(e))) e.blocker = null;
    if (e.blocker) {
      // Fighting the unit that stopped it.
      e.facing = Math.sign(e.blocker.x - e.x) || e.facing;
      if (e.cd <= 0) {
        e.cd = e.def.rate;
        e.swingT = 0;
        if (e.def.id === 'boss') {
          // The boss smashes every unit around it.
          const dmg = DIFF_INFO[this.map.diff].bossDmg;
          for (const u of this.units) if (!u.dead && Math.hypot(u.x - e.x, u.y - e.y) < 80) this.hurtUnit(u, dmg);
          this.booms.push({ x: e.x, y: e.y, r: 80, t: 0, color: 'rgba(183,28,28,0.5)' });
          this.onEvent?.('boom');
        } else this.hurtUnit(e.blocker, e.def.dmg);
      }
      return;
    }
    const sp = e.def.speed * (e.slowT > 0 ? 0.5 : 1);
    e.dist += sp * dt;
    e.walk += sp * dt * 0.05;
    const p = pointAt(this.map.paths[e.path], e.dist);
    if (p.x !== e.x) e.facing = Math.sign(p.x - e.x);
    e.x = p.x;
    e.y = p.y;
    if (e.dist >= this.lens[e.path]) {
      // Reached your castle.
      e.dead = 0.5;
      this.lives = Math.max(0, this.lives - e.def.leak);
      this.onEvent?.('leak');
      if (this.lives <= 0) this.over = 'lose';
      return;
    }
    // Archers shoot units while they walk.
    if (e.def.shoots && e.cd <= 0) {
      const u = this.nearestUnit(e.x, e.y, 150);
      if (u) {
        e.cd = e.def.rate;
        this.shots.push({ kind: 'arrow', x: e.x, y: e.y - 30, tx: u.x, ty: u.y - 25, target: u, speed: 420, dmg: e.def.dmg, radius: 0, slow: false, enemy: true, life: 3 });
      }
    }
  }

  private nearestUnit(x: number, y: number, r: number) {
    let best: TDUnit | null = null;
    let bd = r;
    for (const u of this.units) {
      if (u.dead) continue;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d < bd) {
        bd = d;
        best = u;
      }
    }
    return best;
  }

  /** The enemy furthest along the road within range (the most dangerous one). */
  private target(x: number, y: number, r: number, canFly: boolean): TDEnemy | null {
    let best: TDEnemy | null = null;
    for (const e of this.enemies) {
      if (e.dead || (e.def.flying && !canFly)) continue;
      if (Math.hypot(e.x - x, e.y - y) > r) continue;
      if (!best || e.dist > best.dist) best = e;
    }
    return best;
  }

  private release(u: TDUnit) {
    for (const e of u.holding) if (e.blocker === u) e.blocker = null;
    u.holding = [];
  }

  private stepUnit(u: TDUnit, dt: number) {
    if (u.dead) return;
    u.cd -= dt;
    u.swingT += dt;
    u.holding = u.holding.filter((e) => !e.dead && e.blocker === u);
    const def = u.def;
    if (def.kind === 'melee') {
      // Grab enemies walking past, up to how many it can hold.
      for (const e of this.enemies) {
        if (u.holding.length >= (def.block ?? 1)) break;
        if (e.dead || e.blocker || e.def.flying) continue;
        if (Math.hypot(e.x - u.postX, e.y - u.postY) < def.range) {
          e.blocker = u;
          u.holding.push(e);
        }
      }
      const foe = u.holding[0];
      // Run up to the enemy, or back to its post.
      const gx = foe ? foe.x - Math.sign(foe.x - u.postX || 1) * 22 * (def.scale ?? 1) : u.postX;
      const gy = foe ? foe.y : u.postY;
      const dx = gx - u.x;
      const dy = gy - u.y;
      const d = Math.hypot(dx, dy);
      u.moving = d > 2;
      if (d > 2) {
        const step = Math.min(d, 150 * dt);
        u.x += (dx / d) * step;
        u.y += (dy / d) * step;
        u.walk += step * 0.05;
        if (Math.abs(dx) > 1) u.facing = Math.sign(dx);
      }
      if (foe) {
        u.facing = Math.sign(foe.x - u.x) || u.facing;
        if (u.cd <= 0 && d < 12) {
          u.cd = def.rate;
          u.swingT = 0;
          this.hurtEnemy(foe, def.dmg);
          this.onEvent?.('hit');
        }
      } else if (u.hp < def.hp) u.hp = Math.min(def.hp, u.hp + def.hp * 0.04 * dt);
      return;
    }
    const foe = this.target(u.x, u.y, def.range, true);
    if (!foe) {
      if (u.hp < def.hp) u.hp = Math.min(def.hp, u.hp + def.hp * 0.04 * dt);
      return;
    }
    u.facing = Math.sign(foe.x - u.x) || u.facing;
    if (u.cd > 0) return;
    u.cd = def.rate;
    u.swingT = 0;
    const s = def.scale ?? 1;
    const hx = u.x + u.facing * 12 * s;
    const hy = u.y - 36 * s;
    if (def.kind === 'chain') {
      // Lightning jumps to up to 3 enemies.
      const hit: TDEnemy[] = [foe];
      while (hit.length < 3) {
        const last = hit[hit.length - 1];
        const next = this.enemies.find((e) => !e.dead && !hit.includes(e) && Math.hypot(e.x - last.x, e.y - last.y) < 130);
        if (!next) break;
        hit.push(next);
      }
      for (const e of hit) this.hurtEnemy(e, def.dmg);
      this.shots.push({ kind: 'bolt', x: hx, y: hy, tx: foe.x, ty: foe.y, target: null, speed: 0, dmg: 0, radius: 0, slow: false, enemy: false, life: 0.18, chain: [{ x: hx, y: hy }, ...hit.map((e) => ({ x: e.x, y: e.y - 25 * e.def.scale }))] });
      this.onEvent?.('zap');
      return;
    }
    const speed = def.shot === 'bullet' ? 900 : def.shot === 'arrow' ? 520 : 360;
    this.shots.push({ kind: def.shot ?? 'arrow', x: hx, y: hy, tx: foe.x, ty: foe.y - 25 * foe.def.scale, target: foe, speed, dmg: def.dmg, radius: def.radius ?? 0, slow: !!def.slow, enemy: false, life: 3 });
  }

  private stepShots(dt: number) {
    for (const s of this.shots) {
      s.life -= dt;
      if (s.kind === 'bolt') continue;
      const tgt = s.target;
      if (tgt && !tgt.dead) {
        s.tx = tgt.x;
        s.ty = tgt.y - 25 * (tgt.def.scale ?? 1);
      }
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const d = Math.hypot(dx, dy);
      const step = s.speed * dt;
      if (d > step) {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
        continue;
      }
      s.life = 0;
      if (s.enemy) {
        if (tgt && !tgt.dead) this.hurtUnit(tgt as TDUnit, s.dmg);
        continue;
      }
      if (s.radius) {
        for (const e of this.enemies) {
          if (e.dead || Math.hypot(e.x - s.tx, e.y - 25 * e.def.scale - s.ty) > s.radius) continue;
          this.hurtEnemy(e, s.dmg);
          if (s.slow) e.slowT = 2;
        }
        this.booms.push({ x: s.tx, y: s.ty, r: s.radius, t: 0, color: s.kind === 'ice' ? 'rgba(129,212,250,0.6)' : 'rgba(255,152,0,0.6)' });
        this.onEvent?.('boom');
      } else if (tgt && !tgt.dead) {
        const e = tgt as TDEnemy;
        this.hurtEnemy(e, e.def.armored && (s.kind === 'arrow' || s.kind === 'rock' || s.kind === 'bullet') ? Math.ceil(s.dmg / 2) : s.dmg);
        this.onEvent?.('hit');
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  private hurtEnemy(e: TDEnemy, dmg: number) {
    if (e.dead) return;
    e.hp -= dmg;
    e.hurt = 0.12;
    if (e.hp <= 0) {
      e.dead = 0.01;
      if (e.blocker) e.blocker.holding = e.blocker.holding.filter((x) => x !== e);
      this.coins += e.def.reward;
      this.pops.push({ x: e.x, y: e.y - 50 * e.def.scale, t: 0, text: `+${e.def.reward}`, color: '#ffd54f' });
      this.onEvent?.('kill');
    }
  }

  private hurtUnit(u: TDUnit, dmg: number) {
    if (u.dead) return;
    u.hp -= dmg;
    if (u.hp <= 0) {
      u.hp = 0;
      u.dead = 0.01;
      this.release(u);
    }
  }
}
