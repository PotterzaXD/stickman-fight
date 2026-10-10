import type { Body, Cat, Fighter, Snowman, Projectile } from './entities';
import { BOSS_TEAM, type Game } from './game';
import { t } from '../i18n';
import { drawCorpse } from './finish';
import { THEMES } from './maps';
import type { MapDef, Platform } from './types';
import type { WeaponId } from './weapons';

type Ctx = CanvasRenderingContext2D;

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Sky, far-away decoration and platforms. Also used by the map editor and map thumbnails. */
export function drawBackground(ctx: Ctx, map: MapDef, vw: number, vh: number, camX: number, time: number) {
  const th = THEMES[map.theme];
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
  const par = camX * 0.08;
  if (th.deco === 'clouds') {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 7; i++) {
      const x = ((hash(i) * (vw + 300) - par - time * 8 * (0.5 + hash(i + 9))) % (vw + 300) + vw + 300) % (vw + 300) - 150;
      const y = vh * (0.08 + hash(i + 3) * 0.4);
      const r = 18 + hash(i + 5) * 26;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r, y + 6, r * 0.8, 0, Math.PI * 2);
      ctx.arc(x - r, y + 8, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (th.deco === 'stars') {
    for (let i = 0; i < 60; i++) {
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + i);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.6})`;
      const x = ((hash(i) * vw - par * 0.5) % vw + vw) % vw;
      ctx.fillRect(x, hash(i + 40) * vh * 0.7, 2, 2);
    }
  } else if (th.deco === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 70; i++) {
      const x = ((hash(i) * vw + Math.sin(time + i) * 20 - par) % vw + vw) % vw;
      const y = ((hash(i + 7) * vh + time * (30 + hash(i) * 40)) % vh + vh) % vh;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + hash(i + 2) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (th.deco === 'space') {
    // Nebula, a ringed planet and twinkling stars
    const neb = ctx.createRadialGradient(vw * 0.25, vh * 0.3, 0, vw * 0.25, vh * 0.3, vw * 0.5);
    neb.addColorStop(0, 'rgba(156,39,176,0.28)');
    neb.addColorStop(1, 'rgba(156,39,176,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, vw, vh);
    for (let i = 0; i < 110; i++) {
      const tw = 0.5 + 0.5 * Math.sin(time * 2.5 + i * 1.7);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + tw * 0.7})`;
      const x = ((hash(i) * vw - par * (0.3 + hash(i + 5))) % vw + vw) % vw;
      const sz = hash(i + 9) > 0.9 ? 3 : 2;
      ctx.fillRect(x, hash(i + 40) * vh, sz, sz);
    }
    const px = ((vw * 0.78 - par * 0.4) % (vw + 200) + vw + 200) % (vw + 200) - 100;
    const py = vh * 0.24;
    const pr = Math.min(vw, vh) * 0.09;
    ctx.fillStyle = '#ff8a65';
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(px + pr * 0.3, py + pr * 0.2, pr * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,224,178,0.8)';
    ctx.lineWidth = Math.max(2, pr * 0.12);
    ctx.beginPath();
    ctx.ellipse(px, py, pr * 1.7, pr * 0.45, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (th.deco === 'beach') {
    // Sun, the sea on the horizon and a few clouds
    const sx = vw * 0.8 - par * 0.2;
    const sy = vh * 0.18;
    const sr = Math.min(vw, vh) * 0.07;
    ctx.fillStyle = 'rgba(255,241,118,0.35)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffee58';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 4; i++) {
      const x = ((hash(i + 20) * (vw + 300) - par - time * 6) % (vw + 300) + vw + 300) % (vw + 300) - 150;
      const y = vh * (0.08 + hash(i + 23) * 0.2);
      const r = 16 + hash(i + 25) * 20;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r, y + 5, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    const sea = vh * 0.55;
    const sg = ctx.createLinearGradient(0, sea, 0, vh);
    sg.addColorStop(0, '#0288d1');
    sg.addColorStop(1, '#4fc3f7');
    ctx.fillStyle = sg;
    ctx.fillRect(0, sea, vw, vh - sea);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const x = ((hash(i + 60) * vw - par * 0.6 + Math.sin(time + i) * 10) % vw + vw) % vw;
      const y = sea + 12 + hash(i + 61) * (vh - sea - 20);
      line(ctx, x, y, x + 18 + hash(i) * 20, y);
    }
  } else {
    for (let i = 0; i < 40; i++) {
      const x = ((hash(i) * vw - par) % vw + vw) % vw;
      const y = vh - (((hash(i + 7) * vh + time * (40 + hash(i) * 60)) % vh) + vh) % vh;
      ctx.fillStyle = `rgba(255,${120 + Math.floor(hash(i) * 100)},40,${0.4 + hash(i + 1) * 0.5})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }
}

/** Concrete, lava and glass blocks from the map editor. */
function drawBlock(ctx: Ctx, p: Platform, time: number, gone: number) {
  const r = Math.min(8, p.h / 2);
  if (p.kind === 'concrete') {
    ctx.fillStyle = '#9e9e9e';
    roundRect(ctx, p.x, p.y, p.w, p.h, r * 0.5);
    ctx.fill();
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(p.x, p.y, p.w, Math.min(8, p.h * 0.35));
    // Block seams
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let y = p.y + 30; y < p.y + p.h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(p.x, y);
      ctx.lineTo(p.x + p.w, y);
      ctx.stroke();
    }
    for (let x = p.x + 60; x < p.x + p.w - 10; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, p.y + Math.min(8, p.h * 0.35));
      ctx.lineTo(x, p.y + Math.min(p.h, 30));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, p.x, p.y, p.w, p.h, r * 0.5);
    ctx.stroke();
  } else if (p.kind === 'lava') {
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, '#ffab00');
    g.addColorStop(0.4, '#ff6d00');
    g.addColorStop(1, '#b71c1c');
    ctx.fillStyle = g;
    roundRect(ctx, p.x, p.y, p.w, p.h, r);
    ctx.fill();
    // Bubbles popping on top
    ctx.fillStyle = '#ffd54f';
    const n = Math.max(2, Math.floor(p.w / 50));
    for (let i = 0; i < n; i++) {
      const ph = (time * (0.8 + hash(i + p.x) * 0.8) + hash(i * 3 + p.y)) % 1;
      const bx = p.x + ((i + 0.5) * p.w) / n + Math.sin(time * 2 + i) * 6;
      ctx.globalAlpha = 1 - ph;
      ctx.beginPath();
      ctx.arc(bx, p.y + 4 - ph * 14, 2 + ph * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(120,20,0,0.6)';
    ctx.lineWidth = 2;
    roundRect(ctx, p.x, p.y, p.w, p.h, r);
    ctx.stroke();
  } else if (p.kind === 'glass') {
    if (gone > 0) {
      // Broken: a faint outline that fills in just before it comes back.
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = `rgba(225,245,254,${gone < 2 ? 0.7 : 0.3})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.setLineDash([]);
      return;
    }
    ctx.fillStyle = 'rgba(179,229,252,0.45)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    // Shine
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    for (let x = p.x + 20; x < p.x + p.w - 10; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, p.y + p.h - 3);
      ctx.lineTo(Math.min(p.x + p.w - 3, x + p.h * 0.8), p.y + 3);
      ctx.stroke();
    }
  }
}

