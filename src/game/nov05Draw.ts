import type { Body, Projectile } from './entities';

type Ctx = CanvasRenderingContext2D;

/*
 * The November 5 update's pictures: the Mattress and the APhone (local space: hand at (0, 0), pointing along +x),
 * their shots, and stickmen crushed under a mattress.
 */

/** A striped mattress with buttons. */
export function mattress(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#e3f2fd';
  ctx.strokeStyle = '#1e88e5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, Math.min(8, h / 3));
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,136,229,0.45)';
  ctx.lineWidth = 1.5;
  for (let k = 1; k < 6; k++) {
    const sx = x - w / 2 + (w * k) / 6;
    ctx.beginPath();
    ctx.moveTo(sx, y - h / 2 + 2);
    ctx.lineTo(sx, y + h / 2 - 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#1565c0';
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.arc(x - w / 2 + (w * (k + 0.5)) / 4, y, Math.max(1.2, h * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A phone: black glass with a little screen glow. */
function phone(ctx: Ctx, x: number, y: number, w: number, h: number, glow: boolean) {
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, w * 0.22);
  ctx.fill();
  ctx.fillStyle = glow ? '#4fc3f7' : '#37474f';
  ctx.beginPath();
  ctx.roundRect(x - w / 2 + 2, y - h / 2 + 3, w - 4, h - 6, w * 0.15);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.fillRect(x - w * 0.15, y - h / 2 + 1, w * 0.3, 2);
}

/** The new weapons. Returns false for anything else. */
export function drawNov05Weapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean): boolean {
  switch (id) {
    case 'mattress':
      ctx.save();
      ctx.translate(len * 0.55, 0);
      mattress(ctx, 0, 0, len * 0.95, ready ? 22 * s : 14 * s);
      ctx.restore();
      return true;
    case 'aphone':
      ctx.save();
      ctx.translate(len - 10 * s, 0);
      ctx.rotate(Math.PI / 2);
      phone(ctx, 0, 0, 14 * s, 26 * s, ready);
      ctx.restore();
      return true;
  }
  return false;
}

/** The new shots. Returns false for anything else. */
export function drawNov05Projectile(ctx: Ctx, p: Projectile): boolean {
  if (p.kind !== 'mattress' && p.kind !== 'aphone') return false;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.kind === 'mattress') {
    ctx.rotate(Math.sin(p.t * 6) * 0.15);
    mattress(ctx, 0, 0, p.r * 4.5, p.r * 0.9);
  } else {
    ctx.rotate(p.t * 16);
    phone(ctx, 0, 0, 12, 22, true);
  }
  ctx.restore();
  return true;
}

/** Crushed flat under a mattress (the feet stick out). */
export function drawNov05Over(ctx: Ctx, bodies: Body[], time: number) {
  for (const b of bodies) {
    if (!b.alive || b.mattT <= 0) continue;
    const w = Math.max(b.h, b.w) * 2.1;
    mattress(ctx, b.x, b.y - 12, w, 22);
    // Choking: little bubbles.
    const k = (time * 0.9 + b.id * 0.37) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#bbdefb';
    ctx.beginPath();
    ctx.arc(b.x + 8 + k * 6, b.y - 30 - k * 26, 3 + k * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
