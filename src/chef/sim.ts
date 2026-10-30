import { DAY_SECONDS, DISH, DRIVE, GRID, RUSH, allTables, decorBonus, needs, rating, type ChefSave, type Dish, type StationId, type Step } from './data';

/*
 * One day in the Stick Chef restaurant, seen from above. The ground floor has the kitchen along the top wall
 * (stations, then the pass where finished dishes wait), the drive-thru lane outside on the left, the front door
 * at the bottom and the stairs in the bottom right corner. Every floor is a grid of tables and decorations.
 * Big tables bring big families: everyone orders, and they can order more than once before they go.
 */

/** Each floor's size. */
export const WORLD = { w: 1600, h: 1000 };
/** One grid spot. */
export const CELL = 150;
export const GRID_X = 190;
/** Where the grid starts on each floor (the ground floor's is lower, under the kitchen). */
export const gridY = (floor: number) => (floor === 0 ? 270 : 110);
export const KITCHEN = { y: 40, h: 90, stand: 172, bottom: 222 };
export const DRIVE_LANE = 150;
export const WINDOW = { x: DRIVE_LANE, y: 95, stand: { x: 196, y: 120 } };
export const STATION_W = 100;
export const stationX = (i: number) => 250 + i * 108;
export const PASS = { x: 1130, y: 40, w: 170, h: 90, stand: { x: 1215, y: 172 } };
export const DOOR = { x: 860, y: 1000 };
export const STAIRS = { x: 1445, y: 880, w: 130, h: 110 };
const STAIRS_SPOT = { x: STAIRS.x + STAIRS.w / 2, y: STAIRS.y + STAIRS.h / 2 };

/** The middle of a grid spot. */
export const cellCenter = (floor: number, cell: number) => ({ x: GRID_X + (cell % GRID.cols) * CELL + CELL / 2, y: gridY(floor) + Math.floor(cell / GRID.cols) * CELL + CELL / 2 });
/** Which grid spot is at this point (-1 = none). */
export function cellAt(floor: number, x: number, y: number): number {
  const c = Math.floor((x - GRID_X) / CELL);
  const r = Math.floor((y - gridY(floor)) / CELL);
  if (c < 0 || c >= GRID.cols || r < 0 || r >= GRID.rows[floor]) return -1;
  return r * GRID.cols + c;
}

/** Where each seat is around a table (from its middle). */
export function seatOffsets(n: number): { x: number; y: number }[] {
  if (n <= 2) return [{ x: -46, y: 0 }, { x: 46, y: 0 }];
  if (n <= 4) return [{ x: -24, y: -44 }, { x: 24, y: -44 }, { x: -24, y: 44 }, { x: 24, y: 44 }];
  const six = [{ x: -38, y: -48 }, { x: 0, y: -48 }, { x: 38, y: -48 }, { x: -38, y: 48 }, { x: 0, y: 48 }, { x: 38, y: 48 }];
  return n <= 6 ? six : [...six, { x: -64, y: 0 }, { x: 64, y: 0 }];
}

/** A table's top (width and height). */
export const tableSize = (n: number) => (n <= 2 ? { w: 52, h: 46 } : n <= 4 ? { w: 76, h: 54 } : n <= 6 ? { w: 108, h: 58 } : { w: 108, h: 64 });

const rand = Math.random;
const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)];

export interface Spot {
  floor: number;
  x: number;
  y: number;
}

/** Anyone who walks around: they follow a path of spots (taking the stairs between floors). */
interface Mover extends Spot {
  path: Spot[];
  walk: number;
  /** Which way they face (radians). */
  dir: number;
}

export type Guest = Party | Car;

export interface Ticket {
  id: number;
  dish: Dish;
  /** The step being cooked next (steps.length = ready). */
  step: number;
  /** How well each step went (0-1). */
  q: number[];
  guest: Guest;
  /** Which person at the table it's for. */
  member: number;
  /** Someone is cooking its next step right now. */
  cooking: boolean;
  /** Someone is bringing it. */
  claimed: boolean;
}

