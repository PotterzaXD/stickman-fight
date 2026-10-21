import { nearestEnemy } from './ai';
import { Fighter, type Body, type Projectile } from './entities';
import type { Game } from './game';

/**
 * The October 20 bosses.
 * The Magical Elephant (12,500 HP) flies with its big ears and takes turns between five moves:
 * Trunk Slam, Dive Stomp, Water Spray, Tusk Charge and Trumpet Blast.
 * The Giant Scarecrow and Robo Stick are giant stickmen whose weapon takes turns between three skills.
 */
export const ELEPHANT = {
  slam: 80,
  slamR: 190,
  stomp: 120,
  stompR: 340,
  spray: 12,
  charge: 90,
  trumpet: 40,
  trumpetR: 480,
  /** Seconds of flying around between moves. */
  rest: 2.4,
};
export const SCARECROW = { crow: 25, crows: 5, hay: 60 };
export const ROBO = { laser: 38, rocket: 70, stomp: 150, stompR: 360 };

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Where the trunk ends (it hangs down in front of the head). */
export function trunkTip(f: Fighter) {
  return { x: f.x + f.facing * f.w * 0.5, y: f.y - f.h * 0.15 };
}

/** The Elephant flies around and takes turns between its five moves. */
export function updateElephant(g: Game, f: Fighter, dt: number) {
  f.stun = 0;
  f.frozenT = 0;
  f.bubbleT = 0;
  if (g.cut) return;
  f.elT -= dt;
  let t = f.elTarget && f.elTarget.alive ? f.elTarget : null;
  if (!t || Math.random() < dt * 0.3) t = f.elTarget = nearestEnemy(g, f);
  const top = Math.min(...g.map.platforms.map((p) => p.y), g.map.h * 0.6);
  let tx = g.map.w / 2 + Math.sin(g.time * 0.4 + f.id) * g.map.w * 0.3;
  let ty = top - 140;
  let speed = 380;
  switch (f.elState) {
    case 'fly':
      // Hover above whoever it is after, ears flapping.
      if (t) {
        tx = t.x - sign(t.x - f.x) * 120;
        ty = t.y - 300 + Math.sin(g.time * 2) * 30;
      }
      if (f.elT <= 0 && t) startMove(g, f);
      break;
    case 'slam': {
      // Swoop at the target and smack the ground with the trunk.
      f.thrustT = 0.2;
      if (t) {
        tx = t.x - sign(t.x - f.x || 1) * 90;
        ty = t.y - 70;
        speed = 950;
      }
      const tip = trunkTip(f);
      if ((t && Math.hypot(t.x - tip.x, t.cy - tip.y) < 150) || f.elT <= 0) {
        g.ring(tip.x, tip.y + 40, ELEPHANT.slamR, 0.35, '#bdbdbd');
        g.burst(tip.x, tip.y + 30, '#a1887f', 18, 380);
        g.text(f.x, f.y - f.h - 20, 'TRUNK SLAM!', '#ffeb3b', 28);
        g.shake = Math.min(18, g.shake + 8);
        g.play('boom');
        hitAround(g, f, tip.x, tip.y + 30, ELEPHANT.slamR, ELEPHANT.slam, 600, -700);
        rest(f);
      }
      break;
    }
    case 'rise':
      // Fly way up over the target, then drop like a rock.
      if (t) tx = t.x;
      ty = top - 520;
      speed = 700;
      if (f.elT <= 0 || Math.abs(f.y - ty) < 40) {
        f.elState = 'drop';
        f.elT = 2.5;
        f.vx *= 0.2;
        f.vy = 900;
        g.text(f.x, f.y - f.h - 20, '⬇️ STOMP!', '#ff5252', 30);
        g.play('jump');
      }
      break;
    case 'drop':
      f.vy = Math.min(2200, f.vy + 3600 * dt);
      f.vx *= Math.max(0, 1 - 3 * dt);
      g.stepBody(f, dt, 0);
      if (f.onGround || f.elT <= 0 || f.y > g.map.h + 100) {
        g.ring(f.x, f.y, ELEPHANT.stompR, 0.45, '#8d6e63');
        g.burst(f.x, f.y, '#a1887f', 30, 520);
        g.shake = Math.min(18, g.shake + 14);
        g.play('boom');
        g.breakGlassAt(f.x, f.y, ELEPHANT.stompR * 0.6, f);
        for (const e of g.bodies()) {
          if (!e.alive || e.team === f.team) continue;
          const dx = e.x - f.x;
          if (Math.abs(dx) > ELEPHANT.stompR + e.w / 2 || Math.abs(e.y - f.y) > 260) continue;
          g.damage(e, ELEPHANT.stomp * (f.dmgMult / 1.5), f, (sign(dx) || 1) * 800, -1000, 'fling');
        }
        f.onGround = false;
        f.vy = -700;
        rest(f);
      }
      walk(f, dt);
      return;
    case 'spray':
      // Spray water from the trunk at the target.
      f.thrustT = 0.2;
      if (t) {
        tx = t.x - sign(t.x - f.x || 1) * 380;
        ty = t.y - 220;
        f.facing = sign(t.x - f.x) || f.facing;
      }
      speed = 200;
      f.elTick -= dt;
      if (t && f.elTick <= 0) {
        f.elTick = 0.12;
        const tip = trunkTip(f);
        const a = Math.atan2(t.cy - tip.y, t.x - tip.x) + (Math.random() - 0.5) * 0.25;
        g.spawnProj('water', f, tip.x, tip.y, a, 1100 + Math.random() * 200, 500, ELEPHANT.spray * (f.dmgMult / 1.5), 0);
        if (Math.random() < 0.3) g.play('splash');
      }
      if (f.elT <= 0) rest(f);
      break;
    case 'charge': {
      // Tusks first, straight across the map. Anyone in the way gets thrown.
      f.dashT = 0.2;
      const dir = f.facing;
      f.vx = dir * 1300;
      f.vy *= Math.max(0, 1 - 4 * dt);
      for (const e of g.bodies()) {
        if (!e.alive || e.team === f.team) continue;
        if (Math.abs(e.x - (f.x + dir * f.w * 0.3)) > f.w * 0.55 + e.w / 2 || Math.abs(e.cy - f.cy) > f.h * 0.6 + e.h / 2) continue;
        if ((f.hitCd.get(e.id) ?? 0) > g.time) continue;
        f.hitCd.set(e.id, g.time + 0.8);
        g.damage(e, ELEPHANT.charge * (f.dmgMult / 1.5), f, dir * 1100, -800, 'fling');
      }
      if (Math.random() < 0.4) g.burst(f.x - dir * f.w * 0.5, f.cy, '#eeeeee', 2, 160, false);
      f.x = clamp(f.x + f.vx * dt, -150, g.map.w + 150);
      f.y += f.vy * dt;
      if (f.elT <= 0 || f.x <= -150 || f.x >= g.map.w + 150) rest(f);
      walk(f, dt);
      return;
    }
  }
  // Fly toward (tx, ty).
  const dx = tx - f.x;
  const dy = ty - f.y;
  const d = Math.hypot(dx, dy) || 1;
  const want = Math.min(speed, d * 3);
  const k = Math.min(1, 3.5 * dt);
  f.vx += ((dx / d) * want - f.vx) * k;
  f.vy += ((dy / d) * want - f.vy) * k;
  f.x = clamp(f.x + f.vx * dt, -150, g.map.w + 150);
  f.y = clamp(f.y + f.vy * dt, -700, g.map.h + 50);
  f.onGround = false;
  if (f.elState !== 'spray' && Math.abs(f.vx) > 30) f.facing = sign(f.vx);
  walk(f, dt);
}

