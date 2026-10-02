import {
  RARITY_META,
  WEAPON_DRAW_COUNT,
  WEAPON_AFFIX_POOL,
  AFFIX_LABEL,
  WEAPONS,
} from '@/game/config/weapons';
import type { WeaponInstance, WeaponAffix, Player, WeaponType } from '@/game/model/types';

// 加权随机抽取（items 每项含 weight）
export const pickWeighted = <T extends { weight: number }>(
  items: T[],
  random: () => number = Math.random
): T => {
  const total = items.reduce((sum, it) => sum + it.weight, 0);
  let r = random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r < 0) return it;
  }
  return items[items.length - 1];
};

// 根据武器价值计算稀有度（从高到低匹配阈值）
export const getRarityByValue = (value: number): number => {
  let rarity = 1;
  for (let r = 1; r <= 5; r++) {
    if (value >= RARITY_META[r].threshold) rarity = r;
  }
  return rarity;
};

// 为武器抽取随机属性实例：抽取次数 -> 按池子权重抽取对应数量加成 -> 累加价值 -> 计算稀有度
export const rollWeaponInstance = (random: () => number = Math.random): WeaponInstance => {
  const draws = pickWeighted(WEAPON_DRAW_COUNT, random).count;
  const affixes: WeaponAffix[] = [];
  let value = 0;
  for (let i = 0; i < draws; i++) {
    const buff = WEAPON_AFFIX_POOL[Math.floor(random() * WEAPON_AFFIX_POOL.length)];
    const tier = pickWeighted(buff.tiers, random);
    affixes.push({
      id: buff.id,
      tier: buff.tiers.indexOf(tier) + 1,
      value: tier.value,
      valueLabel: AFFIX_LABEL[buff.id](tier.value),
      gain: tier.gain,
    });
    value += tier.gain;
  }
  return { affixes, value, rarity: getRarityByValue(value) };
};

// 获取某武器的随机属性实例（无则返回空实例）
export const getWeaponInstance = (player: Player, weaponType: WeaponType): WeaponInstance =>
  player.weaponInstances && player.weaponInstances[weaponType]
    ? player.weaponInstances[weaponType]
    : { affixes: [], value: 0, rarity: 1 };

// 汇总某武器实例的各类加成数值
export const getWeaponAffixSummary = (player: Player, weaponType: WeaponType) => {
  const affixes = getWeaponInstance(player, weaponType).affixes;
  const s = { magazine: 0, moveSpeed: 0, damage: 0, critRate: 0, fireRate: 0 };
  for (const a of affixes) {
    if (a.id === 'magazine') s.magazine += a.value;
    else if (a.id === 'moveSpeed') s.moveSpeed += a.value;
    else if (a.id === 'damage') s.damage += a.value;
    else if (a.id === 'critRate') s.critRate += a.value;
    else if (a.id === 'fireRate') s.fireRate += a.value;
  }
  return s;
};

// 装备某武器时，将基础属性 + 该武器随机加成合并写入玩家战斗字段
// 注意：射击时 critRate 额外叠加该武器的暴击率加成（见射击逻辑）
export const applyWeaponStatsToPlayer = (prev: Player, weaponType: WeaponType): Player => {
  const cfg = WEAPONS[weaponType];
  const s = getWeaponAffixSummary(prev, weaponType);
  return {
    ...prev,
    weapon: weaponType,
    damage: Math.max(1, Math.floor(cfg.damage * (1 + s.damage / 100))),
    fireRate: Math.max(40, Math.floor(cfg.fireRate * (1 - s.fireRate / 100))),
    weaponRange: cfg.bulletRange,
    bulletSpeed: cfg.bulletSpeed,
    critRate: cfg.critRate,
    playerSpeed:
      1 + (cfg.playerSpeedBonus || 0) + (prev.playerSpeedBonus || 0) / 100 + s.moveSpeed / 100,
  };
};

// 获取当前装备武器的暴击率加成（百分比整数），射速计算时叠加
export const getEquippedWeaponCritPct = (player: Player): number =>
  getWeaponAffixSummary(player, player.weapon).critRate;

// 获取武器完整弹匣容量（基础 + 全局加成 + 该武器随机弹容量加成）
export const getWeaponMagazine = (player: Player, weaponType: WeaponType): number => {
  const cfg = WEAPONS[weaponType];
  return (
    cfg.magazineSize +
    (player.magazineSizeBonus || 0) +
    getWeaponAffixSummary(player, weaponType).magazine
  );
};

// 获得/装备一把武器：首次获得时抽取随机属性实例；已拥有则沿用；随后应用该武器属性并切换到它
export const acquireWeapon = (
  player: Player,
  weaponType: WeaponType,
  random: () => number = Math.random
): Player => {
  const weaponInstances = { ...(player.weaponInstances || {}) };
  if (!weaponInstances[weaponType]) weaponInstances[weaponType] = rollWeaponInstance(random);
  const merged = { ...player, weaponInstances };

  const alreadyOwned = player.weapons.includes(weaponType);
  const weapons: WeaponType[] = alreadyOwned ? player.weapons : [...player.weapons, weaponType];
  const newIndex = weapons.indexOf(weaponType);

  const weaponAmmo = { ...merged.weaponAmmo, [merged.weapon]: merged.currentAmmo };
  const mag = getWeaponMagazine(merged, weaponType);
  const currentAmmo = weaponAmmo[weaponType] ?? mag;

  return {
    ...applyWeaponStatsToPlayer(merged, weaponType),
    weapons,
    currentWeaponIndex: newIndex,
    weaponInstances,
    weaponAmmo,
    currentAmmo,
    weaponLevel: 1,
    isReloading: false,
    reloadStartTime: 0,
    reloadInterrupted: false,
  };
};

// 在“升级奖励”这类逐字段修改的可变对象流程中，将某一武器实例的全部属性写入 p 并返回（首次获得时抽取随机属性）
export const equipWeaponFields = (
  p: Player,
  weaponType: WeaponType,
  random: () => number = Math.random
): Player => {
  const weaponInstances =
    p.weaponInstances && p.weaponInstances[weaponType]
      ? p.weaponInstances
      : { ...(p.weaponInstances || {}), [weaponType]: rollWeaponInstance(random) };
  const pp = { ...p, weaponInstances };
  const s = getWeaponAffixSummary(pp, weaponType);
  const cfg = WEAPONS[weaponType];
  const weapons: WeaponType[] = pp.weapons.includes(weaponType)
    ? pp.weapons
    : [...pp.weapons, weaponType];
  return {
    ...pp,
    weapon: weaponType,
    weapons,
    currentWeaponIndex: weapons.indexOf(weaponType),
    weaponInstances,
    weaponLevel: 1,
    damage: Math.max(1, Math.floor(cfg.damage * (1 + s.damage / 100))),
    fireRate: Math.max(40, Math.floor(cfg.fireRate * (1 - s.fireRate / 100))),
    weaponRange: cfg.bulletRange,
    bulletSpeed: cfg.bulletSpeed,
    critRate: cfg.critRate,
    penetration: (pp.penetrationBonus || 0) + (weaponType === 'sniper' ? 1 : 0),
    playerSpeed:
      1 + (cfg.playerSpeedBonus || 0) + (pp.playerSpeedBonus || 0) / 100 + s.moveSpeed / 100,
    currentAmmo: cfg.magazineSize + (pp.magazineSizeBonus || 0) + s.magazine,
    isReloading: false,
    reloadStartTime: 0,
  };
};
