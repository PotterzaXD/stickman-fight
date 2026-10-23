import { DAY_SECONDS, DISH, DRIVE, KITCHEN_SLOTS, RUSH, TABLE_SLOTS, decorBonus, needs, rating, seatsOf, type ChefSave, type Dish, type StationId, type Step } from './data';

/*
 * One day in the Stick Chef restaurant. Everything happens in a side view: the drive-thru window on the far left,
 * then the kitchen, the pass (where finished dishes wait), the dining room and the front door on the right.
 */

export const WORLD = { w: 1600, h: 560, floor: 470 };
export const DRIVE_X = 70;
export const KITCHEN_X = 140;
export const SLOT_W = 88;
export const PASS_X = 700;
export const PASS_W = 80;
export const DINING_X = 810;
export const TABLE_W = 115;
export const DOOR_X = 1550;

export const stationX = (i: number) => KITCHEN_X + i * SLOT_W + SLOT_W / 2;
export const tableX = (i: number) => DINING_X + i * TABLE_W + TABLE_W / 2;
/** Where each seat at a table is (a table has 2, a big table 4). */
export const seatX = (table: number, seat: number, n: number) => tableX(table) + (seat - (n - 1) / 2) * (n > 2 ? 26 : 44);

const rand = Math.random;
const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)];

export type Guest = Customer | Car;

export interface Ticket {
  id: number;
  dish: Dish;
  /** The step being cooked next (steps.length = ready). */
  step: number;
  /** How well each step went (0-1). */
  q: number[];
  guest: Guest;
  /** Someone is cooking its next step right now. */
  cooking: boolean;
  /** A waiter is bringing it. */
  claimed: boolean;
}

export interface Customer {
  kind: 'customer';
  id: number;
  x: number;
  tx: number;
  table: number;
  seat: number;
  state: 'walkin' | 'waiting' | 'ordered' | 'eating' | 'leaving';
  /** Seconds of patience left, and how much there was. */
  patience: number;
  max: number;
  dish: Dish;
  kid: boolean;
  vip: boolean;
  ticket: Ticket | null;
  /** A waiter is on the way to take the order. */
  claimed: boolean;
  eatT: number;
  color: string;
  mood: number;
  /** Seconds the whole visit took against all the patience it had (for the review). */
  waited: number;
  patienceAll: number;
}

export interface Car {
  kind: 'car';
  id: number;
  /** Place in the drive-thru line (0 = at the window). */
  x: number;
  tx: number;
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
  kid: false;
}

/** The player, a waiter or a hired chef. */
export interface Worker {
  role: 'player' | 'waiter' | 'chef';
  x: number;
  tx: number;
  /** What happens on arrival. */
  task: Task | null;
  /** Seconds left on the thing they are doing (taking an order, cooking). */
  busy: number;
  carrying: Ticket | null;
  facing: number;
  walk: number;
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

export interface Pop {
  x: number;
  y: number;
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
}

const SPEED = { player: 560, waiter: 430, chef: 380 };
const COLORS = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac', '#f06292', '#a1887f', '#90a4ae', '#ffd54f'];

export class ChefDay {
  time = 0;
  over = false;
  guests: Customer[] = [];
  cars: Car[] = [];
  tickets: Ticket[] = [];
  workers: Worker[] = [];
  pops: Pop[] = [];
  result: DayResult = { served: 0, angry: 0, cash: 0, tips: 0, stars: 0, reviews: [] };
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
    this.workers.push({ role: 'player', x: PASS_X - 40, tx: PASS_X - 40, task: null, busy: 0, carrying: null, facing: 1, walk: 0 });
    for (let i = 0; i < save.staff.waiter; i++) this.workers.push({ role: 'waiter', x: PASS_X + 60 + i * 30, tx: PASS_X + 60 + i * 30, task: null, busy: 0, carrying: null, facing: 1, walk: 0 });
    for (let i = 0; i < save.staff.chef; i++) this.workers.push({ role: 'chef', x: KITCHEN_X + 120 + i * 150, tx: KITCHEN_X + 120 + i * 150, task: null, busy: 0, carrying: null, facing: 1, walk: 0 });
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

