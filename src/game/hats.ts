type Ctx = CanvasRenderingContext2D;

export interface HatDef {
  id: string;
  price: number;
}

/** Hats sold in the hat shop. */
export const HATS: HatDef[] = [
  { id: 'cap', price: 50 },
  { id: 'party', price: 80 },
  { id: 'chef', price: 100 },
  { id: 'helmet', price: 120 },
  { id: 'beanie', price: 150 },
  { id: 'pirate', price: 160 },
  { id: 'tophat', price: 180 },
  { id: 'cowboy', price: 200 },
  { id: 'viking', price: 220 },
  { id: 'wizard', price: 250 },
  { id: 'crown', price: 300 },
  { id: 'halo', price: 300 },
];

export const hatExists = (id: string) => HATS.some((h) => h.id === id);

/** Pick a hat for a slot: 'random' rolls one of the owned hats, unknown ids mean no hat. */
export function resolveHat(id: string | undefined, owned: string[]): string {
  if (id === 'random') {
    const pool = HATS.filter((h) => owned.includes(h.id));
    return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : 'none';
  }
  return id && hatExists(id) ? id : 'none';
}

function shape(ctx: Ctx, fill: string, stroke: string, w: number, path: () => void) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = w;
  ctx.beginPath();
  path();
  ctx.fill();
  ctx.stroke();
}

/**
 * Draw a hat on a head centred at (hx, hy) with radius 11 * s. `d` = which way the stickman faces.
 * `time` makes the beanie's propeller spin and the halo bob.
 */
