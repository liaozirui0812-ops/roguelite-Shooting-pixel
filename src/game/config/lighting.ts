import type { AssetId } from '@/game/assets/manifest';

export type LightingQuality = 'basic' | 'standard' | 'high';
export type NormalProfile = 'sphere' | 'capsule' | 'bevel';
export type RGB = readonly [number, number, number];
export interface LightingConfig {
  enabled: boolean;
  quality: LightingQuality;
  diameterRatio: number;
  softEdgeRatio: number;
  attenuationExponent: number;
  ambientIntensity: number;
  ambientColor: RGB;
  lightIntensity: number;
  lightColor: RGB;
  lightHeight: number;
  brightnessFloor: number;
  normalStrength: number;
  rimStrength: number;
  lightLevels: number;
}

/** Lengths use logical canvas pixels; the soft edge is inside the outer radius. */
export const LIGHTING_DEFAULTS: Readonly<LightingConfig> = {
  enabled: true,
  quality: 'standard',
  diameterRatio: 2 / 3,
  softEdgeRatio: 0.25,
  attenuationExponent: 2,
  ambientIntensity: 0.3,
  ambientColor: [0.75, 0.8, 1],
  lightIntensity: 0.85,
  lightColor: [1, 0.9, 0.75],
  lightHeight: 120,
  brightnessFloor: 0.1,
  normalStrength: 0.35,
  rimStrength: 0.35,
  lightLevels: 0,
};

export interface LightingMaterial {
  profile: NormalProfile;
  strength: number;
  rim: boolean;
  shadow: boolean;
}
const CHARACTER: LightingMaterial = { profile: 'capsule', strength: 1, rim: true, shadow: true };
/** Presentation metadata only: never changes collision geometry or entity state. */
export const LIGHTING_MATERIALS: Partial<Record<AssetId, LightingMaterial>> = {
  playerIdle: CHARACTER,
  playerWalk: CHARACTER,
  playerDash: { ...CHARACTER, shadow: false },
  enemy_1: CHARACTER,
  enemy_2: { ...CHARACTER, profile: 'sphere', shadow: false },
  enemy_3: { ...CHARACTER, shadow: false },
  enemy_4_1: { ...CHARACTER, shadow: false },
  enemy_4_2: { ...CHARACTER, shadow: false },
  boss: { ...CHARACTER, profile: 'sphere', strength: 0.8, shadow: false },
  boss2: { ...CHARACTER, profile: 'sphere', strength: 0.8, shadow: false },
  obstacle_1: { profile: 'sphere', strength: 0.75, rim: false, shadow: false },
  obstacle_2: { profile: 'bevel', strength: 0.7, rim: false, shadow: false },
  obstacle_3: { profile: 'capsule', strength: 0.9, rim: false, shadow: false },
  obstacle_4: { profile: 'bevel', strength: 0.65, rim: false, shadow: false },
  obstacle_5: { profile: 'bevel', strength: 0.8, rim: false, shadow: false },
};

export const LIGHTING_LIMITS = {
  outputWidth: 2048,
  outputHeight: 1024,
  gpuBytes: 64 * 1024 * 1024,
  normalTileSize: 64,
} as const;
