import { settleEnemyDeath } from '@/game/systems/death';

import { resolveMonsterDamage } from '@/game/rules/damage';

import {
  GAME_CONFIG,
  getEffectiveCritRate,
  getEffectiveCritDamageBonus,
  WEAPONS,
  getEquippedWeaponCritPct,
  Coin,
  SmokeEffect,
  MONSTER_CONFIGS,
  getPoisonDamage,
  getPoisonDuration,
} from '@/game';

import type { UpdateWorldContext, TickContext } from './context';

export function projectileSystem(context: UpdateWorldContext, tick: TickContext) {
  const {
    setBullets,
    runtime,
    setSmokeEffects,
    triggerExplosion,
    setMonsters,
    checkCollision,
    world,
    setDamageNumbers,
    setAccumulatedDamage,
    playSound,
    setBossAlive,
    setCoins,
    setPlayer,
    triggerVampireHeal,
    setBossCurrentHp,
    setPierceEffects,
    checkRectCollision,
  } = context;

  // 更新子弹位置和检测碰撞
  setBullets((prev) => {
    const newBullets = prev.filter((bullet) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // 火箭弹速度更新逻辑（2秒内加速到最终速度）
      if (bullet.isRocket) {
        const now = runtime.now();
        const accelerationProgress = Math.min(
          (now - bullet.accelerationStartTime) / bullet.accelerationDuration,
          1
        );

        // 线性插值计算当前速度
        const currentSpeed =
          bullet.initialSpeed + (bullet.finalSpeed - bullet.initialSpeed) * accelerationProgress;

        // 计算当前速度方向（保持原有的运动方向）
        const currentSpeedMagnitude = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
        if (currentSpeedMagnitude > 0) {
          bullet.vx = (bullet.vx / currentSpeedMagnitude) * currentSpeed;
          bullet.vy = (bullet.vy / currentSpeedMagnitude) * currentSpeed;
        }

        // 火箭弹烟雾生成逻辑（每0.15秒生成一个）
        const smokeInterval = 150; // 0.15秒
        if (now - bullet.lastSmokeTime >= smokeInterval) {
          bullet.lastSmokeTime = now;

          // 在火箭弹尾部生成烟雾（尾部位置 = 火箭弹位置 - 速度方向 * 半径）
          const tailX = bullet.x - (bullet.vx / currentSpeedMagnitude) * bullet.size;
          const tailY = bullet.y - (bullet.vy / currentSpeedMagnitude) * bullet.size;

          const newSmoke: SmokeEffect = {
            id: `smoke-${runtime.now()}-${runtime.random()}`,
            x: tailX,
            y: tailY,
            startTime: now,
            duration: 800, // 持续时间0.8秒
            initialSize: bullet.size * 2.4, // 初始大小（放大20%）
            finalSize: bullet.size * 4.8, // 最终大小（膨胀2倍，放大20%）
          };

          setSmokeEffects((prev) => [...prev, newSmoke]);
        }
      }

      // 计算子弹飞行距离
      bullet.distanceTraveled = Math.sqrt(
        Math.pow(bullet.x - bullet.startX, 2) + Math.pow(bullet.y - bullet.startY, 2)
      );

      // 射程检测
      if (bullet.distanceTraveled > bullet.range) {
        // 火箭弹射程检测：触发爆炸
        if (bullet.isRocket) {
          triggerExplosion(
            bullet.x,
            bullet.y,
            bullet.explosionRadius,
            bullet.explosionDamage,
            bullet.isRPGShockwave,
            bullet.isRPGAPShot
          );
        }
        return false;
      }

      // 检测与怪物碰撞（使用子弹的大小）
      let hitMonster = false;
      setMonsters((monsterList) => {
        const updatedMonsters = monsterList.map((monster) => {
          // 死亡的怪物不再处理碰撞
          if (monster.isDying) {
            return monster;
          }

          // 如果怪物处于无敌状态，跳过碰撞
          if (monster.isInvincible) {
            return monster;
          }
          const monsterConfig = MONSTER_CONFIGS[monster.monsterType];

          if (!hitMonster && checkCollision(bullet, monster, bullet.size, monsterConfig.size)) {
            hitMonster = true;

            // 火箭弹碰撞检测：触发爆炸并影响范围内所有敌人
            if (bullet.isRocket) {
              triggerExplosion(
                bullet.x,
                bullet.y,
                bullet.explosionRadius,
                bullet.explosionDamage,
                bullet.isRPGShockwave,
                bullet.isRPGAPShot
              );
              // 火箭弹爆炸后立即返回，不执行后续普通子弹伤害逻辑
              return monster;
            }

            bullet.hitCount++;

            // 计算伤害衰减：每次命中后伤害减半，最小为1
            // 手枪最后一发子弹无伤害衰减
            const damageMultiplier = bullet.isPistolLastBullet
              ? 1
              : Math.pow(0.5, bullet.hitCount - 1);
            let actualDamage = Math.max(1, Math.floor(bullet.actualDamage * damageMultiplier));
            let isDoubleCrit = false; // 是否触发二次暴击

            // 二次暴击机制：暴击有概率触发二次暴击，造成暴击伤害150%的额外伤害
            // 概率等于暴击率的一半
            const currentPlayer = world.player;
            if (
              bullet.isCrit &&
              bullet.hitCount === 1 &&
              currentPlayer &&
              currentPlayer.criticalRageLevel > 0
            ) {
              const effectiveCritRate = getEffectiveCritRate(
                WEAPONS[currentPlayer.weapon].critRate,
                currentPlayer.critRateBonus + getEquippedWeaponCritPct(currentPlayer)
              );
              const doubleCritChance = effectiveCritRate / 2; // 概率等于暴击率的一半
              if (runtime.random() < doubleCritChance) {
                // 触发二次暴击！
                const effectiveCritDamage = getEffectiveCritDamageBonus(
                  1.5,
                  currentPlayer.critDamageBonus
                );
                const doubleCritExtraDamage = Math.floor(
                  bullet.actualDamage * effectiveCritDamage * 1.5
                ); // 暴击伤害的150%
                actualDamage += doubleCritExtraDamage;
                isDoubleCrit = true;
              }
            }

            // ========== 词缀伤害拦截（如护盾抵挡伤害事件） ==========
            const affixDamageResult = resolveMonsterDamage({
              target: monster,
              amount: actualDamage,
              source: 'projectile',
              interceptAffix: true,
              respectInvincible: true,
            });
            let affixMonster = affixDamageResult.monster;
            actualDamage = affixDamageResult.actualDamage;

            let newHp = affixMonster.hp - actualDamage;
            let isExecuted = false; // 是否被处决
            const affixBlocked = affixDamageResult.blocked;

            // 处决buff判定：如果玩家有处决等级，且敌人血量低于18%
            if (!affixBlocked && currentPlayer && currentPlayer.executionLevel > 0) {
              const hpPercentAfterDamage = newHp / affixMonster.maxHp;
              if (hpPercentAfterDamage < 0.18 && newHp > 0) {
                // 处决！直接击杀
                newHp = 0;
                isExecuted = true;
              }
            }

            if (affixBlocked) {
              // 被词缀完全抵挡（如护盾），不掉血但显示 0 伤害提示
              const now = runtime.now();
              setDamageNumbers((prevDamage) => [
                ...prevDamage,
                {
                  id: `shield-block-${monster.id}-${now}`,
                  monsterId: monster.id,
                  x: affixMonster.x,
                  y: affixMonster.y - 20,
                  damage: 0,
                  opacity: 0.8,
                  scale: 0.8,
                  startTime: now,
                  isCrit: false,
                  isShieldBlock: true,
                },
              ]);

              // 应用击退（即使被护盾抵挡仍有击退效果）
              if (currentPlayer && currentPlayer.knockback > 0) {
                const bdx = bullet.vx;
                const bdy = bullet.vy;
                const bspeed = Math.sqrt(bdx * bdx + bdy * bdy);
                if (bspeed > 0) {
                  const kbDist = 20 + (currentPlayer.knockback - 1) * 10;
                  const kbVx = (bdx / bspeed) * kbDist;
                  const kbVy = (bdy / bspeed) * kbDist;
                  affixMonster = {
                    ...affixMonster,
                    knockbackVx: kbVx,
                    knockbackVy: kbVy,
                    knockbackEndTime: now + 200,
                  };
                }
              }

              return affixMonster;
            }

            // 使用伤害累加器：0.3秒内同一怪物的伤害累加
            const now = runtime.now();
            setAccumulatedDamage((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(monster.id);
              if (existing) {
                // 累加伤害
                newMap.set(monster.id, {
                  damage: existing.damage + actualDamage,
                  isCrit: existing.isCrit || (bullet.isCrit && bullet.hitCount === 1),
                  isDoubleCrit: existing.isDoubleCrit || isDoubleCrit,
                  lastTime: now,
                  x: monster.x,
                  y: monster.y,
                });
              } else {
                // 新的伤害
                newMap.set(monster.id, {
                  damage: actualDamage,
                  isCrit: bullet.isCrit && bullet.hitCount === 1,
                  isDoubleCrit: isDoubleCrit,
                  lastTime: now,
                  x: monster.x,
                  y: monster.y,
                });
              }
              return newMap;
            });

            if (newHp <= 0) {
              if (!settleEnemyDeath(runtime, monster)) return { ...monster, hp: 0, isDying: true };

              // 播放敌人死亡音效
              playSound('enemy_death');

              // 立即释放累加的伤害数字
              setAccumulatedDamage((prev) => {
                const accumulated = prev.get(monster.id);
                if (accumulated) {
                  const now = runtime.now();
                  // 如果是处决，显示红色"处决！！"飘字
                  if (isExecuted) {
                    setDamageNumbers((prevDamage) => [
                      ...prevDamage,
                      {
                        id: `execution-${monster.id}-${now}`,
                        monsterId: monster.id,
                        x: monster.x,
                        y: monster.y - 10,
                        damage: 0, // 伤害设为0，用于标识处决
                        opacity: 1.0,
                        scale: 1.5, // 更大的缩放
                        startTime: now,
                        isCrit: true,
                        isExecution: true, // 标记为处决
                      },
                    ]);
                  } else {
                    setDamageNumbers((prevDamage) => [
                      ...prevDamage,
                      {
                        id: `damage-${monster.id}-${now}`,
                        monsterId: monster.id,
                        x: accumulated.x,
                        y: accumulated.y - 10,
                        damage: accumulated.damage,
                        opacity: 1.0,
                        scale: 1.0,
                        startTime: now,
                        isCrit: accumulated.isCrit,
                        isDoubleCrit: accumulated.isDoubleCrit,
                      },
                    ]);
                  }
                  // 从累加器中移除
                  const newMap = new Map(prev);
                  newMap.delete(monster.id);
                  return newMap;
                }
                return prev;
              });

              // 设置死亡状态，播放受击动画后移除
              // 掉落金币和宝箱
              const monsterConfig = MONSTER_CONFIGS[monster.monsterType];
              let goldValue;

              // 计算金币数量
              if (monsterConfig.isBoss) {
                // BOSS：goldBase × 关卡数
                goldValue = monsterConfig.goldBase * world.level;
              } else if (monster.monsterType === 1 || monster.monsterType === 2) {
                // 敌人1和2：固定为1
                goldValue = 1;
              } else {
                // 敌人3和4：floor(2 + level/5)
                goldValue = Math.floor(2 + world.level / 5);
              }

              // BOSS死亡时的额外掉落
              if (monsterConfig.isBoss) {
                goldValue = monsterConfig.goldBase * world.level; // 50 × 关卡数
                setBossAlive(false);

                // BOSS死亡时：固定在死亡范围内200px距离随机散落1-3个宝箱和2-3个金币
                const chestCount = Math.floor(runtime.random() * 3) + 1; // 1-3个宝箱
                const coinCount = Math.floor(runtime.random() * 2) + 2; // 2-3个金币

                for (let i = 0; i < chestCount; i++) {
                  const angle = runtime.random() * Math.PI * 2;
                  const distance = runtime.random() * 200;
                  const chestX = monster.x + Math.cos(angle) * distance;
                  const chestY = monster.y + Math.sin(angle) * distance;

                  const newChest: Coin = {
                    id: `chest-${runtime.now()}-${runtime.random()}`,
                    x: chestX,
                    y: chestY,
                    type: 'chest',
                    value: 3 + Math.floor(world.level / 2), // 宝箱打开后获得的金币数
                    size: 30,
                    color: '#FFD700',
                    spawnTime: runtime.now(),
                    isCollected: false,
                    collectAnimationProgress: 0,
                  };

                  setCoins((prev) => [...prev, newChest]);
                }

                for (let i = 0; i < coinCount; i++) {
                  const angle = runtime.random() * Math.PI * 2;
                  const distance = runtime.random() * 200;
                  const coinX = monster.x + Math.cos(angle) * distance;
                  const coinY = monster.y + Math.sin(angle) * distance;

                  const newCoin: Coin = {
                    id: `coin-${runtime.now()}-${runtime.random()}`,
                    x: coinX,
                    y: coinY,
                    type: 'coin',
                    value: goldValue,
                    size: 30, // BOSS金币更大
                    color: '#FFD700',
                    spawnTime: runtime.now(),
                    isCollected: false,
                    collectAnimationProgress: 0,
                  };

                  setCoins((prev) => [...prev, newCoin]);
                }
              } else {
                // 普通敌人掉落
                const newCoin: Coin = {
                  id: `coin-${runtime.now()}-${runtime.random()}`,
                  x: monster.x,
                  y: monster.y,
                  type: 'coin',
                  value: goldValue,
                  size: 15,
                  color: '#FFD700',
                  spawnTime: runtime.now(),
                  isCollected: false,
                  collectAnimationProgress: 0,
                };

                setCoins((prev) => [...prev, newCoin]);

                // 敌人3和4有概率掉落宝箱：概率为（10%+当前关卡数x2%）
                if (monster.monsterType === 3 || monster.monsterType === 4) {
                  const chestDropChance = 0.1 + world.level * 0.02; // 10% + 关卡数×2%
                  if (runtime.random() < chestDropChance) {
                    const newChest: Coin = {
                      id: `chest-${runtime.now()}-${runtime.random()}`,
                      x: monster.x,
                      y: monster.y,
                      type: 'chest',
                      value: 3 + Math.floor(world.level / 2), // 宝箱打开后获得的金币数
                      size: 25,
                      color: '#FFD700',
                      spawnTime: runtime.now(),
                      isCollected: false,
                      collectAnimationProgress: 0,
                    };

                    setCoins((prev) => [...prev, newChest]);
                  }
                }
              }

              // 吸血buff判定：如果玩家有吸血等级，10%概率回复1点生命
              if (currentPlayer && currentPlayer.vampireLevel > 0) {
                if (runtime.random() < 0.1) {
                  // 触发吸血！回复1点生命
                  const healAmount = 1;
                  setPlayer((prev) => ({
                    ...prev,
                    hp: Math.min(prev.hp + healAmount, prev.maxHp),
                  }));

                  // 触发吸血回复动画
                  triggerVampireHeal(healAmount);
                }
              }

              // 弹药补充buff判定：暴击或二次暴击击杀时补充弹匣10%子弹
              if (currentPlayer && currentPlayer.ammoSupplyLevel > 0) {
                const isCritKill = bullet.isCrit && bullet.hitCount === 1;
                if (isCritKill || isDoubleCrit) {
                  // 补充弹匣10%子弹（最少1发）
                  const weapon = WEAPONS[currentPlayer.weapon];
                  const magazineSize = weapon.magazineSize + currentPlayer.magazineSizeBonus;
                  const refillAmount = Math.max(1, Math.floor(magazineSize * 0.1));
                  setPlayer((prev) => ({
                    ...prev,
                    currentAmmo: Math.min(prev.currentAmmo + refillAmount, magazineSize),
                  }));
                }
              }

              return {
                ...monster,
                hp: 0,
                isDying: true,
                deathTime: runtime.now(),
                isHit: true,
                hitTime: runtime.now(),
                isExecuted: isExecuted, // 处决标记
                executionTime: isExecuted ? runtime.now() : undefined,
              };
            }

            // 引火燃烧传播：如果敌人正在燃烧，死亡时传播给附近敌人
            if (monster.isBurning && monster.burningStacks) {
              const spreadRadius = 80; // 传播半径
              const now = runtime.now();

              // 在延迟的setMonsters中传播燃烧
              runtime.schedule(() => {
                setMonsters((prevMonsters) => {
                  return prevMonsters.map((m) => {
                    // 跳过已死亡、无敌或已在燃烧的敌人
                    if (m.isDying || m.isInvincible || m.isBurning) return m;

                    // 计算距离
                    const dist = Math.sqrt(
                      Math.pow(m.x - monster.x, 2) + Math.pow(m.y - monster.y, 2)
                    );

                    // 如果在传播范围内，传播燃烧
                    if (dist <= spreadRadius) {
                      return {
                        ...m,
                        isBurning: true,
                        burningStacks: monster.burningStacks,
                        burningDamage: monster.burningDamage,
                        burningEndTime: now + 5000,
                        lastBurnTickTime: now,
                        burningSource: monster.id,
                      };
                    }
                    return m;
                  });
                });
              }, 100);
            }
            // 设置受击状态（基于词缀拦截后的 monster 状态）
            let updatedMonster = {
              ...affixMonster,
              hp: newHp,
              isHit: true,
              hitTime: runtime.now(),
            };

            // ========== 基础击退效果 ==========
            // 当玩家有击退值时，使敌人往子弹前进方向退后
            // 击退值1=退后20px，每+1击退值额外+10px，即距离 = 10 + 击退值 * 10
            if (currentPlayer && currentPlayer.knockback > 0 && newHp > 0) {
              const kbDistance = 10 + currentPlayer.knockback * 10;
              const bulletSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
              if (bulletSpeed > 0) {
                const dirX = bullet.vx / bulletSpeed;
                const dirY = bullet.vy / bulletSpeed;
                updatedMonster.knockbackVx = dirX * (kbDistance / 0.1); // 0.1秒内完成击退
                updatedMonster.knockbackVy = dirY * (kbDistance / 0.1);
                updatedMonster.knockbackEndTime = runtime.now() + 100;
              }
            }

            // 引火buff触发：如果玩家有引火等级，有概率给敌人附加燃烧状态
            // 复用上面已声明的currentPlayer
            if (currentPlayer && currentPlayer.fireBuffLevel > 0) {
              // 基础触发概率：20% × 引火等级
              const igniteChance = 0.2 * currentPlayer.fireBuffLevel;
              if (runtime.random() < igniteChance) {
                const now = runtime.now();
                const burnDuration = 5000; // 燃烧持续5秒
                const burnDamagePerStack = 1 + currentPlayer.fireBuffLevel; // 每层燃烧伤害

                // 叠加燃烧层数（最多5层）
                const currentStacks = updatedMonster.burningStacks || 0;
                const newStacks = Math.min(5, currentStacks + 1);

                updatedMonster = {
                  ...updatedMonster,
                  isBurning: true,
                  burningStacks: newStacks,
                  burningDamage: burnDamagePerStack,
                  burningEndTime: now + burnDuration,
                  lastBurnTickTime: now,
                };
              }
            }

            // 淬毒buff触发：如果玩家有淬毒等级，有概率给敌人附加中毒状态
            if (currentPlayer && currentPlayer.poisonBuffLevel > 0) {
              // 基础触发概率：20% × 淬毒等级
              const poisonChance = 0.2 * currentPlayer.poisonBuffLevel;
              if (runtime.random() < poisonChance) {
                const now = runtime.now();
                // 应用成长链加成：中毒持续时间和伤害
                const basePoisonDuration = 5000; // 基础中毒持续5秒
                const poisonDuration = getPoisonDuration(currentPlayer, basePoisonDuration);
                const basePoisonDamagePerStack = 1 + currentPlayer.poisonBuffLevel;
                const poisonDamagePerStack = getPoisonDamage(
                  currentPlayer,
                  basePoisonDamagePerStack
                );

                // 叠加中毒层数（最多5层）
                const currentStacks = updatedMonster.poisonStacks || 0;
                const newStacks = Math.min(5, currentStacks + 1);

                updatedMonster = {
                  ...updatedMonster,
                  isPoisoned: true,
                  poisonStacks: newStacks,
                  poisonDamage: poisonDamagePerStack,
                  poisonEndTime: now + poisonDuration,
                  lastPoisonTickTime: now,
                };
              }
            }

            // 如果是BOSS，同步更新血条UI
            if (monster.isBoss) {
              setBossCurrentHp(newHp);
            }

            return updatedMonster;
          }
          return monster;
        });

        return updatedMonsters;
      });

      // 穿透光效：子弹穿透敌人且将继续飞行时，在穿透点留下刀光冲击效果（打击感）
      // 火箭弹不触发穿透光效（它本身是爆炸型）
      if (
        hitMonster &&
        !bullet.isRocket &&
        bullet.hitCount > 0 &&
        bullet.hitCount <= bullet.penetration
      ) {
        const _pNow = runtime.now();
        setPierceEffects((prev) => {
          const alive = prev.filter((p) => _pNow - p.startTime < 400);
          alive.push({
            id: `pierce-${bullet.id}-${_pNow}`,
            x: bullet.x,
            y: bullet.y,
            angle: Math.atan2(bullet.vy, bullet.vx),
            startTime: _pNow,
            duration: 260,
          });
          return alive;
        });
      }

      // 检测与障碍物碰撞（穿透不影响与障碍物的碰撞）
      for (const obstacle of world.obstacles) {
        if (checkRectCollision(bullet, bullet.size, obstacle)) {
          // 火箭弹碰撞障碍物：触发爆炸
          if (bullet.isRocket) {
            triggerExplosion(
              bullet.x,
              bullet.y,
              bullet.explosionRadius,
              bullet.explosionDamage,
              bullet.isRPGShockwave,
              bullet.isRPGAPShot
            );
          }
          return false;
        }
      }

      // 如果子弹击中的敌人数量超过穿透力，则消失
      if (bullet.hitCount > bullet.penetration) {
        return false;
      }

      // 边界检测（使用世界坐标系的边界）
      const isInBounds =
        bullet.x > 0 &&
        bullet.x < GAME_CONFIG.WORLD_WIDTH &&
        bullet.y > 0 &&
        bullet.y < GAME_CONFIG.WORLD_HEIGHT;

      // 火箭弹碰到边界也触发爆炸
      if (bullet.isRocket && !isInBounds) {
        triggerExplosion(bullet.x, bullet.y, bullet.explosionRadius, bullet.explosionDamage);
      }

      return (
        isInBounds && (!hitMonster || (!bullet.isRocket && bullet.hitCount <= bullet.penetration))
      );
    });

    return newBullets;
  });
}