export interface Member {
  dish: Dish;
  kid: boolean;
  color: string;
  /** Their dish this round: waiting for it (ticket), eating it, or done. */
  ticket: Ticket | null;
  eatT: number;
  done: boolean;
}

/** A group of customers at one table: one person at a little table, a big family at a big one. */
export interface Party extends Mover {
  kind: 'party';
  id: number;
  table: { floor: number; cell: number; seats: number };
  members: Member[];
  state: 'walkin' | 'waiting' | 'ordered' | 'leaving';
  /** Seconds of patience left, and how much there was. */
  patience: number;
  max: number;
  vip: boolean;
  /** Someone is on the way to take the order. */
  claimed: boolean;
  /** Which order this is (they can order up to `rounds` times), and how well everything was cooked. */
  round: number;
  rounds: number;
  q: number[];
  bill: number;
  mood: number;
  /** Seconds the whole visit took against all the patience it had (for the review). */
  waited: number;
  patienceAll: number;
}

export interface Car {
  kind: 'car';
  id: number;
  /** Place in the drive-thru line (0 = at the window), from the window down the lane. */
  y: number;
  ty: number;
  state: 'arriving' | 'waiting' | 'ordered' | 'leaving';
  patience: number;
  max: number;
  dish: Dish;
  ticket: Ticket | null;
  claimed: boolean;
  color: string;
  waited: number;
  patienceAll: number;
  vip: false;
}

/** The player, a waiter or a hired chef. */
export interface Worker extends Mover {
  role: 'player' | 'waiter' | 'chef';
  /** What happens on arrival. */
  task: Task | null;
  /** Seconds left on the thing they are doing (taking an order, cooking). */
  busy: number;
  carrying: Ticket | null;
}

type Task =
  | { t: 'order'; g: Guest }
  | { t: 'fetch'; ticket: Ticket }
  | { t: 'serve'; ticket: Ticket }
  | { t: 'cook'; slot: number; ticket: Ticket }
  | { t: 'move' };

export interface Review {
  stars: number;
  dish: string;
  n: number;
  vip: boolean;
  angry: boolean;
}

export interface Pop extends Spot {
  text: string;
  color: string;
  t: number;
}

export interface DayResult {
  served: number;
  angry: number;
  cash: number;
  tips: number;
  stars: number;
  reviews: Review[];
  /** The biggest family that came in. */
  biggest: number;
}

const SPEED = { player: 560, waiter: 430, chef: 380, guest: 200 };
const COLORS = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac', '#f06292', '#a1887f', '#90a4ae', '#ffd54f'];
/** Families pay more: +10% for 3-4 people, +30% for 5 or more. */
export const familyBonus = (n: number) => (n >= 5 ? 1.3 : n >= 3 ? 1.1 : 1);
const EAT = 3.5;

/** A path from one spot to another, by the stairs if they are on different floors. */
function route(from: Spot, to: Spot): Spot[] {
  const path: Spot[] = [];
  for (let f = from.floor; f !== to.floor; f += Math.sign(to.floor - from.floor)) {
    path.push({ floor: f, ...STAIRS_SPOT });
    path.push({ floor: f + Math.sign(to.floor - from.floor), ...STAIRS_SPOT });
  }
  path.push(to);
  return path;
}

/** Walk along the path. Returns true on arrival. */
function step(m: Mover, speed: number, dt: number): boolean {
  let left = speed * dt;
  while (m.path.length && left > 0) {
    const p = m.path[0];
    // The stairs: straight to the next floor.
    if (p.floor !== m.floor) {
      m.floor = p.floor;
      m.path.shift();
      continue;
    }
    const dx = p.x - m.x;
    const dy = p.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d <= left) {
      m.x = p.x;
      m.y = p.y;
      left -= d;
      m.path.shift();
    } else {
      m.x += (dx / d) * left;
      m.y += (dy / d) * left;
      m.dir = Math.atan2(dy, dx);
      m.walk += left * 0.05;
      left = 0;
    }
  }
  return m.path.length === 0;
}

