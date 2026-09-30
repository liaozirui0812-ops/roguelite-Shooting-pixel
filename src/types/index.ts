// ==================== 游戏核心类型定义 ====================

// 基础坐标接口
export interface Position {
  x: number;
  y: number;
}

// 武器类型定义
export type WeaponType = 'pistol' | 'shotgun' | 'sniper' | 'smg' | 'rpg';

// 武器配置接口
export interface WeaponConfig {
  id: WeaponType;
  name: string;
  description: string;
  icon: string;
  showIcon: string; // 商店和升级界面使用的高清展示图
  damage: number;
  fireRate: number;
  bulletSize: number;
  bulletSpeed: number;
  bulletRange: number;
  bulletsPerShot: number;
  spreadAngle: number;
  color: string;
  critRate: number; // 暴击率（0-1）
  magazineSize: number; // 弹匣最大容量
  reloadTime: number; // 换弹时间（毫秒）
  isLongGun: boolean; // 是否是长枪（影响旋转半径）
  playerSpeedBonus?: number; // 装备该武器时的移动速度加成（可选）
  playerSpeedMultiplier?: number; // 装备该武器时的移动速度倍率（可选，默认1.0）
}

// 特殊奖励类型定义（机制buff和武器）
export type SpecialRewardType = 
  | 'penetration' 
  | 'fireBuff' 
  | 'poisonBuff' 
  | 'energyAura' 
  | 'executionBuff' 
  | 'criticalRage' 
  | 'vampire' 
  | 'ammoSupply' 
  | 'desperateFight' 
  | 'pistol_last_bullet_penetrate' 
  | 'rpg_shockwave' 
  | 'rpg_ap_shot' 
  | 'rpg_dual_barrel' 
  | 'weapon_pistol' 
  | 'weapon_smg' 
  | 'weapon_sniper' 
  | 'weapon_shotgun' 
  | 'weapon_rpg';

// 成长链节点ID类型
export type GrowthChainNodeId = 
  // 淬毒成长链
  | 'poison_circle_expand_1'      // 毒圈扩大I
  | 'poison_enhance_1'            // 毒性增强I
  | 'poison_toxic_2'              // 剧毒II（真实伤害）
  | 'poison_infection_2'          // 传染II
  | 'poison_circle_expand_2'      // 毒圈扩大II
  | 'poison_faster_2'             // 剧毒III（频率提升）
  | 'poison_absorb_3'             // 剧毒吸收I
  // 手枪专属成长链
  | 'pistol_last_penetration'     // 最后一发子弹穿透
  // 火箭筒专属成长链
  | 'rpg_shockwave'                // 冲击波：爆炸击退敌人
  | 'rpg_ap_shot'                  // 穿甲弹：伤害+200%，范围-80%
  | 'rpg_dual_barrel'              // 两联装：两发连续发射
  // 其他buff成长链预留位置
  | 'fire_growth_1'               // 引火成长链1
  | 'fire_growth_2'               // 引火成长链2
  | 'energy_growth_1'             // 能量气场成长链1
  | 'energy_growth_2'             // 能量气场成长链2
  | 'execution_growth_1'          // 处决成长链1
  | 'execution_growth_2'          // 处决成长链2
  | 'critical_rage_growth_1'      // 暴怒成长链1
  | 'critical_rage_growth_2'      // 暴怒成长链2
  | 'vampire_growth_1'            // 吸血成长链1
  | 'vampire_growth_2'            // 吸血成长链2
  | 'ammo_supply_growth_1'        // 弹药补充成长链1
  | 'ammo_supply_growth_2'        // 弹药补充成长链2
  | 'desperate_fight_growth_1'    // 险中取胜成长链1
  | 'desperate_fight_growth_2';   // 险中取胜成长链2

// 成长链节点配置
export interface GrowthChainNode {
  id: GrowthChainNodeId;
  name: string;
  description: string;
  baseBuff: SpecialRewardType;        // 所属基础buff
  tier: number;                       // 成长链段数（1, 2, 3...）
  requiredPrevTierCount: number;      // 需要的前一段节点数量
  weight: number | ((level: number) => number);  // 出现权重
  priceFormula: (level: number) => number;       // 价格公式
  icon: string;
  apply: (player: Player) => Player;  // 应用效果
}

