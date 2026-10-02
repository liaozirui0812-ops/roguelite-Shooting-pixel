import type { AffixType, AffixConfig, MonsterType } from '@/game/model/types';

// 词缀配置表（支持权重，数值均可调）
export const AFFIX_CONFIGS: Record<AffixType, AffixConfig> = {
  berserk: {
    type: 'berserk',
    name: '狂暴',
    description: 'HP ≤ 30% 时激活：移速 +60%、伤害 +50%、攻击间隔减半',
    weight: 100,
  },
  shield: {
    type: 'shield',
    name: '护盾',
    description: '抵挡前 3 次伤害事件（与伤害量无关），第 4 次起正常结算',
    weight: 100,
  },
  self_destruct: {
    type: 'self_destruct',
    name: '自爆',
    description: '与玩家距离 ≤ 80px 时停止移动，2 秒后爆炸造成范围伤害',
    weight: 100,
  },
};

// 狂暴词缀数值配置
export const BERSERK_CONFIG = {
  HP_THRESHOLD: 0.3, // HP 低于 30% 触发
  SPEED_BONUS: 0.6, // 移速 +60%
  DAMAGE_BONUS: 0.5, // 伤害 +50%
  ATTACK_SPEED_BONUS: 0.5, // 攻击间隔减半（interval * 0.5）
  PULSE_CYCLE: 1000, // 呼吸光效周期 1s
  PULSE_MIN_ALPHA: 0.4, // 呼吸最小 alpha
  PULSE_MAX_ALPHA: 0.8, // 呼吸最大 alpha
  OUTLINE_COLOR: '#a855f7', // 描边紫色
  AURA_COLOR: '#c084fc', // 激活光效紫色
};

// 护盾词缀数值配置
export const SHIELD_CONFIG = {
  MAX_CHARGES: 3, // 3 次抵挡
  OUTLINE_COLOR: '#3b82f6', // 蓝色描边
  OUTLINE_ALPHA: 0.6, // 描边透明度
  CELL_WIDTH: 6, // 方格宽度
  CELL_HEIGHT: 6, // 方格高度
  CELL_GAP: 2, // 方格间距
  CELL_ACTIVE_COLOR: '#60a5fa', // 激活方格颜色
  CELL_INACTIVE_COLOR: '#374151', // 消耗方格颜色
};

// 自爆词缀数值配置
export const SELF_DESTRUCT_CONFIG = {
  TRIGGER_DISTANCE: 80, // 触发距离（像素）
  FUSE_DURATION: 2000, // 引爆时长 2 秒
  EXPLOSION_RADIUS: 120, // 爆炸范围
  DAMAGE_RATIO: 0.3, // 伤害 = maxHp * 30%
  FLASH_INTERVAL: 200, // 准备阶段闪烁间隔 0.2s
  PARTICLE_COUNT: 8, // 爆炸粒子数（8 方向扩散）
  PARTICLE_SPEED: 4, // 粒子扩散速度
  PARTICLE_DURATION: 600, // 粒子持续时间
  PARTICLE_SIZE: 6, // 粒子大小
};

// BOSS 砸地旋转弹幕配置
export const BOSS_BARRAGE_CONFIG = {
  EMITTER_COUNT: 15, // 发射口数量（放射状均匀分布）
  EMIT_INTERVAL: 100, // 发射间隔（毫秒）
  DURATION: 2000, // 弹幕持续时间（毫秒）
  ANGULAR_SPEED: 240, // 发射口组旋转角速度（度/秒，顺时针）
  BULLET_SPEED: 8, // 弹速
  BULLET_DAMAGE: 8, // 火球伤害
  BULLET_RANGE: 800, // 火球射程
  BULLET_SIZE: 60, // 火球显示尺寸（直径，px）
  BULLET_FRAME_SIZE: 200, // 序列帧单帧尺寸（px）
  BULLET_FRAME_DURATION: 80, // 序列帧每帧时长（毫秒）
  BULLET_COLOR: '#ff7b3a', // 备用颜色（火球橙色）
  HIT_PARTICLE_COUNT: 12, // 受击蓝色粒子数量
  HIT_PARTICLE_COLOR: '#60a5fa', // 受击蓝色粒子主色
  HIT_PARTICLE_DURATION: 500, // 受击粒子持续时间（毫秒）
  HIT_PARTICLE_SPEED: 6, // 受击粒子扩散速度
  HIT_PARTICLE_SIZE: 5, // 受击粒子大小
};

