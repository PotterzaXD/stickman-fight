type Ctx = CanvasRenderingContext2D;

/*
 * The new weapons, drawn in local space: the hand is at (0, 0) and the weapon points along +x.
 * Guns have their grip under the hand (they are flipped when you aim left, so they stay upright).
 */

function poly(ctx: Ctx, pts: [number, number][], s: number, fill: string, stroke = 'rgba(0,0,0,0.85)', w = 1.2) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = w * s;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, s: number, fill: string, stroke = 'rgba(0,0,0,0.85)', lw = 1.2) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw * s;
  ctx.beginPath();
  ctx.rect(x * s, y * s, w * s, h * s);
  ctx.fill();
  ctx.stroke();
}

/** Pump shotgun (black): full stock, receiver, long barrel over the tube magazine, ribbed pump. */
export function drawShotgun(ctx: Ctx, len: number, s: number) {
  const L = len / s;
  // Stock
  poly(ctx, [[-2, -5], [-30, -3], [-33, 3], [-31, 8], [-7, 4], [-1, 2]], s, '#1f1f1f');
  // Receiver with the ejection port
  box(ctx, -3, -7, 18, 9, s, '#262626');
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(3 * s, -5 * s, 7 * s, 2 * s);
  // Trigger guard
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.arc(3 * s, 4 * s, 3 * s, 0, Math.PI);
  ctx.stroke();
  // Barrel and tube magazine
  box(ctx, 15, -6.5, L - 15, 3.5, s, '#2c2c2c');
  box(ctx, 15, -2.5, L - 21, 3.2, s, '#202020');
  // Ribbed pump
  box(ctx, 21, -3.5, 18, 6, s, '#333');
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 0.8 * s;
  for (let x = 24; x < 38; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x * s, -3 * s);
    ctx.lineTo(x * s, 2 * s);
    ctx.stroke();
  }
  // Front sight
  ctx.fillStyle = '#111';
  ctx.fillRect((L - 3) * s, -8.5 * s, 2 * s, 2 * s);
}

/** Big tan .50 sniper rifle: skeleton stock, scope, magazine, bipod and a long barrel with a suppressor. */
export function drawSniper(ctx: Ctx, len: number, s: number, ready: boolean) {
  const L = len / s;
  const tan = '#b48b55';
  // Skeleton stock
  poly(ctx, [[-4, -5], [-28, -6], [-30, 6], [-25, 6], [-24, -1], [-10, -1], [-6, 3]], s, tan);
  // Pistol grip
  poly(ctx, [[-2, 0], [2, 0], [0, 9], [-4, 9]], s, '#2b2b2b');
  // Receiver (tan with holes) and magazine
  box(ctx, -6, -7, 30, 8, s, tan);
  ctx.fillStyle = '#7a5b33';
  for (let x = 6; x < 22; x += 5) ctx.fillRect(x * s, -5 * s, 3 * s, 2 * s);
  box(ctx, 6, 1, 6, 8, s, '#1e1e1e');
  // Barrel, muzzle brake / suppressor
  box(ctx, 24, -4.5, L - 34, 2.6, s, '#262626');
  box(ctx, L - 11, -6, 11, 5.5, s, '#1b1b1b');
  // Folded bipod
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(24 * s, 1 * s);
  ctx.lineTo(34 * s, 3 * s);
  ctx.stroke();
  // Scope with lenses (the front lens glints when it is ready to fire)
  box(ctx, 0, -14, 22, 4.5, s, '#1b1b1b');
  poly(ctx, [[-3, -15], [0, -14], [0, -9.5], [-3, -9]], s, '#1b1b1b');
  poly(ctx, [[22, -14], [26, -15.5], [26, -8], [22, -9.5]], s, '#1b1b1b');
  ctx.fillStyle = '#111';
  ctx.fillRect(7 * s, -10 * s, 2.5 * s, 3 * s);
  ctx.fillRect(14 * s, -10 * s, 2.5 * s, 3 * s);
  ctx.fillStyle = ready ? '#4fc3f7' : '#455a64';
  ctx.beginPath();
  ctx.ellipse(26 * s, -11.8 * s, 0.9 * s, 3.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Silver 1911-style pistol with black grips. */
export function drawPistol(ctx: Ctx, len: number, s: number) {
  const L = Math.max(26, len / s);
  // Grip (black, chequered)
  poly(ctx, [[-6, -2], [1, -2], [-1, 11], [-9, 11]], s, '#1e1e1e');
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 0.6 * s;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo((-7 + k * 1.5) * s, 1 * s);
    ctx.lineTo((-8.5 + k * 1.5) * s, 9 * s);
    ctx.stroke();
  }
  // Frame and trigger guard
  box(ctx, -7, -3, L - 3, 3.5, s, '#b0bec5');
  ctx.strokeStyle = '#90a4ae';
  ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.arc(3 * s, 1.5 * s, 3 * s, 0, Math.PI);
  ctx.stroke();
  // Slide with serrations
  box(ctx, -8, -8, L + 2, 5.5, s, '#cfd8dc');
  ctx.strokeStyle = '#78909c';
  ctx.lineWidth = 0.6 * s;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo((-6 + k * 1.6) * s, -7.5 * s);
    ctx.lineTo((-6 + k * 1.6) * s, -3 * s);
    ctx.stroke();
  }
  // Hammer and sights
  ctx.fillStyle = '#90a4ae';
  ctx.fillRect(-10 * s, -9 * s, 2.5 * s, 2.5 * s);
  ctx.fillStyle = '#263238';
  ctx.fillRect((L - 2) * s, -9.5 * s, 1.6 * s, 1.6 * s);
  // An orange tip: it shoots nerf bullets
  ctx.fillStyle = '#ff9800';
  ctx.fillRect((L - 6.5) * s, -8 * s, 0.6 * s + 0.5, 5.5 * s);
}