// 玩家接口
export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  fireRate: number;
  lastShot: number;
  weapon: WeaponType;
  weaponLevel: number; // 武器等级，用于数值升级
  weapons: WeaponType[]; // 拥有的武器列表
  currentWeaponIndex: number; // 当前武器索引
  weaponAmmo: Record<string, number>; // 每种武器的当前弹药
  isHit: boolean; // 是否处于受击状态
  hitTime: number; // 受击时间戳
  playerSpeed: number; // 玩家移动速度
  enemySpeedMultiplier: number; // 敌方速度倍率（小于1表示减速）
  weaponRange: number; // 武器射程
  bulletSpeed: number; // 子弹速度
  critRate: number; // 暴击率（0-1）
  critDamage: number; // 暴击伤害倍率（1.5表示150%）
  penetration: number; // 穿透力（0表示只能击中1个敌人，1表示可以穿透1个敌人击中第2个）
  currentAmmo: number; // 当前弹匣剩余子弹数
  isReloading: boolean; // 是否正在换弹
  reloadStartTime: number; // 换弹开始时间
  reloadInterrupted: boolean; // 换弹是否被中断（仅用于散弹枪一发一发装填）
  lastHitMonsterId: string | null; // 最近造成伤害的怪物ID
  lastHitMonsterTime: number; // 最近受到怪物伤害的时间戳
  gold: number; // 金币数量
  magazineSizeBonus: number; // 弹夹容量加成（独立于武器）
  reloadSpeedBonus: number; // 换弹速度加成百分比（独立于武器，用于双曲线递减公式）
  // 加成记录字段（用于UI显示）
  damageBonus: number; // 伤害加成点数
  critRateBonus: number; // 暴击率加成百分比
  critDamageBonus: number; // 暴击伤害加成百分比
  fireRateBonus: number; // 射速加成百分比
  playerSpeedBonus: number; // 移动速度加成百分比
  weaponRangeBonus: number; // 武器射程加成百分比
  maxHpBonus: number; // 生命上限加成点数
  penetrationBonus: number; // 穿透力加成点数
  // 动画相关字段
  facingDirection: 'left' | 'right'; // 面朝方向
  isMoving: boolean; // 是否正在移动
  lastMoveTime: number; // 最后一次移动的时间戳
  animationStartTime: number; // 动画开始时间
  // 引火buff相关
  fireBuffLevel: number; // 引火等级（0表示未获得）
  // 淬毒buff相关
  poisonBuffLevel: number; // 淬毒等级（0表示未获得）
  // 金币拾取范围加成（初始范围的百分比，如20表示+20%）
  coinPickupRangeBonus: number; // 金币拾取范围加成百分比
  // 能量气场相关
  energyAuraLevel: number; // 能量气场等级（0表示未获得）
  lastEnergyAuraShockwaveTime: number; // 上次冲击波发射时间
  // 处决buff相关
  executionLevel: number; // 处决等级（0表示未获得）
  criticalRageLevel: number; // 暴怒等级（0表示未获得）
  // 吸血buff相关
  vampireLevel: number; // 吸血等级（0表示未获得）
  // 弹药补充buff相关
  ammoSupplyLevel: number; // 弹药补充等级（0表示未获得）
  // 险中取胜buff相关
  desperateFightLevel: number; // 险中取胜等级（0表示未获得）
  // 成长链节点
  growthChainNodes: GrowthChainNodeId[]; // 已获得的成长链节点
  // 武器切换相关
  isSwitchingWeapon: boolean; // 是否正在切换武器
  weaponSwitchStartTime: number; // 武器切换开始时间
}

// 敌人类型定义
export type MonsterType = 1 | 2 | 3 | 4 | 5;  // 5 表示史莱姆王BOSS

