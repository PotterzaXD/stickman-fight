import type { Fighter } from './entities';
import type { Game } from './game';
import { SHOP_WEAPONS, weapon, type WeaponDef } from './weapons';

/*
 * Random Events (a fun mode, offline and online): a normal fight on any map, but every 20 seconds something wild
 * happens for a few seconds. The lights go out, gravity goes low, lava rises, everyone swaps places, rocks or bombs
 * rain down, everyone gets a random weapon, everyone gets giant or tiny or super fast, or the whole floor turns to ice.
 */

/** Append only (online sends the index). */
export const EVENT_IDS = ['blackout', 'lowgrav', 'lava', 'teleport', 'rockfall', 'shuffle', 'giant', 'tiny', 'speed', 'ice', 'bombs'] as const;
export type EventId = (typeof EVENT_IDS)[number];
export const EVENT_ICON: Record<EventId, string> = {
  blackout: '🌑', lowgrav: '🌙', lava: '🌋', teleport: '🌀', rockfall: '🪨', shuffle: '🔀', giant: '🦍', tiny: '🐜', speed: '⚡', ice: '🧊', bombs: '💣',
};

/** A new event every 20 seconds (the first one comes sooner), and how long each one lasts. */
export const EVENTS = { every: 20, first: 8, last: 10, lava: 13, shuffle: 14, swapEvery: 2.5, rockEvery: 0.18, bombEvery: 0.45, rock: 35, bomb: 45, bombR: 120 };
const SIZE = { giant: 1.6, tiny: 0.6 };
const FAST = 1.6;
const LOW_GRAVITY = 0.42;

/** A rock or a bomb falling out of the sky. */
export interface Faller {
  x: number;
  y: number;
  vy: number;
  kind: 'rock' | 'bomb';
  r: number;
  rot: number;
}

export interface EventsState {
  /** The event going on (null = none), seconds left in it and how long it lasts. */
  cur: EventId | null;
  t: number;
  dur: number;
  /** Seconds until the next one starts. */
  next: number;
  last: EventId | null;
  /** Rising Lava: the top of the lava. */
  lavaY: number;
  fallers: Faller[];
  tick: number;
  /** The map's normal gravity. */
  grav: number;
}

export function startEvents(g: Game) {
  g.ev = { cur: null, t: 0, dur: 0, next: EVENTS.first, last: null, lavaY: g.map.h + 400, fallers: [], tick: 0, grav: g.gravity };
}

/** Everyone who takes part (not bosses or the Outbreak's hidden horde). */
const players = (g: Game) => g.fighters.filter((f) => !f.boss && !f.horde);

/** Grow or shrink a stickman (Giant and Tiny). */
export function setSize(f: Fighter, k: number) {
  if (f.scale === k) return;
  f.scale = k;
  f.w = 30 * k;
  f.h = 80 * k;
}

function giveWeapons(f: Fighter, list: WeaponDef[]) {
  f.weapons = list;
  f.angles = list.map((_, i) => (i === 0 ? 0.9 : Math.PI - 0.9));
  f.angVel = list.map(() => 0);
  f.cds = list.map(() => 0);
  f.boomerangOut = list.map(() => false);
  f.ammo = list.map(() => 5);
}

function begin(g: Game, id: EventId) {
  const ev = g.ev!;
  ev.cur = id;
  ev.last = id;
  ev.dur = ev.t = id === 'lava' ? EVENTS.lava : id === 'shuffle' ? EVENTS.shuffle : EVENTS.last;
  ev.tick = 0;
  g.play('boom');
  g.shake = Math.min(18, g.shake + 6);
  if (id === 'lowgrav') g.gravity = ev.grav * LOW_GRAVITY;
  if (id === 'lava') ev.lavaY = g.map.h + 60;
  if (id === 'shuffle') {
    const pool = SHOP_WEAPONS.filter((w) => !w.id.startsWith('sum_'));
    for (const f of players(g)) {
      f.homeWeapons ??= f.weapons;
      giveWeapons(f, [pool[Math.floor(Math.random() * pool.length)]]);
      g.burst(f.x, f.cy, '#ffd740', 10, 240);
    }
  }
  if (id === 'teleport') ev.tick = 0.6;
}

function end(g: Game) {
  const ev = g.ev!;
  const id = ev.cur;
  ev.cur = null;
  ev.next = EVENTS.every - ev.dur;
  g.gravity = ev.grav;
  for (const f of players(g)) {
    setSize(f, 1);
    f.speed = 380;
    if (id === 'shuffle' && f.homeWeapons) {
      giveWeapons(f, f.homeWeapons);
      f.homeWeapons = null;
    }
  }
  ev.lavaY = g.map.h + 400;
}

