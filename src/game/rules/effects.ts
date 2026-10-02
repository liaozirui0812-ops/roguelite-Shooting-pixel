import type { Player, ShopItemType } from '@/game/model/types';
import { MAX_VALUES } from '@/game/config/base';
import { acquireWeapon } from '@/game/rules/weapons';

/** Effect data is shared, while prices/labels stay in the offer configuration. */
export const SHOP_EFFECTS: Record<
  ShopItemType,
  (player: Player, value: number, random?: () => number) => Player
> = {
  critDamage: (player, value, random) => ({
    ...player,
    critDamage: player.critDamage + value / 100,
    critDamageBonus: player.critDamageBonus + value,
  }),
  critRate: (player, value, random) => ({
    ...player,
    critRate: Math.min(1.0, player.critRate + value / 100),
    critRateBonus: player.critRateBonus + value,
  }),
  magazineSize: (player, value, random) => ({
    ...player,
    magazineSizeBonus: player.magazineSizeBonus + value,
    currentAmmo: player.currentAmmo + value, // 同时也增加当前弹药
  }),
  fireRate: (player, value, random) => ({
    ...player,
    fireRate: Math.max(50, Math.floor(player.fireRate * (1 - (value * 0.3) / 100))),
    fireRateBonus: player.fireRateBonus + value,
  }),
  damage: (player, value, random) => ({
    ...player,
    damage: player.damage + value,
    damageBonus: player.damageBonus + value,
  }),
  playerSpeed: (player, value, random) => {
    const newPlayer = {
      ...player,
      playerSpeed: player.playerSpeed + value / 10,
      playerSpeedBonus: player.playerSpeedBonus + value,
    };
    return { ...newPlayer, playerSpeed: Math.min(newPlayer.playerSpeed, MAX_VALUES.playerSpeed) };
  },
  reloadTime: (player, value, random) => ({
    ...player,
    reloadSpeedBonus: player.reloadSpeedBonus + value,
  }),
  weaponRange: (player, value, random) => {
    const newPlayer = {
      ...player,
      weaponRange: player.weaponRange + value * 15,
      weaponRangeBonus: player.weaponRangeBonus + value,
    };
    return { ...newPlayer, weaponRange: Math.min(newPlayer.weaponRange, MAX_VALUES.weaponRange) };
  },
  maxHp: (player, value, random) => ({
    ...player,
    maxHp: player.maxHp + value,
    hp: player.hp + value,
    maxHpBonus: player.maxHpBonus + value,
  }),
  penetration: (player, value, random) => {
    const newPlayer = {
      ...player,
      penetration: player.penetration + value,
      penetrationBonus: player.penetrationBonus + value,
    };
    return { ...newPlayer, penetration: Math.min(newPlayer.penetration, MAX_VALUES.penetration) };
  },
  knockback: (player, value, random) => {
    return { ...player, knockback: Math.min(player.knockback + value, MAX_VALUES.knockback) };
  },
  weapon_pistol: (player, value, random) => acquireWeapon(player, 'pistol', random),
  weapon_smg: (player, value, random) => acquireWeapon(player, 'smg', random),
  weapon_sniper: (player, value, random) => acquireWeapon(player, 'sniper', random),
  weapon_shotgun: (player, value, random) => acquireWeapon(player, 'shotgun', random),
  weapon_rpg: (player, value, random) => acquireWeapon(player, 'rpg', random),
  bulletSpeed: (player, value, random) => ({
    ...player,
    bulletSpeed: Math.floor(player.bulletSpeed * (1 + value / 100)),
  }),
  fireBuff: (player, value, random) => ({ ...player, fireBuffLevel: player.fireBuffLevel + value }),
  poisonBuff: (player, value, random) => ({
    ...player,
    poisonBuffLevel: player.poisonBuffLevel + value,
  }),
  coinPickupRange: (player, value, random) => ({
    ...player,
    coinPickupRangeBonus: player.coinPickupRangeBonus + value,
  }),
  energyAura: (player, value, random) => ({
    ...player,
    energyAuraLevel: player.energyAuraLevel + value,
  }),
  executionBuff: (player, value, random) => ({
    ...player,
    executionLevel: player.executionLevel + value,
  }),
  criticalRage: (player, value, random) => ({
    ...player,
    criticalRageLevel: player.criticalRageLevel + value,
  }),
  vampire: (player, value, random) => ({ ...player, vampireLevel: player.vampireLevel + value }),
  ammoSupply: (player, value, random) => ({
    ...player,
    ammoSupplyLevel: player.ammoSupplyLevel + value,
  }),
  desperateFight: (player, value, random) => ({
    ...player,
    desperateFightLevel: player.desperateFightLevel + value,
  }),
  pistol_last_bullet_penetrate: (player, value, random) => ({
    ...player /* 手枪专属buff不需要修改player字段，通过成长链节点检测即可 */,
  }),
  pistol_final_strike: (player, value, random) => ({
    ...player /* 手枪专属buff不需要修改player字段，通过成长链节点检测即可 */,
  }),
  rpg_shockwave: (player, value, random) => ({
    ...player /* 火箭筒专属buff不需要修改player字段，通过成长链节点检测即可 */,
  }),
  rpg_ap_shot: (player, value, random) => ({
    ...player /* 火箭筒专属buff不需要修改player字段，通过成长链节点检测即可 */,
  }),
  rpg_dual_barrel: (player, value, random) => ({
    ...player /* 火箭筒专属buff不需要修改player字段，通过成长链节点检测即可 */,
  }),
};
