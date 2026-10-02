import type { SpecialRewardType, Upgrade, ShopItemType, Player } from '@/game/model/types';
import { WEAPONS } from '@/game/config/weapons';

import { SHOP_EFFECTS } from '@/game/rules/effects';

// 判断是否为特殊奖励类型
export const isSpecialReward = (type: string): type is SpecialRewardType => {
  return [
    'penetration',
    'fireBuff',
    'poisonBuff',
    'energyAura',
    'executionBuff',
    'criticalRage',
    'vampire',
    'ammoSupply',
    'desperateFight',
    'pistol_last_bullet_penetrate',
    'pistol_final_strike',
    'weapon_pistol',
    'weapon_smg',
    'weapon_sniper',
    'weapon_shotgun',
    'weapon_rpg',
  ].includes(type);
};

// 获取特殊奖励的详细说明
export const getSpecialRewardDescription = (
  type: SpecialRewardType
): { title: string; description: string; stats?: string[] } => {
  // 射速转换函数：毫秒转发/秒
  const fireRatePerSecond = (ms: number) => (1000 / ms).toFixed(1);

  switch (type) {
    case 'penetration':
      return {
        title: '穿透',
        description:
          '使子弹可以沿直线穿透多个敌人，对后续敌人造成逐级衰减的伤害。升级穿透可以提升穿透的敌人数量，且略微提升穿透伤害。',
      };
    case 'fireBuff':
      return {
        title: '引火',
        description:
          '使子弹有20%几率点燃敌人，同一个敌人最多累计5层。被点燃的敌人每秒会受到轻微燃烧伤害，并有概率将燃烧效果蔓延至身边的敌人。',
      };
    case 'poisonBuff':
      return {
        title: '淬毒',
        description:
          '使子弹有20%几率让敌人中毒，最多累计5层。中毒敌人移动速度降低20%。敌人死亡时，会在原地留下一个持续5秒的毒圈（场上最多5个），毒圈内的敌人会持续受到伤害并中毒。',
      };
    case 'energyAura':
      return {
        title: '能量气场',
        description:
          '在玩家周围形成一个能量气场，每3秒释放一次冲击波。冲击波会击退气场内的敌人、使其减速1.5秒，并消除气场内的敌方子弹。升级可增大气场半径。',
      };
    case 'executionBuff':
      return {
        title: '处决',
        description:
          '当敌人血量低于18%时，攻击将立即处决该敌人。敌人被处决前会闪红提示，并显示红色"处决！！"飘字。',
      };
    case 'criticalRage':
      return {
        title: '暴怒',
        description:
          '你的暴击有概率触发二次暴击，造成暴击伤害150%的额外伤害。概率等于暴击率的一半。',
      };
    case 'vampire':
      return {
        title: '吸血',
        description: '当你杀死敌人时，有10%概率回复1点生命值。',
      };
    case 'ammoSupply':
      return {
        title: '弹药补充',
        description: '以暴击杀死敌人时（包括二次暴击），立即补充弹匣里10%的子弹（最少1发）。',
      };
    case 'desperateFight':
      return {
        title: '险中取胜',
        description:
          '当生命值低于20%时，进入狂暴状态：暴击率+20%，暴击伤害+100%，换弹速度+30%，射速+30%，移动速度+1。',
      };
    case 'pistol_last_bullet_penetrate':
      return {
        title: '最后一弹',
        description: '手枪的最后一发子弹可以穿透任何敌人（无限穿透，无伤害衰减）',
      };
    case 'pistol_final_strike':
      return {
        title: '孤注一掷',
        description:
          '换弹时长+40%，但弹匣中最后3发子弹伤害递增50%/100%/200%，且最后一发必定暴击并穿透所有敌人',
        stats: ['换弹时长 +40%', '最后3发伤害 +50%/+100%/+200%', '最后一发必暴击+穿透'],
      };
    case 'rpg_shockwave':
      return {
        title: '冲击波',
        description: '爆炸伤害会击退敌人，未死亡的敌人向反方向击退30px，并在1.5秒内减速70%',
      };
    case 'rpg_ap_shot':
      return {
        title: '穿甲弹',
        description: '爆炸伤害增加200%，爆炸范围减少80%',
      };
    case 'rpg_dual_barrel':
      return {
        title: '两联装',
        description:
          '弹夹数变为2，点击发射则在0.7秒内连续发射两发。每发爆炸范围为初始的70%，伤害为60%，美术资源大小为60%',
      };
    case 'weapon_pistol':
      return {
        title: '手枪',
        description: '标准武器，平衡性良好',
        stats: [
          `伤害：${WEAPONS.pistol.damage}`,
          `射速：${fireRatePerSecond(WEAPONS.pistol.fireRate)}发/秒`,
          `弹容量：${WEAPONS.pistol.magazineSize}`,
          `移动速度：+1`,
        ],
      };
    case 'weapon_smg':
      return {
        title: '冲锋枪',
        description: '射速极快，射程短，单发伤害低',
        stats: [
          `伤害：${WEAPONS.smg.damage}`,
          `射速：${fireRatePerSecond(WEAPONS.smg.fireRate)}发/秒`,
          `弹容量：${WEAPONS.smg.magazineSize}`,
        ],
      };
    case 'weapon_sniper':
      return {
        title: '狙击枪',
        description: '威力巨大，射程远，射速慢',
        stats: [
          `伤害：${WEAPONS.sniper.damage}`,
          `射速：${fireRatePerSecond(WEAPONS.sniper.fireRate)}发/秒`,
          `弹容量：${WEAPONS.sniper.magazineSize}`,
          `穿透：1`,
        ],
      };
    case 'weapon_shotgun':
      return {
        title: '散弹枪',
        description: '一次发射多发子弹，射程短，射速慢',
        stats: [
          `伤害：${WEAPONS.shotgun.damage}×${WEAPONS.shotgun.bulletsPerShot}`,
          `射速：${fireRatePerSecond(WEAPONS.shotgun.fireRate)}发/秒`,
          `弹容量：${WEAPONS.shotgun.magazineSize}`,
        ],
      };
    case 'weapon_rpg':
      return {
        title: '火箭筒',
        description: '发射爆炸火箭弹，伤害范围广',
        stats: [
          `伤害：${WEAPONS.rpg.damage}`,
          `射速：${fireRatePerSecond(WEAPONS.rpg.fireRate)}发/秒`,
          `弹容量：${WEAPONS.rpg.magazineSize}`,
          `爆炸范围：150px`,
        ],
      };
    default:
      return { title: '', description: '' };
  }
};

