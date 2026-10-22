import type { Player, Position, WeaponConfig } from '@/game/model/types';
import { AIM_CONFIG, CROSSHAIR_CONFIG, WEAPON_AIM_CONFIG } from '@/game/config/aim';

/** World → Canvas logical coordinates, from the frame actually presented. */
export interface AimViewport {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/** Presentation only; never an authoritative copy of Player or spread. */
export interface AimPresentation {
  viewport: AimViewport | null;
  pointerValid: boolean;
  blocked: boolean;
}

export const createAimPresentation = (): AimPresentation => ({
  viewport: null, pointerValid: false, blocked: false,
});

type CanvasRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function clientToCanvas(client: Position, rect: CanvasRect, width: number, height: number): Position | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { x: (client.x - rect.left) * width / rect.width, y: (client.y - rect.top) * height / rect.height };
}

export function canvasToWorld(point: Position, m: AimViewport): Position {
  const det = m.a * m.d - m.b * m.c;
  if (!Number.isFinite(det) || det === 0) throw new Error('Invalid aim viewport');
  const x = point.x - m.e, y = point.y - m.f;
  return { x: (m.d * x - m.c * y) / det, y: (-m.b * x + m.a * y) / det };
}

export function getAimAngle(
  player: Position,
  client: Position,
  canvas: Pick<HTMLCanvasElement, 'width' | 'height' | 'getBoundingClientRect'>,
  viewport: AimViewport | null
): number | null {
  if (!viewport) return null;
  const point = clientToCanvas(client, canvas.getBoundingClientRect(), canvas.width, canvas.height);
  if (!point) return null;
  const target = canvasToWorld(point, viewport);
  return Math.atan2(target.y - player.y, target.x - player.x);
}

export function movementSpeedRatio(distance: number, axisSpeed: number, inputLength: number): number {
  const maxDistance = axisSpeed * Math.max(1, inputLength);
  return maxDistance > 0 ? clamp01(distance / maxDistance) : 0;
}

export function advanceMovementBloom(current: number, ratio: number, stepMs: number): number {
  if (!AIM_CONFIG.enabled) return 0;
  const target = clamp01(ratio) ** AIM_CONFIG.movementCurveExponent;
  const duration = target > current ? AIM_CONFIG.expandMs : AIM_CONFIG.recoverMs;
  if (duration === 0) return target;
  const change = stepMs / duration;
  return target > current ? Math.min(target, current + change) : Math.max(target, current - change);
}

export function deriveAimSpread(player: Player, weapon: WeaponConfig, movementBloom: number) {
  const accuracy = Math.min(AIM_CONFIG.accuracyMaxPoints,
    Math.max(AIM_CONFIG.accuracyMinPoints, player.accuracyPoints));
  const scale = AIM_CONFIG.enabled ? AIM_CONFIG.accuracyBasePoints / (AIM_CONFIG.accuracyBasePoints + accuracy) : 1;
  const movementHalf = AIM_CONFIG.enabled
    ? WEAPON_AIM_CONFIG[weapon.id].movementHalfAngleDeg * Math.PI / 180 * clamp01(movementBloom)
    : 0;
  const patternWidth = weapon.spreadAngle * scale;
  const jitterHalf = (weapon.spreadAngle * 0.15 + movementHalf) * scale;
  return { patternWidth, jitterHalf, envelopeHalf: (weapon.bulletsPerShot > 1 ? patternWidth / 2 : 0) + jitterHalf };
}

export function sampleShotAngle(
  aim: number, index: number, count: number,
  spread: ReturnType<typeof deriveAimSpread>, random: () => number
): number {
  const pattern = count > 1 ? -spread.patternWidth / 2 + spread.patternWidth * index / (count - 1) : 0;
  return aim + pattern + (spread.jitterHalf > 0 ? (random() * 2 - 1) * spread.jitterHalf : 0);
}

export function crosshairGap(envelopeHalf: number): number {
  return Math.min(CROSSHAIR_CONFIG.maxGapPx, Math.max(CROSSHAIR_CONFIG.minGapPx,
    CROSSHAIR_CONFIG.minGapPx + CROSSHAIR_CONFIG.referenceDistancePx * Math.tan(envelopeHalf)));
}
