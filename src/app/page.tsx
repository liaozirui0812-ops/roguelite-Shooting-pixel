'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useSound } from '@/hooks/useSound';
import {
  GAME_CONFIG,
  WeaponType,
  Player,
  MuzzleFlash,
  UpgradeType,
  ShopItem,
} from '@/game';
import { createWorld } from '@/game/model/World';
import { createGameView } from '@/game/model/View';
import { useGameRuntime, useGameLoop } from '@/hooks/useGameRuntime';
import { useGameAssets } from '@/hooks/useGameAssets';
import { useGameInput } from '@/hooks/useGameInput';
import { buildShopOffers } from '@/game/rules/offers';
import { startLevel as startLevelCommand } from '@/game/commands/level';
import {
  generateShopItems as generateShopItemsCommand,
  toggleLockItems as toggleLockItemsCommand,
  enterShop as enterShopCommand,
  refreshShop as refreshShopCommand,
  buyShopItem as buyShopItemCommand,
  exitShop as exitShopCommand,
} from '@/game/commands/shop';
import {
  selectRandomUpgrades as selectRandomUpgradesCommand,
  refreshUpgrades as refreshUpgradesCommand,
  applyUpgrade as applyUpgradeCommand,
} from '@/game/commands/upgrade';
import { checkLevelCompletion as checkLevelCompletionCommand } from '@/game/commands/completion';
import {
  switchWeapon as switchWeaponCommand,
  switchWeaponTo as switchWeaponToCommand,
} from '@/game/commands/weapon';
import {
  startGameWithWeapon as startGameWithWeaponCommand,
  restartGame as restartGameCommand,
} from '@/game/commands/gameFlow';
import { explodeWorld } from '@/game/systems/explosion';
import { buildMapBackground } from '@/game/map/mapBackground';
import { buildObstacles } from '@/game/map/obstacles';
import { updateWorld } from '@/game/systems/updateWorld';
import { renderWorld } from '@/game/render/renderWorld';
import { LightingRenderer } from '@/game/render/lighting/lightingRenderer';
import { LIGHTING_DEFAULTS, type LightingConfig, type LightingQuality } from '@/game/config/lighting';
import { Language, translate, loadLanguage, LOCALE_STORAGE_KEY } from '@/i18n';

import { LoadingScreen } from '@/components/game/LoadingScreen';
import { WeaponSwitchHint } from '@/components/game/WeaponSwitchHint';
import { HealthBarHud } from '@/components/game/HealthBarHud';
import { WeaponSlotBar } from '@/components/game/WeaponSlotBar';
import { MuteButton } from '@/components/game/MuteButton';
import { MenuScreen } from '@/components/game/MenuScreen';
import { BuffPreviewDialog } from '@/components/game/BuffPreviewDialog';
import { WeaponSelectScreen } from '@/components/game/WeaponSelectScreen';
import { UpgradeScreen } from '@/components/game/UpgradeScreen';
import { ShopScreen } from '@/components/game/ShopScreen';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { BossHealthBar } from '@/components/game/BossHealthBar';
import { SettingsDialog } from '@/components/game/SettingsDialog';

