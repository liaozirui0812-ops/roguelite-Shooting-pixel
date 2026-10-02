import type { Player, UpgradeType } from '@/game/model/types';
import { MAX_VALUES } from '@/game/config/base';
import { SHOP_EFFECTS } from '@/game/rules/effects';
import { equipWeaponFields } from '@/game/rules/weapons';

export function applyUpgradeEffect(
  prev: Player,
  upgradeId: UpgradeType,
  value: number,
  random: () => number = Math.random
): Player {
  const newPlayer = { ...prev };
  switch (upgradeId) {
    case 'maxHp':
      Object.assign(newPlayer, SHOP_EFFECTS.maxHp(prev, value, random));
      break;
    case 'damage':
      const oldDamage = prev.damage;
      const damageMultiplier = 1 + value / 100;
      newPlayer.damage = Math.floor(prev.damage * damageMultiplier);
      newPlayer.damageBonus = prev.damageBonus + (newPlayer.damage - oldDamage);
      break;
    case 'fireRate':
      const fireRateMultiplier = 1 - value / 100;
      newPlayer.fireRate = Math.max(50, Math.floor(prev.fireRate * fireRateMultiplier));
      newPlayer.fireRateBonus = prev.fireRateBonus + value;
      break;
    case 'playerSpeed':
      newPlayer.playerSpeed = Math.min(prev.playerSpeed + value, MAX_VALUES.playerSpeed);
      newPlayer.playerSpeedBonus = prev.playerSpeedBonus + value * 100;
      break;
    case 'reloadTime':
      Object.assign(newPlayer, SHOP_EFFECTS.reloadTime(prev, value, random));
      break;
    case 'magazineSize':
      Object.assign(newPlayer, SHOP_EFFECTS.magazineSize(prev, value, random));
      break;
    case 'weaponRange':
      newPlayer.weaponRange = Math.min(prev.weaponRange + value, MAX_VALUES.weaponRange);
      newPlayer.weaponRangeBonus = prev.weaponRangeBonus + value * 100;
      break;
    case 'critRate':
      Object.assign(newPlayer, SHOP_EFFECTS.critRate(prev, value, random));
      break;
    case 'critDamage':
      Object.assign(newPlayer, SHOP_EFFECTS.critDamage(prev, value, random));
      break;
    case 'penetration':
      Object.assign(newPlayer, SHOP_EFFECTS.penetration(prev, value, random));
      break;
    case 'knockback':
      Object.assign(newPlayer, SHOP_EFFECTS.knockback(prev, value, random));
      break;
    case 'weapon_pistol':
      Object.assign(newPlayer, equipWeaponFields(newPlayer, 'pistol', random));
      break;
    case 'weapon_shotgun':
      Object.assign(newPlayer, equipWeaponFields(newPlayer, 'shotgun', random));
      break;
    case 'weapon_sniper':
      Object.assign(newPlayer, equipWeaponFields(newPlayer, 'sniper', random));
      break;
    case 'weapon_smg':
      Object.assign(newPlayer, equipWeaponFields(newPlayer, 'smg', random));
      break;
    case 'weapon_rpg':
      Object.assign(newPlayer, equipWeaponFields(newPlayer, 'rpg', random));
      break;
    case 'heal':
      newPlayer.hp = Math.min(prev.hp + value, prev.maxHp);
      break;
    case 'enemySlowdown':
      const enemySlowdownMultiplier = 1 - value / 100;
      newPlayer.enemySpeedMultiplier = Math.max(
        0.3,
        prev.enemySpeedMultiplier * enemySlowdownMultiplier
      );
      break;
    case 'gold_reward':
      newPlayer.gold = prev.gold + value;
      break;
    case 'weapon_upgrade':
      newPlayer.weaponLevel += 1;
      const weaponUpgradeMultiplier = 1 + value / 100;
      newPlayer.damage = Math.floor(prev.damage * weaponUpgradeMultiplier);
      const weaponUpgradeFireRateMultiplier = 1 - value / 100;
      newPlayer.fireRate = Math.max(
        50,
        Math.floor(prev.fireRate * weaponUpgradeFireRateMultiplier)
      );
      const weaponUpgradeRangeMultiplier = 1 + value / 100;
      newPlayer.weaponRange = Math.min(
        Math.floor(prev.weaponRange * weaponUpgradeRangeMultiplier),
        MAX_VALUES.weaponRange
      );
      newPlayer.bulletSpeed = Math.floor(prev.bulletSpeed * weaponUpgradeMultiplier);
      // 限制武器属性加成不超过最大值
      newPlayer.damageBonus = Math.min(newPlayer.damageBonus + value, MAX_VALUES.weaponUpgrade);
      newPlayer.fireRateBonus = Math.min(newPlayer.fireRateBonus + value, MAX_VALUES.weaponUpgrade);
      newPlayer.weaponRangeBonus = Math.min(
        newPlayer.weaponRangeBonus + value,
        MAX_VALUES.weaponUpgrade
      );
      break;
    case 'bulletSpeed':
      Object.assign(newPlayer, SHOP_EFFECTS.bulletSpeed(prev, value, random));
      break;
    case 'vampire':
      newPlayer.vampireLevel = prev.vampireLevel + 1;
      break;
    case 'ammoSupply':
      newPlayer.ammoSupplyLevel = prev.ammoSupplyLevel + 1;
      break;
    case 'desperateFight':
      newPlayer.desperateFightLevel = prev.desperateFightLevel + 1;
      break;
  }
  return newPlayer;
}
