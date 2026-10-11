import type { FallMode, MapDef, MatchConfig } from './game/types';
import type { Lang } from './i18n';

export interface SaveData {
  coins: number;
  owned: string[];
  customMaps: MapDef[];
  /** potions: healing potions drop in matches (on by default). Music and sound volumes are 0-100. */
  settings: { lang: Lang; fallMode: FallMode; potions: boolean; musicVol: number; sfxVol: number; musicMute: boolean; sfxMute: boolean };
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
  updatedAt: number;
}

export interface Stats {
  /** Grandfather Cat wins on a snow map (3 unlock the Snow Queen). */
  catSnowWins: number;
  /** Built-in maps you have won on (every one unlocks the Ancient Guardian). */
  mapsWon: string[];
  /** Weapons you have fought with (every one: The Collector). */
  usedWeapons: string[];
}

const KEY = 'stickman-fight-save-v1';
export const FREE_WEAPONS = ['sword', 'spear'];
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
    customMaps: [],
    achievements: [],
    secrets: [],
    stats: { catSnowWins: 0, mapsWon: [], usedWeapons: [] },
    settings: { lang: thai ? 'th' : 'en', fallMode: 'ko', potions: true, musicVol: 70, sfxVol: 80, musicMute: false, sfxMute: false },
    name: '',
    localNames: [],
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
    customMaps: Array.isArray(r.customMaps) ? r.customMaps.filter((m) => m && Array.isArray(m.platforms)) : [],
    settings: {
      lang: r.settings?.lang === 'th' || r.settings?.lang === 'en' ? r.settings.lang : d.settings.lang,
      fallMode: r.settings?.fallMode === 'bounce' ? 'bounce' : 'ko',
      potions: r.settings?.potions !== false,
      musicVol: vol(r.settings?.musicVol, d.settings.musicVol),
      sfxVol: vol(r.settings?.sfxVol, d.settings.sfxVol),
      musicMute: typeof r.settings?.musicMute === 'boolean' ? r.settings.musicMute : !oldSound,
      sfxMute: typeof r.settings?.sfxMute === 'boolean' ? r.settings.sfxMute : !oldSound,
    },
    lastMatch: r.lastMatch,
    lastSandbox: r.lastSandbox,
    achievements: strs(r.achievements),
    secrets: strs(r.secrets),
    stats: {
      catSnowWins: Number.isFinite(r.stats?.catSnowWins) ? Math.max(0, Math.floor(r.stats!.catSnowWins)) : 0,
      mapsWon: strs(r.stats?.mapsWon),
      usedWeapons: strs(r.stats?.usedWeapons),
    },
    name: cleanName(r.name),
    localNames: Array.isArray(r.localNames) ? r.localNames.slice(0, 6).map(cleanName) : [],
    updatedAt: Number.isFinite(r.updatedAt) ? (r.updatedAt as number) : 0,
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
