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
export type Mode = 'ffa' | 'team' | 'boss' | 'cat' | 'mascot' | 'buffalo' | 'pigeon' | 'sandbox' | 'outbreak' | 'hill' | 'race' | 'stock' | 'rush' | 'infection' | 'events' | XBossKind | SecretKind;

/** The October 20 bosses: the Magical Elephant (flies with its big ears), the Giant Scarecrow and Robo Stick. */
export type XBossKind = 'elephant' | 'scarecrow' | 'robo';
export const XBOSS_KINDS: XBossKind[] = ['elephant', 'scarecrow', 'robo'];
export const isXBoss = (m: string): m is XBossKind => (XBOSS_KINDS as string[]).includes(m);

/** The secret bosses: hidden until you meet their unlock conditions. */
export type SecretKind = 'queen' | 'tide' | 'guardian';
export const SECRET_KINDS: SecretKind[] = ['queen', 'tide', 'guardian'];
export const isSecret = (m: string): m is SecretKind => (SECRET_KINDS as string[]).includes(m);

/** Boss Fight, Boss Rush, Grandfather Cat, the Mascot, Buffalo, the Pigeon and the secret bosses: everyone teams up against the boss. */
export const isBossMode = (m: Mode) => m === 'boss' || m === 'rush' || m === 'cat' || m === 'mascot' || m === 'buffalo' || m === 'pigeon' || isXBoss(m) || isSecret(m);
/** The Pigeon: up to this many fighters, everyone holds a shotgun, and KO'd fighters come back. */
export const PIGEON_MAX = 30;
export const PIGEON_WEAPON = 'shotgun';
/** The Beach: only these modes (the Fishy boss shows up in all of them). */
export const BEACH_MODES: Mode[] = ['ffa', 'team', 'boss'];
export const BEACH_MAP = 'beach';
export type FallMode = 'ko' | 'bounce';
export type ThemeId = 'day' | 'sunset' | 'night' | 'snow' | 'lava' | 'space' | 'beach' | 'war' | 'jungle' | 'haunted' | 'candy' | 'farm' | 'graveyard' | 'inferno' | 'pirate' | 'desert' | 'stage' | 'portal' | 'kitchen' | 'dessert' | 'infect';

/** Special blocks from the map editor. No kind = a normal platform. Sandbags stop bullets. Bounce pads launch you, ice is slippery, spikes hurt.
 * Walls are solid from every side: you can stand on top, but you can't walk through, jump up through, or hop over them. */
export type BlockKind = 'concrete' | 'lava' | 'glass' | 'sandbag' | 'bounce' | 'ice' | 'spikes' | 'wall';

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: BlockKind;
  /** Moving platform: slides `dx`, `dy` away and back every `period` seconds (`phase` 0-1 = where it starts). */
  move?: { dx: number; dy: number; period: number; phase?: number };
  /** Not part of the map: an Ice Cream ice spike (on top of a head or beside someone) that melts away. */
  temp?: 'head' | 'side';
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
  deco?: 'spaceship' | 'palms' | 'ship' | 'castle';
  /** The Portal map: the purple portal (center and height). Whoever goes in disappears; a player leaves for Stickman Fight 2. */
  portal?: { x: number; y: number; r: number };
  /** Map editor portals: they link up in pairs (1 with 2, 3 with 4...). Walk into one and you come out of the other. */
  warps?: Vec[];
  /** Things to look at that you can't stand on (Stickman Infection's town: trees, lamps, cars, houses...). */
  props?: MapProp[];
}

export interface MapProp {
  k: 'tree' | 'lamp' | 'car' | 'house' | 'bench' | 'sign' | 'crate' | 'bush' | 'fence' | 'tower' | 'building';
  x: number;
  /** The ground it stands on. */
  y: number;
  /** Size (1 = normal). */
  s?: number;
  /** A building's width and height (it starts at x). */
  w?: number;
  h?: number;
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
  /** Hat id, 'none', or 'random' (bots only). */
  hat?: string;
}

/** Bosses you can add in Sandbox. */
export type BossKind = 'boss' | 'cat' | 'mascot' | 'buffalo' | 'fish' | 'pigeon' | XBossKind | SecretKind;

export interface SandboxBoss {
  kind: BossKind;
  team: number;
  hp: number;
  /** Damage in percent. */
  power: number;
}

/** Helpers you can drop into Sandbox: every helper any weapon or the Summoner can call. A chick slot is 10 chicks. */
export type HelperKind = 'cat' | 'fish' | 'memory' | 'soldier' | 'snowman' | 'sbsnow' | 'fireally' | 'redguy' | 'chicken' | 'chick' | 'lilpigeon' | 'skeleton' | 'dog' | 'retro' | 'bee' | 'ninja' | 'zombie'
  | 'babyele' | 'drone' | 'penguin' | 'knight' | 'frog' | 'ghost' | 'ginger' | 'cupcake' | 'chef'
  | 'unicorn' | 'dino' | 'wizard' | 'panda';
/** The zombie ally is only here once you have beaten wave 10 of The Outbreak (see `zombieAlly` in the save). */
export const HELPER_KINDS: HelperKind[] = ['cat', 'fish', 'memory', 'soldier', 'snowman', 'sbsnow', 'fireally', 'redguy', 'chicken', 'chick', 'lilpigeon', 'skeleton', 'dog', 'retro', 'bee', 'ninja', 'zombie', 'babyele', 'drone', 'penguin', 'knight', 'frog', 'ghost', 'ginger', 'cupcake', 'chef', 'unicorn', 'dino', 'wizard', 'panda'];
/** The Outbreak's zombies and the Zombie Boss, for Sandbox (they fight for whichever team you put them on). */
export type SbZombieKind = 'znormal' | 'zshooter' | 'zmini' | 'zbig' | 'zrunner' | 'zexploder' | 'zboss';
export const SB_ZOMBIE_KINDS: SbZombieKind[] = ['znormal', 'zshooter', 'zmini', 'zbig', 'zrunner', 'zexploder', 'zboss'];
export const isSbZombie = (k: string): k is SbZombieKind => (SB_ZOMBIE_KINDS as string[]).includes(k);
/** Chicks come 10 to a slot (and don't count toward the helper limit). */
export const SB_CHICKS = 10;

export interface SandboxHelper {
  kind: HelperKind | SbZombieKind;
  team: number;
}

export interface MatchConfig {
  mode: Mode;
  mapId: string;
  slots: SlotConfig[];
  /** How many bosses in Boss Fight (1-3). */
  bosses?: number;
  /** Sandbox: bosses added to the match. */
  extraBosses?: SandboxBoss[];
  /** Sandbox: helpers added to the match. */
  helpers?: SandboxHelper[];
  /** Sandbox: Clones, each the slot index (player or bot) it copies. */
  clones?: number[];
  /** Sandbox: Free For All, nobody is on anybody's team (fighters, bosses, helpers and Clones). */
  ffa?: boolean;
  /** The Outbreak: which save (0-2) this wave belongs to. */
  obSlot?: number;
}

/** The Outbreak: one wave of zombies. */
export interface OutbreakInfo {
  wave: number;
  /** Endless, or Until Wave 50. */
  endless: boolean;
  /** Zombie allies that join you (one for every 10 waves cleared). */
  allies: number;
}
