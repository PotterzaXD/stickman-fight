/*
 * Stick Chef: a restaurant game inside Stickman Fight. Customers come in and order, you cook with little mini-games,
 * serve them and get reviews. It has its own save and its own money (Chef cash), separate from Stickman Fight's coins.
 */

/** Kitchen stations. The prep counter is where things are put together. */
export type StationId = 'grill' | 'fryer' | 'oven' | 'fridge' | 'prep' | 'icecream';
/** Mini-games: stop a moving needle in the zone, hold to pour up to the line, or tap the ingredients in order. */
export type GameKind = 'timing' | 'pour' | 'stack';

export interface Step {
  station: StationId;
  game: GameKind;
  /** Stack: the ingredients, in order. */
  items?: string[];
  /** Timing and pour: how wide the good zone is (0-1 of the bar). Smaller is harder. */
  zone?: number;
  /** Timing: how fast the needle moves. */
  speed?: number;
}

export interface Dish {
  id: string;
  icon: string;
  price: number;
  steps: Step[];
  /** Kids meals: the same as the grown-up dish (`base`), ordered by kids, with a little toy. */
  kids?: string;
}

const grill = (zone = 0.22, speed = 1): Step => ({ station: 'grill', game: 'timing', zone, speed });
const fry = (zone = 0.22, speed = 1.1): Step => ({ station: 'fryer', game: 'timing', zone, speed });
const bake = (zone = 0.2, speed = 0.8): Step => ({ station: 'oven', game: 'timing', zone, speed });
const pour = (station: StationId, zone = 0.14): Step => ({ station, game: 'pour', zone });
const stack = (...items: string[]): Step => ({ station: 'prep', game: 'stack', items });

const BASE: Dish[] = [
  { id: 'burger', icon: '🍔', price: 12, steps: [grill(), stack('🍞', '🥩', '🧀', '🥬', '🍞')] },
  { id: 'fries', icon: '🍟', price: 6, steps: [fry()] },
  { id: 'soda', icon: '🥤', price: 4, steps: [pour('fridge')] },
  { id: 'hotdog', icon: '🌭', price: 9, steps: [grill(0.24, 1.1), stack('🥖', '🌭', '🍅')] },
  { id: 'nuggets', icon: '🧆', price: 8, steps: [fry(0.2, 1.3)] },
  { id: 'juice', icon: '🧃', price: 5, steps: [pour('fridge', 0.12)] },
  { id: 'salad', icon: '🥗', price: 8, steps: [stack('🥬', '🍅', '🥒', '🧅', '🫒')] },
  { id: 'pizza', icon: '🍕', price: 15, steps: [stack('🫓', '🍅', '🧀', '🍄'), bake()] },
  { id: 'icecream', icon: '🍦', price: 7, steps: [pour('icecream', 0.12)] },
  { id: 'chicken', icon: '🍗', price: 13, steps: [stack('🍗', '🥚', '🌾'), fry(0.18, 1.2)] },
  { id: 'milkshake', icon: '🥛', price: 9, steps: [pour('icecream', 0.1), pour('fridge', 0.12)] },
  { id: 'steak', icon: '🥩', price: 20, steps: [grill(0.14, 1.4), stack('🥩', '🥔', '🥦')] },
  { id: 'pie', icon: '🥧', price: 11, steps: [stack('🫓', '🍎', '🫓'), bake(0.18, 0.9)] },
  { id: 'cake', icon: '🍰', price: 16, steps: [bake(0.16, 1), stack('🍰', '🍦', '🍓')] },
  { id: 'taco', icon: '🌮', price: 10, steps: [grill(0.2, 1.2), stack('🌮', '🥩', '🥬', '🧀')] },
  { id: 'donut', icon: '🍩', price: 6, steps: [fry(0.2, 1.4), stack('🍩', '🍫', '✨')] },
];

/** Kids meals: the grown-up dish with a toy, a bit cheaper. Only kids order them. */
const KIDS: Dish[] = ['burger', 'nuggets', 'hotdog', 'pizza'].map((id) => {
  const b = BASE.find((d) => d.id === id)!;
  return { id: `kids_${id}`, icon: b.icon, price: Math.round(b.price * 0.8), steps: b.steps, kids: id };
});

export const DISHES: Dish[] = [...BASE, ...KIDS];
export const DISH = Object.fromEntries(DISHES.map((d) => [d.id, d])) as Record<string, Dish>;
/** You start with only the burger. */
export const START_DISHES = ['burger'];

/** Stations each dish needs. */
export const needs = (d: Dish) => [...new Set(d.steps.map((s) => s.station))];

export const STATION_ICON: Record<StationId, string> = { grill: '🔥', fryer: '🍟', oven: '♨️', fridge: '🧊', prep: '🔪', icecream: '🍦' };

// ---------- the restaurant ----------

/** Things you can build: stations in the kitchen, tables in the dining room, decorations on the wall. */
export type ItemKind = 'station' | 'table' | 'decor';
export interface Item {
  id: string;
  kind: ItemKind;
  icon: string;
  price: number;
  /** Decorations: how many stars they add to every review (all of them together at most DECOR_MAX). */
  stars?: number;
}

