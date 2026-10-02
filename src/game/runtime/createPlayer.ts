import type { Player, WeaponType } from '@/game/model/types';
import { GAME_CONFIG } from '@/game/config/base';
import { WEAPONS } from '@/game/config/weapons';

export function createPlayer(weaponType: WeaponType = 'pistol'): Player {
  const selectedWeapon = WEAPONS[weaponType];
  const basePlayerSpeed = 2;
  const weaponSpeedBonus = selectedWeapon.playerSpeedBonus || 0;
  return {
    x: GAME_CONFIG.WORLD_WIDTH / 2,
    y: GAME_CONFIG.WORLD_HEIGHT / 2,
    hp: GAME_CONFIG.PLAYER_MAX_HP,
    maxHp: GAME_CONFIG.PLAYER_MAX_HP,
    damage: selectedWeapon.damage,
    fireRate: selectedWeapon.fireRate,
    lastShot: 0,
    weapon: weaponType,
    weaponLevel: 1,
    weapons: [weaponType], // 初始武器列表
    currentWeaponIndex: 0, // 当前武器索引
    weaponInstances: {}, // 初始武器随机属性实例（初始武器不刷随机属性）
    weaponAmmo: { [weaponType]: selectedWeapon.magazineSize }, // 武器弹药记录
    isHit: false,
    hitTime: 0,
    playerSpeed: basePlayerSpeed + weaponSpeedBonus, // 基础速度 + 武器加成
    enemySpeedMultiplier: 1.0,
    weaponRange: selectedWeapon.bulletRange,
    bulletSpeed: selectedWeapon.bulletSpeed,
    critRate: selectedWeapon.critRate, // 初始暴击率（使用武器配置）
    critDamage: 1.5, // 初始暴击伤害倍率（150%）
    penetration: weaponType === 'sniper' ? 1 : 0, // 狙击枪自带穿透
    currentAmmo: selectedWeapon.magazineSize, // 当前弹匣子弹数
    isReloading: false, // 是否正在换弹
    reloadStartTime: 0, // 换弹开始时间
    reloadInterrupted: false, // 换弹是否被中断（仅用于散弹枪一发一发装填）
    lastHitMonsterId: null,
    lastHitMonsterTime: 0,
    gold: 0, // 初始金币
    magazineSizeBonus: 0, // 初始弹夹容量加成
    reloadSpeedBonus: 0, // 换弹速度加成百分比
    // 初始化加成字段
    damageBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    fireRateBonus: 0,
    playerSpeedBonus: weaponSpeedBonus, // 武器移动速度加成
    weaponRangeBonus: 0,
    maxHpBonus: 0,
    penetrationBonus: 0,
    // 动画相关字段
    facingDirection: 'left', // 面朝方向
    isMoving: false, // 是否正在移动
    lastMoveTime: 0, // 最后一次移动的时间戳
    animationStartTime: 0, // 动画开始时间
    // 引火buff相关
    fireBuffLevel: 0, // 初始引火等级
    // 淬毒buff相关
    poisonBuffLevel: 0, // 初始淬毒等级
    coinPickupRangeBonus: 0, // 初始金币拾取范围加成
    // 能量气场相关
    energyAuraLevel: 0, // 初始能量气场等级
    lastEnergyAuraShockwaveTime: 0, // 上次冲击波发射时间
    // 处决buff相关
    executionLevel: 0, // 初始处决等级
    // 暴怒buff相关
    criticalRageLevel: 0, // 初始暴怒等级
    // 吸血buff相关
    vampireLevel: 0, // 初始吸血等级
    // 弹药补充buff相关
    ammoSupplyLevel: 0, // 初始弹药补充等级
    // 险中取胜buff相关
    desperateFightLevel: 0, // 初始险中取胜等级
    knockback: 0, // 初始击退值
    // 成长链节点
    growthChainNodes: [], // 初始成长链节点
    // 武器切换相关
    isSwitchingWeapon: false, // 是否正在切换武器
    weaponSwitchStartTime: 0, // 武器切换开始时间
  };
}
