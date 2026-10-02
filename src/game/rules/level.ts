import type { GameWorld } from '@/game/model/World';

export function canCompleteLevel(world: GameWorld) {
  if (world.gameState !== 'playing' || world.isPaused || world.levelCompletionTriggered)
    return false;
  if (world.monsters.some((monster) => !monster.isDying) || world.pendingMonsterBatches.length > 0)
    return false;
  return world.level !== 5 || !world.bossAlive;
}
