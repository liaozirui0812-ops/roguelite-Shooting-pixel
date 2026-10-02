import { settleEnemyDeath } from '@/game/systems/death';

import { resolveMonsterDamage } from '@/game/rules/damage';

import {
  GAME_CONFIG,
  PoisonCircle,
  Coin,
  MONSTER_CONFIGS,
  hasGrowthChainNode,
  getPoisonCircleRadius,
  getPoisonCircleDuration,
  checkPoisonCircleHeal,
} from '@/game';

import type { UpdateWorldContext, TickContext } from './context';

export function zoneSystem(context: UpdateWorldContext, tick: TickContext) {
  const {
    runtime,
    world,
    setMonsters,
    setEnemyBullets,
    setPlayer,
    setPoisonCircles,
    setDamageNumbers,
    setBossAlive,
    setCoins,
    triggerVampireHeal,
  } = context;
  const { now } = tick;
  // 移除死亡动画播放完成的怪物
  setMonsters((prev) => {
    const now = runtime.now();
    return prev.filter((monster) => {
      if (monster.isDying) {
        return now - monster.deathTime < GAME_CONFIG.HIT_EFFECT_DURATION;
      }
      return true;
    });
  });

  // ========== 能量气场处理 ==========
  if (world.player.energyAuraLevel > 0) {
    const auraNow = runtime.now();
    const auraRadius = GAME_CONFIG.ENERGY_AURA_BASE_RADIUS + world.player.energyAuraLevel * 15; // 每级增加15px半径
    const shockwaveInterval = GAME_CONFIG.ENERGY_AURA_SHOCKWAVE_INTERVAL;

    // 检查是否需要发射冲击波
    if (auraNow - world.player.lastEnergyAuraShockwaveTime >= shockwaveInterval) {
      // 发射冲击波

      // 1. 击退气场内的敌人并附加减速效果
      setMonsters((prevMonsters) => {
        return prevMonsters.map((m) => {
          if (m.isDying) return m;

          const dist = Math.sqrt(
            Math.pow(m.x - world.player.x, 2) + Math.pow(m.y - world.player.y, 2)
          );

          if (dist <= auraRadius) {
            // 在气场内，计算击退方向
            const dx = m.x - world.player.x;
            const dy = m.y - world.player.y;
            const distNorm = Math.sqrt(dx * dx + dy * dy);

            // 击退距离
            const knockbackDist = GAME_CONFIG.ENERGY_AURA_KNOCKBACK_DISTANCE;

            // 计算击退后的新位置
            let newX = m.x;
            let newY = m.y;
            if (distNorm > 0) {
              newX = m.x + (dx / distNorm) * knockbackDist;
              newY = m.y + (dy / distNorm) * knockbackDist;
            }

            // 边界检查
            newX = Math.max(20, Math.min(GAME_CONFIG.WORLD_WIDTH - 20, newX));
            newY = Math.max(20, Math.min(GAME_CONFIG.WORLD_HEIGHT - 20, newY));

            return {
              ...m,
              x: newX,
              y: newY,
              isSlowedByAura: true,
              auraSlowdownEndTime: auraNow + GAME_CONFIG.ENERGY_AURA_SLOWDOWN_DURATION,
            };
          }

          return m;
        });
      });

      // 2. 消除气场内的敌方子弹
      setEnemyBullets((prevBullets) => {
        return prevBullets.filter((bullet) => {
          const dist = Math.sqrt(
            Math.pow(bullet.x - world.player.x, 2) + Math.pow(bullet.y - world.player.y, 2)
          );
          return dist > auraRadius; // 保留气场外的子弹
        });
      });

      // 更新上次冲击波时间
      setPlayer((prev) => ({
        ...prev,
        lastEnergyAuraShockwaveTime: auraNow,
      }));
    }
  }

  // 处理毒圈伤害和移除过期毒圈
  const currentTime = runtime.now();
  const poisonTickInterval = 500; // 每500ms造成一次伤害

  setPoisonCircles((prevCircles) => {
    // 过滤掉过期的毒圈
    const activeCircles = prevCircles.filter((circle) => currentTime < circle.endTime);

    // 处理每个毒圈的伤害
    activeCircles.forEach((circle) => {
      // 检查是否需要造成伤害
      if (currentTime - circle.lastTickTime >= poisonTickInterval) {
        // 对毒圈内的敌人造成伤害并附加中毒状态
        setMonsters((prevMonsters) => {
          return prevMonsters.map((m) => {
            if (m.isDying) return m;

            const dist = Math.sqrt(Math.pow(m.x - circle.x, 2) + Math.pow(m.y - circle.y, 2));

            if (dist <= circle.radius) {
              // 在毒圈内，造成伤害
              const newHp = resolveMonsterDamage({
                target: m,
                amount: circle.damage,
                source: 'poisonCircle',
                interceptAffix: false,
                respectInvincible: false,
              }).hp;

              // 显示毒圈伤害数字
              setDamageNumbers((prev) => [
                ...prev,
                {
                  id: `poisonCircle-${m.id}-${currentTime}`,
                  monsterId: m.id,
                  x: m.x,
                  y: m.y - 20,
                  damage: circle.damage,
                  opacity: 1.0,
                  scale: 0.7,
                  startTime: currentTime,
                  isCrit: false,
                },
              ]);

              // 如果伤害致死
              if (newHp <= 0) {
                if (!settleEnemyDeath(runtime, m)) return { ...m, hp: 0, isDying: true };

                // 检查是否需要生成新毒圈（检查毒圈数量上限）
                const currentPlayer = world.player;
                if (currentPlayer && currentPlayer.poisonBuffLevel > 0) {
                  setPoisonCircles((prev) => {
                    if (prev.length < GAME_CONFIG.MAX_POISON_CIRCLES) {
                      // 应用成长链加成：毒圈半径和持续时间
                      const baseRadius = 60 + currentPlayer.poisonBuffLevel * 20;
                      const radius = getPoisonCircleRadius(currentPlayer, baseRadius);
                      const baseDuration = 5000;
                      const duration = getPoisonCircleDuration(currentPlayer, baseDuration);

                      const newPoisonCircle: PoisonCircle = {
                        id: `poison-circle-${runtime.now()}-${runtime.random()}`,
                        x: m.x,
                        y: m.y,
                        radius,
                        damage: 1 + currentPlayer.poisonBuffLevel,
                        endTime: currentTime + duration,
                        lastTickTime: currentTime,
                      };
                      return [...prev, newPoisonCircle];
                    }
                    return prev; // 已达上限，不生成新毒圈
                  });
                }

                // 掉落金币
                const monsterConfig = MONSTER_CONFIGS[m.monsterType];
                let goldValue;
                if (monsterConfig.isBoss) {
                  goldValue = Math.floor(monsterConfig.goldBase * world.level * 0.4); // BOSS金币从 50L 降至 20L
                  setBossAlive(false);
                } else if (m.monsterType === 1 || m.monsterType === 2) {
                  goldValue = 1;
                } else {
                  goldValue = 2; // 类型3/4 改为固定值，去掉随关卡增长(原 2 + ⌊L/5⌋)
                }

                const newCoin: Coin = {
                  id: `coin-${runtime.now()}-${runtime.random()}`,
                  x: m.x,
                  y: m.y,
                  type: 'coin',
                  value: goldValue,
                  size: 15,
                  color: '#FFD700',
                  spawnTime: runtime.now(),
                  isCollected: false,
                  collectAnimationProgress: 0,
                };
                setCoins((prev) => [...prev, newCoin]);

                return {
                  ...m,
                  hp: 0,
                  isDying: true,
                  deathTime: currentTime,
                  isHit: true,
                  hitTime: currentTime,
                };
              }

              // 附加中毒状态（如果敌人还没有中毒）
              if (!m.isPoisoned) {
                return {
                  ...m,
                  hp: newHp,
                  isPoisoned: true,
                  poisonStacks: 1,
                  poisonDamage: circle.damage,
                  poisonEndTime: currentTime + 5000,
                  lastPoisonTickTime: currentTime,
                };
              }

              return {
                ...m,
                hp: newHp,
              };
            }

            return m;
          });
        });

        // 更新毒圈的lastTickTime
        circle.lastTickTime = now;
      }
    });

    return activeCircles;
  });

  // 剧毒吸收I效果：玩家站在毒圈上时，每秒回复2点生命值
  const currentPlayerForHeal = world.player;
  if (currentPlayerForHeal && hasGrowthChainNode(currentPlayerForHeal, 'poison_absorb_3')) {
    const healAmount = checkPoisonCircleHeal(currentPlayerForHeal, world.poisonCircles);
    if (healAmount > 0) {
      // 使用静态变量记录上次治疗时间，确保每秒只治疗一次
      if (!world.lastPoisonHealTime) {
        world.lastPoisonHealTime = 0;
      }
      const lastHealTime = world.lastPoisonHealTime;
      if (currentTime - lastHealTime >= 1000) {
        setPlayer((prev) => ({
          ...prev,
          hp: Math.min(prev.hp + healAmount, prev.maxHp),
        }));
        // 触发吸血回复动画复用
        triggerVampireHeal(healAmount);
        world.lastPoisonHealTime = currentTime;
      }
    }
  }
}
