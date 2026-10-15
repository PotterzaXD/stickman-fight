import { drawBackground, drawPlatforms, drawWeaponShape } from '../game/render';
import type { MapDef } from '../game/types';
import type { WeaponId } from '../game/weapons';
import { GUNS, weapon } from '../game/weapons';
import { drawHat } from '../game/hats';

/** How far each gun reaches back behind the hand (stock or grip), in weapon units. */
const GUN_BACK: Partial<Record<WeaponId, number>> = { shotgun: 34, sniper: 31, pistol: 11, gun67: 9, watergun: 9 };

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = w * dpr;
  c.height = h * dpr;
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return { c, ctx };
}

export function weaponIcon(id: WeaponId, size = 56): HTMLCanvasElement {
  const { c, ctx } = canvas(size, size);
  const def = weapon(id);
  if (GUNS.includes(id)) {
    // Guns lie flat, stock to the left.
    const back = GUN_BACK[id] ?? 10;
    const s = (size * 0.9) / (back + def.length);
    ctx.translate(size * 0.05 + back * s, size * 0.56);
    drawWeaponShape(ctx, id, def.length * s, s, true);
    return c;
  }
  const len = Math.min(def.length, 90);
  const short = def.length < 50;
  const s = (size / 100) * (id === 'bow' ? 1.4 : short ? 2.4 : id === 'spear' ? 0.85 : 1.1);
  if (short) ctx.translate(size * (id === 'bow' ? 0.5 : 0.25), size * (id === 'bow' ? 0.5 : 0.6));
  else {
    ctx.translate(size * 0.22, size * 0.78);
    ctx.rotate(-Math.PI / 4);
  }
  drawWeaponShape(ctx, id, short ? len * s * 0.6 : len * s, s, true);
  return c;
}

export function mapThumb(map: MapDef, w = 150, h = 84): HTMLCanvasElement {
  const { c, ctx } = canvas(w, h);
  drawBackground(ctx, map, w, h, 0, 0);
  const z = Math.min(w / map.w, h / map.h);
  ctx.translate((w - map.w * z) / 2, (h - map.h * z) / 2);
  ctx.scale(z, z);
  drawPlatforms(ctx, map);
  return c;
}

/** A little stickman head wearing the hat (the hat shop). */
export function hatIcon(id: string, size = 64): HTMLCanvasElement {
  const { c, ctx } = canvas(size, size);
  const s = size / 40;
  const hx = size / 2;
  const hy = size * 0.66;
  ctx.fillStyle = '#e0e0e0';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(hx, hy, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(hx + 4 * s, hy - 2 * s, 3.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(hx + 5 * s, hy - 2 * s, 1.6 * s, 0, Math.PI * 2);
  ctx.fill();
  drawHat(ctx, id, hx, hy, s, 1);
  return c;
}
