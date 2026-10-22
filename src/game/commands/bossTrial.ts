import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import { createMonster } from '@/game/runtime/createMonster';
import { MONSTER_CONFIGS } from '@/game/config/monsters';
/** Explicit isolated trial, called after the existing new-run reset and weapon selection. */
export function startBossTrial(runtime: GameRuntime<GameWorld>, kind: string | null) {
    const type = kind === 'slime' ? 5 : kind === 'boar' ? 6 : kind === 'mech' ? 7 : null;
    if (type === null)
        return false;
    const { player } = runtime.state;
    const monster = createMonster({ id: runtime.nextId('trial-boss'), monsterType: type, x: player.x + 130, y: player.y - 150, now: runtime.now() });
    runtime.transaction(() => {
        runtime.set('level', 5);
        runtime.set('monsters', [monster]);
        runtime.set('pendingMonsterBatches', []);
        runtime.set('nextBatchTime', null);
        runtime.set('waveTransition', null);
        runtime.set('thisLevelWaveTotal', 1);
        runtime.set('currentBatchInitialCount', 1);
        runtime.set('totalMonstersToSpawn', 1);
        runtime.set('monstersRemaining', 1);
        runtime.set('bossAlive', true);
        runtime.set('bossCurrentHp', MONSTER_CONFIGS[type].hp);
        runtime.set('bossMaxHp', MONSTER_CONFIGS[type].hp);
    });
    return true;
}
