import type { WeaponConfig, WeaponType } from '@/game/model/types';
import { WEAPONS } from './weapons';

/** Times use simulation ms; accuracy uses points, never hit probability. */
export const AIM_CONFIG = {
  enabled: true,
  movementCurveExponent: 1.5,
  expandMs: 100,
  recoverMs: 220,
  accuracyBasePoints: 100,
  accuracyMinPoints: 0,
  accuracyMaxPoints: 300,
};

/** Extra random half-angle at full movement, in degrees. Existing spreadAngle stays in radians. */
export const WEAPON_AIM_CONFIG: Record<WeaponType, { movementHalfAngleDeg: number }> = {
  pistol: { movementHalfAngleDeg: 4 },
  shotgun: { movementHalfAngleDeg: 6 },
  smg: { movementHalfAngleDeg: 7 },
  sniper: { movementHalfAngleDeg: 9 },
  rpg: { movementHalfAngleDeg: 5 },
};

/** Dimensions are Canvas logical pixels. gap is measured from center to each arm's inner end. */
export const CROSSHAIR_CONFIG = {
  minGapPx: 3,
  maxGapPx: 64,
  referenceDistancePx: 180,
  armLengthPx: 7,
  lineWidthPx: 2,
  outlineWidthPx: 1,
  color: '#FFFFFF',
  outlineColor: '#000000',
  dashAlpha: 0.4,
};

/** Developer validation for tuning tables; invalid authoring is reported, never silently replaced. */
export function validateAimConfig(weapons: Record<WeaponType, WeaponConfig>, aim = AIM_CONFIG,
  crosshair = CROSSHAIR_CONFIG, weaponAim = WEAPON_AIM_CONFIG) {
  const positive = [aim.movementCurveExponent, aim.accuracyBasePoints,
    crosshair.referenceDistancePx, crosshair.armLengthPx, crosshair.lineWidthPx];
  const nonnegative = [aim.expandMs, aim.recoverMs, aim.accuracyMinPoints,
    crosshair.minGapPx, crosshair.outlineWidthPx];
  if (positive.some(n => !Number.isFinite(n) || n <= 0) ||
    nonnegative.some(n => !Number.isFinite(n) || n < 0) ||
    !Number.isFinite(aim.accuracyMaxPoints) || aim.accuracyMaxPoints < aim.accuracyMinPoints ||
    !Number.isFinite(crosshair.maxGapPx) || crosshair.maxGapPx < crosshair.minGapPx ||
    !Number.isFinite(crosshair.dashAlpha) || crosshair.dashAlpha < 0 || crosshair.dashAlpha > 1) {
    throw new Error('Invalid aim/crosshair configuration');
  }
  for (const id of Object.keys(weapons) as WeaponType[]) {
    const movement = weaponAim[id]?.movementHalfAngleDeg;
    const weapon = weapons[id];
    const half = (weapon.bulletsPerShot > 1 ? weapon.spreadAngle / 2 : 0) + weapon.spreadAngle * 0.15;
    if (!Number.isFinite(movement) || movement < 0 ||
      !Number.isFinite(weapon.spreadAngle) || weapon.spreadAngle < 0 ||
      half + movement * Math.PI / 180 >= 89 * Math.PI / 180) {
      throw new Error(`Invalid aim configuration for ${id}`);
    }
  }
}

validateAimConfig(WEAPONS);