/** The ears flap faster when it is in a hurry. */
function walk(f: Fighter, dt: number) {
  f.walkPhase += dt * (f.elState === 'fly' ? 9 : 16);
}

function rest(f: Fighter) {
  f.elState = 'fly';
  f.elT = ELEPHANT.rest;
  f.hitCd.clear();
}

function startMove(g: Game, f: Fighter) {
  const m = f.elMove;
  f.elMove = (m + 1) % 5;
  f.hitCd.clear();
  const t = f.elTarget;
  if (m === 0) {
    f.elState = 'slam';
    f.elT = 2;
  } else if (m === 1) {
    f.elState = 'rise';
    f.elT = 1.6;
  } else if (m === 2) {
    f.elState = 'spray';
    f.elT = 1.6;
    f.elTick = 0.3;
    g.text(f.x, f.y - f.h - 20, '💦', '#81d4fa', 30);
  } else if (m === 3) {
    f.elState = 'charge';
    f.elT = 1.3;
    f.facing = t ? sign(t.x - f.x) || 1 : f.facing;
    // Line up with the target first.
    if (t) f.y = clamp(t.y - f.h * 0.35, -700, g.map.h);
    g.text(f.x, f.y - f.h - 20, '🐘💨', '#ffffff', 30);
    g.play('jump');
  } else {
    // Trumpet Blast: PAWOOO! Everyone close gets pushed away.
    g.ring(f.x, f.cy, ELEPHANT.trumpetR, 0.5, '#fff59d');
    g.ring(f.x, f.cy, ELEPHANT.trumpetR * 0.6, 0.4, '#ffffff');
    g.text(f.x, f.y - f.h - 30, '🎺 PAWOOO!', '#fff59d', 34);
    g.shake = Math.min(18, g.shake + 10);
    g.play('wind');
    for (const e of g.bodies()) {
      if (!e.alive || e.team === f.team) continue;
      const dx = e.x - f.x;
      if (Math.hypot(dx, e.cy - f.cy) > ELEPHANT.trumpetR + e.w / 2) continue;
      if (g.damage(e, ELEPHANT.trumpet * (f.dmgMult / 1.5), f, (sign(dx) || 1) * 1100, -700, 'fling') && e.alive) e.stun = Math.max(e.stun, 0.6);
    }
    rest(f);
  }
}

