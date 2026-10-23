import { ITEM, STATION_ICON, seatsOf, type ChefSave, type StationId } from './data';
import { DINING_X, DOOR_X, DRIVE_X, KITCHEN_X, PASS_W, PASS_X, SLOT_W, TABLE_W, WORLD, seatX, stationX, tableX, type ChefDay, type Customer, type Worker } from './sim';

type Ctx = CanvasRenderingContext2D;

/** Where the decorations hang on the dining room wall. */
export const decorX = (i: number) => DINING_X + i * TABLE_W + TABLE_W / 2;
export const DECOR_Y = 170;

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function emoji(ctx: Ctx, text: string, x: number, y: number, size: number) {
  ctx.font = `${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/** The view: the whole restaurant fits the screen (wider screens see a bit more around it). */
export function chefView(vw: number, vh: number) {
  const z = Math.min(vw / WORLD.w, vh / (WORLD.h + 20));
  return { z, ox: (vw - WORLD.w * z) / 2, oy: (vh - WORLD.h * z) / 2 + 10 * z };
}

/** The restaurant: walls, the kitchen stations, the pass, tables and decorations. `build` shows the empty slots. */
export function drawRoom(ctx: Ctx, save: ChefSave, time: number, build: boolean, glow = -1, busy?: Set<number>) {
  const F = WORLD.floor;
  // Outside (drive-thru lane) on the left
  ctx.fillStyle = save.drive ? '#90a4ae' : '#a5d6a7';
  ctx.fillRect(-400, 0, KITCHEN_X - 10 + 400, WORLD.h);
  ctx.fillStyle = '#78909c';
  ctx.fillRect(-400, F, KITCHEN_X + 390, WORLD.h - F);
  // Kitchen: white tiles
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(KITCHEN_X - 10, 0, PASS_X - KITCHEN_X + 10, F);
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let x = KITCHEN_X; x < PASS_X; x += 36) line(ctx, x, 0, x, F);
  for (let y = 0; y < F; y += 36) line(ctx, KITCHEN_X - 10, y, PASS_X, y);
  // Dining room: warm wallpaper with stripes
  ctx.fillStyle = '#ffe0b2';
  ctx.fillRect(PASS_X, 0, WORLD.w - PASS_X + 400, F);
  ctx.fillStyle = 'rgba(255,183,77,0.35)';
  for (let x = PASS_X; x < WORLD.w + 400; x += 60) ctx.fillRect(x, 0, 24, F);
  // Floors
  ctx.fillStyle = '#bdbdbd';
  ctx.fillRect(KITCHEN_X - 10, F, PASS_X - KITCHEN_X + 10, WORLD.h - F);
  ctx.fillStyle = '#a1887f';
  ctx.fillRect(PASS_X, F, WORLD.w - PASS_X + 400, WORLD.h - F);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  for (let x = PASS_X; x < WORLD.w + 400; x += 50) line(ctx, x, F, x, WORLD.h);
  // Drive-thru window
  ctx.fillStyle = save.drive ? '#4fc3f7' : '#cfd8dc';
  ctx.fillRect(KITCHEN_X - 14, F - 200, 18, 120);
  if (save.drive) {
    ctx.fillStyle = '#ffca28';
    ctx.fillRect(DRIVE_X - 50, F - 260, 100, 34);
    ctx.fillStyle = '#3e2723';
    ctx.font = '800 18px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DRIVE', DRIVE_X, F - 243);
  }
  // Front door
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(DOOR_X - 10, F - 200, 70, 200);
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.arc(DOOR_X + 6, F - 100, 5, 0, Math.PI * 2);
  ctx.fill();
  emoji(ctx, '🚪', DOOR_X + 25, F - 230, 30);

  // Kitchen stations
  for (let i = 0; i < save.kitchen.length; i++) {
    const id = save.kitchen[i] as StationId | null;
    const x = stationX(i);
    if (!id) {
      if (build) slotBox(ctx, x - SLOT_W / 2 + 6, F - 130, SLOT_W - 12, 130);
      continue;
    }
    drawStation(ctx, id, x, F, time, i === glow, busy?.has(i) ?? false);
  }
  // The pass: a counter where finished dishes wait
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(PASS_X, F - 110, PASS_W, 110);
  ctx.fillStyle = '#d7ccc8';
  ctx.fillRect(PASS_X - 6, F - 118, PASS_W + 12, 12);
  emoji(ctx, '🛎️', PASS_X + PASS_W - 14, F - 132, 20);

  // Decorations
  for (let i = 0; i < save.decor.length; i++) {
    const id = save.decor[i];
    const x = decorX(i);
    if (!id) {
      if (build) slotBox(ctx, x - 34, DECOR_Y - 34, 68, 68);
      continue;
    }
    emoji(ctx, ITEM[id].icon, x, id === 'plant' || id === 'flowers' || id === 'aquarium' ? F - 150 : DECOR_Y, id === 'aquarium' ? 54 : 46);
  }
  // Tables and chairs
  for (let i = 0; i < save.tables.length; i++) {
    const id = save.tables[i];
    const x = tableX(i);
    if (!id) {
      if (build) slotBox(ctx, x - TABLE_W / 2 + 6, F - 90, TABLE_W - 12, 90);
      continue;
    }
    drawTable(ctx, id, i, x, F);
  }
}

function slotBox(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(30,136,229,0.8)';
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(227,242,253,0.5)';
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

function drawStation(ctx: Ctx, id: StationId, x: number, F: number, time: number, glow: boolean, busy: boolean) {
  const w = SLOT_W - 12;
  const left = x - w / 2;
  if (glow) {
    ctx.save();
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 24 + Math.sin(time * 6) * 10;
    ctx.fillStyle = 'rgba(255,235,59,0.45)';
    ctx.fillRect(left - 6, F - 140, w + 12, 140);
    ctx.restore();
  }
  const body = id === 'fridge' ? '#e3f2fd' : id === 'icecream' ? '#fce4ec' : id === 'prep' ? '#bcaaa4' : '#9e9e9e';
  const tall = id === 'fridge' ? 170 : id === 'icecream' ? 150 : 100;
  ctx.fillStyle = body;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(left, F - tall, w, tall, 6);
  ctx.fill();
  ctx.stroke();
  if (id === 'grill' || id === 'fryer') {
    // Hot top
    ctx.fillStyle = id === 'grill' ? '#424242' : '#ffb300';
    ctx.fillRect(left + 4, F - tall - 6, w - 8, 10);
    if (busy) for (let k = 0; k < 3; k++) {
      ctx.fillStyle = `rgba(200,200,200,${0.5 - ((time + k * 0.3) % 1) * 0.5})`;
      ctx.beginPath();
      ctx.arc(left + 16 + k * 20, F - tall - 16 - ((time + k * 0.3) % 1) * 40, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (id === 'oven') {
    ctx.fillStyle = '#212121';
    ctx.fillRect(left + 10, F - tall + 20, w - 20, 50);
    ctx.fillStyle = busy ? `rgba(255,111,0,${0.5 + Math.sin(time * 8) * 0.3})` : '#ff8f00';
    ctx.fillRect(left + 14, F - tall + 24, w - 28, 42);
  }
  if (id === 'fridge') {
    ctx.strokeStyle = '#90a4ae';
    line(ctx, left, F - tall * 0.55, left + w, F - tall * 0.55);
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(left + w - 12, F - tall + 20, 5, 30);
    ctx.fillRect(left + w - 12, F - tall * 0.45, 5, 30);
  }
  if (id === 'prep') {
    ctx.fillStyle = '#efebe9';
    ctx.fillRect(left - 2, F - tall - 8, w + 4, 12);
  }
  ctx.fillStyle = '#000';
  emoji(ctx, STATION_ICON[id], x, F - tall - 30, 30);
}

function drawTable(ctx: Ctx, id: string, i: number, x: number, F: number) {
  const n = seatsOf(id);
  const w = n > 2 ? 100 : 70;
  // Chairs
  ctx.fillStyle = '#6d4c41';
  for (let s = 0; s < n; s++) {
    const sx = seatX(i, s, n);
    ctx.fillRect(sx - 9, F - 44, 18, 6);
    ctx.fillRect(sx - 9, F - 44, 4, 44);
    ctx.fillRect(sx + 5, F - 44, 4, 44);
  }
  // Table top with a cloth
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(x - 4, F - 62, 8, 62);
  ctx.fillStyle = id === 'bigtable' ? '#e57373' : '#ffffff';
  ctx.fillRect(x - w / 2, F - 70, w, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x - w / 2, F - 60, w, 4);
}

/** A stickman: guests (kids are small, the VIP food critic wears a top hat), waiters and chefs. */
function stick(ctx: Ctx, x: number, F: number, s: number, color: string, walk: number, facing: number, sitting: boolean, extra: 'chef' | 'waiter' | 'vip' | 'player' | null) {
  const hip = F - (sitting ? 46 : 38) * s;
  const neck = hip - 30 * s;
  const head = neck - 12 * s;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (sitting) {
    ctx.moveTo(x, hip);
    ctx.lineTo(x + facing * 18 * s, hip);
    ctx.lineTo(x + facing * 18 * s, F);
  } else {
    const k = Math.sin(walk) * 12 * s;
    ctx.moveTo(x, hip);
    ctx.lineTo(x - 7 * s + k, F);
    ctx.moveTo(x, hip);
    ctx.lineTo(x + 7 * s - k, F);
  }
  ctx.moveTo(x, hip);
  ctx.lineTo(x, neck);
  ctx.moveTo(x, neck + 4 * s);
  ctx.lineTo(x + facing * 16 * s, neck + 16 * s);
  ctx.moveTo(x, neck + 4 * s);
  ctx.lineTo(x - facing * 10 * s, neck + 20 * s);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, head, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + facing * 4 * s, head - 2 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  if (extra === 'chef' || extra === 'player') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#bdbdbd';
    ctx.lineWidth = 1.2;
    ctx.fillRect(x - 10 * s, head - 20 * s, 20 * s, 8 * s);
    ctx.beginPath();
    ctx.arc(x - 6 * s, head - 24 * s, 7 * s, 0, Math.PI * 2);
    ctx.arc(x + 6 * s, head - 24 * s, 7 * s, 0, Math.PI * 2);
    ctx.arc(x, head - 29 * s, 8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (extra === 'waiter') {
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.moveTo(x, neck + 3 * s);
    ctx.lineTo(x - 7 * s, neck - 1 * s);
    ctx.lineTo(x - 7 * s, neck + 7 * s);
    ctx.lineTo(x + 7 * s, neck - 1 * s);
    ctx.lineTo(x + 7 * s, neck + 7 * s);
    ctx.closePath();
    ctx.fill();
  }
  if (extra === 'vip') {
    ctx.fillStyle = '#212121';
    ctx.fillRect(x - 12 * s, head - 12 * s, 24 * s, 3 * s);
    ctx.fillRect(x - 8 * s, head - 30 * s, 16 * s, 18 * s);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + facing * 5 * s, head - 2 * s, 4.5 * s, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function bubble(ctx: Ctx, x: number, y: number, text: string, mood: number, time: number) {
  const shake = mood < 0.25 ? Math.sin(time * 30) * 2 : 0;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - 26 + shake, y - 26, 52, 44, 12);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 6 + shake, y + 18);
  ctx.lineTo(x + shake, y + 28);
  ctx.lineTo(x + 6 + shake, y + 18);
  ctx.fill();
  ctx.fillStyle = '#000';
  emoji(ctx, text, x + shake, y - 4, 26);
  // Patience: green, then yellow, then red
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x - 22 + shake, y + 10, 44, 5);
  ctx.fillStyle = mood > 0.5 ? '#66bb6a' : mood > 0.25 ? '#ffca28' : '#ef5350';
  ctx.fillRect(x - 22 + shake, y + 10, 44 * mood, 5);
}

/** Everyone in the restaurant, the drive-thru cars, dishes on the pass and the floating words. */
export function drawPeople(ctx: Ctx, day: ChefDay, time: number) {
  const F = WORLD.floor;
  // Cars in the drive-thru line
  for (const c of day.cars) {
    const x = DRIVE_X + c.x - 40;
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(x - 60, F - 60, 120, 40, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x - 36, F - 92, 72, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#b3e5fc';
    ctx.fillRect(x - 28, F - 86, 56, 24);
    ctx.fillStyle = '#212121';
    for (const k of [-36, 36]) {
      ctx.beginPath();
      ctx.arc(x + k, F - 18, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    if (c.state === 'waiting') bubble(ctx, x + 20, F - 140, '❗', c.patience / c.max, time);
    if (c.state === 'ordered') bubble(ctx, x + 20, F - 140, c.dish.icon, c.patience / c.max, time);
  }
  // Ready dishes on the pass
  const ready = day.tickets.filter((t) => t.step >= t.dish.steps.length && !day.workers.some((w) => w.carrying === t));
  ready.forEach((t, k) => {
    const px = PASS_X + 18 + (k % 3) * 22;
    const py = F - 132 - Math.floor(k / 3) * 22;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(px, py + 8, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    emoji(ctx, t.dish.icon, px, py - 2, 20);
  });
  // Guests
  for (const g of day.guests) drawGuest(ctx, g, time);
  // Staff and you
  for (const w of day.workers) drawWorker(ctx, w);
  // Floating words
  for (const p of day.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.6);
    ctx.font = '800 24px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText(p.text, p.x, p.y - p.t * 40);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - p.t * 40);
  }
  ctx.globalAlpha = 1;
}

function drawGuest(ctx: Ctx, g: Customer, time: number) {
  const F = WORLD.floor;
  const s = g.kid ? 0.7 : 1;
  const sitting = g.state === 'waiting' || g.state === 'ordered' || g.state === 'eating';
  const facing = sitting ? (g.x > tableX(g.table) ? -1 : 1) : g.state === 'leaving' ? 1 : -1;
  stick(ctx, g.x, F, s, g.state === 'leaving' && g.mood <= 0 ? '#e53935' : g.color, g.x * 0.06, facing, sitting, g.vip ? 'vip' : null);
  const top = F - (sitting ? 100 : 92) * s - 34;
  if (g.state === 'waiting') bubble(ctx, g.x, top, '❗', g.mood, time);
  else if (g.state === 'ordered') bubble(ctx, g.x, top, (g.kid ? '🧸' : '') + g.dish.icon, g.mood, time);
  else if (g.state === 'eating') {
    emoji(ctx, g.dish.icon, tableX(g.table) + (g.x > tableX(g.table) ? 18 : -18), F - 82, 22);
    emoji(ctx, '😋', g.x, top + 10, 22);
  }
}

function drawWorker(ctx: Ctx, w: Worker) {
  const F = WORLD.floor;
  const color = w.role === 'player' ? '#1e88e5' : w.role === 'waiter' ? '#455a64' : '#6d4c41';
  stick(ctx, w.x, F, 1.05, color, w.walk, w.facing, false, w.role === 'player' ? 'player' : w.role === 'chef' ? 'chef' : 'waiter');
  if (w.carrying) {
    const hx = w.x + w.facing * 18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(hx, F - 72, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    emoji(ctx, w.carrying.dish.icon, hx, F - 84, 22);
  }
  if (w.busy > 0 && w.busy !== Infinity) {
    ctx.fillStyle = '#000';
    emoji(ctx, w.role === 'chef' ? '🍳' : '📝', w.x, F - 150, 22);
  }
  if (w.role === 'player') {
    ctx.font = '800 14px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e88e5';
    ctx.fillText('YOU', w.x, F - 152);
  }
}

/** Top bar inside the canvas: the tickets (orders) waiting to be cooked, oldest first. */
export function drawTickets(ctx: Ctx, day: ChefDay, vw: number) {
  const list = day.tickets.slice(0, 8);
  let x = 10;
  for (const t of list) {
    const ready = t.step >= t.dish.steps.length;
    ctx.fillStyle = ready ? '#c8e6c9' : '#fffde7';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, 8, 64, 54, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000';
    emoji(ctx, t.dish.icon, x + 20, 30, 22);
    emoji(ctx, ready ? '✅' : STATION_ICON[t.dish.steps[t.step].station], x + 46, 30, 16);
    // Steps done
    for (let k = 0; k < t.dish.steps.length; k++) {
      ctx.fillStyle = k < t.step ? '#43a047' : 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 8 + k * 14, 50, 10, 5);
    }
    if (t.guest.kind === 'car') emoji(ctx, '🚗', x + 54, 50, 12);
    x += 70;
    if (x > vw - 70) break;
  }
}