  private freeSeat(): [number, number] | null {
    const taken = new Set(this.guests.map((g) => `${g.table}:${g.seat}`));
    const free: [number, number][] = [];
    for (let i = 0; i < TABLE_SLOTS; i++) {
      const n = seatsOf(this.save.tables[i]);
      for (let s = 0; s < n; s++) if (!taken.has(`${i}:${s}`)) free.push([i, s]);
    }
    return free.length ? pick(free) : null;
  }

  private spawnGuest() {
    const seat = this.freeSeat();
    if (!seat) return;
    const kidsMenu = this.menu(true);
    const kid = kidsMenu.length > 0 && rand() < 0.3;
    const list = kid ? kidsMenu : this.menu(false);
    if (!list.length) return;
    const vip = !kid && this.save.day >= 3 && rand() < 0.08;
    const n = seatsOf(this.save.tables[seat[0]]);
    const g: Customer = {
      kind: 'customer',
      id: this.ids++,
      x: DOOR_X + 40,
      tx: seatX(seat[0], seat[1], n),
      table: seat[0],
      seat: seat[1],
      state: 'walkin',
      patience: 0,
      max: 0,
      dish: pick(list),
      kid,
      vip,
      ticket: null,
      claimed: false,
      eatT: 0,
      color: vip ? '#212121' : pick(COLORS),
      mood: 1,
      waited: 0,
      patienceAll: 0,
    };
    this.guests.push(g);
    this.onSound?.('bell');
  }

  private spawnCar() {
    if (this.cars.length >= 3) return;
    const list = this.menu(false);
    if (!list.length) return;
    this.cars.push({ kind: 'car', id: this.ids++, x: -260, tx: 0, state: 'arriving', patience: 0, max: 0, dish: pick(list), ticket: null, claimed: false, color: pick(COLORS), waited: 0, patienceAll: 0, vip: false, kid: false });
  }

  /** Where someone stands to deal with a guest. */
  guestSpot(g: Guest): number {
    return g.kind === 'car' ? DRIVE_X + 40 : g.x + (g.x > tableX(g.table) ? 26 : -26);
  }

  // ---------- the player taps ----------

  /** The player tapped a guest: take their order, or bring them their food if it's ready. */
  tapGuest(g: Guest) {
    const p = this.player;
    if (p.busy > 0) return;
    if (g.state === 'waiting') {
      g.claimed = true;
      this.send(p, this.guestSpot(g), { t: 'order', g });
    } else if (g.state === 'ordered' && g.ticket && g.ticket.step >= g.ticket.dish.steps.length) {
      const t = g.ticket;
      if (p.carrying === t) this.send(p, this.guestSpot(g), { t: 'serve', ticket: t });
      else if (!t.claimed || p.carrying === null) {
        t.claimed = true;
        // Take it away from a waiter who was going to bring it.
        for (const w of this.workers) if (w !== p && (w.task?.t === 'fetch' || w.task?.t === 'serve') && w.task.ticket === t) this.idle(w);
        this.send(p, PASS_X + PASS_W / 2, { t: 'fetch', ticket: t });
      }
    }
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
    this.send(p, stationX(slot), { t: 'cook', slot, ticket: t });
  }

  /** The player tapped the floor: walk there (dropping any job on the way). */
  tapFloor(x: number) {
    const p = this.player;
    if (p.busy > 0) return;
    this.idle(p);
    this.send(p, x, { t: 'move' });
  }

