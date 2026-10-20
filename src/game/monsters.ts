import type { Cat, Fighter, Projectile } from './entities';
import type { OutbreakState } from './outbreak';
import type { Platform } from './types';

type Ctx = CanvasRenderingContext2D;

/*
 * The October 20 update's pictures: the Magical Elephant, the Giant Scarecrow and Robo Stick,
 * the Retro Stickguy, bees, ninjas and zombies, the new weapons (local space: hand at (0, 0), pointing along +x)
 * and their shots, the new blocks, the three new map backgrounds and The Outbreak's night.
 */

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function bar(ctx: Ctx, x: number, y: number, w: number, frac: number, color: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, x - w / 2 - 1, y - 1, w + 2, 7, 3);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, x - w / 2, y, w * Math.max(0, Math.min(1, frac)), 5, 2.5);
  ctx.fill();
}

// ---------- the Magical Elephant ----------

/** The Magical Elephant: a big grey elephant that flies by flapping its huge ears. */
export function drawElephant(ctx: Ctx, f: Fighter, time: number) {
  const d = f.facing || 1;
  const col = f.frozenT > 0 ? '#b3e5fc' : f.hurtFlash > 0 ? '#ffffff' : f.color;
  const dark = '#6f767d';
  const bob = Math.sin(time * 3) * 4;
  const flap = Math.sin(f.walkPhase);
  ctx.save();
  ctx.translate(f.x, f.y + bob);
  ctx.scale(d, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The far ear (behind the body)
  ear(ctx, 40, -128, flap, '#7d848b', -1);
  // Tail
  ctx.strokeStyle = dark;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-92, -105);
  ctx.quadraticCurveTo(-118, -90 + Math.sin(time * 6) * 8, -112, -62);
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(-112, -60, 6, 0, Math.PI * 2);
  ctx.fill();
  // Legs (they dangle and kick a little while it flies)
  const kick = Math.sin(time * 5) * 6;
  ctx.fillStyle = dark;
  for (const [lx, k] of [[-62, kick], [-30, -kick], [26, -kick], [58, kick]] as [number, number][]) {
    rr(ctx, lx - 13 + k * 0.3, -70, 26, 66, 10);
    ctx.fill();
  }
  ctx.fillStyle = col;
  for (const [lx, k] of [[-56, -kick], [32, kick]] as [number, number][]) {
    rr(ctx, lx - 14 + k * 0.3, -68, 28, 68, 11);
    ctx.fill();
    ctx.fillStyle = '#e0e0e0';
    for (let t = -1; t <= 1; t++) {
      ctx.beginPath();
      ctx.arc(lx + k * 0.3 + t * 7, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = col;
  }
  // Body
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(-6, -100, 100, 58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(-16, -128, 66, 20, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(82, -118, 46, 0, Math.PI * 2);
  ctx.fill();
  // Trunk: hangs and swings; reaches out for a slam or a spray; tucked in for a tusk charge.
  const reach = f.thrustT > 0;
  const charge = f.dashT > 0;
  ctx.strokeStyle = col;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(112, -112);
  if (reach) ctx.bezierCurveTo(150, -110, 160, -80, 172, -60);
  else if (charge) ctx.bezierCurveTo(132, -96, 122, -70, 108, -66);
  else ctx.bezierCurveTo(134, -90, 118 + Math.sin(time * 2.4) * 10, -55, 126 + Math.sin(time * 2.4) * 14, -28);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) {
    const yy = -98 + k * 16;
    line(ctx, 112 + k * 4, yy, 128 + k * 4, yy + 2);
  }
  // Water spray / slam splash at the tip
  if (reach) {
    ctx.fillStyle = 'rgba(129,212,250,0.85)';
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.arc(176 + k * 8, -56 + Math.sin(time * 30 + k) * 6, 5 - k * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Tusks
  ctx.strokeStyle = '#fffde7';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(104, -92);
  ctx.quadraticCurveTo(charge ? 150 : 130, -84, charge ? 160 : 138, charge ? -98 : -104);
  ctx.stroke();
  if (charge) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) line(ctx, -120 - k * 18, -130 + k * 22, -170 - k * 18, -130 + k * 22);
  }
  // Eye
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(96, -132, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(98, -134, 2, 0, Math.PI * 2);
  ctx.fill();
  // Pink cheek
  ctx.fillStyle = 'rgba(244,143,177,0.6)';
  ctx.beginPath();
  ctx.arc(86, -106, 8, 0, Math.PI * 2);
  ctx.fill();
  // The near ear (its wing): big, round and flapping
  ear(ctx, 54, -132, flap, col, 1);
  // Magic sparkles around it
  ctx.fillStyle = '#fff59d';
  for (let k = 0; k < 6; k++) {
    const a = time * 1.5 + k;
    const sx = Math.cos(a) * 140;
    const sy = -100 + Math.sin(a * 1.3) * 90;
    const r = 2 + (Math.sin(time * 6 + k) + 1) * 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 2);
    ctx.lineTo(sx + r * 0.6, sy);
    ctx.lineTo(sx, sy + r * 2);
    ctx.lineTo(sx - r * 0.6, sy);
    ctx.fill();
  }
  ctx.restore();
}

/** One of the Elephant's ears: it swings up and down like a wing. */
function ear(ctx: Ctx, x: number, y: number, flap: number, col: string, near: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25 + flap * 0.55 * near);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(-30, -10 - flap * 18, 52, 66, -0.5, 0, Math.PI * 2);
  ctx.fill();
  if (near > 0) {
    ctx.fillStyle = 'rgba(244,143,177,0.55)';
    ctx.beginPath();
    ctx.ellipse(-30, -10 - flap * 18, 36, 48, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-30, -10 - flap * 18, 52, 66, -0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The Scarecrow's sack head with a straw hat, and Robo Stick's metal head with a glowing visor. */
export function drawXBossHead(ctx: Ctx, f: Fighter, hx: number, hy: number, s: number, time: number) {
  const d = f.facing || 1;
  if (f.xboss === 'scarecrow') {
    ctx.fillStyle = f.hurtFlash > 0 ? '#ffffff' : '#d7b98a';
    ctx.strokeStyle = '#6d4c41';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.arc(hx, hy, 12 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Triangle eyes and a stitched smile
    ctx.fillStyle = '#212121';
    for (const e of [-1, 1]) {
      const ex = hx + d * 3 * s + e * 4.5 * s;
      ctx.beginPath();
      ctx.moveTo(ex - 2.5 * s, hy - 1 * s);
      ctx.lineTo(ex + 2.5 * s, hy - 1 * s);
      ctx.lineTo(ex, hy - 5.5 * s);
      ctx.fill();
    }
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(hx + d * 3 * s - 6 * s, hy + 4 * s);
    ctx.quadraticCurveTo(hx + d * 3 * s, hy + 8 * s, hx + d * 3 * s + 6 * s, hy + 4 * s);
    ctx.stroke();
    for (let k = -2; k <= 2; k++) line(ctx, hx + d * 3 * s + k * 2.5 * s, hy + 4.5 * s, hx + d * 3 * s + k * 2.5 * s, hy + 7.5 * s);
    // Straw poking out under the hat and at the neck
    ctx.strokeStyle = '#fbc02d';
    ctx.lineWidth = 1.4 * s;
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.1 + k * 0.13);
      line(ctx, hx + Math.cos(a) * 10 * s, hy + Math.sin(a) * 10 * s + 3 * s, hx + Math.cos(a) * 15 * s, hy + Math.sin(a) * 15 * s + 3 * s);
    }
    // Straw hat
    ctx.fillStyle = '#c49a5a';
    ctx.beginPath();
    ctx.ellipse(hx, hy - 9 * s, 21 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 10 * s, hy - 10 * s);
    ctx.lineTo(hx - 6 * s, hy - 22 * s);
    ctx.lineTo(hx + 6 * s, hy - 22 * s);
    ctx.lineTo(hx + 10 * s, hy - 10 * s);
    ctx.fill();
    ctx.fillStyle = '#8d2b2b';
    ctx.fillRect(hx - 9 * s, hy - 14 * s, 18 * s, 3 * s);
    // A crow sitting on the hat
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.ellipse(hx - d * 4 * s, hy - 25 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.arc(hx - d * 1 * s, hy - 28 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.moveTo(hx + d * 0.8 * s, hy - 28.5 * s);
    ctx.lineTo(hx + d * 3.5 * s, hy - 28 * s);
    ctx.lineTo(hx + d * 0.8 * s, hy - 27 * s);
    ctx.fill();
  } else if (f.xboss === 'robo') {
    ctx.fillStyle = f.hurtFlash > 0 ? '#ffffff' : '#90a4ae';
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2 * s;
    rr(ctx, hx - 12 * s, hy - 12 * s, 24 * s, 23 * s, 5 * s);
    ctx.fill();
    ctx.stroke();
    // Visor
    const glow = 0.7 + Math.sin(time * 6) * 0.3;
    ctx.fillStyle = `rgba(255,23,68,${glow})`;
    rr(ctx, hx - 8 * s + d * 2 * s, hy - 5 * s, 16 * s, 5 * s, 2.5 * s);
    ctx.fill();
    // Bolts and an antenna
    ctx.fillStyle = '#546e7a';
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + e * 12 * s, hy, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 1.5 * s;
    line(ctx, hx, hy - 12 * s, hx, hy - 20 * s);
    ctx.fillStyle = Math.floor(time * 3) % 2 ? '#ff1744' : '#ffcdd2';
    ctx.beginPath();
    ctx.arc(hx, hy - 21 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Mouth grill
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1 * s;
    for (let k = -1; k <= 1; k++) line(ctx, hx + d * 2 * s + k * 3 * s, hy + 4 * s, hx + d * 2 * s + k * 3 * s, hy + 8 * s);
  }
}

// ---------- helpers and zombies ----------

/** The Retro Stickguy from WORST Stickman Fighter v.2: a blocky black pixel stickman with a knife. */
export const RETRO_SPRITE = [
  '...KKK...',
  '..K...K..',
  '..K...K..',
  '...KKK...',
  '....K...S',
  '..KKKKKKS',
  '....K....',
  '....K....',
  '...K.K...',
  '..K...K..',
  '..K...K..',
  '.K.....K.',
];

function drawRetro(ctx: Ctx, c: Cat) {
  const px = c.h / RETRO_SPRITE.length;
  const cols = RETRO_SPRITE[0].length;
  const ox = c.x - (cols * px) / 2;
  const oy = c.y - c.h;
  const flip = c.facing < 0;
  const stab = c.attackT > RETRO_STAB ? px : 0;
  // A faint light around it so the black pixels show on dark maps.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  rr(ctx, ox - px * 0.6, oy - px * 0.6, cols * px + px * 1.2, c.h + px * 1.2, px);
  ctx.fill();
  RETRO_SPRITE.forEach((row, r) => {
    for (let k = 0; k < row.length; k++) {
      const cell = row[k];
      if (cell === '.') continue;
      const col = flip ? cols - 1 - k : k;
      ctx.fillStyle = cell === 'S' ? '#bbbbbb' : c.hurtFlash > 0 ? '#9e9e9e' : '#111111';
      ctx.fillRect(Math.round(ox + col * px + (cell === 'S' ? (flip ? -stab : stab) : 0)), Math.round(oy + r * px), Math.ceil(px), Math.ceil(px));
    }
  });
  bar(ctx, c.x, oy - 12, 34, c.hp / c.maxHp, c.owner.color);
}
const RETRO_STAB = 1.2;

/** What the Retro Stickguy and a bee leave: the pixels falling apart, a bee dropping with X eyes. */
export function drawMonsterProp(ctx: Ctx, prop: string, x: number, y: number, d: number, k: number) {
  ctx.globalAlpha = Math.max(0, 1 - k);
  if (prop === 'pixels') {
    const px = 5;
    const cols = RETRO_SPRITE[0].length;
    RETRO_SPRITE.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] === '.') continue;
        const n = r * 16 + c;
        const col = d < 0 ? cols - 1 - c : c;
        const dx = (hash(n) - 0.5) * 160 * k;
        const dy = -Math.sin(Math.min(1, k * 2) * Math.PI) * 40 * hash(n + 3) + k * k * 120;
        ctx.fillStyle = row[c] === 'S' ? '#bbbbbb' : '#111111';
        ctx.fillRect(x - (cols * px) / 2 + col * px + dx, Math.min(y - px, y - 60 + r * px + dy), px, px);
      }
    });
  } else {
    ctx.save();
    ctx.translate(x, y - 7 - Math.max(0, 30 - k * 120));
    ctx.rotate(Math.PI);
    ctx.fillStyle = '#fdd835';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.fillRect(-4, -6, 3, 12);
    ctx.fillRect(2, -6, 3, 12);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✖', x + d * 5, y - 10);
  }
  ctx.globalAlpha = 1;
}

function drawBee(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const y = c.y - c.h / 2 + Math.sin(time * 9 + c.id) * 3;
  ctx.save();
  ctx.translate(c.x, y);
  ctx.scale(d, 1);
  // Wings
  const w = Math.abs(Math.sin(time * 40 + c.id)) * 6 + 3;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(-2, -7, 5, w, -0.3, 0, Math.PI * 2);
  ctx.ellipse(3, -7, 4, w * 0.8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Body with stripes
  ctx.fillStyle = c.hurtFlash > 0 ? '#ffffff' : '#fdd835';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#212121';
  ctx.fillRect(-4, -7, 3, 14);
  ctx.fillRect(2, -7, 3, 14);
  ctx.restore();
  // Stinger and eye
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.moveTo(-9, -1.5);
  ctx.lineTo(-13, 0);
  ctx.lineTo(-9, 1.5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, -1.5, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Owner colour dot, so you can tell whose bee it is
  ctx.fillStyle = c.owner.color;
  ctx.beginPath();
  ctx.arc(c.x, y - 13, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

/** A stickman pose for ninjas and zombies (feet at c.x, c.y). */
function stickBody(ctx: Ctx, c: Cat, time: number, col: string, lw: number, lean: number, armsOut: boolean) {
  const h = c.h;
  const d = c.facing || 1;
  const moving = c.onGround && Math.abs(c.vx) > 20;
  const leg = moving ? Math.sin(time * 10 + c.id) * h * 0.15 : c.onGround ? 0 : h * 0.08 * d;
  const hip = { x: lean * d * h * 0.05, y: -h * 0.42 };
  const neck = { x: lean * d * h * 0.18, y: -h * 0.78 };
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(-h * 0.15 + leg, 0);
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(h * 0.15 - leg, 0);
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(neck.x, neck.y);
  const sh = { x: neck.x, y: neck.y + h * 0.08 };
  const atk = c.attackT > 0.5 ? h * 0.12 : 0;
  if (armsOut) {
    // Zombie arms reaching forward
    const sway = Math.sin(time * 4 + c.id) * h * 0.03;
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(sh.x + d * (h * 0.32 + atk), sh.y + sway);
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(sh.x + d * (h * 0.28 + atk), sh.y + h * 0.06 - sway);
  } else {
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(sh.x - d * h * 0.14, sh.y + h * 0.18);
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(sh.x + d * (h * 0.24 + atk), sh.y + h * 0.06);
  }
  ctx.stroke();
  const head = { x: neck.x + lean * d * h * 0.04, y: -h * 0.9 };
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(head.x, head.y, h * 0.13, 0, Math.PI * 2);
  ctx.fill();
  return { head, hand: { x: sh.x + d * (h * 0.24 + atk), y: sh.y + h * 0.06 }, d };
}

function drawNinja(ctx: Ctx, c: Cat, time: number) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const col = c.hurtFlash > 0 ? '#ffffff' : '#212121';
  const { head, hand, d } = stickBody(ctx, c, time, col, 5, 0.4, false);
  const r = c.h * 0.13;
  // Headband in the owner's colour, with tails flying behind
  ctx.strokeStyle = c.owner.color;
  ctx.lineWidth = 3;
  line(ctx, head.x - r, head.y - r * 0.2, head.x + r, head.y - r * 0.2);
  ctx.beginPath();
  ctx.moveTo(head.x - d * r, head.y - r * 0.2);
  ctx.quadraticCurveTo(head.x - d * r * 2, head.y - r * 0.6 + Math.sin(time * 12) * 3, head.x - d * r * 2.8, head.y + Math.sin(time * 12 + 1) * 4);
  ctx.stroke();
  // Eye slit
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(head.x + d * r * 0.2 - 3, head.y - 1, 6, 2.5);
  // Little katana
  ctx.strokeStyle = '#cfd8dc';
  ctx.lineWidth = 2.5;
  line(ctx, hand.x, hand.y, hand.x + d * 26, hand.y - 12);
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 3.5;
  line(ctx, hand.x - d * 4, hand.y + 2, hand.x + d * 3, hand.y - 1.5);
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 14, 34, c.hp / c.maxHp, c.owner.color);
}

/** Zombies: green stickmen walking with their arms out. Each kind looks a bit different. */
function drawZombie(ctx: Ctx, c: Cat, time: number) {
  const v = c.variant;
  const k = c.h / 80;
  const ally = v === 'zombie';
  const base = v === 'zshooter' ? '#8d9f3a' : v === 'zrunner' ? '#9ccc65' : v === 'zexploder' ? '#aed581' : v === 'zboss' ? '#558b2f' : '#7cb342';
  const col = c.hurtFlash > 0 ? '#ffffff' : base;
  ctx.save();
  ctx.translate(c.x, c.y);
  const lean = v === 'zrunner' ? 1.6 : v === 'zbig' || v === 'zboss' ? 0.3 : 0.7;
  const lw = (v === 'zbig' || v === 'zboss' ? 7 : 5) * Math.max(1, k * 0.8);
  const { head, hand, d } = stickBody(ctx, c, time, col, lw, lean, v !== 'zshooter');
  const r = c.h * 0.13;
  // Torn shirt
  ctx.strokeStyle = ally ? c.owner.color : v === 'zboss' ? '#4a148c' : '#5d4037';
  ctx.lineWidth = lw * 1.5;
  line(ctx, lean * d * c.h * 0.06, -c.h * 0.48, lean * d * c.h * 0.16, -c.h * 0.7);
  // Eyes: red for the bad ones, white for your zombie ally
  ctx.fillStyle = ally ? '#ffffff' : '#ff1744';
  ctx.beginPath();
  ctx.arc(head.x + d * r * 0.35, head.y - r * 0.15, Math.max(2, r * 0.22), 0, Math.PI * 2);
  ctx.arc(head.x + d * r * 0.75, head.y - r * 0.1, Math.max(1.6, r * 0.16), 0, Math.PI * 2);
  ctx.fill();
  // Stitched mouth
  ctx.strokeStyle = '#33691e';
  ctx.lineWidth = Math.max(1, k);
  line(ctx, head.x + d * r * 0.1, head.y + r * 0.45, head.x + d * r * 0.8, head.y + r * 0.4);
  if (v === 'zshooter') {
    // A blob of goo ready to throw
    ctx.fillStyle = '#c6ff00';
    ctx.beginPath();
    ctx.arc(hand.x, hand.y - 4, 6 + Math.sin(time * 8) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
  if (v === 'zexploder') {
    // Bloated glowing belly that blinks faster as it gets close
    const pulse = 0.5 + Math.sin(time * 12 + c.id) * 0.5;
    ctx.fillStyle = `rgba(255,${120 + Math.floor(pulse * 80)},0,0.85)`;
    ctx.beginPath();
    ctx.arc(lean * d * c.h * 0.1, -c.h * 0.58, c.h * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#33691e';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (v === 'zboss') {
    // A spiky crown
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.moveTo(head.x - r, head.y - r * 0.7);
    for (let s = 0; s <= 4; s++) {
      ctx.lineTo(head.x - r + (s * r) / 2, head.y - r * (s % 2 ? 1.1 : 1.7));
    }
    ctx.lineTo(head.x + r, head.y - r * 0.7);
    ctx.fill();
  }
  if (ally) {
    // A little heart: this zombie is on your side
    ctx.fillStyle = '#ff4081';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💚', head.x, head.y - r - 6);
  }
  ctx.restore();
  if (v !== 'zboss' && (ally || c.hp < c.maxHp)) bar(ctx, c.x, c.y - c.h - (ally ? 26 : 12), Math.max(26, c.w), c.hp / c.maxHp, ally ? c.owner.color : '#7cb342');
}

/** The new helpers and the zombies. Returns false for anything else. */
export function drawMonster(ctx: Ctx, c: Cat, time: number): boolean {
  switch (c.variant) {
    case 'retro':
      if (c.alive) drawRetro(ctx, c);
      return true;
    case 'bee':
      if (c.alive) drawBee(ctx, c, time);
      return true;
    case 'ninja':
      if (c.alive) drawNinja(ctx, c, time);
      return true;
    case 'zombie':
    case 'znormal':
    case 'zshooter':
    case 'zmini':
    case 'zbig':
    case 'zrunner':
    case 'zexploder':
    case 'zboss':
      if (c.alive) drawZombie(ctx, c, time);
      return true;
  }
  return false;
}

// ---------- weapons and shots ----------

export function drawMonsterWeapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean, time: number): boolean {
  switch (id) {
    case 'trunk':
      // The Elephant's own trunk (drawn with the Elephant).
      return true;
    case 'pitchfork': {
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 4 * s;
      line(ctx, -10 * s, 0, len - 16 * s, 0);
      ctx.strokeStyle = ready ? '#b0bec5' : '#78909c';
      ctx.lineWidth = 2.6 * s;
      line(ctx, len - 18 * s, -8 * s, len - 18 * s, 8 * s);
      for (const o of [-8, 0, 8]) line(ctx, len - 18 * s, o * s, len, o * s);
      return true;
    }
    case 'robocannon': {
      ctx.fillStyle = '#78909c';
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 1.5 * s;
      rr(ctx, -6 * s, -8 * s, len, 16 * s, 6 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#455a64';
      ctx.fillRect(len - 14 * s, -10 * s, 10 * s, 20 * s);
      ctx.fillStyle = ready ? `rgba(255,23,68,${0.6 + Math.sin(time * 10) * 0.4})` : '#263238';
      ctx.beginPath();
      ctx.arc(len - 4 * s, 0, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }
    case 'beehive': {
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 3.5 * s;
      line(ctx, -6 * s, 0, len - 22 * s, 0);
      const cx = len - 12 * s;
      ctx.fillStyle = ready ? '#ffb300' : '#a1887f';
      ctx.beginPath();
      ctx.ellipse(cx, 0, 13 * s, 15 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 1.5 * s;
      for (let k = -2; k <= 2; k++) line(ctx, cx - 12 * s, k * 5 * s, cx + 12 * s, k * 5 * s);
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.arc(cx, 5 * s, 3 * s, 0, Math.PI * 2);
      ctx.fill();
      if (ready) {
        ctx.fillStyle = '#fdd835';
        for (let k = 0; k < 3; k++) {
          const a = time * 5 + k * 2.1;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * 20 * s, Math.sin(a) * 14 * s, 2.2 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }
    case 'ninjascroll': {
      ctx.fillStyle = ready ? '#fff3e0' : '#bcaaa4';
      rr(ctx, 4 * s, -7 * s, len - 8 * s, 14 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = '#c62828';
      for (const x of [2 * s, len - 6 * s]) {
        rr(ctx, x, -9 * s, 5 * s, 18 * s, 2 * s);
        ctx.fill();
      }
      ctx.fillStyle = '#212121';
      ctx.font = `${10 * s}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('忍', len / 2, 1 * s);
      ctx.textBaseline = 'alphabetic';
      return true;
    }
    case 'trumpet': {
      ctx.fillStyle = ready ? '#ffca28' : '#bfa04a';
      ctx.strokeStyle = '#b28704';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(-4 * s, -3 * s);
      ctx.lineTo(len - 16 * s, -3 * s);
      ctx.lineTo(len, -12 * s);
      ctx.lineTo(len, 12 * s);
      ctx.lineTo(len - 16 * s, 3 * s);
      ctx.lineTo(-4 * s, 3 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b28704';
      for (const x of [10, 16, 22]) ctx.fillRect(x * s, -8 * s, 3 * s, 5 * s);
      return true;
    }
    case 'plasma': {
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 6 * s;
      line(ctx, -8 * s, 0, 10 * s, 0);
      const glow = ready ? 1 : 0.5;
      ctx.strokeStyle = `rgba(224,64,251,${0.35 * glow})`;
      ctx.lineWidth = 12 * s;
      line(ctx, 12 * s, 0, len, 0);
      ctx.strokeStyle = `rgba(0,229,255,${0.9 * glow})`;
      ctx.lineWidth = 5 * s;
      line(ctx, 12 * s, 0, len, 0);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * s;
      line(ctx, 12 * s, 0, len - 2 * s, 0);
      return true;
    }
  }
  return false;
}

export function drawMonsterProjectile(ctx: Ctx, p: Projectile, time: number): boolean {
  switch (p.kind) {
    case 'crow': {
      const d = p.vx < 0 ? -1 : 1;
      const flap = Math.sin(time * 22 + p.x * 0.05) * 8;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(d, 1);
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.lineTo(-14, -6 - flap);
      ctx.lineTo(4, -3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.moveTo(14, -5);
      ctx.lineTo(21, -3);
      ctx.lineTo(14, -2);
      ctx.fill();
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(11, -5, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }
    case 'hay': {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.x * 0.03);
      ctx.fillStyle = '#e6c15c';
      ctx.strokeStyle = '#a0782a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 6; a += 0.3) {
        const r = (a / (Math.PI * 6)) * p.r * 0.9;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
      ctx.restore();
      return true;
    }
    case 'goo':
      ctx.fillStyle = '#c6ff00';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(118,255,3,0.5)';
      ctx.beginPath();
      ctx.arc(p.x - p.vx * 0.015, p.y - p.vy * 0.015, p.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      return true;
    case 'sound': {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = k === 1 ? 'rgba(255,245,157,0.9)' : 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 5 - k;
        ctx.beginPath();
        ctx.arc(-k * 14, 0, p.r - k * 8, -0.9, 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎵', -10, -p.r + Math.sin(time * 20) * 4);
      ctx.restore();
      return true;
    }
  }
  return false;
}

// ---------- blocks ----------

export function drawMonsterBlock(ctx: Ctx, p: Platform, time: number): boolean {
  if (p.kind === 'bounce') {
    // A red bounce pad on springs
    ctx.strokeStyle = '#9e9e9e';
    ctx.lineWidth = 3;
    const n = Math.max(2, Math.floor(p.w / 30));
    for (let k = 0; k < n; k++) {
      const x = p.x + ((k + 0.5) * p.w) / n;
      ctx.beginPath();
      for (let z = 0; z <= 4; z++) ctx.lineTo(x + (z % 2 ? 5 : -5), p.y + 6 + (z * (p.h - 6)) / 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#e53935';
    rr(ctx, p.x, p.y, p.w, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    const up = (Math.sin(time * 4) + 1) * 2;
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2, p.y - 14 - up);
    ctx.lineTo(p.x + p.w / 2 + 7, p.y - 6 - up);
    ctx.lineTo(p.x + p.w / 2 - 7, p.y - 6 - up);
    ctx.fill();
    return true;
  }
  if (p.kind === 'ice') {
    ctx.fillStyle = 'rgba(178,235,242,0.9)';
    rr(ctx, p.x, p.y, p.w, p.h, Math.min(6, p.h / 2));
    ctx.fill();
    ctx.fillStyle = '#e0f7fa';
    ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, Math.min(5, p.h * 0.3));
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    for (let x = p.x + 14; x < p.x + p.w - 10; x += 70) line(ctx, x, p.y + p.h - 3, x + 12, p.y + 4);
    ctx.strokeStyle = 'rgba(0,131,143,0.5)';
    rr(ctx, p.x, p.y, p.w, p.h, Math.min(6, p.h / 2));
    ctx.stroke();
    return true;
  }
  if (p.kind === 'spikes') {
    ctx.fillStyle = '#455a64';
    ctx.fillRect(p.x, p.y + p.h * 0.45, p.w, p.h * 0.55);
    const n = Math.max(2, Math.round(p.w / 16));
    const sw = p.w / n;
    for (let k = 0; k < n; k++) {
      const x = p.x + k * sw;
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath();
      ctx.moveTo(x, p.y + p.h * 0.5);
      ctx.lineTo(x + sw / 2, p.y - 6);
      ctx.lineTo(x + sw, p.y + p.h * 0.5);
      ctx.fill();
      ctx.fillStyle = '#90a4ae';
      ctx.beginPath();
      ctx.moveTo(x + sw / 2, p.y - 6);
      ctx.lineTo(x + sw, p.y + p.h * 0.5);
      ctx.lineTo(x + sw / 2, p.y + p.h * 0.5);
      ctx.fill();
    }
    return true;
  }
  return false;
}

// ---------- map backgrounds ----------

export function drawMonsterDeco(ctx: Ctx, deco: string, vw: number, vh: number, par: number, time: number): boolean {
  if (deco === 'inferno') {
    // A city skyline on fire: dark buildings, lit windows, flames on the roofs, smoke and embers.
    for (let layer = 0; layer < 2; layer++) {
      const speed = 0.2 + layer * 0.25;
      for (let i = 0; i < 12; i++) {
        const w = 70 + hash(i + layer * 30) * 70;
        const span = vw + 400;
        const x = (((i * span) / 12 - par * speed) % span + span) % span - 200;
        const top = vh * (0.38 + layer * 0.12) + hash(i * 3 + layer) * vh * 0.18;
        ctx.fillStyle = layer ? '#1b0d08' : '#2d150c';
        ctx.fillRect(x, top, w, vh - top);
        ctx.fillStyle = `rgba(255,${150 + Math.floor(hash(i) * 80)},60,${layer ? 0.75 : 0.45})`;
        for (let wy = top + 14; wy < vh - 10; wy += 22) {
          for (let wx = x + 10; wx < x + w - 12; wx += 18) {
            if (hash(wx * 0.37 + wy * 1.7) > 0.55) ctx.fillRect(wx, wy, 8, 10);
          }
        }
        if (hash(i + 9 + layer) > 0.4) {
          for (let k = 0; k < 4; k++) {
            const fx = x + 10 + (k * (w - 20)) / 3;
            const fh = 18 + Math.sin(time * 8 + i + k) * 8 + hash(i + k) * 16;
            ctx.fillStyle = k % 2 ? 'rgba(255,145,0,0.85)' : 'rgba(255,214,0,0.8)';
            ctx.beginPath();
            ctx.moveTo(fx - 10, top);
            ctx.quadraticCurveTo(fx, top - fh * 1.4, fx + 10, top);
            ctx.fill();
          }
        }
      }
    }
    ctx.fillStyle = 'rgba(40,20,20,0.35)';
    for (let i = 0; i < 6; i++) {
      const x = ((hash(i + 50) * vw - par * 0.1 + time * 12) % (vw + 200) + vw + 200) % (vw + 200) - 100;
      ctx.beginPath();
      ctx.arc(x, vh * 0.25 + hash(i) * vh * 0.2, 60 + hash(i + 2) * 50, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = ((hash(i) * vw - par * 0.5) % vw + vw) % vw;
      const y = vh - (((hash(i + 7) * vh + time * (50 + hash(i) * 70)) % vh) + vh) % vh;
      ctx.fillStyle = `rgba(255,${120 + Math.floor(hash(i) * 100)},40,${0.4 + hash(i + 1) * 0.5})`;
      ctx.fillRect(x, y, 3, 3);
    }
    return true;
  }
  if (deco === 'pirate') {
    // The open sea to the horizon, a sun, clouds and seagulls.
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.arc(vw * 0.8 - par * 0.02, vh * 0.2, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 6; i++) {
      const x = ((hash(i + 3) * (vw + 300) - par * 0.15 + time * 8) % (vw + 300) + vw + 300) % (vw + 300) - 150;
      const y = vh * 0.1 + hash(i + 11) * vh * 0.25;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.arc(x + 28, y + 6, 20, 0, Math.PI * 2);
      ctx.arc(x - 26, y + 8, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    const sea = vh * 0.62;
    const g = ctx.createLinearGradient(0, sea, 0, vh);
    g.addColorStop(0, '#0288d1');
    g.addColorStop(1, '#01579b');
    ctx.fillStyle = g;
    ctx.fillRect(0, sea, vw, vh - sea);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      for (let x = 0; x <= vw; x += 20) ctx.lineTo(x, sea + 14 + r * 30 + Math.sin(x * 0.04 + time * 1.5 + r - par * 0.01) * 4);
      ctx.stroke();
    }
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = ((hash(i + 40) * vw + time * 30 - par * 0.2) % (vw + 100) + vw + 100) % (vw + 100) - 50;
      const y = vh * 0.3 + hash(i + 41) * 60;
      const w = Math.sin(time * 6 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - w);
      ctx.quadraticCurveTo(x - 5, y - 5, x, y);
      ctx.quadraticCurveTo(x + 5, y - 5, x + 10, y - w);
      ctx.stroke();
    }
    return true;
  }
  if (deco === 'desert') {
    // A big hot sun, sand dunes and cactus shapes.
    ctx.fillStyle = 'rgba(255,241,118,0.9)';
    ctx.beginPath();
    ctx.arc(vw * 0.25 - par * 0.02, vh * 0.22, 54, 0, Math.PI * 2);
    ctx.fill();
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? '#e0a458' : '#f0c27b';
      ctx.beginPath();
      ctx.moveTo(0, vh);
      for (let x = 0; x <= vw; x += 20) ctx.lineTo(x, vh * (0.62 + layer * 0.1) + Math.sin((x + par * (0.2 + layer * 0.2)) * 0.006 + layer) * 30);
      ctx.lineTo(vw, vh);
      ctx.fill();
    }
    ctx.fillStyle = '#558b2f';
    for (let i = 0; i < 5; i++) {
      const x = ((hash(i + 60) * (vw + 200) - par * 0.4) % (vw + 200) + vw + 200) % (vw + 200) - 100;
      const y = vh * 0.78;
      rr(ctx, x - 6, y - 50, 12, 52, 6);
      ctx.fill();
      rr(ctx, x - 22, y - 36, 8, 22, 4);
      ctx.fill();
      rr(ctx, x - 22, y - 18, 22, 7, 3);
      ctx.fill();
      rr(ctx, x + 14, y - 42, 8, 20, 4);
      ctx.fill();
      rr(ctx, x, y - 28, 22, 7, 3);
      ctx.fill();
    }
    // Heat shimmer
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      for (let x = 0; x <= vw; x += 16) ctx.lineTo(x, vh * 0.55 + r * 18 + Math.sin(x * 0.05 + time * 3 + r) * 3);
      ctx.stroke();
    }
    return true;
  }
  return false;
}

/** The pirate map: the sea under the map, the ship's hull under the deck, the mast, sails and a flag. */
export function drawPirateShip(ctx: Ctx, deck: Platform, mapW: number, mapH: number, time: number) {
  // The sea below
  const g = ctx.createLinearGradient(0, mapH, 0, mapH + 400);
  g.addColorStop(0, '#039be5');
  g.addColorStop(1, '#01579b');
  ctx.fillStyle = g;
  ctx.fillRect(-3000, mapH - 60, mapW + 6000, 3000);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = -3000; x < mapW + 3000; x += 40) ctx.lineTo(x, mapH - 60 + Math.sin(x * 0.05 + time * 2) * 8);
  ctx.stroke();
  // Hull
  const L = deck.x - 20;
  const R = deck.x + deck.w + 20;
  const top = deck.y + deck.h;
  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.moveTo(L - 80, deck.y - 30);
  ctx.lineTo(R + 120, deck.y - 60);
  ctx.quadraticCurveTo(R, mapH - 40, (L + R) / 2, mapH - 30);
  ctx.quadraticCurveTo(L, mapH - 40, L - 80, deck.y - 30);
  ctx.fill();
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 3;
  for (let y = top + 30; y < mapH - 60; y += 34) line(ctx, L + (y - top) * 0.25, y, R - (y - top) * 0.25, y);
  // Cannon holes
  ctx.fillStyle = '#212121';
  for (let x = L + 120; x < R - 80; x += 170) {
    ctx.beginPath();
    ctx.arc(x, top + 40, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mast and sails
  const mx = (L + R) / 2;
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(mx - 9, deck.y - 560, 18, 560);
  const wave = Math.sin(time * 1.6) * 10;
  ctx.fillStyle = 'rgba(250,250,240,0.95)';
  for (const [y, w, h] of [[deck.y - 520, 300, 150], [deck.y - 340, 380, 180]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(mx - w / 2, y);
    ctx.lineTo(mx + w / 2, y);
    ctx.quadraticCurveTo(mx + w / 2 + wave, y + h / 2, mx + w / 2, y + h);
    ctx.lineTo(mx - w / 2, y + h);
    ctx.quadraticCurveTo(mx - w / 2 + wave, y + h / 2, mx - w / 2, y);
    ctx.fill();
  }
  // Skull on the big sail
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(mx, deck.y - 260, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(250,250,240,0.95)';
  ctx.beginPath();
  ctx.arc(mx - 10, deck.y - 264, 7, 0, Math.PI * 2);
  ctx.arc(mx + 10, deck.y - 264, 7, 0, Math.PI * 2);
  ctx.fill();
  // Flag
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.moveTo(mx + 9, deck.y - 600);
  ctx.quadraticCurveTo(mx + 40, deck.y - 590 + wave * 0.5, mx + 80, deck.y - 600 + wave);
  ctx.lineTo(mx + 80, deck.y - 560 + wave);
  ctx.quadraticCurveTo(mx + 40, deck.y - 550 + wave * 0.5, mx + 9, deck.y - 560);
  ctx.fill();
  ctx.fillRect(mx - 9, deck.y - 610, 18, 50);
}

// ---------- The Outbreak ----------

/** Night over the map (lighter as the morning comes) and the wave counter. */
export function drawOutbreakSky(ctx: Ctx, ob: OutbreakState, vw: number, vh: number, boss: Cat | null) {
  if (ob.night > 0) {
    ctx.fillStyle = `rgba(6,10,40,${0.5 * ob.night})`;
    ctx.fillRect(0, 0, vw, vh);
  }
  if (ob.phase === 'dawn') {
    const a = Math.sin((1 - ob.night) * Math.PI) * 0.45;
    const g = ctx.createLinearGradient(0, vh, 0, vh * 0.3);
    g.addColorStop(0, `rgba(255,183,77,${a})`);
    g.addColorStop(1, 'rgba(255,183,77,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    // The sun coming up
    ctx.fillStyle = `rgba(255,236,179,${0.9 * (1 - ob.night)})`;
    ctx.beginPath();
    ctx.arc(vw * 0.8, vh * (0.9 - (1 - ob.night) * 0.6), 46, 0, Math.PI * 2);
    ctx.fill();
  } else if (ob.night > 0.5) {
    ctx.fillStyle = 'rgba(255,253,231,0.9)';
    ctx.beginPath();
    ctx.arc(vw * 0.82, vh * 0.16, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(6,10,40,0.9)';
    ctx.beginPath();
    ctx.arc(vw * 0.82 + 12, vh * 0.16 - 6, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wave counter
  const text = `🌙 Wave ${ob.wave}${ob.endless ? '' : ' / 50'}  ·  🧟 ${ob.left}`;
  ctx.font = '800 16px "Baloo 2", system-ui, sans-serif';
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, 12, 12, w, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#c5e1a5';
  ctx.textAlign = 'left';
  ctx.fillText(text, 24, 33);
  // The Zombie Boss's health bar
  if (boss) {
    const bw = Math.min(520, vw * 0.5);
    const x = vw / 2 - bw / 2;
    const y = 54;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    rr(ctx, x - 4, y - 4, bw + 8, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#7cb342';
    rr(ctx, x, y, bw * Math.max(0, boss.hp / boss.maxHp), 14, 6);
    ctx.fill();
    ctx.font = '800 13px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`🧟 Zombie Boss  ${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`, vw / 2, y + 12);
  }
}