/** The big spaceship in the middle of the Space map (decks are the platforms on top of it). */
function drawSpaceship(ctx: Ctx, cx: number, deck: number, time: number) {
  const L = cx - 360;
  const R = cx + 360;
  // Engine flame
  const fl = 40 + Math.sin(time * 30) * 10;
  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(L - 30, deck + 50);
  ctx.lineTo(L - 30 - fl * 2, deck + 80);
  ctx.lineTo(L - 30, deck + 110);
  ctx.fill();
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.moveTo(L - 30, deck + 64);
  ctx.lineTo(L - 30 - fl, deck + 80);
  ctx.lineTo(L - 30, deck + 96);
  ctx.fill();
  // Cockpit dome
  ctx.fillStyle = 'rgba(129,212,250,0.25)';
  ctx.strokeStyle = 'rgba(179,229,252,0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, deck, 175, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Hull
  const g = ctx.createLinearGradient(0, deck, 0, deck + 150);
  g.addColorStop(0, '#eceff1');
  g.addColorStop(1, '#78909c');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#37474f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(L - 30, deck + 20);
  ctx.lineTo(R, deck);
  ctx.quadraticCurveTo(R + 170, deck + 40, R + 190, deck + 75);
  ctx.quadraticCurveTo(R + 150, deck + 130, R - 20, deck + 150);
  ctx.lineTo(L, deck + 150);
  ctx.lineTo(L - 30, deck + 130);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Wings and tail fin
  ctx.fillStyle = '#e53935';
  for (const [x0, dir] of [
    [L + 40, 1],
    [R - 160, 1],
  ] as [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(x0, deck + 150);
    ctx.lineTo(x0 + 120 * dir, deck + 150);
    ctx.lineTo(x0 - 40 * dir, deck + 220);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(L - 20, deck + 20);
  ctx.lineTo(L + 60, deck + 10);
  ctx.lineTo(L - 10, deck - 80);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Windows and a stripe
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(L, deck + 108, R - L + 120, 10);
  for (let x = L + 60; x < R + 60; x += 90) {
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(x, deck + 70, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(129,212,250,${0.6 + 0.3 * Math.sin(time * 2 + x)})`;
    ctx.beginPath();
    ctx.arc(x, deck + 70, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPlatforms(ctx: Ctx, map: MapDef, time = 0, glassT?: number[]) {
  const th = THEMES[map.theme];
  if (map.deco === 'spaceship') drawSpaceship(ctx, map.w / 2, 640, time);
  if (map.theme === 'beach') {
    // The sea under the map
    const g = ctx.createLinearGradient(0, map.h + 60, 0, map.h + 500);
    g.addColorStop(0, '#29b6f6');
    g.addColorStop(1, '#01579b');
    ctx.fillStyle = g;
    ctx.fillRect(-3000, map.h + 80, map.w + 6000, 3000);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = -3000; x < map.w + 3000; x += 40) ctx.lineTo(x, map.h + 80 + Math.sin(x * 0.05 + time * 2) * 8);
    ctx.stroke();
  }
  if (map.deco === 'palms') {
    const sand = map.platforms[0];
    if (sand) for (const [px, lean] of [[sand.x + 70, -1], [sand.x + sand.w - 90, 1]] as [number, number][]) drawPalm(ctx, px, sand.y, lean, time);
  }
  if (map.theme === 'lava') {
    const g = ctx.createLinearGradient(0, map.h + 120, 0, map.h + 400);
    g.addColorStop(0, '#ff6d00');
    g.addColorStop(1, '#b71c1c');
    ctx.fillStyle = g;
    ctx.fillRect(-3000, map.h + 160, map.w + 6000, 3000);
  }
  for (const [i, p] of map.platforms.entries()) {
    if (p.kind) {
      drawBlock(ctx, p, time, glassT?.[i] ?? 0);
      continue;
    }
    ctx.fillStyle = th.plat;
    roundRect(ctx, p.x, p.y, p.w, p.h, Math.min(10, p.h / 2));
    ctx.fill();
    ctx.fillStyle = th.top;
    roundRect(ctx, p.x, p.y, p.w, Math.min(10, p.h * 0.45), Math.min(6, p.h / 3));
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, p.x, p.y, p.w, p.h, Math.min(10, p.h / 2));
    ctx.stroke();
  }
}

/** A palm tree on the Beach. */
function drawPalm(ctx: Ctx, x: number, y: number, lean: number, time: number) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = 16;
  const tx = x + lean * 50;
  const ty = y - 240;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * 6, y - 140, tx, ty);
  ctx.stroke();
  ctx.strokeStyle = '#6d4c41';
  ctx.lineWidth = 3;
  for (let k = 1; k < 8; k++) {
    const q = k / 8;
    const bx = x + (tx - x) * q * q;
    const by = y + (ty - y) * q;
    line(ctx, bx - 8, by, bx + 8, by - 3);
  }
  ctx.fillStyle = '#43a047';
  ctx.strokeStyle = '#1b5e20';
  ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.55 + Math.sin(time * 1.5 + k) * 0.05;
    const ex = tx + Math.cos(a) * 110;
    const ey = ty + Math.sin(a) * 60 + 40;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo((tx + ex) / 2 + Math.cos(a - 1) * 30, (ty + ey) / 2 - 40, ex, ey);
    ctx.quadraticCurveTo((tx + ex) / 2, (ty + ey) / 2 - 5, tx, ty);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#795548';
  for (const d of [-10, 8, -2]) {
    ctx.beginPath();
    ctx.arc(tx + d, ty + 12 + Math.abs(d) * 0.4, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, r));
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Draw a weapon in local space: hand at (0,0), pointing along +x. */
export function drawWeaponShape(ctx: Ctx, id: WeaponId, len: number, s: number, ready: boolean, out = false) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (id) {
    case 'sword':
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(-2 * s, -3 * s, 12 * s, 6 * s);
      ctx.strokeStyle = '#fbc02d';
      ctx.lineWidth = 4 * s;
      line(ctx, 10 * s, -9 * s, 10 * s, 9 * s);
      ctx.fillStyle = '#e0e6ea';
      ctx.strokeStyle = '#455a64';
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
      break;
    case 'spear':
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 4 * s;
      line(ctx, -8 * s, 0, len - 14 * s, 0);
      ctx.fillStyle = '#cfd8dc';
      ctx.strokeStyle = '#455a64';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(len - 18 * s, -6 * s);
      ctx.lineTo(len, 0);
      ctx.lineTo(len - 18 * s, 6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'hammer':
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 5 * s;
      line(ctx, -4 * s, 0, len - 10 * s, 0);
      ctx.fillStyle = '#616161';
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 2 * s;
      roundRect(ctx, len - 16 * s, -16 * s, 22 * s, 32 * s, 4 * s);
      ctx.fill();
      ctx.stroke();
      break;
    case 'bow':
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.arc(-6 * s, 0, 24 * s, -1.15, 1.15);
      ctx.stroke();
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1.2 * s;
      line(ctx, -6 * s + Math.cos(-1.15) * 24 * s, Math.sin(-1.15) * 24 * s, -6 * s + Math.cos(1.15) * 24 * s, Math.sin(1.15) * 24 * s);
      if (ready) {
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 2.5 * s;
        line(ctx, 4 * s, 0, len, 0);
        ctx.fillStyle = '#90a4ae';
        ctx.beginPath();
        ctx.moveTo(len + 6 * s, 0);
        ctx.lineTo(len - 2 * s, -4 * s);
        ctx.lineTo(len - 2 * s, 4 * s);
        ctx.fill();
      }
      break;
    case 'boomerang':
      if (ready) drawBoomerang(ctx, 14 * s, 0, s, 0);
      break;
    case 'bomb':
      if (ready) drawBomb(ctx, 12 * s, 0, 10 * s, 0);
      break;
    case 'katana':
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 5 * s;
      line(ctx, -4 * s, 0, 14 * s, 0);
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 3 * s;
      line(ctx, 14 * s, -7 * s, 14 * s, 7 * s);
      ctx.strokeStyle = '#eceff1';
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(16 * s, 0);
      ctx.quadraticCurveTo(len * 0.6, -4 * s, len, -9 * s);
      ctx.stroke();
      ctx.strokeStyle = '#78909c';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(16 * s, 2 * s);
      ctx.quadraticCurveTo(len * 0.6, -2 * s, len, -9 * s);
      ctx.stroke();
      break;
    case 'snowball':
      if (ready) drawSnowball(ctx, 10 * s, 0, 9 * s);
      break;
    case 'axe':
      if (!out) drawAxe(ctx, len, s);
      break;
    case 'shuriken':
      if (ready) drawShuriken(ctx, 12 * s, 0, 10 * s, 0);
      break;
    case 'laser':
      ctx.fillStyle = '#37474f';
      ctx.strokeStyle = '#102027';
      ctx.lineWidth = 1.5 * s;
      roundRect(ctx, -4 * s, -5 * s, len * 0.75, 10 * s, 3 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#263238';
      ctx.fillRect(-2 * s, 3 * s, 7 * s, 10 * s);
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(len * 0.75 - 4 * s, -3 * s, len * 0.25, 6 * s);
      ctx.fillStyle = ready ? '#ff1744' : '#5d4037';
      ctx.beginPath();
      ctx.arc(len, 0, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'staff':
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 4.5 * s;
      line(ctx, -10 * s, 0, len - 10 * s, 0);
      ctx.strokeStyle = '#ffca28';
      ctx.lineWidth = 2 * s;
      line(ctx, len - 18 * s, -6 * s, len - 12 * s, 0);
      line(ctx, len - 18 * s, 6 * s, len - 12 * s, 0);
      ctx.fillStyle = ready ? '#ff6d00' : '#8d6e63';
      ctx.strokeStyle = ready ? '#ffd54f' : '#5d4037';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(len - 4 * s, 0, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'six7':
      if (!out) draw67(ctx, len, s);
      break;
    case 'poop':
      if (ready) drawPoop(ctx, 12 * s, 0, 10 * s);
      break;
    case 'treasure':
    case 'soup':
      drawSoupPot(ctx, 14 * s, 0, s, id === 'treasure', ready);
      break;
    case 'stick':
    case 'mascotstick':
      // The Mascot's plain white stick
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 7 * s;
      line(ctx, -6 * s, 0, len, 0);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4.5 * s;
      line(ctx, -6 * s, 0, len, 0);
      break;
    case 'ice':
      ctx.strokeStyle = '#90caf9';
      ctx.lineWidth = 4 * s;
      line(ctx, -8 * s, 0, len - 12 * s, 0);
      ctx.fillStyle = ready ? '#e1f5fe' : '#90a4ae';
      ctx.strokeStyle = '#0277bd';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(len - 16 * s, 0);
      ctx.lineTo(len - 8 * s, -8 * s);
      ctx.lineTo(len + 4 * s, 0);
      ctx.lineTo(len - 8 * s, 8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'thunder':
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 5 * s;
      line(ctx, -4 * s, 0, len - 10 * s, 0);
      ctx.fillStyle = '#3949ab';
      ctx.strokeStyle = '#1a237e';
      ctx.lineWidth = 2 * s;
      roundRect(ctx, len - 16 * s, -17 * s, 24 * s, 34 * s, 4 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ready ? '#ffeb3b' : '#9fa8da';
      ctx.beginPath();
      ctx.moveTo(len - 2 * s, -12 * s);
      ctx.lineTo(len - 9 * s, 1 * s);
      ctx.lineTo(len - 3 * s, 1 * s);
      ctx.lineTo(len - 7 * s, 12 * s);
      ctx.lineTo(len + 2 * s, -2 * s);
      ctx.lineTo(len - 4 * s, -2 * s);
      ctx.closePath();
      ctx.fill();
      break;
    case 'banana':
      if (ready) drawBanana(ctx, 12 * s, 0, 11 * s, 0);
      break;
    case 'firesword':
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(-2 * s, -3 * s, 12 * s, 6 * s);
      ctx.strokeStyle = '#ff6d00';
      ctx.lineWidth = 4 * s;
      line(ctx, 10 * s, -9 * s, 10 * s, 9 * s);
      ctx.fillStyle = ready ? '#ff7043' : '#a1887f';
      ctx.strokeStyle = '#bf360c';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(12 * s, -5 * s);
      ctx.lineTo(len - 12 * s, -5 * s);
      ctx.lineTo(len, 0);
      ctx.lineTo(len - 12 * s, 5 * s);
      ctx.lineTo(12 * s, 5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Flames along the blade
      ctx.fillStyle = ready ? '#ffeb3b' : '#ffcc80';
      for (let k = 0; k < 4; k++) {
        const fx = 18 * s + ((len - 30 * s) * k) / 3;
        ctx.beginPath();
        ctx.moveTo(fx - 4 * s, -5 * s);
        ctx.quadraticCurveTo(fx, -14 * s, fx + 3 * s, -5 * s);
        ctx.fill();
      }
      break;
    case 'recall':
      // Just a tiny box
      ctx.fillStyle = ready ? '#9575cd' : '#7e57c2';
      ctx.strokeStyle = '#311b92';
      ctx.lineWidth = 1.5 * s;
      roundRect(ctx, 4 * s, -7 * s, 14 * s, 14 * s, 2 * s);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      line(ctx, 4 * s, -2 * s, 18 * s, -2 * s);
      if (ready) {
        ctx.fillStyle = 'rgba(179,136,255,0.35)';
        ctx.beginPath();
        ctx.arc(11 * s, 0, 12 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'dart':
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 2.5 * s;
      line(ctx, 0, 0, len - 6 * s, 0);
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(-2 * s, 0);
      ctx.lineTo(6 * s, -6 * s);
      ctx.lineTo(8 * s, 0);
      ctx.lineTo(6 * s, 6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ready ? '#76ff03' : '#9e9e9e';
      ctx.beginPath();
      ctx.moveTo(len - 8 * s, -3 * s);
      ctx.lineTo(len + 2 * s, 0);
      ctx.lineTo(len - 8 * s, 3 * s);
      ctx.closePath();
      ctx.fill();
      break;
    case 'glove': {
      // A spring arm with a big red glove on the end
      ctx.strokeStyle = '#9e9e9e';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      const n = 8;
      for (let k = 0; k <= n; k++) ctx.lineTo(((len - 14 * s) * k) / n, k % 2 ? -4 * s : 4 * s);
      ctx.stroke();
      ctx.fillStyle = '#e53935';
      ctx.strokeStyle = '#7f0000';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.ellipse(len - 4 * s, 0, 12 * s, 10 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(len - 8 * s, -9 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(len - 18 * s, -6 * s, 4 * s, 12 * s);
      break;
    }
    case 'magnet':
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 4 * s;
      line(ctx, -4 * s, 0, len - 22 * s, 0);
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 8 * s;
      ctx.beginPath();
      ctx.arc(len - 14 * s, 0, 11 * s, Math.PI / 2, Math.PI * 1.5);
      ctx.moveTo(len - 14 * s, -11 * s);
      ctx.lineTo(len - 2 * s, -11 * s);
      ctx.moveTo(len - 14 * s, 11 * s);
      ctx.lineTo(len - 2 * s, 11 * s);
      ctx.stroke();
      ctx.strokeStyle = ready ? '#eceff1' : '#9e9e9e';
      line(ctx, len - 4 * s, -11 * s, len + 3 * s, -11 * s);
      line(ctx, len - 4 * s, 11 * s, len + 3 * s, 11 * s);
      break;
    case 'rocket':
      ctx.fillStyle = '#558b2f';
      ctx.strokeStyle = '#1b5e20';
      ctx.lineWidth = 1.5 * s;
      roundRect(ctx, -10 * s, -7 * s, len, 14 * s, 4 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#33691e';
      ctx.fillRect(2 * s, 6 * s, 6 * s, 10 * s);
      if (ready) {
        ctx.fillStyle = '#e53935';
        ctx.beginPath();
        ctx.moveTo(len - 10 * s, -6 * s);
        ctx.lineTo(len + 6 * s, 0);
        ctx.lineTo(len - 10 * s, 6 * s);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'trident':
      ctx.strokeStyle = '#ffb300';
      ctx.lineWidth = 4 * s;
      line(ctx, -14 * s, 0, len - 14 * s, 0);
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(len - 4 * s, -10 * s);
      ctx.lineTo(len - 16 * s, -10 * s);
      ctx.lineTo(len - 16 * s, 10 * s);
      ctx.lineTo(len - 4 * s, 10 * s);
      ctx.moveTo(len - 16 * s, 0);
      ctx.lineTo(len + 2 * s, 0);
      ctx.stroke();
      ctx.fillStyle = ready ? '#fff176' : '#ffca28';
      for (const py of [-10, 0, 10]) {
        const tipx = py === 0 ? len + 2 * s : len - 4 * s;
        ctx.beginPath();
        ctx.moveTo(tipx, (py - 3) * s);
        ctx.lineTo(tipx + 7 * s, py * s);
        ctx.lineTo(tipx, (py + 3) * s);
        ctx.fill();
      }
      break;
    case 'catcall':
      // A golden bell to call the cats
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 2 * s;
      line(ctx, 0, 0, 10 * s, 0);
      ctx.fillStyle = ready ? '#ffca28' : '#a1887f';
      ctx.strokeStyle = '#6d4c00';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(10 * s, -8 * s);
      ctx.quadraticCurveTo(24 * s, -8 * s, 26 * s, 0);
      ctx.quadraticCurveTo(24 * s, 8 * s, 10 * s, 8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#6d4c00';
      ctx.beginPath();
      ctx.arc(27 * s, 0, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawBanana(ctx: Ctx, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#fdd835';
  ctx.strokeStyle = '#8d6e00';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.arc(0, -r * 0.4, r, 0.25 * Math.PI, 0.85 * Math.PI);
  ctx.arc(0, -r * 1.1, r * 1.35, 0.78 * Math.PI, 0.3 * Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(r * 0.55, -r * 0.05, r * 0.25, r * 0.25);
  ctx.restore();
}

function drawPotion(ctx: Ctx, x: number, y: number, time: number) {
  const bob = Math.sin(time * 4 + x) * 3;
  const by = y - 14 + bob;
  ctx.fillStyle = 'rgba(105,240,174,0.35)';
  ctx.beginPath();
  ctx.arc(x, by, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e53935';
  ctx.strokeStyle = '#4e0d0d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, by + 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#eceff1';
  ctx.fillRect(x - 3.5, by - 13, 7, 7);
  ctx.strokeRect(x - 3.5, by - 13, 7, 7);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(x - 4.5, by - 16, 9, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - 3, by - 1, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

/** A jagged lightning bolt (same shape on every device). */
function drawBolt(ctx: Ctx, b: { x1: number; y1: number; x2: number; y2: number; life: number }) {
  const n = 9;
  ctx.globalAlpha = Math.min(1, b.life / 0.15);
  for (const [w, c] of [
    [10, 'rgba(255,241,118,0.5)'],
    [4, '#ffffff'],
  ] as [number, string][]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const off = i === 0 || i === n ? 0 : (hash(i + b.x2) - 0.5) * 50;
      ctx.lineTo(b.x1 + (b.x2 - b.x1) * k + off, b.y1 + (b.y2 - b.y1) * k);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** The 67 weapon: a stick with a big "67" sign. */
function draw67(ctx: Ctx, len: number, s: number) {
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 5 * s;
  line(ctx, -6 * s, 0, len - 22 * s, 0);
  ctx.fillStyle = '#ffeb3b';
  ctx.strokeStyle = '#212121';
  ctx.lineWidth = 2 * s;
  roundRect(ctx, len - 26 * s, -14 * s, 30 * s, 28 * s, 5 * s);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(len - 11 * s, 0);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#d50000';
  ctx.font = `900 ${Math.round(17 * s)}px "Baloo 2", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('67', 0, 1 * s);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function drawPoop(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#6d4c41';
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (const [dy, k] of [
    [0.35, 1],
    [-0.15, 0.75],
    [-0.6, 0.5],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y + dy * r, r * k, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y, r * 0.15, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

/** A bowl of yellow gang som soup (gold rim for the Treasure). */
function drawSoupPot(ctx: Ctx, x: number, y: number, s: number, gold: boolean, ready: boolean) {
  ctx.fillStyle = gold ? '#ffd54f' : '#90a4ae';
  ctx.strokeStyle = gold ? '#8d6e00' : '#37474f';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 13 * s, y - 4 * s);
  ctx.lineTo(x + 13 * s, y - 4 * s);
  ctx.quadraticCurveTo(x + 12 * s, y + 12 * s, x, y + 12 * s);
  ctx.quadraticCurveTo(x - 12 * s, y + 12 * s, x - 13 * s, y - 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ready ? '#fbc02d' : '#c8a415';
  ctx.beginPath();
  ctx.ellipse(x, y - 4 * s, 12 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  if (ready) {
    ctx.fillStyle = '#e65100';
    ctx.beginPath();
    ctx.arc(x - 4 * s, y - 5 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.arc(x + 5 * s, y - 4 * s, 1.3 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A fish called by the Fishy boss: it flops about and bites. */
function drawFishMinion(ctx: Ctx, c: Cat, time: number) {
  const { x, y } = c;
  const f = c.facing;
  const flop = Math.sin(time * 14 + c.id) * 0.15;
  ctx.save();
  ctx.translate(x, y - 14);
  ctx.rotate(flop);
  ctx.fillStyle = c.hurtFlash > 0 ? '#ffffff' : '#29b6f6';
  ctx.strokeStyle = '#01579b';
  ctx.lineWidth = 2;
  // Tail
  ctx.beginPath();
  ctx.moveTo(-f * 12, 0);
  ctx.lineTo(-f * 24, -9);
  ctx.lineTo(-f * 24, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Fin, eye and a biting mouth
  ctx.fillStyle = '#0288d1';
  ctx.beginPath();
  ctx.moveTo(-f * 4, -9);
  ctx.lineTo(f * 2, -16);
  ctx.lineTo(f * 6, -8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(f * 8, -3, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(f * 9, -3, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#01579b';
  ctx.beginPath();
  const open = c.attackT > 0.5 ? 5 : 1.5;
  ctx.moveTo(f * 16, 2 - open);
  ctx.lineTo(f * 10, 3);
  ctx.lineTo(f * 16, 3 + open);
  ctx.stroke();
  ctx.restore();
  hpBar(ctx, x, y - 44, 26, c.hp / c.maxHp, c.color);
}

/** The purple boss ally from Recall Memory: purple lines, a black head, no weapon. */
function drawMemoryAlly(ctx: Ctx, c: Cat) {
  const { x, y } = c;
  const f = c.facing;
  const k = c.h / 128;
  const P = (dx: number, dy: number): [number, number] => [x + f * dx * k, y - dy * k];
  ctx.globalAlpha = c.life < 1.5 ? Math.max(0, c.life / 1.5) : 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const purple = c.hurtFlash > 0 ? '#e1bee7' : '#a64dff';
  ctx.strokeStyle = purple;
  ctx.lineWidth = 6 * k;
  const sw = c.onGround && Math.abs(c.vx) > 20 ? Math.sin(c.walkPhase) * 10 : 0;
  const hip = P(0, 52);
  const neck = P(0, 96);
  const sh = P(0, 88);
  ctx.beginPath();
  // Legs with little feet turned out
  ctx.moveTo(...P(-14 - sw, 0));
  ctx.lineTo(...P(-7 - sw, 3));
  ctx.lineTo(...hip);
  ctx.lineTo(...P(7 + sw, 3));
  ctx.lineTo(...P(15 + sw, 0));
  // Body
  ctx.moveTo(...hip);
  ctx.lineTo(...neck);
  // Short arm down to one side, and a bent arm on the other (it punches when it hits)
  ctx.moveTo(...sh);
  ctx.lineTo(...P(-22, 74));
  ctx.moveTo(...sh);
  if (c.attackT > 0.5) ctx.lineTo(...P(34, 84));
  else {
    ctx.lineTo(...P(12, 76));
    ctx.lineTo(...P(18, 64));
  }
  ctx.stroke();
  // Head: black inside, thick purple ring
  const [hx, hy] = P(0, 112);
  ctx.fillStyle = '#0b0b14';
  ctx.lineWidth = 5 * k;
  ctx.beginPath();
  ctx.arc(hx, hy, 15 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  hpBar(ctx, x, y - c.h - 18, 44, c.hp / c.maxHp, c.owner.color);
}

/** An AI cat called by Grandfather Cat. */
function drawCat(ctx: Ctx, c: Cat) {
  const { x, y } = c;
  const f = c.facing;
  const fur = c.hurtFlash > 0 ? '#ffffff' : '#ffb74d';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 4;
  const sw = c.onGround && Math.abs(c.vx) > 20 ? Math.sin(c.walkPhase) * 6 : 0;
  for (const lx of [-9, 9]) line(ctx, x + lx, y - 10, x + lx + (lx < 0 ? sw : -sw), y);
  // Tail
  ctx.strokeStyle = '#ef6c00';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - f * 14, y - 16);
  ctx.quadraticCurveTo(x - f * 26, y - 22, x - f * 22, y - 34);
  ctx.stroke();
  // Body
  ctx.fillStyle = fur;
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 16, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Head and ears
  const hx = x + f * 14;
  const hy = y - 26;
  ctx.beginPath();
  ctx.moveTo(hx - 8, hy - 5);
  ctx.lineTo(hx - 6, hy - 15);
  ctx.lineTo(hx - 1, hy - 8);
  ctx.moveTo(hx + 8, hy - 5);
  ctx.lineTo(hx + 6, hy - 15);
  ctx.lineTo(hx + 1, hy - 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx, hy, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(hx + f * 3, hy - 2, 1.6, 0, Math.PI * 2);
  ctx.arc(hx + f * 7, hy - 2, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Collar in the owner's colour
  ctx.strokeStyle = c.color;
  ctx.lineWidth = 3;
  line(ctx, hx - 6, hy + 7, hx + 6, hy + 7);
  hpBar(ctx, x, y - 52, 28, c.hp / c.maxHp, c.color);
}

function drawAxe(ctx: Ctx, len: number, s: number) {
  ctx.strokeStyle = '#795548';
  ctx.lineWidth = 5 * s;
  line(ctx, -6 * s, 0, len, 0);
  ctx.fillStyle = '#b0bec5';
  ctx.strokeStyle = '#37474f';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(len - 20 * s, -3 * s);
  ctx.lineTo(len - 26 * s, -20 * s);
  ctx.quadraticCurveTo(len - 8 * s, -16 * s, len - 2 * s, -24 * s);
  ctx.lineTo(len - 4 * s, -3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawShuriken(ctx: Ctx, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#90a4ae';
  ctx.strokeStyle = '#263238';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const d = i % 2 ? r * 0.35 : r;
    ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#263238';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Little flames on someone hit by a fireball. */
function drawFlames(ctx: Ctx, b: Body, time: number) {
  for (let i = 0; i < 4; i++) {
    const ph = (time * 3 + i / 4) % 1;
    const x = b.x + Math.sin(i * 2.1 + time * 4) * b.w * 0.4;
    const y = b.y - b.h * (0.2 + 0.2 * i) - ph * 18;
    ctx.globalAlpha = 1 - ph;
    ctx.fillStyle = i % 2 ? '#ff9800' : '#ffeb3b';
    ctx.beginPath();
    ctx.arc(x, y, 5 * (1 - ph * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBoomerang(ctx: Ctx, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 9 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14 * s, -12 * s);
  ctx.lineTo(0, 0);
  ctx.lineTo(-14 * s, 12 * s);
  ctx.stroke();
  ctx.strokeStyle = '#ff9800';
  ctx.lineWidth = 6 * s;
  ctx.stroke();
  ctx.restore();
}

function drawBomb(ctx: Ctx, x: number, y: number, r: number, time: number) {
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = r * 0.25;
  line(ctx, x, y - r, x + r * 0.4, y - r * 1.5);
  ctx.fillStyle = Math.floor(time * 20) % 2 ? '#ffeb3b' : '#ff5722';
  ctx.beginPath();
  ctx.arc(x + r * 0.45, y - r * 1.55, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnowball(ctx: Ctx, x: number, y: number, r: number, edge = '#90a4ae') {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function hpBar(ctx: Ctx, x: number, y: number, w: number, frac: number, color: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x - w / 2 - 2, y - 2, w + 4, 9, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#66bb6a' : frac > 0.25 ? '#ffca28' : '#ef5350';
  roundRect(ctx, x - w / 2, y, w * Math.max(0, frac), 5, 2.5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2 - 2, y - 2, 3, 9);
}

/** Buffalo walks on four legs, with big horns. */
function drawBuffalo(ctx: Ctx, f: Fighter) {
  const { x, y } = f;
  const d = f.facing;
  const col = f.frozenT > 0 ? '#b3e5fc' : f.hurtFlash > 0 ? '#ffffff' : '#4e342e';
  const dark = '#1b0f0a';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Legs (back pair, then front pair)
  const sw = f.onGround && Math.abs(f.vx) > 20 ? Math.sin(f.walkPhase * 0.7) * 16 : f.onGround ? 0 : 10;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 16;
  for (const [lx, ph] of [
    [-55, 1],
    [-30, -1],
    [35, -1],
    [60, 1],
  ] as [number, number][]) {
    line(ctx, x + d * lx, y - 60, x + d * (lx + sw * ph), y - 6);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = 11;
  for (const [lx, ph] of [
    [-55, 1],
    [-30, -1],
    [35, -1],
    [60, 1],
  ] as [number, number][]) {
    line(ctx, x + d * lx, y - 60, x + d * (lx + sw * ph), y - 6);
  }
  // Hooves
  ctx.fillStyle = dark;
  for (const [lx, ph] of [
    [-55, 1],
    [-30, -1],
    [35, -1],
    [60, 1],
  ] as [number, number][]) {
    ctx.fillRect(x + d * (lx + sw * ph) - 8, y - 8, 16, 8);
  }
  // Tail
  ctx.strokeStyle = dark;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - d * 88, y - 100);
  ctx.quadraticCurveTo(x - d * 108, y - 80, x - d * 100, y - 58);
  ctx.stroke();
  // Body and shoulder hump
  ctx.fillStyle = col;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x - d * 8, y - 88, 92, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + d * 40, y - 112, 44, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Head: lowered when charging or butting
  const down = f.buttAnim > 0 || f.dashT > 0;
  const hx = x + d * (down ? 104 : 92);
  const hy = y - (down ? 62 : 92);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 32, 27, d * (down ? 0.5 : 0.15), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Muzzle and nostrils
  ctx.fillStyle = '#8d6e63';
  ctx.beginPath();
  ctx.ellipse(hx + d * 22, hy + 10, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(hx + d * 26, hy + 8, 2.5, 0, Math.PI * 2);
  ctx.arc(hx + d * 20, hy + 12, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Big curved horns
  for (const side of [-1, 1]) {
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(hx - d * 6 + side * 4, hy - 18);
    ctx.quadraticCurveTo(hx - d * (side > 0 ? 50 : 20), hy - 44, hx + d * (side > 0 ? -34 : 26), hy - 64);
    ctx.stroke();
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  // Angry red eye
  ctx.fillStyle = '#ff1744';
  ctx.beginPath();
  ctx.arc(hx + d * 8, hy - 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(hx + d * 9, hy - 8, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

/** The Fishy boss's head: a big blue fish face. */
function drawFishHead(ctx: Ctx, hx: number, hy: number, s: number, d: number, col: string, outline: string) {
  ctx.fillStyle = col;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3 * s;
  // Top fin
  ctx.beginPath();
  ctx.moveTo(hx - d * 10 * s, hy - 9 * s);
  ctx.lineTo(hx - d * 2 * s, hy - 24 * s);
  ctx.lineTo(hx + d * 8 * s, hy - 10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Head
  ctx.beginPath();
  ctx.ellipse(hx + d * 3 * s, hy, 16 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Gills
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5 * s;
  for (const k of [0, 4]) {
    ctx.beginPath();
    ctx.arc(hx - d * (6 - k) * s, hy + 1 * s, 7 * s, -0.9, 0.9);
    ctx.stroke();
  }
  // Big eye and fish lips
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(hx + d * 8 * s, hy - 3 * s, 4.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff1744';
  ctx.beginPath();
  ctx.arc(hx + d * 9 * s, hy - 3 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f48fb1';
  ctx.beginPath();
  ctx.ellipse(hx + d * 18 * s, hy + 5 * s, 3 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Green bubbles over someone poisoned. */
function drawPoison(ctx: Ctx, b: Body, time: number) {
  for (let i = 0; i < 3; i++) {
    const ph = (time * 1.5 + i / 3) % 1;
    const x = b.x + Math.sin(i * 2.7 + time * 3) * b.w * 0.3;
    const y = b.y - b.h - 4 - ph * 22;
    ctx.globalAlpha = 1 - ph;
    ctx.strokeStyle = '#76ff03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 3 + ph * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawFighter(ctx: Ctx, f: Fighter, time: number) {
  if (f.buffalo) return drawBuffalo(ctx, f);
  const s = f.scale;
  const { x, y } = f;
  const outline = f.boss && !f.mascot ? '#ff1744' : 'rgba(0,0,0,0.8)';
  const col = f.frozenT > 0 ? '#b3e5fc' : f.hurtFlash > 0 ? (f.mascot ? '#ffcdd2' : '#ffffff') : f.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Legs
  let lf: [number, number], rf: [number, number];
  if (f.onGround) {
    const sw = Math.abs(f.vx) > 20 ? Math.sin(f.walkPhase) * 14 * s : 0;
    lf = [x - 9 * s + sw, y];
    rf = [x + 9 * s - sw, y];
  } else {
    lf = [x - 12 * s, y - 6 * s];
    rf = [x + 10 * s, y - 14 * s];
  }
  const hip = [x, y - 34 * s];
  const neck = [x, y - 62 * s];
  const head = [x, y - 73 * s];
  const sh = f.shoulder();
  const hands = f.weapons.map((_, i) => f.hand(i));
  const back: [number, number] = f.weapons.length > 1 ? [hands[1].x, hands[1].y] : [x - f.facing * 10 * s + Math.sin(time * 5) * 2 * s, y - 38 * s];

  const strokes = (w: number, c: string) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(lf[0], lf[1]);
    ctx.lineTo(hip[0] - 2 * s, hip[1] + 14 * s);
    ctx.lineTo(hip[0], hip[1]);
    ctx.lineTo(hip[0] + 2 * s, hip[1] + 14 * s);
    ctx.lineTo(rf[0], rf[1]);
    ctx.moveTo(hip[0], hip[1]);
    ctx.lineTo(neck[0], neck[1]);
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(back[0], back[1]);
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(hands[0].x, hands[0].y);
    ctx.stroke();
  };
  strokes(8, outline);
  strokes(5, col);

  // Weapons (behind head)
  for (let i = 0; i < f.weapons.length; i++) {
    ctx.save();
    ctx.translate(hands[i].x, hands[i].y);
    ctx.rotate(f.angles[i]);
    drawWeaponShape(ctx, f.weapons[i].id, f.reach(i), s, f.cds[i] <= 0 && !f.boomerangOut[i], f.boomerangOut[i]);
    ctx.restore();
  }

  // Head (Grandfather Cat gets cat ears)
  ctx.fillStyle = col;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3 * s;
  if (f.cat) {
    ctx.beginPath();
    for (const d of [-1, 1]) {
      ctx.moveTo(head[0] + d * 10 * s, head[1] - 4 * s);
      ctx.lineTo(head[0] + d * 9 * s, head[1] - 19 * s);
      ctx.lineTo(head[0] + d * 2 * s, head[1] - 10 * s);
    }
    ctx.fill();
    ctx.stroke();
  }
  if (f.fish) drawFishHead(ctx, head[0], head[1], s, f.facing, col, outline);
  else {
    ctx.beginPath();
    ctx.arc(head[0], head[1], 11 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (f.cat) {
    // White grandpa beard, whiskers and a pink nose
    ctx.fillStyle = '#fafafa';
    ctx.beginPath();
    ctx.moveTo(head[0] - 7 * s, head[1] + 5 * s);
    ctx.quadraticCurveTo(head[0] + f.facing * 2 * s, head[1] + 22 * s, head[0] + 7 * s, head[1] + 5 * s);
    ctx.fill();
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 0.8 * s;
    for (const k of [-1, 0, 1]) {
      line(ctx, head[0] + f.facing * 6 * s, head[1] + 2 * s, head[0] + f.facing * 16 * s, head[1] + (1 + k * 3) * s);
    }
    ctx.fillStyle = '#f06292';
    ctx.beginPath();
    ctx.arc(head[0] + f.facing * 8 * s, head[1] + 1 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // The Mascot has no eyes (and the Fishy boss has fish eyes).
  if (!f.mascot && !f.fish) {
    ctx.fillStyle = f.boss ? '#ff1744' : '#ffffff';
    ctx.beginPath();
    ctx.arc(head[0] + f.facing * 4 * s, head[1] - 2 * s, 3.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(head[0] + f.facing * 5 * s, head[1] - 2 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (f.stun > 0.25 && !f.boss) {
    ctx.fillStyle = '#ffeb3b';
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(head[0] + Math.cos(a) * 14, head[1] - 16 + Math.sin(a) * 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Shield bubble
  if (f.shielding) {
    const a = 0.35 + 0.5 * (f.shieldHp / 200);
    ctx.fillStyle = `rgba(79,195,247,${a * 0.35})`;
    ctx.strokeStyle = `rgba(129,212,250,${a})`;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(x, f.cy - 4 * s, f.h * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (!f.boss) {
    const top = y - f.h - 22;
    hpBar(ctx, x, top, 52, f.hp / f.maxHp, f.color);
    ctx.font = 'bold 13px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(f.name, x, top - 5);
    ctx.fillStyle = f.color;
    ctx.fillText(f.name, x, top - 5);
    // Skill ready dot
    const ready = f.cds[0] <= 0 && !f.boomerangOut[0];
    ctx.fillStyle = ready ? '#ffeb3b' : 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x + 33, top + 2.5, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSnowman(ctx: Ctx, m: Snowman) {
  const { x, y } = m;
  const f = m.facing;
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  line(ctx, x - 8, y - 38, x - 22, y - 48);
  line(ctx, x + 8, y - 38, x + 22, y - 48);
  const edge = m.hurtFlash > 0 ? '#ef5350' : '#90a4ae';
  drawSnowball(ctx, x, y - 16, 16, edge);
  drawSnowball(ctx, x, y - 38, 11, edge);
  drawSnowball(ctx, x, y - 54, 8.5, edge);
  ctx.strokeStyle = m.color;
  ctx.lineWidth = 4;
  line(ctx, x - 8, y - 46, x + 8, y - 46);
  line(ctx, x - f * 5, y - 46, x - f * 9, y - 38);
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(x + f * 2, y - 56, 1.6, 0, Math.PI * 2);
  ctx.arc(x + f * 6, y - 56, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(x + f * 4, y - 53);
  ctx.lineTo(x + f * 13, y - 52);
  ctx.lineTo(x + f * 4, y - 50);
  ctx.fill();
  hpBar(ctx, x, y - m.h - 14, 32, m.hp / m.maxHp, m.color);
}

function drawProjectile(ctx: Ctx, p: Projectile, time: number) {
  switch (p.kind) {
    case 'arrow': {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 3;
      line(ctx, -26, 0, 0, 0);
      ctx.fillStyle = '#90a4ae';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-3, -5);
      ctx.lineTo(-3, 5);
      ctx.fill();
      ctx.fillStyle = p.owner.color;
      ctx.fillRect(-28, -4, 6, 8);
      ctx.restore();
      break;
    }
    case 'snowball':
      drawSnowball(ctx, p.x, p.y, p.r, p.owner.color);
      break;
    case 'minisnow':
      drawSnowball(ctx, p.x, p.y, p.r);
      break;
    case 'boomerang':
      drawBoomerang(ctx, p.x, p.y, p.scale, time * 18);
      break;
    case 'bomb':
      drawBomb(ctx, p.x, p.y, p.r, time);
      break;
    case 'axe':
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time * 16);
      ctx.translate(-30 * p.scale, 0);
      drawAxe(ctx, 50 * p.scale, p.scale);
      ctx.restore();
      break;
    case 'shuriken':
      drawShuriken(ctx, p.x, p.y, p.r, time * 20);
      break;
    case 'laser': {
      const d = Math.hypot(p.vx, p.vy) || 1;
      const tx = p.x - (p.vx / d) * 70;
      const ty = p.y - (p.vy / d) * 70;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,23,68,0.45)';
      ctx.lineWidth = 12;
      line(ctx, tx, ty, p.x, p.y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      line(ctx, tx, ty, p.x, p.y);
      break;
    }
    case 'six7':
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time * 14);
      ctx.translate(-34 * p.scale, 0);
      draw67(ctx, 60 * p.scale, p.scale);
      ctx.restore();
      break;
    case 'poop':
      drawPoop(ctx, p.x, p.y, p.r);
      break;
    case 'icebolt': {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.fillStyle = '#e1f5fe';
      ctx.strokeStyle = '#0288d1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-4, -6);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-4, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'banana':
      drawBanana(ctx, p.x, p.y, p.r, time * 14);
      break;
    case 'soup':
      ctx.fillStyle = 'rgba(251,192,45,0.5)';
      ctx.beginPath();
      ctx.arc(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.r * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fdd835';
      ctx.strokeStyle = '#f57f17';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'fireslash': {
      // A curved air slash of fire
      const a = Math.atan2(p.vy, p.vx);
      const R = p.r * 1.6;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      for (const [w, c] of [
        [1, 'rgba(255,87,34,0.55)'],
        [0.65, '#ff9800'],
        [0.35, '#ffeb3b'],
      ] as [number, string][]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(-R * 0.6, 0, R, -1.15, 1.15);
        ctx.arc(-R * 0.6 - R * 0.45 * w, 0, R * (1 - 0.25 * w), 1.05, -1.05, true);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'dart': {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 2.5;
      line(ctx, -20, 0, 0, 0);
      ctx.fillStyle = '#76ff03';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-2, -3.5);
      ctx.lineTo(-2, 3.5);
      ctx.fill();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-24, -6);
      ctx.lineTo(-22, 0);
      ctx.lineTo(-24, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'memorybox':
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time * 18);
      ctx.fillStyle = 'rgba(179,136,255,0.4)';
      ctx.fillRect(-p.r * 1.5, -p.r * 1.5, p.r * 3, p.r * 3);
      ctx.fillStyle = '#9575cd';
      ctx.strokeStyle = '#311b92';
      ctx.lineWidth = 2;
      ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
      ctx.strokeRect(-p.r, -p.r, p.r * 2, p.r * 2);
      ctx.restore();
      break;
    case 'rocket': {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.fillStyle = Math.floor(time * 30) % 2 ? '#ffeb3b' : '#ff6d00';
      ctx.beginPath();
      ctx.moveTo(-14, -5);
      ctx.lineTo(-30 - Math.random() * 10, 0);
      ctx.lineTo(-14, 5);
      ctx.fill();
      ctx.fillStyle = '#eceff1';
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 1.5;
      roundRect(ctx, -16, -6, 24, 12, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(8, -6);
      ctx.lineTo(18, 0);
      ctx.lineTo(8, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'wave': {
      // A rolling wave of water
      const d = Math.sign(p.vx) || 1;
      const H = p.r * 1.6;
      ctx.save();
      ctx.translate(p.x, p.y + 45);
      ctx.scale(d, 1);
      ctx.fillStyle = 'rgba(41,182,246,0.75)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-p.r * 1.8, 0);
      ctx.quadraticCurveTo(-p.r * 0.6, -H * 0.4, 0, -H);
      ctx.quadraticCurveTo(p.r * 0.7, -H * 1.05, p.r * 0.8, -H * 0.6);
      ctx.quadraticCurveTo(p.r * 0.3, -H * 0.7, p.r * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-p.r * 0.2, -H * 0.85);
      ctx.quadraticCurveTo(p.r * 0.5, -H * 1.1, p.r * 0.8, -H * 0.6);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'fireball': {
      const flick = 1 + Math.sin(time * 40) * 0.12;
      ctx.fillStyle = 'rgba(255,87,34,0.45)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.5 * flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6d00';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

export function renderGame(g: Game, ctx: Ctx, vw: number, vh: number, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground(ctx, g.map, vw, vh, g.cam.x, g.time);

  const z = g.cam.zoom;
  const sx = (Math.random() - 0.5) * g.shake;
  const sy = (Math.random() - 0.5) * g.shake;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - g.cam.x * z + sx), dpr * (vh / 2 - g.cam.y * z + sy));

  drawPlatforms(ctx, g.map, g.time, g.glassT);

  for (const gb of g.groundBalls) {
    if (gb.life < 1.5 && Math.floor(gb.life * 8) % 2 === 0) continue;
    drawSnowball(ctx, gb.x, gb.y - 11, 12, gb.owner.color);
  }
  for (const m of g.snowmen) if (m.alive) drawSnowman(ctx, m);
  for (const c of g.cats) {
    if (!c.alive) continue;
    if (c.variant === 'fish') drawFishMinion(ctx, c, g.time);
    else if (c.variant === 'memory') drawMemoryAlly(ctx, c);
    else drawCat(ctx, c);
  }
  for (const pe of g.peels) {
    if (pe.life < 1.5 && Math.floor(pe.life * 8) % 2 === 0) continue;
    drawBanana(ctx, pe.x, pe.y - 4, 9, 0.3);
  }
  for (const po of g.potions) drawPotion(ctx, po.x, po.y, g.time);
  for (const c of g.corpses) drawCorpse(ctx, c, g.time);

  // Weapon swing trails
  for (const f of g.fighters) {
    if (!f.alive || f.trail.length < 2) continue;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 6 * f.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.trail[0].x, f.trail[0].y);
    for (const p of f.trail) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  // Humans drawn last so they stay on top.
  const order = g.fighters.filter((f) => f.alive).sort((a, b) => Number(a.human) - Number(b.human) || Number(b.boss) - Number(a.boss));
  for (const f of order) drawFighter(ctx, f, g.time);
  for (const b of g.bodies()) if (b.alive && b.burnT > 0) drawFlames(ctx, b, g.time);
  for (const b of g.bodies()) if (b.alive && b.poisonT > 0) drawPoison(ctx, b, g.time);
  for (const p of g.projectiles) drawProjectile(ctx, p, g.time);
  for (const b of g.bolts) drawBolt(ctx, b);

  for (const r of g.rings) {
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = Math.max(0, r.life / r.max);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of g.texts) {
    ctx.globalAlpha = Math.min(1, t.life * 2);
    ctx.font = `900 ${t.size}px "Baloo 2", system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  // Boss health bars across the top (one per boss)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // (On the Beach, bosses on your side that went down in the cutscene drop off the list.)
  const bars = g.bosses.filter((b) => b.alive || b.team === BOSS_TEAM);
  for (const [k, boss] of bars.entries()) {
    const w = Math.min(520, vw * 0.5);
    const x = vw / 2 - w / 2;
    const y = 54 + k * 26;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, x - 4, y - 4, w + 8, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#d50000';
    roundRect(ctx, x, y, w * Math.max(0, boss.hp / boss.maxHp), 14, 6);
    ctx.fill();
    ctx.font = '800 13px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${boss.name}  ${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`, vw / 2, y + 12);
  }

  // Big words across the screen (the Beach and its cutscene)
  if (g.caption) {
    const c = g.caption;
    const text = t(c.key, { name: g.fighters[c.who]?.name ?? '' });
    const size = Math.round(Math.min(40, Math.max(22, vw / 22)));
    ctx.globalAlpha = Math.min(1, c.t * 3);
    ctx.font = `900 ${size}px "Baloo 2", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    const ty = 70 + bars.length * 26 + size;
    ctx.strokeText(text, vw / 2, ty, vw - 32);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, vw / 2, ty, vw - 32);
    ctx.globalAlpha = 1;
  }
}
