import { useCallback, useEffect, useState } from 'react';
import { ASSET_PATHS } from '@/game/assets/manifest';
import { loadImageAsset, type AssetSpec } from '@/game/assets/loader';

/**
 * 单张图片资源表：key 见下方 resources 列表（如 assets.coin / assets.playerIdle）。
 * 障碍物与地块不进此表，分别进 obstacleImages / tileImages。
 */
export type GameAssets = Record<string, HTMLImageElement>;

export interface GameAssetsState {
  assets: GameAssets;
  tileImages: HTMLImageElement[];
  /** 以图片 src 为键（generateObstacles 按 imagePath 索引，勿改回数字下标） */
  obstacleImages: Record<string, HTMLImageElement>;
  resourceErrors: string[];
  isLoading: boolean;
  loadProgress: number;
  /** 资源加载失败后重试（加载失败列表与 isLoading 由重载结果决定） */
  retryLoad: () => void;
}

/**
 * 资源装配：并发加载全部美术素材，汇总为单张资源表 + 地块/障碍分组。
 * required:false 的地块允许部分失败并回退纯色；其余资源失败才决定 isLoading。
 */
export function useGameAssets(): GameAssetsState {
  const [assets, setAssets] = useState<GameAssets>({});
  const [resourceErrors, setResourceErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true); // 资源是否加载完成
  const [loadProgress, setLoadProgress] = useState(0); // 加载进度 0-100

  // 障碍物图片
  const [obstacleImages, setObstacleImages] = useState<Record<string, HTMLImageElement>>({});

  // 地块图片（用于地图地面平铺）
  const [tileImages, setTileImages] = useState<HTMLImageElement[]>([]);

  // 图片加载版本号，用于强制重新加载图片
  const [imageVersion, setImageVersion] = useState(15); // 从15开始，确保重新加载

  const retryLoad = useCallback(() => setImageVersion((prev) => prev + 1), []);

  // 加载所有游戏美术素材
  useEffect(() => {
    // 定义所有需要加载的资源
    const resources: AssetSpec[] = [
      // 金币图片
      { key: 'coin', src: ASSET_PATHS.coin },
      // 子弹图片
      { key: 'bullet', src: ASSET_PATHS.bullet },
      // 烟雾图片
      { key: 'smoke', src: ASSET_PATHS.smoke },
      // 枪械图片
      { key: 'pistol', src: ASSET_PATHS.pistol },
      { key: 'shotgun', src: ASSET_PATHS.shotgun },
      { key: 'smg', src: ASSET_PATHS.smg },
      { key: 'sniper', src: ASSET_PATHS.sniper },
      // 枪火精灵表
      { key: 'fire', src: ASSET_PATHS.fire },
      // BOSS精灵表
      { key: 'boss', src: ASSET_PATHS.boss },
      { key: 'boss2', src: ASSET_PATHS.boss2 },
      // BOSS火球序列帧
      { key: 'bossFireBall', src: ASSET_PATHS.bossFireBall },
      // 锁定范围图标
      { key: 'range', src: ASSET_PATHS.range },
      // 敌人精灵表
      { key: 'enemy_1', src: ASSET_PATHS.enemy_1 },
      { key: 'enemy_2', src: ASSET_PATHS.enemy_2 },
      { key: 'enemy_3', src: ASSET_PATHS.enemy_3 },
      { key: 'enemy_4_1', src: ASSET_PATHS.enemy_4_1 },
      { key: 'enemy_4_2', src: ASSET_PATHS.enemy_4_2 },
      // 箭头指示器图片
      { key: 'arrow', src: ASSET_PATHS.arrow },
      // 暂停按钮图片
      { key: 'pause', src: ASSET_PATHS.pause },
      // 宝箱图片
      { key: 'chest', src: ASSET_PATHS.chest },
      // 子弹图片（敌人子弹）
      { key: 'ball', src: ASSET_PATHS.ball },
      // 火箭筒战斗图片
      { key: 'rpg', src: ASSET_PATHS.rpg },
      // 爆炸序列帧图片
      { key: 'boom', src: ASSET_PATHS.boom },
      // 血量格子图片
      { key: 'hpGreen', src: ASSET_PATHS.hpGreen },
      { key: 'hpYellow', src: ASSET_PATHS.hpYellow },
      { key: 'hpRed', src: ASSET_PATHS.hpRed },
      // 血量条底图
      { key: 'hpBar', src: ASSET_PATHS.hpBar },
      // 武器属性加成箱
      { key: 'weaponUpgradeBox', src: ASSET_PATHS.weaponUpgradeBox },
      // 治疗瓶
      { key: 'healthPotion', src: ASSET_PATHS.healthPotion },
      // 障碍物图片
      { key: 'obstacle_1', src: ASSET_PATHS.obstacle_1, type: 'obstacle' },
      { key: 'obstacle_2', src: ASSET_PATHS.obstacle_2, type: 'obstacle' },
      { key: 'obstacle_3', src: ASSET_PATHS.obstacle_3, type: 'obstacle' },
      { key: 'obstacle_4', src: ASSET_PATHS.obstacle_4, type: 'obstacle' },
      { key: 'obstacle_5', src: ASSET_PATHS.obstacle_5, type: 'obstacle' },
      // 火箭弹图片
      { key: 'rocket', src: ASSET_PATHS.rocket },
      // 玩家图片
      { key: 'playerIdle', src: ASSET_PATHS.playerIdle },
      { key: 'playerWalk', src: ASSET_PATHS.playerWalk },
      { key: 'playerDash', src: ASSET_PATHS.playerDash },
      { key: 'skillIcon', src: ASSET_PATHS.skillIcon },
      // 地块图片
      { key: 'tile1', src: ASSET_PATHS.tile1, type: 'tile', required: false },
      { key: 'tile2', src: ASSET_PATHS.tile2, type: 'tile', required: false },
      { key: 'tile3', src: ASSET_PATHS.tile3, type: 'tile', required: false },
      { key: 'tile4', src: ASSET_PATHS.tile4, type: 'tile', required: false },
      { key: 'tile5', src: ASSET_PATHS.tile5, type: 'tile', required: false },
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
          }
          return { resource, result };
        })
      );
      if (controller.signal.aborted) return;
      const loadedAssets: GameAssets = {};
      const byPath: Record<string, HTMLImageElement> = {};
      const loadedTiles: HTMLImageElement[] = [];
      const failed: string[] = [];
      for (const { resource, result } of results) {
        if (result.status === 'loaded' && resource.type === 'obstacle') {
          byPath[resource.src] = result.image;
        } else if (result.status === 'loaded' && resource.type === 'tile') {
          loadedTiles.push(result.image);
        } else if (result.status === 'loaded') {
          loadedAssets[resource.key] = result.image;
        }
        if (result.status === 'failed' && resource.required !== false) failed.push(resource.key);
      }
      setAssets(loadedAssets);
      setObstacleImages(byPath);
      setResourceErrors(failed);
      setIsLoading(failed.length > 0);
      // Promise.all 保留声明顺序；部分缺图时仍使用可用地块，全部失败则回退纯色。
      setTileImages(loadedTiles);
    };
    void load();
    return () => controller.abort();
  }, [imageVersion]);

  // 延迟更新图片版本，强制重新加载图片
  useEffect(() => {
    const timer = setTimeout(() => {
      setImageVersion((prev) => prev + 1);
    }, 1000); // 1秒后更新版本号

    return () => clearTimeout(timer);
  }, []);

  return { assets, tileImages, obstacleImages, resourceErrors, isLoading, loadProgress, retryLoad };
}
