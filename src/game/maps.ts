import type { BlockKind, MapDef, Platform, ThemeId, Vec } from './types';

export interface Theme {
  sky: [string, string];
  plat: string;
  top: string;
  deco: 'clouds' | 'stars' | 'snow' | 'embers' | 'space' | 'beach' | 'war' | 'jungle' | 'haunted' | 'candy' | 'farm' | 'graveyard' | 'inferno' | 'pirate' | 'desert' | 'stage';
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
  beach: { sky: ['#4fc3f7', '#fff3e0'], plat: '#c8955a', top: '#ffe0a3', deco: 'beach' },
  war: { sky: ['#7d7461', '#d9c9a8'], plat: '#5d4e37', top: '#7a8450', deco: 'war' },
  jungle: { sky: ['#2e7d32', '#c5e1a5'], plat: '#6d6552', top: '#43a047', deco: 'jungle' },
  haunted: { sky: ['#1a0b2e', '#4a2c6b'], plat: '#3b3346', top: '#7e6b8f', deco: 'haunted' },
  candy: { sky: ['#f8bbd0', '#fff3e0'], plat: '#f48fb1', top: '#ffffff', deco: 'candy' },
  farm: { sky: ['#81d4fa', '#fffde7'], plat: '#8d6e63', top: '#9ccc65', deco: 'farm' },
  graveyard: { sky: ['#0d1b12', '#33473a'], plat: '#424a45', top: '#5b7f5f', deco: 'graveyard' },
  inferno: { sky: ['#1a0500', '#d84315'], plat: '#3e2f2a', top: '#8d6e63', deco: 'inferno' },
  pirate: { sky: ['#4fc3f7', '#e1f5fe'], plat: '#6d4c41', top: '#a1887f', deco: 'pirate' },
  desert: { sky: ['#ffb74d', '#fff8e1'], plat: '#c68b4e', top: '#ffd180', deco: 'desert' },
  stage: { sky: ['#12001f', '#3d0a4f'], plat: '#212121', top: '#ff4081', deco: 'stage' },
};

/** Append only (shared map links send the index). */
export const THEME_IDS: ThemeId[] = ['day', 'sunset', 'night', 'snow', 'lava', 'space', 'beach', 'war', 'jungle', 'haunted', 'candy', 'farm', 'graveyard', 'inferno', 'pirate', 'desert', 'stage'];

const P = (x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h });
/** Special block: concrete, lava or glass. */
/** Moving platform: slides dx, dy away and back every `period` seconds. */
const M = (x: number, y: number, w: number, dx: number, dy: number, period: number, phase = 0): Platform => ({ x, y, w, h: 22, move: { dx, dy, period, phase } });
const B = (kind: BlockKind, x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h, kind });

