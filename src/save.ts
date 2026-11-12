import type { FallMode, MapDef, MatchConfig, PhylPhase } from './game/types';
import type { Lang } from './i18n';
import { loadChef, newChefSave, type ChefSave } from './chef/data';

export interface SaveData {
  coins: number;
  owned: string[];
  /** Hats bought in the hat shop. */
  hats: string[];
  customMaps: MapDef[];
  /** potions: healing potions drop in matches (on by default). Music and sound volumes are 0-100. */
  settings: { lang: Lang; fallMode: FallMode; potions: boolean; musicVol: number; sfxVol: number; musicMute: boolean; sfxMute: boolean; killFeed: boolean; juice: boolean; hideBossBars: boolean };
  lastMatch?: MatchConfig;
  /** The last Sandbox setup. */
  lastSandbox?: MatchConfig;
  /** Achievement ids you have earned. */
  achievements: string[];
  /** Secret bosses you have unlocked. */
  secrets: string[];
  /** Progress toward achievements and secret bosses. */
  stats: Stats;
  /** Your name for online rooms. */
  name: string;
  /** Names typed for P1-P6 on this device. */
  localNames: string[];
  /** The Outbreak: 3 save slots (null = empty). */
  outbreak: (OutbreakSave | null)[];
  /** Beat wave 10 in The Outbreak: the Summoner also brings a zombie ally. */
  zombieAlly: boolean;
  /** Beat wave 10 but still in The Outbreak: the zombie ally unlocks back at the menu. */
  pendingZombie: boolean;
  /** Tower Defense: units you own, the 5 you take into a game, and maps you have beaten. */
  td: TDSave;
  /** Went through the Portal map's portal: Stickman Fight 2 shows up in Other versions. */
  sf2: boolean;
  /** Stick Chef: its own save and its own money (Chef cash), separate from the coins. */
  chef: ChefSave;
  /**
   * PHYLISHIEUS: the phase you are on (1, 2 or the final phase 3), the highest phase beaten,
   * and done once the final phase is beaten (the mode leaves, he moves to Sandbox).
   */
  phyl: { phase: PhylPhase; done: boolean; beat: number; key: boolean };
  /** Beat the boss with your own name (it opens once PHYLISHIEUS's final phase is beaten; then it's in Sandbox). */
  meBeat: boolean;
  /** Survival (fun mode): the best wave reached. */
  survival: { best: number };
  /** 1D: its own coins and weapons, separate from the normal game. */
  oneD: OneDSave;
  /** 3D mode (also opened by the Tome Key): its own coins and the weapons bought with them. */
  threeD: ThreeDSave;
  /** Shirts, pants and shoes bought in the shop (for the profile picture). */
  clothes: string[];
  /** What your profile stickman wears ('none' = nothing). */
  outfit: Outfit;
  /** When this save was first made (ms), for the profile's "Joined". */
  joined: number;
  updatedAt: number;
}

export interface OneDSave {
  coins: number;
  owned: string[];
  /** The weapon you fight with. */
  weapon: string;
  wins: number;
}

/** 3D mode's save: same shape as 1D's (its own coins, owned weapons and the one you use). */
export type ThreeDSave = OneDSave;
/** 3D mode starts with the two weapons that were free when the game came out. */
export const THREE_D_FREE = ['sword', 'spear'];

export function loadThreeD(v: unknown): ThreeDSave {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<ThreeDSave>;
  const owned = Array.from(new Set([...THREE_D_FREE, ...(Array.isArray(o.owned) ? o.owned.filter((x) => typeof x === 'string') : [])]));
  return {
    coins: Number.isFinite(o.coins) ? Math.max(0, Math.floor(o.coins as number)) : 0,
    owned,
    weapon: typeof o.weapon === 'string' && owned.includes(o.weapon) ? o.weapon : THREE_D_FREE[0],
    wins: Number.isFinite(o.wins) ? Math.max(0, Math.floor(o.wins as number)) : 0,
  };
}

export interface Outfit {
  hat: string;
  shirt: string;
  pants: string;
  shoes: string;
  /** The profile stickman's colour. */
  color: string;
}

export const DEFAULT_OUTFIT: Outfit = { hat: 'none', shirt: 'none', pants: 'none', shoes: 'none', color: '#1e88e5' };

/** Saves from before the final phase: beating phase 2 used to be the end, so those players go on to phase 3. */
function loadPhyl(v: unknown): SaveData['phyl'] {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<SaveData['phyl']>;
  const beat = Number.isFinite(o.beat) ? Math.max(0, Math.min(3, Math.floor(o.beat as number))) : o.done === true ? 2 : o.phase === 2 ? 1 : 0;
  return { phase: Math.min(3, beat + 1) as PhylPhase, done: beat >= 3, beat, key: o.key === true && beat >= 3 };
}

