import type { Fighter, Projectile } from './entities';

type Ctx = CanvasRenderingContext2D;

/*
 * Jay mhuay's pictures: her head (long hair, a ponytail with a bow, eyelashes), her dress,
 * the macaroni bowl and the fried rice box she holds (and the Lunch Box reward), and the shots.
 */

/** A bowl of macaroni (orange cheesy elbows piled up). */
function macBowl(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#ffb74d';
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI - Math.PI;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.55, y - r * 0.15 + Math.sin(a) * r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#90a4ae';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.15);
  ctx.quadraticCurveTo(x, y + r * 1.1, x + r, y - r * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#e57373';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.75, y + r * 0.15);
  ctx.quadraticCurveTo(x, y + r * 0.55, x + r * 0.75, y + r * 0.15);
  ctx.stroke();
}

/** One macaroni elbow. */
function elbow(ctx: Ctx, x: number, y: number, r: number, a: number) {
  ctx.strokeStyle = '#ff9800';
  ctx.lineWidth = r * 0.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, a, a + Math.PI * 0.9);
  ctx.stroke();
}

/** A white takeaway box of fried rice with a crab claw sticking out. */
function riceBox(ctx: Ctx, x: number, y: number, w: number, open: boolean) {
  const h = w * 0.75;
  // Fried rice heaped on top
  if (open) {
    ctx.fillStyle = '#ffe082';
    ctx.beginPath();
    ctx.ellipse(x, y - h / 2, w * 0.48, h * 0.32, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#66bb6a';
    for (const o of [-0.25, 0.1, 0.3]) {
      ctx.beginPath();
      ctx.arc(x + o * w, y - h / 2 - h * 0.12, w * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    // A crab claw
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.18, y - h / 2 - h * 0.3, w * 0.13, w * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = w * 0.05;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.27, y - h / 2 - h * 0.38);
    ctx.lineTo(x + w * 0.36, y - h / 2 - h * 0.5);
    ctx.moveTo(x + w * 0.27, y - h / 2 - h * 0.3);
    ctx.lineTo(x + w * 0.4, y - h / 2 - h * 0.34);
    ctx.stroke();
  }
  ctx.fillStyle = '#fafafa';
  ctx.strokeStyle = '#bdbdbd';
  ctx.lineWidth = Math.max(1, w * 0.04);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h / 2);
  ctx.lineTo(x + w / 2, y - h / 2);
  ctx.lineTo(x + w * 0.4, y + h / 2);
  ctx.lineTo(x - w * 0.4, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e53935';
  ctx.fillRect(x - w * 0.12, y - h * 0.1, w * 0.24, h * 0.2);
}

/** A pink lunch box with a bow (the reward). */
function lunchBox(ctx: Ctx, x: number, y: number, w: number) {
  const h = w * 0.7;
  ctx.fillStyle = '#f48fb1';
  ctx.strokeStyle = '#ad1457';
  ctx.lineWidth = Math.max(1, w * 0.05);
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, w * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fce4ec';
  ctx.fillRect(x - w / 2 + w * 0.08, y - h * 0.05, w * 0.84, h * 0.1);
  bow(ctx, x, y - h / 2, w * 0.18, '#ad1457');
}

/** A hair bow. */
function bow(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + d * r * 1.4, y - r * 0.8);
    ctx.lineTo(x + d * r * 1.4, y + r * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

/** Jay's weapons (local space: hand at (0, 0), pointing along +x). Returns false for anything else. */
export function drawJayWeapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean): boolean {
  switch (id) {
    case 'macaroni':
      macBowl(ctx, len * 0.6, 0, (ready ? 13 : 10) * s);
      return true;
    case 'friedrice':
      ctx.save();
      ctx.translate(len * 0.6, 0);
      ctx.rotate(-Math.PI / 2);
      riceBox(ctx, 0, 0, (ready ? 26 : 20) * s, ready);
      ctx.restore();
      return true;
    case 'jaylunch':
      lunchBox(ctx, len * 0.6, 0, (ready ? 26 : 22) * s);
      return true;
  }
  return false;
}

/** Flying macaroni and rice boxes. Returns false for anything else. */
export function drawJayProjectile(ctx: Ctx, p: Projectile): boolean {
  if (p.kind !== 'macaroni' && p.kind !== 'ricebox') return false;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.kind === 'macaroni') {
    // A clump of hot macaroni with steam.
    const r = p.r * 0.45;
    for (let k = 0; k < 5; k++) elbow(ctx, Math.cos(k * 1.3 + p.t * 9) * r * 1.3, Math.sin(k * 1.7 + p.t * 9) * r * 1.3, r, p.t * 12 + k);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-p.vx * 0.012, -p.vy * 0.012 - 6, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.rotate(Math.sin(p.t * 8) * 0.4);
    riceBox(ctx, 0, 0, p.r * 2.2, true);
  }
  ctx.restore();
  return true;
}

/** Her dress (over the body, under the arms' weapons). */
export function drawJayDress(ctx: Ctx, f: Fighter, neck: number[], hip: number[], s: number) {
  const top = neck[1] + 6 * s;
  const bottom = hip[1] + 14 * s;
  ctx.fillStyle = f.hurtFlash > 0 ? '#ffffff' : '#ec407a';
  ctx.strokeStyle = '#880e4f';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(neck[0] - 6 * s, top);
  ctx.lineTo(neck[0] + 6 * s, top);
  ctx.lineTo(hip[0] + 18 * s, bottom);
  ctx.quadraticCurveTo(hip[0], bottom + 5 * s, hip[0] - 18 * s, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // White polka dots
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [dx, dy] of [[-6, 0.55], [5, 0.7], [-1, 0.85], [9, 0.95], [-10, 0.95]]) {
    ctx.beginPath();
    ctx.arc(hip[0] + dx * s, top + (bottom - top) * dy, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Her hair (behind and around the head), eyes with lashes, pink cheeks and a smile, and the bow. */
export function drawJayHead(ctx: Ctx, f: Fighter, hx: number, hy: number, s: number, time: number) {
  const d = f.facing || 1;
  const hair = '#3e2723';
  // Her face (her stickman colour is pink, her face isn't).
  ctx.fillStyle = f.hurtFlash > 0 ? '#ffffff' : '#ffe0bd';
  ctx.beginPath();
  ctx.arc(hx, hy, 10 * s, 0, Math.PI * 2);
  ctx.fill();
  // Long hair framing the face, and a ponytail that swings.
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(hx, hy - 1 * s, 12.5 * s, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  const swing = Math.sin(time * 5 + f.walkPhase) * 3 * s;
  ctx.beginPath();
  ctx.moveTo(hx - d * 9 * s, hy - 8 * s);
  ctx.quadraticCurveTo(hx - d * 24 * s, hy - 4 * s + swing, hx - d * 20 * s + swing, hy + 16 * s);
  ctx.quadraticCurveTo(hx - d * 14 * s, hy + 4 * s, hx - d * 6 * s, hy - 4 * s);
  ctx.closePath();
  ctx.fill();
  // Bangs
  ctx.beginPath();
  ctx.moveTo(hx - 11 * s, hy - 3 * s);
  ctx.quadraticCurveTo(hx + d * 2 * s, hy - 9 * s, hx + d * 11 * s, hy - 2 * s);
  ctx.lineTo(hx + d * 11 * s, hy - 8 * s);
  ctx.quadraticCurveTo(hx, hy - 15 * s, hx - 11 * s, hy - 8 * s);
  ctx.closePath();
  ctx.fill();
  // Bow on the ponytail
  bow(ctx, hx - d * 10 * s, hy - 9 * s, 4 * s, '#f50057');
  // Eyes with lashes
  const blink = (time + f.id * 0.7) % 3.5 < 0.12;
  for (const e of [0, 1]) {
    const ex = hx + d * (2 + e * 6) * s;
    const ey = hy - 1 * s;
    if (blink) {
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(ex - 2 * s, ey);
      ctx.lineTo(ex + 2 * s, ey);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 2.4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4e342e';
    ctx.beginPath();
    ctx.arc(ex + d * 0.6 * s, ey + 0.3 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(ex - 1.5 * s, ey - 2.8 * s);
    ctx.lineTo(ex - 2.3 * s, ey - 4.3 * s);
    ctx.moveTo(ex + 1.5 * s, ey - 2.8 * s);
    ctx.lineTo(ex + 2.3 * s, ey - 4.3 * s);
    ctx.stroke();
  }
  // Cheeks and a smile
  ctx.fillStyle = 'rgba(244,143,177,0.8)';
  ctx.beginPath();
  ctx.arc(hx + d * 9 * s, hy + 4 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ad1457';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.arc(hx + d * 5 * s, hy + 4 * s, 2.6 * s, 0.2, Math.PI - 0.2);
  ctx.stroke();
}
