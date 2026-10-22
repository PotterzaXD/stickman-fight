import { swingArm, walkLegs } from './toys';
import { ROAD_W, TD_H, TD_W, type TDEnemy, type TDGame, type TDMap, type TDUnit, type UnitDef } from './td';

type Ctx = CanvasRenderingContext2D;

/** Unit size next to a fighter in the normal game. */
export const UNIT_S = 0.55;

/** The same little random numbers every time for a map (so trees don't jump around). */
function seeded(seed: number) {
  let x = seed || 1;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
}

const decoCache = new Map<string, { x: number; y: number; k: number }[]>();

function decoFor(map: TDMap) {
  let list = decoCache.get(map.id);
  if (list) return list;
  const rnd = seeded(map.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 100000);
  list = [];
  for (let i = 0; i < 400 && list.length < 26; i++) {
    const x = 20 + rnd() * (TD_W - 40);
    const y = 30 + rnd() * (TD_H - 50);
    // Keep the road and the spots right next to it clear for units.
    let near = Infinity;
    for (const p of map.paths)
      for (let j = 1; j < p.length; j++) {
        const a = p[j - 1];
        const b = p[j];
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const L = vx * vx + vy * vy || 1;
        const k = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / L));
        near = Math.min(near, Math.hypot(x - (a.x + vx * k), y - (a.y + vy * k)));
      }
    if (near < 90) continue;
    if (list.some((d) => Math.hypot(d.x - x, d.y - y) < 50)) continue;
    list.push({ x, y, k: rnd() });
  }
  decoCache.set(map.id, list);
  return list;
}

function drawDeco(ctx: Ctx, kind: TDMap['deco'], x: number, y: number, k: number) {
  const s = 0.8 + k * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  switch (kind) {
    case 'tree':
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(-3, -14, 6, 16);
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.arc(0, -22, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#43a047';
      ctx.beginPath();
      ctx.arc(-4, -26, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'pine':
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(-2, -8, 4, 10);
      ctx.fillStyle = '#1b5e20';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-14 + i * 3, -6 - i * 10);
        ctx.lineTo(0, -24 - i * 10);
        ctx.lineTo(14 - i * 3, -6 - i * 10);
        ctx.fill();
      }
      break;
    case 'cactus':
      ctx.strokeStyle = '#388e3c';
      ctx.lineCap = 'round';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -30);
      ctx.moveTo(0, -14);
      ctx.lineTo(-9, -14);
      ctx.lineTo(-9, -22);
      ctx.moveTo(0, -18);
      ctx.lineTo(9, -18);
      ctx.lineTo(9, -26);
      ctx.stroke();
      break;
    case 'rock':
      ctx.fillStyle = '#757575';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(2, -16);
      ctx.lineTo(13, -6);
      ctx.lineTo(14, 0);
      ctx.fill();
      ctx.fillStyle = '#9e9e9e';
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(2, -16);
      ctx.lineTo(0, -6);
      ctx.fill();
      break;
    case 'candy':
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -18);
      ctx.stroke();
      ctx.fillStyle = k > 0.5 ? '#ec407a' : '#7e57c2';
      ctx.beginPath();
      ctx.arc(0, -24, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -24, 5, 0, Math.PI * 1.5);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

function tracePath(ctx: Ctx, p: { x: number; y: number }[]) {
  ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
}

/** The field: ground, decorations, roads, the enemy cave and your castle. */
export function drawField(ctx: Ctx, map: TDMap, roadW = ROAD_W) {
  ctx.fillStyle = map.ground;
  ctx.fillRect(0, 0, TD_W, TD_H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = map.edge;
  ctx.lineWidth = roadW + 8;
  ctx.beginPath();
  for (const p of map.paths) tracePath(ctx, p);
  ctx.stroke();
  ctx.strokeStyle = map.road;
  ctx.lineWidth = roadW;
  ctx.beginPath();
  for (const p of map.paths) tracePath(ctx, p);
  ctx.stroke();
  // Little arrows along the road show which way enemies walk.
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (const p of map.paths)
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1];
      const b = p[i];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 40; d < L - 20; d += 90) {
        ctx.save();
        ctx.translate(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-6, -7);
        ctx.lineTo(-6, 7);
        ctx.fill();
        ctx.restore();
      }
    }
  for (const d of decoFor(map)) drawDeco(ctx, map.deco, d.x, d.y, d.k);
  // Enemy cave where each road starts.
  for (const p of map.paths) {
    const s = { x: Math.max(18, Math.min(TD_W - 18, p[0].x)), y: Math.max(22, Math.min(TD_H - 6, p[0].y)) };
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(s.x, s.y + 6, 26, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(s.x, s.y + 6, 16, Math.PI, 0);
    ctx.fill();
  }
  const end = map.paths[0][map.paths[0].length - 1];
  drawCastle(ctx, Math.max(40, Math.min(TD_W - 40, end.x)), Math.max(70, Math.min(TD_H - 4, end.y + 20)));
}

