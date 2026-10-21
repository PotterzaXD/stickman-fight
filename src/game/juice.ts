import { Cat, Fighter, type Body } from './entities';
import type { Game } from './game';
import type { Platform } from './types';

/*
 * Screen juice (Settings, on by default): big hits freeze the game for a split second and throw sparks,
 * a KO flashes the screen and kicks the camera, and the last KO of a match plays in slow motion.
 * It's only on this device: online, the host's game never waits for it.
 */
export class Juice {
  on = false;
  /** Real seconds the game stays frozen (hit-stop). */
  stop = 0;
  /** Real seconds of slow motion left, and how slow. */
  slow = 0;
  slowK = 0.3;
  /** Screen flash: 0-1, and its colour. */
  flash = 0;
  flashColor = '#ffffff';
  /** Camera zoom kick (0 = none). */
  kick = 0;
  private lastStop = -1;

  /** Someone took a hit. */
  hit(g: Game, target: Body, amount: number, kx: number) {
    if (!this.on) return;
    // Sparks fly the way the hit went.
    const dir = Math.sign(kx) || 1;
    const n = Math.min(10, 2 + Math.floor(amount / 12));
    for (let i = 0; i < n && g.particles.length < 700; i++) {
      const a = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.6;
      const v = 380 + Math.random() * 420;
      const life = 0.15 + Math.random() * 0.2;
      g.particles.push({ x: target.x, y: target.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life, max: life, color: Math.random() < 0.5 ? '#fff59d' : '#ffffff', size: 2 + Math.random() * 3, g: 600 });
    }
    // Hit-stop only for big hits on (or by) a player, and not over and over in a crowd.
    const human = target instanceof Fighter && target.human;
    if (amount >= 25 && (human || bigTarget(target)) && g.time - this.lastStop > 0.25) {
      this.stop = Math.max(this.stop, Math.min(0.1, 0.035 + amount / 900));
      this.lastStop = g.time;
    }
    if (human && amount >= 40) this.flashOf('#ff1744', 0.28);
  }

  /** A stickman went down. */
  ko(g: Game, f: Fighter) {
    if (!this.on) return;
    this.flashOf('#ffffff', f.human || f.boss ? 0.45 : 0.22);
    this.kick = Math.min(0.12, this.kick + 0.06);
    if (g.time - this.lastStop > 0.2) {
      this.stop = Math.max(this.stop, 0.08);
      this.lastStop = g.time;
    }
  }

  /** The match is decided: slow motion for a moment. */
  finale() {
    if (!this.on) return;
    this.slow = 1.3;
    this.kick = Math.min(0.15, this.kick + 0.08);
  }

  private flashOf(color: string, k: number) {
    if (k < this.flash) return;
    this.flash = k;
    this.flashColor = color;
  }

  /** How fast the game runs this frame (0 = frozen). `dt` is real time. */
  timeScale(dt: number): number {
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.kick = Math.max(0, this.kick - dt * 0.25);
    if (this.stop > 0) {
      this.stop -= dt;
      return 0;
    }
    if (this.slow > 0) {
      this.slow -= dt;
      return this.slowK;
    }
    return 1;
  }
}

/** Big bodies (bosses, the Zombie Boss) make the screen feel their hits too. */
const bigTarget = (b: Body) => (b instanceof Fighter && b.boss) || (b instanceof Cat && b.variant === 'zboss');

/**
 * Walls are solid from every side. Landing on top is done with the other platforms;
 * this pushes a body back out of the sides, and stops it jumping up through from below.
 */
export function wallPush(b: Body, p: Platform, prevX: number, prevY: number) {
  const half = b.w * 0.35;
  const top = b.y - b.h;
  if (b.x + half <= p.x || b.x - half >= p.x + p.w || b.y <= p.y + 0.5 || top >= p.y + p.h) return;
  // Bumped its head on the bottom of the wall.
  if (prevY - b.h >= p.y + p.h - 2 && b.vy < 0) {
    b.y = p.y + p.h + b.h;
    b.vy = 0;
    return;
  }
  // Pushed back out of the side it came from.
  if (prevX <= p.x + p.w / 2) {
    b.x = p.x - half;
    if (b.vx > 0) b.vx = 0;
  } else {
    b.x = p.x + p.w + half;
    if (b.vx < 0) b.vx = 0;
  }
}
