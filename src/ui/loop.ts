import type { Game } from '../game/game';
import { renderGame } from '../game/render';

const STEP = 1 / 120;

export interface Loop {
  stop(): void;
  size(): { w: number; h: number };
}

/** Run a game on a canvas: fixed-step updates, one render per frame, auto-resize. */
export function startLoop(
  canvas: HTMLCanvasElement,
  getGame: () => Game,
  opts: {
    paused?: () => boolean;
    overlay?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
    onResize?: (w: number, h: number) => void;
    /** Replace the normal game update (joining devices only animate what the host sends). */
    step?: (dt: number) => void;
  } = {},
): Loop {
  const ctx = canvas.getContext('2d')!;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = performance.now();
  let acc = 0;

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth || window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    opts.onResize?.(w, h);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const g = getGame();
    g.view.w = w;
    g.view.h = h;
    if (opts.step) opts.step(dt);
    else if (!opts.paused?.()) {
      acc += dt;
      while (acc >= STEP) {
        g.update(STEP);
        acc -= STEP;
      }
    } else acc = 0;
    renderGame(g, ctx, w, h, dpr);
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
    },
    size: () => ({ w, h }),
  };
}
