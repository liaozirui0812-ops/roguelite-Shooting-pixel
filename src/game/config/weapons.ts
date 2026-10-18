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

// 武器自带基础穿透点数（0 表示子弹只能击中 1 个敌人）
// createPlayer / acquireWeapon 都从这里取值，避免同一事实在多处硬编码后漂移
export const WEAPON_BASE_PENETRATION: Record<WeaponType, number> = {
  pistol: 0,
  shotgun: 0,
  sniper: 1,
  smg: 0,
  rpg: 0,
};

// 火箭弹基础爆炸参数。实际命中还会被穿甲弹（×3 伤害 / ×0.2 范围）
// 与两联装（×0.6 伤害 / ×0.7 范围）修正，因此展示时只能标称"基础"值；
// 最终伤害合同仍待 R06/R20 确认，不要在展示层把它包装成确定伤害。
export const RPG_EXPLOSION_BASE: { radius: number; damage: number } = {
  radius: 150, // 基础爆炸半径（px）
  damage: 120, // 基础爆炸伤害
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

// 每把武器额外展示的一条特色属性，取值同样来自配置，避免手写后与配置漂移
const STARTER_FEATURE_LINE: Record<WeaponType, (cfg: WeaponConfig) => string> = {
  pistol: (cfg) => `移动速度: +${cfg.playerSpeedBonus ?? 0}`,
  shotgun: (cfg) => `暴击率: ${Math.round(cfg.critRate * 100)}%`,
  sniper: (cfg) => `穿透: ${WEAPON_BASE_PENETRATION[cfg.id]}`,
  smg: (cfg) => `暴击率: ${Math.round(cfg.critRate * 100)}%`,
  rpg: () => `爆炸范围: ${RPG_EXPLOSION_BASE.radius}px`,
};

// 伤害行：多弹丸武器标成「单发伤害×弹丸数」；火箭筒的直接伤害为 0，生效的是爆炸伤害
const buildDamageLine = (cfg: WeaponConfig): string =>
  cfg.id === 'rpg'
    ? `基础爆炸伤害: ${RPG_EXPLOSION_BASE.damage}`
    : cfg.bulletsPerShot > 1
      ? `伤害: ${cfg.damage}×${cfg.bulletsPerShot}`
      : `伤害: ${cfg.damage}`;

// 由 WEAPONS 生成展示属性：伤害 / 射速 / 弹容量 + 一条特色属性
const buildStarterStats = (cfg: WeaponConfig): string[] => [
  buildDamageLine(cfg),
  `射速: ${(1000 / cfg.fireRate).toFixed(1)}发/秒`,
  `弹容量: ${cfg.magazineSize}`,
  STARTER_FEATURE_LINE[cfg.id](cfg),
];

// 初始武器选择界面展示信息（边框/标题色 + 属性文本）
// R14：stats 全部由 WEAPONS 生成。此前手写值（手枪移动速度 +1、散弹暴击 30%）
// 与配置实际值（+0.5、20%）不一致，玩家按错误信息选枪。
export const STARTER_WEAPON_META: Record<
  WeaponType,
  { border: string; title: string; stats: string[] }
> = {
  pistol: {
    border: 'border-yellow-500/50 hover:border-yellow-400',
    title: 'text-yellow-400',
    stats: buildStarterStats(WEAPONS.pistol),
  },
  shotgun: {
    border: 'border-red-500/50 hover:border-red-400',
    title: 'text-red-400',
    stats: buildStarterStats(WEAPONS.shotgun),
  },
  sniper: {
    border: 'border-green-500/50 hover:border-green-400',
    title: 'text-green-400',
    stats: buildStarterStats(WEAPONS.sniper),
  },
  smg: {
    border: 'border-cyan-500/50 hover:border-cyan-400',
    title: 'text-cyan-400',
    stats: buildStarterStats(WEAPONS.smg),
  },
  rpg: {
    border: 'border-orange-500/50 hover:border-orange-400',
    title: 'text-orange-400',
    stats: buildStarterStats(WEAPONS.rpg),
  },
};
