import { deriveCombatStats } from '@/game/rules/combatStats';

import {
  GAME_CONFIG,
  isDesperateFightActive,
  WEAPONS,
  getEquippedWeaponCritPct,
  getWeaponMagazine,
  Bullet,
  hasGrowthChainNode,
} from '@/game';

import type { UpdateWorldContext, TickContext } from './context';

export function weaponSystem(context: UpdateWorldContext, tick: TickContext) {
  const {
    world,
    setPlayer,
    runtime,
    setKeys,
    dashRef,
    setBullets,
    playSound,
    muzzleFlashesRef,
    recoilRef,
  } = context;
  const { now, effectiveReloadTime, weaponConfig, canvas } = tick;
  // 检查R键主动换弹
  if (world.keys.has('r') || world.keys.has('R')) {
    const maxAmmo = (() => {
      if (world.player.weapon === 'rpg') {
        if (hasGrowthChainNode(world.player, 'rpg_dual_barrel')) {
          return 2;
        }
        return WEAPONS[world.player.weapon].magazineSize;
      }
      return getWeaponMagazine(world.player, world.player.weapon);
    })();
    if (!world.player.isReloading && world.player.currentAmmo < maxAmmo) {
      setPlayer((prev) => ({
        ...prev,
        isReloading: true,
        reloadStartTime: runtime.now(),
        reloadInterrupted: false, // 重置中断标志
      }));
      // 移除R键，避免重复触发
      setKeys((prev) => {
        const newKeys = new Set(prev);
        newKeys.delete('r');
        newKeys.delete('R');
        return newKeys;
      });
    }
  }

  // 检查换弹状态
  if (world.player.isReloading) {
    // 检查换弹是否完成
    if (now - world.player.reloadStartTime >= effectiveReloadTime) {
      // 散弹枪特殊处理：一发一发装填
      if (world.player.weapon === 'shotgun') {
        // 填充1发子弹
        const newAmmo = world.player.currentAmmo + 1;
        const maxAmmo = weaponConfig.magazineSize + world.player.magazineSizeBonus;

        if (newAmmo < maxAmmo && !world.player.reloadInterrupted) {
          // 弹夹未满且换弹未被中断，自动触发下一次换弹
          setPlayer((prev) => ({
            ...prev,
            currentAmmo: newAmmo,
            reloadStartTime: runtime.now(), // 重置换弹开始时间，触发下一次换弹
          }));
        } else {
          // 弹夹已满或换弹被中断，结束换弹
          setPlayer((prev) => ({
            ...prev,
            currentAmmo: newAmmo,
            isReloading: false,
            reloadStartTime: 0,
            reloadInterrupted: false, // 重置中断标志
          }));
        }
      } else {
        // 其他武器：一次性填满
        const fullAmmo = (() => {
          if (world.player.weapon === 'rpg') {
            if (hasGrowthChainNode(world.player, 'rpg_dual_barrel')) {
              return 2;
            }
            return weaponConfig.magazineSize;
          }
          return weaponConfig.magazineSize + world.player.magazineSizeBonus;
        })();

        setPlayer((prev) => ({
          ...prev,
          currentAmmo: fullAmmo,
          isReloading: false,
          reloadStartTime: 0,
        }));
      }
    }
  }

  // 射击（切换武器期间无法射击）
  if (
    world.isMouseDown &&
    world.player.currentAmmo > 0 &&
    !world.player.isSwitchingWeapon &&
    !dashRef.current.active
  ) {
    // 如果正在换弹且开枪，终止换弹
    if (world.player.isReloading) {
      setPlayer((prev) => ({
        ...prev,
        isReloading: false,
        reloadStartTime: 0,
        reloadInterrupted: world.player.weapon === 'shotgun', // 散弹枪标记为中断
      }));
    }

    // 狂暴状态：射速+30%（射击间隔减少30%）
    const desperateActive = isDesperateFightActive(world.player);
    const effectiveFireRate = deriveCombatStats(world.player, now).fireInterval;

    if (now - world.player.lastShot > effectiveFireRate) {
      const canvasRect = canvas.getBoundingClientRect();
      const baseAngle = Math.atan2(
        world.mousePos.y - canvasRect.top - GAME_CONFIG.CANVAS_HEIGHT / 2,
        world.mousePos.x - canvasRect.left - GAME_CONFIG.CANVAS_WIDTH / 2
      );

      // 计算枪口位置（与武器渲染保持一致）
      const weaponScale = 1.56;
      let weaponWidth = 50;

      switch (world.player.weapon) {
        case 'pistol':
          weaponWidth = 40;
          break;
        case 'shotgun':
          weaponWidth = 60;
          break;
        case 'smg':
          weaponWidth = 55;
          break;
        case 'sniper':
          weaponWidth = 70;
          break;
        case 'rpg':
          weaponWidth = 80;
          break;
      }

      const scaledWidth = weaponWidth * weaponScale;
      const weaponOffset = GAME_CONFIG.PLAYER_SIZE + 5;

      // 特殊处理手枪和冲锋枪：子弹发射位置缩短到60%
      const isShortRangeWeapon = world.player.weapon === 'pistol' || world.player.weapon === 'smg';
      const rangeMultiplier = isShortRangeWeapon ? 0.6 : 1.0;

      // 特殊处理狙击枪和散弹枪：枪口火焰往旋转中心移动30px
      const sniperMuzzleOffset = world.player.weapon === 'sniper' ? -30 : 0;
      const shotgunMuzzleOffset = world.player.weapon === 'shotgun' ? -30 : 0;
      const muzzleOffset = sniperMuzzleOffset || shotgunMuzzleOffset;

      const gunMuzzleX =
        world.player.x +
        Math.cos(baseAngle) * (weaponOffset + scaledWidth * 0.8 * rangeMultiplier + muzzleOffset);
      const gunMuzzleY =
        world.player.y +
        Math.sin(baseAngle) * (weaponOffset + scaledWidth * 0.8 * rangeMultiplier + muzzleOffset);

      const newBullets: Bullet[] = [];

      // 根据武器类型发射子弹
      const bulletCount = weaponConfig.bulletsPerShot;
      const halfSpread = weaponConfig.spreadAngle / 2;

      for (let i = 0; i < bulletCount; i++) {
        const angle =
          bulletCount > 1
            ? baseAngle - halfSpread + (weaponConfig.spreadAngle * i) / (bulletCount - 1)
            : baseAngle;

        // 添加轻微的随机散射
        const spread =
          weaponConfig.spreadAngle > 0
            ? (runtime.random() - 0.5) * weaponConfig.spreadAngle * 0.3
            : 0;
        const finalAngle = angle + spread;

        // 判断是否暴击（使用有效暴击率，带软上限）
        // 狂暴状态：暴击率+20%，暴击伤害+100%
        const desperateActive = isDesperateFightActive(world.player);
        const critRateBonus =
          world.player.critRateBonus +
          (desperateActive ? 20 : 0) +
          getEquippedWeaponCritPct(world.player);
        const critDamageBonus = world.player.critDamageBonus + (desperateActive ? 100 : 0);
        const effectiveCritRate = deriveCombatStats(world.player, now).critRate;
        const isCrit = runtime.random() < effectiveCritRate;
        const effectiveCritDamage = deriveCombatStats(world.player, now).critDamage;
        const actualDamage = isCrit
          ? Math.floor(world.player.damage * effectiveCritDamage)
          : world.player.damage;

        // 判断是否是火箭弹
        const isRocket = world.player.weapon === 'rpg';

        // 火箭筒专属Buff检测
        const hasRPGShockwave = isRocket && hasGrowthChainNode(world.player, 'rpg_shockwave');
        const hasRPGAPShot = isRocket && hasGrowthChainNode(world.player, 'rpg_ap_shot');
        const hasRPGDualBarrel = isRocket && hasGrowthChainNode(world.player, 'rpg_dual_barrel');

        // 判断是否是手枪的最后一发子弹且拥有该成长链节点
        const isPistolLastBullet =
          world.player.weapon === 'pistol' &&
          world.player.currentAmmo === 1 &&
          hasGrowthChainNode(world.player, 'pistol_last_penetration');

        // === 手枪"孤注一掷"（换弹+40%，最后3发伤害递增50%/100%/200%，最后一发必暴击+穿透）===
        const hasPistolFinalStrike =
          world.player.weapon === 'pistol' &&
          hasGrowthChainNode(world.player, 'pistol_final_strike_chain');
        let pistolStrikeMultiplier = 1; // 伤害倍率
        let pistolForceCrit = false; // 是否强制暴击
        if (hasPistolFinalStrike) {
          const finalAmmoCount = world.player.currentAmmo; // 发射前弹匣余量
          if (finalAmmoCount === 3)
            pistolStrikeMultiplier = 1.5; // 倒数第三发 +50%
          else if (finalAmmoCount === 2)
            pistolStrikeMultiplier = 2; // 倒数第二发 +100%
          else if (finalAmmoCount === 1) {
            pistolStrikeMultiplier = 3;
            pistolForceCrit = true;
          } // 最后一发 +200% 且必暴击
        }
        const finalPistolIsCrit = (isCrit || pistolForceCrit) && !isRocket;
        const finalPistolDamage = Math.floor(
          world.player.damage *
            pistolStrikeMultiplier *
            (finalPistolIsCrit ? effectiveCritDamage : 1)
        );
        const pistolFinalLastPenetrate = hasPistolFinalStrike && world.player.currentAmmo === 1; // 孤注一掷最后一发穿透所有

        // 计算火箭弹的最终速度（受子弹速度增益影响）
        // 初始速度固定为0.3，最终速度为5（基础值）+ 增益
        const rocketInitialSpeed = 0.3;
        const rocketBaseFinalSpeed = 5;
        const bulletSpeedBonus = world.player.bulletSpeed - WEAPONS.rpg.bulletSpeed; // 计算子弹速度增益
        const rocketFinalSpeed = rocketBaseFinalSpeed + Math.max(0, bulletSpeedBonus); // 最终速度只受增益影响

        // 火箭弹参数（根据Buff调整）
        let rpgExplosionRadius = 150; // 基础爆炸半径
        let rpgExplosionDamage = 120; // 基础爆炸伤害
        let rpgScale = 1; // 火箭弹和烟雾的缩放比例

        if (hasRPGAPShot) {
          // 穿甲弹：伤害+200%（×3），范围-80%（×0.2）
          rpgExplosionDamage = 360; // 120 × 3
          rpgExplosionRadius = 30; // 150 × 0.2
        } else if (hasRPGDualBarrel) {
          // 两联装：伤害60%（×0.6），范围70%（×0.7），美术大小60%
          rpgExplosionDamage = 72; // 120 × 0.6
          rpgExplosionRadius = 105; // 150 × 0.7
          rpgScale = 0.6;
        }

        const newBullet: Bullet = {
          id: `bullet-${runtime.now()}-${i}`,
          x: gunMuzzleX,
          y: gunMuzzleY,
          vx: isRocket
            ? Math.cos(finalAngle) * rocketInitialSpeed
            : Math.cos(finalAngle) * world.player.bulletSpeed,
          vy: isRocket
            ? Math.sin(finalAngle) * rocketInitialSpeed
            : Math.sin(finalAngle) * world.player.bulletSpeed,
          weapon: world.player.weapon,
          size: weaponConfig.bulletSize * (isRocket ? rpgScale : 1),
          color: weaponConfig.color,
          damage: isRocket ? 0 : Math.floor(world.player.damage * pistolStrikeMultiplier), // 火箭弹直接伤害为0，同时应用孤注一掷伤害倍率
          isCrit: finalPistolIsCrit, // 应用孤注一掷的强制暴击
          actualDamage: isRocket ? 0 : finalPistolDamage,
          penetration: isRocket
            ? 0
            : isPistolLastBullet || pistolFinalLastPenetrate
              ? 9999
              : world.player.penetration, // 手枪最后一发子弹无限穿透 / 孤注一掷最后一发穿透
          hitCount: 0,
          range: world.player.weaponRange,
          distanceTraveled: 0,
          startX: gunMuzzleX,
          startY: gunMuzzleY,
          isRocket: isRocket,
          explosionRadius: rpgExplosionRadius,
          explosionDamage: rpgExplosionDamage,
          // 火箭弹变速相关字段
          initialSpeed: isRocket ? rocketInitialSpeed : world.player.bulletSpeed,
          finalSpeed: isRocket ? rocketFinalSpeed : world.player.bulletSpeed,
          accelerationStartTime: isRocket ? now : 0,
          accelerationDuration: isRocket ? 2000 : 0, // 加速持续时间2秒
          lastSmokeTime: isRocket ? now : 0, // 上次生成烟雾的时间
          isPistolLastBullet: isPistolLastBullet, // 标记是否是手枪最后一发子弹
          // 火箭筒专属Buff标记
          isRPGShockwave: hasRPGShockwave,
          isRPGAPShot: hasRPGAPShot,
          isRPGDualBarrel: hasRPGDualBarrel,
          rpgScale: rpgScale,
        };

        newBullets.push(newBullet);
      }

      setBullets((prev) => [...prev, ...newBullets]);

      // 播放开火音效
      playSound('shoot');

      // 创建枪火动画（复古像素风格，每帧60ms，总共300ms）
      // 火箭筒不播放枪口火焰特效
      if (world.player.weapon !== 'rpg') {
        const flashId = `muzzle-flash-${runtime.now()}-${runtime.random()}`;
        const flashDuration = 300; // 枪火持续时间（毫秒）- 5帧 × 60ms/帧

        // 特殊处理手枪和冲锋枪：枪火大小缩小30%
        const flashScale = isShortRangeWeapon ? 0.5 * 0.7 : 0.5; // 手枪和冲锋枪35%，其他50%

        muzzleFlashesRef.current.push({
          id: flashId,
          x: gunMuzzleX,
          y: gunMuzzleY,
          angle: baseAngle,
          currentFrame: 0,
          startTime: now,
          duration: flashDuration,
          scale: flashScale,
        });
      }

      // 增加后坐力效果（仅视觉）
      const recoilStrength = weaponConfig.damage * 0.5; // 根据武器伤害决定后坐力强度
      recoilRef.current = {
        backward: 8 + recoilStrength * 0.3, // 后退距离
        upward: 0.08 + recoilStrength * 0.005, // 上跳角度（弧度）
        shake: 2 + recoilStrength * 0.1, // 晃动强度
      };

      setPlayer((prev) => {
        const newAmmo = prev.currentAmmo - 1;
        return {
          ...prev,
          lastShot: now,
          currentAmmo: newAmmo,
          // 弹药用完时自动换弹
          isReloading: newAmmo <= 0 ? true : prev.isReloading,
          reloadStartTime: newAmmo <= 0 ? now : prev.reloadStartTime,
          // 散弹枪重置中断标志
          reloadInterrupted:
            newAmmo <= 0 && prev.weapon === 'shotgun' ? false : prev.reloadInterrupted,
        };
      });

      // ========== 两联装Buff：0.7秒后发射第二发 ==========
      if (hasGrowthChainNode(world.player, 'rpg_dual_barrel') && world.player.currentAmmo >= 1) {
        runtime.schedule(() => {
          // 检查第二发发射条件
          setPlayer((prev) => {
            if (
              prev.weapon !== 'rpg' ||
              prev.currentAmmo < 1 ||
              prev.isSwitchingWeapon ||
              prev.isReloading
            ) {
              return prev;
            }

            const secondNow = runtime.now();
            const canvasRect = canvas.getBoundingClientRect();
            const baseAngle = Math.atan2(
              world.mousePos.y - canvasRect.top - GAME_CONFIG.CANVAS_HEIGHT / 2,
              world.mousePos.x - canvasRect.left - GAME_CONFIG.CANVAS_WIDTH / 2
            );

            // 计算枪口位置
            const weaponScale = 1.56;
            const weaponWidth = 80;
            const scaledWidth = weaponWidth * weaponScale;
            const weaponOffset = GAME_CONFIG.PLAYER_SIZE + 5;
            const gunMuzzleX = prev.x + Math.cos(baseAngle) * (weaponOffset + scaledWidth * 0.8);
            const gunMuzzleY = prev.y + Math.sin(baseAngle) * (weaponOffset + scaledWidth * 0.8);

            // 第二发火箭弹参数（两联装模式）
            const rpgScale = 0.6;
            const rpgExplosionRadius = 105; // 150 × 0.7
            const rpgExplosionDamage = 72; // 120 × 0.6
            const rocketInitialSpeed = 0.3;
            const rocketBaseFinalSpeed = 5;
            const bulletSpeedBonus = prev.bulletSpeed - WEAPONS.rpg.bulletSpeed;
            const rocketFinalSpeed = rocketBaseFinalSpeed + Math.max(0, bulletSpeedBonus);

            const secondBullet: Bullet = {
              id: `bullet-${runtime.now()}-second`,
              x: gunMuzzleX,
              y: gunMuzzleY,
              vx: Math.cos(baseAngle) * rocketInitialSpeed,
              vy: Math.sin(baseAngle) * rocketInitialSpeed,
              weapon: 'rpg',
              size: WEAPONS.rpg.bulletSize * rpgScale,
              color: WEAPONS.rpg.color,
              damage: 0,
              isCrit: false,
              actualDamage: 0,
              penetration: 0,
              hitCount: 0,
              range: prev.weaponRange,
              distanceTraveled: 0,
              startX: gunMuzzleX,
              startY: gunMuzzleY,
              isRocket: true,
              explosionRadius: rpgExplosionRadius,
              explosionDamage: rpgExplosionDamage,
              initialSpeed: rocketInitialSpeed,
              finalSpeed: rocketFinalSpeed,
              accelerationStartTime: secondNow,
              accelerationDuration: 2000,
              lastSmokeTime: secondNow,
              isRPGShockwave: hasGrowthChainNode(prev, 'rpg_shockwave'),
              isRPGAPShot: hasGrowthChainNode(prev, 'rpg_ap_shot'),
              isRPGDualBarrel: true,
              rpgScale: rpgScale,
            };

            setBullets((prevBullets) => [...prevBullets, secondBullet]);
            playSound('shoot');

            return {
              ...prev,
              lastShot: secondNow,
              currentAmmo: prev.currentAmmo - 1,
              isReloading: prev.currentAmmo - 1 <= 0 ? true : prev.isReloading,
              reloadStartTime: prev.currentAmmo - 1 <= 0 ? secondNow : prev.reloadStartTime,
            };
          });
        }, 700); // 0.7秒后发射第二发
      }
    }
  }
}
