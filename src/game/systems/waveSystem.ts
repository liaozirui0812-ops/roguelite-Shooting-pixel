import { GAME_CONFIG } from '@/game';

import type { UpdateWorldContext, TickContext } from './context';

export function waveSystem(context: UpdateWorldContext, tick: TickContext) {
  const {
    world,
    setWaveTransition,
    runtime,
    setMonsters,
    setCurrentBatchInitialCount,
    setMonstersRemaining,
    setPendingMonsterBatches,
    setNextBatchTime,
  } = context;
  const { now } = tick;
  // 分批敌人生成检查

  // 检查是否需要生成下一批敌人
  if (world.pendingMonsterBatches.length > 0) {
    const shouldSpawnByTime = world.nextBatchTime && now >= world.nextBatchTime;
    const currentAliveMonsters = world.monsters.filter((m) => !m.isDying).length;
    const shouldSpawnByCount =
      world.currentBatchInitialCount > 0 &&
      currentAliveMonsters < world.currentBatchInitialCount * 0.3;

    if (shouldSpawnByTime || shouldSpawnByCount) {
      // 无进行中的波次衔接时才进入交接（先公告+倒计时，再生成下一批）
      if (!world.waveTransition) {
        const nextBatch = world.pendingMonsterBatches[0];
        const incomingWaveNumber = Math.max(
          2,
          world.thisLevelWaveTotal - world.pendingMonsterBatches.length + 1
        );
        setWaveTransition({
          startTime: now,
          waveNumber: incomingWaveNumber,
          enemyCount: nextBatch.length,
        });
      }
    }

    // 波次衔接推进：公告停留2秒→淡出0.3秒→间隔0.5秒→3/2/1倒计时各1秒→生成下一批
    if (world.waveTransition) {
      const ANNOUNCE_HOLD = 2000; // “第X波”停留2秒
      const ANNOUNCE_FADE = 300; // 淡出0.3秒
      const COUNTDOWN_DELAY = 500; // 淡出后间隔0.5秒
      const COUNTDOWN_TOTAL = 3000; // 3/2/1各1秒
      const WAVE_DELAY = 4000; // 波间延迟4秒
      const WAVE_SPAWN_TIME =
        WAVE_DELAY + ANNOUNCE_HOLD + ANNOUNCE_FADE + COUNTDOWN_DELAY + COUNTDOWN_TOTAL;
      const waveElapsed = now - world.waveTransition.startTime;

      if (waveElapsed >= WAVE_SPAWN_TIME && world.pendingMonsterBatches.length > 0) {
        // 倒计时结束，生成下一批敌人
        const nextBatch = world.pendingMonsterBatches[0];
        const screenWidth = 1280;
        const screenHeight = 720;
        const margin = 100;
        const repositionedMonsters = nextBatch.map((monster) => {
          let x, y;
          let attempts = 0;
          const maxAttempts = 20;
          let validPosition = false;
          do {
            const direction = Math.floor(runtime.random() * 4);
            switch (direction) {
              case 0: // 上方
                x = world.player.x + (runtime.random() - 0.5) * screenWidth * 1.5;
                y = world.player.y - screenHeight / 2 - margin - runtime.random() * 100;
                break;
              case 1: // 下方
                x = world.player.x + (runtime.random() - 0.5) * screenWidth * 1.5;
                y = world.player.y + screenHeight / 2 + margin + runtime.random() * 100;
                break;
              case 2: // 左方
                x = world.player.x - screenWidth / 2 - margin - runtime.random() * 100;
                y = world.player.y + (runtime.random() - 0.5) * screenHeight * 1.5;
                break;
              default: // 右方
                x = world.player.x + screenWidth / 2 + margin + runtime.random() * 100;
                y = world.player.y + (runtime.random() - 0.5) * screenHeight * 1.5;
                break;
            }
            x = Math.max(30, Math.min(GAME_CONFIG.WORLD_WIDTH - 30, x));
            y = Math.max(30, Math.min(GAME_CONFIG.WORLD_HEIGHT - 30, y));
            const isOutsideScreen =
              Math.abs(x - world.player.x) > screenWidth / 2 + margin * 0.5 ||
              Math.abs(y - world.player.y) > screenHeight / 2 + margin * 0.5;
            if (attempts > 15 || isOutsideScreen) validPosition = true;
            attempts++;
          } while (!validPosition && attempts < maxAttempts);
          if (!validPosition) {
            if (runtime.random() < 0.5) {
              x = runtime.random() < 0.5 ? 50 : GAME_CONFIG.WORLD_WIDTH - 50;
              y = runtime.random() * GAME_CONFIG.WORLD_HEIGHT;
            } else {
              x = runtime.random() * GAME_CONFIG.WORLD_WIDTH;
              y = runtime.random() < 0.5 ? 50 : GAME_CONFIG.WORLD_HEIGHT - 50;
            }
          }
          return {
            ...monster,
            id: monster.id,
            x,
            y,
          };
        });

        // 添加新敌人
        setMonsters((prev) => [...prev, ...repositionedMonsters]);
        setCurrentBatchInitialCount(repositionedMonsters.length);
        setMonstersRemaining((prev) => prev + repositionedMonsters.length);
        const newPendingLength = world.pendingMonsterBatches.length - 1;
        setPendingMonsterBatches((prev) => prev.slice(1));
        if (newPendingLength > 0) {
          setNextBatchTime(now + 15000);
        } else {
          setNextBatchTime(null);
        }
        setWaveTransition(null);
      }
    }
  }
}
