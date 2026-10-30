import { Cat, Fighter, Snowman, type Body } from './entities';
import type { Game } from './game';
import type { BlockKind, MapDef, MapProp, Platform, Vec } from './types';

/*
 * Stickman Infection (a fun mode, offline and online): normal stickmen, and after a few seconds one of them is picked to be
 * the zombie. A zombie's hit (any hit) turns a human into a zombie too. Zombies win if everyone is a zombie before the
 * 2 minutes are up; if anyone is still human when the time runs out, the humans win. Anyone knocked out comes back
 * (a human who goes down comes back as a zombie). It is played in a very big town full of parkour.
 */

export const INFECTION = { time: 120, pickIn: 4, respawn: 3, zombieSpeed: 410 };
/** Humans are team 0, zombies team 1. */
export const HUMAN_TEAM = 0;
export const ZOMBIE_TEAM = 1;
export const ZOMBIE_COLOR = '#7cb342';

export interface InfectionState {
  /** Seconds left in the round (it starts once the first zombie is picked). */
  t: number;
  /** Seconds until the first zombie is picked (0 = picked). */
  pick: number;
  /** Everyone's own colour, to give back if they are a human again next round. */
  colors: Map<Fighter, string>;
}

export function startInfection(g: Game) {
  const colors = new Map<Fighter, string>();
  for (const f of g.fighters) {
    colors.set(f, f.color);
    f.team = HUMAN_TEAM;
  }
  g.inf = { t: INFECTION.time, pick: INFECTION.pickIn, colors };
}

/** Turn a stickman into a zombie: green, a bit faster, and on the zombies' side. Their helpers go away. */
export function turnZombie(g: Game, f: Fighter) {
  if (f.zombie) return;
  f.zombie = true;
  f.team = ZOMBIE_TEAM;
  f.color = ZOMBIE_COLOR;
  f.speed = INFECTION.zombieSpeed;
  f.hp = f.maxHp;
  // Helpers and snowmen can't follow a zombie: poof.
  for (const c of g.cats) if (c.owner === f && c.alive) {
    c.alive = false;
    c.frozen = false;
    g.burst(c.x, c.cy, '#c5e1a5', 8, 200);
  }
  for (const s of g.snowmen) if (s.owner === f && s.alive) {
    s.alive = false;
    g.burst(s.x, s.cy, '#ffffff', 8, 200);
  }
}

/** A zombie (or its helper) hit a human: they turn into a zombie instead of getting hurt. Returns true if that happened. */
export function infectHit(g: Game, target: Body, src: Body | null): boolean {
  if (!g.inf || !(target instanceof Fighter) || target.zombie || target.boss) return false;
  const by = src instanceof Cat || src instanceof Snowman ? src.owner : src;
  if (!(by instanceof Fighter) || !by.zombie) return false;
  turnZombie(g, target);
  target.vx = (Math.sign(target.x - by.x) || 1) * 380;
  target.vy = -420;
  target.onGround = false;
  target.stun = 0.5;
  target.hurtFlash = 0.3;
  g.burst(target.x, target.cy, ZOMBIE_COLOR, 22, 360);
  g.burst(target.x, target.cy, '#33691e', 10, 260);
  g.text(target.x, target.y - target.h - 40, '🧟 INFECTED!', '#c5e1a5', 30);
  g.play('heavy');
  g.feedInfect(target, by);
  return true;
}

export function updateInfection(g: Game, dt: number) {
  const inf = g.inf!;
  if (inf.pick > 0) {
    inf.pick -= dt;
    if (inf.pick <= 0) {
      inf.pick = 0;
      const pool = g.fighters.filter((f) => f.alive && !f.boss && !f.cloneOf);
      const first = pool[Math.floor(Math.random() * pool.length)];
      if (first) {
        turnZombie(g, first);
        g.ring(first.x, first.y, 220, 0.6, ZOMBIE_COLOR);
        g.text(first.x, first.y - first.h - 50, '🧟', '#c5e1a5', 44);
        g.say('infPicked', g.fighters.indexOf(first), 3);
        g.play('boom');
      }
    }
    return;
  }
  inf.t = Math.max(0, inf.t - dt);
}

/** Zombies win once nobody is human; humans win if anyone is still human when the time runs out. */
export function infectionWinner(g: Game): { decided: boolean; team: number | null } {
  const inf = g.inf!;
  if (inf.pick > 0) return { decided: false, team: null };
  const humans = g.fighters.filter((f) => !f.zombie && !f.boss && !f.cloneOf);
  if (!humans.length) return { decided: true, team: ZOMBIE_TEAM };
  if (inf.t <= 0) return { decided: true, team: HUMAN_TEAM };
  return { decided: false, team: null };
}

// ---------- the map ----------

const P = (x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h });
const B = (kind: BlockKind, x: number, y: number, w: number, h = 24): Platform => ({ x, y, w, h, kind });
const M = (x: number, y: number, w: number, dx: number, dy: number, period: number, phase = 0): Platform => ({ x, y, w, h: 22, move: { dx, dy, period, phase } });

const W = 7200;
const H = 2700;
const G = 2440;