  private send(w: Worker, x: number, task: Task) {
    if (w.task && w.task.t === 'cook' && w.task !== task) {
      w.task.ticket.cooking = false;
      this.stationBusy.delete(w.task.slot);
    }
    w.tx = Math.max(20, Math.min(WORLD.w - 60, x));
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
    const open = this.time < DAY_SECONDS;
    if (open) {
      this.nextGuest -= dt;
      if (this.nextGuest <= 0) {
        this.spawnGuest();
        const r = rating(this.save);
        // Better reviews bring more customers.
        const every = 11 / (0.55 + r * 0.22);
        this.nextGuest = every * (this.rush ? 0.5 : 1) * (0.75 + rand() * 0.5);
      }
      if (this.save.drive && this.save.day >= DRIVE.day) {
        this.nextCar -= dt;
        if (this.nextCar <= 0) {
          this.spawnCar();
          this.nextCar = (this.rush ? 8 : 15) * (0.75 + rand() * 0.5);
        }
      }
    } else {
      this.close();
      return;
    }
    for (const g of this.guests) this.updateGuest(g, dt);
    this.guests = this.guests.filter((g) => !(g.state === 'leaving' && g.x > DOOR_X + 60));
    this.updateCars(dt);
    for (const w of this.workers) this.updateWorker(w, dt);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 1.6);
  }

