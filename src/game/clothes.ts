import { drawHat } from './hats';

/*
 * Outfits for the profile picture: shirts, pants and shoes bought in the shop.
 * They only show on your profile stickman (not in matches).
 */

type Ctx = CanvasRenderingContext2D;

export type ClothSlot = 'shirt' | 'pants' | 'shoes';

export interface ClothDef {
  id: string;
  slot: ClothSlot;
  price: number;
  /** Main colour and a second colour (stripes, trim, soles...). */
  a: string;
  b: string;
  /** How it is drawn on top of the plain colour. */
  look?: 'stripes' | 'number' | 'tux' | 'flowers' | 'armor' | 'robe' | 'hood' | 'plaid' | 'stripe' | 'pockets' | 'shine' | 'flame' | 'laces' | 'straps' | 'spikes' | 'high';
}

export const CLOTHES: ClothDef[] = [
  // Shirts
  { id: 'redtee', slot: 'shirt', price: 60, a: '#e53935', b: '#b71c1c' },
  { id: 'stripes', slot: 'shirt', price: 90, a: '#ffffff', b: '#1e88e5', look: 'stripes' },
  { id: 'jersey', slot: 'shirt', price: 120, a: '#43a047', b: '#ffffff', look: 'number' },
  { id: 'hoodie', slot: 'shirt', price: 140, a: '#616161', b: '#424242', look: 'hood' },
  { id: 'hawaii', slot: 'shirt', price: 180, a: '#00acc1', b: '#ffeb3b', look: 'flowers' },
  { id: 'tuxedo', slot: 'shirt', price: 250, a: '#212121', b: '#ffffff', look: 'tux' },
  { id: 'armor', slot: 'shirt', price: 300, a: '#90a4ae', b: '#eceff1', look: 'armor' },
  { id: 'tomerobe', slot: 'shirt', price: 400, a: '#4a148c', b: '#e040fb', look: 'robe' },
  // Pants
  { id: 'jeans', slot: 'pants', price: 60, a: '#1565c0', b: '#0d47a1', look: 'pockets' },
  { id: 'shorts', slot: 'pants', price: 50, a: '#8d6e63', b: '#5d4037' },
  { id: 'track', slot: 'pants', price: 90, a: '#212121', b: '#ffffff', look: 'stripe' },
  { id: 'cargo', slot: 'pants', price: 100, a: '#689f38', b: '#33691e', look: 'pockets' },
  { id: 'plaid', slot: 'pants', price: 120, a: '#c62828', b: '#212121', look: 'plaid' },
  { id: 'suit', slot: 'pants', price: 150, a: '#eeeeee', b: '#bdbdbd' },
  { id: 'ninja', slot: 'pants', price: 200, a: '#263238', b: '#d32f2f', look: 'straps' },
  { id: 'goldpants', slot: 'pants', price: 350, a: '#ffc107', b: '#ff8f00', look: 'shine' },
  // Shoes
  { id: 'sandals', slot: 'shoes', price: 30, a: '#a1887f', b: '#6d4c41', look: 'straps' },
  { id: 'sneakers', slot: 'shoes', price: 40, a: '#ffffff', b: '#e53935', look: 'laces' },
  { id: 'slippers', slot: 'shoes', price: 50, a: '#f48fb1', b: '#ffffff' },
  { id: 'boots', slot: 'shoes', price: 80, a: '#5d4037', b: '#3e2723', look: 'high' },
  { id: 'cleats', slot: 'shoes', price: 100, a: '#1e88e5', b: '#ffffff', look: 'spikes' },
  { id: 'hightops', slot: 'shoes', price: 120, a: '#d32f2f', b: '#ffffff', look: 'high' },
  { id: 'rocket', slot: 'shoes', price: 300, a: '#78909c', b: '#ff9100', look: 'flame' },
  { id: 'goldshoes', slot: 'shoes', price: 350, a: '#ffc107', b: '#ff8f00', look: 'shine' },
];

export const clothOf = (id: string | undefined) => CLOTHES.find((c) => c.id === id);
export const CLOTH_SLOTS: ClothSlot[] = ['shirt', 'pants', 'shoes'];

export interface Look {
  hat: string;
  shirt: string;
  pants: string;
  shoes: string;
  color: string;
}

/**
 * A standing stickman wearing an outfit, for the profile picture and the shop.
 * (cx, by) is the middle of the feet; `s` is the size (1 = 100 px tall).
 */