export function drawHat(ctx: Ctx, id: string, hx: number, hy: number, s: number, d: number, time = 0) {
  if (!id || id === 'none') return;
  const top = hy - 11 * s;
  const o = 'rgba(0,0,0,0.75)';
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (id) {
    case 'cap':
      // Red baseball cap with the peak out front
      shape(ctx, '#e53935', o, 1.5 * s, () => ctx.arc(hx, top + 6 * s, 10.5 * s, Math.PI, 0));
      shape(ctx, '#c62828', o, 1.5 * s, () => {
        ctx.moveTo(hx + d * 6 * s, top + 5 * s);
        ctx.lineTo(hx + d * 19 * s, top + 6.5 * s);
        ctx.lineTo(hx + d * 6 * s, top + 8 * s);
      });
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(hx, top - 4 * s, 1.6 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'party':
      shape(ctx, '#ab47bc', o, 1.5 * s, () => {
        ctx.moveTo(hx - 8 * s, top + 3 * s);
        ctx.lineTo(hx + d * 3 * s, top - 18 * s);
        ctx.lineTo(hx + 8 * s, top + 3 * s);
        ctx.closePath();
      });
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(hx - 5 * s, top - 3 * s);
      ctx.lineTo(hx + 5 * s, top - 3 * s);
      ctx.moveTo(hx - 2 * s, top - 10 * s);
      ctx.lineTo(hx + 3 * s, top - 10 * s);
      ctx.stroke();
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(hx + d * 3 * s, top - 19 * s, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'chef':
      shape(ctx, '#ffffff', o, 1.5 * s, () => {
        ctx.rect(hx - 8 * s, top - 4 * s, 16 * s, 8 * s);
      });
      shape(ctx, '#ffffff', o, 1.5 * s, () => {
        ctx.arc(hx - 6 * s, top - 8 * s, 6 * s, 0, Math.PI * 2);
        ctx.moveTo(hx + 12 * s, top - 8 * s);
        ctx.arc(hx + 6 * s, top - 8 * s, 6 * s, 0, Math.PI * 2);
        ctx.moveTo(hx + 6 * s, top - 13 * s);
        ctx.arc(hx, top - 13 * s, 6 * s, 0, Math.PI * 2);
      });
      break;
    case 'helmet':
      // Army helmet
      shape(ctx, '#556b2f', o, 1.5 * s, () => {
        ctx.arc(hx, top + 7 * s, 12.5 * s, Math.PI, 0);
        ctx.lineTo(hx + 14 * s, top + 8 * s);
        ctx.lineTo(hx - 14 * s, top + 8 * s);
        ctx.closePath();
      });
      ctx.strokeStyle = '#3b4a1f';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(hx - 8 * s, top - 1 * s);
      ctx.lineTo(hx + 8 * s, top - 1 * s);
      ctx.stroke();
      break;
    case 'beanie': {
      // Propeller beanie
      shape(ctx, '#1e88e5', o, 1.5 * s, () => ctx.arc(hx, top + 6 * s, 10.5 * s, Math.PI, 0));
      ctx.fillStyle = '#fdd835';
      ctx.fillRect(hx - 10.5 * s, top + 3 * s, 21 * s, 3 * s);
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(hx, top - 4 * s);
      ctx.lineTo(hx, top - 9 * s);
      ctx.stroke();
      const spin = Math.cos(time * 25);
      shape(ctx, '#e53935', o, 1 * s, () => ctx.ellipse(hx, top - 10 * s, 10 * s * Math.abs(spin) + 1, 2 * s, 0, 0, Math.PI * 2));
      break;
    }
    case 'pirate':
      shape(ctx, '#212121', o, 1.5 * s, () => {
        ctx.moveTo(hx - 16 * s, top + 3 * s);
        ctx.quadraticCurveTo(hx - 8 * s, top - 14 * s, hx, top - 6 * s);
        ctx.quadraticCurveTo(hx + 8 * s, top - 14 * s, hx + 16 * s, top + 3 * s);
        ctx.closePath();
      });
      // Skull
      ctx.fillStyle = '#fafafa';
      ctx.beginPath();
      ctx.arc(hx, top - 2 * s, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fafafa';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(hx - 3 * s, top + 1 * s);
      ctx.lineTo(hx + 3 * s, top + 2.5 * s);
      ctx.moveTo(hx + 3 * s, top + 1 * s);
      ctx.lineTo(hx - 3 * s, top + 2.5 * s);
      ctx.stroke();
      break;
    case 'tophat':
      shape(ctx, '#212121', o, 1.5 * s, () => ctx.rect(hx - 14 * s, top + 1 * s, 28 * s, 3.5 * s));
      shape(ctx, '#212121', o, 1.5 * s, () => ctx.rect(hx - 9 * s, top - 17 * s, 18 * s, 18 * s));
      ctx.fillStyle = '#c62828';
      ctx.fillRect(hx - 9 * s, top - 4 * s, 18 * s, 3.5 * s);
      break;
    case 'cowboy':
      shape(ctx, '#8d6e63', o, 1.5 * s, () => {
        ctx.ellipse(hx, top + 3 * s, 19 * s, 4 * s, 0, 0, Math.PI * 2);
      });
      shape(ctx, '#8d6e63', o, 1.5 * s, () => {
        ctx.moveTo(hx - 9 * s, top + 2 * s);
        ctx.lineTo(hx - 8 * s, top - 11 * s);
        ctx.quadraticCurveTo(hx, top - 6 * s, hx + 8 * s, top - 11 * s);
        ctx.lineTo(hx + 9 * s, top + 2 * s);
        ctx.closePath();
      });
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(hx - 9 * s, top - 2 * s, 18 * s, 3 * s);
      break;
    case 'viking':
      // Horns first, then the helmet over them
      for (const k of [-1, 1]) {
        shape(ctx, '#fff8e1', o, 1.3 * s, () => {
          ctx.moveTo(hx + k * 9 * s, top + 3 * s);
          ctx.quadraticCurveTo(hx + k * 20 * s, top - 2 * s, hx + k * 18 * s, top - 14 * s);
          ctx.quadraticCurveTo(hx + k * 15 * s, top - 3 * s, hx + k * 7 * s, top - 1 * s);
          ctx.closePath();
        });
      }
      shape(ctx, '#9e9e9e', o, 1.5 * s, () => ctx.arc(hx, top + 6 * s, 11 * s, Math.PI, 0));
      ctx.fillStyle = '#795548';
      ctx.fillRect(hx - 11 * s, top + 3 * s, 22 * s, 3 * s);
      break;
    case 'wizard':
      shape(ctx, '#3949ab', o, 1.5 * s, () => {
        ctx.moveTo(hx - 15 * s, top + 4 * s);
        ctx.lineTo(hx + 15 * s, top + 4 * s);
        ctx.lineTo(hx + 4 * s, top - 2 * s);
        ctx.quadraticCurveTo(hx - d * 2 * s, top - 18 * s, hx - d * 12 * s, top - 22 * s);
        ctx.lineTo(hx - 5 * s, top - 2 * s);
        ctx.closePath();
      });
      ctx.fillStyle = '#ffeb3b';
      ctx.font = `${Math.round(7 * s)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('★', hx, top + 1 * s);
      break;
    case 'crown':
      shape(ctx, '#fdd835', '#b8860b', 1.5 * s, () => {
        ctx.moveTo(hx - 10 * s, top + 4 * s);
        ctx.lineTo(hx - 11 * s, top - 8 * s);
        ctx.lineTo(hx - 5 * s, top - 2 * s);
        ctx.lineTo(hx, top - 11 * s);
        ctx.lineTo(hx + 5 * s, top - 2 * s);
        ctx.lineTo(hx + 11 * s, top - 8 * s);
        ctx.lineTo(hx + 10 * s, top + 4 * s);
        ctx.closePath();
      });
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(hx, top + 0.5 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'halo': {
      const bob = Math.sin(time * 3) * 1.5 * s;
      ctx.strokeStyle = '#fff59d';
      ctx.lineWidth = 3 * s;
      ctx.shadowColor = '#fff59d';
      ctx.shadowBlur = 8 * s;
      ctx.beginPath();
      ctx.ellipse(hx, top - 6 * s + bob, 11 * s, 3.5 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
