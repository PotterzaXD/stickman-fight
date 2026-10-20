import type { Cat, Fighter } from './entities';
import type { Game } from './game';
import type { WeaponId } from './weapons';
import type { ProjKind } from './entities';

/**
 * Death finishers: how a stickman goes down.
 * pop = the original burst. void = fell off the map: no pop, no finisher.
 */
export type Finish = 'pop' | 'ragdoll' | 'fling' | 'half' | 'ashes' | 'sky' | 'trip' | 'void' | 'shatter' | 'zap' | 'slip' | 'pieces';
export const FINISHES: Finish[] = ['pop', 'ragdoll', 'fling', 'half', 'ashes', 'sky', 'trip', 'void', 'shatter', 'zap', 'slip', 'pieces'];

/** Finisher for a normal weapon hit (and the sword dash / spear thrust). Weapons not listed keep the pop. */
export const MELEE_FINISH: Partial<Record<WeaponId, Finish>> = {
  sword: 'ragdoll',
  spear: 'ragdoll',
  hammer: 'ragdoll',
  bow: 'ragdoll',
  boomerang: 'ragdoll',
  bomb: 'ragdoll',
  axe: 'half',
  shuriken: 'fling',
  laser: 'ragdoll',
  staff: 'fling',
  six7: 'sky',
  poop: 'ragdoll',
  treasure: 'ragdoll',
  soup: 'ragdoll',
  catcall: 'ragdoll',
  ice: 'shatter',
  thunder: 'zap',
  banana: 'slip',
  stick: 'ragdoll',
  mascotstick: 'ragdoll',
  firesword: 'ashes',
  recall: 'ragdoll',
  dart: 'ragdoll',
  glove: 'fling',
  magnet: 'ragdoll',
  rocket: 'ragdoll',
  horns: 'fling',
  headbutt: 'fling',
  trident: 'ragdoll',
  sniper: 'ragdoll',
  shotgun: 'ragdoll',
  pistol: 'ragdoll',
  gun67: 'sky',
  summoner: 'ragdoll',
  bravery: 'ragdoll',
  pan: 'fling',
  watergun: 'ragdoll',
  bubble: 'ragdoll',
  chainsaw: 'half',
  yoyo: 'ragdoll',
  crossbow: 'ragdoll',
  whip: 'zap',
  fryfish: 'fling',
  chicklord: 'ragdoll',
  lilpigeon: 'ragdoll',
  bone: 'fling',
  egg: 'ragdoll',
  gum: 'ragdoll',
  drumstick: 'fling',
};

/** Finisher for a skill shot. */
export const PROJ_FINISH: Partial<Record<ProjKind, Finish>> = {
  arrow: 'ragdoll',
  boomerang: 'ragdoll',
  bomb: 'pop',
  axe: 'half',
  shuriken: 'fling',
  laser: 'half',
  fireball: 'ashes',
  six7: 'sky',
  poop: 'pop',
  soup: 'ashes',
  icebolt: 'shatter',
  banana: 'slip',
  fireslash: 'ashes',
  dart: 'ragdoll',
  memorybox: 'fling',
  rocket: 'fling',
  nerf: 'ragdoll',
  bullet67: 'sky',
  water: 'fling',
  bubble: 'pop',
  yoyo: 'ragdoll',
  fishthrow: 'fling',
  allyfire: 'ragdoll',
  egg: 'trip',
  gum: 'ragdoll',
};

/** One flying body part (shotgun point blank: blown to pieces). */
export interface Part {
  kind: 'head' | 'torso' | 'limb';
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  len: number;
  /** Bounces left (the head boings a few times). */
  bounces: number;
}

interface Pt {
  x: number;
  y: number;
  px: number;
  py: number;
}

// Ragdoll points: head, neck, chest, belly, hip, hands, feet.
const HEAD = 0,
  NECK = 1,
  CHEST = 2,
  BELLY = 3,
  HIP = 4,
  LH = 5,
  RH = 6,
  LF = 7,
  RF = 8;
