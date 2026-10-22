import { CROSSHAIR_CONFIG } from '@/game/config/aim';
import { crosshairGap } from '@/game/rules/aim';
import type { Position } from '@/game/model/types';

/** Four arms, no center dot. Only reads spread; never advances it. */
export function drawCrosshair(ctx: CanvasRenderingContext2D, center: Position, envelopeHalf: number, alpha = 1) {
  const gap = crosshairGap(envelopeHalf), outer = gap + CROSSHAIR_CONFIG.armLengthPx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(center.x, center.y - outer); ctx.lineTo(center.x, center.y - gap);
  ctx.moveTo(center.x, center.y + gap); ctx.lineTo(center.x, center.y + outer);
  ctx.moveTo(center.x - outer, center.y); ctx.lineTo(center.x - gap, center.y);
  ctx.moveTo(center.x + gap, center.y); ctx.lineTo(center.x + outer, center.y);
  ctx.strokeStyle = CROSSHAIR_CONFIG.outlineColor;
  ctx.lineWidth = CROSSHAIR_CONFIG.lineWidthPx + 2 * CROSSHAIR_CONFIG.outlineWidthPx;
  ctx.stroke();
  ctx.strokeStyle = CROSSHAIR_CONFIG.color;
  ctx.lineWidth = CROSSHAIR_CONFIG.lineWidthPx;
  ctx.stroke();
  ctx.restore();
}
