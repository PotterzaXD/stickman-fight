import { Cat, Fighter, ZOMBIES, ZOMBIE_ALLY, isZombie, type Body, type ZombieKind } from './entities';
import type { Game } from './game';
import type { OutbreakInfo } from './types';
import { OB_ZOMBIE_FROM } from './maps';
import { weapon } from './weapons';

/** The Outbreak: zombie waves at night. Clear a wave and the morning brings everyone with lives left back. */
export const OUTBREAK = {
  /** Zombies up at the same time (the rest wait their turn). */
  maxAlive: 25,
  /** Seconds between zombies coming in. */
  every: 0.6,
  /** Seconds of the "Wave N" title before the first zombie. */
  intro: 2.2,
  /** Seconds of the morning cutscene. */
  dawn: 4.5,
  lives: 5,
  /** The Zombie Boss calls minis this often. */
  bossCall: 9,
  boomR: 140,
};

export type ObPhase = 'intro' | 'night' | 'dawn' | 'done' | 'lost';
export const OB_PHASES: ObPhase[] = ['intro', 'night', 'dawn', 'done', 'lost'];

export interface OutbreakState {
  wave: number;
  endless: boolean;
  /** Zombies still to come this wave (the Zombie Boss is in the list on every 10th wave). */
  queue: ZombieKind[];
  spawnT: number;
  /** 1 = night, 0 = day. */
  night: number;
  phase: ObPhase;
  t: number;
  /** Zombies left (to come + up). Sent to the joining devices for the HUD. */
  left: number;
  horde: Fighter;
  revived: boolean;
}

/** Which zombies show up from which wave, and how often. */
function pick(wave: number): ZombieKind {
  const pool: [ZombieKind, number][] = [['znormal', 6]];
  if (wave >= 2) pool.push(['zmini', 3]);
  if (wave >= 3) pool.push(['zrunner', 3]);
  if (wave >= 4) pool.push(['zshooter', 2]);
  if (wave >= 5) pool.push(['zbig', 1]);
  if (wave >= 6) pool.push(['zexploder', 2]);
  let r = Math.random() * pool.reduce((s, p) => s + p[1], 0);
  for (const [k, w] of pool) if ((r -= w) < 0) return k;
  return 'znormal';
}

export function waveQueue(wave: number, players: number): ZombieKind[] {
  const n = Math.min(90, 5 + 2 * wave + 2 * Math.max(0, players - 1));
  const q = Array.from({ length: n }, () => pick(wave));
  if (wave % 10 === 0) q.splice(Math.floor(n / 2), 0, 'zboss');
  return q;
}

/** Zombies hit harder each wave: 1× at wave 1 up to 2× at wave 50, and it stays 2× after that in Endless. */
export const zombieMult = (wave: number) => Math.min(2, 1 + Math.max(0, wave - 1) / 49);

/** Zombie Boss HP: 3,000 at wave 10, +1,000 every 10 waves after. */
export const zbossHp = (wave: number) => ZOMBIES.zboss.hp + 1000 * Math.max(0, Math.floor(wave / 10) - 1);

export function startOutbreak(g: Game, info: OutbreakInfo, name: string) {
  // The zombies' leader: never on the map, it just owns the zombies (same place in the list on every device).
  const horde = new Fighter({ name, color: '#7cb342', team: 99, human: false, weapons: [weapon('fists')], x: -9999, y: -9999 });
  horde.alive = false;
  horde.hp = 0;
  horde.horde = true;
  g.fighters.push(horde);
  const players = g.fighters.filter((f) => !f.horde && !f.boss && !f.cloneOf).length;
  g.ob = { wave: info.wave, endless: info.endless, queue: waveQueue(info.wave, players), spawnT: OUTBREAK.intro, night: 1, phase: 'intro', t: 0, left: 0, horde, revived: false };
  g.ob.left = g.ob.queue.length;
  // Zombie allies: one from wave 10, one more every 10 waves. They fight for the first player.
  const lead = g.fighters.find((f) => !f.horde && f.alive) ?? g.fighters[0];
  for (let k = 0; k < info.allies && lead; k++) {
    const c = new Cat(lead, lead.x + (k % 2 ? 1 : -1) * (50 + 30 * k), lead.y - 10, ZOMBIE_ALLY.hp, ZOMBIE_ALLY.dmg, 'zombie');
    g.cats.push(c);
  }
}

/** Seconds a zombie takes to climb out of the ground at the Castle Gate. */
export const RISE_S = 1;

