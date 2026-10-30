import { GRID, ITEM, KITCHEN_SLOTS, STATION_ICON, seatsOf, type ChefSave, type StationId } from './data';
import {
  CELL,
  DOOR,
  DRIVE_LANE,
  GRID_X,
  KITCHEN,
  PASS,
  STAIRS,
  STATION_W,
  WINDOW,
  WORLD,
  cellCenter,
  gridY,
  seatOffsets,
  stationX,
  tableSize,
  type ChefDay,
  type Party,
  type Worker,
} from './sim';

type Ctx = CanvasRenderingContext2D;

function emoji(ctx: Ctx, text: string, x: number, y: number, size: number) {
  ctx.font = `${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** The view: the whole floor fits the screen (below `top`, where the order tickets go). */
export function chefView(vw: number, vh: number, top = 0) {
  const z = Math.min(vw / WORLD.w, (vh - top) / WORLD.h);
  return { z, ox: (vw - WORLD.w * z) / 2, oy: top + (vh - top - WORLD.h * z) / 2 };
}

/**
 * One floor of the restaurant from above: the floor, walls, the kitchen and drive-thru (ground floor), the stairs,
 * and every table and decoration on the grid. `build` shows the empty spots.
 */
export function drawFloor(ctx: Ctx, save: ChefSave, floor: number, time: number, build: boolean, glow = -1, busy?: Set<number>) {
  const ground = floor === 0;
  // Outside: grass, or the drive-thru lane on the ground floor
  ctx.fillStyle = '#7cb342';
  ctx.fillRect(-600, -600, WORLD.w + 1200, WORLD.h + 1200);
  if (ground) {
    ctx.fillStyle = save.drive ? '#607d8b' : '#8d9e72';
    ctx.fillRect(0, -600, DRIVE_LANE, WORLD.h + 1200);
    if (save.drive) {
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 4;
      ctx.setLineDash([26, 22]);
      ctx.beginPath();
      ctx.moveTo(DRIVE_LANE / 2, -600);
      ctx.lineTo(DRIVE_LANE / 2, WORLD.h + 600);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // The floor: wood planks in the dining room
  const left = DRIVE_LANE + 10;
  ctx.fillStyle = floor === 0 ? '#c8a27a' : floor === 1 ? '#b98f6a' : '#d0b089';
  ctx.fillRect(left, 0, WORLD.w - left, WORLD.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  for (let y = 0; y < WORLD.h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(WORLD.w, y);
    ctx.stroke();
    for (let x = left + ((y / 40) % 2) * 90; x < WORLD.w; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 40);
      ctx.stroke();
    }
  }
  // Rugs under the grid on upper floors
  if (!ground) {
    ctx.fillStyle = floor === 1 ? 'rgba(198,40,40,0.18)' : 'rgba(21,101,192,0.16)';
    rr(ctx, GRID_X - 10, gridY(floor) - 10, GRID.cols * CELL + 20, GRID.rows[floor] * CELL + 20, 30);
    ctx.fill();
  }
  if (ground) {
    // Kitchen: white tiles along the top
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(left, 0, WORLD.w - left, KITCHEN.bottom);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    for (let x = left; x < WORLD.w; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, KITCHEN.bottom);
      ctx.stroke();
    }
    for (let y = 0; y < KITCHEN.bottom; y += 36) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(WORLD.w, y);
      ctx.stroke();
    }
    // The low counter between the kitchen and the dining room (open in the middle)
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(left, KITCHEN.bottom, 940, 14);
    ctx.fillRect(1330, KITCHEN.bottom, WORLD.w - 1330, 14);
  }
  // Walls
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(left - 12, 0, 12, WORLD.h);
  ctx.fillRect(WORLD.w - 12, 0, 12, WORLD.h);
  ctx.fillRect(left - 12, 0, WORLD.w - left + 12, 14);
  ctx.fillRect(left - 12, WORLD.h - 12, WORLD.w - left + 12, 12);
  // Windows on the side walls
  ctx.fillStyle = '#81d4fa';
  for (let y = ground ? 330 : 160; y < WORLD.h - 120; y += 220) {
    ctx.fillRect(left - 10, y, 8, 90);
    ctx.fillRect(WORLD.w - 10, y, 8, 90);
  }
  if (ground) {
    // The front door (a gap in the bottom wall with a mat)
    ctx.fillStyle = '#c8a27a';
    ctx.fillRect(DOOR.x - 60, WORLD.h - 14, 120, 16);
    ctx.fillStyle = '#6d4c41';
    rr(ctx, DOOR.x - 50, WORLD.h - 48, 100, 30, 6);
    ctx.fill();
    emoji(ctx, '🚪', DOOR.x, WORLD.h - 33, 22);
    // The drive-thru window in the left wall
    ctx.fillStyle = save.drive ? '#4fc3f7' : '#b0bec5';
    ctx.fillRect(WINDOW.x - 4, WINDOW.y - 40, 16, 80);
    if (save.drive) emoji(ctx, '🚗', WINDOW.x + 30, WINDOW.y - 60, 22);
  }
  drawStairs(ctx, floor, save.grid.length);

  if (ground) {
    for (let i = 0; i < KITCHEN_SLOTS; i++) {
      const id = (save.kitchen[i] ?? null) as StationId | null;
      const x = stationX(i);
      if (!id) {
        if (build) slotBox(ctx, x - STATION_W / 2 + 4, KITCHEN.y, STATION_W - 8, KITCHEN.h);
        continue;
      }
      drawStation(ctx, id, x, time, i === glow, busy?.has(i) ?? false);
    }
    // The pass: a counter where finished dishes wait
    ctx.fillStyle = '#8d6e63';
    rr(ctx, PASS.x, PASS.y, PASS.w, PASS.h, 10);
    ctx.fill();
    ctx.fillStyle = '#d7ccc8';
    rr(ctx, PASS.x + 8, PASS.y + 8, PASS.w - 16, PASS.h - 16, 8);
    ctx.fill();
    emoji(ctx, '🛎️', PASS.x + PASS.w - 22, PASS.y + 22, 22);
  }

  // Tables and decorations on the grid
  const grid = save.grid[floor] ?? [];
  for (let cell = 0; cell < grid.length; cell++) {
    const id = grid[cell];
    const c = cellCenter(floor, cell);
    if (!id) {
      if (build) slotBox(ctx, c.x - CELL / 2 + 8, c.y - CELL / 2 + 8, CELL - 16, CELL - 16);
      continue;
    }
    const n = seatsOf(id);
    if (n) drawTable(ctx, id, n, c.x, c.y);
    else drawDecor(ctx, id, c.x, c.y, time);
  }
}

function drawStairs(ctx: Ctx, floor: number, floors: number) {
  const { x, y, w, h } = STAIRS;
  if (floors < 2) {
    // No upstairs yet: a locked door.
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    emoji(ctx, '🔒', x + w / 2, y + h / 2, 30);
    return;
  }
  ctx.fillStyle = '#6d4c41';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = '#a1887f';
  for (let k = 0; k < 6; k++) ctx.fillRect(x + 8, y + 8 + k * 16, w - 16, 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 20px "Baloo 2", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Where they go
  const label = [floor < floors - 1 ? `⬆${floor + 2}F` : '', floor > 0 ? `⬇${floor}F` : ''].filter(Boolean).join(' ');
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 4;
  ctx.strokeText(label, x + w / 2, y - 14);
  ctx.fillText(label, x + w / 2, y - 14);
}

function slotBox(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(30,136,229,0.7)';
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(227,242,253,0.35)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.fillStyle = '#1e88e5';
  ctx.font = '800 30px "Baloo 2", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', x + w / 2, y + h / 2);
  ctx.restore();
}

function drawStation(ctx: Ctx, id: StationId, x: number, time: number, glow: boolean, busy: boolean) {
  const w = STATION_W - 8;
  const l = x - w / 2;
  const y = KITCHEN.y;
  const h = KITCHEN.h;
  if (glow) {
    ctx.save();
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 24 + Math.sin(time * 6) * 10;
    ctx.fillStyle = 'rgba(255,235,59,0.5)';
    ctx.fillRect(l - 6, y - 6, w + 12, h + 12);
    ctx.restore();
  }
  ctx.fillStyle = id === 'fridge' ? '#e3f2fd' : id === 'icecream' ? '#fce4ec' : id === 'prep' ? '#bcaaa4' : '#9e9e9e';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  rr(ctx, l, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  if (id === 'grill') {
    ctx.fillStyle = '#424242';
    ctx.fillRect(l + 10, y + 10, w - 20, h - 20);
    ctx.strokeStyle = '#757575';
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(l + 10, y + 10 + k * ((h - 20) / 5));
      ctx.lineTo(l + w - 10, y + 10 + k * ((h - 20) / 5));
      ctx.stroke();
    }
  }
  if (id === 'fryer') {
    ctx.fillStyle = busy ? `rgb(255,${170 + Math.sin(time * 12) * 30},0)` : '#ffb300';
    rr(ctx, l + 12, y + 12, w - 24, h - 24, 6);
    ctx.fill();
  }
  if (id === 'oven') {
    ctx.fillStyle = '#212121';
    rr(ctx, l + 10, y + 10, w - 20, h - 20, 6);
    ctx.fill();
    ctx.fillStyle = busy ? `rgba(255,111,0,${0.5 + Math.sin(time * 8) * 0.3})` : '#5d4037';
    for (const [dx, dy] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) {
      ctx.beginPath();
      ctx.arc(l + w * dx, y + h * dy, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (id === 'prep') {
    ctx.fillStyle = '#efebe9';
    rr(ctx, l + 8, y + 8, w - 16, h - 16, 6);
    ctx.fill();
  }
  if (busy && (id === 'grill' || id === 'fryer')) {
    for (let k = 0; k < 3; k++) {
      const ph = (time + k * 0.33) % 1;
      ctx.fillStyle = `rgba(230,230,230,${0.6 - ph * 0.6})`;
      ctx.beginPath();
      ctx.arc(l + 22 + k * 24, y + h / 2 - ph * 30, 9 + ph * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#000';
  emoji(ctx, STATION_ICON[id], x, y + h / 2, 32);
}

function drawTable(ctx: Ctx, id: string, n: number, x: number, y: number) {
  const size = tableSize(n);
  // Chairs
  ctx.fillStyle = '#6d4c41';
  for (const o of seatOffsets(n)) {
    ctx.beginPath();
    ctx.roundRect(x + o.x - 13, y + o.y - 13, 26, 26, 6);
    ctx.fill();
  }
  // Table top with a cloth
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  rr(ctx, x - size.w / 2 + 4, y - size.h / 2 + 5, size.w, size.h, 10);
  ctx.fill();
  ctx.fillStyle = '#8d6e63';
  rr(ctx, x - size.w / 2, y - size.h / 2, size.w, size.h, 10);
  ctx.fill();
  ctx.fillStyle = id === 'table8' ? '#ffd54f' : id === 'table6' ? '#81c784' : id === 'bigtable' ? '#e57373' : '#ffffff';
  rr(ctx, x - size.w / 2 + 5, y - size.h / 2 + 5, size.w - 10, size.h - 10, 8);
  ctx.fill();
}

function drawDecor(ctx: Ctx, id: string, x: number, y: number, time: number) {
  if (id === 'fountain') {
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.arc(x, y, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.arc(x, y, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(x, y, ((time * 20 + k * 14) % 40) + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + 26, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#000';
  emoji(ctx, ITEM[id]?.icon ?? '?', x, y, id === 'aquarium' || id === 'piano' || id === 'fountain' ? 58 : 50);
}

/** A stickman seen from above: head, shoulders and swinging arms. */
function topStick(ctx: Ctx, x: number, y: number, s: number, color: string, walk: number, dir: number, extra: 'chef' | 'waiter' | 'vip' | 'player' | null) {
  const px = -Math.sin(dir);
  const py = Math.cos(dir);
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 5, 16 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = 6 * s;
  // Shoulders
  ctx.beginPath();
  ctx.moveTo(x + px * 14 * s, y + py * 14 * s);
  ctx.lineTo(x - px * 14 * s, y - py * 14 * s);
  ctx.stroke();
  // Arms swing forward and back
  ctx.lineWidth = 4.5 * s;
  const sw = Math.sin(walk) * 10 * s;
  for (const side of [1, -1]) {
    const sx = x + px * 14 * s * side;
    const sy = y + py * 14 * s * side;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + fx * (8 * s + sw * side), sy + fy * (8 * s + sw * side));
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  if (extra === 'chef' || extra === 'player') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#bdbdbd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (extra === 'vip') {
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(x, y, 13 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(x, y, 8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (extra === 'waiter') {
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(x + fx * 12 * s, y + fy * 12 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function bubble(ctx: Ctx, x: number, y: number, text: string, mood: number, time: number, w = 52) {
  const shake = mood < 0.25 ? Math.sin(time * 30) * 2 : 0;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  rr(ctx, x - w / 2 + shake, y - 26, w, 44, 12);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 6 + shake, y + 18);
  ctx.lineTo(x + shake, y + 28);
  ctx.lineTo(x + 6 + shake, y + 18);
  ctx.fill();
  ctx.fillStyle = '#000';
  emoji(ctx, text, x + shake, y - 4, text.length > 4 ? 18 : 24);
  // Patience: green, then yellow, then red
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x - w / 2 + 4 + shake, y + 10, w - 8, 5);
  ctx.fillStyle = mood > 0.5 ? '#66bb6a' : mood > 0.25 ? '#ffca28' : '#ef5350';
  ctx.fillRect(x - w / 2 + 4 + shake, y + 10, (w - 8) * mood, 5);
}

/** Everyone on this floor, the drive-thru cars, dishes on the pass and the floating words. */
export function drawPeople(ctx: Ctx, day: ChefDay, floor: number, time: number) {
  if (floor === 0) {
    for (const c of day.cars) {
      const x = DRIVE_LANE / 2;
      const y = c.y;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      rr(ctx, x - 40, y - 64, 86, 140, 18);
      ctx.fill();
      ctx.fillStyle = c.color;
      rr(ctx, x - 44, y - 70, 88, 140, 18);
      ctx.fill();
      ctx.fillStyle = '#b3e5fc';
      rr(ctx, x - 34, y - 52, 68, 30, 8);
      ctx.fill();
      rr(ctx, x - 34, y + 34, 68, 22, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      rr(ctx, x - 34, y - 18, 68, 48, 6);
      ctx.fill();
      if (c.state === 'waiting') bubble(ctx, x + 60, y - 50, '❗', c.patience / c.max, time);
      if (c.state === 'ordered') bubble(ctx, x + 60, y - 50, c.dish.icon, c.patience / c.max, time);
    }
    // Ready dishes on the pass
    const ready = day.tickets.filter((t) => t.step >= t.dish.steps.length && !day.workers.some((w) => w.carrying === t));
    ready.slice(0, 12).forEach((t, k) => {
      const px = PASS.x + 26 + (k % 5) * 28;
      const py = PASS.y + 30 + Math.floor(k / 5) * 26;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();
      emoji(ctx, t.dish.icon, px, py, 18);
    });
  }
  for (const g of day.guests) if (g.floor === floor || (g.state !== 'walkin' && g.state !== 'leaving' && g.table.floor === floor)) drawParty(ctx, day, g, floor, time);
  for (const w of day.workers) if (w.floor === floor) drawWorker(ctx, w);
  for (const p of day.pops) {
    if (p.floor !== floor) continue;
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.6);
    ctx.font = '800 26px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeText(p.text, p.x, p.y - p.t * 40);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - p.t * 40);
  }
  ctx.globalAlpha = 1;
}

function drawParty(ctx: Ctx, day: ChefDay, g: Party, floor: number, time: number) {
  const seated = g.state === 'waiting' || g.state === 'ordered';
  const c = cellCenter(g.table.floor, g.table.cell);
  g.members.forEach((m, i) => {
    const s = m.kid ? 0.75 : 1;
    let x: number;
    let y: number;
    let dir: number;
    if (seated) {
      const at = day.seat(g, i);
      x = at.x;
      y = at.y;
      dir = Math.atan2(c.y - y, c.x - x);
    } else {
      if (g.floor !== floor) return;
      // Walking in a little line behind the first one.
      x = g.x - Math.cos(g.dir) * i * 30 + (i % 2 ? 12 : -12) * Math.sin(g.dir);
      y = g.y - Math.sin(g.dir) * i * 30;
      dir = g.dir;
    }
    const color = g.state === 'leaving' && g.mood <= 0 ? '#e53935' : m.color;
    topStick(ctx, x, y, s, color, seated ? 0 : g.walk + i, dir, g.vip && i === 0 ? 'vip' : null);
    if (!seated) return;
    if (m.eatT > 0 || m.done) {
      // Their plate on the table
      const px = x + (c.x - x) * 0.45;
      const py = y + (c.y - y) * 0.45;
      if (m.eatT > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fill();
        emoji(ctx, m.dish.icon, px, py, 16);
      }
    }
  });
  if (!seated) return;
  const top = c.y - CELL / 2 + 4;
  if (g.state === 'waiting') {
    bubble(ctx, c.x, top, g.round > 1 ? '🔁❗' : '❗', g.mood, time, g.round > 1 ? 64 : 52);
    return;
  }
  // Ordered: what's still coming (up to 4 shown)
  const waiting = g.members.filter((m) => m.ticket).map((m) => (m.kid ? '🧸' : '') + m.dish.icon);
  if (waiting.length) {
    const shown = waiting.slice(0, 4).join('') + (waiting.length > 4 ? '…' : '');
    bubble(ctx, c.x, top, shown, g.mood, time, Math.max(52, 26 + Math.min(4, waiting.length) * 26));
    // A dish of theirs is ready on the pass: a little bell.
    if (day.tickets.some((t) => t.guest === g && t.step >= t.dish.steps.length)) emoji(ctx, '🔔', c.x + CELL / 2 - 14, top - 14, 20);
  } else emoji(ctx, '😋', c.x, top, 24);
}

function drawWorker(ctx: Ctx, w: Worker) {
  const color = w.role === 'player' ? '#1e88e5' : w.role === 'waiter' ? '#455a64' : '#6d4c41';
  topStick(ctx, w.x, w.y, 1.1, color, w.walk, w.dir, w.role === 'player' ? 'player' : w.role === 'chef' ? 'chef' : 'waiter');
  if (w.carrying) {
    const hx = w.x + Math.cos(w.dir) * 22;
    const hy = w.y + Math.sin(w.dir) * 22;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx, hy, 14, 0, Math.PI * 2);
    ctx.fill();
    emoji(ctx, w.carrying.dish.icon, hx, hy, 20);
  }
  if (w.busy > 0 && w.busy !== Infinity) emoji(ctx, w.role === 'chef' ? '🍳' : '📝', w.x, w.y - 36, 22);
  if (w.role === 'player') {
    ctx.font = '800 16px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText('YOU', w.x, w.y - 30);
    ctx.fillStyle = '#1e88e5';
    ctx.fillText('YOU', w.x, w.y - 30);
  }
}

/** Room at the top of the day screen for the order tickets. */
export const TICKETS_H = 70;

/** Top bar inside the canvas: the tickets (orders) waiting to be cooked, oldest first. */
export function drawTickets(ctx: Ctx, day: ChefDay, vw: number) {
  let x = 10;
  for (const t of day.tickets.slice(0, 14)) {
    const ready = t.step >= t.dish.steps.length;
    ctx.fillStyle = ready ? '#c8e6c9' : '#fffde7';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    rr(ctx, x, 8, 64, 54, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000';
    emoji(ctx, t.dish.icon, x + 20, 30, 22);
    emoji(ctx, ready ? '✅' : STATION_ICON[t.dish.steps[t.step].station], x + 46, 30, 16);
    for (let k = 0; k < t.dish.steps.length; k++) {
      ctx.fillStyle = k < t.step ? '#43a047' : 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 8 + k * 14, 50, 10, 5);
    }
    // Where it goes: the drive-thru, or which floor
    if (t.guest.kind === 'car') emoji(ctx, '🚗', x + 54, 50, 12);
    else if (day.floors > 1) {
      ctx.font = '800 11px "Baloo 2", system-ui, sans-serif';
      ctx.fillStyle = '#5d4037';
      ctx.fillText(`${t.guest.table.floor + 1}F`, x + 54, 50);
    }
    x += 70;
    // Leave room for the clock and cash on the right.
    if (x > vw - 330) break;
  }
}
