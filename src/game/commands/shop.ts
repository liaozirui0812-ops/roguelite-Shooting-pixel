import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import type { ShopItem } from '@/game';
import type { SoundType } from '@/hooks/useSound';
import { buildShopOffers } from '@/game/rules/offers';
import { buyShopOffer } from '@/game/rules/shop';
import { startLevel } from './level';

type Runtime = GameRuntime<GameWorld>;
type PlaySound = (soundType: SoundType) => void;

/** 生成商店商品 */
export function generateShopItems(runtime: Runtime) {
  const world = runtime.state;
  runtime.set(
    'shopItems',
    buildShopOffers(world.player, world.level, world.lockedItems, runtime.random, () =>
      runtime.nextId('shop')
    )
  );
}

/** 锁定/解锁当前商品 */
export function toggleLockItems(runtime: Runtime) {
  const world = runtime.state;
  if (world.lockedItems.length === 0) {
    // 锁定当前商品
    runtime.set('lockedItems', world.shopItems.map((item) => ({ ...item })));
  } else {
    // 解锁商品
    runtime.set('lockedItems', []);
  }
}

/** 进入商店 */
export function enterShop(runtime: Runtime) {
  const world = runtime.state;
  runtime.set('shopRefreshCount', 0);
  // 计算首次刷新价格
  const firstRefreshPrice = 5 + Math.floor(world.level / 2);
  runtime.set('shopRefreshPrice', firstRefreshPrice);
  generateShopItems(runtime);
  runtime.set('gameState', 'shop');
}

/** 刷新商店商品 */
export function refreshShop(runtime: Runtime) {
  const world = runtime.state;
  if (world.gameState !== 'shop') return;
  if (world.player.gold < world.shopRefreshPrice) return;

  runtime.set('player', (prev) => ({ ...prev, gold: prev.gold - world.shopRefreshPrice }));

  const newRefreshCount = world.shopRefreshCount + 1;
  runtime.set('shopRefreshCount', newRefreshCount);

  // 计算新的刷新价格
  const newRefreshPrice = Math.floor(world.shopRefreshPrice * 1.2);
  runtime.set('shopRefreshPrice', newRefreshPrice);

  generateShopItems(runtime);
}

/** 购买商品 */
export function buyShopItem(runtime: Runtime, item: ShopItem, playSound: PlaySound) {
  if (buyShopOffer(runtime, item.id)) playSound('coin');
}

/** 退出商店 */
export function exitShop(runtime: Runtime, playSound: PlaySound) {
  const world = runtime.state;
  if (world.gameState !== 'shop') return;
  // 不要清空锁定列表，让锁定商品跨关卡保留
  runtime.transaction(() => {
    const nextLevel = world.level + 1;
    runtime.set('level', nextLevel);
    startLevel(runtime, playSound, nextLevel);
    runtime.set('gameState', 'playing');
  });
}