function hitAround(g: Game, f: Fighter, x: number, y: number, R: number, dmg: number, push: number, up: number) {
  for (const e of g.bodies()) {
    if (!e.alive || e.team === f.team) continue;
    const dx = e.x - x;
    if (Math.hypot(dx, e.cy - y) > R + e.w / 2) continue;
    g.damage(e, dmg * (f.dmgMult / 1.5), f, (sign(dx) || 1) * push, up, 'ragdoll');
  }
}

/** The Giant Scarecrow: Crow Swarm, Pitchfork Thrust, Hay Bale. */
export function scarecrowSkill(g: Game, f: Fighter, slot: number, angle: number) {
  const n = f.fishNext;
  f.fishNext = (n + 1) % 3;
  const m = f.dmgMult / 1.5;
  if (n === 0) {
    // Crows fly out and chase the closest enemies.
    const sh = f.shoulder();
    for (let k = 0; k < SCARECROW.crows; k++) {
      const a = -Math.PI / 2 + (k - (SCARECROW.crows - 1) / 2) * 0.5;
      g.spawnProj('crow', f, sh.x, sh.y - 20, a, 650, 0, SCARECROW.crow * m, slot);
    }
    g.text(f.x, f.y - f.h - 30, '🐦‍⬛ CAW CAW!', '#ffffff', 30);
  } else if (n === 1) {
    // Pitchfork Thrust: a long poke (like the spear's thrust, but huge).
    f.thrustT = 0.4;
    f.thrustAngle = angle;
    f.thrustSlot = slot;
    f.hitCd.clear();
    g.play('throw');
  } else {
    // Hay Bale: a big bale rolls out both ways along the ground.
    for (const d of [-1, 1]) {
      g.spawnProj('hay', f, f.x + d * 60, f.y - 40, d > 0 ? 0 : Math.PI, 700, 0, SCARECROW.hay * m, slot);
      g.projectiles[g.projectiles.length - 1].dir = d;
    }
    g.burst(f.x, f.y - 20, '#e6c35c', 20, 380);
    g.text(f.x, f.y - f.h - 30, '🌾', '#e6c35c', 34);
  }
}

/** A crow turns toward the closest enemy as it flies. */
export function steerCrow(g: Game, p: Projectile, dt: number) {
  if (p.t < 0.25) return;
  const t = nearestEnemy(g, p.owner as Body, 1400);
  if (!t) return;
  const want = Math.atan2(t.cy - p.y, t.x - p.x);
  const cur = Math.atan2(p.vy, p.vx);
  const diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
  const a = cur + clamp(diff, -3.2 * dt, 3.2 * dt);
  const v = Math.hypot(p.vx, p.vy);
  p.vx = Math.cos(a) * v;
  p.vy = Math.sin(a) * v;
}

/** Robo Stick: Laser Burst, Missile Barrage, Rocket Stomp. */
export function roboSkill(g: Game, f: Fighter, slot: number, angle: number) {
  const n = f.fishNext;
  f.fishNext = (n + 1) % 3;
  const m = f.dmgMult / 1.5;
  const tip = f.tip(slot);
  if (n === 0) {
    for (const spread of [-0.24, -0.12, 0, 0.12, 0.24]) g.spawnProj('laser', f, tip.x, tip.y, angle + spread, 2400, 0, ROBO.laser * m, slot);
    g.burst(tip.x, tip.y, '#ff1744', 12, 260);
    g.text(f.x, f.y - f.h - 30, 'PEW PEW!', '#ff5252', 28);
  } else if (n === 1) {
    for (let k = 0; k < 4; k++) g.spawnProj('rocket', f, tip.x, tip.y, angle + (k - 1.5) * 0.18, 900 + k * 60, 0, ROBO.rocket * m, slot);
    g.burst(tip.x, tip.y, '#ff9800', 14, 280);
    g.text(f.x, f.y - f.h - 30, '🚀🚀🚀🚀', '#ffffff', 28);
  } else {
    // Rocket Stomp: blast off, then smash down.
    f.slamDmg = ROBO.stomp * m;
    f.slamR = ROBO.stompR;
    f.slamming = true;
    if (f.onGround) {
      f.vy = -1250;
      f.onGround = false;
    } else f.vy = 1800;
    g.burst(f.x, f.y, '#ff9800', 18, 320);
    g.play('jump');
  }
}