function spawnZombie(g: Game, kind: ZombieKind) {
  const ob = g.ob!;
  // The Castle Gate: they climb out of the ground on the right.
  if (g.map.deco === 'castle') return riseZombie(g, kind);
  const plats = g.map.platforms.filter((p) => p.kind !== 'lava' && p.kind !== 'spikes' && p.w >= 60);
  // From the sides of the map or dropping in from the sky.
  let x: number;
  let y: number;
  if (plats.length && Math.random() < 0.6) {
    const p = plats[Math.floor(Math.random() * plats.length)];
    x = p.x + 20 + Math.random() * Math.max(1, p.w - 40);
    y = p.y - 380;
  } else {
    x = Math.random() < 0.5 ? 40 : g.map.w - 40;
    const p = plats.length ? plats.reduce((a, b) => (Math.abs(b.x + b.w / 2 - x) < Math.abs(a.x + a.w / 2 - x) ? b : a)) : null;
    if (p) x = Math.max(p.x + 10, Math.min(p.x + p.w - 10, x));
    y = (p?.y ?? g.map.h / 2) - 200;
  }
  const z = ZOMBIES[kind];
  const c = new Cat(ob.horde, x, y, kind === 'zboss' ? zbossHp(ob.wave) : z.hp, z.dmg * zombieMult(ob.wave), kind);
  c.facing = x < g.map.w / 2 ? 1 : -1;
  g.cats.push(c);
  g.burst(x, y + 30, '#7cb342', 8, 200);
  if (kind === 'zboss') {
    g.text(x, y - 60, '🧟‍♂️ ZOMBIE BOSS!', '#c5e1a5', 40);
    g.play('heavy');
  }
}

function riseZombie(g: Game, kind: ZombieKind) {
  const ob = g.ob!;
  const ground = g.map.platforms[0];
  const x = g.map.w * OB_ZOMBIE_FROM + Math.random() * (g.map.w * (1 - OB_ZOMBIE_FROM) - 80);
  const z = ZOMBIES[kind];
  const c = new Cat(ob.horde, x, ground.y, kind === 'zboss' ? zbossHp(ob.wave) : z.hp, z.dmg * zombieMult(ob.wave), kind);
  c.rise = RISE_S;
  c.riseTo = ground.y;
  c.y = ground.y + c.h;
  c.facing = -1;
  g.cats.push(c);
  g.burst(x, ground.y - 4, '#5d4037', 10, 220);
  if (kind === 'zboss') {
    g.text(x, ground.y - 260, '🧟‍♂️ ZOMBIE BOSS!', '#c5e1a5', 40);
    g.play('heavy');
  }
}

/** A zombie climbing out of the ground: it can't do anything until it's out. Returns true while it is still climbing. */
export function updateRise(g: Game, c: Cat, dt: number): boolean {
  if (c.rise <= 0) return false;
  c.rise -= dt;
  c.vx = 0;
  c.vy = 0;
  c.y = c.riseTo + c.h * Math.max(0, c.rise / RISE_S);
  // Dirt flies as it digs out.
  if (Math.random() < dt * 12) g.burst(c.x + (Math.random() - 0.5) * c.w, c.riseTo - 2, '#6d4c41', 2, 160, false);
  if (c.rise <= 0) {
    c.y = c.riseTo;
    c.onGround = true;
  }
  return true;
}

const zombiesUp = (g: Game) => g.cats.filter((c) => c.alive && isZombie(c.variant));

/** The Zombie Boss calls 3 little zombies every few seconds (in The Outbreak and in Sandbox). */
export function updateZombieBosses(g: Game, dt: number) {
  const up = zombiesUp(g);
  for (const b of up) {
    if (b.variant !== 'zboss') continue;
    b.skillCd -= dt;
    if (b.skillCd > 0) continue;
    b.skillCd = OUTBREAK.bossCall;
    // Not too many at once (Sandbox's own zombies count too).
    if (up.filter((z) => z.team === b.team).length >= OUTBREAK.maxAlive + 5) continue;
    const mult = g.ob ? zombieMult(g.ob.wave) : 1;
    for (let k = 0; k < 3; k++) {
      const z = new Cat(b.owner, b.x + (k - 1) * 50, b.y - b.h, ZOMBIES.zmini.hp, ZOMBIES.zmini.dmg * mult, 'zmini');
      z.team = b.team;
      z.color = b.color;
      z.vy = -500;
      g.cats.push(z);
    }
    g.text(b.x, b.y - b.h - 20, '🧟 ×3', '#c5e1a5', 28);
    g.ring(b.x, b.y - b.h / 2, 140, 0.4, '#7cb342');
  }
}