function drawCastle(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = '#90a4ae';
  ctx.strokeStyle = '#455a64';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(x - 32, y - 50, 64, 50);
  for (const t of [-32, -10, 12]) ctx.rect(x + t, y - 62, 20, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.arc(x, y - 14, 11, Math.PI, 0);
  ctx.lineTo(x + 11, y);
  ctx.lineTo(x - 11, y);
  ctx.fill();
  ctx.strokeStyle = '#37474f';
  ctx.beginPath();
  ctx.moveTo(x, y - 62);
  ctx.lineTo(x, y - 84);
  ctx.stroke();
  ctx.fillStyle = '#1e88e5';
  ctx.beginPath();
  ctx.moveTo(x, y - 84);
  ctx.lineTo(x + 18, y - 78);
  ctx.lineTo(x, y - 72);
  ctx.fill();
}

// ---------- stickmen ----------

interface StickOpts {
  x: number;
  y: number;
  s: number;
  color: string;
  facing: number;
  walk: number;
  moving: boolean;
  /** 0-1 swing of the weapon arm (1 = resting). */
  swing: number;
  weapon: UnitDef['weapon'] | 'club' | 'none';
  /** Weapon arm straight out (shooters). */
  aim?: boolean;
  flash?: boolean;
  angry?: boolean;
  alpha?: number;
  extra?: 'helmet' | 'band' | 'horns' | 'wings' | 'hood';
}

export function drawStick(ctx: Ctx, o: StickOpts) {
  const { x, y, s, facing: d } = o;
  const col = o.flash ? '#ffffff' : o.color;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 14 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  if (o.extra === 'wings') {
    ctx.fillStyle = '#66bb6a';
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x - d * 4 * s, y - 52 * s);
      ctx.quadraticCurveTo(x - d * 34 * s, y - (78 + k * 6) * s, x - d * 40 * s, y - 40 * s);
      ctx.quadraticCurveTo(x - d * 22 * s, y - 50 * s, x - d * 4 * s, y - 44 * s);
      ctx.fill();
    }
  }
  const walk = walkLegs(x, y, s, o.walk * d, o.moving ? 1 : 0, d);
  const hip = walk.hip;
  const neck = { x, y: y - 62 * s };
  const head = { x, y: y - 73 * s };
  const sh = { x, y: y - 58 * s };
  const free = swingArm(sh, s, o.walk * d, o.moving ? 1 : 0, d);
  // Weapon arm: resting forward and down, swings from up high down through the enemy.
  const ang = o.aim ? -0.15 : o.swing < 1 ? -1.4 + o.swing * 2.2 : 0.7;
  const ax = Math.cos(ang) * d;
  const ay = Math.sin(ang);
  const hand = { x: sh.x + ax * 18 * s, y: sh.y + ay * 18 * s };
  const lines = (w: number, c: string) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w * s;
    ctx.beginPath();
    for (const l of walk.legs) {
      ctx.moveTo(l.foot.x, l.foot.y);
      ctx.lineTo(l.knee.x, l.knee.y);
      ctx.lineTo(hip.x, hip.y);
    }
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(neck.x, neck.y);
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(free.x, free.y);
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
  };
  lines(8, 'rgba(0,0,0,0.8)');
  lines(5, col);
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(d > 0 ? ang : Math.PI - ang);
  if (d < 0) ctx.scale(1, -1);
  drawWeapon(ctx, o.weapon, s, o.color);
  ctx.restore();
  // Head
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(head.x + d * 4 * s, head.y - 2 * s, 2.6 * s, 0, Math.PI * 2);
  ctx.fill();
  if (o.angry) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(head.x + d * 1 * s, head.y - 7 * s);
    ctx.lineTo(head.x + d * 8 * s, head.y - 4 * s);
    ctx.stroke();
  }
  drawHeadgear(ctx, o.extra, o.weapon, head.x, head.y, s, d);
  ctx.restore();
}