export function drawOutfit(ctx: Ctx, look: Look, cx: number, by: number, s: number, time = 0) {
  const col = look.color;
  const lw = 5 * s;
  const head = { x: cx, y: by - 82 * s };
  const r = 12 * s;
  const neck = { x: cx, y: by - 68 * s };
  const hip = { x: cx, y: by - 38 * s };
  const feet = [
    { x: cx - 13 * s, y: by - 2 * s },
    { x: cx + 13 * s, y: by - 2 * s },
  ];
  const hands = [
    { x: cx - 22 * s, y: by - 40 * s },
    { x: cx + 22 * s, y: by - 40 * s },
  ];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  const seg = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  // Legs, then pants over them
  for (const f of feet) seg(hip.x, hip.y, f.x, f.y);
  const pants = clothOf(look.pants);
  if (pants) drawPants(ctx, pants, hip, feet, s);
  const shoes = clothOf(look.shoes);
  if (shoes) for (const [i, f] of feet.entries()) drawShoe(ctx, shoes, f.x, f.y, s, i === 0 ? -1 : 1, time);
  // Body and arms, then the shirt over them
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  seg(neck.x, neck.y, hip.x, hip.y);
  for (const hd of hands) seg(neck.x, neck.y + 4 * s, hd.x, hd.y);
  const shirt = clothOf(look.shirt);
  if (shirt) drawShirt(ctx, shirt, neck, hip, hands, s);
  // Head with a face
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = col;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#212121';
  for (const dx of [-4.5, 4.5]) {
    ctx.beginPath();
    ctx.arc(head.x + dx * s, head.y - 1.5 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#212121';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.arc(head.x, head.y + 2.5 * s, 4.5 * s, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
  // Hats are drawn for a head of radius 11 * scale.
  drawHat(ctx, look.hat, head.x, head.y, r / 11, 1, time);
}

function drawShirt(ctx: Ctx, c: ClothDef, neck: { x: number; y: number }, hip: { x: number; y: number }, hands: { x: number; y: number }[], s: number) {
  const robe = c.look === 'robe';
  const top = neck.y + 1 * s;
  const bot = robe ? hip.y + 30 * s : hip.y + 4 * s;
  const tw = 13 * s;
  const bw = robe ? 22 * s : 12 * s;
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(neck.x - tw, top + 3 * s);
    ctx.lineTo(neck.x + tw, top + 3 * s);
    ctx.lineTo(hip.x + bw, bot);
    ctx.lineTo(hip.x - bw, bot);
    ctx.closePath();
  };
  ctx.save();
  ctx.lineJoin = 'round';
  // Sleeves (to the elbows, all the way for hoodies, robes and armour)
  const long = c.look === 'hood' || c.look === 'robe' || c.look === 'armor' || c.look === 'tux';
  ctx.strokeStyle = c.a;
  ctx.lineWidth = 9 * s;
  ctx.lineCap = 'round';
  for (const hd of hands) {
    const k = long ? 0.85 : 0.45;
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y + 5 * s);
    ctx.lineTo(neck.x + (hd.x - neck.x) * k, neck.y + 5 * s + (hd.y - neck.y - 5 * s) * k);
    ctx.stroke();
  }
  ctx.fillStyle = c.a;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.5 * s;
  body();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  body();
  ctx.clip();
  const h = bot - top;
  switch (c.look) {
    case 'stripes':
      ctx.fillStyle = c.b;
      for (let y = top + 5 * s; y < bot; y += 7 * s) ctx.fillRect(hip.x - 30 * s, y, 60 * s, 3 * s);
      break;
    case 'number':
      ctx.fillStyle = c.b;
      ctx.font = `900 ${16 * s}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('10', neck.x, top + h * 0.5);
      break;
    case 'hood':
      ctx.fillStyle = c.b;
      ctx.fillRect(neck.x - 8 * s, top + h * 0.55, 16 * s, 7 * s);
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1.5 * s;
      for (const dx of [-3, 3]) {
        ctx.beginPath();
        ctx.moveTo(neck.x + dx * s, top + 3 * s);
        ctx.lineTo(neck.x + dx * s, top + 12 * s);
        ctx.stroke();
      }
      break;
    case 'flowers':
      ctx.fillStyle = c.b;
      for (const [fx, fy] of [[-6, 0.25], [5, 0.45], [-3, 0.75], [7, 0.85], [0, 0.1]]) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(neck.x + fx * s + Math.cos(a) * 2.2 * s, top + h * fy + Math.sin(a) * 2.2 * s, 1.6 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case 'tux':
      ctx.fillStyle = c.b;
      ctx.beginPath();
      ctx.moveTo(neck.x - 5 * s, top);
      ctx.lineTo(neck.x + 5 * s, top);
      ctx.lineTo(neck.x, top + h * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.moveTo(neck.x, top + 5 * s);
      ctx.lineTo(neck.x - 5 * s, top + 2 * s);
      ctx.lineTo(neck.x - 5 * s, top + 8 * s);
      ctx.lineTo(neck.x + 5 * s, top + 2 * s);
      ctx.lineTo(neck.x + 5 * s, top + 8 * s);
      ctx.closePath();
      ctx.fill();
      break;
    case 'armor':
      ctx.strokeStyle = c.b;
      ctx.lineWidth = 2 * s;
      for (let y = top + 8 * s; y < bot; y += 9 * s) {
        ctx.beginPath();
        ctx.moveTo(hip.x - 20 * s, y);
        ctx.lineTo(hip.x + 20 * s, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(neck.x, top + h * 0.35, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'robe':
      ctx.strokeStyle = c.b;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(neck.x, top);
      ctx.lineTo(neck.x, bot);
      ctx.stroke();
      ctx.fillStyle = c.b;
      ctx.font = `${10 * s}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('✦', neck.x - 8 * s, top + h * 0.6);
      ctx.fillText('✦', neck.x + 8 * s, top + h * 0.3);
      break;
    default:
      ctx.fillStyle = c.b;
      ctx.fillRect(neck.x - 6 * s, top, 12 * s, 3 * s);
  }
  ctx.restore();
  ctx.restore();
}