/** 1D: the sword is free; the spear, hammer and axe are bought with 1D coins. */
export const ONE_D_FREE = 'sword';
export function loadOneD(v: unknown): OneDSave {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<OneDSave>;
  const owned = Array.from(new Set([ONE_D_FREE, ...(Array.isArray(o.owned) ? o.owned.filter((x) => typeof x === 'string') : [])]));
  return {
    coins: Number.isFinite(o.coins) ? Math.max(0, Math.floor(o.coins as number)) : 0,
    owned,
    weapon: typeof o.weapon === 'string' && owned.includes(o.weapon) ? o.weapon : ONE_D_FREE,
    wins: Number.isFinite(o.wins) ? Math.max(0, Math.floor(o.wins as number)) : 0,
  };
}

function loadOutfit(v: unknown): Outfit {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Outfit>;
  const str = (x: unknown, def: string) => (typeof x === 'string' && x.length < 40 ? x : def);
  return {
    hat: str(o.hat, 'none'),
    shirt: str(o.shirt, 'none'),
    pants: str(o.pants, 'none'),
    shoes: str(o.shoes, 'none'),
    color: typeof o.color === 'string' && /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : DEFAULT_OUTFIT.color,
  };
}

export interface TDSave {
  /** How many of each unit you have. */
  units: Record<string, number>;
  equip: string[];
  cleared: string[];
}

/** One Outbreak save slot. */
export interface OutbreakSave {
  /** The next wave to fight (1 = start). */
  wave: number;
  /** Endless, or Until wave 50. */
  endless: boolean;
  /** Lives left for each player and bot, in the order of the setup. */
  lives: number[];
  /** Best wave cleared on this slot. */
  best: number;
  /** Until 50: wave 50 is cleared. */
  done?: boolean;
  /** Players, bots, hats and weapons picked before the wave. */
  setup?: MatchConfig;
}

export const OB_SLOTS = 3;

export interface Stats {
  /** Grandfather Cat wins on a snow map (3 unlock the Snow Queen). */
  catSnowWins: number;
  /** Built-in maps you have won on (every one unlocks the Ancient Guardian). */
  mapsWon: string[];
  /** Weapons you have fought with (every one: The Collector). */
  usedWeapons: string[];
  /** Matches played (counted from the profile update on). */
  matches: number;
}

const KEY = 'stickman-fight-save-v1';
export const FREE_WEAPONS = ['sword', 'spear', 'booger', 'pie', 'broom', 'paperplane', 'slipper', 'blindfold'];
export const NAME_MAX = 12;

/** Tidy a typed name: single spaces, no ends, at most NAME_MAX characters. */
export function cleanName(s: unknown): string {
  return Array.from(String(s ?? '').replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX).join('');
}

function defaults(): SaveData {
  const thai = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('th');
  return {
    coins: 0,
    owned: [...FREE_WEAPONS],
    hats: [],
    customMaps: [],
    achievements: [],
    secrets: [],
    stats: { catSnowWins: 0, mapsWon: [], usedWeapons: [], matches: 0 },
    settings: { lang: thai ? 'th' : 'en', fallMode: 'ko', potions: true, musicVol: 70, sfxVol: 80, musicMute: false, sfxMute: false, killFeed: true, juice: true, hideBossBars: false },
    name: '',
    localNames: [],
    outbreak: [null, null, null],
    zombieAlly: false,
    sf2: false,
    chef: newChefSave(),
    phyl: { phase: 1, done: false, beat: 0, key: false },
    meBeat: false,
    survival: { best: 0 },
    oneD: loadOneD(null),
    threeD: loadThreeD(null),
    clothes: [],
    outfit: { ...DEFAULT_OUTFIT },
    joined: Date.now(),
    pendingZombie: false,
    td: tdSave(null),
    updatedAt: 0,
  };
}

