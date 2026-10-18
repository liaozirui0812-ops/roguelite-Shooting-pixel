import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import type { MuzzleFlash, WeaponType } from '@/game';
import type { SoundType } from '@/hooks/useSound';
import { resetRunWorld } from '@/game/runtime/createRun';
import { startLevel } from './level';

type Runtime = GameRuntime<GameWorld>;

/**
 * 跨局重置所需的页面 ref 集合（R17 摊销合同的显式化）。
 * 这些 ref 的所有权仍在页面组件，跨开局不重建；命令只负责在开新局时复位它们。
 */
export interface RunResetRefs {
  dashRef: {
    current: {
      active: boolean;
      startTime: number;
      fromX: number;
      fromY: number;
      dirX: number;
      dirY: number;
      recoveryStart: number;
    };
  };
  dashCooldownStartRef: { current: number };
  dashPendingRef: { current: boolean };
  cameraInitRef: { current: boolean };
  muzzleFlashesRef: { current: MuzzleFlash[] };
  recoilRef: { current: { backward: number; upward: number; shake: number } };
  screenShakeRef: { current: number };
  levelCompleteTimeoutRef: { current: number | undefined };
}

export interface StartGameDeps {
  playSound: (soundType: SoundType) => void;
  /** 重新生成障碍物与地图背景（页面持有图片资源，命令不接管） */
  regenerateMap: () => void;
}

/** 开始游戏（选择武器后） */
export function startGameWithWeapon(
  runtime: Runtime,
  weaponType: WeaponType,
  refs: RunResetRefs,
  deps: StartGameDeps
) {
  const { playSound, regenerateMap } = deps;
  // 播放按钮点击音效
  playSound('button_click');

  // 重置闪现技能冷却与位移状态
  runtime.set('dashCooldown', 0);
  refs.dashCooldownStartRef.current = 0;
  refs.dashRef.current = {
    active: false,
    startTime: 0,
    fromX: 0,
    fromY: 0,
    dirX: 0,
    dirY: 0,
    recoveryStart: 0,
  };
  refs.dashPendingRef.current = false;

  // 清除关卡完成的延迟定时器
  if (refs.levelCompleteTimeoutRef.current) {
    runtime.cancel(refs.levelCompleteTimeoutRef.current);
    refs.levelCompleteTimeoutRef.current = undefined;
  }

  resetRunWorld(runtime, weaponType);
  refs.cameraInitRef.current = false;
  regenerateMap();
  startLevel(runtime, playSound, 1); // 传入关卡参数 1，确保生成第一关的怪物
  refs.muzzleFlashesRef.current = [];
  refs.recoilRef.current = { backward: 0, upward: 0, shake: 0 };
  refs.screenShakeRef.current = 0;
  runtime.set('gameState', 'playing');
}

/** 重新开始（回到选枪界面） */
export function restartGame(runtime: Runtime) {
  runtime.set('gameState', 'weaponSelect');
}
