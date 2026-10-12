import { LIGHTING_LIMITS, type NormalProfile } from '@/game/config/lighting';
import type { Rect } from './lightingMath';
import type { SpriteFrame } from '@/game/assets/atlases';

export const NORMAL_PROFILES: NormalProfile[] = ['sphere', 'capsule', 'bevel'];
export function createNormalAtlas(size: number = LIGHTING_LIMITS.normalTileSize) {
  const stride = size + 2, width = stride * 3, height = stride;
  const pixels = new Uint8Array(width * height * 4);
  NORMAL_PROFILES.forEach((profile, index) => {
    for (let y = 0; y < stride; y++) for (let x = 0; x < stride; x++) {
      const px = (Math.min(size - 1, Math.max(0, x - 1)) + 0.5) / size * 2 - 1;
      const py = (Math.min(size - 1, Math.max(0, y - 1)) + 0.5) / size * 2 - 1;
      let nx: number, ny: number, nz: number;
      if (profile === 'bevel') {
        nx = Math.sign(px) * Math.max(0, (Math.abs(px) - 0.65) / 0.35) * 0.8;
        ny = Math.sign(py) * Math.max(0, (Math.abs(py) - 0.65) / 0.35) * 0.8;
        nz = 1;
      } else {
        const cy = py * (profile === 'capsule' ? 0.35 : 1);
        nx = px * 0.85; ny = cy * 0.85;
        nz = Math.sqrt(Math.max(0.001, 1 - px * px)) * Math.sqrt(Math.max(0.001, 1 - cy * cy));
      }
      const length = Math.hypot(nx, ny, nz);
      const offset = (y * width + index * stride + x) * 4;
      pixels[offset] = Math.round((nx / length * 0.5 + 0.5) * 255);
      pixels[offset + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      pixels[offset + 2] = Math.round((nz / length * 0.5 + 0.5) * 255);
      pixels[offset + 3] = 255;
    }
  });
  return { width, height, pixels, size, stride };
}

/** One scan per loaded image, stable union across every frame; drawing retains full alpha. */
export function alphaBounds(data: Uint8ClampedArray, imageWidth: number, frames: SpriteFrame[]): Rect {
  let left = 1, top = 1, right = 0, bottom = 0;
  for (const frame of frames) {
    for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
      if (data[((frame.y + y) * imageWidth + frame.x + x) * 4 + 3] < 32) continue;
      left = Math.min(left, x / frame.width); top = Math.min(top, y / frame.height);
      right = Math.max(right, (x + 1) / frame.width); bottom = Math.max(bottom, (y + 1) / frame.height);
    }
  }
  return right > left && bottom > top
    ? { x: left, y: top, width: right - left, height: bottom - top }
    : { x: 0, y: 0, width: 1, height: 1 };
}

/** Repack only when a sheet exceeds the GPU limit, keeping original CPU assets unchanged. */
export function planTexturePages(frames: SpriteFrame[], limit: number) {
  const cellWidth = Math.max(...frames.map(f => f.width)) + 2;
  const cellHeight = Math.max(...frames.map(f => f.height)) + 2;
  if (cellWidth > limit || cellHeight > limit) return [];
  const columns = Math.max(1, Math.min(frames.length, Math.floor(limit / cellWidth)));
  const perPage = columns * Math.floor(limit / cellHeight);
  const pages: Array<{ width: number; height: number; frames: Array<{ index: number; rect: Rect }> }> = [];
  for (let start = 0; start < frames.length; start += perPage) {
    const count = Math.min(perPage, frames.length - start);
    pages.push({ width: Math.min(columns, count) * cellWidth, height: Math.ceil(count / columns) * cellHeight,
      frames: Array.from({ length: count }, (_, j) => ({ index: start + j, rect: {
        x: j % columns * cellWidth + 1, y: Math.floor(j / columns) * cellHeight + 1,
        width: frames[start + j].width, height: frames[start + j].height,
      } })) });
  }
  return pages;
}
