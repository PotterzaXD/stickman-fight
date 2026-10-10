export interface Vec {
  x: number;
  y: number;
}

/** Raw joystick state: x and y in -1..1 (y is down-positive, like the screen). */
export interface Controller {
  x: number;
  y: number;
  active: boolean;
}

/** What a fighter wants to do this frame, from a joystick or a bot brain. */
export interface Intent {
  moveX: number;
  aim: number | null;
  shield: boolean;
  jump: boolean;
  /** Angle to fire the weapon skill at this frame, or null. */
  skill: number | null;
  /** Which held weapon the skill comes from (the boss holds two). */
  skillSlot: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 'ffa' | 'team' | 'boss' | 'cat' | 'mascot' | 'buffalo' | 'sandbox';

/** Boss Fight, Grandfather Cat, the Mascot and Buffalo: everyone teams up against the boss. */
export const isBossMode = (m: Mode) => m === 'boss' || m === 'cat' || m === 'mascot' || m === 'buffalo';
/** The Beach: only these modes (the Fishy boss shows up in all of them). */
export const BEACH_MODES: Mode[] = ['ffa', 'team', 'boss'];
export const BEACH_MAP = 'beach';
export type FallMode = 'ko' | 'bounce';
export type ThemeId = 'day' | 'sunset' | 'night' | 'snow' | 'lava' | 'space' | 'beach';

/** Special blocks from the map editor. No kind = a normal platform. */
export type BlockKind = 'concrete' | 'lava' | 'glass';

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: BlockKind;
}

export interface MapDef {
  id: string;
  name: string;
  w: number;
  h: number;
  theme: ThemeId;
  platforms: Platform[];
  spawns: Vec[];
  builtin?: boolean;
  /** Big background picture (the Space map's spaceship, the Beach's palm trees). */
  deco?: 'spaceship' | 'palms';
}

export interface SlotConfig {
  kind: 'human' | 'bot';
  /** Weapon id, or 'random' (bots only). */
  weapon: string;
  team: number;
  difficulty: Difficulty;
  /** Sandbox only: starting HP and damage in percent. */
  hp?: number;
  power?: number;
}

/** Bosses you can add in Sandbox. */
export type BossKind = 'boss' | 'cat' | 'mascot' | 'buffalo' | 'fish';

export interface SandboxBoss {
  kind: BossKind;
  team: number;
  hp: number;
  /** Damage in percent. */
  power: number;
}

export interface MatchConfig {
  mode: Mode;
  mapId: string;
  slots: SlotConfig[];
  /** How many bosses in Boss Fight (1-3). */
  bosses?: number;
  /** Sandbox: bosses added to the match. */
  extraBosses?: SandboxBoss[];
}
