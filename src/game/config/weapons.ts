import type { WeaponType, WeaponConfig, WeaponAffixId } from '@/game/model/types';

// 武器配置
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
    bulletSpeed: 2.5, // 子弹速度
    bulletRange: 800,
    bulletsPerShot: 1,
    spreadAngle: 0,
    color: '#ffcc00',
    critRate: 0, // 0%暴击率（玩家初始暴击率为0%）
    magazineSize: 12, // 弹匣容量
    reloadTime: 3000, // 换弹时间（毫秒）
    isLongGun: false, // 手枪不是长枪
    isStarter: true, // 可选初始武器
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
    bulletSpeed: 3, // 子弹速度
    bulletRange: 300,
    bulletsPerShot: 5,
    spreadAngle: 0.3, // 约 17 度
    color: '#ff6666',
    critRate: 0.2, // 20%暴击率
    magazineSize: 7, // 弹匣容量
    reloadTime: 500, // 换弹时间（毫秒），散弹枪特殊：一发一发装填
    isLongGun: true, // 散弹枪是长枪
    isStarter: true, // 可选初始武器
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
    bulletSpeed: 5, // 子弹速度
    bulletRange: 1500,
    bulletsPerShot: 1,
    spreadAngle: 0,
    color: '#66ff66',
    critRate: 0.1, // 10%暴击率
    magazineSize: 8, // 弹匣容量
    reloadTime: 3000, // 换弹时间（毫秒）
    isLongGun: true, // 狙击枪是长枪
    isStarter: false, // 非可选初始武器（战斗中获得）
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
    bulletSpeed: 3.5, // 子弹速度
    bulletRange: 400,
    bulletsPerShot: 1,
    spreadAngle: 0.05,
    color: '#66ccff',
    critRate: 0.1, // 10%暴击率
    magazineSize: 30, // 弹匣容量
    reloadTime: 2500, // 换弹时间（毫秒）
    isLongGun: false, // 冲锋枪不是长枪
    isStarter: true, // 可选初始武器
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
    isStarter: false, // 非可选初始武器（战斗中获得）
    playerSpeedMultiplier: 0.7, // 装备火箭筒时移动速度降低30%
  },
};

// 稀有度配置：达成对应武器价值所需阈值
export const RARITY_META: Record<number, { name: string; color: string; threshold: number }> = {
  1: { name: '普通', color: '#ffffff', threshold: 0 },
  2: { name: '精良', color: '#4ade80', threshold: 30 },
  3: { name: '稀有', color: '#60a5fa', threshold: 50 },
  4: { name: '史诗', color: '#c084fc', threshold: 70 },
  5: { name: '传说', color: '#fb923c', threshold: 100 },
};

// 武器抽取次数表：[次数, 权重]
export const WEAPON_DRAW_COUNT: Array<{ count: number; weight: number }> = [
  { count: 0, weight: 120 },
  { count: 1, weight: 320 },
  { count: 2, weight: 280 },
  { count: 3, weight: 170 },
  { count: 4, weight: 80 },
  { count: 5, weight: 30 },
];

// 加成池：每种 buff 的 3 档（数值/权重/提升的价值）
export const WEAPON_AFFIX_POOL: Array<{
  id: WeaponAffixId;
  name: string;
  tiers: Array<{ value: number; weight: number; gain: number }>;
}> = [
  {
    id: 'magazine',
    name: '弹容量',
    tiers: [
      { value: 1, weight: 100, gain: 5 },
      { value: 3, weight: 80, gain: 12 },
      { value: 6, weight: 60, gain: 20 },
    ],
  },
  {
    id: 'moveSpeed',
    name: '持枪移动速度',
    tiers: [
      { value: 3, weight: 100, gain: 5 },
      { value: 5, weight: 80, gain: 10 },
      { value: 8, weight: 60, gain: 18 },
    ],
  },
  {
    id: 'damage',
    name: '伤害加成',
    tiers: [
      { value: 10, weight: 100, gain: 15 },
      { value: 15, weight: 80, gain: 30 },
      { value: 20, weight: 60, gain: 60 },
    ],
  },
  {
    id: 'critRate',
    name: '暴击率',
    tiers: [
      { value: 10, weight: 100, gain: 8 },
      { value: 15, weight: 80, gain: 18 },
      { value: 20, weight: 60, gain: 35 },
    ],
  },
  {
    id: 'fireRate',
    name: '射速',
    tiers: [
      { value: 10, weight: 100, gain: 12 },
      { value: 15, weight: 80, gain: 25 },
      { value: 20, weight: 60, gain: 50 },
    ],
  },
];

export const AFFIX_LABEL: Record<WeaponAffixId, (v: number) => string> = {
  magazine: (v) => `+${v}`,
  moveSpeed: (v) => `+${v}%`,
  damage: (v) => `+${v}%`,
  critRate: (v) => `+${v}%`,
  fireRate: (v) => `+${v}%`,
};

// 初始武器选择界面展示信息（边框/标题色 + 属性文本）
export const STARTER_WEAPON_META: Record<
  WeaponType,
  { border: string; title: string; stats: string[] }
> = {
  pistol: {
    border: 'border-yellow-500/50 hover:border-yellow-400',
    title: 'text-yellow-400',
    stats: ['伤害: 5', '射速: 3.3发/秒', '弹容量: 12', '移动速度: +1'],
  },
  shotgun: {
    border: 'border-red-500/50 hover:border-red-400',
    title: 'text-red-400',
    stats: ['伤害: 15×5', '射速: 1.3发/秒', '弹容量: 7', '暴击率: 30%'],
  },
  sniper: {
    border: 'border-green-500/50 hover:border-green-400',
    title: 'text-green-400',
    stats: ['伤害: 50', '射速: 0.8发/秒', '弹容量: 8', '穿透: 1'],
  },
  smg: {
    border: 'border-cyan-500/50 hover:border-cyan-400',
    title: 'text-cyan-400',
    stats: ['伤害: 6', '射速: 12.5发/秒', '弹容量: 30', '暴击率: 10%'],
  },
  rpg: {
    border: 'border-orange-500/50 hover:border-orange-400',
    title: 'text-orange-400',
    stats: ['伤害: 120', '射速: 0.5发/秒', '弹容量: 5', '爆炸范围: 250px'],
  },
};
