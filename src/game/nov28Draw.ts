import type { Cat, Projectile } from './entities';
import type { Corpse } from './finish';
import type { Game } from './game';
import { wallsOf } from './nov28';
import { hpBar } from './render';

type Ctx = CanvasRenderingContext2D;

/*
 * The November 28 update's pictures, drawn like Potter's LEGO builds:
 * the LEGO pilots (a round stud piece for a head on a flower plate for a body), the Mini, Red and Green Aircraft,
 * the harmless distraction shots, the Brick Sword and its brick walls.
 */

const OUT = 'rgba(0,0,0,0.8)';

/** Mix a #rrggbb colour toward white (k > 0) or black (k < 0). */
function tint(c: string, k: number) {
  const n = parseInt(c.slice(1, 7), 16);
  const to = k > 0 ? 255 : 0;
  const a = Math.abs(k);
  const ch = (v: number) => Math.round(v + (to - v) * a);
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function poly(ctx: Ctx, pts: [number, number][], fill: string | CanvasGradient, stroke = OUT, w = 1.2) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = w;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** A round LEGO piece seen from the side: a cylinder from y0 down to y0 + h, lit from the left. */
function cyl(ctx: Ctx, x: number, y0: number, w: number, h: number, color: string, alpha = 1) {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, tint(color, 0.35));
  g.addColorStop(0.35, color);
  g.addColorStop(1, tint(color, -0.35));
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = g;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y0, w, h, Math.min(1.2, h / 3));
  ctx.fill();
  ctx.stroke();
  // The round top
  ctx.fillStyle = tint(color, 0.25);
  ctx.beginPath();
  ctx.ellipse(x, y0, w / 2, Math.min(1.4, w / 6), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha /= alpha;
}

