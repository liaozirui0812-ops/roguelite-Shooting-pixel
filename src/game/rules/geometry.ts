import type { Obstacle } from '@/game/model/types';

// 辅助函数：检测线段与矩形是否相交
export const lineRectIntersect = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: Obstacle
): boolean => {
  // 检查线段是否与矩形的四条边相交
  const checkLineIntersection = (x3: number, y3: number, x4: number, y4: number): boolean => {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  };

  return (
    checkLineIntersection(rect.x, rect.y, rect.x + rect.width, rect.y) ||
    checkLineIntersection(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height) ||
    checkLineIntersection(
      rect.x + rect.width,
      rect.y + rect.height,
      rect.x,
      rect.y + rect.height
    ) ||
    checkLineIntersection(rect.x, rect.y + rect.height, rect.x, rect.y)
  );
};

// 检测圆形与障碍物的碰撞
export const checkCollisionWithObstacle = (
  x: number,
  y: number,
  radius: number,
  obstacle: Obstacle
): boolean => {
  // 计算障碍物的碰撞盒中心
  const obstacleCenterX = obstacle.x + obstacle.width / 2;
  const obstacleCenterY = obstacle.y + obstacle.height / 2;

  // 计算碰撞盒的半宽半高
  const halfCollisionWidth = obstacle.collisionWidth / 2;
  const halfCollisionHeight = obstacle.collisionHeight / 2;

  // 找到矩形上距离圆心最近的点
  const closestX = Math.max(
    obstacleCenterX - halfCollisionWidth,
    Math.min(x, obstacleCenterX + halfCollisionWidth)
  );
  const closestY = Math.max(
    obstacleCenterY - halfCollisionHeight,
    Math.min(y, obstacleCenterY + halfCollisionHeight)
  );

  // 计算圆心到最近点的距离
  const dx = x - closestX;
  const dy = y - closestY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 如果距离小于圆的半径，则发生碰撞
  return distance < radius;
};

// 计算点到障碍物的距离（用于避障）
export const distToObstacle = (x: number, y: number, obstacle: Obstacle): number => {
  // 计算障碍物的碰撞盒中心
  const obstacleCenterX = obstacle.x + obstacle.width / 2;
  const obstacleCenterY = obstacle.y + obstacle.height / 2;

  // 计算碰撞盒的半宽半高
  const halfCollisionWidth = obstacle.collisionWidth / 2;
  const halfCollisionHeight = obstacle.collisionHeight / 2;

  // 找到矩形上距离点最近的点
  const closestX = Math.max(
    obstacleCenterX - halfCollisionWidth,
    Math.min(x, obstacleCenterX + halfCollisionWidth)
  );
  const closestY = Math.max(
    obstacleCenterY - halfCollisionHeight,
    Math.min(y, obstacleCenterY + halfCollisionHeight)
  );

  // 计算点到最近点的距离
  const dx = x - closestX;
  const dy = y - closestY;

  return Math.sqrt(dx * dx + dy * dy);
};
