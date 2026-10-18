import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import type { SoundType } from '@/hooks/useSound';
import { spawnMonsterWaves } from '@/game/systems/spawnMonsters';

type Runtime = GameRuntime<GameWorld>;
type PlaySound = (soundType: SoundType) => void;

/**
 * 开始新关卡（支持指定关卡参数）。
 * 由 B1.4 从 page.tsx 机械抽取：world 通过 runtime.state 在调用时读取，与页面闭包语义一致。
 */
export function startLevel(runtime: Runtime, playSound: PlaySound, targetLevel?: number) {
  const world = runtime.state;
  // 播放关卡开始音效
  playSound('level_start');

  const actualLevel = targetLevel !== undefined ? targetLevel : world.level;
  const baseWeight = 3;
  // 总权重：关卡1=3, 关卡2=4, 关卡3+=7/9/11...
  let totalWeight = baseWeight + (actualLevel - 1) * 2;
  if (actualLevel === 2) {
    totalWeight = 4; // 第二关特殊处理，减少怪物数量
  }
  // 血量倍率公式：HP = (1.1 + 0.10 × (L - 3) + 0.035 × (L - 3)²) × 1.25
  // ×1.25 用于补偿数量下降20%（数量×血量≈恒定，维持每关战斗时长）
  const levelDiff = actualLevel - 3;
  const hpMultiplier = (1.1 + 0.1 * levelDiff + 0.035 * levelDiff * levelDiff) * 1.25;

  // 重置关卡完成标记
  runtime.set('levelCompletionTriggered', false);

  // 重置分批生成状态
  runtime.set('pendingMonsterBatches', []);
  runtime.set('currentBatchInitialCount', 0);
  runtime.set('nextBatchTime', null);
  runtime.set('totalMonstersToSpawn', 0);
  runtime.set('thisLevelWaveTotal', 0);
  runtime.set('waveTransition', null);

  // 重置BOSS状态（如果不是第5关）
  if (actualLevel !== 5) {
    runtime.set('bossAlive', false);
    runtime.set('bossCurrentHp', 1560);
    runtime.set('bossMaxHp', 1560);
  }

  spawnMonsterWaves(
    runtime,
    totalWeight,
    hpMultiplier,
    world.player.enemySpeedMultiplier,
    actualLevel,
    world.player.x,
    world.player.y,
    playSound
  );
  // monstersRemaining会在spawnMonsters中设置
}