export class ChefDay {
  time = 0;
  over = false;
  guests: Party[] = [];
  cars: Car[] = [];
  tickets: Ticket[] = [];
  workers: Worker[] = [];
  pops: Pop[] = [];
  result: DayResult = { served: 0, angry: 0, cash: 0, tips: 0, stars: 0, reviews: [], biggest: 0 };
  /** Stations at work right now (slot index). */
  stationBusy = new Set<number>();
  private nextGuest = 2;
  private nextCar = 6;
  private ids = 1;
  /** Ask the screen to run a mini-game: it calls `done` with how well it went (0-1). */
  onCook?: (step: Step, dish: Dish, done: (q: number) => void) => void;
  onSound?: (s: 'order' | 'ding' | 'cash' | 'angry' | 'bell') => void;
  onHint?: (key: 'busy' | 'nothing' | 'noStation') => void;

  constructor(readonly save: ChefSave) {
    const add = (role: Worker['role'], x: number, y: number, floor = 0) => this.workers.push({ role, floor, x, y, path: [], walk: 0, dir: Math.PI / 2, task: null, busy: 0, carrying: null });
    add('player', PASS.stand.x - 60, PASS.stand.y + 20);
    for (let i = 0; i < save.staff.waiter; i++) add('waiter', PASS.stand.x + 120 + i * 40, PASS.stand.y + 30);
    for (let i = 0; i < save.staff.chef; i++) add('chef', stationX(1 + i * 2), KITCHEN.stand);
  }

  get player() {
    return this.workers[0];
  }

  get rush() {
    return this.time >= RUSH.from && this.time < RUSH.to;
  }

  get left() {
    return Math.max(0, DAY_SECONDS - this.time);
  }

  get floors() {
    return this.save.grid.length;
  }

  /** Dishes guests can order today: unlocked, and the kitchen has every station they need. */
  menu(kids: boolean): Dish[] {
    const have = new Set(this.save.kitchen.filter(Boolean));
    return this.save.dishes.map((id) => DISH[id]).filter((d) => d && !!d.kids === kids && needs(d).every((s) => have.has(s)));
  }

  /** The oldest ticket with a step to cook at this station. */
  private nextFor(station: StationId): Ticket | null {
    return this.tickets.find((t) => !t.cooking && t.step < t.dish.steps.length && t.dish.steps[t.step].station === station) ?? null;
  }

  /** The station the oldest ticket needs next (the screen makes it glow). */
  hintStation(): number {
    const t = this.tickets.find((t) => !t.cooking && t.step < t.dish.steps.length);
    if (!t) return -1;
    const st = t.dish.steps[t.step].station;
    return this.save.kitchen.findIndex((id, i) => id === st && !this.stationBusy.has(i));
  }

  /** Where each person at a party sits. */
  seat(p: Party, i: number): Spot {
    const c = cellCenter(p.table.floor, p.table.cell);
    const o = seatOffsets(p.table.seats)[i] ?? { x: 0, y: 0 };
    return { floor: p.table.floor, x: c.x + o.x, y: c.y + o.y };
  }

  /** Where someone stands to talk to a guest (or to give one person their dish). */
  guestSpot(g: Guest, member = -1): Spot {
    if (g.kind === 'car') return { floor: 0, ...WINDOW.stand };
    const c = cellCenter(g.table.floor, g.table.cell);
    if (member < 0) return { floor: g.table.floor, x: c.x, y: c.y + CELL / 2 - 6 };
    const s = this.seat(g, member);
    const dx = s.x - c.x;
    const dy = s.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    return { floor: s.floor, x: s.x + (dx / d) * 26, y: s.y + (dy / d) * 26 };
  }

  private freeTable() {
    const taken = new Set(this.guests.map((g) => `${g.table.floor}:${g.table.cell}`));
    const free = allTables(this.save).filter((t) => t.floor < this.floors && !taken.has(`${t.floor}:${t.cell}`));
    return free.length ? pick(free) : null;
  }

