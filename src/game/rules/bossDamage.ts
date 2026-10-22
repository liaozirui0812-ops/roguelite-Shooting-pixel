import type { Monster } from '@/game/model/types';
import { MECH } from '@/game/config/bosses';
export interface BossDamageTarget {
    core: boolean;
    legIds: readonly string[];
    now: number;
}
/** Affixes/critical rolls have already resolved once. This only distributes that budget. */
export function distributeBossDamage(monster: Monster, amount: number, hit: BossDamageTarget | undefined, source: string) {
    const state = monster.boss;
    if (state?.kind !== 'mech')
        return { monster, actualDamage: amount, partDamage: 0, brokenLegs: [] as string[] };
    const brokenLegs: string[] = [];
    let partDamage = 0;
    const legIds = new Set(hit?.legIds);
    const eligible = state.legs.filter(leg => leg.hp > 0 && legIds.has(leg.id));
    const legs = state.legs.map(leg => {
        if (!eligible.includes(leg))
            return leg;
        const damage = Math.min(leg.hp, amount / eligible.length);
        partDamage += damage;
        const hp = Math.max(0, leg.hp - damage);
        if (hp === 0)
            brokenLegs.push(leg.id);
        return { ...leg, hp, brokenAt: hp === 0 ? hit!.now : leg.brokenAt };
    });
    const core = hit?.core ?? true;
    const transferred = core ? amount : eligible.length ? (source === 'explosion' ? partDamage : amount) * MECH.legTransfer : 0;
    return { monster: { ...monster, boss: { ...state, legs } }, actualDamage: Math.min(monster.hp, transferred * (state.exposed ? MECH.exposedMultiplier : 1)), partDamage, brokenLegs };
}