export const UPGRADES: Upgrade[] = [
  {
    id: 'maxHp',
    name: '血量上限',
    description: '血量上限 +10',
    value: 10,
    icon: '/assets/shangxian.png',
    weight: 25,
  },
  {
    id: 'damage',
    name: '伤害加成',
    description: '当前武器伤害 +20%',
    value: 20,
    icon: '/assets/shanghai.png',
    weight: 25,
  },
  {
    id: 'fireRate',
    name: '射速提升',
    description: '当前武器射速 +25%',
    value: 25,
    icon: '/assets/shesu.png',
    weight: 25,
  },
  {
    id: 'playerSpeed',
    name: '移动速度',
    description: '玩家移动速度 +15%',
    value: 15,
    icon: '/assets/ui/speed.svg',
    weight: 20,
  },
  {
    id: 'reloadTime',
    name: '换弹速度',
    description: '换弹速度 +15%',
    value: 15,
    icon: '/assets/huandan.png',
    weight: 20,
  },
  {
    id: 'magazineSize',
    name: '弹夹容量',
    description: '弹夹容量 +2',
    value: 2,
    icon: '/assets/ui/weapon-upgrade.svg',
    weight: 20,
  },
  {
    id: 'weaponRange',
    name: '武器射程',
    description: '当前武器射程 +20%',
    value: 20,
    icon: '/assets/shecheng.png',
    weight: 20,
  },
  {
    id: 'critRate',
    name: '暴击率',
    description: '当前武器暴击率 +5%',
    value: 5,
    icon: '/assets/baojilv.png',
    weight: 20,
  },
  {
    id: 'critDamage',
    name: '暴击伤害',
    description: '暴击伤害倍率 +10%',
    value: 10,
    icon: '/assets/baojishanghai.png',
    weight: 15,
  },
  {
    id: 'penetration',
    name: '穿透力',
    description: '子弹可以穿透更多敌人',
    value: 0,
    icon: '/assets/chuantou.png',
    weight: 15,
  },
  {
    id: 'weapon_pistol',
    name: '手枪',
    description: WEAPONS.pistol.description,
    value: 0,
    icon: WEAPONS.pistol.showIcon,
    weight: 15,
  },
  {
    id: 'weapon_shotgun',
    name: '散弹枪',
    description: WEAPONS.shotgun.description,
    value: 0,
    icon: WEAPONS.shotgun.showIcon,
    weight: 20,
  },
  {
    id: 'weapon_sniper',
    name: '狙击枪',
    description: WEAPONS.sniper.description,
    value: 0,
    icon: WEAPONS.sniper.showIcon,
    weight: 20,
  },
  {
    id: 'weapon_smg',
    name: '冲锋枪',
    description: WEAPONS.smg.description,
    value: 0,
    icon: WEAPONS.smg.showIcon,
    weight: 20,
  },
  {
    id: 'weapon_rpg',
    name: '火箭筒',
    description: WEAPONS.rpg.description,
    value: 0,
    icon: WEAPONS.rpg.showIcon,
    weight: 15,
  },
];

