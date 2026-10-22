import type { Cat, Projectile } from './entities';
import type { Platform } from './types';

type Ctx = CanvasRenderingContext2D;

/*
 * The October 22 update's pictures: the Booger, Tennis Racket, Giant Lollipop, Scythe and Pillow (local space: hand at (0, 0),
 * pointing along +x) and their shots, the Knight, the Frog and the Ghost, walls, the Castle Gate's castle,
 * and the new walk for stickmen.
 */

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
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

// ---------- the walk ----------

/**
 * Where the knees and feet go for a stickman walking like a person: each foot pushes back along the ground,
 * then lifts and swings forward, the knees bend forward, and the hips bob a little.
 * `phase` grows with distance walked, `speed` is 0-1 (how fast it's going), `d` is the way it faces.
 */
export function walkLegs(x: number, y: number, s: number, walked: number, speed: number, d: number) {
  const k = Math.min(1, speed);
  // A little quicker steps than the old walk, so the feet keep up with the ground.
  const phase = walked * 1.3;
  const stride = 18 * s * k;
  const lift = 11 * s * k;
  // Hips are highest when a leg is straight under the body.
  const bob = -Math.abs(Math.cos(phase)) * 2.5 * s * k;
  const hip = { x: x + d * 1.5 * s * k, y: y - 34 * s + bob };
  // Standing still: feet a little apart and the legs straight (no bent knees).
  const spread = 7 * s * (1 - k);
  const legs = [0, Math.PI].map((off, i) => {
    const p = phase + off;
    const fx = x + d * stride * Math.cos(p) + (i ? -spread : spread);
    const fy = y - Math.max(0, -Math.sin(p)) * lift;
    const bent = knee(hip, { x: fx, y: fy }, 19 * s, 19 * s, d);
    const mx = (hip.x + fx) / 2;
    const my = (hip.y + fy) / 2;
    return { foot: { x: fx, y: fy }, knee: { x: mx + (bent.x - mx) * k, y: my + (bent.y - my) * k } };
  });
  return { hip, legs };
}

/** Two-bone leg: the knee sits where both bones meet, bent toward the way the stickman faces. */
function knee(h: { x: number; y: number }, f: { x: number; y: number }, a: number, b: number, d: number) {
  const dx = f.x - h.x;
  const dy = f.y - h.y;
  const dist = Math.min(a + b - 0.01, Math.hypot(dx, dy) || 0.01);
  const along = (a * a - b * b + dist * dist) / (2 * dist);
  const up = Math.sqrt(Math.max(0, a * a - along * along));
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Of the two sides, the knee goes on the one the stickman faces.
  let nx = -uy;
  let ny = ux;
  if (nx * d < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: h.x + ux * along + nx * up, y: h.y + uy * along + ny * up };
}

/** The free arm swings opposite the legs while walking. */
export function swingArm(sh: { x: number; y: number }, s: number, walked: number, speed: number, d: number) {
  // Forward when the leg on the same side goes back.
  const a = Math.PI / 2 - d * Math.cos(walked * 1.3) * 0.7 * Math.min(1, speed);
  return { x: sh.x + Math.cos(a) * 24 * s, y: sh.y + Math.sin(a) * 24 * s };
}

// ---------- weapons ----------

