import { GAME_CONFIG } from '@/game/config/base';
import type { Obstacle } from '@/game';

/** 地图生成所需的最小运行时面：随机源与模拟时钟 */
export interface MapRandomSource {
  random: () => number;
  now: () => number;
}

/**
 * 生成随机障碍物布局。
 * 返回 Obstacle 数组；障碍物图片未加载时返回 null（调用方保留旧障碍，不得覆盖）。
 * 由 B1.5 从 page.tsx 机械抽取。注意：图片键是 imagePath 字符串（R01 定稿），
 * 不得退回 obstacleImages[数字下标] 的旧写法；路径大小写敏感（Obstacle_4 是大写）。
 */
export const buildObstacles = (
  runtime: MapRandomSource,
  obstacleImages: Record<string, HTMLImageElement>
): Obstacle[] | null => {
  // 确保图片已加载
  if (Object.keys(obstacleImages).length === 0) {
    console.warn('Obstacle images not loaded yet');
    return null;
  }

  const newObstacles: Obstacle[] = [];
  const maxAttempts = 1000; // 最大尝试次数，防止无限循环

  // 障碍物图片路径列表
  const obstacleImagePaths = [
    '/assets/obstacle_1.png',
    '/assets/obstacle_2.png',
    '/assets/obstacle_3.png',
    '/assets/Obstacle_4.png',
    '/assets/obstacle_5.png',
  ];

  // 障碍物配置（碰撞体积占图片的比例）
  const obstacleConfigs = [
    { collisionRatio: 0.7 }, // obstacle_1
    { collisionRatio: 0.6 }, // obstacle_2
    { collisionRatio: 0.8 }, // obstacle_3
    { collisionRatio: 0.75 }, // obstacle_4
    { collisionRatio: 0.65 }, // obstacle_5
  ];

  for (let i = 0; i < GAME_CONFIG.OBSTACLE_COUNT; i++) {
    let attempts = 0;
    let success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;

      // 随机选择障碍物类型
      const obstacleIndex = Math.floor(runtime.random() * obstacleImagePaths.length);
      const imagePath = obstacleImagePaths[obstacleIndex];
      const obstacleImg = obstacleImages[imagePath];
      const config = obstacleConfigs[obstacleIndex];

      // 如果图片未加载，跳过
      if (!obstacleImg) {
        continue;
      }

      // 根据图片原始尺寸计算显示尺寸（保持比例）
      const originalWidth = obstacleImg.width;
      const originalHeight = obstacleImg.height;
      const maxSize = 100; // 最大边长

      let width, height;
      if (originalWidth > originalHeight) {
        width = maxSize;
        height = (maxSize * originalHeight) / originalWidth;
      } else {
        height = maxSize;
        width = (maxSize * originalWidth) / originalHeight;
      }

      // 生成随机位置（考虑障碍物实际尺寸）
      const x = 100 + runtime.random() * (GAME_CONFIG.WORLD_WIDTH - 200 - width);
      const y = 100 + runtime.random() * (GAME_CONFIG.WORLD_HEIGHT - 200 - height);

      // 碰撞体积大小（图片非透明部分，保持比例）
      const collisionWidth = width * config.collisionRatio;
      const collisionHeight = height * config.collisionRatio;

      // 确保不在玩家初始位置附近
      const distToCenter = Math.sqrt(
        Math.pow(x + width / 2 - GAME_CONFIG.WORLD_WIDTH / 2, 2) +
          Math.pow(y + height / 2 - GAME_CONFIG.WORLD_HEIGHT / 2, 2)
      );

      if (distToCenter < 200) continue;

      // 检查与其他障碍物的距离（不小于220px）
      let tooClose = false;
      for (const existing of newObstacles) {
        const dx = x + width / 2 - (existing.x + existing.width / 2);
        const dy = y + height / 2 - (existing.y + existing.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 220) {
          // 障碍物间距不小于220px
          tooClose = true;
          break;
        }
      }

      if (tooClose) continue;

      // 创建障碍物
      const obstacle: Obstacle = {
        id: `obstacle-${runtime.now()}-${i}`,
        x,
        y,
        width,
        height,
        image: imagePath,
        collisionWidth,
        collisionHeight,
      };

      newObstacles.push(obstacle);
      success = true;
    }

    if (!success) {
      console.warn(`Failed to place obstacle ${i + 1} after ${maxAttempts} attempts`);
    }
  }

  return newObstacles;
};
