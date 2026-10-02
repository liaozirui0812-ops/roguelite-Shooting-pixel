import { GAME_CONFIG, getWeaponMagazine, MAX_VALUES, CoinTrailParticle } from '@/game';

import type { UpdateWorldContext, TickContext } from './context';

export function pickupSystem(context: UpdateWorldContext, tick: TickContext) {
  const { setCoins, world, setPlayer, setGoldFloatingTexts, runtime } = context;

  // 拾取金币和宝箱（添加80px范围内的自动吸附）
  setCoins((prev) => {
    const updatedCoins = prev.map((coin) => {
      if (coin.isCollected) {
        // 更新收集动画
        return {
          ...coin,
          collectAnimationProgress: Math.min(1, coin.collectAnimationProgress + 0.1),
        };
      }

      // 检测玩家与金币/宝箱碰撞
      const dx = world.player.x - coin.x;
      const dy = world.player.y - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 计算金币拾取范围（初始范围 + 加成百分比 × 初始范围）
      const coinPickupRange =
        GAME_CONFIG.COIN_PICKUP_RANGE * (1 + world.player.coinPickupRangeBonus / 100);

      // 金币拾取范围内自动吸附
      if (dist < coinPickupRange) {
        // 先检测是否应该拾取（在吸附范围内直接碰撞）
        const pickupDist = GAME_CONFIG.PLAYER_SIZE + coin.size + 10; // 增加10px缓冲
        if (dist < pickupDist) {
          // 拾取金币或宝箱
          if (coin.type === 'chest') {
            // 拾取宝箱，获得金币
            setPlayer((prevPlayer) => ({
              ...prevPlayer,
              gold: prevPlayer.gold + coin.value,
            }));
          } else if (coin.type === 'weapon_upgrade_box') {
            // 拾取武器属性加成箱（固定升1级，获得3%加成）
            const upgradePercentage = 3; // 固定3%

            setPlayer((prevPlayer) => {
              const weaponUpgradeMultiplier = 1 + upgradePercentage / 100;
              const newPlayer = {
                ...prevPlayer,
                weaponLevel: prevPlayer.weaponLevel + 1,
                damage: Math.floor(prevPlayer.damage * weaponUpgradeMultiplier),
                fireRate: Math.max(
                  50,
                  Math.floor(prevPlayer.fireRate * (1 - upgradePercentage / 100))
                ),
                weaponRange: Math.min(
                  Math.floor(prevPlayer.weaponRange * weaponUpgradeMultiplier),
                  MAX_VALUES.weaponRange
                ),
                bulletSpeed: Math.floor(prevPlayer.bulletSpeed * weaponUpgradeMultiplier),
                currentAmmo: getWeaponMagazine(prevPlayer, world.player.weapon), // 补满弹夹
              };
              // 限制武器属性加成不超过最大值
              newPlayer.damageBonus = Math.min(
                newPlayer.damageBonus + upgradePercentage,
                MAX_VALUES.weaponUpgrade
              );
              newPlayer.fireRateBonus = Math.min(
                newPlayer.fireRateBonus + upgradePercentage,
                MAX_VALUES.weaponUpgrade
              );
              newPlayer.weaponRangeBonus = Math.min(
                newPlayer.weaponRangeBonus + upgradePercentage,
                MAX_VALUES.weaponUpgrade
              );
              return newPlayer;
            });

            // 添加武器升级弹字
            const playerY = world.player.y - 60;
            setGoldFloatingTexts((prev) => [
              ...prev,
              {
                id: `weapon-text-${runtime.now()}-${runtime.random()}`,
                x: world.player.x,
                y: playerY,
                initialY: playerY,
                value: upgradePercentage,
                opacity: 1.0,
                scale: 1.0,
                startTime: runtime.now(),
                text: `武器属性+${upgradePercentage}%`,
                color: '#FF69B4', // 粉色
              },
            ]);

            return { ...coin, isCollected: true };
          } else if (coin.type === 'health_potion') {
            // 拾取治疗瓶
            const healAmount = Math.floor(5 + world.level * 1.2);

            setPlayer((prevPlayer) => {
              const newHp = Math.min(prevPlayer.hp + healAmount, prevPlayer.maxHp);
              return {
                ...prevPlayer,
                hp: newHp,
              };
            });

            // 添加治疗弹字（黑色描边的绿色字）
            const playerY = world.player.y - 60;
            setGoldFloatingTexts((prev) => [
              ...prev,
              {
                id: `heal-text-${runtime.now()}-${runtime.random()}`,
                x: world.player.x,
                y: playerY,
                initialY: playerY,
                value: healAmount,
                opacity: 1.0,
                scale: 1.0,
                startTime: runtime.now(),
                text: `+${healAmount}`,
                color: '#32CD32', // 绿色
              },
            ]);

            return { ...coin, isCollected: true };
          } else {
            // 拾取金币
            setPlayer((prevPlayer) => ({
              ...prevPlayer,
              gold: prevPlayer.gold + coin.value,
            }));
          }

          // 添加金币获取弹字
          const playerY = world.player.y - 60;
          setGoldFloatingTexts((prev) => [
            ...prev,
            {
              id: `gold-text-${runtime.now()}-${runtime.random()}`,
              x: world.player.x,
              y: playerY,
              initialY: playerY,
              value: coin.value,
              opacity: 1.0,
              scale: 1.0,
              startTime: runtime.now(),
            },
          ]);

          return {
            ...coin,
            isCollected: true,
          };
        }

        // 标记为正在被吸引
        if (!coin.isAttracting) {
          return {
            ...coin,
            isAttracting: true,
            attractTargetX: world.player.x,
            attractTargetY: world.player.y,
            trailParticles: [],
          };
        }

        // 计算吸引速度（距离越近速度越快）
        const attractSpeed = 0.15; // 吸引速度
        const moveX = (world.player.x - coin.x) * attractSpeed;
        const moveY = (world.player.y - coin.y) * attractSpeed;

        // 生成拖尾粒子
        const newTrailParticle: CoinTrailParticle = {
          id: `trail-${coin.id}-${runtime.now()}-${runtime.random()}`,
          x: coin.x,
          y: coin.y,
          size: coin.size * 0.6,
          opacity: 0.8,
          life: 0,
          maxLife: 300, // 粒子存在300ms
        };

        return {
          ...coin,
          x: coin.x + moveX,
          y: coin.y + moveY,
          trailParticles: [...(coin.trailParticles || []).slice(-6), newTrailParticle],
        };
      }

      // 直接碰撞拾取（80px范围外）
      if (dist < GAME_CONFIG.PLAYER_SIZE + coin.size) {
        // 拾取金币或宝箱
        if (coin.type === 'chest') {
          // 拾取宝箱，获得金币
          setPlayer((prevPlayer) => ({
            ...prevPlayer,
            gold: prevPlayer.gold + coin.value,
          }));
        } else {
          // 拾取金币
          setPlayer((prevPlayer) => ({
            ...prevPlayer,
            gold: prevPlayer.gold + coin.value,
          }));
        }

        // 添加金币获取弹字
        const playerY = world.player.y - 60;
        setGoldFloatingTexts((prev) => [
          ...prev,
          {
            id: `gold-text-${runtime.now()}-${runtime.random()}`,
            x: world.player.x,
            y: playerY,
            initialY: playerY,
            value: coin.value,
            opacity: 1.0,
            scale: 1.0,
            startTime: runtime.now(),
          },
        ]);

        return {
          ...coin,
          isCollected: true,
        };
      }

      return coin;
    });

    // 移除动画完成的金币/宝箱
    return updatedCoins.filter((coin) => !coin.isCollected || coin.collectAnimationProgress < 1);
  });
}
