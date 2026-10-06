import type { BlockKind, MapDef, Platform, ThemeId, Vec } from './types';

export interface Theme {
  sky: [string, string];
  plat: string;
  top: string;
  deco: 'clouds' | 'stars' | 'snow' | 'embers' | 'space';
  /** Gravity multiplier (space: low gravity, you jump higher and fall slower). */
  gravity?: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  day: { sky: ['#8fd3ff', '#e6f7ff'], plat: '#6b4f3a', top: '#5cc85c', deco: 'clouds' },
  sunset: { sky: ['#ff8a65', '#ffe0b2'], plat: '#5d4037', top: '#ffb74d', deco: 'clouds' },
  night: { sky: ['#0d1b3e', '#3a4a7a'], plat: '#37474f', top: '#90a4ae', deco: 'stars' },
  snow: { sky: ['#b3e5fc', '#ffffff'], plat: '#78909c', top: '#ffffff', deco: 'snow' },
  lava: { sky: ['#2b0f0f', '#a1301a'], plat: '#3e2723', top: '#ff7043', deco: 'embers' },
  space: { sky: ['#05010f', '#1a1240'], plat: '#4a4458', top: '#9e97b8', deco: 'space', gravity: 0.55 },
};

export const THEME_IDS: ThemeId[] = ['day', 'sunset', 'night', 'snow', 'lava', 'space'];

const P = (x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h });
/** Special block: concrete, lava or glass. */
const B = (kind: BlockKind, x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h, kind });

/** Block kinds in shared map links (0 = normal platform). */
const BLOCK_CODES: (BlockKind | undefined)[] = [undefined, 'concrete', 'lava', 'glass'];

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
  {
    id: 'volcano',
    name: 'm.volcano',
    w: 1800,
    h: 1000,
    theme: 'lava',
    builtin: true,
    platforms: [
      P(150, 780, 460, 60),
      B('lava', 610, 830, 580, 40),
      P(1190, 780, 460, 60),
      B('concrete', 680, 640, 440, 28),
      P(280, 600, 220),
      P(1300, 600, 220),
      B('glass', 780, 470, 240, 20),
      P(820, 310, 160),
      B('lava', 380, 470, 120, 20),
      B('lava', 1300, 470, 120, 20),
    ],
    spawns: [],
  },
  {
    id: 'factory',
    name: 'm.factory',
    w: 1700,
    h: 950,
    theme: 'day',
    builtin: true,
    platforms: [
      B('concrete', 150, 760, 610, 60),
      B('lava', 760, 760, 180, 60),
      B('concrete', 940, 760, 610, 60),
      B('concrete', 250, 580, 300),
      B('glass', 600, 590, 500, 20),
      B('concrete', 1150, 580, 300),
      B('concrete', 430, 410, 250),
      B('concrete', 1020, 410, 250),
      B('glass', 700, 250, 300, 20),
    ],
    spawns: [],
  },
  {
    id: 'glass',
    name: 'm.glass',
    w: 1600,
    h: 1100,
    theme: 'night',
    builtin: true,
    platforms: [
      P(200, 950, 1200, 60),
      B('glass', 150, 790, 400, 20),
      B('glass', 1050, 790, 400, 20),
      B('glass', 550, 640, 500, 20),
      B('glass', 250, 480, 300, 20),
      B('glass', 1050, 480, 300, 20),
      B('glass', 600, 330, 400, 20),
      B('concrete', 720, 180, 160),
    ],
    spawns: [],
  },
  {
    id: 'rooftops',
    name: 'm.rooftops',
    w: 2000,
    h: 1000,
    theme: 'sunset',
    builtin: true,
    platforms: [
      B('concrete', 100, 700, 350, 300),
      B('glass', 450, 700, 150, 16),
      B('concrete', 600, 620, 300, 380),
      B('glass', 900, 650, 200, 16),
      B('concrete', 1100, 680, 300, 320),
      B('glass', 1400, 660, 150, 16),
      B('concrete', 1550, 600, 350, 400),
      P(680, 450, 160),
      P(1200, 500, 180),
      P(250, 520, 150),
      B('concrete', 1650, 430, 180),
    ],
    spawns: [],
  },
  {
    id: 'frozen',
    name: 'm.frozen',
    w: 1800,
    h: 1000,
    theme: 'snow',
    builtin: true,
    platforms: [
      P(150, 800, 500, 60),
      B('glass', 650, 820, 500, 20),
      P(1150, 800, 500, 60),
      B('concrete', 350, 620, 260),
      B('concrete', 1190, 620, 260),
      P(760, 560, 280),
      B('glass', 450, 430, 240, 20),
      B('glass', 1110, 430, 240, 20),
      B('concrete', 800, 300, 200),
    ],
    spawns: [],
  },
  {
    id: 'space',
    name: 'm.space',
    w: 2000,
    h: 1100,
    theme: 'space',
    builtin: true,
    deco: 'spaceship',
    platforms: [
      // The spaceship in the middle: main deck, glass cockpit and two wings.
      B('concrete', 640, 640, 720, 40),
      B('glass', 840, 470, 320, 20),
      B('concrete', 520, 720, 120, 20),
      B('concrete', 1360, 720, 120, 20),
      // Asteroids around it
      P(120, 780, 280, 50),
      P(1600, 780, 280, 50),
      P(300, 540, 180),
      P(1520, 540, 180),
      P(900, 290, 200),
      P(160, 330, 140),
      P(1700, 330, 140),
    ],
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
    if (p.w < 40 || p.kind === 'lava') continue;
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
    p: m.platforms.map((p) => {
      const a = [p.x, p.y, p.w, p.h].map(Math.round);
      const k = BLOCK_CODES.indexOf(p.kind);
      return k > 0 ? [...a, k] : a;
    }),
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
      .map((a: number[]) => {
        const p = P(num(a[0], -500, w + 500), num(a[1], -500, h + 500), num(a[2], 10, 5000), num(a[3], 10, 500));
        const kind = BLOCK_CODES[Math.floor(num(a[4], 0, BLOCK_CODES.length - 1))];
        return kind ? { ...p, kind } : p;
      });
    const spawns: Vec[] = (Array.isArray(c.s) ? c.s : []).slice(0, 24).map((a: number[]) => ({ x: num(a[0], 0, w), y: num(a[1], 0, h) }));
    if (!platforms.length) return null;
    const theme = (THEME_IDS as string[]).includes(c.t) ? (c.t as ThemeId) : 'day';
    return { id: 'c' + Date.now().toString(36), name: String(c.n || 'Map').slice(0, 30), w, h, theme, platforms, spawns };
  } catch {
    return null;
  }
}
