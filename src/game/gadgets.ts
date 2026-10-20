import type { Cat, Projectile } from './entities';

type Ctx = CanvasRenderingContext2D;

/*
 * The October 21 update's pictures: the Baby Elephant, the Robo Drone and the Penguin,
 * the new weapons (local space: hand at (0, 0), pointing along +x) and their shots,
 * a Robo Drone falling apart, the Rock Stage background and King of the Hill's zone.
 */

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function bar(ctx: Ctx, x: number, y: number, w: number, frac: number, color: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, x - w / 2 - 1, y - 1, w + 2, 7, 3);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, x - w / 2, y, w * Math.max(0, Math.min(1, frac)), 5, 2.5);
  ctx.fill();
}

// ---------- helpers ----------

/** A little grey elephant with big ears, a bow in its owner's colour, and a trunk that sprays water. */
function drawBabyEle(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const step = c.onGround ? Math.sin(c.walkPhase * 2) * 3 : 0;
  const col = c.hurtFlash > 0 ? '#ffffff' : '#b0bec5';
  const dark = '#78909c';
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(d, 1);
  // Legs
  ctx.fillStyle = dark;
  for (const [lx, o] of [[-16, step], [-6, -step], [8, step], [16, -step]] as const) {
    rr(ctx, lx - 4, -16 + o * 0.3, 8, 16, 3);
    ctx.fill();
  }
  // Body
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(-2, -26, 24, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.arc(18, -34, 13, 0, Math.PI * 2);
  ctx.fill();
  // Big flappy ear
  const flap = Math.sin(time * 6 + c.id) * 0.15;
  ctx.fillStyle = '#cfd8dc';
  ctx.beginPath();
  ctx.ellipse(10, -34, 9, 13, -0.3 + flap, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8bbd0';
  ctx.beginPath();
  ctx.ellipse(10, -34, 5, 8, -0.3 + flap, 0, Math.PI * 2);
  ctx.fill();
  // Trunk: curls up when it sprays
  const spray = c.attackT > 0.2;
  ctx.strokeStyle = col;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(28, -32);
  if (spray) ctx.quadraticCurveTo(38, -30, 40, -42);
  else ctx.quadraticCurveTo(36, -24, 32, -14);
  ctx.stroke();
  // Eye
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(22, -38, 2, 0, Math.PI * 2);
  ctx.fill();
  // A bow in the owner's colour
  ctx.fillStyle = c.owner.color;
  ctx.beginPath();
  ctx.moveTo(12, -48);
  ctx.lineTo(6, -54);
  ctx.lineTo(6, -42);
  ctx.closePath();
  ctx.moveTo(12, -48);
  ctx.lineTo(18, -54);
  ctx.lineTo(18, -42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 14, 38, c.hp / c.maxHp, c.owner.color);
}

/** A small flying robot with four spinning rotors and a red eye. */
function drawDrone(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const y = c.y - c.h / 2;
  ctx.save();
  ctx.translate(c.x, y);
  ctx.scale(d, 1);
  // Arms and rotors
  ctx.strokeStyle = '#546e7a';
  ctx.lineWidth = 2.5;
  line(ctx, -16, -6, 16, -6);
  for (const rx of [-16, 16]) {
    const spin = Math.abs(Math.sin(time * 40 + rx));
    ctx.strokeStyle = 'rgba(207,216,220,0.9)';
    ctx.lineWidth = 2;
    line(ctx, rx - 11 * spin, -9, rx + 11 * spin, -9);
  }
  // Body
  ctx.fillStyle = c.hurtFlash > 0 ? '#ffffff' : '#90a4ae';
  rr(ctx, -11, -6, 22, 13, 5);
  ctx.fill();
  ctx.fillStyle = c.owner.color;
  ctx.fillRect(-11, 3, 22, 3);
  // Eye (glows when it zaps)
  ctx.fillStyle = c.attackT > 0 ? '#ff1744' : '#b71c1c';
  ctx.beginPath();
  ctx.arc(6, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 12, 30, c.hp / c.maxHp, c.owner.color);
}

/** A penguin: waddles on its feet, and lies flat on its belly to slide. */
function drawPenguin(ctx: Ctx, c: Cat, time: number) {
  const d = c.facing || 1;
  const slide = c.chargeDir !== 0;
  const black = c.hurtFlash > 0 ? '#ffffff' : '#263238';
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(d, 1);
  if (slide) {
    // Belly slide: lying down, flippers back, a little spray of snow
    ctx.fillStyle = black;
    ctx.beginPath();
    ctx.ellipse(0, -10, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(2, -6, 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffa000';
    ctx.beginPath();
    ctx.moveTo(22, -12);
    ctx.lineTo(30, -10);
    ctx.lineTo(22, -7);
    ctx.fill();
    ctx.fillStyle = 'rgba(225,245,254,0.8)';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(-24 - k * 6, -3 - ((time * 30 + k * 7) % 8), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const wob = c.onGround ? Math.sin(c.walkPhase * 2) * 0.12 : 0;
    ctx.rotate(wob);
    // Feet
    ctx.fillStyle = '#ffa000';
    ctx.fillRect(-9, -3, 8, 3);
    ctx.fillRect(2, -3, 8, 3);
    // Body
    ctx.fillStyle = black;
    ctx.beginPath();
    ctx.ellipse(0, -20, 13, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(3, -17, 8, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Flipper
    ctx.fillStyle = black;
    ctx.beginPath();
    ctx.ellipse(-10, -20, 4, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Eye and beak
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5, -31, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(6, -31, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffa000';
    ctx.beginPath();
    ctx.moveTo(10, -28);
    ctx.lineTo(18, -26);
    ctx.lineTo(10, -24);
    ctx.fill();
    // Scarf in the owner's colour
    ctx.fillStyle = c.owner.color;
    ctx.fillRect(-10, -24, 20, 3);
  }
  ctx.restore();
  bar(ctx, c.x, c.y - c.h - 12, 30, c.hp / c.maxHp, c.owner.color);
}

/** The new helpers. Returns false for anything else. */
export function drawGadget(ctx: Ctx, c: Cat, time: number): boolean {
  switch (c.variant) {
    case 'babyele':
      if (c.alive) drawBabyEle(ctx, c, time);
      return true;
    case 'drone':
      if (c.alive) drawDrone(ctx, c, time);
      return true;
    case 'penguin':
      if (c.alive) drawPenguin(ctx, c, time);
      return true;
  }
  return false;
}

/** A Robo Drone that went down: a few bolts and plates falling, with a puff of smoke. */
export function drawGadgetProp(ctx: Ctx, x: number, y: number, k: number) {
  ctx.globalAlpha = Math.max(0, 1 - k);
  ctx.fillStyle = '#90a4ae';
  for (let i = 0; i < 6; i++) {
    const dx = (i - 2.5) * 10 * (1 + k * 3);
    const dy = -30 + k * k * 120 - Math.sin(k * Math.PI) * 30 * ((i % 3) + 1) * 0.4;
    ctx.save();
    ctx.translate(x + dx, Math.min(y - 3, y + dy));
    ctx.rotate(k * 8 + i);
    ctx.fillRect(-4, -2, 8, 4);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(97,97,97,0.6)';
  ctx.beginPath();
  ctx.arc(x, y - 30 - k * 40, 10 + k * 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------- weapons and shots ----------

export function drawGadgetWeapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean, time: number): boolean {
  switch (id) {
    case 'guitar': {
      // Neck, then a red electric guitar body at the end
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 5 * s;
      line(ctx, -8 * s, 0, len - 24 * s, 0);
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(-14 * s, -4 * s, 8 * s, 8 * s);
      const bx = len - 14 * s;
      ctx.fillStyle = ready ? '#e53935' : '#8e3a38';
      ctx.beginPath();
      ctx.ellipse(bx, -4 * s, 10 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(bx + 4 * s, 6 * s, 12 * s, 10 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#212121';
      ctx.fillRect(bx - 2 * s, -5 * s, 5 * s, 12 * s);
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 0.8 * s;
      for (const o of [-1.5, 0, 1.5]) line(ctx, -8 * s, o * s, bx + 2 * s, o * s);
      if (ready) {
        ctx.fillStyle = '#ffd740';
        ctx.font = `${10 * s}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('♪', bx + 14 * s, -10 * s + Math.sin(time * 6) * 3 * s);
      }
      return true;
    }
    case 'bat': {
      // A wooden bat, thin at the handle and thick at the end
      ctx.fillStyle = ready ? '#d7a86e' : '#a1887f';
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(-6 * s, -2.5 * s);
      ctx.lineTo(len * 0.45, -3 * s);
      ctx.quadraticCurveTo(len - 4 * s, -7 * s, len, -5 * s);
      ctx.lineTo(len, 5 * s);
      ctx.quadraticCurveTo(len - 4 * s, 7 * s, len * 0.45, 3 * s);
      ctx.lineTo(-6 * s, 2.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#212121';
      ctx.fillRect(-8 * s, -3 * s, 12 * s, 6 * s);
      return true;
    }
    case 'slingshot': {
      // A Y-shaped stick with a rubber band and a pebble
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 4 * s;
      line(ctx, -4 * s, 0, len * 0.55, 0);
      line(ctx, len * 0.55, 0, len, -9 * s);
      line(ctx, len * 0.55, 0, len, 9 * s);
      ctx.strokeStyle = '#ef5350';
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(len, -9 * s);
      ctx.quadraticCurveTo(len * 0.5, 0, len, 9 * s);
      ctx.stroke();
      if (ready) {
        ctx.fillStyle = '#9e9e9e';
        ctx.beginPath();
        ctx.arc(len * 0.62, 0, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }
    case 'flamethrower': {
      // A fuel tank, a long nozzle and a little pilot flame
      ctx.fillStyle = '#d32f2f';
      rr(ctx, -10 * s, -2 * s, 18 * s, 14 * s, 5 * s);
      ctx.fill();
      ctx.fillStyle = '#616161';
      rr(ctx, -4 * s, -5 * s, len - 4 * s, 8 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = '#424242';
      ctx.fillRect(len - 12 * s, -7 * s, 8 * s, 12 * s);
      const flick = 1 + Math.sin(time * 30) * 0.2;
      ctx.fillStyle = ready ? '#ff9100' : '#795548';
      ctx.beginPath();
      ctx.ellipse(len, -1 * s, 5 * s * flick, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      if (ready) {
        ctx.fillStyle = '#ffee58';
        ctx.beginPath();
        ctx.ellipse(len, -1 * s, 2.4 * s * flick, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }
  }
  return false;
}

export function drawGadgetProjectile(ctx: Ctx, p: Projectile, time: number): boolean {
  switch (p.kind) {
    case 'pebble':
      ctx.fillStyle = '#9e9e9e';
      ctx.strokeStyle = '#616161';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return true;
    case 'flame': {
      // Grows and turns from yellow to red as it flies
      const k = Math.min(1, p.t / 0.5);
      const r = p.r * (0.6 + k * 0.9) * (1 + Math.sin(time * 40 + p.x) * 0.12);
      ctx.fillStyle = `rgba(255,${Math.round(200 - k * 140)},0,${0.75 - k * 0.4})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,241,118,${0.8 - k * 0.7})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }
  }
  return false;
}

// ---------- the Rock Stage ----------

/** The Rock Stage backdrop: dark hall, spotlights sweeping, a big speaker stack each side and a crowd waving. */
export function drawGadgetDeco(ctx: Ctx, deco: string, vw: number, vh: number, par: number, time: number): boolean {
  if (deco !== 'stage') return false;
  // Spotlights
  const colors = ['rgba(255,64,129,0.16)', 'rgba(255,215,64,0.14)', 'rgba(64,196,255,0.14)'];
  colors.forEach((col, i) => {
    const sx = vw * (0.2 + i * 0.3) - par * 0.2;
    const a = Math.sin(time * 0.8 + i * 2) * 0.5;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx + Math.tan(a - 0.2) * vh, vh);
    ctx.lineTo(sx + Math.tan(a + 0.2) * vh, vh);
    ctx.closePath();
    ctx.fill();
  });
  // Speaker stacks
  for (const side of [0, 1]) {
    const x = side ? vw - 90 : 20;
    for (let k = 0; k < 3; k++) {
      const y = vh - 90 - k * 64;
      ctx.fillStyle = '#212121';
      ctx.fillRect(x, y, 70, 60);
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, 70, 60);
      const thump = 1 + Math.max(0, Math.sin(time * 15.7)) * 0.08;
      ctx.fillStyle = '#37474f';
      ctx.beginPath();
      ctx.arc(x + 35, y + 30, 20 * thump, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(x + 35, y + 30, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The crowd: heads and waving arms along the bottom
  for (let i = 0; i < 26; i++) {
    const x = ((i * 53 - par * 0.5) % (vw + 60) + vw + 60) % (vw + 60) - 30;
    const jump = Math.max(0, Math.sin(time * 5 + i * 1.7)) * 8;
    const y = vh - 14 - jump;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.arc(x, y - 16, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 9, y - 8, 18, 30);
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 4;
    if (i % 3 === 0) line(ctx, x + 6, y - 6, x + 14, y - 30 + Math.sin(time * 6 + i) * 4);
  }
  return true;
}

// ---------- King of the Hill ----------

/** The glowing zone: gold when nobody holds it, the holder's colour when one side stands in it alone. */
export function drawHill(ctx: Ctx, x: number, y: number, w: number, color: string | null, time: number) {
  const h = 180;
  const glow = 0.18 + Math.sin(time * 4) * 0.06;
  const col = color ?? '#ffd740';
  const grad = ctx.createLinearGradient(0, y, 0, y - h);
  grad.addColorStop(0, col);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = glow + 0.15;
  ctx.fillStyle = grad;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = col;
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 8]);
  ctx.lineDashOffset = -time * 30;
  ctx.strokeRect(x - w / 2, y - h, w, h);
  ctx.setLineDash([]);
  ctx.font = '900 26px "Baloo 2", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('👑', x, y - h - 8 + Math.sin(time * 3) * 4);
}

/** King of the Hill and Weapon Race: a small scoreboard in the top left (best first). */
export function drawModeBoard(ctx: Ctx, title: string, rows: { name: string; color: string; text: string; frac: number }[]) {
  const w = 190;
  const rowH = 22;
  const shown = rows.slice(0, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, 12, 12, w, 30 + shown.length * rowH, 12);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = '800 14px "Baloo 2", system-ui, sans-serif';
  ctx.fillStyle = '#ffd740';
  ctx.fillText(title, 22, 32);
  shown.forEach((r, i) => {
    const y = 40 + i * rowH;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    rr(ctx, 22, y + 4, w - 20, 14, 7);
    ctx.fill();
    ctx.fillStyle = r.color;
    rr(ctx, 22, y + 4, (w - 20) * Math.max(0, Math.min(1, r.frac)), 14, 7);
    ctx.fill();
    ctx.font = '800 12px "Baloo 2", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    const label = `${r.name}  ${r.text}`;
    ctx.strokeText(label, 28, y + 15);
    ctx.fillText(label, 28, y + 15);
  });
}
