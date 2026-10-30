import { t } from '../i18n';
import { EVENT_ICON, type EventsState } from './events';
import type { Game } from './game';
import { ZOMBIE_COLOR } from './infection';
import type { MapProp } from './types';

type Ctx = CanvasRenderingContext2D;

/*
 * Pictures for the two new fun modes: Stickman Infection's town (sky, houses, trees, cars...), its clock and map,
 * and Random Events (the banner, the blackout, rising lava, and rocks and bombs falling from the sky).
 */

const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

const FONT = (w: number, px: number) => `${w} ${px}px "Baloo 2", system-ui, sans-serif`;

/** The town's evening sky: a big moon, and rows of houses far away. Returns false for other maps. */
export function drawFunDeco(ctx: Ctx, deco: string, vw: number, vh: number, par: number, time: number): boolean {
  if (deco !== 'infect') return false;
  ctx.fillStyle = 'rgba(255,248,225,0.9)';
  ctx.beginPath();
  ctx.arc(vw * 0.78 - par * 0.02, vh * 0.2, Math.min(vw, vh) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(224,135,106,0.25)';
  ctx.beginPath();
  ctx.arc(vw * 0.78 - par * 0.02 - 14, vh * 0.2 - 8, Math.min(vw, vh) * 0.03, 0, Math.PI * 2);
  ctx.fill();
  // Two rows of houses, the far one darker
  for (const [k, col, speed, base] of [[0, 'rgba(42,34,68,0.55)', 0.15, 0.74], [1, 'rgba(30,24,50,0.8)', 0.3, 0.82]] as [number, string, number, number][]) {
    ctx.fillStyle = col;
    const span = vw + 400;
    for (let i = 0; i < 16; i++) {
      const w = 60 + hash(i + k * 20) * 90;
      const h = vh * (0.12 + hash(i + 5 + k * 20) * 0.22);
      const x = ((i * 110 + hash(i + k) * 60 - par * speed) % span + span) % span - 200;
      ctx.fillRect(x, vh * base - h, w, h + vh);
      // A pointy roof on some, and lit windows
      if (hash(i + 9 + k) > 0.5) {
        ctx.beginPath();
        ctx.moveTo(x - 6, vh * base - h);
        ctx.lineTo(x + w / 2, vh * base - h - 30);
        ctx.lineTo(x + w + 6, vh * base - h);
        ctx.fill();
      }
      ctx.save();
      ctx.fillStyle = `rgba(255,213,79,${0.35 + 0.25 * Math.sin(time * 0.7 + i)})`;
      for (let wy = 0; wy < 3; wy++) if (hash(i * 3 + wy + k) > 0.45) ctx.fillRect(x + 10 + wy * 16, vh * base - h + 14 + wy * 18, 8, 10);
      ctx.restore();
    }
  }
  // Bats flapping across
  ctx.strokeStyle = 'rgba(20,16,32,0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const x = ((time * (30 + i * 9) + hash(i) * vw) % (vw + 100)) - 50;
    const y = vh * (0.15 + hash(i + 3) * 0.25) + Math.sin(time * 2 + i) * 10;
    const f = Math.sin(time * 14 + i) * 5;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - f);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 9, y - f);
    ctx.stroke();
  }
  return true;
}

