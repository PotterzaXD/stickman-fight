import type { Fighter } from './entities';
import type { Game } from './game';
import { PHYL, PHY_POSES, cornerW, type Hazard, type PhylState } from './phyl';
import { t } from '../i18n';

type Ctx = CanvasRenderingContext2D;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** The Forbidden Tome Keep's sky: endless dark bookshelves, glowing runes and loose pages drifting about. */
export function drawPhylDeco(ctx: Ctx, deco: string, vw: number, vh: number, par: number, time: number): boolean {
  if (deco !== 'tome') return false;
  // A big glowing sigil behind everything.
  const cx = vw * 0.5 - par * 0.2;
  const cy = vh * 0.3;
  const R = Math.min(vw, vh) * 0.28;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
  glow.addColorStop(0, 'rgba(186,104,200,0.35)');
  glow.addColorStop(1, 'rgba(186,104,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, vw, vh);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.05);
  ctx.strokeStyle = 'rgba(225,190,231,0.25)';
  ctx.lineWidth = 2;
  for (const k of [1, 0.78]) {
    ctx.beginPath();
    ctx.arc(0, 0, R * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78);
  }
  ctx.stroke();
  ctx.restore();
  // Rows of bookshelves, far away.
  const shelfW = 140;
  for (let layer = 0; layer < 2; layer++) {
    const sp = layer ? 0.35 : 0.18;
    const top = vh * (layer ? 0.45 : 0.3);
    const off = ((-par * sp) % shelfW + shelfW) % shelfW;
    for (let x = -shelfW + off; x < vw + shelfW; x += shelfW) {
      const i = Math.floor((x - off) / shelfW);
      ctx.fillStyle = layer ? '#24112f' : '#1a0b24';
      ctx.fillRect(x + 6, top, shelfW - 12, vh - top);
      // Book spines.
      for (let row = 0; row < 7; row++) {
        const y = top + 14 + row * 46;
        if (y > vh) break;
        let bx = x + 12;
        let n = 0;
        while (bx < x + shelfW - 16 && n < 12) {
          const w = 6 + hash(i * 31 + row * 7 + n) * 8;
          const hue = Math.floor(hash(i + row * 3 + n * 5) * 360);
          ctx.fillStyle = `hsla(${hue},45%,${layer ? 30 : 22}%,0.9)`;
          ctx.fillRect(bx, y + 4 + hash(n + row) * 6, w, 34);
          bx += w + 2;
          n++;
        }
        ctx.fillStyle = '#3e2a1f';
        ctx.fillRect(x + 6, y + 38, shelfW - 12, 6);
      }
    }
  }
  // Glowing runes floating up.
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ';
  for (let i = 0; i < 24; i++) {
    const x = ((hash(i) * (vw + 100) - par * 0.3) % (vw + 100) + vw + 100) % (vw + 100) - 50;
    const y = vh - ((hash(i + 3) * vh + time * (20 + hash(i + 5) * 30)) % vh);
    ctx.fillStyle = `rgba(234,128,252,${0.25 + 0.45 * (0.5 + 0.5 * Math.sin(time * 2 + i))})`;
    ctx.fillText(runes[i % runes.length], x, y);
  }
  // Loose pages drifting.
  for (let i = 0; i < 10; i++) {
    const x = ((hash(i + 50) * (vw + 200) + time * (30 + hash(i) * 30) - par * 0.4) % (vw + 200) + vw + 200) % (vw + 200) - 100;
    const y = vh * (0.15 + hash(i + 60) * 0.6) + Math.sin(time + i) * 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 1.5 + i) * 0.6);
    ctx.fillStyle = 'rgba(255,248,225,0.55)';
    ctx.fillRect(-9, -12, 18, 24);
    ctx.fillStyle = 'rgba(93,64,55,0.4)';
    for (let k = 0; k < 4; k++) ctx.fillRect(-6, -8 + k * 5, 12, 1.5);
    ctx.restore();
  }
  return true;
}