// 词缀生成概率配置
export const AFFIX_SPAWN_CONFIG = {
  MIN_LEVEL: 4, // 第 4 关开始出现词缀
  BASE_CHANCE: 0.05, // 基础概率 5%
  CHANCE_PER_LEVEL: 0.01, // 每关 +1%
  MAX_CHANCE: 0.25, // 上限 25%
};
// 5 表示史莱姆王BOSS

// 敌人类型配置
export const MONSTER_CONFIGS: Record<
  MonsterType,
  {
    name: string;
    size: number;
    baseSpeed: number;
    damage: number; // 碰撞伤害
    hp: number;
    color: string;
    canShoot: boolean;
    shootInterval: number;
    bulletSpeed: number;
    bulletDamage: number; // 子弹伤害（独立于碰撞伤害）
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
  }
> = {
  1: {
    name: '标准敌人',
    size: 45, // 提升到45（原30，因为贴图较小）
    baseSpeed: 1.1, // 降低到55%（原2 → 1.4 → 1.1）
    damage: 10,
    hp: 16, // 增加30%（原12）
    color: '#ef4444',
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 1, // 金币基数
  },
  2: {
    name: '中型敌人',
    size: 40, // 放大1倍（原20）
    baseSpeed: 0.6, // 降低到60%（原1 → 0.7 → 0.6）
    damage: 15,
    hp: 33, // 增加30%（原25）
    color: '#f59e0b',
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 1, // 金币基数
  },
  3: {
    name: '大型敌人',
    size: 60, // 放大1倍（原30）
    baseSpeed: 0.35, // 降低到70%（原0.5）
    damage: 30,
    hp: 137, // 增加30%后再增加50%（原70 → 91 → 137）
    color: '#7c3aed',
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 2, // 金币基数
  },
  4: {
    name: '远程敌人',
    size: 40, // 放大1倍（原20）
    baseSpeed: 0.7, // 降低到70%（原1）
    damage: 5, // 碰撞伤害（原10）
    hp: 33, // 增加30%（原25）
    color: '#22c55e',
    canShoot: true,
    shootInterval: 5000,
    bulletSpeed: 1.3, // 子弹速度
    bulletDamage: 2, // 子弹伤害（独立）
    bulletRange: 500,
    goldBase: 2, // 金币基数
  },
  5: {
    name: '史莱姆王',
    size: 120, // BOSS大小改为120（原160）
    baseSpeed: 1.1,
    damage: 10,
    hp: 1560, // 增加30%（原1200）
    color: '#ff0000', // 红色
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 50, // 金币基数（会 × 关卡数）
    isBoss: true, // 标识为BOSS
    attackInterval: 1000, // 攻击间隔1秒
    canRangedAttack: true, // 可以使用远程攻击
    rangedAttackInterval: 5000, // 远程攻击间隔5秒
    rangedAttackDistance: 400, // 远程攻击检测距离400px
    rangedAttackBulletSpeed: 1.5, // 远程攻击子弹速度1.5
    rangedAttackBulletDamage: 2, // 远程攻击子弹伤害2
    // BOSS落地攻击配置
    canJumpAttack: true, // 可以使用落地攻击
    jumpAttackDetectInterval: 7000, // 每7秒检测一次
    jumpAttackDetectDistance: 800, // 检测范围800px
    jumpAttackLockDuration: 3000, // 锁定时间3秒
    jumpStartDuration: 900, // 起跳持续时间900毫秒
    airborneDuration: 1600, // 空中移动持续时间1600毫秒
    jumpAttackDamage: 13, // 落地伤害13点
    jumpAttackDamageRadius: 100, // 落地伤害半径100px
    jumpAttackRecoveryDuration: 3000, // 硬直时间3秒
  },
};
