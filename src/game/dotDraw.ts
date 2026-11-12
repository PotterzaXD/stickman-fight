import { DOT, DOT_MOVES } from './dot';
import type { Fighter } from './entities';
import type { Game } from './game';

type Ctx = CanvasRenderingContext2D;

/*
 * The "." boss: a big black dot with eyes. On its turn it glows in the colour of the boss whose attack it is using;
 * on your turn it is tired (droopy eyes, a gold "hit me" ring). Its hearts float above it.
 */

export function drawDot(ctx: Ctx, f: Fighter, time: number) {
  const d = f.dot;
  const r = f.w / 2;
  const cx = f.x;
  const cy = f.y - r;
  const tired = d?.turn === 'you';
  const mv = d && d.move >= 0 ? DOT_MOVES[d.move] : null;
  ctx.save();
  // Aura: the boss it is copying, or gold when it can be hit.
  const aura = tired ? '#ffd740' : mv?.color ?? '#7c4dff';
  ctx.shadowColor = aura;
  ctx.shadowBlur = tired ? 30 + Math.sin(time * 8) * 10 : 22;
  const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  grad.addColorStop(0, f.hurtFlash > 0 ? '#ffffff' : '#4a4a4a');
  grad.addColorStop(0.35, f.hurtFlash > 0 ? '#ffcdd2' : '#1c1c1c');
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.38, cy - r * 0.45, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Eyes look the way it faces.
  const look = (f.facing || 1) * r * 0.08;
  for (const sx of [-1, 1]) {
    const ex = cx + sx * r * 0.3 + look;
    const ey = cy - r * 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.15, r * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tired ? '#455a64' : '#d50000';
    ctx.beginPath();
    ctx.arc(ex + look * 0.6, ey + (tired ? r * 0.05 : 0), r * 0.075, 0, Math.PI * 2);
    ctx.fill();
    if (tired) {
      // Droopy lids.
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(ex, ey - r * 0.06, r * 0.17, r * 0.14, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else {
      // Angry brows.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = r * 0.05;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - sx * r * 0.16, ey - r * 0.3);
      ctx.lineTo(ex + sx * r * 0.12, ey - r * 0.2);
      ctx.stroke();
    }
  }
  // The boss it is copying, on its "face".
  if (mv && !tired) {
    ctx.font = `${Math.round(r * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mv.icon, cx, cy + r * 0.45);
  }
  if (tired) {
    // A gold ring: hit it now!
    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = -time * 40;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e3f2fd';
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.62, cy - r * 0.35 + ((time * 30) % 20), r * 0.06, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Hearts and its name above.
  const hearts = Math.max(0, Math.round(f.hp));
  const total = Math.max(DOT.hearts, Math.round(f.maxHp));
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('❤️'.repeat(hearts) + '🖤'.repeat(Math.max(0, total - hearts)), cx, cy - r - 14);
  ctx.font = 'bold 15px "Baloo 2", system-ui, sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(f.name, cx, cy - r - 40);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(f.name, cx, cy - r - 40);
}

/** The Kraken move's warning: the zone where the tentacles are about to come down. */
export function drawDotWorld(ctx: Ctx, g: Game, time: number) {
  for (const f of g.fighters) {
    const d = f.dot;
    if (!f.alive || !d || d.zoneT <= 0) continue;
    const a = 0.25 + Math.abs(Math.sin(time * 14)) * 0.25;
    ctx.fillStyle = `rgba(213,0,80,${a})`;
    ctx.fillRect(d.zoneX - DOT.slamR, d.zoneY - 300, DOT.slamR * 2, 300);
    ctx.strokeStyle = '#ff4081';
    ctx.lineWidth = 3;
    ctx.strokeRect(d.zoneX - DOT.slamR, d.zoneY - 300, DOT.slamR * 2, 300);
    ctx.font = '900 30px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⚠️ 🐙', d.zoneX, d.zoneY - 320);
  }
}