/** Block kinds in shared map links (0 = normal platform). */
const BLOCK_CODES: (BlockKind | undefined)[] = [undefined, 'concrete', 'lava', 'glass', 'sandbag', 'bounce', 'ice', 'spikes'];

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
  {
    // The Fishy boss lives here: it shows up in every mode on this map.
    id: 'beach',
    name: 'm.beach',
    w: 1900,
    h: 1000,
    theme: 'beach',
    builtin: true,
    deco: 'palms',
    platforms: [
      // The sand, a wooden pier and floating rafts
      P(120, 760, 1180, 70),
      P(1300, 780, 480, 26),
      P(260, 570, 260),
      P(860, 500, 280),
      P(1420, 590, 240),
      P(560, 360, 220),
      P(1180, 340, 200),
    ],
    spawns: [],
  },
  {
    // Moving platforms: time your jumps!
    id: 'elevator',
    name: 'm.elevator',
    w: 1800,
    h: 1000,
    theme: 'night',
    builtin: true,
    platforms: [
      P(100, 780, 400, 60),
      P(1300, 780, 400, 60),
      // A ferry across the gap, two lifts and a fast shuttle up top
      M(540, 760, 220, 500, 0, 6),
      M(520, 620, 170, 0, -280, 4.5),
      M(1110, 620, 170, 0, -280, 4.5, 0.5),
      P(770, 430, 260),
      M(260, 280, 190, 1090, 0, 8, 0.25),
      P(170, 540, 170),
      P(1460, 540, 170),
    ],
    spawns: [],
  },
  {
    // The War map: hide behind the sandbags, they stop bullets.
    id: 'war',
    name: 'm.war',
    w: 2000,
    h: 1000,
    theme: 'war',
    builtin: true,
    platforms: [
      P(80, 800, 1840, 70),
      // Sandbag walls on the battlefield
      B('sandbag', 330, 730, 90, 70),
      B('sandbag', 760, 745, 70, 55),
      B('sandbag', 1170, 745, 70, 55),
      B('sandbag', 1580, 730, 90, 70),
      // Two bunkers, a hill in the middle and two watchtowers
      P(150, 580, 300),
      B('sandbag', 380, 530, 70, 50),
      P(1550, 580, 300),
      B('sandbag', 1550, 530, 70, 50),
      P(800, 560, 400),
      B('sandbag', 800, 515, 60, 45),
      B('sandbag', 1140, 515, 60, 45),
      P(500, 400, 180),
      P(1320, 400, 180),
      P(880, 270, 240),
    ],
    spawns: [],
  },
  {
    // Jungle Ruins: old stone ruins, gaps in the ground and swinging log platforms.
    id: 'jungle',
    name: 'm.jungle',
    w: 1900,
    h: 1050,
    theme: 'jungle',
    builtin: true,
    platforms: [
      P(80, 820, 640, 70),
      P(1180, 820, 640, 70),
      M(800, 840, 300, 0, -120, 5),
      B('concrete', 300, 700, 120, 120),
      B('concrete', 1480, 700, 120, 120),
      P(160, 560, 280),
      P(1460, 560, 280),
      P(780, 600, 340),
      M(520, 430, 180, 140, 0, 4),
      M(1200, 430, 180, -140, 0, 4),
      P(830, 280, 240),
    ],
    spawns: [],
  },
  {
    // Haunted Castle: two towers, a broken bridge of glass and a ghostly lift in the middle.
    id: 'haunted',
    name: 'm.haunted',
    w: 1800,
    h: 1150,
    theme: 'haunted',
    builtin: true,
    platforms: [
      P(100, 900, 1600, 70),
      B('concrete', 160, 560, 220, 340),
      B('concrete', 1420, 560, 220, 340),
      P(140, 420, 260),
      P(1400, 420, 260),
      B('glass', 400, 560, 330, 20),
      B('glass', 1070, 560, 330, 20),
      M(800, 760, 200, 0, -420, 6),
      P(760, 260, 280),
      P(560, 720, 160),
      P(1080, 720, 160),
    ],
    spawns: [],
  },
  {
    // Candy Land: soft pink ground, floating candy bars and bouncing gumdrop lifts.
    id: 'candy',
    name: 'm.candy',
    w: 1700,
    h: 1000,
    theme: 'candy',
    builtin: true,
    platforms: [
      P(150, 780, 1400, 60),
      P(260, 600, 240),
      P(1200, 600, 240),
      M(690, 560, 320, 0, 80, 3),
      P(420, 420, 200),
      P(1080, 420, 200),
      M(760, 280, 180, 220, 0, 5),
      P(100, 340, 160),
      P(1440, 340, 160),
    ],
    spawns: [],
  },
  {
    // Farm: a long field, hay bales to hide behind, the barn roof up high and a tractor trailer that rolls back and forth.
    id: 'farm',
    name: 'm.farm',
    w: 1900,
    h: 1000,
    theme: 'farm',
    builtin: true,
    platforms: [
      P(100, 800, 1700, 70),
      B('concrete', 360, 730, 90, 70),
      B('concrete', 1450, 730, 90, 70),
      B('concrete', 900, 740, 100, 60),
      M(560, 600, 220, 560, 0, 7),
      P(160, 540, 220),
      P(1520, 540, 220),
      P(700, 400, 500),
      B('concrete', 900, 340, 100, 60),
      P(300, 300, 180),
      P(1420, 300, 180),
    ],
    spawns: [],
  },
  {
    // Graveyard: rows of tombstones, a crypt in the middle with a lift over it, and floating ghost platforms made of glass.
    id: 'graveyard',
    name: 'm.graveyard',
    w: 1800,
    h: 1100,
    theme: 'graveyard',
    builtin: true,
    platforms: [
      P(80, 860, 1640, 70),
      M(820, 740, 160, 0, -110, 4),
      B('concrete', 220, 800, 40, 60),
      B('concrete', 520, 800, 40, 60),
      B('concrete', 1240, 800, 40, 60),
      B('concrete', 1540, 800, 40, 60),
      B('concrete', 720, 520, 360, 40),
      P(200, 620, 240),
      P(1360, 620, 240),
      B('glass', 420, 420, 200, 20),
      B('glass', 1180, 420, 200, 20),
      P(780, 260, 240),
    ],
    spawns: [],
  },
  {
    // Burning City: the rooftops of a city on fire. Burning lava streets down below, a broken glass tower and a bounce pad on a car roof.
    id: 'burning',
    name: 'm.burning',
    w: 2000,
    h: 1100,
    theme: 'inferno',
    builtin: true,
    platforms: [
      B('lava', 0, 1020, 2000, 80),
      B('concrete', 80, 760, 360, 260),
      B('concrete', 620, 640, 260, 380),
      B('concrete', 1120, 700, 300, 320),
      B('concrete', 1600, 780, 320, 240),
      B('bounce', 960, 960, 90, 20),
      B('glass', 660, 440, 180, 20),
      P(220, 560, 180),
      P(1200, 500, 200),
      M(880, 330, 200, 0, -120, 5),
      P(1640, 560, 200),
      P(420, 300, 160),
      P(1480, 300, 160),
    ],
    spawns: [],
  },
  {
    // Pirate Ship: the deck of a big ship on the sea (fall off and you're in the water). The mast is a lift, the crow's nest at the top.
    id: 'pirate',
    name: 'm.pirate',
    w: 1900,
    h: 1000,
    theme: 'pirate',
    builtin: true,
    deco: 'ship',
    platforms: [
      P(260, 760, 1380, 60),
      B('concrete', 260, 640, 260, 120),
      B('concrete', 1380, 600, 260, 160),
      M(900, 660, 100, 0, -360, 6),
      P(840, 230, 220),
      P(560, 470, 220),
      P(1120, 470, 220),
      B('sandbag', 700, 720, 70, 40),
      B('sandbag', 1130, 720, 70, 40),
      P(40, 560, 140),
      P(1720, 560, 140),
    ],
    spawns: [],
  },
  {
    // Desert: sand dunes with cactus spikes, a slippery ice oasis in the middle and bounce pads to jump up to the cliffs.
    id: 'desert',
    name: 'm.desert',
    w: 2000,
    h: 1000,
    theme: 'desert',
    builtin: true,
    platforms: [
      P(80, 820, 1840, 70),
      B('spikes', 520, 800, 120, 20),
      B('spikes', 1360, 800, 120, 20),
      B('ice', 860, 640, 280, 24),
      B('bounce', 300, 800, 80, 20),
      B('bounce', 1620, 800, 80, 20),
      B('concrete', 120, 480, 300, 40),
      B('concrete', 1580, 480, 300, 40),
      M(760, 380, 180, 300, 0, 6),
      P(880, 220, 240),
      B('spikes', 960, 200, 80, 20),
    ],
    spawns: [],
  },
  {
    // October 21: a rock concert. Speaker stacks to stand on, a lighting rig up top that slides, and bounce pads by the stage.
    id: 'stage',
    name: 'm.stage',
    w: 1900,
    h: 1000,
    theme: 'stage',
    builtin: true,
    platforms: [
      P(200, 800, 1500, 60),
      B('bounce', 230, 780, 80, 20),
      B('bounce', 1590, 780, 80, 20),
      B('concrete', 40, 600, 160, 40),
      B('concrete', 1700, 600, 160, 40),
      P(560, 620, 260),
      P(1080, 620, 260),
      B('glass', 820, 470, 260, 20),
      M(520, 300, 300, 560, 0, 7),
      P(860, 160, 180),
    ],
    spawns: [],
  },
];

