import type { Monster } from '@/game/model/types';
import type { GameWorld } from '@/game/model/World';
import type { GameRuntime } from '@/game/runtime/GameRuntime';

/** The only alive-to-dead transition and score award. Source-specific loot remains explicit. */
export function settleEnemyDeath(runtime: GameRuntime<GameWorld>, target: Monster) {
  if (target.isDying || !runtime.claimDeath(target.id)) return false;
  const now = runtime.now();
  runtime.set('score', (score) => score + 10);
  runtime.set('monsters', (monsters) =>
    monsters.map((monster) =>
      monster.id === target.id ? { ...monster, hp: 0, isDying: true, deathTime: now } : monster
    )
  );
  return true;
}