export const ITEMS: Item[] = [
  { id: 'grill', kind: 'station', icon: '🔥', price: 250 },
  { id: 'prep', kind: 'station', icon: '🔪', price: 200 },
  { id: 'fridge', kind: 'station', icon: '🧊', price: 150 },
  { id: 'fryer', kind: 'station', icon: '🍟', price: 300 },
  { id: 'oven', kind: 'station', icon: '♨️', price: 400 },
  { id: 'icecream', kind: 'station', icon: '🍦', price: 350 },
  { id: 'table', kind: 'table', icon: '🪑', price: 120 },
  { id: 'bigtable', kind: 'table', icon: '🛋️', price: 260 },
  { id: 'plant', kind: 'decor', icon: '🪴', price: 60, stars: 0.1 },
  { id: 'flowers', kind: 'decor', icon: '💐', price: 50, stars: 0.1 },
  { id: 'painting', kind: 'decor', icon: '🖼️', price: 90, stars: 0.15 },
  { id: 'lamp', kind: 'decor', icon: '💡', price: 70, stars: 0.1 },
  { id: 'clock', kind: 'decor', icon: '🕰️', price: 80, stars: 0.1 },
  { id: 'aquarium', kind: 'decor', icon: '🐠', price: 220, stars: 0.25 },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, Item>;
export const DECOR_MAX = 0.6;
/** A big table seats 4, a table 2. */
export const seatsOf = (id: string | null) => (id === 'bigtable' ? 4 : id === 'table' ? 2 : 0);

/** Slots along the restaurant: kitchen stations, dining tables, and decorations on the dining room wall. */
export const KITCHEN_SLOTS = 6;
export const TABLE_SLOTS = 6;
export const DECOR_SLOTS = 6;

/** Staff: hired once, they stay for good (no wages). The second one of each costs more. */
export const STAFF = { waiter: [400, 900], chef: [600, 1300] };
export type StaffKind = keyof typeof STAFF;

/** The drive-thru: can be built from day 10. */
export const DRIVE = { day: 10, price: 1500 };

export const DAY_SECONDS = 120;
export const START_CASH = 100;
/** Rush hour: customers come twice as fast in this part of the day (seconds from the start). */
export const RUSH = { from: 50, to: 75 };

export interface ChefSave {
  /** The next day to play (1 = the first). */
  day: number;
  cash: number;
  dishes: string[];
  kitchen: (string | null)[];
  tables: (string | null)[];
  decor: (string | null)[];
  staff: Record<StaffKind, number>;
  drive: boolean;
  /** The last reviews' stars (the restaurant's rating is their average). */
  ratings: number[];
  /** The last few reviews to read: stars, dish, and which line. */
  reviews: { stars: number; dish: string; n: number; vip?: boolean; day: number }[];
  served: number;
  best: number;
}

export function newChefSave(): ChefSave {
  return {
    day: 1,
    cash: START_CASH,
    dishes: [...START_DISHES],
    kitchen: ['grill', 'prep', 'fridge', null, null, null],
    tables: ['table', 'table', null, null, null, null],
    decor: [null, null, null, null, null, null],
    staff: { waiter: 0, chef: 0 },
    drive: false,
    ratings: [],
    reviews: [],
    served: 0,
    best: 0,
  };
}

/** Load a Stick Chef save, filling in anything missing. */
export function loadChef(r: unknown): ChefSave {
  const d = newChefSave();
  if (!r || typeof r !== 'object') return d;
  const o = r as Partial<ChefSave>;
  const slots = (a: unknown, n: number, kind: ItemKind) => Array.from({ length: n }, (_, i) => (Array.isArray(a) && typeof a[i] === 'string' && ITEM[a[i]]?.kind === kind ? (a[i] as string) : null));
  return {
    day: Math.max(1, Math.floor(Number(o.day) || 1)),
    cash: Math.max(0, Math.floor(Number(o.cash) || 0)),
    dishes: Array.isArray(o.dishes) && o.dishes.length ? o.dishes.filter((x) => typeof x === 'string' && DISH[x]) : d.dishes,
    kitchen: Array.isArray(o.kitchen) ? slots(o.kitchen, KITCHEN_SLOTS, 'station') : d.kitchen,
    tables: Array.isArray(o.tables) ? slots(o.tables, TABLE_SLOTS, 'table') : d.tables,
    decor: Array.isArray(o.decor) ? slots(o.decor, DECOR_SLOTS, 'decor') : d.decor,
    staff: { waiter: Math.min(2, Number(o.staff?.waiter) || 0), chef: Math.min(2, Number(o.staff?.chef) || 0) },
    drive: o.drive === true,
    ratings: Array.isArray(o.ratings) ? o.ratings.filter((x) => typeof x === 'number').slice(-30) : [],
    reviews: Array.isArray(o.reviews) ? o.reviews.slice(-12) : [],
    served: Number(o.served) || 0,
    best: Number(o.best) || 0,
  };
}

/** The restaurant's rating (1-5): the average of the last reviews, 3 before there are any. */
export function rating(c: ChefSave): number {
  const r = c.ratings.slice(-20);
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 3;
}

export function decorBonus(c: ChefSave): number {
  return Math.min(DECOR_MAX, c.decor.reduce((a, id) => a + (id ? ITEM[id]?.stars ?? 0 : 0), 0));
}

/** Dishes a good day can give you (not ones you have; a kids meal only once you have its grown-up dish). */
export function rewardPool(c: ChefSave): Dish[] {
  return DISHES.filter((d) => !c.dishes.includes(d.id) && (!d.kids || c.dishes.includes(d.kids)));
}
