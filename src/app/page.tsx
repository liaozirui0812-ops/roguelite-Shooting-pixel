'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSound } from '@/hooks/useSound';
import {
  checkCollisionWithObstacle,
  GAME_CONFIG,
  WeaponType,
  WEAPONS,
  RARITY_META,
  getWeaponInstance,
  getWeaponAffixSummary,
  applyWeaponStatsToPlayer,
  getWeaponMagazine,
  STARTER_WEAPON_META,
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
import { ASSET_PATHS } from '@/game/assets/manifest';
import { loadImageAsset, type AssetSpec } from '@/game/assets/loader';
import { buildUpgradeOffers, buildShopOffers } from '@/game/rules/offers';
import { buyShopOffer } from '@/game/rules/shop';
import { canCompleteLevel } from '@/game/rules/level';
import { applyUpgradeEffect } from '@/game/rules/upgradeEffect';
import { explodeWorld } from '@/game/systems/explosion';
import { spawnMonsterWaves } from '@/game/systems/spawnMonsters';
import { updateWorld } from '@/game/systems/updateWorld';
import { renderWorld } from '@/game/render/renderWorld';
import { Language, translate, loadLanguage, LOCALE_STORAGE_KEY } from '@/i18n';

import {
  bounceInAnimation,
  CoinIcon,
  UpgradeCard,
  ShopItemCard,
  PixelButton,
} from '@/components/game/AssetWidgets';

export default function TopDownShooterGame() {
  const { runtime, view } = useGameRuntime(createWorld, createGameView);
  const world = runtime.state;

  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [coinImage, setCoinImage] = useState<HTMLImageElement | null>(null);
  const [resourceErrors, setResourceErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true); // 资源是否加载完成
  const [loadProgress, setLoadProgress] = useState(0); // 加载进度 0-100

  // 语言切换（用 ref 让 canvas 闭包与 JSX 都读取最新语言）
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const languageRef = useRef<Language>(language);
  languageRef.current = language;
  const t = useCallback((key: string) => translate(key, languageRef.current), []);
  const switchLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') window.localStorage.setItem(LOCALE_STORAGE_KEY, lang);
  }, []);

  // 加载美术素材图片
  const [bulletImage, setBulletImage] = useState<HTMLImageElement | null>(null);
  const [rocketImage, setRocketImage] = useState<HTMLImageElement | null>(null); // 火箭弹图片
  const [playerIdleImage, setPlayerIdleImage] = useState<HTMLImageElement | null>(null); // 玩家待机动画
  const [playerWalkImage, setPlayerWalkImage] = useState<HTMLImageElement | null>(null); // 玩家走动动画
  const [playerDashImage, setPlayerDashImage] = useState<HTMLImageElement | null>(null); // 玩家闪现动画
  const [smokeImage, setSmokeImage] = useState<HTMLImageElement | null>(null); // 烟雾图片
  const [skillIconImage, setSkillIconImage] = useState<HTMLImageElement | null>(null); // 闪现技能图标 (shanxian.png)
  const [pistolImage, setPistolImage] = useState<HTMLImageElement | null>(null);
  const [shotgunImage, setShotgunImage] = useState<HTMLImageElement | null>(null);
  const [smgImage, setSmgImage] = useState<HTMLImageElement | null>(null);
  const [sniperImage, setSniperImage] = useState<HTMLImageElement | null>(null);
  const [fireImage, setFireImage] = useState<HTMLImageElement | null>(null);
  const [bossImage, setBossImage] = useState<HTMLImageElement | null>(null);
  const [boss2Image, setBoss2Image] = useState<HTMLImageElement | null>(null); // BOSS跳跃动画
  const [bossFireBallImage, setBossFireBallImage] = useState<HTMLImageElement | null>(null); // BOSS火球序列帧
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
  const [rangeImage, setRangeImage] = useState<HTMLImageElement | null>(null); // 锁定范围图标
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [enemy_1Image, setEnemy_1Image] = useState<HTMLImageElement | null>(null);
  const [enemy_2Image, setEnemy_2Image] = useState<HTMLImageElement | null>(null);
  const [enemy_3Image, setEnemy_3Image] = useState<HTMLImageElement | null>(null);
  const [enemy_4_1Image, setEnemy_4_1Image] = useState<HTMLImageElement | null>(null); // 敌人4_1（不射击动画）
  const [enemy_4_2Image, setEnemy_4_2Image] = useState<HTMLImageElement | null>(null); // 敌人4_2（射击动画）
  const [arrowImage, setArrowImage] = useState<HTMLImageElement | null>(null); // 箭头指示器
  const [pauseImage, setPauseImage] = useState<HTMLImageElement | null>(null); // 暂停按钮
  const [startImage, setStartImage] = useState<HTMLImageElement | null>(null); // 开始按钮
  const [chestImage, setChestImage] = useState<HTMLImageElement | null>(null); // 宝箱图片
  const [ballImage, setBallImage] = useState<HTMLImageElement | null>(null); // 子弹图片
  const [pistolShowImage, setPistolShowImage] = useState<HTMLImageElement | null>(null); // 手枪展示图
  const [shotgunShowImage, setShotgunShowImage] = useState<HTMLImageElement | null>(null); // 散弹枪展示图
  const [smgShowImage, setSmgShowImage] = useState<HTMLImageElement | null>(null); // 冲锋枪展示图
  const [sniperShowImage, setSniperShowImage] = useState<HTMLImageElement | null>(null); // 狙击枪展示图
  const [rpgImage, setRpgImage] = useState<HTMLImageElement | null>(null); // 火箭筒战斗图片
  const [rpgShowImage, setRpgShowImage] = useState<HTMLImageElement | null>(null); // 火箭筒展示图
  const [boomImage, setBoomImage] = useState<HTMLImageElement | null>(null); // 爆炸序列帧图片
  const [hpGreenImage, setHpGreenImage] = useState<HTMLImageElement | null>(null); // 血量格子-绿色
  const [hpYellowImage, setHpYellowImage] = useState<HTMLImageElement | null>(null); // 血量格子-黄色
  const [hpRedImage, setHpRedImage] = useState<HTMLImageElement | null>(null); // 血量格子-红色
  const [hpBarImage, setHpBarImage] = useState<HTMLImageElement | null>(null); // 血量条底图
  const [weaponUpgradeBoxImage, setWeaponUpgradeBoxImage] = useState<HTMLImageElement | null>(null); // 武器属性加成箱
  const [healthPotionImage, setHealthPotionImage] = useState<HTMLImageElement | null>(null); // 治疗瓶

  // 障碍物图片
  const [obstacleImages, setObstacleImages] = useState<Record<string, HTMLImageElement>>({});

  // 地块图片（用于地图地面平铺）
  const [tileImages, setTileImages] = useState<HTMLImageElement[]>([]);

  // 地图背景canvas（预先渲染的地图背景）
  const mapBackgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 图片加载版本号，用于强制重新加载图片
  const [imageVersion, setImageVersion] = useState(15); // 从15开始，确保重新加载

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
      const saved = localStorage.getItem('dungeonGameHighScore');
      if (saved) {
        setHighScore(parseInt(saved, 10));
      }
    }
  }, []);

  useEffect(() => {
    if (world.gameState === 'gameover') {
      if (world.score > highScore) {
        setHighScore(world.score);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dungeonGameHighScore', world.score.toString());
        }
      }
    }
  }, [world.gameState, world.score, highScore]);

  // 加载所有游戏美术素材
  useEffect(() => {
    // 定义所有需要加载的资源
    const resources: AssetSpec[] = [
      // 金币图片
      { key: 'coin', src: ASSET_PATHS.coin, setter: setCoinImage },
      // 子弹图片
      { key: 'bullet', src: ASSET_PATHS.bullet, setter: setBulletImage },
      // 烟雾图片
      { key: 'smoke', src: ASSET_PATHS.smoke, setter: setSmokeImage },
      // 枪械图片
      { key: 'pistol', src: ASSET_PATHS.pistol, setter: setPistolImage },
      { key: 'shotgun', src: ASSET_PATHS.shotgun, setter: setShotgunImage },
      { key: 'smg', src: ASSET_PATHS.smg, setter: setSmgImage },
      { key: 'sniper', src: ASSET_PATHS.sniper, setter: setSniperImage },
      // 枪火精灵表
      { key: 'fire', src: ASSET_PATHS.fire, setter: setFireImage },
      // BOSS精灵表
      { key: 'boss', src: ASSET_PATHS.boss, setter: setBossImage },
      { key: 'boss2', src: ASSET_PATHS.boss2, setter: setBoss2Image },
      // BOSS火球序列帧
      { key: 'bossFireBall', src: ASSET_PATHS.bossFireBall, setter: setBossFireBallImage },
      // 锁定范围图标
      { key: 'range', src: ASSET_PATHS.range, setter: setRangeImage },
      // 敌人精灵表
      { key: 'enemy_1', src: ASSET_PATHS.enemy_1, setter: setEnemy_1Image },
      { key: 'enemy_2', src: ASSET_PATHS.enemy_2, setter: setEnemy_2Image },
      { key: 'enemy_3', src: ASSET_PATHS.enemy_3, setter: setEnemy_3Image },
      { key: 'enemy_4_1', src: ASSET_PATHS.enemy_4_1, setter: setEnemy_4_1Image },
      { key: 'enemy_4_2', src: ASSET_PATHS.enemy_4_2, setter: setEnemy_4_2Image },
      // 箭头指示器图片
      { key: 'arrow', src: ASSET_PATHS.arrow, setter: setArrowImage },
      // 暂停按钮图片
      { key: 'pause', src: ASSET_PATHS.pause, setter: setPauseImage },
      // 开始按钮图片
      { key: 'start', src: ASSET_PATHS.start, setter: setStartImage },
      // 宝箱图片
      { key: 'chest', src: ASSET_PATHS.chest, setter: setChestImage },
      // 子弹图片（敌人子弹）
      { key: 'ball', src: ASSET_PATHS.ball, setter: setBallImage },
      // 武器展示图片
      { key: 'pistolShow', src: ASSET_PATHS.pistolShow, setter: setPistolShowImage },
      { key: 'shotgunShow', src: ASSET_PATHS.shotgunShow, setter: setShotgunShowImage },
      { key: 'smgShow', src: ASSET_PATHS.smgShow, setter: setSmgShowImage },
      { key: 'sniperShow', src: ASSET_PATHS.sniperShow, setter: setSniperShowImage },
      // 火箭筒相关图片
      { key: 'rpg', src: ASSET_PATHS.rpg, setter: setRpgImage },
      { key: 'rpgShow', src: ASSET_PATHS.rpgShow, setter: setRpgShowImage },
      // 爆炸序列帧图片
      { key: 'boom', src: ASSET_PATHS.boom, setter: setBoomImage },
      // 血量格子图片
      { key: 'hpGreen', src: ASSET_PATHS.hpGreen, setter: setHpGreenImage },
      { key: 'hpYellow', src: ASSET_PATHS.hpYellow, setter: setHpYellowImage },
      { key: 'hpRed', src: ASSET_PATHS.hpRed, setter: setHpRedImage },
      // 血量条底图
      { key: 'hpBar', src: ASSET_PATHS.hpBar, setter: setHpBarImage },
      // 武器属性加成箱
      {
        key: 'weaponUpgradeBox',
        src: ASSET_PATHS.weaponUpgradeBox,
        setter: setWeaponUpgradeBoxImage,
      },
      // 治疗瓶
      { key: 'healthPotion', src: ASSET_PATHS.healthPotion, setter: setHealthPotionImage },
      // 障碍物图片
      { key: 'obstacle_1', src: ASSET_PATHS.obstacle_1, type: 'obstacle' },
      { key: 'obstacle_2', src: ASSET_PATHS.obstacle_2, type: 'obstacle' },
      { key: 'obstacle_3', src: ASSET_PATHS.obstacle_3, type: 'obstacle' },
      { key: 'obstacle_4', src: ASSET_PATHS.obstacle_4, type: 'obstacle' },
      { key: 'obstacle_5', src: ASSET_PATHS.obstacle_5, type: 'obstacle' },
      // 火箭弹图片
      { key: 'rocket', src: ASSET_PATHS.rocket, setter: setRocketImage },
      // 玩家图片
      { key: 'playerIdle', src: ASSET_PATHS.playerIdle, setter: setPlayerIdleImage },
      { key: 'playerWalk', src: ASSET_PATHS.playerWalk, setter: setPlayerWalkImage },
      { key: 'playerDash', src: ASSET_PATHS.playerDash, setter: setPlayerDashImage },
      { key: 'skillIcon', src: ASSET_PATHS.skillIcon, setter: setSkillIconImage },
      // 背景图片
      { key: 'bg', src: ASSET_PATHS.bg, setter: setBgImage },
      // 地块图片
    ];

    const controller = new AbortController();
    setIsLoading(true);
    setLoadProgress(0);
    setResourceErrors([]);
    let completed = 0;
    const load = async () => {
      const results = await Promise.all(
        resources.map(async (resource) => {
          const result = await loadImageAsset(resource, controller.signal, imageVersion);
          if (!controller.signal.aborted) {
            completed++;
            setLoadProgress(Math.round((completed / resources.length) * 100));
            if (result.status === 'loaded') resource.setter?.(result.image);
          }
          return { resource, result };
        })
      );
      if (controller.signal.aborted) return;
      const byPath: Record<string, HTMLImageElement> = {};
      const failed: string[] = [];
      for (const { resource, result } of results) {
        if (result.status === 'loaded' && resource.type === 'obstacle')
          byPath[resource.src] = result.image;
        if (result.status === 'failed' && resource.required !== false) failed.push(resource.key);
      }
      setObstacleImages(byPath);
      setResourceErrors(failed);
      setIsLoading(failed.length > 0);
      // No tile files exist in this checkout: retain the existing solid-map fallback.
      setTileImages([]);
    };
    void load();
    return () => controller.abort();
  }, [imageVersion]);

  // 生成地图背景（地块平铺）
  const generateMapBackground = useCallback(() => {
    if (tileImages.length === 0) return;

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
        const tileIndex = Math.floor(runtime.random() * tileImages.length);
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

  // 当所有地块图片加载完成后，生成地图背景
  useEffect(() => {
    if (tileImages.length === 5) {
      generateMapBackground();
    }
  }, [tileImages, generateMapBackground]);

  // 延迟更新图片版本，强制重新加载图片
  useEffect(() => {
    const timer = setTimeout(() => {
      setImageVersion((prev) => prev + 1);
    }, 1000); // 1秒后更新版本号

    return () => clearTimeout(timer);
  }, []);

  // 获取当前武器的图片
  const getWeaponImage = useCallback(() => {
    switch (world.player.weapon) {
      case 'pistol':
        return pistolImage;
      case 'shotgun':
        return shotgunImage;
      case 'smg':
        return smgImage;
      case 'sniper':
        return sniperImage;
      case 'rpg':
        return rpgImage;
      default:
        return pistolImage;
    }
  }, [world.player.weapon, pistolImage, shotgunImage, smgImage, sniperImage, rpgImage]);

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
        const obstacleImg = obstacleImages[obstacleIndex];
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
      { runtime, world, playSound, triggerScreenShake, triggerVampireHeal, boomImage },
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
    boomImage,
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
    if (!world.isPaused && pauseImage) {
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
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg bg-gradient-to-b from-gray-900 to-black">
              {/* 游戏标题 */}
              <h1
                className="text-4xl font-bold text-yellow-400 mb-8"
                style={{
                  textShadow: '0 0 10px rgba(250, 204, 21, 0.5), 3px 3px 0 #000',
                  fontFamily: '"Ark Pixel", Arial',
                }}
              >
                {t('game_title')}
              </h1>

              {/* 加载状态文本 */}
              <p
                className="text-gray-300 text-lg mb-6"
                style={{ fontFamily: '"Ark Pixel", Arial' }}
              >
                {t('loading')}
              </p>

              {/* 进度条容器 */}
              <div className="w-80 h-8 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-600 mb-4">
                {/* 进度条填充 */}
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 transition-all duration-200 ease-out"
                  style={{
                    width: `${loadProgress}%`,
                    boxShadow: '0 0 10px rgba(250, 204, 21, 0.5)',
                  }}
                />
              </div>

              {/* 进度百分比 */}
              <p
                className="text-yellow-400 text-2xl font-bold"
                style={{ fontFamily: '"Ark Pixel", Arial' }}
              >
                {loadProgress}%
              </p>

              {resourceErrors.length > 0 && (
                <div role="alert" className="mt-4 text-center text-red-300">
                  <p>{t('assetLoadFailed')}</p>
                  <Button className="mt-2" onClick={() => setImageVersion((v) => v + 1)}>
                    {t('retryLoad')}
                  </Button>
                </div>
              )}
              {/* 小提示 */}
              <p
                className="text-gray-500 text-sm mt-8"
                style={{ fontFamily: '"Ark Pixel", Arial' }}
              >
                {resourceErrors.length === 0 ? t('loading_click_to_start') : t('assetLoadFailed')}
              </p>
            </div>
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
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end">
              {/* 切换进度条 */}
              <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-48">
                <div className="h-2 bg-gray-800/80 rounded-full overflow-hidden border border-cyan-500/50">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    style={{
                      width: '100%',
                      animation: 'weaponSwitchProgress 1s ease-out forwards',
                    }}
                  />
                </div>
                <div
                  className="text-center text-white font-bold mt-2"
                  style={{
                    textShadow: '2px 2px 0 #000',
                    fontFamily: '"Ark Pixel", Arial',
                    animation: 'weaponSwitchPulse 0.4s ease-in-out infinite',
                  }}
                >
                  切换武器中...
                </div>
              </div>

              {/* 动画样式 */}
              <style jsx>{`
                @keyframes weaponSwitchProgress {
                  from {
                    width: 0%;
                    background: linear-gradient(to right, transparent, #06b6d4);
                  }
                  to {
                    width: 100%;
                    background: linear-gradient(to right, #06b6d4, #3b82f6);
                  }
                }
                @keyframes weaponSwitchPulse {
                  0%,
                  100% {
                    opacity: 1;
                    transform: scale(1);
                  }
                  50% {
                    opacity: 0.7;
                    transform: scale(1.05);
                  }
                }
              `}</style>
            </div>
          )}

          {/* 生命值条 - 显示在 Canvas 区域下方中间 */}
          {view.gameState === 'playing' && !view.isPaused && (
            <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
              {/* 弹药数显示 */}
              <div
                className="text-white font-bold text-lg"
                style={{
                  textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                  fontFamily: '"Ark Pixel", Arial',
                }}
              >
                🔫 {t('ammo')}: {view.player.currentAmmo}/
                {getWeaponMagazine(view.player, view.player.weapon)}
                {view.player.isReloading && (
                  <span className="ml-2 text-yellow-300">{t('reloading')}</span>
                )}
              </div>
            </div>
          )}

          {/* 武器切换UI - 左下角（数字键快捷切换） */}
          {view.gameState === 'playing' && (
            <div className="absolute bottom-4 left-4 flex flex-col gap-1">
              <div
                className="text-gray-400/90 text-[11px] font-semibold px-1 mb-0.5 tracking-wide select-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                {t('switch_weapon_hint').replace(
                  '{keys}',
                  view.player.weapons.map((_, i) => i + 1).join(' / ')
                )}
              </div>
              <div className="flex flex-col gap-1.5" style={{ backdropFilter: 'blur(6px)' }}>
                {view.player.weapons.map((wpn, idx) => {
                  const isActive = idx === view.player.currentWeaponIndex;
                  const inst = getWeaponInstance(view.player, wpn);
                  const rmeta = RARITY_META[inst.rarity] || RARITY_META[1];
                  const s = getWeaponAffixSummary(view.player, wpn);
                  const affixText = inst.affixes.map((a) => a.valueLabel).join(' · ');
                  return (
                    <div
                      key={wpn}
                      onClick={() => switchWeaponTo(idx)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 min-w-[240px] cursor-pointer select-none transition-all duration-150
                        ${
                          isActive
                            ? 'bg-gray-800/95 border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
                            : 'bg-gray-900/75 border-2 border-gray-600 hover:border-gray-400 active:bg-gray-800/90'
                        }`}
                      style={isActive ? { borderColor: '#22d3ee' } : undefined}
                    >
                      {/* 编号 */}
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black shrink-0
                        ${isActive ? 'bg-cyan-400 text-gray-900' : 'bg-gray-700 text-gray-200'}`}
                      >
                        {idx + 1}
                      </span>
                      {/* 武器图标 */}
                      <img
                        src={WEAPONS[wpn].showIcon}
                        alt={WEAPONS[wpn].name}
                        className={`w-7 h-7 object-contain shrink-0 transition-all duration-150 ${isActive ? 'brightness-110 scale-105' : 'opacity-80'}`}
                      />
                      {/* 名称 + 稀有度 + 属性 */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className="text-sm font-bold truncate leading-tight"
                          style={{ color: rmeta.color, textShadow: `0 0 6px ${rmeta.color}55` }}
                        >
                          {WEAPONS[wpn].name}
                          <span className="ml-1.5 text-[10px] font-bold opacity-90">
                            {rmeta.name}
                          </span>
                        </span>
                        <span className="text-[10px] text-gray-300/90 truncate leading-tight">
                          {inst.affixes.length > 0 ? (
                            affixText
                          ) : (
                            <span className="text-gray-500">· 无随机属性 ·</span>
                          )}
                          <span className="ml-1 text-gray-400">价值{inst.value}</span>
                        </span>
                      </div>
                      {/* 当前标记 */}
                      {isActive && (
                        <span className="ml-auto text-[10px] font-bold text-cyan-300 tracking-wide">
                          ●
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 静音按钮 - 右上角 */}
          {view.gameState === 'playing' && !view.isPaused && (
            <button
              onClick={toggleMute}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-800/80 border-2 border-gray-500 hover:border-white flex items-center justify-center cursor-pointer transition-all duration-200"
              style={{
                backdropFilter: 'blur(5px)',
              }}
              title={isMuted ? t('enable_sound') : t('mute')}
            >
              {isMuted ? (
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              )}
            </button>
          )}

          {/* 菜单界面 */}
          {view.gameState === 'menu' && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-lg"
              style={{
                backgroundImage: 'url(/assets/bg.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* 右上角设置按钮 */}
              <button
                onClick={() => setShowSettings(true)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-gray-800/80 border-2 border-gray-400 hover:border-white flex items-center justify-center cursor-pointer transition-all duration-200"
                style={{ backdropFilter: 'blur(5px)' }}
                title={t('settings')}
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              {/* 半透明黑色遮罩 */}
              <div className="absolute inset-0 bg-black/50 rounded-lg"></div>

              {/* 左上角信息按钮 */}
              <div
                className="absolute top-4 left-4 z-20"
                onMouseEnter={() => setShowInfoPopup(true)}
                onMouseLeave={() => setShowInfoPopup(false)}
              >
                {/* 圆形"i"按钮 */}
                <div
                  className="w-10 h-10 rounded-full bg-gray-800/80 border-2 border-gray-400 flex items-center justify-center cursor-pointer hover:bg-gray-700/90 hover:border-white transition-all duration-200"
                  style={{
                    boxShadow: showInfoPopup ? '0 0 15px rgba(255,255,255,0.3)' : 'none',
                  }}
                >
                  <span className="text-white font-bold text-xl italic">i</span>
                </div>

                {/* 信息弹窗 */}
                {showInfoPopup && (
                  <div
                    className="absolute top-12 left-0 w-80 bg-gray-900/95 border-2 border-gray-500 rounded-lg p-4 shadow-2xl"
                    style={{
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <h3 className="text-lg font-bold text-white mb-3 border-b border-gray-600 pb-2">
                      🎮 游戏功能一览
                    </h3>
                    <ul className="text-sm text-gray-200 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_levelWeight')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_wave')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_animation')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_boss')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_shop')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_upgrade_reward')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_weapons')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_weaponUpgrade')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_crit')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_reload')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_pierce')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_gold')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_chest')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_obstacle')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_slowFocus')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_shooterEnemy')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_dmgNumbers')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>{t('feature_rocketExplosion')}</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center relative z-10">
                <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
                  {t('game.title')}
                </h1>
                <p className="text-gray-300 mb-4 drop-shadow-md text-center">
                  {t('menu.controls')}
                </p>
                {highScore > 0 && (
                  <p className="text-yellow-400 mb-8 drop-shadow-md text-center font-bold text-lg">
                    🏆 {t('menu.highScore')}: {highScore}
                  </p>
                )}
                <PixelButton
                  imageUrl="/assets/btn_main.png"
                  onClick={() => setGameState('weaponSelect')}
                  width={220}
                  height={82.5}
                >
                  <span className="text-white font-bold text-xl">{t('menu.start')}</span>
                </PixelButton>
                <PixelButton
                  imageUrl="/assets/btn_2.png"
                  onClick={() => setShowBuffPreview(true)}
                  width={220}
                  height={82.5}
                >
                  <span className="text-white font-bold text-lg">{t('menu.buffPreview')}</span>
                </PixelButton>
              </div>
            </div>
          )}

          {/* Buff 预览弹窗 */}
          {showBuffPreview && (
            <>
              <style>{bounceInAnimation}</style>
              <div
                className="absolute inset-0 z-50 flex items-center justify-center rounded-lg"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowBuffPreview(false);
                }}
              >
                <div
                  className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-2 border-gray-500 shadow-2xl p-8"
                  style={{ maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 关闭按钮 - 右上角 X */}
                  <button
                    onClick={() => setShowBuffPreview(false)}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-gray-700 hover:bg-red-600 border border-gray-500 hover:border-red-400 flex items-center justify-center cursor-pointer transition-all duration-200"
                    title={t('close')}
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  {/* 标题 */}
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    {t('specialBuffPreviewTitle')}
                  </h2>

                  {/* 通用 Buff 区域 */}
                  <h3 className="text-lg font-bold text-yellow-300 mb-4 border-b border-gray-600 pb-2">
                    {t('generalBuffLabel')}
                  </h3>
                  <div className="flex flex-wrap gap-4 justify-center mb-6">
                    {[
                      {
                        icon: '/assets/fire_buff.png',
                        name: t('buffIgniteName'),
                        desc: t('buffIgniteDesc'),
                      },
                      {
                        icon: '/assets/poison.png',
                        name: t('buffPoisonName'),
                        desc: t('buffPoisonDesc'),
                      },
                      {
                        icon: '/assets/aura.png',
                        name: t('buffAuraName'),
                        desc: t('buffAuraDesc'),
                      },
                      {
                        icon: '/assets/execution.png',
                        name: t('buffExecutionName'),
                        desc: t('buffExecutionDesc'),
                      },
                      {
                        icon: '/assets/critical_rage.png',
                        name: t('buffRageName'),
                        desc: t('buffRageDesc'),
                      },
                      {
                        icon: '/assets/ui/vampire.svg',
                        name: t('buffVampireName'),
                        desc: t('buffVampireDesc'),
                      },
                      {
                        icon: '/assets/ammo_supply.png',
                        name: t('buffAmmoSupplyName'),
                        desc: t('buffAmmoSupplyDesc'),
                      },
                      {
                        icon: '/assets/desperate_fight.png',
                        name: t('buffDesperateFightName'),
                        desc: t('buffDesperateFightDesc'),
                      },
                    ].map((buff, index) => (
                      <div
                        key={buff.name}
                        className="flex flex-col items-center"
                        style={{
                          backgroundImage: 'url(/assets/ui/upgrade-panel.svg)',
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          width: '200px',
                          height: '260px',
                          padding: '25px 20px 80px',
                          animation: `bounceIn 0.5s ease-out ${index * 50}ms both`,
                        }}
                      >
                        <img
                          src={buff.icon}
                          alt={buff.name}
                          style={{
                            width: '72px',
                            height: '72px',
                            imageRendering: 'pixelated',
                            objectFit: 'contain',
                          }}
                        />
                        <div
                          className="text-center w-full"
                          style={{ width: '85%', wordBreak: 'break-word', whiteSpace: 'normal' }}
                        >
                          <div className="font-bold text-white text-base">{buff.name}</div>
                          <div className="text-xs text-gray-300 mt-1 leading-tight">
                            {buff.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 武器专属 Buff 区域 */}
                  <h3 className="text-lg font-bold text-orange-300 mb-4 border-b border-gray-600 pb-2">
                    {t('weaponBuffLabel')}
                  </h3>

                  {/* 手枪 */}
                  <h4 className="text-sm font-bold text-gray-400 mb-3 ml-2">
                    🔫 {t('pistolName')}
                  </h4>
                  <div className="flex flex-wrap gap-4 justify-center mb-4">
                    <div
                      className="flex flex-col items-center"
                      style={{
                        backgroundImage: 'url(/assets/ui/upgrade-panel.svg)',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        width: '200px',
                        height: '260px',
                        padding: '25px 20px 80px',
                        animation: `bounceIn 0.5s ease-out ${8 * 50}ms both`,
                      }}
                    >
                      <img
                        src="/assets/pistol_show.png"
                        alt="最后一弹"
                        style={{
                          width: '72px',
                          height: '72px',
                          imageRendering: 'pixelated',
                          objectFit: 'contain',
                        }}
                      />
                      <div
                        className="text-center w-full"
                        style={{ width: '85%', wordBreak: 'break-word', whiteSpace: 'normal' }}
                      >
                        <div className="font-bold text-white text-base">
                          {t('buffLastBulletName')}
                        </div>
                        <div className="text-xs text-gray-300 mt-1 leading-tight">
                          {t('buffLastBulletDesc')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 火箭筒 */}
                  <h4 className="text-sm font-bold text-gray-400 mb-3 ml-2">
                    🚀 {t('rocketName')}
                  </h4>
                  <div className="flex flex-wrap gap-4 justify-center mb-4">
                    {[
                      {
                        icon: '/assets/RPG_show.png',
                        name: '冲击波',
                        desc: '爆炸伤害后，未死亡敌人从爆炸中心向反方向击退30px，并在1.5秒内减速70%。',
                      },
                      {
                        icon: '/assets/RPG_show.png',
                        name: '穿甲弹',
                        desc: '爆炸伤害+200%，但爆炸范围-80%。',
                      },
                      {
                        icon: '/assets/RPG_show.png',
                        name: '两联装',
                        desc: '弹夹变为2发，0.7秒内连续发射两发。每发伤害60%、范围70%、美术资源60%。',
                      },
                    ].map((buff, index) => (
                      <div
                        key={buff.name}
                        className="flex flex-col items-center"
                        style={{
                          backgroundImage: 'url(/assets/ui/upgrade-panel.svg)',
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          width: '200px',
                          height: '260px',
                          padding: '25px 20px 80px',
                          animation: `bounceIn 0.5s ease-out ${(9 + index) * 50}ms both`,
                        }}
                      >
                        <img
                          src={buff.icon}
                          alt={buff.name}
                          style={{
                            width: '72px',
                            height: '72px',
                            imageRendering: 'pixelated',
                            objectFit: 'contain',
                          }}
                        />
                        <div
                          className="text-center w-full"
                          style={{ width: '85%', wordBreak: 'break-word', whiteSpace: 'normal' }}
                        >
                          <div className="font-bold text-white text-base">{buff.name}</div>
                          <div className="text-xs text-gray-300 mt-1 leading-tight">
                            {buff.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 武器选择界面 */}
          {view.gameState === 'weaponSelect' && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-lg"
              style={{
                backgroundImage: 'url(/assets/bg.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div className="absolute inset-0 bg-black/60"></div>
              <div className="relative z-10 text-center">
                <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                  {t('weaponSelectTitle')}
                </h2>
                <p className="text-gray-300 mb-8 drop-shadow-md">{t('weaponSelectHint')}</p>

                <div className="flex gap-4 justify-center flex-wrap max-w-4xl">
                  {(Object.keys(WEAPONS) as WeaponType[])
                    .filter((w) => WEAPONS[w].isStarter)
                    .map((w) => {
                      const meta = STARTER_WEAPON_META[w];
                      const cfg = WEAPONS[w];
                      return (
                        <div
                          key={w}
                          className={`bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-lg p-4 cursor-pointer hover:from-gray-700/90 hover:to-gray-800/90 transition-all duration-200 border-2 ${meta.border} w-44`}
                          onClick={() => startGameWithWeapon(w)}
                        >
                          <div className="flex flex-col items-center">
                            <img
                              src={cfg.showIcon}
                              alt={cfg.name}
                              className="w-24 h-24 object-contain mb-2"
                            />
                            <h3 className={`text-lg font-bold ${meta.title} mb-1`}>{cfg.name}</h3>
                            <p className="text-xs text-gray-300 mb-2">{cfg.description}</p>
                            <div className="text-xs text-left w-full space-y-1">
                              {meta.stats.map((s, i) => (
                                <p
                                  key={i}
                                  className={
                                    s.includes('%/') ||
                                    s.includes('移动') ||
                                    s.includes('穿透') ||
                                    s.includes('暴击')
                                      ? 'text-green-400'
                                      : 'text-gray-400'
                                  }
                                >
                                  {s}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <button
                  className="mt-8 px-6 py-2 bg-gray-700/80 hover:bg-gray-600/80 text-gray-300 rounded-lg transition-colors"
                  onClick={() => setGameState('menu')}
                >
                  返回菜单
                </button>
              </div>
            </div>
          )}

          {/* 升级界面 */}
          {view.gameState === 'upgrade' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              {/* 注入弹跳动画样式 */}
              <style>{bounceInAnimation}</style>
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-2">{t('levelComplete')}</h2>
                <p className="text-gray-300 mb-6">{t('chooseUpgrade')}</p>
                <div className="flex gap-4 justify-center">
                  {view.availableUpgrades.map((upgrade, index) => {
                    // 弹跳顺序：中、左、右
                    // 索引映射：0->左, 1->中, 2->右
                    // 延迟：中(0ms), 左(75ms), 右(150ms)
                    const delays = [75, 0, 150]; // 对应索引的延迟
                    const animationDelay = delays[index] || 0;

                    return (
                      <UpgradeCard
                        key={upgrade.id}
                        icon={upgrade.icon}
                        name={upgrade.name}
                        description={upgrade.description}
                        upgradeType={upgrade.id}
                        animationDelay={animationDelay}
                        onClick={() => applyUpgrade(upgrade.id)}
                      />
                    );
                  })}
                </div>
                <div className="flex gap-4 justify-center mt-8">
                  <PixelButton
                    imageUrl="/assets/btn_2.png"
                    onClick={refreshUpgrades}
                    disabled={view.upgradeRefreshCount >= 1}
                    width={220}
                    height={82.5}
                  >
                    <span className="text-gray-700 font-bold text-xl flex items-center justify-center gap-2">
                      {t('refresh')}: {1 - view.upgradeRefreshCount}
                    </span>
                  </PixelButton>
                </div>
              </div>
            </div>
          )}

          {/* 商店界面 */}
          {view.gameState === 'shop' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/64 rounded-lg">
              {/* 注入弹跳动画样式 */}
              <style>{bounceInAnimation}</style>
              <div className="text-center p-8 max-w-4xl">
                <h2 className="text-4xl font-bold text-white mb-2">{t('shopTitle')}</h2>
                <p className="text-gray-300 mb-4 flex items-center justify-center gap-2">
                  <CoinIcon size={24} />
                  {t('gold')}: <span className="text-yellow-400 font-bold">{view.player.gold}</span>
                </p>

                <div className="flex gap-4 justify-center mb-8">
                  {view.shopItems.map((item, index) => {
                    // 检查该商品类型是否被锁定
                    const isItemLocked = view.lockedItems.some(
                      (locked) => locked.type === item.type
                    );
                    // 弹跳顺序：中、左、右
                    // 延迟：中(0ms), 左(75ms), 右(150ms)
                    const delays = [75, 0, 150]; // 对应索引的延迟
                    const animDelay = delays[index] || 0;
                    return (
                      <ShopItemCard
                        key={item.id}
                        icon={item.icon}
                        name={item.name}
                        description={item.description}
                        price={item.price}
                        canAfford={view.player.gold >= item.price}
                        isLocked={isItemLocked}
                        itemType={item.type}
                        animationDelay={animDelay}
                        onClick={() => buyShopItem(item)}
                      />
                    );
                  })}
                </div>

                <div className="flex gap-4 justify-center flex-wrap">
                  <PixelButton
                    imageUrl="/assets/btn_2.png"
                    onClick={toggleLockItems}
                    width={150}
                    height={82.5}
                  >
                    <span className="text-gray-700 font-bold text-xl flex items-center justify-center gap-2">
                      {view.lockedItems.length > 0 ? (
                        <>
                          <img src="/assets/ui/lock.svg" alt="解锁" className="w-6 h-6" />
                          解锁
                        </>
                      ) : (
                        <>
                          <img src="/assets/ui/lock.svg" alt="锁定" className="w-6 h-6" />
                          锁定
                        </>
                      )}
                    </span>
                  </PixelButton>
                  <PixelButton
                    imageUrl="/assets/btn_2.png"
                    onClick={refreshShop}
                    width={220}
                    height={82.5}
                    disabled={view.player.gold < view.shopRefreshPrice} // 仅金币不足时禁用
                  >
                    <span className="text-gray-700 font-bold text-xl flex items-center justify-center gap-2">
                      🔄 刷新
                      {view.player.gold >= view.shopRefreshPrice ? (
                        <>
                          <CoinIcon size={20} /> {view.shopRefreshPrice}
                        </>
                      ) : (
                        <span className="opacity-50">
                          <CoinIcon size={20} /> {view.shopRefreshPrice}
                        </span>
                      )}
                    </span>
                  </PixelButton>
                  <PixelButton
                    imageUrl="/assets/btn_2.png"
                    onClick={exitShop}
                    width={220}
                    height={82.5}
                  >
                    <span className="text-gray-700 font-bold text-xl">{t('exitShop')}</span>
                  </PixelButton>
                </div>
              </div>
            </div>
          )}

          {/* 游戏结束界面 */}
          {view.gameState === 'gameover' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center">
                <h2 className="text-5xl font-bold text-red-500 mb-4">{t('gameOver')}</h2>
                <p className="text-gray-300 mb-2">
                  {t('finalLevel')}: {view.level}
                </p>
                <p className="text-gray-300 mb-8">
                  {t('finalScore')}: {view.score}
                </p>
                <div className="flex gap-4 justify-center">
                  <PixelButton
                    imageUrl="/assets/btn_main.png"
                    onClick={restartGame}
                    width={220}
                    height={82.5}
                  >
                    <span className="text-white font-bold text-xl">{t('restart')}</span>
                  </PixelButton>
                  <PixelButton
                    imageUrl="/assets/btn_2.png"
                    onClick={() => setGameState('menu')}
                    width={220}
                    height={82.5}
                  >
                    <span className="text-gray-700 font-bold text-xl">{t('backToMenu')}</span>
                  </PixelButton>
                </div>
              </div>
            </div>
          )}

          {/* BOSS血条 */}
          {view.gameState === 'playing' && view.bossAlive && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 rounded-lg p-4 min-w-[300px] border-2 border-red-600">
              <div className="text-center">
                <div className="text-red-500 font-bold text-lg mb-2 flex items-center justify-center gap-2">
                  👹 史莱姆王
                  <span className="text-sm text-gray-300">Lv.{view.level}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-300 ease-out"
                    style={{ width: `${(view.bossCurrentHp / view.bossMaxHp) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                    {Math.round(view.bossCurrentHp)} / {view.bossMaxHp}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 设置弹窗 */}
          {showSettings && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowSettings(false);
              }}
            >
              <div
                className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-2 border-gray-500 shadow-2xl p-8 w-96"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 关闭按钮 - 右上角 X */}
                <button
                  onClick={() => setShowSettings(false)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-700 hover:bg-red-600 border border-gray-500 hover:border-red-400 flex items-center justify-center cursor-pointer transition-all duration-200"
                  title={t('close')}
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* 标题 */}
                <h2 className="text-2xl font-bold text-white mb-6 text-center">{t('settings')}</h2>

                {/* 音量调节 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-gray-300 text-base font-medium flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        />
                      </svg>
                      {t('soundVolume')}
                    </label>
                    <span className="text-white font-bold min-w-[48px] text-right">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>

                  {/* 滑动条 */}
                  <div className="relative w-full h-10 flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(volume * 100)}
                      onChange={(e) => {
                        const newVolume = parseInt(e.target.value) / 100;
                        setVolume(newVolume);
                      }}
                      onMouseUp={() => playSound('button_click')}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-6
                        [&::-webkit-slider-thumb]:h-6
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-yellow-400
                        [&::-webkit-slider-thumb]:border-2
                        [&::-webkit-slider-thumb]:border-yellow-300
                        [&::-webkit-slider-thumb]:cursor-grab
                        [&::-webkit-slider-thumb]:active:cursor-grabbing
                        [&::-webkit-slider-thumb]:shadow-lg
                        [&::-moz-range-thumb]:w-6
                        [&::-moz-range-thumb]:h-6
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-yellow-400
                        [&::-moz-range-thumb]:border-2
                        [&::-moz-range-thumb]:border-yellow-300
                        [&::-moz-range-thumb]:cursor-grab
                      "
                      style={{
                        background: `linear-gradient(to right, #facc15 0%, #facc15 ${volume * 100}%, #4b5563 ${volume * 100}%, #4b5563 100%)`,
                      }}
                    />
                  </div>

                  {/* 音量刻度提示 */}
                  <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                    <span>{t('mute')}</span>
                    <span>{t('max')}</span>
                  </div>
                </div>

                {/* 语言切换 */}
                <div className="flex justify-center items-center gap-3 mb-6">
                  <span className="text-gray-400 text-sm font-medium">{t('language')}</span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-600">
                    <button
                      onClick={() => {
                        setLanguage('zh');
                        playSound('button_click');
                      }}
                      className={`px-4 py-1.5 text-sm font-bold transition-all ${language === 'zh' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      中文
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('en');
                        playSound('button_click');
                      }}
                      className={`px-4 py-1.5 text-sm font-bold transition-all ${language === 'en' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* 静音快捷按钮 */}
                <div className="flex justify-center mt-6 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      toggleMute();
                      setTimeout(() => playSound('button_click'), 50);
                    }}
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                      isMuted
                        ? 'bg-red-600/80 hover:bg-red-500 text-white border border-red-400'
                        : 'bg-green-600/80 hover:bg-green-500 text-white border border-green-400'
                    }`}
                  >
                    {isMuted ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                          />
                        </svg>
                        {t('clickUnmute')}
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                          />
                        </svg>
                        {t('clickMute')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
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
