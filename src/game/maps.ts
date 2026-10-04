import type { MapDef, Platform, ThemeId, Vec } from './types';

export interface Theme {
  sky: [string, string];
  plat: string;
  top: string;
  deco: 'clouds' | 'stars' | 'snow' | 'embers';
}

export const THEMES: Record<ThemeId, Theme> = {
  day: { sky: ['#8fd3ff', '#e6f7ff'], plat: '#6b4f3a', top: '#5cc85c', deco: 'clouds' },
  sunset: { sky: ['#ff8a65', '#ffe0b2'], plat: '#5d4037', top: '#ffb74d', deco: 'clouds' },
  night: { sky: ['#0d1b3e', '#3a4a7a'], plat: '#37474f', top: '#90a4ae', deco: 'stars' },
  snow: { sky: ['#b3e5fc', '#ffffff'], plat: '#78909c', top: '#ffffff', deco: 'snow' },
  lava: { sky: ['#2b0f0f', '#a1301a'], plat: '#3e2723', top: '#ff7043', deco: 'embers' },
};

export const THEME_IDS: ThemeId[] = ['day', 'sunset', 'night', 'snow', 'lava'];

const P = (x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h });

export const BUILTIN_MAPS: MapDef[] = [
  {
    id: 'arena',
    name: 'm.arena',
    w: 1600,
    h: 900,
    theme: 'day',
    builtin: true,
    platforms: [P(200, 700, 1200, 60), P(330, 520, 260), P(1010, 520, 260), P(670, 360, 260)],
    spawns: [],
  },
  {
    id: 'sky',
    name: 'm.sky',
    w: 1600,
    h: 900,
    theme: 'sunset',
    builtin: true,
    platforms: [P(100, 640, 360, 40), P(640, 720, 320, 40), P(1140, 640, 360, 40), P(380, 450, 230), P(990, 450, 230), P(690, 290, 220)],
    spawns: [],
  },
  {
    id: 'tower',
    name: 'm.tower',
    w: 1400,
    h: 1200,
    theme: 'night',
    builtin: true,
    platforms: [P(200, 1050, 1000, 60), P(250, 870, 320), P(830, 870, 320), P(520, 700, 360), P(220, 530, 300), P(880, 530, 300), P(550, 360, 300)],
    spawns: [],
  },
  {
    id: 'bridge',
    name: 'm.bridge',
    w: 2200,
    h: 900,
    theme: 'day',
    builtin: true,
    platforms: [P(120, 650, 1960, 22), P(350, 470, 240), P(980, 430, 240), P(1610, 470, 240)],
    spawns: [],
  },
  {
    id: 'snow',
    name: 'm.snow',
    w: 1700,
    h: 1000,
    theme: 'snow',
    builtin: true,
    platforms: [P(150, 800, 420, 60), P(570, 720, 560, 60), P(1130, 800, 420, 60), P(700, 540, 300), P(300, 590, 200), P(1200, 590, 200), P(760, 380, 180)],
    spawns: [],
  },
  {
    id: 'pit',
    name: 'm.pit',
    w: 1600,
    h: 900,
    theme: 'lava',
    builtin: true,
    platforms: [P(100, 650, 520, 60), P(980, 650, 520, 60), P(700, 500, 200), P(250, 450, 200), P(1150, 450, 200)],
    spawns: [],
  },
];

export const MAP_SIZES = {
  small: { w: 1400, h: 800 },
  medium: { w: 1700, h: 950 },
  large: { w: 2200, h: 1200 },
};

/** Candidate standing spots spread across every platform. */
function platformSpots(map: MapDef): Vec[] {
  const out: Vec[] = [];
  for (const p of map.platforms) {
    if (p.w < 40) continue;
    const n = Math.max(1, Math.floor(p.w / 150));
    for (let i = 0; i < n; i++) out.push({ x: p.x + ((i + 0.5) * p.w) / n, y: p.y });
  }
  return out;
}

/** Pick `count` spawn points that are far apart. Uses the map's own spawns first. */
export function pickSpawns(map: MapDef, count: number): Vec[] {
  const pool = map.spawns.length ? [...map.spawns] : platformSpots(map);
  if (!pool.length) pool.push({ x: map.w / 2, y: map.h / 2 });
  const chosen: Vec[] = [];
  const left = [...pool];
  // Start from the left-most spot, then always take the spot farthest from the chosen ones.
  left.sort((a, b) => a.x - b.x);
  while (chosen.length < count) {
    if (!left.length) {
      // Out of spots: reuse with a small offset.
      const base = chosen[chosen.length % Math.max(1, pool.length)] ?? pool[0];
      chosen.push({ x: base.x + ((chosen.length % 3) - 1) * 40, y: base.y });
      continue;
    }
    let best = 0;
    let bestD = -1;
    for (let i = 0; i < left.length; i++) {
      let d = Infinity;
      for (const c of chosen) d = Math.min(d, Math.hypot(c.x - left[i].x, c.y - left[i].y));
      if (!chosen.length) d = i === 0 ? 1 : 0;
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    chosen.push(left.splice(best, 1)[0]);
  }
  return chosen;
}

export function allMaps(custom: MapDef[]): MapDef[] {
  return [...BUILTIN_MAPS, ...custom];
}

export function encodeMap(m: MapDef): string {
  const compact = {
    n: m.name,
    w: m.w,
    h: m.h,
    t: m.theme,
    p: m.platforms.map((p) => [p.x, p.y, p.w, p.h].map(Math.round)),
    s: m.spawns.map((s) => [Math.round(s.x), Math.round(s.y)]),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeMap(code: string): MapDef | null {
  try {
    const bin = atob(code.replaceAll('-', '+').replaceAll('_', '/'));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const c = JSON.parse(new TextDecoder().decode(bytes));
    const num = (v: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number(v) || 0));
    const w = num(c.w, 600, 4000);
    const h = num(c.h, 400, 3000);
    const platforms: Platform[] = (Array.isArray(c.p) ? c.p : [])
      .slice(0, 200)
      .map((a: number[]) => P(num(a[0], -500, w + 500), num(a[1], -500, h + 500), num(a[2], 10, 5000), num(a[3], 10, 500)));
    const spawns: Vec[] = (Array.isArray(c.s) ? c.s : []).slice(0, 24).map((a: number[]) => ({ x: num(a[0], 0, w), y: num(a[1], 0, h) }));
    if (!platforms.length) return null;
    const theme = (THEME_IDS as string[]).includes(c.t) ? (c.t as ThemeId) : 'day';
    return { id: 'c' + Date.now().toString(36), name: String(c.n || 'Map').slice(0, 30), w, h, theme, platforms, spawns };
  } catch {
    return null;
  }
}
