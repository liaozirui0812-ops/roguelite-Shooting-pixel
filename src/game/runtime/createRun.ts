import type { WeaponType } from '@/game/model/types';
import type { GameWorld } from '@/game/model/World';
import { createWorld } from '@/game/model/World';
import { createPlayer } from './createPlayer';
import type { GameRuntime } from './GameRuntime';

/** Fresh run data. Settings, assets, audio and camera refs are outside the World. */
export function createRun(weapon: WeaponType): GameWorld {
  return { ...createWorld(), player: createPlayer(weapon), gameState: 'weaponSelect' };
}
export function resetRunWorld(runtime: GameRuntime<GameWorld>, weapon: WeaponType) {
  const fresh = createRun(weapon);
  fresh.gameState = runtime.state.gameState;
  runtime.resetRun();
  runtime.transaction(() => {
    for (const key of Object.keys(fresh) as Array<keyof GameWorld>) runtime.set(key, fresh[key]);
  });
}