/** Bones that are drawn. The chest-belly bone is the one an axe or laser cuts. */
const BONES: [number, number][] = [
  [HEAD, NECK],
  [NECK, CHEST],
  [CHEST, BELLY],
  [BELLY, HIP],
  [NECK, LH],
  [NECK, RH],
  [HIP, LF],
  [HIP, RF],
];

export interface Corpse {
  style: Finish;
  color: string;
  s: number;
  boss: boolean;
  mascot: boolean;
  t: number;
  life: number;
  /** Body parts flying apart (pieces). */
  parts?: Part[];
  /** Ragdoll points (ragdoll, fling, half). */
  pts?: Pt[];
  sticks?: [number, number, number][];
  /** Stiff body (ashes, sky, trip, shatter, zap, slip). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  done?: boolean;
  /** Not a stickman: a cat's grave, a cooked fish, the fried Pigeon, or the Recall Memory boss fading away. */
  prop?: Prop;
  facing?: number;
}

export type Prop = 'grave' | 'cooked' | 'fried' | 'fade' | 'nugget' | 'drumstick' | 'pixels' | 'beefall';

function ragdoll(f: Fighter, vx: number, vy: number, spin: number, cut: boolean) {
  const s = f.scale;
  const x = f.x;
  const y = f.y;
  const d = f.facing;
  const pos: [number, number][] = [
    [x, y - 73 * s],
    [x, y - 62 * s],
    [x, y - 50 * s],
    [x, y - 46 * s],
    [x, y - 34 * s],
    [x - d * 14 * s, y - 48 * s],
    [x + d * 16 * s, y - 52 * s],
    [x - 9 * s, y],
    [x + 9 * s, y],
  ];
  const dt = 1 / 120;
  const pts: Pt[] = pos.map(([px, py], i) => {
    // Spin: the top and the feet move opposite ways.
    const k = (y - 36 * s - py) / (40 * s);
    const svx = vx + spin * k * 60 * s;
    return { x: px, y: py, px: px - svx * dt, py: py - vy * dt + (i % 2 ? 0.2 : -0.2) };
  });
  const sticks: [number, number, number][] = BONES.filter(([a, b]) => !(cut && a === CHEST && b === BELLY)).map(([a, b]) => [a, b, Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1])]);
  // Hidden bones that keep the head and torso from folding flat.
  const stiff: [number, number][] = cut ? [[HEAD, CHEST]] : [
    [HEAD, CHEST],
    [NECK, BELLY],
    [CHEST, HIP],
  ];
  for (const [a, b] of stiff) sticks.push([a, b, Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1])]);
  if (cut) {
    // The two halves fly apart.
    for (const i of [HEAD, NECK, CHEST, LH, RH]) {
      pts[i].px -= d * 2;
      pts[i].py += 3;
    }
    for (const i of [BELLY, HIP, LF, RF]) pts[i].px += d * 1;
  }
  return { pts, sticks };
}

