import type { Game } from './game';
import { DOOM, PLANE, axeBlades } from './nov05Maps';
import type { MapDef } from './types';
import { PERK_ICON, type SurvState } from './survival';

type Ctx = CanvasRenderingContext2D;

/*
 * The November 5 maps' pictures: the Tower of Doom (stone walls, axes, bricks, lightning, lava)
 * and the Plane (the plane itself, clouds rushing by, the dive alarm).
 */

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Far away: storm clouds behind the tower, or clouds rushing past the plane. */
export function drawNov05Deco(ctx: Ctx, deco: string, vw: number, vh: number, par: number, time: number): boolean {
  if (deco === 'doom') {
    ctx.fillStyle = 'rgba(30,20,40,0.55)';
    for (let i = 0; i < 6; i++) {
      const x = ((hash(i) * (vw + 400) - par * 0.5 - time * 6) % (vw + 400) + vw + 400) % (vw + 400) - 200;
      const y = vh * (0.1 + hash(i + 3) * 0.3);
      ctx.beginPath();
      ctx.ellipse(x, y, 160 + hash(i + 1) * 120, 40 + hash(i + 2) * 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  }
  if (deco === 'plane') {
    // Clouds rushing past (we are flying fast).
    for (let i = 0; i < 14; i++) {
      const speed = 300 + hash(i + 5) * 500;
      const x = ((hash(i) * (vw + 500) - time * speed) % (vw + 500) + vw + 500) % (vw + 500) - 250;
      const y = vh * (0.15 + hash(i + 9) * 0.8);
      ctx.fillStyle = `rgba(255,255,255,${0.45 + hash(i + 2) * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 90 + hash(i + 3) * 90, 26 + hash(i + 4) * 20, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 50, y - 14, 60, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  }
  return false;
}

/** Behind the platforms: the tower's stone wall, or the plane's body. */
export function drawNov05MapBack(ctx: Ctx, map: MapDef, time: number) {
  if (map.id === 'doom') towerWall(ctx);
  if (map.id === 'plane') planeBody(ctx, time);
}

function towerWall(ctx: Ctx) {
  const top = DOOM.ground - DOOM.step * (DOOM.levels + 1) - 80;
  const L = 110;
  const R = DOOM.w - 110;
  ctx.fillStyle = '#2f2a2e';
  ctx.fillRect(L, top, R - L, DOOM.ground - top);
  // Stone blocks.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let y = top, row = 0; y < DOOM.ground; y += 40, row++) {
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
    for (let x = L + (row % 2 ? 40 : 0); x < R; x += 80) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 40);
    }
  }
  ctx.stroke();
  // Battlements at the top.
  ctx.fillStyle = '#2f2a2e';
  for (let x = L; x < R; x += 80) ctx.fillRect(x, top - 40, 44, 40);
  // Little windows with candle light.
  for (let k = 1; k <= DOOM.levels; k += 2) {
    const y = DOOM.ground - DOOM.step * k + 70;
    for (const x of [L + 60, R - 90]) {
      ctx.fillStyle = '#ffb74d';
      ctx.beginPath();
      ctx.roundRect(x, y, 30, 46, [15, 15, 0, 0]);
      ctx.fill();
    }
  }
}

function planeBody(ctx: Ctx, time: number) {
  const L = PLANE.tail - 40;
  const R = PLANE.nose + 40;
  const top = PLANE.roof;
  const bot = PLANE.floor + 40;
  // Wing (behind) and engines.
  ctx.fillStyle = '#90a4ae';
  ctx.beginPath();
  ctx.moveTo(1250, bot - 20);
  ctx.lineTo(2150, bot - 20);
  ctx.lineTo(1900, bot + 120);
  ctx.lineTo(1150, bot + 120);
  ctx.closePath();
  ctx.fill();
  for (const ex of [1350, 1800]) {
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.roundRect(ex, bot + 100, 200, 60, 30);
    ctx.fill();
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.ellipse(ex + 196, bot + 130, 8, 26 * Math.abs(Math.sin(time * 40)), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tail fin.
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.moveTo(L + 20, top + 10);
  ctx.lineTo(L + 60, 330);
  ctx.lineTo(L + 240, 330);
  ctx.lineTo(L + 300, top + 10);
  ctx.closePath();
  ctx.fill();
  // The body: white outside, a lighter cabin inside.
  ctx.fillStyle = '#eceff1';
  ctx.beginPath();
  ctx.roundRect(L, top - 10, R - L, bot - top + 20, [40, 160, 160, 40]);
  ctx.fill();
  ctx.fillStyle = '#fff8e1';
  ctx.fillRect(L + 40, top + 26, R - L - 120, PLANE.floor - top - 26);
  // Stripe and windows.
  ctx.fillStyle = '#1e88e5';
  ctx.fillRect(L, PLANE.floor + 6, R - L - 60, 10);
  for (let x = L + 120; x < PLANE.cockpit - 60; x += 110) {
    ctx.fillStyle = '#b3e5fc';
    ctx.beginPath();
    ctx.roundRect(x, top + 70, 44, 56, 18);
    ctx.fill();
  }
  // The cockpit: windshield, seats and a console with a big red button.
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.moveTo(PLANE.nose - 140, top + 40);
  ctx.lineTo(PLANE.nose - 10, top + 90);
  ctx.lineTo(PLANE.nose - 10, top + 150);
  ctx.lineTo(PLANE.nose - 140, top + 150);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#455a64';
  ctx.fillRect(PLANE.button.x - 60, PLANE.floor - 40, 120, 40);
  ctx.fillStyle = Math.sin(time * 4) > 0 ? '#ff1744' : '#d50000';
  ctx.beginPath();
  ctx.arc(PLANE.button.x, PLANE.floor - 44, 12, Math.PI, 0);
  ctx.fill();
  // The open back door: sky out there.
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(L, top + 26, 40, PLANE.floor - top - 26);
}

/** In front of everyone: Tower of Doom's axes, bricks, lightning and lava; the Plane's smoke. */
export function drawNov05MapFront(ctx: Ctx, g: Game, time: number) {
  const d = g.doom;
  if (d) {
    for (const bl of axeBlades(time)) {
      ctx.strokeStyle = '#795548';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(bl.px, bl.py);
      ctx.lineTo(bl.x, bl.y);
      ctx.stroke();
      ctx.save();
      ctx.translate(bl.x, bl.y);
      ctx.rotate(-bl.a);
      ctx.fillStyle = '#b0bec5';
      ctx.strokeStyle = '#455a64';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(52, -6, 46, 34);
      ctx.quadraticCurveTo(0, 26, 0, 10);
      ctx.quadraticCurveTo(0, 26, -46, 34);
      ctx.quadraticCurveTo(-52, -6, 0, -10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    for (const b of d.bricks) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = '#a1503a';
      ctx.fillRect(-14, -8, 28, 16);
      ctx.strokeStyle = '#5d2a1c';
      ctx.lineWidth = 2;
      ctx.strokeRect(-14, -8, 28, 16);
      ctx.restore();
    }
    if (d.warnT > 0 && Math.floor(time * 12) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,235,59,0.18)';
      ctx.fillRect(d.boltX - DOOM.boltW, 0, DOOM.boltW * 2, DOOM.h / 2);
    }
    if (d.flashT > 0) {
      ctx.strokeStyle = `rgba(255,253,231,${Math.min(1, d.flashT * 4)})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      let x = d.boltX;
      ctx.moveTo(x, -200);
      for (let y = 0; y < DOOM.h / 2; y += 90) {
        x = d.boltX + (hash(y + Math.floor(time * 20)) - 0.5) * 70;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    if (d.lavaY < DOOM.h + 150) {
      const grad = ctx.createLinearGradient(0, d.lavaY, 0, d.lavaY + 300);
      grad.addColorStop(0, '#ff9100');
      grad.addColorStop(0.25, '#e65100');
      grad.addColorStop(1, '#3e0f00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-800, DOOM.h + 2000);
      for (let x = -800; x <= DOOM.w + 800; x += 40) ctx.lineTo(x, d.lavaY + Math.sin(x * 0.02 + time * 3) * 8);
      ctx.lineTo(DOOM.w + 800, DOOM.h + 2000);
      ctx.closePath();
      ctx.fill();
    }
    // Wind streaks at the top.
    const wind = Math.sin(time * 0.45) >= 0 ? 1 : -1;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const x = ((hash(i) * DOOM.w + wind * time * 600) % DOOM.w + DOOM.w) % DOOM.w;
      const y = DOOM.windTop - hash(i + 3) * 900;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - wind * 60, y);
      ctx.stroke();
    }
  }
  const pl = g.plane;
  if (pl && pl.phase !== 'fly') {
    // Smoke from the engines while diving, fire after the crash.
    for (let i = 0; i < 12; i++) {
      const k = (time * 0.8 + hash(i)) % 1;
      ctx.fillStyle = pl.phase === 'crashed' && i % 3 === 0 ? `rgba(255,109,0,${0.6 * (1 - k)})` : `rgba(66,66,66,${0.5 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(1450 + (i % 2) * 450 - k * 200, PLANE.floor + 120 - k * 400, 30 + k * 60, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The Plane after the crash: a calm sky (no more clouds rushing by) behind everything. */
export function drawCrashSky(ctx: Ctx, g: Game, vw: number, vh: number) {
  if (g.plane?.phase !== 'crashed') return;
  const grad = ctx.createLinearGradient(0, 0, 0, vh);
  grad.addColorStop(0, '#90caf9');
  grad.addColorStop(1, '#fff3e0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, vw, vh);
}

/** The Plane after the crash: grass and dirt where it came down. */
export function drawCrashGround(ctx: Ctx, g: Game) {
  if (g.plane?.phase !== 'crashed') return;
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(-3000, PLANE.ground, PLANE.w + 6000, 3000);
  ctx.fillStyle = '#7cb342';
  ctx.fillRect(-3000, PLANE.ground, PLANE.w + 6000, 26);
  // A long scrape where it slid along.
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(PLANE.tail - 900, PLANE.ground + 4, 900, 10);
}

/** On the screen: the Plane's dive alarm. */
export function drawNov05Hud(ctx: Ctx, g: Game, vw: number, vh: number) {
  const pl = g.plane;
  if (!pl || pl.phase !== 'dive') return;
  // Air rushing up past the windows.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 24; i++) {
    const x = hash(i) * vw;
    const y = vh - ((((hash(i + 7) * vh + pl.t * 1600) % vh) + vh) % vh);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 60);
    ctx.stroke();
  }
  if (Math.floor(pl.t * 4) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,23,68,0.22)';
    ctx.fillRect(0, 0, vw, vh);
  }
  ctx.font = '900 30px "Baloo 2", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`⚠️ ${Math.max(0, Math.ceil(PLANE.dive - pl.t))} ⚠️`, vw / 2, vh * 0.3);
}

// ---------- Survival ----------

/** The upgrade orbs during a break (in the world). */
export function drawSurvivalWorld(ctx: Ctx, s: SurvState, time: number) {
  for (const [k, o] of s.orbs.entries()) {
    const bob = Math.sin(time * 3 + k) * 6;
    const glow = ctx.createRadialGradient(o.x, o.y + bob, 4, o.x, o.y + bob, 46);
    glow.addColorStop(0, 'rgba(255,215,64,0.9)');
    glow.addColorStop(1, 'rgba(255,215,64,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(o.x, o.y + bob, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(33,33,33,0.75)';
    ctx.beginPath();
    ctx.arc(o.x, o.y + bob, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '26px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PERK_ICON[o.perk], o.x, o.y + bob + 1);
  }
}

/** The wave, enemies left, or the break's countdown. */
export function drawSurvivalHud(ctx: Ctx, s: SurvState, left: number, vw: number, label: { wave: string; brk: string; best: string }) {
  const text = s.phase === 'break' ? `🛡️ ${label.brk}  ${Math.max(0, Math.ceil(s.t))}` : `🌊 ${label.wave}  ·  👤 ${left}`;
  ctx.font = '800 16px "Baloo 2", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 30;
  ctx.fillStyle = s.phase === 'break' ? 'rgba(46,125,50,0.85)' : 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(vw / 2 - w / 2, 54, w, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, vw / 2, 69);
  ctx.font = '700 12px "Baloo 2", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(label.best, vw / 2, 96);
}
