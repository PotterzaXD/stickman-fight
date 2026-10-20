import { Fighter, SHIELD_MAX } from './entities';
import type { Game } from './game';
import { pickSpawns } from './maps';
import type { Platform } from './types';
import { weapon, type WeaponId } from './weapons';

/*
 * The October 21 modes. Both bring KO'd fighters back after a few seconds.
 * King of the Hill: stand in the glowing zone alone to score; the first to 30 seconds wins. The zone moves every 20 seconds.
 * Weapon Race: everyone starts with the same weapon, and every KO gives you the next one. A KO with the last one wins.
 */

export const HILL = { win: 30, moveEvery: 20, w: 240, h: 180 };
/** Seconds before a KO'd fighter comes back (King of the Hill and Weapon Race). */
export const RESPAWN_S = 3;
/** Weapon Race: the ladder, from far-away guns to a frying pan up close. */
export const RACE_WEAPONS: WeaponId[] = ['shotgun', 'rocket', 'laser', 'boomerang', 'katana', 'hammer', 'chainsaw', 'pan'];

export interface HillState {
  /** Middle of the zone's floor, and its width. */
  x: number;
  y: number;
  w: number;
  /** Seconds in the zone for each team. */
  score: Map<number, number>;
  /** The team holding it alone right now (null = empty or fought over). */
  holder: number | null;
  moveT: number;
  plat: number;
}

/** Platforms the zone can sit on: wide, still, and safe to stand on. */
function zonePlats(g: Game): number[] {
  return g.map.platforms.flatMap((p: Platform, i) => (p.w >= 150 && !p.move && p.kind !== 'lava' && p.kind !== 'spikes' && p.kind !== 'glass' && p.kind !== 'bounce' ? [i] : []));
}

function placeZone(g: Game, h: HillState, i: number) {
  const p = g.map.platforms[i];
  h.plat = i;
  h.w = Math.min(HILL.w, p.w);
  h.x = p.x + p.w / 2;
  h.y = p.y;
}

export function startHill(g: Game) {
  const list = zonePlats(g);
  const h: HillState = { x: g.map.w / 2, y: g.map.h / 2, w: HILL.w, score: new Map(), holder: null, moveT: HILL.moveEvery, plat: -1 };
  // First the platform closest to the middle of the map.
  const mid = list.length ? list.reduce((a, b) => (dist(g, b) < dist(g, a) ? b : a)) : -1;
  if (mid >= 0) placeZone(g, h, mid);
  for (const f of g.fighters) h.score.set(f.team, 0);
  g.hill = h;
}

const dist = (g: Game, i: number) => {
  const p = g.map.platforms[i];
  return Math.hypot(p.x + p.w / 2 - g.map.w / 2, p.y - g.map.h * 0.55);
};

/** Is this fighter standing in the zone? */
export const inZone = (h: HillState, f: Fighter) => f.alive && Math.abs(f.x - h.x) <= h.w / 2 && f.y <= h.y + 4 && f.y >= h.y - HILL.h;

export function updateHill(g: Game, dt: number) {
  const h = g.hill!;
  h.moveT -= dt;
  if (h.moveT <= 0) {
    h.moveT = HILL.moveEvery;
    const list = zonePlats(g).filter((i) => i !== h.plat);
    if (list.length) {
      placeZone(g, h, list[Math.floor(Math.random() * list.length)]);
      g.text(h.x, h.y - HILL.h - 40, '👑 ➜', '#ffd740', 34);
      g.play('jump');
    }
  }
  const teams = new Set(g.fighters.filter((f) => !f.cloneOf && inZone(h, f)).map((f) => f.team));
  h.holder = teams.size === 1 ? [...teams][0] : null;
  if (h.holder !== null) {
    const before = h.score.get(h.holder) ?? 0;
    const now = before + dt;
    h.score.set(h.holder, now);
    // A little "+1" each full second.
    if (Math.floor(now) > Math.floor(before)) {
      const f = g.fighters.find((x) => x.team === h.holder && inZone(h, x));
      if (f) g.text(f.x, f.y - f.h - 24, `👑 ${Math.floor(now)}`, '#ffd740', 20);
    }
  }
}

/** King of the Hill: decided once a team has 30 seconds. */
export function hillWinner(g: Game): { decided: boolean; team: number | null } {
  for (const [team, s] of g.hill!.score) if (s >= HILL.win) return { decided: true, team };
  return { decided: false, team: null };
}

// ---------- Weapon Race ----------

/** Weapon Race: everyone starts on the first weapon. */
export function startRace(g: Game) {
  g.race = new Map();
  for (const f of g.fighters) {
    if (f.boss || f.cloneOf) continue;
    g.race.set(f, 0);
    giveWeapon(f, RACE_WEAPONS[0]);
  }
}

function giveWeapon(f: Fighter, id: WeaponId) {
  const w = weapon(id);
  f.weapons = [w];
  f.angles = [0.9];
  f.angVel = [0];
  f.cds = [0];
  f.boomerangOut = [false];
  f.ammo = [f.ammo[0] ?? 5];
}

/** Someone got a KO in Weapon Race: up a weapon (the last one wins). */
export function raceKo(g: Game, killer: Fighter) {
  const lvl = g.race!.get(killer);
  if (lvl === undefined || !killer.alive) return;
  const next = lvl + 1;
  g.race!.set(killer, next);
  if (next >= RACE_WEAPONS.length) return;
  giveWeapon(killer, RACE_WEAPONS[next]);
  g.burst(killer.x, killer.y - killer.h / 2, '#ffd740', 12, 260);
  g.text(killer.x, killer.y - killer.h - 40, next === RACE_WEAPONS.length - 1 ? '🍳 LAST ONE!' : `⬆️ ${next + 1}/${RACE_WEAPONS.length}`, '#ffd740', 26);
}

export function raceWinner(g: Game): { decided: boolean; team: number | null } {
  for (const [f, lvl] of g.race!) if (lvl >= RACE_WEAPONS.length) return { decided: true, team: f.team };
  return { decided: false, team: null };
}

// ---------- coming back ----------

/** King of the Hill and Weapon Race: KO'd fighters come back after a few seconds, away from their enemies. */
export function updateRespawns(g: Game, dt: number) {
  for (const f of g.fighters) {
    if (f.alive || f.boss || f.cloneOf || f.horde) continue;
    const t = (g.respawn.get(f) ?? RESPAWN_S) - dt;
    if (t > 0) {
      g.respawn.set(f, t);
      continue;
    }
    g.respawn.delete(f);
    const spots = pickSpawns(g.map, 8);
    const foes = g.fighters.filter((e) => e.alive && e.team !== f.team);
    const spot = spots.reduce((a, b) => (far(b, foes) > far(a, foes) ? b : a));
    f.alive = true;
    f.hp = f.maxHp;
    f.x = spot.x;
    f.y = spot.y - 2;
    f.vx = 0;
    f.vy = 0;
    f.stun = 0;
    f.burnT = f.poisonT = f.frozenT = f.slowT = f.bubbleT = 0;
    f.shieldHp = SHIELD_MAX;
    f.shieldBroken = false;
    f.cds = f.cds.map(() => 0);
    f.boomerangOut = f.boomerangOut.map(() => false);
    g.burst(f.x, f.y - 40, f.color, 14, 260);
    g.text(f.x, f.y - 110, '✨', '#ffffff', 26);
  }
}

const far = (p: { x: number; y: number }, foes: Fighter[]) => (foes.length ? Math.min(...foes.map((e) => Math.hypot(e.x - p.x, e.y - p.y))) : 0);