/** Fill in anything missing or broken in data from storage or the cloud. */
export function normalize(raw: unknown): SaveData {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<SaveData>;
  const strs = (v: unknown) => (Array.isArray(v) ? Array.from(new Set(v.filter((x) => typeof x === 'string'))) : []);
  const vol = (v: unknown, def: number) => (Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v as number))) : def);
  // Before the volume sliders there was one Sound on/off switch.
  const oldSound = (r.settings as { sound?: boolean } | undefined)?.sound !== false;
  return {
    coins: Number.isFinite(r.coins) ? Math.max(0, Math.floor(r.coins as number)) : d.coins,
    owned: Array.from(new Set([...FREE_WEAPONS, ...(Array.isArray(r.owned) ? r.owned.filter((x) => typeof x === 'string') : [])])),
    hats: strs(r.hats),
    customMaps: Array.isArray(r.customMaps) ? r.customMaps.filter((m) => m && Array.isArray(m.platforms)) : [],
    settings: {
      lang: r.settings?.lang === 'th' || r.settings?.lang === 'en' ? r.settings.lang : d.settings.lang,
      fallMode: r.settings?.fallMode === 'bounce' ? 'bounce' : 'ko',
      potions: r.settings?.potions !== false,
      musicVol: vol(r.settings?.musicVol, d.settings.musicVol),
      sfxVol: vol(r.settings?.sfxVol, d.settings.sfxVol),
      musicMute: typeof r.settings?.musicMute === 'boolean' ? r.settings.musicMute : !oldSound,
      sfxMute: typeof r.settings?.sfxMute === 'boolean' ? r.settings.sfxMute : !oldSound,
      killFeed: r.settings?.killFeed !== false,
      juice: r.settings?.juice !== false,
      hideBossBars: r.settings?.hideBossBars === true,
    },
    lastMatch: r.lastMatch,
    lastSandbox: r.lastSandbox,
    achievements: strs(r.achievements),
    secrets: strs(r.secrets),
    stats: {
      catSnowWins: Number.isFinite(r.stats?.catSnowWins) ? Math.max(0, Math.floor(r.stats!.catSnowWins)) : 0,
      mapsWon: strs(r.stats?.mapsWon),
      usedWeapons: strs(r.stats?.usedWeapons),
      matches: Number.isFinite(r.stats?.matches) ? Math.max(0, Math.floor(r.stats!.matches)) : 0,
    },
    name: cleanName(r.name),
    localNames: Array.isArray(r.localNames) ? r.localNames.slice(0, 6).map(cleanName) : [],
    outbreak: Array.from({ length: OB_SLOTS }, (_, i) => obSlot(Array.isArray(r.outbreak) ? r.outbreak[i] : null)),
    zombieAlly: r.zombieAlly === true,
    sf2: r.sf2 === true,
    chef: loadChef(r.chef),
    phyl: loadPhyl(r.phyl),
    meBeat: r.meBeat === true,
    survival: { best: Number.isFinite(r.survival?.best) ? Math.max(0, Math.floor(r.survival!.best)) : 0 },
    oneD: loadOneD(r.oneD),
    threeD: loadThreeD(r.threeD),
    clothes: strs(r.clothes),
    outfit: loadOutfit(r.outfit),
    // Saves from before the profile: the first time this device opens the game with it.
    joined: Number.isFinite(r.joined) && (r.joined as number) > 0 ? (r.joined as number) : Date.now(),
    pendingZombie: r.pendingZombie === true,
    td: tdSave(r.td),
    updatedAt: Number.isFinite(r.updatedAt) ? (r.updatedAt as number) : 0,
  };
}

/** Tower Defense starts with one free Swordman, equipped. */
export function tdSave(v: unknown): TDSave {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<TDSave>;
  const units: Record<string, number> = {};
  if (o.units && typeof o.units === 'object')
    for (const [k, n] of Object.entries(o.units)) if (Number.isFinite(n) && n > 0) units[k] = Math.min(999, Math.floor(n));
  units.swordman = Math.max(1, units.swordman ?? 0);
  const equip = Array.isArray(o.equip) ? Array.from(new Set(o.equip.filter((x) => typeof x === 'string' && units[x] > 0))).slice(0, 5) : [];
  return {
    units,
    equip: equip.length ? equip : ['swordman'],
    cleared: Array.isArray(o.cleared) ? Array.from(new Set(o.cleared.filter((x) => typeof x === 'string'))) : [],
  };
}

function obSlot(v: unknown): OutbreakSave | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Partial<OutbreakSave>;
  const n = (x: unknown, lo: number, hi: number, def: number) => (Number.isFinite(x) ? Math.max(lo, Math.min(hi, Math.floor(x as number))) : def);
  return {
    wave: n(o.wave, 1, 9999, 1),
    endless: o.endless !== false,
    lives: Array.isArray(o.lives) ? o.lives.slice(0, 30).map((l) => n(l, 0, 5, 5)) : [],
    best: n(o.best, 0, 9999, 0),
    done: o.done === true,
    setup: o.setup && typeof o.setup === 'object' ? o.setup : undefined,
  };
}

type Listener = (d: SaveData) => void;

class Store {
  data: SaveData;
  private listeners: Listener[] = [];

  constructor() {
    let raw: unknown = null;
    try {
      const s = localStorage.getItem(KEY);
      if (s) raw = JSON.parse(s);
    } catch {
      /* storage blocked: play without saving */
    }
    this.data = normalize(raw);
  }

  /** Change the save, write it to this device and tell listeners (cloud sync, coin display). */
  update(fn: (d: SaveData) => void) {
    fn(this.data);
    this.data.updatedAt = Date.now();
    this.persist();
  }

  /** Replace the whole save (after merging with the cloud). */
  replace(d: SaveData) {
    this.data = d;
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
    for (const l of this.listeners) l(this.data);
  }

  onChange(l: Listener) {
    this.listeners.push(l);
  }
}

export const save = new Store();