// 怪物接口
export interface Monster {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number; // 基础速度（用于计算受击减速）
  damage: number;
  isHit: boolean; // 是否处于受击状态
  hitTime: number; // 受击时间戳
  isDying: boolean; // 是否处于死亡状态
  deathTime: number; // 死亡时间戳
  monsterType: MonsterType; // 敌人类型
  lastShot: number; // 最近一次射击时间
  lastAttackTime: number; // 最近一次碰撞攻击时间
  isBoss: boolean; // 是否为BOSS
  lastBossAttackTime: number; // BOSS最近一次攻击时间
  lastRangedAttackTime: number; // BOSS最近一次远程攻击时间
  // BOSS远程攻击连续发射相关状态
  rangedAttackCount?: number; // 当前组攻击的次数（0-2，共3次）
  rangedAttackStartTime?: number; // 当前组攻击开始时间
  vx: number; // X轴速度向量
  vy: number; // Y轴速度向量
  // 敌人4（远程敌人）动画相关状态
  isShooting?: boolean; // 是否正在播放Shoot动画
  shootAnimationStartTime?: number; // Shoot动画开始时间
  // BOSS落地攻击状态
  jumpAttackState?: 'idle' | 'locking' | 'jump_start' | 'airborne' | 'landing' | 'recovery'; // 落地攻击状态
  jumpAttackStartTime?: number; // 落地攻击开始时间
  jumpAttackTargetX?: number; // 锁定的目标位置X
  jumpAttackTargetY?: number; // 锁定的目标位置Y
  jumpAttackStartX?: number; // 起跳位置X（用于airborne阶段的移动计算）
  jumpAttackStartY?: number; // 起跳位置Y（用于airborne阶段的移动计算）
  jumpAttackVelocityX?: number; // 起跳速度X
  jumpAttackVelocityY?: number; // 起跳速度Y
  isInvincible?: boolean; // 是否处于无敌状态
  // 引火燃烧状态
  isBurning?: boolean; // 是否正在燃烧
  burningStacks?: number; // 燃烧层数
  burningDamage?: number; // 每层燃烧伤害
  burningEndTime?: number; // 燃烧结束时间
  lastBurnTickTime?: number; // 上次燃烧伤害时间
  burningSource?: string; // 燃烧来源怪物ID（用于传播）
  // 淬毒中毒状态
  isPoisoned?: boolean; // 是否正在中毒
  poisonStacks?: number; // 中毒层数
  poisonDamage?: number; // 每层中毒伤害
  poisonEndTime?: number; // 中毒结束时间
  lastPoisonTickTime?: number; // 上次中毒伤害时间
  // 能量气场减速状态
  isSlowedByAura?: boolean; // 是否被能量气场减速
  auraSlowdownEndTime?: number; // 减速结束时间
  // 处决标记
  isExecuted?: boolean; // 是否被处决
  executionTime?: number; // 处决时间
  // 火箭筒冲击波击退效果
  knockbackVx?: number; // 击退速度X
  knockbackVy?: number; // 击退速度Y
  knockbackEndTime?: number; // 击退结束时间
  // 火箭筒冲击波减速效果
  shockwaveSlowdownEndTime?: number; // 冲击波减速结束时间
  shockwaveSlowdownMultiplier?: number; // 冲击波减速倍率（0.3表示70%减速）
}

// 毒圈（淬毒buff敌人死亡时生成）
export interface PoisonCircle {
  id: string;
  x: number; // 毒圈中心X坐标
  y: number; // 毒圈中心Y坐标
  radius: number; // 毒圈半径
  damage: number; // 每次伤害值
  endTime: number; // 毒圈结束时间
  lastTickTime: number; // 上次伤害时间
}

// 掉落物品类型
export type DropType = 'coin' | 'chest' | 'weapon_upgrade_box' | 'health_potion';

// 金币拖尾粒子
export interface CoinTrailParticle {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  life: number; // 存在时间（毫秒）
  maxLife: number; // 最大存在时间
}

// 金币接口
export interface Coin {
  id: string;
  x: number;
  y: number;
  type: DropType; // 物品类型：coin、chest、weapon_upgrade_box、health_potion
  value: number; // 金币价值（coin时是金币值，chest时是打开后的金币值）
  size: number;
  color: string;
  spawnTime: number; // 生成时间
  isCollected: boolean; // 是否已被收集
  collectAnimationProgress: number; // 收集动画进度（0-1）
  isAttracting?: boolean; // 是否正在被吸引
  attractTargetX?: number; // 吸引目标位置X（玩家位置）
  attractTargetY?: number; // 吸引目标位置Y（玩家位置）
  trailParticles?: CoinTrailParticle[]; // 拖尾粒子数组
}

// 敌方子弹接口
export interface EnemyBullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  range: number;
  distanceTraveled: number;
  startX: number;
  startY: number;
  color: string;
  size: number;
  hasHitPlayer?: boolean; // 标记是否已经击中玩家（防止多次伤害）
  shouldRemove?: boolean; // 标记是否需要移除
}

// 伤害数字接口
export interface DamageNumber {
  id: string;
  monsterId: string; // 关联的怪物ID
  x: number;
  y: number;
  damage: number;
  opacity: number;
  scale: number;
  startTime: number;
  isCrit: boolean; // 是否是暴击
  isExecution?: boolean; // 是否是处决
  isDoubleCrit?: boolean; // 是否是二次暴击
}