/** A rectangular LEGO brick with studs on top (x, y = top left). */
function brick(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, studs = 0, studW = 3.2) {
  ctx.fillStyle = color;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, Math.min(1.6, h / 4));
  for (let k = 0; k < studs; k++) {
    const sx = x + ((k + 0.5) / studs) * w;
    ctx.fillStyle = tint(color, 0.15);
    ctx.strokeStyle = OUT;
    ctx.beginPath();
    ctx.rect(sx - studW / 2, y - studW * 0.55, studW, studW * 0.55);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * A LEGO pilot: a round head piece (a 1x1 round plate with its stud: a short collar, a wide rim, a tall stud on top)
 * on a flower plate for a body. (x, y) = the bottom of the body. About 17 units tall at s = 1.
 */
export function legoPilot(ctx: Ctx, x: number, y: number, s: number, head: string, body: string, clear: boolean, flash: boolean) {
  const H = flash ? '#ffffff' : head;
  const B = flash ? '#ffffff' : body;
  // Body: the flower plate (petals all around), see-through when it is the red one from Aircraft 07.
  const a = clear ? 0.78 : 1;
  ctx.save();
  ctx.globalAlpha *= a;
  for (const px of [-4.6, 4.6, 0]) cyl(ctx, x + px * s, y - 5.5 * s, 5.6 * s, 5.5 * s, B);
  ctx.restore();
  if (clear) {
    // A shine through the see-through plastic
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(x - 5.5 * s, y - 4.6 * s);
    ctx.lineTo(x - 5.5 * s, y - 1.4 * s);
    ctx.stroke();
  }
  // Head: collar, wide rim, then the tall stud on top.
  cyl(ctx, x, y - 8.5 * s, 8.6 * s, 3.2 * s, H);
  cyl(ctx, x, y - 11 * s, 12.6 * s, 2.6 * s, H);
  cyl(ctx, x, y - 17 * s, 8.6 * s, 6 * s, H);
}

/** A pilot on foot (out of a wreck, or from Sandbox): the LEGO pieces on two little legs, maybe with a pistol. */
export function legoPilotOnFoot(ctx: Ctx, c: Cat, head: string, body: string, clear: boolean, gun: 'gold' | 'decoy' | null) {
  const d = c.facing || 1;
  const s = 1.45;
  const bob = c.onGround ? 0 : -2;
  const sw = c.onGround && Math.abs(c.vx) > 20 ? Math.sin(c.walkPhase) * 4 : 0;
  const by = c.y - 12 + bob;
  ctx.strokeStyle = '#37474f';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.4;
  for (const [lx, k] of [[-3, 1], [3, -1]]) {
    ctx.beginPath();
    ctx.moveTo(c.x + lx, by);
    ctx.lineTo(c.x + lx + sw * k, c.y);
    ctx.stroke();
  }
  legoPilot(ctx, c.x, by, s, head, body, clear, c.hurtFlash > 0);
  const hy = by - 3.5 * s;
  if (gun) {
    ctx.fillStyle = gun === 'decoy' ? '#212121' : '#455a64';
    ctx.fillRect(c.x + d * 9 - (d < 0 ? 9 : 0), hy - 2, 9, 3.5);
    if (c.attackT > 0.15) {
      ctx.fillStyle = gun === 'decoy' ? '#c5e1a5' : '#ffeb3b';
      ctx.beginPath();
      ctx.arc(c.x + d * 21, hy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // A little fist out front (the Red pilot hits up close).
    ctx.fillStyle = body;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c.x + d * (11 + (c.attackT > 0.4 ? 5 : 0)), hy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  hpBar(ctx, c.x, c.y - 52, 24, c.hp / c.maxHp, body);
}

// ---------- the aircraft ----------

/** One of the new aircraft in profile, nose toward `d`, centred on (0, 0). Shared by the flying one and its wreck. */
export function airBody(ctx: Ctx, kind: string, d: number, time: number, wreck: boolean, flash: boolean, firing = false) {
  const P = (c: string) => (flash ? '#ffffff' : wreck ? tint(c, -0.55) : c);
  ctx.save();
  ctx.scale(d, 1);
  const flame = (x: number, y: number, len: number) => {
    if (wreck) return;
    const fl = len + Math.sin(time * 40) * 3 + Math.random() * 3;
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath();
    ctx.moveTo(x, y - 3.5);
    ctx.lineTo(x - fl, y);
    ctx.lineTo(x, y + 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.moveTo(x, y - 1.8);
    ctx.lineTo(x - fl * 0.55, y);
    ctx.lineTo(x, y + 1.8);
    ctx.closePath();
    ctx.fill();
  };
  if (kind === 'miniair') {
    // Green plates with studs, a brown tile block at the front, the red-flower pilot, and a black gun on its back.
    flame(-24, 4, 8);
    brick(ctx, -22, 2, 44, 5, P('#2e9e44'), 6);
    brick(ctx, -20, -3, 22, 5, P('#3cb054'), 3);
    brick(ctx, 8, -9, 7, 16, P('#b8652e'));
    brick(ctx, 15, -9, 7, 16, P('#8d5a3b'));
    if (!wreck) legoPilot(ctx, -6, -3, 0.72, '#ffd600', '#e53935', false, flash);
    // The gun on the back: a round black base and a stick with a ball on the end.
    ctx.fillStyle = P('#263238');
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-24, 3.5, 4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = P('#212121');
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-24, 2);
    ctx.lineTo(-29, -12);
    ctx.stroke();
    ctx.fillStyle = P('#212121');
    ctx.beginPath();
    ctx.arc(-29, -13, 2.4, 0, Math.PI * 2);
    ctx.fill();
    if (firing) {
      ctx.fillStyle = '#c5e1a5';
      ctx.beginPath();
      ctx.arc(-30, -15, 4 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'redair') {
    // Red bricks with tan stripes, an orange see-through windshield, a dark tail fin and red spikes in front.
    flame(-40, 2, 12);
    poly(ctx, [[-40, -6], [-31, -6], [-36, -21], [-45, -21]], P('#5d4037'));
    // Front spikes
    for (const [sy, len] of [[-4, 14], [2, 18], [8, 12]] as [number, number][]) {
      const gr = ctx.createLinearGradient(30, 0, 30 + len, 0);
      gr.addColorStop(0, P('#c62828'));
      gr.addColorStop(1, P('#ff8a80'));
      poly(ctx, [[30, sy - 3], [30 + len, sy], [30, sy + 3]], gr);
    }
    brick(ctx, -40, -6, 24, 8, P('#c62828'), 3);
    brick(ctx, -16, -6, 22, 8, P('#d32f2f'), 3);
    brick(ctx, 6, -6, 24, 8, P('#c62828'), 3);
    brick(ctx, -38, 2, 68, 6, P('#b71c1c'));
    brick(ctx, -36, 8, 56, 3.5, P('#d8893f'));
    brick(ctx, 20, 8, 10, 3.5, P('#e0a060'));
    // Windshield: a see-through orange tile
    ctx.fillStyle = wreck ? 'rgba(80,50,20,0.6)' : 'rgba(255,152,0,0.55)';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(10, -15, 16, 9, 1.5);
    ctx.fill();
    ctx.stroke();
    if (!wreck) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(13, -13);
      ctx.lineTo(19, -13);
      ctx.stroke();
      legoPilot(ctx, -8, -6, 0.75, '#cfd8dc', '#6d4c41', false, flash);
    }
  } else {
    // The Green Aircraft: a curved green body, a swept wing, a gold tile, black hinges and its pilot up front.
    flame(-46, 0, 9);
    ctx.fillStyle = P('#2e9e44');
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-46, -2);
    ctx.lineTo(-30, -11);
    ctx.lineTo(22, -11);
    ctx.quadraticCurveTo(46, -11, 46, 6);
    ctx.lineTo(39, 8);
    ctx.quadraticCurveTo(37, 3, 28, 4);
    ctx.lineTo(-30, 6);
    ctx.lineTo(-46, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // The printed pattern on the tail and the nose
    ctx.strokeStyle = P('#c9a227');
    ctx.lineWidth = 1.1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-42 + k * 5, -1);
      ctx.lineTo(-36 + k * 5, -6);
      ctx.stroke();
    }
    ctx.strokeRect(30, -6, 6, 4);
    // Black hinge under the middle
    ctx.fillStyle = P('#212121');
    ctx.fillRect(-10, 1, 20, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-8, 2, 4, 2);
    ctx.fillRect(4, 2, 4, 2);
    // Gold tile and the top plate
    brick(ctx, -28, -15, 22, 4, P('#3cb054'), 3);
    brick(ctx, -4, -15, 12, 4, P('#f9a825'));
    if (!wreck) legoPilot(ctx, 15, -11, 0.75, '#ffd600', '#6d4c41', false, flash);
    // The swept wing in front
    poly(ctx, [[-12, 3], [6, 3], [-6, 23], [-21, 23]], P('#43a047'));
  }
  ctx.restore();
}

function drawAir(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const tilt = Math.max(-0.35, Math.min(0.35, (c.vy / (c.variant === 'greenair' ? 260 : 600)) * 0.35)) * d;
  ctx.save();
  ctx.translate(c.x, c.cy + Math.sin(time * 5 + c.id) * 1.5);
  ctx.rotate(tilt);
  ctx.scale(1.25, 1.25);
  airBody(ctx, c.variant, d, time, false, c.hurtFlash > 0, c.attackT > 0.05);
  ctx.restore();
  hpBar(ctx, c.x, c.y - c.h - 24, c.variant === 'miniair' ? 30 : 50, c.hp / c.maxHp, c.owner.color);
}

export function drawNov28Helper(ctx: Ctx, c: Cat, time: number): boolean {
  switch (c.variant) {
    case 'miniair':
    case 'redair':
    case 'greenair':
      if (c.alive) drawAir(ctx, c, time);
      return true;
    case 'pilotmini':
      if (c.alive) legoPilotOnFoot(ctx, c, '#ffd600', '#e53935', false, 'decoy');
      return true;
    case 'pilotred':
      if (c.alive) legoPilotOnFoot(ctx, c, '#cfd8dc', '#6d4c41', false, null);
      return true;
    case 'pilotgreen':
      if (c.alive) legoPilotOnFoot(ctx, c, '#ffd600', '#6d4c41', false, 'gold');
      return true;
  }
  return false;
}

/** A LEGO pilot that went down: its head piece pops off and both pieces bounce away. */
export function drawLegoProp(ctx: Ctx, c: Corpse) {
  const d = c.facing ?? 1;
  const t = c.t;
  const hop = (v: number, k: number) => Math.max(0, v * t - 900 * t * t * k);
  ctx.save();
  ctx.translate(c.x - d * 40 * t, c.y - hop(380, 1));
  ctx.rotate(-d * t * 6);
  cyl(ctx, 0, -8, 8.6 * 1.4, 4, c.head ?? '#ffd600');
  cyl(ctx, 0, -12, 12.6 * 1.4, 3.6, c.head ?? '#ffd600');
  cyl(ctx, 0, -20, 8.6 * 1.4, 8, c.head ?? '#ffd600');
  ctx.restore();
  ctx.save();
  ctx.translate(c.x + d * 30 * t, c.y - hop(260, 1.2));
  ctx.rotate(d * t * 4);
  for (const px of [-6.5, 6.5, 0]) cyl(ctx, px, -8, 8, 8, c.color);
  ctx.restore();
}

// ---------- shots ----------

/** The harmless distraction shot: a little glowing green pellet. */
export function drawNov28Projectile(ctx: Ctx, p: Projectile): boolean {
  if (p.kind !== 'decoy') return false;
  const a = Math.atan2(p.vy, p.vx);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(-20, 0, 2, 0);
  g.addColorStop(0, 'rgba(197,225,165,0)');
  g.addColorStop(1, 'rgba(220,237,200,0.9)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#aed581';
  ctx.strokeStyle = '#33691e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(1, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  return true;
}

// ---------- the Brick Sword ----------

/** A LEGO sword: a black brick handle, a yellow plate for the guard, and a blade of light grey bricks with studs (hand at 0, 0, along +x). */
export function drawBrickSword(ctx: Ctx, len: number, s: number, ready: boolean) {
  const L = len / s;
  ctx.save();
  ctx.scale(s, s);
  // Handle and pommel
  brick(ctx, -10, -3.5, 4, 7, '#c62828');
  brick(ctx, -6, -3, 14, 6, '#263238');
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.8;
  for (const hx of [-2, 2, 6]) {
    ctx.beginPath();
    ctx.moveTo(hx, -3);
    ctx.lineTo(hx, 3);
    ctx.stroke();
  }
  // Guard: a yellow plate across, with studs
  brick(ctx, 8, -11, 5, 22, '#fdd835');
  ctx.fillStyle = '#fbc02d';
  for (const gy of [-7, 0, 7]) ctx.fillRect(13, gy - 1.5, 1.6, 3);
  // Blade: light grey bricks with studs along the top, then a slope at the tip
  if (ready) {
    ctx.shadowColor = '#ffcc80';
    ctx.shadowBlur = 8;
  }
  const end = L - 10;
  const n = Math.max(2, Math.round((end - 13) / 11));
  const bw = (end - 13) / n;
  for (let k = 0; k < n; k++) brick(ctx, 13 + k * bw, -4.5, bw, 9, k % 2 ? '#b0bec5' : '#cfd8dc', 1, 3.4);
  ctx.shadowBlur = 0;
  poly(ctx, [[end, -4.5], [L, 0], [end, 4.5]], '#cfd8dc');
  ctx.restore();
}

const WALL_COLORS = ['#e53935', '#1e88e5', '#fdd835', '#43a047'];

/** Brick Sword walls: rows of LEGO bricks with studs on top. They pop up fast and blink before they fall apart. */
export function drawBrickWalls(ctx: Ctx, g: Game) {
  for (const w of wallsOf(g)) {
    const age = 5 - w.life;
    const up = Math.min(1, age / 0.18);
    if (w.life < 0.8 && Math.floor(w.life * 10) % 2 === 0) continue;
    const rowH = 14;
    const rows = Math.ceil(w.h / rowH);
    const shown = Math.ceil(rows * up);
    ctx.save();
    for (let r = 0; r < shown; r++) {
      const y = w.y + w.h - (r + 1) * rowH;
      const off = r % 2 ? w.w / 2 : 0;
      // Two bricks a row, staggered like a real wall.
      const cuts = [0, off || w.w / 2, w.w].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
      for (let k = 0; k < cuts.length - 1; k++) {
        const x0 = w.x + cuts[k];
        const bw = cuts[k + 1] - cuts[k];
        if (bw < 2) continue;
        const top = r === shown - 1;
        brick(ctx, x0, y, bw, rowH, WALL_COLORS[(r * 3 + k + (w.team & 3)) % 4], top ? Math.max(1, Math.round(bw / 9)) : 0, 6);
      }
    }
    ctx.restore();
  }
}
