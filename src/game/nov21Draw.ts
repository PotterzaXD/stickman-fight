import type { Cat, Projectile } from './entities';
import type { Game } from './game';
import { drawHat } from './hats';
import { wrecksOf, type Wreck } from './nov21';
import { hpBar } from './render';
import { walkLegs } from './toys';
import { airBody, legoPilot, legoPilotOnFoot } from './nov28Draw';

type Ctx = CanvasRenderingContext2D;

/*
 * The November 21 update's pictures: the Golden Pistol, pistol soldiers, the Aircraft (tan jet 07 with two yellow
 * pilots in red shirts on top), the pilots who got out, golden bullets, and the big explosion with the falling wreck.
 */

const TAN = '#d8c9a3';
const TAN_DARK = '#b9a77c';
const GREY = '#8a8f96';
const OUT = 'rgba(0,0,0,0.85)';

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function poly(ctx: Ctx, pts: [number, number][], fill: string, stroke = OUT, w = 1.4) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = w;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ---------- the Golden Pistol ----------

/** A gold pistol with black grips and a glowing muzzle (local space: hand at 0, 0, pointing along +x). */
export function drawGoldPistol(ctx: Ctx, len: number, s: number, ready: boolean, time: number) {
  const L = Math.max(28, len / s);
  ctx.save();
  ctx.scale(s, s);
  if (ready) {
    ctx.shadowColor = '#ffd54f';
    ctx.shadowBlur = 10 + Math.sin(time * 6) * 4;
  }
  // Grip
  poly(ctx, [[-6, -2], [1, -2], [-1, 12], [-10, 12]], '#212121');
  ctx.shadowBlur = 0;
  // Frame and trigger guard
  poly(ctx, [[-8, -3], [L - 6, -3], [L - 6, 1], [-8, 1]], '#f9a825');
  ctx.strokeStyle = '#f57f17';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(3, 1.5, 3, 0, Math.PI);
  ctx.stroke();
  // Slide: bright gold with a shine stripe and serrations
  const gr = ctx.createLinearGradient(0, -9, 0, -3);
  gr.addColorStop(0, '#fff59d');
  gr.addColorStop(0.5, '#ffd54f');
  gr.addColorStop(1, '#f9a825');
  poly(ctx, [[-9, -9], [L, -9], [L + 1, -6], [L, -3], [-9, -3]], gr as unknown as string);
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = 0.6;
  for (let k = 0; k < 4; k++) line(ctx, -7 + k * 1.6, -8.5, -7 + k * 1.6, -3.5);
  // A star on the slide
  ctx.fillStyle = '#e65100';
  ctx.font = 'bold 6px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★', L * 0.45, -4.2);
  // Sights and muzzle
  ctx.fillStyle = '#212121';
  ctx.fillRect(L - 3, -11, 2, 2);
  ctx.fillRect(-8, -11, 3, 2);
  if (ready) {
    ctx.fillStyle = `rgba(255,213,79,${0.5 + Math.sin(time * 8) * 0.3})`;
    ctx.beginPath();
    ctx.arc(L + 2, -6, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- helpers ----------

export function drawNov21Helper(ctx: Ctx, c: Cat, time: number): boolean {
  switch (c.variant) {
    case 'gunsoldier':
      if (c.alive) drawGunSoldier(ctx, c, time);
      return true;
    case 'aircraft':
      if (c.alive) {
        drawAircraft(ctx, c, time);
        hpBar(ctx, c.x, c.y - c.h - 24, 46, c.hp / c.maxHp, c.owner.color);
      }
      return true;
    case 'pilot':
      if (c.alive) drawPilot(ctx, c);
      return true;
  }
  return false;
}

/** A stickman soldier with a helmet, holding a pistol out in front. */
function drawGunSoldier(ctx: Ctx, c: Cat, time: number) {
  const { x, y } = c;
  const d = c.facing || 1;
  const col = c.hurtFlash > 0 ? '#ffffff' : c.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const walk = walkLegs(x, y, 1, c.walkPhase * d, c.onGround && Math.abs(c.vx) > 20 ? Math.abs(c.vx) / 300 : 0, d);
  const kick = c.attackT > 0 ? 3 : 0;
  const hand: [number, number] = [x + d * (24 - kick), y - 56];
  const stroke = (w: number, cc: string) => {
    ctx.strokeStyle = cc;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const l of walk.legs) {
      ctx.moveTo(l.foot.x, l.foot.y);
      ctx.lineTo(l.knee.x, l.knee.y);
      ctx.lineTo(walk.hip.x, walk.hip.y);
    }
    ctx.moveTo(walk.hip.x, walk.hip.y);
    ctx.lineTo(x, y - 62);
    // Both hands on the pistol
    ctx.moveTo(x, y - 58);
    ctx.lineTo(...hand);
    ctx.moveTo(x, y - 58);
    ctx.lineTo(x + d * 12, y - 52);
    ctx.lineTo(hand[0] - d * 3, hand[1] + 2);
    ctx.stroke();
  };
  stroke(8, OUT);
  stroke(5, col);
  // The pistol (a plain dark one; the gold one is yours)
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.scale(d, 1);
  poly(ctx, [[-2, -1], [3, -1], [1, 8], [-4, 8]], '#212121');
  poly(ctx, [[-3, -6], [18, -6], [18, -1], [-3, -1]], '#455a64');
  if (c.attackT > 0.12) {
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.moveTo(18, -3.5);
    ctx.lineTo(28 + Math.sin(time * 60) * 3, -7);
    ctx.lineTo(25, -3.5);
    ctx.lineTo(28, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Head and helmet
  ctx.fillStyle = col;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y - 73, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + d * 4, y - 74, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x + d * 5, y - 74, 1.4, 0, Math.PI * 2);
  ctx.fill();
  drawHat(ctx, 'helmet', x, y - 73, 1, d);
  hpBar(ctx, x, y - c.h - 26, 34, c.hp / c.maxHp, c.color);
}

/** A pilot of Aircraft 07: LEGO pieces like Potter's, a round yellow stud piece on a see-through red flower plate. */
function pilotFigure(ctx: Ctx, x: number, y: number, s: number, _d: number, _sitting: boolean, flash: boolean) {
  legoPilot(ctx, x, y, s * 1.15, '#ffd600', '#e53935', true, flash);
}

/** The jet in profile, nose toward `d`, centred on (0, 0). Shared by the flying jet and the wreck. */
function jetBody(ctx: Ctx, d: number, time: number, wreck: boolean, flash: boolean) {
  const tan = flash ? '#ffffff' : wreck ? '#6d5f48' : TAN;
  const tanDark = wreck ? '#4e4334' : TAN_DARK;
  const grey = wreck ? '#4a4d52' : GREY;
  ctx.save();
  ctx.scale(d, 1);
  // Exhaust flame at the back
  if (!wreck) {
    const fl = 10 + Math.sin(time * 40) * 3 + Math.random() * 3;
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath();
    ctx.moveTo(-38, -4);
    ctx.lineTo(-38 - fl, 0);
    ctx.lineTo(-38, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.moveTo(-38, -2);
    ctx.lineTo(-38 - fl * 0.55, 0);
    ctx.lineTo(-38, 2);
    ctx.closePath();
    ctx.fill();
  }
  // Far wing (behind the body) with its gun
  poly(ctx, [[-30, -2], [-6, -2], [-20, -15], [-34, -15]], tanDark);
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(-26, -15, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#212121';
  ctx.lineWidth = 1.8;
  line(ctx, -26, -15, -4, -17);
  // Grey stepped block under the cockpit
  poly(ctx, [[-8, 4], [12, 4], [12, 12], [-4, 12]], grey);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (const yy of [7, 9.5]) line(ctx, -6, yy, 12, yy);
  // Main body
  poly(ctx, [[-38, -6], [8, -6], [8, 6], [-38, 6]], tan);
  // The nose: a long sloped wedge with chevrons
  poly(ctx, [[8, -6], [24, -6], [40, 1], [40, 6], [8, 6]], tan);
  ctx.strokeStyle = wreck ? '#2b2b2b' : '#37474f';
  ctx.lineWidth = 1.8;
  for (let k = 0; k < 3; k++) {
    const cx = 16 + k * 6;
    ctx.beginPath();
    ctx.moveTo(cx - 2, -3);
    ctx.lineTo(cx + 1.5, 0);
    ctx.lineTo(cx - 2, 3);
    ctx.stroke();
  }
  // "07" on the side
  ctx.fillStyle = wreck ? '#2b2b2b' : '#212121';
  ctx.font = '900 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (d < 0) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.fillText('07', 2, 0.5);
    ctx.restore();
  } else ctx.fillText('07', -2, 0.5);
  // Canopy (two see-through tiles) and the black roll bar behind it
  if (!wreck) {
    ctx.fillStyle = 'rgba(179,229,252,0.65)';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-6, -14, 14, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    line(ctx, -3, -12, 2, -12);
  }
  ctx.strokeStyle = '#212121';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-11, -6);
  ctx.lineTo(-11, -15);
  ctx.lineTo(-8, -15);
  ctx.stroke();
  // Near wing (in front) with its gun
  poly(ctx, [[-32, 2], [-8, 2], [-24, 13], [-38, 13]], tan);
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(-30, 12, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#212121';
  ctx.lineWidth = 2;
  line(ctx, -30, 12, -6, 13);
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(-6, 13, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The Aircraft: tilts as it climbs and dives, the two pilots ride on top at the back. */
function drawAircraft(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const tilt = Math.max(-0.35, Math.min(0.35, (c.vy / 420) * 0.35)) * d;
  ctx.save();
  ctx.translate(c.x, c.cy + Math.sin(time * 5 + c.id) * 1.5);
  ctx.rotate(tilt);
  ctx.scale(1.25, 1.25);
  // The pilots sit one behind the other at the back.
  pilotFigure(ctx, -d * 31, -5, 0.75, d, true, c.hurtFlash > 0);
  pilotFigure(ctx, -d * 18, -5, 0.75, d, true, c.hurtFlash > 0);
  jetBody(ctx, d, time, false, c.hurtFlash > 0);
  // Muzzle flashes on both guns
  if (c.attackT > 0.08) {
    ctx.fillStyle = '#ffeb3b';
    for (const yy of [-17, 13]) {
      ctx.beginPath();
      ctx.arc(d * -4 + d * 4, yy, 4 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A pilot on foot (out of the wreck or from Sandbox): 30 HP, a shot every 10 s. */
function drawPilot(ctx: Ctx, c: Cat) {
  legoPilotOnFoot(ctx, c, '#ffd600', '#e53935', true, 'gold');
}

// ---------- shots ----------

export function drawNov21Projectile(ctx: Ctx, p: Projectile): boolean {
  if (p.kind !== 'gold') return false;
  const a = Math.atan2(p.vy, p.vx);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(-26, 0, 4, 0);
  g.addColorStop(0, 'rgba(255,213,79,0)');
  g.addColorStop(1, 'rgba(255,236,179,0.95)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  line(ctx, -26, 0, 0, 0);
  ctx.fillStyle = '#ffca28';
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(1, 0, 4.5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  return true;
}

// ---------- the explosion and the falling wreck ----------

function fireball(ctx: Ctx, x: number, y: number, r: number, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.2, `rgba(255,245,157,${alpha})`);
  g.addColorStop(0.45, `rgba(255,171,0,${alpha * 0.95})`);
  g.addColorStop(0.7, `rgba(255,61,0,${alpha * 0.8})`);
  g.addColorStop(1, 'rgba(183,28,28,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBlast(ctx: Ctx, w: Wreck, time: number) {
  const t = w.t;
  const { bx, by } = w;
  // A dark mushroom of smoke rising where it blew up.
  if (t < 4) {
    const k = Math.min(1, t / 1.2);
    const fade = t < 2.5 ? 1 : Math.max(0, 1 - (t - 2.5) / 1.5);
    const rise = 40 + t * 70;
    ctx.fillStyle = `rgba(55,55,60,${0.55 * fade})`;
    // Stem
    ctx.beginPath();
    ctx.moveTo(bx - 18 * k, by);
    ctx.quadraticCurveTo(bx - 6, by - rise * 0.6, bx - 26 * k, by - rise);
    ctx.lineTo(bx + 26 * k, by - rise);
    ctx.quadraticCurveTo(bx + 6, by - rise * 0.6, bx + 18 * k, by);
    ctx.fill();
    // Cap
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + time * 0.4;
      ctx.beginPath();
      ctx.arc(bx + Math.cos(a) * 55 * k, by - rise + Math.sin(a) * 22 * k, (34 + (i % 3) * 8) * k, 0, Math.PI * 2);
      ctx.fill();
    }
    // The cap glows from inside at first.
    if (t < 1.4) fireball(ctx, bx, by - rise, 70 * k, 0.6 * (1 - t / 1.4));
  }
  // The fireball: a white flash that grows into rolling orange fire, with smaller blasts popping around it.
  if (t < 1.6) {
    const grow = 1 - Math.pow(1 - Math.min(1, t / 0.35), 3);
    const fade = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 1);
    fireball(ctx, bx, by, 40 + 160 * grow, fade);
    for (let i = 0; i < 6; i++) {
      const tt = t - i * 0.12;
      if (tt <= 0 || tt > 0.9) continue;
      const a = i * 2.1 + 0.7;
      const r = 60 + i * 12;
      fireball(ctx, bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.7, 30 + 50 * Math.min(1, tt / 0.25), Math.max(0, 1 - tt / 0.9));
    }
  }
  // Sparks streaking out.
  if (t < 0.9) {
    ctx.strokeStyle = `rgba(255,241,118,${1 - t / 0.9})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.3;
      const r0 = 30 + t * 700;
      line(ctx, bx + Math.cos(a) * r0, by + Math.sin(a) * r0, bx + Math.cos(a) * (r0 + 40), by + Math.sin(a) * (r0 + 40));
    }
  }
  // Bricks flying off.
  if (t < 3) {
    for (const b of w.bits) {
      const x = bx + b.vx * t;
      const y = by + b.vy * t + 0.5 * 900 * t * t;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 3);
      ctx.translate(x, y);
      ctx.rotate(b.vr * t);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
  }
}

/** Every blast and wreck on the map (drawn over the fighters). */
export function drawWrecks(ctx: Ctx, g: Game, time: number) {
  for (const w of wrecksOf(g)) {
    // Smoke trail first, then the burning wreck on top.
    for (const s of w.smoke) {
      const a = Math.max(0, 0.55 * (1 - s.t / 2.2));
      ctx.fillStyle = `rgba(66,66,70,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (1 + s.t * 1.2), 0, Math.PI * 2);
      ctx.fill();
    }
    if (w.y < g.map.h + 500) {
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(w.rot);
      ctx.scale(1.25, 1.25);
      if (w.kind === 'aircraft') jetBody(ctx, w.facing, time, true, false);
      else airBody(ctx, w.kind, w.facing, time, true, false);
      // It's on fire.
      for (let i = 0; i < 5; i++) {
        const fx = -30 + i * 14;
        const fh = 12 + Math.sin(time * 20 + i * 2) * 5 + Math.random() * 4;
        ctx.fillStyle = i % 2 ? '#ff6d00' : '#ffab00';
        ctx.beginPath();
        ctx.moveTo(fx - 5, -4);
        ctx.quadraticCurveTo(fx, -4 - fh * 1.4, fx + 5, -4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    drawBlast(ctx, w, time);
  }
}