/** A random event that isn't the one just before. */
function pickEvent(last: EventId | null): EventId {
  const pool = EVENT_IDS.filter((id) => id !== last);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function updateEvents(g: Game, dt: number) {
  const ev = g.ev!;
  if (!ev.cur) {
    ev.next -= dt;
    if (ev.next <= 0) begin(g, pickEvent(ev.last));
  } else {
    ev.t -= dt;
    during(g, ev, dt);
    if (ev.t <= 0) end(g);
  }
  updateFallers(g, dt);
}

function during(g: Game, ev: EventsState, dt: number) {
  const list = players(g);
  switch (ev.cur) {
    case 'giant':
    case 'tiny':
      // Anyone who comes back during it gets the same size.
      for (const f of list) setSize(f, SIZE[ev.cur]);
      break;
    case 'speed':
      for (const f of list) {
        f.speed = 380 * FAST;
        if (f.alive && Math.random() < dt * 6) g.burst(f.x, f.y - 20, '#ffee58', 1, 120, false);
      }
      break;
    case 'lava': {
      // Up for 5 seconds, stays a while, then goes back down over the last 3.
      const top = lavaTop(g);
      const up = Math.min(1, (ev.dur - ev.t) / 5);
      const down = Math.min(1, ev.t / 3);
      ev.lavaY = g.map.h + 60 - (g.map.h + 60 - top) * Math.min(up, down);
      for (const b of g.bodies()) if (b.alive && b.y > ev.lavaY && b.vy >= 0) g.lavaHit(b);
      break;
    }
    case 'teleport':
      ev.tick -= dt;
      if (ev.tick <= 0) {
        ev.tick = EVENTS.swapEvery;
        swapPlaces(g);
      }
      break;
    case 'rockfall':
    case 'bombs':
      ev.tick -= dt;
      if (ev.tick <= 0) {
        const rock = ev.cur === 'rockfall';
        ev.tick = rock ? EVENTS.rockEvery : EVENTS.bombEvery;
        // Mostly near the fighters, so there's always something to dodge.
        const near = list.filter((f) => f.alive);
        const at = near.length && Math.random() < 0.6 ? near[Math.floor(Math.random() * near.length)].x + (Math.random() - 0.5) * 500 : Math.random() * g.map.w;
        ev.fallers.push({ x: at, y: -120 - Math.random() * 200, vy: 200, kind: rock ? 'rock' : 'bomb', r: rock ? 16 + Math.random() * 14 : 15, rot: Math.random() * 6 });
      }
      break;
  }
}

/** How high Rising Lava goes: up to about the middle of the map (the highest ground stays safe). */
function lavaTop(g: Game): number {
  const ys = g.map.platforms.filter((p) => p.w >= 80 && p.kind !== 'lava' && !p.temp).map((p) => p.y).sort((a, b) => a - b);
  // Leave the top third of the platforms above the lava.
  const safe = ys.length ? ys[Math.floor(ys.length * 0.34)] : g.map.h * 0.5;
  return Math.min(g.map.h * 0.85, safe + 70);
}

/** Teleport Chaos: everyone standing swaps places with someone else. */
function swapPlaces(g: Game) {
  const list = players(g).filter((f) => f.alive);
  if (list.length < 2) return;
  const spots = list.map((f) => ({ x: f.x, y: f.y }));
  // Shift by a random amount so nobody keeps their own spot.
  const k = 1 + Math.floor(Math.random() * (list.length - 1));
  list.forEach((f, i) => {
    const s = spots[(i + k) % list.length];
    g.burst(f.x, f.cy, '#b388ff', 10, 260);
    f.x = s.x;
    f.y = s.y;
    f.vx = 0;
    f.vy = 0;
    g.burst(f.x, f.cy, '#ea80fc', 10, 260);
  });
  g.play('jump');
}

function updateFallers(g: Game, dt: number) {
  const ev = g.ev!;
  for (const r of ev.fallers) {
    r.vy = Math.min(1600, r.vy + 1800 * dt);
    r.y += r.vy * dt;
    r.rot += dt * 4;
    let hit = r.y > g.map.h + 300;
    for (const b of g.bodies()) {
      if (hit || !b.alive || !b.contains(r.x, r.y, r.r)) continue;
      hit = true;
      if (r.kind === 'rock') {
        g.damage(b, EVENTS.rock, null, (Math.sign(b.x - r.x) || 1) * 200, -200, 'ragdoll');
        g.text(b.x, b.y - b.h - 30, '🪨 BONK!', '#e0e0e0', 22);
      }
    }
    if (!hit) for (const p of g.map.platforms) if (r.x > p.x && r.x < p.x + p.w && r.y + r.r > p.y && r.y < p.y + p.h) hit = true;
    if (!hit) continue;
    const at = { x: r.x, y: Math.min(r.y, g.map.h) };
    // Gone (the list drops it below).
    r.y = -9999;
    if (r.kind === 'bomb') boom(g, at);
    else g.burst(at.x, at.y, '#9e9e9e', 6, 200);
  }
  ev.fallers = ev.fallers.filter((r) => r.y > -9000);
}

function boom(g: Game, at: { x: number; y: number }) {
  for (const b of g.bodies()) {
    if (!b.alive) continue;
    const d = Math.hypot(b.x - at.x, b.cy - at.y);
    if (d > EVENTS.bombR + b.w / 2) continue;
    g.damage(b, EVENTS.bomb * (1 - (d / (EVENTS.bombR * 2))), null, (Math.sign(b.x - at.x) || 1) * 600, -650, 'pieces');
  }
  g.ring(at.x, at.y, EVENTS.bombR, 0.4, '#ff9100');
  g.burst(at.x, at.y, '#ff6d00', 18, 420);
  g.burst(at.x, at.y, '#ffeb3b', 10, 300);
  g.shake = Math.min(18, g.shake + 5);
  g.play('boom');
}

/** Online: the joining devices make the sizes match the host's event (the host sends the rest). */
export function mirrorEvent(g: Game) {
  const id = g.ev?.cur;
  for (const f of players(g)) setSize(f, id === 'giant' ? SIZE.giant : id === 'tiny' ? SIZE.tiny : 1);
}

/** Online: weapons after Weapon Shuffle (the host sends each fighter's weapon). */
export function mirrorWeapons(g: Game, ids: string[]) {
  ids.forEach((id, i) => {
    const f = g.fighters[i];
    if (!f || !id || f.weapons[0]?.id === id) return;
    f.homeWeapons ??= f.weapons;
    giveWeapons(f, [weapon(id)]);
  });
}

/** Online: everyone's own weapons back once the shuffle is over. */
export function restoreWeapons(g: Game) {
  for (const f of g.fighters) if (f.homeWeapons) {
    giveWeapons(f, f.homeWeapons);
    f.homeWeapons = null;
  }
}