/** Make the body that stays behind after a stickman is knocked out. */
export function makeCorpse(f: Fighter, style: Finish): Corpse | null {
  if (style === 'pop' || style === 'void') return null;
  // The Pigeon comes down fried: crispy brown and black.
  if (f.pigeon) return propCorpse('fried', f.x, f.y, f.color, f.facing, 8);
  const c: Corpse = {
    style,
    color: f.color,
    s: f.scale,
    boss: f.boss,
    mascot: f.mascot,
    t: 0,
    life: 4,
    x: f.x,
    y: f.y,
    vx: f.vx,
    vy: f.vy,
    rot: 0,
    vr: 0,
  };
  const dir = Math.sign(f.vx) || -f.facing || 1;
  if (style === 'ragdoll' || style === 'fling' || style === 'half') {
    let vx = f.vx;
    let vy = Math.min(f.vy, -200);
    if (style === 'fling') {
      vx = dir * 1300;
      vy = -1400;
    }
    if (f.boss) {
      vx *= 0.5;
      vy *= 0.6;
    }
    const r = ragdoll(f, vx, vy, style === 'fling' ? dir * 14 : dir * 4, style === 'half');
    c.pts = r.pts;
    c.sticks = r.sticks;
  } else if (style === 'sky') {
    c.vx = dir * 250;
    c.vy = -2600;
    c.vr = dir * 14;
    c.life = 2.2;
  } else if (style === 'trip') {
    c.vx = (Math.sign(f.vx) || f.facing) * 260;
    c.vy = 0;
    c.vr = 0;
    c.rot = 0;
  } else if (style === 'slip') {
    c.vx = dir * 650;
    c.vy = -700;
    c.vr = -dir * 16;
    c.life = 2.5;
  } else if (style === 'pieces') {
    // Blown to pieces: head, body, two arms and two legs fly every way, spinning.
    const s = f.scale;
    const push = Math.sign(f.vx) || -f.facing || 1;
    const kinds: [Part['kind'], number, number][] = [
      ['head', 0, -73],
      ['torso', 0, -48],
      ['limb', -10, -50],
      ['limb', 10, -50],
      ['limb', -6, -16],
      ['limb', 6, -16],
    ];
    c.parts = kinds.map(([kind, dx, dy], i) => ({
      kind,
      x: f.x + dx * s,
      y: f.y + dy * s,
      vx: push * (250 + Math.random() * 500) + (dx || (i % 2 ? 1 : -1) * 6) * 45,
      vy: -(700 + Math.random() * 700) * (kind === 'head' ? 1.3 : 1),
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 26,
      len: (kind === 'torso' ? 28 : 22) * s,
      bounces: kind === 'head' ? 4 : 2,
    }));
    c.life = 3.5;
  } else if (style === 'ashes') c.life = 3;
  else if (style === 'shatter') c.life = 1.2;
  else if (style === 'zap') c.life = 1.4;
  return c;
}

function propCorpse(prop: Prop, x: number, y: number, color: string, facing: number, life: number): Corpse {
  return { style: 'trip', prop, color, s: 1, boss: false, mascot: false, t: 0, life, x, y, vx: 0, vy: prop === 'fade' ? 0 : -250, rot: 0, vr: 0, facing };
}

/** What a helper leaves behind when it goes down (not when it falls into the void). Snowmen just pop. */
export function helperCorpse(c: Cat): Corpse | null {
  switch (c.variant) {
    case 'cat':
      return propCorpse('grave', c.x, c.y, c.color, c.facing, 6);
    case 'fish':
      return propCorpse('cooked', c.x, c.y, c.color, c.facing, 6);
    case 'memory':
      return propCorpse('fade', c.x, c.y, c.color, c.facing, 1.4);
    case 'redguy':
    case 'skeleton':
    case 'dog':
      // They stay where they went down instead: frozen, a pile of bones, asleep (see Game.kill).
      return null;
    case 'chick':
      return propCorpse('nugget', c.x, c.y, c.color, c.facing, 5);
    case 'chicken':
      return propCorpse('drumstick', c.x, c.y, c.color, c.facing, 6);
    case 'lilpigeon': {
      // Fried like the Pigeon, but little.
      const p = propCorpse('fried', c.x, c.y, c.color, c.facing, 6);
      p.s = 0.3;
      return p;
    }
    case 'retro':
      return propCorpse('pixels', c.x, c.y, '#111111', c.facing, 1.2);
    case 'bee':
      return propCorpse('beefall', c.x, c.y, '#fdd835', c.facing, 1.2);
    case 'soldier':
    case 'sbsnow':
    case 'fireally':
    case 'ninja':
    case 'zombie':
    case 'znormal':
    case 'zshooter':
    case 'zmini':
    case 'zbig':
    case 'zrunner':
    case 'zexploder':
    case 'zboss': {
      // Ragdoll like a stickman (soldiers, ninjas, zombies and the Stick Brawl allies are stickmen). Small and big zombies too.
      const scale = c.h / 80;
      const body = { x: c.x, y: c.y, vx: c.vx, vy: c.vy, facing: c.facing, color: c.variant === 'ninja' ? '#212121' : c.color, scale, boss: false, mascot: false, pigeon: false } as Fighter;
      return makeCorpse(body, 'ragdoll');
    }
  }
  return null;
}

