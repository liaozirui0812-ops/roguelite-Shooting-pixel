import {
  GAME_CONFIG,
  MONSTER_CONFIGS,
  AFFIX_SPAWN_CONFIG,
  getAffixSpawnChance,
  rollAffixType,
  AffixSystem,
} from '@/game';
import type { Monster, MonsterType } from '@/game/model/types';
import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import type { SoundType } from '@/hooks/useSound';
import { createMonster } from '@/game/runtime/createMonster';

export function spawnMonsterWaves(
  runtime: GameRuntime<GameWorld>,
  totalWeight: number,
  hpMultiplier: number,
  enemySpeedMultiplier = 1,
  currentLevel = 1,
  playerX?: number,
  playerY?: number,
  playSound: (sound: SoundType) => void = () => {}
) {
  const setBossAlive = runtime.setter('bossAlive');
  const setBossCurrentHp = runtime.setter('bossCurrentHp');
  const setBossMaxHp = runtime.setter('bossMaxHp');
  const setTotalMonstersToSpawn = runtime.setter('totalMonstersToSpawn');
  const setThisLevelWaveTotal = runtime.setter('thisLevelWaveTotal');
  const setMonsters = runtime.setter('monsters');
  const setCurrentBatchInitialCount = runtime.setter('currentBatchInitialCount');
  const setMonstersRemaining = runtime.setter('monstersRemaining');
  const setPendingMonsterBatches = runtime.setter('pendingMonsterBatches');
  const setNextBatchTime = runtime.setter('nextBatchTime');

  // 首先生成所有敌人配置
  const allMonsters: Monster[] = [];

  // 计算玩家视角范围，用于智能生成怪物位置
  const viewLeft = (playerX ?? GAME_CONFIG.WORLD_WIDTH / 2) - GAME_CONFIG.CANVAS_WIDTH / 2;
  const viewRight = (playerX ?? GAME_CONFIG.WORLD_WIDTH / 2) + GAME_CONFIG.CANVAS_WIDTH / 2;
  const viewTop = (playerY ?? GAME_CONFIG.WORLD_HEIGHT / 2) - GAME_CONFIG.CANVAS_HEIGHT / 2;
  const viewBottom = (playerY ?? GAME_CONFIG.WORLD_HEIGHT / 2) + GAME_CONFIG.CANVAS_HEIGHT / 2;
  const SPAWN_RANGE = 2000; // 在视角范围外2000px内生成

  // 每权重生成的怪物数量（向下取整，最低为1）
  const monstersPerWeight: Record<MonsterType, number> = {
    1: Math.max(1, Math.floor(3 + currentLevel * 0.8)), // 标准敌人：3 + level × 0.8（原1.0，降20%）
    2: Math.max(1, Math.floor(3 + currentLevel * 0.64)), // 中型敌人：3 + level × 0.64（原0.8，降20%）
    3: Math.max(1, Math.floor(1 + currentLevel * 0.4)), // 大型敌人：1 + level × 0.4（原0.5，降20%）
    4: Math.max(1, Math.floor(2 + currentLevel * 0.48)), // 远程敌人：2 + level × 0.48（原0.6，降20%）
    5: 1, // BOSS：1个
  };

  // 根据关卡数分配权重
  const weightDistribution: Record<MonsterType, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (let i = 0; i < totalWeight; i++) {
    const rand = runtime.random();
    let monsterType: MonsterType;

    if (currentLevel === 1) {
      // 第一关只有类型1
      monsterType = 1;
    } else if (currentLevel === 2) {
      // 第二关：保证类型2至少有1个权重，剩余按概率分配
      // 前i次已经分配给类型2的情况
      if (weightDistribution[2] === 0 && i === totalWeight - 1) {
        // 最后一次还没分配给类型2，强制分配
        monsterType = 2;
      } else {
        // 80% 类型1，20% 类型2
        monsterType = rand < 0.8 ? 1 : 2;
      }
    } else if (currentLevel === 3) {
      // 第三关：60% 类型1，20% 类型2，20% 类型3
      if (rand < 0.6) monsterType = 1;
      else if (rand < 0.8) monsterType = 2;
      else monsterType = 3;
    } else if (currentLevel >= 4) {
      // 第四关及以后：40% 类型1，20% 类型2，20% 类型3，20% 类型4
      if (rand < 0.4) monsterType = 1;
      else if (rand < 0.6) monsterType = 2;
      else if (rand < 0.8) monsterType = 3;
      else monsterType = 4;
    } else {
      monsterType = 1;
    }

    weightDistribution[monsterType]++;
  }

  // 根据权重分布生成怪物配置
  for (const [typeStr, weight] of Object.entries(weightDistribution)) {
    if (weight === 0) continue;

    const monsterType = parseInt(typeStr) as MonsterType;
    const count = Math.min(300, weight * monstersPerWeight[monsterType]); // 限制每种类型最多300个

    for (let i = 0; i < count; i++) {
      let x = 0,
        y = 0;
      // 智能生成：在玩家视角范围外2000px内生成，使敌人能更快进入视野
      // 随机选择方向：0=上, 1=下, 2=左, 3=右
      const dir = Math.floor(runtime.random() * 4);
      switch (dir) {
        case 0: // 上：视角上方
          x = viewLeft + runtime.random() * (viewRight - viewLeft);
          y = viewTop - 30 - runtime.random() * SPAWN_RANGE;
          break;
        case 1: // 下：视角下方
          x = viewLeft + runtime.random() * (viewRight - viewLeft);
          y = viewBottom + 30 + runtime.random() * SPAWN_RANGE;
          break;
        case 2: // 左：视角左方
          x = viewLeft - 30 - runtime.random() * SPAWN_RANGE;
          y = viewTop + runtime.random() * (viewBottom - viewTop);
          break;
        case 3: // 右：视角右方
          x = viewRight + 30 + runtime.random() * SPAWN_RANGE;
          y = viewTop + runtime.random() * (viewBottom - viewTop);
          break;
      }
      // 确保生成位置不超出世界边界，但保留一定边缘
      x = Math.max(-30, Math.min(GAME_CONFIG.WORLD_WIDTH + 30, x));
      y = Math.max(-30, Math.min(GAME_CONFIG.WORLD_HEIGHT + 30, y));

      const config = MONSTER_CONFIGS[monsterType];

      const baseSpeed = config.baseSpeed * (0.9 + runtime.random() * 0.2); // 90%-110% 基础速度波动
      const speed = baseSpeed * enemySpeedMultiplier;

      let newMonster = createMonster({
        id: runtime.nextId('monster'),
        monsterType,
        x,
        y,
        hpMultiplier,
        baseSpeed,
        speed,
        now: runtime.now(),
      });

      // 词缀系统：按概率赋予词缀（从第4关开始）
      if (!config.isBoss && currentLevel >= AFFIX_SPAWN_CONFIG.MIN_LEVEL) {
        const affixChance = getAffixSpawnChance(currentLevel);
        if (runtime.random() < affixChance) {
          const affixType = rollAffixType(runtime.random);
          if (affixType) {
            newMonster = AffixSystem.init(newMonster, affixType);
          }
        }
      }

      allMonsters.push(newMonster);
    }
  }

  // 第5关：最后生成BOSS
  if (currentLevel === 5 && totalWeight > 0) {
    const bossConfig = MONSTER_CONFIGS[5]; // 史莱姆王
    const x = GAME_CONFIG.WORLD_WIDTH / 2;
    const y = 100; // 从上方生成

    allMonsters.push(
      createMonster({ id: runtime.nextId('boss'), monsterType: 5, x, y, now: runtime.now() })
    );

    setBossAlive(true);
    setBossCurrentHp(bossConfig.hp);
    setBossMaxHp(bossConfig.hp);

    // 播放Boss出现音效
    playSound('boss_appear');
  }

  // 分批生成：将敌人分成多批
  const totalCount = allMonsters.length;

  // 随机打乱怪物顺序，确保每批都有混合类型
  for (let i = allMonsters.length - 1; i > 0; i--) {
    const j = Math.floor(runtime.random() * (i + 1));
    [allMonsters[i], allMonsters[j]] = [allMonsters[j], allMonsters[i]];
  }

  const batchSize = Math.ceil(totalCount * 0.25); // 每批约25%

  // 分成多批
  const batches: Monster[][] = [];
  for (let i = 0; i < totalCount; i += batchSize) {
    batches.push(allMonsters.slice(i, i + batchSize));
  }

  // 设置总敌人数量
  setTotalMonstersToSpawn(totalCount);
  // 记录本关总波次（用于波次衔接显示）
  setThisLevelWaveTotal(batches.length);

  // 生成第一批
  if (batches.length > 0) {
    const firstBatch = batches[0];
    setMonsters(firstBatch);
    setCurrentBatchInitialCount(firstBatch.length);
    setMonstersRemaining(firstBatch.length);

    // 保存剩余批次
    setPendingMonsterBatches(batches.slice(1));

    // 设置下一批生成时间（15秒后）
    if (batches.length > 1) {
      setNextBatchTime(runtime.now() + 15000);
    } else {
      setNextBatchTime(null);
    }
  }
}
