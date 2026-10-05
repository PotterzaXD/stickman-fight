import type { Controller } from './types';

/** Joystick spots in player order: P1 bottom-left, P2 bottom-right, P3 top-left, P4 top-right, P5 middle-left, P6 middle-right. */
const ANCHORS = ['BL', 'BR', 'TL', 'TR', 'ML', 'MR'] as const;
type Anchor = (typeof ANCHORS)[number];

interface Stick {
  color: string;
  label: string;
  anchor: Anchor;
  zone: { x: number; y: number; w: number; h: number };
  homeX: number;
  homeY: number;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
  pointer: number | null;
  state: Controller;
  hp: () => number;
  name?: string;
}

const KEYMAPS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL' },
];

export class JoystickManager {
  sticks: Stick[] = [];
  radius = 56;
  private keys = new Set<string>();
  private el: HTMLElement;
  /** Taps outside any joystick that hit this rect call onPause. */
  pauseRect = { x: 0, y: 0, w: 0, h: 0 };
  onPause: (() => void) | null = null;

  constructor(el: HTMLElement, players: { color: string; label: string; hp: () => number; name?: string }[]) {
    this.el = el;
    players.forEach((p, i) => {
      this.sticks.push({
        ...p,
        anchor: ANCHORS[i],
        zone: { x: 0, y: 0, w: 0, h: 0 },
        homeX: 0,
        homeY: 0,
        baseX: 0,
        baseY: 0,
        knobX: 0,
        knobY: 0,
        pointer: null,
        state: { x: 0, y: 0, active: false },
      });
    });
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.up);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.releaseAll);
  }

  destroy() {
    this.el.removeEventListener('pointerdown', this.down);
    this.el.removeEventListener('pointermove', this.move);
    this.el.removeEventListener('pointerup', this.up);
    this.el.removeEventListener('pointercancel', this.up);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.releaseAll);
  }

  /** Split the screen: left half and right half, each split into the rows that are in use. */
  layout(w: number, h: number) {
    this.radius = Math.max(38, Math.min(66, Math.min(w, h) * 0.085));
    const r = this.radius;
    const margin = r * 1.5;
    for (const side of ['L', 'R'] as const) {
      const here = this.sticks.filter((s) => s.anchor[1] === side);
      const rows = ['T', 'M', 'B'].filter((row) => here.some((s) => s.anchor[0] === row));
      const zh = h / Math.max(1, rows.length);
      for (const s of here) {
        const ri = rows.indexOf(s.anchor[0]);
        s.zone = { x: side === 'L' ? 0 : w / 2, y: ri * zh, w: w / 2, h: zh };
        s.homeX = side === 'L' ? margin : w - margin;
        const row = s.anchor[0];
        const want = row === 'T' ? margin : row === 'B' ? h - margin : h / 2;
        s.homeY = Math.max(s.zone.y + Math.min(margin, zh / 2), Math.min(s.zone.y + s.zone.h - Math.min(margin, zh / 2), want));
        if (s.pointer === null) this.reset(s);
      }
    }
  }

  private reset(s: Stick) {
    s.baseX = s.knobX = s.homeX;
    s.baseY = s.knobY = s.homeY;
    s.state.x = 0;
    s.state.y = 0;
    s.state.active = false;
  }

  private pos(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down = (e: PointerEvent) => {
    const p = this.pos(e);
    const pr = this.pauseRect;
    if (p.x >= pr.x && p.x <= pr.x + pr.w && p.y >= pr.y && p.y <= pr.y + pr.h) {
      this.onPause?.();
      return;
    }
    // Prefer a free stick whose base is close; otherwise the zone the finger is in.
    let pick: Stick | null = null;
    let best = Infinity;
    for (const s of this.sticks) {
      if (s.pointer !== null) continue;
      const z = s.zone;
      const inZone = p.x >= z.x && p.x < z.x + z.w && p.y >= z.y && p.y < z.y + z.h;
      const d = Math.hypot(p.x - s.homeX, p.y - s.homeY);
      if (inZone || d < this.radius * 1.6) {
        const score = inZone ? d : d + 10000;
        if (score < best) {
          best = score;
          pick = s;
        }
      }
    }
    if (!pick) return;
    e.preventDefault();
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pick.pointer = e.pointerId;
    // Floating joystick: the base jumps to where the finger lands.
    pick.baseX = pick.knobX = p.x;
    pick.baseY = pick.knobY = p.y;
    pick.state.active = true;
    pick.state.x = 0;
    pick.state.y = 0;
  };

  private move = (e: PointerEvent) => {
    const s = this.sticks.find((k) => k.pointer === e.pointerId);
    if (!s) return;
    e.preventDefault();
    const p = this.pos(e);
    let dx = p.x - s.baseX;
    let dy = p.y - s.baseY;
    const d = Math.hypot(dx, dy);
    const r = this.radius;
    if (d > r) {
      // Drag past the edge pulls the base along, so the stick never gets stuck.
      const over = d - r;
      s.baseX += (dx / d) * over * 0.35;
      s.baseY += (dy / d) * over * 0.35;
      dx = p.x - s.baseX;
      dy = p.y - s.baseY;
      const d2 = Math.hypot(dx, dy);
      dx = (dx / d2) * r;
      dy = (dy / d2) * r;
    }
    s.knobX = s.baseX + dx;
    s.knobY = s.baseY + dy;
    s.state.x = dx / r;
    s.state.y = dy / r;
  };

  private up = (e: PointerEvent) => {
    const s = this.sticks.find((k) => k.pointer === e.pointerId);
    if (!s) return;
    s.pointer = null;
    this.reset(s);
  };

  private keyDown = (e: KeyboardEvent) => {
    if (KEYMAPS.some((k) => Object.values(k).includes(e.code))) e.preventDefault();
    this.keys.add(e.code);
    this.applyKeys();
  };

  private keyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    this.applyKeys();
  };

  private releaseAll = () => {
    this.keys.clear();
    for (const s of this.sticks) {
      s.pointer = null;
      this.reset(s);
    }
  };

  /** Keyboard (for computers): WASD = P1, arrows = P2, IJKL = P3. Letting go of all keys = skill. */
  private applyKeys() {
    KEYMAPS.forEach((k, i) => {
      const s = this.sticks[i];
      if (!s || s.pointer !== null) return;
      const x = (this.keys.has(k.right) ? 1 : 0) - (this.keys.has(k.left) ? 1 : 0);
      const y = (this.keys.has(k.down) ? 1 : 0) - (this.keys.has(k.up) ? 1 : 0);
      const d = Math.hypot(x, y);
      s.state.active = d > 0;
      s.state.x = d ? x / d : 0;
      s.state.y = d ? y / d : 0;
      s.knobX = s.baseX + s.state.x * this.radius;
      s.knobY = s.baseY + s.state.y * this.radius;
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    const r = this.radius;
    for (const s of this.sticks) {
      const hp = s.hp();
      const dead = hp <= 0;
      ctx.globalAlpha = dead ? 0.25 : 1;
      ctx.fillStyle = hexA(s.color, 0.18);
      ctx.strokeStyle = hexA(s.color, 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.baseX, s.baseY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Up / down hints
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      tri(ctx, s.baseX, s.baseY - r + 10, -1);
      ctx.fillStyle = 'rgba(129,212,250,0.75)';
      tri(ctx, s.baseX, s.baseY + r - 10, 1);
      ctx.fillStyle = s.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(s.knobX, s.knobY, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = `900 ${Math.round(r * 0.32)}px "Baloo 2", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(s.label, s.knobX, s.knobY + 1);
      ctx.textBaseline = 'alphabetic';
      // HP bar under the joystick
      const bw = r * 1.6;
      const by = s.baseY + r + 8;
      const clampedY = by + 8 > this.el.clientHeight ? s.baseY - r - 14 : by;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(s.baseX - bw / 2 - 2, clampedY - 2, bw + 4, 8);
      ctx.fillStyle = s.color;
      ctx.fillRect(s.baseX - bw / 2, clampedY, bw * Math.max(0, hp), 4);
      if (s.name) {
        ctx.font = '700 12px "Baloo 2", system-ui, sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        const below = clampedY + 20 <= this.el.clientHeight;
        const ny = clampedY < s.baseY ? clampedY - 6 : below ? clampedY + 18 : s.baseY - r - 8;
        ctx.strokeText(s.name, s.baseX, ny);
        ctx.fillStyle = '#fff';
        ctx.fillText(s.name, s.baseX, ny);
      }
      ctx.globalAlpha = 1;
    }
  }
}

function tri(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  ctx.beginPath();
  ctx.moveTo(x - 6, y - dir * 3);
  ctx.lineTo(x + 6, y - dir * 3);
  ctx.lineTo(x, y + dir * 5);
  ctx.fill();
}

export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
