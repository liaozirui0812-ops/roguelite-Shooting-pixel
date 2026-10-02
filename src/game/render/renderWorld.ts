import { SPRITE_ATLASES, atlasFrame } from '@/game/assets/atlases';
import { deriveCombatStats } from '@/game/rules/combatStats';
import type React from 'react';
import {
  GAME_CONFIG,
  isDesperateFightActive,
  WEAPONS,
  BOSS_BARRAGE_CONFIG,
  AffixSystem,
  MuzzleFlash,
  MONSTER_CONFIGS,
} from '@/game';
import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';

export interface RenderWorldContext {
  t: (key: string) => string;
  world: GameWorld;
  runtime: GameRuntime<GameWorld>;
  screenShakeRef: React.RefObject<number>;
  CAMERA_FOLLOW_CONFIG: {
    TAU: number;
    DEAD_ZONE_RADIUS: number;
    LAG_LIMIT_RATIO: number;
    LAG_CATCHUP_TIME: number;
    HOME_TAU: number;
  };
  cameraPosRef: React.RefObject<{ x: number; y: number }>;
  cameraTargetRef: React.RefObject<{ x: number; y: number }>;
  cameraInitRef: React.RefObject<boolean>;
  playerPrevPosRef: React.RefObject<{ x: number; y: number }>;
  baseTransformRef: React.RefObject<DOMMatrix | null>;
  mapBackgroundCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  obstacleImages: Record<string, HTMLImageElement>;
  rocketImage: HTMLImageElement | null;
  bulletImage: HTMLImageElement | null;
  bossFireBallImage: HTMLImageElement | null;
  ballImage: HTMLImageElement | null;
  rangeImage: HTMLImageElement | null;
  bossImage: HTMLImageElement | null;
  boss2Image: HTMLImageElement | null;
  enemy_1Image: HTMLImageElement | null;
  enemy_2Image: HTMLImageElement | null;
  enemy_3Image: HTMLImageElement | null;
  enemy_4_2Image: HTMLImageElement | null;
  enemy_4_1Image: HTMLImageElement | null;
  chestImage: HTMLImageElement | null;
  weaponUpgradeBoxImage: HTMLImageElement | null;
  healthPotionImage: HTMLImageElement | null;
  coinImage: HTMLImageElement | null;
  boomImage: HTMLImageElement | null;
  DASH_COOLDOWN_MS: number;
  skillIconImage: HTMLImageElement | null;
  smokeImage: HTMLImageElement | null;
  playerWalkImage: HTMLImageElement | null;
  playerIdleImage: HTMLImageElement | null;
  dashRef: React.RefObject<{
    active: boolean;
    startTime: number;
    fromX: number;
    fromY: number;
    dirX: number;
    dirY: number;
    recoveryStart: number;
  }>;
  playerDashImage: HTMLImageElement | null;
  getWeaponImage: () => HTMLImageElement | null;
  recoilRef: React.RefObject<{ backward: number; upward: number; shake: number }>;
  fireImage: HTMLImageElement | null;
  muzzleFlashesRef: React.RefObject<MuzzleFlash[]>;
  pauseImage: HTMLImageElement | null;
  arrowImage: HTMLImageElement | null;
  hpBarImage: HTMLImageElement | null;
  hpGreenImage: HTMLImageElement | null;
  hpYellowImage: HTMLImageElement | null;
  hpRedImage: HTMLImageElement | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function renderWorld(context: RenderWorldContext, deltaTime: number) {
  const {
    t,
    world,
    runtime,
    screenShakeRef,
    CAMERA_FOLLOW_CONFIG,
    cameraPosRef,
    cameraTargetRef,
    cameraInitRef,
    playerPrevPosRef,
    baseTransformRef,
    mapBackgroundCanvasRef,
    obstacleImages,
    rocketImage,
    bulletImage,
    bossFireBallImage,
    ballImage,
    rangeImage,
    bossImage,
    boss2Image,
    enemy_1Image,
    enemy_2Image,
    enemy_3Image,
    enemy_4_2Image,
    enemy_4_1Image,
    chestImage,
    weaponUpgradeBoxImage,
    healthPotionImage,
    coinImage,
    boomImage,
    DASH_COOLDOWN_MS,
    skillIconImage,
    smokeImage,
    playerWalkImage,
    playerIdleImage,
    dashRef,
    playerDashImage,
    getWeaponImage,
    recoilRef,
    fireImage,
    muzzleFlashesRef,
    pauseImage,
    arrowImage,
    hpBarImage,
    hpGreenImage,
    hpYellowImage,
    hpRedImage,
    canvasRef,
  } = context;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 绘制暂停画面的函数
  const drawPauseScreen = (context: CanvasRenderingContext2D) => {
    // 绘制半透明黑色遮罩（不透明度70%）
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // 显示"游戏暂停"文本
    context.fillStyle = '#ffffff';
    context.font = 'bold 36px "Ark Pixel", Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(t('gamePaused'), GAME_CONFIG.CANVAS_WIDTH / 2, 50);

    // ========== 左侧：数值属性面板 ==========
    const leftPanelX = 40;
    const leftPanelY = 90;
    const leftPanelWidth = 280;
    const leftPanelHeight = 420;

    // 绘制左侧面板背景
    context.fillStyle = 'rgba(30, 30, 50, 0.9)';
    context.strokeStyle = 'rgba(100, 100, 150, 0.8)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(leftPanelX, leftPanelY, leftPanelWidth, leftPanelHeight, 10);
    context.fill();
    context.stroke();

    // 左侧面板标题
    context.fillStyle = '#ffd700';
    context.font = 'bold 20px "Ark Pixel", Arial';
    context.textAlign = 'left';
    context.fillText(t('statsPanel'), leftPanelX + 15, leftPanelY + 30);

    // 分隔线
    context.strokeStyle = 'rgba(100, 100, 150, 0.5)';
    context.beginPath();
    context.moveTo(leftPanelX + 15, leftPanelY + 45);
    context.lineTo(leftPanelX + leftPanelWidth - 15, leftPanelY + 45);
    context.stroke();

    // 获取当前武器配置
    const currentWeapon = WEAPONS[world.player.weapon];

    // 计算实际属性值
    const stats = deriveCombatStats(world.player, runtime.now());
    const actualMaxHp = stats.maxHp;
    const actualDamage = stats.damage;
    const actualCritRate = stats.critRate;
    const actualCritDamage = stats.critDamage;
    const actualFireRate = Math.floor((1000 / stats.fireInterval) * 10) / 10;
    const actualSpeed = stats.moveSpeed.toFixed(1);
    const actualRange = stats.range;
    const actualPenetration = stats.penetration;
    const actualMagazineSize = stats.magazineSize;

    // 属性列表（格式：名称, 当前值, 加成值, 单位）
    const attributes: {
      name: string;
      current: string;
      bonus: string | null;
      isPercent?: boolean;
    }[] = [
      {
        name: t('attrMaxHp'),
        current: `${actualMaxHp}`,
        bonus: world.player.maxHpBonus > 0 ? `+${world.player.maxHpBonus}` : null,
      },
      {
        name: t('attrDamage'),
        current: `${actualDamage}`,
        bonus: world.player.damageBonus > 0 ? `+${world.player.damageBonus}` : null,
      },
      {
        name: t('attrCritRate'),
        current: `${(actualCritRate * 100).toFixed(0)}%`,
        bonus: world.player.critRateBonus > 0 ? `+${world.player.critRateBonus}%` : null,
        isPercent: true,
      },
      {
        name: t('attrCritDamage'),
        current: `${(actualCritDamage * 100).toFixed(0)}%`,
        bonus:
          world.player.critDamageBonus > 0 ? `+${world.player.critDamageBonus.toFixed(0)}%` : null,
        isPercent: true,
      },
      {
        name: t('attrFireRate'),
        current: `${actualFireRate}/秒`,
        bonus: world.player.fireRateBonus > 0 ? `+${world.player.fireRateBonus}%` : null,
      },
      {
        name: t('attrMoveSpeed'),
        current: actualSpeed,
        bonus: world.player.playerSpeedBonus > 0 ? `+${world.player.playerSpeedBonus}%` : null,
      },
      {
        name: t('attrRange'),
        current: `${actualRange}`,
        bonus: world.player.weaponRangeBonus > 0 ? `+${world.player.weaponRangeBonus}%` : null,
      },
      {
        name: t('attrPenetration'),
        current: `${actualPenetration}`,
        bonus: world.player.penetrationBonus > 0 ? `+${world.player.penetrationBonus}` : null,
      },
      {
        name: t('attrMagazine'),
        current: `${actualMagazineSize}`,
        bonus: world.player.magazineSizeBonus > 0 ? `+${world.player.magazineSizeBonus}` : null,
      },
      {
        name: t('attrReload'),
        current: `${world.player.reloadSpeedBonus}%`,
        bonus: world.player.reloadSpeedBonus > 0 ? null : null,
      },
      { name: t('attrCoinPickup'), current: `${world.player.coinPickupRangeBonus}%`, bonus: null },
    ];

    // 绘制属性列表
    let attrY = leftPanelY + 70;
    const lineHeight = 32;

    attributes.forEach((attr) => {
      // 属性名称
      context.fillStyle = '#aaaaaa';
      context.font = '14px "Ark Pixel", Arial';
      context.textAlign = 'left';
      context.fillText(attr.name, leftPanelX + 20, attrY);

      // 加成值（如果有）
      if (attr.bonus) {
        context.fillStyle = '#4ade80';
        context.font = 'bold 12px "Ark Pixel", Arial';
        context.textAlign = 'right';
        context.fillText(`(${attr.bonus})`, leftPanelX + leftPanelWidth - 80, attrY);
      }

      // 当前值
      context.fillStyle = '#ffffff';
      context.font = 'bold 14px "Ark Pixel", Arial';
      context.textAlign = 'right';
      context.fillText(attr.current, leftPanelX + leftPanelWidth - 20, attrY);

      attrY += lineHeight;
    });

    // ========== 右侧：特殊效果面板 ==========
    const rightPanelX = GAME_CONFIG.CANVAS_WIDTH - 320;
    const rightPanelY = 90;
    const rightPanelWidth = 280;
    const rightPanelHeight = 420;

    // 绘制右侧面板背景
    context.fillStyle = 'rgba(30, 30, 50, 0.9)';
    context.strokeStyle = 'rgba(100, 100, 150, 0.8)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(rightPanelX, rightPanelY, rightPanelWidth, rightPanelHeight, 10);
    context.fill();
    context.stroke();

    // 右侧面板标题
    context.fillStyle = '#ffd700';
    context.font = 'bold 20px "Ark Pixel", Arial';
    context.textAlign = 'left';
    context.fillText('✨ 特殊效果', rightPanelX + 15, rightPanelY + 30);

    // 分隔线
    context.strokeStyle = 'rgba(100, 100, 150, 0.5)';
    context.beginPath();
    context.moveTo(rightPanelX + 15, rightPanelY + 45);
    context.lineTo(rightPanelX + rightPanelWidth - 15, rightPanelY + 45);
    context.stroke();

    let effectY = rightPanelY + 70;

    // 引火效果
    if (world.player.fireBuffLevel > 0) {
      // 效果标题
      context.fillStyle = '#ff6b35';
      context.font = 'bold 16px "Ark Pixel", Arial';
      context.textAlign = 'left';
      context.fillText(
        `${t('effectIgniteTitle')} Lv.${world.player.fireBuffLevel}`,
        rightPanelX + 20,
        effectY
      );

      effectY += 25;

      // 效果详情
      context.fillStyle = '#cccccc';
      context.font = '12px "Ark Pixel", Arial';
      const fireDetails = [
        `${t('effectTriggerChance')}: ${20 * world.player.fireBuffLevel}%`,
        `${t('effectIgniteDps')}: ${1 + world.player.fireBuffLevel}${t('effectPerLayerPerSec')}`,
        `${t('effectMaxStacks')}: ${t('effectUpTo5')}`,
        `${t('effectSpreadRange')}: 80px`,
      ];
      fireDetails.forEach((detail) => {
        context.fillText(`• ${detail}`, rightPanelX + 30, effectY);
        effectY += 18;
      });

      effectY += 15;
    }

    // 淬毒效果
    if (world.player.poisonBuffLevel > 0) {
      // 效果标题
      context.fillStyle = '#00ff66';
      context.font = 'bold 16px "Ark Pixel", Arial';
      context.textAlign = 'left';
      context.fillText(
        `${t('effectPoisonTitle')} Lv.${world.player.poisonBuffLevel}`,
        rightPanelX + 20,
        effectY
      );

      effectY += 25;

      // 效果详情
      context.fillStyle = '#cccccc';
      context.font = '12px "Ark Pixel", Arial';
      const poisonDetails = [
        `${t('effectTriggerChance')}: ${20 * world.player.poisonBuffLevel}%`,
        `${t('effectPoisonDps')}: ${1 + world.player.poisonBuffLevel}${t('effectPerLayerPerSec')}`,
        `${t('effectMaxStacks')}: ${t('effectUpTo5')}`,
        `${t('effectSlow')}: 20%`,
        `${t('effectZoneRadius')}: ${60 + world.player.poisonBuffLevel * 20}px`,
        `${t('effectZoneDps')}: ${1 + world.player.poisonBuffLevel}${t('effectPerHalfSec')}`,
        `${t('effectZoneLimit')}: ${GAME_CONFIG.MAX_POISON_CIRCLES}`,
      ];
      poisonDetails.forEach((detail) => {
        context.fillText(`• ${detail}`, rightPanelX + 30, effectY);
        effectY += 18;
      });

      effectY += 15;
    }

    // 如果没有任何特殊效果
    if (world.player.fireBuffLevel === 0 && world.player.poisonBuffLevel === 0) {
      context.fillStyle = '#666666';
      context.font = '14px "Ark Pixel", Arial';
      context.textAlign = 'center';
      context.fillText(t('effectEmpty'), rightPanelX + rightPanelWidth / 2, rightPanelY + 120);
      context.fillText(t('effectEmptyHint'), rightPanelX + rightPanelWidth / 2, rightPanelY + 145);
    }

    // ========== 中间：当前武器信息 ==========
    const centerX = GAME_CONFIG.CANVAS_WIDTH / 2 - 100;
    const centerY = 90;
    const centerWidth = 200;
    const centerHeight = 100;

    // 绘制武器面板背景
    context.fillStyle = 'rgba(30, 30, 50, 0.9)';
    context.strokeStyle = 'rgba(100, 100, 150, 0.8)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(centerX, centerY, centerWidth, centerHeight, 10);
    context.fill();
    context.stroke();

    // 武器标题
    context.fillStyle = '#ffd700';
    context.font = 'bold 16px "Ark Pixel", Arial';
    context.textAlign = 'center';
    context.fillText(t('currentWeapon'), centerX + centerWidth / 2, centerY + 25);

    // 武器名称
    context.fillStyle = '#ffffff';
    context.font = 'bold 18px "Ark Pixel", Arial';
    context.fillText(currentWeapon.name, centerX + centerWidth / 2, centerY + 55);

    // 武器等级
    context.fillStyle = '#aaaaaa';
    context.font = '14px "Ark Pixel", Arial';
    context.fillText(
      `${t('weaponLv')} ${world.player.weaponLevel}`,
      centerX + centerWidth / 2,
      centerY + 80
    );

    // 显示开始按钮（纯文字）
    const buttonY = GAME_CONFIG.CANVAS_HEIGHT - 60;

    // 按钮背景
    context.fillStyle = 'rgba(60, 60, 100, 0.9)';
    context.strokeStyle = 'rgba(150, 150, 200, 0.8)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(GAME_CONFIG.CANVAS_WIDTH / 2 - 60, buttonY - 20, 120, 40, 8);
    context.fill();
    context.stroke();

    // 按钮文字
    context.fillStyle = '#ffffff';
    context.font = 'bold 20px "Ark Pixel", Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(t('btnContinue'), GAME_CONFIG.CANVAS_WIDTH / 2, buttonY);

    // ========== 左下角：设置按钮 ==========
    const settingsBtnX = 20;
    const settingsBtnY = GAME_CONFIG.CANVAS_HEIGHT - 60;
    const settingsBtnWidth = 100;
    const settingsBtnHeight = 40;

    context.fillStyle = 'rgba(60, 60, 100, 0.9)';
    context.strokeStyle = 'rgba(150, 150, 200, 0.8)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(settingsBtnX, settingsBtnY - 20, settingsBtnWidth, settingsBtnHeight, 8);
    context.fill();
    context.stroke();

    context.fillStyle = '#ffffff';
    context.font = 'bold 18px "Ark Pixel", Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(t('settingsBtn'), settingsBtnX + settingsBtnWidth / 2, settingsBtnY);
  };

  if (world.gameState !== 'playing') return;

  const currentTime = runtime.now();
  const now = currentTime;

  // 震屏强度每帧衰减（爆炸震屏的自然消减）

  // 清空画布
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

  // 计算摄像机位置：带阻尼滞后跟随（死区 + 指数平滑 + 滞后上限，帧率无关）
  {
    const cfg = CAMERA_FOLLOW_CONFIG;
    const cam = cameraPosRef.current;
    const tgt = cameraTargetRef.current;
    const dtSec = Math.min(Math.max(deltaTime / 1000, 0.001), 0.1);

    // 首帧或异常远距（重开/传送）时直接对齐玩家
    const jumpDist = Math.hypot(world.player.x - cam.x, world.player.y - cam.y);
    if (!cameraInitRef.current || jumpDist > 2000) {
      cam.x = world.player.x;
      cam.y = world.player.y;
      tgt.x = world.player.x;
      tgt.y = world.player.y;
      playerPrevPosRef.current = { x: world.player.x, y: world.player.y };
      cameraInitRef.current = true;
    }

    // 玩家是否在移动（位置变化检测）
    const pDx = world.player.x - playerPrevPosRef.current.x;
    const pDy = world.player.y - playerPrevPosRef.current.y;
    const playerMoved = Math.hypot(pDx, pDy) > 0.05;
    playerPrevPosRef.current = { x: world.player.x, y: world.player.y };

    // 1) 跟随目标点：移动时按死区半径推动，静止时缓慢归位到玩家中心
    const dxp = world.player.x - tgt.x;
    const dyp = world.player.y - tgt.y;
    const distP = Math.hypot(dxp, dyp);
    if (playerMoved) {
      if (distP > cfg.DEAD_ZONE_RADIUS) {
        const push = distP - cfg.DEAD_ZONE_RADIUS;
        tgt.x += (dxp / distP) * push;
        tgt.y += (dyp / distP) * push;
      }
    } else if (distP > 0.5) {
      // 玩家停止移动：目标点缓慢回到玩家居中（约0.4s内基本归位）
      const homeAlpha = 1 - Math.exp(-dtSec / cfg.HOME_TAU);
      tgt.x += dxp * homeAlpha;
      tgt.y += dyp * homeAlpha;
    }

    // 2) 相机指数平滑逼近目标点（τ≈0.15s，起步加速度小于玩家，无瞬间拽动）
    const camAlpha = 1 - Math.exp(-dtSec / cfg.TAU);
    cam.x += (tgt.x - cam.x) * camAlpha;
    cam.y += (tgt.y - cam.y) * camAlpha;

    // 3) 滞后上限：与玩家实际距离超过屏幕宽度15%时，跟随速度线性提升，保证不跑出视野
    const lagLimit = GAME_CONFIG.CANVAS_WIDTH * cfg.LAG_LIMIT_RATIO;
    const ldx = world.player.x - cam.x;
    const ldy = world.player.y - cam.y;
    const ldist = Math.hypot(ldx, ldy);
    if (ldist > lagLimit) {
      const excess = ldist - lagLimit;
      const step = Math.min(excess, (excess / cfg.LAG_CATCHUP_TIME) * dtSec);
      cam.x += (ldx / ldist) * step;
      cam.y += (ldy / ldist) * step;
    }
  }

  // 叠加震屏随机偏移实现屏幕震动，并对镜头做关卡边界钳制（越界截断，无回弹动画）
  const shakeMag = world.isPaused ? 0 : screenShakeRef.current;
  const shakeOffX = (Math.random() - 0.5) * shakeMag;
  const shakeOffY = (Math.random() - 0.5) * shakeMag;
  const halfW = GAME_CONFIG.CANVAS_WIDTH / 2;
  const halfH = GAME_CONFIG.CANVAS_HEIGHT / 2;
  const clampedCamX = Math.min(
    Math.max(cameraPosRef.current.x, halfW),
    Math.max(halfW, GAME_CONFIG.WORLD_WIDTH - halfW)
  );
  const clampedCamY = Math.min(
    Math.max(cameraPosRef.current.y, halfH),
    Math.max(halfH, GAME_CONFIG.WORLD_HEIGHT - halfH)
  );
  const cameraX = clampedCamX - halfW + shakeOffX;
  const cameraY = clampedCamY - halfH + shakeOffY;

  // 应用摄像机变换
  if (!baseTransformRef.current) {
    baseTransformRef.current = ctx.getTransform();
  }
  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  // 绘制地图背景（地块平铺）
  if (mapBackgroundCanvasRef.current) {
    ctx.drawImage(mapBackgroundCanvasRef.current, 0, 0);
  } else {
    // 如果背景未加载完成，绘制纯色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
  }

  // 绘制世界边界
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

  // 获取武器配置（供渲染逻辑使用）
  const weaponConfig = WEAPONS[world.player.weapon];
  // 狂暴状态：换弹速度+30%
  const desperateActive = isDesperateFightActive(world.player);
  const effectiveReloadBonus = world.player.reloadSpeedBonus + (desperateActive ? 30 : 0);
  const effectiveReloadTime = deriveCombatStats(world.player, runtime.now()).reloadTime; // ========== 更新逻辑结束 ==========

  // ========== 渲染逻辑（始终执行）==========
  // 绘制障碍物（使用美术贴图）
  world.obstacles.forEach((obstacle) => {
    const obstacleImg = obstacleImages[obstacle.image];

    if (obstacleImg) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(obstacleImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.restore();
    } else {
      // 降级：绘制占位矩形
      ctx.fillStyle = '#4a4a6e';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.strokeStyle = '#6a6a9e';
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
  });

  // 绘制子弹（使用美术贴图）
  world.bullets.forEach((bullet) => {
    // 火箭弹使用Rocket.png，其他子弹使用bullet.png
    if (bullet.isRocket && rocketImage) {
      // 计算火箭弹的旋转角度（指向运动方向）
      const bulletAngle = Math.atan2(bullet.vy, bullet.vx);

      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(bulletAngle);

      // 绘制火箭弹贴图
      const bulletSize = bullet.size * 2.5;
      ctx.drawImage(rocketImage, -bulletSize / 2, -bulletSize / 2, bulletSize, bulletSize);

      ctx.restore();
    } else if (bulletImage) {
      // 计算子弹的旋转角度（指向运动方向）
      const bulletAngle = Math.atan2(bullet.vy, bullet.vx);

      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(bulletAngle);

      // 绘制子弹贴图
      const bulletSize = bullet.size * 2;
      ctx.drawImage(bulletImage, -bulletSize / 2, -bulletSize / 2, bulletSize, bulletSize);

      ctx.restore();
    } else {
      // 备用：使用圆形
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
      ctx.fill();

      // 子弹光晕（使用白色半透明渐变）
      const gradient = ctx.createRadialGradient(
        bullet.x,
        bullet.y,
        0,
        bullet.x,
        bullet.y,
        bullet.size * 2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 绘制敌人子弹
  world.enemyBullets.forEach((bullet) => {
    if (bullet.isFireBall) {
      // BOSS旋转弹幕的大型火球：循环序列帧动画（缩放到60x60）
      if (bossFireBallImage && bullet.spawnTime !== undefined) {
        const frameSize = BOSS_BARRAGE_CONFIG.BULLET_FRAME_SIZE;
        const cols = Math.max(1, Math.floor(bossFireBallImage.width / frameSize));
        const rows = Math.max(1, Math.floor(bossFireBallImage.height / frameSize));
        const totalFrames = cols * rows;
        const frameIndex =
          Math.floor((now - bullet.spawnTime) / BOSS_BARRAGE_CONFIG.BULLET_FRAME_DURATION) %
          totalFrames;
        const sx = (frameIndex % cols) * frameSize;
        const sy = Math.floor(frameIndex / cols) * frameSize;
        const drawSize = BOSS_BARRAGE_CONFIG.BULLET_SIZE;
        ctx.drawImage(
          bossFireBallImage,
          sx,
          sy,
          frameSize,
          frameSize,
          bullet.x - drawSize / 2,
          bullet.y - drawSize / 2,
          drawSize,
          drawSize
        );
      } else {
        // 备用：火球贴图未加载时用圆形
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
      }
      // 火球光晕（橙红色）
      ctx.fillStyle = 'rgba(255, 140, 50, 0.25)';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size * 2.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // 使用 ball.png 美术贴图
    if (ballImage) {
      const bulletSize = bullet.size * 2.5; // 子弹大小
      ctx.drawImage(
        ballImage,
        bullet.x - bulletSize / 2,
        bullet.y - bulletSize / 2,
        bulletSize,
        bulletSize
      );
    } else {
      // 备用：如果没有加载图片，使用原来的绘制方式
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 子弹光晕（简化：纯色半透明圆，避免每帧创建径向渐变，大量子弹时显著省性能）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size * 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 绘制怪物
  world.monsters.forEach((monster) => {
    const now = runtime.now();
    const isHitEffect = monster.isHit && now - monster.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION;
    const isDyingEffect =
      monster.isDying && now - monster.deathTime < GAME_CONFIG.HIT_EFFECT_DURATION;
    const isExecutionEffect =
      monster.isExecuted && monster.executionTime && now - monster.executionTime < 500; // 处决闪红效果500ms

    // 根据怪物类型获取配置
    const config = MONSTER_CONFIGS[monster.monsterType];
    const monsterColor = isHitEffect || isDyingEffect ? '#ffffff' : config.color;
    const monsterSize = config.size;
    const isBoss = monster.isBoss;

    // 处决闪红效果（在敌人周围绘制红色闪烁光晕）
    if (isExecutionEffect && monster.executionTime) {
      const executionProgress = (now - monster.executionTime) / 500; // 500ms
      const flashIntensity = Math.sin(executionProgress * Math.PI * 6); // 快速闪烁
      const executionAlpha = 0.5 + flashIntensity * 0.3;

      // 红色闪烁光晕
      const executionGradient = ctx.createRadialGradient(
        monster.x,
        monster.y,
        monsterSize * 0.5,
        monster.x,
        monster.y,
        monsterSize * 2
      );
      executionGradient.addColorStop(0, `rgba(255, 0, 0, ${executionAlpha})`);
      executionGradient.addColorStop(0.5, `rgba(255, 50, 0, ${executionAlpha * 0.5})`);
      executionGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

      ctx.fillStyle = executionGradient;
      ctx.beginPath();
      ctx.arc(monster.x, monster.y, monsterSize * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // BOSS渲染逻辑
    if (isBoss) {
      const jumpAttackState = monster.jumpAttackState || 'idle';

      // 绘制range图标（锁定、起跳、空中、落地阶段显示）
      if (
        (jumpAttackState === 'locking' ||
          jumpAttackState === 'jump_start' ||
          jumpAttackState === 'airborne' ||
          jumpAttackState === 'landing') &&
        rangeImage &&
        monster.jumpAttackTargetX !== undefined &&
        monster.jumpAttackTargetY !== undefined
      ) {
        const targetX = monster.jumpAttackTargetX;
        const targetY = monster.jumpAttackTargetY;
        const rangeSize = 150; // range图标大小（原来的1.5倍）

        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.drawImage(rangeImage, -rangeSize / 2, -rangeSize / 2, rangeSize, rangeSize);
        ctx.restore();
      }

      // BOSS动画选择
      let bossAnimImage = bossImage; // 默认使用boss_1
      if (
        (jumpAttackState === 'jump_start' ||
          jumpAttackState === 'airborne' ||
          jumpAttackState === 'landing') &&
        boss2Image
      ) {
        bossAnimImage = boss2Image; // 落地攻击使用boss_2
      }

      // BOSS使用序列帧动画
      if (bossAnimImage) {
        // 根据动画图片确定总帧数
        const bossAtlas = bossAnimImage === boss2Image ? SPRITE_ATLASES.boss2 : SPRITE_ATLASES.boss;
        const totalFrames = bossAtlas.frames.length;
        let bossFrameIndex = 0;

        // 根据状态计算帧索引和时长
        if (jumpAttackState === 'jump_start') {
          // 起跳阶段（900ms）
          const jumpStartDuration = config.jumpStartDuration || 900;
          const jumpStartElapsed = now - (monster.jumpAttackStartTime || now);

          if (bossAnimImage === boss2Image) {
            // boss_2: 9帧（索引0-8），每帧100ms
            const jumpStartFrames = 9;
            const frameDuration = jumpStartDuration / jumpStartFrames;
            bossFrameIndex = Math.min(
              Math.floor(jumpStartElapsed / frameDuration),
              jumpStartFrames - 1
            );
          } else {
            // boss_1: 2帧（索引0-1），每帧450ms
            const jumpStartFrames = 2;
            const frameDuration = jumpStartDuration / jumpStartFrames;
            bossFrameIndex = Math.min(
              Math.floor(jumpStartElapsed / frameDuration),
              jumpStartFrames - 1
            );
          }
        } else if (jumpAttackState === 'airborne') {
          // 空中阶段（1600ms）
          const airborneDuration = config.airborneDuration || 1600;
          const airborneElapsed = now - (monster.jumpAttackStartTime || now);

          if (bossAnimImage === boss2Image) {
            // boss_2: 9帧（索引9-17），每帧约177.78ms
            const airborneFrames = 9;
            const frameDuration = airborneDuration / airborneFrames;
            bossFrameIndex =
              9 + Math.min(Math.floor(airborneElapsed / frameDuration), airborneFrames - 1);
          } else {
            // boss_1: 4帧（索引2-5），每帧400ms
            const airborneFrames = 4;
            const frameDuration = airborneDuration / airborneFrames;
            bossFrameIndex =
              2 + Math.min(Math.floor(airborneElapsed / frameDuration), airborneFrames - 1);
          }
        } else if (jumpAttackState === 'landing') {
          // 落地阶段（500ms）
          const landingDuration = 500;
          const landingElapsed = now - (monster.jumpAttackStartTime || now);

          if (bossAnimImage === boss2Image) {
            // boss_2: 2帧（索引18-19），每帧250ms
            const landingFrames = 2;
            const frameDuration = landingDuration / landingFrames;
            bossFrameIndex =
              18 + Math.min(Math.floor(landingElapsed / frameDuration), landingFrames - 1);
          } else {
            // boss_1: 2帧（索引6-7），每帧250ms
            const landingFrames = 2;
            const frameDuration = landingDuration / landingFrames;
            bossFrameIndex =
              6 + Math.min(Math.floor(landingElapsed / frameDuration), landingFrames - 1);
          }
        } else {
          // 默认动画：循环播放
          const bossFrameDuration = bossAnimImage === boss2Image ? 50 : 100; // boss_2每帧50ms，boss_1每帧100ms
          const bossTotalDuration = bossFrameDuration * totalFrames;
          bossFrameIndex = Math.floor((now % bossTotalDuration) / bossFrameDuration);
        }

        // boss_1是8帧，boss_2是20帧，都是水平排列，每帧512x512px
        const bossFrame = atlasFrame(bossAtlas, bossFrameIndex);
        const bossFrameWidth = bossFrame.width;
        const bossFrameHeight = bossFrame.height;

        // 绘制BOSS序列帧
        ctx.save();
        ctx.translate(monster.x, monster.y);
        // BOSS尺寸放大到原来的3.25倍（2.5 * 1.3）
        let bossDisplaySize = monsterSize * 3.25;
        // 砸地攻击阶段额外放大20%
        if (jumpAttackState === 'landing') {
          bossDisplaySize *= 1.2;
        }

        ctx.drawImage(
          bossAnimImage,
          bossFrame.x, // 源X
          0, // 源Y
          bossFrameWidth, // 源宽度
          bossFrameHeight, // 源高度
          -bossDisplaySize / 2, // 目标X（居中）
          -bossDisplaySize / 2, // 目标Y（居中）
          bossDisplaySize, // 目标宽度
          bossDisplaySize // 目标高度
        );

        ctx.restore();
      }

      // BOSS光环效果（备用）- 当bossAnimImage为null时
      if (!bossAnimImage && isBoss) {
        // BOSS光环效果（备用）
        if (!monster.isDying) {
          const pulsePhase = (now / 300) % (Math.PI * 2);
          const pulseRadius = monsterSize * 1.3 + Math.sin(pulsePhase) * 10;

          // 外层红色光环
          const bossAura = ctx.createRadialGradient(
            monster.x,
            monster.y,
            monsterSize,
            monster.x,
            monster.y,
            pulseRadius
          );
          bossAura.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
          bossAura.addColorStop(0.5, 'rgba(255, 50, 0, 0.3)');
          bossAura.addColorStop(1, 'rgba(255, 0, 0, 0)');

          ctx.fillStyle = bossAura;
          ctx.beginPath();
          ctx.arc(monster.x, monster.y, pulseRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // 怪物身体（受击或死亡时显示白色）
        ctx.fillStyle = monsterColor;
        ctx.beginPath();
        ctx.arc(monster.x, monster.y, monsterSize, 0, Math.PI * 2);
        ctx.fill();

        // BOSS特殊眼睛（更大，红色）
        const bossEyeOffset = monsterSize * 0.35;
        const bossEyeSize = monsterSize * 0.3;

        // 眼睛外圈（红色）
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(
          monster.x - bossEyeOffset,
          monster.y - bossEyeOffset,
          bossEyeSize + 3,
          0,
          Math.PI * 2
        );
        ctx.arc(
          monster.x + bossEyeOffset,
          monster.y - bossEyeOffset,
          bossEyeSize + 3,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // 眼睛内圈（白色）
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(monster.x - bossEyeOffset, monster.y - bossEyeOffset, bossEyeSize, 0, Math.PI * 2);
        ctx.arc(monster.x + bossEyeOffset, monster.y - bossEyeOffset, bossEyeSize, 0, Math.PI * 2);
        ctx.fill();

        // 瞳孔（黑色）
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(
          monster.x - bossEyeOffset,
          monster.y - bossEyeOffset,
          bossEyeSize * 0.5,
          0,
          Math.PI * 2
        );
        ctx.arc(
          monster.x + bossEyeOffset,
          monster.y - bossEyeOffset,
          bossEyeSize * 0.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // BOSS落地攻击时的爆炸效果
      if (isBoss && jumpAttackState === 'landing') {
        const explosionRadius = config.jumpAttackDamageRadius || 100;
        const explosionAlpha = 0.8;

        // 爆炸光圈
        const explosion = ctx.createRadialGradient(
          monster.x,
          monster.y,
          0,
          monster.x,
          monster.y,
          explosionRadius
        );
        explosion.addColorStop(0, `rgba(255, 255, 255, ${explosionAlpha})`);
        explosion.addColorStop(0.3, `rgba(255, 200, 0, ${explosionAlpha * 0.8})`);
        explosion.addColorStop(0.6, `rgba(255, 100, 0, ${explosionAlpha * 0.5})`);
        explosion.addColorStop(1, `rgba(255, 0, 0, 0)`);

        ctx.fillStyle = explosion;
        ctx.beginPath();
        ctx.arc(monster.x, monster.y, explosionRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // BOSS血条（仅在非死亡状态下显示）
      if (isBoss && !monster.isDying) {
        const hpBarWidth = monsterSize * 1.25;
        const hpBarHeight = 12;
        const hpPercent = monster.hp / monster.maxHp;

        // 血条背景
        ctx.fillStyle = '#333';
        ctx.fillRect(
          monster.x - hpBarWidth / 2,
          monster.y - monsterSize - 15,
          hpBarWidth,
          hpBarHeight
        );

        // 血条前景（绿色>30%，红色<=30%）
        ctx.fillStyle = hpPercent > 0.3 ? '#4ade80' : '#ef4444';
        ctx.fillRect(
          monster.x - hpBarWidth / 2,
          monster.y - monsterSize - 15,
          hpBarWidth * hpPercent,
          hpBarHeight
        );
      }
    } else {
      // 普通怪物 - 使用序列帧动画
      let enemyFrameDuration = 100; // 每帧100ms
      let enemyTotalFrames = 7; // 7帧
      let enemyTotalDuration = enemyFrameDuration * enemyTotalFrames; // 700ms

      // 根据怪物类型选择对应的图片
      let enemyImage = null;
      let isEnemy4 = false; // 是否是敌人4

      if (monster.monsterType === 1) {
        enemyImage = enemy_1Image;
      } else if (monster.monsterType === 2) {
        enemyImage = enemy_2Image;
      } else if (monster.monsterType === 3) {
        enemyImage = enemy_3Image;
      } else if (monster.monsterType === 4) {
        isEnemy4 = true;

        // 敌人4特殊动画逻辑
        if (monster.isShooting && enemy_4_2Image) {
          // 正在播放射击动画（4_2）
          enemyFrameDuration = 100; // 敌人4每帧100ms
          enemyTotalFrames = SPRITE_ATLASES.enemy_4_2.frames.length; // 假设每帧256px宽
          enemyTotalDuration = enemyFrameDuration * enemyTotalFrames;

          const animationDuration = enemyTotalDuration;
          const timeSinceShootStart = now - (monster.shootAnimationStartTime || 0);

          if (timeSinceShootStart >= animationDuration) {
            // 完整的4_2动画播放完成，切换回4_1
            if (enemy_4_1Image) {
              enemyImage = enemy_4_1Image;
              enemyFrameDuration = 100;
              enemyTotalFrames = SPRITE_ATLASES.enemy_4_1.frames.length;
              enemyTotalDuration = enemyFrameDuration * enemyTotalFrames;
            }
          } else {
            // 继续播放4_2动画
            enemyImage = enemy_4_2Image;
          }
        } else {
          // 没有射击，使用4_1动画（Walk循环）
          if (enemy_4_1Image) {
            enemyImage = enemy_4_1Image;
            enemyFrameDuration = 100;
            enemyTotalFrames = SPRITE_ATLASES.enemy_4_1.frames.length;
            enemyTotalDuration = enemyFrameDuration * enemyTotalFrames;
          }
        }
      }

      // 使用序列帧动画
      if (enemyImage) {
        // 计算当前帧
        let enemyFrameIndex;
        if (isEnemy4 && monster.isShooting && enemyImage === enemy_4_2Image) {
          // 敌人4正在播放射击动画，使用相对于射击开始时间的帧索引
          const timeSinceShootStart = now - (monster.shootAnimationStartTime || 0);
          enemyFrameIndex = Math.floor(timeSinceShootStart / enemyFrameDuration) % enemyTotalFrames;
        } else {
          // 循环播放Walk动画
          enemyFrameIndex = Math.floor((now % enemyTotalDuration) / enemyFrameDuration);
        }

        // 敌人精灵表是水平排列的帧，每帧256x256px
        const enemyAtlas =
          monster.monsterType === 4
            ? enemyImage === enemy_4_2Image
              ? SPRITE_ATLASES.enemy_4_2
              : SPRITE_ATLASES.enemy_4_1
            : SPRITE_ATLASES[
                monster.monsterType === 2
                  ? 'enemy_2'
                  : monster.monsterType === 3
                    ? 'enemy_3'
                    : 'enemy_1'
              ];
        const enemyFrame = atlasFrame(enemyAtlas, enemyFrameIndex);
        const enemyFrameWidth = enemyFrame.width;
        const enemyFrameHeight = enemyImage.height;

        // 计算移动方向并判断是否需要镜像
        const isMovingRight = monster.vx > 0.01;

        // 根据怪物类型决定镜像规则
        let shouldMirror = false;
        if (
          monster.monsterType === 1 ||
          monster.monsterType === 2 ||
          monster.monsterType === 4 ||
          monster.monsterType === 5
        ) {
          // 类型1、2、4、boss：往右走时镜像（正常面朝左）
          shouldMirror = isMovingRight;
        } else if (monster.monsterType === 3) {
          // 类型3：往左走时镜像（正常面朝右）
          shouldMirror = !isMovingRight;
        }

        // 绘制敌人序列帧
        ctx.save();
        ctx.translate(monster.x, monster.y);

        // 如果需要镜像，水平翻转
        if (shouldMirror) {
          ctx.scale(-1, 1);
        }

        // 怪物尺寸（根据类型调整）
        const displaySize = monsterSize * 1.5;

        // 如果受击或死亡，使用叠加白色效果
        if (isHitEffect || isDyingEffect) {
          ctx.filter = 'brightness(2)'; // 提亮2倍，形成白色效果
        }

        ctx.drawImage(
          enemyImage,
          enemyFrame.x, // 源X
          0, // 源Y
          enemyFrameWidth, // 源宽度
          enemyFrameHeight, // 源高度
          -displaySize / 2, // 目标X（居中）
          -displaySize / 2, // 目标Y（居中）
          displaySize, // 目标宽度
          displaySize // 目标高度
        );
        ctx.restore();
      } else {
        // 备用：如果没有加载图片，使用原来的绘制方式
        // 怪物身体（受击或死亡时显示白色）
        ctx.fillStyle = monsterColor;
        ctx.beginPath();
        ctx.arc(monster.x, monster.y, monsterSize, 0, Math.PI * 2);
        ctx.fill();

        // 普通怪物眼睛
        const eyeOffset = monsterSize * 0.4;
        const eyeSize = monsterSize * 0.25;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(monster.x - eyeOffset, monster.y - eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.arc(monster.x + eyeOffset, monster.y - eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ========== 词缀视觉渲染（在怪物 sprite 之上、血条之下） ==========
    AffixSystem.render(ctx, monster, monsterSize, isBoss, now);

    // 血条（死亡的怪物不显示血条，满血的怪物也不显示血条）
    if (!monster.isDying && monster.hp < monster.maxHp) {
      // 血条粗短：高度翻倍，长度减半
      const hpBarWidth = isBoss ? monsterSize * 1.25 : monsterSize * 1.0;
      const hpBarHeight = isBoss ? 12 : 8;
      const hpPercent = monster.hp / monster.maxHp;

      ctx.fillStyle = '#333';
      ctx.fillRect(
        monster.x - hpBarWidth / 2,
        monster.y - monsterSize - 15,
        hpBarWidth,
        hpBarHeight
      );

      ctx.fillStyle = hpPercent > 0.3 ? '#4ade80' : '#ef4444';
      ctx.fillRect(
        monster.x - hpBarWidth / 2,
        monster.y - monsterSize - 15,
        hpBarWidth * hpPercent,
        hpBarHeight
      );
    }

    // ========== 词缀血条下方 UI（如护盾方格） ==========
    AffixSystem.renderBelowHpBar(ctx, monster, monsterSize, isBoss);

    // 燃烧效果渲染（轻量版：血条上方显示橙色火苗图标+层数，去掉高开销的渐变光晕与旋转粒子）
    if (monster.isBurning && !monster.isDying) {
      const stackCount = monster.burningStacks || 1;
      const fx = monster.x;
      const fy = monster.y - monsterSize - (isBoss ? 30 : 22);

      // 简橙色火苗图标
      const flicker = 1 + Math.sin(now / 80) * 0.1;
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.moveTo(fx - 7 * flicker, fy + 4);
      ctx.quadraticCurveTo(fx - 9 * flicker, fy - 1, fx - 3, fy - 4);
      ctx.quadraticCurveTo(fx - 4, fy - 8, fx + 1, fy - 9);
      ctx.quadraticCurveTo(fx + 5, fy - 8, fx + 5, fy - 4);
      ctx.quadraticCurveTo(fx + 9, fy - 2, fx + 7, fy + 4);
      ctx.quadraticCurveTo(fx + 2, fy + 6, fx - 7, fy + 4);
      ctx.fill();

      // 燃烧层数
      ctx.fillStyle = '#ff7700';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`×${stackCount}`, fx + 14, fy + 4);
    }

    // 中毒效果渲染（轻量版：血条上方显示绿色毒滴图标+层数，去掉高开销的渐变光晕与气泡粒子）
    if (monster.isPoisoned && !monster.isDying) {
      const poisonStackCount = monster.poisonStacks || 1;
      const px = monster.x;
      const py = monster.y - monsterSize - (isBoss ? 42 : 34);

      // 绿色毒滴图标
      ctx.fillStyle = '#00cc66';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0.3 * Math.PI, 0.9 * Math.PI);
      ctx.arc(px, py - 1, 3, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.fill();

      // 中毒层数
      ctx.fillStyle = '#00dd66';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`×${poisonStackCount}`, px + 14, py + 3);
    }

    // BOSS死亡爆炸效果
    if (isBoss && monster.isDying) {
      const deathProgress = (now - monster.deathTime) / GAME_CONFIG.HIT_EFFECT_DURATION;
      if (deathProgress < 1) {
        const explosionRadius = monsterSize * (1 + deathProgress * 3);
        const explosionAlpha = 1 - deathProgress;

        // 爆炸光圈
        const explosion = ctx.createRadialGradient(
          monster.x,
          monster.y,
          0,
          monster.x,
          monster.y,
          explosionRadius
        );
        explosion.addColorStop(0, `rgba(255, 200, 0, ${explosionAlpha})`);
        explosion.addColorStop(0.3, `rgba(255, 100, 0, ${explosionAlpha * 0.8})`);
        explosion.addColorStop(0.6, `rgba(255, 0, 0, ${explosionAlpha * 0.5})`);
        explosion.addColorStop(1, `rgba(255, 0, 0, 0)`);

        ctx.fillStyle = explosion;
        ctx.beginPath();
        ctx.arc(monster.x, monster.y, explosionRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // 绘制毒圈（从独立的毒圈数组渲染）
  world.poisonCircles.forEach((circle) => {
    if (now < circle.endTime) {
      const circlePhase = (now % 1000) / 1000;

      // 毒圈本体（简化：纯色半透明填充，避免每帧创建径向渐变）
      ctx.fillStyle = 'rgba(0, 220, 90, 0.16)';
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fill();

      // 毒圈边界线
      ctx.strokeStyle = `rgba(0, 255, 100, ${0.3 + Math.sin(circlePhase * Math.PI * 2) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.stroke();

      // 毒圈内少量气泡（减少到2个，去掉随机数与渐变填充）
      for (let i = 0; i < 2; i++) {
        const angle = (now / 500 + i * Math.PI) % (Math.PI * 2);
        const dist = circle.radius * (0.35 + (i % 2) * 0.25);
        const bx = circle.x + Math.cos(angle) * dist;
        const by = circle.y + Math.sin(angle) * dist;

        ctx.fillStyle = 'rgba(0, 255, 100, 0.25)';
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // 绘制词缀爆炸粒子（自爆等）
  world.affixExplosionParticles.forEach((particle) => {
    const elapsed = now - particle.startTime;
    const alpha = Math.max(0, 1 - elapsed / particle.duration);
    const size = particle.size * (1 - (elapsed / particle.duration) * 0.5);
    ctx.fillStyle = `rgba(255, 100, 20, ${alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
    ctx.fill();
    // 外发光
    ctx.fillStyle = `rgba(255, 200, 50, ${alpha * 0.4})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, size * 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 绘制玩家受击蓝色粒子（BOSS火球命中）
  world.playerHitParticles.forEach((particle) => {
    const elapsed = now - particle.startTime;
    const progress = Math.max(0, 1 - elapsed / particle.duration);
    if (progress <= 0) return;
    const size = particle.size * progress;
    ctx.fillStyle = `rgba(96, 165, 250, ${progress})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
    ctx.fill();
    // 外发光
    ctx.fillStyle = `rgba(147, 197, 253, ${progress * 0.5})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, size * 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 绘制金币和宝箱
  world.coins.forEach((coin) => {
    // 确保type字段有值（兼容旧代码）
    const coinType = coin.type || 'coin';

    // 绘制拖尾粒子（在金币下方）——优化：避免每粒子save/restore/globalAlpha，用rgba直接绘制
    const trailParticles = coin.trailParticles;
    if (trailParticles && trailParticles.length > 0) {
      const trailCount = Math.min(trailParticles.length, 6); // 限制每币最多取前6个粒子
      for (let p = 0; p < trailCount; p++) {
        const particle = trailParticles[p];
        ctx.fillStyle = `rgba(255, 215, 0, ${Math.max(0.05, 1 - particle.life / particle.maxLife)})`;
        ctx.beginPath();
        ctx.arc(
          particle.x,
          particle.y,
          particle.size * (1 - particle.life / particle.maxLife),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    if (coin.isCollected) {
      // 绘制收集动画
      const progress = coin.collectAnimationProgress;
      const scale = 1 + progress * 0.5;
      const opacity = 1 - progress;

      ctx.globalAlpha = opacity;

      // 光芒（先绘制光效，再绘制图片，避免遮住物品）——简化：纯色半透明圆，避免每帧创建径向渐变
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.size * scale * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 绘制物品图片（在光效上方）
      if (coinType === 'chest') {
        // 绘制宝箱图片（缩放）
        if (chestImage) {
          const imageSize = coin.size * 2 * scale;
          ctx.drawImage(
            chestImage,
            coin.x - imageSize / 2,
            coin.y - imageSize / 2,
            imageSize,
            imageSize
          );
        } else {
          // 如果宝箱图片未加载，绘制黄色方块
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(
            coin.x - coin.size * scale,
            coin.y - coin.size * scale,
            coin.size * 2 * scale,
            coin.size * 2 * scale
          );
        }
      } else if (coinType === 'weapon_upgrade_box') {
        // 绘制武器属性加成箱（缩放）
        if (weaponUpgradeBoxImage) {
          const imageSize = coin.size * 2 * scale;
          ctx.drawImage(
            weaponUpgradeBoxImage,
            coin.x - imageSize / 2,
            coin.y - imageSize / 2,
            imageSize,
            imageSize
          );
        } else {
          // 如果图片未加载，绘制粉色方块
          ctx.fillStyle = '#FF69B4';
          ctx.fillRect(
            coin.x - coin.size * scale,
            coin.y - coin.size * scale,
            coin.size * 2 * scale,
            coin.size * 2 * scale
          );
        }
      } else if (coinType === 'health_potion') {
        // 绘制治疗瓶（缩放）
        if (healthPotionImage) {
          const imageSize = coin.size * 2 * scale;
          ctx.drawImage(
            healthPotionImage,
            coin.x - imageSize / 2,
            coin.y - imageSize / 2,
            imageSize,
            imageSize
          );
        } else {
          // 如果图片未加载，绘制绿色方块
          ctx.fillStyle = '#32CD32';
          ctx.fillRect(
            coin.x - coin.size * scale,
            coin.y - coin.size * scale,
            coin.size * 2 * scale,
            coin.size * 2 * scale
          );
        }
      } else {
        // 绘制金币图片（缩放）
        if (coinImage) {
          const imageSize = coin.size * 2 * scale;
          ctx.drawImage(
            coinImage,
            coin.x - imageSize / 2,
            coin.y - imageSize / 2,
            imageSize,
            imageSize
          );
        } else {
          // 如果金币图片未加载，绘制黄色圆形
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(coin.x, coin.y, coin.size * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    } else {
      // 宝箱/金币光晕（先绘制光效，再绘制图片，避免遮住物品）——简化：纯色半透明圆，避免每帧创建径向渐变
      const glowColor =
        coinType === 'chest'
          ? 'rgba(255, 215, 0, 0.25)'
          : coinType === 'weapon_upgrade_box'
            ? 'rgba(255, 105, 180, 0.25)'
            : coinType === 'health_potion'
              ? 'rgba(50, 205, 50, 0.25)'
              : 'rgba(255, 255, 255, 0.2)';
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.size * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 绘制物品图片（在光效上方）
      if (coinType === 'chest') {
        // 绘制正常宝箱
        if (chestImage) {
          const imageSize = coin.size * 2;
          ctx.drawImage(
            chestImage,
            coin.x - imageSize / 2,
            coin.y - imageSize / 2,
            imageSize,
            imageSize
          );
        } else {
          // 如果宝箱图片未加载，绘制黄色方块
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(coin.x - coin.size, coin.y - coin.size, coin.size * 2, coin.size * 2);
        }
      } else if (coinType === 'weapon_upgrade_box') {
        // 绘制武器属性加成箱
        if (weaponUpgradeBoxImage) {
          const imageSize = coin.size * 2;
          ctx.drawImage(
            weaponUpgradeBoxImage,
            coin.x - imageSize / 2,
            coin.y - imageSize / 2,
            imageSize,
            imageSize
          );
        } else {
          // 如果图片未加载，绘制粉色方块
          ctx.fillStyle = '#FF69B4';
          ctx.fillRect(coin.x - coin.size, coin.y - coin.size, coin.size * 2, coin.size * 2);
        }
      } else if (coinType === 'health_potion') {
        // 绘制治疗瓶
        if (healthPotionImage) {
          const imageSize = coin.size * 2;
          ctx.drawImage(
            healthPotionImage,
            coin.x - imageSize / 2,
            coin.y - imageSize / 2,
            imageSize,
            imageSize
          );
        } else {
          // 如果图片未加载，绘制绿色方块
          ctx.fillStyle = '#32CD32';
          ctx.fillRect(coin.x - coin.size, coin.y - coin.size, coin.size * 2, coin.size * 2);
        }
      } else {
        // 绘制正常金币
        if (coinImage) {
          const imageSize = coin.size * 2;
          ctx.drawImage(
            coinImage,
            coin.x - imageSize / 2,
            coin.y - imageSize / 2,
            imageSize,
            imageSize
          );
        } else {
          // 如果金币图片未加载，绘制黄色圆形
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });

  // 绘制爆炸效果（只读，不修改状态）
  if (boomImage) {
    world.explosionEffects.forEach((explosion) => {
      const elapsed = now - explosion.startTime;
      const totalDuration = explosion.totalFrames * explosion.frameDuration; // 总时长 = 一遍播放

      if (elapsed < totalDuration) {
        // 正序播放：从第一帧往最后一帧播放
        const frameProgress = elapsed / explosion.frameDuration;
        const frameIndex = Math.floor(frameProgress); // 从第一帧开始

        // 透明度：第一帧(70%) -> 最后一帧(100%)
        // 当前帧索引越大（越接近最后一帧），透明度越高
        const progressToLastFrame = frameIndex / (explosion.totalFrames - 1); // 0(第一帧) -> 1(最后一帧)
        const opacity = 0.7 + progressToLastFrame * 0.3; // 70% -> 100%

        // 确保frameIndex在有效范围内
        const safeFrameIndex = Math.max(0, Math.min(frameIndex, explosion.totalFrames - 1));

        // 计算源坐标
        const frameWidth = 256;
        const frameHeight = 256;
        const srcX = safeFrameIndex * frameWidth;

        // 绘制爆炸序列帧
        ctx.save();
        ctx.globalAlpha = opacity;

        // 移动到爆炸中心点，然后旋转
        ctx.translate(explosion.x, explosion.y);
        ctx.rotate(explosion.rotation);

        // 绘制爆炸帧（中心对齐）
        ctx.drawImage(
          boomImage,
          srcX,
          0,
          frameWidth,
          frameHeight, // 源区域
          -explosion.radius,
          -explosion.radius, // 目标位置（居中）
          explosion.radius * 2,
          explosion.radius * 2 // 目标大小
        );

        ctx.restore();
      }
    });
  }

  // 绘制穿透光效（只读，不修改状态）—— 刀光冲击效果
  world.pierceEffects.forEach((effect) => {
    const elapsed = now - effect.startTime;
    const progress = Math.min(1, elapsed / effect.duration); // 0 -> 1
    if (progress >= 1) return;
    const alpha = 1 - progress; // 逐渐淡出
    const expand = 4 + progress * 26; // 光环半径向外扩张

    const cos = Math.cos(effect.angle);
    const sin = Math.sin(effect.angle);
    const perpX = -sin; // 垂直子弹方向
    const perpY = cos;

    ctx.save();
    ctx.translate(effect.x, effect.y);

    // 1. 白色亮核：向外扩散的光环
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, expand, 0, Math.PI * 2);
    ctx.stroke();

    // 2. 青色冲击光环（第二层，淡出）
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#7fd4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, expand * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    // 3. 沿子弹方向的刀光拖尾（两条垂直光带，增强切割感）
    const trailLen = 16 + (1 - progress) * 14;
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = '#aee4ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-perpX * expand * 0.5 + cos * 4, -perpY * expand * 0.5 + sin * 4);
    ctx.lineTo(perpX * expand * 0.5 + cos * trailLen, perpY * expand * 0.5 + sin * trailLen);
    ctx.stroke();

    // 4. 中心亮点
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  // —— 以下为屏幕固定 HUD（脱离摄像机/地图变换）——
  ctx.save();
  if (baseTransformRef.current) {
    ctx.setTransform(baseTransformRef.current);
  }

  // 闪现技能图标（右下角圆形）+ 冷却遮罩与倒计时
  if (world.gameState === 'playing') {
    const dashCenterX = GAME_CONFIG.CANVAS_WIDTH - 86;
    const dashCenterY = GAME_CONFIG.CANVAS_HEIGHT - 86;
    const dashRadius = 40;
    const cdRatio = world.dashCooldown > 0 ? Math.min(1, world.dashCooldown / DASH_COOLDOWN_MS) : 0;
    ctx.save();
    ctx.translate(dashCenterX, dashCenterY);
    // 底环
    ctx.beginPath();
    ctx.arc(0, 0, dashRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.strokeStyle = cdRatio > 0 ? 'rgba(255,255,255,0.5)' : '#ffd75e';
    ctx.lineWidth = 3;
    ctx.stroke();
    // 图标（圆形裁剪）
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, dashRadius - 4, 0, Math.PI * 2);
    ctx.clip();
    if (skillIconImage) {
      const dw = dashRadius * 2 - 8;
      ctx.drawImage(
        skillIconImage,
        (200 - dw) / 2,
        (200 - dw) / 2,
        dw,
        dw,
        -dw / 2,
        -dw / 2,
        dw,
        dw
      );
    }
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (cdRatio > 0) {
      // 冷却置暗：暗色扇区面积随冷却剩余减少而减小（从整圆收缩到消失）
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = 'rgba(8,8,14,1)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, dashRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdRatio);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // 中央倒计时（向上取整的剩余秒数）
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 18px 'Ark Pixel', Arial";
      const cdSecs = Math.max(0, Math.ceil(world.dashCooldown / 1000));
      ctx.fillText(String(cdSecs), 0, 2);
    } else {
      // 可用状态提示 E
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 14px 'Ark Pixel', Arial";
      ctx.fillText('E', 0, 1);
    }
    ctx.restore();
  }

  ctx.restore(); // 恢复摄像机变换（HUD 屏幕固定块结束）

  // 绘制伤害数字（只读，不修改状态）
  world.damageNumbers.forEach((damageNum) => {
    ctx.save();

    // 处决飘字特殊处理
    if (damageNum.isExecution) {
      const baseFontSize = 36;
      const fontSize = Math.round(baseFontSize * damageNum.scale);
      const adjustedFontSize = Math.round(fontSize / 10) * 10;

      ctx.font = `bold ${adjustedFontSize}px 'Ark Pixel', Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = damageNum.opacity;

      // 红色描边
      ctx.strokeStyle = '#880000';
      ctx.lineWidth = 4;
      ctx.strokeText('处决！！', damageNum.x, damageNum.y);

      // 红色填充
      ctx.fillStyle = '#ff0000';
      ctx.fillText('处决！！', damageNum.x, damageNum.y);

      ctx.restore();
      return;
    }

    // 护盾抵挡飘字特殊处理
    if (damageNum.isShieldBlock) {
      const baseFontSize = 18;
      const fontSize = Math.round(baseFontSize * damageNum.scale);

      ctx.font = `bold ${fontSize}px 'Ark Pixel', Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = damageNum.opacity;

      // 蓝色描边
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 3;
      ctx.strokeText('格挡', damageNum.x, damageNum.y);

      // 蓝色填充
      ctx.fillStyle = '#60a5fa';
      ctx.fillText('格挡', damageNum.x, damageNum.y);

      ctx.restore();
      return;
    }

    // 像素字体需要在特定尺寸下清晰显示
    // 使用10的倍数（20px, 30px等）
    // 二次暴击使用更大的字体
    const baseFontSize = damageNum.isDoubleCrit ? 36 : damageNum.isCrit ? 30 : 20;
    const fontSize = Math.round(baseFontSize * damageNum.scale);
    // 确保字体大小是10的倍数，像素字体特性
    const adjustedFontSize = Math.round(fontSize / 10) * 10;

    ctx.font = `bold ${adjustedFontSize}px 'Ark Pixel', Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 描边（黑色）
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(damageNum.damage.toString(), damageNum.x, damageNum.y);

    // 填充（二次暴击红色，暴击橙色，普通白色）
    let damageColor;
    if (damageNum.isDoubleCrit) {
      damageColor = '#ff0000'; // 红色（二次暴击）
    } else if (damageNum.isCrit) {
      damageColor = '#ff9900'; // 橙色（暴击）
    } else {
      damageColor = '#ffffff'; // 白色（普通伤害）
    }

    ctx.fillStyle = damageColor;
    ctx.fillText(damageNum.damage.toString(), damageNum.x, damageNum.y);

    // 二次暴击：显示"二次暴击"文字
    if (damageNum.isDoubleCrit) {
      const textY = damageNum.y + adjustedFontSize * 0.8;
      const smallFontSize = Math.round((adjustedFontSize * 0.5) / 10) * 10;
      ctx.font = `bold ${smallFontSize}px 'Ark Pixel', Arial`;
      ctx.strokeStyle = '#880000';
      ctx.lineWidth = 2;
      ctx.strokeText('二次暴击', damageNum.x, textY);
      ctx.fillStyle = '#ff0000';
      ctx.fillText('二次暴击', damageNum.x, textY);
    }

    ctx.restore();
  });

  // 绘制金币弹字（金色填充，黑色描边）
  world.goldFloatingTexts.forEach((text) => {
    ctx.save();

    // 字体大小（使用10的倍数以保持像素字体清晰）
    const baseFontSize = 24;
    const fontSize = Math.round(baseFontSize * text.scale);
    const adjustedFontSize = Math.round(fontSize / 10) * 10;

    ctx.font = `bold ${adjustedFontSize}px 'Ark Pixel', Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = text.opacity;

    // 描边（黑色）
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    // 使用自定义文字或默认格式
    const displayText = text.text || `+${text.value}`;
    ctx.strokeText(displayText, text.x, text.y);

    // 填充（使用自定义颜色或默认金色）
    ctx.fillStyle = text.color || '#FFD700';
    ctx.fillText(displayText, text.x, text.y);

    ctx.restore();
  });

  // 绘制烟雾效果（只读，不修改状态）
  world.smokeEffects.forEach((smoke) => {
    const elapsed = now - smoke.startTime;
    const progress = elapsed / smoke.duration;

    if (progress < 1) {
      // 计算当前大小（膨胀）
      const currentSize = smoke.initialSize + (smoke.finalSize - smoke.initialSize) * progress;

      // 计算透明度（从0.6变到0）
      const opacity = 0.6 * (1 - progress);

      ctx.save();

      if (smokeImage) {
        // 使用烟雾图片
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          smokeImage,
          smoke.x - currentSize / 2,
          smoke.y - currentSize / 2,
          currentSize,
          currentSize
        );
      } else {
        // 备用：使用灰色圆形
        ctx.fillStyle = `rgba(150, 150, 150, ${opacity})`;
        ctx.beginPath();
        ctx.arc(smoke.x, smoke.y, currentSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  });

  // 绘制能量气场（在玩家下方）
  if (world.player.energyAuraLevel > 0) {
    const auraRadius = GAME_CONFIG.ENERGY_AURA_BASE_RADIUS + world.player.energyAuraLevel * 15;
    const auraPhase = (now % 2000) / 2000; // 2秒周期动画

    // 气场外圈光晕（增强亮度）
    const auraGradient = ctx.createRadialGradient(
      world.player.x,
      world.player.y,
      auraRadius * 0.3,
      world.player.x,
      world.player.y,
      auraRadius * 1.3
    );
    auraGradient.addColorStop(0, 'rgba(100, 200, 255, 0.1)');
    auraGradient.addColorStop(0.4, 'rgba(100, 200, 255, 0.35)');
    auraGradient.addColorStop(0.7, 'rgba(150, 220, 255, 0.25)');
    auraGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y, auraRadius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // 气场边界线（呼吸效果，增强亮度和线宽）
    ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 + Math.sin(auraPhase * Math.PI * 2) * 0.3})`;
    ctx.lineWidth = 3 + Math.sin(auraPhase * Math.PI * 2) * 1;
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y, auraRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 内圈脉动（增强效果，多层叠加）
    const pulseAlpha = 0.4 + Math.sin(auraPhase * Math.PI * 4) * 0.25;
    ctx.strokeStyle = `rgba(150, 220, 255, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      world.player.x,
      world.player.y,
      auraRadius * 0.7 + Math.sin(auraPhase * Math.PI * 4) * 5,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // 第二层脉动
    ctx.strokeStyle = `rgba(180, 230, 255, ${pulseAlpha * 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      world.player.x,
      world.player.y,
      auraRadius * 0.4 + Math.sin(auraPhase * Math.PI * 6) * 3,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // 冲击波效果（增强视觉效果，多层波纹）
    const timeSinceLastShockwave = now - world.player.lastEnergyAuraShockwaveTime;
    if (timeSinceLastShockwave < 800) {
      // 延长显示时间到800ms
      const shockwaveProgress = timeSinceLastShockwave / 800;

      // 主冲击波
      const shockwaveRadius = auraRadius * (0.3 + shockwaveProgress * 1.0);
      const shockwaveOpacity = 0.8 * (1 - shockwaveProgress);

      ctx.strokeStyle = `rgba(100, 200, 255, ${shockwaveOpacity})`;
      ctx.lineWidth = 4 * (1 - shockwaveProgress * 0.5);
      ctx.beginPath();
      ctx.arc(world.player.x, world.player.y, shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 内层冲击波
      const innerRadius = auraRadius * (0.1 + shockwaveProgress * 0.7);
      const innerOpacity = 0.5 * (1 - shockwaveProgress);

      ctx.strokeStyle = `rgba(150, 220, 255, ${innerOpacity})`;
      ctx.lineWidth = 2 * (1 - shockwaveProgress * 0.5);
      ctx.beginPath();
      ctx.arc(world.player.x, world.player.y, innerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 外层光晕
      const outerRadius = auraRadius * (0.5 + shockwaveProgress * 1.2);
      const outerGradient = ctx.createRadialGradient(
        world.player.x,
        world.player.y,
        outerRadius * 0.8,
        world.player.x,
        world.player.y,
        outerRadius
      );
      outerGradient.addColorStop(0, `rgba(100, 200, 255, 0)`);
      outerGradient.addColorStop(1, `rgba(100, 200, 255, ${shockwaveOpacity * 0.3})`);

      ctx.fillStyle = outerGradient;
      ctx.beginPath();
      ctx.arc(world.player.x, world.player.y, outerRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 绘制玩家（使用序列帧动画）
  // 选择动画资源：移动时用走动动画，停止时用待机动画
  const playerAnimImage = world.player.isMoving ? playerWalkImage : playerIdleImage;

  // 闪现状态：使用 player_3 8帧动画，武器隐藏、不可攻击、无敌
  const dashActive = dashRef.current.active;
  const dashAtlas = SPRITE_ATLASES.playerDash;

  // 检测是否受击闪红
  const isPlayerHitEffect =
    world.player.isHit && now - world.player.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION;

  if (playerAnimImage) {
    ctx.save();

    // 根据瞄准方向计算面朝方向
    const canvasRect = canvas.getBoundingClientRect();
    const aimAngle = Math.atan2(
      world.mousePos.y - canvasRect.top - GAME_CONFIG.CANVAS_HEIGHT / 2,
      world.mousePos.x - canvasRect.left - GAME_CONFIG.CANVAS_WIDTH / 2
    );

    // 规范化角度到0-360度
    let normalizedAngle = ((aimAngle * 180) / Math.PI) % 360;
    if (normalizedAngle < 0) {
      normalizedAngle += 360;
    }

    // 判断是否需要镜像：0-90°或270-360°为右侧（需要镜像），90-270°为左侧（不镜像）
    const shouldMirrorPlayer = normalizedAngle <= 90 || normalizedAngle > 270;

    // 计算动画帧
    const playerAtlas = world.player.isMoving
      ? SPRITE_ATLASES.playerWalk
      : SPRITE_ATLASES.playerIdle;
    const totalFrames = playerAtlas.frames.length; // 走动10帧，待机9帧
    const frameDuration = 100; // 每帧100ms
    const animTime = now - world.player.animationStartTime;
    const frameIndex = Math.floor(animTime / frameDuration) % totalFrames;

    // 每帧大小（缩小为60%）
    const frameWidth = 256 * 0.6;
    const frameHeight = 192 * 0.6;

    // 移动到玩家位置
    ctx.translate(world.player.x, world.player.y);

    // 闪现镜像依据移动方向：往左移动则镜像，往右移动则不镜像
    if (dashActive && dashRef.current.active) {
      if (dashRef.current.dirX < -0.01) {
        ctx.scale(-1, 1);
      }
    } else if (shouldMirrorPlayer) {
      ctx.scale(-1, 1);
    }

    // 绘制当前帧（闪现时使用 player_3 动画）
    let srcImg = playerAnimImage;
    let srcX = frameIndex * 256;
    let srcW = 256;
    let dashFrameIdx = 0;
    if (dashActive && playerDashImage) {
      dashFrameIdx = Math.floor(((now - dashRef.current.startTime) % 400) / 50);
      if (dashFrameIdx < 0) dashFrameIdx = 7 - (-dashFrameIdx % 8);
      srcImg = playerDashImage;
      const dashFrame = atlasFrame(dashAtlas, dashFrameIdx);
      srcX = dashFrame.x;
      srcW = dashFrame.width;
    }
    ctx.drawImage(
      srcImg,
      srcX, // 源X（原尺寸）
      0, // 源Y
      srcW, // 源宽（原尺寸）
      192, // 源高（原尺寸）
      -frameWidth / 2, // 目标X（居中）
      -frameHeight / 2, // 目标Y（居中）
      frameWidth, // 目标宽（缩小后）
      frameHeight // 目标高（缩小后）
    );

    // 受击闪红叠加层（根据人物形状）
    if (isPlayerHitEffect && !dashActive) {
      ctx.save();
      // 使用filter将人物变成红色
      ctx.filter = 'brightness(1.2) sepia(1) saturate(3) hue-rotate(-50deg)';
      ctx.globalAlpha = 0.7;
      ctx.drawImage(
        playerAnimImage,
        frameIndex * 256, // 源X（原尺寸）
        0, // 源Y
        256, // 源宽（原尺寸）
        192, // 源高（原尺寸）
        -frameWidth / 2, // 目标X（居中）
        -frameHeight / 2, // 目标Y（居中）
        frameWidth, // 目标宽（缩小后）
        frameHeight // 目标高（缩小后）
      );
      ctx.restore();
    }

    ctx.restore();
  } else {
    // 备用绘制（如果图片未加载）：使用简单图形
    const isPlayerHitEffect =
      world.player.isHit && now - world.player.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION;

    ctx.fillStyle = isPlayerHitEffect ? '#ff0000' : '#4ade80';
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y, GAME_CONFIG.PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // 玩家眼睛
    const eyeOffset = 8;
    const eyeSize = 5;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(world.player.x - eyeOffset, world.player.y - eyeOffset, eyeSize, 0, Math.PI * 2);
    ctx.arc(world.player.x + eyeOffset, world.player.y - eyeOffset, eyeSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 玩家武器（使用美术贴图，智能瞄准和镜像翻转）
  const canvasRect = canvas.getBoundingClientRect();
  // 计算鼠标相对于屏幕中心的角度（因为摄像机以玩家为中心）
  const weaponAngle = Math.atan2(
    world.mousePos.y - canvasRect.top - GAME_CONFIG.CANVAS_HEIGHT / 2,
    world.mousePos.x - canvasRect.left - GAME_CONFIG.CANVAS_WIDTH / 2
  );

  // 获取当前武器的图片
  const currentWeaponImage = getWeaponImage();

  // 武器切换旋转动画
  let displayWeaponAngle = weaponAngle;
  let switchAnimationProgress = 1; // 默认完成

  if (world.player.isSwitchingWeapon && currentWeaponImage) {
    const switchDuration = 800; // 切换动画时长（毫秒）
    const elapsed = now - world.player.weaponSwitchStartTime;
    switchAnimationProgress = Math.min(elapsed / switchDuration, 1);

    // 使用缓动函数让动画更自然（ease-out）
    const easedProgress = 1 - Math.pow(1 - switchAnimationProgress, 3);

    // 计算旋转角度：从下方（-90度）旋转到瞄准方向
    // 使用最短路径旋转
    const startAngle = -Math.PI / 2; // 从正下方开始（270度位置）
    const targetAngle = weaponAngle;

    // 确保使用最短旋转路径
    let angleDiff = targetAngle - startAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    displayWeaponAngle = startAngle + angleDiff * easedProgress;
  }

  if (currentWeaponImage && !dashActive) {
    // 判断是否需要镜像翻转
    // 计算瞄准方向：x > 0 表示向右瞄准，x < 0 表示向左瞄准
    // 图片翻转后：枪口在右（指向正方向），把手在左
    // 瞄准向右时：使用原图，枪口指向右边 ✓
    // 瞄准向左时：镜像翻转，枪口指向左边 ✓
    // 规范化角度到 0-360 度用于判断
    let normalizedAngle = ((displayWeaponAngle * 180) / Math.PI) % 360;
    if (normalizedAngle < 0) {
      normalizedAngle += 360;
    }

    // 判断是否需要镜像：只在90-270度之间镜像（瞄准左半区）
    // 图片翻转和旋转是独立的，镜像只是翻转图片，不影响旋转角度
    const shouldMirror = normalizedAngle > 90 && normalizedAngle <= 270;

    ctx.save();

    // 移动到玩家位置
    ctx.translate(world.player.x, world.player.y);

    // 更新并衰减后坐力（仅视觉效果，切换动画期间不应用）

    // 旋转到瞄准方向 + 后坐力上跳角度
    // 切换动画期间使用动画角度，不应用后坐力
    const recoilUpward = world.player.isSwitchingWeapon ? 0 : recoilRef.current.upward;
    const recoilBack = world.player.isSwitchingWeapon ? 0 : recoilRef.current.backward;
    ctx.rotate(displayWeaponAngle - recoilUpward); // 减去角度使枪口向上

    // 只在需要时镜像图片（不影响旋转角度，只是翻转图片）
    if (shouldMirror) {
      ctx.scale(1, -1); // 垂直镜像（翻转图片，不改变方向）
    }

    // 添加晃动效果（随机微小偏移，切换动画期间不应用）
    const shakeX = world.player.isSwitchingWeapon
      ? 0
      : (Math.random() - 0.5) * recoilRef.current.shake;
    const shakeY = world.player.isSwitchingWeapon
      ? 0
      : (Math.random() - 0.5) * recoilRef.current.shake;

    // 绘制武器贴图（放在玩家前方）
    // 长枪的旋转半径为固定-25px（扛在肩上，向后偏移）
    const baseWeaponOffset = GAME_CONFIG.PLAYER_SIZE + 5;
    const weaponOffset = weaponConfig.isLongGun ? -25 : baseWeaponOffset;
    const weaponScale = 1.56; // 武器缩放比例（1.2 * 1.3 = 1.56，放大30%）

    // 切换动画期间，武器从下方旋转过来，稍微拉远一点
    const animOffset = world.player.isSwitchingWeapon ? 10 * (1 - switchAnimationProgress) : 0;

    // 根据不同武器调整大小
    let weaponWidth = 50;
    let weaponHeight = 20;

    switch (world.player.weapon) {
      case 'pistol':
        weaponWidth = 40;
        weaponHeight = 16;
        break;
      case 'shotgun':
        // 长枪缩小10%
        weaponWidth = 60 * 0.9;
        weaponHeight = 24 * 0.9;
        break;
      case 'smg':
        weaponWidth = 55;
        weaponHeight = 18;
        break;
      case 'sniper':
        // 长枪缩小10%
        weaponWidth = 70 * 0.9;
        weaponHeight = 20 * 0.9;
        break;
      case 'rpg':
        // 长枪缩小10%
        weaponWidth = 80 * 0.9;
        weaponHeight = 25 * 0.9;
        break;
    }

    const scaledWidth = weaponWidth * weaponScale;
    const scaledHeight = weaponHeight * weaponScale;

    // 绘制武器（应用后坐力效果：后退 + 晃动 + 动画偏移）
    ctx.drawImage(
      currentWeaponImage,
      weaponOffset - recoilBack + shakeX + animOffset, // 后退 + 晃动 + 动画偏移
      -scaledHeight / 2 + shakeY, // 晃动
      scaledWidth,
      scaledHeight
    );

    ctx.restore();
  }

  // 绘制和更新枪火动画
  if (fireImage) {
    const now = runtime.now();

    // 直接更新 ref，避免触发重新渲染
    muzzleFlashesRef.current.forEach((flash) => {
      const elapsed = now - flash.startTime;

      // 如果动画未完成，更新并绘制
      if (elapsed < flash.duration) {
        // 计算当前帧（5帧，每帧60ms，300ms总时长）- 复古像素风格
        const currentFrame = Math.floor(elapsed / (flash.duration / 5));

        const frameWidth = 200; // 每帧宽度
        const frameHeight = 256; // 每帧高度
        const frameIndex = Math.min(currentFrame, 4); // 最多5帧

        ctx.save();
        ctx.translate(flash.x, flash.y);
        ctx.rotate(flash.angle);

        // 绘制枪火精灵表的当前帧
        ctx.drawImage(
          fireImage,
          frameIndex * frameWidth, // 源X（当前帧）
          0, // 源Y
          frameWidth, // 源宽度
          frameHeight, // 源高度
          0, // 目标X
          (-frameHeight * flash.scale) / 2, // 目标Y（垂直居中）
          frameWidth * flash.scale, // 目标宽度
          frameHeight * flash.scale // 目标高度
        );

        ctx.restore();

        return true; // 保留活跃的枪火
      }

      return false; // 移除过期的枪火
    });
  }

  // 备用：如果没有武器图片，绘制简单圆形
  if (!currentWeaponImage) {
    // 备用：使用原始的长方体武器
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(
      world.player.x + Math.cos(weaponAngle) * GAME_CONFIG.PLAYER_SIZE,
      world.player.y + Math.sin(weaponAngle) * GAME_CONFIG.PLAYER_SIZE
    );
    ctx.lineTo(
      world.player.x + Math.cos(weaponAngle) * (GAME_CONFIG.PLAYER_SIZE + 20),
      world.player.y + Math.sin(weaponAngle) * (GAME_CONFIG.PLAYER_SIZE + 20)
    );
    ctx.stroke();
  }

  // 绘制换弹进度条和图标
  if (world.player.isReloading) {
    const weaponConfig = WEAPONS[world.player.weapon];
    // 狂暴状态：换弹速度+30%
    const desperateActive = isDesperateFightActive(world.player);
    const effectiveReloadBonus = world.player.reloadSpeedBonus + (desperateActive ? 30 : 0);
    const effectiveReloadTime = deriveCombatStats(world.player, runtime.now()).reloadTime;
    const elapsed = now - world.player.reloadStartTime;
    const progress = Math.min(elapsed / effectiveReloadTime, 1);

    // 绘制环形进度条（缩小50%后再缩小20%，位于角色下方再往下40px）
    const progressRadius = (GAME_CONFIG.PLAYER_SIZE + 10) * 0.4;
    const progressY = world.player.y + GAME_CONFIG.PLAYER_SIZE + 45; // 位于角色下方40px处
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * progress;

    // 背景圆环（圈粗细增加150%：4 → 6）
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(world.player.x, progressY, progressRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 进度圆环（圈粗细增加150%：4 → 6）
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(world.player.x, progressY, progressRadius, startAngle, endAngle);
    ctx.stroke();

    // 旋转的加载图标（位于角色下方）
    ctx.save();
    ctx.translate(world.player.x, progressY);
    ctx.rotate(elapsed * 0.005); // 旋转动画

    ctx.fillStyle = '#ff8800';
    ctx.font = '20px "Ark Pixel", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↻', 0, 0);

    ctx.restore();
  }

  // 绘制吸血回复效果（红色上升光效）
  world.vampireHealEffects.forEach((effect) => {
    const elapsed = now - effect.startTime;
    const duration = 800; // 0.8秒动画
    const progress = elapsed / duration;

    if (progress < 1) {
      // 红色上升光效
      const effectY = world.player.y - 30 - progress * 40; // 向上移动
      const opacity = 1 - progress;
      const scale = 1 + progress * 0.5; // 逐渐放大

      // 绘制红色光晕（多层叠加）
      const gradient = ctx.createRadialGradient(
        world.player.x,
        effectY,
        0,
        world.player.x,
        effectY,
        30 * scale
      );
      gradient.addColorStop(0, `rgba(255, 50, 50, ${opacity * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 100, 100, ${opacity * 0.4})`);
      gradient.addColorStop(1, `rgba(255, 50, 50, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(world.player.x, effectY, 30 * scale, 0, Math.PI * 2);
      ctx.fill();

      // 绘制上升的粒子效果
      for (let i = 0; i < 5; i++) {
        const particleY = effectY - i * 10 + Math.sin(elapsed * 0.01 + i) * 5;
        const particleX = world.player.x + Math.cos(elapsed * 0.02 + i * 1.5) * 10;
        const particleOpacity = opacity * (1 - i * 0.2);

        ctx.fillStyle = `rgba(255, 100, 100, ${particleOpacity})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // 恢复摄像机变换
  ctx.restore();

  // 波次衔接：中心显示"第X波"+敌人数量，随后3/2/1倒计时（屏幕固定，层级最顶，不被遮挡）
  if (world.waveTransition) {
    const nowMs = runtime.now();
    const WAVE_DELAY = 4000; // 波间延迟4秒
    const ANNOUNCE_HOLD = 2000; // 公告停留2秒
    const ANNOUNCE_FADE = 300; // 淡出0.3秒
    const COUNTDOWN_DELAY = 500; // 淡出后间隔0.5秒
    const ANNOUNCE_START = WAVE_DELAY;
    const ANNOUNCE_END = WAVE_DELAY + ANNOUNCE_HOLD;
    const COUNTDOWN_START = WAVE_DELAY + ANNOUNCE_HOLD + ANNOUNCE_FADE + COUNTDOWN_DELAY;
    const COUNTDOWN_EACH = 1000; // 每个数字停留1秒
    const wElapsed = nowMs - world.waveTransition.startTime;

    const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
    const centerY = GAME_CONFIG.CANVAS_HEIGHT / 2 - 30;

    if (wElapsed >= ANNOUNCE_START) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (wElapsed < COUNTDOWN_START) {
        // 公告阶段（含淡出）
        let opacity = 1;
        if (wElapsed > ANNOUNCE_END) {
          opacity = Math.max(0, 1 - (wElapsed - ANNOUNCE_END) / ANNOUNCE_FADE);
        }
        if (opacity > 0) {
          const waveTitle = t('waveTitle').replace('{n}', String(world.waveTransition.waveNumber));
          const waveEnemies = t('waveEnemies').replace(
            '{n}',
            String(world.waveTransition.enemyCount)
          );
          ctx.globalAlpha = opacity;
          ctx.font = "bold 54px 'Ark Pixel', Arial";
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.lineWidth = 6;
          ctx.strokeText(waveTitle, centerX, centerY);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(waveTitle, centerX, centerY);
          ctx.font = "bold 24px 'Ark Pixel', Arial";
          ctx.strokeText(waveEnemies, centerX, centerY + 46);
          ctx.fillStyle = '#ffd75e';
          ctx.fillText(waveEnemies, centerX, centerY + 46);
        }
      } else {
        // 倒计时阶段（3/2/1）
        const cdElapsed = wElapsed - COUNTDOWN_START;
        const cd = 3 - Math.floor(cdElapsed / COUNTDOWN_EACH);
        if (cd >= 1 && cd <= 3) {
          ctx.globalAlpha = 1;
          ctx.font = "bold 88px 'Ark Pixel', Arial";
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 8;
          ctx.strokeText(`${cd}`, centerX, centerY + 20);
          ctx.fillStyle = '#ff6b2d';
          ctx.fillText(`${cd}`, centerX, centerY + 20);
        }
      }
      ctx.restore();
    }
  }

  // 绘制暂停按钮（在canvas上部中间）
  if (pauseImage && !world.isPaused) {
    const buttonSize = 40;
    const buttonX = (GAME_CONFIG.CANVAS_WIDTH - buttonSize) / 2;
    const buttonY = 10;

    ctx.drawImage(pauseImage, buttonX, buttonY, buttonSize, buttonSize);
  }

  // 绘制箭头指示器（指示屏幕外的敌人位置）
  // 只在敌人数量少于5时显示
  if (arrowImage && world.monsters.length < 5 && world.monsters.length > 0) {
    const arrowRadius = 120; // 箭头距离玩家的距离
    const arrowSize = 30; // 箭头显示大小

    world.monsters.forEach((monster) => {
      if (monster.isDying) return;

      // 计算敌人相对于玩家的位置
      const relativeX = monster.x - world.player.x;
      const relativeY = monster.y - world.player.y;

      // 计算屏幕边界（相对于玩家）
      const screenHalfWidth = GAME_CONFIG.CANVAS_WIDTH / 2;
      const screenHalfHeight = GAME_CONFIG.CANVAS_HEIGHT / 2;

      // 检查敌人是否在屏幕外
      const isOffscreen =
        Math.abs(relativeX) > screenHalfWidth || Math.abs(relativeY) > screenHalfHeight;

      if (!isOffscreen) return; // 敌人在屏幕内，不显示箭头

      // 计算敌人相对于玩家的角度
      const angle = Math.atan2(relativeY, relativeX);

      // 计算箭头在屏幕上的位置（围绕玩家一圈）
      // 玩家在屏幕中心 (GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2)
      const arrowX = GAME_CONFIG.CANVAS_WIDTH / 2 + Math.cos(angle) * arrowRadius;
      const arrowY = GAME_CONFIG.CANVAS_HEIGHT / 2 + Math.sin(angle) * arrowRadius;

      // 绘制箭头
      ctx.save();
      ctx.translate(arrowX, arrowY);
      // 旋转箭头，使其指向敌人
      // 原始箭头向下（朝向+y），需要旋转angle + Math.PI/2
      ctx.rotate(angle + Math.PI / 2);

      ctx.drawImage(arrowImage, -arrowSize / 2, -arrowSize / 2, arrowSize, arrowSize);

      ctx.restore();
    });
  }

  // 绘制 UI 信息（在摄像机变换恢复后，确保在最上层）
  const uiFontSize = 16;
  ctx.font = `${uiFontSize}px 'Ark Pixel', Arial`;
  ctx.textBaseline = 'top';

  // ========== 左上角信息：游戏基础信息 ==========
  ctx.textAlign = 'left';
  let uiY = 10;

  // 关卡
  ctx.fillStyle = '#ffffff';
  ctx.fillText(t('hudLevel') + ' ' + world.level, 10, uiY);
  uiY += 25;

  // 分数
  ctx.fillText(t('hudScore') + ': ' + world.score, 10, uiY);
  uiY += 25;

  // 金币
  ctx.fillStyle = '#ffffff';
  ctx.fillText(t('hudGold') + ': ' + world.player.gold, 10, uiY);
  uiY += 30; // 增加间距

  // 剩余怪物（场上存活 + 待生成批次）
  ctx.fillStyle = '#ff4444';
  const aliveMonsters = world.monsters.filter((m) => !m.isDying).length;
  const pendingMonsters = world.pendingMonsterBatches.reduce((sum, batch) => sum + batch.length, 0);
  const totalRemaining = aliveMonsters + pendingMonsters;
  ctx.fillText(t('hudRemaining') + ': ' + totalRemaining, 10, uiY);

  const combatStats = deriveCombatStats(world.player, now);
  // ========== 右侧信息：武器和玩家状态 ==========
  uiY = 10;
  const rightX = GAME_CONFIG.CANVAS_WIDTH - 10;
  ctx.textAlign = 'right';

  // 武器
  ctx.textAlign = 'right';
  ctx.font = `${uiFontSize}px 'Ark Pixel', Arial`;

  // 武器
  ctx.fillStyle = '#00ff00';
  ctx.fillText(
    t('hudWeapon') + ': ' + WEAPONS[world.player.weapon].name + ' Lv.' + world.player.weaponLevel,
    rightX,
    uiY
  );
  uiY += 25;

  // 射速
  ctx.fillStyle = '#ffaa00';
  ctx.fillText(
    t('hudFireRate') + ': ' + Math.round(1000 / combatStats.fireInterval) + '/' + t('sec'),
    rightX,
    uiY
  );
  uiY += 30; // 增加间距

  // 暴击率（显示有效暴击率，带软上限）
  ctx.fillStyle = '#ffd700';
  const effectiveCritRate = combatStats.critRate;
  const rawCritRate = combatStats.rawCritRate;
  // 如果原始暴击率超过70%，显示有效值和原始值
  if (rawCritRate > 0.7) {
    ctx.fillText(
      '⭐ ' +
        t('hudCritRate') +
        ': ' +
        (effectiveCritRate * 100).toFixed(1) +
        '% (' +
        t('hudRaw') +
        (rawCritRate * 100).toFixed(1) +
        '%)',
      rightX,
      uiY
    );
  } else {
    ctx.fillText(
      '⭐ ' + t('hudCritRate') + ': ' + (effectiveCritRate * 100).toFixed(1) + '%',
      rightX,
      uiY
    );
  }
  uiY += 25;

  // 暴击伤害（显示有效暴击伤害，带软上限）
  ctx.fillStyle = '#ff9900';
  const effectiveCritDamage = combatStats.critDamage;
  const rawCritDamageBonus = combatStats.rawCritDamageBonus;
  const rawCritDamage = combatStats.rawCritDamage;
  // 如果原始额外加成超过150%，显示有效值和原始值
  if (rawCritDamageBonus > 150) {
    ctx.fillText(
      '💥 ' +
        t('hudCritDamage') +
        ': ' +
        (effectiveCritDamage * 100).toFixed(0) +
        '% (' +
        t('hudRaw') +
        (rawCritDamage * 100).toFixed(0) +
        '%)',
      rightX,
      uiY
    );
  } else {
    ctx.fillText(
      '💥 ' + t('hudCritDamage') + ': ' + (effectiveCritDamage * 100).toFixed(0) + '%',
      rightX,
      uiY
    );
  }
  uiY += 25;

  // 穿透力
  ctx.fillStyle = '#9b59b6';
  ctx.fillText('🎯 ' + t('hudPenetration') + ': ' + world.player.penetration, rightX, uiY);
  uiY += 25;

  // 伤害
  ctx.fillStyle = '#ffffff';
  ctx.fillText('⚔️ ' + t('hudDamage') + ': ' + world.player.damage, rightX, uiY);
  uiY += 25;

  // 射程
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🎯 ' + t('hudRange') + ': ' + world.player.weaponRange.toFixed(0), rightX, uiY);
  uiY += 25;

  // 子弹速度
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    '💨 ' + t('hudBulletSpeed') + ': ' + world.player.bulletSpeed.toFixed(1),
    rightX,
    uiY
  );
  uiY += 25;

  // 移动速度
  ctx.fillStyle = '#00ffff';
  ctx.fillText('🏃 ' + t('hudMoveSpeed') + ': ' + combatStats.moveSpeed.toFixed(1), rightX, uiY);
  uiY += 25;

  // 换弹速度
  ctx.fillStyle = '#ff8800';
  ctx.fillText(
    '🔄 ' + t('hudReloadTime') + ': ' + (effectiveReloadTime / 1000).toFixed(2) + t('sec'),
    rightX,
    uiY
  );

  // ========== 底部中间：血量格子显示 ==========
  if (hpBarImage && hpGreenImage && hpYellowImage && hpRedImage) {
    const currentHp = Math.floor(world.player.hp); // 当前血量（整数）
    const maxHp = Math.floor(world.player.maxHp); // 最大血量（整数）
    const hpRatio = currentHp / maxHp; // 血量比例

    // 选择血量格子颜色
    let hpImage = hpGreenImage;
    if (hpRatio <= 1 / 3) {
      hpImage = hpRedImage;
    } else if (hpRatio <= 2 / 3) {
      hpImage = hpYellowImage;
    }

    // 血量条参数
    const barWidth = 400; // 血量条宽度
    const barHeight = 30; // 血量条高度
    const barX = (GAME_CONFIG.CANVAS_WIDTH - barWidth) / 2; // 居中
    const barY = GAME_CONFIG.CANVAS_HEIGHT - 50; // 底部，距离边缘50px

    // 绘制血量条底图
    ctx.drawImage(hpBarImage, barX, barY, barWidth, barHeight);

    // 计算格子参数
    const paddingX = 30; // 左右内边距
    const paddingY = 8; // 上下内边距
    const innerWidth = barWidth - paddingX * 2; // 内部宽度
    const innerHeight = barHeight - paddingY * 2; // 内部高度
    const hpGap = 3; // 格子间距

    // HP格子原始尺寸和比例（HP_green.png: 50x80）
    const CELL_ASPECT_RATIO = 50 / 80; // 0.625

    // 标准血量（20）时，计算格子尺寸
    // 保持HP格子的原始宽高比例
    const STANDARD_HP = 20; // 标准血量
    const totalGapWidth = hpGap * (maxHp - 1); // 总间距
    const cellWidth = (innerWidth - totalGapWidth) / maxHp; // 每个格子的宽度
    const cellHeight = cellWidth / CELL_ASPECT_RATIO; // 根据原始比例计算高度

    // 计算实际占用的总宽度
    const totalCellsWidth = cellWidth * maxHp + hpGap * (maxHp - 1);
    const cellsStartX = barX + paddingX + (innerWidth - totalCellsWidth) / 2; // 居中
    const cellsStartY = barY + paddingY + (innerHeight - cellHeight) / 2; // 垂直居中

    // 绘制血量格子
    for (let i = 0; i < maxHp; i++) {
      const x = cellsStartX + i * (cellWidth + hpGap);
      const y = cellsStartY;

      if (i < currentHp) {
        // 有血量的格子
        ctx.drawImage(hpImage, x, y, cellWidth, cellHeight);
      } else {
        // 空格子（半透明灰色）
        ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
        ctx.fillRect(x, y, cellWidth, cellHeight);
      }
    }

    // 显示血量文字（在血条中间）
    ctx.font = 'bold 18px "Ark Pixel", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 描边效果（绘制多次文字，偏移不同方向）
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(`${currentHp}/${maxHp}`, GAME_CONFIG.CANVAS_WIDTH / 2, barY + barHeight / 2);

    // 绘制白色文字
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${currentHp}/${maxHp}`, GAME_CONFIG.CANVAS_WIDTH / 2, barY + barHeight / 2);
  }

  // 如果暂停，绘制半透明遮罩
  if (world.isPaused) {
    drawPauseScreen(ctx);
  }
}