function landY(g: Game, x: number, prevY: number, y: number): number | null {
  let best: number | null = null;
  g.map.platforms.forEach((p, i) => {
    if (!g.solid(i) || x < p.x || x > p.x + p.w) return;
    if (prevY <= p.y + 2 && y >= p.y && (best === null || p.y < best)) best = p.y;
  });
  return best;
}

/** Move every body that stays behind. Runs on every device (no randomness that matters). */
export function updateCorpses(g: Game, dt: number) {
  const grav = g.gravity;
  for (const c of g.corpses) {
    c.t += dt;
    if (c.prop) {
      // The Recall Memory boss floats up as it fades; the rest drop to the ground and stay a while.
      if (c.prop === 'fade') c.y -= 40 * dt;
      else {
        const prevY = c.y;
        c.vy += grav * dt;
        c.y += c.vy * dt;
        if (c.vy > 0) {
          const ly = landY(g, c.x, prevY, c.y);
          if (ly !== null) {
            c.y = ly;
            c.vy = 0;
          }
        }
      }
      continue;
    }
    if (c.pts && c.sticks) {
      for (const p of c.pts) {
        const vx = (p.x - p.px) * 0.995;
        const vy = (p.y - p.py) * 0.995;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + grav * dt * dt;
      }
      for (let it = 0; it < 4; it++) {
        for (const [a, b, len] of c.sticks) {
          const A = c.pts[a];
          const B = c.pts[b];
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const d = Math.hypot(dx, dy) || 0.001;
          const k = ((d - len) / d) * 0.5;
          A.x += dx * k;
          A.y += dy * k;
          B.x -= dx * k;
          B.y -= dy * k;
        }
        for (const p of c.pts) {
          const ly = landY(g, p.x, p.py, p.y);
          if (ly !== null) {
            p.y = ly;
            // Friction on the ground
            p.px = p.x - (p.x - p.px) * 0.6;
            p.py = p.y;
          }
        }
      }
      continue;
    }
    if (c.parts) {
      for (const p of c.parts) {
        const prevY = p.y;
        p.vy += grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.vy > 0) {
          const ly = landY(g, p.x, prevY, p.y);
          if (ly !== null) {
            p.y = ly;
            if (p.bounces > 0) {
              // Boing!
              p.bounces--;
              p.vy = -Math.abs(p.vy) * 0.55;
              p.vx *= 0.7;
              p.vr *= 0.7;
              if (p.kind === 'head' && p.bounces === 3) g.text(p.x, p.y - 30, 'boing!', '#ffeb3b', 20);
            } else {
              p.vy = 0;
              p.vx *= 0.8;
              p.vr *= 0.8;
            }
          }
        }
      }
      continue;
    }
    switch (c.style) {
      case 'sky':
        c.vy -= 900 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.vr * dt;
        break;
      case 'slip':
        c.vy += grav * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.vr * dt;
        break;
      case 'trip': {
        // Trip forward, then fall flat on the face.
        const dir = Math.sign(c.vx) || 1;
        if (c.t < 0.5) {
          c.x += c.vx * dt * (1 - c.t * 2);
          c.rot = dir * Math.min(Math.PI / 2, (c.t / 0.5) ** 2 * (Math.PI / 2));
        }
        if (c.t >= 0.5 && c.t < 0.55) g.burst(c.x + dir * 50 * c.s, c.y, '#bcaaa4', 6, 160, false);
        break;
      }
      case 'ashes':
        if (c.t > 0.7 && !c.done) {
          c.done = true;
          for (let k = 0; k < 4; k++) g.burst(c.x, c.y - (15 + k * 18) * c.s, '#424242', 8, 140, false);
        }
        break;
      case 'shatter':
        if (c.t > 0.45 && !c.done) {
          c.done = true;
          for (let k = 0; k < 4; k++) g.burst(c.x, c.y - (10 + k * 20) * c.s, k % 2 ? '#b3e5fc' : '#e1f5fe', 10, 380, false);
        }
        break;
      case 'zap':
        if (c.t > 0.6 && !c.done) {
          c.done = true;
          for (let k = 0; k < 3; k++) g.burst(c.x, c.y - (20 + k * 25) * c.s, '#9e9e9e', 8, 120, false);
        }
        break;
    }
  }
  g.corpses = g.corpses.filter((c) => c.t < c.life && c.y < g.map.h + 1500 && c.y > -4000);
}

