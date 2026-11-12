import type { Body, Projectile } from './entities';

type Ctx = CanvasRenderingContext2D;

/*
 * The November 12 update's pictures: the Ghost Sword and the Blindfold (local space: hand at (0, 0), pointing along +x),
 * the thrown blindfold, and sleepers wearing one.
 */

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** A dark purple blindfold with two ties. */
function band(ctx: Ctx, w: number, h: number, time: number) {
  ctx.fillStyle = '#311b92';
  ctx.strokeStyle = '#120a3a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Closed sleepy eyes stitched on.
  ctx.strokeStyle = '#d1c4e9';
  ctx.lineWidth = 1.4;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * w * 0.2, -h * 0.05, w * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  // The ties flap.
  ctx.strokeStyle = '#4527a0';
  ctx.lineWidth = 2.5;
  const f = Math.sin(time * 8) * 3;
  line(ctx, -w / 2, 0, -w / 2 - 8, 6 + f);
  line(ctx, -w / 2, 0, -w / 2 - 10, -2 - f);
}

export function drawNov12Weapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean, time: number): boolean {
  switch (id) {
    case 'ghostsword': {
      // A pale glowing blade with a little ghost face on the guard.
      ctx.save();
      ctx.shadowColor = '#b3e5fc';
      ctx.shadowBlur = ready ? 14 : 6;
      ctx.fillStyle = '#37474f';
      ctx.fillRect(-2 * s, -3 * s, 12 * s, 6 * s);
      ctx.strokeStyle = '#b0bec5';
      ctx.lineWidth = 4 * s;
      line(ctx, 10 * s, -9 * s, 10 * s, 9 * s);
      ctx.globalAlpha = 0.75 + Math.sin(time * 5) * 0.15;
      ctx.fillStyle = '#e1f5fe';
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(12 * s, -4 * s);
      ctx.lineTo(len - 10 * s, -4 * s);
      ctx.lineTo(len, 0);
      ctx.lineTo(len - 10 * s, 4 * s);
      ctx.lineTo(12 * s, 4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(10 * s - 1.5 * s, -1.5 * s, 1 * s, 0, Math.PI * 2);
      ctx.arc(10 * s + 1.5 * s, -1.5 * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }
    case 'blindfold':
      ctx.strokeStyle = '#4527a0';
      ctx.lineWidth = 2.5 * s;
      line(ctx, 0, 0, len - 14 * s, 0);
      if (ready) {
        ctx.save();
        ctx.translate(len - 6 * s, 0);
        ctx.scale(s, s);
        band(ctx, 22, 10, time);
        ctx.restore();
      }
      return true;
  }
  return false;
}

export function drawNov12Projectile(ctx: Ctx, p: Projectile, time: number): boolean {
  if (p.kind !== 'blindfold') return false;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.t * 9);
  band(ctx, 26, 11, time);
  ctx.restore();
  return true;
}

/** Asleep with a blindfold: the stickman lies down, the band over its eyes and little z's. */
export function drawNov12Over(ctx: Ctx, bodies: Body[], time: number) {
  for (const b of bodies) {
    if (!b.alive || b.sleepT <= 0 || !b.blind) continue;
    // Lying down head first: the same turn as drawFighter, then the band over the eyes (head at 73 up, eyes a bit forward).
    const s = b.h / 80;
    const dir = b.facing || 1;
    ctx.save();
    ctx.translate(b.x, b.y - 4 * s);
    ctx.rotate(-dir * Math.PI / 2);
    ctx.translate(0, -77 * s);
    band(ctx, 24 * s, 9 * s, time);
    ctx.restore();
    const hx = b.x - dir * 70 * s;
    const hy = b.y - 12 * s;
    ctx.fillStyle = '#fff';
    ctx.font = '900 16px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const k = (time * 0.8) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.fillText('z', hx + 10 + k * 10, hy - 20 - k * 26);
    ctx.globalAlpha = 1;
  }
}
