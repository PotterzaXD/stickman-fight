import type { Fighter, Snowman, Projectile } from './entities';
import type { Game } from './game';
import { THEMES } from './maps';
import type { MapDef } from './types';
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
  } else {
    for (let i = 0; i < 40; i++) {
      const x = ((hash(i) * vw - par) % vw + vw) % vw;
      const y = vh - (((hash(i + 7) * vh + time * (40 + hash(i) * 60)) % vh) + vh) % vh;
      ctx.fillStyle = `rgba(255,${120 + Math.floor(hash(i) * 100)},40,${0.4 + hash(i + 1) * 0.5})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }
}

export function drawPlatforms(ctx: Ctx, map: MapDef) {
  const th = THEMES[map.theme];
  if (map.theme === 'lava') {
    const g = ctx.createLinearGradient(0, map.h + 120, 0, map.h + 400);
    g.addColorStop(0, '#ff6d00');
    g.addColorStop(1, '#b71c1c');
    ctx.fillStyle = g;
    ctx.fillRect(-3000, map.h + 160, map.w + 6000, 3000);
  }
  for (const p of map.platforms) {
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
export function drawWeaponShape(ctx: Ctx, id: WeaponId, len: number, s: number, ready: boolean) {
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
  }
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

function drawFighter(ctx: Ctx, f: Fighter, time: number) {
  const s = f.scale;
  const { x, y } = f;
  const outline = f.boss ? '#ff1744' : 'rgba(0,0,0,0.8)';
  const col = f.hurtFlash > 0 ? '#ffffff' : f.color;
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
    drawWeaponShape(ctx, f.weapons[i].id, f.reach(i), s, f.cds[i] <= 0 && !f.boomerangOut[i]);
    ctx.restore();
  }

  // Head
  ctx.fillStyle = col;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(head[0], head[1], 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = f.boss ? '#ff1744' : '#ffffff';
  ctx.beginPath();
  ctx.arc(head[0] + f.facing * 4 * s, head[1] - 2 * s, 3.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(head[0] + f.facing * 5 * s, head[1] - 2 * s, 1.6 * s, 0, Math.PI * 2);
  ctx.fill();
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
  }
}

export function renderGame(g: Game, ctx: Ctx, vw: number, vh: number, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground(ctx, g.map, vw, vh, g.cam.x, g.time);

  const z = g.cam.zoom;
  const sx = (Math.random() - 0.5) * g.shake;
  const sy = (Math.random() - 0.5) * g.shake;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - g.cam.x * z + sx), dpr * (vh / 2 - g.cam.y * z + sy));

  drawPlatforms(ctx, g.map);

  for (const gb of g.groundBalls) {
    if (gb.life < 1.5 && Math.floor(gb.life * 8) % 2 === 0) continue;
    drawSnowball(ctx, gb.x, gb.y - 11, 12, gb.owner.color);
  }
  for (const m of g.snowmen) if (m.alive) drawSnowman(ctx, m);

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
  for (const p of g.projectiles) drawProjectile(ctx, p, g.time);

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

  // Boss health bar across the top
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const boss = g.boss;
  if (boss) {
    const w = Math.min(520, vw * 0.5);
    const x = vw / 2 - w / 2;
    const y = 54;
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
}