export default function TopDownShooterGame() {
  const { runtime, view } = useGameRuntime(createWorld, createGameView);
  const world = runtime.state;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightingRef = useRef<LightingRenderer | null>(null);
  const [lightingConfig, setLightingConfig] = useState<LightingConfig>({ ...LIGHTING_DEFAULTS });
  useEffect(() => {
    const renderer = new LightingRenderer();
    lightingRef.current = renderer;
    return () => { renderer.dispose(); lightingRef.current = null; };
  }, []);
  useEffect(() => { lightingRef.current?.setConfig(lightingConfig); }, [lightingConfig]);
  const animationRef = useRef<number | undefined>(undefined);
  const levelCompleteTimeoutRef = useRef<number | undefined>(undefined);

  // 游戏状态
  const setGameState = runtime.setter('gameState');
  const setShopItems = runtime.setter('shopItems');
  const setPlayer = runtime.setter('player');
  const setMonsters = runtime.setter('monsters');
  const setPoisonCircles = runtime.setter('poisonCircles'); // 毒圈列表
  const setBullets = runtime.setter('bullets');
  const setEnemyBullets = runtime.setter('enemyBullets');
  const setCoins = runtime.setter('coins');
  const setObstacles = runtime.setter('obstacles');
  const setDamageNumbers = runtime.setter('damageNumbers');
  const setGoldFloatingTexts = runtime.setter('goldFloatingTexts'); // 金币获取弹字
  const setExplosionEffects = runtime.setter('explosionEffects'); // 爆炸效果列表
  const setSmokeEffects = runtime.setter('smokeEffects'); // 烟雾效果列表
  const setVampireHealEffects = runtime.setter('vampireHealEffects'); // 吸血回复效果列表
  const setAffixExplosionParticles = runtime.setter('affixExplosionParticles'); // 词缀爆炸粒子列表
  const setPierceEffects = runtime.setter('pierceEffects'); // 子弹穿透光效列表
  const setPlayerHitParticles = runtime.setter('playerHitParticles'); // 玩家受击蓝色粒子列表
  const setBossBarrages = runtime.setter('bossBarrages'); // BOSS砸地旋转弹幕列表
  const setAccumulatedDamage = runtime.setter('accumulatedDamage');
  const setMonstersRemaining = runtime.setter('monstersRemaining');

  // 分批敌人生成相关状态
  const setPendingMonsterBatches = runtime.setter('pendingMonsterBatches'); // 待生成的敌人批次
  const setCurrentBatchInitialCount = runtime.setter('currentBatchInitialCount'); // 当前批次初始敌人数量
  const setNextBatchTime = runtime.setter('nextBatchTime'); // 下一批生成时间
  const setWaveTransition = runtime.setter('waveTransition'); // 波次衔接状态（公告+倒计时）

  const setBossAlive = runtime.setter('bossAlive'); // BOSS是否存活
  const setBossCurrentHp = runtime.setter('bossCurrentHp'); // BOSS当前血量
  const setBossMaxHp = runtime.setter('bossMaxHp'); // BOSS最大血量
  const setScore = runtime.setter('score');
  const [highScore, setHighScore] = useState(0); // 最高分数
  const setKeys = runtime.setter('keys');
  const setMousePos = runtime.setter('mousePos');
  const setIsMouseDown = runtime.setter('isMouseDown');
  const setIsPaused = runtime.setter('isPaused'); // 是否暂停
  const [showInfoPopup, setShowInfoPopup] = useState(false); // 显示信息弹窗
  const [showSettings, setShowSettings] = useState(false); // 显示设置弹窗
  const [showBuffPreview, setShowBuffPreview] = useState(false); // 显示buff预览弹窗

  // 资源装配（图片加载、地块/障碍分组、失败重试）
  const { assets, tileImages, obstacleImages, resourceErrors, isLoading, loadProgress, retryLoad } =
    useGameAssets();

  // 语言切换（用 ref 让 canvas 闭包与 JSX 都读取最新语言）
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const languageRef = useRef<Language>(language);
  languageRef.current = language;
  const t = useCallback((key: string) => translate(key, languageRef.current), []);
  const switchLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    // 存储失败时仅保留内存中的语言设置
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(LOCALE_STORAGE_KEY, lang);
    } catch {
      /* localStorage 不可用时忽略 */
    }
  }, []);

  // 加载美术素材图片（state 已由 useGameAssets 托管，此处仅保留与渲染无关的本地常量与 ref）
  const DASH_COOLDOWN_MS = 5000;
  const NORMAL_MOVE_PPM = 0.017; // 玩家正常移速（px/ms），作为闪现曲线末速约束
  const dashRef = useRef<{
    active: boolean;
    startTime: number;
    fromX: number;
    fromY: number;
    dirX: number;
    dirY: number;
    recoveryStart: number;
  }>({ active: false, startTime: 0, fromX: 0, fromY: 0, dirX: 0, dirY: 0, recoveryStart: 0 });
  // 闪现技能冷却相关（5秒冷却 + 起始可立即使用）
  const setDashCooldown = runtime.setter('dashCooldown');
  const dashCooldownStartRef = useRef(0);
  // 摄像机带阻尼滞后跟随配置
  const CAMERA_FOLLOW_CONFIG = {
    TAU: 0.15, // 时间常数（秒）：约0.25s基本追上
    DEAD_ZONE_RADIUS: 40, // 死区半径（px）：玩家在中心40px内时镜头完全静止
    LAG_LIMIT_RATIO: 0.15, // 滞后上限：与玩家距离超过屏幕宽度15%时线性提升跟随速度
    LAG_CATCHUP_TIME: 0.1, // 超限部分追赶时间常数（秒）
    HOME_TAU: 0.2, // 停止移动后目标点归位时间常数（秒），约0.4s基本回到居中
  };
  const cameraPosRef = useRef({ x: 0, y: 0 }); // 相机跟随点（镜头中心）
  const cameraTargetRef = useRef({ x: 0, y: 0 }); // 死区推动目标点
  const playerPrevPosRef = useRef({ x: 0, y: 0 }); // 上一帧玩家位置（判定移动/静止）
  const cameraInitRef = useRef(false); // 相机是否已初始化对齐
  const dashPendingRef = useRef(false); // 玩家闪现技能
  const baseTransformRef = useRef<DOMMatrix | null>(null); // 屏幕基准变换（用于 HUD 脱离摄像机）

  // 地图背景canvas（预先渲染的地图背景）
  const mapBackgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 使用 ref 存储枪火动画和后坐力，避免频繁 setState 导致卡顿
  const muzzleFlashesRef = useRef<MuzzleFlash[]>([]);
  const recoilRef = useRef({
    backward: 0, // 后坐力后退距离
    upward: 0, // 后坐力上跳角度
    shake: 0, // 晃动强度
  });

  // 震屏强度（像素偏移幅度），用于爆炸等打击感表现
  const screenShakeRef = useRef(0);

  // 同步更新 playerRef

  // 音效系统
  const { play: playSound, playBGM, stopBGM, isMuted, toggleMute, volume, setVolume } = useSound();

  useEffect(() => {
    if (view.gameState === 'playing') playBGM();
    else stopBGM();
  }, [view.gameState, playBGM, stopBGM]);

  // 监听游戏结束，更新最高分数
  useEffect(() => {
    // 从localStorage读取最高分数（仅在客户端执行）
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dungeonGameHighScore');
        if (saved) {
          const parsed = Number.parseInt(saved, 10);
          // 只接受合法的非负有限整数，损坏值（NaN/负数/非法字符串）忽略
          if (Number.isFinite(parsed) && parsed >= 0) {
            setHighScore(parsed);
          }
        }
      } catch {
        // 存储不可用时忽略，保留内存中的默认值
      }
    }
  }, []);

  useEffect(() => {
    if (world.gameState === 'gameover') {
      if (world.score > highScore) {
        setHighScore(world.score);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('dungeonGameHighScore', world.score.toString());
          } catch {
            // 存储不可用时仅保留内存中的最高分
          }
        }
      }
    }
  }, [world.gameState, world.score, highScore]);

  // 生成地图背景（地块平铺）
  const generateMapBackground = useCallback(() => {
    // 无可用地块时返回 null，清除旧背景并回退纯色
    mapBackgroundCanvasRef.current = buildMapBackground(tileImages);
  }, [tileImages]);

  // 生成随机障碍物（图片未加载时返回 null，保留旧障碍）
  const generateObstacles = useCallback(() => {
    const next = buildObstacles(runtime, obstacleImages);
    if (next) setObstacles(next);
  }, [runtime, obstacleImages]);

  // 加载完成后使用可用地块；全部失败时清除旧背景并回退纯色。
  useEffect(() => {
    generateMapBackground();
  }, [tileImages, generateMapBackground]);

  // 获取当前武器的图片
  const getWeaponImage = useCallback(() => {
    switch (world.player.weapon) {
      case 'pistol':
        return assets.pistol ?? null;
      case 'shotgun':
        return assets.shotgun ?? null;
      case 'smg':
        return assets.smg ?? null;
      case 'sniper':
        return assets.sniper ?? null;
      case 'rpg':
        return assets.rpg ?? null;
      default:
        return assets.pistol ?? null;
    }
  }, [world.player.weapon, assets]);

  // 随机选择升级选项（根据关卡动态计算权重和数值）
  const selectRandomUpgrades = useCallback(
    (weapon: WeaponType, level: number, player: Player) =>
      selectRandomUpgradesCommand(runtime, weapon, level, player),
    [runtime]
  );

  // 刷新升级选项（每关固定刷新一次）
  const refreshUpgrades = useCallback(() => refreshUpgradesCommand(runtime), [runtime]);


  // 开始新关卡（支持指定关卡参数）
  const startLevel = useCallback(
    (targetLevel?: number) => startLevelCommand(runtime, playSound, targetLevel),
    [runtime, playSound]
  );

  // 开始游戏（选择武器后）
  const startGameWithWeapon = useCallback(
    (weaponType: WeaponType) =>
      startGameWithWeaponCommand(
        runtime,
        weaponType,
        {
          dashRef,
          dashCooldownStartRef,
          dashPendingRef,
          cameraInitRef,
          muzzleFlashesRef,
          recoilRef,
          screenShakeRef,
          levelCompleteTimeoutRef,
        },
        {
          playSound,
          regenerateMap: () => {
            generateObstacles();
            generateMapBackground();
          },
        }
      ),
    [runtime, playSound, generateObstacles, generateMapBackground]
  );

  // 切换武器（支持向前或向后切换）
  const switchWeapon = useCallback(
    (direction: 'next' | 'prev' = 'next') => switchWeaponCommand(runtime, direction),
    [runtime]
  );

  // 切换到指定索引的武器（数字键快捷切换）
  const switchWeaponTo = useCallback(
    (index: number) => switchWeaponToCommand(runtime, index),
    [runtime]
  );

  // 应用升级
  const applyUpgrade = (upgradeId: UpgradeType) =>
    applyUpgradeCommand(runtime, upgradeId, playSound);

  // 生成商店商品
  const generateShopItems = useCallback(() => generateShopItemsCommand(runtime), [runtime]);

  // 锁定/解锁当前商品
  const toggleLockItems = useCallback(() => toggleLockItemsCommand(runtime), [runtime]);

  // 进入商店
  const enterShop = useCallback(() => enterShopCommand(runtime), [runtime]);

  // 刷新商店商品
  const refreshShop = useCallback(() => refreshShopCommand(runtime), [runtime]);

  // 购买商品
  const buyShopItem = useCallback(
    (item: ShopItem) => buyShopItemCommand(runtime, item, playSound),
    [runtime, playSound]
  );

  // 退出商店
  const exitShop = useCallback(() => exitShopCommand(runtime, playSound), [runtime, playSound]);

  // Refill through the same candidate/price rules, preserving all unbought offers.
  useEffect(() => {
    if (world.gameState === 'shop' && world.lockedItems.length > 0 && world.shopItems.length < 3) {
      setShopItems(
        buildShopOffers(world.player, world.level, world.shopItems, runtime.random, () =>
          runtime.nextId('shop')
        )
      );
    }
  }, [world.gameState, world.lockedItems, world.shopItems, runtime]);

  // 切换暂停状态
  const togglePause = useCallback(() => {
    // 只在未暂停时暂停游戏
    if (!world.isPaused) {
      setIsPaused(true);
    }
    // 如果已暂停，不做任何操作（开始按钮点击由单独的处理逻辑）
  }, [world.isPaused]);

  // 重新开始
  const restartGame = () => restartGameCommand(runtime);

  // 触发吸血回复效果
  const triggerVampireHeal = (healAmount: number) => {
    const now = runtime.now();
    setVampireHealEffects((prev) => [
      ...prev,
      {
        id: `vampire-heal-${now}`,
        startTime: now,
        healAmount: healAmount,
      },
    ]);

    // 同时显示回复血量的飘字
    const playerPos = world.player;
    if (playerPos) {
      setGoldFloatingTexts((prev) => [
        ...prev,
        {
          id: `vampire-text-${now}`,
          x: playerPos.x,
          y: playerPos.y - 40,
          initialY: playerPos.y - 40,
          value: healAmount,
          opacity: 1.0,
          scale: 1.2,
          startTime: now,
          text: `+${healAmount} HP`,
          color: '#ff4444',
        },
      ]);
    }
  };

  // 触发震屏效果：累计强度并封顶，配合主循环每帧衰减实现震动
  const triggerScreenShake = (intensity: number) => {
    screenShakeRef.current = Math.min(16, Math.max(screenShakeRef.current, intensity));
  };

  // 触发爆炸（火箭弹爆炸函数）
  const triggerExplosion = (
    x: number,
    y: number,
    radius: number,
    damage: number,
    hasShockwave = false,
    hasAPShot = false
  ) => {
    explodeWorld(
      { runtime, world, playSound, triggerScreenShake, triggerVampireHeal, boomImage: assets.boom ?? null },
      x,
      y,
      radius,
      damage,
      hasShockwave,
      hasAPShot
    );
  };

  // 游戏主循环
  const checkLevelCompletion = () =>
    checkLevelCompletionCommand(runtime, { playSound, stopBGM, levelCompleteTimeoutRef });

  const simulationContext = {
    canvasRef,
    world,
    runtime,
    setWaveTransition,
    setMonsters,
    setCurrentBatchInitialCount,
    setMonstersRemaining,
    setPendingMonsterBatches,
    setNextBatchTime,
    dashPendingRef,
    dashRef,
    setDashCooldown,
    DASH_COOLDOWN_MS,
    dashCooldownStartRef,
    setPlayer,
    NORMAL_MOVE_PPM,
    setKeys,
    setBullets,
    playSound,
    // B2：三个表现类 ref 收敛为一个 viewFx 对象（ref 本体仍由页面持有）
    viewFx: {
      muzzleFlashes: muzzleFlashesRef,
      recoil: recoilRef,
      screenShake: screenShakeRef,
    },
    setSmokeEffects,
    triggerExplosion,
    setDamageNumbers,
    setAccumulatedDamage,
    setScore,
    setBossAlive,
    setCoins,
    triggerVampireHeal,
    setBossCurrentHp,
    setPierceEffects,
    setGameState,
    triggerScreenShake,
    boomImage: assets.boom ?? null,
    setExplosionEffects,
    setAffixExplosionParticles,
    setPoisonCircles,
    setEnemyBullets,
    stopBGM,
    setPlayerHitParticles,
    setBossBarrages,
    setGoldFloatingTexts,
    setVampireHealEffects,
    checkLevelCompletion,
    setBossMaxHp,
  };
  const rendererContext = {
    // Read the ref inside the RAF callback, including the first frame after mounting.
    get lighting() { return lightingRef.current; },
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
    rocketImage: assets.rocket ?? null,
    bulletImage: assets.bullet ?? null,
    bossFireBallImage: assets.bossFireBall ?? null,
    ballImage: assets.ball ?? null,
    rangeImage: assets.range ?? null,
    bossImage: assets.boss ?? null,
    boss2Image: assets.boss2 ?? null,
    enemy_1Image: assets.enemy_1 ?? null,
    enemy_2Image: assets.enemy_2 ?? null,
    enemy_3Image: assets.enemy_3 ?? null,
    enemy_4_2Image: assets.enemy_4_2 ?? null,
    enemy_4_1Image: assets.enemy_4_1 ?? null,
    chestImage: assets.chest ?? null,
    weaponUpgradeBoxImage: assets.weaponUpgradeBox ?? null,
    healthPotionImage: assets.healthPotion ?? null,
    coinImage: assets.coin ?? null,
    boomImage: assets.boom ?? null,
    DASH_COOLDOWN_MS,
    skillIconImage: assets.skillIcon ?? null,
    smokeImage: assets.smoke ?? null,
    playerWalkImage: assets.playerWalk ?? null,
    playerIdleImage: assets.playerIdle ?? null,
    dashRef,
    playerDashImage: assets.playerDash ?? null,
    getWeaponImage,
    recoilRef,
    fireImage: assets.fire ?? null,
    muzzleFlashesRef,
    pauseImage: assets.pause ?? null,
    arrowImage: assets.arrow ?? null,
    hpBarImage: assets.hpBar ?? null,
    hpGreenImage: assets.hpGreen ?? null,
    hpYellowImage: assets.hpYellow ?? null,
    hpRedImage: assets.hpRed ?? null,
    canvasRef,
  };
  const clearInput = () =>
    runtime.transaction(() => {
      setKeys(new Set());
      setIsMouseDown(false);
      dashPendingRef.current = false;
    });
  useGameLoop(
    runtime,
    () => updateWorld(simulationContext),
    (deltaMs) => renderWorld(rendererContext, deltaMs),
    clearInput
  );

  // 检测关卡完成

  // 清理定时器
  useEffect(() => {
    return () => {
      if (levelCompleteTimeoutRef.current) {
        runtime.cancel(levelCompleteTimeoutRef.current);
        levelCompleteTimeoutRef.current = undefined;
      }
    };
  }, []);

  // 输入绑定（键盘/鼠标/滚轮/Canvas 按钮命中）
  const { handleMouseMove, handleMouseDown, handleClick, handleMouseUp } = useGameInput({
    world,
    canvasRef,
    dashRef,
    dashPendingRef,
    assets,
    setKeys,
    setMousePos,
    setIsMouseDown,
    setIsPaused,
    setShowSettings,
    clearInput,
    switchWeapon,
    switchWeaponTo,
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="p-6">
        <div
          className="relative"
          style={{ width: GAME_CONFIG.CANVAS_WIDTH, height: GAME_CONFIG.CANVAS_HEIGHT }}
        >
          {/* 加载界面 */}
          {isLoading && (
            <LoadingScreen
              t={t}
              loadProgress={loadProgress}
              resourceErrors={resourceErrors}
              retryLoad={retryLoad}
            />
          )}

          <canvas
            ref={canvasRef}
            width={GAME_CONFIG.CANVAS_WIDTH}
            height={GAME_CONFIG.CANVAS_HEIGHT}
            className="rounded-lg cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            aria-label="战斗画布"
            tabIndex={0}
            data-game-state={view.gameState}
            data-paused={String(view.isPaused)}
            data-runtime-starts={runtime.metrics.loopStarts}
            onClick={handleClick}
          />

          {/* 武器切换提示 */}
          {view.player.isSwitchingWeapon && (
            <WeaponSwitchHint />
          )}

          {/* 生命值条 - 显示在 Canvas 区域下方中间 */}
          {view.gameState === 'playing' && !view.isPaused && (
            <HealthBarHud view={view} t={t} />
          )}

          {/* 武器切换UI - 左下角（数字键快捷切换） */}
          {view.gameState === 'playing' && !view.isPaused && (
            <WeaponSlotBar view={view} t={t} switchWeaponTo={switchWeaponTo} />
          )}

          {/* 静音按钮 - 右上角 */}
          {view.gameState === 'playing' && !view.isPaused && (
            <MuteButton t={t} isMuted={isMuted} toggleMute={toggleMute} />
          )}

          {/* 菜单界面 */}
          {view.gameState === 'menu' && (
            <MenuScreen
              t={t}
              highScore={highScore}
              showInfoPopup={showInfoPopup}
              setShowInfoPopup={setShowInfoPopup}
              setShowSettings={setShowSettings}
              setShowBuffPreview={setShowBuffPreview}
              setGameState={setGameState}
            />
          )}

          {/* Buff 预览弹窗 */}
          {showBuffPreview && (
            <BuffPreviewDialog view={view} t={t} setShowBuffPreview={setShowBuffPreview} />
          )}

          {/* 武器选择界面 */}
          {view.gameState === 'weaponSelect' && (
            <WeaponSelectScreen
              t={t}
              startGameWithWeapon={startGameWithWeapon}
              setGameState={setGameState}
            />
          )}

          {/* 升级界面 */}
          {view.gameState === 'upgrade' && (
            <UpgradeScreen
              view={view}
              t={t}
              applyUpgrade={applyUpgrade}
              refreshUpgrades={refreshUpgrades}
            />
          )}

          {/* 商店界面 */}
          {view.gameState === 'shop' && (
            <ShopScreen
              view={view}
              t={t}
              buyShopItem={buyShopItem}
              toggleLockItems={toggleLockItems}
              refreshShop={refreshShop}
              exitShop={exitShop}
            />
          )}

          {/* 游戏结束界面 */}
          {view.gameState === 'gameover' && (
            <GameOverScreen
              view={view}
              t={t}
              restartGame={restartGame}
              setGameState={setGameState}
            />
          )}

          {/* BOSS血条 */}
          {view.gameState === 'playing' && view.bossAlive && (
            <BossHealthBar view={view} t={t} />
          )}

          {/* 设置弹窗 */}
          {showSettings && (
            <SettingsDialog
              t={t}
              setShowSettings={setShowSettings}
              volume={volume}
              setVolume={setVolume}
              playSound={playSound}
              lightingConfig={lightingConfig}
              setLightingConfig={setLightingConfig}
              language={language}
              switchLanguage={switchLanguage}
              isMuted={isMuted}
              toggleMute={toggleMute}
            />
          )}
        </div>

        {/* 操作提示 */}
        {view.gameState === 'playing' && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            WASD / 方向键 移动 | 鼠标瞄准 | 左键射击 | 躲避红色怪物！
          </div>
        )}
      </Card>
    </div>
  );
}