export function drawToyWeapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean, time: number): boolean {
  switch (id) {
    case 'booger': {
      // A green, wobbly booger on a fingertip (gone for a moment right after you throw it)
      if (!ready) return true;
      const wob = 1 + Math.sin(time * 9) * 0.08;
      ctx.fillStyle = '#8bc34a';
      ctx.strokeStyle = '#558b2f';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.ellipse(len * 0.7, 0, 8 * s * wob, 6 * s / wob, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(len * 0.7 + 2 * s, -2 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      // A drip
      ctx.fillStyle = '#9ccc65';
      ctx.beginPath();
      ctx.ellipse(len * 0.7 - 2 * s, 6 * s + Math.sin(time * 4) * 1.5 * s, 2 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }
    case 'racket': {
      // Handle, then an oval head with strings
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 4 * s;
      line(ctx, -6 * s, 0, len - 26 * s, 0);
      const cx = len - 13 * s;
      ctx.strokeStyle = ready ? '#1e88e5' : '#78909c';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.ellipse(cx, 0, 13 * s, 10 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.8 * s;
      for (let k = -2; k <= 2; k++) {
        line(ctx, cx + k * 4.5 * s, -9 * s, cx + k * 4.5 * s, 9 * s);
        line(ctx, cx - 12 * s, k * 3.6 * s, cx + 12 * s, k * 3.6 * s);
      }
      if (ready) {
        ctx.fillStyle = '#d4e157';
        ctx.beginPath();
        ctx.arc(cx, -15 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }
    case 'lollipop': {
      // A stick with a big swirly candy
      ctx.strokeStyle = '#fafafa';
      ctx.lineWidth = 3.5 * s;
      line(ctx, -6 * s, 0, len - 16 * s, 0);
      const cx = len - 4 * s;
      const r = 15 * s;
      ctx.fillStyle = ready ? '#f06292' : '#b0838f';
      ctx.beginPath();
      ctx.arc(cx, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 6; a += 0.3) {
        const rad = (a / (Math.PI * 6)) * r * 0.9;
        const px = cx + Math.cos(a + time * 2) * rad;
        const py = Math.sin(a + time * 2) * rad;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      return true;
    }
    case 'scythe': {
      // A long wooden handle and a curved blade at the end
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 4 * s;
      line(ctx, -10 * s, 0, len, 0);
      ctx.fillStyle = ready ? '#b0bec5' : '#78909c';
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(len, -2 * s);
      ctx.quadraticCurveTo(len - 10 * s, -30 * s, len - 42 * s, -26 * s);
      ctx.quadraticCurveTo(len - 16 * s, -18 * s, len - 4 * s, 3 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (ready) {
        ctx.strokeStyle = 'rgba(179,157,219,0.7)';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(len - 6 * s, -6 * s);
        ctx.quadraticCurveTo(len - 14 * s, -24 * s, len - 36 * s, -24 * s);
        ctx.stroke();
      }
      return true;
    }
    case 'pillow': {
      // A fluffy white pillow
      const cx = len - 18 * s;
      ctx.fillStyle = ready ? '#ffffff' : '#e0e0e0';
      ctx.strokeStyle = '#90a4ae';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 20 * s, -11 * s);
      ctx.quadraticCurveTo(cx, -16 * s, cx + 20 * s, -11 * s);
      ctx.quadraticCurveTo(cx + 25 * s, 0, cx + 20 * s, 11 * s);
      ctx.quadraticCurveTo(cx, 16 * s, cx - 20 * s, 11 * s);
      ctx.quadraticCurveTo(cx - 25 * s, 0, cx - 20 * s, -11 * s);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#f8bbd0';
      ctx.lineWidth = 1 * s;
      line(ctx, cx - 10 * s, -4 * s, cx + 10 * s, -4 * s);
      line(ctx, cx - 10 * s, 4 * s, cx + 10 * s, 4 * s);
      return true;
    }
  }
  return false;
}

export function drawToyProjectile(ctx: Ctx, p: Projectile, time: number): boolean {
  if (p.kind === 'booger') {
    const a = Math.atan2(p.vy, p.vx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a);
    ctx.fillStyle = '#8bc34a';
    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r * 1.3, p.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // A slimy trail
    ctx.fillStyle = 'rgba(156,204,101,0.5)';
    ctx.beginPath();
    ctx.ellipse(-p.r * 1.6, 0, p.r * 0.8, p.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return true;
  }
  if (p.kind === 'tennis') {
    ctx.fillStyle = '#d4e157';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.9, p.y, p.r * 0.8, -0.9 + time * 10, 0.9 + time * 10);
    ctx.stroke();
    return true;
  }
  return false;
}

// ---------- helpers ----------

/** The Knight, the Frog and the Ghost. Returns false for anything else. */
export function drawToy(ctx: Ctx, c: Cat, time: number): boolean {
  switch (c.variant) {
    case 'knight':
      if (c.alive) drawKnight(ctx, c);
      return true;
    case 'frog':
      if (c.alive) drawFrog(ctx, c, time);
      return true;
    case 'ghost':
      if (c.alive) drawGhost(ctx, c, time);
      return true;
  }
  return false;
}

/** A big stickman in shiny armour with a helmet, a sword and a shield in its owner's colour. */
function drawKnight(ctx: Ctx, c: Cat) {
  const { x, y } = c;
  const d = c.facing || 1;
  const s = c.h / 80;
  const moving = c.onGround && Math.abs(c.vx) > 20;
  const { hip, legs } = walkLegs(x, y, s, c.walkPhase * 1.1 * d, moving ? Math.abs(c.vx) / 260 : 0, d);
  const metal = c.hurtFlash > 0 ? '#ffffff' : '#b0bec5';
  const o = 'rgba(0,0,0,0.8)';
  const neck = { x, y: y - 62 * s };
  const sh = { x, y: y - 58 * s };
  const swing = c.attackT > 0.6;
  const hand = swing ? { x: x + d * 24 * s, y: y - 64 * s } : { x: x + d * 14 * s, y: y - 44 * s };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const body = (w: number, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w * s;
    ctx.beginPath();
    for (const l of legs) {
      ctx.moveTo(l.foot.x, l.foot.y);
      ctx.lineTo(l.knee.x, l.knee.y);
      ctx.lineTo(hip.x, hip.y);
    }
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(neck.x, neck.y);
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(x - d * 10 * s, y - 40 * s);
    ctx.stroke();
  };
  body(10, o);
  body(7, metal);
  // Breastplate
  ctx.fillStyle = metal;
  ctx.strokeStyle = o;
  ctx.lineWidth = 2;
  rr(ctx, x - 9 * s, y - 60 * s, 18 * s, 24 * s, 5 * s);
  ctx.fill();
  ctx.stroke();
  // Sword
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(swing ? d * -0.3 + (d < 0 ? Math.PI : 0) : (d > 0 ? -1.1 : Math.PI + 1.1));
  ctx.fillStyle = '#eceff1';
  ctx.strokeStyle = '#546e7a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(4 * s, -2.5 * s);
  ctx.lineTo(40 * s, -2 * s);
  ctx.lineTo(46 * s, 0);
  ctx.lineTo(40 * s, 2 * s);
  ctx.lineTo(4 * s, 2.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffca28';
  ctx.fillRect(1 * s, -6 * s, 3 * s, 12 * s);
  ctx.restore();
  // Shield on the back arm, in the owner's colour
  const shx = x - d * 4 * s;
  const shy = y - 46 * s;
  ctx.fillStyle = c.owner.color;
  ctx.strokeStyle = '#eceff1';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(shx - 10 * s, shy - 12 * s);
  ctx.lineTo(shx + 10 * s, shy - 12 * s);
  ctx.lineTo(shx + 10 * s, shy + 2 * s);
  ctx.quadraticCurveTo(shx, shy + 16 * s, shx - 10 * s, shy + 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Helmet with a visor slit and a plume
  const hx = x;
  const hy = y - 74 * s;
  ctx.fillStyle = metal;
  ctx.strokeStyle = o;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(hx, hy, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#263238';
  ctx.fillRect(hx - 2 * s + d * 2 * s, hy - 2 * s, d * 10 * s, 3 * s);
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.ellipse(hx - d * 4 * s, hy - 14 * s, 4 * s, 9 * s, -d * 0.6, 0, Math.PI * 2);
  ctx.fill();
  bar(ctx, x, y - c.h - 14, 38, c.hp / c.maxHp, c.owner.color);
}

/** A round green frog with big eyes. Its tongue shoots out when it hits. */
function drawFrog(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const air = !c.onGround;
  const col = c.hurtFlash > 0 ? '#ffffff' : '#66bb6a';
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(d, 1);
  // Back legs: tucked, or stretched out mid-hop
  ctx.fillStyle = '#43a047';
  ctx.beginPath();
  if (air) ctx.ellipse(-16, -4, 14, 5, -0.5, 0, Math.PI * 2);
  else ctx.ellipse(-10, -6, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, -13, 17, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c5e1a5';
  ctx.beginPath();
  ctx.ellipse(4, -9, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Front feet
  ctx.fillStyle = '#43a047';
  ctx.fillRect(6, -4, 7, 4);
  // Eyes
  for (const ex of [2, 12]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ex, -24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, -25, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(ex + 1, -25, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tongue
  if (c.attackT > 1) {
    const k = Math.min(1, (c.attackT - 1) * 4);
    ctx.strokeStyle = '#ec407a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    line(ctx, 14, -12, 14 + 70 * k, -14);
    ctx.fillStyle = '#ec407a';
    ctx.beginPath();
    ctx.arc(14 + 70 * k, -14, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Smile
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(10, -14, 5, 0.2, Math.PI - 0.6);
    ctx.stroke();
  }
  ctx.restore();
  void time;
  bar(ctx, c.x, c.y - c.h - 18, 30, c.hp / c.maxHp, c.owner.color);
}

/** A see-through floating ghost with a wavy tail and a bow in its owner's colour. */
function drawGhost(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const x = c.x;
  const top = c.y - c.h;
  ctx.save();
  ctx.globalAlpha = c.hurtFlash > 0 ? 0.95 : 0.78;
  ctx.fillStyle = c.hurtFlash > 0 ? '#ffffff' : '#eceff1';
  ctx.beginPath();
  ctx.arc(x, top + 16, 16, Math.PI, 0);
  ctx.lineTo(x + 16, c.y - 6);
  for (let k = 0; k <= 4; k++) {
    const wx = x + 16 - (k * 32) / 4;
    ctx.lineTo(wx, c.y - 6 + (k % 2 ? 6 : 0) + Math.sin(time * 8 + k) * 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Eyes and an "O" mouth (it says BOO)
  ctx.fillStyle = '#263238';
  for (const ex of [-5, 5]) {
    ctx.beginPath();
    ctx.ellipse(x + d * 2 + ex, top + 15, 2.6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(x + d * 3, top + 26, 3, c.attackT > 0.6 ? 5 : 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bow
  ctx.fillStyle = c.owner.color;
  ctx.beginPath();
  ctx.moveTo(x - d * 8, top + 2);
  ctx.lineTo(x - d * 15, top - 4);
  ctx.lineTo(x - d * 15, top + 8);
  ctx.closePath();
  ctx.moveTo(x - d * 8, top + 2);
  ctx.lineTo(x - d * 1, top - 4);
  ctx.lineTo(x - d * 1, top + 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  bar(ctx, x, top - 12, 30, c.hp / c.maxHp, c.owner.color);
}

// ---------- walls and the castle ----------

/** A wall: grey stone bricks with a lighter top you can stand on. */
export function drawWall(ctx: Ctx, p: Platform) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x, p.y, p.w, p.h);
  ctx.clip();
  ctx.fillStyle = '#78909c';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  const bh = 22;
  const bw = 40;
  ctx.strokeStyle = 'rgba(38,50,56,0.55)';
  ctx.lineWidth = 2;
  for (let row = 0, y = p.y; y < p.y + p.h; y += bh, row++) {
    line(ctx, p.x, y, p.x + p.w, y);
    for (let x = p.x + (row % 2 ? bw / 2 : 0); x < p.x + p.w; x += bw) line(ctx, x, y, x, y + bh);
  }
  ctx.restore();
  ctx.fillStyle = '#b0bec5';
  ctx.fillRect(p.x, p.y, p.w, 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x, p.y, p.w, p.h);
}

/** The Castle Gate: towers, battlements, a closed gate and flags on top of the castle wall. */
export function drawCastle(ctx: Ctx, p: Platform, time: number) {
  const { x, y, w, h } = p;
  const stone = '#8d99ae';
  const dark = '#4a5568';
  // Two towers sticking up from the castle
  for (const tx of [x + 10, x + w - 90]) {
    ctx.fillStyle = stone;
    ctx.fillRect(tx, y - 120, 80, 120);
    ctx.fillStyle = dark;
    for (let k = 0; k < 4; k++) ctx.fillRect(tx + k * 22, y - 138, 14, 18);
    ctx.fillStyle = stone;
    for (let k = 0; k < 4; k++) ctx.fillRect(tx + k * 22 + 1, y - 136, 12, 16);
    // Window with a warm light
    ctx.fillStyle = '#ffd54f';
    rr(ctx, tx + 32, y - 90, 16, 26, 8);
    ctx.fill();
    // Flag
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 3;
    line(ctx, tx + 40, y - 138, tx + 40, y - 190);
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(tx + 40, y - 190);
    const wave = Math.sin(time * 4 + tx) * 4;
    ctx.quadraticCurveTo(tx + 58, y - 186 + wave, tx + 74, y - 180);
    ctx.quadraticCurveTo(tx + 58, y - 174 + wave, tx + 40, y - 168);
    ctx.fill();
  }
  // Battlements along the top of the wall
  ctx.fillStyle = stone;
  for (let bx = x + 100; bx < x + w - 100; bx += 34) ctx.fillRect(bx, y - 18, 20, 18);
  // The big closed gate
  const gx = x + w / 2 - 55;
  const gy = y + h - 170;
  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.moveTo(gx, y + h);
  ctx.lineTo(gx, gy + 55);
  ctx.arc(gx + 55, gy + 55, 55, Math.PI, 0);
  ctx.lineTo(gx + 110, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 4;
  for (let k = 1; k < 5; k++) line(ctx, gx + k * 22, gy + 8 + (k === 1 || k === 4 ? 18 : 0), gx + k * 22, y + h);
  ctx.strokeStyle = '#263238';
  ctx.lineWidth = 6;
  line(ctx, gx, gy + 90, gx + 110, gy + 90);
  line(ctx, gx, gy + 135, gx + 110, gy + 135);
}

/** Zombies climbing out of the ground are hidden below it. */
export function clipAboveGround(ctx: Ctx, groundY: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-5000, -5000, 20000, groundY + 5000);
  ctx.clip();
}
