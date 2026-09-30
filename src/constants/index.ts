// ==================== 游戏核心配置模块 ====================
// 此模块包含所有游戏配置常量，便于未来扩展和维护

import { 
  WeaponType, 
  WeaponConfig, 
  MonsterType, 
  Player,
  // 其他类型将在需要时引入
} from '@/types';

// ==================== 游戏基础配置 ====================
export const GAME_CONFIG = {
  WORLD_WIDTH: 6000,  // 世界宽度（200%扩大）
  WORLD_HEIGHT: 6000, // 世界高度（200%扩大）
  CANVAS_WIDTH: 1200,  // 视口宽度
  CANVAS_HEIGHT: 800,  // 视口高度
  PLAYER_SPEED: 3.5,  // 基础速度降低到70%
  PLAYER_SIZE: 25,
  PLAYER_MAX_HP: 20,
  BULLET_SPEED: 7,  // 子弹速度降低到70%
  BULLET_SIZE: 5,
  MONSTER_SIZE: 20,
  OBSTACLE_COUNT: 24,  // 障碍物数量（增加20%）
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

// ==================== 最大数值保护配置 ====================
export const MAX_VALUES = {
  playerSpeed: 7, // 移动速度最大7
  weaponRange: 2000, // 射程最大2000
  penetration: 15, // 穿透力最大15
  weaponUpgrade: 500, // 武器属性加成最大500%
  critRate: 1.1, // 暴击率软上限原始值（110%，对应有效暴击率90%）
  critDamageBonus: 1.5, // 暴击伤害软上限原始值（150%，对应有效额外加成150%）
};

// ==================== 武器配置 ====================
export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  pistol: {
    id: 'pistol',
    name: '手枪',
    description: '标准武器，平衡性良好',
    icon: '/assets/pistol.png',
    showIcon: '/assets/pistol_show.png',
    damage: 5,
    fireRate: 300,
    bulletSize: 5,
    bulletSpeed: 2.5,  // 子弹速度
    bulletRange: 800,
    bulletsPerShot: 1,
    spreadAngle: 0,
    color: '#ffcc00',
    critRate: 0, // 0%暴击率（玩家初始暴击率为0%）
    magazineSize: 12, // 弹匣容量
    reloadTime: 3000, // 换弹时间（毫秒）
    isLongGun: false, // 手枪不是长枪
    playerSpeedBonus: 0.5, // 移动速度+0.5
  },
  shotgun: {
    id: 'shotgun',
    name: '散弹枪',
    description: '一次发射5发子弹，射程短，射速慢',
    icon: '/assets/shotgun.png',
    showIcon: '/assets/shotgun_show.png',
    damage: 15,
    fireRate: 800,
    bulletSize: 4,
    bulletSpeed: 3,  // 子弹速度
    bulletRange: 300,
    bulletsPerShot: 5,
    spreadAngle: 0.3, // 约 17 度
    color: '#ff6666',
    critRate: 0.2, // 20%暴击率
    magazineSize: 7, // 弹匣容量
    reloadTime: 500, // 换弹时间（毫秒），散弹枪特殊：一发一发装填
    isLongGun: true, // 散弹枪是长枪
  },
  sniper: {
    id: 'sniper',
    name: '狙击枪',
    description: '威力巨大，射程远，射速慢',
    icon: '/assets/sniper.png',
    showIcon: '/assets/sniper_show.png',
    damage: 50,
    fireRate: 1200,
    bulletSize: 8,
    bulletSpeed: 5,  // 子弹速度
    bulletRange: 1500,
    bulletsPerShot: 1,
    spreadAngle: 0,
    color: '#66ff66',
    critRate: 0.1, // 10%暴击率
    magazineSize: 8, // 弹匣容量
    reloadTime: 3000, // 换弹时间（毫秒）
    isLongGun: true, // 狙击枪是长枪
  },
  smg: {
    id: 'smg',
    name: '冲锋枪',
    description: '射速极快，射程短，单发伤害低',
    icon: '/assets/smg.png',
    showIcon: '/assets/smg_show.png',
    damage: 6,
    fireRate: 80,
    bulletSize: 3,
    bulletSpeed: 3.5,  // 子弹速度
    bulletRange: 400,
    bulletsPerShot: 1,
    spreadAngle: 0.05,
    color: '#66ccff',
    critRate: 0.1, // 10%暴击率
    magazineSize: 30, // 弹匣容量
    reloadTime: 2500, // 换弹时间（毫秒）
    isLongGun: false, // 冲锋枪不是长枪
  },
  rpg: {
    id: 'rpg',
    name: '火箭筒',
    description: '发射爆炸火箭弹，伤害范围广（移动速度-30%）',
    icon: '/assets/RPG.png',
    showIcon: '/assets/RPG_show.png',
    damage: 84, // 爆炸伤害（70% of 120）
    fireRate: 2000,
    bulletSize: 12,
    bulletSpeed: 1.2,
    bulletRange: 800,
    bulletsPerShot: 1,
    spreadAngle: 0,
    color: '#ff4444',
    critRate: 0, // 火箭弹没有暴击
    magazineSize: 1, // 弹匣容量1发
    reloadTime: 3000, // 换弹时间3秒
    isLongGun: true, // 火箭筒是长枪
    playerSpeedMultiplier: 0.7, // 装备火箭筒时移动速度降低30%
  },
};

