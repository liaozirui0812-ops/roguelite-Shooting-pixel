import type { Monster } from '@/game/model/types';
import { AffixSystem } from '@/game/systems/affixes';

export interface DamageEvent {
  target: Monster;
  amount: number;
  source: 'projectile' | 'explosion' | 'selfDestruct' | 'poisonCircle' | 'dot' | 'aura';
  interceptAffix: boolean;
  respectInvincible: boolean;
}

/** Source policy is explicit: preserve DOT/poison bypass behavior during migration. */
export function resolveMonsterDamage(event: DamageEvent) {
  const { target, amount, interceptAffix, respectInvincible } = event;
  if (target.isDying || (respectInvincible && target.isInvincible)) {
    return { monster: target, actualDamage: 0, blocked: true, hp: target.hp };
  }
  const result = interceptAffix
    ? AffixSystem.onDamage(target, amount)
    : { monster: target, actualDamage: amount, blocked: false };
  return { ...result, hp: result.monster.hp - result.actualDamage };
}
