import { DamageNumber, AffixExplosionParticle, PlayerHitParticle, GoldFloatingText } from '@/game';

import type { UpdateWorldContext, TickContext } from './context';

export function effectSystem(context: UpdateWorldContext, tick: TickContext) {
  const {
    setAccumulatedDamage,
    runtime,
    setDamageNumbers,
    setCoins,
    setGoldFloatingTexts,
    setExplosionEffects,
    setPierceEffects,
    setSmokeEffects,
    setVampireHealEffects,
    setAffixExplosionParticles,
    setPlayerHitParticles,
  } = context;
  const { now } = tick;
  // 释放累加的伤害数字（超过0.3秒的）
  setAccumulatedDamage((prev) => {
    const now = runtime.now();
    const releaseTime = 100; // 0.1秒
    const newDamageNumbers: DamageNumber[] = [];
    const newMap = new Map(prev);

    // 检查所有累加的伤害
    for (const [monsterId, data] of prev.entries()) {
      if (now - data.lastTime >= releaseTime) {
        // 超过0.3秒，释放伤害数字
        newDamageNumbers.push({
          id: `damage-${monsterId}-${now}`,
          monsterId: monsterId,
          x: data.x,
          y: data.y - 10,
          damage: data.damage,
          opacity: 1.0,
          scale: 1.0,
          startTime: now,
          isCrit: data.isCrit,
          isDoubleCrit: data.isDoubleCrit,
        });
        // 从累加器中移除
        newMap.delete(monsterId);
      }
    }

    // 添加到伤害数字列表
    if (newDamageNumbers.length > 0) {
      setDamageNumbers((prev) => [...prev, ...newDamageNumbers]);
    }

    return newMap;
  });

  // 更新伤害数字状态
  setDamageNumbers((prev) => {
    const now = runtime.now();
    const lifetime = 1000; // 伤害数字显示1秒
    const moveDuration = lifetime / 5; // 只在前20%的时间移动

    return prev
      .map((damageNum) => {
        const age = now - damageNum.startTime;
        if (age >= lifetime) return null;

        // 计算动画进度
        const progress = age / lifetime;
        const moveProgress = Math.min(age / moveDuration, 1); // 移动进度，最大为1

        // 计算新的Y位置（只在移动阶段向上浮动）
        const moveDistance = 0.4; // 总移动距离（降低80%，从2降低到0.4）
        const newY = damageNum.y - moveDistance * (1 - Math.pow(1 - moveProgress, 2)); // 使用缓动效果

        // 渐变消失效果（最后20%开始快速淡出）
        let opacity = 1.0;
        const fadeStart = 0.8; // 80%时开始淡出
        if (progress > fadeStart) {
          opacity = 1.0 - (progress - fadeStart) / (1 - fadeStart);
        }

        return {
          ...damageNum,
          opacity: opacity,
          scale: 1.0 + progress * 0.3, // 稍微放大
          y: newY,
        };
      })
      .filter((num): num is DamageNumber => num !== null);
  });

  // 更新金币拖尾粒子
  setCoins((prev) => {
    return prev.map((coin) => {
      if (!coin.trailParticles || coin.trailParticles.length === 0) {
        return coin;
      }

      const updatedParticles = coin.trailParticles
        .map((particle) => ({
          ...particle,
          life: particle.life + runtime.stepMs, // 假设60fps，每帧约16.67ms
          opacity: 0.8 * (1 - particle.life / particle.maxLife),
        }))
        .filter((particle) => particle.life < particle.maxLife);

      return {
        ...coin,
        trailParticles: updatedParticles,
      };
    });
  });

  // 更新金币弹字状态
  setGoldFloatingTexts((prev) => {
    const now = runtime.now();
    const lifetime = 1000; // 金币弹字显示1秒
    const moveDuration = lifetime / 5; // 只在前20%的时间移动

    return prev
      .map((text) => {
        const age = now - text.startTime;
        if (age >= lifetime) return null;

        // 计算动画进度
        const progress = age / lifetime;
        const moveProgress = Math.min(age / moveDuration, 1); // 移动进度，最大为1

        // 计算新的Y位置（只在移动阶段向上浮动，基于初始位置）
        const moveDistance = 5; // 总移动距离5px
        const newY = text.initialY - moveDistance * (1 - Math.pow(1 - moveProgress, 2)); // 使用缓动效果

        // 渐变消失效果（最后20%开始快速淡出）
        let opacity = 1.0;
        const fadeStart = 0.8; // 80%时开始淡出
        if (progress > fadeStart) {
          opacity = 1.0 - (progress - fadeStart) / (1 - fadeStart);
        }

        return {
          ...text,
          opacity: opacity,
          scale: 1.0 + progress * 0.3, // 稍微放大
          y: newY,
        };
      })
      .filter((text): text is GoldFloatingText => text !== null);
  });

  // 更新爆炸效果（移除过期的）
  setExplosionEffects((prev) =>
    prev.filter(
      (explosion) => now - explosion.startTime < explosion.totalFrames * explosion.frameDuration
    )
  );

  // 更新穿透光效（移除过期的）
  setPierceEffects((prev) => prev.filter((p) => now - p.startTime < p.duration));

  // 更新烟雾效果（移除过期的）
  setSmokeEffects((prev) => prev.filter((smoke) => now - smoke.startTime < smoke.duration));

  // 更新吸血回复效果（移除过期的）
  setVampireHealEffects((prev) => prev.filter((effect) => now - effect.startTime < 800));

  // 更新词缀爆炸粒子（移动 + 移除过期的）
  setAffixExplosionParticles((prev) => {
    const alive = [] as AffixExplosionParticle[];
    for (const p of prev) {
      const elapsed = now - p.startTime;
      if (elapsed >= p.duration) continue;
      alive.push({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vx: p.vx * 0.96,
        vy: p.vy * 0.96,
      });
    }
    return alive;
  });

  // 更新玩家受击蓝色粒子（移动 + 阻尼 + 移除过期的）
  setPlayerHitParticles((prev) => {
    const alive = [] as PlayerHitParticle[];
    for (const p of prev) {
      const elapsed = now - p.startTime;
      if (elapsed >= p.duration) continue;
      alive.push({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vx: p.vx * 0.92,
        vy: p.vy * 0.92,
      });
    }
    return alive;
  });
}
