import type { Cat, Projectile } from './entities';
import type { IceSpike } from './game';
import { stickBody } from './monsters';

type Ctx = CanvasRenderingContext2D;

/*
 * The October 23 update's pictures: the food weapons (local space: hand at (0, 0), pointing along +x) and their shots,
 * the Gingerbread Man, the Cupcake and the Chef, Ice Cream's ice spikes, and the Portal map's purple portal.
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

/** A pie seen from the side: golden crust, cream on top. */
function pie(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#d7a86e';
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.1);
  ctx.lineTo(x + r, y - r * 0.1);
  ctx.lineTo(x + r * 0.8, y + r * 0.45);
  ctx.lineTo(x - r * 0.8, y + r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fffde7';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.15, r * 0.95, r * 0.4, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.arc(x, y - r * 0.5, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- weapons ----------

export function drawTreatWeapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean, time: number): boolean {
  switch (id) {
    case 'pie': {
      // A pie on a flat hand (gone for a moment after you throw it, then a new one)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * s;
      line(ctx, 0, 0, len - 16 * s, 0);
      if (ready) {
        ctx.save();
        ctx.translate(len - 4 * s, -4 * s);
        ctx.rotate(Math.PI / 2);
        pie(ctx, 0, 0, 14 * s);
        ctx.restore();
      }
      return true;
    }
    case 'icecream': {
      // A waffle cone with two scoops
      const cx = len - 14 * s;
      ctx.fillStyle = '#e0a458';
      ctx.strokeStyle = '#a1662f';
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cx, -9 * s);
      ctx.lineTo(cx, 9 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      for (let k = 1; k < 4; k++) {
        ctx.moveTo(cx * (k / 4), -9 * s * (k / 4));
        ctx.lineTo(cx * ((k + 1) / 4), 9 * s * ((k + 1) / 4));
      }
      ctx.stroke();
      ctx.fillStyle = ready ? '#f8bbd0' : '#d7c4ca';
      ctx.beginPath();
      ctx.arc(cx + 4 * s, 0, 11 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ready ? '#e1f5fe' : '#cfd8dc';
      ctx.beginPath();
      ctx.arc(cx + 16 * s, 0, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      if (ready) {
        // Sparkles of cold
        ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(time * 8) * 0.4})`;
        ctx.fillRect(cx + 18 * s, -6 * s, 3 * s, 3 * s);
      }
      return true;
    }
    case 'rollingpin': {
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 3.5 * s;
      line(ctx, -8 * s, 0, len, 0);
      ctx.fillStyle = ready ? '#e0b07a' : '#bfa182';
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.roundRect(10 * s, -9 * s, len - 22 * s, 18 * s, 8 * s);
      ctx.fill();
      ctx.stroke();
      // A bit of flour
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(len * 0.4, -6 * s, 6 * s, 3 * s);
      return true;
    }
    case 'spatula': {
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 4 * s;
      line(ctx, -6 * s, 0, len - 22 * s, 0);
      ctx.fillStyle = ready ? '#cfd8dc' : '#90a4ae';
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.roundRect(len - 24 * s, -12 * s, 26 * s, 24 * s, 4 * s);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#546e7a';
      for (const o of [-5, 0, 5]) line(ctx, len - 18 * s, o * s, len - 4 * s, o * s);
      return true;
    }
    case 'ketchup': {
      // A squeeze bottle pointing forward
      ctx.fillStyle = ready ? '#e53935' : '#a1514f';
      ctx.strokeStyle = '#8e0000';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.roundRect(-4 * s, -9 * s, len - 12 * s, 18 * s, 6 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4 * s, -4 * s, 12 * s, 8 * s);
      ctx.fillStyle = '#fafafa';
      ctx.beginPath();
      ctx.moveTo(len - 16 * s, -6 * s);
      ctx.lineTo(len, -1.5 * s);
      ctx.lineTo(len, 1.5 * s);
      ctx.lineTo(len - 16 * s, 6 * s);
      ctx.closePath();
      ctx.fill();
      return true;
    }
    case 'popcorn': {
      // A red and white striped bucket full of popcorn
      const x0 = len - 30 * s;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x0, -12 * s);
      ctx.lineTo(x0 + 26 * s, -15 * s);
      ctx.lineTo(x0 + 26 * s, 15 * s);
      ctx.lineTo(x0, 12 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e53935';
      for (const o of [-8, 0, 8]) ctx.fillRect(x0, (o - 2) * s, 26 * s, 4 * s);
      if (ready) {
        ctx.fillStyle = '#fff8e1';
        for (let k = 0; k < 6; k++) {
          ctx.beginPath();
          ctx.arc(x0 + 30 * s + Math.sin(k * 2.1) * 3 * s, (k - 2.5) * 5 * s, 4.5 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }
  }
  return false;
}

export function drawTreatProjectile(ctx: Ctx, p: Projectile): boolean {
  if (p.kind === 'pie') {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx) * 0.3);
    pie(ctx, 0, 0, p.r);
    ctx.restore();
    return true;
  }
  if (p.kind === 'ketchup') {
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r * 1.3, p.r * 0.9, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
    ctx.fill();
    return true;
  }
  if (p.kind === 'popcorn') {
    ctx.fillStyle = '#fff8e1';
    ctx.strokeStyle = '#ffca28';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.x - 2, p.y, p.r * 0.7, 0, Math.PI * 2);
    ctx.arc(p.x + 2, p.y - 2, p.r * 0.7, 0, Math.PI * 2);
    ctx.arc(p.x + 1, p.y + 2, p.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return true;
  }
  return false;
}

// ---------- helpers ----------

/** The Gingerbread Man, the Cupcake and the Chef. Returns false for anything else. */
export function drawTreat(ctx: Ctx, c: Cat, time: number): boolean {
  switch (c.variant) {
    case 'ginger':
      if (c.alive) drawGinger(ctx, c, time);
      return true;
    case 'cupcake':
      if (c.alive) drawCupcake(ctx, c, time);
      return true;
    case 'chef':
      if (c.alive) drawChef(ctx, c, time);
      return true;
  }
  return false;
}

function drawGinger(ctx: Ctx, c: Cat, time: number) {
  const col = c.hurtFlash > 0 ? '#ffffff' : '#b9773a';
  const run = c.onGround && Math.abs(c.vx) > 20 ? Math.sin(time * 16 + c.id) : 0;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.fillStyle = col;
  ctx.strokeStyle = '#7b4a1e';
  ctx.lineWidth = 1.5;
  // Legs, arms, body and head as one cookie
  ctx.beginPath();
  ctx.ellipse(-6 + run * 4, -8, 6, 9, 0.2, 0, Math.PI * 2);
  ctx.ellipse(6 - run * 4, -8, 6, 9, -0.2, 0, Math.PI * 2);
  ctx.ellipse(0, -26, 11, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(-13, -30 - run * 3, 8, 5, -0.5, 0, Math.PI * 2);
  ctx.ellipse(13, -30 + run * 3, 8, 5, 0.5, 0, Math.PI * 2);
  ctx.arc(0, -45, 10, 0, Math.PI * 2);
  ctx.fill();
  // White icing
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -44, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  for (const [x, y] of [[-3, -48], [3, -48]]) ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
  ctx.fillStyle = c.owner.color;
  for (const y of [-31, -24]) {
    ctx.beginPath();
    ctx.arc(0, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 14, 30, c.hp / c.maxHp, c.owner.color);
}

function drawCupcake(ctx: Ctx, c: Cat, time: number) {
  const squish = c.onGround ? 1 : 1.1;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(1 / squish, squish);
  // Paper cup
  ctx.fillStyle = c.hurtFlash > 0 ? '#ffffff' : c.owner.color;
  ctx.beginPath();
  ctx.moveTo(-12, -14);
  ctx.lineTo(12, -14);
  ctx.lineTo(9, 0);
  ctx.lineTo(-9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (const x of [-6, 0, 6]) line(ctx, x, -14, x * 0.75, 0);
  // Frosting swirl
  ctx.fillStyle = c.hurtFlash > 0 ? '#ffffff' : '#f48fb1';
  ctx.beginPath();
  ctx.ellipse(0, -18, 14, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(0, -24, 10, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(0, -29, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cherry and eyes
  ctx.fillStyle = '#d32f2f';
  ctx.beginPath();
  ctx.arc(Math.sin(time * 6 + c.id) * 1.5, -34, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#212121';
  const d = c.facing || 1;
  for (const x of [2, 7]) ctx.fillRect(d * x - 1.2, -20, 2.4, 3);
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 18, 28, c.hp / c.maxHp, c.owner.color);
}

function drawChef(ctx: Ctx, c: Cat, time: number) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const col = c.hurtFlash > 0 ? '#ffffff' : c.owner.color;
  const { head, hand, d } = stickBody(ctx, c, time, col, 5, 0.2, false);
  const r = c.h * 0.13;
  // White chef's hat
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#bdbdbd';
  ctx.lineWidth = 1.2;
  ctx.fillRect(head.x - r * 0.9, head.y - r * 1.5, r * 1.8, r * 0.7);
  ctx.strokeRect(head.x - r * 0.9, head.y - r * 1.5, r * 1.8, r * 0.7);
  ctx.beginPath();
  ctx.arc(head.x - r * 0.6, head.y - r * 1.9, r * 0.6, 0, Math.PI * 2);
  ctx.arc(head.x + r * 0.6, head.y - r * 1.9, r * 0.6, 0, Math.PI * 2);
  ctx.arc(head.x, head.y - r * 2.3, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Moustache
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(head.x + d * r * 0.45 - 3, head.y + r * 0.35, 3, 0, Math.PI);
  ctx.arc(head.x + d * r * 0.45 + 3, head.y + r * 0.35, 3, 0, Math.PI);
  ctx.stroke();
  // A pie ready to throw
  if (c.shootT > 0.6) pie(ctx, hand.x + d * 6, hand.y - 6, 9);
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 30, 34, c.hp / c.maxHp, c.owner.color);
}

// ---------- Ice Cream's ice spikes ----------

/** An ice spike: a block of ice on a head (icicles hanging down), or a tall spike bursting out of the ground. It fades as it melts. */
export function drawIceSpike(ctx: Ctx, s: IceSpike) {
  const melt = Math.min(1, s.life / 1.2);
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.6 * melt;
  const g = ctx.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h);
  g.addColorStop(0, '#e1f5fe');
  g.addColorStop(1, '#81d4fa');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (s.head) {
    // A chunky block with icicles hanging down
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.w, s.y);
    ctx.lineTo(s.x + s.w, s.y + s.h * 0.75);
    for (let k = 4; k >= 0; k--) {
      const x = s.x + (s.w * k) / 4;
      ctx.lineTo(x + s.w / 8, s.y + s.h * (k % 2 ? 1.15 : 0.95));
      ctx.lineTo(x, s.y + s.h * 0.75);
    }
  } else {
    // A spike: wide at the ground, sharp at the top
    ctx.moveTo(s.x, s.y + s.h);
    ctx.lineTo(s.x + s.w * 0.2, s.y + s.h * 0.35);
    ctx.lineTo(s.x + s.w * 0.5, s.y);
    ctx.lineTo(s.x + s.w * 0.8, s.y + s.h * 0.3);
    ctx.lineTo(s.x + s.w, s.y + s.h);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Shine
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  line(ctx, s.x + s.w * 0.3, s.y + s.h * 0.2, s.x + s.w * 0.36, s.y + s.h * 0.6);
  // Drips once it starts melting
  if (s.life < 2) {
    ctx.fillStyle = '#b3e5fc';
    const k = (s.life * 3) % 1;
    ctx.beginPath();
    ctx.arc(s.x + s.w * 0.7, s.y + s.h + k * 18, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- the Portal ----------

/** The Portal map's purple portal: a swirling oval. */
export function drawPortal(ctx: Ctx, p: { x: number; y: number; r: number }, time: number) {
  const rx = p.r * 0.75;
  ctx.save();
  // Glow
  const glow = ctx.createRadialGradient(p.x, p.y, rx * 0.2, p.x, p.y, p.r * 1.5);
  glow.addColorStop(0, 'rgba(224,64,251,0.55)');
  glow.addColorStop(1, 'rgba(124,77,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx * 1.9, p.r * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // The hole
  const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
  g.addColorStop(0, '#12002b');
  g.addColorStop(0.6, '#4a148c');
  g.addColorStop(1, '#aa00ff');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, p.r, 0, 0, Math.PI * 2);
  ctx.fill();
  // Swirl
  ctx.strokeStyle = 'rgba(234,128,252,0.85)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3; a += 0.15) {
      const rad = (a / (Math.PI * 3)) * 0.9;
      const ang = a + time * 3 + (k * Math.PI * 2) / 3;
      const x = p.x + Math.cos(ang) * rx * rad;
      const y = p.y + Math.sin(ang) * p.r * rad;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Rim
  ctx.strokeStyle = '#e040fb';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, p.r, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Sparkles flying in
  ctx.fillStyle = '#f3e5f5';
  for (let i = 0; i < 10; i++) {
    const k = (time * 0.6 + i / 10) % 1;
    const a = i * 2.4;
    const d = (1 - k) * p.r * 1.6;
    ctx.globalAlpha = k;
    ctx.fillRect(p.x + Math.cos(a) * d * 0.75 - 2, p.y + Math.sin(a) * d - 2, 4, 4);
  }
  ctx.restore();
}

// ---------- backgrounds ----------

const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** The October 23 map backgrounds: the Portal's purple void, the Kitchen and the Dessert Bar. Returns false for any other. */
export function drawTreatDeco(ctx: Ctx, deco: string, vw: number, vh: number, par: number, time: number): boolean {
  if (deco === 'portal') {
    // Floating purple rocks and twinkles in a void
    for (let i = 0; i < 50; i++) {
      const tw = 0.5 + 0.5 * Math.sin(time * 2.5 + i);
      ctx.fillStyle = `rgba(234,128,252,${0.2 + tw * 0.5})`;
      const x = ((hash(i) * vw - par * 0.4) % vw + vw) % vw;
      ctx.fillRect(x, hash(i + 40) * vh, 2, 2);
    }
    ctx.fillStyle = 'rgba(49,27,146,0.55)';
    for (let i = 0; i < 6; i++) {
      const x = ((hash(i + 3) * (vw + 200) - par * 0.6) % (vw + 200) + vw + 200) % (vw + 200) - 100;
      const y = vh * (0.15 + hash(i + 9) * 0.5) + Math.sin(time + i) * 8;
      const r = 14 + hash(i + 5) * 26;
      ctx.beginPath();
      ctx.moveTo(x - r, y);
      ctx.lineTo(x - r * 0.4, y - r * 0.6);
      ctx.lineTo(x + r * 0.6, y - r * 0.5);
      ctx.lineTo(x + r, y + r * 0.1);
      ctx.lineTo(x, y + r * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    return true;
  }
  if (deco === 'kitchen') {
    // White tiles, a window and pans hanging on the wall
    ctx.strokeStyle = 'rgba(120,144,156,0.25)';
    ctx.lineWidth = 1;
    const tile = 40;
    const off = (-par * 0.5) % tile;
    for (let x = off; x < vw; x += tile) line(ctx, x, 0, x, vh);
    for (let y = 0; y < vh; y += tile) line(ctx, 0, y, vw, y);
    const wx = ((vw * 0.3 - par * 0.3) % (vw + 300) + vw + 300) % (vw + 300) - 150;
    ctx.fillStyle = '#b3e5fc';
    ctx.fillRect(wx, vh * 0.12, 150, 110);
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 6;
    ctx.strokeRect(wx, vh * 0.12, 150, 110);
    line(ctx, wx + 75, vh * 0.12, wx + 75, vh * 0.12 + 110);
    for (let i = 0; i < 4; i++) {
      const px = ((hash(i + 20) * vw - par * 0.3) % vw + vw) % vw;
      const swing = Math.sin(time * 1.5 + i) * 0.08;
      ctx.save();
      ctx.translate(px, vh * 0.08);
      ctx.rotate(swing);
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 3;
      line(ctx, 0, 0, 0, 30);
      ctx.fillStyle = i % 2 ? '#616161' : '#bf6b3c';
      ctx.beginPath();
      ctx.arc(0, 50, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return true;
  }
  if (deco === 'dessert') {
    // Giant scoops of ice cream and sprinkles falling
    for (let i = 0; i < 5; i++) {
      const x = ((hash(i + 30) * (vw + 300) - par * 0.5) % (vw + 300) + vw + 300) % (vw + 300) - 150;
      const y = vh * 0.78;
      ctx.fillStyle = 'rgba(224,164,88,0.6)';
      ctx.beginPath();
      ctx.moveTo(x - 40, y - 60);
      ctx.lineTo(x + 40, y - 60);
      ctx.lineTo(x, y + 60);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ['rgba(248,187,208,0.75)', 'rgba(225,245,254,0.75)', 'rgba(165,214,167,0.75)'][i % 3];
      ctx.beginPath();
      ctx.arc(x, y - 75, 48, 0, Math.PI * 2);
      ctx.fill();
    }
    const cols = ['#e91e63', '#ffeb3b', '#4fc3f7', '#8bc34a', '#ffffff'];
    for (let i = 0; i < 50; i++) {
      const x = ((hash(i) * vw - par) % vw + vw) % vw;
      const y = ((hash(i + 7) * vh + time * (30 + hash(i) * 40)) % vh + vh) % vh;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(hash(i + 3) * 3 + time);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-4, -1.5, 8, 3);
      ctx.restore();
    }
    return true;
  }
  return false;
}