/** Things in the town you can't stand on: houses behind, trees, lamps, cars, benches, signs, crates and a water tower. */
export function drawProps(ctx: Ctx, props: MapProp[], time: number) {
  for (const [i, p] of props.entries()) {
    const s = p.s ?? 1;
    const { x, y } = p;
    switch (p.k) {
      case 'house': {
        const w = 300 * s;
        const h = 260 * s;
        const wall = ['#8d6e63', '#90a4ae', '#a1887f', '#b0bec5'][i % 4];
        ctx.fillStyle = wall;
        ctx.fillRect(x - w / 2, y - h, w, h);
        ctx.fillStyle = ['#6d4c41', '#546e7a', '#5d4037', '#455a64'][i % 4];
        ctx.beginPath();
        ctx.moveTo(x - w / 2 - 20, y - h);
        ctx.lineTo(x, y - h - 110 * s);
        ctx.lineTo(x + w / 2 + 20, y - h);
        ctx.fill();
        ctx.fillStyle = `rgba(255,213,79,${0.6 + 0.2 * Math.sin(time + i)})`;
        for (const wx of [-0.3, 0.15]) ctx.fillRect(x + wx * w, y - h * 0.75, 50 * s, 50 * s);
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(x - 25 * s, y - 90 * s, 50 * s, 90 * s);
        break;
      }
      case 'building': {
        const w = p.w ?? 200;
        const h = p.h ?? 300;
        ctx.fillStyle = ['#5d4a6e', '#4e5d73', '#6d5148', '#53606b'][i % 4];
        ctx.fillRect(x, y - h, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y - h, w, 12);
        // Rows of windows, some lit
        for (let wy = y - h + 40; wy < y - 110; wy += 80)
          for (let wx = x + 26; wx < x + w - 50; wx += 70) {
            ctx.fillStyle = hash(wx * 0.37 + wy) > 0.45 ? `rgba(255,213,79,${0.65 + 0.2 * Math.sin(time + wx)})` : 'rgba(20,20,40,0.6)';
            ctx.fillRect(wx, wy, 34, 40);
          }
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(x + w / 2 - 28, y - 90, 56, 90);
        break;
      }
      case 'tree':
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x - 10 * s, y - 120 * s, 20 * s, 120 * s);
        ctx.fillStyle = '#2e7d32';
        for (const [dx, dy, r] of [[0, -170, 70], [-50, -130, 50], [50, -130, 50], [0, -230, 50]]) {
          ctx.beginPath();
          ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'bush':
        ctx.fillStyle = '#388e3c';
        for (const dx of [-28, 0, 28]) {
          ctx.beginPath();
          ctx.arc(x + dx * s, y - 24 * s, 30 * s, Math.PI, 0);
          ctx.fill();
        }
        break;
      case 'lamp':
        ctx.strokeStyle = '#37474f';
        ctx.lineWidth = 6;
        line(ctx, x, y, x, y - 190 * s);
        line(ctx, x, y - 190 * s, x + 30 * s, y - 190 * s);
        ctx.fillStyle = '#fff59d';
        ctx.beginPath();
        ctx.arc(x + 30 * s, y - 180 * s, 12 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,245,157,0.12)';
        ctx.beginPath();
        ctx.moveTo(x + 30 * s, y - 180 * s);
        ctx.lineTo(x - 50 * s, y);
        ctx.lineTo(x + 110 * s, y);
        ctx.fill();
        break;
      case 'car': {
        const col = ['#e53935', '#1e88e5', '#fdd835', '#43a047'][i % 4];
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(x - 90 * s, y - 60 * s, 180 * s, 42 * s, 12 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x - 50 * s, y - 95 * s, 100 * s, 40 * s, 12 * s);
        ctx.fill();
        ctx.fillStyle = '#b3e5fc';
        ctx.fillRect(x - 40 * s, y - 88 * s, 36 * s, 26 * s);
        ctx.fillRect(x + 4 * s, y - 88 * s, 36 * s, 26 * s);
        ctx.fillStyle = '#212121';
        for (const dx of [-55, 55]) {
          ctx.beginPath();
          ctx.arc(x + dx * s, y - 16 * s, 17 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'bench':
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(x - 60, y - 40, 120, 10);
        ctx.fillRect(x - 60, y - 70, 120, 10);
        ctx.fillStyle = '#424242';
        ctx.fillRect(x - 55, y - 40, 8, 40);
        ctx.fillRect(x + 47, y - 40, 8, 40);
        break;
      case 'fence':
        ctx.fillStyle = '#efebe9';
        for (let k = 0; k < 8; k++) ctx.fillRect(x - 160 + k * 40, y - 70, 14, 70);
        ctx.fillRect(x - 160, y - 54, 300, 10);
        ctx.fillRect(x - 160, y - 24, 300, 10);
        break;
      case 'sign':
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x - 5, y - 130, 10, 130);
        ctx.fillStyle = '#ffca28';
        ctx.beginPath();
        ctx.roundRect(x - 60, y - 170, 120, 54, 8);
        ctx.fill();
        ctx.fillStyle = '#3e2723';
        ctx.font = FONT(900, 28);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i % 2 ? '⬆️ 🧗' : '⚠️ 🧟', x, y - 143);
        break;
      case 'crate':
        ctx.fillStyle = '#a1662f';
        ctx.strokeStyle = '#6d4c41';
        ctx.lineWidth = 4;
        ctx.fillRect(x - 50 * s, y - 100 * s, 100 * s, 100 * s);
        ctx.strokeRect(x - 50 * s, y - 100 * s, 100 * s, 100 * s);
        line(ctx, x - 50 * s, y - 100 * s, x + 50 * s, y);
        line(ctx, x + 50 * s, y - 100 * s, x - 50 * s, y);
        break;
      case 'tower':
        ctx.strokeStyle = '#546e7a';
        ctx.lineWidth = 6;
        for (const dx of [-50, 50]) line(ctx, x + dx * s, y, x + dx * 0.6 * s, y - 220 * s);
        line(ctx, x - 45 * s, y - 80 * s, x + 45 * s, y - 150 * s);
        line(ctx, x + 45 * s, y - 80 * s, x - 45 * s, y - 150 * s);
        ctx.fillStyle = '#78909c';
        ctx.beginPath();
        ctx.roundRect(x - 60 * s, y - 330 * s, 120 * s, 110 * s, 14 * s);
        ctx.fill();
        ctx.fillStyle = '#90a4ae';
        ctx.beginPath();
        ctx.moveTo(x - 66 * s, y - 330 * s);
        ctx.lineTo(x, y - 380 * s);
        ctx.lineTo(x + 66 * s, y - 330 * s);
        ctx.fill();
        break;
    }
  }
}

// ---------- Stickman Infection ----------

/** The clock, how many humans and zombies are left, and a little map of the town. */
export function drawInfectionHud(ctx: Ctx, g: Game, vw: number) {
  const inf = g.inf!;
  const people = g.fighters.filter((f) => !f.boss && !f.cloneOf);
  const zombies = people.filter((f) => f.zombie).length;
  const humans = people.length - zombies;
  const secs = Math.ceil(inf.pick > 0 ? inf.pick : inf.t);
  const text = inf.pick > 0 ? `🧟❓ ${secs}` : `⏱ ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}   🧍 ${humans}   🧟 ${zombies}`;
  ctx.font = FONT(900, 18);
  const w = ctx.measureText(text).width + 28;
  const x = vw / 2 - w / 2;
  ctx.fillStyle = inf.pick <= 0 && inf.t < 15 ? 'rgba(198,40,40,0.85)' : 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(x, 52, w, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, vw / 2, 68);
  // The little map, top left
  const mw = Math.min(200, vw * 0.28);
  const mh = mw * (g.map.h / g.map.w);
  const mx = 10;
  const my = 10;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 8);
  ctx.fill();
  const k = mw / g.map.w;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const p of g.map.platforms) ctx.fillRect(mx + p.x * k, my + p.y * k, Math.max(1, p.w * k), Math.max(1, p.h * k));
  for (const [i, f] of g.fighters.entries()) {
    if (!f.alive || f.boss) continue;
    const mine = g.focus.includes(i);
    ctx.fillStyle = f.zombie ? ZOMBIE_COLOR : (inf.colors.get(f) ?? f.color);
    ctx.beginPath();
    ctx.arc(mx + f.x * k, my + (f.y - 40) * k, mine ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fill();
    if (mine) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

// ---------- Random Events ----------

/** Rising lava and things falling from the sky (in the world, before the HUD). */
export function drawEventsWorld(ctx: Ctx, g: Game, time: number) {
  const ev = g.ev!;
  if (ev.lavaY < g.map.h + 200) {
    const top = ev.lavaY;
    const grad = ctx.createLinearGradient(0, top, 0, top + 300);
    grad.addColorStop(0, '#ff9100');
    grad.addColorStop(0.2, '#e65100');
    grad.addColorStop(1, '#3e0f00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-800, g.map.h + 2000);
    for (let x = -800; x <= g.map.w + 800; x += 40) ctx.lineTo(x, top + Math.sin(x * 0.02 + time * 3) * 8);
    ctx.lineTo(g.map.w + 800, g.map.h + 2000);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,235,59,0.7)';
    for (let i = 0; i < 20; i++) {
      const bx = hash(i) * g.map.w;
      const k = (time * 0.7 + hash(i + 4)) % 1;
      ctx.beginPath();
      ctx.arc(bx, top + 30 - k * 50, 6 * (1 - k), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const r of ev.fallers) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    if (r.kind === 'rock') {
      ctx.fillStyle = '#8d8d8d';
      ctx.strokeStyle = '#5f5f5f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const rr = r.r * (0.75 + hash(k + r.r) * 0.35);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(0, 0, r.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 3;
      line(ctx, 0, -r.r, 4, -r.r - 9);
      ctx.fillStyle = Math.sin(time * 30) > 0 ? '#ffeb3b' : '#ff5722';
      ctx.beginPath();
      ctx.arc(4, -r.r - 11, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // A warning shadow on the way down
    if (r.y < 0) {
      ctx.fillStyle = 'rgba(255,82,82,0.6)';
      ctx.beginPath();
      ctx.moveTo(r.x, 20);
      ctx.lineTo(r.x - 12, 0);
      ctx.lineTo(r.x + 12, 0);
      ctx.fill();
    }
  }
}

/** Blackout: the screen goes dark, with a little light around each stickman. */
export function drawBlackout(ctx: Ctx, g: Game, vw: number, vh: number) {
  const ev = g.ev!;
  const fade = Math.min(1, (ev.dur - ev.t) / 0.6, ev.t / 0.6);
  const z = g.cam.zoom;
  ctx.save();
  ctx.globalAlpha = 0.94 * fade;
  ctx.fillStyle = '#05030a';
  ctx.beginPath();
  ctx.rect(0, 0, vw, vh);
  for (const f of g.fighters) {
    if (!f.alive) continue;
    const sx = vw / 2 + (f.x - g.cam.x) * z;
    const sy = vh / 2 + (f.cy - g.cam.y) * z;
    const r = (f.human ? 130 : 80) * z * f.scale;
    ctx.moveTo(sx + r, sy);
    ctx.arc(sx, sy, r, 0, Math.PI * 2, true);
  }
  ctx.fill('evenodd');
  ctx.restore();
}

/** The banner: what is going on and for how long, or when the next one comes. */
export function drawEventsHud(ctx: Ctx, ev: EventsState, vw: number) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (!ev.cur) {
    const text = `🌪️ ${t('evNext', { n: Math.ceil(ev.next) })}`;
    ctx.font = FONT(800, 15);
    const w = ctx.measureText(text).width + 24;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(vw / 2 - w / 2, 52, w, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, vw / 2, 65);
    return;
  }
  const text = `${EVENT_ICON[ev.cur]} ${t(`ev.${ev.cur}`)}  ${Math.ceil(ev.t)}`;
  ctx.font = FONT(900, 18);
  const w = Math.max(180, ctx.measureText(text).width + 30);
  ctx.fillStyle = 'rgba(74,20,140,0.85)';
  ctx.beginPath();
  ctx.roundRect(vw / 2 - w / 2, 52, w, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#ffd740';
  ctx.fillRect(vw / 2 - w / 2 + 14, 80, (w - 28) * Math.max(0, ev.t / ev.dur), 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, vw / 2, 68);
}