function drawPants(ctx: Ctx, c: ClothDef, hip: { x: number; y: number }, feet: { x: number; y: number }[], s: number) {
  const short = c.id === 'shorts';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const f of feet) {
    const k = short ? 0.45 : 0.9;
    const ex = hip.x + (f.x - hip.x) * k;
    const ey = hip.y + (f.y - hip.y) * k;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 12 * s;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = c.a;
    ctx.lineWidth = 10 * s;
    ctx.stroke();
    ctx.lineWidth = 2 * s;
    switch (c.look) {
      case 'stripe':
        ctx.strokeStyle = c.b;
        ctx.beginPath();
        ctx.moveTo(hip.x + (f.x > hip.x ? 4 : -4) * s, hip.y + 2 * s);
        ctx.lineTo(ex + (f.x > hip.x ? 4 : -4) * s, ey);
        ctx.stroke();
        break;
      case 'pockets':
        ctx.fillStyle = c.b;
        ctx.fillRect(hip.x + (f.x - hip.x) * 0.4 - 3 * s, hip.y + (f.y - hip.y) * 0.4 - 3 * s, 6 * s, 6 * s);
        break;
      case 'plaid':
        ctx.strokeStyle = c.b;
        for (const t of [0.25, 0.5, 0.75]) {
          const x = hip.x + (f.x - hip.x) * t * k;
          const y = hip.y + (f.y - hip.y) * t * k;
          ctx.beginPath();
          ctx.moveTo(x - 5 * s, y);
          ctx.lineTo(x + 5 * s, y);
          ctx.stroke();
        }
        break;
      case 'straps':
        ctx.strokeStyle = c.b;
        ctx.beginPath();
        ctx.moveTo(ex - 5 * s, ey - 3 * s);
        ctx.lineTo(ex + 5 * s, ey - 3 * s);
        ctx.stroke();
        break;
      case 'shine':
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(hip.x + (f.x - hip.x) * 0.2 - 2 * s, hip.y + (f.y - hip.y) * 0.2);
        ctx.lineTo(hip.x + (f.x - hip.x) * 0.6 - 2 * s, hip.y + (f.y - hip.y) * 0.6);
        ctx.stroke();
        break;
    }
  }
  // Waistband
  ctx.fillStyle = c.id === 'track' ? c.b : c.a;
  ctx.fillRect(hip.x - 8 * s, hip.y - 3 * s, 16 * s, 6 * s);
  ctx.restore();
}

function drawShoe(ctx: Ctx, c: ClothDef, x: number, y: number, s: number, d: number, time: number) {
  ctx.save();
  ctx.lineJoin = 'round';
  const w = 13 * s;
  const tall = c.look === 'high' ? 10 * s : 5 * s;
  // Rocket boots: flames under the feet
  if (c.look === 'flame') {
    const fl = 6 + Math.sin(time * 20) * 2;
    ctx.fillStyle = '#ffab00';
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y + 2 * s);
    ctx.lineTo(x + 4 * s, y + 2 * s);
    ctx.lineTo(x, y + (4 + fl) * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = c.a;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(x - (d < 0 ? w * 0.75 : w * 0.35), y + 2 * s);
  ctx.lineTo(x + (d > 0 ? w * 0.75 : w * 0.35), y + 2 * s);
  ctx.quadraticCurveTo(x + d * w * 0.7, y - tall * 0.6, x + d * 2 * s, y - tall);
  ctx.lineTo(x - d * 4 * s, y - tall);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Sole
  ctx.fillStyle = c.b;
  ctx.fillRect(x - w * 0.55, y + 0.5 * s, w * 1.1, 2.5 * s);
  switch (c.look) {
    case 'laces':
      ctx.strokeStyle = c.b;
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(x - 2 * s, y - 3 * s);
      ctx.lineTo(x + 2 * s, y - 1 * s);
      ctx.stroke();
      break;
    case 'spikes':
      ctx.fillStyle = '#eeeeee';
      for (const dx of [-4, 0, 4]) ctx.fillRect(x + dx * s - 0.8 * s, y + 3 * s, 1.6 * s, 2 * s);
      break;
    case 'straps':
      ctx.strokeStyle = c.b;
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(x - 4 * s, y - 3 * s);
      ctx.lineTo(x + 4 * s, y);
      ctx.stroke();
      break;
    case 'shine':
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(x - 2 * s, y - 3 * s, 3 * s, 1.5 * s);
      break;
  }
  ctx.restore();
}
