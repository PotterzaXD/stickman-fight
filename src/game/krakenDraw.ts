import type { Game } from './game';
import { KRAKEN } from './kraken';

type Ctx = CanvasRenderingContext2D;

/*
 * The Kraken's pictures. Its head comes up out of the sea behind the middle of the ship (drawn before the deck,
 * so the deck hides its bottom); its tentacles come over the side in front of everything.
 */

const SKIN = '#8e24aa';
const DARK = '#4a148c';
const BELLY = '#ce93d8';

/** How far it is still under the water (0 = all the way up). */
const sunk = (g: Game) => (1 - (g.kr?.rise ?? 0)) * 520;

/** A tapered tentacle from (x0, y0) to (x1, y1), bending a little, with suckers. */
function tentacle(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, time: number, seed: number, flash: boolean) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bend = Math.sin(time * 2.2 + seed) * Math.min(80, len * 0.25);
  const n = Math.max(8, Math.floor(len / 14));
  const pts: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const b = Math.sin(u * Math.PI) * bend + Math.sin(u * 9 + time * 4 + seed) * 6 * u;
    pts.push({ x: x0 + dx * u + nx * b, y: y0 + dy * u + ny * b, r: w * (1 - u * 0.8) });
  }
  ctx.fillStyle = DARK;
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = flash ? '#e1bee7' : SKIN;
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Suckers along one side
  ctx.fillStyle = BELLY;
  for (let i = 2; i < pts.length - 1; i += 2) {
    const p = pts[i];
    ctx.beginPath();
    ctx.arc(p.x + nx * p.r * 0.45, p.y + ny * p.r * 0.45, p.r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  // A curled tip
  const end = pts[pts.length - 1];
  ctx.strokeStyle = flash ? '#e1bee7' : SKIN;
  ctx.lineWidth = Math.max(3, end.r * 1.2);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(end.x + nx * 8, end.y + ny * 8, 8, time * 3 + seed, time * 3 + seed + Math.PI * 1.3);
  ctx.stroke();
}

/** The head and eyes, coming up behind the ship (before the platforms are drawn). */
export function drawKrakenBack(ctx: Ctx, g: Game, time: number) {
  const k = g.kr;
  if (!k || (k.stage === 'wait' && !k.rise) || k.stage === 'drag') return;
  const f = k.boss;
  const cx = k.cx;
  const bob = Math.sin(time * 1.4) * 8;
  const top = k.deckY - 330 + sunk(g) + bob;
  const flash = f.hurtFlash > 0;
  // Nothing shows under the water.
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 600, -4000, 1200, g.map.h - 60 + 4000);
  ctx.clip();
  // Ripples where it comes out of the water
  ctx.strokeStyle = 'rgba(225,245,254,0.6)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    const r = ((time * 60 + i * 70) % 210) + 140;
    ctx.beginPath();
    ctx.ellipse(cx, k.deckY + 40, r, r * 0.12, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  // Mantle: a tall rounded dome
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.ellipse(cx, top + 170, 156, 196, 0, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createRadialGradient(cx - 50, top + 90, 20, cx, top + 170, 200);
  grad.addColorStop(0, flash ? '#f8bbd0' : '#ba68c8');
  grad.addColorStop(1, flash ? '#e1bee7' : SKIN);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, top + 170, 150, 190, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spots
  ctx.fillStyle = 'rgba(74,20,140,0.45)';
  for (const [sx, sy, r] of [[-70, 40, 14], [40, 20, 18], [80, 90, 11], [-30, 0, 10], [-95, 110, 12], [10, 70, 9]]) {
    ctx.beginPath();
    ctx.arc(cx + sx, top + sy + 40, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Big yellow eyes with slit pupils (they look at whoever is closest), and an angry brow
  const near = g.fighters.filter((b) => b.alive && !b.kraken).sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0];
  const look = near ? Math.max(-1, Math.min(1, (near.x - cx) / 400)) : Math.sin(time * 0.6);
  const blink = (time % 4.2) < 0.12;
  for (const side of [-1, 1]) {
    const ex = cx + side * 62;
    const ey = top + 200;
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 34, blink ? 4 : 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 5;
    ctx.stroke();
    if (!blink) {
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.ellipse(ex + look * 14, ey, 7, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(ex + look * 14 - 10, ey - 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - side * 36, ey - 46);
    ctx.lineTo(ex + side * 30, ey - 30);
    ctx.stroke();
  }
  ctx.restore();
}

/** The tentacles (in front of everything), the big slam's warning, and the bosses being pulled down. */
export function drawKrakenFront(ctx: Ctx, g: Game, time: number) {
  const k = g.kr;
  if (!k) return;
  const flash = k.boss.hurtFlash > 0;
  const base = k.deckY + 40;
  // Dragging the bosses into the sea: a tentacle wraps around each one.
  if (k.stage === 'drag') {
    g.fighters.forEach((b, i) => {
      if (!b.alive || !b.boss || b.kraken) return;
      const side = b.x < k.cx ? -1 : 1;
      tentacle(ctx, b.x + side * 90, base + 60, b.x, b.cy, 26, time, i, false);
      tentacle(ctx, b.x - side * 70, base + 60, b.x + side * 10, b.y - b.h * 0.8, 20, time, i + 3, false);
    });
    return;
  }
  if (k.rise <= 0.02) return;
  const down = sunk(g);
  const busy = k.arms.length;
  // The big slam: every tentacle up over the spot, and the danger zone on the deck.
  if (k.combo) {
    const c = k.combo;
    const warn = 0.35 + 0.25 * Math.sin(time * 18);
    ctx.fillStyle = `rgba(234,128,252,${warn * 0.5})`;
    ctx.fillRect(c.x - KRAKEN.comboR, k.deckY - 420, KRAKEN.comboR * 2, 420);
    ctx.strokeStyle = `rgba(255,23,68,${0.5 + warn})`;
    ctx.lineWidth = 6;
    ctx.setLineDash([18, 12]);
    ctx.strokeRect(c.x - KRAKEN.comboR, k.deckY - 420, KRAKEN.comboR * 2, 420);
    ctx.setLineDash([]);
    const lift = Math.min(1, (KRAKEN.gather - c.t) / 0.8);
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const bx = k.cx + side * (150 + (i % 4) * 70);
      const tx = c.x + (i - 3.5) * 40;
      const ty = k.deckY - 200 - lift * 300 - Math.sin(time * 6 + i) * 20;
      tentacle(ctx, bx, base, tx, ty, 30, time, i, flash);
    }
    return;
  }
  // Resting tentacles sway over the sides (fewer while some are busy grabbing).
  const idle = Math.max(2, 6 - busy * 2);
  for (let i = 0; i < idle; i++) {
    const side = i % 2 ? 1 : -1;
    const n = Math.floor(i / 2);
    const bx = k.cx + side * (170 + n * 95);
    const tx = bx + side * (70 + Math.sin(time * 1.3 + i) * 40);
    const ty = k.deckY - 110 - n * 30 - Math.sin(time * 1.7 + i * 1.3) * 45 + down;
    tentacle(ctx, bx, base + down * 0.3, tx, ty, 24 - n * 2, time, i, flash);
  }
  // The ones going after somebody.
  k.arms.forEach((a, i) => tentacle(ctx, a.bx, base, a.x, a.y, 30, time, 10 + i, flash));
}
