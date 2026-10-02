import type { GameWorld } from './World';

export type GameView = Pick<
  GameWorld,
  | 'gameState'
  | 'isPaused'
  | 'player'
  | 'availableUpgrades'
  | 'upgradeRefreshCount'
  | 'shopItems'
  | 'lockedItems'
  | 'shopRefreshPrice'
  | 'level'
  | 'score'
  | 'bossAlive'
  | 'bossCurrentHp'
  | 'bossMaxHp'
>;

/** Only UI data is copied; bullets/monsters/particles remain owned by the simulation. */
export function createGameView(world: GameWorld): GameView {
  return structuredClone({
    gameState: world.gameState,
    isPaused: world.isPaused,
    player: world.player,
    availableUpgrades: world.availableUpgrades,
    upgradeRefreshCount: world.upgradeRefreshCount,
    shopItems: world.shopItems,
    lockedItems: world.lockedItems,
    shopRefreshPrice: world.shopRefreshPrice,
    level: world.level,
    score: world.score,
    bossAlive: world.bossAlive,
    bossCurrentHp: world.bossCurrentHp,
    bossMaxHp: world.bossMaxHp,
  });
}