export function updateOutbreak(g: Game, dt: number) {
  const ob = g.ob!;
  ob.t += dt;
  const up = zombiesUp(g);
  ob.left = ob.queue.length + up.length;
  if (ob.phase === 'intro') {
    if (ob.t < dt * 1.5) g.text(g.map.w / 2, g.map.h * 0.3, `🌙 Wave ${ob.wave}`, '#c5e1a5', 64);
    if (ob.t >= OUTBREAK.intro) {
      ob.phase = 'night';
      ob.t = 0;
      ob.spawnT = 0;
    }
    return;
  }
  if (ob.phase === 'night') {
    ob.spawnT -= dt;
    if (ob.queue.length && ob.spawnT <= 0 && up.length < OUTBREAK.maxAlive) {
      spawnZombie(g, ob.queue.shift()!);
      ob.spawnT = OUTBREAK.every * (0.6 + Math.random() * 0.8);
    }
    if (!ob.queue.length && !up.length && !lost(g)) {
      ob.phase = 'dawn';
      ob.t = 0;
      g.text(g.map.w / 2, g.map.h * 0.3, '☀️ Morning!', '#ffe082', 64);
      g.play('win');
    }
    return;
  }
  if (ob.phase === 'dawn') {
    ob.night = Math.max(0, 1 - ob.t / OUTBREAK.dawn);
    // Halfway into the morning: everyone with lives left gets up again.
    if (!ob.revived && ob.t >= OUTBREAK.dawn / 2) {
      ob.revived = true;
      for (const f of g.fighters) {
        if (f.alive || f.horde || f.boss || f.cloneOf || f.lives <= 0) continue;
        revive(g, f);
      }
    }
    if (ob.t >= OUTBREAK.dawn) ob.phase = 'done';
  }
}

function revive(g: Game, f: Fighter) {
  const plats = g.map.platforms.filter((p) => p.kind !== 'lava' && p.kind !== 'spikes' && p.kind !== 'wall' && p.w >= 60);
  const p = plats.length ? plats.reduce((a, b) => (b.w > a.w ? b : a)) : null;
  // The Castle Gate: back up in front of the castle.
  const spot = g.map.spawns.length ? g.map.spawns[Math.floor(Math.random() * g.map.spawns.length)] : null;
  f.alive = true;
  f.hp = f.maxHp;
  f.x = spot ? spot.x : p ? p.x + 30 + Math.random() * Math.max(1, p.w - 60) : g.map.w / 2;
  f.y = (spot?.y ?? p?.y ?? g.map.h / 2) - 4;
  f.vx = 0;
  f.vy = -200;
  f.burnT = f.poisonT = f.frozenT = f.slowT = 0;
  g.burst(f.x, f.y - 40, '#ffe082', 14, 260);
  g.text(f.x, f.y - 110, `❤️ ${f.lives}`, '#ffffff', 24);
}

/** Lost: nobody on your side is still up (one Little Pigeon doesn't count). */
function lost(g: Game): boolean {
  const ours = (b: Body) => b.alive && b.team !== 99;
  if (g.fighters.some((f) => !f.horde && ours(f))) return false;
  return !g.cats.some((c) => ours(c) && c.variant !== 'lilpigeon') && !g.snowmen.some(ours);
}

export function outbreakWinner(g: Game): { decided: boolean; team: number | null } {
  const ob = g.ob!;
  if (ob.phase === 'done') return { decided: true, team: 0 };
  if (ob.phase !== 'dawn' && ob.phase !== 'intro' && lost(g)) {
    ob.phase = 'lost';
    return { decided: true, team: 99 };
  }
  if (ob.phase === 'lost') return { decided: true, team: 99 };
  return { decided: false, team: null };
}

/** The Exploder zombie blows up: it hurts everyone near it who is not a zombie. */
export function zombieBoom(g: Game, c: Cat) {
  const R = OUTBREAK.boomR;
  g.ring(c.x, c.cy, R, 0.4, '#aed581');
  g.burst(c.x, c.cy, '#aed581', 22, 420);
  g.burst(c.x, c.cy, '#558b2f', 12, 260);
  g.play('boom');
  for (const b of [...g.fighters, ...g.cats, ...g.snowmen]) {
    if (!b.alive || b === c || b.team === c.team) continue;
    const d = Math.hypot(b.x - c.x, b.cy - c.cy);
    if (d > R + b.w / 2) continue;
    const dir = Math.sign(b.x - c.x) || 1;
    g.damage(b, c.touchDmg, c, dir * 700, -600, 'ragdoll');
  }
}