type Ctx = CanvasRenderingContext2D;

/** A stiff stickman drawn around its feet, turned by `rot`. */
function drawPose(ctx: Ctx, c: Corpse, color: string, outline: string, eyes: boolean) {
  const s = c.s;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.rot);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-9 * s, 0);
    ctx.lineTo(0, -34 * s);
    ctx.lineTo(9 * s, 0);
    ctx.moveTo(0, -34 * s);
    ctx.lineTo(0, -62 * s);
    ctx.moveTo(-15 * s, -46 * s);
    ctx.lineTo(0, -58 * s);
    ctx.lineTo(15 * s, -46 * s);
  };
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8 * s;
  path();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5 * s;
  path();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(0, -73 * s, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (eyes) {
    // KO eyes: little crosses
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6 * s;
    for (const ex of [-4, 4]) {
      ctx.beginPath();
      ctx.moveTo((ex - 2) * s, -77 * s);
      ctx.lineTo((ex + 2) * s, -73 * s);
      ctx.moveTo((ex + 2) * s, -77 * s);
      ctx.lineTo((ex - 2) * s, -73 * s);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawRagdoll(ctx: Ctx, c: Corpse) {
  const pts = c.pts!;
  const s = c.s;
  const outline = c.mascot ? 'rgba(0,0,0,0)' : c.boss ? '#ff1744' : 'rgba(0,0,0,0.8)';
  ctx.lineCap = 'round';
  const bones = BONES.filter(([a, b]) => !(c.style === 'half' && a === CHEST && b === BELLY));
  for (const [w, col] of [
    [8, outline],
    [5, c.color],
  ] as [number, string][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w * s;
    ctx.beginPath();
    for (const [a, b] of bones) {
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
    }
    ctx.stroke();
  }
  if (c.style === 'half') {
    // Clean cut ends
    ctx.fillStyle = c.color;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2 * s;
    for (const i of [CHEST, BELLY]) {
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.fillStyle = c.color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(pts[HEAD].x, pts[HEAD].y, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!c.mascot) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6 * s;
    const hx = pts[HEAD].x;
    const hy = pts[HEAD].y - 2 * s;
    for (const ex of [-4, 4]) {
      ctx.beginPath();
      ctx.moveTo(hx + (ex - 2) * s, hy - 2 * s);
      ctx.lineTo(hx + (ex + 2) * s, hy + 2 * s);
      ctx.moveTo(hx + (ex + 2) * s, hy - 2 * s);
      ctx.lineTo(hx + (ex - 2) * s, hy + 2 * s);
      ctx.stroke();
    }
  }
}

/** Blown to pieces: spinning arms and legs, and the head with googly eyes and its tongue out. */
function drawPieces(ctx: Ctx, c: Corpse, outline: string, time: number) {
  const s = c.s;
  ctx.lineCap = 'round';
  for (const p of c.parts!) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === 'head') {
      ctx.fillStyle = c.color;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.arc(0, 0, 11 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Googly eyes that roll around
      for (const [ex, sz] of [[-4, 4], [4.5, 3.2]] as [number, number][]) {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.arc(ex * s, -2 * s, sz * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const a = time * 9 + ex;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ex * s + Math.cos(a) * sz * 0.45 * s, -2 * s + Math.sin(a) * sz * 0.45 * s, sz * 0.45 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tongue out
      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.ellipse(1 * s, 7 * s, 2.6 * s, 4 * s, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (const [w, col] of [
        [8, outline],
        [5, c.color],
      ] as [number, string][]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w * s;
        ctx.beginPath();
        ctx.moveTo(-p.len / 2, 0);
        ctx.lineTo(p.len / 2, 0);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export function drawCorpse(ctx: Ctx, c: Corpse, time: number) {
  const fade = Math.min(1, (c.life - c.t) / 0.8);
  ctx.globalAlpha = Math.max(0, fade);
  const outline = c.mascot ? 'rgba(0,0,0,0)' : c.boss ? '#ff1744' : 'rgba(0,0,0,0.8)';
  switch (c.style) {
    case 'pieces':
      drawPieces(ctx, c, outline, time);
      break;
    case 'ragdoll':
    case 'fling':
    case 'half':
      drawRagdoll(ctx, c);
      break;
    case 'sky':
    case 'slip':
    case 'trip':
      drawPose(ctx, c, c.color, outline, !c.mascot);
      if (c.style === 'sky' && c.t > 0.9) {
        // Twinkle as it leaves the screen
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff59d';
        const r = 10 + Math.sin(time * 30) * 4;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const d = i % 2 ? r * 0.35 : r;
          ctx.lineTo(c.x + Math.cos(a) * d, c.y - 40 * c.s + Math.sin(a) * d);
        }
        ctx.fill();
      }
      if (c.style === 'slip') {
        // The banana peel that did it
        ctx.globalAlpha = Math.max(0, fade);
        ctx.fillStyle = '#fdd835';
        ctx.beginPath();
        ctx.ellipse(c.x - (c.vx > 0 ? 60 : -60), c.y + 40, 10, 5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'ashes': {
      if (c.t < 0.7) {
        // Turning black...
        const k = Math.min(1, c.t / 0.5);
        const r = Math.round(30 + (1 - k) * 200);
        drawPose(ctx, c, k > 0.95 ? '#212121' : `rgb(${r},${Math.round(r * 0.6)},${Math.round(r * 0.3)})`, '#000', false);
      }
      // ...then a little pile of ash
      const pile = Math.min(1, Math.max(0, (c.t - 0.6) / 0.4));
      if (pile > 0) {
        ctx.fillStyle = '#424242';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 22 * c.s * pile, 7 * c.s * pile, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.ellipse(c.x - 4 * c.s, c.y - 2 * c.s, 9 * c.s * pile, 3 * c.s * pile, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'shatter':
      if (c.t < 0.45) {
        drawPose(ctx, c, '#b3e5fc', '#0277bd', false);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2 * c.s;
        ctx.beginPath();
        ctx.moveTo(c.x - 8 * c.s, c.y - 70 * c.s);
        ctx.lineTo(c.x + 4 * c.s, c.y - 50 * c.s);
        ctx.lineTo(c.x - 3 * c.s, c.y - 30 * c.s);
        ctx.stroke();
      }
      break;
    case 'zap':
      if (c.t < 0.6) {
        // Flashing skeleton
        const on = Math.floor(c.t * 20) % 2 === 0;
        drawPose(ctx, c, on ? '#ffffff' : '#212121', on ? '#212121' : '#fff176', false);
      }
      break;
  }
  ctx.globalAlpha = 1;
}
