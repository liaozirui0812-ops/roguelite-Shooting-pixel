import type { GameWorld } from '@/game/model/World';
import type { GameRuntime } from '@/game/runtime/GameRuntime';
import { GROWTH_CHAIN_NODES } from './growth';
import { SHOP_ITEM_CONFIGS } from './rewards';

/** Consume the authoritative offer, never a stale UI copy, in one transaction. */
export function buyShopOffer(runtime: GameRuntime<GameWorld>, offerId: string) {
  let purchased = false;
  runtime.transaction(() => {
    const world = runtime.state;
    const offer = world.shopItems.find((item) => item.id === offerId);
    if (world.gameState !== 'shop' || !offer || world.player.gold < offer.price) return;
    const player = offer.growthChainNode
      ? GROWTH_CHAIN_NODES[offer.growthChainNode].apply(world.player)
      : SHOP_ITEM_CONFIGS[offer.type].apply(world.player, offer.value, runtime.random);
    runtime.set('player', { ...player, gold: world.player.gold - offer.price });
    runtime.set('shopItems', (items) => items.filter((item) => item.id !== offerId));
    runtime.set('lockedItems', (items) => items.filter((item) => item.id !== offerId));
    purchased = true;
  });
  return purchased;
}