// ==================== 敌人类型配置 ====================
export const MONSTER_CONFIGS: Record<MonsterType, {
  name: string;
  size: number;
  baseSpeed: number;
  damage: number;  // 碰撞伤害
  hp: number;
  color: string;
  canShoot: boolean;
  shootInterval: number;
  bulletSpeed: number;
  bulletDamage: number;  // 子弹伤害（独立于碰撞伤害）
  bulletRange: number;
  goldBase: number; // 金币基数
  isBoss?: boolean; // 是否为BOSS
  attackInterval?: number; // BOSS攻击间隔（毫秒）
  canRangedAttack?: boolean; // 是否可以使用远程攻击
  rangedAttackInterval?: number; // 远程攻击间隔（毫秒）
  rangedAttackDistance?: number; // 远程攻击检测距离
  rangedAttackBulletSpeed?: number; // 远程攻击子弹速度
  rangedAttackBulletDamage?: number; // 远程攻击子弹伤害
  // BOSS落地攻击配置
  canJumpAttack?: boolean; // 是否可以使用落地攻击
  jumpAttackDetectInterval?: number; // 检测间隔（毫秒）
  jumpAttackDetectDistance?: number; // 检测距离
  jumpAttackLockDuration?: number; // 锁定持续时间（毫秒）
  jumpStartDuration?: number; // 起跳持续时间（毫秒）
  airborneDuration?: number; // 空中移动持续时间（毫秒）
  jumpAttackDamage?: number; // 落地伤害
  jumpAttackDamageRadius?: number; // 落地伤害半径
  jumpAttackRecoveryDuration?: number; // 硬直持续时间（毫秒）
}> = {
  1: {
    name: '标准敌人',
    size: 45,  // 提升到45（原30，因为贴图较小）
    baseSpeed: 1.1,  // 降低到55%（原2 → 1.4 → 1.1）
    damage: 10,
    hp: 16,  // 增加30%（原12）
    color: '#ef4444',
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 1,  // 金币基数
  },
  2: {
    name: '中型敌人',
    size: 40,  // 放大1倍（原20）
    baseSpeed: 0.6,  // 降低到60%（原1 → 0.7 → 0.6）
    damage: 15,
    hp: 33,  // 增加30%（原25）
    color: '#f59e0b',
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 1,  // 金币基数
  },
  3: {
    name: '大型敌人',
    size: 60,  // 放大1倍（原30）
    baseSpeed: 0.35,  // 降低到70%（原0.5）
    damage: 30,
    hp: 137,  // 增加30%后再增加50%（原70 → 91 → 137）
    color: '#7c3aed',
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 2,  // 金币基数
  },
  4: {
    name: '远程敌人',
    size: 40,  // 放大1倍（原20）
    baseSpeed: 0.7,  // 降低到70%（原1）
    damage: 5,  // 碰撞伤害（原10）
    hp: 33,  // 增加30%（原25）
    color: '#22c55e',
    canShoot: true,
    shootInterval: 5000,
    bulletSpeed: 1.3,  // 子弹速度
    bulletDamage: 2,  // 子弹伤害（独立）
    bulletRange: 500,
    goldBase: 2,  // 金币基数
  },
  5: {
    name: '史莱姆王',
    size: 120,  // BOSS大小改为120（原160）
    baseSpeed: 1.1,
    damage: 10,
    hp: 1560,  // 增加30%（原1200）
    color: '#ff0000',  // 红色
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 50,  // 金币基数（会 × 关卡数）
    isBoss: true,  // 标识为BOSS
    attackInterval: 1000,  // 攻击间隔1秒
    canRangedAttack: true,  // 可以使用远程攻击
    rangedAttackInterval: 5000,  // 远程攻击间隔5秒
    rangedAttackDistance: 400,  // 远程攻击检测距离400px
    rangedAttackBulletSpeed: 1.5,  // 远程攻击子弹速度1.5
    rangedAttackBulletDamage: 2,  // 远程攻击子弹伤害2
    // BOSS落地攻击配置
    canJumpAttack: true,  // 可以使用落地攻击
    jumpAttackDetectInterval: 7000,  // 每7秒检测一次
    jumpAttackDetectDistance: 800,  // 检测范围800px
    jumpAttackLockDuration: 3000,  // 锁定时间3秒
    jumpStartDuration: 900,  // 起跳持续时间900毫秒
    airborneDuration: 1600,  // 空中移动持续时间1600毫秒
    jumpAttackDamage: 13,  // 落地伤害13点
    jumpAttackDamageRadius: 100,  // 落地伤害半径100px
    jumpAttackRecoveryDuration: 3000,  // 硬直时间3秒
  },
};
