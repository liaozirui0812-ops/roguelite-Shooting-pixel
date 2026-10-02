import type { AssetId } from './manifest';

export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SpriteAtlas {
  width: number;
  height: number;
  frameMs: number;
  frames: SpriteFrame[];
  anchor: { x: number; y: number };
}
const strip = (
  width: number,
  height: number,
  cellWidth: number,
  count: number,
  frameMs = 100
): SpriteAtlas => ({
  width,
  height,
  frameMs,
  anchor: { x: 0.5, y: 0.5 },
  frames: Array.from({ length: count }, (_, i) => ({
    x: i * cellWidth,
    y: 0,
    width: Math.min(cellWidth, width - i * cellWidth),
    height,
  })),
});
// Explicit counts and frame rectangles. Trailing pixels never create a fractional frame.
export const SPRITE_ATLASES = {
  playerIdle: strip(2304, 192, 256, 9),
  playerWalk: strip(2560, 192, 256, 10),
  playerDash: {
    width: 2140,
    height: 192,
    frameMs: 50,
    anchor: { x: 0.5, y: 0.5 },
    frames: [63, 315, 545, 788, 1041, 1317, 1603, 1858].map((x, i) => ({
      x,
      y: 0,
      width: [252, 230, 243, 253, 276, 286, 255, 281][i],
      height: 192,
    })),
  },
  enemy_1: strip(1792, 256, 256, 7),
  enemy_2: strip(1792, 256, 256, 7),
  enemy_3: strip(1792, 256, 256, 7),
  enemy_4_1: strip(1024, 256, 256, 4),
  enemy_4_2: strip(1033, 256, 256, 4),
  boss: strip(4096, 512, 512, 8),
  boss2: strip(10198, 512, 512, 20, 50),
  boom: strip(2304, 256, 256, 9, 30),
  fire: strip(1024, 256, 200, 5, 60),
} satisfies Partial<Record<AssetId, SpriteAtlas>>;

export function atlasFrame(atlas: SpriteAtlas, index: number) {
  return atlas.frames[Math.max(0, Math.min(atlas.frames.length - 1, Math.floor(index)))];
}
export function validateAtlas(key: string, width: number, height: number) {
  const atlas = SPRITE_ATLASES[key as keyof typeof SPRITE_ATLASES];
  if (!atlas) return undefined;
  if (atlas.width !== width || atlas.height !== height)
    return `atlas dimensions: expected ${atlas.width}x${atlas.height}, received ${width}x${height}`;
  return atlas.frames.some(
    (frame) =>
      frame.x < 0 ||
      frame.y < 0 ||
      frame.width <= 0 ||
      frame.height <= 0 ||
      frame.x + frame.width > width ||
      frame.y + frame.height > height
  )
    ? 'atlas frame outside image bounds'
    : undefined;
}