// 商店商品配置
export const SHOP_ITEM_CONFIGS: Record<
  ShopItemType,
  {
    name: string;
    icon: string;
    basePrice: number; // 基础价格
    levelPriceFactor: number; // 关卡系数（实际价格 = basePrice + levelPriceFactor × 关卡数）
    weight?: number; // 权重（可选）
    isPercentage: boolean;
    apply: (player: Player, value: number, random?: () => number) => Player;
  }
> = {
  critDamage: {
    name: '暴击伤害',
    icon: '/assets/baojishanghai.png',
    basePrice: 12,
    levelPriceFactor: 8,
    isPercentage: true,
    apply: SHOP_EFFECTS.critDamage,
  },
  critRate: {
    name: '暴击率',
    icon: '/assets/baojilv.png',
    basePrice: 15,
    levelPriceFactor: 10,
    isPercentage: true,
    apply: SHOP_EFFECTS.critRate,
  },
  magazineSize: {
    name: '弹夹容量',
    icon: '/assets/ui/weapon-upgrade.svg',
    basePrice: 15,
    levelPriceFactor: 15,
    isPercentage: false,
    apply: SHOP_EFFECTS.magazineSize,
  },
  fireRate: {
    name: '射速',
    icon: '/assets/shesu.png',
    basePrice: 10,
    levelPriceFactor: 7,
    isPercentage: true,
    apply: SHOP_EFFECTS.fireRate,
  },
  damage: {
    name: '伤害',
    icon: '/assets/shanghai.png',
    basePrice: 12,
    levelPriceFactor: 8,
    isPercentage: false,
    apply: SHOP_EFFECTS.damage,
  },
  playerSpeed: {
    name: '移动速度',
    icon: '/assets/ui/speed.svg',
    basePrice: 6,
    levelPriceFactor: 4,
    isPercentage: true,
    apply: SHOP_EFFECTS.playerSpeed,
  },
  reloadTime: {
    name: '换弹速度',
    icon: '/assets/huandan.png',
    basePrice: 10,
    levelPriceFactor: 7,
    isPercentage: true,
    apply: SHOP_EFFECTS.reloadTime,
  },
  weaponRange: {
    name: '射程',
    icon: '/assets/shecheng.png',
    basePrice: 5,
    levelPriceFactor: 2,
    isPercentage: true,
    apply: SHOP_EFFECTS.weaponRange,
  },
  maxHp: {
    name: '生命上限',
    icon: '/assets/shangxian.png',
    basePrice: 8,
    levelPriceFactor: 5,
    isPercentage: false,
    apply: SHOP_EFFECTS.maxHp,
  },
  penetration: {
    name: '穿透力',
    icon: '/assets/chuantou.png',
    basePrice: 40,
    levelPriceFactor: 30,
    isPercentage: false,
    apply: SHOP_EFFECTS.penetration,
  },
  knockback: {
    name: '击退',
    icon: '/assets/jitui.png',
    basePrice: 15,
    levelPriceFactor: 18,
    isPercentage: false,
    apply: SHOP_EFFECTS.knockback,
  },
  weapon_pistol: {
    name: '手枪',
    icon: WEAPONS.pistol.showIcon,
    basePrice: 2,
    levelPriceFactor: 2,
    isPercentage: false,
    apply: SHOP_EFFECTS.weapon_pistol,
  },
  weapon_smg: {
    name: '冲锋枪',
    icon: WEAPONS.smg.showIcon,
    basePrice: 10,
    levelPriceFactor: 2,
    isPercentage: false,
    apply: SHOP_EFFECTS.weapon_smg,
  },
  weapon_sniper: {
    name: '狙击枪',
    icon: WEAPONS.sniper.showIcon,
    basePrice: 12,
    levelPriceFactor: 3,
    isPercentage: false,
    apply: SHOP_EFFECTS.weapon_sniper,
  },
  weapon_shotgun: {
    name: '散弹枪',
    icon: WEAPONS.shotgun.showIcon,
    basePrice: 12,
    levelPriceFactor: 3,
    isPercentage: false,
    apply: SHOP_EFFECTS.weapon_shotgun,
  },
  weapon_rpg: {
    name: '火箭筒',
    icon: WEAPONS.rpg.showIcon,
    basePrice: 12,
    levelPriceFactor: 3,
    isPercentage: false,
    apply: SHOP_EFFECTS.weapon_rpg,
  },
  bulletSpeed: {
    name: '子弹速度',
    icon: '/assets/ui/weapon-upgrade.svg',
    basePrice: 5,
    levelPriceFactor: 2,
    isPercentage: true,
    apply: SHOP_EFFECTS.bulletSpeed,
  },
  fireBuff: {
    name: '引火',
    icon: '/assets/fire_buff.png',
    basePrice: 20,
    levelPriceFactor: 15,
    isPercentage: false,
    apply: SHOP_EFFECTS.fireBuff,
  },
  poisonBuff: {
    name: '淬毒',
    icon: '/assets/poison.png',
    basePrice: 20,
    levelPriceFactor: 15,
    isPercentage: false,
    apply: SHOP_EFFECTS.poisonBuff,
  },
  coinPickupRange: {
    name: '金币拾取范围',
    icon: '/assets/coin.png',
    basePrice: 5,
    levelPriceFactor: 3,
    isPercentage: true,
    apply: SHOP_EFFECTS.coinPickupRange,
  },
  energyAura: {
    name: '能量气场',
    icon: '/assets/aura.png',
    basePrice: 25,
    levelPriceFactor: 20,
    isPercentage: false,
    apply: SHOP_EFFECTS.energyAura,
  },
  executionBuff: {
    name: '处决',
    icon: '/assets/execution.png',
    basePrice: 0, // 特殊计算：10 + L^2
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: SHOP_EFFECTS.executionBuff,
  },
  criticalRage: {
    name: '暴怒',
    icon: '/assets/critical_rage.png',
    basePrice: 25, // 特殊计算: 25 + 1.5L
    levelPriceFactor: 0,
    weight: 100, // 特殊计算: 15*L, max=120
    isPercentage: false,
    apply: SHOP_EFFECTS.criticalRage,
  },
  vampire: {
    name: '吸血',
    icon: '/assets/ui/vampire.svg',
    basePrice: 0, // 特殊计算: 10 + 2L
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: SHOP_EFFECTS.vampire,
  },
  ammoSupply: {
    name: '弹药补充',
    icon: '/assets/ammo_supply.png',
    basePrice: 0, // 特殊计算: 10 + 2L
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: SHOP_EFFECTS.ammoSupply,
  },
  desperateFight: {
    name: '险中取胜',
    icon: '/assets/desperate_fight.png',
    basePrice: 0, // 特殊计算: 20 + 3L
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: SHOP_EFFECTS.desperateFight,
  },
  pistol_last_bullet_penetrate: {
    name: '最后一弹',
    icon: '/assets/pistol_show.png',
    basePrice: 0, // 特殊计算: 3L+50（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: SHOP_EFFECTS.pistol_last_bullet_penetrate,
  },
  pistol_final_strike: {
    name: '孤注一掷',
    icon: '/assets/pistol_final_strike.png',
    basePrice: 0, // 特殊计算: 180+10L（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: SHOP_EFFECTS.pistol_final_strike,
  },
  rpg_shockwave: {
    name: '冲击波',
    icon: '/assets/RPG_show.png',
    basePrice: 0, // 特殊计算: 10L（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: SHOP_EFFECTS.rpg_shockwave,
  },
  rpg_ap_shot: {
    name: '穿甲弹',
    icon: '/assets/RPG_show.png',
    basePrice: 0, // 特殊计算: 13L（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: SHOP_EFFECTS.rpg_ap_shot,
  },
  rpg_dual_barrel: {
    name: '两联装',
    icon: '/assets/RPG_show.png',
    basePrice: 0, // 特殊计算: 15L（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: SHOP_EFFECTS.rpg_dual_barrel,
  },
};