function drawHeadgear(ctx: Ctx, extra: StickOpts['extra'], weapon: StickOpts['weapon'], hx: number, hy: number, s: number, d: number) {
  if (weapon === 'crown' || extra === 'horns') {
    if (weapon === 'crown') {
      ctx.fillStyle = '#ffd600';
      ctx.strokeStyle = '#ff8f00';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(hx - 10 * s, hy - 8 * s);
      ctx.lineTo(hx - 10 * s, hy - 20 * s);
      ctx.lineTo(hx - 5 * s, hy - 13 * s);
      ctx.lineTo(hx, hy - 22 * s);
      ctx.lineTo(hx + 5 * s, hy - 13 * s);
      ctx.lineTo(hx + 10 * s, hy - 20 * s);
      ctx.lineTo(hx + 10 * s, hy - 8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#eeeeee';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + k * 6 * s, hy - 8 * s);
        ctx.quadraticCurveTo(hx + k * 18 * s, hy - 14 * s, hx + k * 16 * s, hy - 26 * s);
        ctx.quadraticCurveTo(hx + k * 12 * s, hy - 14 * s, hx + k * 2 * s, hy - 10 * s);
        ctx.fill();
      }
    }
  }
  if (extra === 'helmet') {
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.arc(hx, hy - 1 * s, 12.5 * s, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(hx - 13 * s, hy - 2 * s, 26 * s, 3 * s);
  }
  if (extra === 'band') {
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(hx - 11 * s, hy - 5 * s);
    ctx.lineTo(hx + 11 * s, hy - 5 * s);
    ctx.lineTo(hx - d * 18 * s, hy - 2 * s);
    ctx.stroke();
  }
  if (extra === 'hood') {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.arc(hx, hy, 12 * s, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hx + d * 4 * s, hy - 2 * s, 2.4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A weapon in the hand, pointing along +x. */
function drawWeapon(ctx: Ctx, w: StickOpts['weapon'], s: number, color: string) {
  ctx.lineCap = 'round';
  const L = (x1: number, y1: number, x2: number, y2: number, wd: number, c: string) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = wd * s;
    ctx.beginPath();
    ctx.moveTo(x1 * s, y1 * s);
    ctx.lineTo(x2 * s, y2 * s);
    ctx.stroke();
  };
  switch (w) {
    case 'sword':
    case 'crown':
      L(0, 0, w === 'crown' ? 38 : 28, 0, w === 'crown' ? 5 : 4, w === 'crown' ? '#ffd600' : '#cfd8dc');
      L(3, -6, 3, 6, 3, '#5d4037');
      break;
    case 'katana':
      L(0, 0, 32, -3, 3, '#eceff1');
      L(-2, 0, 4, 0, 4, '#212121');
      break;
    case 'spear':
      L(-14, 0, 40, 0, 3, '#8d6e63');
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath();
      ctx.moveTo(40 * s, -4 * s);
      ctx.lineTo(50 * s, 0);
      ctx.lineTo(40 * s, 4 * s);
      ctx.fill();
      break;
    case 'lance':
      ctx.fillStyle = '#cfd8dc';
      ctx.strokeStyle = '#607d8b';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(0, -6 * s);
      ctx.lineTo(52 * s, 0);
      ctx.lineTo(0, 6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'axe':
    case 'club':
      L(0, 0, 30, 0, 4, '#6d4c41');
      if (w === 'axe') {
        ctx.fillStyle = '#b0bec5';
        ctx.beginPath();
        ctx.moveTo(22 * s, 0);
        ctx.quadraticCurveTo(28 * s, -16 * s, 36 * s, -12 * s);
        ctx.lineTo(32 * s, 2 * s);
        ctx.fill();
      } else {
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.ellipse(28 * s, 0, 10 * s, 7 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'hammer':
      L(0, 0, 30, 0, 4, '#795548');
      ctx.fillStyle = '#fdd835';
      ctx.fillRect(26 * s, -11 * s, 12 * s, 22 * s);
      break;
    case 'shield':
      L(0, 0, 18, 0, 3, '#cfd8dc');
      ctx.fillStyle = '#1565c0';
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.ellipse(6 * s, 0, 6 * s, 15 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'bow':
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.arc(-4 * s, 0, 16 * s, -1.2, 1.2);
      ctx.stroke();
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(Math.cos(-1.2) * 16 * s - 4 * s, Math.sin(-1.2) * 16 * s);
      ctx.lineTo(Math.cos(1.2) * 16 * s - 4 * s, Math.sin(1.2) * 16 * s);
      ctx.stroke();
      break;
    case 'sling':
      L(0, 0, 10, 0, 3, '#6d4c41');
      L(10, 0, 18, -7, 3, '#6d4c41');
      L(10, 0, 18, 7, 3, '#6d4c41');
      break;
    case 'bomb':
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(6 * s, 0, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      L(10, -5, 14, -10, 2, '#ff9800');
      break;
    case 'staff':
      L(-10, 0, 30, 0, 3, '#795548');
      ctx.fillStyle = color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(33 * s, 0, 6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'gun':
      ctx.fillStyle = '#263238';
      ctx.fillRect(0, -3 * s, 26 * s, 6 * s);
      ctx.fillRect(2 * s, 0, 6 * s, 10 * s);
      break;
    case 'none':
      break;
  }
}

function drawBat(ctx: Ctx, x: number, y: number, s: number, t: number, color: string, flash: boolean, alpha: number) {
  const flap = Math.sin(t * 18) * 0.6;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 12 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const by = y - 50 * s + Math.sin(t * 4) * 4;
  ctx.fillStyle = flash ? '#fff' : color;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, by);
    ctx.lineTo(x + k * 30 * s, by - 18 * s * flap - 6 * s);
    ctx.lineTo(x + k * 22 * s, by + 4 * s);
    ctx.lineTo(x + k * 12 * s, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, by, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffeb3b';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + k * 3.5 * s, by - 2 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function hpBar(ctx: Ctx, x: number, y: number, w: number, k: number, color: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w * Math.max(0, k), 4);
}

const ENEMY_LOOK: Record<string, { weapon: StickOpts['weapon']; extra?: StickOpts['extra'] }> = {
  basic: { weapon: 'none' },
  runner: { weapon: 'none', extra: 'band' },
  tank: { weapon: 'club', extra: 'helmet' },
  shield: { weapon: 'shield', extra: 'helmet' },
  archer: { weapon: 'bow', extra: 'hood' },
  brute: { weapon: 'club', extra: 'horns' },
  boss: { weapon: 'club', extra: 'horns' },
};

const UNIT_EXTRA: Partial<Record<string, StickOpts['extra']>> = { ninja: 'hood', knight: 'helmet', dragonrider: 'wings', shieldguy: 'helmet' };

function drawEnemy(ctx: Ctx, e: TDEnemy, time: number) {
  const alpha = e.dead ? Math.max(0, 1 - e.dead / 0.5) : 1;
  if (e.def.flying) drawBat(ctx, e.x, e.y, e.def.scale, time + e.dist * 0.01, e.def.color, e.hurt > 0, alpha);
  else {
    const look = ENEMY_LOOK[e.def.id] ?? ENEMY_LOOK.basic;
    drawStick(ctx, {
      x: e.x,
      y: e.y,
      s: e.def.scale,
      color: e.slowT > 0 ? '#81d4fa' : e.def.color,
      facing: e.facing,
      walk: e.walk,
      moving: !e.blocker,
      swing: Math.min(1, e.swingT / 0.25),
      weapon: look.weapon,
      aim: e.def.shoots,
      flash: e.hurt > 0,
      angry: true,
      alpha,
      extra: look.extra,
    });
  }
  if (!e.dead && e.hp < e.maxHp) {
    const top = e.y - (e.def.flying ? 72 : 92) * e.def.scale;
    hpBar(ctx, e.x, top, e.def.id === 'boss' ? 70 : 28, e.hp / e.maxHp, '#e53935');
  }
}

export function drawUnitFigure(ctx: Ctx, def: UnitDef, x: number, y: number, s: number, opts: Partial<StickOpts> = {}) {
  drawStick(ctx, {
    x,
    y,
    s,
    color: def.color,
    facing: 1,
    walk: 0,
    moving: false,
    swing: 1,
    weapon: def.weapon,
    aim: def.kind !== 'melee',
    extra: UNIT_EXTRA[def.id],
    ...opts,
  });
}

function drawUnit(ctx: Ctx, u: TDUnit) {
  const s = UNIT_S * (u.def.scale ?? 1);
  drawUnitFigure(ctx, u.def, u.x, u.y, s, {
    facing: u.facing,
    walk: u.walk,
    moving: u.moving,
    swing: u.def.kind === 'melee' ? Math.min(1, u.swingT / 0.25) : 1,
    alpha: u.dead ? Math.max(0, 1 - u.dead / 0.5) : 1,
  });
  if (!u.dead && u.hp < u.def.hp) hpBar(ctx, u.x, u.y - 90 * s, 26, u.hp / u.def.hp, '#66bb6a');
}

function drawShots(ctx: Ctx, g: TDGame) {
  for (const s of g.shots) {
    if (s.kind === 'bolt' && s.chain) {
      ctx.strokeStyle = '#fff59d';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffeb3b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(s.chain[0].x, s.chain[0].y);
      for (let i = 1; i < s.chain.length; i++) {
        const a = s.chain[i - 1];
        const b = s.chain[i];
        for (let k = 1; k <= 4; k++) {
          const f = k / 4;
          const j = k < 4 ? (Math.random() - 0.5) * 16 : 0;
          ctx.lineTo(a.x + (b.x - a.x) * f + j, a.y + (b.y - a.y) * f + j);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      continue;
    }
    const ang = Math.atan2(s.ty - s.y, s.tx - s.x);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);
    switch (s.kind) {
      case 'arrow':
        ctx.strokeStyle = s.enemy ? '#c62828' : '#5d4037';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();
        ctx.fillStyle = '#9e9e9e';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(4, -3);
        ctx.lineTo(4, 3);
        ctx.fill();
        break;
      case 'rock':
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'bullet':
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(-6, -1.5, 10, 3);
        break;
      case 'bomb':
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff9800';
        ctx.fillRect(-2, -9, 3, 4);
        break;
      case 'fire':
      case 'ice': {
        const c = s.kind === 'fire' ? ['#ffeb3b', '#ff5722'] : ['#e1f5fe', '#29b6f6'];
        ctx.fillStyle = c[1];
        ctx.beginPath();
        ctx.ellipse(-4, 0, 11, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c[0];
        ctx.beginPath();
        ctx.arc(2, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}

export interface TDView {
  /** Where the player is about to put a unit, and whether it fits. */
  ghost?: { x: number; y: number; def: UnitDef; ok: boolean };
  /** The unit tapped on (shows its range). */
  picked?: TDUnit | null;
}

/** Draw the whole game into a canvas of w × h (CSS pixels). Returns the scale and offset used, for taps. */
export function renderTD(g: TDGame, ctx: Ctx, w: number, h: number, dpr: number, view: TDView) {
  const k = Math.min(w / TD_W, h / TD_H);
  const ox = (w - TD_W * k) / 2;
  const oy = (h - TD_H * k) / 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#10213a';
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, TD_W, TD_H);
  ctx.clip();
  drawField(ctx, g.map);

  const range = (x: number, y: number, r: number, ok: boolean) => {
    ctx.fillStyle = ok ? 'rgba(255,255,255,0.18)' : 'rgba(229,57,53,0.22)';
    ctx.strokeStyle = ok ? 'rgba(255,255,255,0.7)' : 'rgba(229,57,53,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  if (view.picked && !view.picked.dead) range(view.picked.postX, view.picked.postY, view.picked.def.range, true);
  if (view.ghost) range(view.ghost.x, view.ghost.y, view.ghost.def.range, view.ghost.ok);

  // Everyone sorted by how far down the screen they stand.
  const all: ({ y: number; u: TDUnit } | { y: number; e: TDEnemy })[] = [...g.units.map((u) => ({ y: u.y, u })), ...g.enemies.map((e) => ({ y: e.y, e }))];
  all.sort((a, b) => a.y - b.y);
  for (const it of all) {
    if ('u' in it) drawUnit(ctx, it.u);
    else drawEnemy(ctx, it.e, g.time);
  }
  if (view.ghost) drawUnitFigure(ctx, view.ghost.def, view.ghost.x, view.ghost.y, UNIT_S * (view.ghost.def.scale ?? 1), { alpha: 0.6 });

  for (const b of g.booms) {
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 1 - b.t / 0.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * (0.5 + b.t / 0.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  drawShots(ctx, g);
  ctx.font = 'bold 18px "Baloo 2", system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const p of g.pops) {
    ctx.globalAlpha = 1 - p.t;
    ctx.fillStyle = '#000';
    ctx.fillText(p.text, p.x + 1, p.y - p.t * 30 + 1);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - p.t * 30);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  return { k, ox, oy };
}

/** A small picture of a map's roads (for the map cards). */
export function drawMapThumb(canvas: HTMLCanvasElement, map: TDMap) {
  const w = 200;
  const h = 120;
  canvas.width = w * 2;
  canvas.height = h * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform((w * 2) / TD_W, 0, 0, (h * 2) / TD_H, 0, 0);
  drawField(ctx, map, 52);
}

/** A unit standing still, for cards and the egg reveal. */
export function drawUnitCard(canvas: HTMLCanvasElement, def: UnitDef, size = 80) {
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const s = (size / 100) * 0.95;
  drawUnitFigure(ctx, def, size / 2 - 4 * s, size - 6, s);
}
