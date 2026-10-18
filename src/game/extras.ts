import type { Cat, Projectile } from './entities';

type Ctx = CanvasRenderingContext2D;

/*
 * The October 18 update: the five new weapons (local space: hand at (0, 0), pointing along +x),
 * their skill shots, the Summoner's Stick Brawl allies and the red guy, and the three new map themes.
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

/** A fried fish (held by the Frying Fish, and thrown by its skill). */
function friedFish(ctx: Ctx, x: number, y: number, len: number, s: number) {
  ctx.fillStyle = '#c27c2c';
  ctx.strokeStyle = '#6d3f0f';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.ellipse(x + len * 0.5, y, len * 0.42, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Tail
  ctx.beginPath();
  ctx.moveTo(x + len * 0.1, y);
  ctx.lineTo(x - 2 * s, y - 9 * s);
  ctx.lineTo(x - 2 * s, y + 9 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Crispy bits and an eye
  ctx.fillStyle = '#e6a65a';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(x + len * (0.3 + i * 0.13), y + (i % 2 ? 3 : -3) * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + len * 0.8, y - 2 * s, 2.6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x + len * 0.81, y - 2 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
}

function yoyoDisc(ctx: Ctx, x: number, y: number, r: number, spin: number) {
  ctx.fillStyle = '#e53935';
  ctx.strokeStyle = '#7f0000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, spin, spin + 1.6);
  ctx.stroke();
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

/** The new weapons in the hand. Returns false for ids it doesn't know. */
export function drawExtraWeapon(ctx: Ctx, id: string, len: number, s: number, ready: boolean, time: number): boolean {
  switch (id) {
    case 'chainsaw': {
      // Orange motor, grey bar and a running chain.
      ctx.fillStyle = '#ff7043';
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.roundRect(-6 * s, -9 * s, 22 * s, 18 * s, 4 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath();
      ctx.roundRect(14 * s, -5 * s, len - 14 * s, 10 * s, 5 * s);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 2 * s;
      ctx.setLineDash([3 * s, 3 * s]);
      ctx.lineDashOffset = -time * 120;
      ctx.beginPath();
      ctx.roundRect(15 * s, -6 * s, len - 16 * s, 12 * s, 6 * s);
      ctx.stroke();
      ctx.setLineDash([]);
      return true;
    }
    case 'yoyo':
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1.2 * s;
      line(ctx, 0, 0, len - 10 * s, 0);
      if (ready) yoyoDisc(ctx, len - 4 * s, 0, 9 * s, time * 8);
      return true;
    case 'crossbow':
      // Wooden stock, a bow across the front and a bolt when it's loaded.
      ctx.fillStyle = '#8d6e63';
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.roundRect(-8 * s, -4 * s, len, 8 * s, 2 * s);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 3.5 * s;
      ctx.beginPath();
      ctx.moveTo(len - 16 * s, -20 * s);
      ctx.quadraticCurveTo(len - 4 * s, 0, len - 16 * s, 20 * s);
      ctx.stroke();
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1 * s;
      line(ctx, len - 16 * s, -20 * s, len - 22 * s, 0);
      line(ctx, len - 22 * s, 0, len - 16 * s, 20 * s);
      if (ready) {
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 2.5 * s;
        line(ctx, len - 26 * s, -1 * s, len + 6 * s, -1 * s);
        ctx.fillStyle = '#90a4ae';
        ctx.beginPath();
        ctx.moveTo(len + 12 * s, -1 * s);
        ctx.lineTo(len + 4 * s, -5 * s);
        ctx.lineTo(len + 4 * s, 3 * s);
        ctx.fill();
      }
      return true;
    case 'whip': {
      // A handle and a long wavy whip that crackles when it's ready.
      ctx.fillStyle = '#4e342e';
      ctx.beginPath();
      ctx.roundRect(-4 * s, -3.5 * s, 18 * s, 7 * s, 3 * s);
      ctx.fill();
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(14 * s, 0);
      for (let k = 1; k <= 10; k++) {
        const x = 14 * s + ((len - 14 * s) * k) / 10;
        ctx.lineTo(x, Math.sin(k * 1.3 + time * 9) * 4 * s * (k / 10));
      }
      ctx.stroke();
      if (ready) {
        ctx.strokeStyle = 'rgba(255,241,118,0.9)';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(20 * s, 0);
        for (let k = 1; k <= 8; k++) ctx.lineTo(20 * s + ((len - 20 * s) * k) / 8, (hash(k + Math.floor(time * 20)) - 0.5) * 10 * s);
        ctx.stroke();
      }
      return true;
    }
    case 'fryfish':
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 3 * s;
      line(ctx, -4 * s, 0, 10 * s, 0);
      friedFish(ctx, 8 * s, 0, len - 8 * s, s);
      return true;
  }
  return false;
}

/** The new skill shots. Returns false for kinds it doesn't know. */
export function drawExtraProjectile(ctx: Ctx, p: Projectile, time: number): boolean {
  switch (p.kind) {
    case 'yoyo': {
      const o = p.owner as { x: number; y: number; h: number };
      // The string back to the hand.
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.2;
      line(ctx, o.x, o.y - o.h * 0.75, p.x, p.y);
      yoyoDisc(ctx, p.x, p.y, p.r, time * 14);
      return true;
    }
    case 'fishthrow':
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time * 10);
      friedFish(ctx, -18, 0, 36, 1);
      ctx.restore();
      return true;
    case 'allyfire': {
      // The Fire Ally's fireball, like in Stick Brawl.
      const flick = 1 + Math.sin(time * 40) * 0.12;
      ctx.fillStyle = 'rgba(255,122,26,0.4)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.5 * flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }
  }
  return false;
}

/**
 * The Snowman and the Fire Ally from Stick Brawl, drawn the way Stick Brawl draws them (made stickman-sized):
 * thick round lines, a big head, the Snowman's white face with two dots, the Fire Ally holding its fireball stick.
 */
export function drawSbAlly(ctx: Ctx, c: Cat, time: number) {
  const snow = c.variant === 'sbsnow';
  const h = c.h;
  const d = c.facing;
  const moving = c.onGround && Math.abs(c.vx) > 20;
  const bob = moving ? Math.sin(time * 8.3 + c.x) * 3 : 0;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  const col = c.hurtFlash > 0 ? '#ffffff' : c.color;
  ctx.strokeStyle = col;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const leg = moving ? Math.sin(time * 11) * 12 : c.onGround ? 0 : 7 * d;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.42);
  ctx.lineTo(-7 + leg * 0.3, -2);
  ctx.lineTo(-12 + leg, 0);
  ctx.moveTo(0, -h * 0.42);
  ctx.lineTo(7 - leg * 0.3, -2);
  ctx.lineTo(12 - leg, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.42);
  ctx.lineTo(0, -h * 0.78);
  ctx.stroke();
  const atk = c.attackT > 0 ? d * 17 : 0;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.7);
  ctx.lineTo(-d * 10, -h * 0.55);
  ctx.moveTo(0, -h * 0.7);
  ctx.lineTo(d * 19 + atk, -h * 0.6);
  ctx.stroke();
  if (!snow) {
    // The Fire Ally holds its fireball weapon (a grey stick, like Stick Brawl), with a little flame on the end.
    const wx = d * 19 + atk;
    const wy = -h * 0.6;
    ctx.strokeStyle = '#9fa8b5';
    ctx.lineWidth = 6;
    line(ctx, wx, wy, wx + d * 26, wy - 7);
    ctx.fillStyle = `rgba(255,122,26,${0.6 + Math.sin(time * 20) * 0.3})`;
    ctx.beginPath();
    ctx.arc(wx + d * 28, wy - 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, -h * 0.92, h * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = snow ? '#eafbff' : '#0b0e14';
  ctx.fill();
  ctx.stroke();
  if (snow) {
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-4, -h * 0.93, 2, 0, Math.PI * 2);
    ctx.arc(4, -h * 0.93, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = c.color;
  ctx.fillText(snow ? '⛄' : '🔥', c.x, c.y - h - 14);
}

/**
 * The red guy, drawn exactly like the enemy in WORST Stickman Fighter: a red head, a thin stiff body
 * with arms and legs that never move, and its little health bar. Frozen ones stay where they went down.
 */
export function drawRedGuy(ctx: Ctx, c: Cat) {
  // WORST draws from (x, y) with the feet 22 below it.
  const x = c.x;
  const y = c.y - 22;
  ctx.save();
  ctx.translate(x, y);
  if (c.frozen) ctx.globalAlpha = 0.85;
  const col = c.hurtFlash > 0 && !c.frozen ? '#ffffff' : '#f66';
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(0, -15, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(0, 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(-8, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(8, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(-5, 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(5, 22);
  ctx.stroke();
  ctx.restore();
  // Health bar (WORST: 16 wide for 100 HP)
  ctx.fillStyle = '#f00';
  ctx.fillRect(x - 8, y - 28, Math.max(0, (c.hp / c.maxHp) * 16), 2);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 8, y - 28, 16, 2);
  if (c.frozen) {
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧊', x, y - 34);
  }
}

/** Far-away decoration for the new themes (screen space, like the other themes). */
export function drawExtraDeco(ctx: Ctx, deco: string, vw: number, vh: number, par: number, time: number): boolean {
  if (deco === 'jungle') {
    // Layers of dark trees, hanging vines and a few fireflies.
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? 'rgba(27,94,32,0.7)' : 'rgba(46,125,50,0.45)';
      for (let i = 0; i < 9; i++) {
        const x = ((hash(i + layer * 20) * (vw + 300) - par * (0.3 + layer * 0.3)) % (vw + 300) + vw + 300) % (vw + 300) - 150;
        const r = 50 + hash(i + 5 + layer * 9) * 60;
        const ty = vh * (0.55 + layer * 0.08);
        ctx.fillRect(x - 8, ty, 16, vh);
        ctx.beginPath();
        ctx.arc(x, ty, r, 0, Math.PI * 2);
        ctx.arc(x - r * 0.6, ty + r * 0.3, r * 0.7, 0, Math.PI * 2);
        ctx.arc(x + r * 0.6, ty + r * 0.3, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(27,94,32,0.8)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const x = ((hash(i + 50) * vw - par * 0.6) % vw + vw) % vw;
      const len = vh * (0.12 + hash(i + 51) * 0.22);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + Math.sin(time + i) * 12, len / 2, x, len);
      ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const tw = 0.5 + 0.5 * Math.sin(time * 3 + i * 2.1);
      ctx.fillStyle = `rgba(255,241,118,${tw * 0.8})`;
      const x = ((hash(i + 70) * vw + Math.sin(time * 0.7 + i) * 30 - par * 0.4) % vw + vw) % vw;
      ctx.beginPath();
      ctx.arc(x, vh * (0.3 + hash(i + 71) * 0.5) + Math.cos(time + i) * 10, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  }
  if (deco === 'haunted') {
    // A big moon, a castle on the hill, bats and drifting fog.
    const mx = vw * 0.78 - par * 0.15;
    const my = vh * 0.2;
    const mr = Math.min(vw, vh) * 0.08;
    ctx.fillStyle = 'rgba(255,253,231,0.2)';
    ctx.beginPath();
    ctx.arc(mx, my, mr * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff9c4';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(15,5,30,0.85)';
    const cx = ((vw * 0.3 - par * 0.25) % (vw + 400) + vw + 400) % (vw + 400) - 200;
    const base = vh * 0.72;
    ctx.fillRect(cx - 120, base - 90, 240, vh);
    for (const [ox, tw, th] of [[-130, 50, 170], [80, 50, 200], [-25, 60, 240]]) {
      ctx.fillRect(cx + ox, base - th, tw, vh);
      ctx.beginPath();
      ctx.moveTo(cx + ox - 8, base - th);
      ctx.lineTo(cx + ox + tw / 2, base - th - 50);
      ctx.lineTo(cx + ox + tw + 8, base - th);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,213,79,0.7)';
    for (let i = 0; i < 5; i++) if (Math.sin(time * 1.3 + i * 4) > -0.6) ctx.fillRect(cx - 100 + i * 45, base - 60 - (i % 2) * 40, 10, 14);
    ctx.fillStyle = 'rgba(10,0,20,0.9)';
    for (let i = 0; i < 6; i++) {
      const bx = ((hash(i + 30) * vw + time * (40 + hash(i) * 40)) % (vw + 100)) - 50;
      const by = vh * (0.15 + hash(i + 31) * 0.3) + Math.sin(time * 3 + i) * 12;
      const flap = Math.sin(time * 18 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - 12, by - 4 - flap);
      ctx.lineTo(bx - 5, by + 2);
      ctx.lineTo(bx, by - 2);
      ctx.lineTo(bx + 5, by + 2);
      ctx.lineTo(bx + 12, by - 4 - flap);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(200,180,230,0.12)';
      const fx = ((hash(i + 40) * vw + time * 15 - par * 0.5) % (vw + 400) + vw + 400) % (vw + 400) - 200;
      ctx.beginPath();
      ctx.ellipse(fx, vh * 0.8, 220, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  }
  if (deco === 'candy') {
    // Lollipops, candy canes and sprinkles in the air.
    for (let i = 0; i < 7; i++) {
      const x = ((hash(i + 10) * (vw + 300) - par * 0.4) % (vw + 300) + vw + 300) % (vw + 300) - 150;
      const top = vh * (0.4 + hash(i + 11) * 0.2);
      const r = 26 + hash(i + 12) * 22;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 6;
      line(ctx, x, top, x, vh);
      if (i % 2) {
        const cols = ['#ff80ab', '#80d8ff', '#ffff8d'];
        for (let k = 3; k > 0; k--) {
          ctx.fillStyle = cols[(i + k) % 3];
          ctx.beginPath();
          ctx.arc(x, top, (r * k) / 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Candy cane hook
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(x + r * 0.5, top, r * 0.5, Math.PI, 0);
        ctx.stroke();
        ctx.strokeStyle = '#e53935';
        ctx.lineWidth = 10;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(x + r * 0.5, top, r * 0.5, Math.PI, 0);
        ctx.moveTo(x, top);
        ctx.lineTo(x, vh);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    const cols = ['#ff4081', '#448aff', '#ffd740', '#69f0ae', '#e040fb'];
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = cols[i % cols.length];
      const x = ((hash(i + 90) * vw - par * 0.2) % vw + vw) % vw;
      const y = ((hash(i + 91) * vh + time * (20 + hash(i) * 30)) % vh + vh) % vh;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(hash(i) * 6 + time);
      ctx.fillRect(-4, -1.5, 8, 3);
      ctx.restore();
    }
    return true;
  }
  return false;
}
