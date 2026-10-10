import type { FallMode, MapDef, MatchConfig } from './game/types';
import type { Lang } from './i18n';

export interface SaveData {
  coins: number;
  owned: string[];
  customMaps: MapDef[];
  /** potions: healing potions drop in matches (on by default). */
  settings: { lang: Lang; fallMode: FallMode; sound: boolean; potions: boolean };
  lastMatch?: MatchConfig;
  /** The last Sandbox setup. */
  lastSandbox?: MatchConfig;
  /** Achievement ids you have earned. */
  achievements: string[];
  /** Your name for online rooms. */
  name: string;
  /** Names typed for P1-P6 on this device. */
  localNames: string[];
  updatedAt: number;
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
    settings: { lang: thai ? 'th' : 'en', fallMode: 'ko', sound: true, potions: true },
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
  return {
    coins: Number.isFinite(r.coins) ? Math.max(0, Math.floor(r.coins as number)) : d.coins,
    owned: Array.from(new Set([...FREE_WEAPONS, ...(Array.isArray(r.owned) ? r.owned.filter((x) => typeof x === 'string') : [])])),
    customMaps: Array.isArray(r.customMaps) ? r.customMaps.filter((m) => m && Array.isArray(m.platforms)) : [],
    settings: {
      lang: r.settings?.lang === 'th' || r.settings?.lang === 'en' ? r.settings.lang : d.settings.lang,
      fallMode: r.settings?.fallMode === 'bounce' ? 'bounce' : 'ko',
      sound: r.settings?.sound !== false,
      potions: r.settings?.potions !== false,
    },
    lastMatch: r.lastMatch,
    lastSandbox: r.lastSandbox,
    achievements: Array.isArray(r.achievements) ? Array.from(new Set(r.achievements.filter((x) => typeof x === 'string'))) : [],
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