/** The built-in maps the Ancient Guardian unlock counts (the ones from before the October 18 maps, so the new maps don't make it harder). */
export const GUARDIAN_MAPS = ['arena', 'sky', 'tower', 'bridge', 'snow', 'pit', 'volcano', 'factory', 'glass', 'rooftops', 'frozen', 'space', 'beach', 'elevator', 'war'];

export const MAP_SIZES = {
  small: { w: 1400, h: 800 },
  medium: { w: 1700, h: 950 },
  large: { w: 2200, h: 1200 },
};

/** Candidate standing spots spread across every platform. */
function platformSpots(map: MapDef): Vec[] {
  const out: Vec[] = [];
  for (const p of map.platforms) {
    if (p.w < 40 || p.kind === 'lava' || p.kind === 'spikes') continue;
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
      const k = Math.max(0, BLOCK_CODES.indexOf(p.kind));
      // Moving platforms: how far and how fast too.
      if (p.move) return [...a, k, Math.round(p.move.dx), Math.round(p.move.dy), Math.round(p.move.period * 10) / 10];
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
        const q: Platform = kind ? { ...p, kind } : p;
        if (a.length >= 8) q.move = { dx: num(a[5], -3000, 3000), dy: num(a[6], -3000, 3000), period: num(a[7], 1, 30) };
        return q;
      });
    const spawns: Vec[] = (Array.isArray(c.s) ? c.s : []).slice(0, 24).map((a: number[]) => ({ x: num(a[0], 0, w), y: num(a[1], 0, h) }));
    if (!platforms.length) return null;
    const theme = (THEME_IDS as string[]).includes(c.t) ? (c.t as ThemeId) : 'day';
    return { id: 'c' + Date.now().toString(36), name: String(c.n || 'Map').slice(0, 30), w, h, theme, platforms, spawns };
  } catch {
    return null;
  }
}