  private updateGuest(g: Customer, dt: number) {
    const sp = g.kid ? 220 : 180;
    if (g.state === 'walkin' || g.state === 'leaving') {
      const d = g.tx - g.x;
      g.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt);
      if (g.state === 'walkin' && Math.abs(d) < 1) {
        g.state = 'waiting';
        g.max = g.patience = (g.vip ? 28 : 35) * (g.kid ? 0.9 : 1);
        g.patienceAll = g.max;
      }
      return;
    }
    if (g.state === 'eating') {
      g.eatT -= dt;
      if (g.eatT <= 0) this.pay(g);
      return;
    }
    g.patience -= dt;
    g.waited += dt;
    g.mood = Math.max(0, g.patience / g.max);
    if (g.patience <= 0) this.angry(g);
  }

  private updateCars(dt: number) {
    for (const [i, c] of this.cars.entries()) {
      // The line moves up as cars leave.
      if (c.state !== 'leaving') c.tx = -i * 150;
      const d = c.tx - c.x;
      c.x += Math.sign(d) * Math.min(Math.abs(d), 260 * dt);
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
    this.cars = this.cars.filter((c) => !(c.state === 'leaving' && c.x < -400));
  }

  private updateWorker(w: Worker, dt: number) {
    if (w.busy > 0) {
      w.busy -= dt;
      if (w.busy <= 0) this.finishBusy(w);
      return;
    }
    if (!w.task && w.role !== 'player') this.think(w);
    const d = w.tx - w.x;
    const step = Math.min(Math.abs(d), SPEED[w.role] * dt);
    w.x += Math.sign(d) * step;
    if (step > 0) {
      w.facing = Math.sign(d);
      w.walk += step * 0.06;
    }
    if (Math.abs(d) < 1 && w.task) this.arrive(w);
  }

  /** Waiters take orders and bring dishes; hired chefs cook. */
  private think(w: Worker) {
    if (w.role === 'waiter') {
      const g = [...this.guests, ...this.cars.slice(0, 1)].find((g) => g.state === 'waiting' && !g.claimed);
      if (g) {
        g.claimed = true;
        return this.send(w, this.guestSpot(g), { t: 'order', g });
      }
      const t = this.tickets.find((t) => t.step >= t.dish.steps.length && !t.claimed);
      if (t) {
        t.claimed = true;
        return this.send(w, PASS_X + PASS_W / 2, { t: 'fetch', ticket: t });
      }
      // Wait by the pass.
      w.tx = PASS_X + PASS_W + 30 + this.workers.indexOf(w) * 24;
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
        return this.send(w, stationX(slot), { t: 'cook', slot, ticket: t });
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
        w.busy = 0.5;
        return;
      }
      case 'fetch': {
        const t = task.ticket;
        if (!this.tickets.includes(t)) return this.idle(w);
        // Already holding something else: put it back on the pass.
        if (w.carrying && w.carrying !== t) w.carrying.claimed = false;
        w.carrying = t;
        this.send(w, this.guestSpot(t.guest), { t: 'serve', ticket: t });
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
        if (w.role === 'player') {
          w.busy = Infinity;
          const t = task.ticket;
          const step = t.dish.steps[t.step];
          if (!this.onCook) return this.cooked(w, 0.8);
          this.onCook(step, t.dish, (q) => this.cooked(w, q));
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
    this.pop(stationX(task.slot), WORLD.floor - 150, q >= 0.85 ? '✨ PERFECT' : q >= 0.6 ? '👍 GOOD' : q >= 0.3 ? '😬 OK' : '💀 BURNT', q >= 0.6 ? '#66bb6a' : '#ef5350');
    if (t.step >= t.dish.steps.length) this.onSound?.('ding');
  }

  private takeOrder(g: Guest) {
    if (g.state !== 'waiting') return;
    g.state = 'ordered';
    g.claimed = false;
    // A fresh bit of patience for the food.
    g.max = g.patience = (g.vip ? 45 : 55) * (g.kid ? 0.9 : 1);
    g.patienceAll += g.max;
    const t: Ticket = { id: this.ids++, dish: g.dish, step: 0, q: [], guest: g, cooking: false, claimed: false };
    g.ticket = t;
    this.tickets.push(t);
    this.onSound?.('order');
  }

  private serve(t: Ticket) {
    const g = t.guest;
    this.tickets = this.tickets.filter((x) => x !== t);
    if (g.kind === 'car') {
      this.pay(g, t);
      return;
    }
    g.state = 'eating';
    g.eatT = 3.5;
  }

  /** How many stars: how well it was cooked, minus a bit for a long wait, plus the decorations. VIP critics are picky. */
  private starsFor(t: Ticket, g: Guest): number {
    const q = t.q.length ? t.q.reduce((a, b) => a + b, 0) / t.q.length : 0.5;
    const wait = g.patienceAll ? g.waited / g.patienceAll : 0;
    let s = 1 + 4 * q - Math.max(0, wait - 0.45) * 3 + decorBonus(this.save);
    if (g.vip) s -= 0.4;
    return Math.max(1, Math.min(5, Math.round(s * 2) / 2));
  }

  private pay(g: Guest, ticket?: Ticket) {
    const t = ticket ?? (g.ticket as Ticket);
    const stars = this.starsFor(t, g);
    const price = t.dish.price;
    const tip = stars >= 4 ? Math.round(price * (stars >= 5 ? 0.4 : 0.2) * (g.vip ? 3 : 1)) : 0;
    this.result.cash += price + tip;
    this.result.tips += tip;
    this.result.served++;
    this.review(stars, t.dish.id, g.vip, false);
    const x = g.kind === 'car' ? DRIVE_X : g.x;
    this.pop(x, WORLD.floor - 170, `+${price + tip} 💵`, '#2e7d32');
    this.pop(x, WORLD.floor - 200, '⭐'.repeat(Math.floor(stars)) + (stars % 1 ? '½' : ''), '#f9a825');
    this.onSound?.('cash');
    this.leave(g);
  }

  private angry(g: Guest) {
    if (g.ticket) this.tickets = this.tickets.filter((x) => x !== g.ticket);
    for (const w of this.workers) if (w.task && ((w.task.t === 'order' && w.task.g === g) || ((w.task.t === 'fetch' || w.task.t === 'serve') && w.task.ticket.guest === g) || (w.task.t === 'cook' && w.task.ticket.guest === g))) {
      if (w.carrying?.guest === g) w.carrying = null;
      if (w.role === 'player' && w.task.t === 'cook' && w.busy === Infinity) continue;
      this.idle(w);
      w.busy = 0;
    }
    this.result.angry++;
    this.review(1, g.dish.id, g.vip, true);
    this.pop(g.kind === 'car' ? DRIVE_X : g.x, WORLD.floor - 170, '😡', '#e53935');
    this.onSound?.('angry');
    this.leave(g);
  }

  private leave(g: Guest) {
    g.state = 'leaving';
    g.ticket = null;
    if (g.kind === 'car') g.tx = -600;
    else g.tx = DOOR_X + 80;
  }

  private review(stars: number, dish: string, vip: boolean, angry: boolean) {
    // A VIP food critic's review counts three times.
    this.result.reviews.push({ stars, dish, vip, angry, n: Math.floor(rand() * 4) });
  }

  pop(x: number, y: number, text: string, color: string) {
    this.pops.push({ x, y, text, color, t: 0 });
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

export const KITCHEN_COUNT = KITCHEN_SLOTS;
