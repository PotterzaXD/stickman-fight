import { BotBrain, nearestEnemy } from './ai';
import { Fighter, type Body } from './entities';
import type { Game } from './game';
import type { Intent } from './types';
import { isSummonCard, weapon, type WeaponId } from './weapons';

/*
 * The boss with your own name (opens once PHYLISHIEUS's final phase is beaten).
 * It looks like your stickman (your colour and hat), flies, fights with the weapons you own (never a summoning one),
 * hits twice as hard, has 1,000 HP and is VERY good at dodging. Only you, alone, can fight it.
 */

export const ME = { hp: 1000, power: 2, coins: 50000, swapEvery: 9, dodge: 0.6, dodgeCd: 0.45, dodgeDist: 150, hover: 150, speed: 330 };

/** Weapons that call helpers (the boss never uses these). */
const SUMMONING: string[] = ['catcall', 'treasure', 'recall', 'summoner', 'chicklord', 'lilpigeon', 'bone', 'bravery', 'beehive', 'ninjascroll', 'snowball', 'fryfish'];
export const isSummoning = (id: string) => SUMMONING.includes(id) || isSummonCard(id);

/** Two different weapons from the ones you own (sword if you own nothing else). */
export function mePick(owned: string[]): WeaponId[] {
  const pool = owned.filter((id) => !isSummoning(id) && weapon(id).id === id && weapon(id).special !== 'boss');
  if (!pool.length) return ['sword', 'sword'];
  const a = pool[Math.floor(Math.random() * pool.length)];
  const rest = pool.filter((id) => id !== a);
  const b = rest.length ? rest[Math.floor(Math.random() * rest.length)] : a;
  return [a, b] as WeaponId[];
}

/** Put your look-alike in the match. `owned` = the weapons it may use. */
export function makeMe(g: Game, name: string, color: string, hat: string, owned: string[], team: number, hp = ME.hp): Fighter {
  const ids = mePick(owned);
  const f = new Fighter({ name, color, team, human: false, weapons: ids.map((id) => weapon(id)), x: g.map.w / 2, y: 200, boss: true, hp });
  // Your size, not a giant.
  f.scale = 1;
  f.w = 30;
  f.h = 80;
  f.dmgMult = 1;
  f.power = ME.power;
  f.speed = ME.speed;
  f.hat = hat;
  f.me = { owned: owned.filter((id) => !isSummoning(id)), swapT: ME.swapEvery, dodgeCd: 0, bob: Math.random() * 6 };
  f.brain = new BotBrain('boss');
  const top = [...g.map.platforms].filter((p) => p.kind !== 'lava').sort((p, q) => q.w - p.w)[0];
  f.x = top ? top.x + top.w * 0.75 : g.map.w * 0.75;
  f.y = (top?.y ?? g.map.h / 2) - 260;
  g.fighters.push(f);
  return f;
}

/** Flying: hover near the target (a little above and to the side), swap weapons now and then. */
export function meFly(g: Game, f: Fighter, it: Intent, dt: number) {
  const me = f.me!;
  me.bob += dt;
  me.dodgeCd -= dt;
  me.swapT -= dt;
  if (me.swapT <= 0) {
    me.swapT = ME.swapEvery;
    const ids = mePick(me.owned.length ? me.owned : ['sword']);
    f.weapons = ids.map((id) => weapon(id));
    f.cds = f.weapons.map(() => 0);
    f.boomerangOut = f.weapons.map(() => false);
    g.text(f.x, f.y - f.h - 30, '🔄', '#ffffff', 22);
  }
  const t = nearestEnemy(g, f);
  let tx = g.map.w / 2;
  let ty = g.map.h * 0.4;
  if (t) {
    const side = f.x < t.x ? -1 : 1;
    // Close enough to swing, high enough to be out of easy reach.
    const reach = Math.max(70, f.reach(0) * 0.8);
    tx = t.x + side * reach;
    ty = t.y - ME.hover + Math.sin(me.bob * 2.2) * 40;
  }
  ty = Math.max(80, Math.min(g.map.h - 60, ty));
  const dx = tx - f.x;
  it.moveX = Math.abs(dx) > 20 ? Math.max(-1, Math.min(1, dx / 160)) : 0;
  it.jump = false;
  it.shield = false;
  f.vy += ((ty - f.y) * 3 - f.vy) * Math.min(1, dt * 4);
  // Dodge what's flying at it.
  if (me.dodgeCd <= 0) {
    for (const p of g.projectiles) {
      if (p.team === f.team || p.dead) continue;
      const rx = f.x - p.x;
      const ry = f.cy - p.y;
      const d = Math.hypot(rx, ry);
      if (d > 220 || rx * p.vx + ry * p.vy <= 0) continue;
      dodge(g, f, p.vx, p.vy);
      break;
    }
  }
}

/** A sudden blink sideways (and up or down). */
function dodge(g: Game, f: Fighter, fromX: number, fromY: number) {
  const me = f.me!;
  me.dodgeCd = ME.dodgeCd;
  // Out of the line it came from.
  const len = Math.hypot(fromX, fromY) || 1;
  let nx = -fromY / len;
  let ny = fromX / len;
  if (Math.random() < 0.5) {
    nx = -nx;
    ny = -ny;
  }
  if (Math.abs(nx) < 0.3) nx = (Math.random() < 0.5 ? -1 : 1) * 0.6;
  g.burst(f.x, f.cy, '#ffffff', 8, 200);
  f.x = Math.max(40, Math.min(g.map.w - 40, f.x + nx * ME.dodgeDist));
  f.y = Math.max(f.h + 40, Math.min(g.map.h - 40, f.y + ny * ME.dodgeDist * 0.6 - 30));
  f.vx = nx * 300;
  f.vy = -120;
  g.text(f.x, f.y - f.h - 24, 'DODGE!', '#e1f5fe', 20);
  g.play('jump');
}

/** A hit about to land on it: very often it just isn't there anymore. Returns true when it dodged. */
export function meDodge(g: Game, target: Body, kx: number, ky: number): boolean {
  if (!(target instanceof Fighter) || !target.me || !target.alive) return false;
  // Burning, choking and the like can't be dodged.
  if (!kx && !ky) return false;
  if (target.me.dodgeCd > 0 || Math.random() > ME.dodge) return false;
  dodge(g, target, kx || 1, ky);
  return true;
}
