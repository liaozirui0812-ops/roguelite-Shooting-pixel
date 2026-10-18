import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import type { SoundType } from '@/hooks/useSound';
import { canCompleteLevel } from '@/game/rules/level';
import { selectRandomUpgrades } from './upgrade';

type Runtime = GameRuntime<GameWorld>;

export interface LevelCompletionDeps {
  playSound: (soundType: SoundType) => void;
  stopBGM: () => void;
  /** 关卡完成延迟定时器持有处（页面 ref，跨渲染保留） */
  levelCompleteTimeoutRef: { current: number | undefined };
}

/**
 * 游戏主循环调用的关卡完成检测。
 * 由 B1.4 从 page.tsx 机械抽取；2 秒延迟仍走 runtime.schedule（模拟时钟），不是 setTimeout。
 */
export function checkLevelCompletion(runtime: Runtime, deps: LevelCompletionDeps) {
  const world = runtime.state;
  const { playSound, stopBGM, levelCompleteTimeoutRef } = deps;
  if (canCompleteLevel(world)) {
    // 标记关卡完成已触发
    runtime.set('levelCompletionTriggered', true);

    // 清除之前的延迟定时器
    if (levelCompleteTimeoutRef.current) {
      runtime.cancel(levelCompleteTimeoutRef.current);
    }

    // 延迟2秒后显示升级界面
    levelCompleteTimeoutRef.current = runtime.schedule(() => {
      // 使用 ref 获取最新的玩家状态
      const currentPlayer = world.player;
      if (currentPlayer) {
        selectRandomUpgrades(runtime, currentPlayer.weapon, world.level, currentPlayer);
        runtime.set('gameState', 'upgrade');
        runtime.set('upgradeRefreshCount', 0); // 重置刷新次数

        // 停止背景音乐
        stopBGM();

        // 播放关卡完成音效
        playSound('level_complete');
      }
    }, 2000);
  }
}
