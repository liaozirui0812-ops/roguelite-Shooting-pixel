import { settleEnemyDeath } from '@/game/systems/death';

import { resolveMonsterDamage } from '@/game/rules/damage';

import { Coin, MONSTER_CONFIGS } from '@/game';

import type { GameWorld } from '@/game/model/World';
import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { SoundType } from '@/hooks/useSound';

export interface ExplosionContext {
  runtime: GameRuntime<GameWorld>;
  world: GameWorld;
  playSound: (sound: SoundType) => void;
  triggerScreenShake: (intensity: number) => void;
  triggerVampireHeal: (amount: number) => void;
  boomImage: HTMLImageElement | null;
}

export function explodeWorld(
  context: ExplosionContext,
  x: number,
  y: number,
  radius: number,
  damage: number,
  hasShockwave: boolean = false,
  hasAPShot: boolean = false
) {
  const { runtime, world, playSound, triggerScreenShake, triggerVampireHeal, boomImage } = context;
  const setMonsters = runtime.setter('monsters');
  const setDamageNumbers = runtime.setter('damageNumbers');
  const setAccumulatedDamage = runtime.setter('accumulatedDamage');
  const setMonstersRemaining = runtime.setter('monstersRemaining');
  const setScore = runtime.setter('score');
  const setBossAlive = runtime.setter('bossAlive');
  const setCoins = runtime.setter('coins');
  const setPlayer = runtime.setter('player');
  const setExplosionEffects = runtime.setter('explosionEffects');

  // 播放爆炸音效
  playSound('explosion');

  // 触发震屏效果（打击感）：强度随爆炸范围增大，封顶避免过强
  triggerScreenShake(Math.min(12, 4 + radius / 40));

  setMonsters((prevMonsters) => {
    const now = runtime.now();
    return prevMonsters.map((monster) => {
      // 如果怪物处于无敌状态，跳过伤害
      if (monster.isInvincible) {
        return monster;
      }

      // 计算怪物到爆炸点的距离
      const dist = Math.sqrt(Math.pow(monster.x - x, 2) + Math.pow(monster.y - y, 2));

      // 如果在爆炸范围内，造成伤害
      if (dist <= radius && !monster.isDying) {
        // 根据距离分段计算伤害（150px半径版本）
        let damageMultiplier = 0;
        if (dist <= 60) {
          damageMultiplier = 1.0; // 100%伤害
        } else if (dist <= 120) {
          damageMultiplier = 0.7; // 70%伤害
        } else if (dist <= 150) {
          damageMultiplier = 0.3; // 30%伤害
        }

        // 穿甲弹Buff：伤害+200%
        let actualDamage = Math.floor(damage * damageMultiplier);
        if (hasAPShot) {
          actualDamage = Math.floor(actualDamage * 3); // +200% = ×3
        }

        // ========== 词缀伤害拦截（如护盾抵挡伤害事件） ==========
        const affixExpResult = resolveMonsterDamage({
          target: monster,
          amount: actualDamage,
          source: 'explosion',
          interceptAffix: true,
          respectInvincible: true,
        });
        const affixExpMonster = affixExpResult.monster;
        actualDamage = affixExpResult.actualDamage;

        const newHp = affixExpMonster.hp - actualDamage;

        // 词缀完全抵挡（护盾），跳过本次伤害累加与死亡逻辑
        if (affixExpResult.blocked) {
          const now = runtime.now();
          setDamageNumbers((prevDamage) => [
            ...prevDamage,
            {
              id: `shield-block-exp-${monster.id}-${now}`,
              monsterId: monster.id,
              x: affixExpMonster.x,
              y: affixExpMonster.y - 20,
              damage: 0,
              opacity: 0.8,
              scale: 0.8,
              startTime: now,
              isCrit: false,
              isShieldBlock: true,
            },
          ]);
          return affixExpMonster;
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
              isCrit: existing.isCrit || false,
              isDoubleCrit: existing.isDoubleCrit || false,
              lastTime: now,
              x: monster.x,
              y: monster.y,
            });
          } else {
            // 新的伤害
            newMap.set(monster.id, {
              damage: actualDamage,
              isCrit: false,
              isDoubleCrit: false,
              lastTime: now,
              x: monster.x,
              y: monster.y,
            });
          }
          return newMap;
        });

        if (newHp <= 0) {
          if (!settleEnemyDeath(runtime, affixExpMonster))
            return { ...affixExpMonster, hp: 0, isDying: true };

          // 立即释放累加的伤害数字
          setAccumulatedDamage((prev) => {
            const accumulated = prev.get(monster.id);
            if (accumulated) {
              const now = runtime.now();
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
              // 从累加器中移除
              const newMap = new Map(prev);
              newMap.delete(monster.id);
              return newMap;
            }
            return prev;
          });

          // 生成金币和宝箱（与普通子弹击杀相同的逻辑）
          const config = MONSTER_CONFIGS[monster.monsterType];
          const goldValue = config.goldBase * world.level;

          if (monster.isBoss) {
            // BOSS死亡掉落
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
                value: 3 + Math.floor(world.level / 2),
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
                size: 30,
                color: '#FFD700',
                spawnTime: runtime.now(),
                isCollected: false,
                collectAnimationProgress: 0,
              };

              setCoins((prev) => [...prev, newCoin]);
            }

            // BOSS死亡时也掉落新物品
            // 武器属性加成箱：BOSS掉落权重 = (3 + level) × 15
            const bossWeaponBoxDropWeight = (3 + world.level) * 15;
            if (runtime.random() * 100 < bossWeaponBoxDropWeight) {
              const newWeaponBox: Coin = {
                id: `weapon-box-${runtime.now()}-${runtime.random()}`,
                x: monster.x + (runtime.random() - 0.5) * 100,
                y: monster.y + (runtime.random() - 0.5) * 100,
                type: 'weapon_upgrade_box',
                value: 0,
                size: 30,
                color: '#FF69B4',
                spawnTime: runtime.now(),
                isCollected: false,
                collectAnimationProgress: 0,
              };
              setCoins((prev) => [...prev, newWeaponBox]);
            }

            // 治疗瓶：BOSS掉落权重 = 已损失生命值 × 15
            const bossLostHp = world.player.maxHp - world.player.hp;
            const bossHealthPotionDropWeight = bossLostHp * 15;
            if (runtime.random() * 100 < bossHealthPotionDropWeight) {
              const newHealthPotion: Coin = {
                id: `health-potion-${runtime.now()}-${runtime.random()}`,
                x: monster.x + (runtime.random() - 0.5) * 100,
                y: monster.y + (runtime.random() - 0.5) * 100,
                type: 'health_potion',
                value: 0,
                size: 30,
                color: '#32CD32',
                spawnTime: runtime.now(),
                isCollected: false,
                collectAnimationProgress: 0,
              };
              setCoins((prev) => [...prev, newHealthPotion]);
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

            // 敌人3和4有概率掉落宝箱
            if (monster.monsterType === 3 || monster.monsterType === 4) {
              const chestDropChance = 0.1 + world.level * 0.02;
              if (runtime.random() < chestDropChance) {
                const newChest: Coin = {
                  id: `chest-${runtime.now()}-${runtime.random()}`,
                  x: monster.x,
                  y: monster.y,
                  type: 'chest',
                  value: 3 + Math.floor(world.level / 2),
                  size: 25,
                  color: '#FFD700',
                  spawnTime: runtime.now(),
                  isCollected: false,
                  collectAnimationProgress: 0,
                };

                setCoins((prev) => [...prev, newChest]);
              }
            }

            // 掉落新物品：武器属性加成箱和治疗瓶
            // 怪物掉落权重：敌人1=1，敌人2=2，敌人3=2，敌人4=5，BOSS=15
            const monsterDropWeights: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 5 };
            const dropWeight = monster.isBoss ? 15 : monsterDropWeights[monster.monsterType] || 1;

            // 武器属性加成箱：掉落权重 = (3 + level) × 怪物权重
            const weaponBoxDropWeight = (3 + world.level) * dropWeight;
            if (runtime.random() * 100 < weaponBoxDropWeight) {
              const newWeaponBox: Coin = {
                id: `weapon-box-${runtime.now()}-${runtime.random()}`,
                x: monster.x + (runtime.random() - 0.5) * 40,
                y: monster.y + (runtime.random() - 0.5) * 40,
                type: 'weapon_upgrade_box',
                value: 0, // 不需要value
                size: 25,
                color: '#FF69B4',
                spawnTime: runtime.now(),
                isCollected: false,
                collectAnimationProgress: 0,
              };
              setCoins((prev) => [...prev, newWeaponBox]);
            }

            // 治疗瓶：掉落权重 = 已损失生命值 × 怪物权重
            const lostHp = world.player.maxHp - world.player.hp;
            const healthPotionDropWeight = lostHp * dropWeight;
            if (runtime.random() * 100 < healthPotionDropWeight) {
              const newHealthPotion: Coin = {
                id: `health-potion-${runtime.now()}-${runtime.random()}`,
                x: monster.x + (runtime.random() - 0.5) * 40,
                y: monster.y + (runtime.random() - 0.5) * 40,
                type: 'health_potion',
                value: 0, // 不需要value
                size: 25,
                color: '#32CD32',
                spawnTime: runtime.now(),
                isCollected: false,
                collectAnimationProgress: 0,
              };
              setCoins((prev) => [...prev, newHealthPotion]);
            }
          }

          // 吸血buff判定：如果玩家有吸血等级，10%概率回复1点生命
          if (world.player.vampireLevel > 0) {
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

          return {
            ...affixExpMonster,
            hp: 0,
            isDying: true,
            deathAnimationStartTime: now,
            deathAnimationProgress: 0,
          };
        } else {
          let updatedMonster = { ...affixExpMonster, hp: newHp, isHit: true, lastHitTime: now };

          // 冲击波Buff：对未死亡的敌人进行击退和减速
          if (hasShockwave && dist > 0) {
            // 计算击退方向（从爆炸中心反方向）
            const dx = monster.x - x;
            const dy = monster.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 击退30px
            const knockbackDistance = 30;
            const knockbackVx = (dx / distance) * (knockbackDistance / 0.1); // 0.1秒内完成击退
            const knockbackVy = (dy / distance) * (knockbackDistance / 0.1);

            // 1.5秒内减速70%（减速倍率0.3）
            updatedMonster = {
              ...updatedMonster,
              knockbackVx: knockbackVx,
              knockbackVy: knockbackVy,
              knockbackEndTime: now + 100, // 击退持续0.1秒
              shockwaveSlowdownEndTime: now + 1500, // 减速持续1.5秒
              shockwaveSlowdownMultiplier: 0.3, // 70%减速
            };
          }

          return updatedMonster;
        }
      }
      return monster;
    });
  });

  // 添加爆炸视觉效果
  const now = runtime.now();

  // 计算Boom.png的总帧数（每帧256x256px）
  const totalFrames = boomImage ? Math.floor(boomImage.width / 256) : 8;
  const frameDuration = 30; // 每帧30ms

  setExplosionEffects((prev) => [
    ...prev,
    {
      id: `explosion-${x}-${y}-${now}`,
      x: x,
      y: y,
      radius: radius * 0.8, // 爆炸动画大小降低为80%
      startTime: now,
      maxRadius: radius * 1.5 * 0.8, // 爆炸动画最大半径降低为80%
      totalFrames: totalFrames,
      frameDuration: frameDuration,
      firstPassComplete: false,
      rotation: runtime.random() * Math.PI * 2, // 随机旋转角度（0-360度）
    },
  ]);
}
