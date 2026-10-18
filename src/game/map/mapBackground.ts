import { GAME_CONFIG } from '@/game/config/base';

/**
 * 生成地图背景（地块平铺）。
 * 返回拼好的整图 canvas；无可用地块时返回 null（调用方据此清除旧缓存、回退纯色）。
 * 由 B1.5 从 page.tsx 机械抽取：地面花纹仅影响表现，不消耗局内规则的随机源
 * （继续使用 Math.random，不得换成 runtime.random）；调试 console.log 已按计划移除。
 */
export const buildMapBackground = (
  tileImages: HTMLImageElement[]
): HTMLCanvasElement | null => {
  if (tileImages.length === 0) {
    return null;
  }

  // 获取第一个地块的尺寸
  const firstTile = tileImages[0];
  const tileWidth = firstTile.width;
  const tileHeight = firstTile.height;

  // 创建一个与地图尺寸相同的canvas
  const canvas = document.createElement('canvas');
  canvas.width = GAME_CONFIG.WORLD_WIDTH;
  canvas.height = GAME_CONFIG.WORLD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 计算需要覆盖整个地图的地块行列数
  // 地块缩小为原来的1/6，所以行列数增加为原来的6倍
  const tilesX = Math.ceil(GAME_CONFIG.WORLD_WIDTH / (tileWidth / 6));
  const tilesY = Math.ceil(GAME_CONFIG.WORLD_HEIGHT / (tileHeight / 6));

  // 随机平铺地块（缩小为原来的1/6）
  const scaledTileWidth = tileWidth / 6;
  const scaledTileHeight = tileHeight / 6;

  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      // 随机选择一个地块图片
      // 地面花纹仅影响表现，不消耗局内规则的随机源。
      const tileIndex = Math.floor(Math.random() * tileImages.length);
      const tileImage = tileImages[tileIndex];

      if (tileImage) {
        // 绘制时使用缩小后的尺寸，保持长宽比例
        ctx.drawImage(
          tileImage,
          x * scaledTileWidth, // 目标X位置
          y * scaledTileHeight, // 目标Y位置
          scaledTileWidth, // 目标宽度（原始的1/6）
          scaledTileHeight // 目标高度（原始的1/6）
        );
      }
    }
  }

  // 降低明度到80%（使用半透明黑色层）
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // 20%黑色，使明度降至80%
  ctx.fillRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
  ctx.restore();

  // 创建遮罩层，只显示地图范围内的内容
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // 同时设置80%不透明度
  ctx.fillRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
  ctx.restore();

  return canvas;
};
