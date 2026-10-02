import {
  GAME_CONFIG,
  Monster,
  BERSERK_CONFIG,
  BOSS_BARRAGE_CONFIG,
  EnemyBullet,
  PlayerHitParticle,
  MONSTER_CONFIGS,
} from '@/game';

import type { UpdateWorldContext, TickContext } from './context';

export function enemyAttackSystem(context: UpdateWorldContext, tick: TickContext) {
  const {
    runtime,
    setMonsters,
    world,
    setEnemyBullets,
    dashRef,
    setPlayer,
    setGameState,
    stopBGM,
    setPlayerHitParticles,
    checkCollision,
    setDamageNumbers,
    checkRectCollision,
    setBossBarrages,
  } = context;
  const { now } = tick;
  // 敌人射击逻辑（敌人4会发射子弹）
  const shootTime = runtime.now();
  setMonsters((prev) => {
    const newEnemyBullets: EnemyBullet[] = [];

    const updatedMonsters = prev.map((monster) => {
      // 死亡的怪物不能射击
      if (monster.isDying) return monster;

      const config = MONSTER_CONFIGS[monster.monsterType];

      // 检查是否可以射击（狂暴词缀下攻击间隔减半）
      const affixAttackMult =
        monster.affix?.type === 'berserk' && monster.affixState?.activated
          ? BERSERK_CONFIG.ATTACK_SPEED_BONUS
          : 1;
      if (
        config.canShoot &&
        shootTime - monster.lastShot >= config.shootInterval * affixAttackMult
      ) {
        // 计算子弹方向
        const dx = world.player.x - monster.x;
        const dy = world.player.y - monster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 只在玩家距离一定范围内射击
        if (dist < 600) {
          const angle = Math.atan2(dy, dx);

          newEnemyBullets.push({
            id: `enemyBullet-${runtime.now()}-${runtime.random()}`,
            x: monster.x,
            y: monster.y,
            vx: Math.cos(angle) * config.bulletSpeed,
            vy: Math.sin(angle) * config.bulletSpeed,
            damage: config.bulletDamage, // 使用独立的子弹伤害
            range: config.bulletRange,
            distanceTraveled: 0,
            startX: monster.x,
            startY: monster.y,
            color: '#ff6600',
            size: 5,
            hasHitPlayer: false, // 初始化为未击中玩家
          });

          // 敌人4射击时触发Shoot动画
          if (monster.monsterType === 4) {
            return {
              ...monster,
              lastShot: shootTime,
              isShooting: true,
              shootAnimationStartTime: shootTime,
            };
          }

          return { ...monster, lastShot: shootTime };
        }
      }

      return monster;
    });

    // 将新创建的子弹添加到enemyBullets状态
    if (newEnemyBullets.length > 0) {
      setEnemyBullets((prevBullets) => [...prevBullets, ...newEnemyBullets]);
    }

    return updatedMonsters;
  });

  // 更新敌人子弹位置和检测碰撞
  setEnemyBullets((prev) => {
    const updatedBullets = prev.map((bullet) => {
      // 如果子弹已经击中过玩家，标记为需要移除
      if (bullet.hasHitPlayer) {
        return { ...bullet, shouldRemove: true };
      }

      // 计算新位置
      const bulletX = bullet.x + bullet.vx;
      const bulletY = bullet.y + bullet.vy;
      const distanceTraveled =
        bullet.distanceTraveled + Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);

      // 射程检测
      if (distanceTraveled > bullet.range) {
        return { ...bullet, shouldRemove: true };
      }

      // 边界检测
      if (
        bulletX < 0 ||
        bulletX > GAME_CONFIG.WORLD_WIDTH ||
        bulletY < 0 ||
        bulletY > GAME_CONFIG.WORLD_HEIGHT
      ) {
        return { ...bullet, shouldRemove: true };
      }

      // 检测与玩家碰撞
      const distToPlayer = Math.sqrt(
        Math.pow(bulletX - world.player.x, 2) + Math.pow(bulletY - world.player.y, 2)
      );

      // 如果子弹已经击中过玩家，直接移除，不再造成伤害
      if (bullet.hasHitPlayer) {
        return { ...bullet, shouldRemove: true };
      }

      const bulletHitRadius = bullet.size || 5;
      if (distToPlayer < GAME_CONFIG.PLAYER_SIZE + bulletHitRadius && !dashRef.current.active) {
        // 造成伤害
        setPlayer((prevPlayer) => {
          const newHp = prevPlayer.hp - bullet.damage;
          if (newHp <= 0) {
            setGameState('gameover');
            // 停止背景音乐
            stopBGM();
          }
          return { ...prevPlayer, hp: Math.max(0, newHp), isHit: true, hitTime: shootTime };
        });
        // 火球命中玩家：爆开蓝色粒子受击动画
        if (bullet.isFireBall) {
          const hitParticles: PlayerHitParticle[] = [];
          for (let i = 0; i < BOSS_BARRAGE_CONFIG.HIT_PARTICLE_COUNT; i++) {
            const angle = (i / BOSS_BARRAGE_CONFIG.HIT_PARTICLE_COUNT) * Math.PI * 2;
            hitParticles.push({
              id: `hitParticle-${bullet.id}-${i}`,
              x: bulletX,
              y: bulletY,
              vx: Math.cos(angle) * BOSS_BARRAGE_CONFIG.HIT_PARTICLE_SPEED,
              vy: Math.sin(angle) * BOSS_BARRAGE_CONFIG.HIT_PARTICLE_SPEED,
              size: BOSS_BARRAGE_CONFIG.HIT_PARTICLE_SIZE * (0.6 + runtime.random() * 0.8),
              startTime: shootTime,
              duration: BOSS_BARRAGE_CONFIG.HIT_PARTICLE_DURATION,
            });
          }
          setPlayerHitParticles((prev) => [...prev, ...hitParticles]);
        }
        // 标记已击中玩家，防止多段伤害
        return { ...bullet, shouldRemove: true, hasHitPlayer: true };
      }

      // 更新子弹位置并保留
      return {
        ...bullet,
        x: bulletX,
        y: bulletY,
        distanceTraveled: distanceTraveled,
      };
    });

    // 过滤掉需要移除的子弹
    return updatedBullets.filter((bullet) => !bullet.shouldRemove);
  });

  // 检测怪物与玩家碰撞
  setPlayer((prev) => {
    let playerDamaged = false;
    for (const monster of world.monsters) {
      // 死亡的怪物不造成伤害
      if (monster.isDying) continue;
      // 闪现期间玩家无敌，不造成接触伤害
      if (dashRef.current.active) continue;

      const monsterConfig = MONSTER_CONFIGS[monster.monsterType];

      if (checkCollision(world.player, monster, GAME_CONFIG.PLAYER_SIZE, monsterConfig.size)) {
        const isBoss = monster.isBoss;
        const attackCD = isBoss ? 500 : 1000; // BOSS攻击CD更短（0.5秒）

        // 狂暴词缀：攻击间隔减半
        const affixAttackMult =
          monster.affix?.type === 'berserk' && monster.affixState?.activated
            ? BERSERK_CONFIG.ATTACK_SPEED_BONUS
            : 1;
        const effectiveAttackCD = attackCD * affixAttackMult;

        // 检查怪物攻击CD
        if (now - monster.lastAttackTime < effectiveAttackCD) {
          continue;
        }

        // BOSS造成更高伤害（普通怪物的2倍）
        // 狂暴词缀：伤害 +50%
        const affixDmgMult =
          monster.affix?.type === 'berserk' && monster.affixState?.activated
            ? 1 + BERSERK_CONFIG.DAMAGE_BONUS
            : 1;
        const actualDamage = (isBoss ? monster.damage * 2 : monster.damage * 0.1) * affixDmgMult;
        const newHp = prev.hp - actualDamage;
        playerDamaged = true;

        if (newHp <= 0) {
          setGameState('gameover');
        }

        // 如果是BOSS，添加攻击光效
        if (isBoss) {
          setDamageNumbers((prevDamage) => [
            ...prevDamage,
            {
              id: `boss-attack-${now}-${runtime.random()}`,
              monsterId: monster.id,
              x: world.player.x,
              y: world.player.y - 30,
              damage: actualDamage,
              opacity: 1.0,
              scale: 1.5,
              startTime: now,
              isCrit: true,
              color: '#ff0000',
            },
          ]);
        }

        // 更新怪物的攻击时间
        setMonsters((prevMonsters) => {
          return prevMonsters.map((m) => {
            if (m.id === monster.id) {
              return { ...m, lastAttackTime: now };
            }
            return m;
          });
        });

        // 设置玩家受击状态
        return {
          ...prev,
          hp: Math.max(0, newHp),
          isHit: true,
          hitTime: now,
        };
      }
    }
    // 如果玩家没有被伤害，更新免疫信息
    if (!playerDamaged) {
      // 重置受击状态（如果时间过了）
      if (!prev.isHit || now - prev.hitTime >= GAME_CONFIG.HIT_EFFECT_DURATION) {
        return { ...prev, isHit: false };
      }
    }
    return prev;
  });

  // BOSS远程攻击和落地攻击检测（互斥）
  setMonsters((prevMonsters) => {
    let newMonsters = [...prevMonsters];

    for (const monster of newMonsters) {
      // 跳过死亡的怪物和不是BOSS的怪物
      if (monster.isDying || !monster.isBoss) continue;

      // 如果BOSS正在进行落地攻击，跳过远程攻击
      if (monster.jumpAttackState && monster.jumpAttackState !== 'idle') {
        continue;
      }

      const monsterConfig = MONSTER_CONFIGS[monster.monsterType];

      // 检查是否配置了远程攻击和落地攻击
      const canRangedAttack =
        monsterConfig.canRangedAttack &&
        monsterConfig.rangedAttackInterval !== undefined &&
        monsterConfig.rangedAttackDistance !== undefined &&
        monsterConfig.rangedAttackBulletSpeed !== undefined &&
        monsterConfig.rangedAttackBulletDamage !== undefined;

      const canJumpAttack =
        monsterConfig.canJumpAttack &&
        monsterConfig.jumpAttackDetectInterval !== undefined &&
        monsterConfig.jumpAttackDetectDistance !== undefined;

      // 检测远程攻击触发条件
      let rangedAttackReady = false;
      let shouldStartRangedAttackGroup = false;

      if (canRangedAttack) {
        const dx = world.player.x - monster.x;
        const dy = world.player.y - monster.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        // 检查是否在冷却期外且玩家在攻击范围内
        const isCooldownOver =
          now - monster.lastRangedAttackTime >= monsterConfig.rangedAttackInterval!;
        const isInRange = distToPlayer <= monsterConfig.rangedAttackDistance!;

        // 如果当前处于攻击周期内
        const attackGroupStartTime = monster.rangedAttackStartTime || 0;
        const currentAttackCount = monster.rangedAttackCount || 0;
        const timeSinceGroupStart = now - attackGroupStartTime;
        const attackInterval = 1500; // 每次攻击间隔1.5秒

        if (attackGroupStartTime > 0 && currentAttackCount < 3) {
          // 当前处于攻击周期内，检查是否到了下一次攻击的时间
          if (timeSinceGroupStart >= (currentAttackCount + 1) * attackInterval) {
            rangedAttackReady = true; // 触发下一次攻击
          }
        } else if (isCooldownOver && isInRange) {
          // 冷却期结束且玩家在范围内，开始新的攻击周期
          shouldStartRangedAttackGroup = true;
        }
      }

      // 检测落地攻击触发条件
      let jumpAttackReady = false;
      if (canJumpAttack) {
        const dx = world.player.x - monster.x;
        const dy = world.player.y - monster.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        jumpAttackReady =
          (monster.jumpAttackStartTime || 0) === 0 || // 没有开始检测
          (now - (monster.jumpAttackStartTime || 0) >= monsterConfig.jumpAttackDetectInterval! && // 检测间隔已过
            distToPlayer <= monsterConfig.jumpAttackDetectDistance!); // 玩家在检测范围内
      }

      // 根据触发条件决定使用哪个攻击
      if (rangedAttackReady || jumpAttackReady) {
        if (rangedAttackReady && jumpAttackReady) {
          // 两者都触发，随机选择一个
          const randomChoice = runtime.random() < 0.5 ? 'ranged' : 'jump';

          if (randomChoice === 'jump') {
            // 执行落地攻击：进入锁定阶段
            newMonsters = newMonsters.map((m) => {
              if (m.id === monster.id) {
                return {
                  ...m,
                  jumpAttackState: 'locking',
                  jumpAttackStartTime: now,
                  jumpAttackTargetX: world.player.x,
                  jumpAttackTargetY: world.player.y,
                };
              }
              return m;
            });
            continue; // 跳过远程攻击
          }
        } else if (jumpAttackReady) {
          // 只有落地攻击触发
          newMonsters = newMonsters.map((m) => {
            if (m.id === monster.id) {
              return {
                ...m,
                jumpAttackState: 'locking',
                jumpAttackStartTime: now,
                jumpAttackTargetX: world.player.x,
                jumpAttackTargetY: world.player.y,
              };
            }
            return m;
          });
          continue; // 跳过远程攻击
        }

        // 执行远程攻击
        // 记录玩家位置
        const playerX = world.player.x;
        const playerY = world.player.y;

        // 获取远程攻击配置（已经在前面检查过不为undefined）
        const bulletSpeed = monsterConfig.rangedAttackBulletSpeed!;
        const bulletDamage = monsterConfig.rangedAttackBulletDamage!;
        const attackDistance = monsterConfig.rangedAttackDistance!;

        // 计算两个目标位置：(x+10, y+10) 和 (x-10, y-10)
        const target1 = { x: playerX + 10, y: playerY + 10 };
        const target2 = { x: playerX - 10, y: playerY - 10 };

        // 生成两个子弹串
        const newEnemyBullets: EnemyBullet[] = [];

        // 子弹串配置：3x15长方形，相邻子弹距离5px
        const rows = 3;
        const cols = 15;
        const spacing = 5;

        // 为每个目标位置生成子弹串
        [target1, target2].forEach((target, targetIndex) => {
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              // 计算子弹在子弹串中的相对位置
              const offsetX = col * spacing - ((cols - 1) * spacing) / 2;
              const offsetY = row * spacing - ((rows - 1) * spacing) / 2;

              // 子弹的实际发射位置
              const bulletStartX = monster.x + offsetX;
              const bulletStartY = monster.y + offsetY;

              // 计算从子弹发射位置到目标的距离和方向
              const bulletDx = target.x - bulletStartX;
              const bulletDy = target.y - bulletStartY;
              const bulletDist = Math.sqrt(bulletDx * bulletDx + bulletDy * bulletDy);

              if (bulletDist > 0) {
                // 计算子弹速度向量
                const bulletVx = (bulletDx / bulletDist) * bulletSpeed;
                const bulletVy = (bulletDy / bulletDist) * bulletSpeed;

                newEnemyBullets.push({
                  id: `enemy-bullet-${runtime.now()}-${runtime.random()}-${row}-${col}-${targetIndex}`,
                  x: bulletStartX,
                  y: bulletStartY,
                  vx: bulletVx,
                  vy: bulletVy,
                  damage: bulletDamage,
                  range: attackDistance * 2, // 射程为检测距离的2倍
                  distanceTraveled: 0,
                  startX: bulletStartX,
                  startY: bulletStartY,
                  color: '#ff00ff', // 紫色子弹，区别于普通敌人子弹
                  size: 4,
                  hasHitPlayer: false, // 初始化为未击中玩家
                });
              }
            }
          }
        });

        // 添加所有子弹到游戏
        setEnemyBullets((prev) => [...prev, ...newEnemyBullets]);

        // 更新BOSS的远程攻击状态
        newMonsters = newMonsters.map((m) => {
          if (m.id === monster.id) {
            const currentAttackCount = (m.rangedAttackCount || 0) + 1;

            if (currentAttackCount >= 3) {
              // 3次攻击完成，进入冷却期
              return {
                ...m,
                lastRangedAttackTime: now,
                rangedAttackCount: 0,
                rangedAttackStartTime: 0,
              };
            } else {
              // 继续下一次攻击
              return {
                ...m,
                rangedAttackCount: currentAttackCount,
              };
            }
          }
          return m;
        });
      }

      // 如果需要开始新的攻击周期
      if (shouldStartRangedAttackGroup) {
        newMonsters = newMonsters.map((m) => {
          if (m.id === monster.id) {
            return {
              ...m,
              rangedAttackStartTime: now,
              rangedAttackCount: 0,
            };
          }
          return m;
        });
      }
    }

    return newMonsters;
  });

  // BOSS落地攻击状态机
  setMonsters((prevMonsters) => {
    const newMonsters: Monster[] = prevMonsters.map((monster) => {
      // 只处理BOSS
      if (!monster.isBoss || monster.isDying) return monster;

      const config = MONSTER_CONFIGS[monster.monsterType];
      if (!config.canJumpAttack) return monster;

      const state = monster.jumpAttackState || 'idle';
      const attackStartTime = monster.jumpAttackStartTime || 0;

      switch (state) {
        case 'idle':
          // 每7秒检测一次玩家是否在800px范围内
          if (now - attackStartTime >= (config.jumpAttackDetectInterval || 7000)) {
            const dx = world.player.x - monster.x;
            const dy = world.player.y - monster.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= (config.jumpAttackDetectDistance || 800)) {
              // 玩家在范围内，进入锁定阶段
              return {
                ...monster,
                jumpAttackState: 'locking',
                jumpAttackStartTime: now,
                jumpAttackTargetX: world.player.x,
                jumpAttackTargetY: world.player.y,
              };
            } else {
              // 玩家不在范围内，重置检测时间
              return {
                ...monster,
                jumpAttackStartTime: now,
              };
            }
          }
          break;

        case 'locking':
          // 锁定阶段：3秒内跟踪玩家位置
          const lockDuration = config.jumpAttackLockDuration || 3000;
          if (now - attackStartTime >= lockDuration) {
            // 锁定时间结束，进入起跳阶段
            const targetX = monster.jumpAttackTargetX || world.player.x;
            const targetY = monster.jumpAttackTargetY || world.player.y;

            // 保存起跳时的位置，用于airborne阶段的移动计算
            const startX = monster.x;
            const startY = monster.y;

            // 计算总移动时间（起跳+空中）
            const totalMoveDuration =
              (config.jumpStartDuration || 500) + (config.airborneDuration || 2000);

            return {
              ...monster,
              jumpAttackState: 'jump_start',
              jumpAttackStartTime: now,
              jumpAttackStartX: startX, // 保存起跳位置
              jumpAttackStartY: startY,
              isInvincible: true, // 进入无敌状态
            };
          } else {
            // 继续跟踪玩家位置
            const dx = world.player.x - monster.x;
            const dy = world.player.y - monster.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 如果玩家超出检测范围，取消技能
            if (dist > (config.jumpAttackDetectDistance || 800)) {
              return {
                ...monster,
                jumpAttackState: 'idle',
                jumpAttackStartTime: now,
                jumpAttackTargetX: undefined,
                jumpAttackTargetY: undefined,
              };
            }

            // 更新锁定目标位置
            return {
              ...monster,
              jumpAttackTargetX: world.player.x,
              jumpAttackTargetY: world.player.y,
            };
          }
          break;

        case 'jump_start':
          // 起跳阶段：在原地播放起跳动画，持续jumpStartDuration
          const jumpStartDuration = config.jumpStartDuration || 500;
          if (now - attackStartTime >= jumpStartDuration) {
            // 起跳完成，进入空中阶段
            return {
              ...monster,
              jumpAttackState: 'airborne',
              jumpAttackStartTime: now, // 重置开始时间用于airborne阶段
            };
          }
          // 起跳阶段不移动，只在原地播放动画
          return monster;

        case 'airborne':
          // 空中阶段：向目标位置移动，持续airborneDuration
          const airborneDuration = config.airborneDuration || 2000;
          if (now - attackStartTime >= airborneDuration) {
            // 到达目标位置，进入落地阶段
            return {
              ...monster,
              jumpAttackState: 'landing',
              jumpAttackStartTime: now,
              x: monster.jumpAttackTargetX || monster.x,
              y: monster.jumpAttackTargetY || monster.y,
            };
          } else {
            // 向目标位置移动（从起跳位置开始）
            const progress = (now - attackStartTime) / airborneDuration;
            const startX = monster.jumpAttackStartX || monster.x;
            const startY = monster.jumpAttackStartY || monster.y;
            const targetX = monster.jumpAttackTargetX || monster.x;
            const targetY = monster.jumpAttackTargetY || monster.y;

            return {
              ...monster,
              x: startX + (targetX - startX) * progress,
              y: startY + (targetY - startY) * progress,
            };
          }

        case 'landing':
          // 落地阶段：造成范围伤害
          const damageRadius = config.jumpAttackDamageRadius || 100;
          const damage = config.jumpAttackDamage || 13;

          // 检测玩家是否在伤害范围内
          const playerDx = world.player.x - monster.x;
          const playerDy = world.player.y - monster.y;
          const playerDist = Math.sqrt(playerDx * playerDx + playerDy * playerDy);

          if (playerDist <= damageRadius) {
            // 计算击退方向（从BOSS落地点指向玩家）
            const knockbackDistance = 300;
            const dx = world.player.x - monster.x;
            const dy = world.player.y - monster.y;

            // 归一化方向向量
            const normalizedDist = Math.sqrt(dx * dx + dy * dy);
            const normalizedDx = normalizedDist > 0 ? dx / normalizedDist : 0;
            const normalizedDy = normalizedDist > 0 ? dy / normalizedDist : 0;

            // 计算击退目标位置
            let targetX = world.player.x + normalizedDx * knockbackDistance;
            let targetY = world.player.y + normalizedDy * knockbackDistance;

            // 边界检测
            targetX = Math.max(
              GAME_CONFIG.PLAYER_SIZE,
              Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.PLAYER_SIZE, targetX)
            );
            targetY = Math.max(
              GAME_CONFIG.PLAYER_SIZE,
              Math.min(GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.PLAYER_SIZE, targetY)
            );

            // 障碍物碰撞检测（使用射线检测法，逐步移动）
            const steps = 10; // 分10步移动，提高检测精度
            const stepX = (targetX - world.player.x) / steps;
            const stepY = (targetY - world.player.y) / steps;
            let finalX = world.player.x;
            let finalY = world.player.y;

            for (let i = 0; i < steps; i++) {
              const nextX = finalX + stepX;
              const nextY = finalY + stepY;

              // 检测是否会撞到障碍物
              let collided = false;
              for (const obstacle of world.obstacles) {
                if (checkRectCollision({ x: nextX, y: nextY }, GAME_CONFIG.PLAYER_SIZE, obstacle)) {
                  collided = true;
                  break;
                }
              }

              if (collided) {
                break; // 撞到障碍物，停止移动
              }

              finalX = nextX;
              finalY = nextY;
            }

            // 造成伤害并击退
            setPlayer((prevPlayer) => {
              const newHp = prevPlayer.hp - damage;
              if (newHp <= 0) {
                setGameState('gameover');
              }
              return {
                ...prevPlayer,
                hp: Math.max(0, newHp),
                x: finalX,
                y: finalY,
                isHit: true,
                hitTime: now,
              };
            });
          }

          // 砸地结束瞬间，触发旋转全方位弹幕
          setBossBarrages((prev) => {
            if (prev.some((b) => b.id.startsWith(`barrage-${monster.id}-`))) return prev;
            return [
              ...prev,
              {
                id: `barrage-${monster.id}-${now}`,
                x: monster.x,
                y: monster.y,
                startTime: now,
                lastEmitTime: now - BOSS_BARRAGE_CONFIG.EMIT_INTERVAL,
              },
            ];
          });

          // 进入硬直阶段
          return {
            ...monster,
            jumpAttackState: 'recovery',
            jumpAttackStartTime: now,
            isInvincible: false, // 取消无敌
          };

        case 'recovery':
          // 硬直阶段：停止移动3秒
          const recoveryDuration = config.jumpAttackRecoveryDuration || 3000;
          if (now - attackStartTime >= recoveryDuration) {
            // 硬直结束，返回idle状态
            return {
              ...monster,
              jumpAttackState: 'idle',
              jumpAttackStartTime: now,
              jumpAttackTargetX: undefined,
              jumpAttackTargetY: undefined,
              jumpAttackStartX: undefined,
              jumpAttackStartY: undefined,
              jumpAttackVelocityX: undefined,
              jumpAttackVelocityY: undefined,
            };
          }
          // 硬直期间停止移动
          break;
      }

      return monster;
    });

    return newMonsters;
  });

  // ========== BOSS 砸地旋转弹幕发射 ==========
  const barrageNow = runtime.now();
  const newFireBalls: EnemyBullet[] = [];
  const emittedBarrageIds = new Set<string>();
  for (const barrage of world.bossBarrages) {
    const barrageElapsed = barrageNow - barrage.startTime;
    if (barrageElapsed >= BOSS_BARRAGE_CONFIG.DURATION) continue;
    if (barrageNow - barrage.lastEmitTime < BOSS_BARRAGE_CONFIG.EMIT_INTERVAL) continue;
    emittedBarrageIds.add(barrage.id);
    const baseAngle = (BOSS_BARRAGE_CONFIG.ANGULAR_SPEED * (barrageElapsed / 1000) * Math.PI) / 180;
    for (let i = 0; i < BOSS_BARRAGE_CONFIG.EMITTER_COUNT; i++) {
      const angle = baseAngle + (i * Math.PI * 2) / BOSS_BARRAGE_CONFIG.EMITTER_COUNT;
      newFireBalls.push({
        id: `fireBall-${barrage.id}-${barrageNow}-${i}`,
        x: barrage.x,
        y: barrage.y,
        vx: Math.cos(angle) * BOSS_BARRAGE_CONFIG.BULLET_SPEED,
        vy: Math.sin(angle) * BOSS_BARRAGE_CONFIG.BULLET_SPEED,
        damage: BOSS_BARRAGE_CONFIG.BULLET_DAMAGE,
        range: BOSS_BARRAGE_CONFIG.BULLET_RANGE,
        distanceTraveled: 0,
        startX: barrage.x,
        startY: barrage.y,
        color: BOSS_BARRAGE_CONFIG.BULLET_COLOR,
        size: BOSS_BARRAGE_CONFIG.BULLET_SIZE / 2,
        hasHitPlayer: false,
        isFireBall: true,
        spawnTime: barrageNow,
      });
    }
  }
  if (newFireBalls.length > 0) {
    setEnemyBullets((prev) => [...prev, ...newFireBalls]);
  }
  if (world.bossBarrages.length > 0) {
    setBossBarrages((prev) =>
      prev
        .filter((b) => barrageNow - b.startTime < BOSS_BARRAGE_CONFIG.DURATION)
        .map((b) => (emittedBarrageIds.has(b.id) ? { ...b, lastEmitTime: barrageNow } : b))
    );
  }
}