  private spawnParty() {
    const table = this.freeTable();
    if (!table) return;
    const grown = this.menu(false);
    if (!grown.length) return;
    const kidsMenu = this.menu(true);
    // A little table: 1-2 people. Bigger tables: a family that mostly fills it.
    const n = table.seats;
    const size = n <= 2 ? 1 + Math.floor(rand() * 2) : Math.max(2, n - Math.floor(rand() * Math.ceil(n / 2)));
    const vip = size <= 2 && this.save.day >= 3 && rand() < 0.08;
    const members: Member[] = Array.from({ length: size }, (_, i) => {
      // Families bring kids (never the first grown-up).
      const kid = i > 0 && size >= 3 && kidsMenu.length > 0 && rand() < 0.4;
      const solo = size === 1 && kidsMenu.length > 0 && rand() < 0.15;
      const isKid = kid || solo;
      return { dish: pick(isKid ? kidsMenu : grown), kid: isKid, color: vip && i === 0 ? '#212121' : pick(COLORS), ticket: null, eatT: 0, done: false };
    });
    const rounds = 1 + (rand() < 0.45 ? 1 : 0) + (rand() < 0.25 ? 1 : 0);
    const p: Party = {
      kind: 'party',
      id: this.ids++,
      floor: 0,
      x: DOOR.x,
      y: DOOR.y + 40,
      path: [],
      walk: 0,
      dir: -Math.PI / 2,
      table,
      members,
      state: 'walkin',
      patience: 0,
      max: 0,
      vip,
      claimed: false,
      round: 1,
      rounds,
      q: [],
      bill: 0,
      mood: 1,
      waited: 0,
      patienceAll: 0,
    };
    p.path = route(p, { ...cellCenter(table.floor, table.cell), floor: table.floor });
    this.guests.push(p);
    this.result.biggest = Math.max(this.result.biggest, size);
    this.onSound?.('bell');
  }

  private spawnCar() {
    if (this.cars.length >= 4) return;
    const list = this.menu(false);
    if (!list.length) return;
    this.cars.push({ kind: 'car', id: this.ids++, y: WORLD.h + 150, ty: 0, state: 'arriving', patience: 0, max: 0, dish: pick(list), ticket: null, claimed: false, color: pick(COLORS), waited: 0, patienceAll: 0, vip: false });
  }

  // ---------- the player taps ----------

  /** The player tapped a guest: take their order, or bring them their food if some is ready. */
  tapGuest(g: Guest) {
    const p = this.player;
    if (p.busy > 0) return;
    if (g.state === 'waiting') {
      g.claimed = true;
      this.send(p, this.guestSpot(g), { t: 'order', g });
      return;
    }
    if (g.state !== 'ordered') return;
    // Holding one of theirs: give it to them.
    if (p.carrying && p.carrying.guest === g) return this.send(p, this.guestSpot(g, p.carrying.member), { t: 'serve', ticket: p.carrying });
    const ready = this.tickets.filter((t) => t.guest === g && t.step >= t.dish.steps.length);
    const t = ready.find((t) => !t.claimed) ?? ready[0];
    if (!t) return;
    t.claimed = true;
    // Take it away from a waiter who was going to bring it.
    for (const w of this.workers) if (w !== p && (w.task?.t === 'fetch' || w.task?.t === 'serve') && w.task.ticket === t && w.carrying !== t) this.idle(w);
    if (this.workers.some((w) => w !== p && w.carrying === t)) return;
    this.send(p, { floor: 0, ...PASS.stand }, { t: 'fetch', ticket: t });
  }

  /** The player tapped a kitchen station: cook the next step there. */
  tapStation(slot: number) {
    const p = this.player;
    if (p.busy > 0) return;
    const id = this.save.kitchen[slot] as StationId | null;
    if (!id) return;
    if (this.stationBusy.has(slot)) return this.onHint?.('busy');
    const t = this.nextFor(id);
    if (!t) return this.onHint?.('nothing');
    t.cooking = true;
    this.stationBusy.add(slot);
    this.send(p, { floor: 0, x: stationX(slot), y: KITCHEN.stand }, { t: 'cook', slot, ticket: t });
  }

