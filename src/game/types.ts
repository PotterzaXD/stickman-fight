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
export type Mode = 'ffa' | 'team' | 'boss';
export type FallMode = 'ko' | 'bounce';
export type ThemeId = 'day' | 'sunset' | 'night' | 'snow' | 'lava';

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
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
}

export interface SlotConfig {
  kind: 'human' | 'bot';
  /** Weapon id, or 'random' (bots only). */
  weapon: string;
  team: number;
  difficulty: Difficulty;
}

export interface MatchConfig {
  mode: Mode;
  mapId: string;
  slots: SlotConfig[];
}
