'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useSound } from '@/hooks/useSound';
import {
  checkCollisionWithObstacle,
  GAME_CONFIG,
  WeaponType,
  applyWeaponStatsToPlayer,
  getWeaponMagazine,
  Position,
  Player,
  MuzzleFlash,
  Obstacle,
  UpgradeType,
  ShopItem,
  GROWTH_CHAIN_NODES,
} from '@/game';
import { resetRunWorld } from '@/game/runtime/createRun';
import { createWorld } from '@/game/model/World';
import { createGameView } from '@/game/model/View';
import { useGameRuntime, useGameLoop } from '@/hooks/useGameRuntime';
import { useGameAssets } from '@/hooks/useGameAssets';
import { buildUpgradeOffers, buildShopOffers } from '@/game/rules/offers';
import { buyShopOffer } from '@/game/rules/shop';
import { canCompleteLevel } from '@/game/rules/level';
import { applyUpgradeEffect } from '@/game/rules/upgradeEffect';
import { explodeWorld } from '@/game/systems/explosion';
import { spawnMonsterWaves } from '@/game/systems/spawnMonsters';
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
  const setLockedItems = runtime.setter('lockedItems');
  const setShopRefreshCount = runtime.setter('shopRefreshCount');
  const setShopRefreshPrice = runtime.setter('shopRefreshPrice');
  const setUpgradeRefreshCount = runtime.setter('upgradeRefreshCount');
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
  const setLevel = runtime.setter('level');
  const setMonstersRemaining = runtime.setter('monstersRemaining');
  const setLevelCompletionTriggered = runtime.setter('levelCompletionTriggered'); // 防止关卡完成重复触发

  // 分批敌人生成相关状态
  const setPendingMonsterBatches = runtime.setter('pendingMonsterBatches'); // 待生成的敌人批次
  const setCurrentBatchInitialCount = runtime.setter('currentBatchInitialCount'); // 当前批次初始敌人数量
  const setNextBatchTime = runtime.setter('nextBatchTime'); // 下一批生成时间
  const setTotalMonstersToSpawn = runtime.setter('totalMonstersToSpawn'); // 总共需要生成的敌人数量
  const setThisLevelWaveTotal = runtime.setter('thisLevelWaveTotal'); // 本关总波次数
  const setWaveTransition = runtime.setter('waveTransition'); // 波次衔接状态（公告+倒计时）

  const setBossAlive = runtime.setter('bossAlive'); // BOSS是否存活
  const setBossCurrentHp = runtime.setter('bossCurrentHp'); // BOSS当前血量
  const setBossMaxHp = runtime.setter('bossMaxHp'); // BOSS最大血量
  const setScore = runtime.setter('score');
  const [highScore, setHighScore] = useState(0); // 最高分数
  const setAvailableUpgrades = runtime.setter('availableUpgrades');
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
    if (tileImages.length === 0) {
      mapBackgroundCanvasRef.current = null;
      return;
    }

    // 检查所有地块的尺寸，确保它们一致
    console.log('Checking tile dimensions:');
    tileImages.forEach((img, index) => {
      console.log(`  tile${index + 1}: ${img.width}x${img.height}px`);
    });

    // 获取第一个地块的尺寸
    const firstTile = tileImages[0];
    const tileWidth = firstTile.width;
    const tileHeight = firstTile.height;

    // 创建一个与地图尺寸相同的canvas
    const canvas = document.createElement('canvas');
    canvas.width = GAME_CONFIG.WORLD_WIDTH;
    canvas.height = GAME_CONFIG.WORLD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 计算需要覆盖整个地图的地块行列数
    // 地块缩小为原来的1/6，所以行列数增加为原来的6倍
    const tilesX = Math.ceil(GAME_CONFIG.WORLD_WIDTH / (tileWidth / 6));
    const tilesY = Math.ceil(GAME_CONFIG.WORLD_HEIGHT / (tileHeight / 6));

    console.log(
      `Tiling: ${tilesX} columns x ${tilesY} rows (original tile: ${tileWidth}x${tileHeight}, scaled: ${Math.floor(tileWidth / 6)}x${Math.floor(tileHeight / 6)})`
    );

    // 随机平铺地块（缩小为原来的1/6）
    const scaledTileWidth = tileWidth / 6;
    const scaledTileHeight = tileHeight / 6;

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        // 随机选择一个地块图片
        // 地面花纹仅影响表现，不消耗局内规则的随机源。
        const tileIndex = Math.floor(Math.random() * tileImages.length);
        const tileImage = tileImages[tileIndex];

        if (tileImage) {
          // 绘制时使用缩小后的尺寸，保持长宽比例
          ctx.drawImage(
            tileImage,
            x * scaledTileWidth, // 目标X位置
            y * scaledTileHeight, // 目标Y位置
            scaledTileWidth, // 目标宽度（原始的1/6）
            scaledTileHeight // 目标高度（原始的1/6）
          );
        }
      }
    }

    // 降低明度到80%（使用半透明黑色层）
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // 20%黑色，使明度降至80%
    ctx.fillRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
    ctx.restore();

    // 创建遮罩层，只显示地图范围内的内容
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // 同时设置80%不透明度
    ctx.fillRect(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
    ctx.restore();

    // 保存到ref中
    mapBackgroundCanvasRef.current = canvas;
    console.log(`Map background generated successfully`);
  }, [tileImages]);

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
    (weapon: WeaponType, level: number, player: Player) => {
      setAvailableUpgrades(buildUpgradeOffers(weapon, level, player, runtime.random));
    },
    [runtime]
  );

  // 刷新升级选项（每关固定刷新一次）
  const refreshUpgrades = useCallback(() => {
    if (world.upgradeRefreshCount >= 1) {
      console.warn('已达到本关刷新上限');
      return;
    }
    // 重新生成升级选项
    selectRandomUpgrades(world.player.weapon, world.level, world.player);
    setUpgradeRefreshCount(world.upgradeRefreshCount + 1);
  }, [
    world.upgradeRefreshCount,
    world.player.weapon,
    world.level,
    world.player,
    selectRandomUpgrades,
  ]);

  // 生成随机障碍物
  const generateObstacles = useCallback(() => {
    // 确保图片已加载
    if (Object.keys(obstacleImages).length === 0) {
      console.warn('Obstacle images not loaded yet');
      return;
    }

    const newObstacles: Obstacle[] = [];
    const maxAttempts = 1000; // 最大尝试次数，防止无限循环

    // 障碍物图片路径列表
    const obstacleImagePaths = [
      '/assets/obstacle_1.png',
      '/assets/obstacle_2.png',
      '/assets/obstacle_3.png',
      '/assets/Obstacle_4.png',
      '/assets/obstacle_5.png',
    ];

    // 障碍物配置（碰撞体积占图片的比例）
    const obstacleConfigs = [
      { collisionRatio: 0.7 }, // obstacle_1
      { collisionRatio: 0.6 }, // obstacle_2
      { collisionRatio: 0.8 }, // obstacle_3
      { collisionRatio: 0.75 }, // obstacle_4
      { collisionRatio: 0.65 }, // obstacle_5
    ];

    for (let i = 0; i < GAME_CONFIG.OBSTACLE_COUNT; i++) {
      let attempts = 0;
      let success = false;

      while (attempts < maxAttempts && !success) {
        attempts++;

        // 随机选择障碍物类型
        const obstacleIndex = Math.floor(runtime.random() * obstacleImagePaths.length);
        const imagePath = obstacleImagePaths[obstacleIndex];
        const obstacleImg = obstacleImages[imagePath];
        const config = obstacleConfigs[obstacleIndex];

        // 如果图片未加载，跳过
        if (!obstacleImg) {
          continue;
        }

        // 根据图片原始尺寸计算显示尺寸（保持比例）
        const originalWidth = obstacleImg.width;
        const originalHeight = obstacleImg.height;
        const maxSize = 100; // 最大边长

        let width, height;
        if (originalWidth > originalHeight) {
          width = maxSize;
          height = (maxSize * originalHeight) / originalWidth;
        } else {
          height = maxSize;
          width = (maxSize * originalWidth) / originalHeight;
        }

        // 生成随机位置（考虑障碍物实际尺寸）
        const x = 100 + runtime.random() * (GAME_CONFIG.WORLD_WIDTH - 200 - width);
        const y = 100 + runtime.random() * (GAME_CONFIG.WORLD_HEIGHT - 200 - height);

        // 碰撞体积大小（图片非透明部分，保持比例）
        const collisionWidth = width * config.collisionRatio;
        const collisionHeight = height * config.collisionRatio;

        // 确保不在玩家初始位置附近
        const distToCenter = Math.sqrt(
          Math.pow(x + width / 2 - GAME_CONFIG.WORLD_WIDTH / 2, 2) +
            Math.pow(y + height / 2 - GAME_CONFIG.WORLD_HEIGHT / 2, 2)
        );

        if (distToCenter < 200) continue;

        // 检查与其他障碍物的距离（不小于220px）
        let tooClose = false;
        for (const existing of newObstacles) {
          const dx = x + width / 2 - (existing.x + existing.width / 2);
          const dy = y + height / 2 - (existing.y + existing.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 220) {
            // 障碍物间距不小于220px
            tooClose = true;
            break;
          }
        }

        if (tooClose) continue;

        // 创建障碍物
        const obstacle: Obstacle = {
          id: `obstacle-${runtime.now()}-${i}`,
          x,
          y,
          width,
          height,
          image: imagePath,
          collisionWidth,
          collisionHeight,
        };

        newObstacles.push(obstacle);
        success = true;
      }

      if (!success) {
        console.warn(`Failed to place obstacle ${i + 1} after ${maxAttempts} attempts`);
      }
    }

    setObstacles(newObstacles);
  }, [obstacleImages]);

  // 生成怪物
  const spawnMonsters = useCallback(
    (
      totalWeight: number,
      hpMultiplier: number,
      enemySpeedMultiplier = 1,
      currentLevel = 1,
      playerX?: number,
      playerY?: number
    ) => {
      spawnMonsterWaves(
        runtime,
        totalWeight,
        hpMultiplier,
        enemySpeedMultiplier,
        currentLevel,
        playerX,
        playerY,
        playSound
      );
    },
    [runtime, playSound]
  );

  // 开始新关卡（支持指定关卡参数）
  const startLevel = useCallback(
    (targetLevel?: number) => {
      // 播放关卡开始音效
      playSound('level_start');

      const actualLevel = targetLevel !== undefined ? targetLevel : world.level;
      const baseWeight = 3;
      // 总权重：关卡1=3, 关卡2=4, 关卡3+=7/9/11...
      let totalWeight = baseWeight + (actualLevel - 1) * 2;
      if (actualLevel === 2) {
        totalWeight = 4; // 第二关特殊处理，减少怪物数量
      }
      // 血量倍率公式：HP = (1.1 + 0.10 × (L - 3) + 0.035 × (L - 3)²) × 1.25
      // ×1.25 用于补偿数量下降20%（数量×血量≈恒定，维持每关战斗时长）
      const levelDiff = actualLevel - 3;
      const hpMultiplier = (1.1 + 0.1 * levelDiff + 0.035 * levelDiff * levelDiff) * 1.25;

      // 重置关卡完成标记
      setLevelCompletionTriggered(false);

      // 重置分批生成状态
      setPendingMonsterBatches([]);
      setCurrentBatchInitialCount(0);
      setNextBatchTime(null);
      setTotalMonstersToSpawn(0);
      setThisLevelWaveTotal(0);
      setWaveTransition(null);

      // 重置BOSS状态（如果不是第5关）
      if (actualLevel !== 5) {
        setBossAlive(false);
        setBossCurrentHp(1560);
        setBossMaxHp(1560);
      }

      spawnMonsters(
        totalWeight,
        hpMultiplier,
        world.player.enemySpeedMultiplier,
        actualLevel,
        world.player.x,
        world.player.y
      );
      // monstersRemaining会在spawnMonsters中设置
    },
    [world.level, world.player.enemySpeedMultiplier, spawnMonsters, playSound]
  );

  // 开始游戏（选择武器后）
  const startGameWithWeapon = useCallback(
    (weaponType: WeaponType) => {
      // 播放按钮点击音效
      playSound('button_click');

      // 重置闪现技能冷却与位移状态
      setDashCooldown(0);
      dashCooldownStartRef.current = 0;
      dashRef.current = {
        active: false,
        startTime: 0,
        fromX: 0,
        fromY: 0,
        dirX: 0,
        dirY: 0,
        recoveryStart: 0,
      };
      dashPendingRef.current = false;

      // 清除关卡完成的延迟定时器
      if (levelCompleteTimeoutRef.current) {
        runtime.cancel(levelCompleteTimeoutRef.current);
        levelCompleteTimeoutRef.current = undefined;
      }

      resetRunWorld(runtime, weaponType);
      cameraInitRef.current = false;
      generateObstacles();
      generateMapBackground(); // 重新生成地图背景（随机地块组合）
      startLevel(1); // 传入关卡参数 1，确保生成第一关的怪物
      muzzleFlashesRef.current = [];
      recoilRef.current = { backward: 0, upward: 0, shake: 0 };
      screenShakeRef.current = 0;
      setGameState('playing');
    },
    [generateObstacles, generateMapBackground, startLevel, playBGM]
  );

  // 切换武器（支持向前或向后切换）
  const switchWeapon = useCallback((direction: 'next' | 'prev' = 'next') => {
    setPlayer((prev) => {
      if (prev.weapons.length <= 1) return prev; // 只有一个武器时不切换
      if (prev.isSwitchingWeapon) return prev; // 正在切换武器时不切换

      // 保存当前武器的弹药状态
      const newWeaponAmmo = { ...prev.weaponAmmo, [prev.weapon]: prev.currentAmmo };

      // 计算下一个武器索引
      let nextIndex: number;
      if (direction === 'next') {
        nextIndex = (prev.currentWeaponIndex + 1) % prev.weapons.length;
      } else {
        nextIndex = (prev.currentWeaponIndex - 1 + prev.weapons.length) % prev.weapons.length;
      }
      const nextWeapon = prev.weapons[nextIndex];

      // 获取该武器的弹药（如果没有记录则满弹匣，弹匣容量包含该武器的随机弹容量加成）
      const magCapacity = getWeaponMagazine(prev, nextWeapon);
      const savedAmmo = newWeaponAmmo[nextWeapon] ?? magCapacity;

      return {
        ...applyWeaponStatsToPlayer(prev, nextWeapon),
        weapon: nextWeapon,
        currentWeaponIndex: nextIndex,
        weaponAmmo: newWeaponAmmo,
        currentAmmo: savedAmmo,
        isReloading: false,
        reloadStartTime: 0,
        reloadInterrupted: false,
        // 设置武器切换状态
        isSwitchingWeapon: true,
        weaponSwitchStartTime: runtime.now(),
      };
    });
  }, []);

  // 切换到指定索引的武器（数字键快捷切换）
  const switchWeaponTo = useCallback((index: number) => {
    setPlayer((prev) => {
      if (prev.weapons.length <= 1) return prev; // 只有一把武器时不切换
      if (prev.isSwitchingWeapon) return prev; // 切换动画中不响应
      if (index < 0 || index >= prev.weapons.length) return prev; // 索引越界
      if (index === prev.currentWeaponIndex) return prev; // 切到当前武器无效果

      // 保存当前武器的弹药状态
      const newWeaponAmmo = { ...prev.weaponAmmo, [prev.weapon]: prev.currentAmmo };
      const nextWeapon = prev.weapons[index];

      // 获取目标武器的弹药（无记录则满弹匣，弹匣容量包含该武器随机弹容量加成）
      const magCapacity = getWeaponMagazine(prev, nextWeapon);
      const savedAmmo = newWeaponAmmo[nextWeapon] ?? magCapacity;

      return {
        ...applyWeaponStatsToPlayer(prev, nextWeapon),
        weapon: nextWeapon,
        currentWeaponIndex: index,
        weaponAmmo: newWeaponAmmo,
        currentAmmo: savedAmmo,
        isReloading: false,
        reloadStartTime: 0,
        reloadInterrupted: false,
        isSwitchingWeapon: true,
        weaponSwitchStartTime: runtime.now(),
      };
    });
  }, []);

  // 应用升级
  const applyUpgrade = (upgradeId: UpgradeType) => {
    if (world.gameState !== 'upgrade') return;
    // 播放按钮点击音效
    playSound('button_click');

    // 从 availableUpgrades 中找到对应的升级，获取其数值
    const upgrade = world.availableUpgrades.find((u) => u.id === upgradeId);
    if (!upgrade) return;

    // 检查是否是成长链节点升级
    if (upgrade.growthChainNode) {
      setPlayer((prev) => {
        const node = GROWTH_CHAIN_NODES[upgrade.growthChainNode!];
        return node.apply(prev);
      });
      // 进入商店而不是直接开始下一关
      enterShop();
      return;
    }

    const value = upgrade.value;

    setPlayer((prev) => applyUpgradeEffect(prev, upgradeId, value, runtime.random));
    // 进入商店而不是直接开始下一关
    enterShop();
  };

  // 生成商店商品
  const generateShopItems = useCallback(() => {
    setShopItems(
      buildShopOffers(world.player, world.level, world.lockedItems, runtime.random, () =>
        runtime.nextId('shop')
      )
    );
  }, [runtime]);

  // 锁定/解锁当前商品
  const toggleLockItems = useCallback(() => {
    if (world.lockedItems.length === 0) {
      // 锁定当前商品
      setLockedItems(world.shopItems.map((item) => ({ ...item })));
    } else {
      // 解锁商品
      setLockedItems([]);
    }
  }, [world.shopItems, world.lockedItems]);

  // 进入商店
  const enterShop = useCallback(() => {
    setShopRefreshCount(0);
    // 计算首次刷新价格
    const firstRefreshPrice = 5 + Math.floor(world.level / 2);
    setShopRefreshPrice(firstRefreshPrice);
    generateShopItems();
    setGameState('shop');
  }, [world.level, generateShopItems]);

  // 刷新商店商品
  const refreshShop = useCallback(() => {
    if (world.gameState !== 'shop') return;
    if (world.player.gold < world.shopRefreshPrice) return;

    setPlayer((prev) => ({ ...prev, gold: prev.gold - world.shopRefreshPrice }));

    const newRefreshCount = world.shopRefreshCount + 1;
    setShopRefreshCount(newRefreshCount);

    // 计算新的刷新价格
    const newRefreshPrice = Math.floor(world.shopRefreshPrice * 1.2);
    setShopRefreshPrice(newRefreshPrice);

    generateShopItems();
  }, [world.player.gold, world.shopRefreshPrice, world.shopRefreshCount, generateShopItems]);

  // 购买商品
  const buyShopItem = useCallback(
    (item: ShopItem) => {
      if (buyShopOffer(runtime, item.id)) playSound('coin');
    },
    [runtime, playSound]
  );

  // 退出商店
  const exitShop = useCallback(() => {
    if (world.gameState !== 'shop') return;
    // 不要清空锁定列表，让锁定商品跨关卡保留
    // setLockedItems([]);  // 注释掉这一行
    runtime.transaction(() => {
      const nextLevel = world.level + 1;
      setLevel(nextLevel);
      startLevel(nextLevel);
      setGameState('playing');
    });
  }, [startLevel, runtime]);

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
  const restartGame = () => {
    setGameState('weaponSelect');
  };

  // 碰撞检测
  const checkCollision = (pos1: Position, pos2: Position, size1: number, size2: number) => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < size1 + size2;
  };

  // 检测矩形碰撞（玩家/怪物与障碍物）
  const checkRectCollision = (pos: Position, size: number, obstacle: Obstacle) => {
    return checkCollisionWithObstacle(pos.x, pos.y, size, obstacle);
  };

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
  const checkLevelCompletion = () => {
    if (canCompleteLevel(world)) {
      // 标记关卡完成已触发
      setLevelCompletionTriggered(true);

      // 清除之前的延迟定时器
      if (levelCompleteTimeoutRef.current) {
        runtime.cancel(levelCompleteTimeoutRef.current);
      }

      // 延迟2秒后显示升级界面
      levelCompleteTimeoutRef.current = runtime.schedule(() => {
        // 使用 ref 获取最新的玩家状态
        const currentPlayer = world.player;
        if (currentPlayer) {
          selectRandomUpgrades(currentPlayer.weapon, world.level, currentPlayer);
          setGameState('upgrade');
          setUpgradeRefreshCount(0); // 重置刷新次数

          // 停止背景音乐
          stopBGM();

          // 播放关卡完成音效
          playSound('level_complete');
        }
      }, 2000);
    }
  };

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
    checkRectCollision,
    setKeys,
    setBullets,
    playSound,
    muzzleFlashesRef,
    recoilRef,
    setSmokeEffects,
    triggerExplosion,
    checkCollision,
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
    screenShakeRef,
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

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 处理ESC键暂停游戏（只在未暂停时响应）
      if (e.key === 'Escape' && world.gameState === 'playing' && !world.isPaused) {
        e.preventDefault();
        // 暂停游戏
        clearInput();
        setIsPaused(true);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;
      // Input commands are only accepted during active combat.
      if (world.gameState !== 'playing' || world.isPaused) {
        return;
      }

      // E键触发闪现（仅在战斗中）
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (!dashRef.current.active) {
          dashPendingRef.current = true;
        }
        return;
      }

      setKeys((prev) => new Set(prev).add(e.key));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key);
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const releaseMouse = () => setIsMouseDown(false);
    window.addEventListener('mouseup', releaseMouse);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', releaseMouse);
    };
  }, []);

  // 鼠标滚轮切换武器
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 只在游戏进行中且未暂停时响应
      if (world.gameState !== 'playing' || world.isPaused) return;

      // 阻止默认滚动行为
      e.preventDefault();

      // deltaY > 0 表示向下滚动，切换到下一个武器
      // deltaY < 0 表示向上滚动，切换到上一个武器
      if (e.deltaY > 0) {
        switchWeapon('next');
      } else if (e.deltaY < 0) {
        switchWeapon('prev');
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [world.gameState, world.isPaused, switchWeapon]);

  // 数字键快捷切换武器
  useEffect(() => {
    const handleWeaponKey = (e: KeyboardEvent) => {
      // 只在游戏进行中且未暂停时响应
      if (world.gameState !== 'playing' || world.isPaused) return;
      // 忽略输入框/文本区域中的按键
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;

      // 数字键 1-9，对应武器索引 0-8
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 9) {
        // 防止与方向键误触（不拦截，仅当有对应武器时触发）
        switchWeaponTo(keyNum - 1);
      }
    };

    window.addEventListener('keydown', handleWeaponKey);

    return () => {
      window.removeEventListener('keydown', handleWeaponKey);
    };
  }, [world.gameState, world.isPaused, switchWeaponTo]);

  // 鼠标事件
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!world.isPaused) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = () => {
    if (world.gameState === 'playing' && !world.isPaused) {
      setIsMouseDown(true);
    }
  };

  // 处理canvas点击事件
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    // 计算点击位置相对于canvas的坐标
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 如果游戏暂停，检查是否点击了继续游戏按钮或设置按钮
    if (world.isPaused) {
      // 继续游戏按钮
      const buttonY = GAME_CONFIG.CANVAS_HEIGHT - 60;
      const buttonX = GAME_CONFIG.CANVAS_WIDTH / 2 - 60;
      const buttonWidth = 120;
      const buttonHeight = 40;

      if (
        x >= buttonX &&
        x <= buttonX + buttonWidth &&
        y >= buttonY - 20 &&
        y <= buttonY - 20 + buttonHeight
      ) {
        // 点击了继续游戏按钮，立即恢复游戏
        setIsPaused(false);
        return;
      }

      // 设置按钮（左下角）
      const settingsBtnX = 20;
      const settingsBtnY = GAME_CONFIG.CANVAS_HEIGHT - 60;
      const settingsBtnWidth = 100;
      const settingsBtnHeight = 40;

      if (
        x >= settingsBtnX &&
        x <= settingsBtnX + settingsBtnWidth &&
        y >= settingsBtnY - 20 &&
        y <= settingsBtnY - 20 + settingsBtnHeight
      ) {
        // 点击了设置按钮，打开设置弹窗
        setShowSettings(true);
        return;
      }
    }

    // 检查是否点击了暂停按钮（只在游戏未暂停时响应）
    if (!world.isPaused && assets.pause) {
      const buttonSize = 40;
      const buttonX = (GAME_CONFIG.CANVAS_WIDTH - buttonSize) / 2;
      const buttonY = 10;

      if (x >= buttonX && x <= buttonX + buttonSize && y >= buttonY && y <= buttonY + buttonSize) {
        // 点击了暂停按钮，立即暂停
        clearInput();
        setIsPaused(true);
        return;
      }
    }
  };

  const handleMouseUp = () => setIsMouseDown(false);

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
