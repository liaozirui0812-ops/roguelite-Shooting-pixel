import type { Player } from '@/game/model/types';
import { GAME_CONFIG } from '@/game/config/base';
import { WEAPONS } from '@/game/config/weapons';
import {
  getEffectiveCritRate,
  getEffectiveCritDamageBonus,
  getEffectiveReloadTime,
  isDesperateFightActive,
} from './stats';
import { getEquippedWeaponCritPct, getWeaponMagazine } from './weapons';
import { hasGrowthChainNode } from './growth';

/** Shared by simulation and attribute/HUD rendering; bonus bookkeeping is not applied twice. */
export function deriveCombatStats(player: Player, now: number) {
  const weapon = WEAPONS[player.weapon];
  const desperate = isDesperateFightActive(player);
  const reloadBonus = player.reloadSpeedBonus + (desperate ? 30 : 0);
  const hitSlow =
    player.isHit && now - player.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION
      ? GAME_CONFIG.HIT_SLOWDOWN_FACTOR
      : 1;
  return {
    rawCritRate:
      weapon.critRate +
      (player.critRateBonus + getEquippedWeaponCritPct(player) + (desperate ? 20 : 0)) / 100,
    rawCritDamage: 1.5 + (player.critDamageBonus + (desperate ? 100 : 0)) / 100,
    rawCritDamageBonus: player.critDamageBonus + (desperate ? 100 : 0),
    maxHp: player.maxHp,
    damage: player.damage,
    critRate: getEffectiveCritRate(
      weapon.critRate,
      player.critRateBonus + getEquippedWeaponCritPct(player) + (desperate ? 20 : 0)
    ),
    critDamage: getEffectiveCritDamageBonus(1.5, player.critDamageBonus + (desperate ? 100 : 0)),
    fireInterval: player.fireRate * (desperate ? 0.7 : 1),
    reloadTime:
      getEffectiveReloadTime(weapon, reloadBonus) *
      (player.weapon === 'pistol' && hasGrowthChainNode(player, 'pistol_final_strike_chain')
        ? 1.4
        : 1),
    moveSpeed:
      (player.playerSpeed + (desperate ? 1 : 0)) * (weapon.playerSpeedMultiplier ?? 1) * hitSlow,
    range: player.weaponRange,
    penetration: player.penetration,
    magazineSize:
      player.weapon === 'rpg'
        ? hasGrowthChainNode(player, 'rpg_dual_barrel')
          ? 2
          : weapon.magazineSize
        : getWeaponMagazine(player, player.weapon),
  };
}
