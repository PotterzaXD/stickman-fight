import type { Game } from '../game/game';
import { drawHud, drawLabel, drawWorldFx } from '../game/render';
import { Renderer3D } from './render3d';

const STEP = 1 / 120;

export interface Loop3D {
  stop(): void;
  size(): { w: number; h: number };
}

/**
 * Run a game in 3D: the same fixed-step updates as 2D, drawn by the 3D renderer, with a see-through 2D layer on top
 * for what is flat anyway (names and HP bars, damage numbers, the kill feed, joysticks). That layer uses the exact
 * same camera as the 3D picture, so everything lines up.
 */
export function startLoop3D(
  gl: HTMLCanvasElement,
  hud: HTMLCanvasElement,
  getGame: () => Game,
  opts: {
    paused?: () => boolean;
    overlay?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
    onResize?: (w: number, h: number) => void;
    /** The background demo: no names or HUD. */
    bare?: boolean;
  } = {},
): Loop3D {
  const r3 = new Renderer3D(gl);
  const ctx = hud.getContext('2d')!;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = performance.now();
  let acc = 0;

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = hud.clientWidth || window.innerWidth;
    h = hud.clientHeight || window.innerHeight;
    hud.width = Math.round(w * dpr);
    hud.height = Math.round(h * dpr);
    opts.onResize?.(w, h);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(hud);

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const g = getGame();
    g.view.w = w;
    g.view.h = h;
    if (!opts.paused?.()) {
      acc += dt * g.juice.timeScale(dt);
      while (acc >= STEP) {
        g.update(STEP);
        acc -= STEP;
      }
    } else acc = 0;
    // The same camera as renderGame (zoom kick and shake included).
    const z = g.cam.zoom * (1 + g.juice.kick);
    const sx = (Math.random() - 0.5) * g.shake;
    const sy = (Math.random() - 0.5) * g.shake;
    r3.render(g, w, h, dpr, z, sx, sy);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, hud.width, hud.height);
    if (!opts.bare) {
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (w / 2 - g.cam.x * z + sx), dpr * (h / 2 - g.cam.y * z + sy));
      for (const f of g.fighters) if (f.alive && !f.boss) drawLabel(ctx, f, f.y - f.h - 22);
      drawWorldFx(ctx, g, false);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawHud(g, ctx, w, h);
    }
    if (opts.overlay) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      opts.overlay(ctx, w, h);
    }
  };
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      r3.dispose();
    },
    size: () => ({ w, h }),
  };
}