// 金币飘字接口
export interface GoldFloatingText {
  id: string;
  x: number;
  y: number;
  initialY: number; // 初始Y位置（用于计算移动）
  value: number; // 数值
  opacity: number;
  scale: number;
  startTime: number;
  text?: string; // 自定义文字（可选）
  color?: string; // 自定义颜色（可选，格式：'#RRGGBB'）
}

// 吸血治疗效果
export interface VampireHealEffect {
  id: string;
  startTime: number;
  healAmount: number;
}

// 爆炸效果接口
export interface ExplosionEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  startTime: number;
  maxRadius: number; // 最大半径（动画效果）
  totalFrames: number; // 总帧数
  frameDuration: number; // 每帧持续时间（毫秒）
  firstPassComplete: boolean; // 是否完成第一遍播放
  rotation: number; // 爆炸贴图旋转角度（弧度）
}

// 枪口火焰接口
export interface MuzzleFlash {
  id: string;
  x: number; // 枪口位置X
  y: number; // 枪口位置Y
  angle: number; // 旋转角度（弧度）
  currentFrame: number; // 当前帧（0-3）
  startTime: number; // 开始时间
  duration: number; // 总持续时间（毫秒）
  scale: number; // 缩放比例
}

// 烟雾效果接口
export interface SmokeEffect {
  id: string;
  x: number;
  y: number;
  startTime: number; // 开始时间
  duration: number; // 持续时间（0.5秒）
  initialSize: number; // 初始大小
  finalSize: number; // 最终大小
}

// 子弹接口
export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weapon: WeaponType;
  size: number;
  color: string;
  damage: number;
  isCrit: boolean; // 是否是暴击
  actualDamage: number; // 实际伤害（考虑暴击后）
  penetration: number; // 穿透力
  hitCount: number; // 已经击中的敌人数量
  range: number;
  distanceTraveled: number;
  startX: number;
  startY: number;
  isRocket: boolean; // 是否是火箭弹
  explosionRadius: number; // 爆炸半径
  explosionDamage: number; // 爆炸伤害
  // 火箭弹变速相关字段
  initialSpeed: number; // 初始速度（火箭弹固定为0.2）
  finalSpeed: number; // 最终速度（火箭弹基础2，受子弹速度增益影响）
  accelerationStartTime: number; // 加速开始时间
  accelerationDuration: number; // 加速持续时间（2秒）
  lastSmokeTime: number; // 上次生成烟雾的时间（用于每0.15秒生成一次）
  // 手枪专属：最后一发子弹穿透标记
  isPistolLastBullet?: boolean; // 是否是手枪最后一发子弹（无限穿透，无伤害衰减）
  // 火箭筒专属Buff标记
  isRPGShockwave?: boolean; // 是否有冲击波Buff（爆炸击退敌人）
  isRPGAPShot?: boolean; // 是否有穿甲弹Buff（伤害+200%，范围-80%）
  isRPGDualBarrel?: boolean; // 是否有两联装Buff（两发连续发射）
  rpgScale?: number; // 火箭弹和烟雾的缩放比例（两联装为0.6）
}

// 障碍物接口
export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image: string; // 图片路径
  collisionWidth: number; // 碰撞体积宽度（图片非透明部分）
  collisionHeight: number; // 碰撞体积高度（图片非透明部分）
}

// 升级类型定义
export type UpgradeType = 
  | 'heal' 
  | 'maxHp' 
  | 'damage' 
  | 'fireRate' 
  | 'playerSpeed' 
  | 'reloadTime' 
  | 'magazineSize' 
  | 'weaponRange' 
  | 'critRate' 
  | 'critDamage' 
  | 'penetration' 
  | 'weapon_pistol' 
  | 'weapon_shotgun' 
  | 'weapon_sniper' 
  | 'weapon_smg' 
  | 'weapon_rpg' 
  | 'weapon_upgrade' 
  | 'gold_reward' 
  | 'enemySlowdown' 
  | 'bulletSpeed' 
  | 'fireBuff' 
  | 'poisonBuff' 
  | 'pistol_last_bullet_penetrate' 
  | 'rpg_shockwave' 
  | 'rpg_ap_shot' 
  | 'rpg_dual_barrel' 
  | 'coinPickupRange' 
  | 'energyAura' 
  | 'executionBuff' 
  | 'criticalRage' 
  | 'vampire' 
  | 'ammoSupply' 
  | 'desperateFight';

// 升级接口
export interface Upgrade {
  id: UpgradeType;
  name: string;
  description: string;
  icon: string;
  weight?: number; // 权重，控制出现概率
  growthChainNode?: GrowthChainNodeId; // 如果是成长链节点升级，存储节点ID
}
