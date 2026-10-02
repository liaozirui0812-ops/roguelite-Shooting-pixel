import { settleEnemyDeath } from '@/game/systems/death';

import { resolveMonsterDamage } from '@/game/rules/damage';

import {
  distToObstacle,
  GAME_CONFIG,
  Position,
  SELF_DESTRUCT_CONFIG,
  AffixSystem,
  PoisonCircle,
  Coin,
  AffixExplosionParticle,
  MONSTER_CONFIGS,
  getPoisonCircleRadius,
  getPoisonCircleDuration,
  getPoisonTickInterval,
  getPoisonTrueDamage,
  shouldPoisonInfect,
} from '@/game';

import type { UpdateWorldContext, TickContext } from './context';

export function monsterSystem(context: UpdateWorldContext, tick: TickContext) {
  const {
    runtime,
    world,
    dashRef,
    setPlayer,
    setGameState,
    setMonsters,
    triggerScreenShake,
    boomImage,
    setExplosionEffects,
    setAffixExplosionParticles,
    setDamageNumbers,
    setBossAlive,
    setCoins,
    setPoisonCircles,
    checkRectCollision,
  } = context;

  // 更新怪物位置 - 使用改进的智能避障算法
  setMonsters((prev) => {
    const now = runtime.now();
    return prev.map((monster) => {
      // 死亡的怪物不移动
      if (monster.isDying) {
        return monster;
      }

      // ========== 冲击波击退效果 ==========
      let updatedMonster = { ...monster };

      if (monster.knockbackEndTime && now < monster.knockbackEndTime) {
        // 应用击退速度
        updatedMonster.x += (monster.knockbackVx || 0) * (1 / 60); // 按帧率计算
        updatedMonster.y += (monster.knockbackVy || 0) * (1 / 60);
      } else if (monster.knockbackEndTime && now >= monster.knockbackEndTime) {
        // 击退结束，清除字段
        updatedMonster.knockbackVx = undefined;
        updatedMonster.knockbackVy = undefined;
        updatedMonster.knockbackEndTime = undefined;
      }

      // ========== 词缀系统：每帧更新 ==========
      const affixResult = AffixSystem.update(updatedMonster, now, world.player.x, world.player.y);
      updatedMonster = affixResult.monster;

      // 处理自爆触发
      if (affixResult.shouldExplode) {
        if (!settleEnemyDeath(runtime, updatedMonster)) return updatedMonster;
        // 触发自爆爆炸（范围伤害 + 怪物死亡）
        const explosionDamage = affixResult.explodeDamage;
        const explosionRadius = affixResult.explodeRadius;

        // 对玩家造成伤害（如果在范围内）
        const playerDist = Math.sqrt(
          Math.pow(updatedMonster.x - world.player.x, 2) +
            Math.pow(updatedMonster.y - world.player.y, 2)
        );
        if (playerDist <= explosionRadius && !dashRef.current.active) {
          setPlayer((prevPlayer) => {
            const newHp = Math.max(0, prevPlayer.hp - explosionDamage);
            if (newHp <= 0) {
              setGameState('gameover');
            }
            return { ...prevPlayer, hp: newHp, isHit: true, hitTime: now };
          });
        }

        // 爆炸伤害周围其他敌人（自爆也会伤到同类）
        setMonsters((prevMonsters) => {
          return prevMonsters.map((m) => {
            if (m.id === updatedMonster.id) return m; // 自爆者单独处理
            if (m.isDying || m.isInvincible) return m;
            const d = Math.sqrt(
              Math.pow(m.x - updatedMonster.x, 2) + Math.pow(m.y - updatedMonster.y, 2)
            );
            if (d <= explosionRadius) {
              // 自爆对范围内敌人造成同等伤害（与对玩家一致，30%最大生命）
              const selfDamage = Math.floor(explosionDamage);
              // 词缀伤害拦截
              const dmgResult = resolveMonsterDamage({
                target: m,
                amount: selfDamage,
                source: 'selfDestruct',
                interceptAffix: true,
                respectInvincible: true,
              });
              if (dmgResult.blocked) {
                return dmgResult.monster;
              }
              const newHp = m.hp - dmgResult.actualDamage;
              if (newHp <= 0) {
                if (!settleEnemyDeath(runtime, dmgResult.monster))
                  return { ...dmgResult.monster, hp: 0, isDying: true };
                return {
                  ...dmgResult.monster,
                  hp: 0,
                  isDying: true,
                  deathTime: now,
                };
              }
              return { ...dmgResult.monster, hp: newHp, isHit: true, hitTime: now };
            }
            return m;
          });
        });

        // 自爆爆炸触发震屏（打击感，与火箭弹爆炸一致）
        triggerScreenShake(Math.min(12, 4 + explosionRadius / 40));

        // 添加自爆视觉：通用爆炸序列帧动画 + 8方向粒子
        // 通用爆炸动画（与火箭弹等共用 Boom 序列帧）
        const _boomTotalFrames = boomImage ? Math.floor(boomImage.width / 256) : 8;
        try {
          setExplosionEffects((prev) => [
            ...prev,
            {
              id: `selfdestruct-boom-${now}`,
              x: updatedMonster.x,
              y: updatedMonster.y,
              radius: explosionRadius * 0.8,
              startTime: now,
              maxRadius: explosionRadius * 1.5 * 0.8,
              totalFrames: _boomTotalFrames,
              frameDuration: 30,
              firstPassComplete: false,
              rotation: runtime.random() * Math.PI * 2,
            },
          ]);
        } catch (_e) {
          // 动画添加失败不影响伤害结算
        }
        // 8方向粒子扩散（补充光效）
        const explosionParticles: AffixExplosionParticle[] = [];
        for (let i = 0; i < SELF_DESTRUCT_CONFIG.PARTICLE_COUNT; i++) {
          const angle = (i / SELF_DESTRUCT_CONFIG.PARTICLE_COUNT) * Math.PI * 2;
          explosionParticles.push({
            id: `affix-explosion-${now}-${i}`,
            x: updatedMonster.x,
            y: updatedMonster.y,
            vx: Math.cos(angle) * SELF_DESTRUCT_CONFIG.PARTICLE_SPEED,
            vy: Math.sin(angle) * SELF_DESTRUCT_CONFIG.PARTICLE_SPEED,
            size: SELF_DESTRUCT_CONFIG.PARTICLE_SIZE,
            startTime: now,
            duration: SELF_DESTRUCT_CONFIG.PARTICLE_DURATION,
          });
        }
        setAffixExplosionParticles((prev) => [...prev, ...explosionParticles]);

        // 自爆怪物死亡
        updatedMonster = {
          ...updatedMonster,
          hp: 0,
          isDying: true,
          deathTime: now,
        };
        return updatedMonster;
      }

      // 词缀停止移动（如自爆充能中）
      const affixStopMovement = affixResult.stopMovement;
      // 词缀速度倍率（如狂暴 +60%）
      const affixSpeedMultiplier = affixResult.speedMultiplier;

      const monsterConfig = MONSTER_CONFIGS[monster.monsterType];
      const monsterSize = monsterConfig.size;

      const dx = world.player.x - monster.x;
      const dy = world.player.y - monster.y;
      const distToPlayer = Math.sqrt(dx * dx + dy * dy);

      // 检查是否处于受击状态或中毒状态
      let currentSpeed = monster.speed;
      if (monster.isHit && now - monster.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION) {
        // 受击时减速
        currentSpeed = monster.baseSpeed * GAME_CONFIG.HIT_SLOWDOWN_FACTOR;
      }
      // 中毒减速效果：中毒敌人移动速度降低20%
      if (monster.isPoisoned) {
        currentSpeed = currentSpeed * 0.8;
      }

      // 能量气场减速效果
      if (monster.auraSlowdownEndTime && now < monster.auraSlowdownEndTime) {
        currentSpeed = currentSpeed * (1 - GAME_CONFIG.ENERGY_AURA_SLOWDOWN_FACTOR);
      }

      // 词缀速度倍率（如狂暴移速加成）
      currentSpeed = currentSpeed * affixSpeedMultiplier;

      // ========== 冲击波减速效果 ==========
      let effectiveSpeed = currentSpeed;

      if (monster.shockwaveSlowdownEndTime && now < monster.shockwaveSlowdownEndTime) {
        // 70%减速（移动速度×0.3）
        effectiveSpeed = currentSpeed * (monster.shockwaveSlowdownMultiplier || 0.3);
      } else if (monster.shockwaveSlowdownEndTime && now >= monster.shockwaveSlowdownEndTime) {
        // 减速结束，清除字段
        updatedMonster.shockwaveSlowdownEndTime = undefined;
        updatedMonster.shockwaveSlowdownMultiplier = undefined;
      }

      // 燃烧伤害处理
      if (
        updatedMonster.isBurning &&
        updatedMonster.burningEndTime &&
        updatedMonster.burningStacks
      ) {
        // 检查燃烧是否结束
        if (now >= updatedMonster.burningEndTime) {
          // 清除燃烧状态
          updatedMonster = {
            ...updatedMonster,
            isBurning: false,
            burningStacks: 0,
            burningDamage: 0,
            burningEndTime: undefined,
            lastBurnTickTime: undefined,
          };
        } else if (updatedMonster.lastBurnTickTime) {
          // 每秒造成一次燃烧伤害（1000ms间隔）
          const burnInterval = 1000;
          if (now - updatedMonster.lastBurnTickTime >= burnInterval) {
            const burnDamage = (updatedMonster.burningDamage || 1) * updatedMonster.burningStacks;
            const newHp = resolveMonsterDamage({
              target: updatedMonster,
              amount: burnDamage,
              source: 'dot',
              interceptAffix: false,
              respectInvincible: false,
            }).hp;

            // 显示燃烧伤害数字
            setDamageNumbers((prev) => [
              ...prev,
              {
                id: `burn-${updatedMonster.id}-${now}`,
                monsterId: updatedMonster.id,
                x: updatedMonster.x,
                y: updatedMonster.y - 20,
                damage: burnDamage,
                opacity: 1.0,
                scale: 0.8,
                startTime: now,
                isCrit: false,
              },
            ]);

            if (newHp <= 0) {
              if (!settleEnemyDeath(runtime, updatedMonster))
                return { ...updatedMonster, hp: 0, isDying: true };

              // 燃烧致死

              // 燃烧传播
              const spreadRadius = 80;
              runtime.schedule(() => {
                setMonsters((prevMonsters) => {
                  return prevMonsters.map((m) => {
                    if (m.isDying || m.isInvincible || m.isBurning) return m;
                    const dist = Math.sqrt(
                      Math.pow(m.x - updatedMonster.x, 2) + Math.pow(m.y - updatedMonster.y, 2)
                    );
                    if (dist <= spreadRadius) {
                      return {
                        ...m,
                        isBurning: true,
                        burningStacks: updatedMonster.burningStacks,
                        burningDamage: updatedMonster.burningDamage,
                        burningEndTime: now + 5000,
                        lastBurnTickTime: now,
                      };
                    }
                    return m;
                  });
                });
              }, 100);

              // 掉落金币逻辑
              const monsterConfig = MONSTER_CONFIGS[updatedMonster.monsterType];
              let goldValue;
              if (monsterConfig.isBoss) {
                goldValue = monsterConfig.goldBase * world.level;
                setBossAlive(false);
              } else if (updatedMonster.monsterType === 1 || updatedMonster.monsterType === 2) {
                goldValue = 1;
              } else {
                goldValue = Math.floor(2 + world.level / 5);
              }

              const newCoin: Coin = {
                id: `coin-${runtime.now()}-${runtime.random()}`,
                x: updatedMonster.x,
                y: updatedMonster.y,
                type: 'coin',
                value: goldValue,
                size: 15,
                color: '#FFD700',
                spawnTime: runtime.now(),
                isCollected: false,
                collectAnimationProgress: 0,
              };
              setCoins((prev) => [...prev, newCoin]);

              updatedMonster = {
                ...updatedMonster,
                hp: 0,
                isDying: true,
                deathTime: now,
                isHit: true,
                hitTime: now,
                isBurning: false,
              };
            } else {
              // 更新燃烧状态
              updatedMonster = {
                ...updatedMonster,
                hp: newHp,
                lastBurnTickTime: now,
              };
            }
          }
        }
      }

      // 处理中毒持续伤害
      if (!updatedMonster.isDying && updatedMonster.isPoisoned && updatedMonster.poisonEndTime) {
        if (now >= updatedMonster.poisonEndTime) {
          // 中毒结束
          updatedMonster = {
            ...updatedMonster,
            isPoisoned: false,
            poisonStacks: 0,
            poisonDamage: 0,
            poisonEndTime: undefined,
            lastPoisonTickTime: undefined,
          };
        } else if (updatedMonster.lastPoisonTickTime) {
          // 应用成长链加成：毒伤频率
          const currentPlayer = world.player;
          const poisonInterval = currentPlayer ? getPoisonTickInterval(currentPlayer) : 1000;

          if (now - updatedMonster.lastPoisonTickTime >= poisonInterval) {
            const poisonDamage =
              (updatedMonster.poisonDamage || 1) * (updatedMonster.poisonStacks || 1);
            // 应用成长链加成：真实伤害（剧毒II）
            const trueDamage = currentPlayer
              ? getPoisonTrueDamage(currentPlayer, updatedMonster)
              : 0;
            const newHp = resolveMonsterDamage({
              target: updatedMonster,
              amount: poisonDamage + trueDamage,
              source: 'dot',
              interceptAffix: false,
              respectInvincible: false,
            }).hp;

            // 显示中毒伤害数字
            setDamageNumbers((prev) => [
              ...prev,
              {
                id: `poison-${updatedMonster.id}-${now}`,
                monsterId: updatedMonster.id,
                x: updatedMonster.x,
                y: updatedMonster.y - 20,
                damage: poisonDamage,
                opacity: 1.0,
                scale: 0.8,
                startTime: now,
                isCrit: false,
              },
            ]);

            if (newHp <= 0) {
              if (!settleEnemyDeath(runtime, updatedMonster))
                return { ...updatedMonster, hp: 0, isDying: true };

              // 中毒致死，生成毒圈（检查毒圈数量上限）
              const currentPlayer = world.player;
              if (currentPlayer && currentPlayer.poisonBuffLevel > 0) {
                // 检查当前毒圈数量是否未达到上限
                setPoisonCircles((prev) => {
                  if (prev.length < GAME_CONFIG.MAX_POISON_CIRCLES) {
                    // 应用成长链加成：毒圈半径和持续时间
                    const baseRadius = 60 + currentPlayer.poisonBuffLevel * 20;
                    const radius = getPoisonCircleRadius(currentPlayer, baseRadius);
                    const baseDuration = 5000;
                    const duration = getPoisonCircleDuration(currentPlayer, baseDuration);

                    // 在敌人死亡位置生成毒圈，添加到独立的毒圈数组
                    const newPoisonCircle: PoisonCircle = {
                      id: `poison-circle-${runtime.now()}-${runtime.random()}`,
                      x: updatedMonster.x,
                      y: updatedMonster.y,
                      radius,
                      damage: 1 + currentPlayer.poisonBuffLevel, // 每次伤害值
                      endTime: now + duration,
                      lastTickTime: now,
                    };
                    return [...prev, newPoisonCircle];
                  }
                  return prev; // 已达上限，不生成新毒圈
                });
              }

              // 中毒致死

              // 掉落金币逻辑
              const monsterConfig = MONSTER_CONFIGS[updatedMonster.monsterType];
              let goldValue;
              if (monsterConfig.isBoss) {
                goldValue = monsterConfig.goldBase * world.level;
                setBossAlive(false);
              } else if (updatedMonster.monsterType === 1 || updatedMonster.monsterType === 2) {
                goldValue = 1;
              } else {
                goldValue = Math.floor(2 + world.level / 5);
              }

              const newCoin: Coin = {
                id: `coin-${runtime.now()}-${runtime.random()}`,
                x: updatedMonster.x,
                y: updatedMonster.y,
                type: 'coin',
                value: goldValue,
                size: 15,
                color: '#FFD700',
                spawnTime: runtime.now(),
                isCollected: false,
                collectAnimationProgress: 0,
              };
              setCoins((prev) => [...prev, newCoin]);

              updatedMonster = {
                ...updatedMonster,
                hp: 0,
                isDying: true,
                deathTime: now,
                isHit: true,
                hitTime: now,
              };
            } else {
              // 更新中毒状态
              updatedMonster = {
                ...updatedMonster,
                hp: newHp,
                lastPoisonTickTime: now,
              };

              // 传染II效果：中毒敌人每次受毒伤时，有20%概率传染给100px内的另一个敌人
              if (currentPlayer && shouldPoisonInfect(currentPlayer, runtime.random)) {
                runtime.schedule(() => {
                  setMonsters((prevMonsters) => {
                    // 找到距离100px内的另一个未中毒的敌人
                    const nearbyMonster = prevMonsters.find((m) => {
                      if (m.id === updatedMonster.id || m.isDying || m.isPoisoned) return false;
                      const dist = Math.sqrt(
                        Math.pow(m.x - updatedMonster.x, 2) + Math.pow(m.y - updatedMonster.y, 2)
                      );
                      return dist <= 100;
                    });

                    if (nearbyMonster) {
                      // 传染中毒
                      return prevMonsters.map((m) => {
                        if (m.id === nearbyMonster.id) {
                          return {
                            ...m,
                            isPoisoned: true,
                            poisonStacks: 1,
                            poisonDamage: updatedMonster.poisonDamage,
                            poisonEndTime: runtime.now() + 5000,
                            lastPoisonTickTime: runtime.now(),
                          };
                        }
                        return m;
                      });
                    }
                    return prevMonsters;
                  });
                }, 50);
              }
            }
          }
        }
      }

      // 如果BOSS正在进行落地攻击（jump_start, airborne, landing），跳过移动逻辑
      if (
        updatedMonster.isBoss &&
        updatedMonster.jumpAttackState &&
        (updatedMonster.jumpAttackState === 'jump_start' ||
          updatedMonster.jumpAttackState === 'airborne' ||
          updatedMonster.jumpAttackState === 'landing')
      ) {
        // 只更新敌人4的动画状态
        let bossUpdatedMonster = { ...updatedMonster };

        if (
          updatedMonster.monsterType === 4 &&
          updatedMonster.isShooting &&
          updatedMonster.shootAnimationStartTime
        ) {
          const shootAnimationDuration = 720; // ms
          const timeSinceShootStart = now - updatedMonster.shootAnimationStartTime;

          if (timeSinceShootStart >= shootAnimationDuration) {
            bossUpdatedMonster = {
              ...bossUpdatedMonster,
              isShooting: false,
              shootAnimationStartTime: 0,
            };
          }
        }

        return bossUpdatedMonster;
      }

      // 1. 寻向玩家（Seek）
      let vx = 0;
      let vy = 0;

      // 词缀停止移动（如自爆充能中不移动）
      if (!affixStopMovement && distToPlayer > 0) {
        vx = (dx / distToPlayer) * effectiveSpeed;
        vy = (dy / distToPlayer) * effectiveSpeed;
      }

      // 2. 障碍物避障（Avoid Obstacle）- 改进版
      let avoidX = 0;
      let avoidY = 0;
      let obstacleFound = false;

      // 避障检测距离，让怪物在接近障碍物时才避障
      const avoidDistance = 80; // 降低到80px，避免过早避障
      const avoidForce = 5; // 避障力强度

      // 计算运动方向单位向量
      let dirX = 0;
      let dirY = 0;
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > 0) {
        dirX = vx / speed;
        dirY = vy / speed;
      }

      // 前瞻检测：在运动方向上采样多个点，检测是否与障碍物相交
      const sampleCount = 6; // 采样点数量
      const maxLookahead = 120; // 最大前瞻距离（像素）

      for (const obstacle of world.obstacles) {
        const obstacleDist = distToObstacle(monster.x, monster.y, obstacle);

        // 1. 如果当前距离障碍物很近，立即开始避障
        if (obstacleDist < avoidDistance + monsterSize) {
          // 2. 前瞻检测：检查前方路径上是否有障碍物
          let obstacleAhead = false;
          let minDistToObstacle = Infinity;

          for (let i = 1; i <= sampleCount; i++) {
            const sampleDist = (maxLookahead / sampleCount) * i;
            const sampleX = monster.x + dirX * sampleDist;
            const sampleY = monster.y + dirY * sampleDist;

            // 检测采样点是否与障碍物相交
            const sampleDistToObstacle = distToObstacle(sampleX, sampleY, obstacle);
            if (sampleDistToObstacle < monsterSize * 0.8) {
              obstacleAhead = true;
              minDistToObstacle = Math.min(minDistToObstacle, sampleDistToObstacle);
            }
          }

          // 如果当前太近或前方有障碍物，应用避障力
          if (obstacleDist < monsterSize || obstacleAhead) {
            obstacleFound = true;

            // 计算从障碍物最近的边向外推的方向（更精确的侧向避障）
            const obstacleCenterX = obstacle.x + obstacle.width / 2;
            const obstacleCenterY = obstacle.y + obstacle.height / 2;

            // 计算从障碍物中心到怪物的向量
            const avoidDx = monster.x - obstacleCenterX;
            const avoidDy = monster.y - obstacleCenterY;
            const avoidDist = Math.sqrt(avoidDx * avoidDx + avoidDy * avoidDy);

            if (avoidDist > 0) {
              // 基础避障力（根据距离线性衰减）
              const baseForce =
                avoidForce * (1 - Math.min(obstacleDist, avoidDistance) / avoidDistance);

              // 如果前方有障碍物，增加额外的侧向避障力
              const aheadMultiplier = obstacleAhead ? 2.0 : 1.0;

              // 计算侧向分量（垂直于运动方向）
              // 如果怪物正对着障碍物中心移动，需要更强的侧向力
              const forwardDot = (dirX * avoidDx + dirY * avoidDy) / avoidDist;
              const sideDot = Math.abs(forwardDot) < 0.5 ? 1.0 : 1.5;

              // 应用避障力
              const totalForce = baseForce * aheadMultiplier * sideDot;
              avoidX += (avoidDx / avoidDist) * totalForce;
              avoidY += (avoidDy / avoidDist) * totalForce;
            }
          }
        }
      }

      // 3. 结合寻向和避障
      let finalVx = vx;
      let finalVy = vy;

      if (obstacleFound) {
        // 使用平滑插值混合寻向和避障
        const lerpFactor = 0.5; // 避障混合因子（0-1），平衡寻向和避障

        // 计算纯避障方向的速度
        const avoidSpeed = Math.sqrt(avoidX * avoidX + avoidY * avoidY);
        if (avoidSpeed > 0) {
          const avoidVx = (avoidX / avoidSpeed) * currentSpeed;
          const avoidVy = (avoidY / avoidSpeed) * currentSpeed;

          // 平滑混合寻向速度和避障速度
          finalVx = vx * (1 - lerpFactor) + avoidVx * lerpFactor;
          finalVy = vy * (1 - lerpFactor) + avoidVy * lerpFactor;

          // 重新归一化速度，保持恒定速度
          const finalSpeed = Math.sqrt(finalVx * finalVx + finalVy * finalVy);
          if (finalSpeed > 0) {
            finalVx = (finalVx / finalSpeed) * currentSpeed;
            finalVy = (finalVy / finalSpeed) * currentSpeed;
          }
        }
      }

      // 4. 计算新位置
      let newX = monster.x + finalVx;
      let newY = monster.y + finalVy;

      // 5. 边界检测（使用世界坐标系的边界）
      newX = Math.max(monsterSize, Math.min(GAME_CONFIG.WORLD_WIDTH - monsterSize, newX));
      newY = Math.max(monsterSize, Math.min(GAME_CONFIG.WORLD_HEIGHT - monsterSize, newY));

      // 6. 碰撞检测和沿墙滑动（改进版）
      // BOSS特殊处理：BOSS可以穿过障碍物，直接更新位置
      if (monster.isBoss) {
        // 更新敌人4的动画状态
        let updatedMonster = { ...monster, x: newX, y: newY, vx: finalVx, vy: finalVy };

        if (monster.monsterType === 4 && monster.isShooting && monster.shootAnimationStartTime) {
          // 检查Shoot动画是否播放完成
          // 假设4_2动画持续720ms（12帧 × 60ms）
          const shootAnimationDuration = 720; // ms
          const timeSinceShootStart = now - monster.shootAnimationStartTime;

          if (timeSinceShootStart >= shootAnimationDuration) {
            // Shoot动画播放完成，重置为Walk状态
            updatedMonster = {
              ...updatedMonster,
              isShooting: false,
              shootAnimationStartTime: 0,
            };
          }
        }

        return updatedMonster;
      }

      // 检查最终位置是否碰撞
      const isColliding = (pos: Position) => {
        for (const obstacle of world.obstacles) {
          if (checkRectCollision(pos, monsterSize, obstacle)) {
            return true;
          }
        }
        return false;
      };

      if (isColliding({ x: newX, y: newY })) {
        // 尝试只沿X轴移动
        if (!isColliding({ x: newX, y: monster.y })) {
          newY = monster.y;
        }
        // 否则尝试只沿Y轴移动
        else if (!isColliding({ x: monster.x, y: newY })) {
          newX = monster.x;
        }
        // 如果两个方向都被阻挡，尝试沿对角线方向（朝向玩家的方向）
        else {
          const toPlayerX = world.player.x - monster.x;
          const toPlayerY = world.player.y - monster.y;
          const toPlayerDist = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);

          if (toPlayerDist > 0) {
            const normalizedX = toPlayerX / toPlayerDist;
            const normalizedY = toPlayerY / toPlayerDist;

            // 尝试多个小步移动
            const stepSize = currentSpeed * 0.5;
            let foundPath = false;

            for (let i = 1; i <= 4; i++) {
              const testX = monster.x + normalizedX * stepSize * i;
              const testY = monster.y + normalizedY * stepSize * i;

              if (
                testX >= monsterSize &&
                testX <= GAME_CONFIG.WORLD_WIDTH - monsterSize &&
                testY >= monsterSize &&
                testY <= GAME_CONFIG.WORLD_HEIGHT - monsterSize &&
                !isColliding({ x: testX, y: testY })
              ) {
                newX = testX;
                newY = testY;
                foundPath = true;
                break;
              }
            }

            if (!foundPath) {
              // 如果所有方向都被阻挡，保持原位
              newX = monster.x;
              newY = monster.y;
            }
          } else {
            newX = monster.x;
            newY = monster.y;
          }
        }
      }

      // 7. 兜底机制：如果敌人卡在障碍物内部，自动推出到最近的空地
      if (isColliding({ x: newX, y: newY })) {
        // 找到最近的障碍物
        let nearestObstacle = null;
        let minDist = Infinity;

        for (const obstacle of world.obstacles) {
          const obstacleCenterX = obstacle.x + obstacle.width / 2;
          const obstacleCenterY = obstacle.y + obstacle.height / 2;
          const dist = Math.sqrt(
            Math.pow(newX - obstacleCenterX, 2) + Math.pow(newY - obstacleCenterY, 2)
          );
          if (dist < minDist) {
            minDist = dist;
            nearestObstacle = obstacle;
          }
        }

        if (nearestObstacle) {
          // 计算从障碍物中心到敌人的方向
          const obstacleCenterX = nearestObstacle.x + nearestObstacle.width / 2;
          const obstacleCenterY = nearestObstacle.y + nearestObstacle.height / 2;
          const pushDirX = newX - obstacleCenterX;
          const pushDirY = newY - obstacleCenterY;
          const pushDist = Math.sqrt(pushDirX * pushDirX + pushDirY * pushDirY);

          if (pushDist > 0) {
            // 归一化方向
            const normalizedPushX = pushDirX / pushDist;
            const normalizedPushY = pushDirY / pushDist;

            // 沿推出方向逐步移动，直到脱离障碍物
            const maxSteps = 50; // 最多尝试50步
            const stepSize = 5; // 每步5像素

            for (let i = 1; i <= maxSteps; i++) {
              const testX = newX + normalizedPushX * stepSize * i;
              const testY = newY + normalizedPushY * stepSize * i;

              // 检查是否还在世界边界内
              if (
                testX < monsterSize ||
                testX > GAME_CONFIG.WORLD_WIDTH - monsterSize ||
                testY < monsterSize ||
                testY > GAME_CONFIG.WORLD_HEIGHT - monsterSize
              ) {
                break;
              }

              // 检查是否脱离了障碍物
              if (!isColliding({ x: testX, y: testY })) {
                newX = testX;
                newY = testY;
                break;
              }
            }
          }
        }
      }

      // 更新位置到updatedMonster
      updatedMonster.x = newX;
      updatedMonster.y = newY;
      updatedMonster.vx = finalVx;
      updatedMonster.vy = finalVy;

      return updatedMonster;
    });
  });
}
