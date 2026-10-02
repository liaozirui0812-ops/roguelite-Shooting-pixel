// 游戏配置
export const GAME_CONFIG = {
  WORLD_WIDTH: 6000, // 世界宽度（200%扩大）
  WORLD_HEIGHT: 6000, // 世界高度（200%扩大）
  CANVAS_WIDTH: 1200, // 视口宽度
  CANVAS_HEIGHT: 800, // 视口高度
  PLAYER_SPEED: 3.5, // 基础速度降低到70%
  PLAYER_SIZE: 25,
  PLAYER_MAX_HP: 20,
  BULLET_SPEED: 7, // 子弹速度降低到70%
  BULLET_SIZE: 5,
  MONSTER_SIZE: 20,
  OBSTACLE_COUNT: 24, // 障碍物数量（增加20%）
  OBSTACLE_MIN_SIZE: 60,
  OBSTACLE_MAX_SIZE: 150,
  OBSTACLE_AVOID_DISTANCE: 120, // 障碍物避障检测距离（增加前瞻距离）
  OBSTACLE_AVOID_FORCE: 4, // 障碍物避障力强度
  MIN_PASSAGE_WIDTH: 50, // 最小通道宽度（大于怪物大小 20）
  HIT_EFFECT_DURATION: 200, // 受击效果持续时间（毫秒）
  HIT_SLOWDOWN_FACTOR: 0.5, // 受击时减速因子（0.5 表示速度减半）
  COIN_PICKUP_RANGE: 80, // 初始金币拾取范围（像素）
  COIN_PICKUP_RANGE_MAX_BONUS: 500, // 金币拾取范围最大加成（初始范围的500%）
  MAX_POISON_CIRCLES: 5, // 场上最大毒圈数量
  // 能量气场配置
  ENERGY_AURA_BASE_RADIUS: 90, // 能量气场初始半径（直径180px）
  ENERGY_AURA_SHOCKWAVE_INTERVAL: 3000, // 冲击波发射间隔（毫秒）
  ENERGY_AURA_KNOCKBACK_DISTANCE: 30, // 击退距离（像素）
  ENERGY_AURA_SLOWDOWN_DURATION: 1500, // 减速持续时间（毫秒）
  ENERGY_AURA_SLOWDOWN_FACTOR: 0.5, // 减速因子（50%减速）
};

// 最大数值保护配置
export const MAX_VALUES = {
  playerSpeed: 7, // 移动速度最大7
  weaponRange: 2000, // 射程最大2000
  penetration: 15, // 穿透力最大15
  knockback: 10, // 击退值最大10（击退距离 10+击退值*10 最大110px）
  weaponUpgrade: 500, // 武器属性加成最大500%
  critRate: 1.1, // 暴击率软上限原始值（110%，对应有效暴击率90%）
  critDamageBonus: 1.5, // 暴击伤害软上限原始值（150%，对应有效额外加成150%）
};