  /** The player tapped the floor: walk there (dropping any job on the way). */
  tapFloor(to: Spot) {
    const p = this.player;
    if (p.busy > 0) return;
    this.idle(p);
    this.send(p, to, { t: 'move' });
  }

  private send(w: Worker, to: Spot, task: Task) {
    if (w.task && w.task.t === 'cook' && w.task !== task) {
      w.task.ticket.cooking = false;
      this.stationBusy.delete(w.task.slot);
    }
    const x = Math.max(20, Math.min(WORLD.w - 20, to.x));
    const y = Math.max(60, Math.min(WORLD.h - 20, to.y));
    w.path = route(w, { floor: to.floor, x, y });
    w.task = task;
  }

  private idle(w: Worker) {
    const task = w.task;
    if (task?.t === 'cook') {
      task.ticket.cooking = false;
      this.stationBusy.delete(task.slot);
    }
    if (task?.t === 'order') task.g.claimed = false;
    if ((task?.t === 'fetch' || task?.t === 'serve') && w.carrying !== task.ticket) task.ticket.claimed = false;
    w.task = null;
  }

  // ---------- every frame ----------

  update(dt: number) {
    if (this.over) return;
    this.time += dt;
    if (this.time >= DAY_SECONDS) {
      this.close();
      return;
    }
    this.nextGuest -= dt;
    if (this.nextGuest <= 0) {
      this.spawnParty();
      const r = rating(this.save);
      // Better reviews bring more customers, and more tables bring a few more too.
      const tables = allTables(this.save).length;
      const every = 11 / (0.55 + r * 0.22) / Math.min(1.8, 1 + Math.max(0, tables - 2) * 0.04);
      this.nextGuest = every * (this.rush ? 0.5 : 1) * (0.75 + rand() * 0.5);
    }
    if (this.save.drive && this.save.day >= DRIVE.day) {
      this.nextCar -= dt;
      if (this.nextCar <= 0) {
        this.spawnCar();
        this.nextCar = (this.rush ? 8 : 15) * (0.75 + rand() * 0.5);
      }
    }
    for (const g of this.guests) this.updateParty(g, dt);
    this.guests = this.guests.filter((g) => !(g.state === 'leaving' && !g.path.length));
    this.updateCars(dt);
    for (const w of this.workers) this.updateWorker(w, dt);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 1.6);
  }

  private updateParty(p: Party, dt: number) {
    if (p.state === 'walkin' || p.state === 'leaving') {
      const there = step(p, SPEED.guest, dt);
      if (p.state === 'walkin' && there) this.sitDown(p);
      return;
    }
    // Eating: each person finishes their own dish.
    for (const m of p.members) {
      if (m.eatT <= 0) continue;
      m.eatT -= dt;
      if (m.eatT <= 0) m.done = true;
    }
    if (p.state === 'ordered' && p.members.every((m) => m.done)) return this.roundDone(p);
    // Patience only runs down while someone is still waiting for food (or to order).
    if (p.state === 'ordered' && p.members.every((m) => m.done || m.eatT > 0)) return;
    p.patience -= dt;
    p.waited += dt;
    p.mood = Math.max(0, p.patience / p.max);
    if (p.patience <= 0) this.angry(p);
  }

  private sitDown(p: Party) {
    p.state = 'waiting';
    p.max = p.patience = p.vip ? 28 : 35;
    p.patienceAll += p.max;
  }

  /** Everyone has eaten: order again, or pay and go. */
  private roundDone(p: Party) {
    if (p.round < p.rounds) {
      p.round++;
      for (const m of p.members) {
        m.dish = pick(this.menu(m.kid).length ? this.menu(m.kid) : [m.dish]);
        m.ticket = null;
        m.done = false;
        m.eatT = 0;
      }
      this.sitDown(p);
      this.pop(this.guestSpot(p), '🔁', '#1e88e5');
      return;
    }
    this.pay(p);
  }

  private updateCars(dt: number) {
    for (const [i, c] of this.cars.entries()) {
      // The line moves up as cars leave.
      if (c.state !== 'leaving') c.ty = WINDOW.y + i * 175;
      const d = c.ty - c.y;
      c.y += Math.sign(d) * Math.min(Math.abs(d), 280 * dt);
      if (c.state === 'arriving' && i === 0 && Math.abs(d) < 1) {
        c.state = 'waiting';
        c.max = c.patience = 30;
        c.patienceAll = c.max;
      }
      if (c.state === 'waiting' || c.state === 'ordered') {
        if (i > 0 && c.state === 'waiting') continue;
        c.patience -= dt;
        c.waited += dt;
        if (c.patience <= 0) this.angry(c);
      }
    }
    this.cars = this.cars.filter((c) => !(c.state === 'leaving' && c.y < -200));
  }

  private updateWorker(w: Worker, dt: number) {
    if (w.busy > 0) {
      w.busy -= dt;
      if (w.busy <= 0) this.finishBusy(w);
      return;
    }
    if (!w.task && w.role !== 'player') this.think(w);
    const there = step(w, SPEED[w.role], dt);
    if (there && w.task) this.arrive(w);
  }

  /** Waiters take orders and bring dishes (closest first); hired chefs cook. */
  private think(w: Worker) {
    if (w.role === 'waiter') {
      const far = (s: Spot) => Math.abs(s.floor - w.floor) * 1500 + Math.hypot(s.x - w.x, s.y - w.y);
      const waiting = [...this.guests, ...this.cars.slice(0, 1)].filter((g) => g.state === 'waiting' && !g.claimed);
      waiting.sort((a, b) => far(this.guestSpot(a)) - far(this.guestSpot(b)));
      const g = waiting[0];
      if (g) {
        g.claimed = true;
        return this.send(w, this.guestSpot(g), { t: 'order', g });
      }
      const t = this.tickets.find((t) => t.step >= t.dish.steps.length && !t.claimed);
      if (t) {
        t.claimed = true;
        return this.send(w, { floor: 0, ...PASS.stand }, { t: 'fetch', ticket: t });
      }
      // Wait by the pass.
      const home = { floor: 0, x: PASS.stand.x + 110 + this.workers.indexOf(w) * 36, y: PASS.stand.y + 40 };
      if (w.floor !== home.floor || Math.hypot(home.x - w.x, home.y - w.y) > 4) w.path = route(w, home);
      return;
    }
    if (w.role === 'chef') {
      for (const t of this.tickets) {
        if (t.cooking || t.step >= t.dish.steps.length) continue;
        const st = t.dish.steps[t.step].station;
        const slot = this.save.kitchen.findIndex((id, i) => id === st && !this.stationBusy.has(i));
        if (slot < 0) continue;
        t.cooking = true;
        this.stationBusy.add(slot);
        return this.send(w, { floor: 0, x: stationX(slot), y: KITCHEN.stand }, { t: 'cook', slot, ticket: t });
      }
    }
  }

  private arrive(w: Worker) {
    const task = w.task!;
    switch (task.t) {
      case 'move':
        w.task = null;
        return;
      case 'order': {
        const g = task.g;
        if (g.state !== 'waiting') return this.idle(w);
        // A bigger table takes a little longer to order.
        w.busy = 0.4 + (g.kind === 'party' ? g.members.length * 0.12 : 0.1);
        w.dir = -Math.PI / 2;
        return;
      }
      case 'fetch': {
        const t = task.ticket;
        if (!this.tickets.includes(t)) return this.idle(w);
        // Already holding something else: put it back on the pass.
        if (w.carrying && w.carrying !== t) w.carrying.claimed = false;
        w.carrying = t;
        this.send(w, this.guestSpot(t.guest, t.guest.kind === 'party' ? t.member : -1), { t: 'serve', ticket: t });
        return;
      }
      case 'serve': {
        const t = task.ticket;
        w.carrying = null;
        w.task = null;
        if (!this.tickets.includes(t) || t.guest.state !== 'ordered') return;
        this.serve(t);
        return;
      }
      case 'cook':
        w.dir = -Math.PI / 2;
        if (w.role === 'player') {
          w.busy = Infinity;
          const t = task.ticket;
          const s = t.dish.steps[t.step];
          if (!this.onCook) return this.cooked(w, 0.8);
          this.onCook(s, t.dish, (q) => this.cooked(w, q));
        } else w.busy = 3.2 + rand();
        return;
    }
  }

  private finishBusy(w: Worker) {
    const task = w.task;
    if (task?.t === 'order') {
      this.takeOrder(task.g);
      w.task = null;
    } else if (task?.t === 'cook' && w.role === 'chef') this.cooked(w, 0.68 + rand() * 0.17);
  }

  /** A cooking step is done (q = how well, 0-1). */
  private cooked(w: Worker, q: number) {
    const task = w.task;
    w.busy = 0;
    if (task?.t !== 'cook') return;
    const t = task.ticket;
    this.stationBusy.delete(task.slot);
    t.cooking = false;
    w.task = null;
    if (!this.tickets.includes(t)) return;
    t.q.push(q);
    t.step++;
    this.pop({ floor: 0, x: stationX(task.slot), y: KITCHEN.y + 20 }, q >= 0.85 ? '✨ PERFECT' : q >= 0.6 ? '👍 GOOD' : q >= 0.3 ? '😬 OK' : '💀 BURNT', q >= 0.6 ? '#66bb6a' : '#ef5350');
    if (t.step >= t.dish.steps.length) this.onSound?.('ding');
  }

  /** Take the whole table's order: a ticket for each person. */
  private takeOrder(g: Guest) {
    if (g.state !== 'waiting') return;
    g.state = 'ordered';
    g.claimed = false;
    if (g.kind === 'car') {
      g.max = g.patience = 55;
      g.patienceAll += g.max;
      const t: Ticket = { id: this.ids++, dish: g.dish, step: 0, q: [], guest: g, member: 0, cooking: false, claimed: false };
      g.ticket = t;
      this.tickets.push(t);
    } else {
      // A fresh bit of patience for the food (more people, more to cook).
      g.max = g.patience = (g.vip ? 45 : 55) + (g.members.length - 1) * 9;
      g.patienceAll += g.max;
      g.members.forEach((m, i) => {
        const t: Ticket = { id: this.ids++, dish: m.dish, step: 0, q: [], guest: g, member: i, cooking: false, claimed: false };
        m.ticket = t;
        this.tickets.push(t);
      });
    }
    this.onSound?.('order');
  }

  private serve(t: Ticket) {
    const g = t.guest;
    this.tickets = this.tickets.filter((x) => x !== t);
    const q = t.q.length ? t.q.reduce((a, b) => a + b, 0) / t.q.length : 0.5;
    if (g.kind === 'car') {
      this.payCar(g, t, q);
      return;
    }
    const m = g.members[t.member];
    g.q.push(q);
    g.bill += t.dish.price;
    m.ticket = null;
    m.eatT = EAT;
    this.result.served++;
  }

  /** How many stars: how well it was cooked, minus a bit for a long wait, plus the decorations. VIP critics are picky. */
  private starsFor(q: number, g: Guest): number {
    const wait = g.patienceAll ? g.waited / g.patienceAll : 0;
    let s = 1 + 4 * q - Math.max(0, wait - 0.45) * 3 + decorBonus(this.save);
    if (g.vip) s -= 0.4;
    return Math.max(1, Math.min(5, Math.round(s * 2) / 2));
  }

  private payCar(c: Car, t: Ticket, q: number) {
    const stars = this.starsFor(q, c);
    const price = t.dish.price;
    const tip = stars >= 4 ? Math.round(price * (stars >= 5 ? 0.4 : 0.2)) : 0;
    this.result.cash += price + tip;
    this.result.tips += tip;
    this.result.served++;
    this.review(stars, t.dish.id, false, false);
    this.pop({ floor: 0, x: WINDOW.stand.x + 40, y: WINDOW.y + 40 }, `+${price + tip} 💵`, '#2e7d32');
    this.onSound?.('cash');
    this.leave(c);
  }

  /** The party pays for everything they ate (families pay extra), with a tip for a great meal, and leaves one review. */
  private pay(p: Party) {
    const q = p.q.length ? p.q.reduce((a, b) => a + b, 0) / p.q.length : 0.5;
    const stars = this.starsFor(q, p);
    const bill = Math.round(p.bill * familyBonus(p.members.length));
    const tip = stars >= 4 ? Math.round(p.bill * (stars >= 5 ? 0.4 : 0.2) * (p.vip ? 3 : 1)) : 0;
    this.result.cash += bill + tip;
    this.result.tips += tip;
    this.review(stars, p.members[0].dish.id, p.vip, false);
    const at = this.guestSpot(p);
    this.pop({ ...at, y: at.y - 60 }, `+${bill + tip} 💵`, '#2e7d32');
    this.pop({ ...at, y: at.y - 95 }, '⭐'.repeat(Math.floor(stars)) + (stars % 1 ? '½' : ''), '#f9a825');
    if (p.members.length >= 5) this.pop({ ...at, y: at.y - 130 }, '👨‍👩‍👧‍👦 +30%', '#8e24aa');
    this.onSound?.('cash');
    this.leave(p);
  }

  private angry(g: Guest) {
    this.tickets = this.tickets.filter((x) => x.guest !== g);
    for (const w of this.workers) if (w.task && ((w.task.t === 'order' && w.task.g === g) || ((w.task.t === 'fetch' || w.task.t === 'serve') && w.task.ticket.guest === g) || (w.task.t === 'cook' && w.task.ticket.guest === g))) {
      if (w.carrying?.guest === g) w.carrying = null;
      if (w.role === 'player' && w.task.t === 'cook' && w.busy === Infinity) continue;
      this.idle(w);
      w.busy = 0;
    }
    for (const w of this.workers) if (w.carrying?.guest === g) w.carrying = null;
    this.result.angry++;
    this.review(1, g.kind === 'car' ? g.dish.id : g.members[0].dish.id, g.vip, true);
    // They still pay for what they already ate (no tip).
    if (g.kind === 'party' && g.bill) this.result.cash += g.bill;
    const at = g.kind === 'car' ? { floor: 0, x: WINDOW.stand.x + 40, y: WINDOW.y + 40 } : this.guestSpot(g);
    this.pop({ ...at, y: at.y - 60 }, '😡', '#e53935');
    this.onSound?.('angry');
    this.leave(g);
  }

  private leave(g: Guest) {
    g.state = 'leaving';
    if (g.kind === 'car') {
      g.ticket = null;
      g.ty = -400;
      return;
    }
    for (const m of g.members) {
      m.ticket = null;
      m.eatT = 0;
    }
    g.path = route(g, { floor: 0, x: DOOR.x, y: DOOR.y + 60 });
  }

  private review(stars: number, dish: string, vip: boolean, angry: boolean) {
    // A VIP food critic's review counts three times.
    this.result.reviews.push({ stars, dish, vip, angry, n: Math.floor(rand() * 4) });
  }

  pop(at: Spot, text: string, color: string) {
    this.pops.push({ ...at, text, color, t: 0 });
  }

  /** How many guests on a floor need something (an order taken or food that's ready). */
  needs(floor: number): number {
    return this.guests.filter((g) => g.table.floor === floor && (g.state === 'waiting' || (g.state === 'ordered' && this.tickets.some((t) => t.guest === g && t.step >= t.dish.steps.length)))).length;
  }

  /** Closing time: everyone still here goes home (no review), and the day is over. */
  private close() {
    this.over = true;
    const r = this.result.reviews;
    const weight = (v: Review) => (v.vip ? 3 : 1);
    const total = r.reduce((a, v) => a + weight(v), 0);
    this.result.stars = total ? r.reduce((a, v) => a + v.stars * weight(v), 0) / total : 0;
  }
}
