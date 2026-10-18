import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import type { Player, UpgradeType, WeaponType } from '@/game';
import type { SoundType } from '@/hooks/useSound';
import { GROWTH_CHAIN_NODES } from '@/game';
import { buildUpgradeOffers } from '@/game/rules/offers';
import { applyUpgradeEffect } from '@/game/rules/upgradeEffect';
import { enterShop } from './shop';

type Runtime = GameRuntime<GameWorld>;
type PlaySound = (soundType: SoundType) => void;

/** 随机选择升级选项（根据关卡动态计算权重和数值） */
export function selectRandomUpgrades(
  runtime: Runtime,
  weapon: WeaponType,
  level: number,
  player: Player
) {
  runtime.set('availableUpgrades', buildUpgradeOffers(weapon, level, player, runtime.random));
}

/** 刷新升级选项（每关固定刷新一次） */
export function refreshUpgrades(runtime: Runtime) {
  const world = runtime.state;
  if (world.upgradeRefreshCount >= 1) {
    console.warn('已达到本关刷新上限');
    return;
  }
  // 重新生成升级选项
  selectRandomUpgrades(runtime, world.player.weapon, world.level, world.player);
  runtime.set('upgradeRefreshCount', world.upgradeRefreshCount + 1);
}

/** 应用升级 */
export function applyUpgrade(runtime: Runtime, upgradeId: UpgradeType, playSound: PlaySound) {
  const world = runtime.state;
  if (world.gameState !== 'upgrade') return;
  // 播放按钮点击音效
  playSound('button_click');

  // 从 availableUpgrades 中找到对应的升级，获取其数值
  const upgrade = world.availableUpgrades.find((u) => u.id === upgradeId);
  if (!upgrade) return;

  // 检查是否是成长链节点升级
  if (upgrade.growthChainNode) {
    runtime.set('player', (prev) => {
      const node = GROWTH_CHAIN_NODES[upgrade.growthChainNode!];
      return node.apply(prev);
    });
    // 进入商店而不是直接开始下一关
    enterShop(runtime);
    return;
  }

  const value = upgrade.value;

  runtime.set('player', (prev) => applyUpgradeEffect(prev, upgradeId, value, runtime.random));
  // 进入商店而不是直接开始下一关
  enterShop(runtime);
}
