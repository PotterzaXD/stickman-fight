import { drawBackground, drawPlatforms, drawWeaponShape } from '../game/render';
import type { MapDef } from '../game/types';
import type { WeaponId } from '../game/weapons';
import { weapon } from '../game/weapons';

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
