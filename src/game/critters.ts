import type { Cat, Projectile } from './entities';

type Ctx = CanvasRenderingContext2D;

/*
 * The October 19 update: chicks and the Chicken, the little pigeon, skeletons and the dog (and what they leave
 * behind), the six new weapons (local space: hand at (0, 0), pointing along +x), their shots,
 * and the Farm and Graveyard themes.
 */

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function bar(ctx: Ctx, x: number, y: number, w: number, frac: number, color: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = frac > 0.5 ? '#66bb6a' : frac > 0.25 ? '#ffca28' : '#ef5350';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, frac)), 4);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2 - 1, y - 1, 2, 6);
}

/** A bird's beak pointing the way it faces. */
function beak(ctx: Ctx, x: number, y: number, d: number, size: number, open: boolean) {
  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.5);
  ctx.lineTo(x + d * size * 1.3, y - (open ? size * 0.3 : 0));
  ctx.lineTo(x, y + size * 0.1);
  ctx.closePath();
  ctx.fill();
  if (open) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.1);
    ctx.lineTo(x + d * size * 1.1, y + size * 0.5);
    ctx.lineTo(x, y + size * 0.5);
    ctx.closePath();
    ctx.fill();
  }
}

function eye(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

/** A fluffy yellow chick with a tiny scarf in its owner's colour. */
function drawChick(ctx: Ctx, c: Cat, time: number) {
  const { x, y } = c;
  const d = c.facing;
  const hop = c.onGround && Math.abs(c.vx) > 20 ? Math.abs(Math.sin(c.walkPhase * 1.6)) * 3 : 0;
  ctx.strokeStyle = '#ff9800';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  line(ctx, x - 3, y - 4, x - 3, y);
  line(ctx, x + 3, y - 4, x + 3, y);
  const by = y - 8 - hop;
  ctx.fillStyle = c.hurtFlash > 0 ? '#ffffff' : '#ffee58';
  ctx.strokeStyle = '#f9a825';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, by, 7.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Little flapping wing
  ctx.fillStyle = '#fdd835';
  ctx.beginPath();
  ctx.ellipse(x - d * 2, by + 1, 3.5, 2.4, Math.sin(time * 20 + c.id) * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Head tuft
  ctx.strokeStyle = '#f9a825';
  line(ctx, x + d * 1, by - 6, x + d * 2.5, by - 9);
  eye(ctx, x + d * 3.5, by - 2, 1.3);
  beak(ctx, x + d * 6.5, by, d, 2.4, c.attackT > 0.5);
  // Scarf in the owner's colour
  ctx.strokeStyle = c.color;
  ctx.lineWidth = 2;
  line(ctx, x - 3, by + 4, x + 4, by + 4);
  if (c.chargeDir) {
    // Dust behind the charge.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(x - d * 10, y - 3, 3 + Math.sin(time * 30 + c.id) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The Chicken: half a stickman tall, white with a red comb, protecting its chicks. */
function drawChicken(ctx: Ctx, c: Cat, time: number) {
  const { x, y } = c;
  const d = c.facing;
  const moving = c.onGround && Math.abs(c.vx) > 20;
  const leg = moving ? Math.sin(c.walkPhase * 1.2) * 5 : 0;
  ctx.strokeStyle = '#ff8f00';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  line(ctx, x - 5, y - 12, x - 5 + leg, y);
  line(ctx, x + 5, y - 12, x + 5 - leg, y);
  const body = c.hurtFlash > 0 ? '#ffcdd2' : '#fafafa';
  // Tail feathers
  ctx.fillStyle = body;
  ctx.strokeStyle = '#9e9e9e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - d * 12, y - 24);
  ctx.lineTo(x - d * 24, y - 38);
  ctx.lineTo(x - d * 19, y - 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Body
  ctx.beginPath();
  ctx.ellipse(x, y - 21, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Wing (flaps when it pecks or charges)
  const flap = c.attackT > 0.5 || c.chargeDir ? Math.sin(time * 24) * 0.6 : 0;
  ctx.fillStyle = '#eeeeee';
  ctx.beginPath();
  ctx.ellipse(x - d * 2, y - 21, 9, 6, -d * 0.2 + flap, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Neck and head
  const hx = x + d * 12;
  const hy = y - 34 + (c.attackT > 0.5 ? 6 : 0);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(hx, hy, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Red comb and wattle
  ctx.fillStyle = '#e53935';
  for (const k of [-3, 0, 3]) {
    ctx.beginPath();
    ctx.arc(hx + k, hy - 7, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(hx + d * 5, hy + 5, 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, hx + d * 2.5, hy - 1.5, 1.8);
  beak(ctx, hx + d * 6.5, hy + 1, d, 3.5, c.attackT > 0.5);
  // A band in the owner's colour
  ctx.strokeStyle = c.color;
  ctx.lineWidth = 2.5;
  line(ctx, hx - 4, hy + 7, hx + 4, hy + 7);
  bar(ctx, x, y - 52, 30, c.hp / c.maxHp, c.color);
  if (c.chargeDir) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(x - d * (20 + k * 9), y - 4 - k * 2, 4 - k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** One Little Pigeon: a small grey pigeon (smaller than a stickman) with shiny green-purple neck feathers. */
function drawLilPigeon(ctx: Ctx, c: Cat, time: number) {
  const { x, y } = c;
  const d = c.facing;
  const air = !c.onGround;
  const moving = c.onGround && Math.abs(c.vx) > 20;
  const bob = moving ? Math.sin(c.walkPhase * 1.5) * 3 : 0;
  ctx.strokeStyle = '#e57373';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  if (!air) {
    line(ctx, x - 4, y - 9, x - 4, y);
    line(ctx, x + 4, y - 9, x + 4, y);
  }
  const body = c.hurtFlash > 0 ? '#ffffff' : '#90a4ae';
  ctx.fillStyle = body;
  ctx.strokeStyle = '#455a64';
  ctx.lineWidth = 1.5;
  // Tail
  ctx.beginPath();
  ctx.moveTo(x - d * 10, y - 16);
  ctx.lineTo(x - d * 22, y - 12);
  ctx.lineTo(x - d * 20, y - 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y - 17, 13, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Wing: flaps when flying
  const flap = air ? Math.sin(time * 26) * 0.9 : 0;
  ctx.fillStyle = '#78909c';
  ctx.save();
  ctx.translate(x - d * 2, y - 19);
  ctx.rotate(-d * (0.15 + flap));
  ctx.beginPath();
  ctx.ellipse(-d * 4, 0, 9, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Head bobs like a real pigeon
  const hx = x + d * (10 + bob);
  const hy = y - 26;
  const neck = ctx.createLinearGradient(hx - 5, hy, hx + 5, hy + 8);
  neck.addColorStop(0, '#26a69a');
  neck.addColorStop(1, '#8e24aa');
  ctx.fillStyle = neck;
  ctx.beginPath();
  ctx.ellipse(hx - d * 2, hy + 5, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff7043';
  ctx.beginPath();
  ctx.arc(hx + d * 2, hy - 1, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(hx + d * 2, hy - 1, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcc80';
  ctx.beginPath();
  ctx.moveTo(hx + d * 4.5, hy - 1);
  ctx.lineTo(hx + d * (c.attackT > 0.6 ? 11 : 9), hy + 1);
  ctx.lineTo(hx + d * 4.5, hy + 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c.color;
  ctx.lineWidth = 2;
  line(ctx, x - 4, y - 9, x + 4, y - 9);
  bar(ctx, x, y - 42, 26, c.hp / c.maxHp, c.color);
}

/** A skeleton: white bones, a skull with dark eyes, and a bone club. Beaten ones lie as a pile of bones. */
function drawSkeleton(ctx: Ctx, c: Cat, time: number) {
  const { x, y } = c;
  const d = c.facing;
  if (!c.alive) {
    drawBonePile(ctx, x, y, c.color === '#eeeeee' ? '#bdbdbd' : c.color);
    return;
  }
  const bone = c.hurtFlash > 0 ? '#ffcdd2' : '#f5f5f5';
  const moving = c.onGround && Math.abs(c.vx) > 20;
  const leg = moving ? Math.sin(time * 10 + c.id) * 10 : c.onGround ? 0 : 6 * d;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#424242';
  ctx.lineWidth = 6;
  // Dark outline first, then the white bones on top.
  for (const [col, w] of [['#424242', 6], [bone, 3.5]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    line(ctx, x, y - 34, x - 8 + leg * 0.6, y);
    line(ctx, x, y - 34, x + 8 - leg * 0.6, y);
    line(ctx, x, y - 34, x, y - 60);
    line(ctx, x, y - 56, x - d * 10, y - 42);
    const atk = c.attackT > 0.5 ? 1 : 0;
    line(ctx, x, y - 56, x + d * (14 + atk * 8), y - 48 - atk * 8);
  }
  // Ribs
  ctx.strokeStyle = '#424242';
  ctx.lineWidth = 1.5;
  for (const ry of [-54, -49, -44]) line(ctx, x - 6, y + ry, x + 6, y + ry);
  // Bone club in hand
  const atk = c.attackT > 0.5;
  ctx.save();
  ctx.translate(x + d * (atk ? 22 : 14), y - (atk ? 56 : 48));
  ctx.rotate(d > 0 ? (atk ? -0.2 : -0.9) : Math.PI + (atk ? 0.2 : 0.9));
  boneShape(ctx, 0, 0, 24, 3.2);
  ctx.restore();
  // Skull
  ctx.fillStyle = bone;
  ctx.strokeStyle = '#424242';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 70, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 5 + d * 2, y - 63, 10, 5);
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(x + d * 1, y - 71, 2.8, 0, Math.PI * 2);
  ctx.arc(x + d * 6.5, y - 71, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + d * 4 - 1, y - 66, 2, 3);
  // Team band
  ctx.strokeStyle = c.color === '#eeeeee' ? c.owner.color : c.color;
  ctx.lineWidth = 3;
  line(ctx, x - 6, y - 36, x + 6, y - 36);
  bar(ctx, x, y - 90, 30, c.hp / c.maxHp, c.owner.color);
}

/** A bone from (x, y) along +x, `len` long. */
function boneShape(ctx: Ctx, x: number, y: number, len: number, r: number) {
  ctx.fillStyle = '#f5f5f5';
  ctx.strokeStyle = '#616161';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(x + r, y - r * 0.6, len - r * 2, r * 1.2, r * 0.5);
  ctx.fill();
  ctx.stroke();
  for (const ex of [x + r, x + len - r]) {
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(ex, y + k * r * 0.7, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** What's left of a beaten skeleton: a pile of bones with the skull on top (it comes back on the next summon). */
function drawBonePile(ctx: Ctx, x: number, y: number, band: string) {
  ctx.save();
  ctx.translate(x, y);
  for (const [bx, by, rot] of [[-14, -4, 0.2], [-4, -7, -0.4], [2, -3, 0.1], [-10, -10, 0.9], [6, -9, -1.1]] as const) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(rot);
    boneShape(ctx, -9, 0, 18, 2.4);
    ctx.restore();
  }
  ctx.fillStyle = '#f5f5f5';
  ctx.strokeStyle = '#424242';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(2, -16, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(0, -17, 1.8, 0, Math.PI * 2);
  ctx.arc(4.5, -17, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = band;
  ctx.fillRect(-16, -1, 32, 2);
  ctx.restore();
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🦴', x, y - 30);
}

/** The dog: a brown dog with floppy ears and a collar. When beaten it lies down asleep (Zzz) until the next summon. */
function drawDog(ctx: Ctx, c: Cat, time: number) {
  const { x, y } = c;
  const d = c.facing;
  const fur = c.hurtFlash > 0 && c.alive ? '#ffffff' : '#a1887f';
  const dark = '#5d4037';
  ctx.lineCap = 'round';
  if (!c.alive) {
    // Curled up asleep on the ground.
    ctx.fillStyle = fur;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 9, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + d * 18, y - 9, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(x + d * 14, y - 12, 4, 7, d * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x + d * 21, y - 10, 2, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 3;
    line(ctx, x + d * 11, y - 4, x + d * 12, y - 15);
    // Zzz floating up
    ctx.fillStyle = '#e0f7fa';
    ctx.textAlign = 'center';
    for (let k = 0; k < 3; k++) {
      const ph = (time * 0.6 + k / 3) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.font = `bold ${10 + k * 3}px system-ui, sans-serif`;
      ctx.fillText('z', x + d * (22 + ph * 14), y - 24 - ph * 30);
    }
    ctx.globalAlpha = 1;
    return;
  }
  const moving = c.onGround && Math.abs(c.vx) > 20;
  const leg = moving ? Math.sin(c.walkPhase * 1.3) * 6 : 0;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 4;
  for (const [lx, k] of [[-13, 1], [-7, -1], [8, 1], [14, -1]] as const) line(ctx, x + lx, y - 14, x + lx + leg * k, y);
  // Wagging tail
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(x - d * 18, y - 22);
  ctx.quadraticCurveTo(x - d * 28, y - 30 + Math.sin(time * 16) * 5, x - d * 26, y - 38);
  ctx.stroke();
  ctx.fillStyle = fur;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 20, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Head
  const bite = c.attackT > DOG_BITE_SHOW;
  const hx = x + d * 22;
  const hy = y - 28 + (bite ? 3 : 0);
  ctx.beginPath();
  ctx.arc(hx, hy, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Snout and mouth
  ctx.beginPath();
  ctx.ellipse(hx + d * 8, hy + 3, 6, bite ? 5 : 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (bite) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(hx + d * 5, hy + 3);
    ctx.lineTo(hx + d * 7, hy + 7);
    ctx.lineTo(hx + d * 9, hy + 3);
    ctx.lineTo(hx + d * 11, hy + 7);
    ctx.lineTo(hx + d * 13, hy + 3);
    ctx.fill();
  }
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(hx + d * 13, hy + 1, 2, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, hx + d * 3, hy - 3, 1.8);
  // Floppy ear
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(hx - d * 4, hy - 1, 3.5, 7, d * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Collar in the owner's colour
  ctx.strokeStyle = c.color;
  ctx.lineWidth = 3.5;
  line(ctx, hx - d * 7, hy + 4, hx - d * 3, hy + 9);
  bar(ctx, x, y - 50, 34, c.hp / c.maxHp, c.color);
  // How long until it can bite again (8 seconds).
  if (c.attackT > 0) {
    ctx.strokeStyle = 'rgba(128,222,234,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 58, 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.min(1, c.attackT / 8)));
    ctx.stroke();
  }
}

/** The dog shows its teeth for a moment after a bite (it waits 8 seconds between bites). */
const DOG_BITE_SHOW = 7.5;

/** Draws the October 19 helpers. False = not one of them. */
export function drawCritter(ctx: Ctx, c: Cat, time: number): boolean {
  switch (c.variant) {
    case 'chick':
      if (c.alive) drawChick(ctx, c, time);
      return true;
    case 'chicken':
      if (c.alive) drawChicken(ctx, c, time);
      return true;
    case 'lilpigeon':
      if (c.alive) drawLilPigeon(ctx, c, time);
      return true;
    case 'skeleton':
      if (c.alive || c.frozen) drawSkeleton(ctx, c, time);
      return true;
    case 'dog':
      if (c.alive || c.frozen) drawDog(ctx, c, time);
      return true;
  }
  return false;
}

/** Is a helper showing its attack (for online: the dog's bite lasts 8 seconds). */
export function biting(c: Cat): boolean {
  return c.variant === 'dog' ? c.attackT > DOG_BITE_SHOW : c.variant === 'lilpigeon' ? c.attackT > 0.7 : c.attackT > 0.5;
}

/** What a chick and the Chicken leave behind: a chicken nugget, a drumstick. */
export function drawCritterProp(ctx: Ctx, prop: string, x: number, y: number, d: number, time: number) {
  if (prop === 'nugget') {
    ctx.fillStyle = '#d4892a';
    ctx.strokeStyle = '#7a4a12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.quadraticCurveTo(x - 10, y - 8, x - 3, y - 9);
    ctx.quadraticCurveTo(x + 4, y - 11, x + 8, y - 6);
    ctx.quadraticCurveTo(x + 10, y, x - 8, y);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f0b860';
    for (const [px, py] of [[-4, -5], [2, -7], [4, -3]] as const) {
      ctx.beginPath();
      ctx.arc(x + px, y + py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (prop === 'drumstick') {
    ctx.save();
    ctx.translate(x, y - 6);
    ctx.rotate(d * -0.2);
    ctx.fillStyle = '#efebe9';
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 1.5;
    ctx.fillRect(d * 8, -2, d * 12, 4);
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(d * 21, k * 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#b5651d';
    ctx.strokeStyle = '#5d3008';
    ctx.beginPath();
    ctx.ellipse(-d * 2, 0, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,224,178,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-d * 4, -2, 6, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
    // A wisp of steam
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    const up = (time * 25) % 20;
    ctx.beginPath();
    ctx.moveTo(x, y - 16 - up);
    ctx.quadraticCurveTo(x + 5, y - 22 - up, x, y - 28 - up);
    ctx.stroke();
  }
}

function egg(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#fffde7';
  ctx.strokeStyle = '#bcaaa4';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** The six new weapons. False = not one of them. */
export function drawCritterWeapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean, time: number): boolean {
  switch (id) {
    case 'chicklord': {
      // A golden scepter with a little chicken on top.
      ctx.strokeStyle = '#c69214';
      ctx.lineWidth = 5 * s;
      line(ctx, -6 * s, 0, len - 12 * s, 0);
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(len - 10 * s, 0, 8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(len - 2 * s, -4 * s, 6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(len - 2 * s, -11 * s, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9800';
      ctx.beginPath();
      ctx.moveTo(len + 3 * s, -5 * s);
      ctx.lineTo(len + 8 * s, -3 * s);
      ctx.lineTo(len + 3 * s, -2 * s);
      ctx.fill();
      if (ready) {
        ctx.fillStyle = `rgba(255,235,59,${0.5 + Math.sin(time * 6) * 0.3})`;
        ctx.beginPath();
        ctx.arc(len - 10 * s, 0, 12 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }
    case 'lilpigeon': {
      // A bag of breadcrumbs on a stick: the little pigeon comes for the bread.
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 4 * s;
      line(ctx, -4 * s, 0, len - 10 * s, 0);
      ctx.fillStyle = '#d7ccc8';
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.roundRect(len - 14 * s, -9 * s, 16 * s, 16 * s, 4 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffcc80';
      for (const [bx, by] of [[-8, -3], [-4, 2], [-10, 3]] as const) ctx.fillRect(len + bx * s, by * s, 3 * s, 3 * s);
      if (ready) {
        ctx.font = `${12 * s}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🐦', len - 6 * s, -14 * s);
      }
      return true;
    }
    case 'bone':
      boneShape(ctx, -4 * s, 0, len + 4 * s, 5 * s);
      if (ready) {
        ctx.fillStyle = `rgba(178,235,242,${0.4 + Math.sin(time * 6) * 0.25})`;
        ctx.beginPath();
        ctx.arc(len - 4 * s, 0, 9 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    case 'egg': {
      // A chunky yellow launcher with an egg in the barrel.
      ctx.fillStyle = '#fbc02d';
      ctx.strokeStyle = '#6d4c00';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.roundRect(-4 * s, -7 * s, len, 14 * s, 6 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#795548';
      ctx.fillRect(2 * s, 6 * s, 6 * s, 9 * s);
      if (ready) egg(ctx, len - 2 * s, 0, 7 * s);
      return true;
    }
    case 'gum': {
      // A pink blaster with a bubble gum tank.
      ctx.fillStyle = '#f06292';
      ctx.strokeStyle = '#880e4f';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.roundRect(-4 * s, -6 * s, len, 12 * s, 5 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff80ab';
      ctx.beginPath();
      ctx.arc(10 * s, -10 * s, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ad1457';
      ctx.fillRect(2 * s, 6 * s, 6 * s, 8 * s);
      if (ready) {
        ctx.fillStyle = 'rgba(255,128,171,0.8)';
        ctx.beginPath();
        ctx.arc(len + 2 * s, 0, 4 * s + Math.sin(time * 5) * 1.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }
    case 'drumstick': {
      // A big golden drumstick.
      ctx.fillStyle = '#efebe9';
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 1.5 * s;
      ctx.fillRect(-4 * s, -3 * s, len * 0.45, 6 * s);
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(-5 * s, k * 4 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      const g = ctx.createLinearGradient(len * 0.35, -12 * s, len, 12 * s);
      g.addColorStop(0, '#fff176');
      g.addColorStop(0.5, '#ffb300');
      g.addColorStop(1, '#e65100');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#8d5300';
      ctx.beginPath();
      ctx.ellipse(len * 0.7, 0, len * 0.32, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (ready) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(time * 8) * 0.4})`;
        ctx.beginPath();
        ctx.arc(len * 0.6, -5 * s, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }
  }
  return false;
}

/** Eggs and bubble gum in the air. */
export function drawCritterProjectile(ctx: Ctx, p: Projectile, time: number): boolean {
  if (p.kind === 'egg') {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(time * 8);
    egg(ctx, 0, 0, p.r);
    ctx.restore();
    return true;
  }
  if (p.kind === 'gum') {
    ctx.fillStyle = '#ff80ab';
    ctx.strokeStyle = '#c2185b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }
  return false;
}

/** Far-away decoration for the Farm and the Graveyard (screen space, like the other themes). */
export function drawCritterDeco(ctx: Ctx, deco: string, vw: number, vh: number, par: number, time: number): boolean {
  if (deco === 'farm') {
    // Rolling green hills, a red barn, a windmill and a few clouds.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 6; i++) {
      const x = ((hash(i) * (vw + 300) + time * 8 - par * 0.1) % (vw + 300)) - 150;
      const y = vh * (0.1 + hash(i + 3) * 0.2);
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.arc(x + 28, y + 4, 20, 0, Math.PI * 2);
      ctx.arc(x - 26, y + 6, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? 'rgba(85,139,47,0.85)' : 'rgba(124,179,66,0.6)';
      ctx.beginPath();
      ctx.moveTo(0, vh);
      for (let x = 0; x <= vw + 20; x += 20) ctx.lineTo(x, vh * (0.62 + layer * 0.08) + Math.sin((x + par * (0.2 + layer * 0.2)) / (160 - layer * 40)) * 24);
      ctx.lineTo(vw, vh);
      ctx.fill();
    }
    const bx = ((vw * 0.25 - par * 0.3) % (vw + 400) + vw + 400) % (vw + 400) - 200;
    const by = vh * 0.66;
    ctx.fillStyle = '#c62828';
    ctx.fillRect(bx - 60, by - 70, 120, 80);
    ctx.fillStyle = '#8e0000';
    ctx.beginPath();
    ctx.moveTo(bx - 70, by - 70);
    ctx.lineTo(bx, by - 120);
    ctx.lineTo(bx + 70, by - 70);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(bx - 22, by - 40, 44, 50);
    line(ctx, bx - 22, by - 40, bx + 22, by + 10);
    line(ctx, bx + 22, by - 40, bx - 22, by + 10);
    // Windmill
    const wx = ((vw * 0.75 - par * 0.25) % (vw + 400) + vw + 400) % (vw + 400) - 200;
    const wy = vh * 0.6;
    ctx.fillStyle = '#eeeeee';
    ctx.beginPath();
    ctx.moveTo(wx - 18, wy + 60);
    ctx.lineTo(wx - 8, wy - 60);
    ctx.lineTo(wx + 8, wy - 60);
    ctx.lineTo(wx + 18, wy + 60);
    ctx.fill();
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 6;
    for (let k = 0; k < 4; k++) {
      const a = time * 1.2 + (k * Math.PI) / 2;
      line(ctx, wx, wy - 60, wx + Math.cos(a) * 55, wy - 60 + Math.sin(a) * 55);
    }
    // Fence
    ctx.strokeStyle = 'rgba(255,248,225,0.9)';
    ctx.lineWidth = 3;
    const fy = vh * 0.8;
    line(ctx, 0, fy, vw, fy);
    line(ctx, 0, fy + 14, vw, fy + 14);
    for (let x = ((-par * 0.5) % 40) - 40; x < vw + 40; x += 40) line(ctx, x, fy - 10, x, fy + 24);
    return true;
  }
  if (deco === 'graveyard') {
    // A green full moon, bare trees, rows of gravestones and creeping mist.
    const mx = vw * 0.2 - par * 0.12;
    const my = vh * 0.18;
    const mr = Math.min(vw, vh) * 0.07;
    ctx.fillStyle = 'rgba(200,230,201,0.18)';
    ctx.beginPath();
    ctx.arc(mx, my, mr * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f5e9';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,20,10,0.9)';
    for (let i = 0; i < 4; i++) {
      const tx = ((hash(i + 5) * (vw + 300) - par * 0.3) % (vw + 300) + vw + 300) % (vw + 300) - 150;
      const ty = vh * 0.72;
      ctx.lineWidth = 8;
      line(ctx, tx, vh, tx, ty - 120);
      ctx.lineWidth = 4;
      line(ctx, tx, ty - 80, tx - 40, ty - 130);
      line(ctx, tx, ty - 100, tx + 36, ty - 150);
      line(ctx, tx - 20, ty - 105, tx - 30, ty - 140);
    }
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? 'rgba(38,50,56,0.95)' : 'rgba(55,71,79,0.7)';
      for (let i = 0; i < 12; i++) {
        const gx = ((hash(i + 20 + layer * 30) * (vw + 200) - par * (0.35 + layer * 0.25)) % (vw + 200) + vw + 200) % (vw + 200) - 100;
        const gy = vh * (0.74 + layer * 0.07);
        const gw = 20 + hash(i + 2) * 14;
        const gh = 30 + hash(i + 4) * 26;
        if (i % 3 === 0) {
          ctx.fillRect(gx - 3, gy - gh - 10, 6, gh + 10);
          ctx.fillRect(gx - 12, gy - gh, 24, 6);
        } else {
          ctx.beginPath();
          ctx.moveTo(gx - gw / 2, gy);
          ctx.lineTo(gx - gw / 2, gy - gh + gw / 2);
          ctx.arc(gx, gy - gh + gw / 2, gw / 2, Math.PI, 0);
          ctx.lineTo(gx + gw / 2, gy);
          ctx.fill();
        }
      }
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(200,230,201,0.1)';
      const fx = ((hash(i + 60) * vw + time * 12 - par * 0.5) % (vw + 400) + vw + 400) % (vw + 400) - 200;
      ctx.beginPath();
      ctx.ellipse(fx, vh * 0.86, 240, 36, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Floating green wisps
    for (let i = 0; i < 6; i++) {
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + i * 1.7);
      ctx.fillStyle = `rgba(178,255,89,${tw * 0.6})`;
      const x = ((hash(i + 80) * vw + Math.sin(time * 0.5 + i) * 40 - par * 0.4) % vw + vw) % vw;
      ctx.beginPath();
      ctx.arc(x, vh * (0.4 + hash(i + 81) * 0.35) + Math.cos(time + i) * 12, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  }
  return false;
}