function town(): { platforms: Platform[]; props: MapProp[]; spawns: Vec[] } {
  const props: MapProp[] = [];
  /** A building you walk in front of, with a flat roof you can jump up onto (so nobody gets stuck behind it). */
  const house = (x: number, w: number, h: number): Platform => {
    props.push({ k: 'building', x, y: G, w, h });
    return P(x, G - h, w);
  };
  const pl: Platform[] = [
    // The ground all the way across, and walls at both ends so nobody falls off the world.
    B('concrete', 0, G, W, 260),
    B('wall', 0, 0, 40, G),
    B('wall', W - 40, 0, 40, G),
  ];
  // 1. The park: trees, a pond of bounce pads, and floating stepping stones up to a lookout.
  pl.push(B('bounce', 420, G - 20, 90, 20), P(260, 2200, 200), P(520, 2020, 180), P(300, 1840, 180), P(560, 1660, 180), P(340, 1480, 220), P(700, 1320, 260));
  pl.push(M(980, 1500, 160, 0, -360, 5), P(1100, 1080, 240));
  props.push({ k: 'tree', x: 160, y: G, s: 1.3 }, { k: 'tree', x: 700, y: G, s: 1.1 }, { k: 'bench', x: 880, y: G }, { k: 'tree', x: 1020, y: G, s: 1.5 }, { k: 'lamp', x: 600, y: G }, { k: 'bush', x: 300, y: G }, { k: 'bush', x: 1120, y: G });
  // 2. The houses: climb the roofs, jump across.
  pl.push(house(1250, 300, 320), house(1650, 260, 520), house(2010, 340, 260), house(2440, 220, 680));
  pl.push(P(1560, 1820, 120), P(1930, 1700, 120), P(2340, 1640, 100), B('bounce', 2360, G - 20, 70, 20), P(2140, 1480, 160));
  props.push({ k: 'lamp', x: 1220, y: G }, { k: 'car', x: 1580, y: G }, { k: 'fence', x: 1940, y: G }, { k: 'car', x: 2370, y: G, s: 0.9 }, { k: 'sign', x: 2680, y: G });
  // 3. The parkour tower: zig-zag up to the very top.
  const tx = 2900;
  // Its walls stop above the ground so you can walk in underneath.
  pl.push(B('wall', tx, 600, 60, G - 240 - 600), B('wall', tx + 640, 900, 60, G - 240 - 900));
  for (let k = 0; k < 9; k++) pl.push(P(k % 2 ? tx + 380 : tx + 120, G - 200 - k * 190, 160, 20));
  pl.push(M(tx + 250, 640, 140, 220, 0, 4), B('concrete', tx - 40, 560, 340, 40), B('ice', tx + 300, 760, 260, 24), P(tx + 760, 1100, 200), P(tx + 760, 1600, 160), P(tx + 760, 2050, 160));
  props.push({ k: 'tower', x: tx + 130, y: 560 }, { k: 'sign', x: tx + 860, y: G });
  // 4. The spike yard: stepping stones over spikes, and slippery ice.
  const sx = 3800;
  pl.push(B('spikes', sx, G - 20, 700, 20), P(sx + 40, 2280, 120), P(sx + 260, 2180, 100), P(sx + 460, 2280, 120), M(sx + 180, 1980, 140, 260, 0, 3.5, 0.3), B('ice', sx - 40, 1760, 420, 24), B('ice', sx + 460, 1600, 360, 24), P(sx + 160, 1440, 200), B('bounce', sx + 720, G - 20, 80, 20));
  props.push({ k: 'bush', x: sx - 60, y: G }, { k: 'lamp', x: sx + 760, y: G });
  // 5. The building site: crates to climb, lifts going up and down.
  const bx = 4700;
  pl.push(B('concrete', bx, G - 120, 160, 120), B('concrete', bx + 160, G - 240, 160, 240), B('concrete', bx + 320, G - 120, 120, 120));
  pl.push(M(bx + 520, 2300, 140, 0, -900, 6), P(bx + 700, 1400, 300), M(bx + 1040, 1380, 140, 0, 700, 6, 0.5), B('concrete', bx + 300, 1180, 240, 40), P(bx + 40, 1000, 220), B('glass', bx + 600, 1000, 300, 20));
  props.push({ k: 'crate', x: bx + 480, y: G }, { k: 'crate', x: bx + 900, y: G, s: 1.3 }, { k: 'tower', x: bx + 1150, y: G, s: 1.4 }, { k: 'sign', x: bx - 60, y: G });
  // 6. The rooftops: tall buildings with gaps between them, bounce pads to get up.
  const rx = 6000;
  pl.push(house(rx, 260, 700), house(rx + 360, 220, 1000), house(rx + 680, 280, 820), B('bounce', rx + 280, G - 20, 60, 20), B('bounce', rx + 600, G - 20, 60, 20), B('bounce', rx + 980, G - 20, 60, 20));
  pl.push(P(rx - 160, 2100, 120), P(rx - 120, 1900, 100), P(rx + 280, 1580, 60), P(rx + 600, 1380, 60), P(rx + 1000, 1200, 120), M(rx + 400, 1180, 160, 300, 0, 5));
  props.push({ k: 'lamp', x: rx - 40, y: G }, { k: 'car', x: rx + 1080, y: G });
  // Houses in the background (you can't stand on these).
  for (let i = 0; i < 14; i++) props.unshift({ k: 'house', x: 200 + i * 520 + (i % 3) * 60, y: G, s: 0.9 + (i % 4) * 0.25 });
  // Start spread out along the ground.
  const spawns: Vec[] = Array.from({ length: 16 }, (_, i) => ({ x: 200 + i * 430, y: G }));
  return { platforms: pl, props, spawns };
}

const built = town();

/** Stickman Infection's own map: a very big town (not in the map list). */
export const INFECTION_MAP: MapDef = {
  id: 'town',
  name: 'm.town',
  w: W,
  h: H,
  theme: 'infect',
  builtin: true,
  platforms: built.platforms,
  props: built.props,
  spawns: built.spawns,
};
