import type { Player, WeaponConfig } from '@/game/model/types';
import { MAX_VALUES, GAME_CONFIG } from '@/game/config/base';
import { WEAPONS } from '@/game/config/weapons';
import { getEquippedWeaponCritPct } from '@/game/rules/weapons';

// 计算有效暴击率（带软上限）
// 软上限机制：70%以下100%收益，70%以上超出部分50%收益，硬上限90%
export const getEffectiveCritRate = (baseCritRate: number, critRateBonus: number): number => {
  // 注意：critRateBonus 为百分比整数（如 4 表示 +4%），需除以 100 转成小数再与 baseCritRate 相加
  const critRaw = baseCritRate + critRateBonus / 100;
  let critEff: number;

  if (critRaw <= 0.7) {
    // 70%以下：100%收益
    critEff = critRaw;
  } else if (critRaw <= 1.1) {
    // 70%-110%：超出部分50%收益
    critEff = 0.7 + (critRaw - 0.7) * 0.5;
  } else {
    // 110%以上：硬上限90%
    critEff = 0.9;
  }

  return Math.min(1.0, critEff);
};

// 获取有效暴击伤害加成（带软上限）
// baseCritDamage: 基础暴击伤害（1.5表示150%）
// critDamageBonus: 暴击伤害加成（原始百分比，如100表示100%）
export const getEffectiveCritDamageBonus = (
  baseCritDamage: number,
  critDamageBonus: number
): number => {
  // 软上限机制：额外加成 ≤ 150%：100%收益，超出部分50%收益
  let effectiveBonus: number;

  if (critDamageBonus <= 150) {
    // 150%以下：100%收益
    effectiveBonus = critDamageBonus;
  } else {
    // 150%以上：超出部分50%收益
    effectiveBonus = 150 + (critDamageBonus - 150) * 0.5;
  }

  // 返回有效暴击伤害（基础值 + 有效加成）
  return baseCritDamage + effectiveBonus / 100;
};

// 检测是否处于狂暴状态（险中取胜buff）
export const isDesperateFightActive = (player: Player): boolean => {
  if (player.desperateFightLevel <= 0) return false;
  return player.hp < player.maxHp * 0.2;
};

// 辅助函数：计算实际换弹时间（双曲线递减）
// reload = max(250ms, base_reload / (1 + 0.01 × reloadSpeed%))
export const getEffectiveReloadTime = (weapon: WeaponConfig, reloadSpeedBonus: number): number => {
  const baseReload = weapon.reloadTime;
  const speedMultiplier = 1 + reloadSpeedBonus / 100;
  const calculatedReload = baseReload / speedMultiplier;
  return Math.floor(Math.max(250, calculatedReload));
};

// 检查属性是否已达到最大值
export const isAtMaxValue = (player: Player, type: string): boolean => {
  switch (type) {
    case 'playerSpeed':
      return player.playerSpeed >= MAX_VALUES.playerSpeed;
    case 'weaponRange':
      return player.weaponRange >= MAX_VALUES.weaponRange;
    case 'penetration':
      return player.penetration >= MAX_VALUES.penetration;
    case 'knockback':
      return player.knockback >= MAX_VALUES.knockback;
    case 'weapon_upgrade':
      // 检查武器属性加成是否已达到最大值
      const totalWeaponBonus = Math.max(
        player.damageBonus,
        player.fireRateBonus,
        player.weaponRangeBonus
      );
      return totalWeaponBonus >= MAX_VALUES.weaponUpgrade;
    case 'critRate':
      // 检查暴击率是否已达到软上限（原始值达到110%）
      // 注意：player.critRateBonus 为百分比整数（如 4 表示 +4%），需除以 100 转成小数再相加
      const rawCritRate =
        WEAPONS[player.weapon].critRate +
        (player.critRateBonus + getEquippedWeaponCritPct(player)) / 100;
      return rawCritRate >= MAX_VALUES.critRate;
    case 'critDamage':
      // 检查暴击伤害是否已达到软上限（原始额外加成达到150%）
      return player.critDamageBonus >= MAX_VALUES.critDamageBonus * 100;
    case 'coinPickupRange':
      // 检查金币拾取范围是否已达到最大值（初始范围的500%）
      return player.coinPickupRangeBonus >= GAME_CONFIG.COIN_PICKUP_RANGE_MAX_BONUS;
    default:
      return false;
  }
};

// 获取格式化的最大值显示文本
export const getMaxValueDisplay = (type: string, baseName: string): string => {
  switch (type) {
    case 'playerSpeed':
      return `${baseName} ${MAX_VALUES.playerSpeed}(Max)`;
    case 'weaponRange':
      return `${baseName} ${MAX_VALUES.weaponRange}(Max)`;
    case 'penetration':
      return `${baseName} ${MAX_VALUES.penetration}(Max)`;
    case 'weapon_upgrade':
      return `${baseName} Lv${MAX_VALUES.weaponUpgrade}(Max)`;
    case 'critRate':
      // 暴击率软上限：显示原始值和有效值
      return `${baseName} 110%/90%(Max)`;
    case 'critDamage':
      // 暴击伤害软上限：显示原始值和有效值
      return `${baseName} 300%/225%(Max)`;
    default:
      return baseName;
  }
};

// 应用属性加成并限制最大值
export const applyWithMaxValue = (
  player: Player,
  type: string,
  value: number,
  applyFn: (p: Player, v: number) => Player
): Player => {
  const newPlayer = applyFn(player, value);

  // 根据类型限制最大值
  switch (type) {
    case 'playerSpeed':
      return { ...newPlayer, playerSpeed: Math.min(newPlayer.playerSpeed, MAX_VALUES.playerSpeed) };
    case 'weaponRange':
      return { ...newPlayer, weaponRange: Math.min(newPlayer.weaponRange, MAX_VALUES.weaponRange) };
    case 'penetration':
      return { ...newPlayer, penetration: Math.min(newPlayer.penetration, MAX_VALUES.penetration) };
    case 'critRate':
      return { ...newPlayer, critRate: Math.min(newPlayer.critRate, MAX_VALUES.critRate) };
    case 'critDamage':
      return {
        ...newPlayer,
        critDamageBonus: Math.min(newPlayer.critDamageBonus, MAX_VALUES.critDamageBonus * 100),
      };
    case 'weapon_upgrade':
      // 确保武器属性加成不超过最大值
      return {
        ...newPlayer,
        damageBonus: Math.min(newPlayer.damageBonus, MAX_VALUES.weaponUpgrade),
        fireRateBonus: Math.min(newPlayer.fireRateBonus, MAX_VALUES.weaponUpgrade),
        weaponRangeBonus: Math.min(newPlayer.weaponRangeBonus, MAX_VALUES.weaponUpgrade),
      };
    default:
      return newPlayer;
  }
};
