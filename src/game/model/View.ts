import { MONSTER_CONFIGS } from '@/game/config/monsters';
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
> & { bossName: string; bossLegs: { id: string; hp: number; maxHp: number }[] };

/** Only UI data is copied; bullets/monsters/particles remain owned by the simulation. */
export function createGameView(world: GameWorld): GameView {
  const boss = [...world.monsters, ...world.pendingMonsterBatches.flat()].find(m => m.isBoss && !m.isDying);
  return structuredClone({
    bossName: boss ? MONSTER_CONFIGS[boss.monsterType].name : '',
    bossLegs: boss?.boss?.kind === 'mech' ? boss.boss.legs.map(({ id, hp, maxHp }) => ({ id, hp, maxHp })) : [],
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
