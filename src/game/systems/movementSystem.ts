import { GAME_CONFIG, isDesperateFightActive, WEAPONS } from '@/game';

import type { UpdateWorldContext, TickContext } from './context';

export function movementSystem(context: UpdateWorldContext, tick: TickContext) {
  const {
    dashPendingRef,
    dashRef,
    world,
    runtime,
    setDashCooldown,
    DASH_COOLDOWN_MS,
    dashCooldownStartRef,
    setPlayer,
    NORMAL_MOVE_PPM,
    checkRectCollision,
  } = context;

  // 消费闪现请求：按触发时的移动方向快照初始化闪现（0.4s 内位移 350px，期间无敌且无法攻击）
  if (dashPendingRef.current) {
    dashPendingRef.current = false;
    if (
      !dashRef.current.active &&
      world.dashCooldown <= 0 &&
      world.gameState === 'playing' &&
      !world.isPaused
    ) {
      let ddx = 0,
        ddy = 0;
      if (world.keys.has('w') || world.keys.has('W') || world.keys.has('ArrowUp')) ddy -= 1;
      if (world.keys.has('s') || world.keys.has('S') || world.keys.has('ArrowDown')) ddy += 1;
      if (world.keys.has('a') || world.keys.has('A') || world.keys.has('ArrowLeft')) ddx -= 1;
      if (world.keys.has('d') || world.keys.has('D') || world.keys.has('ArrowRight')) ddx += 1;
      const dl = Math.hypot(ddx, ddy) || 0.0001;
      dashRef.current = {
        active: true,
        startTime: runtime.now(),
        fromX: world.player.x,
        fromY: world.player.y,
        dirX: ddx / dl,
        dirY: ddy / dl,
        recoveryStart: 0,
      };
      // 触发冷却（5秒）
      setDashCooldown(DASH_COOLDOWN_MS);
      dashCooldownStartRef.current = runtime.now();
    }
  }

  // 闪现冷却倒计时（每帧递减，冷却结束翻转可再次使用）
  if (dashCooldownStartRef.current > 0) {
    const remaining = Math.max(
      0,
      DASH_COOLDOWN_MS - (runtime.now() - dashCooldownStartRef.current)
    );
    if (remaining <= 0) {
      dashCooldownStartRef.current = 0;
    }
    if (remaining !== world.dashCooldown) {
      setDashCooldown(remaining);
    }
  }

  // 更新玩家位置
  setPlayer((prev) => {
    const now = runtime.now();

    // 获取当前武器的速度倍率
    const currentWeapon = WEAPONS[prev.weapon];
    const weaponSpeedMultiplier = currentWeapon?.playerSpeedMultiplier ?? 1.0;

    // 狂暴状态：移动速度+1
    const desperateActive = isDesperateFightActive(prev);
    const desperateSpeedBonus = desperateActive ? 1 : 0;

    // 检查是否处于受击状态
    let currentSpeed = (prev.playerSpeed + desperateSpeedBonus) * weaponSpeedMultiplier;
    if (prev.isHit && now - prev.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION) {
      // 受击时减速
      currentSpeed =
        (prev.playerSpeed + desperateSpeedBonus) *
        weaponSpeedMultiplier *
        GAME_CONFIG.HIT_SLOWDOWN_FACTOR;
    }

    let newX = prev.x;
    let newY = prev.y;
    let isMoving = false;

    // 闪现中：EaseOut 位置曲线位移 350px / 0.4s
    // 速度从高到低线性收束，末速恒等于正常移速，衔接天生平滑、零额外距离（不设独立尾段）
    if (dashRef.current.active) {
      const d = dashRef.current;
      const x = Math.min(1, Math.max(0, (now - d.startTime) / 400));
      // v(t) 在 [v_max -> v_normal] 线性下降；位移 p(x)=v_n*T*x+(v_max-v_n)*(T/2)*x^2, x=t/T
      // 约束：T=400ms，总位移 D=350px 恒成立，末速 p'(T)=v_normal=正常移速
      const T = 400;
      const vNorm = NORMAL_MOVE_PPM; // 末速 = 正常移速 (px/ms)
      const vMax = (2 * 350) / T - vNorm; // 初速，保证积分总位移=350
      const px = vNorm * T * x + (vMax - vNorm) * (T / 2) * x * x;
      newX = d.fromX + d.dirX * px;
      newY = d.fromY + d.dirY * px;
      isMoving = true;
      if (x >= 1) {
        // 曲线到位即结束，速度已降至正常移速，无需补充尾段
        dashRef.current.active = false;
        dashRef.current.recoveryStart = 0;
      }
    } else {
      if (world.keys.has('w') || world.keys.has('W') || world.keys.has('ArrowUp'))
        newY -= currentSpeed;
      if (world.keys.has('s') || world.keys.has('S') || world.keys.has('ArrowDown'))
        newY += currentSpeed;
      if (world.keys.has('a') || world.keys.has('A') || world.keys.has('ArrowLeft'))
        newX -= currentSpeed;
      if (world.keys.has('d') || world.keys.has('D') || world.keys.has('ArrowRight'))
        newX += currentSpeed;
    }

    // 检测是否在移动
    isMoving = newX !== prev.x || newY !== prev.y;

    // 边界检测（使用世界坐标系的边界）
    newX = Math.max(
      GAME_CONFIG.PLAYER_SIZE,
      Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.PLAYER_SIZE, newX)
    );
    newY = Math.max(
      GAME_CONFIG.PLAYER_SIZE,
      Math.min(GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.PLAYER_SIZE, newY)
    );

    // 障碍物碰撞检测
    for (const obstacle of world.obstacles) {
      if (checkRectCollision({ x: newX, y: prev.y }, GAME_CONFIG.PLAYER_SIZE, obstacle)) {
        newX = prev.x;
      }
      if (checkRectCollision({ x: newX, y: newY }, GAME_CONFIG.PLAYER_SIZE, obstacle)) {
        newY = prev.y;
      }
    }

    // 更新动画状态
    let animationStartTime = prev.animationStartTime;
    let lastMoveTime = prev.lastMoveTime;
    if (isMoving) {
      lastMoveTime = now;
      // 如果从停止状态开始移动，重置动画时间
      if (!prev.isMoving) {
        animationStartTime = now;
      }
    }

    return {
      ...prev,
      x: newX,
      y: newY,
      isMoving: isMoving,
      lastMoveTime: lastMoveTime,
      animationStartTime: animationStartTime,
    };
  });
}
