import type { Body, Cat, Fighter, Projectile } from './entities';
import { stickBody } from './monsters';
import { WARP, warpPartner } from './oct30';
import { summonCard } from './weapons';
import type { Vec } from './types';

type Ctx = CanvasRenderingContext2D;

/*
 * The October 30 update's pictures: the new weapons (local space: hand at (0, 0), pointing along +x), their shots,
 * the summon cards, the Unicorn, the Dino, the Wizard and the Panda, sleeping under a blanket, and map editor portals.
 */

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function bar(ctx: Ctx, x: number, y: number, w: number, frac: number, color: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2 - 1, y - 1, w + 2, 7, 3);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y, w * Math.max(0, Math.min(1, frac)), 5, 2.5);
  ctx.fill();
}

function emoji(ctx: Ctx, text: string, x: number, y: number, size: number) {
  ctx.font = `${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/** A folded paper plane pointing along +x. */
function plane(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#90a4ae';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 14 * s, y);
  ctx.lineTo(x - 12 * s, y - 9 * s);
  ctx.lineTo(x - 6 * s, y);
  ctx.lineTo(x - 12 * s, y + 7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  line(ctx, x + 14 * s, y, x - 6 * s, y);
}

function slipper(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = '#ff7043';
  ctx.strokeStyle = '#bf360c';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, 13 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#1e88e5';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(x - 2 * s, y - 5 * s);
  ctx.lineTo(x + 4 * s, y);
  ctx.lineTo(x - 2 * s, y + 5 * s);
  ctx.stroke();
}

function balloon(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0288d1';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.9, y - 2);
  ctx.lineTo(x + r * 1.3, y);
  ctx.lineTo(x + r * 0.9, y + 2);
  ctx.fill();
}

function frisbee(ctx: Ctx, x: number, y: number, r: number, spin: number) {
  ctx.fillStyle = '#ffeb3b';
  ctx.strokeStyle = '#f57f17';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#ff9800';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.6, r * 0.2, 0, spin, spin + Math.PI);
  ctx.stroke();
}

/** A folded blanket (purple with stars) or one spread out flying. */
function blanket(ctx: Ctx, x: number, y: number, w: number, h: number, time: number) {
  ctx.fillStyle = '#7e57c2';
  ctx.strokeStyle = '#4527a0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h / 2);
  for (let k = 0; k <= 6; k++) ctx.lineTo(x - w / 2 + (w * k) / 6, y - h / 2 + Math.sin(time * 8 + k) * 2);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff59d';
  for (const [dx, dy] of [[-0.3, 0], [0.1, -0.15], [0.3, 0.2]]) {
    ctx.beginPath();
    ctx.arc(x + dx * w, y + dy * h, Math.max(1.5, h * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The new weapons. Returns false for anything else. */
export function drawOct30Weapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean, time: number): boolean {
  const card = summonCard(id);
  if (card) {
    // A glowing summon card with the helper on it.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 * s;
    line(ctx, 0, 0, len - 18 * s, 0);
    ctx.save();
    ctx.translate(len - 6 * s, 0);
    ctx.rotate(Math.PI / 2);
    if (ready) {
      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur = 10 + Math.sin(time * 5) * 4;
    }
    ctx.fillStyle = ready ? '#4a148c' : '#616161';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.roundRect(-11 * s, -15 * s, 22 * s, 30 * s, 3 * s);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.rotate(-Math.PI / 2);
    ctx.globalAlpha = ready ? 1 : 0.5;
    emoji(ctx, card.icon, 0, 0, 15 * s);
    ctx.globalAlpha = 1;
    ctx.restore();
    return true;
  }
  switch (id) {
    case 'broom': {
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 3.5 * s;
      line(ctx, -10 * s, 0, len - 22 * s, 0);
      ctx.fillStyle = ready ? '#fbc02d' : '#bcaaa4';
      ctx.strokeStyle = '#a1887f';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(len - 26 * s, -5 * s);
      ctx.lineTo(len + 2 * s, -13 * s);
      ctx.lineTo(len + 2 * s, 13 * s);
      ctx.lineTo(len - 26 * s, 5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (let k = -2; k <= 2; k++) line(ctx, len - 16 * s, k * 2 * s, len + 2 * s, k * 5 * s);
      ctx.fillStyle = '#e53935';
      ctx.fillRect(len - 28 * s, -5 * s, 4 * s, 10 * s);
      return true;
    }
    case 'paperplane':
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * s;
      line(ctx, 0, 0, len - 14 * s, 0);
      if (ready) plane(ctx, len - 2 * s, 0, s);
      return true;
    case 'slipper':
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * s;
      line(ctx, 0, 0, len - 14 * s, 0);
      if (ready) slipper(ctx, len - 2 * s, 0, s);
      return true;
    case 'waterballoon':
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * s;
      line(ctx, 0, 0, len - 12 * s, 0);
      if (ready) balloon(ctx, len - 2 * s, 0, 10 * s);
      return true;
    case 'frisbee':
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * s;
      line(ctx, 0, 0, len - 14 * s, 0);
      if (ready) frisbee(ctx, len - 2 * s, 0, 15 * s, time * 6);
      return true;
    case 'plunger':
      ctx.strokeStyle = '#a1887f';
      ctx.lineWidth = 4 * s;
      line(ctx, -6 * s, 0, len - 12 * s, 0);
      if (ready) {
        ctx.fillStyle = '#e53935';
        ctx.beginPath();
        ctx.moveTo(len - 14 * s, -4 * s);
        ctx.quadraticCurveTo(len + 4 * s, -16 * s, len + 4 * s, 0);
        ctx.quadraticCurveTo(len + 4 * s, 16 * s, len - 14 * s, 4 * s);
        ctx.closePath();
        ctx.fill();
      }
      return true;
    case 'fan': {
      ctx.strokeStyle = '#90a4ae';
      ctx.lineWidth = 3.5 * s;
      line(ctx, 0, 0, len - 16 * s, 0);
      ctx.save();
      ctx.translate(len - 8 * s, 0);
      ctx.strokeStyle = '#78909c';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(0, 0, 16 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(time * (ready ? 20 : 4));
      ctx.fillStyle = '#4fc3f7';
      for (let k = 0; k < 3; k++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.ellipse(8 * s, 0, 7 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#37474f';
      ctx.beginPath();
      ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }
    case 'morningstar': {
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 4 * s;
      line(ctx, -6 * s, 0, len * 0.45, 0);
      // The chain
      ctx.strokeStyle = '#9e9e9e';
      ctx.lineWidth = 2 * s;
      ctx.setLineDash([4 * s, 3 * s]);
      line(ctx, len * 0.45, 0, len - 14 * s, 0);
      ctx.setLineDash([]);
      ctx.fillStyle = ready ? '#757575' : '#9e9e9e';
      ctx.strokeStyle = '#424242';
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.moveTo(len - 4 * s + Math.cos(a) * 9 * s, Math.sin(a) * 9 * s);
        ctx.lineTo(len - 4 * s + Math.cos(a) * 17 * s, Math.sin(a) * 17 * s);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(len - 4 * s, 0, 11 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return true;
    }
    case 'blanket':
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * s;
      line(ctx, 0, 0, len - 20 * s, 0);
      if (ready) blanket(ctx, len - 8 * s, 0, 30 * s, 20 * s, time * 0.3);
      else {
        ctx.fillStyle = '#9575cd';
        ctx.fillRect(len - 20 * s, -4 * s, 20 * s, 8 * s);
      }
      return true;
  }
  return false;
}

/** The new shots. Returns false for anything else. */
export function drawOct30Projectile(ctx: Ctx, p: Projectile, time: number): boolean {
  const a = Math.atan2(p.vy, p.vx);
  ctx.save();
  ctx.translate(p.x, p.y);
  switch (p.kind) {
    case 'plane':
      ctx.rotate(a + Math.sin(time * 6 + p.t * 4) * 0.15);
      plane(ctx, 0, 0, 1.1);
      break;
    case 'slipper':
      ctx.rotate(p.t * 14);
      slipper(ctx, 0, 0, 1.1);
      break;
    case 'balloon':
      ctx.scale(1 + Math.sin(p.t * 20) * 0.08, 1 - Math.sin(p.t * 20) * 0.08);
      balloon(ctx, 0, 0, p.r);
      break;
    case 'plunger':
      ctx.rotate(a);
      ctx.strokeStyle = '#a1887f';
      ctx.lineWidth = 4;
      line(ctx, -26, 0, 0, 0);
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(-2, -4);
      ctx.quadraticCurveTo(14, -14, 14, 0);
      ctx.quadraticCurveTo(14, 14, -2, 4);
      ctx.closePath();
      ctx.fill();
      break;
    case 'frisbee':
      frisbee(ctx, 0, 0, p.r, p.t * 30);
      break;
    case 'blanket':
      ctx.rotate(Math.sin(p.t * 10) * 0.2);
      blanket(ctx, 0, 0, p.r * 2.6, p.r * 1.2, time);
      break;
    case 'magic': {
      ctx.fillStyle = '#b388ff';
      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? p.r * 0.45 : p.r;
        const b = (k / 10) * Math.PI * 2 + time * 8;
        ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.restore();
      return false;
  }
  ctx.restore();
  return true;
}

// ---------- helpers ----------

/** The Unicorn, the Dino, the Wizard and the Panda. Returns false for anything else. */
export function drawOct30Helper(ctx: Ctx, c: Cat, time: number): boolean {
  switch (c.variant) {
    case 'unicorn':
      if (c.alive) drawUnicorn(ctx, c, time);
      return true;
    case 'dino':
      if (c.alive) drawDino(ctx, c, time);
      return true;
    case 'wizard':
      if (c.alive) drawWizard(ctx, c, time);
      return true;
    case 'panda':
      if (c.alive) drawPanda(ctx, c, time);
      return true;
  }
  return false;
}

function drawUnicorn(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const run = c.onGround && Math.abs(c.vx) > 20 ? Math.sin(time * 18 + c.id) : 0;
  const body = c.hurtFlash > 0 ? '#ffcdd2' : '#fafafa';
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(d, 1);
  ctx.strokeStyle = '#9e9e9e';
  ctx.lineWidth = 1.5;
  // Legs
  ctx.fillStyle = body;
  for (const [x, k] of [[-16, 1], [-8, -1], [10, -1], [17, 1]]) {
    ctx.save();
    ctx.translate(x, -18);
    ctx.rotate(run * 0.5 * k);
    ctx.fillRect(-3, 0, 6, 18);
    ctx.strokeRect(-3, 0, 6, 18);
    ctx.restore();
  }
  // Body, neck and head
  ctx.beginPath();
  ctx.ellipse(0, -26, 24, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, -32);
  ctx.lineTo(24, -48);
  ctx.lineTo(32, -44);
  ctx.lineTo(22, -26);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(31, -46, 9, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Golden horn
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.moveTo(30, -51);
  ctx.lineTo(42, -66);
  ctx.lineTo(35, -50);
  ctx.closePath();
  ctx.fill();
  // Rainbow mane and tail
  const rainbow = ['#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#ab47bc'];
  rainbow.forEach((col, k) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    line(ctx, 22 - k * 2, -50 + k * 3, 14 - k * 3, -40 + k * 3 + Math.sin(time * 10 + k) * 2);
    line(ctx, -22, -28 + k * 2, -34 - Math.sin(time * 8 + k) * 3, -22 + k * 3);
  });
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(32, -48, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Speed lines while charging
  if (c.chargeDir) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let k = 0; k < 3; k++) ctx.fillRect(c.x - d * (30 + k * 14), c.y - 30 + k * 6, 10, 2);
  }
  bar(ctx, c.x, c.y - c.h - 26, 34, c.hp / c.maxHp, c.owner.color);
}

function drawDino(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const run = c.onGround && Math.abs(c.vx) > 20 ? Math.sin(time * 12 + c.id) : 0;
  const col = c.hurtFlash > 0 ? '#ffffff' : '#66bb6a';
  const bite = c.attackT > 0.9;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(d, 1);
  ctx.fillStyle = col;
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 1.5;
  // Tail, legs, body
  ctx.beginPath();
  ctx.moveTo(-8, -30);
  ctx.quadraticCurveTo(-34, -26, -40, -12);
  ctx.quadraticCurveTo(-24, -20, -6, -18);
  ctx.fill();
  ctx.stroke();
  for (const [x, k] of [[-6, 1], [6, -1]]) {
    ctx.beginPath();
    ctx.ellipse(x + run * 4 * k, -8, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, -28, 15, 17, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Big head and jaw
  ctx.beginPath();
  ctx.roundRect(4, -58, 28, 16, 6);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(6, bite ? -38 : -44, 24, 8, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(10 + k * 5, -42);
    ctx.lineTo(12 + k * 5, -38);
    ctx.lineTo(14 + k * 5, -42);
    ctx.fill();
  }
  // Tiny arms and the eye
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 3;
  line(ctx, 10, -32, 17, -28);
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(20, -53, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Spikes down the back
  ctx.fillStyle = '#a5d6a7';
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-14 + k * 5, -40 + k * 1);
    ctx.lineTo(-11 + k * 5, -48 + k * 1);
    ctx.lineTo(-8 + k * 5, -40 + k * 1);
    ctx.fill();
  }
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 14, 36, c.hp / c.maxHp, c.owner.color);
}

function drawWizard(ctx: Ctx, c: Cat, time: number) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const col = c.hurtFlash > 0 ? '#ffffff' : c.owner.color;
  const { head, hand, d } = stickBody(ctx, c, time, col, 5, 0.15, false);
  const r = c.h * 0.13;
  // Robe
  ctx.fillStyle = '#5e35b1';
  ctx.beginPath();
  ctx.moveTo(head.x - 4, head.y + r);
  ctx.lineTo(head.x + 4, head.y + r);
  ctx.lineTo(head.x + 14, -6);
  ctx.lineTo(head.x - 14, -6);
  ctx.closePath();
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Pointy hat with stars
  ctx.fillStyle = '#311b92';
  ctx.beginPath();
  ctx.moveTo(head.x - r * 1.4, head.y - r * 0.6);
  ctx.lineTo(head.x + r * 1.4, head.y - r * 0.6);
  ctx.lineTo(head.x - d * r * 0.6, head.y - r * 3.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.arc(head.x, head.y - r * 1.4, 2, 0, Math.PI * 2);
  ctx.fill();
  // White beard
  ctx.fillStyle = '#eeeeee';
  ctx.beginPath();
  ctx.moveTo(head.x + d * r * 0.2 - 5, head.y + r * 0.4);
  ctx.lineTo(head.x + d * r * 0.2 + 5, head.y + r * 0.4);
  ctx.lineTo(head.x + d * r * 0.4, head.y + r * 1.8);
  ctx.closePath();
  ctx.fill();
  // Staff with a glowing tip
  ctx.strokeStyle = '#6d4c41';
  ctx.lineWidth = 3;
  line(ctx, hand.x, hand.y + 18, hand.x + d * 4, hand.y - 22);
  ctx.fillStyle = c.shootT < 0.5 ? '#ea80fc' : '#b388ff';
  ctx.shadowColor = '#e040fb';
  ctx.shadowBlur = 8 + Math.sin(time * 8) * 4;
  ctx.beginPath();
  ctx.arc(hand.x + d * 4, hand.y - 25, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 36, 34, c.hp / c.maxHp, c.owner.color);
}

function drawPanda(ctx: Ctx, c: Cat, time: number) {
  const rolling = !!c.chargeDir;
  ctx.save();
  ctx.translate(c.x, c.y - 21);
  if (rolling) ctx.rotate(time * 14 * c.chargeDir);
  const white = c.hurtFlash > 0 ? '#ffcdd2' : '#fafafa';
  ctx.fillStyle = white;
  ctx.strokeStyle = '#212121';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#212121';
  // Ears, eye patches, nose, arms
  for (const x of [-13, 13]) {
    ctx.beginPath();
    ctx.arc(x, -16, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const d = c.facing || 1;
  for (const x of [-6, 7]) {
    ctx.beginPath();
    ctx.ellipse(x + d * 2, -4, 4.5, 6, x < 0 ? 0.4 : -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const x of [-6, 7]) {
    ctx.beginPath();
    ctx.arc(x + d * 3, -5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(d * 2, 4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-16, 10, 6, 8, 0.3, 0, Math.PI * 2);
  ctx.ellipse(16, 10, 6, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 14, 34, c.hp / c.maxHp, c.owner.color);
}

// ---------- on top of everyone ----------

/** Asleep under a blanket, and a Morning Star spin. */
export function drawOct30Over(ctx: Ctx, bodies: Body[], fighters: Fighter[], time: number) {
  for (const b of bodies) {
    if (!b.alive || b.sleepT <= 0) continue;
    // Lying down: the blanket covers the body, the head peeks out.
    const w = Math.max(b.h, b.w) * 1.05;
    const fx = b.x;
    const fy = b.y - 8;
    blanket(ctx, fx, fy, w, 18, time * 0.2);
    ctx.fillStyle = '#fff';
    ctx.font = '900 16px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const k = (time * 0.8) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.fillText('z', fx + 14 + k * 10, fy - 20 - k * 26);
    ctx.globalAlpha = 1;
  }
  for (const f of fighters) {
    if (!f.alive || f.spinT <= 0) continue;
    const sh = f.shoulder();
    const R = f.reach(f.slashSlot) * 0.95;
    const a = time * 18;
    ctx.strokeStyle = 'rgba(207,216,220,0.45)';
    ctx.lineWidth = 10 * f.scale;
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, R, a, a + Math.PI * 1.2);
    ctx.stroke();
    ctx.fillStyle = '#757575';
    ctx.beginPath();
    ctx.arc(sh.x + Math.cos(a + Math.PI * 1.2) * R, sh.y + Math.sin(a + Math.PI * 1.2) * R, 12 * f.scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- map editor portals ----------

/** Portals in pairs: blue and orange, a number on each so you can see which goes with which. */
export function drawWarps(ctx: Ctx, warps: Vec[], time: number) {
  warps.forEach((w, i) => {
    const pair = Math.floor(i / 2);
    const linked = warpPartner(i, warps.length) >= 0;
    const col = !linked ? '#9e9e9e' : i % 2 === 0 ? '#29b6f6' : '#ff9100';
    const cx = w.x;
    const cy = w.y - WARP.h / 2;
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = linked ? 18 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, WARP.w / 2, WARP.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (linked) {
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 3; k++) {
        const r = ((time * 0.8 + k / 3) % 1) * 0.9;
        ctx.globalAlpha = 1 - r;
        ctx.beginPath();
        ctx.ellipse(cx, cy, (WARP.w / 2) * r, (WARP.h / 2) * r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(linked ? String(pair + 1) : '?', cx, w.y - WARP.h - 14);
    ctx.restore();
  });
}