/** Behind everyone: the safe corners and the warning marks for swords and lasers. */
export function drawPhylBack(ctx: Ctx, g: Game, time: number) {
  const p = g.phy!;
  const fl = p.floor;
  if (fl) {
    const bomb = p.st === 'bomb';
    const a = bomb ? 0.35 + 0.25 * Math.sin(time * 10) : 0.12;
    const cw = cornerW(p);
    for (const [x0, x1] of [[fl.x, fl.x + cw], [fl.x + fl.w - cw, fl.x + fl.w]]) {
      const gr = ctx.createLinearGradient(0, fl.y - 340, 0, fl.y);
      gr.addColorStop(0, 'rgba(105,240,174,0)');
      gr.addColorStop(1, `rgba(105,240,174,${a})`);
      ctx.fillStyle = gr;
      ctx.fillRect(x0, fl.y - 340, x1 - x0, 340);
      ctx.strokeStyle = `rgba(105,240,174,${Math.min(1, a * 2)})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x0, fl.y - 2);
      ctx.lineTo(x1, fl.y - 2);
      ctx.stroke();
      if (bomb) {
        ctx.font = '900 56px "Baloo 2", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#69f0ae';
        ctx.fillText(`🛡️ ${t('phySafeHere')}`, (x0 + x1) / 2, fl.y - 200, x1 - x0);
      }
    }
  }
  for (const h of p.hz) {
    if (h.k === 'sword' && h.t < 1.1) {
      // A red column where the sword will come down.
      const k = h.t / 1.1;
      ctx.fillStyle = `rgba(255,23,68,${0.12 + 0.2 * k})`;
      ctx.fillRect(h.x - 26, 0, 52, h.ty);
      ctx.strokeStyle = `rgba(255,82,82,${0.5 + 0.5 * Math.sin(time * 30)})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(h.x - 26, 0, 52, h.ty);
    }
    if (h.k === 'laser' && h.t < 1) {
      ctx.strokeStyle = `rgba(255,23,68,${0.3 + 0.5 * Math.abs(Math.sin(time * 25))})`;
      ctx.lineWidth = h.big ? 10 : 4;
      ctx.setLineDash([24, 16]);
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(h.tx, h.ty);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/** His meteors, swords, fireballs, books, lasers and shockwaves, and the giant bomb. */
export function drawPhylWorld(ctx: Ctx, g: Game, time: number) {
  const p = g.phy!;
  for (const h of p.hz) drawHazard(ctx, h, time);
  if (p.st === 'bomb' && p.boss.alive) drawBigBomb(ctx, p, time);
}

function drawHazard(ctx: Ctx, h: Hazard, time: number) {
  switch (h.k) {
    case 'meteor': {
      // A fiery trail behind it.
      const sp = Math.hypot(h.vx, h.vy) || 1;
      const ux = h.vx / sp;
      const uy = h.vy / sp;
      const tr = ctx.createLinearGradient(h.x, h.y, h.x - ux * 220, h.y - uy * 220);
      tr.addColorStop(0, 'rgba(255,145,0,0.9)');
      tr.addColorStop(1, 'rgba(255,82,82,0)');
      ctx.strokeStyle = tr;
      ctx.lineWidth = 46;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(h.x - ux * 220, h.y - uy * 220);
      ctx.stroke();
      ctx.fillStyle = '#4e342e';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6d00';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(h.x + Math.cos(i * 1.7 + time * 3) * 14, h.y + Math.sin(i * 2.3) * 14, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'sword': {
      if (h.t < 1.1) break;
      // Blade pointing down, the tip at h.y.
      const len = 240;
      ctx.save();
      ctx.translate(h.x, h.y);
      const sh = ctx.createLinearGradient(-14, 0, 14, 0);
      sh.addColorStop(0, '#9e9e9e');
      sh.addColorStop(0.5, '#ffffff');
      sh.addColorStop(1, '#9e9e9e');
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-14, -40);
      ctx.lineTo(-14, -len);
      ctx.lineTo(14, -len);
      ctx.lineTo(14, -40);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7b1fa2';
      ctx.fillRect(-46, -len - 14, 92, 16);
      ctx.fillStyle = '#4a148c';
      ctx.fillRect(-8, -len - 80, 16, 66);
      ctx.fillStyle = '#ffd740';
      ctx.beginPath();
      ctx.arc(0, -len - 86, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'fire': {
      const fg = ctx.createRadialGradient(h.x, h.y, 2, h.x, h.y, 26);
      fg.addColorStop(0, '#fff59d');
      fg.addColorStop(0.5, '#ff9100');
      fg.addColorStop(1, 'rgba(255,61,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,111,0,0.5)';
      ctx.beginPath();
      ctx.moveTo(h.x - 14, h.y - 6);
      ctx.lineTo(h.x, h.y - 60);
      ctx.lineTo(h.x + 14, h.y - 6);
      ctx.fill();
      break;
    }
    case 'book': {
      const flap = Math.sin(time * 16 + h.x * 0.01) * 0.6;
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.fillStyle = 'rgba(206,147,216,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.scale(s, 1);
        ctx.rotate(-flap);
        ctx.fillStyle = '#6a1b9a';
        ctx.fillRect(0, -16, 26, 32);
        ctx.fillStyle = '#fff8e1';
        ctx.fillRect(2, -13, 21, 26);
        ctx.restore();
      }
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(-6, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'laser': {
      if (h.t < 1) break;
      const w = h.big ? 90 : 34;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(234,128,252,0.55)';
      ctx.lineWidth = w * 1.8;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(h.tx, h.ty);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = w * 0.6;
      ctx.stroke();
      break;
    }
    case 'wave': {
      const dir = Math.sign(h.vx) || 1;
      ctx.fillStyle = 'rgba(179,136,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(h.x - dir * 70, h.y);
      ctx.quadraticCurveTo(h.x - dir * 20, h.y - 90, h.x + dir * 20, h.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ede7f6';
      ctx.lineWidth = 4;
      ctx.stroke();
      break;
    }
  }
}

function drawBigBomb(ctx: Ctx, p: PhylState, time: number) {
  const f = p.boss;
  const k = 1 - Math.max(0, p.t) / PHYL.bombWarn;
  const r = 70 + k * 130;
  const x = f.x;
  const y = f.y - f.h - r - 40;
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#424242';
  ctx.fillRect(x - r * 0.25, y - r - 26, r * 0.5, 30);
  // The fuse burns down.
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x, y - r - 26);
  ctx.quadraticCurveTo(x + 40, y - r - 80, x + 20, y - r - 110 * (1 - k) - 30);
  ctx.stroke();
  const sx = x + 20;
  const sy = y - r - 110 * (1 - k) - 30;
  ctx.fillStyle = Math.sin(time * 40) > 0 ? '#ffeb3b' : '#ff6d00';
  ctx.beginPath();
  ctx.arc(sx, sy, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `900 ${Math.round(r * 0.5)}px "Baloo 2", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff1744';
  ctx.fillText('💀', x, y + r * 0.18);
}

/** PHYLISHIEUS himself: a towering hooded sorcerer with a crown of runes, a staff and his giant floating tome. */
export function drawPhyl(ctx: Ctx, f: Fighter, time: number) {
  const tired = f.phyPose === PHY_POSES.tired;
  const dying = f.phyPose === PHY_POSES.dying;
  const two = f.phyl === 2;
  if (dying && Math.sin(time * 40) > 0.4) return;
  const x = f.x;
  // Tired: he sinks down, slumped. Floating: a little bob.
  const sink = tired ? 70 : 0;
  const bob = tired ? 0 : Math.sin(time * 2) * 8;
  const foot = f.y + bob;
  const H = f.h - sink;
  const top = foot - H;
  ctx.save();
  if (f.hurtFlash > 0) ctx.filter = 'brightness(2)';
  // Dark aura.
  const aura = ctx.createRadialGradient(x, top + H * 0.45, 20, x, top + H * 0.45, H * 0.9);
  aura.addColorStop(0, two ? 'rgba(255,23,68,0.35)' : 'rgba(170,0,255,0.35)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, top + H * 0.45, H * 0.9, 0, Math.PI * 2);
  ctx.fill();
  // Robe: wide at the bottom, ragged hem.
  const robe = two ? '#3b0a1e' : '#311b92';
  const trim = '#ffd740';
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(x - 34, top + H * 0.22);
  ctx.lineTo(x + 34, top + H * 0.22);
  ctx.lineTo(x + 92, foot);
  for (let i = 6; i >= 0; i--) ctx.lineTo(x - 92 + (i * 184) / 6, foot - (i % 2 ? 22 : 0) + Math.sin(time * 4 + i) * 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 4;
  ctx.stroke();
  // A rune stripe down the front.
  ctx.fillStyle = two ? '#ff1744' : '#b388ff';
  ctx.fillRect(x - 6, top + H * 0.3, 12, H * 0.62);
  // Hood and the dark face with glowing eyes.
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.ellipse(x, top + H * 0.16, 44, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0a0414';
  ctx.beginPath();
  ctx.ellipse(x, top + H * 0.18 + 6, 30, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  const eye = tired ? 'rgba(255,255,255,0.35)' : two ? '#ff1744' : '#ea80fc';
  ctx.fillStyle = eye;
  ctx.shadowColor = eye;
  ctx.shadowBlur = tired ? 0 : 16;
  const ey = top + H * 0.18 + 4;
  if (tired) {
    ctx.fillRect(x - 17, ey, 12, 3);
    ctx.fillRect(x + 5, ey, 12, 3);
  } else {
    ctx.beginPath();
    ctx.ellipse(x - 11, ey, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.ellipse(x + 11, ey, 6, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  // Crown of floating runes.
  if (!tired) {
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 5; i++) {
      const a = time * 1.5 + (i * Math.PI * 2) / 5;
      ctx.fillStyle = `rgba(255,215,64,${0.6 + 0.4 * Math.sin(a)})`;
      ctx.fillText('ᛟᛉᛞᛝᛗ'[i], x + Math.cos(a) * 58, top + H * 0.02 + Math.sin(a) * 12);
    }
  } else {
    // Tired: sweat drops and a sigh.
    ctx.font = '28px system-ui';
    ctx.fillText('💦', x + 50, top + 10 + Math.sin(time * 4) * 4);
  }
  // Staff with an orb.
  const sx = x + 78;
  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(sx, foot - 10);
  ctx.lineTo(sx + (tired ? 30 : 0), top + H * 0.05);
  ctx.stroke();
  const orb = ctx.createRadialGradient(sx + (tired ? 30 : 0), top + H * 0.03, 2, sx + (tired ? 30 : 0), top + H * 0.03, 24);
  orb.addColorStop(0, '#ffffff');
  orb.addColorStop(0.5, two ? '#ff1744' : '#e040fb');
  orb.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(sx + (tired ? 30 : 0), top + H * 0.03, 24, 0, Math.PI * 2);
  ctx.fill();
  // The Forbidden Tome, open and floating in front of him.
  const bx = x - 80;
  const by = top + H * 0.45 + Math.sin(time * 2.5) * 6 + (tired ? 60 : 0);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(tired ? 0.9 : -0.15);
  ctx.fillStyle = '#4a148c';
  ctx.fillRect(-46, -30, 92, 60);
  ctx.fillStyle = '#fff8e1';
  ctx.fillRect(-42, -26, 40, 52);
  ctx.fillRect(2, -26, 40, 52);
  ctx.fillStyle = two ? '#ff1744' : '#7c4dff';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-38, -20 + i * 9, 30, 2);
    ctx.fillRect(6, -20 + i * 9, 30, 2);
  }
  ctx.restore();
  ctx.restore();
}

/** Screen-space: the white flash, the bomb countdown and what he is up to. */
export function drawPhylHud(ctx: Ctx, g: Game, vw: number, vh: number) {
  const p = g.phy!;
  if (p.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, p.flash)})`;
    ctx.fillRect(0, 0, vw, vh);
  }
  if (!p.boss.alive) return;
  let text = '';
  let color = '#ffffff';
  if (p.st === 'bomb') {
    text = `⚠️ ${t('phyRun', { n: Math.max(0, Math.ceil(p.t)) })}`;
    color = Math.sin(g.time * 12) > 0 ? '#ff1744' : '#ffeb3b';
  } else if (p.st === 'tired') {
    text = `😮‍💨 ${t('phyHitNow', { n: Math.max(0, Math.ceil(p.t)) })}`;
    color = '#69f0ae';
  } else if (p.st === 'attack') {
    text = `🛡️ ${t('phyDodge', { n: Math.max(0, Math.ceil(p.t)) })}`;
    color = '#e1bee7';
  }
  if (!text) return;
  const size = Math.round(Math.min(26, Math.max(15, vw / 40)));
  ctx.font = `900 ${size}px "Baloo 2", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  const y = vh - 24 - size;
  ctx.strokeText(text, vw / 2, y, vw - 32);
  ctx.fillStyle = color;
  ctx.fillText(text, vw / 2, y, vw - 32);
  // Bomb: arrows to the two corners.
  if (p.st === 'bomb') {
    ctx.font = `900 ${size * 2}px system-ui`;
    ctx.fillStyle = '#69f0ae';
    const bounce = Math.sin(g.time * 8) * 8;
    ctx.fillText('⬅️', 40 + bounce, vh / 2);
    ctx.fillText('➡️', vw - 40 - bounce, vh / 2);
  }
}
