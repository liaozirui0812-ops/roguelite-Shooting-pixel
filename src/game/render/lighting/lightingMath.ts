import { LIGHTING_DEFAULTS, type LightingConfig, type RGB } from '@/game/config/lighting';

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const finite = (n: number | undefined, fallback: number, low: number, high: number) =>
  clamp(typeof n === 'number' && Number.isFinite(n) ? n : fallback, low, high);

export function normalizeLightingConfig(input: Partial<LightingConfig> = {}): LightingConfig {
  const d = LIGHTING_DEFAULTS;
  const color = (value: RGB | undefined, fallback: RGB): RGB => [
    finite(value?.[0], fallback[0], 0, 1),
    finite(value?.[1], fallback[1], 0, 1),
    finite(value?.[2], fallback[2], 0, 1),
  ];
  const levels = Math.round(finite(input.lightLevels, d.lightLevels, 0, 8));
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : d.enabled,
    quality: ['basic', 'standard', 'high'].includes(input.quality ?? '') ? input.quality! : d.quality,
    diameterRatio: finite(input.diameterRatio, d.diameterRatio, 0.05, 2),
    softEdgeRatio: finite(input.softEdgeRatio, d.softEdgeRatio, 0.01, 1),
    attenuationExponent: finite(input.attenuationExponent, d.attenuationExponent, 0.1, 8),
    ambientIntensity: finite(input.ambientIntensity, d.ambientIntensity, 0, 1),
    ambientColor: color(input.ambientColor, d.ambientColor),
    lightIntensity: finite(input.lightIntensity, d.lightIntensity, 0, 2),
    lightColor: color(input.lightColor, d.lightColor),
    lightHeight: finite(input.lightHeight, d.lightHeight, 1, 1000),
    brightnessFloor: finite(input.brightnessFloor, d.brightnessFloor, 0.01, 1),
    normalStrength: finite(input.normalStrength, d.normalStrength, 0, 1),
    rimStrength: finite(input.rimStrength, d.rimStrength, 0, 2),
    lightLevels: levels < 2 ? 0 : levels,
  };
}

export function lightAttenuation(distance: number, width: number, config: LightingConfig) {
  const outer = width * config.diameterRatio / 2;
  const inner = outer * (1 - config.softEdgeRatio);
  const t = clamp((distance - inner) / (outer - inner), 0, 1);
  const a = Math.pow(1 - t, config.attenuationExponent);
  return config.lightLevels > 1
    ? Math.round(a * (config.lightLevels - 1)) / (config.lightLevels - 1)
    : a;
}

export function lightMultiplier(attenuation: number, response: number, config: LightingConfig): RGB {
  return config.ambientColor.map((c, i) => clamp(
    c * config.ambientIntensity + config.lightColor[i] * config.lightIntensity * attenuation * response,
    config.brightnessFloor, 1
  )) as unknown as RGB;
}

export function normalCorrection(attenuation: number, diffuse: number, config: LightingConfig): RGB {
  const base = lightMultiplier(attenuation, 1, config);
  const response = 1 - config.normalStrength * (1 - clamp(diffuse, 0, 1));
  return lightMultiplier(attenuation, response, config).map((c, i) => c / base[i]) as unknown as RGB;
}

export interface Rect { x: number; y: number; width: number; height: number }
export interface Point { x: number; y: number }
export const worldToScreen = (point: Point, camera: Point): Point =>
  ({ x: point.x - camera.x, y: point.y - camera.y });

/** Shelf packing is presentation-only; overflow sprites retain the basic-lighting path. */
export function packLightSprites(sizes: Array<{ id: string; width: number; height: number }>, width: number, height: number) {
  const slots = new Map<string, Rect>();
  let x = 0, y = 0, rowHeight = 0;
  for (const size of [...sizes].sort((a, b) => b.height - a.height)) {
    const w = Math.ceil(size.width) + 2, h = Math.ceil(size.height) + 2;
    if (w > width || h > height) continue;
    if (x + w > width) { x = 0; y += rowHeight; rowHeight = 0; }
    if (y + h > height) continue;
    slots.set(size.id, { x: x + 1, y: y + 1, width: w - 2, height: h - 2 });
    x += w; rowHeight = Math.max(rowHeight, h);
  }
  return slots;
}