/** The 67 Gun: a chunky purple and gold blaster with "67" on the side. */
export function drawGun67(ctx: Ctx, len: number, s: number, ready: boolean) {
  const L = len / s;
  poly(ctx, [[-5, -1], [2, -1], [0, 10], [-7, 10]], s, '#6a1b9a');
  box(ctx, -8, -9, L - 4, 10, s, '#8e24aa');
  box(ctx, L - 12, -7, 12, 6, s, '#fbc02d');
  ctx.fillStyle = ready ? '#ffeb3b' : '#bdbdbd';
  ctx.font = `900 ${Math.round(8 * s)}px "Baloo 2", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('67', ((L - 12) / 2 - 4) * s, -4 * s);
  ctx.textBaseline = 'alphabetic';
}

/** Water Gun: a blue and orange soaker with a water tank on top. */
export function drawWaterGun(ctx: Ctx, len: number, s: number) {
  const L = len / s;
  poly(ctx, [[-4, -1], [2, -1], [0, 9], [-6, 9]], s, '#ff9800');
  box(ctx, -8, -6, L - 4, 7, s, '#1e88e5');
  box(ctx, L - 12, -4.5, 12, 3.5, s, '#ff9800');
  ctx.fillStyle = 'rgba(129,212,250,0.9)';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.ellipse(4 * s, -11 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Summoner: a dark staff with a glowing crystal and little orbiting sparks. */
export function drawSummoner(ctx: Ctx, len: number, s: number, ready: boolean, time: number) {
  ctx.strokeStyle = '#4a148c';
  ctx.lineWidth = 4.5 * s;
  ctx.beginPath();
  ctx.moveTo(-10 * s, 0);
  ctx.lineTo(len - 12 * s, 0);
  ctx.stroke();
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(len - 6 * s, 0, 8 * s, -1.2, 1.2);
  ctx.stroke();
  ctx.fillStyle = ready ? '#e040fb' : '#7b1fa2';
  ctx.beginPath();
  ctx.moveTo(len - 6 * s, -8 * s);
  ctx.lineTo(len, 0);
  ctx.lineTo(len - 6 * s, 8 * s);
  ctx.lineTo(len - 12 * s, 0);
  ctx.closePath();
  ctx.fill();
  if (ready) {
    ctx.fillStyle = '#f8bbd0';
    for (let k = 0; k < 3; k++) {
      const a = time * 5 + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(len - 6 * s + Math.cos(a) * 13 * s, Math.sin(a) * 13 * s, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Spear of Bravery: a golden spear with a red banner. */
export function drawBravery(ctx: Ctx, len: number, s: number, time: number) {
  ctx.strokeStyle = '#a1887f';
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(-8 * s, 0);
  ctx.lineTo(len - 14 * s, 0);
  ctx.stroke();
  // Banner waving under the head
  const wave = Math.sin(time * 8) * 3 * s;
  ctx.fillStyle = '#d32f2f';
  ctx.beginPath();
  ctx.moveTo(len - 30 * s, 2 * s);
  ctx.lineTo(len - 18 * s, 2 * s);
  ctx.lineTo(len - 20 * s + wave, 14 * s);
  ctx.lineTo(len - 26 * s + wave, 10 * s);
  ctx.lineTo(len - 32 * s + wave, 14 * s);
  ctx.closePath();
  ctx.fill();
  poly(ctx, [[(len - 20 * s) / s, -7], [len / s, 0], [(len - 20 * s) / s, 7], [(len - 24 * s) / s, 0]], s, '#ffd54f', '#8d6e00');
}

/** Frying pan. */
export function drawPan(ctx: Ctx, len: number, s: number) {
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(-6 * s, 0);
  ctx.lineTo(len - 26 * s, 0);
  ctx.stroke();
  ctx.fillStyle = '#212121';
  ctx.strokeStyle = '#616161';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.ellipse(len - 13 * s, 0, 13 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(len - 13 * s, 0, 8 * s, -2.2, -1.2);
  ctx.stroke();
}

/** Bubble Wand: a stick with a ring, and a bubble on it when it is ready. */
export function drawBubbleWand(ctx: Ctx, len: number, s: number, ready: boolean) {
  ctx.strokeStyle = '#26a69a';
  ctx.lineWidth = 3.5 * s;
  ctx.beginPath();
  ctx.moveTo(-6 * s, 0);
  ctx.lineTo(len - 16 * s, 0);
  ctx.stroke();
  ctx.strokeStyle = '#ec407a';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(len - 8 * s, 0, 8 * s, 0, Math.PI * 2);
  ctx.stroke();
  if (ready) drawBubble(ctx, (len + 6 * s) , -2 * s, 8 * s);
}

/** A soap bubble. */
export function drawBubble(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(179,229,252,0.25)';
  ctx.strokeStyle = 'rgba(225,245,254,0.9)';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(244,143,177,0.7)';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.82, 0.3, 1.4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
}
