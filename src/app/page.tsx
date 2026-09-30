'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSound } from '@/hooks/useSound';
import * as GameTypes from '@/types';
import { Language, translate, loadLanguage, LOCALE_STORAGE_KEY } from '@/i18n';

// 金币图标组件
interface CoinIconProps {
  size?: number;
  className?: string;
}

const CoinIcon: React.FC<CoinIconProps> = ({ size = 24, className = '' }) => {
  return (
    <img
      src="/assets/coin.png"
      alt="金币"
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

// 升级卡片组件
interface UpgradeCardProps {
  icon: string;
  name: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  upgradeType?: string;  // 升级类型（用于判断是否为特殊奖励）
  animationDelay?: number;  // 动画延迟（毫秒）
}

// 弹跳动画关键帧（内联样式）
const bounceInAnimation = `
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3) translateY(-100px);
    }
    50% {
      opacity: 1;
      transform: scale(1.1) translateY(10px);
    }
    70% {
      transform: scale(0.95) translateY(-5px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const UpgradeCard: React.FC<UpgradeCardProps> = ({
  icon,
  name,
  description,
  onClick,
  disabled = false,
  upgradeType,
  animationDelay = 0,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // 判断 icon 是否是图片路径
  const isImageIcon = icon.startsWith('/') || icon.startsWith('http');
  
  // 判断是否为特殊奖励
  const isSpecial = upgradeType ? isSpecialReward(upgradeType) : false;

  return (
    <div
      ref={cardRef}
      className="flex flex-col items-center gap-2 cursor-pointer select-none transition-all relative"
      style={{
        backgroundImage: `url(/assets/win_1.png)`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '220px',
        height: '280px',
        padding: '30px 30px 100px', // 统一padding
        opacity: isHovering && !disabled ? 0.9 : 1,
        transform: isHovering && !disabled ? 'scale(1.05)' : 'scale(1)',
        animation: `bounceIn 0.6s ease-out ${animationDelay}ms both`,
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={disabled ? undefined : onClick}
    >
      {isImageIcon ? (
        <img 
          src={icon} 
          alt={name}
          style={{
            width: '96px',  // 放大20%：80px * 1.2
            height: '96px',  // 放大20%：80px * 1.2
            imageRendering: 'pixelated',
            objectFit: 'contain'
          }}
        />
      ) : (
        <span 
          style={{
            fontSize: '80px',
            lineHeight: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </span>
      )}
      <div 
        className="text-center w-full" 
        style={{ 
          width: '80%', // 宽度改为原来的80%
          wordBreak: 'break-word', // 允许换行
          whiteSpace: 'normal', // 正常换行
        }}
      >
        <div className="font-bold text-white text-lg">{name}</div>
        <div className="text-sm text-white mt-1">{description}</div>
      </div>
      
      {/* 特殊奖励悬停提示 */}
      {isSpecial && upgradeType && (
        <SpecialRewardTooltip 
          type={upgradeType as SpecialRewardType} 
          visible={isHovering} 
        />
      )}
    </div>
  );
};

// 商店商品卡片组件
interface ShopItemCardProps {
  icon: string;
  name: string;
  description: string;
  price: number;
  canAfford: boolean;
  isLocked?: boolean;  // 是否被锁定
  itemType?: string;  // 商品类型（用于判断是否为特殊奖励）
  onClick: () => void;
  animationDelay?: number;  // 动画延迟（毫秒）
}

const ShopItemCard: React.FC<ShopItemCardProps> = ({
  icon,
  name,
  description,
  price,
  canAfford,
  isLocked = false,
  itemType,
  onClick,
  animationDelay = 0,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  
  // 判断是否为特殊奖励
  const isSpecial = itemType ? isSpecialReward(itemType) : false;

  return (
    <div
      ref={cardRef}
      className="flex flex-col items-center cursor-pointer select-none transition-all relative"
      style={{
        backgroundImage: `url(/assets/shop_win_3.png)`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '288px',  // 240 * 1.2 = 288，放大20%
        height: '360px',  // 300 * 1.2 = 360，放大20%
        padding: '20px 25px',  // 减少padding，使内容更紧凑
        opacity: isHovering && !canAfford ? 0.9 : 1,
        transform: isHovering && !canAfford ? 'scale(1.05)' : 'scale(1)',
        animation: `bounceIn 0.6s ease-out ${animationDelay}ms both`,
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={canAfford ? onClick : undefined}
    >
      {/* 锁定图标 */}
      {isLocked && (
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <img src="/assets/suo.png" alt="已锁定" style={{ width: '40px', height: '40px' }} />
        </div>
      )}
      {/* 图标区域 - 占据中间80%的上部 */}
      <div style={{ height: '40px' }}></div>
      {/* 判断 icon 是否为图片路径 */}
      {icon.startsWith('/') ? (
        <img 
          src={icon} 
          alt={name}
          style={{ width: '130px', height: '130px', objectFit: 'contain', marginTop: '60px' }}  // 放大20%：108px * 1.2
        />
      ) : (
        <span className="text-5xl">{icon}</span>  // 增大字体
      )}
      <div className="text-center w-full mt-3" style={{ marginTop: '6px' }}>
        <div className="font-bold text-white text-lg">{name}</div>
        <div className="text-sm text-white mt-1" style={{ marginTop: '2px' }}>{description}</div>
        <div 
          className={`text-xl font-bold flex items-center justify-center gap-2 ${canAfford ? 'text-green-400' : 'text-red-400'}`} 
          style={{ marginTop: '16px' }}
        >
          <CoinIcon size={24} />
          {price}
        </div>
      </div>
      
      {/* 特殊奖励悬停提示 */}
      {isSpecial && itemType && (
        <SpecialRewardTooltip 
          type={itemType as SpecialRewardType} 
          visible={isHovering} 
        />
      )}
    </div>
  );
};

// 特殊奖励悬停提示组件
interface SpecialRewardTooltipProps {
  type: SpecialRewardType;
  visible: boolean;
}

const SpecialRewardTooltip: React.FC<SpecialRewardTooltipProps> = ({ type, visible }) => {
  if (!visible) return null;
  
  const info = getSpecialRewardDescription(type);
  if (!info.title) return null;
  
  return (
    <div 
      className="absolute z-50 bg-gray-900/95 border-2 border-yellow-500 rounded-lg p-4 shadow-xl"
      style={{
        minWidth: '280px',
        maxWidth: '320px',
        left: '50%',
        bottom: '100%',
        transform: 'translateX(-50%) translateY(-10px)',
        pointerEvents: 'none',
      }}
    >
      {/* 标题 */}
      <div className="text-yellow-400 font-bold text-lg mb-2 flex items-center gap-2">
        <span>⭐</span>
        <span>{info.title}</span>
      </div>
      
      {/* 描述 */}
      <div className="text-gray-200 text-sm leading-relaxed mb-2">
        {info.description}
      </div>
      
      {/* 属性数据（如果有） */}
      {info.stats && info.stats.length > 0 && (
        <div className="border-t border-gray-700 pt-2 mt-2">
          {info.stats.map((stat, index) => (
            <div key={index} className="text-cyan-300 text-sm">
              {stat}
            </div>
          ))}
        </div>
      )}
      
      {/* 小三角箭头 */}
      <div 
        className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '10px solid #EAB308',
        }}
      />
    </div>
  );
};

// 像素按钮组件：基于PNG透明度检测点击区域
interface PixelButtonProps {
  imageUrl: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  width?: number;
  height?: number;
  disabled?: boolean;
}

const PixelButton: React.FC<PixelButtonProps> = ({
  imageUrl,
  onClick,
  children,
  className = '',
  width = 220,
  height = 82.5, // 保持400x150的比例：220 * (150/400) = 82.5
  disabled = false,
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [canClick, setCanClick] = useState(false);

  // 加载图片并创建canvas用于透明度检测
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvasRef.current = canvas;
        setImageLoaded(true);
      }
    };
  }, [imageUrl]);

  // 检测鼠标位置是否在非透明区域
  const checkHitTest = useCallback((clientX: number, clientY: number): boolean => {
    if (!buttonRef.current || !canvasRef.current) return false;

    const rect = buttonRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 映射到原始图片坐标
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const imgX = Math.floor(x * scaleX);
    const imgY = Math.floor(y * scaleY);

    // 检查像素透明度
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
      // alpha通道大于30（约12%不透明度）才认为可点击
      return pixel[3] > 30;
    }

    return false;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageLoaded) return;

    const hit = checkHitTest(e.clientX, e.clientY);
    setCanClick(hit);
    setIsHovering(hit);

    // 更新鼠标样式
    if (buttonRef.current) {
      buttonRef.current.style.cursor = hit ? 'pointer' : 'default';
    }
  }, [imageLoaded, checkHitTest]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setCanClick(false);
    if (buttonRef.current) {
      buttonRef.current.style.cursor = 'default';
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (canClick && !disabled) {
      onClick();
    }
  }, [canClick, onClick, disabled]);

  return (
    <div
      ref={buttonRef}
      className={`flex items-center justify-center bg-transparent select-none transition-opacity ${className}`}
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: `${width}px`,
        height: `${height}px`,
        opacity: disabled ? 0.5 : (isHovering && !disabled ? 0.8 : 1),
        cursor: disabled ? 'not-allowed' : 'default',
      }}
      onMouseMove={disabled ? undefined : handleMouseMove}
      onMouseLeave={disabled ? undefined : handleMouseLeave}
      onClick={disabled ? undefined : handleClick}
    >
      {children}
    </div>
  );
};

// 辅助函数：检测线段与矩形是否相交
const lineRectIntersect = (
  x1: number, y1: number, x2: number, y2: number,
  rect: Obstacle
): boolean => {
  // 检查线段是否与矩形的四条边相交
  const checkLineIntersection = (
    x3: number, y3: number, x4: number, y4: number
  ): boolean => {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
    
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  };
  
  return (
    checkLineIntersection(rect.x, rect.y, rect.x + rect.width, rect.y) ||
    checkLineIntersection(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height) ||
    checkLineIntersection(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height) ||
    checkLineIntersection(rect.x, rect.y + rect.height, rect.x, rect.y)
  );
};

// 检测圆形与障碍物的碰撞
const checkCollisionWithObstacle = (
  x: number, y: number,
  radius: number,
  obstacle: Obstacle
): boolean => {
  // 计算障碍物的碰撞盒中心
  const obstacleCenterX = obstacle.x + obstacle.width / 2;
  const obstacleCenterY = obstacle.y + obstacle.height / 2;
  
  // 计算碰撞盒的半宽半高
  const halfCollisionWidth = obstacle.collisionWidth / 2;
  const halfCollisionHeight = obstacle.collisionHeight / 2;
  
  // 找到矩形上距离圆心最近的点
  const closestX = Math.max(obstacleCenterX - halfCollisionWidth, Math.min(x, obstacleCenterX + halfCollisionWidth));
  const closestY = Math.max(obstacleCenterY - halfCollisionHeight, Math.min(y, obstacleCenterY + halfCollisionHeight));
  
  // 计算圆心到最近点的距离
  const dx = x - closestX;
  const dy = y - closestY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // 如果距离小于圆的半径，则发生碰撞
  return distance < radius;
};

// 计算点到障碍物的距离（用于避障）
const distToObstacle = (
  x: number, y: number,
  obstacle: Obstacle
): number => {
  // 计算障碍物的碰撞盒中心
  const obstacleCenterX = obstacle.x + obstacle.width / 2;
  const obstacleCenterY = obstacle.y + obstacle.height / 2;
  
  // 计算碰撞盒的半宽半高
  const halfCollisionWidth = obstacle.collisionWidth / 2;
  const halfCollisionHeight = obstacle.collisionHeight / 2;
  
  // 找到矩形上距离点最近的点
  const closestX = Math.max(obstacleCenterX - halfCollisionWidth, Math.min(x, obstacleCenterX + halfCollisionWidth));
  const closestY = Math.max(obstacleCenterY - halfCollisionHeight, Math.min(y, obstacleCenterY + halfCollisionHeight));
  
  // 计算点到最近点的距离
  const dx = x - closestX;
  const dy = y - closestY;
  
  return Math.sqrt(dx * dx + dy * dy);
};

// 游戏配置
const GAME_CONFIG = {
  WORLD_WIDTH: 6000,  // 世界宽度（200%扩大）
  WORLD_HEIGHT: 6000, // 世界高度（200%扩大）
  CANVAS_WIDTH: 1200,  // 视口宽度
  CANVAS_HEIGHT: 800,  // 视口高度
  PLAYER_SPEED: 3.5,  // 基础速度降低到70%
  PLAYER_SIZE: 25,
  PLAYER_MAX_HP: 20,
  BULLET_SPEED: 7,  // 子弹速度降低到70%
  BULLET_SIZE: 5,
  MONSTER_SIZE: 20,
  OBSTACLE_COUNT: 24,  // 障碍物数量（增加20%）
  OBSTACLE_MIN_SIZE: 60,
  OBSTACLE_MAX_SIZE: 150,
  OBSTACLE_AVOID_DISTANCE: 120, // 障碍物避障检测距离（增加前瞻距离）
  OBSTACLE_AVOID_FORCE: 4, // 障碍物避障力强度
  MIN_PASSAGE_WIDTH: 50, // 最小通道宽度（大于怪物大小 20）
  HIT_EFFECT_DURATION: 200, // 受击效果持续时间（毫秒）
  HIT_SLOWDOWN_FACTOR: 0.5, // 受击时减速因子（0.5 表示速度减半）
  COIN_PICKUP_RANGE: 80, // 初始金币拾取范围（像素）
  COIN_PICKUP_RANGE_MAX_BONUS: 500, // 金币拾取范围最大加成（初始范围的500%）
  MAX_POISON_CIRCLES: 5, // 场上最大毒圈数量
  // 能量气场配置
  ENERGY_AURA_BASE_RADIUS: 90, // 能量气场初始半径（直径180px）
  ENERGY_AURA_SHOCKWAVE_INTERVAL: 3000, // 冲击波发射间隔（毫秒）
  ENERGY_AURA_KNOCKBACK_DISTANCE: 30, // 击退距离（像素）
  ENERGY_AURA_SLOWDOWN_DURATION: 1500, // 减速持续时间（毫秒）
  ENERGY_AURA_SLOWDOWN_FACTOR: 0.5, // 减速因子（50%减速）
};

// 计算有效暴击率（带软上限）
// 软上限机制：70%以下100%收益，70%以上超出部分50%收益，硬上限90%
const getEffectiveCritRate = (baseCritRate: number, critRateBonus: number): number => {
  // 注意：critRateBonus 为百分比整数（如 4 表示 +4%），需除以 100 转成小数再与 baseCritRate 相加
  const critRaw = baseCritRate + critRateBonus / 100;
  let critEff: number;
  
  if (critRaw <= 0.7) {
    // 70%以下：100%收益
    critEff = critRaw;
  } else if (critRaw <= 1.1) {
    // 70%-110%：超出部分50%收益
    critEff = 0.7 + (critRaw - 0.7) * 0.5;
  } else {
    // 110%以上：硬上限90%
    critEff = 0.9;
  }
  
  return Math.min(1.0, critEff);
};

// 获取有效暴击伤害加成（带软上限）
// baseCritDamage: 基础暴击伤害（1.5表示150%）
// critDamageBonus: 暴击伤害加成（原始百分比，如100表示100%）
const getEffectiveCritDamageBonus = (baseCritDamage: number, critDamageBonus: number): number => {
  // 软上限机制：额外加成 ≤ 150%：100%收益，超出部分50%收益
  let effectiveBonus: number;
  
  if (critDamageBonus <= 150) {
    // 150%以下：100%收益
    effectiveBonus = critDamageBonus;
  } else {
    // 150%以上：超出部分50%收益
    effectiveBonus = 150 + (critDamageBonus - 150) * 0.5;
  }
  
  // 返回有效暴击伤害（基础值 + 有效加成）
  return baseCritDamage + effectiveBonus / 100;
};

// 检测是否处于狂暴状态（险中取胜buff）
const isDesperateFightActive = (player: Player): boolean => {
  if (player.desperateFightLevel <= 0) return false;
  return player.hp < player.maxHp * 0.2;
};

// 武器类型定义
type WeaponType = 'pistol' | 'shotgun' | 'sniper' | 'smg' | 'rpg';

interface WeaponConfig {
  id: WeaponType;
  name: string;
  description: string;
  icon: string;
  showIcon: string; // 商店和升级界面使用的高清展示图
  damage: number;
  fireRate: number;
  bulletSize: number;
  bulletSpeed: number;
  bulletRange: number;
  bulletsPerShot: number;
  spreadAngle: number;
  color: string;
  critRate: number; // 暴击率（0-1）
  magazineSize: number; // 弹匣最大容量
  reloadTime: number; // 换弹时间（毫秒）
  isLongGun: boolean; // 是否是长枪（影响旋转半径）
  isStarter: boolean; // 是否为可选初始武器（1=是，0=否），非初始武器只能战斗中获取
  playerSpeedBonus?: number; // 装备该武器时的移动速度加成（可选）
  playerSpeedMultiplier?: number; // 装备该武器时的移动速度倍率（可选，默认1.0）
}

// 辅助函数：计算实际换弹时间（双曲线递减）
// reload = max(250ms, base_reload / (1 + 0.01 × reloadSpeed%))
const getEffectiveReloadTime = (weapon: WeaponConfig, reloadSpeedBonus: number): number => {
  const baseReload = weapon.reloadTime;
  const speedMultiplier = 1 + reloadSpeedBonus / 100;
  const calculatedReload = baseReload / speedMultiplier;
  return Math.floor(Math.max(250, calculatedReload));
};

// 武器配置
const WEAPONS: Record<WeaponType, WeaponConfig> = {
  pistol: {
    id: 'pistol',
    name: '手枪',
    description: '标准武器，平衡性良好',
    icon: '/assets/pistol.png',
    showIcon: '/assets/pistol_show.png',
    damage: 5,
    fireRate: 300,
    bulletSize: 5,
    bulletSpeed: 2.5,  // 子弹速度
    bulletRange: 800,
    bulletsPerShot: 1,
    spreadAngle: 0,
    color: '#ffcc00',
    critRate: 0, // 0%暴击率（玩家初始暴击率为0%）
    magazineSize: 12, // 弹匣容量
    reloadTime: 3000, // 换弹时间（毫秒）
    isLongGun: false, // 手枪不是长枪
    isStarter: true, // 可选初始武器
    playerSpeedBonus: 0.5, // 移动速度+0.5
  },
  shotgun: {
    id: 'shotgun',
    name: '散弹枪',
    description: '一次发射5发子弹，射程短，射速慢',
    icon: '/assets/shotgun.png',
    showIcon: '/assets/shotgun_show.png',
    damage: 15,
    fireRate: 800,
    bulletSize: 4,
    bulletSpeed: 3,  // 子弹速度
    bulletRange: 300,
    bulletsPerShot: 5,
    spreadAngle: 0.3, // 约 17 度
    color: '#ff6666',
    critRate: 0.2, // 20%暴击率
    magazineSize: 7, // 弹匣容量
    reloadTime: 500, // 换弹时间（毫秒），散弹枪特殊：一发一发装填
    isLongGun: true, // 散弹枪是长枪
    isStarter: true, // 可选初始武器
  },
  sniper: {
    id: 'sniper',
    name: '狙击枪',
    description: '威力巨大，射程远，射速慢',
    icon: '/assets/sniper.png',
    showIcon: '/assets/sniper_show.png',
    damage: 50,
    fireRate: 1200,
    bulletSize: 8,
    bulletSpeed: 5,  // 子弹速度
    bulletRange: 1500,
    bulletsPerShot: 1,
    spreadAngle: 0,
    color: '#66ff66',
    critRate: 0.1, // 10%暴击率
    magazineSize: 8, // 弹匣容量
    reloadTime: 3000, // 换弹时间（毫秒）
    isLongGun: true, // 狙击枪是长枪
    isStarter: false, // 非可选初始武器（战斗中获得）
  },
  smg: {
    id: 'smg',
    name: '冲锋枪',
    description: '射速极快，射程短，单发伤害低',
    icon: '/assets/smg.png',
    showIcon: '/assets/smg_show.png',
    damage: 6,
    fireRate: 80,
    bulletSize: 3,
    bulletSpeed: 3.5,  // 子弹速度
    bulletRange: 400,
    bulletsPerShot: 1,
    spreadAngle: 0.05,
    color: '#66ccff',
    critRate: 0.1, // 10%暴击率
    magazineSize: 30, // 弹匣容量
    reloadTime: 2500, // 换弹时间（毫秒）
    isLongGun: false, // 冲锋枪不是长枪
    isStarter: true, // 可选初始武器
  },
  rpg: {
    id: 'rpg',
    name: '火箭筒',
    description: '发射爆炸火箭弹，伤害范围广（移动速度-30%）',
    icon: '/assets/RPG.png',
    showIcon: '/assets/RPG_show.png',
    damage: 84, // 爆炸伤害（70% of 120）
    fireRate: 2000,
    bulletSize: 12,
    bulletSpeed: 1.2,
    bulletRange: 800,
    bulletsPerShot: 1,
    spreadAngle: 0,
    color: '#ff4444',
    critRate: 0, // 火箭弹没有暴击
    magazineSize: 1, // 弹匣容量1发
    reloadTime: 3000, // 换弹时间3秒
    isLongGun: true, // 火箭筒是长枪
    isStarter: false, // 非可选初始武器（战斗中获得）
    playerSpeedMultiplier: 0.7, // 装备火箭筒时移动速度降低30%
  },
};

// ============================================================
// 武器随机属性与稀有度系统
// 获取武器时按抽取次数权重抽取若干条随机加成，累加武器价值，价值决定稀有度
// ============================================================
type WeaponAffixId = 'magazine' | 'moveSpeed' | 'damage' | 'critRate' | 'fireRate';

interface WeaponAffix {
  id: WeaponAffixId;
  tier: number;       // 档位 1/2/3
  value: number;      // 数值（弹容量为整数，其余为百分比整数）
  valueLabel: string; // 展示文本，如 "+3"、"+15%"
  gain: number;       // 提升的武器价值
}

interface WeaponInstance {
  affixes: WeaponAffix[]; // 抽取到的随机加成
  value: number;          // 武器价值（关键属性，决定稀有度）
  rarity: number;         // 稀有度 1普通 2精良 3稀有 4史诗 5传说
}

// 稀有度配置：达成对应武器价值所需阈值
const RARITY_META: Record<number, { name: string; color: string; threshold: number }> = {
  1: { name: '普通', color: '#ffffff', threshold: 0 },
  2: { name: '精良', color: '#4ade80', threshold: 30 },
  3: { name: '稀有', color: '#60a5fa', threshold: 50 },
  4: { name: '史诗', color: '#c084fc', threshold: 70 },
  5: { name: '传说', color: '#fb923c', threshold: 100 },
};

// 武器抽取次数表：[次数, 权重]
const WEAPON_DRAW_COUNT: Array<{ count: number; weight: number }> = [
  { count: 0, weight: 120 },
  { count: 1, weight: 320 },
  { count: 2, weight: 280 },
  { count: 3, weight: 170 },
  { count: 4, weight: 80 },
  { count: 5, weight: 30 },
];

// 加成池：每种 buff 的 3 档（数值/权重/提升的价值）
const WEAPON_AFFIX_POOL: Array<{
  id: WeaponAffixId;
  name: string;
  tiers: Array<{ value: number; weight: number; gain: number }>;
}> = [
  {
    id: 'magazine', name: '弹容量',
    tiers: [{ value: 1, weight: 100, gain: 5 }, { value: 3, weight: 80, gain: 12 }, { value: 6, weight: 60, gain: 20 }],
  },
  {
    id: 'moveSpeed', name: '持枪移动速度',
    tiers: [{ value: 3, weight: 100, gain: 5 }, { value: 5, weight: 80, gain: 10 }, { value: 8, weight: 60, gain: 18 }],
  },
  {
    id: 'damage', name: '伤害加成',
    tiers: [{ value: 10, weight: 100, gain: 15 }, { value: 15, weight: 80, gain: 30 }, { value: 20, weight: 60, gain: 60 }],
  },
  {
    id: 'critRate', name: '暴击率',
    tiers: [{ value: 10, weight: 100, gain: 8 }, { value: 15, weight: 80, gain: 18 }, { value: 20, weight: 60, gain: 35 }],
  },
  {
    id: 'fireRate', name: '射速',
    tiers: [{ value: 10, weight: 100, gain: 12 }, { value: 15, weight: 80, gain: 25 }, { value: 20, weight: 60, gain: 50 }],
  },
];

const AFFIX_LABEL: Record<WeaponAffixId, (v: number) => string> = {
  magazine: (v) => `+${v}`,
  moveSpeed: (v) => `+${v}%`,
  damage: (v) => `+${v}%`,
  critRate: (v) => `+${v}%`,
  fireRate: (v) => `+${v}%`,
};

// 加权随机抽取（items 每项含 weight）
const pickWeighted = <T extends { weight: number }>(items: T[]): T => {
  const total = items.reduce((sum, it) => sum + it.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r < 0) return it;
  }
  return items[items.length - 1];
};

// 根据武器价值计算稀有度（从高到低匹配阈值）
const getRarityByValue = (value: number): number => {
  let rarity = 1;
  for (let r = 1; r <= 5; r++) {
    if (value >= RARITY_META[r].threshold) rarity = r;
  }
  return rarity;
};

// 为武器抽取随机属性实例：抽取次数 -> 按池子权重抽取对应数量加成 -> 累加价值 -> 计算稀有度
const rollWeaponInstance = (): WeaponInstance => {
  const draws = pickWeighted(WEAPON_DRAW_COUNT).count;
  const affixes: WeaponAffix[] = [];
  let value = 0;
  for (let i = 0; i < draws; i++) {
    const buff = WEAPON_AFFIX_POOL[Math.floor(Math.random() * WEAPON_AFFIX_POOL.length)];
    const tier = pickWeighted(buff.tiers);
    affixes.push({
      id: buff.id,
      tier: buff.tiers.indexOf(tier) + 1,
      value: tier.value,
      valueLabel: AFFIX_LABEL[buff.id](tier.value),
      gain: tier.gain,
    });
    value += tier.gain;
  }
  return { affixes, value, rarity: getRarityByValue(value) };
};

// 获取某武器的随机属性实例（无则返回空实例）
const getWeaponInstance = (player: Player, weaponType: WeaponType): WeaponInstance =>
  player.weaponInstances && player.weaponInstances[weaponType]
    ? player.weaponInstances[weaponType]
    : { affixes: [], value: 0, rarity: 1 };

// 汇总某武器实例的各类加成数值
const getWeaponAffixSummary = (player: Player, weaponType: WeaponType) => {
  const affixes = getWeaponInstance(player, weaponType).affixes;
  const s = { magazine: 0, moveSpeed: 0, damage: 0, critRate: 0, fireRate: 0 };
  for (const a of affixes) {
    if (a.id === 'magazine') s.magazine += a.value;
    else if (a.id === 'moveSpeed') s.moveSpeed += a.value;
    else if (a.id === 'damage') s.damage += a.value;
    else if (a.id === 'critRate') s.critRate += a.value;
    else if (a.id === 'fireRate') s.fireRate += a.value;
  }
  return s;
};

// 装备某武器时，将基础属性 + 该武器随机加成合并写入玩家战斗字段
// 注意：射击时 critRate 额外叠加该武器的暴击率加成（见射击逻辑）
const applyWeaponStatsToPlayer = (prev: Player, weaponType: WeaponType): Player => {
  const cfg = WEAPONS[weaponType];
  const s = getWeaponAffixSummary(prev, weaponType);
  return {
    ...prev,
    weapon: weaponType,
    damage: Math.max(1, Math.floor(cfg.damage * (1 + s.damage / 100))),
    fireRate: Math.max(40, Math.floor(cfg.fireRate * (1 - s.fireRate / 100))),
    weaponRange: cfg.bulletRange,
    bulletSpeed: cfg.bulletSpeed,
    critRate: cfg.critRate,
    playerSpeed: 1 + (cfg.playerSpeedBonus || 0) + (prev.playerSpeedBonus || 0) / 100 + s.moveSpeed / 100,
  };
};

// 获取当前装备武器的暴击率加成（百分比整数），射速计算时叠加
const getEquippedWeaponCritPct = (player: Player): number =>
  getWeaponAffixSummary(player, player.weapon).critRate;

// 获取武器完整弹匣容量（基础 + 全局加成 + 该武器随机弹容量加成）
const getWeaponMagazine = (player: Player, weaponType: WeaponType): number => {
  const cfg = WEAPONS[weaponType];
  return cfg.magazineSize + (player.magazineSizeBonus || 0) + getWeaponAffixSummary(player, weaponType).magazine;
};

// 获得/装备一把武器：首次获得时抽取随机属性实例；已拥有则沿用；随后应用该武器属性并切换到它
const acquireWeapon = (player: Player, weaponType: WeaponType): Player => {
  const weaponInstances = { ...(player.weaponInstances || {}) };
  if (!weaponInstances[weaponType]) weaponInstances[weaponType] = rollWeaponInstance();
  const merged = { ...player, weaponInstances };

  const alreadyOwned = player.weapons.includes(weaponType);
  const weapons: WeaponType[] = alreadyOwned ? player.weapons : [...player.weapons, weaponType];
  const newIndex = weapons.indexOf(weaponType);

  const weaponAmmo = { ...merged.weaponAmmo, [merged.weapon]: merged.currentAmmo };
  const mag = getWeaponMagazine(merged, weaponType);
  const currentAmmo = weaponAmmo[weaponType] ?? mag;

  return {
    ...applyWeaponStatsToPlayer(merged, weaponType),
    weapons,
    currentWeaponIndex: newIndex,
    weaponInstances,
    weaponAmmo,
    currentAmmo,
    weaponLevel: 1,
    isReloading: false,
    reloadStartTime: 0,
    reloadInterrupted: false,
  };
};

// 在“升级奖励”这类逐字段修改的可变对象流程中，将某一武器实例的全部属性写入 p 并返回（首次获得时抽取随机属性）
const equipWeaponFields = (p: Player, weaponType: WeaponType): Player => {
  const weaponInstances = p.weaponInstances && p.weaponInstances[weaponType]
    ? p.weaponInstances
    : { ...(p.weaponInstances || {}), [weaponType]: rollWeaponInstance() };
  const pp = { ...p, weaponInstances };
  const s = getWeaponAffixSummary(pp, weaponType);
  const cfg = WEAPONS[weaponType];
  const weapons: WeaponType[] = pp.weapons.includes(weaponType) ? pp.weapons : [...pp.weapons, weaponType];
  return {
    ...pp,
    weapon: weaponType,
    weapons,
    currentWeaponIndex: weapons.indexOf(weaponType),
    weaponInstances,
    weaponLevel: 1,
    damage: Math.max(1, Math.floor(cfg.damage * (1 + s.damage / 100))),
    fireRate: Math.max(40, Math.floor(cfg.fireRate * (1 - s.fireRate / 100))),
    weaponRange: cfg.bulletRange,
    bulletSpeed: cfg.bulletSpeed,
    critRate: cfg.critRate,
    penetration: (pp.penetrationBonus || 0) + (weaponType === 'sniper' ? 1 : 0),
    playerSpeed: 1 + (cfg.playerSpeedBonus || 0) + (pp.playerSpeedBonus || 0) / 100 + s.moveSpeed / 100,
    currentAmmo: cfg.magazineSize + (pp.magazineSizeBonus || 0) + s.magazine,
    isReloading: false,
    reloadStartTime: 0,
  };
};

// 初始武器选择界面展示信息（边框/标题色 + 属性文本）
const STARTER_WEAPON_META: Record<WeaponType, { border: string; title: string; stats: string[] }> = {
  pistol: {
    border: 'border-yellow-500/50 hover:border-yellow-400',
    title: 'text-yellow-400',
    stats: ['伤害: 5', '射速: 3.3发/秒', '弹容量: 12', '移动速度: +1'],
  },
  shotgun: {
    border: 'border-red-500/50 hover:border-red-400',
    title: 'text-red-400',
    stats: ['伤害: 15×5', '射速: 1.3发/秒', '弹容量: 7', '暴击率: 30%'],
  },
  sniper: {
    border: 'border-green-500/50 hover:border-green-400',
    title: 'text-green-400',
    stats: ['伤害: 50', '射速: 0.8发/秒', '弹容量: 8', '穿透: 1'],
  },
  smg: {
    border: 'border-cyan-500/50 hover:border-cyan-400',
    title: 'text-cyan-400',
    stats: ['伤害: 6', '射速: 12.5发/秒', '弹容量: 30', '暴击率: 10%'],
  },
  rpg: {
    border: 'border-orange-500/50 hover:border-orange-400',
    title: 'text-orange-400',
    stats: ['伤害: 120', '射速: 0.5发/秒', '弹容量: 5', '爆炸范围: 250px'],
  },
};

// 特殊奖励类型定义（机制buff和武器）
type SpecialRewardType = 'penetration' | 'fireBuff' | 'poisonBuff' | 'energyAura' | 'executionBuff' | 'criticalRage' | 'vampire' | 'ammoSupply' | 'desperateFight' | 'pistol_last_bullet_penetrate' | 'pistol_final_strike' | 'rpg_shockwave' | 'rpg_ap_shot' | 'rpg_dual_barrel' | 'weapon_pistol' | 'weapon_smg' | 'weapon_sniper' | 'weapon_shotgun' | 'weapon_rpg';

// 成长链节点ID类型
type GrowthChainNodeId = 
  // 淬毒成长链
  | 'poison_circle_expand_1'      // 毒圈扩大I
  | 'poison_enhance_1'            // 毒性增强I
  | 'poison_toxic_2'              // 剧毒II（真实伤害）
  | 'poison_infection_2'          // 传染II
  | 'poison_circle_expand_2'      // 毒圈扩大II
  | 'poison_faster_2'             // 剧毒III（频率提升）
  | 'poison_absorb_3'             // 剧毒吸收I
  // 手枪专属成长链
  | 'pistol_last_penetration'     // 最后一发子弹穿透
  | 'pistol_final_strike_chain'   // 孤注一掷：最后3发伤害递增+最后一发必暴击穿透
  // 火箭筒专属成长链
  | 'rpg_shockwave'                // 冲击波：爆炸击退敌人
  | 'rpg_ap_shot'                  // 穿甲弹：伤害+200%，范围-80%
  | 'rpg_dual_barrel'              // 两联装：两发连续发射
  // 引火成长链
  | 'fire_burn_speed_1'           // 灼烧加速：燃烧频率1秒→0.7秒
  | 'fire_trail_range_1'          // 焰痕范围：火焰区域半径+30%
  | 'fire_blast_2'                // 炎爆：5层时触发小爆炸
  | 'fire_ember_2'                // 余烬：燃烧死亡留下小火苗
  | 'fire_penetrate_2'            // 火焰穿透：对周围敌人造成30%燃烧伤害
  | 'fire_eternal_3'              // 永恒之火：火焰效果翻倍
  // 能量气场成长链预留位置
  | 'energy_growth_1'             // 能量气场成长链1
  | 'energy_growth_2'             // 能量气场成长链2
  | 'execution_growth_1'          // 处决成长链1
  | 'execution_growth_2'          // 处决成长链2
  | 'critical_rage_growth_1'      // 暴怒成长链1
  | 'critical_rage_growth_2'      // 暴怒成长链2
  | 'vampire_growth_1'            // 吸血成长链1
  | 'vampire_growth_2'            // 吸血成长链2
  | 'ammo_supply_growth_1'        // 弹药补充成长链1
  | 'ammo_supply_growth_2'        // 弹药补充成长链2
  | 'desperate_fight_growth_1'    // 险中取胜成长链1
  | 'desperate_fight_growth_2';   // 险中取胜成长链2

// 成长链节点配置
interface GrowthChainNode {
  id: GrowthChainNodeId;
  name: string;
  description: string;
  baseBuff: SpecialRewardType;        // 所属基础buff
  tier: number;                       // 成长链段数（1, 2, 3...）
  requiredPrevTierCount: number;      // 需要的前一段节点数量
  weight: number | ((level: number) => number);  // 出现权重
  priceFormula: (level: number) => number;       // 价格公式
  icon: string;
  apply: (player: Player) => Player;  // 应用效果
}

// 判断是否为特殊奖励类型
const isSpecialReward = (type: string): type is SpecialRewardType => {
  return ['penetration', 'fireBuff', 'poisonBuff', 'energyAura', 'executionBuff', 'criticalRage', 'vampire', 'ammoSupply', 'desperateFight', 'pistol_last_bullet_penetrate', 'pistol_final_strike', 'weapon_pistol', 'weapon_smg', 'weapon_sniper', 'weapon_shotgun', 'weapon_rpg'].includes(type);
};

// 获取特殊奖励的详细说明
const getSpecialRewardDescription = (type: SpecialRewardType): { title: string; description: string; stats?: string[] } => {
  // 射速转换函数：毫秒转发/秒
  const fireRatePerSecond = (ms: number) => (1000 / ms).toFixed(1);
  
  switch (type) {
    case 'penetration':
      return {
        title: '穿透',
        description: '使子弹可以沿直线穿透多个敌人，对后续敌人造成逐级衰减的伤害。升级穿透可以提升穿透的敌人数量，且略微提升穿透伤害。',
      };
    case 'fireBuff':
      return {
        title: '引火',
        description: '使子弹有20%几率点燃敌人，同一个敌人最多累计5层。被点燃的敌人每秒会受到轻微燃烧伤害，并有概率将燃烧效果蔓延至身边的敌人。',
      };
    case 'poisonBuff':
      return {
        title: '淬毒',
        description: '使子弹有20%几率让敌人中毒，最多累计5层。中毒敌人移动速度降低20%。敌人死亡时，会在原地留下一个持续5秒的毒圈（场上最多5个），毒圈内的敌人会持续受到伤害并中毒。',
      };
    case 'energyAura':
      return {
        title: '能量气场',
        description: '在玩家周围形成一个能量气场，每3秒释放一次冲击波。冲击波会击退气场内的敌人、使其减速1.5秒，并消除气场内的敌方子弹。升级可增大气场半径。',
      };
    case 'executionBuff':
      return {
        title: '处决',
        description: '当敌人血量低于18%时，攻击将立即处决该敌人。敌人被处决前会闪红提示，并显示红色"处决！！"飘字。',
      };
    case 'criticalRage':
      return {
        title: '暴怒',
        description: '你的暴击有概率触发二次暴击，造成暴击伤害150%的额外伤害。概率等于暴击率的一半。',
      };
    case 'vampire':
      return {
        title: '吸血',
        description: '当你杀死敌人时，有10%概率回复1点生命值。',
      };
    case 'ammoSupply':
      return {
        title: '弹药补充',
        description: '以暴击杀死敌人时（包括二次暴击），立即补充弹匣里10%的子弹（最少1发）。',
      };
    case 'desperateFight':
      return {
        title: '险中取胜',
        description: '当生命值低于20%时，进入狂暴状态：暴击率+20%，暴击伤害+100%，换弹速度+30%，射速+30%，移动速度+1。',
      };
    case 'pistol_last_bullet_penetrate':
      return {
        title: '最后一弹',
        description: '手枪的最后一发子弹可以穿透任何敌人（无限穿透，无伤害衰减）',
      };
    case 'pistol_final_strike':
      return {
        title: '孤注一掷',
        description: '换弹时长+40%，但弹匣中最后3发子弹伤害递增50%/100%/200%，且最后一发必定暴击并穿透所有敌人',
        stats: ['换弹时长 +40%', '最后3发伤害 +50%/+100%/+200%', '最后一发必暴击+穿透'],
      };
    case 'rpg_shockwave':
      return {
        title: '冲击波',
        description: '爆炸伤害会击退敌人，未死亡的敌人向反方向击退30px，并在1.5秒内减速70%',
      };
    case 'rpg_ap_shot':
      return {
        title: '穿甲弹',
        description: '爆炸伤害增加200%，爆炸范围减少80%',
      };
    case 'rpg_dual_barrel':
      return {
        title: '两联装',
        description: '弹夹数变为2，点击发射则在0.7秒内连续发射两发。每发爆炸范围为初始的70%，伤害为60%，美术资源大小为60%',
      };
    case 'weapon_pistol':
      return {
        title: '手枪',
        description: '标准武器，平衡性良好',
        stats: [
          `伤害：${WEAPONS.pistol.damage}`,
          `射速：${fireRatePerSecond(WEAPONS.pistol.fireRate)}发/秒`,
          `弹容量：${WEAPONS.pistol.magazineSize}`,
          `移动速度：+1`,
        ],
      };
    case 'weapon_smg':
      return {
        title: '冲锋枪',
        description: '射速极快，射程短，单发伤害低',
        stats: [
          `伤害：${WEAPONS.smg.damage}`,
          `射速：${fireRatePerSecond(WEAPONS.smg.fireRate)}发/秒`,
          `弹容量：${WEAPONS.smg.magazineSize}`,
        ],
      };
    case 'weapon_sniper':
      return {
        title: '狙击枪',
        description: '威力巨大，射程远，射速慢',
        stats: [
          `伤害：${WEAPONS.sniper.damage}`,
          `射速：${fireRatePerSecond(WEAPONS.sniper.fireRate)}发/秒`,
          `弹容量：${WEAPONS.sniper.magazineSize}`,
          `穿透：1`,
        ],
      };
    case 'weapon_shotgun':
      return {
        title: '散弹枪',
        description: '一次发射多发子弹，射程短，射速慢',
        stats: [
          `伤害：${WEAPONS.shotgun.damage}×${WEAPONS.shotgun.bulletsPerShot}`,
          `射速：${fireRatePerSecond(WEAPONS.shotgun.fireRate)}发/秒`,
          `弹容量：${WEAPONS.shotgun.magazineSize}`,
        ],
      };
    case 'weapon_rpg':
      return {
        title: '火箭筒',
        description: '发射爆炸火箭弹，伤害范围广',
        stats: [
          `伤害：${WEAPONS.rpg.damage}`,
          `射速：${fireRatePerSecond(WEAPONS.rpg.fireRate)}发/秒`,
          `弹容量：${WEAPONS.rpg.magazineSize}`,
          `爆炸范围：150px`,
        ],
      };
    default:
      return { title: '', description: '' };
  }
};

// 最大数值保护配置
const MAX_VALUES = {
  playerSpeed: 7, // 移动速度最大7
  weaponRange: 2000, // 射程最大2000
  penetration: 15, // 穿透力最大15
  knockback: 10, // 击退值最大10（击退距离 10+击退值*10 最大110px）
  weaponUpgrade: 500, // 武器属性加成最大500%
  critRate: 1.1, // 暴击率软上限原始值（110%，对应有效暴击率90%）
  critDamageBonus: 1.5, // 暴击伤害软上限原始值（150%，对应有效额外加成150%）
};

// 检查属性是否已达到最大值
const isAtMaxValue = (player: Player, type: string): boolean => {
  switch (type) {
    case 'playerSpeed':
      return player.playerSpeed >= MAX_VALUES.playerSpeed;
    case 'weaponRange':
      return player.weaponRange >= MAX_VALUES.weaponRange;
    case 'penetration':
      return player.penetration >= MAX_VALUES.penetration;
    case 'knockback':
      return player.knockback >= MAX_VALUES.knockback;
    case 'weapon_upgrade':
      // 检查武器属性加成是否已达到最大值
      const totalWeaponBonus = Math.max(
        player.damageBonus,
        player.fireRateBonus,
        player.weaponRangeBonus
      );
      return totalWeaponBonus >= MAX_VALUES.weaponUpgrade;
    case 'critRate':
      // 检查暴击率是否已达到软上限（原始值达到110%）
      // 注意：player.critRateBonus 为百分比整数（如 4 表示 +4%），需除以 100 转成小数再相加
      const rawCritRate = WEAPONS[player.weapon].critRate + (player.critRateBonus + getEquippedWeaponCritPct(player)) / 100;
      return rawCritRate >= MAX_VALUES.critRate;
    case 'critDamage':
      // 检查暴击伤害是否已达到软上限（原始额外加成达到150%）
      return player.critDamageBonus >= MAX_VALUES.critDamageBonus * 100;
    case 'coinPickupRange':
      // 检查金币拾取范围是否已达到最大值（初始范围的500%）
      return player.coinPickupRangeBonus >= GAME_CONFIG.COIN_PICKUP_RANGE_MAX_BONUS;
    default:
      return false;
  }
};

// 获取格式化的最大值显示文本
const getMaxValueDisplay = (type: string, baseName: string): string => {
  switch (type) {
    case 'playerSpeed':
      return `${baseName} ${MAX_VALUES.playerSpeed}(Max)`;
    case 'weaponRange':
      return `${baseName} ${MAX_VALUES.weaponRange}(Max)`;
    case 'penetration':
      return `${baseName} ${MAX_VALUES.penetration}(Max)`;
    case 'weapon_upgrade':
      return `${baseName} Lv${MAX_VALUES.weaponUpgrade}(Max)`;
    case 'critRate':
      // 暴击率软上限：显示原始值和有效值
      return `${baseName} 110%/90%(Max)`;
    case 'critDamage':
      // 暴击伤害软上限：显示原始值和有效值
      return `${baseName} 300%/225%(Max)`;
    default:
      return baseName;
  }
};

// 应用属性加成并限制最大值
const applyWithMaxValue = (player: Player, type: string, value: number, applyFn: (p: Player, v: number) => Player): Player => {
  const newPlayer = applyFn(player, value);
  
  // 根据类型限制最大值
  switch (type) {
    case 'playerSpeed':
      return { ...newPlayer, playerSpeed: Math.min(newPlayer.playerSpeed, MAX_VALUES.playerSpeed) };
    case 'weaponRange':
      return { ...newPlayer, weaponRange: Math.min(newPlayer.weaponRange, MAX_VALUES.weaponRange) };
    case 'penetration':
      return { ...newPlayer, penetration: Math.min(newPlayer.penetration, MAX_VALUES.penetration) };
    case 'critRate':
      return { ...newPlayer, critRate: Math.min(newPlayer.critRate, MAX_VALUES.critRate) };
    case 'critDamage':
      return { ...newPlayer, critDamageBonus: Math.min(newPlayer.critDamageBonus, MAX_VALUES.critDamageBonus * 100) };
    case 'weapon_upgrade':
      // 确保武器属性加成不超过最大值
      return {
        ...newPlayer,
        damageBonus: Math.min(newPlayer.damageBonus, MAX_VALUES.weaponUpgrade),
        fireRateBonus: Math.min(newPlayer.fireRateBonus, MAX_VALUES.weaponUpgrade),
        weaponRangeBonus: Math.min(newPlayer.weaponRangeBonus, MAX_VALUES.weaponUpgrade),
      };
    default:
      return newPlayer;
  }
};

// 类型定义
interface Position {
  x: number;
  y: number;
}

interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  fireRate: number;
  lastShot: number;
  weapon: WeaponType;
  weaponLevel: number; // 武器等级，用于数值升级
  weapons: WeaponType[]; // 拥有的武器列表
  currentWeaponIndex: number; // 当前武器索引
  weaponAmmo: Record<string, number>; // 每种武器的当前弹药
  isHit: boolean; // 是否处于受击状态
  hitTime: number; // 受击时间戳
  playerSpeed: number; // 玩家移动速度
  enemySpeedMultiplier: number; // 敌方速度倍率（小于1表示减速）
  weaponRange: number; // 武器射程
  bulletSpeed: number; // 子弹速度
  critRate: number; // 暴击率（0-1）
  critDamage: number; // 暴击伤害倍率（1.5表示150%）
  penetration: number; // 穿透力（0表示只能击中1个敌人，1表示可以穿透1个敌人击中第2个）
  currentAmmo: number; // 当前弹匣剩余子弹数
  isReloading: boolean; // 是否正在换弹
  reloadStartTime: number; // 换弹开始时间
  reloadInterrupted: boolean; // 换弹是否被中断（仅用于散弹枪一发一发装填）
  lastHitMonsterId: string | null; // 最近造成伤害的怪物ID
  lastHitMonsterTime: number; // 最近受到怪物伤害的时间戳
  gold: number; // 金币数量
  magazineSizeBonus: number; // 弹夹容量加成（独立于武器）
  reloadSpeedBonus: number; // 换弹速度加成百分比（独立于武器，用于双曲线递减公式）
  // 加成记录字段（用于UI显示）
  damageBonus: number; // 伤害加成点数
  critRateBonus: number; // 暴击率加成百分比
  critDamageBonus: number; // 暴击伤害加成百分比
  fireRateBonus: number; // 射速加成百分比
  playerSpeedBonus: number; // 移动速度加成百分比
  weaponRangeBonus: number; // 武器射程加成百分比
  maxHpBonus: number; // 生命上限加成点数
  penetrationBonus: number; // 穿透力加成点数
  knockback: number; // 击退值（0表示无击退，1表示退后20px，每+1额外+10px）
  // 动画相关字段
  facingDirection: 'left' | 'right'; // 面朝方向
  isMoving: boolean; // 是否正在移动
  lastMoveTime: number; // 最后一次移动的时间戳
  animationStartTime: number; // 动画开始时间
  // 引火buff相关
  fireBuffLevel: number; // 引火等级（0表示未获得）
  // 淬毒buff相关
  poisonBuffLevel: number; // 淬毒等级（0表示未获得）
  // 金币拾取范围加成（初始范围的百分比，如20表示+20%）
  coinPickupRangeBonus: number; // 金币拾取范围加成百分比
  // 能量气场相关
  energyAuraLevel: number; // 能量气场等级（0表示未获得）
  lastEnergyAuraShockwaveTime: number; // 上次冲击波发射时间
  // 处决buff相关
  executionLevel: number; // 处决等级（0表示未获得）
  criticalRageLevel: number; // 暴怒等级（0表示未获得）
  // 吸血buff相关
  vampireLevel: number; // 吸血等级（0表示未获得）
  // 弹药补充buff相关
  ammoSupplyLevel: number; // 弹药补充等级（0表示未获得）
  // 险中取胜buff相关
  desperateFightLevel: number; // 险中取胜等级（0表示未获得）
  // 成长链节点
  growthChainNodes: GrowthChainNodeId[]; // 已获得的成长链节点
  // 武器随机属性与稀有度：每种已拥有武器 -> 随机属性实例
  weaponInstances: Record<string, WeaponInstance>; // 已拥有武器的随机属性实例
  // 武器切换相关
  isSwitchingWeapon: boolean; // 是否正在切换武器
  weaponSwitchStartTime: number; // 武器切换开始时间
}

interface Monster {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number; // 基础速度（用于计算受击减速）
  damage: number;
  isHit: boolean; // 是否处于受击状态
  hitTime: number; // 受击时间戳
  isDying: boolean; // 是否处于死亡状态
  deathTime: number; // 死亡时间戳
  monsterType: MonsterType; // 敌人类型
  lastShot: number; // 最近一次射击时间
  lastAttackTime: number; // 最近一次碰撞攻击时间
  isBoss: boolean; // 是否为BOSS
  lastBossAttackTime: number; // BOSS最近一次攻击时间
  lastRangedAttackTime: number; // BOSS最近一次远程攻击时间
  // BOSS远程攻击连续发射相关状态
  rangedAttackCount?: number; // 当前组攻击的次数（0-2，共3次）
  rangedAttackStartTime?: number; // 当前组攻击开始时间
  vx: number; // X轴速度向量
  vy: number; // Y轴速度向量
  // 敌人4（远程敌人）动画相关状态
  isShooting?: boolean; // 是否正在播放Shoot动画
  shootAnimationStartTime?: number; // Shoot动画开始时间
  // BOSS落地攻击状态
  jumpAttackState?: 'idle' | 'locking' | 'jump_start' | 'airborne' | 'landing' | 'recovery'; // 落地攻击状态
  jumpAttackStartTime?: number; // 落地攻击开始时间
  jumpAttackTargetX?: number; // 锁定的目标位置X
  jumpAttackTargetY?: number; // 锁定的目标位置Y
  jumpAttackStartX?: number; // 起跳位置X（用于airborne阶段的移动计算）
  jumpAttackStartY?: number; // 起跳位置Y（用于airborne阶段的移动计算）
  jumpAttackVelocityX?: number; // 起跳速度X
  jumpAttackVelocityY?: number; // 起跳速度Y
  isInvincible?: boolean; // 是否处于无敌状态
  // BOSS砸地旋转弹幕状态
  barrageActive?: boolean; // 弹幕是否激活
  barrageStartTime?: number; // 弹幕开始时间
  barrageLastEmitTime?: number; // 上次发射时间
  // 引火燃烧状态
  isBurning?: boolean; // 是否正在燃烧
  burningStacks?: number; // 燃烧层数
  burningDamage?: number; // 每层燃烧伤害
  burningEndTime?: number; // 燃烧结束时间
  lastBurnTickTime?: number; // 上次燃烧伤害时间
  burningSource?: string; // 燃烧来源怪物ID（用于传播）
  // 淬毒中毒状态
  isPoisoned?: boolean; // 是否正在中毒
  poisonStacks?: number; // 中毒层数
  poisonDamage?: number; // 每层中毒伤害
  poisonEndTime?: number; // 中毒结束时间
  lastPoisonTickTime?: number; // 上次中毒伤害时间
  // 能量气场减速状态
  isSlowedByAura?: boolean; // 是否被能量气场减速
  auraSlowdownEndTime?: number; // 减速结束时间
  // 处决标记
  isExecuted?: boolean; // 是否被处决
  executionTime?: number; // 处决时间
  // 火箭筒冲击波击退效果
  knockbackVx?: number; // 击退速度X
  knockbackVy?: number; // 击退速度Y
  knockbackEndTime?: number; // 击退结束时间
  // 火箭筒冲击波减速效果
  shockwaveSlowdownEndTime?: number; // 冲击波减速结束时间
  shockwaveSlowdownMultiplier?: number; // 冲击波减速倍率（0.3表示70%减速）
  // 词缀系统
  affix?: MonsterAffix; // 当前怪物持有的词缀（最多1个）
  affixState?: Record<string, unknown>; // 词缀运行时状态（由各词缀自行管理）
}

// ============================================================
// 词缀系统 (Affix System)
// 设计：所有词缀继承 Affix 基类，统一生命周期：
//   init        - 怪物生成时初始化词缀状态
//   onDamage    - 怪物受到伤害事件（可拦截/修改伤害，返回实际造成的伤害）
//   update      - 每帧更新（在怪物AI之前执行，可修改怪物属性）
//   render      - 每帧渲染（在怪物绘制之后调用，绘制词缀视觉效果）
// ============================================================

// 词缀类型枚举
type AffixType = 'berserk' | 'shield' | 'self_destruct';

// 词缀配置接口
interface AffixConfig {
  type: AffixType;
  name: string;
  description: string;
  weight: number; // 抽取权重
}

// 怪物词缀（挂在 Monster.affix 上，不包含方法，可序列化）
interface MonsterAffix {
  type: AffixType;
  name: string;
}

// 词缀配置表（支持权重，数值均可调）
const AFFIX_CONFIGS: Record<AffixType, AffixConfig> = {
  berserk: {
    type: 'berserk',
    name: '狂暴',
    description: 'HP ≤ 30% 时激活：移速 +60%、伤害 +50%、攻击间隔减半',
    weight: 100,
  },
  shield: {
    type: 'shield',
    name: '护盾',
    description: '抵挡前 3 次伤害事件（与伤害量无关），第 4 次起正常结算',
    weight: 100,
  },
  self_destruct: {
    type: 'self_destruct',
    name: '自爆',
    description: '与玩家距离 ≤ 80px 时停止移动，2 秒后爆炸造成范围伤害',
    weight: 100,
  },
};

// 狂暴词缀数值配置
const BERSERK_CONFIG = {
  HP_THRESHOLD: 0.3,       // HP 低于 30% 触发
  SPEED_BONUS: 0.6,        // 移速 +60%
  DAMAGE_BONUS: 0.5,       // 伤害 +50%
  ATTACK_SPEED_BONUS: 0.5, // 攻击间隔减半（interval * 0.5）
  PULSE_CYCLE: 1000,       // 呼吸光效周期 1s
  PULSE_MIN_ALPHA: 0.4,    // 呼吸最小 alpha
  PULSE_MAX_ALPHA: 0.8,    // 呼吸最大 alpha
  OUTLINE_COLOR: '#a855f7', // 描边紫色
  AURA_COLOR: '#c084fc',   // 激活光效紫色
};

// 护盾词缀数值配置
const SHIELD_CONFIG = {
  MAX_CHARGES: 3,            // 3 次抵挡
  OUTLINE_COLOR: '#3b82f6',  // 蓝色描边
  OUTLINE_ALPHA: 0.6,        // 描边透明度
  CELL_WIDTH: 6,             // 方格宽度
  CELL_HEIGHT: 6,            // 方格高度
  CELL_GAP: 2,               // 方格间距
  CELL_ACTIVE_COLOR: '#60a5fa',   // 激活方格颜色
  CELL_INACTIVE_COLOR: '#374151', // 消耗方格颜色
};

// 自爆词缀数值配置
const SELF_DESTRUCT_CONFIG = {
  TRIGGER_DISTANCE: 80,   // 触发距离（像素）
  FUSE_DURATION: 2000,    // 引爆时长 2 秒
  EXPLOSION_RADIUS: 120,  // 爆炸范围
  DAMAGE_RATIO: 0.3,      // 伤害 = maxHp * 30%
  FLASH_INTERVAL: 200,    // 准备阶段闪烁间隔 0.2s
  PARTICLE_COUNT: 8,      // 爆炸粒子数（8 方向扩散）
  PARTICLE_SPEED: 4,      // 粒子扩散速度
  PARTICLE_DURATION: 600, // 粒子持续时间
  PARTICLE_SIZE: 6,       // 粒子大小
};

// BOSS 砸地旋转弹幕配置
const BOSS_BARRAGE_CONFIG = {
  EMITTER_COUNT: 15,          // 发射口数量（放射状均匀分布）
  EMIT_INTERVAL: 100,         // 发射间隔（毫秒）
  DURATION: 2000,             // 弹幕持续时间（毫秒）
  ANGULAR_SPEED: 240,         // 发射口组旋转角速度（度/秒，顺时针）
  BULLET_SPEED: 8,            // 弹速
  BULLET_DAMAGE: 8,           // 火球伤害
  BULLET_RANGE: 800,          // 火球射程
  BULLET_SIZE: 60,            // 火球显示尺寸（直径，px）
  BULLET_FRAME_SIZE: 200,     // 序列帧单帧尺寸（px）
  BULLET_FRAME_DURATION: 80,  // 序列帧每帧时长（毫秒）
  BULLET_COLOR: '#ff7b3a',    // 备用颜色（火球橙色）
  HIT_PARTICLE_COUNT: 12,     // 受击蓝色粒子数量
  HIT_PARTICLE_COLOR: '#60a5fa', // 受击蓝色粒子主色
  HIT_PARTICLE_DURATION: 500, // 受击粒子持续时间（毫秒）
  HIT_PARTICLE_SPEED: 6,      // 受击粒子扩散速度
  HIT_PARTICLE_SIZE: 5,       // 受击粒子大小
};

// 词缀生成概率配置
const AFFIX_SPAWN_CONFIG = {
  MIN_LEVEL: 4,           // 第 4 关开始出现词缀
  BASE_CHANCE: 0.05,      // 基础概率 5%
  CHANCE_PER_LEVEL: 0.01, // 每关 +1%
  MAX_CHANCE: 0.25,       // 上限 25%
};

// 计算当前关卡的词缀出现概率
const getAffixSpawnChance = (level: number): number => {
  if (level < AFFIX_SPAWN_CONFIG.MIN_LEVEL) return 0;
  const chance = AFFIX_SPAWN_CONFIG.BASE_CHANCE + (level - AFFIX_SPAWN_CONFIG.MIN_LEVEL) * AFFIX_SPAWN_CONFIG.CHANCE_PER_LEVEL;
  return Math.min(chance, AFFIX_SPAWN_CONFIG.MAX_CHANCE);
};

// 按权重随机抽取一个词缀类型
const rollAffixType = (): AffixType | null => {
  const entries = Object.entries(AFFIX_CONFIGS) as [AffixType, AffixConfig][];
  const totalWeight = entries.reduce((sum, [, cfg]) => sum + cfg.weight, 0);
  if (totalWeight <= 0) return null;
  let rand = Math.random() * totalWeight;
  for (const [type, cfg] of entries) {
    rand -= cfg.weight;
    if (rand <= 0) return type;
  }
  return entries[0][0];
};

// ============================================================
// Affix 基类（纯静态方法 + 面向数据编程，避免 React state 中存 class 实例）
// 所有词缀状态存储在 monster.affixState 中，保证可序列化
// ============================================================
const AffixSystem = {
  // 生成时为怪物初始化词缀状态
  init(monster: Monster, type: AffixType): Monster {
    const cfg = AFFIX_CONFIGS[type];
    const newMonster = { ...monster, affix: { type, name: cfg.name } };
    switch (type) {
      case 'berserk':
        newMonster.affixState = { activated: false };
        break;
      case 'shield':
        newMonster.affixState = { charges: SHIELD_CONFIG.MAX_CHARGES };
        break;
      case 'self_destruct':
        newMonster.affixState = {
          phase: 'idle' as 'idle' | 'charging' | 'exploded',
          chargeStartTime: 0,
          explodeX: 0,
          explodeY: 0,
        };
        break;
    }
    return newMonster;
  },

  // 伤害事件：返回 { monster, actualDamage, blocked }
  // blocked = true 表示该次伤害被完全吸收（实际 hp 不变）
  onDamage(
    monster: Monster,
    rawDamage: number,
  ): { monster: Monster; actualDamage: number; blocked: boolean } {
    if (!monster.affix || !monster.affixState) {
      return { monster, actualDamage: rawDamage, blocked: false };
    }
    switch (monster.affix.type) {
      case 'shield': {
        const charges = (monster.affixState.charges as number) ?? 0;
        if (charges > 0) {
          // 抵挡一次伤害
          const newState = { ...monster.affixState, charges: charges - 1 };
          return {
            monster: { ...monster, affixState: newState },
            actualDamage: 0,
            blocked: true,
          };
        }
        return { monster, actualDamage: rawDamage, blocked: false };
      }
      default:
        return { monster, actualDamage: rawDamage, blocked: false };
    }
  },

  // 每帧更新（在怪物移动之前调用）
  // 返回 { monster, speedMultiplier, damageMultiplier, attackSpeedMultiplier, stopMovement, triggerExplosion }
  update(
    monster: Monster,
    now: number,
    playerX: number,
    playerY: number,
  ): {
    monster: Monster;
    speedMultiplier: number;   // 移速倍率
    damageMultiplier: number;  // 伤害倍率
    attackSpeedMultiplier: number; // 攻击间隔倍率（<1 表示更快）
    stopMovement: boolean;     // 是否停止移动
    shouldExplode: boolean;    // 本帧是否触发自爆
    explodeDamage: number;     // 自爆伤害
    explodeRadius: number;     // 自爆范围
  } {
    const result = {
      monster,
      speedMultiplier: 1,
      damageMultiplier: 1,
      attackSpeedMultiplier: 1,
      stopMovement: false,
      shouldExplode: false,
      explodeDamage: 0,
      explodeRadius: 0,
    };
    if (!monster.affix || !monster.affixState) return result;

    switch (monster.affix.type) {
      case 'berserk': {
        const hpPercent = monster.hp / monster.maxHp;
        const shouldActivate = hpPercent <= BERSERK_CONFIG.HP_THRESHOLD;
        const wasActivated = !!monster.affixState.activated;
        if (shouldActivate !== wasActivated) {
          result.monster = {
            ...monster,
            affixState: { ...monster.affixState, activated: shouldActivate },
          };
        }
        if (shouldActivate) {
          result.speedMultiplier = 1 + BERSERK_CONFIG.SPEED_BONUS;
          result.damageMultiplier = 1 + BERSERK_CONFIG.DAMAGE_BONUS;
          result.attackSpeedMultiplier = BERSERK_CONFIG.ATTACK_SPEED_BONUS;
        }
        break;
      }
      case 'self_destruct': {
        const state = monster.affixState;
        const phase = state.phase as string;
        const dx = playerX - monster.x;
        const dy = playerY - monster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (phase === 'idle' && dist <= SELF_DESTRUCT_CONFIG.TRIGGER_DISTANCE) {
          // 进入充能阶段
          result.monster = {
            ...monster,
            affixState: {
              ...state,
              phase: 'charging',
              chargeStartTime: now,
            },
          };
          result.stopMovement = true;
        } else if (phase === 'charging') {
          result.stopMovement = true;
          const elapsed = now - (state.chargeStartTime as number);
          if (elapsed >= SELF_DESTRUCT_CONFIG.FUSE_DURATION) {
            // 触发爆炸
            result.shouldExplode = true;
            result.explodeDamage = Math.floor(monster.maxHp * SELF_DESTRUCT_CONFIG.DAMAGE_RATIO);
            result.explodeRadius = SELF_DESTRUCT_CONFIG.EXPLOSION_RADIUS;
            result.monster = {
              ...monster,
              affixState: { ...state, phase: 'exploded' },
            };
          }
        }
        break;
      }
      default:
        break;
    }
    return result;
  },

  // 绘制词缀视觉效果（在怪物 sprite 绘制之后、血条之前调用）
  // ctx 为游戏渲染上下文，monsterSize 为怪物大小，isBoss 为是否 Boss
  render(
    ctx: CanvasRenderingContext2D,
    monster: Monster,
    monsterSize: number,
    isBoss: boolean,
    now: number,
  ): void {
    if (!monster.affix || !monster.affixState || monster.isDying) return;

    switch (monster.affix.type) {
      case 'berserk': {
        const activated = !!monster.affixState.activated;
        if (activated) {
          // 激活态：紫色呼吸光效（alpha 脉冲）
          const phase = (now % BERSERK_CONFIG.PULSE_CYCLE) / BERSERK_CONFIG.PULSE_CYCLE;
          const alpha = BERSERK_CONFIG.PULSE_MIN_ALPHA +
            Math.sin(phase * Math.PI * 2) * 0.5 * (BERSERK_CONFIG.PULSE_MAX_ALPHA - BERSERK_CONFIG.PULSE_MIN_ALPHA);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = BERSERK_CONFIG.AURA_COLOR;
          ctx.beginPath();
          ctx.arc(monster.x, monster.y, monsterSize * 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // 未激活：紫色描边
          ctx.save();
          ctx.strokeStyle = BERSERK_CONFIG.OUTLINE_COLOR;
          ctx.lineWidth = isBoss ? 4 : 2;
          ctx.beginPath();
          ctx.arc(monster.x, monster.y, monsterSize + (isBoss ? 4 : 2), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case 'shield': {
        const charges = (monster.affixState.charges as number) ?? 0;
        if (charges <= 0) break;
        // 蓝色半透明描边
        ctx.save();
        ctx.strokeStyle = SHIELD_CONFIG.OUTLINE_COLOR;
        ctx.globalAlpha = SHIELD_CONFIG.OUTLINE_ALPHA;
        ctx.lineWidth = isBoss ? 4 : 2;
        ctx.beginPath();
        ctx.arc(monster.x, monster.y, monsterSize + (isBoss ? 4 : 2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'self_destruct': {
        const phase = monster.affixState.phase as string;
        if (phase === 'charging') {
          // 红色轮廓加速闪烁：沿怪物 sprite 外接矩形描边（与敌人形状保持一致）
          const flashCount = Math.floor(
            (now - (monster.affixState.chargeStartTime as number)) / SELF_DESTRUCT_CONFIG.FLASH_INTERVAL
          );
          if (flashCount % 2 === 0) {
            const half = monsterSize * 1.05;
            ctx.save();
            ctx.strokeStyle = '#ff2222';
            ctx.lineWidth = isBoss ? 5 : 3;
            // 外发光感：两层轮廓（外粗内细）
            ctx.globalAlpha = 0.75;
            ctx.strokeRect(monster.x - half - 1, monster.y - half - 1, half * 2 + 2, half * 2 + 2);
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = isBoss ? 8 : 5;
            ctx.strokeRect(monster.x - half - 2, monster.y - half - 2, half * 2 + 4, half * 2 + 4);
            ctx.restore();
          }
        }
        break;
      }
      default:
        break;
    }
  },

  // 绘制血条下方的词缀 UI（如护盾方格）
  renderBelowHpBar(
    ctx: CanvasRenderingContext2D,
    monster: Monster,
    monsterSize: number,
    isBoss: boolean,
  ): void {
    if (!monster.affix || !monster.affixState || monster.isDying) return;

    if (monster.affix.type === 'shield') {
      const charges = (monster.affixState.charges as number) ?? 0;
      const totalCells = SHIELD_CONFIG.MAX_CHARGES;
      const totalWidth = totalCells * SHIELD_CONFIG.CELL_WIDTH + (totalCells - 1) * SHIELD_CONFIG.CELL_GAP;
      // 位置：血条下方
      const barY = monster.y - monsterSize - 15;
      const hpBarHeight = isBoss ? 12 : 8;
      const cellY = barY + hpBarHeight + 3;
      const startX = monster.x - totalWidth / 2;

      for (let i = 0; i < totalCells; i++) {
        const cx = startX + i * (SHIELD_CONFIG.CELL_WIDTH + SHIELD_CONFIG.CELL_GAP);
        const active = i < charges;
        ctx.fillStyle = active ? SHIELD_CONFIG.CELL_ACTIVE_COLOR : SHIELD_CONFIG.CELL_INACTIVE_COLOR;
        ctx.fillRect(cx, cellY, SHIELD_CONFIG.CELL_WIDTH, SHIELD_CONFIG.CELL_HEIGHT);
        // 描边
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cellY, SHIELD_CONFIG.CELL_WIDTH, SHIELD_CONFIG.CELL_HEIGHT);
      }
    }
  },
};

// 毒圈（淬毒buff敌人死亡时生成）
interface PoisonCircle {
  id: string;
  x: number; // 毒圈中心X坐标
  y: number; // 毒圈中心Y坐标
  radius: number; // 毒圈半径
  damage: number; // 每次伤害值
  endTime: number; // 毒圈结束时间
  lastTickTime: number; // 上次伤害时间
}

// 掉落物品类型
type DropType = 'coin' | 'chest' | 'weapon_upgrade_box' | 'health_potion';

interface Coin {
  id: string;
  x: number;
  y: number;
  type: DropType; // 物品类型：coin、chest、weapon_upgrade_box、health_potion
  value: number; // 金币价值（coin时是金币值，chest时是打开后的金币值）
  size: number;
  color: string;
  spawnTime: number; // 生成时间
  isCollected: boolean; // 是否已被收集
  collectAnimationProgress: number; // 收集动画进度（0-1）
  isAttracting?: boolean; // 是否正在被吸引
  attractTargetX?: number; // 吸引目标位置X（玩家位置）
  attractTargetY?: number; // 吸引目标位置Y（玩家位置）
  trailParticles?: CoinTrailParticle[]; // 拖尾粒子数组
}

interface CoinTrailParticle {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  life: number; // 存在时间（毫秒）
  maxLife: number; // 最大存在时间
}

interface EnemyBullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  range: number;
  distanceTraveled: number;
  startX: number;
  startY: number;
  color: string;
  size: number;
  hasHitPlayer?: boolean; // 标记是否已经击中玩家（防止多次伤害）
  shouldRemove?: boolean; // 标记是否需要移除
  isFireBall?: boolean; // 是否为BOSS旋转弹幕的大型火球
  spawnTime?: number; // 火球生成时间（用于循环序列帧）
}

interface DamageNumber {
  id: string;
  monsterId: string; // 关联的怪物ID
  x: number;
  y: number;
  damage: number;
  opacity: number;
  scale: number;
  startTime: number;
  isCrit: boolean; // 是否是暴击
  isExecution?: boolean; // 是否是处决
  isDoubleCrit?: boolean; // 是否是二次暴击
  isShieldBlock?: boolean; // 是否是护盾抵挡
}

// 词缀爆炸粒子（用于自爆等效果）
interface AffixExplosionParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  startTime: number;
  duration: number;
}

// BOSS火球命中玩家的蓝色粒子受击效果
interface PlayerHitParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  startTime: number;
  duration: number;
}

// BOSS砸地旋转弹幕实例
interface BossBarrage {
  id: string;
  x: number;
  y: number;
  startTime: number;
  lastEmitTime: number;
}

interface GoldFloatingText {
  id: string;
  x: number;
  y: number;
  initialY: number; // 初始Y位置（用于计算移动）
  value: number; // 数值
  opacity: number;
  scale: number;
  startTime: number;
  text?: string; // 自定义文字（可选）
  color?: string; // 自定义颜色（可选，格式：'#RRGGBB'）
}

interface VampireHealEffect {
  id: string;
  startTime: number;
  healAmount: number;
}

interface ExplosionEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  startTime: number;
  maxRadius: number; // 最大半径（动画效果）
  totalFrames: number; // 总帧数
  frameDuration: number; // 每帧持续时间（毫秒）
  firstPassComplete: boolean; // 是否完成第一遍播放
  rotation: number; // 爆炸贴图旋转角度（弧度）
}

interface MuzzleFlash {
  id: string;
  x: number; // 枪口位置X
  y: number; // 枪口位置Y
  angle: number; // 旋转角度（弧度）
  currentFrame: number; // 当前帧（0-3）
  startTime: number; // 开始时间
  duration: number; // 总持续时间（毫秒）
  scale: number; // 缩放比例
}

interface SmokeEffect {
  id: string;
  x: number;
  y: number;
  startTime: number; // 开始时间
  duration: number; // 持续时间（0.5秒）
  initialSize: number; // 初始大小
  finalSize: number; // 最终大小
}

interface PierceEffect {
  id: string;
  x: number;      // 穿透点中心X
  y: number;      // 穿透点中心Y
  angle: number;  // 子弹运动方向角（弧度）
  startTime: number; // 开始时间
  duration: number;  // 持续时间（毫秒）
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weapon: WeaponType;
  size: number;
  color: string;
  damage: number;
  isCrit: boolean; // 是否是暴击
  actualDamage: number; // 实际伤害（考虑暴击后）
  penetration: number; // 穿透力
  hitCount: number; // 已经击中的敌人数量
  range: number;
  distanceTraveled: number;
  startX: number;
  startY: number;
  isRocket: boolean; // 是否是火箭弹
  explosionRadius: number; // 爆炸半径
  explosionDamage: number; // 爆炸伤害
  // 火箭弹变速相关字段
  initialSpeed: number; // 初始速度（火箭弹固定为0.2）
  finalSpeed: number; // 最终速度（火箭弹基础2，受子弹速度增益影响）
  accelerationStartTime: number; // 加速开始时间
  accelerationDuration: number; // 加速持续时间（2秒）
  lastSmokeTime: number; // 上次生成烟雾的时间（用于每0.15秒生成一次）
  // 手枪专属：最后一发子弹穿透标记
  isPistolLastBullet?: boolean; // 是否是手枪最后一发子弹（无限穿透，无伤害衰减）
  // 火箭筒专属Buff标记
  isRPGShockwave?: boolean; // 是否有冲击波Buff（爆炸击退敌人）
  isRPGAPShot?: boolean; // 是否有穿甲弹Buff（伤害+200%，范围-80%）
  isRPGDualBarrel?: boolean; // 是否有两联装Buff（两发连续发射）
  rpgScale?: number; // 火箭弹和烟雾的缩放比例（两联装为0.6）
}

interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image: string; // 图片路径
  collisionWidth: number; // 碰撞体积宽度（图片非透明部分）
  collisionHeight: number; // 碰撞体积高度（图片非透明部分）
}

// 敌人类型定义
type MonsterType = 1 | 2 | 3 | 4 | 5;  // 5 表示史莱姆王BOSS

// 敌人类型配置
const MONSTER_CONFIGS: Record<MonsterType, {
  name: string;
  size: number;
  baseSpeed: number;
  damage: number;  // 碰撞伤害
  hp: number;
  color: string;
  canShoot: boolean;
  shootInterval: number;
  bulletSpeed: number;
  bulletDamage: number;  // 子弹伤害（独立于碰撞伤害）
  bulletRange: number;
  goldBase: number; // 金币基数
  isBoss?: boolean; // 是否为BOSS
  attackInterval?: number; // BOSS攻击间隔（毫秒）
  canRangedAttack?: boolean; // 是否可以使用远程攻击
  rangedAttackInterval?: number; // 远程攻击间隔（毫秒）
  rangedAttackDistance?: number; // 远程攻击检测距离
  rangedAttackBulletSpeed?: number; // 远程攻击子弹速度
  rangedAttackBulletDamage?: number; // 远程攻击子弹伤害
  // BOSS落地攻击配置
  canJumpAttack?: boolean; // 是否可以使用落地攻击
  jumpAttackDetectInterval?: number; // 检测间隔（毫秒）
  jumpAttackDetectDistance?: number; // 检测距离
  jumpAttackLockDuration?: number; // 锁定持续时间（毫秒）
  jumpStartDuration?: number; // 起跳持续时间（毫秒）
  airborneDuration?: number; // 空中移动持续时间（毫秒）
  jumpAttackDamage?: number; // 落地伤害
  jumpAttackDamageRadius?: number; // 落地伤害半径
  jumpAttackRecoveryDuration?: number; // 硬直持续时间（毫秒）
}> = {
  1: {
    name: '标准敌人',
    size: 45,  // 提升到45（原30，因为贴图较小）
    baseSpeed: 1.1,  // 降低到55%（原2 → 1.4 → 1.1）
    damage: 10,
    hp: 16,  // 增加30%（原12）
    color: '#ef4444',
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 1,  // 金币基数
  },
  2: {
    name: '中型敌人',
    size: 40,  // 放大1倍（原20）
    baseSpeed: 0.6,  // 降低到60%（原1 → 0.7 → 0.6）
    damage: 15,
    hp: 33,  // 增加30%（原25）
    color: '#f59e0b',
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 1,  // 金币基数
  },
  3: {
    name: '大型敌人',
    size: 60,  // 放大1倍（原30）
    baseSpeed: 0.35,  // 降低到70%（原0.5）
    damage: 30,
    hp: 137,  // 增加30%后再增加50%（原70 → 91 → 137）
    color: '#7c3aed',
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 2,  // 金币基数
  },
  4: {
    name: '远程敌人',
    size: 40,  // 放大1倍（原20）
    baseSpeed: 0.7,  // 降低到70%（原1）
    damage: 5,  // 碰撞伤害（原10）
    hp: 33,  // 增加30%（原25）
    color: '#22c55e',
    canShoot: true,
    shootInterval: 5000,
    bulletSpeed: 1.3,  // 子弹速度
    bulletDamage: 2,  // 子弹伤害（独立）
    bulletRange: 500,
    goldBase: 2,  // 金币基数
  },
  5: {
    name: '史莱姆王',
    size: 120,  // BOSS大小改为120（原160）
    baseSpeed: 1.1,
    damage: 10,
    hp: 1560,  // 增加30%（原1200）
    color: '#ff0000',  // 红色
    canShoot: false,
    shootInterval: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    bulletRange: 0,
    goldBase: 50,  // 金币基数（会 × 关卡数）
    isBoss: true,  // 标识为BOSS
    attackInterval: 1000,  // 攻击间隔1秒
    canRangedAttack: true,  // 可以使用远程攻击
    rangedAttackInterval: 5000,  // 远程攻击间隔5秒
    rangedAttackDistance: 400,  // 远程攻击检测距离400px
    rangedAttackBulletSpeed: 1.5,  // 远程攻击子弹速度1.5
    rangedAttackBulletDamage: 2,  // 远程攻击子弹伤害2
    // BOSS落地攻击配置
    canJumpAttack: true,  // 可以使用落地攻击
    jumpAttackDetectInterval: 7000,  // 每7秒检测一次
    jumpAttackDetectDistance: 800,  // 检测范围800px
    jumpAttackLockDuration: 3000,  // 锁定时间3秒
    jumpStartDuration: 900,  // 起跳持续时间900毫秒
    airborneDuration: 1600,  // 空中移动持续时间1600毫秒
    jumpAttackDamage: 13,  // 落地伤害13点
    jumpAttackDamageRadius: 100,  // 落地伤害半径100px
    jumpAttackRecoveryDuration: 3000,  // 硬直时间3秒
  },
};

type UpgradeType = 'heal' | 'maxHp' | 'damage' | 'fireRate' | 'playerSpeed' | 'reloadTime' | 'magazineSize' | 'weaponRange' | 'critRate' | 'critDamage' | 'penetration' | 'knockback' | 'weapon_pistol' | 'weapon_shotgun' | 'weapon_sniper' | 'weapon_smg' | 'weapon_rpg' | 'weapon_upgrade' | 'gold_reward' | 'enemySlowdown' | 'bulletSpeed' | 'fireBuff' | 'poisonBuff' | 'pistol_last_bullet_penetrate' | 'pistol_final_strike' | 'rpg_shockwave' | 'rpg_ap_shot' | 'rpg_dual_barrel' | 'coinPickupRange' | 'energyAura' | 'executionBuff' | 'criticalRage' | 'vampire' | 'ammoSupply' | 'desperateFight';

interface Upgrade {
  id: UpgradeType;
  name: string;
  description: string;
  icon: string;
  weight?: number; // 权重，控制出现概率
  growthChainNode?: GrowthChainNodeId; // 如果是成长链节点升级，存储节点ID
}

const UPGRADES: Upgrade[] = [
  {
    id: 'maxHp',
    name: '血量上限',
    description: '血量上限 +10',
    icon: '/assets/shangxian.png',
    weight: 25,
  },
  {
    id: 'damage',
    name: '伤害加成',
    description: '当前武器伤害 +20%',
    icon: '/assets/shanghai.png',
    weight: 25,
  },
  {
    id: 'fireRate',
    name: '射速提升',
    description: '当前武器射速 +25%',
    icon: '/assets/shesu.png',
    weight: 25,
  },
  {
    id: 'playerSpeed',
    name: '移动速度',
    description: '玩家移动速度 +15%',
    icon: '/assets/yishu.png',
    weight: 20,
  },
  {
    id: 'reloadTime',
    name: '换弹速度',
    description: '换弹速度 +15%',
    icon: '/assets/huandan.png',
    weight: 20,
  },
  {
    id: 'magazineSize',
    name: '弹夹容量',
    description: '弹夹容量 +2',
    icon: '/assets/wuqishuxing.png',
    weight: 20,
  },
  {
    id: 'weaponRange',
    name: '武器射程',
    description: '当前武器射程 +20%',
    icon: '/assets/shecheng.png',
    weight: 20,
  },
  {
    id: 'critRate',
    name: '暴击率',
    description: '当前武器暴击率 +5%',
    icon: '/assets/baojilv.png',
    weight: 20,
  },
  {
    id: 'critDamage',
    name: '暴击伤害',
    description: '暴击伤害倍率 +10%',
    icon: '/assets/baojishanghai.png',
    weight: 15,
  },
  {
    id: 'penetration',
    name: '穿透力',
    description: '子弹可以穿透更多敌人',
    icon: '/assets/chuantou.png',
    weight: 15,
  },
  {
    id: 'weapon_pistol',
    name: '手枪',
    description: WEAPONS.pistol.description,
    icon: WEAPONS.pistol.showIcon,
    weight: 15,
  },
  {
    id: 'weapon_shotgun',
    name: '散弹枪',
    description: WEAPONS.shotgun.description,
    icon: WEAPONS.shotgun.showIcon,
    weight: 20,
  },
  {
    id: 'weapon_sniper',
    name: '狙击枪',
    description: WEAPONS.sniper.description,
    icon: WEAPONS.sniper.showIcon,
    weight: 20,
  },
  {
    id: 'weapon_smg',
    name: '冲锋枪',
    description: WEAPONS.smg.description,
    icon: WEAPONS.smg.showIcon,
    weight: 20,
  },
  {
    id: 'weapon_rpg',
    name: '火箭筒',
    description: WEAPONS.rpg.description,
    icon: WEAPONS.rpg.showIcon,
    weight: 15,
  },
];

// 商店商品类型定义
type ShopItemType = 'critDamage' | 'critRate' | 'magazineSize' | 'fireRate' | 'damage' | 'playerSpeed' | 'reloadTime' | 'weaponRange' | 'maxHp' | 'penetration' | 'knockback' | 'weapon_pistol' | 'weapon_smg' | 'weapon_sniper' | 'weapon_shotgun' | 'weapon_rpg' | 'bulletSpeed' | 'fireBuff' | 'poisonBuff' | 'pistol_last_bullet_penetrate' | 'pistol_final_strike' | 'rpg_shockwave' | 'rpg_ap_shot' | 'rpg_dual_barrel' | 'coinPickupRange' | 'energyAura' | 'executionBuff' | 'criticalRage' | 'vampire' | 'ammoSupply' | 'desperateFight';

interface ShopItem {
  id: string;
  type: ShopItemType;
  name: string;
  description: string;
  icon: string;
  value: number;
  price: number;
  growthChainNode?: GrowthChainNodeId; // 如果是成长链节点商品，存储节点ID
}

// 商店商品配置
const SHOP_ITEM_CONFIGS: Record<ShopItemType, {
  name: string;
  icon: string;
  basePrice: number;      // 基础价格
  levelPriceFactor: number; // 关卡系数（实际价格 = basePrice + levelPriceFactor × 关卡数）
  weight?: number; // 权重（可选）
  isPercentage: boolean;
  apply: (player: Player, value: number) => Player;
}> = {
  critDamage: {
    name: '暴击伤害',
    icon: '/assets/baojishanghai.png',
    basePrice: 12,
    levelPriceFactor: 8,
    isPercentage: true,
    apply: (player, value) => ({ ...player, critDamage: player.critDamage + value / 100, critDamageBonus: player.critDamageBonus + value }),
  },
  critRate: {
    name: '暴击率',
    icon: '/assets/baojilv.png',
    basePrice: 15,
    levelPriceFactor: 10,
    isPercentage: true,
    apply: (player, value) => ({ ...player, critRate: Math.min(1.0, player.critRate + value / 100), critRateBonus: player.critRateBonus + value }),
  },
  magazineSize: {
    name: '弹夹容量',
    icon: '/assets/wuqishuxing.png',
    basePrice: 15,
    levelPriceFactor: 15,
    isPercentage: false,
    apply: (player, value) => ({ 
      ...player, 
      magazineSizeBonus: player.magazineSizeBonus + value,
      currentAmmo: player.currentAmmo + value, // 同时也增加当前弹药
    }),
  },
  fireRate: {
    name: '射速',
    icon: '/assets/shesu.png',
    basePrice: 10,
    levelPriceFactor: 7,
    isPercentage: true,
    apply: (player, value) => ({ ...player, fireRate: Math.max(50, Math.floor(player.fireRate * (1 - (value * 0.3) / 100))), fireRateBonus: player.fireRateBonus + value }),
  },
  damage: {
    name: '伤害',
    icon: '/assets/shanghai.png',
    basePrice: 12,
    levelPriceFactor: 8,
    isPercentage: false,
    apply: (player, value) => ({ ...player, damage: player.damage + value, damageBonus: player.damageBonus + value }),
  },
  playerSpeed: {
    name: '移动速度',
    icon: '/assets/yishu.png',
    basePrice: 6,
    levelPriceFactor: 4,
    isPercentage: true,
    apply: (player, value) => {
      const newPlayer = { ...player, playerSpeed: player.playerSpeed + value / 10, playerSpeedBonus: player.playerSpeedBonus + value };
      return { ...newPlayer, playerSpeed: Math.min(newPlayer.playerSpeed, MAX_VALUES.playerSpeed) };
    },
  },
  reloadTime: {
    name: '换弹速度',
    icon: '/assets/huandan.png',
    basePrice: 10,
    levelPriceFactor: 7,
    isPercentage: true,
    apply: (player, value) => ({ ...player, reloadSpeedBonus: player.reloadSpeedBonus + value }),
  },
  weaponRange: {
    name: '射程',
    icon: '/assets/shecheng.png',
    basePrice: 5,
    levelPriceFactor: 2,
    isPercentage: true,
    apply: (player, value) => {
      const newPlayer = { ...player, weaponRange: player.weaponRange + value * 15, weaponRangeBonus: player.weaponRangeBonus + value };
      return { ...newPlayer, weaponRange: Math.min(newPlayer.weaponRange, MAX_VALUES.weaponRange) };
    },
  },
  maxHp: {
    name: '生命上限',
    icon: '/assets/shangxian.png',
    basePrice: 8,
    levelPriceFactor: 5,
    isPercentage: false,
    apply: (player, value) => ({ ...player, maxHp: player.maxHp + value, hp: player.hp + value, maxHpBonus: player.maxHpBonus + value }),
  },
  penetration: {
    name: '穿透力',
    icon: '/assets/chuantou.png',
    basePrice: 40,
    levelPriceFactor: 30,
    isPercentage: false,
    apply: (player, value) => {
      const newPlayer = { ...player, penetration: player.penetration + value, penetrationBonus: player.penetrationBonus + value };
      return { ...newPlayer, penetration: Math.min(newPlayer.penetration, MAX_VALUES.penetration) };
    },
  },
  knockback: {
    name: '击退',
    icon: '/assets/jitui.png',
    basePrice: 15,
    levelPriceFactor: 18,
    isPercentage: false,
    apply: (player, value) => {
      return { ...player, knockback: Math.min(player.knockback + value, MAX_VALUES.knockback) };
    },
  },
  weapon_pistol: {
    name: '手枪',
    icon: WEAPONS.pistol.showIcon,
    basePrice: 2,
    levelPriceFactor: 2,
    isPercentage: false,
    apply: (player, value) => acquireWeapon(player, 'pistol'),
  },
  weapon_smg: {
    name: '冲锋枪',
    icon: WEAPONS.smg.showIcon,
    basePrice: 10,
    levelPriceFactor: 2,
    isPercentage: false,
    apply: (player, value) => acquireWeapon(player, 'smg'),
  },
  weapon_sniper: {
    name: '狙击枪',
    icon: WEAPONS.sniper.showIcon,
    basePrice: 12,
    levelPriceFactor: 3,
    isPercentage: false,
    apply: (player, value) => acquireWeapon(player, 'sniper'),
  },
  weapon_shotgun: {
    name: '散弹枪',
    icon: WEAPONS.shotgun.showIcon,
    basePrice: 12,
    levelPriceFactor: 3,
    isPercentage: false,
    apply: (player, value) => acquireWeapon(player, 'shotgun'),
  },
  weapon_rpg: {
    name: '火箭筒',
    icon: WEAPONS.rpg.showIcon,
    basePrice: 12,
    levelPriceFactor: 3,
    isPercentage: false,
    apply: (player, value) => acquireWeapon(player, 'rpg'),
  },
  bulletSpeed: {
    name: '子弹速度',
    icon: '/assets/wuqishuxing.png',
    basePrice: 5,
    levelPriceFactor: 2,
    isPercentage: true,
    apply: (player, value) => ({ ...player, bulletSpeed: Math.floor(player.bulletSpeed * (1 + value / 100)) }),
  },
  fireBuff: {
    name: '引火',
    icon: '/assets/fire_buff.png',
    basePrice: 20,
    levelPriceFactor: 15,
    isPercentage: false,
    apply: (player, value) => ({ ...player, fireBuffLevel: player.fireBuffLevel + value }),
  },
  poisonBuff: {
    name: '淬毒',
    icon: '/assets/poison.png',
    basePrice: 20,
    levelPriceFactor: 15,
    isPercentage: false,
    apply: (player, value) => ({ ...player, poisonBuffLevel: player.poisonBuffLevel + value }),
  },
  coinPickupRange: {
    name: '金币拾取范围',
    icon: '/assets/coin.png',
    basePrice: 5,
    levelPriceFactor: 3,
    isPercentage: true,
    apply: (player, value) => ({ ...player, coinPickupRangeBonus: player.coinPickupRangeBonus + value }),
  },
  energyAura: {
    name: '能量气场',
    icon: '/assets/aura.png',
    basePrice: 25,
    levelPriceFactor: 20,
    isPercentage: false,
    apply: (player, value) => ({ ...player, energyAuraLevel: player.energyAuraLevel + value }),
  },
  executionBuff: {
    name: '处决',
    icon: '/assets/execution.png',
    basePrice: 0, // 特殊计算：10 + L^2
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: (player, value) => ({ ...player, executionLevel: player.executionLevel + value }),
  },
  criticalRage: {
    name: '暴怒',
    icon: '/assets/critical_rage.png',
    basePrice: 25, // 特殊计算: 25 + 1.5L
    levelPriceFactor: 0,
    weight: 100, // 特殊计算: 15*L, max=120
    isPercentage: false,
    apply: (player, value) => ({ ...player, criticalRageLevel: player.criticalRageLevel + value }),
  },
  vampire: {
    name: '吸血',
    icon: '/assets/vampire.png',
    basePrice: 0, // 特殊计算: 10 + 2L
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: (player, value) => ({ ...player, vampireLevel: player.vampireLevel + value }),
  },
  ammoSupply: {
    name: '弹药补充',
    icon: '/assets/ammo_supply.png',
    basePrice: 0, // 特殊计算: 10 + 2L
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: (player, value) => ({ ...player, ammoSupplyLevel: player.ammoSupplyLevel + value }),
  },
  desperateFight: {
    name: '险中取胜',
    icon: '/assets/desperate_fight.png',
    basePrice: 0, // 特殊计算: 20 + 3L
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: (player, value) => ({ ...player, desperateFightLevel: player.desperateFightLevel + value }),
  },
  pistol_last_bullet_penetrate: {
    name: '最后一弹',
    icon: '/assets/pistol_show.png',
    basePrice: 0, // 特殊计算: 3L+50（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: (player, value) => ({ ...player, /* 手枪专属buff不需要修改player字段，通过成长链节点检测即可 */ }),
  },
  pistol_final_strike: {
    name: '孤注一掷',
    icon: '/assets/pistol_final_strike.png',
    basePrice: 0, // 特殊计算: 180+10L（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: (player, value) => ({ ...player, /* 手枪专属buff不需要修改player字段，通过成长链节点检测即可 */ }),
  },
  rpg_shockwave: {
    name: '冲击波',
    icon: '/assets/RPG_show.png',
    basePrice: 0, // 特殊计算: 10L（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: (player, value) => ({ ...player, /* 火箭筒专属buff不需要修改player字段，通过成长链节点检测即可 */ }),
  },
  rpg_ap_shot: {
    name: '穿甲弹',
    icon: '/assets/RPG_show.png',
    basePrice: 0, // 特殊计算: 13L（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: (player, value) => ({ ...player, /* 火箭筒专属buff不需要修改player字段，通过成长链节点检测即可 */ }),
  },
  rpg_dual_barrel: {
    name: '两联装',
    icon: '/assets/RPG_show.png',
    basePrice: 0, // 特殊计算: 15L（由成长链系统处理）
    levelPriceFactor: 0,
    weight: 100,
    isPercentage: false,
    apply: (player, value) => ({ ...player, /* 火箭筒专属buff不需要修改player字段，通过成长链节点检测即可 */ }),
  },
};

// 成长链配置
const GROWTH_CHAIN_NODES: Record<GrowthChainNodeId, GrowthChainNode> = {
  // ========== 淬毒成长链 ==========
  // 第1段：需要淬毒buff解锁
  poison_circle_expand_1: {
    id: 'poison_circle_expand_1',
    name: '毒圈扩大I',
    description: '淬毒毒圈范围增大30%',
    baseBuff: 'poisonBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 8 * level + 10,
    icon: '/assets/poison.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'poison_circle_expand_1'] }),
  },
  poison_enhance_1: {
    id: 'poison_enhance_1',
    name: '毒性增强I',
    description: '中毒伤害增加30%，中毒持续时间增加2秒',
    baseBuff: 'poisonBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/poison.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'poison_enhance_1'] }),
  },
  // 第2段：需要1个第1段节点解锁
  poison_toxic_2: {
    id: 'poison_toxic_2',
    name: '剧毒II',
    description: '每次毒伤造成敌人剩余生命值10%的真实伤害（对BOSS为1%）',
    baseBuff: 'poisonBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: (level) => 50 + 2 * level,
    priceFormula: (level) => 20 * level,
    icon: '/assets/poison.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'poison_toxic_2'] }),
  },
  poison_infection_2: {
    id: 'poison_infection_2',
    name: '传染II',
    description: '中毒敌人每次受到中毒伤害时，有20%概率使距离100px内的另一个敌人中毒',
    baseBuff: 'poisonBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 30 + level * level,
    icon: '/assets/poison.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'poison_infection_2'] }),
  },
  poison_circle_expand_2: {
    id: 'poison_circle_expand_2',
    name: '毒圈扩大II',
    description: '淬毒毒圈扩大20%，毒圈持续时间增加30%',
    baseBuff: 'poisonBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 30 + level * level,
    icon: '/assets/poison.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'poison_circle_expand_2'] }),
  },
  poison_faster_2: {
    id: 'poison_faster_2',
    name: '剧毒III',
    description: '毒伤的频率由1秒触发一次改为0.7秒触发一次',
    baseBuff: 'poisonBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: (level) => 50 + 2 * level,
    priceFormula: (level) => 20 * level,
    icon: '/assets/poison.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'poison_faster_2'] }),
  },
  // 第3段：需要2个第2段节点解锁
  poison_absorb_3: {
    id: 'poison_absorb_3',
    name: '剧毒吸收I',
    description: '玩家站立在毒圈上时，每秒回复2点生命值',
    baseBuff: 'poisonBuff',
    tier: 3,
    requiredPrevTierCount: 2,
    weight: (level) => 50 + 2 * level,
    priceFormula: (level) => 40 * level,
    icon: '/assets/poison.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'poison_absorb_3'] }),
  },
  
  // ========== 手枪专属成长链 ==========
  pistol_last_penetration: {
    id: 'pistol_last_penetration',
    name: '最后一弹',
    description: '手枪的最后一发子弹可以穿透任何敌人（无限穿透，无伤害衰减）',
    baseBuff: 'pistol_last_bullet_penetrate',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 3 * level + 50,
    icon: '/assets/pistol_show.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'pistol_last_penetration'] }),
  },
  pistol_final_strike_chain: {
    id: 'pistol_final_strike_chain',
    name: '孤注一掷',
    description: '换弹时长+40%，但弹匣最后3发子弹伤害递增50%/100%/200%，且最后一发必定暴击+穿透所有敌人',
    baseBuff: 'pistol_final_strike',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: (level) => 100 + 10 * level,
    priceFormula: (level) => 180 + 10 * level,
    icon: '/assets/pistol_final_strike.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'pistol_final_strike_chain'] }),
  },
  
  // ========== 火箭筒专属成长链 ==========
  rpg_shockwave: {
    id: 'rpg_shockwave',
    name: '冲击波',
    description: '爆炸伤害会击退敌人，未死亡的敌人向反方向击退30px，并在1.5秒内减速70%',
    baseBuff: 'rpg_shockwave',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/RPG_show.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'rpg_shockwave'] }),
  },
  rpg_ap_shot: {
    id: 'rpg_ap_shot',
    name: '穿甲弹',
    description: '爆炸伤害增加200%，爆炸范围减少80%',
    baseBuff: 'rpg_ap_shot',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 13 * level,
    icon: '/assets/RPG_show.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'rpg_ap_shot'] }),
  },
  rpg_dual_barrel: {
    id: 'rpg_dual_barrel',
    name: '两联装',
    description: '弹夹数变为2，点击发射则在0.7秒内连续发射两发。每发爆炸范围为初始的70%，伤害为60%，美术资源大小为60%',
    baseBuff: 'rpg_dual_barrel',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 15 * level,
    icon: '/assets/RPG_show.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'rpg_dual_barrel'] }),
  },
  
  // ========== 引火成长链 ==========
  // T1 - 灼烧加速
  fire_burn_speed_1: {
    id: 'fire_burn_speed_1',
    name: '灼烧加速',
    description: '燃烧伤害频率从 1 秒/次 → 0.7 秒/次',
    baseBuff: 'fireBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 30 + 10 * level,
    icon: '/assets/fire_burn_speed.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'fire_burn_speed_1'] }),
  },
  // T1 - 焰痕范围
  fire_trail_range_1: {
    id: 'fire_trail_range_1',
    name: '焰痕范围',
    description: '火焰轨迹/区域半径 +30%',
    baseBuff: 'fireBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 + 20 * level,
    icon: '/assets/fire_trail_range.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'fire_trail_range_1'] }),
  },
  // T2 - 炎爆
  fire_blast_2: {
    id: 'fire_blast_2',
    name: '炎爆',
    description: '燃烧状态叠到 5 层时，触发一次小爆炸（50% 武器伤害，范围 60px）',
    baseBuff: 'fireBuff',
    tier: 2,
    requiredPrevTierCount: 2,
    weight: 100,
    priceFormula: (level) => 30 + 30 * level,
    icon: '/assets/fire_blast.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'fire_blast_2'] }),
  },
  // T2 - 余烬
  fire_ember_2: {
    id: 'fire_ember_2',
    name: '余烬',
    description: '敌人燃烧死亡时，有 30% 概率在原地留下一个小火苗（持续 3 秒，敌人踩中则触发一次燃烧伤害）',
    baseBuff: 'fireBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 + 20 * level,
    icon: '/assets/fire_ember.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'fire_ember_2'] }),
  },
  // T2 - 火焰穿透
  fire_penetrate_2: {
    id: 'fire_penetrate_2',
    name: '火焰穿透',
    description: '火焰伤害可以穿透敌人（对周围100px随机一个敌人造成 30% 燃烧伤害）',
    baseBuff: 'fireBuff',
    tier: 2,
    requiredPrevTierCount: 2,
    weight: 100,
    priceFormula: (level) => 30 + 30 * level,
    icon: '/assets/fire_penetrate.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'fire_penetrate_2'] }),
  },
  // T3 - 永恒之火
  fire_eternal_3: {
    id: 'fire_eternal_3',
    name: '永恒之火',
    description: '所有火焰效果基础伤害和持续时间翻倍',
    baseBuff: 'fireBuff',
    tier: 3,
    requiredPrevTierCount: 2,
    weight: 100,
    priceFormula: (level) => 50 + 50 * level,
    icon: '/assets/fire_eternal.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'fire_eternal_3'] }),
  },
  // 能量气场成长链
  energy_growth_1: {
    id: 'energy_growth_1',
    name: '能量气场成长I',
    description: '预留',
    baseBuff: 'energyAura',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/aura.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'energy_growth_1'] }),
  },
  energy_growth_2: {
    id: 'energy_growth_2',
    name: '能量气场成长II',
    description: '预留',
    baseBuff: 'energyAura',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/aura.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'energy_growth_2'] }),
  },
  // 处决成长链
  execution_growth_1: {
    id: 'execution_growth_1',
    name: '处决成长I',
    description: '预留',
    baseBuff: 'executionBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/execution.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'execution_growth_1'] }),
  },
  execution_growth_2: {
    id: 'execution_growth_2',
    name: '处决成长II',
    description: '预留',
    baseBuff: 'executionBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/execution.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'execution_growth_2'] }),
  },
  // 暴怒成长链
  critical_rage_growth_1: {
    id: 'critical_rage_growth_1',
    name: '暴怒成长I',
    description: '预留',
    baseBuff: 'criticalRage',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/critical_rage.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'critical_rage_growth_1'] }),
  },
  critical_rage_growth_2: {
    id: 'critical_rage_growth_2',
    name: '暴怒成长II',
    description: '预留',
    baseBuff: 'criticalRage',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/critical_rage.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'critical_rage_growth_2'] }),
  },
  // 吸血成长链
  vampire_growth_1: {
    id: 'vampire_growth_1',
    name: '吸血成长I',
    description: '预留',
    baseBuff: 'vampire',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/vampire.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'vampire_growth_1'] }),
  },
  vampire_growth_2: {
    id: 'vampire_growth_2',
    name: '吸血成长II',
    description: '预留',
    baseBuff: 'vampire',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/vampire.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'vampire_growth_2'] }),
  },
  // 弹药补充成长链
  ammo_supply_growth_1: {
    id: 'ammo_supply_growth_1',
    name: '弹药补充成长I',
    description: '预留',
    baseBuff: 'ammoSupply',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/ammo_supply.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'ammo_supply_growth_1'] }),
  },
  ammo_supply_growth_2: {
    id: 'ammo_supply_growth_2',
    name: '弹药补充成长II',
    description: '预留',
    baseBuff: 'ammoSupply',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/ammo_supply.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'ammo_supply_growth_2'] }),
  },
  // 险中取胜成长链
  desperate_fight_growth_1: {
    id: 'desperate_fight_growth_1',
    name: '险中取胜成长I',
    description: '预留',
    baseBuff: 'desperateFight',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/desperate_fight.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'desperate_fight_growth_1'] }),
  },
  desperate_fight_growth_2: {
    id: 'desperate_fight_growth_2',
    name: '险中取胜成长II',
    description: '预留',
    baseBuff: 'desperateFight',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/desperate_fight.png',
    apply: (player) => ({ ...player, growthChainNodes: [...player.growthChainNodes, 'desperate_fight_growth_2'] }),
  },
};

// 辅助函数：检查玩家是否拥有特定成长链节点
const hasGrowthChainNode = (player: Player, nodeId: GrowthChainNodeId): boolean => {
  return player.growthChainNodes.includes(nodeId);
};

// 辅助函数：获取玩家在某个buff的特定段位的节点数量
const getGrowthChainTierCount = (player: Player, baseBuff: SpecialRewardType, tier: number): number => {
  return player.growthChainNodes.filter(nodeId => {
    const node = GROWTH_CHAIN_NODES[nodeId];
    return node && node.baseBuff === baseBuff && node.tier === tier;
  }).length;
};

// 辅助函数：检查成长链节点是否解锁（可以出现在商店/升级中）
const isGrowthChainNodeUnlocked = (player: Player, nodeId: GrowthChainNodeId): boolean => {
  const node = GROWTH_CHAIN_NODES[nodeId];
  if (!node) return false;
  
  // 检查是否已拥有
  if (hasGrowthChainNode(player, nodeId)) return false;
  
  // 检查是否拥有基础buff
  const baseBuffLevelMap: Record<SpecialRewardType, number> = {
    'penetration': player.penetration,
    'fireBuff': player.fireBuffLevel,
    'poisonBuff': player.poisonBuffLevel,
    'energyAura': player.energyAuraLevel,
    'executionBuff': player.executionLevel,
    'criticalRage': player.criticalRageLevel,
    'vampire': player.vampireLevel,
    'ammoSupply': player.ammoSupplyLevel,
    'desperateFight': player.desperateFightLevel,
    'pistol_last_bullet_penetrate': player.weapon === 'pistol' ? 1 : 0,
    'pistol_final_strike': player.weapon === 'pistol' ? 1 : 0,
    'rpg_shockwave': player.weapon === 'rpg' ? 1 : 0,
    'rpg_ap_shot': player.weapon === 'rpg' ? 1 : 0,
    'rpg_dual_barrel': player.weapon === 'rpg' ? 1 : 0,
    'weapon_pistol': player.weapons.includes('pistol') ? 1 : 0,
    'weapon_smg': player.weapons.includes('smg') ? 1 : 0,
    'weapon_sniper': player.weapons.includes('sniper') ? 1 : 0,
    'weapon_shotgun': player.weapons.includes('shotgun') ? 1 : 0,
    'weapon_rpg': player.weapons.includes('rpg') ? 1 : 0,
  };
  
  const baseBuffLevel = baseBuffLevelMap[node.baseBuff] ?? 0;
  if (baseBuffLevel <= 0) return false;
  
  // 第1段：只需要基础buff
  if (node.tier === 1) return true;
  
  // 第2段及以上：需要前一段足够的节点数量
  const prevTierCount = getGrowthChainTierCount(player, node.baseBuff, node.tier - 1);
  return prevTierCount >= node.requiredPrevTierCount;
};

// 辅助函数：检查基础buff是否应该从商店/升级池中移除（已获得后）
const shouldRemoveBaseBuffFromPool = (player: Player, buffType: SpecialRewardType): boolean => {
  const buffLevelMap: Record<SpecialRewardType, number> = {
    'penetration': player.penetration,
    'fireBuff': player.fireBuffLevel,
    'poisonBuff': player.poisonBuffLevel,
    'energyAura': player.energyAuraLevel,
    'executionBuff': player.executionLevel,
    'criticalRage': player.criticalRageLevel,
    'vampire': player.vampireLevel,
    'ammoSupply': player.ammoSupplyLevel,
    'desperateFight': player.desperateFightLevel,
    'pistol_last_bullet_penetrate': player.weapon === 'pistol' ? 1 : 0,
    'pistol_final_strike': player.weapon === 'pistol' ? 1 : 0,
    'rpg_shockwave': player.weapon === 'rpg' ? 1 : 0,
    'rpg_ap_shot': player.weapon === 'rpg' ? 1 : 0,
    'rpg_dual_barrel': player.weapon === 'rpg' ? 1 : 0,
    'weapon_pistol': player.weapons.includes('pistol') ? 1 : 0,
    'weapon_smg': player.weapons.includes('smg') ? 1 : 0,
    'weapon_sniper': player.weapons.includes('sniper') ? 1 : 0,
    'weapon_shotgun': player.weapons.includes('shotgun') ? 1 : 0,
    'weapon_rpg': player.weapons.includes('rpg') ? 1 : 0,
  };
  
  // 只对非武器类型的buff应用成长链规则
  const nonWeaponBuffs: SpecialRewardType[] = ['penetration', 'fireBuff', 'poisonBuff', 'energyAura', 'executionBuff', 'criticalRage', 'vampire', 'ammoSupply', 'desperateFight', 'pistol_last_bullet_penetrate', 'pistol_final_strike', 'rpg_shockwave', 'rpg_ap_shot', 'rpg_dual_barrel'];
  if (!nonWeaponBuffs.includes(buffType)) return false;
  
  return (buffLevelMap[buffType] ?? 0) > 0;
};

// ========== 淬毒成长链辅助函数 ==========
// 计算毒圈半径（应用成长链加成）
const getPoisonCircleRadius = (player: Player, baseRadius: number): number => {
  let radius = baseRadius;
  // 毒圈扩大I: +30%
  if (hasGrowthChainNode(player, 'poison_circle_expand_1')) {
    radius *= 1.3;
  }
  // 毒圈扩大II: +20%
  if (hasGrowthChainNode(player, 'poison_circle_expand_2')) {
    radius *= 1.2;
  }
  return radius;
};

// 计算毒圈持续时间（应用成长链加成）
const getPoisonCircleDuration = (player: Player, baseDuration: number): number => {
  let duration = baseDuration;
  // 毒圈扩大II: +30%
  if (hasGrowthChainNode(player, 'poison_circle_expand_2')) {
    duration *= 1.3;
  }
  return duration;
};

// 计算中毒伤害（应用成长链加成）
const getPoisonDamage = (player: Player, baseDamage: number): number => {
  let damage = baseDamage;
  // 毒性增强I: +30%
  if (hasGrowthChainNode(player, 'poison_enhance_1')) {
    damage *= 1.3;
  }
  return damage;
};

// 计算中毒持续时间（应用成长链加成）
const getPoisonDuration = (player: Player, baseDuration: number): number => {
  let duration = baseDuration;
  // 毒性增强I: +2秒
  if (hasGrowthChainNode(player, 'poison_enhance_1')) {
    duration += 2000;
  }
  return duration;
};

// 计算中毒伤害间隔（应用成长链加成）
const getPoisonTickInterval = (player: Player): number => {
  // 剧毒III: 从1秒改为0.7秒
  if (hasGrowthChainNode(player, 'poison_faster_2')) {
    return 700;
  }
  return 1000;
};

// 计算真实伤害（剧毒II效果）
const getPoisonTrueDamage = (player: Player, monster: Monster): number => {
  if (!hasGrowthChainNode(player, 'poison_toxic_2')) return 0;
  
  const hpPercent = monster.hp / monster.maxHp;
  // 对BOSS为1%，其他敌人为10%
  const percent = monster.isBoss ? 0.01 : 0.1;
  return Math.floor(monster.hp * percent);
};

// 检查是否触发传染（传染II效果）
const shouldPoisonInfect = (player: Player): boolean => {
  if (!hasGrowthChainNode(player, 'poison_infection_2')) return false;
  return Math.random() < 0.2; // 20%概率
};

// 检查玩家是否在毒圈内并计算回复（剧毒吸收I效果）
const checkPoisonCircleHeal = (player: Player, poisonCircles: PoisonCircle[]): number => {
  if (!hasGrowthChainNode(player, 'poison_absorb_3')) return 0;
  
  for (const circle of poisonCircles) {
    const dist = Math.sqrt(
      Math.pow(player.x - circle.x, 2) + 
      Math.pow(player.y - circle.y, 2)
    );
    if (dist <= circle.radius) {
      return 2; // 每秒回复2点生命值
    }
  }
  return 0;
};

// 商品数值档位
type ValueTier = { 
  value: number | ((level: number) => number); 
  weightFormula: (level: number) => number 
};

const VALUE_TIERS: ValueTier[] = [
  { value: (level: number) => Math.floor(1 + level / 2), weightFormula: (level: number) => 100 },
  { value: (level: number) => Math.floor(5 + level / 1.5), weightFormula: (level: number) => 30 + level * 2 },
  { value: (level: number) => Math.floor(10 + level / 1.2), weightFormula: (level: number) => 10 + level * 2 },
  { value: (level: number) => Math.floor(level * 2), weightFormula: (level: number) => 10 + level },
];

export default function TopDownShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const levelCompleteTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // 游戏状态
  const [gameState, setGameState] = useState<'menu' | 'weaponSelect' | 'playing' | 'paused' | 'upgrade' | 'shop' | 'gameover'>('menu');
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [lockedItems, setLockedItems] = useState<ShopItem[]>([]);
  const [shopRefreshCount, setShopRefreshCount] = useState(0);
  const [shopRefreshPrice, setShopRefreshPrice] = useState(0);
  const [upgradeRefreshCount, setUpgradeRefreshCount] = useState(0);
  const playerRef = useRef<Player | null>(null); // 使用 ref 存储当前玩家状态
  const [player, setPlayer] = useState<Player>({
    x: GAME_CONFIG.CANVAS_WIDTH / 2,
    y: GAME_CONFIG.CANVAS_HEIGHT / 2,
    hp: GAME_CONFIG.PLAYER_MAX_HP,
    maxHp: GAME_CONFIG.PLAYER_MAX_HP,
    damage: 4, // 初始伤害（再降50%，从8降到4）
    fireRate: 360, // 初始射速下调20%（原300，即射速变慢）
    lastShot: 0,
    weapon: 'pistol',
    weaponLevel: 1,
    isHit: false,
    hitTime: 0,
    playerSpeed: 1, // 初始速度
    enemySpeedMultiplier: 1.0,
    weaponRange: WEAPONS.pistol.bulletRange,
    bulletSpeed: 2.5,
    critRate: WEAPONS.pistol.critRate, // 初始暴击率（使用武器配置）
    critDamage: 1.5, // 初始暴击伤害倍率（150%）
    penetration: 0, // 初始穿透力（0表示只能击中1个敌人）
    currentAmmo: WEAPONS.pistol.magazineSize, // 当前弹匣子弹数
    weapons: ['pistol'], // 初始武器列表
    currentWeaponIndex: 0, // 当前武器索引
    weaponAmmo: { pistol: WEAPONS.pistol.magazineSize }, // 武器弹药记录
    isReloading: false, // 是否正在换弹
    reloadStartTime: 0, // 换弹开始时间
    reloadInterrupted: false, // 换弹是否被中断（仅用于散弹枪一发一发装填）
    lastHitMonsterId: null,
    lastHitMonsterTime: 0,
    gold: 0, // 金币数量
    magazineSizeBonus: 0, // 弹夹容量加成
    reloadSpeedBonus: 0, // 换弹速度加成百分比
    // 加成记录字段
    damageBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    fireRateBonus: 0,
    playerSpeedBonus: 0,
    weaponRangeBonus: 0,
    maxHpBonus: 0,
    penetrationBonus: 0,
    // 动画相关字段
    facingDirection: 'left', // 面朝方向（初始朝左）
    isMoving: false, // 是否正在移动
    lastMoveTime: 0, // 最后一次移动的时间戳
    animationStartTime: 0, // 动画开始时间
    // 引火buff相关
    fireBuffLevel: 0, // 引火等级
    // 淬毒buff相关
    poisonBuffLevel: 0, // 淬毒等级
    coinPickupRangeBonus: 0, // 金币拾取范围加成
    // 能量气场相关
    energyAuraLevel: 0, // 能量气场等级
    lastEnergyAuraShockwaveTime: 0, // 上次冲击波发射时间
    // 处决buff相关
    executionLevel: 0, // 处决等级
    // 暴怒buff相关
    criticalRageLevel: 0, // 暴怒等级
    vampireLevel: 0, // 吸血等级
    ammoSupplyLevel: 0, // 弹药补充等级
    desperateFightLevel: 0, // 险中取胜等级
    knockback: 0, // 击退值
    growthChainNodes: [], // 成长链节点
    weaponInstances: {}, // 已拥有武器的随机属性实例
    // 武器切换相关
    isSwitchingWeapon: false, // 是否正在切换武器
    weaponSwitchStartTime: 0, // 武器切换开始时间
  });
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [poisonCircles, setPoisonCircles] = useState<PoisonCircle[]>([]); // 毒圈列表
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<EnemyBullet[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [goldFloatingTexts, setGoldFloatingTexts] = useState<GoldFloatingText[]>([]);  // 金币获取弹字
  const [explosionEffects, setExplosionEffects] = useState<ExplosionEffect[]>([]);  // 爆炸效果列表
  const [smokeEffects, setSmokeEffects] = useState<SmokeEffect[]>([]);  // 烟雾效果列表
  const [vampireHealEffects, setVampireHealEffects] = useState<VampireHealEffect[]>([]);  // 吸血回复效果列表
  const [affixExplosionParticles, setAffixExplosionParticles] = useState<AffixExplosionParticle[]>([]);  // 词缀爆炸粒子列表
  const [pierceEffects, setPierceEffects] = useState<PierceEffect[]>([]);  // 子弹穿透光效列表
  const [playerHitParticles, setPlayerHitParticles] = useState<PlayerHitParticle[]>([]);  // 玩家受击蓝色粒子列表
  const [bossBarrages, setBossBarrages] = useState<BossBarrage[]>([]);  // BOSS砸地旋转弹幕列表
  const [accumulatedDamage, setAccumulatedDamage] = useState<Map<string, { damage: number; isCrit: boolean; isDoubleCrit: boolean; lastTime: number; x: number; y: number }>>(new Map());
  const [level, setLevel] = useState(1);
  const [monstersRemaining, setMonstersRemaining] = useState(0);
  const [levelCompletionTriggered, setLevelCompletionTriggered] = useState(false);  // 防止关卡完成重复触发
  
  // 分批敌人生成相关状态
  const [pendingMonsterBatches, setPendingMonsterBatches] = useState<Monster[][]>([]);  // 待生成的敌人批次
  const [currentBatchInitialCount, setCurrentBatchInitialCount] = useState(0);  // 当前批次初始敌人数量
  const [nextBatchTime, setNextBatchTime] = useState<number | null>(null);  // 下一批生成时间
  const [totalMonstersToSpawn, setTotalMonstersToSpawn] = useState(0);  // 总共需要生成的敌人数量
  const [thisLevelWaveTotal, setThisLevelWaveTotal] = useState(0);  // 本关总波次数
  const [waveTransition, setWaveTransition] = useState<{ startTime: number; waveNumber: number; enemyCount: number } | null>(null);  // 波次衔接状态（公告+倒计时）
  
  const [bossAlive, setBossAlive] = useState(false);  // BOSS是否存活
  const [bossCurrentHp, setBossCurrentHp] = useState(1200);  // BOSS当前血量
  const [bossMaxHp, setBossMaxHp] = useState(1200);  // BOSS最大血量
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);  // 最高分数
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // 是否暂停
  const [showInfoPopup, setShowInfoPopup] = useState(false); // 显示信息弹窗
  const [showSettings, setShowSettings] = useState(false); // 显示设置弹窗
  const [showBuffPreview, setShowBuffPreview] = useState(false); // 显示buff预览弹窗
  const [coinImage, setCoinImage] = useState<HTMLImageElement | null>(null);
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
  const [boss2Image, setBoss2Image] = useState<HTMLImageElement | null>(null);  // BOSS跳跃动画
  const [bossFireBallImage, setBossFireBallImage] = useState<HTMLImageElement | null>(null);  // BOSS火球序列帧
  const DASH_COOLDOWN_MS = 5000;
  const NORMAL_MOVE_PPM = 0.017; // 玩家正常移速（px/ms），作为闪现曲线末速约束
  const dashRef = useRef<{ active: boolean; startTime: number; fromX: number; fromY: number; dirX: number; dirY: number; recoveryStart: number }>({ active: false, startTime: 0, fromX: 0, fromY: 0, dirX: 0, dirY: 0, recoveryStart: 0 });
  // 闪现技能冷却相关（5秒冷却 + 起始可立即使用）
  const [dashCooldown, setDashCooldown] = useState(0);
  const dashCooldownStartRef = useRef(0);
  // 摄像机带阻尼滞后跟随配置
  const CAMERA_FOLLOW_CONFIG = {
    TAU: 0.15,              // 时间常数（秒）：约0.25s基本追上
    DEAD_ZONE_RADIUS: 40,   // 死区半径（px）：玩家在中心40px内时镜头完全静止
    LAG_LIMIT_RATIO: 0.15,  // 滞后上限：与玩家距离超过屏幕宽度15%时线性提升跟随速度
    LAG_CATCHUP_TIME: 0.1,  // 超限部分追赶时间常数（秒）
    HOME_TAU: 0.2,          // 停止移动后目标点归位时间常数（秒），约0.4s基本回到居中
  };
  const cameraPosRef = useRef({ x: 0, y: 0 });       // 相机跟随点（镜头中心）
  const cameraTargetRef = useRef({ x: 0, y: 0 });    // 死区推动目标点
  const playerPrevPosRef = useRef({ x: 0, y: 0 });   // 上一帧玩家位置（判定移动/静止）
  const cameraInitRef = useRef(false);               // 相机是否已初始化对齐
const dashPendingRef = useRef(false); // 玩家闪现技能
  const baseTransformRef = useRef<DOMMatrix | null>(null); // 屏幕基准变换（用于 HUD 脱离摄像机）
  const [rangeImage, setRangeImage] = useState<HTMLImageElement | null>(null);  // 锁定范围图标
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [enemy_1Image, setEnemy_1Image] = useState<HTMLImageElement | null>(null);
  const [enemy_2Image, setEnemy_2Image] = useState<HTMLImageElement | null>(null);
  const [enemy_3Image, setEnemy_3Image] = useState<HTMLImageElement | null>(null);
  const [enemy_4_1Image, setEnemy_4_1Image] = useState<HTMLImageElement | null>(null);  // 敌人4_1（不射击动画）
  const [enemy_4_2Image, setEnemy_4_2Image] = useState<HTMLImageElement | null>(null);  // 敌人4_2（射击动画）
  const [arrowImage, setArrowImage] = useState<HTMLImageElement | null>(null);  // 箭头指示器
  const [pauseImage, setPauseImage] = useState<HTMLImageElement | null>(null);  // 暂停按钮
  const [startImage, setStartImage] = useState<HTMLImageElement | null>(null);  // 开始按钮
  const [chestImage, setChestImage] = useState<HTMLImageElement | null>(null);  // 宝箱图片
  const [ballImage, setBallImage] = useState<HTMLImageElement | null>(null);  // 子弹图片
  const [pistolShowImage, setPistolShowImage] = useState<HTMLImageElement | null>(null);  // 手枪展示图
  const [shotgunShowImage, setShotgunShowImage] = useState<HTMLImageElement | null>(null);  // 散弹枪展示图
  const [smgShowImage, setSmgShowImage] = useState<HTMLImageElement | null>(null);  // 冲锋枪展示图
  const [sniperShowImage, setSniperShowImage] = useState<HTMLImageElement | null>(null);  // 狙击枪展示图
  const [rpgImage, setRpgImage] = useState<HTMLImageElement | null>(null);  // 火箭筒战斗图片
  const [rpgShowImage, setRpgShowImage] = useState<HTMLImageElement | null>(null);  // 火箭筒展示图
  const [boomImage, setBoomImage] = useState<HTMLImageElement | null>(null);  // 爆炸序列帧图片
  const [hpGreenImage, setHpGreenImage] = useState<HTMLImageElement | null>(null);  // 血量格子-绿色
  const [hpYellowImage, setHpYellowImage] = useState<HTMLImageElement | null>(null);  // 血量格子-黄色
  const [hpRedImage, setHpRedImage] = useState<HTMLImageElement | null>(null);  // 血量格子-红色
  const [hpBarImage, setHpBarImage] = useState<HTMLImageElement | null>(null);  // 血量条底图
  const [weaponUpgradeBoxImage, setWeaponUpgradeBoxImage] = useState<HTMLImageElement | null>(null);  // 武器属性加成箱
  const [healthPotionImage, setHealthPotionImage] = useState<HTMLImageElement | null>(null);  // 治疗瓶
  
  // 障碍物图片
  const [obstacleImages, setObstacleImages] = useState<HTMLImageElement[]>([]);
  
  // 地块图片（用于地图地面平铺）
  const [tileImages, setTileImages] = useState<HTMLImageElement[]>([]);
  
  // 地图背景canvas（预先渲染的地图背景）
  const mapBackgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 图片加载版本号，用于强制重新加载图片
  const [imageVersion, setImageVersion] = useState(15);  // 从15开始，确保重新加载
  
  // 使用 ref 存储枪火动画和后坐力，避免频繁 setState 导致卡顿
  const muzzleFlashesRef = useRef<MuzzleFlash[]>([]);
  const recoilRef = useRef({
    backward: 0,  // 后坐力后退距离
    upward: 0,    // 后坐力上跳角度
    shake: 0,     // 晃动强度
  });
  
  // 震屏强度（像素偏移幅度），用于爆炸等打击感表现
  const screenShakeRef = useRef(0);
  
  // 同步更新 playerRef
  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  
  // 音效系统
  const { play: playSound, playBGM, stopBGM, isMuted, toggleMute, volume, setVolume } = useSound();
  
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
    if (gameState === 'gameover') {
      if (score > highScore) {
        setHighScore(score);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dungeonGameHighScore', score.toString());
        }
      }
    }
  }, [gameState, score, highScore]);
  
  // 加载所有游戏美术素材
  useEffect(() => {
    // 定义所有需要加载的资源
    const resources = [
      // 金币图片
      { key: 'coin', src: `/assets/coin.png?v=${imageVersion}`, setter: setCoinImage },
      // 子弹图片
      { key: 'bullet', src: `/assets/bullet.png?v=${imageVersion}`, setter: setBulletImage },
      // 烟雾图片
      { key: 'smoke', src: `/assets/smoke.png?v=${imageVersion}`, setter: setSmokeImage },
      // 枪械图片
      { key: 'pistol', src: `/assets/pistol.png?v=${imageVersion}`, setter: setPistolImage },
      { key: 'shotgun', src: `/assets/shotgun.png?v=${imageVersion}`, setter: setShotgunImage },
      { key: 'smg', src: `/assets/smg.png?v=${imageVersion}`, setter: setSmgImage },
      { key: 'sniper', src: `/assets/sniper.png?v=${imageVersion}`, setter: setSniperImage },
      // 枪火精灵表
      { key: 'fire', src: `/assets/fire.png?v=${imageVersion}`, setter: setFireImage },
      // BOSS精灵表
      { key: 'boss', src: `/assets/boss_1.png?v=${imageVersion}`, setter: setBossImage },
      { key: 'boss2', src: `/assets/boss_2.png?v=${imageVersion}`, setter: setBoss2Image },
      // BOSS火球序列帧
      { key: 'bossFireBall', src: `/assets/bossFireBall.png?v=${imageVersion}`, setter: setBossFireBallImage },
      // 锁定范围图标
      { key: 'range', src: `/assets/range.png?v=${imageVersion}`, setter: setRangeImage },
      // 敌人精灵表
      { key: 'enemy_1', src: `/assets/enemy_1.png?v=${imageVersion}`, setter: setEnemy_1Image },
      { key: 'enemy_2', src: `/assets/enemy_2.png?v=${imageVersion}`, setter: setEnemy_2Image },
      { key: 'enemy_3', src: `/assets/enemy_3.png?v=${imageVersion}`, setter: setEnemy_3Image },
      { key: 'enemy_4_1', src: `/assets/enemy_4_1.png?v=${imageVersion}`, setter: setEnemy_4_1Image },
      { key: 'enemy_4_2', src: `/assets/enemy_4_2.png?v=${imageVersion}`, setter: setEnemy_4_2Image },
      // 箭头指示器图片
      { key: 'arrow', src: `/assets/arrow.png?v=${imageVersion}`, setter: setArrowImage },
      // 暂停按钮图片
      { key: 'pause', src: `/assets/pause.png?v=${imageVersion}`, setter: setPauseImage },
      // 开始按钮图片
      { key: 'start', src: `/assets/start.png?v=${imageVersion}`, setter: setStartImage },
      // 宝箱图片
      { key: 'chest', src: `/chest.png?v=${imageVersion}`, setter: setChestImage },
      // 子弹图片（敌人子弹）
      { key: 'ball', src: `/assets/ball.png?v=${imageVersion}`, setter: setBallImage },
      // 武器展示图片
      { key: 'pistolShow', src: `/assets/pistol_show.png?v=${imageVersion}`, setter: setPistolShowImage },
      { key: 'shotgunShow', src: `/assets/shotgun_show.png?v=${imageVersion}`, setter: setShotgunShowImage },
      { key: 'smgShow', src: `/assets/smg_show.png?v=${imageVersion}`, setter: setSmgShowImage },
      { key: 'sniperShow', src: `/assets/sniper_show.png?v=${imageVersion}`, setter: setSniperShowImage },
      // 火箭筒相关图片
      { key: 'rpg', src: `/assets/RPG.png?v=${imageVersion}`, setter: setRpgImage },
      { key: 'rpgShow', src: `/assets/RPG_show.png?v=${imageVersion}`, setter: setRpgShowImage },
      // 爆炸序列帧图片
      { key: 'boom', src: `/assets/bomb.png?v=${imageVersion}`, setter: setBoomImage },
      // 血量格子图片
      { key: 'hpGreen', src: `/assets/HP_green.png?v=${imageVersion}`, setter: setHpGreenImage },
      { key: 'hpYellow', src: `/assets/HP_yellow.png?v=${imageVersion}`, setter: setHpYellowImage },
      { key: 'hpRed', src: `/assets/HP_red.png?v=${imageVersion}`, setter: setHpRedImage },
      // 血量条底图
      { key: 'hpBar', src: `/assets/HPbar.png?v=${imageVersion}`, setter: setHpBarImage },
      // 武器属性加成箱
      { key: 'weaponUpgradeBox', src: `/assets/wuqishuxing.png?v=${imageVersion}`, setter: setWeaponUpgradeBoxImage },
      // 治疗瓶
      { key: 'healthPotion', src: `/assets/huifu.png?v=${imageVersion}`, setter: setHealthPotionImage },
      // 障碍物图片
      { key: 'obstacle_1', src: `/assets/obstacle_1.png?v=${imageVersion}`, type: 'obstacle' },
      { key: 'obstacle_2', src: `/assets/obstacle_2.png?v=${imageVersion}`, type: 'obstacle' },
      { key: 'obstacle_3', src: `/assets/obstacle_3.png?v=${imageVersion}`, type: 'obstacle' },
      { key: 'obstacle_4', src: `/assets/Obstacle_4.png?v=${imageVersion}`, type: 'obstacle' },
      { key: 'obstacle_5', src: `/assets/obstacle_5.png?v=${imageVersion}`, type: 'obstacle' },
      // 火箭弹图片
      { key: 'rocket', src: `/assets/Rocket.png?v=${imageVersion}`, setter: setRocketImage },
      // 玩家图片
      { key: 'playerIdle', src: `/assets/player_1.png?v=${imageVersion}`, setter: setPlayerIdleImage },
      { key: 'playerWalk', src: `/assets/player_2.png?v=${imageVersion}`, setter: setPlayerWalkImage },
      { key: 'playerDash', src: `/assets/player_3.png?v=${imageVersion}`, setter: setPlayerDashImage },
      { key: 'skillIcon', src: `/assets/shanxian.png?v=${imageVersion}`, setter: setSkillIconImage },
      // 背景图片
      { key: 'bg', src: `/assets/bg.png?v=${imageVersion}`, setter: setBgImage },
      // 地块图片
      { key: 'tile1', src: `/assets/tile1.png?v=${imageVersion}`, type: 'tile' },
      { key: 'tile2', src: `/assets/tile2.png?v=${imageVersion}`, type: 'tile' },
      { key: 'tile3', src: `/assets/tile3.png?v=${imageVersion}`, type: 'tile' },
      { key: 'tile4', src: `/assets/tile4.png?v=${imageVersion}`, type: 'tile' },
      { key: 'tile5', src: `/assets/tile5.png?v=${imageVersion}`, type: 'tile' },
    ];

    const totalResources = resources.length;
    let loadedCount = 0;
    const obstacleImagesArray: HTMLImageElement[] = [];
    const tileImagesArray: HTMLImageElement[] = [];

    // 更新进度函数
    const updateProgress = () => {
      loadedCount++;
      const progress = Math.round((loadedCount / totalResources) * 100);
      setLoadProgress(progress);
    };

    // 加载单个图片资源
    const loadResource = (resource: any): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = resource.src;
        
        img.onload = () => {
          console.log(`${resource.key} loaded`);
          
          // 根据资源类型处理
          if (resource.type === 'obstacle') {
            obstacleImagesArray.push(img);
          } else if (resource.type === 'tile') {
            const tileIndex = parseInt(resource.key.replace('tile', '')) - 1;
            tileImagesArray[tileIndex] = img;
          } else if (resource.setter) {
            resource.setter(img);
          }
          
          updateProgress();
          resolve();
        };
        
        img.onerror = () => {
          console.error(`Failed to load ${resource.key}`);
          updateProgress();
          resolve(); // 即使失败也继续
        };
      });
    };

    // 并行加载所有资源
    const loadAllResources = async () => {
      await Promise.all(resources.map(loadResource));
      
      // 批量设置数组类型的资源
      if (obstacleImagesArray.length > 0) {
        setObstacleImages(obstacleImagesArray);
      }
      if (tileImagesArray.length === 5) {
        setTileImages(tileImagesArray);
      }
      
      // 所有资源加载完成
      setIsLoading(false);
    };

    loadAllResources();
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
    
    console.log(`Tiling: ${tilesX} columns x ${tilesY} rows (original tile: ${tileWidth}x${tileHeight}, scaled: ${Math.floor(tileWidth/6)}x${Math.floor(tileHeight/6)})`);
    
    // 随机平铺地块（缩小为原来的1/6）
    const scaledTileWidth = tileWidth / 6;
    const scaledTileHeight = tileHeight / 6;
    
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        // 随机选择一个地块图片
        const tileIndex = Math.floor(Math.random() * tileImages.length);
        const tileImage = tileImages[tileIndex];
        
        if (tileImage) {
          // 绘制时使用缩小后的尺寸，保持长宽比例
          ctx.drawImage(
            tileImage,
            x * scaledTileWidth,  // 目标X位置
            y * scaledTileHeight, // 目标Y位置
            scaledTileWidth,      // 目标宽度（原始的1/6）
            scaledTileHeight      // 目标高度（原始的1/6）
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
      setImageVersion(prev => prev + 1);
    }, 1000); // 1秒后更新版本号
    
    return () => clearTimeout(timer);
  }, []);
  
  // 获取当前武器的图片
  const getWeaponImage = useCallback(() => {
    switch (player.weapon) {
      case 'pistol': return pistolImage;
      case 'shotgun': return shotgunImage;
      case 'smg': return smgImage;
      case 'sniper': return sniperImage;
      case 'rpg': return rpgImage;
      default: return pistolImage;
    }
  }, [player.weapon, pistolImage, shotgunImage, smgImage, sniperImage, rpgImage]);
  
  // 随机选择升级选项（根据关卡动态计算权重和数值）
  const selectRandomUpgrades = useCallback((currentWeapon: WeaponType, currentLevel: number, currentPlayer: Player) => {
    // 根据关卡计算每个升级的权重和数值
    const dynamicUpgrades: Upgrade[] = [];
    
    // 基础伤害：+12%×(1+0.04L)，权重100，贯穿全场的基础
    const damageBonus = Math.floor(12 * (1 + currentLevel * 0.04));
    dynamicUpgrades.push({
      id: 'damage',
      name: '伤害加成',
      description: `伤害 +${damageBonus}%`,
      icon: '/assets/shanghai.png',
      weight: 100,
    });
    
    // 生命上限：1+0.5L（向下取整），权重110-2L，前期保命，后期稀释
    const maxHpBonus = Math.floor(1 + currentLevel * 0.5);
    dynamicUpgrades.push({
      id: 'maxHp',
      name: '血量上限',
      description: `血量上限 +${maxHpBonus}`,
      icon: '/assets/shangxian.png',
      weight: Math.max(10, 110 - currentLevel * 2),
    });
    
    // 暴击率：+4%（固定），权重30+2L（最高90），随关卡变得更易出现
    dynamicUpgrades.push({
      id: 'critRate',
      name: '暴击率',
      description: `暴击率 +4%`,
      icon: '/assets/baojilv.png',
      weight: Math.min(90, 30 + currentLevel * 2),
    });
    
    // 暴击伤害：+20%×(1+0.02L)，权重30+2L（最高90），与暴击率同步增长
    const critDamageBonus = Math.floor(20 * (1 + currentLevel * 0.02));
    dynamicUpgrades.push({
      id: 'critDamage',
      name: '暴击伤害',
      description: `暴击伤害 +${critDamageBonus}%`,
      icon: '/assets/baojishanghai.png',
      weight: Math.min(90, 30 + currentLevel * 2),
    });
    
    // 射速加成：+10%（固定），权重70，稳定收益
    dynamicUpgrades.push({
      id: 'fireRate',
      name: '射速提升',
      description: `射速 +10%`,
      icon: '/assets/shesu.png',
      weight: 70,
    });
    
    // 换弹速度：+12%（固定），权重65，稳定收益
    dynamicUpgrades.push({
      id: 'reloadTime',
      name: '换弹速度',
      description: `换弹速度 +12%`,
      icon: '/assets/huandan.png',
      weight: 65,
    });
    
    // 移速加成：0.1，权重75-L，后期走位虽强但非核心
    dynamicUpgrades.push({
      id: 'playerSpeed',
      name: '移动速度',
      description: `移动速度 +0.1`,
      icon: '/assets/yishu.png',
      weight: Math.max(10, 75 - currentLevel),
    });
    
    // 弹夹容量：+2（固定），权重25+L，随关卡重要性提升
    dynamicUpgrades.push({
      id: 'magazineSize',
      name: '弹夹容量',
      description: `弹夹容量 +2`,
      icon: '/assets/wuqishuxing.png',
      weight: 25 + currentLevel,
    });
    
    // 射程：0.15，权重45-L，前期有用，后期垃圾
    dynamicUpgrades.push({
      id: 'weaponRange',
      name: '射程',
      description: `射程 +0.15`,
      icon: '/assets/shecheng.png',
      weight: Math.max(5, 45 - currentLevel),
    });
    
    // 穿透力：+1，权重min(30, 6+1.2L)，顶级后期Buff，极贵
    dynamicUpgrades.push({
      id: 'penetration',
      name: '穿透力',
      description: `穿透力 +1`,
      icon: '/assets/chuantou.png',
      weight: Math.min(30, 6 + currentLevel * 1.2),
    });
    
    // 击退：+1，权重20+10L
    dynamicUpgrades.push({
      id: 'knockback',
      name: '击退',
      description: `击退 +1`,
      icon: '/assets/jitui.png',
      weight: 20 + currentLevel * 10,
    });
    
    // 枪械选项（保持原有权重）
    dynamicUpgrades.push({
      id: 'weapon_pistol',
      name: '手枪',
      description: WEAPONS.pistol.description,
      icon: WEAPONS.pistol.showIcon,
      weight: Math.max(12, 40 - currentLevel * 2),
    });
    
    dynamicUpgrades.push({
      id: 'weapon_shotgun',
      name: '散弹枪',
      description: WEAPONS.shotgun.description,
      icon: WEAPONS.shotgun.showIcon,
      weight: Math.max(12, 40 - currentLevel * 2),
    });
    
    dynamicUpgrades.push({
      id: 'weapon_sniper',
      name: '狙击枪',
      description: WEAPONS.sniper.description,
      icon: WEAPONS.sniper.showIcon,
      weight: Math.max(12, 40 - currentLevel * 2),
    });
    
    dynamicUpgrades.push({
      id: 'weapon_smg',
      name: '冲锋枪',
      description: WEAPONS.smg.description,
      icon: WEAPONS.smg.showIcon,
      weight: Math.max(12, 40 - currentLevel * 2),
    });
    
    dynamicUpgrades.push({
      id: 'weapon_rpg',
      name: '火箭筒',
      description: WEAPONS.rpg.description,
      icon: WEAPONS.rpg.showIcon,
      weight: Math.max(10, 30 - currentLevel * 1.5),
    });
    
    // 生命回复：12+4L，权重90-2L，逐渐降低，前期容错高
    const healBonus = 12 + currentLevel * 4;
    dynamicUpgrades.push({
      id: 'heal',
      name: '生命回复',
      description: `生命 +${healBonus}`,
      icon: '/assets/huifu.png',
      weight: Math.max(20, 90 - currentLevel * 2),
    });
    
    // 敌方减速：-4%×(1+0.03L)，权重min(70, 20+2L)，逐渐升高
    const enemySlowdownBonus = Math.floor(4 * (1 + currentLevel * 0.03));
    dynamicUpgrades.push({
      id: 'enemySlowdown',
      name: '敌方减速',
      description: `敌方速度 -${enemySlowdownBonus}%`,
      icon: '/assets/jianshu.png',
      weight: Math.min(70, 20 + currentLevel * 2),
    });
    
    // 金币奖励：10+4L，权重max(0, 30-1.5L)，前期极高
    const goldReward = 10 + currentLevel * 4;
    dynamicUpgrades.push({
      id: 'gold_reward',
      name: '金币奖励',
      description: `金币 +${goldReward}`,
      icon: '/assets/jinbi.png',
      weight: Math.max(0, 30 - currentLevel * 1.5),
    });
    
    // 武器升级：1级，权重50，稳健常青
    dynamicUpgrades.push({
      id: 'weapon_upgrade',
      name: '武器升级',
      description: `武器等级 +1`,
      icon: '/assets/wuqishuxing.png',
      weight: 50,
    });
    
    // 子弹速度：+10%×(1+0.03L)，权重45-L，逐渐降低
    const bulletSpeedBonus = Math.floor(10 * (1 + currentLevel * 0.03));
    dynamicUpgrades.push({
      id: 'bulletSpeed',
      name: '子弹速度',
      description: `子弹速度 +${bulletSpeedBonus}%`,
      icon: '/assets/wuqishuxing.png',
      weight: Math.max(10, 45 - currentLevel),
    });
    
    // 吸血buff：权重100，价格10+2L
    dynamicUpgrades.push({
      id: 'vampire',
      name: '吸血',
      description: '+1 吸血等级',
      icon: '/assets/vampire.png',
      weight: 100,
    });
    
    // 弹药补充buff：权重100，价格10+2L
    dynamicUpgrades.push({
      id: 'ammoSupply',
      name: '弹药补充',
      description: '+1 弹药补充等级',
      icon: '/assets/ammo_supply.png',
      weight: 100,
    });
    
    // 险中取胜buff：权重100，价格20+3L
    dynamicUpgrades.push({
      id: 'desperateFight',
      name: '险中取胜',
      description: '+1 险中取胜等级',
      icon: '/assets/desperate_fight.png',
      weight: 100,
    });
    
    // 成长链基础buff类型列表（已获得后不再出现在升级池中）
    const growthChainBaseBuffs: UpgradeType[] = ['vampire', 'ammoSupply', 'desperateFight'];
    
    // 添加成长链节点升级选项
    for (const nodeId of Object.keys(GROWTH_CHAIN_NODES) as GrowthChainNodeId[]) {
      if (isGrowthChainNodeUnlocked(currentPlayer, nodeId)) {
        const node = GROWTH_CHAIN_NODES[nodeId];
        
        // 手枪专属成长链节点：仅在拥有手枪时才出现
        if ((nodeId === 'pistol_last_penetration' || nodeId === 'pistol_final_strike_chain') && currentPlayer.weapon !== 'pistol') {
          continue;
        }
        
        // 火箭筒专属成长链节点：仅在拥有火箭筒时才出现
        if ((nodeId === 'rpg_shockwave' || nodeId === 'rpg_ap_shot' || nodeId === 'rpg_dual_barrel') && currentPlayer.weapon !== 'rpg') {
          continue;
        }
        
        // 只添加淬毒、手枪专属、火箭筒专属的成长链节点（其他buff预留位置暂时不加入升级池）
        if (node.baseBuff === 'poisonBuff' || node.baseBuff === 'pistol_last_bullet_penetrate' || node.baseBuff === 'pistol_final_strike' || node.baseBuff === 'rpg_shockwave' || node.baseBuff === 'rpg_ap_shot' || node.baseBuff === 'rpg_dual_barrel') {
          const weight = typeof node.weight === 'function' ? node.weight(currentLevel) : node.weight;
          dynamicUpgrades.push({
            id: node.baseBuff as any, // 使用基础buff类型作为分类
            name: node.name,
            description: node.description,
            icon: node.icon,
            weight,
            growthChainNode: node.id,
          });
        }
      }
    }
    
    // 根据权重随机选择3个不重复升级
    const selected: Upgrade[] = [];
    const available: Upgrade[] = [];
    
    // 根据权重创建加权数组，并过滤掉已达到最大值的升级
    dynamicUpgrades.forEach(upgrade => {
      // 检查是否已达到最大值
      if (isAtMaxValue(currentPlayer, upgrade.id)) {
        return; // 跳过这个升级
      }
      
      // 检查是否是成长链基础buff且已获得（如果已获得则不出现基础buff，只出现成长链节点）
      if (growthChainBaseBuffs.includes(upgrade.id) && shouldRemoveBaseBuffFromPool(currentPlayer, upgrade.id as SpecialRewardType)) {
        return; // 跳过这个升级
      }
      
      const weight = upgrade.weight || 1;
      for (let i = 0; i < weight; i++) {
        available.push(upgrade);
      }
    });
    
    while (selected.length < 3 && available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      const upgrade = available[randomIndex];
      
      // 检查是否已选择该升级
      if (!selected.find(u => u.id === upgrade.id)) {
        selected.push(upgrade);
      }
      
      // 移除该升级的所有实例
      for (let i = available.length - 1; i >= 0; i--) {
        if (available[i].id === upgrade.id) {
          available.splice(i, 1);
        }
      }
    }
    
    // 确保没有重复的升级，并添加最大值显示
    const finalSelected: Upgrade[] = [];
    const seenIds = new Set<string>();
    
    for (const upgrade of selected) {
      if (!seenIds.has(upgrade.id)) {
        seenIds.add(upgrade.id);
        
        // 检查是否已达到最大值，如果是则修改显示文本
        if (isAtMaxValue(currentPlayer, upgrade.id)) {
          finalSelected.push({
            ...upgrade,
            name: getMaxValueDisplay(upgrade.id, upgrade.name),
            description: `${getMaxValueDisplay(upgrade.id, upgrade.name)} (已满级)`,
          });
        } else {
          finalSelected.push(upgrade);
        }
      }
    }
    
    setAvailableUpgrades(finalSelected);
  }, []);
  
  // 刷新升级选项（每关固定刷新一次）
  const refreshUpgrades = useCallback(() => {
    if (upgradeRefreshCount >= 1) {
      console.warn('已达到本关刷新上限');
      return;
    }
    // 重新生成升级选项
    selectRandomUpgrades(player.weapon, level, player);
    setUpgradeRefreshCount(upgradeRefreshCount + 1);
  }, [upgradeRefreshCount, player.weapon, level, player, selectRandomUpgrades]);
  
  // 生成随机障碍物
  const generateObstacles = useCallback(() => {
    // 确保图片已加载
    if (obstacleImages.length === 0) {
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
      '/assets/obstacle_5.png'
    ];
    
    // 障碍物配置（碰撞体积占图片的比例）
    const obstacleConfigs = [
      { collisionRatio: 0.7 }, // obstacle_1
      { collisionRatio: 0.6 }, // obstacle_2
      { collisionRatio: 0.8 }, // obstacle_3
      { collisionRatio: 0.75 }, // obstacle_4
      { collisionRatio: 0.65 }  // obstacle_5
    ];
    
    for (let i = 0; i < GAME_CONFIG.OBSTACLE_COUNT; i++) {
      let attempts = 0;
      let success = false;
      
      while (attempts < maxAttempts && !success) {
        attempts++;
        
        // 随机选择障碍物类型
        const obstacleIndex = Math.floor(Math.random() * obstacleImagePaths.length);
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
        const x = 100 + Math.random() * (GAME_CONFIG.WORLD_WIDTH - 200 - width);
        const y = 100 + Math.random() * (GAME_CONFIG.WORLD_HEIGHT - 200 - height);
        
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
          const dx = (x + width / 2) - (existing.x + existing.width / 2);
          const dy = (y + height / 2) - (existing.y + existing.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 220) { // 障碍物间距不小于220px
            tooClose = true;
            break;
          }
        }
        
        if (tooClose) continue;
        
        // 创建障碍物
        const obstacle: Obstacle = {
          id: `obstacle-${Date.now()}-${i}`,
          x,
          y,
          width,
          height,
          image: imagePath,
          collisionWidth,
          collisionHeight
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
  const spawnMonsters = useCallback((totalWeight: number, hpMultiplier: number, enemySpeedMultiplier: number = 1.0, currentLevel: number = 1, playerX?: number, playerY?: number) => {
    // 首先生成所有敌人配置
    const allMonsters: Monster[] = [];
    
    // 计算玩家视角范围，用于智能生成怪物位置
    const viewLeft = (playerX ?? GAME_CONFIG.WORLD_WIDTH / 2) - GAME_CONFIG.CANVAS_WIDTH / 2;
    const viewRight = (playerX ?? GAME_CONFIG.WORLD_WIDTH / 2) + GAME_CONFIG.CANVAS_WIDTH / 2;
    const viewTop = (playerY ?? GAME_CONFIG.WORLD_HEIGHT / 2) - GAME_CONFIG.CANVAS_HEIGHT / 2;
    const viewBottom = (playerY ?? GAME_CONFIG.WORLD_HEIGHT / 2) + GAME_CONFIG.CANVAS_HEIGHT / 2;
    const SPAWN_RANGE = 2000; // 在视角范围外2000px内生成
    
    // 每权重生成的怪物数量（向下取整，最低为1）
    const monstersPerWeight: Record<MonsterType, number> = {
      1: Math.max(1, Math.floor(3 + currentLevel * 0.8)),  // 标准敌人：3 + level × 0.8（原1.0，降20%）
      2: Math.max(1, Math.floor(3 + currentLevel * 0.64)),  // 中型敌人：3 + level × 0.64（原0.8，降20%）
      3: Math.max(1, Math.floor(1 + currentLevel * 0.4)),  // 大型敌人：1 + level × 0.4（原0.5，降20%）
      4: Math.max(1, Math.floor(2 + currentLevel * 0.48)),  // 远程敌人：2 + level × 0.48（原0.6，降20%）
      5: 1  // BOSS：1个
    };
    
    // 根据关卡数分配权重
    const weightDistribution: Record<MonsterType, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    for (let i = 0; i < totalWeight; i++) {
      const rand = Math.random();
      let monsterType: MonsterType;
      
      if (currentLevel === 1) {
        // 第一关只有类型1
        monsterType = 1;
      } else if (currentLevel === 2) {
        // 第二关：保证类型2至少有1个权重，剩余按概率分配
        // 前i次已经分配给类型2的情况
        if (weightDistribution[2] === 0 && i === totalWeight - 1) {
          // 最后一次还没分配给类型2，强制分配
          monsterType = 2;
        } else {
          // 80% 类型1，20% 类型2
          monsterType = rand < 0.8 ? 1 : 2;
        }
      } else if (currentLevel === 3) {
        // 第三关：60% 类型1，20% 类型2，20% 类型3
        if (rand < 0.6) monsterType = 1;
        else if (rand < 0.8) monsterType = 2;
        else monsterType = 3;
      } else if (currentLevel >= 4) {
        // 第四关及以后：40% 类型1，20% 类型2，20% 类型3，20% 类型4
        if (rand < 0.4) monsterType = 1;
        else if (rand < 0.6) monsterType = 2;
        else if (rand < 0.8) monsterType = 3;
        else monsterType = 4;
      } else {
        monsterType = 1;
      }
      
      weightDistribution[monsterType]++;
    }
    
    // 根据权重分布生成怪物配置
    for (const [typeStr, weight] of Object.entries(weightDistribution)) {
      if (weight === 0) continue;
      
      const monsterType = parseInt(typeStr) as MonsterType;
      const count = Math.min(300, weight * monstersPerWeight[monsterType]);  // 限制每种类型最多300个
      
      for (let i = 0; i < count; i++) {
        let x = 0, y = 0;
        // 智能生成：在玩家视角范围外2000px内生成，使敌人能更快进入视野
        // 随机选择方向：0=上, 1=下, 2=左, 3=右
        const dir = Math.floor(Math.random() * 4);
        switch (dir) {
          case 0: // 上：视角上方
            x = viewLeft + Math.random() * (viewRight - viewLeft);
            y = viewTop - 30 - Math.random() * SPAWN_RANGE;
            break;
          case 1: // 下：视角下方
            x = viewLeft + Math.random() * (viewRight - viewLeft);
            y = viewBottom + 30 + Math.random() * SPAWN_RANGE;
            break;
          case 2: // 左：视角左方
            x = viewLeft - 30 - Math.random() * SPAWN_RANGE;
            y = viewTop + Math.random() * (viewBottom - viewTop);
            break;
          case 3: // 右：视角右方
            x = viewRight + 30 + Math.random() * SPAWN_RANGE;
            y = viewTop + Math.random() * (viewBottom - viewTop);
            break;
        }
        // 确保生成位置不超出世界边界，但保留一定边缘
        x = Math.max(-30, Math.min(GAME_CONFIG.WORLD_WIDTH + 30, x));
        y = Math.max(-30, Math.min(GAME_CONFIG.WORLD_HEIGHT + 30, y));
        
        const config = MONSTER_CONFIGS[monsterType];
        
        const baseSpeed = config.baseSpeed * (0.9 + Math.random() * 0.2); // 90%-110% 基础速度波动
        const speed = baseSpeed * enemySpeedMultiplier;
        
        let newMonster: Monster = {
          id: `monster-${Date.now()}-${allMonsters.length}`,
          x,
          y,
          hp: config.hp * hpMultiplier,
          maxHp: config.hp * hpMultiplier,
          speed: speed,
          baseSpeed: baseSpeed,
          damage: config.damage,
          isHit: false,
          hitTime: 0,
          isDying: false,
          deathTime: 0,
          monsterType: monsterType,
          lastShot: 0,
          lastAttackTime: 0,
          isBoss: config.isBoss || false,
          lastBossAttackTime: 0,
          lastRangedAttackTime: 0,  // BOSS远程攻击时间
          vx: 0, // 初始速度向量
          vy: 0, // 初始速度向量
          // 敌人4动画状态
          isShooting: monsterType === 4 ? false : undefined,
          shootAnimationStartTime: monsterType === 4 ? 0 : undefined,
          // BOSS落地攻击初始状态
          jumpAttackState: config.isBoss ? 'idle' : undefined,
          jumpAttackStartTime: config.isBoss ? Date.now() : undefined,
        };
        
        // 词缀系统：按概率赋予词缀（从第4关开始）
        if (!config.isBoss && currentLevel >= AFFIX_SPAWN_CONFIG.MIN_LEVEL) {
          const affixChance = getAffixSpawnChance(currentLevel);
          if (Math.random() < affixChance) {
            const affixType = rollAffixType();
            if (affixType) {
              newMonster = AffixSystem.init(newMonster, affixType);
            }
          }
        }
        
        allMonsters.push(newMonster);
      }
    }
    
    // 第5关：最后生成BOSS
    if (currentLevel === 5 && totalWeight > 0) {
      const bossConfig = MONSTER_CONFIGS[5];  // 史莱姆王
      const x = GAME_CONFIG.WORLD_WIDTH / 2;
      const y = 100;  // 从上方生成
      
      allMonsters.push({
        id: `boss-${Date.now()}`,
        x,
        y,
        hp: bossConfig.hp,
        maxHp: bossConfig.hp,
        speed: bossConfig.baseSpeed,
        baseSpeed: bossConfig.baseSpeed,
        damage: bossConfig.damage,
        isHit: false,
        hitTime: 0,
        isDying: false,
        deathTime: 0,
        monsterType: 5,
        lastShot: 0,
        lastAttackTime: 0,
        isBoss: true,
        lastBossAttackTime: 0,
        lastRangedAttackTime: 0,  // BOSS远程攻击时间
        vx: 0, // 初始速度向量
        vy: 0, // 初始速度向量
        // BOSS落地攻击初始状态
        jumpAttackState: 'idle',
        jumpAttackStartTime: Date.now(),
      });
      
      setBossAlive(true);
      setBossCurrentHp(bossConfig.hp);
      setBossMaxHp(bossConfig.hp);
      
      // 播放Boss出现音效
      playSound('boss_appear');
    }
    
    // 分批生成：将敌人分成多批
    const totalCount = allMonsters.length;
    
    // 随机打乱怪物顺序，确保每批都有混合类型
    for (let i = allMonsters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allMonsters[i], allMonsters[j]] = [allMonsters[j], allMonsters[i]];
    }
    
    const batchSize = Math.ceil(totalCount * 0.25);  // 每批约25%
    
    // 分成多批
    const batches: Monster[][] = [];
    for (let i = 0; i < totalCount; i += batchSize) {
      batches.push(allMonsters.slice(i, i + batchSize));
    }
    
    // 设置总敌人数量
    setTotalMonstersToSpawn(totalCount);
    // 记录本关总波次（用于波次衔接显示）
    setThisLevelWaveTotal(batches.length);
    
    // 生成第一批
    if (batches.length > 0) {
      const firstBatch = batches[0];
      setMonsters(firstBatch);
      setCurrentBatchInitialCount(firstBatch.length);
      setMonstersRemaining(firstBatch.length);
      
      // 保存剩余批次
      setPendingMonsterBatches(batches.slice(1));
      
      // 设置下一批生成时间（15秒后）
      if (batches.length > 1) {
        setNextBatchTime(Date.now() + 15000);
      } else {
        setNextBatchTime(null);
      }
    }
  }, []);
  
  // 开始新关卡（支持指定关卡参数）
  const startLevel = useCallback((targetLevel?: number) => {
    // 播放关卡开始音效
    playSound('level_start');
    
    const actualLevel = targetLevel !== undefined ? targetLevel : level;
    const baseWeight = 3;
    // 总权重：关卡1=3, 关卡2=4, 关卡3+=7/9/11...
    let totalWeight = baseWeight + (actualLevel - 1) * 2;
    if (actualLevel === 2) {
      totalWeight = 4;  // 第二关特殊处理，减少怪物数量
    }
    // 血量倍率公式：HP = (1.1 + 0.10 × (L - 3) + 0.035 × (L - 3)²) × 1.25
    // ×1.25 用于补偿数量下降20%（数量×血量≈恒定，维持每关战斗时长）
    const levelDiff = actualLevel - 3;
    const hpMultiplier = (1.1 + 0.10 * levelDiff + 0.035 * levelDiff * levelDiff) * 1.25;
    
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
    
    spawnMonsters(totalWeight, hpMultiplier, player.enemySpeedMultiplier, actualLevel, player.x, player.y);
    // monstersRemaining会在spawnMonsters中设置
  }, [level, player.enemySpeedMultiplier, spawnMonsters, playSound]);
  
  // 开始游戏（选择武器后）
  const startGameWithWeapon = useCallback((weaponType: WeaponType) => {
    // 播放按钮点击音效
    playSound('button_click');
    
    // 重置闪现技能冷却与位移状态
    setDashCooldown(0);
    dashCooldownStartRef.current = 0;
    dashRef.current = { active: false, startTime: 0, fromX: 0, fromY: 0, dirX: 0, dirY: 0, recoveryStart: 0 };
    dashPendingRef.current = false;

    // 清除关卡完成的延迟定时器
    if (levelCompleteTimeoutRef.current) {
      clearTimeout(levelCompleteTimeoutRef.current);
      levelCompleteTimeoutRef.current = undefined;
    }
    
    const selectedWeapon = WEAPONS[weaponType];
    const basePlayerSpeed = 2; // 基础移动速度
    const weaponSpeedBonus = selectedWeapon.playerSpeedBonus || 0; // 武器移动速度加成
    
    setPlayer({
      x: GAME_CONFIG.WORLD_WIDTH / 2,
      y: GAME_CONFIG.WORLD_HEIGHT / 2,
      hp: GAME_CONFIG.PLAYER_MAX_HP,
      maxHp: GAME_CONFIG.PLAYER_MAX_HP,
      damage: selectedWeapon.damage,
      fireRate: selectedWeapon.fireRate,
      lastShot: 0,
      weapon: weaponType,
      weaponLevel: 1,
      weapons: [weaponType], // 初始武器列表
      currentWeaponIndex: 0, // 当前武器索引
      weaponInstances: {}, // 初始武器随机属性实例（初始武器不刷随机属性）
      weaponAmmo: { [weaponType]: selectedWeapon.magazineSize }, // 武器弹药记录
      isHit: false,
      hitTime: 0,
      playerSpeed: basePlayerSpeed + weaponSpeedBonus, // 基础速度 + 武器加成
      enemySpeedMultiplier: 1.0,
      weaponRange: selectedWeapon.bulletRange,
      bulletSpeed: selectedWeapon.bulletSpeed,
      critRate: selectedWeapon.critRate, // 初始暴击率（使用武器配置）
      critDamage: 1.5, // 初始暴击伤害倍率（150%）
      penetration: weaponType === 'sniper' ? 1 : 0, // 狙击枪自带穿透
      currentAmmo: selectedWeapon.magazineSize, // 当前弹匣子弹数
      isReloading: false, // 是否正在换弹
      reloadStartTime: 0, // 换弹开始时间
      reloadInterrupted: false, // 换弹是否被中断（仅用于散弹枪一发一发装填）
      lastHitMonsterId: null,
      lastHitMonsterTime: 0,
      gold: 0, // 初始金币
      magazineSizeBonus: 0, // 初始弹夹容量加成
      reloadSpeedBonus: 0, // 换弹速度加成百分比
      // 初始化加成字段
      damageBonus: 0,
      critRateBonus: 0,
      critDamageBonus: 0,
      fireRateBonus: 0,
      playerSpeedBonus: weaponSpeedBonus, // 武器移动速度加成
      weaponRangeBonus: 0,
      maxHpBonus: 0,
      penetrationBonus: 0,
      // 动画相关字段
      facingDirection: 'left', // 面朝方向
      isMoving: false, // 是否正在移动
      lastMoveTime: 0, // 最后一次移动的时间戳
      animationStartTime: 0, // 动画开始时间
      // 引火buff相关
      fireBuffLevel: 0, // 初始引火等级
      // 淬毒buff相关
      poisonBuffLevel: 0, // 初始淬毒等级
      coinPickupRangeBonus: 0, // 初始金币拾取范围加成
      // 能量气场相关
      energyAuraLevel: 0, // 初始能量气场等级
      lastEnergyAuraShockwaveTime: 0, // 上次冲击波发射时间
      // 处决buff相关
      executionLevel: 0, // 初始处决等级
      // 暴怒buff相关
      criticalRageLevel: 0, // 初始暴怒等级
      // 吸血buff相关
      vampireLevel: 0, // 初始吸血等级
      // 弹药补充buff相关
      ammoSupplyLevel: 0, // 初始弹药补充等级
      // 险中取胜buff相关
      desperateFightLevel: 0, // 初始险中取胜等级
      knockback: 0, // 初始击退值
      // 成长链节点
      growthChainNodes: [], // 初始成长链节点
      // 武器切换相关
      isSwitchingWeapon: false, // 是否正在切换武器
      weaponSwitchStartTime: 0, // 武器切换开始时间
    });
    setLevel(1);
    setScore(0);
    generateObstacles();
    generateMapBackground(); // 重新生成地图背景（随机地块组合）
    startLevel(1); // 传入关卡参数 1，确保生成第一关的怪物
    setBullets([]);
    muzzleFlashesRef.current = []; // 清除枪火动画
    recoilRef.current = { backward: 0, upward: 0, shake: 0 }; // 清除后坐力
    setCoins([]); // 清除金币
    setDamageNumbers([]);
    setGoldFloatingTexts([]); // 清除金币弹字
    setExplosionEffects([]); // 清除爆炸效果
    setPierceEffects([]); // 清除穿透光效
    screenShakeRef.current = 0; // 清除震屏
    setAccumulatedDamage(new Map());
    setLockedItems([]); // 清除锁定列表（重新开始游戏时）
    setGameState('playing');
    
    // 播放战斗背景音乐
    playBGM();
  }, [generateObstacles, generateMapBackground, startLevel, playBGM]);
  
  // 切换武器（支持向前或向后切换）
  const switchWeapon = useCallback((direction: 'next' | 'prev' = 'next') => {
    setPlayer(prev => {
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
        weaponSwitchStartTime: Date.now(),
      };
    });
  }, []);
  
  // 切换到指定索引的武器（数字键快捷切换）
  const switchWeaponTo = useCallback((index: number) => {
    setPlayer(prev => {
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
        weaponSwitchStartTime: Date.now(),
      };
    });
  }, []);
  
  // 武器切换动画完成处理
  useEffect(() => {
    if (player.isSwitchingWeapon) {
      const switchDuration = 1000; // 1秒切换动画
      const timeout = setTimeout(() => {
        setPlayer(prev => ({
          ...prev,
          isSwitchingWeapon: false,
          weaponSwitchStartTime: 0,
        }));
      }, switchDuration);
      
      return () => clearTimeout(timeout);
    }
  }, [player.isSwitchingWeapon]);
  
  // 应用升级
  const applyUpgrade = (upgradeId: UpgradeType) => {
    // 播放按钮点击音效
    playSound('button_click');
    
    // 从 availableUpgrades 中找到对应的升级，获取其数值
    const upgrade = availableUpgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;
    
    // 检查是否是成长链节点升级
    if (upgrade.growthChainNode) {
      setPlayer(prev => {
        const node = GROWTH_CHAIN_NODES[upgrade.growthChainNode!];
        return node.apply(prev);
      });
      // 进入商店而不是直接开始下一关
      enterShop();
      return;
    }
    
    // 从 description 中解析数值
    const parseValue = (desc: string): number => {
      const match = desc.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    };
    
    const value = parseValue(upgrade.description);
    
    setPlayer(prev => {
      const newPlayer = { ...prev };
      switch (upgradeId) {
        case 'maxHp':
          newPlayer.maxHp = prev.maxHp + value;
          newPlayer.hp = prev.hp + value; // 同时增加当前血量
          newPlayer.maxHpBonus = prev.maxHpBonus + value;
          break;
        case 'damage':
          const oldDamage = prev.damage;
          const damageMultiplier = 1 + value / 100;
          newPlayer.damage = Math.floor(prev.damage * damageMultiplier);
          newPlayer.damageBonus = prev.damageBonus + (newPlayer.damage - oldDamage);
          break;
        case 'fireRate':
          const fireRateMultiplier = 1 - value / 100;
          newPlayer.fireRate = Math.max(50, Math.floor(prev.fireRate * fireRateMultiplier));
          newPlayer.fireRateBonus = prev.fireRateBonus + value;
          break;
        case 'playerSpeed':
          newPlayer.playerSpeed = Math.min(prev.playerSpeed + value, MAX_VALUES.playerSpeed);
          newPlayer.playerSpeedBonus = prev.playerSpeedBonus + value * 100;
          break;
        case 'reloadTime':
          newPlayer.reloadSpeedBonus = prev.reloadSpeedBonus + value;
          break;
        case 'magazineSize':
          newPlayer.magazineSizeBonus = prev.magazineSizeBonus + value;
          newPlayer.currentAmmo = prev.currentAmmo + value;
          break;
        case 'weaponRange':
          newPlayer.weaponRange = Math.min(prev.weaponRange + value, MAX_VALUES.weaponRange);
          newPlayer.weaponRangeBonus = prev.weaponRangeBonus + value * 100;
          break;
        case 'critRate':
          newPlayer.critRate = Math.min(1.0, prev.critRate + value / 100);
          newPlayer.critRateBonus = prev.critRateBonus + value;
          break;
        case 'critDamage':
          newPlayer.critDamage = prev.critDamage + value / 100;
          newPlayer.critDamageBonus = prev.critDamageBonus + value;
          break;
        case 'penetration':
          newPlayer.penetration = Math.min(prev.penetration + value, MAX_VALUES.penetration);
          newPlayer.penetrationBonus = prev.penetrationBonus + value;
          break;
        case 'knockback':
          newPlayer.knockback = Math.min(prev.knockback + value, MAX_VALUES.knockback);
          break;
        case 'weapon_pistol':
          Object.assign(newPlayer, equipWeaponFields(newPlayer, 'pistol'));
          break;
        case 'weapon_shotgun':
          Object.assign(newPlayer, equipWeaponFields(newPlayer, 'shotgun'));
          break;
        case 'weapon_sniper':
          Object.assign(newPlayer, equipWeaponFields(newPlayer, 'sniper'));
          break;
        case 'weapon_smg':
          Object.assign(newPlayer, equipWeaponFields(newPlayer, 'smg'));
          break;
        case 'weapon_rpg':
          Object.assign(newPlayer, equipWeaponFields(newPlayer, 'rpg'));
          break;
        case 'heal':
          newPlayer.hp = Math.min(prev.hp + value, prev.maxHp);
          break;
        case 'enemySlowdown':
          const enemySlowdownMultiplier = 1 - value / 100;
          newPlayer.enemySpeedMultiplier = Math.max(0.3, prev.enemySpeedMultiplier * enemySlowdownMultiplier);
          break;
        case 'gold_reward':
          newPlayer.gold = prev.gold + value;
          break;
        case 'weapon_upgrade':
          newPlayer.weaponLevel += 1;
          const weaponUpgradeMultiplier = 1 + value / 100;
          newPlayer.damage = Math.floor(prev.damage * weaponUpgradeMultiplier);
          const weaponUpgradeFireRateMultiplier = 1 - value / 100;
          newPlayer.fireRate = Math.max(50, Math.floor(prev.fireRate * weaponUpgradeFireRateMultiplier));
          const weaponUpgradeRangeMultiplier = 1 + value / 100;
          newPlayer.weaponRange = Math.min(Math.floor(prev.weaponRange * weaponUpgradeRangeMultiplier), MAX_VALUES.weaponRange);
          newPlayer.bulletSpeed = Math.floor(prev.bulletSpeed * weaponUpgradeMultiplier);
          // 限制武器属性加成不超过最大值
          newPlayer.damageBonus = Math.min(newPlayer.damageBonus + value, MAX_VALUES.weaponUpgrade);
          newPlayer.fireRateBonus = Math.min(newPlayer.fireRateBonus + value, MAX_VALUES.weaponUpgrade);
          newPlayer.weaponRangeBonus = Math.min(newPlayer.weaponRangeBonus + value, MAX_VALUES.weaponUpgrade);
          break;
        case 'bulletSpeed':
          const bulletSpeedMultiplier = 1 + value / 100;
          newPlayer.bulletSpeed = Math.floor(prev.bulletSpeed * bulletSpeedMultiplier);
          break;
        case 'vampire':
          newPlayer.vampireLevel = prev.vampireLevel + 1;
          break;
        case 'ammoSupply':
          newPlayer.ammoSupplyLevel = prev.ammoSupplyLevel + 1;
          break;
        case 'desperateFight':
          newPlayer.desperateFightLevel = prev.desperateFightLevel + 1;
          break;
      }
      return newPlayer;
    });
    // 进入商店而不是直接开始下一关
    enterShop();
  };

  // 生成商店商品
  const generateShopItems = useCallback(() => {
    const newItems: ShopItem[] = [];
    const itemTypes: ShopItemType[] = ['critDamage', 'critRate', 'magazineSize', 'fireRate', 'damage', 'playerSpeed', 'reloadTime', 'weaponRange', 'maxHp', 'penetration', 'knockback', 'weapon_pistol', 'weapon_smg', 'weapon_sniper', 'weapon_shotgun', 'weapon_rpg', 'bulletSpeed', 'fireBuff', 'poisonBuff', 'coinPickupRange', 'energyAura', 'executionBuff', 'criticalRage', 'vampire', 'ammoSupply', 'desperateFight'];
    
    // 成长链基础buff类型列表
    const growthChainBaseBuffs: ShopItemType[] = ['fireBuff', 'poisonBuff', 'energyAura', 'executionBuff', 'criticalRage', 'vampire', 'ammoSupply', 'desperateFight'];
    
    // 如果有锁定的商品，先添加到新商品列表中
    if (lockedItems.length > 0) {
      newItems.push(...lockedItems.map(item => ({
        ...item,
        id: `shop-${Date.now()}-${Math.random()}` // 重新生成ID以避免冲突
      })));
    }
    
    // 计算还需要生成的商品数量
    const remainingCount = 3 - lockedItems.length;
    
    for (let i = 0; i < remainingCount; i++) {
      // 构建加权商品池
      interface WeightedItem {
        type: 'normal' | 'growthChain';
        shopType?: ShopItemType;
        growthNodeId?: GrowthChainNodeId;
        weight: number;
      }
      const weightedPool: WeightedItem[] = [];
      
      // 添加普通商品
      for (const type of itemTypes) {
        // 检查是否已达到最大值
        if (type === 'playerSpeed' && isAtMaxValue(player, type)) continue;
        if (type === 'weaponRange' && isAtMaxValue(player, type)) continue;
        if (type === 'penetration' && isAtMaxValue(player, type)) continue;
        if (type === 'knockback' && isAtMaxValue(player, type)) continue;
        if (type === 'coinPickupRange' && isAtMaxValue(player, type)) continue;
        
        // 检查是否是成长链基础buff且已获得（如果已获得则不出现基础buff，只出现成长链节点）
        if (growthChainBaseBuffs.includes(type) && shouldRemoveBaseBuffFromPool(player, type as SpecialRewardType)) {
          continue;
        }
        
        // 获取商品权重
        const config = SHOP_ITEM_CONFIGS[type];
        const weight = typeof config.weight === 'number' ? config.weight : 100;
        
        for (let j = 0; j < weight; j++) {
          weightedPool.push({ type: 'normal', shopType: type, weight });
        }
      }
      
      // 添加成长链节点商品
      for (const nodeId of Object.keys(GROWTH_CHAIN_NODES) as GrowthChainNodeId[]) {
        if (isGrowthChainNodeUnlocked(player, nodeId)) {
          const node = GROWTH_CHAIN_NODES[nodeId];
          
          // 手枪专属成长链节点：仅在拥有手枪时才出现
          if ((nodeId === 'pistol_last_penetration' || nodeId === 'pistol_final_strike_chain') && player.weapon !== 'pistol') {
            continue;
          }
          
          // 火箭筒专属成长链节点：仅在拥有火箭筒时才出现
          if ((nodeId === 'rpg_shockwave' || nodeId === 'rpg_ap_shot' || nodeId === 'rpg_dual_barrel') && player.weapon !== 'rpg') {
            continue;
          }
          
          // 只添加淬毒、手枪专属、火箭筒专属的成长链节点（其他buff预留位置暂时不加入商品池）
          if (node.baseBuff === 'poisonBuff' || node.baseBuff === 'pistol_last_bullet_penetrate' || node.baseBuff === 'pistol_final_strike' || node.baseBuff === 'rpg_shockwave' || node.baseBuff === 'rpg_ap_shot' || node.baseBuff === 'rpg_dual_barrel') {
            const weight = typeof node.weight === 'function' ? node.weight(level) : node.weight;
            for (let j = 0; j < weight; j++) {
              weightedPool.push({ type: 'growthChain', growthNodeId: nodeId, weight });
            }
          }
        }
      }
      
      // 如果没有可用商品，跳过
      if (weightedPool.length === 0) continue;
      
      // 随机选择一个商品
      const selected = weightedPool[Math.floor(Math.random() * weightedPool.length)];
      
      if (selected.type === 'growthChain' && selected.growthNodeId) {
        // 成长链节点商品
        const node = GROWTH_CHAIN_NODES[selected.growthNodeId];
        newItems.push({
          id: `shop-${Date.now()}-${i}`,
          type: node.baseBuff as any, // 使用基础buff类型作为分类
          name: node.name,
          description: node.description,
          icon: node.icon,
          value: 1,
          price: node.priceFormula(level),
          growthChainNode: node.id,
        });
      } else if (selected.shopType) {
        // 普通商品
        const type = selected.shopType;
        const config = SHOP_ITEM_CONFIGS[type];
        
        let price: number;
        let value: number;
        let description: string;
        
        // 检查是否为枪械类型
        if (type.startsWith('weapon_')) {
          // 枪械商品价格 = basePrice + levelPriceFactor × 关卡数
          price = config.basePrice + config.levelPriceFactor * level;
          value = 1; // 枪械商品不需要数值
          description = config.name; // 直接使用武器名称作为描述
        } else {
          // 普通商品
          
          // 穿透力特殊处理：value固定为1
          if (type === 'penetration') {
            value = 1;
            price = config.basePrice + config.levelPriceFactor * level;
            description = '+1 穿透力';
          } else if (type === 'knockback') {
            // 击退特殊处理：value固定为1，价格=15+18L
            value = 1;
            price = 15 + 18 * level;
            description = '+1 击退';
          } else if (type === 'fireBuff') {
            // 引火特殊处理：value固定为1
            value = 1;
            price = config.basePrice + config.levelPriceFactor * level;
            description = '+1 引火等级';
          } else if (type === 'poisonBuff') {
            // 淬毒特殊处理：value固定为1
            value = 1;
            price = config.basePrice + config.levelPriceFactor * level;
            description = '+1 淬毒等级';
          } else if (type === 'coinPickupRange') {
            // 金币拾取范围特殊处理：value固定为50%，价格=3L+5
            value = 50;
            price = 3 * level + 5;
            description = '+50% 金币拾取范围';
          } else if (type === 'energyAura') {
            // 能量气场特殊处理：value固定为1
            value = 1;
            price = config.basePrice + config.levelPriceFactor * level;
            description = '+1 能量气场等级';
          } else if (type === 'executionBuff') {
            // 处决buff特殊处理：价格=30+3L
            value = 1;
            price = 30 + 3 * level;
            description = '+1 处决等级';
          } else if (type === 'criticalRage') {
            // 暴怒buff特殊处理：价格=25+1.5L
            value = 1;
            price = Math.floor(25 + 1.5 * level);
            description = '+1 暴怒等级';
          } else if (type === 'vampire') {
            // 吸血buff特殊处理：价格=10+2L
            value = 1;
            price = 10 + 2 * level;
            description = '+1 吸血等级';
          } else if (type === 'ammoSupply') {
            // 弹药补充buff特殊处理：价格=10+2L
            value = 1;
            price = 10 + 2 * level;
            description = '+1 弹药补充等级';
          } else if (type === 'desperateFight') {
            // 险中取胜buff特殊处理：价格=20+3L
            value = 1;
            price = 20 + 3 * level;
            description = '+1 险中取胜等级';
          } else {
            // 其他商品：根据权重随机选择数值档位
            const weightedTiers: { tier: ValueTier; value: number }[] = [];
            VALUE_TIERS.forEach(tier => {
              const weight = tier.weightFormula(level);
              const tierValue = typeof tier.value === 'function' ? tier.value(level) : tier.value;
              for (let j = 0; j < weight; j++) {
                weightedTiers.push({ tier, value: tierValue });
              }
            });
            
            const selectedTier = weightedTiers[Math.floor(Math.random() * weightedTiers.length)];
            value = selectedTier.value;
            // 价格 = basePrice + levelPriceFactor × 关卡数 + 数值 × 2
            // 使用加法公式避免高数值商品价格过高
            const baseCost = config.basePrice + config.levelPriceFactor * level;
            price = Math.floor(baseCost + value * 2);
            
            // 生成描述
            const valueStr = config.isPercentage ? `${value}%` : `${value}`;
            description = `+${valueStr} ${config.name}`;
          }
        }
        
        // 检查是否已达到最大值，如果是则修改显示文本
        let finalName = description;
        let finalDescription = description;
        
        if (isAtMaxValue(player, type)) {
          finalName = getMaxValueDisplay(type, config.name);
          finalDescription = `${finalName} (已满级)`;
        }
        
        newItems.push({
          id: `shop-${Date.now()}-${i}`,
          type,
          name: finalName,
          description: finalDescription,
          icon: config.icon,
          value,
          price,
        });
      }
    }
    
    setShopItems(newItems);
  }, [level, lockedItems, player]);

  // 锁定/解锁当前商品
  const toggleLockItems = useCallback(() => {
    if (lockedItems.length === 0) {
      // 锁定当前商品
      setLockedItems(shopItems.map(item => ({ ...item })));
    } else {
      // 解锁商品
      setLockedItems([]);
    }
  }, [shopItems, lockedItems]);

  // 进入商店
  const enterShop = useCallback(() => {
    setShopRefreshCount(0);
    // 计算首次刷新价格
    const firstRefreshPrice = 5 + Math.floor(level / 2);
    setShopRefreshPrice(firstRefreshPrice);
    generateShopItems();
    setGameState('shop');
  }, [level, generateShopItems]);

  // 刷新商店商品
  const refreshShop = useCallback(() => {
    if (player.gold < shopRefreshPrice) return;
    
    setPlayer(prev => ({ ...prev, gold: prev.gold - shopRefreshPrice }));
    
    const newRefreshCount = shopRefreshCount + 1;
    setShopRefreshCount(newRefreshCount);
    
    // 计算新的刷新价格
    const newRefreshPrice = Math.floor(shopRefreshPrice * 1.2);
    setShopRefreshPrice(newRefreshPrice);
    
    generateShopItems();
  }, [player.gold, shopRefreshPrice, shopRefreshCount, generateShopItems]);

  // 购买商品
  const buyShopItem = useCallback((item: ShopItem) => {
    if (player.gold < item.price) return;
    
    // 播放金币音效
    playSound('coin');
    
    setPlayer(prev => {
      // 检查是否是成长链节点商品
      if (item.growthChainNode) {
        const node = GROWTH_CHAIN_NODES[item.growthChainNode];
        return { ...node.apply(prev), gold: prev.gold - item.price };
      }
      
      const config = SHOP_ITEM_CONFIGS[item.type];
      const newPlayer = config.apply(prev, item.value);
      return { ...newPlayer, gold: prev.gold - item.price };
    });
    
    // 移除已购买的商品
    setShopItems(prev => prev.filter(i => i.id !== item.id));
    
    // 如果购买的是锁定的商品，从锁定列表中移除
    if (lockedItems.some(i => i.id === item.id)) {
      setLockedItems(prev => prev.filter(i => i.id !== item.id));
    }
  }, [player.gold, lockedItems, playSound]);

  // 退出商店
  const exitShop = useCallback(() => {
    // 不要清空锁定列表，让锁定商品跨关卡保留
    // setLockedItems([]);  // 注释掉这一行
    let nextLevel = 0;
    setLevel(prev => {
      nextLevel = prev + 1;
      return nextLevel;
    });
    // 使用微任务确保在下一轮事件循环中调用，此时 level 已更新
    Promise.resolve().then(() => {
      startLevel(nextLevel);
    });
    setGameState('playing');
  }, [startLevel]);
  
  // 监听锁定商品变化，自动补充空缺的位置（仅当购买商品导致数量减少时）
  useEffect(() => {
    if (gameState === 'shop') {
      setShopItems(prevItems => {
        // 如果商品数量已经达到3个，不需要补充
        if (prevItems.length >= 3) return prevItems;
        
        // 如果没有锁定的商品，且商品不足3个，说明是解锁操作，不补充
        // 解锁操作不应该触发刷新，只有购买商品后才需要补充
        if (lockedItems.length === 0) return prevItems;
        
        // 计算需要补充的商品数量（补充到3个位置）
        const neededCount = 3 - prevItems.length;
        
        // 如果不需要补充，直接返回
        if (neededCount <= 0) return prevItems;
        
        // 获取当前关卡数（用于计算价格）
        const currentLevel = level;
        
        // 生成新的商品来补充空缺
        const itemTypes: ShopItemType[] = ['critDamage', 'critRate', 'magazineSize', 'fireRate', 'damage', 'playerSpeed', 'reloadTime', 'weaponRange', 'maxHp', 'penetration', 'knockback', 'weapon_pistol', 'weapon_smg', 'weapon_sniper', 'weapon_shotgun', 'weapon_rpg', 'bulletSpeed', 'fireBuff', 'poisonBuff', 'coinPickupRange', 'energyAura', 'executionBuff', 'criticalRage', 'vampire', 'ammoSupply', 'desperateFight'];
        const newItems: ShopItem[] = [...prevItems];
        
        for (let i = 0; i < neededCount; i++) {
          // 从可用类型中随机选择（排除已经生成的类型）
          const usedTypes = newItems.map(item => item.type);
          const availableTypes = itemTypes.filter(type => !usedTypes.includes(type));
          const typesToChoose = availableTypes.length > 0 ? availableTypes : itemTypes;
          
          const type = typesToChoose[Math.floor(Math.random() * typesToChoose.length)];
          const config = SHOP_ITEM_CONFIGS[type];
          
          let price: number;
          let value: number;
          let description: string;
          
          if (type.startsWith('weapon_')) {
            // 枪械商品价格 = basePrice + levelPriceFactor × 关卡数
            price = config.basePrice + config.levelPriceFactor * currentLevel;
            value = 1;
            description = config.name;
          } else if (type === 'penetration' || type === 'knockback' || type === 'fireBuff' || type === 'poisonBuff' || type === 'energyAura') {
            // 穿透、击退、引火、淬毒、能量气场特殊处理：value固定为1
            value = 1;
            price = config.basePrice + config.levelPriceFactor * currentLevel;
            const descMap: Record<string, string> = {
              penetration: '+1 穿透力',
              knockback: '+1 击退',
              fireBuff: '+1 引火等级',
              poisonBuff: '+1 淬毒等级',
              energyAura: '+1 能量气场等级',
            };
            description = descMap[type];
          } else if (type === 'executionBuff') {
            // 处决buff特殊处理：价格=30+3L
            value = 1;
            price = 30 + 3 * currentLevel;
            description = '+1 处决等级';
          } else if (type === 'criticalRage') {
            // 暴怒buff特殊处理：价格=25+1.5L
            value = 1;
            price = Math.floor(25 + 1.5 * currentLevel);
            description = '+1 暴怒等级';
          } else if (type === 'vampire') {
            // 吸血buff特殊处理：价格=10+2L
            value = 1;
            price = 10 + 2 * currentLevel;
            description = '+1 吸血等级';
          } else if (type === 'ammoSupply') {
            // 弹药补充buff特殊处理：价格=10+2L
            value = 1;
            price = 10 + 2 * currentLevel;
            description = '+1 弹药补充等级';
          } else if (type === 'desperateFight') {
            // 险中取胜buff特殊处理：价格=20+3L
            value = 1;
            price = 20 + 3 * currentLevel;
            description = '+1 险中取胜等级';
          } else if (type === 'coinPickupRange') {
            // 金币拾取范围特殊处理：value固定为50%，价格=3L+5
            value = 50;
            price = 3 * currentLevel + 5;
            description = '+50% 金币拾取范围';
          } else {
            const weightedTiers: { tier: ValueTier; value: number }[] = [];
            VALUE_TIERS.forEach(tier => {
              const weight = tier.weightFormula(currentLevel);
              const tierValue = typeof tier.value === 'function' ? tier.value(currentLevel) : tier.value;
              for (let j = 0; j < weight; j++) {
                weightedTiers.push({ tier, value: tierValue });
              }
            });
            
            const selectedTier = weightedTiers[Math.floor(Math.random() * weightedTiers.length)];
            value = selectedTier.value;
            // 价格 = basePrice + levelPriceFactor × 关卡数 + 数值 × 2
            // 使用加法公式避免高数值商品价格过高
            const baseCost = config.basePrice + config.levelPriceFactor * currentLevel;
            price = Math.floor(baseCost + value * 2);
            const valueStr = config.isPercentage ? `${value}%` : `${value}`;
            description = `+${valueStr} ${config.name}`;
          }
          
          newItems.push({
            id: `shop-${Date.now()}-${i}`,
            type,
            name: description,
            description,
            icon: config.icon,
            value,
            price,
          });
        }
        
        return newItems;
      });
    }
  }, [lockedItems, gameState]);
  
  // 切换暂停状态
  const togglePause = useCallback(() => {
    // 只在未暂停时暂停游戏
    if (!isPaused) {
      setIsPaused(true);
    }
    // 如果已暂停，不做任何操作（开始按钮点击由单独的处理逻辑）
  }, [isPaused]);
  
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
    const now = Date.now();
    setVampireHealEffects(prev => [...prev, {
      id: `vampire-heal-${now}`,
      startTime: now,
      healAmount: healAmount,
    }]);
    
    // 同时显示回复血量的飘字
    const playerPos = playerRef.current;
    if (playerPos) {
      setGoldFloatingTexts(prev => [...prev, {
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
      }]);
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
    hasShockwave: boolean = false,
    hasAPShot: boolean = false
  ) => {
    // 播放爆炸音效
    playSound('explosion');
    
    // 触发震屏效果（打击感）：强度随爆炸范围增大，封顶避免过强
    triggerScreenShake(Math.min(12, 4 + radius / 40));
    
    setMonsters(prevMonsters => {
      const now = Date.now();
      return prevMonsters.map(monster => {
        // 如果怪物处于无敌状态，跳过伤害
        if (monster.isInvincible) {
          return monster;
        }
        
        // 计算怪物到爆炸点的距离
        const dist = Math.sqrt(
          Math.pow(monster.x - x, 2) + Math.pow(monster.y - y, 2)
        );
        
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
          const affixExpResult = AffixSystem.onDamage(monster, actualDamage);
          const affixExpMonster = affixExpResult.monster;
          actualDamage = affixExpResult.actualDamage;
          
          const newHp = affixExpMonster.hp - actualDamage;
          
          // 词缀完全抵挡（护盾），跳过本次伤害累加与死亡逻辑
          if (affixExpResult.blocked) {
            const now = Date.now();
            setDamageNumbers(prevDamage => [
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
              }
            ]);
            return affixExpMonster;
          }
          
          // 使用伤害累加器：0.3秒内同一怪物的伤害累加
          const now = Date.now();
          setAccumulatedDamage(prev => {
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
                y: monster.y
              });
            } else {
              // 新的伤害
              newMap.set(monster.id, {
                damage: actualDamage,
                isCrit: false,
                isDoubleCrit: false,
                lastTime: now,
                x: monster.x,
                y: monster.y
              });
            }
            return newMap;
          });
          
          if (newHp <= 0) {
            setMonstersRemaining(r => r - 1);
            setScore(s => s + 10);
            
            // 立即释放累加的伤害数字
            setAccumulatedDamage(prev => {
              const accumulated = prev.get(monster.id);
              if (accumulated) {
                const now = Date.now();
                setDamageNumbers(prevDamage => [
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
                  }
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
            const goldValue = config.goldBase * level;
            
            if (monster.isBoss) {
              // BOSS死亡掉落
              setBossAlive(false);
              
              // BOSS死亡时：固定在死亡范围内200px距离随机散落1-3个宝箱和2-3个金币
              const chestCount = Math.floor(Math.random() * 3) + 1; // 1-3个宝箱
              const coinCount = Math.floor(Math.random() * 2) + 2; // 2-3个金币
              
              for (let i = 0; i < chestCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 200;
                const chestX = monster.x + Math.cos(angle) * distance;
                const chestY = monster.y + Math.sin(angle) * distance;
                
                const newChest: Coin = {
                  id: `chest-${Date.now()}-${Math.random()}`,
                  x: chestX,
                  y: chestY,
                  type: 'chest',
                  value: 3 + Math.floor(level / 2),
                  size: 30,
                  color: '#FFD700',
                  spawnTime: Date.now(),
                  isCollected: false,
                  collectAnimationProgress: 0
                };
                
                setCoins(prev => [...prev, newChest]);
              }
              
              for (let i = 0; i < coinCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 200;
                const coinX = monster.x + Math.cos(angle) * distance;
                const coinY = monster.y + Math.sin(angle) * distance;
                
                const newCoin: Coin = {
                  id: `coin-${Date.now()}-${Math.random()}`,
                  x: coinX,
                  y: coinY,
                  type: 'coin',
                  value: goldValue,
                  size: 30,
                  color: '#FFD700',
                  spawnTime: Date.now(),
                  isCollected: false,
                  collectAnimationProgress: 0
                };
                
                setCoins(prev => [...prev, newCoin]);
              }
              
              // BOSS死亡时也掉落新物品
              // 武器属性加成箱：BOSS掉落权重 = (3 + level) × 15
              const bossWeaponBoxDropWeight = (3 + level) * 15;
              if (Math.random() * 100 < bossWeaponBoxDropWeight) {
                const newWeaponBox: Coin = {
                  id: `weapon-box-${Date.now()}-${Math.random()}`,
                  x: monster.x + (Math.random() - 0.5) * 100,
                  y: monster.y + (Math.random() - 0.5) * 100,
                  type: 'weapon_upgrade_box',
                  value: 0,
                  size: 30,
                  color: '#FF69B4',
                  spawnTime: Date.now(),
                  isCollected: false,
                  collectAnimationProgress: 0
                };
                setCoins(prev => [...prev, newWeaponBox]);
              }
              
              // 治疗瓶：BOSS掉落权重 = 已损失生命值 × 15
              const bossLostHp = player.maxHp - player.hp;
              const bossHealthPotionDropWeight = bossLostHp * 15;
              if (Math.random() * 100 < bossHealthPotionDropWeight) {
                const newHealthPotion: Coin = {
                  id: `health-potion-${Date.now()}-${Math.random()}`,
                  x: monster.x + (Math.random() - 0.5) * 100,
                  y: monster.y + (Math.random() - 0.5) * 100,
                  type: 'health_potion',
                  value: 0,
                  size: 30,
                  color: '#32CD32',
                  spawnTime: Date.now(),
                  isCollected: false,
                  collectAnimationProgress: 0
                };
                setCoins(prev => [...prev, newHealthPotion]);
              }
            } else {
              // 普通敌人掉落
              const newCoin: Coin = {
                id: `coin-${Date.now()}-${Math.random()}`,
                x: monster.x,
                y: monster.y,
                type: 'coin',
                value: goldValue,
                size: 15,
                color: '#FFD700',
                spawnTime: Date.now(),
                isCollected: false,
                collectAnimationProgress: 0
              };
              
              setCoins(prev => [...prev, newCoin]);
              
              // 敌人3和4有概率掉落宝箱
              if (monster.monsterType === 3 || monster.monsterType === 4) {
                const chestDropChance = 0.10 + (level * 0.02);
                if (Math.random() < chestDropChance) {
                  const newChest: Coin = {
                    id: `chest-${Date.now()}-${Math.random()}`,
                    x: monster.x,
                    y: monster.y,
                    type: 'chest',
                    value: 3 + Math.floor(level / 2),
                    size: 25,
                    color: '#FFD700',
                    spawnTime: Date.now(),
                    isCollected: false,
                    collectAnimationProgress: 0
                  };
                  
                  setCoins(prev => [...prev, newChest]);
                }
              }
              
              // 掉落新物品：武器属性加成箱和治疗瓶
              // 怪物掉落权重：敌人1=1，敌人2=2，敌人3=2，敌人4=5，BOSS=15
              const monsterDropWeights: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 5 };
              const dropWeight = monster.isBoss ? 15 : (monsterDropWeights[monster.monsterType] || 1);
              
              // 武器属性加成箱：掉落权重 = (3 + level) × 怪物权重
              const weaponBoxDropWeight = (3 + level) * dropWeight;
              if (Math.random() * 100 < weaponBoxDropWeight) {
                const newWeaponBox: Coin = {
                  id: `weapon-box-${Date.now()}-${Math.random()}`,
                  x: monster.x + (Math.random() - 0.5) * 40,
                  y: monster.y + (Math.random() - 0.5) * 40,
                  type: 'weapon_upgrade_box',
                  value: 0,  // 不需要value
                  size: 25,
                  color: '#FF69B4',
                  spawnTime: Date.now(),
                  isCollected: false,
                  collectAnimationProgress: 0
                };
                setCoins(prev => [...prev, newWeaponBox]);
              }
              
              // 治疗瓶：掉落权重 = 已损失生命值 × 怪物权重
              const lostHp = player.maxHp - player.hp;
              const healthPotionDropWeight = lostHp * dropWeight;
              if (Math.random() * 100 < healthPotionDropWeight) {
                const newHealthPotion: Coin = {
                  id: `health-potion-${Date.now()}-${Math.random()}`,
                  x: monster.x + (Math.random() - 0.5) * 40,
                  y: monster.y + (Math.random() - 0.5) * 40,
                  type: 'health_potion',
                  value: 0,  // 不需要value
                  size: 25,
                  color: '#32CD32',
                  spawnTime: Date.now(),
                  isCollected: false,
                  collectAnimationProgress: 0
                };
                setCoins(prev => [...prev, newHealthPotion]);
              }
            }
            
            // 吸血buff判定：如果玩家有吸血等级，10%概率回复1点生命
            if (player.vampireLevel > 0) {
              if (Math.random() < 0.1) {
                // 触发吸血！回复1点生命
                const healAmount = 1;
                setPlayer(prev => ({
                  ...prev,
                  hp: Math.min(prev.hp + healAmount, prev.maxHp)
                }));
                
                // 触发吸血回复动画
                triggerVampireHeal(healAmount);
              }
            }
            
            return { ...affixExpMonster, hp: 0, isDying: true, deathAnimationStartTime: now, deathAnimationProgress: 0 };
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
    const now = Date.now();
    
    // 计算Boom.png的总帧数（每帧256x256px）
    const totalFrames = boomImage ? Math.floor(boomImage.width / 256) : 8;
    const frameDuration = 30; // 每帧30ms
    
    setExplosionEffects(prev => [
      ...prev,
      {
        id: `explosion-${x}-${y}-${now}`,
        x: x,
        y: y,
        radius: radius * 0.8,  // 爆炸动画大小降低为80%
        startTime: now,
        maxRadius: radius * 1.5 * 0.8,  // 爆炸动画最大半径降低为80%
        totalFrames: totalFrames,
        frameDuration: frameDuration,
        firstPassComplete: false,
        rotation: Math.random() * Math.PI * 2,  // 随机旋转角度（0-360度）
      }
    ]);
  };
  
  // 游戏主循环
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let lastTime = Date.now();
    
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
      const currentWeapon = WEAPONS[player.weapon];
      
      // 计算实际属性值
      const actualMaxHp = GAME_CONFIG.PLAYER_MAX_HP + player.maxHpBonus;
      const actualDamage = Math.floor(player.damage + player.damageBonus);
      const actualCritRate = Math.min(0.9, player.critRate + player.critRateBonus / 100);
      const actualCritDamage = player.critDamage + player.critDamageBonus / 100;
      const actualFireRate = Math.floor(1000 / (player.fireRate / (1 + player.fireRateBonus / 100)) * 10) / 10; // 发/秒
      const actualSpeed = (player.playerSpeed * (1 + player.playerSpeedBonus / 100)).toFixed(1);
      const actualRange = Math.floor(player.weaponRange * (1 + player.weaponRangeBonus / 100));
      const actualPenetration = player.penetration + player.penetrationBonus;
      const actualMagazineSize = (() => {
        if (player.weapon === 'rpg') {
          // 两联装Buff：弹夹变为2
          if (hasGrowthChainNode(player, 'rpg_dual_barrel')) {
            return 2;
          }
          return currentWeapon.magazineSize;
        }
        return currentWeapon.magazineSize + player.magazineSizeBonus;
      })();
      
      // 属性列表（格式：名称, 当前值, 加成值, 单位）
      const attributes: { name: string; current: string; bonus: string | null; isPercent?: boolean }[] = [
        { name: t('attrMaxHp'), current: `${actualMaxHp}`, bonus: player.maxHpBonus > 0 ? `+${player.maxHpBonus}` : null },
        { name: t('attrDamage'), current: `${actualDamage}`, bonus: player.damageBonus > 0 ? `+${player.damageBonus}` : null },
        { name: t('attrCritRate'), current: `${(actualCritRate * 100).toFixed(0)}%`, bonus: player.critRateBonus > 0 ? `+${player.critRateBonus}%` : null, isPercent: true },
        { name: t('attrCritDamage'), current: `${(actualCritDamage * 100).toFixed(0)}%`, bonus: player.critDamageBonus > 0 ? `+${player.critDamageBonus.toFixed(0)}%` : null, isPercent: true },
        { name: t('attrFireRate'), current: `${actualFireRate}/秒`, bonus: player.fireRateBonus > 0 ? `+${player.fireRateBonus}%` : null },
        { name: t('attrMoveSpeed'), current: actualSpeed, bonus: player.playerSpeedBonus > 0 ? `+${player.playerSpeedBonus}%` : null },
        { name: t('attrRange'), current: `${actualRange}`, bonus: player.weaponRangeBonus > 0 ? `+${player.weaponRangeBonus}%` : null },
        { name: t('attrPenetration'), current: `${actualPenetration}`, bonus: player.penetrationBonus > 0 ? `+${player.penetrationBonus}` : null },
        { name: t('attrMagazine'), current: `${actualMagazineSize}`, bonus: player.magazineSizeBonus > 0 ? `+${player.magazineSizeBonus}` : null },
        { name: t('attrReload'), current: `${player.reloadSpeedBonus}%`, bonus: player.reloadSpeedBonus > 0 ? null : null },
        { name: t('attrCoinPickup'), current: `${player.coinPickupRangeBonus}%`, bonus: null },
      ];
      
      // 绘制属性列表
      let attrY = leftPanelY + 70;
      const lineHeight = 32;
      
      attributes.forEach(attr => {
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
      if (player.fireBuffLevel > 0) {
        // 效果标题
        context.fillStyle = '#ff6b35';
        context.font = 'bold 16px "Ark Pixel", Arial';
        context.textAlign = 'left';
        context.fillText(`${t('effectIgniteTitle')} Lv.${player.fireBuffLevel}`, rightPanelX + 20, effectY);
        
        effectY += 25;
        
        // 效果详情
        context.fillStyle = '#cccccc';
        context.font = '12px "Ark Pixel", Arial';
        const fireDetails = [
          `${t('effectTriggerChance')}: ${20 * player.fireBuffLevel}%`,
          `${t('effectIgniteDps')}: ${1 + player.fireBuffLevel}${t('effectPerLayerPerSec')}`,
          `${t('effectMaxStacks')}: ${t('effectUpTo5')}`,
          `${t('effectSpreadRange')}: 80px`,
        ];
        fireDetails.forEach(detail => {
          context.fillText(`• ${detail}`, rightPanelX + 30, effectY);
          effectY += 18;
        });
        
        effectY += 15;
      }
      
      // 淬毒效果
      if (player.poisonBuffLevel > 0) {
        // 效果标题
        context.fillStyle = '#00ff66';
        context.font = 'bold 16px "Ark Pixel", Arial';
        context.textAlign = 'left';
        context.fillText(`${t('effectPoisonTitle')} Lv.${player.poisonBuffLevel}`, rightPanelX + 20, effectY);
        
        effectY += 25;
        
        // 效果详情
        context.fillStyle = '#cccccc';
        context.font = '12px "Ark Pixel", Arial';
        const poisonDetails = [
          `${t('effectTriggerChance')}: ${20 * player.poisonBuffLevel}%`,
          `${t('effectPoisonDps')}: ${1 + player.poisonBuffLevel}${t('effectPerLayerPerSec')}`,
          `${t('effectMaxStacks')}: ${t('effectUpTo5')}`,
          `${t('effectSlow')}: 20%`,
          `${t('effectZoneRadius')}: ${60 + player.poisonBuffLevel * 20}px`,
          `${t('effectZoneDps')}: ${1 + player.poisonBuffLevel}${t('effectPerHalfSec')}`,
          `${t('effectZoneLimit')}: ${GAME_CONFIG.MAX_POISON_CIRCLES}`,
        ];
        poisonDetails.forEach(detail => {
          context.fillText(`• ${detail}`, rightPanelX + 30, effectY);
          effectY += 18;
        });
        
        effectY += 15;
      }
      
      // 如果没有任何特殊效果
      if (player.fireBuffLevel === 0 && player.poisonBuffLevel === 0) {
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
      context.fillText(`${t('weaponLv')} ${player.weaponLevel}`, centerX + centerWidth / 2, centerY + 80);
      
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
    
    const gameLoop = () => {
      if (gameState !== 'playing') return;
      
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      const now = currentTime; // 当前时间戳，供更新和渲染逻辑使用
      lastTime = currentTime;
      
      // 震屏强度每帧衰减（爆炸震屏的自然消减）
      screenShakeRef.current *= 0.86;
      if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      
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
        const jumpDist = Math.hypot(player.x - cam.x, player.y - cam.y);
        if (!cameraInitRef.current || jumpDist > 2000) {
          cam.x = player.x;
          cam.y = player.y;
          tgt.x = player.x;
          tgt.y = player.y;
          playerPrevPosRef.current = { x: player.x, y: player.y };
          cameraInitRef.current = true;
        }

        // 玩家是否在移动（位置变化检测）
        const pDx = player.x - playerPrevPosRef.current.x;
        const pDy = player.y - playerPrevPosRef.current.y;
        const playerMoved = Math.hypot(pDx, pDy) > 0.05;
        playerPrevPosRef.current = { x: player.x, y: player.y };

        // 1) 跟随目标点：移动时按死区半径推动，静止时缓慢归位到玩家中心
        const dxp = player.x - tgt.x;
        const dyp = player.y - tgt.y;
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
        const ldx = player.x - cam.x;
        const ldy = player.y - cam.y;
        const ldist = Math.hypot(ldx, ldy);
        if (ldist > lagLimit) {
          const excess = ldist - lagLimit;
          const step = Math.min(excess, (excess / cfg.LAG_CATCHUP_TIME) * dtSec);
          cam.x += (ldx / ldist) * step;
          cam.y += (ldy / ldist) * step;
        }
      }

      // 叠加震屏随机偏移实现屏幕震动，并对镜头做关卡边界钳制（越界截断，无回弹动画）
      const shakeMag = screenShakeRef.current;
      const shakeOffX = (Math.random() - 0.5) * shakeMag;
      const shakeOffY = (Math.random() - 0.5) * shakeMag;
      const halfW = GAME_CONFIG.CANVAS_WIDTH / 2;
      const halfH = GAME_CONFIG.CANVAS_HEIGHT / 2;
      const clampedCamX = Math.min(Math.max(cameraPosRef.current.x, halfW), Math.max(halfW, GAME_CONFIG.WORLD_WIDTH - halfW));
      const clampedCamY = Math.min(Math.max(cameraPosRef.current.y, halfH), Math.max(halfH, GAME_CONFIG.WORLD_HEIGHT - halfH));
      const cameraX = clampedCamX - halfW + shakeOffX;
      const cameraY = clampedCamY - halfH + shakeOffY;
      
      // 应用摄像机变换
      if (!baseTransformRef.current) { baseTransformRef.current = ctx.getTransform(); }
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
      const weaponConfig = WEAPONS[player.weapon];
      // 狂暴状态：换弹速度+30%
      const desperateActive = isDesperateFightActive(player);
      const effectiveReloadBonus = player.reloadSpeedBonus + (desperateActive ? 30 : 0);
      const effectiveReloadTime = getEffectiveReloadTime(weaponConfig, effectiveReloadBonus) * (player.weapon === 'pistol' && hasGrowthChainNode(player, 'pistol_final_strike_chain') ? 1.4 : 1);
      
      // ========== 更新逻辑（暂停时不执行）==========
      if (!isPaused) {
        // 分批敌人生成检查
        const now = Date.now();
        
        // 检查是否需要生成下一批敌人
        if (pendingMonsterBatches.length > 0) {
          const shouldSpawnByTime = nextBatchTime && now >= nextBatchTime;
          const currentAliveMonsters = monsters.filter(m => !m.isDying).length;
          const shouldSpawnByCount = currentBatchInitialCount > 0 && 
                                      currentAliveMonsters < currentBatchInitialCount * 0.3;
          
          if (shouldSpawnByTime || shouldSpawnByCount) {
            // 无进行中的波次衔接时才进入交接（先公告+倒计时，再生成下一批）
            if (!waveTransition) {
              const nextBatch = pendingMonsterBatches[0];
              const incomingWaveNumber = Math.max(2, thisLevelWaveTotal - pendingMonsterBatches.length + 1);
              setWaveTransition({ startTime: now, waveNumber: incomingWaveNumber, enemyCount: nextBatch.length });
            }
          }

          // 波次衔接推进：公告停留2秒→淡出0.3秒→间隔0.5秒→3/2/1倒计时各1秒→生成下一批
          if (waveTransition) {
            const ANNOUNCE_HOLD = 2000;      // “第X波”停留2秒
            const ANNOUNCE_FADE = 300;       // 淡出0.3秒
            const COUNTDOWN_DELAY = 500;     // 淡出后间隔0.5秒
            const COUNTDOWN_TOTAL = 3000;    // 3/2/1各1秒
            const WAVE_DELAY = 4000;          // 波间延迟4秒
            const WAVE_SPAWN_TIME = WAVE_DELAY + ANNOUNCE_HOLD + ANNOUNCE_FADE + COUNTDOWN_DELAY + COUNTDOWN_TOTAL;
            const waveElapsed = now - waveTransition.startTime;

            if (waveElapsed >= WAVE_SPAWN_TIME && pendingMonsterBatches.length > 0) {
              // 倒计时结束，生成下一批敌人
              const nextBatch = pendingMonsterBatches[0];
              const screenWidth = 1280;
              const screenHeight = 720;
              const margin = 100;
              const repositionedMonsters = nextBatch.map(monster => {
                let x, y;
                let attempts = 0;
                const maxAttempts = 20;
                let validPosition = false;
                do {
                  const direction = Math.floor(Math.random() * 4);
                  switch (direction) {
                    case 0: // 上方
                      x = player.x + (Math.random() - 0.5) * screenWidth * 1.5;
                      y = player.y - screenHeight / 2 - margin - Math.random() * 100;
                      break;
                    case 1: // 下方
                      x = player.x + (Math.random() - 0.5) * screenWidth * 1.5;
                      y = player.y + screenHeight / 2 + margin + Math.random() * 100;
                      break;
                    case 2: // 左方
                      x = player.x - screenWidth / 2 - margin - Math.random() * 100;
                      y = player.y + (Math.random() - 0.5) * screenHeight * 1.5;
                      break;
                    default: // 右方
                      x = player.x + screenWidth / 2 + margin + Math.random() * 100;
                      y = player.y + (Math.random() - 0.5) * screenHeight * 1.5;
                      break;
                  }
                  x = Math.max(30, Math.min(GAME_CONFIG.WORLD_WIDTH - 30, x));
                  y = Math.max(30, Math.min(GAME_CONFIG.WORLD_HEIGHT - 30, y));
                  const isOutsideScreen = Math.abs(x - player.x) > screenWidth / 2 + margin * 0.5 || 
                                           Math.abs(y - player.y) > screenHeight / 2 + margin * 0.5;
                  if (attempts > 15 || isOutsideScreen) validPosition = true;
                  attempts++;
                } while (!validPosition && attempts < maxAttempts);
                if (!validPosition) {
                  if (Math.random() < 0.5) {
                    x = Math.random() < 0.5 ? 50 : GAME_CONFIG.WORLD_WIDTH - 50;
                    y = Math.random() * GAME_CONFIG.WORLD_HEIGHT;
                  } else {
                    x = Math.random() * GAME_CONFIG.WORLD_WIDTH;
                    y = Math.random() < 0.5 ? 50 : GAME_CONFIG.WORLD_HEIGHT - 50;
                  }
                }
                return {
                  ...monster,
                  id: `monster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  x,
                  y,
                };
              });

              // 添加新敌人
              setMonsters(prev => [...prev, ...repositionedMonsters]);
              setCurrentBatchInitialCount(repositionedMonsters.length);
              setMonstersRemaining(prev => prev + repositionedMonsters.length);
              const newPendingLength = pendingMonsterBatches.length - 1;
              setPendingMonsterBatches(prev => prev.slice(1));
              if (newPendingLength > 0) {
                setNextBatchTime(now + 15000);
              } else {
                setNextBatchTime(null);
              }
              setWaveTransition(null);
            }
          }
        }
        
        // 消费闪现请求：按触发时的移动方向快照初始化闪现（0.4s 内位移 350px，期间无敌且无法攻击）
        if (dashPendingRef.current) {
          dashPendingRef.current = false;
          if (!dashRef.current.active && dashCooldown <= 0 && gameState === 'playing' && !isPaused) {
            let ddx = 0, ddy = 0;
            if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) ddy -= 1;
            if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) ddy += 1;
            if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) ddx -= 1;
            if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) ddx += 1;
            const dl = Math.hypot(ddx, ddy) || 0.0001;
            dashRef.current = { active: true, startTime: Date.now(), fromX: player.x, fromY: player.y, dirX: ddx / dl, dirY: ddy / dl, recoveryStart: 0 };
            // 触发冷却（5秒）
            setDashCooldown(DASH_COOLDOWN_MS);
            dashCooldownStartRef.current = Date.now();
          }
        }

        // 闪现冷却倒计时（每帧递减，冷却结束翻转可再次使用）
        if (dashCooldownStartRef.current > 0) {
          const remaining = Math.max(0, DASH_COOLDOWN_MS - (Date.now() - dashCooldownStartRef.current));
          if (remaining <= 0) {
            dashCooldownStartRef.current = 0;
          }
          if (remaining !== dashCooldown) {
            setDashCooldown(remaining);
          }
        }

        // 更新玩家位置
      setPlayer(prev => {
        const now = Date.now();
        
        // 获取当前武器的速度倍率
        const currentWeapon = WEAPONS[prev.weapon];
        const weaponSpeedMultiplier = currentWeapon?.playerSpeedMultiplier ?? 1.0;
        
        // 狂暴状态：移动速度+1
        const desperateActive = isDesperateFightActive(prev);
        const desperateSpeedBonus = desperateActive ? 1 : 0;
        
        // 检查是否处于受击状态
        let currentSpeed = (prev.playerSpeed + desperateSpeedBonus) * weaponSpeedMultiplier;
        if (prev.isHit && (now - prev.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION)) {
          // 受击时减速
          currentSpeed = (prev.playerSpeed + desperateSpeedBonus) * weaponSpeedMultiplier * GAME_CONFIG.HIT_SLOWDOWN_FACTOR;
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
          const vNorm = NORMAL_MOVE_PPM;            // 末速 = 正常移速 (px/ms)
          const vMax = (2 * 350) / T - vNorm;       // 初速，保证积分总位移=350
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
          if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) newY -= currentSpeed;
          if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) newY += currentSpeed;
          if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) newX -= currentSpeed;
          if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) newX += currentSpeed;
        }
        
        // 检测是否在移动
        isMoving = (newX !== prev.x || newY !== prev.y);
        
        // 边界检测（使用世界坐标系的边界）
        newX = Math.max(GAME_CONFIG.PLAYER_SIZE, Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.PLAYER_SIZE, newX));
        newY = Math.max(GAME_CONFIG.PLAYER_SIZE, Math.min(GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.PLAYER_SIZE, newY));
        
        // 障碍物碰撞检测
        for (const obstacle of obstacles) {
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
          animationStartTime: animationStartTime
        };
      });
      
      // 检查R键主动换弹
      if (keys.has('r') || keys.has('R')) {
        const maxAmmo = (() => {
          if (player.weapon === 'rpg') {
            if (hasGrowthChainNode(player, 'rpg_dual_barrel')) {
              return 2;
            }
            return WEAPONS[player.weapon].magazineSize;
          }
          return getWeaponMagazine(player, player.weapon);
        })();
        if (!player.isReloading && player.currentAmmo < maxAmmo) {
          setPlayer(prev => ({
            ...prev,
            isReloading: true,
            reloadStartTime: Date.now(),
            reloadInterrupted: false // 重置中断标志
          }));
          // 移除R键，避免重复触发
          setKeys(prev => {
            const newKeys = new Set(prev);
            newKeys.delete('r');
            newKeys.delete('R');
            return newKeys;
          });
        }
      }
      
      // 检查换弹状态
      if (player.isReloading) {
        // 检查换弹是否完成
        if (now - player.reloadStartTime >= effectiveReloadTime) {
          // 散弹枪特殊处理：一发一发装填
          if (player.weapon === 'shotgun') {
            // 填充1发子弹
            const newAmmo = player.currentAmmo + 1;
            const maxAmmo = weaponConfig.magazineSize + player.magazineSizeBonus;
            
            if (newAmmo < maxAmmo && !player.reloadInterrupted) {
              // 弹夹未满且换弹未被中断，自动触发下一次换弹
              setPlayer(prev => ({
                ...prev,
                currentAmmo: newAmmo,
                reloadStartTime: Date.now() // 重置换弹开始时间，触发下一次换弹
              }));
            } else {
              // 弹夹已满或换弹被中断，结束换弹
              setPlayer(prev => ({
                ...prev,
                currentAmmo: newAmmo,
                isReloading: false,
                reloadStartTime: 0,
                reloadInterrupted: false // 重置中断标志
              }));
            }
          } else {
            // 其他武器：一次性填满
            const fullAmmo = (() => {
              if (player.weapon === 'rpg') {
                if (hasGrowthChainNode(player, 'rpg_dual_barrel')) {
                  return 2;
                }
                return weaponConfig.magazineSize;
              }
              return weaponConfig.magazineSize + player.magazineSizeBonus;
            })();
            
            setPlayer(prev => ({
              ...prev,
              currentAmmo: fullAmmo,
              isReloading: false,
              reloadStartTime: 0
            }));
          }
        }
      }
      
      // 射击（切换武器期间无法射击）
      if (isMouseDown && player.currentAmmo > 0 && !player.isSwitchingWeapon && !dashRef.current.active) {
        // 如果正在换弹且开枪，终止换弹
        if (player.isReloading) {
          setPlayer(prev => ({
            ...prev,
            isReloading: false,
            reloadStartTime: 0,
            reloadInterrupted: player.weapon === 'shotgun' // 散弹枪标记为中断
          }));
        }
        
        // 狂暴状态：射速+30%（射击间隔减少30%）
        const desperateActive = isDesperateFightActive(player);
        const effectiveFireRate = desperateActive ? player.fireRate * 0.7 : player.fireRate;
        
        if (now - player.lastShot > effectiveFireRate) {
          const canvasRect = canvas.getBoundingClientRect();
          const baseAngle = Math.atan2(
            mousePos.y - canvasRect.top - GAME_CONFIG.CANVAS_HEIGHT / 2,
            mousePos.x - canvasRect.left - GAME_CONFIG.CANVAS_WIDTH / 2
          );
          
          // 计算枪口位置（与武器渲染保持一致）
          const weaponScale = 1.56;
          let weaponWidth = 50;
          
          switch (player.weapon) {
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
          const isShortRangeWeapon = player.weapon === 'pistol' || player.weapon === 'smg';
          const rangeMultiplier = isShortRangeWeapon ? 0.6 : 1.0;
          
          // 特殊处理狙击枪和散弹枪：枪口火焰往旋转中心移动30px
          const sniperMuzzleOffset = player.weapon === 'sniper' ? -30 : 0;
          const shotgunMuzzleOffset = player.weapon === 'shotgun' ? -30 : 0;
          const muzzleOffset = sniperMuzzleOffset || shotgunMuzzleOffset;
          
          const gunMuzzleX = player.x + Math.cos(baseAngle) * (weaponOffset + scaledWidth * 0.8 * rangeMultiplier + muzzleOffset);
          const gunMuzzleY = player.y + Math.sin(baseAngle) * (weaponOffset + scaledWidth * 0.8 * rangeMultiplier + muzzleOffset);
          
          const newBullets: Bullet[] = [];
          
          // 根据武器类型发射子弹
          const bulletCount = weaponConfig.bulletsPerShot;
          const halfSpread = weaponConfig.spreadAngle / 2;
          
          for (let i = 0; i < bulletCount; i++) {
            const angle = bulletCount > 1 
              ? baseAngle - halfSpread + (weaponConfig.spreadAngle * i / (bulletCount - 1))
              : baseAngle;
            
            // 添加轻微的随机散射
            const spread = weaponConfig.spreadAngle > 0 ? (Math.random() - 0.5) * weaponConfig.spreadAngle * 0.3 : 0;
            const finalAngle = angle + spread;
            
            // 判断是否暴击（使用有效暴击率，带软上限）
            // 狂暴状态：暴击率+20%，暴击伤害+100%
            const desperateActive = isDesperateFightActive(player);
            const critRateBonus = player.critRateBonus + (desperateActive ? 20 : 0) + getEquippedWeaponCritPct(player);
            const critDamageBonus = player.critDamageBonus + (desperateActive ? 100 : 0);
            const effectiveCritRate = getEffectiveCritRate(WEAPONS[player.weapon].critRate, critRateBonus);
            const isCrit = Math.random() < effectiveCritRate;
            const effectiveCritDamage = getEffectiveCritDamageBonus(1.5, critDamageBonus);
            const actualDamage = isCrit ? Math.floor(player.damage * effectiveCritDamage) : player.damage;
            
            // 判断是否是火箭弹
            const isRocket = player.weapon === 'rpg';
            
            // 火箭筒专属Buff检测
            const hasRPGShockwave = isRocket && hasGrowthChainNode(player, 'rpg_shockwave');
            const hasRPGAPShot = isRocket && hasGrowthChainNode(player, 'rpg_ap_shot');
            const hasRPGDualBarrel = isRocket && hasGrowthChainNode(player, 'rpg_dual_barrel');
            
            // 判断是否是手枪的最后一发子弹且拥有该成长链节点
            const isPistolLastBullet = 
              player.weapon === 'pistol' && 
              player.currentAmmo === 1 && 
              hasGrowthChainNode(player, 'pistol_last_penetration');
            
            // === 手枪"孤注一掷"（换弹+40%，最后3发伤害递增50%/100%/200%，最后一发必暴击+穿透）===
            const hasPistolFinalStrike = player.weapon === 'pistol' && hasGrowthChainNode(player, 'pistol_final_strike_chain');
            let pistolStrikeMultiplier = 1; // 伤害倍率
            let pistolForceCrit = false; // 是否强制暴击
            if (hasPistolFinalStrike) {
              const finalAmmoCount = player.currentAmmo; // 发射前弹匣余量
              if (finalAmmoCount === 3) pistolStrikeMultiplier = 1.5;       // 倒数第三发 +50%
              else if (finalAmmoCount === 2) pistolStrikeMultiplier = 2;    // 倒数第二发 +100%
              else if (finalAmmoCount === 1) { pistolStrikeMultiplier = 3; pistolForceCrit = true; } // 最后一发 +200% 且必暴击
            }
            const finalPistolIsCrit = (isCrit || pistolForceCrit) && !isRocket;
            const finalPistolDamage = Math.floor(player.damage * pistolStrikeMultiplier * (finalPistolIsCrit ? effectiveCritDamage : 1));
            const pistolFinalLastPenetrate = hasPistolFinalStrike && player.currentAmmo === 1; // 孤注一掷最后一发穿透所有
            
            // 计算火箭弹的最终速度（受子弹速度增益影响）
            // 初始速度固定为0.3，最终速度为5（基础值）+ 增益
            const rocketInitialSpeed = 0.3;
            const rocketBaseFinalSpeed = 5;
            const bulletSpeedBonus = player.bulletSpeed - WEAPONS.rpg.bulletSpeed; // 计算子弹速度增益
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
              id: `bullet-${Date.now()}-${i}`,
              x: gunMuzzleX,
              y: gunMuzzleY,
              vx: isRocket ? Math.cos(finalAngle) * rocketInitialSpeed : Math.cos(finalAngle) * player.bulletSpeed,
              vy: isRocket ? Math.sin(finalAngle) * rocketInitialSpeed : Math.sin(finalAngle) * player.bulletSpeed,
              weapon: player.weapon,
              size: weaponConfig.bulletSize * (isRocket ? rpgScale : 1),
              color: weaponConfig.color,
              damage: isRocket ? 0 : Math.floor(player.damage * pistolStrikeMultiplier), // 火箭弹直接伤害为0，同时应用孤注一掷伤害倍率
              isCrit: finalPistolIsCrit, // 应用孤注一掷的强制暴击
              actualDamage: isRocket ? 0 : finalPistolDamage,
              penetration: isRocket ? 0 : ((isPistolLastBullet || pistolFinalLastPenetrate) ? 9999 : player.penetration), // 手枪最后一发子弹无限穿透 / 孤注一掷最后一发穿透
              hitCount: 0,
              range: player.weaponRange,
              distanceTraveled: 0,
              startX: gunMuzzleX,
              startY: gunMuzzleY,
              isRocket: isRocket,
              explosionRadius: rpgExplosionRadius,
              explosionDamage: rpgExplosionDamage,
              // 火箭弹变速相关字段
              initialSpeed: isRocket ? rocketInitialSpeed : player.bulletSpeed,
              finalSpeed: isRocket ? rocketFinalSpeed : player.bulletSpeed,
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
          
          setBullets(prev => [...prev, ...newBullets]);
          
          // 播放开火音效
          playSound('shoot');
          
          // 创建枪火动画（复古像素风格，每帧60ms，总共300ms）
          // 火箭筒不播放枪口火焰特效
          if (player.weapon !== 'rpg') {
            const flashId = `muzzle-flash-${Date.now()}-${Math.random()}`;
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
              scale: flashScale
            });
          }
          
          // 增加后坐力效果（仅视觉）
          const recoilStrength = weaponConfig.damage * 0.5; // 根据武器伤害决定后坐力强度
          recoilRef.current = {
            backward: 8 + recoilStrength * 0.3,  // 后退距离
            upward: 0.08 + recoilStrength * 0.005,  // 上跳角度（弧度）
            shake: 2 + recoilStrength * 0.1,  // 晃动强度
          };
          
          setPlayer(prev => { 
            const newAmmo = prev.currentAmmo - 1;
            return {
              ...prev, 
              lastShot: now,
              currentAmmo: newAmmo,
              // 弹药用完时自动换弹
              isReloading: newAmmo <= 0 ? true : prev.isReloading,
              reloadStartTime: newAmmo <= 0 ? now : prev.reloadStartTime,
              // 散弹枪重置中断标志
              reloadInterrupted: newAmmo <= 0 && prev.weapon === 'shotgun' ? false : prev.reloadInterrupted
            };
          });
          
          // ========== 两联装Buff：0.7秒后发射第二发 ==========
          if (hasGrowthChainNode(player, 'rpg_dual_barrel') && player.currentAmmo > 1) {
            setTimeout(() => {
              // 检查第二发发射条件
              setPlayer(prev => {
                if (prev.weapon !== 'rpg' || prev.currentAmmo < 1 || prev.isSwitchingWeapon || prev.isReloading) {
                  return prev;
                }
                
                const secondNow = Date.now();
                const canvasRect = canvas.getBoundingClientRect();
                const baseAngle = Math.atan2(
                  mousePos.y - canvasRect.top - GAME_CONFIG.CANVAS_HEIGHT / 2,
                  mousePos.x - canvasRect.left - GAME_CONFIG.CANVAS_WIDTH / 2
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
                  id: `bullet-${Date.now()}-second`,
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
                
                setBullets(prevBullets => [...prevBullets, secondBullet]);
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
      
      // 更新子弹位置和检测碰撞
      setBullets(prev => {
        const newBullets = prev.filter(bullet => {
          bullet.x += bullet.vx;
          bullet.y += bullet.vy;
          
          // 火箭弹速度更新逻辑（2秒内加速到最终速度）
          if (bullet.isRocket) {
            const now = Date.now();
            const accelerationProgress = Math.min((now - bullet.accelerationStartTime) / bullet.accelerationDuration, 1);
            
            // 线性插值计算当前速度
            const currentSpeed = bullet.initialSpeed + (bullet.finalSpeed - bullet.initialSpeed) * accelerationProgress;
            
            // 计算当前速度方向（保持原有的运动方向）
            const currentSpeedMagnitude = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
            if (currentSpeedMagnitude > 0) {
              bullet.vx = (bullet.vx / currentSpeedMagnitude) * currentSpeed;
              bullet.vy = (bullet.vy / currentSpeedMagnitude) * currentSpeed;
            }
            
            // 火箭弹烟雾生成逻辑（每0.15秒生成一个）
            const smokeInterval = 150; // 0.15秒
            if (now - bullet.lastSmokeTime >= smokeInterval) {
              bullet.lastSmokeTime = now;
              
              // 在火箭弹尾部生成烟雾（尾部位置 = 火箭弹位置 - 速度方向 * 半径）
              const tailX = bullet.x - (bullet.vx / currentSpeedMagnitude) * bullet.size;
              const tailY = bullet.y - (bullet.vy / currentSpeedMagnitude) * bullet.size;
              
              const newSmoke: SmokeEffect = {
                id: `smoke-${Date.now()}-${Math.random()}`,
                x: tailX,
                y: tailY,
                startTime: now,
                duration: 800, // 持续时间0.8秒
                initialSize: bullet.size * 2.4, // 初始大小（放大20%）
                finalSize: bullet.size * 4.8, // 最终大小（膨胀2倍，放大20%）
              };
              
              setSmokeEffects(prev => [...prev, newSmoke]);
            }
          }
          
          // 计算子弹飞行距离
          bullet.distanceTraveled = Math.sqrt(
            Math.pow(bullet.x - bullet.startX, 2) +
            Math.pow(bullet.y - bullet.startY, 2)
          );
          
          // 射程检测
          if (bullet.distanceTraveled > bullet.range) {
            // 火箭弹射程检测：触发爆炸
            if (bullet.isRocket) {
              triggerExplosion(bullet.x, bullet.y, bullet.explosionRadius, bullet.explosionDamage, bullet.isRPGShockwave, bullet.isRPGAPShot);
            }
            return false;
          }
          
          // 检测与怪物碰撞（使用子弹的大小）
          let hitMonster = false;
          setMonsters(monsterList => {
            const updatedMonsters = monsterList.map(monster => {
              // 死亡的怪物不再处理碰撞
              if (monster.isDying) {
                return monster;
              }
              
              // 如果怪物处于无敌状态，跳过碰撞
              if (monster.isInvincible) {
                return monster;
              }
            const monsterConfig = MONSTER_CONFIGS[monster.monsterType];
              
              if (!hitMonster && checkCollision(bullet, monster, bullet.size, monsterConfig.size)) {
                hitMonster = true;
                
                // 火箭弹碰撞检测：触发爆炸并影响范围内所有敌人
                if (bullet.isRocket) {
                  triggerExplosion(bullet.x, bullet.y, bullet.explosionRadius, bullet.explosionDamage, bullet.isRPGShockwave, bullet.isRPGAPShot);
                  // 火箭弹爆炸后立即返回，不执行后续普通子弹伤害逻辑
                  return monster;
                }
                
                bullet.hitCount++;
                
                // 计算伤害衰减：每次命中后伤害减半，最小为1
                // 手枪最后一发子弹无伤害衰减
                const damageMultiplier = bullet.isPistolLastBullet ? 1 : Math.pow(0.5, bullet.hitCount - 1);
                let actualDamage = Math.max(1, Math.floor(bullet.actualDamage * damageMultiplier));
                let isDoubleCrit = false; // 是否触发二次暴击
                
                // 二次暴击机制：暴击有概率触发二次暴击，造成暴击伤害150%的额外伤害
                // 概率等于暴击率的一半
                const currentPlayer = playerRef.current;
                if (bullet.isCrit && bullet.hitCount === 1 && currentPlayer && currentPlayer.criticalRageLevel > 0) {
                  const effectiveCritRate = getEffectiveCritRate(WEAPONS[currentPlayer.weapon].critRate, currentPlayer.critRateBonus + getEquippedWeaponCritPct(currentPlayer));
                  const doubleCritChance = effectiveCritRate / 2; // 概率等于暴击率的一半
                  if (Math.random() < doubleCritChance) {
                    // 触发二次暴击！
                    const effectiveCritDamage = getEffectiveCritDamageBonus(1.5, currentPlayer.critDamageBonus);
                    const doubleCritExtraDamage = Math.floor(bullet.actualDamage * effectiveCritDamage * 1.5); // 暴击伤害的150%
                    actualDamage += doubleCritExtraDamage;
                    isDoubleCrit = true;
                  }
                }
                
                // ========== 词缀伤害拦截（如护盾抵挡伤害事件） ==========
                const affixDamageResult = AffixSystem.onDamage(monster, actualDamage);
                let affixMonster = affixDamageResult.monster;
                actualDamage = affixDamageResult.actualDamage;
                
                let newHp = affixMonster.hp - actualDamage;
                let isExecuted = false; // 是否被处决
                const affixBlocked = affixDamageResult.blocked;
                
                // 处决buff判定：如果玩家有处决等级，且敌人血量低于18%
                if (!affixBlocked && currentPlayer && currentPlayer.executionLevel > 0) {
                  const hpPercentAfterDamage = newHp / affixMonster.maxHp;
                  if (hpPercentAfterDamage < 0.18 && newHp > 0) {
                    // 处决！直接击杀
                    newHp = 0;
                    isExecuted = true;
                  }
                }
                
                if (affixBlocked) {
                  // 被词缀完全抵挡（如护盾），不掉血但显示 0 伤害提示
                  const now = Date.now();
                  setDamageNumbers(prevDamage => [
                    ...prevDamage,
                    {
                      id: `shield-block-${monster.id}-${now}`,
                      monsterId: monster.id,
                      x: affixMonster.x,
                      y: affixMonster.y - 20,
                      damage: 0,
                      opacity: 0.8,
                      scale: 0.8,
                      startTime: now,
                      isCrit: false,
                      isShieldBlock: true,
                    }
                  ]);
                  
                  // 应用击退（即使被护盾抵挡仍有击退效果）
                  if (currentPlayer && currentPlayer.knockback > 0) {
                    const bdx = bullet.vx;
                    const bdy = bullet.vy;
                    const bspeed = Math.sqrt(bdx * bdx + bdy * bdy);
                    if (bspeed > 0) {
                      const kbDist = 20 + (currentPlayer.knockback - 1) * 10;
                      const kbVx = (bdx / bspeed) * kbDist;
                      const kbVy = (bdy / bspeed) * kbDist;
                      affixMonster = {
                        ...affixMonster,
                        knockbackVx: kbVx,
                        knockbackVy: kbVy,
                        knockbackEndTime: now + 200,
                      };
                    }
                  }
                  
                  return affixMonster;
                }
                
                // 使用伤害累加器：0.3秒内同一怪物的伤害累加
                const now = Date.now();
                setAccumulatedDamage(prev => {
                  const newMap = new Map(prev);
                  const existing = newMap.get(monster.id);
                  if (existing) {
                    // 累加伤害
                    newMap.set(monster.id, {
                      damage: existing.damage + actualDamage,
                      isCrit: existing.isCrit || (bullet.isCrit && bullet.hitCount === 1),
                      isDoubleCrit: existing.isDoubleCrit || isDoubleCrit,
                      lastTime: now,
                      x: monster.x,
                      y: monster.y
                    });
                  } else {
                    // 新的伤害
                    newMap.set(monster.id, {
                      damage: actualDamage,
                      isCrit: bullet.isCrit && bullet.hitCount === 1,
                      isDoubleCrit: isDoubleCrit,
                      lastTime: now,
                      x: monster.x,
                      y: monster.y
                    });
                  }
                  return newMap;
                });
                
                if (newHp <= 0) {
                  setMonstersRemaining(r => r - 1);
                  setScore(s => s + 10);
                  
                  // 播放敌人死亡音效
                  playSound('enemy_death');
                  
                  // 立即释放累加的伤害数字
                  setAccumulatedDamage(prev => {
                    const accumulated = prev.get(monster.id);
                    if (accumulated) {
                      const now = Date.now();
                      // 如果是处决，显示红色"处决！！"飘字
                      if (isExecuted) {
                        setDamageNumbers(prevDamage => [
                          ...prevDamage,
                          {
                            id: `execution-${monster.id}-${now}`,
                            monsterId: monster.id,
                            x: monster.x,
                            y: monster.y - 10,
                            damage: 0, // 伤害设为0，用于标识处决
                            opacity: 1.0,
                            scale: 1.5, // 更大的缩放
                            startTime: now,
                            isCrit: true,
                            isExecution: true, // 标记为处决
                          }
                        ]);
                      } else {
                        setDamageNumbers(prevDamage => [
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
                          }
                        ]);
                      }
                      // 从累加器中移除
                      const newMap = new Map(prev);
                      newMap.delete(monster.id);
                      return newMap;
                    }
                    return prev;
                  });
                  
                  // 设置死亡状态，播放受击动画后移除
                  // 掉落金币和宝箱
                  const monsterConfig = MONSTER_CONFIGS[monster.monsterType];
                  let goldValue;
                  
                  // 计算金币数量
                  if (monsterConfig.isBoss) {
                    // BOSS：goldBase × 关卡数
                    goldValue = monsterConfig.goldBase * level;
                  } else if (monster.monsterType === 1 || monster.monsterType === 2) {
                    // 敌人1和2：固定为1
                    goldValue = 1;
                  } else {
                    // 敌人3和4：floor(2 + level/5)
                    goldValue = Math.floor(2 + level / 5);
                  }
                  
                  // BOSS死亡时的额外掉落
                  if (monsterConfig.isBoss) {
                    goldValue = monsterConfig.goldBase * level;  // 50 × 关卡数
                    setBossAlive(false);
                    
                    // BOSS死亡时：固定在死亡范围内200px距离随机散落1-3个宝箱和2-3个金币
                    const chestCount = Math.floor(Math.random() * 3) + 1; // 1-3个宝箱
                    const coinCount = Math.floor(Math.random() * 2) + 2; // 2-3个金币
                    
                    for (let i = 0; i < chestCount; i++) {
                      const angle = Math.random() * Math.PI * 2;
                      const distance = Math.random() * 200;
                      const chestX = monster.x + Math.cos(angle) * distance;
                      const chestY = monster.y + Math.sin(angle) * distance;
                      
                      const newChest: Coin = {
                        id: `chest-${Date.now()}-${Math.random()}`,
                        x: chestX,
                        y: chestY,
                        type: 'chest',
                        value: 3 + Math.floor(level / 2), // 宝箱打开后获得的金币数
                        size: 30,
                        color: '#FFD700',
                        spawnTime: Date.now(),
                        isCollected: false,
                        collectAnimationProgress: 0
                      };
                      
                      setCoins(prev => [...prev, newChest]);
                    }
                    
                    for (let i = 0; i < coinCount; i++) {
                      const angle = Math.random() * Math.PI * 2;
                      const distance = Math.random() * 200;
                      const coinX = monster.x + Math.cos(angle) * distance;
                      const coinY = monster.y + Math.sin(angle) * distance;
                      
                      const newCoin: Coin = {
                        id: `coin-${Date.now()}-${Math.random()}`,
                        x: coinX,
                        y: coinY,
                        type: 'coin',
                        value: goldValue,
                        size: 30,  // BOSS金币更大
                        color: '#FFD700',
                        spawnTime: Date.now(),
                        isCollected: false,
                        collectAnimationProgress: 0
                      };
                      
                      setCoins(prev => [...prev, newCoin]);
                    }
                  } else {
                    // 普通敌人掉落
                    const newCoin: Coin = {
                      id: `coin-${Date.now()}-${Math.random()}`,
                      x: monster.x,
                      y: monster.y,
                      type: 'coin',
                      value: goldValue,
                      size: 15,
                      color: '#FFD700',
                      spawnTime: Date.now(),
                      isCollected: false,
                      collectAnimationProgress: 0
                    };
                    
                    setCoins(prev => [...prev, newCoin]);
                    
                    // 敌人3和4有概率掉落宝箱：概率为（10%+当前关卡数x2%）
                    if (monster.monsterType === 3 || monster.monsterType === 4) {
                      const chestDropChance = 0.10 + (level * 0.02); // 10% + 关卡数×2%
                      if (Math.random() < chestDropChance) {
                        const newChest: Coin = {
                          id: `chest-${Date.now()}-${Math.random()}`,
                          x: monster.x,
                          y: monster.y,
                          type: 'chest',
                          value: 3 + Math.floor(level / 2), // 宝箱打开后获得的金币数
                          size: 25,
                          color: '#FFD700',
                          spawnTime: Date.now(),
                          isCollected: false,
                          collectAnimationProgress: 0
                        };
                        
                        setCoins(prev => [...prev, newChest]);
                      }
                    }
                  }
                  
                  // 吸血buff判定：如果玩家有吸血等级，10%概率回复1点生命
                  if (currentPlayer && currentPlayer.vampireLevel > 0) {
                    if (Math.random() < 0.1) {
                      // 触发吸血！回复1点生命
                      const healAmount = 1;
                      setPlayer(prev => ({
                        ...prev,
                        hp: Math.min(prev.hp + healAmount, prev.maxHp)
                      }));
                      
                      // 触发吸血回复动画
                      triggerVampireHeal(healAmount);
                    }
                  }
                  
                  // 弹药补充buff判定：暴击或二次暴击击杀时补充弹匣10%子弹
                  if (currentPlayer && currentPlayer.ammoSupplyLevel > 0) {
                    const isCritKill = bullet.isCrit && bullet.hitCount === 1;
                    if (isCritKill || isDoubleCrit) {
                      // 补充弹匣10%子弹（最少1发）
                      const weapon = WEAPONS[currentPlayer.weapon];
                      const magazineSize = weapon.magazineSize + currentPlayer.magazineSizeBonus;
                      const refillAmount = Math.max(1, Math.floor(magazineSize * 0.1));
                      setPlayer(prev => ({
                        ...prev,
                        currentAmmo: Math.min(prev.currentAmmo + refillAmount, magazineSize)
                      }));
                    }
                  }
                  
                  return { 
                    ...monster, 
                    hp: 0, 
                    isDying: true, 
                    deathTime: Date.now(),
                    isHit: true,
                    hitTime: Date.now(),
                    isExecuted: isExecuted, // 处决标记
                    executionTime: isExecuted ? Date.now() : undefined,
                  };
                }
                
                // 引火燃烧传播：如果敌人正在燃烧，死亡时传播给附近敌人
                if (monster.isBurning && monster.burningStacks) {
                  const spreadRadius = 80; // 传播半径
                  const now = Date.now();
                  
                  // 在延迟的setMonsters中传播燃烧
                  setTimeout(() => {
                    setMonsters(prevMonsters => {
                      return prevMonsters.map(m => {
                        // 跳过已死亡、无敌或已在燃烧的敌人
                        if (m.isDying || m.isInvincible || m.isBurning) return m;
                        
                        // 计算距离
                        const dist = Math.sqrt(Math.pow(m.x - monster.x, 2) + Math.pow(m.y - monster.y, 2));
                        
                        // 如果在传播范围内，传播燃烧
                        if (dist <= spreadRadius) {
                          return {
                            ...m,
                            isBurning: true,
                            burningStacks: monster.burningStacks,
                            burningDamage: monster.burningDamage,
                            burningEndTime: now + 5000,
                            lastBurnTickTime: now,
                            burningSource: monster.id,
                          };
                        }
                        return m;
                      });
                    });
                  }, 100);
                }
                // 设置受击状态（基于词缀拦截后的 monster 状态）
                let updatedMonster = { ...affixMonster, hp: newHp, isHit: true, hitTime: Date.now() };

                // ========== 基础击退效果 ==========
                // 当玩家有击退值时，使敌人往子弹前进方向退后
                // 击退值1=退后20px，每+1击退值额外+10px，即距离 = 10 + 击退值 * 10
                if (currentPlayer && currentPlayer.knockback > 0 && newHp > 0) {
                  const kbDistance = 10 + currentPlayer.knockback * 10;
                  const bulletSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                  if (bulletSpeed > 0) {
                    const dirX = bullet.vx / bulletSpeed;
                    const dirY = bullet.vy / bulletSpeed;
                    updatedMonster.knockbackVx = dirX * (kbDistance / 0.1); // 0.1秒内完成击退
                    updatedMonster.knockbackVy = dirY * (kbDistance / 0.1);
                    updatedMonster.knockbackEndTime = Date.now() + 100;
                  }
                }

                // 引火buff触发：如果玩家有引火等级，有概率给敌人附加燃烧状态
                // 复用上面已声明的currentPlayer
                if (currentPlayer && currentPlayer.fireBuffLevel > 0) {
                  // 基础触发概率：20% × 引火等级
                  const igniteChance = 0.2 * currentPlayer.fireBuffLevel;
                  if (Math.random() < igniteChance) {
                    const now = Date.now();
                    const burnDuration = 5000; // 燃烧持续5秒
                    const burnDamagePerStack = 1 + currentPlayer.fireBuffLevel; // 每层燃烧伤害
                    
                    // 叠加燃烧层数（最多5层）
                    const currentStacks = updatedMonster.burningStacks || 0;
                    const newStacks = Math.min(5, currentStacks + 1);
                    
                    updatedMonster = {
                      ...updatedMonster,
                      isBurning: true,
                      burningStacks: newStacks,
                      burningDamage: burnDamagePerStack,
                      burningEndTime: now + burnDuration,
                      lastBurnTickTime: now,
                    };
                  }
                }
                
                // 淬毒buff触发：如果玩家有淬毒等级，有概率给敌人附加中毒状态
                if (currentPlayer && currentPlayer.poisonBuffLevel > 0) {
                  // 基础触发概率：20% × 淬毒等级
                  const poisonChance = 0.2 * currentPlayer.poisonBuffLevel;
                  if (Math.random() < poisonChance) {
                    const now = Date.now();
                    // 应用成长链加成：中毒持续时间和伤害
                    const basePoisonDuration = 5000; // 基础中毒持续5秒
                    const poisonDuration = getPoisonDuration(currentPlayer, basePoisonDuration);
                    const basePoisonDamagePerStack = 1 + currentPlayer.poisonBuffLevel;
                    const poisonDamagePerStack = getPoisonDamage(currentPlayer, basePoisonDamagePerStack);
                    
                    // 叠加中毒层数（最多5层）
                    const currentStacks = updatedMonster.poisonStacks || 0;
                    const newStacks = Math.min(5, currentStacks + 1);
                    
                    updatedMonster = {
                      ...updatedMonster,
                      isPoisoned: true,
                      poisonStacks: newStacks,
                      poisonDamage: poisonDamagePerStack,
                      poisonEndTime: now + poisonDuration,
                      lastPoisonTickTime: now,
                    };
                  }
                }
                
                // 如果是BOSS，同步更新血条UI
                if (monster.isBoss) {
                  setBossCurrentHp(newHp);
                }
                
                return updatedMonster;
              }
              return monster;
            });
            
            return updatedMonsters;
          });
          
          // 穿透光效：子弹穿透敌人且将继续飞行时，在穿透点留下刀光冲击效果（打击感）
          // 火箭弹不触发穿透光效（它本身是爆炸型）
          if (hitMonster && !bullet.isRocket && bullet.hitCount > 0 && bullet.hitCount <= bullet.penetration) {
            const _pNow = Date.now();
            setPierceEffects(prev => {
              const alive = prev.filter(p => _pNow - p.startTime < 400);
              alive.push({
                id: `pierce-${bullet.id}-${_pNow}`,
                x: bullet.x,
                y: bullet.y,
                angle: Math.atan2(bullet.vy, bullet.vx),
                startTime: _pNow,
                duration: 260,
              });
              return alive;
            });
          }
          
          // 检测与障碍物碰撞（穿透不影响与障碍物的碰撞）
          for (const obstacle of obstacles) {
            if (checkRectCollision(bullet, bullet.size, obstacle)) {
              // 火箭弹碰撞障碍物：触发爆炸
              if (bullet.isRocket) {
                triggerExplosion(bullet.x, bullet.y, bullet.explosionRadius, bullet.explosionDamage, bullet.isRPGShockwave, bullet.isRPGAPShot);
              }
              return false;
            }
          }
          
          // 如果子弹击中的敌人数量超过穿透力，则消失
          if (bullet.hitCount > bullet.penetration) {
            return false;
          }
          
          // 边界检测（使用世界坐标系的边界）
          const isInBounds = (
            bullet.x > 0 &&
            bullet.x < GAME_CONFIG.WORLD_WIDTH &&
            bullet.y > 0 &&
            bullet.y < GAME_CONFIG.WORLD_HEIGHT
          );
          
          // 火箭弹碰到边界也触发爆炸
          if (bullet.isRocket && !isInBounds) {
            triggerExplosion(bullet.x, bullet.y, bullet.explosionRadius, bullet.explosionDamage);
          }
          
          return isInBounds && !hitMonster;
        });
        
        return newBullets;
      });
      
      // 更新怪物位置 - 使用改进的智能避障算法
      setMonsters(prev => {
        const now = Date.now();
        return prev.map(monster => {
          // 死亡的怪物不移动
          if (monster.isDying) {
            return monster;
          }
          
          // ========== 冲击波击退效果 ==========
          let updatedMonster = { ...monster };
          
          if (monster.knockbackEndTime && now < monster.knockbackEndTime) {
            // 应用击退速度
            updatedMonster.x += (monster.knockbackVx || 0) * (1 / 60); // 按帧率计算
            updatedMonster.y += (monster.knockbackVy || 0) * (1 / 60);
          } else if (monster.knockbackEndTime && now >= monster.knockbackEndTime) {
            // 击退结束，清除字段
            updatedMonster.knockbackVx = undefined;
            updatedMonster.knockbackVy = undefined;
            updatedMonster.knockbackEndTime = undefined;
          }
          
          // ========== 词缀系统：每帧更新 ==========
          const affixResult = AffixSystem.update(updatedMonster, now, player.x, player.y);
          updatedMonster = affixResult.monster;
          
          // 处理自爆触发
          if (affixResult.shouldExplode) {
            // 触发自爆爆炸（范围伤害 + 怪物死亡）
            const explosionDamage = affixResult.explodeDamage;
            const explosionRadius = affixResult.explodeRadius;
            
            // 对玩家造成伤害（如果在范围内）
            const playerDist = Math.sqrt(
              Math.pow(updatedMonster.x - player.x, 2) +
              Math.pow(updatedMonster.y - player.y, 2)
            );
            if (playerDist <= explosionRadius && !dashRef.current.active) {
              setPlayer(prevPlayer => {
                const newHp = Math.max(0, prevPlayer.hp - explosionDamage);
                if (newHp <= 0) {
                  setGameState('gameover');
                }
                return { ...prevPlayer, hp: newHp, isHit: true, hitTime: now };
              });
            }
            
            // 爆炸伤害周围其他敌人（自爆也会伤到同类）
            setMonsters(prevMonsters => {
              return prevMonsters.map(m => {
                if (m.id === updatedMonster.id) return m; // 自爆者单独处理
                if (m.isDying || m.isInvincible) return m;
                const d = Math.sqrt(
                  Math.pow(m.x - updatedMonster.x, 2) +
                  Math.pow(m.y - updatedMonster.y, 2)
                );
                if (d <= explosionRadius) {
                  // 自爆对范围内敌人造成同等伤害（与对玩家一致，30%最大生命）
                  const selfDamage = Math.floor(explosionDamage);
                  // 词缀伤害拦截
                  const dmgResult = AffixSystem.onDamage(m, selfDamage);
                  if (dmgResult.blocked) {
                    return dmgResult.monster;
                  }
                  const newHp = m.hp - dmgResult.actualDamage;
                  if (newHp <= 0) {
                    setMonstersRemaining(r => r - 1);
                    setScore(s => s + 10);
                    return {
                      ...dmgResult.monster,
                      hp: 0,
                      isDying: true,
                      deathTime: now,
                    };
                  }
                  return { ...dmgResult.monster, hp: newHp, isHit: true, hitTime: now };
                }
                return m;
              });
            });
            
            // 自爆爆炸触发震屏（打击感，与火箭弹爆炸一致）
            triggerScreenShake(Math.min(12, 4 + explosionRadius / 40));
            
            // 添加自爆视觉：通用爆炸序列帧动画 + 8方向粒子
            // 通用爆炸动画（与火箭弹等共用 Boom 序列帧）
            const _boomTotalFrames = boomImage ? Math.floor(boomImage.width / 256) : 8;
            try {
              setExplosionEffects(prev => [
                ...prev,
                {
                  id: `selfdestruct-boom-${now}`,
                  x: updatedMonster.x,
                  y: updatedMonster.y,
                  radius: explosionRadius * 0.8,
                  startTime: now,
                  maxRadius: explosionRadius * 1.5 * 0.8,
                  totalFrames: _boomTotalFrames,
                  frameDuration: 30,
                  firstPassComplete: false,
                  rotation: Math.random() * Math.PI * 2,
                },
              ]);
            } catch (_e) {
              // 动画添加失败不影响伤害结算
            }
            // 8方向粒子扩散（补充光效）
            const explosionParticles: AffixExplosionParticle[] = [];
            for (let i = 0; i < SELF_DESTRUCT_CONFIG.PARTICLE_COUNT; i++) {
              const angle = (i / SELF_DESTRUCT_CONFIG.PARTICLE_COUNT) * Math.PI * 2;
              explosionParticles.push({
                id: `affix-explosion-${now}-${i}`,
                x: updatedMonster.x,
                y: updatedMonster.y,
                vx: Math.cos(angle) * SELF_DESTRUCT_CONFIG.PARTICLE_SPEED,
                vy: Math.sin(angle) * SELF_DESTRUCT_CONFIG.PARTICLE_SPEED,
                size: SELF_DESTRUCT_CONFIG.PARTICLE_SIZE,
                startTime: now,
                duration: SELF_DESTRUCT_CONFIG.PARTICLE_DURATION,
              });
            }
            setAffixExplosionParticles(prev => [...prev, ...explosionParticles]);
            
            // 自爆怪物死亡
            setMonstersRemaining(r => r - 1);
            setScore(s => s + 10);
            updatedMonster = {
              ...updatedMonster,
              hp: 0,
              isDying: true,
              deathTime: now,
            };
            return updatedMonster;
          }
          
          // 词缀停止移动（如自爆充能中）
          const affixStopMovement = affixResult.stopMovement;
          // 词缀速度倍率（如狂暴 +60%）
          const affixSpeedMultiplier = affixResult.speedMultiplier;
          
          const monsterConfig = MONSTER_CONFIGS[monster.monsterType];
          const monsterSize = monsterConfig.size;
          
          const dx = player.x - monster.x;
          const dy = player.y - monster.y;
          const distToPlayer = Math.sqrt(dx * dx + dy * dy);
          
          // 检查是否处于受击状态或中毒状态
          let currentSpeed = monster.speed;
          if (monster.isHit && (now - monster.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION)) {
            // 受击时减速
            currentSpeed = monster.baseSpeed * GAME_CONFIG.HIT_SLOWDOWN_FACTOR;
          }
          // 中毒减速效果：中毒敌人移动速度降低20%
          if (monster.isPoisoned) {
            currentSpeed = currentSpeed * 0.8;
          }
          
          // 能量气场减速效果
          if (monster.auraSlowdownEndTime && now < monster.auraSlowdownEndTime) {
            currentSpeed = currentSpeed * (1 - GAME_CONFIG.ENERGY_AURA_SLOWDOWN_FACTOR);
          }
          
          // 词缀速度倍率（如狂暴移速加成）
          currentSpeed = currentSpeed * affixSpeedMultiplier;
          
          // ========== 冲击波减速效果 ==========
          let effectiveSpeed = currentSpeed;
          
          if (monster.shockwaveSlowdownEndTime && now < monster.shockwaveSlowdownEndTime) {
            // 70%减速（移动速度×0.3）
            effectiveSpeed = currentSpeed * (monster.shockwaveSlowdownMultiplier || 0.3);
          } else if (monster.shockwaveSlowdownEndTime && now >= monster.shockwaveSlowdownEndTime) {
            // 减速结束，清除字段
            updatedMonster.shockwaveSlowdownEndTime = undefined;
            updatedMonster.shockwaveSlowdownMultiplier = undefined;
          }
          
          // 燃烧伤害处理
          if (updatedMonster.isBurning && updatedMonster.burningEndTime && updatedMonster.burningStacks) {
            // 检查燃烧是否结束
            if (now >= updatedMonster.burningEndTime) {
              // 清除燃烧状态
              updatedMonster = {
                ...updatedMonster,
                isBurning: false,
                burningStacks: 0,
                burningDamage: 0,
                burningEndTime: undefined,
                lastBurnTickTime: undefined,
              };
            } else if (updatedMonster.lastBurnTickTime) {
              // 每秒造成一次燃烧伤害（1000ms间隔）
              const burnInterval = 1000;
              if (now - updatedMonster.lastBurnTickTime >= burnInterval) {
                const burnDamage = (updatedMonster.burningDamage || 1) * updatedMonster.burningStacks;
                const newHp = updatedMonster.hp - burnDamage;
                
                // 显示燃烧伤害数字
                setDamageNumbers(prev => [...prev, {
                  id: `burn-${updatedMonster.id}-${now}`,
                  monsterId: updatedMonster.id,
                  x: updatedMonster.x,
                  y: updatedMonster.y - 20,
                  damage: burnDamage,
                  opacity: 1.0,
                  scale: 0.8,
                  startTime: now,
                  isCrit: false,
                }]);
                
                if (newHp <= 0) {
                  // 燃烧致死
                  setMonstersRemaining(r => r - 1);
                  setScore(s => s + 10);
                  
                  // 燃烧传播
                  const spreadRadius = 80;
                  setTimeout(() => {
                    setMonsters(prevMonsters => {
                      return prevMonsters.map(m => {
                        if (m.isDying || m.isInvincible || m.isBurning) return m;
                        const dist = Math.sqrt(Math.pow(m.x - updatedMonster.x, 2) + Math.pow(m.y - updatedMonster.y, 2));
                        if (dist <= spreadRadius) {
                          return {
                            ...m,
                            isBurning: true,
                            burningStacks: updatedMonster.burningStacks,
                            burningDamage: updatedMonster.burningDamage,
                            burningEndTime: now + 5000,
                            lastBurnTickTime: now,
                          };
                        }
                        return m;
                      });
                    });
                  }, 100);
                  
                  // 掉落金币逻辑
                  const monsterConfig = MONSTER_CONFIGS[updatedMonster.monsterType];
                  let goldValue;
                  if (monsterConfig.isBoss) {
                    goldValue = monsterConfig.goldBase * level;
                    setBossAlive(false);
                  } else if (updatedMonster.monsterType === 1 || updatedMonster.monsterType === 2) {
                    goldValue = 1;
                  } else {
                    goldValue = Math.floor(2 + level / 5);
                  }
                  
                  const newCoin: Coin = {
                    id: `coin-${Date.now()}-${Math.random()}`,
                    x: updatedMonster.x,
                    y: updatedMonster.y,
                    type: 'coin',
                    value: goldValue,
                    size: 15,
                    color: '#FFD700',
                    spawnTime: Date.now(),
                    isCollected: false,
                    collectAnimationProgress: 0
                  };
                  setCoins(prev => [...prev, newCoin]);
                  
                  updatedMonster = {
                    ...updatedMonster,
                    hp: 0,
                    isDying: true,
                    deathTime: now,
                    isHit: true,
                    hitTime: now,
                    isBurning: false,
                  };
                } else {
                  // 更新燃烧状态
                  updatedMonster = {
                    ...updatedMonster,
                    hp: newHp,
                    lastBurnTickTime: now,
                  };
                }
              }
            }
          }
          
          // 处理中毒持续伤害
          if (updatedMonster.isPoisoned && updatedMonster.poisonEndTime) {
            if (now >= updatedMonster.poisonEndTime) {
              // 中毒结束
              updatedMonster = {
                ...updatedMonster,
                isPoisoned: false,
                poisonStacks: 0,
                poisonDamage: 0,
                poisonEndTime: undefined,
                lastPoisonTickTime: undefined,
              };
            } else if (updatedMonster.lastPoisonTickTime) {
              // 应用成长链加成：毒伤频率
              const currentPlayer = playerRef.current;
              const poisonInterval = currentPlayer ? getPoisonTickInterval(currentPlayer) : 1000;
              
              if (now - updatedMonster.lastPoisonTickTime >= poisonInterval) {
                const poisonDamage = (updatedMonster.poisonDamage || 1) * (updatedMonster.poisonStacks || 1);
                // 应用成长链加成：真实伤害（剧毒II）
                const trueDamage = currentPlayer ? getPoisonTrueDamage(currentPlayer, updatedMonster) : 0;
                const newHp = updatedMonster.hp - poisonDamage - trueDamage;
                
                // 显示中毒伤害数字
                setDamageNumbers(prev => [...prev, {
                  id: `poison-${updatedMonster.id}-${now}`,
                  monsterId: updatedMonster.id,
                  x: updatedMonster.x,
                  y: updatedMonster.y - 20,
                  damage: poisonDamage,
                  opacity: 1.0,
                  scale: 0.8,
                  startTime: now,
                  isCrit: false,
                }]);
                
                if (newHp <= 0) {
                  // 中毒致死，生成毒圈（检查毒圈数量上限）
                  const currentPlayer = playerRef.current;
                  if (currentPlayer && currentPlayer.poisonBuffLevel > 0) {
                    // 检查当前毒圈数量是否未达到上限
                    setPoisonCircles(prev => {
                      if (prev.length < GAME_CONFIG.MAX_POISON_CIRCLES) {
                        // 应用成长链加成：毒圈半径和持续时间
                        const baseRadius = 60 + currentPlayer.poisonBuffLevel * 20;
                        const radius = getPoisonCircleRadius(currentPlayer, baseRadius);
                        const baseDuration = 5000;
                        const duration = getPoisonCircleDuration(currentPlayer, baseDuration);
                        
                        // 在敌人死亡位置生成毒圈，添加到独立的毒圈数组
                        const newPoisonCircle: PoisonCircle = {
                          id: `poison-circle-${Date.now()}-${Math.random()}`,
                          x: updatedMonster.x,
                          y: updatedMonster.y,
                          radius,
                          damage: 1 + currentPlayer.poisonBuffLevel, // 每次伤害值
                          endTime: now + duration,
                          lastTickTime: now,
                        };
                        return [...prev, newPoisonCircle];
                      }
                      return prev; // 已达上限，不生成新毒圈
                    });
                  }
                  
                  // 中毒致死
                  setMonstersRemaining(r => r - 1);
                  setScore(s => s + 10);
                  
                  // 掉落金币逻辑
                  const monsterConfig = MONSTER_CONFIGS[updatedMonster.monsterType];
                  let goldValue;
                  if (monsterConfig.isBoss) {
                    goldValue = monsterConfig.goldBase * level;
                    setBossAlive(false);
                  } else if (updatedMonster.monsterType === 1 || updatedMonster.monsterType === 2) {
                    goldValue = 1;
                  } else {
                    goldValue = Math.floor(2 + level / 5);
                  }
                  
                  const newCoin: Coin = {
                    id: `coin-${Date.now()}-${Math.random()}`,
                    x: updatedMonster.x,
                    y: updatedMonster.y,
                    type: 'coin',
                    value: goldValue,
                    size: 15,
                    color: '#FFD700',
                    spawnTime: Date.now(),
                    isCollected: false,
                    collectAnimationProgress: 0
                  };
                  setCoins(prev => [...prev, newCoin]);
                  
                  updatedMonster = {
                    ...updatedMonster,
                    hp: 0,
                    isDying: true,
                    deathTime: now,
                    isHit: true,
                    hitTime: now,
                  };
                } else {
                  // 更新中毒状态
                  updatedMonster = {
                    ...updatedMonster,
                    hp: newHp,
                    lastPoisonTickTime: now,
                  };
                  
                  // 传染II效果：中毒敌人每次受毒伤时，有20%概率传染给100px内的另一个敌人
                  if (currentPlayer && shouldPoisonInfect(currentPlayer)) {
                    setTimeout(() => {
                      setMonsters(prevMonsters => {
                        // 找到距离100px内的另一个未中毒的敌人
                        const nearbyMonster = prevMonsters.find(m => {
                          if (m.id === updatedMonster.id || m.isDying || m.isPoisoned) return false;
                          const dist = Math.sqrt(Math.pow(m.x - updatedMonster.x, 2) + Math.pow(m.y - updatedMonster.y, 2));
                          return dist <= 100;
                        });
                        
                        if (nearbyMonster) {
                          // 传染中毒
                          return prevMonsters.map(m => {
                            if (m.id === nearbyMonster.id) {
                              return {
                                ...m,
                                isPoisoned: true,
                                poisonStacks: 1,
                                poisonDamage: updatedMonster.poisonDamage,
                                poisonEndTime: Date.now() + 5000,
                                lastPoisonTickTime: Date.now(),
                              };
                            }
                            return m;
                          });
                        }
                        return prevMonsters;
                      });
                    }, 50);
                  }
                }
              }
            }
          }
          
          // 如果BOSS正在进行落地攻击（jump_start, airborne, landing），跳过移动逻辑
          if (updatedMonster.isBoss && updatedMonster.jumpAttackState && 
              (updatedMonster.jumpAttackState === 'jump_start' || 
               updatedMonster.jumpAttackState === 'airborne' || 
               updatedMonster.jumpAttackState === 'landing')) {
            // 只更新敌人4的动画状态
            let bossUpdatedMonster = { ...updatedMonster };
            
            if (updatedMonster.monsterType === 4 && updatedMonster.isShooting && updatedMonster.shootAnimationStartTime) {
              const shootAnimationDuration = 720; // ms
              const timeSinceShootStart = now - updatedMonster.shootAnimationStartTime;
              
              if (timeSinceShootStart >= shootAnimationDuration) {
                bossUpdatedMonster = {
                  ...bossUpdatedMonster,
                  isShooting: false,
                  shootAnimationStartTime: 0
                };
              }
            }
            
            return bossUpdatedMonster;
          }
          
          // 1. 寻向玩家（Seek）
          let vx = 0;
          let vy = 0;
          
          // 词缀停止移动（如自爆充能中不移动）
          if (!affixStopMovement && distToPlayer > 0) {
            vx = (dx / distToPlayer) * effectiveSpeed;
            vy = (dy / distToPlayer) * effectiveSpeed;
          }
          
          // 2. 障碍物避障（Avoid Obstacle）- 改进版
          let avoidX = 0;
          let avoidY = 0;
          let obstacleFound = false;
          
          // 避障检测距离，让怪物在接近障碍物时才避障
          const avoidDistance = 80; // 降低到80px，避免过早避障
          const avoidForce = 5; // 避障力强度
          
          // 计算运动方向单位向量
          let dirX = 0;
          let dirY = 0;
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > 0) {
            dirX = vx / speed;
            dirY = vy / speed;
          }
          
          // 前瞻检测：在运动方向上采样多个点，检测是否与障碍物相交
          const sampleCount = 6; // 采样点数量
          const maxLookahead = 120; // 最大前瞻距离（像素）
          
          for (const obstacle of obstacles) {
            const obstacleDist = distToObstacle(monster.x, monster.y, obstacle);
            
            // 1. 如果当前距离障碍物很近，立即开始避障
            if (obstacleDist < avoidDistance + monsterSize) {
              // 2. 前瞻检测：检查前方路径上是否有障碍物
              let obstacleAhead = false;
              let minDistToObstacle = Infinity;
              
              for (let i = 1; i <= sampleCount; i++) {
                const sampleDist = (maxLookahead / sampleCount) * i;
                const sampleX = monster.x + dirX * sampleDist;
                const sampleY = monster.y + dirY * sampleDist;
                
                // 检测采样点是否与障碍物相交
                const sampleDistToObstacle = distToObstacle(sampleX, sampleY, obstacle);
                if (sampleDistToObstacle < monsterSize * 0.8) {
                  obstacleAhead = true;
                  minDistToObstacle = Math.min(minDistToObstacle, sampleDistToObstacle);
                }
              }
              
              // 如果当前太近或前方有障碍物，应用避障力
              if (obstacleDist < monsterSize || obstacleAhead) {
                obstacleFound = true;
                
                // 计算从障碍物最近的边向外推的方向（更精确的侧向避障）
                const obstacleCenterX = obstacle.x + obstacle.width / 2;
                const obstacleCenterY = obstacle.y + obstacle.height / 2;
                
                // 计算从障碍物中心到怪物的向量
                const avoidDx = monster.x - obstacleCenterX;
                const avoidDy = monster.y - obstacleCenterY;
                const avoidDist = Math.sqrt(avoidDx * avoidDx + avoidDy * avoidDy);
                
                if (avoidDist > 0) {
                  // 基础避障力（根据距离线性衰减）
                  const baseForce = avoidForce * (1 - Math.min(obstacleDist, avoidDistance) / avoidDistance);
                  
                  // 如果前方有障碍物，增加额外的侧向避障力
                  const aheadMultiplier = obstacleAhead ? 2.0 : 1.0;
                  
                  // 计算侧向分量（垂直于运动方向）
                  // 如果怪物正对着障碍物中心移动，需要更强的侧向力
                  const forwardDot = (dirX * avoidDx + dirY * avoidDy) / avoidDist;
                  const sideDot = Math.abs(forwardDot) < 0.5 ? 1.0 : 1.5;
                  
                  // 应用避障力
                  const totalForce = baseForce * aheadMultiplier * sideDot;
                  avoidX += (avoidDx / avoidDist) * totalForce;
                  avoidY += (avoidDy / avoidDist) * totalForce;
                }
              }
            }
          }
          
          // 3. 结合寻向和避障
          let finalVx = vx;
          let finalVy = vy;
          
          if (obstacleFound) {
            // 使用平滑插值混合寻向和避障
            const lerpFactor = 0.5; // 避障混合因子（0-1），平衡寻向和避障
            
            // 计算纯避障方向的速度
            const avoidSpeed = Math.sqrt(avoidX * avoidX + avoidY * avoidY);
            if (avoidSpeed > 0) {
              const avoidVx = (avoidX / avoidSpeed) * currentSpeed;
              const avoidVy = (avoidY / avoidSpeed) * currentSpeed;
              
              // 平滑混合寻向速度和避障速度
              finalVx = vx * (1 - lerpFactor) + avoidVx * lerpFactor;
              finalVy = vy * (1 - lerpFactor) + avoidVy * lerpFactor;
              
              // 重新归一化速度，保持恒定速度
              const finalSpeed = Math.sqrt(finalVx * finalVx + finalVy * finalVy);
              if (finalSpeed > 0) {
                finalVx = (finalVx / finalSpeed) * currentSpeed;
                finalVy = (finalVy / finalSpeed) * currentSpeed;
              }
            }
          }
          
          // 4. 计算新位置
          let newX = monster.x + finalVx;
          let newY = monster.y + finalVy;
          
          // 5. 边界检测（使用世界坐标系的边界）
          newX = Math.max(monsterSize, Math.min(GAME_CONFIG.WORLD_WIDTH - monsterSize, newX));
          newY = Math.max(monsterSize, Math.min(GAME_CONFIG.WORLD_HEIGHT - monsterSize, newY));
          
          // 6. 碰撞检测和沿墙滑动（改进版）
          // BOSS特殊处理：BOSS可以穿过障碍物，直接更新位置
          if (monster.isBoss) {
            // 更新敌人4的动画状态
          let updatedMonster = { ...monster, x: newX, y: newY, vx: finalVx, vy: finalVy };
          
          if (monster.monsterType === 4 && monster.isShooting && monster.shootAnimationStartTime) {
            // 检查Shoot动画是否播放完成
            // 假设4_2动画持续720ms（12帧 × 60ms）
            const shootAnimationDuration = 720; // ms
            const timeSinceShootStart = now - monster.shootAnimationStartTime;
            
            if (timeSinceShootStart >= shootAnimationDuration) {
              // Shoot动画播放完成，重置为Walk状态
              updatedMonster = {
                ...updatedMonster,
                isShooting: false,
                shootAnimationStartTime: 0
              };
            }
          }
          
          return updatedMonster;
          }
          
          // 检查最终位置是否碰撞
          const isColliding = (pos: Position) => {
            for (const obstacle of obstacles) {
              if (checkRectCollision(pos, monsterSize, obstacle)) {
                return true;
              }
            }
            return false;
          };
          
          if (isColliding({ x: newX, y: newY })) {
            // 尝试只沿X轴移动
            if (!isColliding({ x: newX, y: monster.y })) {
              newY = monster.y;
            }
            // 否则尝试只沿Y轴移动
            else if (!isColliding({ x: monster.x, y: newY })) {
              newX = monster.x;
            }
            // 如果两个方向都被阻挡，尝试沿对角线方向（朝向玩家的方向）
            else {
              const toPlayerX = player.x - monster.x;
              const toPlayerY = player.y - monster.y;
              const toPlayerDist = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);
              
              if (toPlayerDist > 0) {
                const normalizedX = toPlayerX / toPlayerDist;
                const normalizedY = toPlayerY / toPlayerDist;
                
                // 尝试多个小步移动
                const stepSize = currentSpeed * 0.5;
                let foundPath = false;
                
                for (let i = 1; i <= 4; i++) {
                  const testX = monster.x + normalizedX * stepSize * i;
                  const testY = monster.y + normalizedY * stepSize * i;
                  
                  if (testX >= monsterSize && testX <= GAME_CONFIG.WORLD_WIDTH - monsterSize &&
                      testY >= monsterSize && testY <= GAME_CONFIG.WORLD_HEIGHT - monsterSize &&
                      !isColliding({ x: testX, y: testY })) {
                    newX = testX;
                    newY = testY;
                    foundPath = true;
                    break;
                  }
                }
                
                if (!foundPath) {
                  // 如果所有方向都被阻挡，保持原位
                  newX = monster.x;
                  newY = monster.y;
                }
              } else {
                newX = monster.x;
                newY = monster.y;
              }
            }
          }
          
          // 7. 兜底机制：如果敌人卡在障碍物内部，自动推出到最近的空地
          if (isColliding({ x: newX, y: newY })) {
            // 找到最近的障碍物
            let nearestObstacle = null;
            let minDist = Infinity;
            
            for (const obstacle of obstacles) {
              const obstacleCenterX = obstacle.x + obstacle.width / 2;
              const obstacleCenterY = obstacle.y + obstacle.height / 2;
              const dist = Math.sqrt(
                Math.pow(newX - obstacleCenterX, 2) + 
                Math.pow(newY - obstacleCenterY, 2)
              );
              if (dist < minDist) {
                minDist = dist;
                nearestObstacle = obstacle;
              }
            }
            
            if (nearestObstacle) {
              // 计算从障碍物中心到敌人的方向
              const obstacleCenterX = nearestObstacle.x + nearestObstacle.width / 2;
              const obstacleCenterY = nearestObstacle.y + nearestObstacle.height / 2;
              const pushDirX = newX - obstacleCenterX;
              const pushDirY = newY - obstacleCenterY;
              const pushDist = Math.sqrt(pushDirX * pushDirX + pushDirY * pushDirY);
              
              if (pushDist > 0) {
                // 归一化方向
                const normalizedPushX = pushDirX / pushDist;
                const normalizedPushY = pushDirY / pushDist;
                
                // 沿推出方向逐步移动，直到脱离障碍物
                const maxSteps = 50;  // 最多尝试50步
                const stepSize = 5;   // 每步5像素
                
                for (let i = 1; i <= maxSteps; i++) {
                  const testX = newX + normalizedPushX * stepSize * i;
                  const testY = newY + normalizedPushY * stepSize * i;
                  
                  // 检查是否还在世界边界内
                  if (testX < monsterSize || testX > GAME_CONFIG.WORLD_WIDTH - monsterSize ||
                      testY < monsterSize || testY > GAME_CONFIG.WORLD_HEIGHT - monsterSize) {
                    break;
                  }
                  
                  // 检查是否脱离了障碍物
                  if (!isColliding({ x: testX, y: testY })) {
                    newX = testX;
                    newY = testY;
                    break;
                  }
                }
              }
            }
          }
          
          // 更新位置到updatedMonster
          updatedMonster.x = newX;
          updatedMonster.y = newY;
          updatedMonster.vx = finalVx;
          updatedMonster.vy = finalVy;
          
          return updatedMonster;
        });
      });
      
      // 敌人射击逻辑（敌人4会发射子弹）
      const shootTime = Date.now();
      setMonsters(prev => {
        const newEnemyBullets: EnemyBullet[] = [];
        
        const updatedMonsters = prev.map(monster => {
          // 死亡的怪物不能射击
          if (monster.isDying) return monster;
          
          const config = MONSTER_CONFIGS[monster.monsterType];
          
          // 检查是否可以射击（狂暴词缀下攻击间隔减半）
          const affixAttackMult = monster.affix?.type === 'berserk' && monster.affixState?.activated
            ? BERSERK_CONFIG.ATTACK_SPEED_BONUS
            : 1;
          if (config.canShoot && (shootTime - monster.lastShot >= config.shootInterval * affixAttackMult)) {
            // 计算子弹方向
            const dx = player.x - monster.x;
            const dy = player.y - monster.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 只在玩家距离一定范围内射击
            if (dist < 600) {
              const angle = Math.atan2(dy, dx);
              
              newEnemyBullets.push({
                id: `enemyBullet-${Date.now()}-${Math.random()}`,
                x: monster.x,
                y: monster.y,
                vx: Math.cos(angle) * config.bulletSpeed,
                vy: Math.sin(angle) * config.bulletSpeed,
                damage: config.bulletDamage,  // 使用独立的子弹伤害
                range: config.bulletRange,
                distanceTraveled: 0,
                startX: monster.x,
                startY: monster.y,
                color: '#ff6600',
                size: 5,
                hasHitPlayer: false,  // 初始化为未击中玩家
              });
              
              // 敌人4射击时触发Shoot动画
              if (monster.monsterType === 4) {
                return { 
                  ...monster, 
                  lastShot: shootTime, 
                  isShooting: true,
                  shootAnimationStartTime: shootTime
                };
              }
              
              return { ...monster, lastShot: shootTime };
            }
          }
          
          return monster;
        });
        
        // 将新创建的子弹添加到enemyBullets状态
        if (newEnemyBullets.length > 0) {
          setEnemyBullets(prevBullets => [...prevBullets, ...newEnemyBullets]);
        }
        
        return updatedMonsters;
      });
      
      // 更新敌人子弹位置和检测碰撞
      setEnemyBullets(prev => {
        const updatedBullets = prev.map(bullet => {
          // 如果子弹已经击中过玩家，标记为需要移除
          if (bullet.hasHitPlayer) {
            return { ...bullet, shouldRemove: true };
          }
          
          // 计算新位置
          const bulletX = bullet.x + bullet.vx;
          const bulletY = bullet.y + bullet.vy;
          const distanceTraveled = bullet.distanceTraveled + Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
          
          // 射程检测
          if (distanceTraveled > bullet.range) {
            return { ...bullet, shouldRemove: true };
          }
          
          // 边界检测
          if (bulletX < 0 || bulletX > GAME_CONFIG.WORLD_WIDTH ||
              bulletY < 0 || bulletY > GAME_CONFIG.WORLD_HEIGHT) {
            return { ...bullet, shouldRemove: true };
          }
          
          // 检测与玩家碰撞
          const distToPlayer = Math.sqrt(
            Math.pow(bulletX - player.x, 2) + 
            Math.pow(bulletY - player.y, 2)
          );
          
          // 如果子弹已经击中过玩家，直接移除，不再造成伤害
          if (bullet.hasHitPlayer) {
            return { ...bullet, shouldRemove: true };
          }
          
          const bulletHitRadius = bullet.size || 5;
          if (distToPlayer < GAME_CONFIG.PLAYER_SIZE + bulletHitRadius && !dashRef.current.active) {
            // 造成伤害
            setPlayer(prevPlayer => {
              const newHp = prevPlayer.hp - bullet.damage;
              if (newHp <= 0) {
                setGameState('gameover');
                // 停止背景音乐
                stopBGM();
              }
              return { ...prevPlayer, hp: Math.max(0, newHp), isHit: true, hitTime: shootTime };
            });
            // 火球命中玩家：爆开蓝色粒子受击动画
            if (bullet.isFireBall) {
              const hitParticles: PlayerHitParticle[] = [];
              for (let i = 0; i < BOSS_BARRAGE_CONFIG.HIT_PARTICLE_COUNT; i++) {
                const angle = (i / BOSS_BARRAGE_CONFIG.HIT_PARTICLE_COUNT) * Math.PI * 2;
                hitParticles.push({
                  id: `hitParticle-${bullet.id}-${i}`,
                  x: bulletX,
                  y: bulletY,
                  vx: Math.cos(angle) * BOSS_BARRAGE_CONFIG.HIT_PARTICLE_SPEED,
                  vy: Math.sin(angle) * BOSS_BARRAGE_CONFIG.HIT_PARTICLE_SPEED,
                  size: BOSS_BARRAGE_CONFIG.HIT_PARTICLE_SIZE * (0.6 + Math.random() * 0.8),
                  startTime: shootTime,
                  duration: BOSS_BARRAGE_CONFIG.HIT_PARTICLE_DURATION,
                });
              }
              setPlayerHitParticles(prev => [...prev, ...hitParticles]);
            }
            // 标记已击中玩家，防止多段伤害
            return { ...bullet, shouldRemove: true, hasHitPlayer: true };
          }
          
          // 更新子弹位置并保留
          return {
            ...bullet,
            x: bulletX,
            y: bulletY,
            distanceTraveled: distanceTraveled,
          };
        });
        
        // 过滤掉需要移除的子弹
        return updatedBullets.filter(bullet => !bullet.shouldRemove);
      });
      
      // 检测怪物与玩家碰撞
      setPlayer(prev => {
        let playerDamaged = false;
        for (const monster of monsters) {
          // 死亡的怪物不造成伤害
          if (monster.isDying) continue;
          // 闪现期间玩家无敌，不造成接触伤害
          if (dashRef.current.active) continue;
          
          const monsterConfig = MONSTER_CONFIGS[monster.monsterType];
          
          if (checkCollision(player, monster, GAME_CONFIG.PLAYER_SIZE, monsterConfig.size)) {
            const isBoss = monster.isBoss;
            const attackCD = isBoss ? 500 : 1000; // BOSS攻击CD更短（0.5秒）
            
            // 狂暴词缀：攻击间隔减半
            const affixAttackMult = monster.affix?.type === 'berserk' && monster.affixState?.activated
              ? BERSERK_CONFIG.ATTACK_SPEED_BONUS
              : 1;
            const effectiveAttackCD = attackCD * affixAttackMult;
            
            // 检查怪物攻击CD
            if (now - monster.lastAttackTime < effectiveAttackCD) {
              continue;
            }
            
            // BOSS造成更高伤害（普通怪物的2倍）
            // 狂暴词缀：伤害 +50%
            const affixDmgMult = monster.affix?.type === 'berserk' && monster.affixState?.activated
              ? 1 + BERSERK_CONFIG.DAMAGE_BONUS
              : 1;
            const actualDamage = (isBoss ? monster.damage * 2 : monster.damage * 0.1) * affixDmgMult;
            const newHp = prev.hp - actualDamage;
            playerDamaged = true;
            
            if (newHp <= 0) {
              setGameState('gameover');
            }
            
            // 如果是BOSS，添加攻击光效
            if (isBoss) {
              setDamageNumbers(prevDamage => [
                ...prevDamage,
                {
                  id: `boss-attack-${now}-${Math.random()}`,
                  monsterId: monster.id,
                  x: player.x,
                  y: player.y - 30,
                  damage: actualDamage,
                  opacity: 1.0,
                  scale: 1.5,
                  startTime: now,
                  isCrit: true,
                  color: '#ff0000',
                }
              ]);
            }
            
            // 更新怪物的攻击时间
            setMonsters(prevMonsters => {
              return prevMonsters.map(m => {
                if (m.id === monster.id) {
                  return { ...m, lastAttackTime: now };
                }
                return m;
              });
            });
            
            // 设置玩家受击状态
            return { 
              ...prev, 
              hp: Math.max(0, newHp), 
              isHit: true, 
              hitTime: now,
            };
          }
        }
        // 如果玩家没有被伤害，更新免疫信息
        if (!playerDamaged) {
          // 重置受击状态（如果时间过了）
          if (!prev.isHit || now - prev.hitTime >= GAME_CONFIG.HIT_EFFECT_DURATION) {
            return { ...prev, isHit: false };
          }
        }
        return prev;
      });
      
      // BOSS远程攻击和落地攻击检测（互斥）
      setMonsters(prevMonsters => {
        let newMonsters = [...prevMonsters];
        
        for (const monster of newMonsters) {
          // 跳过死亡的怪物和不是BOSS的怪物
          if (monster.isDying || !monster.isBoss) continue;
          
          // 如果BOSS正在进行落地攻击，跳过远程攻击
          if (monster.jumpAttackState && monster.jumpAttackState !== 'idle') {
            continue;
          }
          
          const monsterConfig = MONSTER_CONFIGS[monster.monsterType];
          
          // 检查是否配置了远程攻击和落地攻击
          const canRangedAttack = monsterConfig.canRangedAttack &&
            monsterConfig.rangedAttackInterval !== undefined &&
            monsterConfig.rangedAttackDistance !== undefined &&
            monsterConfig.rangedAttackBulletSpeed !== undefined &&
            monsterConfig.rangedAttackBulletDamage !== undefined;
          
          const canJumpAttack = monsterConfig.canJumpAttack &&
            monsterConfig.jumpAttackDetectInterval !== undefined &&
            monsterConfig.jumpAttackDetectDistance !== undefined;
          
          // 检测远程攻击触发条件
          let rangedAttackReady = false;
          let shouldStartRangedAttackGroup = false;
          
          if (canRangedAttack) {
            const dx = player.x - monster.x;
            const dy = player.y - monster.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // 检查是否在冷却期外且玩家在攻击范围内
            const isCooldownOver = now - monster.lastRangedAttackTime >= monsterConfig.rangedAttackInterval!;
            const isInRange = distToPlayer <= monsterConfig.rangedAttackDistance!;
            
            // 如果当前处于攻击周期内
            const attackGroupStartTime = monster.rangedAttackStartTime || 0;
            const currentAttackCount = monster.rangedAttackCount || 0;
            const timeSinceGroupStart = now - attackGroupStartTime;
            const attackInterval = 1500; // 每次攻击间隔1.5秒
            
            if (attackGroupStartTime > 0 && currentAttackCount < 3) {
              // 当前处于攻击周期内，检查是否到了下一次攻击的时间
              if (timeSinceGroupStart >= (currentAttackCount + 1) * attackInterval) {
                rangedAttackReady = true; // 触发下一次攻击
              }
            } else if (isCooldownOver && isInRange) {
              // 冷却期结束且玩家在范围内，开始新的攻击周期
              shouldStartRangedAttackGroup = true;
            }
          }
          
          // 检测落地攻击触发条件
          let jumpAttackReady = false;
          if (canJumpAttack) {
            const dx = player.x - monster.x;
            const dy = player.y - monster.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            jumpAttackReady =
              (monster.jumpAttackStartTime || 0) === 0 ||  // 没有开始检测
              now - (monster.jumpAttackStartTime || 0) >= monsterConfig.jumpAttackDetectInterval! &&  // 检测间隔已过
              distToPlayer <= monsterConfig.jumpAttackDetectDistance!;  // 玩家在检测范围内
          }
          
          // 根据触发条件决定使用哪个攻击
          if (rangedAttackReady || jumpAttackReady) {
            if (rangedAttackReady && jumpAttackReady) {
              // 两者都触发，随机选择一个
              const randomChoice = Math.random() < 0.5 ? 'ranged' : 'jump';
              
              if (randomChoice === 'jump') {
                // 执行落地攻击：进入锁定阶段
                newMonsters = newMonsters.map(m => {
                  if (m.id === monster.id) {
                    return {
                      ...m,
                      jumpAttackState: 'locking',
                      jumpAttackStartTime: now,
                      jumpAttackTargetX: player.x,
                      jumpAttackTargetY: player.y,
                    };
                  }
                  return m;
                });
                continue; // 跳过远程攻击
              }
            } else if (jumpAttackReady) {
              // 只有落地攻击触发
              newMonsters = newMonsters.map(m => {
                if (m.id === monster.id) {
                  return {
                    ...m,
                    jumpAttackState: 'locking',
                    jumpAttackStartTime: now,
                    jumpAttackTargetX: player.x,
                    jumpAttackTargetY: player.y,
                  };
                }
                return m;
              });
              continue; // 跳过远程攻击
            }
            
            // 执行远程攻击
            // 记录玩家位置
            const playerX = player.x;
            const playerY = player.y;
          
          // 获取远程攻击配置（已经在前面检查过不为undefined）
          const bulletSpeed = monsterConfig.rangedAttackBulletSpeed!;
          const bulletDamage = monsterConfig.rangedAttackBulletDamage!;
          const attackDistance = monsterConfig.rangedAttackDistance!;
          
          // 计算两个目标位置：(x+10, y+10) 和 (x-10, y-10)
          const target1 = { x: playerX + 10, y: playerY + 10 };
          const target2 = { x: playerX - 10, y: playerY - 10 };
          
          // 生成两个子弹串
          const newEnemyBullets: EnemyBullet[] = [];
          
          // 子弹串配置：3x15长方形，相邻子弹距离5px
          const rows = 3;
          const cols = 15;
          const spacing = 5;
          
          // 为每个目标位置生成子弹串
          [target1, target2].forEach((target, targetIndex) => {
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                // 计算子弹在子弹串中的相对位置
                const offsetX = col * spacing - (cols - 1) * spacing / 2;
                const offsetY = row * spacing - (rows - 1) * spacing / 2;
                
                // 子弹的实际发射位置
                const bulletStartX = monster.x + offsetX;
                const bulletStartY = monster.y + offsetY;
                
                // 计算从子弹发射位置到目标的距离和方向
                const bulletDx = target.x - bulletStartX;
                const bulletDy = target.y - bulletStartY;
                const bulletDist = Math.sqrt(bulletDx * bulletDx + bulletDy * bulletDy);
                
                if (bulletDist > 0) {
                  // 计算子弹速度向量
                  const bulletVx = (bulletDx / bulletDist) * bulletSpeed;
                  const bulletVy = (bulletDy / bulletDist) * bulletSpeed;
                  
                  newEnemyBullets.push({
                    id: `enemy-bullet-${Date.now()}-${Math.random()}-${row}-${col}-${targetIndex}`,
                    x: bulletStartX,
                    y: bulletStartY,
                    vx: bulletVx,
                    vy: bulletVy,
                    damage: bulletDamage,
                    range: attackDistance * 2,  // 射程为检测距离的2倍
                    distanceTraveled: 0,
                    startX: bulletStartX,
                    startY: bulletStartY,
                    color: '#ff00ff',  // 紫色子弹，区别于普通敌人子弹
                    size: 4,
                    hasHitPlayer: false,  // 初始化为未击中玩家
                  });
                }
              }
            }
          });
            
            // 添加所有子弹到游戏
            setEnemyBullets(prev => [...prev, ...newEnemyBullets]);
            
            // 更新BOSS的远程攻击状态
            newMonsters = newMonsters.map(m => {
              if (m.id === monster.id) {
                const currentAttackCount = (m.rangedAttackCount || 0) + 1;
                
                if (currentAttackCount >= 3) {
                  // 3次攻击完成，进入冷却期
                  return { 
                    ...m, 
                    lastRangedAttackTime: now,
                    rangedAttackCount: 0,
                    rangedAttackStartTime: 0
                  };
                } else {
                  // 继续下一次攻击
                  return { 
                    ...m, 
                    rangedAttackCount: currentAttackCount
                  };
                }
              }
              return m;
            });
          }
          
          // 如果需要开始新的攻击周期
          if (shouldStartRangedAttackGroup) {
            newMonsters = newMonsters.map(m => {
              if (m.id === monster.id) {
                return { 
                  ...m, 
                  rangedAttackStartTime: now,
                  rangedAttackCount: 0
                };
              }
              return m;
            });
          }
        }
        
        return newMonsters;
      });
      
      // BOSS落地攻击状态机
      setMonsters(prevMonsters => {
        const newMonsters: Monster[] = prevMonsters.map(monster => {
          // 只处理BOSS
          if (!monster.isBoss || monster.isDying) return monster;
          
          const config = MONSTER_CONFIGS[monster.monsterType];
          if (!config.canJumpAttack) return monster;
          
          const state = monster.jumpAttackState || 'idle';
          const attackStartTime = monster.jumpAttackStartTime || 0;
          
          switch (state) {
            case 'idle':
              // 每7秒检测一次玩家是否在800px范围内
              if (now - attackStartTime >= (config.jumpAttackDetectInterval || 7000)) {
                const dx = player.x - monster.x;
                const dy = player.y - monster.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist <= (config.jumpAttackDetectDistance || 800)) {
                  // 玩家在范围内，进入锁定阶段
                  return {
                    ...monster,
                    jumpAttackState: 'locking',
                    jumpAttackStartTime: now,
                    jumpAttackTargetX: player.x,
                    jumpAttackTargetY: player.y,
                  };
                } else {
                  // 玩家不在范围内，重置检测时间
                  return {
                    ...monster,
                    jumpAttackStartTime: now,
                  };
                }
              }
              break;
              
            case 'locking':
              // 锁定阶段：3秒内跟踪玩家位置
              const lockDuration = config.jumpAttackLockDuration || 3000;
              if (now - attackStartTime >= lockDuration) {
                // 锁定时间结束，进入起跳阶段
                const targetX = monster.jumpAttackTargetX || player.x;
                const targetY = monster.jumpAttackTargetY || player.y;
                
                // 保存起跳时的位置，用于airborne阶段的移动计算
                const startX = monster.x;
                const startY = monster.y;
                
                // 计算总移动时间（起跳+空中）
                const totalMoveDuration = (config.jumpStartDuration || 500) + (config.airborneDuration || 2000);
                
                return {
                  ...monster,
                  jumpAttackState: 'jump_start',
                  jumpAttackStartTime: now,
                  jumpAttackStartX: startX, // 保存起跳位置
                  jumpAttackStartY: startY,
                  isInvincible: true, // 进入无敌状态
                };
              } else {
                // 继续跟踪玩家位置
                const dx = player.x - monster.x;
                const dy = player.y - monster.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // 如果玩家超出检测范围，取消技能
                if (dist > (config.jumpAttackDetectDistance || 800)) {
                  return {
                    ...monster,
                    jumpAttackState: 'idle',
                    jumpAttackStartTime: now,
                    jumpAttackTargetX: undefined,
                    jumpAttackTargetY: undefined,
                  };
                }
                
                // 更新锁定目标位置
                return {
                  ...monster,
                  jumpAttackTargetX: player.x,
                  jumpAttackTargetY: player.y,
                };
              }
              break;
              
            case 'jump_start':
              // 起跳阶段：在原地播放起跳动画，持续jumpStartDuration
              const jumpStartDuration = config.jumpStartDuration || 500;
              if (now - attackStartTime >= jumpStartDuration) {
                // 起跳完成，进入空中阶段
                return {
                  ...monster,
                  jumpAttackState: 'airborne',
                  jumpAttackStartTime: now, // 重置开始时间用于airborne阶段
                };
              }
              // 起跳阶段不移动，只在原地播放动画
              return monster;
              
            case 'airborne':
              // 空中阶段：向目标位置移动，持续airborneDuration
              const airborneDuration = config.airborneDuration || 2000;
              if (now - attackStartTime >= airborneDuration) {
                // 到达目标位置，进入落地阶段
                return {
                  ...monster,
                  jumpAttackState: 'landing',
                  jumpAttackStartTime: now,
                  x: monster.jumpAttackTargetX || monster.x,
                  y: monster.jumpAttackTargetY || monster.y,
                };
              } else {
                // 向目标位置移动（从起跳位置开始）
                const progress = (now - attackStartTime) / airborneDuration;
                const startX = monster.jumpAttackStartX || monster.x;
                const startY = monster.jumpAttackStartY || monster.y;
                const targetX = monster.jumpAttackTargetX || monster.x;
                const targetY = monster.jumpAttackTargetY || monster.y;
                
                return {
                  ...monster,
                  x: startX + (targetX - startX) * progress,
                  y: startY + (targetY - startY) * progress,
                };
              }
              
            case 'landing':
              // 落地阶段：造成范围伤害
              const damageRadius = config.jumpAttackDamageRadius || 100;
              const damage = config.jumpAttackDamage || 13;
              
              // 检测玩家是否在伤害范围内
              const playerDx = player.x - monster.x;
              const playerDy = player.y - monster.y;
              const playerDist = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
              
              if (playerDist <= damageRadius) {
                // 计算击退方向（从BOSS落地点指向玩家）
                const knockbackDistance = 300;
                const dx = player.x - monster.x;
                const dy = player.y - monster.y;
                
                // 归一化方向向量
                const normalizedDist = Math.sqrt(dx * dx + dy * dy);
                const normalizedDx = normalizedDist > 0 ? dx / normalizedDist : 0;
                const normalizedDy = normalizedDist > 0 ? dy / normalizedDist : 0;
                
                // 计算击退目标位置
                let targetX = player.x + normalizedDx * knockbackDistance;
                let targetY = player.y + normalizedDy * knockbackDistance;
                
                // 边界检测
                targetX = Math.max(GAME_CONFIG.PLAYER_SIZE, Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.PLAYER_SIZE, targetX));
                targetY = Math.max(GAME_CONFIG.PLAYER_SIZE, Math.min(GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.PLAYER_SIZE, targetY));
                
                // 障碍物碰撞检测（使用射线检测法，逐步移动）
                const steps = 10; // 分10步移动，提高检测精度
                const stepX = (targetX - player.x) / steps;
                const stepY = (targetY - player.y) / steps;
                let finalX = player.x;
                let finalY = player.y;
                
                for (let i = 0; i < steps; i++) {
                  const nextX = finalX + stepX;
                  const nextY = finalY + stepY;
                  
                  // 检测是否会撞到障碍物
                  let collided = false;
                  for (const obstacle of obstacles) {
                    if (checkRectCollision({ x: nextX, y: nextY }, GAME_CONFIG.PLAYER_SIZE, obstacle)) {
                      collided = true;
                      break;
                    }
                  }
                  
                  if (collided) {
                    break; // 撞到障碍物，停止移动
                  }
                  
                  finalX = nextX;
                  finalY = nextY;
                }
                
                // 造成伤害并击退
                setPlayer(prevPlayer => {
                  const newHp = prevPlayer.hp - damage;
                  if (newHp <= 0) {
                    setGameState('gameover');
                  }
                  return {
                    ...prevPlayer,
                    hp: Math.max(0, newHp),
                    x: finalX,
                    y: finalY,
                    isHit: true,
                    hitTime: now,
                  };
                });
              }
              
              // 砸地结束瞬间，触发旋转全方位弹幕
              setBossBarrages(prev => {
                if (prev.some(b => b.id.startsWith(`barrage-${monster.id}-`))) return prev;
                return [...prev, {
                  id: `barrage-${monster.id}-${now}`,
                  x: monster.x,
                  y: monster.y,
                  startTime: now,
                  lastEmitTime: now - BOSS_BARRAGE_CONFIG.EMIT_INTERVAL,
                }];
              });
              
              // 进入硬直阶段
              return {
                ...monster,
                jumpAttackState: 'recovery',
                jumpAttackStartTime: now,
                isInvincible: false, // 取消无敌
              };
              
            case 'recovery':
              // 硬直阶段：停止移动3秒
              const recoveryDuration = config.jumpAttackRecoveryDuration || 3000;
              if (now - attackStartTime >= recoveryDuration) {
                // 硬直结束，返回idle状态
                return {
                  ...monster,
                  jumpAttackState: 'idle',
                  jumpAttackStartTime: now,
                  jumpAttackTargetX: undefined,
                  jumpAttackTargetY: undefined,
                  jumpAttackStartX: undefined,
                  jumpAttackStartY: undefined,
                  jumpAttackVelocityX: undefined,
                  jumpAttackVelocityY: undefined,
                };
              }
              // 硬直期间停止移动
              break;
          }
          
          return monster;
        });
        
        return newMonsters;
      });
      
      // ========== BOSS 砸地旋转弹幕发射 ==========
      const barrageNow = Date.now();
      const newFireBalls: EnemyBullet[] = [];
      const emittedBarrageIds = new Set<string>();
      for (const barrage of bossBarrages) {
        const barrageElapsed = barrageNow - barrage.startTime;
        if (barrageElapsed >= BOSS_BARRAGE_CONFIG.DURATION) continue;
        if (barrageNow - barrage.lastEmitTime < BOSS_BARRAGE_CONFIG.EMIT_INTERVAL) continue;
        emittedBarrageIds.add(barrage.id);
        const baseAngle = (BOSS_BARRAGE_CONFIG.ANGULAR_SPEED * (barrageElapsed / 1000) * Math.PI) / 180;
        for (let i = 0; i < BOSS_BARRAGE_CONFIG.EMITTER_COUNT; i++) {
          const angle = baseAngle + (i * Math.PI * 2) / BOSS_BARRAGE_CONFIG.EMITTER_COUNT;
          newFireBalls.push({
            id: `fireBall-${barrage.id}-${barrageNow}-${i}`,
            x: barrage.x,
            y: barrage.y,
            vx: Math.cos(angle) * BOSS_BARRAGE_CONFIG.BULLET_SPEED,
            vy: Math.sin(angle) * BOSS_BARRAGE_CONFIG.BULLET_SPEED,
            damage: BOSS_BARRAGE_CONFIG.BULLET_DAMAGE,
            range: BOSS_BARRAGE_CONFIG.BULLET_RANGE,
            distanceTraveled: 0,
            startX: barrage.x,
            startY: barrage.y,
            color: BOSS_BARRAGE_CONFIG.BULLET_COLOR,
            size: BOSS_BARRAGE_CONFIG.BULLET_SIZE / 2,
            hasHitPlayer: false,
            isFireBall: true,
            spawnTime: barrageNow,
          });
        }
      }
      if (newFireBalls.length > 0) {
        setEnemyBullets(prev => [...prev, ...newFireBalls]);
      }
      if (bossBarrages.length > 0) {
        setBossBarrages(prev => prev
          .filter(b => barrageNow - b.startTime < BOSS_BARRAGE_CONFIG.DURATION)
          .map(b => emittedBarrageIds.has(b.id) ? { ...b, lastEmitTime: barrageNow } : b)
        );
      }
      
      // 移除死亡动画播放完成的怪物
      setMonsters(prev => {
        const now = Date.now();
        return prev.filter(monster => {
          if (monster.isDying) {
            return now - monster.deathTime < GAME_CONFIG.HIT_EFFECT_DURATION;
          }
          return true;
        });
      });
      
      // ========== 能量气场处理 ==========
      if (player.energyAuraLevel > 0) {
        const auraNow = Date.now();
        const auraRadius = GAME_CONFIG.ENERGY_AURA_BASE_RADIUS + player.energyAuraLevel * 15; // 每级增加15px半径
        const shockwaveInterval = GAME_CONFIG.ENERGY_AURA_SHOCKWAVE_INTERVAL;
        
        // 检查是否需要发射冲击波
        if (auraNow - player.lastEnergyAuraShockwaveTime >= shockwaveInterval) {
          // 发射冲击波
          
          // 1. 击退气场内的敌人并附加减速效果
          setMonsters(prevMonsters => {
            return prevMonsters.map(m => {
              if (m.isDying) return m;
              
              const dist = Math.sqrt(
                Math.pow(m.x - player.x, 2) + 
                Math.pow(m.y - player.y, 2)
              );
              
              if (dist <= auraRadius) {
                // 在气场内，计算击退方向
                const dx = m.x - player.x;
                const dy = m.y - player.y;
                const distNorm = Math.sqrt(dx * dx + dy * dy);
                
                // 击退距离
                const knockbackDist = GAME_CONFIG.ENERGY_AURA_KNOCKBACK_DISTANCE;
                
                // 计算击退后的新位置
                let newX = m.x;
                let newY = m.y;
                if (distNorm > 0) {
                  newX = m.x + (dx / distNorm) * knockbackDist;
                  newY = m.y + (dy / distNorm) * knockbackDist;
                }
                
                // 边界检查
                newX = Math.max(20, Math.min(GAME_CONFIG.WORLD_WIDTH - 20, newX));
                newY = Math.max(20, Math.min(GAME_CONFIG.WORLD_HEIGHT - 20, newY));
                
                return {
                  ...m,
                  x: newX,
                  y: newY,
                  isSlowedByAura: true,
                  auraSlowdownEndTime: auraNow + GAME_CONFIG.ENERGY_AURA_SLOWDOWN_DURATION,
                };
              }
              
              return m;
            });
          });
          
          // 2. 消除气场内的敌方子弹
          setEnemyBullets(prevBullets => {
            return prevBullets.filter(bullet => {
              const dist = Math.sqrt(
                Math.pow(bullet.x - player.x, 2) + 
                Math.pow(bullet.y - player.y, 2)
              );
              return dist > auraRadius; // 保留气场外的子弹
            });
          });
          
          // 更新上次冲击波时间
          setPlayer(prev => ({
            ...prev,
            lastEnergyAuraShockwaveTime: auraNow,
          }));
        }
      }
      
      // 处理毒圈伤害和移除过期毒圈
      const currentTime = Date.now();
      const poisonTickInterval = 500; // 每500ms造成一次伤害
      
      setPoisonCircles(prevCircles => {
        // 过滤掉过期的毒圈
        const activeCircles = prevCircles.filter(circle => currentTime < circle.endTime);
        
        // 处理每个毒圈的伤害
        activeCircles.forEach(circle => {
          // 检查是否需要造成伤害
          if (currentTime - circle.lastTickTime >= poisonTickInterval) {
            // 对毒圈内的敌人造成伤害并附加中毒状态
            setMonsters(prevMonsters => {
              return prevMonsters.map(m => {
                if (m.isDying) return m;
                
                const dist = Math.sqrt(
                  Math.pow(m.x - circle.x, 2) + 
                  Math.pow(m.y - circle.y, 2)
                );
                
                if (dist <= circle.radius) {
                  // 在毒圈内，造成伤害
                  const newHp = m.hp - circle.damage;
                  
                  // 显示毒圈伤害数字
                  setDamageNumbers(prev => [...prev, {
                    id: `poisonCircle-${m.id}-${currentTime}`,
                    monsterId: m.id,
                    x: m.x,
                    y: m.y - 20,
                    damage: circle.damage,
                    opacity: 1.0,
                    scale: 0.7,
                    startTime: currentTime,
                    isCrit: false,
                  }]);
                  
                  // 如果伤害致死
                  if (newHp <= 0) {
                    // 检查是否需要生成新毒圈（检查毒圈数量上限）
                    const currentPlayer = playerRef.current;
                    if (currentPlayer && currentPlayer.poisonBuffLevel > 0) {
                      setPoisonCircles(prev => {
                        if (prev.length < GAME_CONFIG.MAX_POISON_CIRCLES) {
                          // 应用成长链加成：毒圈半径和持续时间
                          const baseRadius = 60 + currentPlayer.poisonBuffLevel * 20;
                          const radius = getPoisonCircleRadius(currentPlayer, baseRadius);
                          const baseDuration = 5000;
                          const duration = getPoisonCircleDuration(currentPlayer, baseDuration);
                          
                          const newPoisonCircle: PoisonCircle = {
                            id: `poison-circle-${Date.now()}-${Math.random()}`,
                            x: m.x,
                            y: m.y,
                            radius,
                            damage: 1 + currentPlayer.poisonBuffLevel,
                            endTime: currentTime + duration,
                            lastTickTime: currentTime,
                          };
                          return [...prev, newPoisonCircle];
                        }
                        return prev; // 已达上限，不生成新毒圈
                      });
                    }
                    
                    setMonstersRemaining(r => r - 1);
                    setScore(s => s + 10);
                    
                    // 掉落金币
                    const monsterConfig = MONSTER_CONFIGS[m.monsterType];
                    let goldValue;
                    if (monsterConfig.isBoss) {
                      goldValue = Math.floor(monsterConfig.goldBase * level * 0.4); // BOSS金币从 50L 降至 20L
                      setBossAlive(false);
                    } else if (m.monsterType === 1 || m.monsterType === 2) {
                      goldValue = 1;
                    } else {
                      goldValue = 2; // 类型3/4 改为固定值，去掉随关卡增长(原 2 + ⌊L/5⌋)
                    }
                    
                    const newCoin: Coin = {
                      id: `coin-${Date.now()}-${Math.random()}`,
                      x: m.x,
                      y: m.y,
                      type: 'coin',
                      value: goldValue,
                      size: 15,
                      color: '#FFD700',
                      spawnTime: Date.now(),
                      isCollected: false,
                      collectAnimationProgress: 0
                    };
                    setCoins(prev => [...prev, newCoin]);
                    
                    return {
                      ...m,
                      hp: 0,
                      isDying: true,
                      deathTime: currentTime,
                      isHit: true,
                      hitTime: currentTime,
                    };
                  }
                  
                  // 附加中毒状态（如果敌人还没有中毒）
                  if (!m.isPoisoned) {
                    return {
                      ...m,
                      hp: newHp,
                      isPoisoned: true,
                      poisonStacks: 1,
                      poisonDamage: circle.damage,
                      poisonEndTime: currentTime + 5000,
                      lastPoisonTickTime: currentTime,
                    };
                  }
                  
                  return {
                    ...m,
                    hp: newHp,
                  };
                }
                
                return m;
              });
            });
            
            // 更新毒圈的lastTickTime
            circle.lastTickTime = now;
          }
        });
        
        return activeCircles;
      });
      
      // 剧毒吸收I效果：玩家站在毒圈上时，每秒回复2点生命值
      const currentPlayerForHeal = playerRef.current;
      if (currentPlayerForHeal && hasGrowthChainNode(currentPlayerForHeal, 'poison_absorb_3')) {
        const healAmount = checkPoisonCircleHeal(currentPlayerForHeal, poisonCircles);
        if (healAmount > 0) {
          // 使用静态变量记录上次治疗时间，确保每秒只治疗一次
          if (!(window as any).lastPoisonHealTime) {
            (window as any).lastPoisonHealTime = 0;
          }
          const lastHealTime = (window as any).lastPoisonHealTime;
          if (currentTime - lastHealTime >= 1000) {
            setPlayer(prev => ({
              ...prev,
              hp: Math.min(prev.hp + healAmount, prev.maxHp)
            }));
            // 触发吸血回复动画复用
            triggerVampireHeal(healAmount);
            (window as any).lastPoisonHealTime = currentTime;
          }
        }
      }
      
      // 拾取金币和宝箱（添加80px范围内的自动吸附）
      setCoins(prev => {
        const updatedCoins = prev.map(coin => {
          if (coin.isCollected) {
            // 更新收集动画
            return {
              ...coin,
              collectAnimationProgress: Math.min(1, coin.collectAnimationProgress + 0.1)
            };
          }
          
          // 检测玩家与金币/宝箱碰撞
          const dx = player.x - coin.x;
          const dy = player.y - coin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // 计算金币拾取范围（初始范围 + 加成百分比 × 初始范围）
          const coinPickupRange = GAME_CONFIG.COIN_PICKUP_RANGE * (1 + player.coinPickupRangeBonus / 100);
          
          // 金币拾取范围内自动吸附
          if (dist < coinPickupRange) {
            // 先检测是否应该拾取（在吸附范围内直接碰撞）
            const pickupDist = GAME_CONFIG.PLAYER_SIZE + coin.size + 10; // 增加10px缓冲
            if (dist < pickupDist) {
              // 拾取金币或宝箱
              if (coin.type === 'chest') {
                // 拾取宝箱，获得金币
                setPlayer(prevPlayer => ({
                  ...prevPlayer,
                  gold: prevPlayer.gold + coin.value
                }));
              } else if (coin.type === 'weapon_upgrade_box') {
                // 拾取武器属性加成箱（固定升1级，获得3%加成）
                const upgradePercentage = 3; // 固定3%
                
                setPlayer(prevPlayer => {
                  const weaponUpgradeMultiplier = 1 + upgradePercentage / 100;
                  const newPlayer = {
                    ...prevPlayer,
                    weaponLevel: prevPlayer.weaponLevel + 1,
                    damage: Math.floor(prevPlayer.damage * weaponUpgradeMultiplier),
                    fireRate: Math.max(50, Math.floor(prevPlayer.fireRate * (1 - upgradePercentage / 100))),
                    weaponRange: Math.min(Math.floor(prevPlayer.weaponRange * weaponUpgradeMultiplier), MAX_VALUES.weaponRange),
                    bulletSpeed: Math.floor(prevPlayer.bulletSpeed * weaponUpgradeMultiplier),
                    currentAmmo: getWeaponMagazine(prevPlayer, player.weapon) // 补满弹夹
                  };
                  // 限制武器属性加成不超过最大值
                  newPlayer.damageBonus = Math.min(newPlayer.damageBonus + upgradePercentage, MAX_VALUES.weaponUpgrade);
                  newPlayer.fireRateBonus = Math.min(newPlayer.fireRateBonus + upgradePercentage, MAX_VALUES.weaponUpgrade);
                  newPlayer.weaponRangeBonus = Math.min(newPlayer.weaponRangeBonus + upgradePercentage, MAX_VALUES.weaponUpgrade);
                  return newPlayer;
                });
                
                // 添加武器升级弹字
                const playerY = player.y - 60;
                setGoldFloatingTexts(prev => [
                  ...prev,
                  {
                    id: `weapon-text-${Date.now()}-${Math.random()}`,
                    x: player.x,
                    y: playerY,
                    initialY: playerY,
                    value: upgradePercentage,
                    opacity: 1.0,
                    scale: 1.0,
                    startTime: Date.now(),
                    text: `武器属性+${upgradePercentage}%`,
                    color: '#FF69B4' // 粉色
                  }
                ]);
                
                return { ...coin, isCollected: true };
              } else if (coin.type === 'health_potion') {
                // 拾取治疗瓶
                const healAmount = Math.floor(5 + level * 1.2);
                
                setPlayer(prevPlayer => {
                  const newHp = Math.min(prevPlayer.hp + healAmount, prevPlayer.maxHp);
                  return {
                    ...prevPlayer,
                    hp: newHp
                  };
                });
                
                // 添加治疗弹字（黑色描边的绿色字）
                const playerY = player.y - 60;
                setGoldFloatingTexts(prev => [
                  ...prev,
                  {
                    id: `heal-text-${Date.now()}-${Math.random()}`,
                    x: player.x,
                    y: playerY,
                    initialY: playerY,
                    value: healAmount,
                    opacity: 1.0,
                    scale: 1.0,
                    startTime: Date.now(),
                    text: `+${healAmount}`,
                    color: '#32CD32' // 绿色
                  }
                ]);
                
                return { ...coin, isCollected: true };
              } else {
                // 拾取金币
                setPlayer(prevPlayer => ({
                  ...prevPlayer,
                  gold: prevPlayer.gold + coin.value
                }));
              }
              
              // 添加金币获取弹字
              const playerY = player.y - 60;
              setGoldFloatingTexts(prev => [
                ...prev,
                {
                  id: `gold-text-${Date.now()}-${Math.random()}`,
                  x: player.x,
                  y: playerY,
                  initialY: playerY,
                  value: coin.value,
                  opacity: 1.0,
                  scale: 1.0,
                  startTime: Date.now()
                }
              ]);
              
              return {
                ...coin,
                isCollected: true
              };
            }
            
            // 标记为正在被吸引
            if (!coin.isAttracting) {
              return {
                ...coin,
                isAttracting: true,
                attractTargetX: player.x,
                attractTargetY: player.y,
                trailParticles: []
              };
            }
            
            // 计算吸引速度（距离越近速度越快）
            const attractSpeed = 0.15; // 吸引速度
            const moveX = (player.x - coin.x) * attractSpeed;
            const moveY = (player.y - coin.y) * attractSpeed;
            
            // 生成拖尾粒子
            const newTrailParticle: CoinTrailParticle = {
              id: `trail-${coin.id}-${Date.now()}-${Math.random()}`,
              x: coin.x,
              y: coin.y,
              size: coin.size * 0.6,
              opacity: 0.8,
              life: 0,
              maxLife: 300 // 粒子存在300ms
            };
            
            return {
              ...coin,
              x: coin.x + moveX,
              y: coin.y + moveY,
              trailParticles: [...(coin.trailParticles || []).slice(-6), newTrailParticle]
            };
          }
          
          // 直接碰撞拾取（80px范围外）
          if (dist < GAME_CONFIG.PLAYER_SIZE + coin.size) {
            // 拾取金币或宝箱
            if (coin.type === 'chest') {
              // 拾取宝箱，获得金币
              setPlayer(prevPlayer => ({
                ...prevPlayer,
                gold: prevPlayer.gold + coin.value
              }));
            } else {
              // 拾取金币
              setPlayer(prevPlayer => ({
                ...prevPlayer,
                gold: prevPlayer.gold + coin.value
              }));
            }
            
            // 添加金币获取弹字
            const playerY = player.y - 60;
            setGoldFloatingTexts(prev => [
              ...prev,
              {
                id: `gold-text-${Date.now()}-${Math.random()}`,
                x: player.x,
                y: playerY,
                initialY: playerY,
                value: coin.value,
                opacity: 1.0,
                scale: 1.0,
                startTime: Date.now()
              }
            ]);
            
            return {
              ...coin,
              isCollected: true
            };
          }
          
          return coin;
        });
        
        // 移除动画完成的金币/宝箱
        return updatedCoins.filter(coin => !coin.isCollected || coin.collectAnimationProgress < 1);
      });
      } // ========== 更新逻辑结束 ==========
      
      // ========== 渲染逻辑（始终执行）==========
      // 绘制障碍物（使用美术贴图）
      obstacles.forEach(obstacle => {
        // 根据 obstacle.image 路径找到对应的图片索引
        const obstacleImagePaths = [
          '/assets/obstacle_1.png',
          '/assets/obstacle_2.png',
          '/assets/obstacle_3.png',
          '/assets/Obstacle_4.png',
          '/assets/obstacle_5.png'
        ];
        const obstacleIndex = obstacleImagePaths.indexOf(obstacle.image);
        const obstacleImg = obstacleImages[obstacleIndex];
        
        if (obstacleImg) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            obstacleImg,
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height
          );
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
      bullets.forEach(bullet => {
        // 火箭弹使用Rocket.png，其他子弹使用bullet.png
        if (bullet.isRocket && rocketImage) {
          // 计算火箭弹的旋转角度（指向运动方向）
          const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
          
          ctx.save();
          ctx.translate(bullet.x, bullet.y);
          ctx.rotate(bulletAngle);
          
          // 绘制火箭弹贴图
          const bulletSize = bullet.size * 2.5;
          ctx.drawImage(
            rocketImage,
            -bulletSize / 2,
            -bulletSize / 2,
            bulletSize,
            bulletSize
          );
          
          ctx.restore();
        } else if (bulletImage) {
          // 计算子弹的旋转角度（指向运动方向）
          const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
          
          ctx.save();
          ctx.translate(bullet.x, bullet.y);
          ctx.rotate(bulletAngle);
          
          // 绘制子弹贴图
          const bulletSize = bullet.size * 2;
          ctx.drawImage(
            bulletImage,
            -bulletSize / 2,
            -bulletSize / 2,
            bulletSize,
            bulletSize
          );
          
          ctx.restore();
        } else {
          // 备用：使用圆形
          ctx.fillStyle = bullet.color;
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
          ctx.fill();
          
          // 子弹光晕（使用白色半透明渐变）
          const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.size * 2);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, bullet.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      // 绘制敌人子弹
      enemyBullets.forEach(bullet => {
        if (bullet.isFireBall) {
          // BOSS旋转弹幕的大型火球：循环序列帧动画（缩放到60x60）
          if (bossFireBallImage && bullet.spawnTime !== undefined) {
            const frameSize = BOSS_BARRAGE_CONFIG.BULLET_FRAME_SIZE;
            const cols = Math.max(1, Math.floor(bossFireBallImage.width / frameSize));
            const rows = Math.max(1, Math.floor(bossFireBallImage.height / frameSize));
            const totalFrames = cols * rows;
            const frameIndex = Math.floor((now - bullet.spawnTime) / BOSS_BARRAGE_CONFIG.BULLET_FRAME_DURATION) % totalFrames;
            const sx = (frameIndex % cols) * frameSize;
            const sy = Math.floor(frameIndex / cols) * frameSize;
            const drawSize = BOSS_BARRAGE_CONFIG.BULLET_SIZE;
            ctx.drawImage(
              bossFireBallImage,
              sx, sy, frameSize, frameSize,
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
          const bulletSize = bullet.size * 2.5;  // 子弹大小
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
      monsters.forEach(monster => {
        const now = Date.now();
        const isHitEffect = monster.isHit && (now - monster.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION);
        const isDyingEffect = monster.isDying && (now - monster.deathTime < GAME_CONFIG.HIT_EFFECT_DURATION);
        const isExecutionEffect = monster.isExecuted && monster.executionTime && (now - monster.executionTime < 500); // 处决闪红效果500ms
        
        // 根据怪物类型获取配置
        const config = MONSTER_CONFIGS[monster.monsterType];
        const monsterColor = (isHitEffect || isDyingEffect) ? '#ffffff' : config.color;
        const monsterSize = config.size;
        const isBoss = monster.isBoss;
        
        // 处决闪红效果（在敌人周围绘制红色闪烁光晕）
        if (isExecutionEffect && monster.executionTime) {
          const executionProgress = (now - monster.executionTime) / 500; // 500ms
          const flashIntensity = Math.sin(executionProgress * Math.PI * 6); // 快速闪烁
          const executionAlpha = 0.5 + flashIntensity * 0.3;
          
          // 红色闪烁光晕
          const executionGradient = ctx.createRadialGradient(
            monster.x, monster.y, monsterSize * 0.5,
            monster.x, monster.y, monsterSize * 2
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
          if ((jumpAttackState === 'locking' || jumpAttackState === 'jump_start' || jumpAttackState === 'airborne' || jumpAttackState === 'landing') && rangeImage && monster.jumpAttackTargetX !== undefined && monster.jumpAttackTargetY !== undefined) {
            const targetX = monster.jumpAttackTargetX;
            const targetY = monster.jumpAttackTargetY;
            const rangeSize = 150; // range图标大小（原来的1.5倍）
            
            ctx.save();
            ctx.translate(targetX, targetY);
            ctx.drawImage(
              rangeImage,
              -rangeSize / 2,
              -rangeSize / 2,
              rangeSize,
              rangeSize
            );
            ctx.restore();
          }
          
          // BOSS动画选择
          let bossAnimImage = bossImage; // 默认使用boss_1
          if ((jumpAttackState === 'jump_start' || jumpAttackState === 'airborne' || jumpAttackState === 'landing') && boss2Image) {
            bossAnimImage = boss2Image; // 落地攻击使用boss_2
          }
          
          // BOSS使用序列帧动画
          if (bossAnimImage) {
            // 根据动画图片确定总帧数
            const totalFrames = bossAnimImage === boss2Image ? 20 : 8;
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
                bossFrameIndex = Math.min(Math.floor(jumpStartElapsed / frameDuration), jumpStartFrames - 1);
              } else {
                // boss_1: 2帧（索引0-1），每帧450ms
                const jumpStartFrames = 2;
                const frameDuration = jumpStartDuration / jumpStartFrames;
                bossFrameIndex = Math.min(Math.floor(jumpStartElapsed / frameDuration), jumpStartFrames - 1);
              }
            } else if (jumpAttackState === 'airborne') {
              // 空中阶段（1600ms）
              const airborneDuration = config.airborneDuration || 1600;
              const airborneElapsed = now - (monster.jumpAttackStartTime || now);
              
              if (bossAnimImage === boss2Image) {
                // boss_2: 9帧（索引9-17），每帧约177.78ms
                const airborneFrames = 9;
                const frameDuration = airborneDuration / airborneFrames;
                bossFrameIndex = 9 + Math.min(Math.floor(airborneElapsed / frameDuration), airborneFrames - 1);
              } else {
                // boss_1: 4帧（索引2-5），每帧400ms
                const airborneFrames = 4;
                const frameDuration = airborneDuration / airborneFrames;
                bossFrameIndex = 2 + Math.min(Math.floor(airborneElapsed / frameDuration), airborneFrames - 1);
              }
            } else if (jumpAttackState === 'landing') {
              // 落地阶段（500ms）
              const landingDuration = 500;
              const landingElapsed = now - (monster.jumpAttackStartTime || now);
              
              if (bossAnimImage === boss2Image) {
                // boss_2: 2帧（索引18-19），每帧250ms
                const landingFrames = 2;
                const frameDuration = landingDuration / landingFrames;
                bossFrameIndex = 18 + Math.min(Math.floor(landingElapsed / frameDuration), landingFrames - 1);
              } else {
                // boss_1: 2帧（索引6-7），每帧250ms
                const landingFrames = 2;
                const frameDuration = landingDuration / landingFrames;
                bossFrameIndex = 6 + Math.min(Math.floor(landingElapsed / frameDuration), landingFrames - 1);
              }
            } else {
              // 默认动画：循环播放
              const bossFrameDuration = bossAnimImage === boss2Image ? 50 : 100; // boss_2每帧50ms，boss_1每帧100ms
              const bossTotalDuration = bossFrameDuration * totalFrames;
              bossFrameIndex = Math.floor((now % bossTotalDuration) / bossFrameDuration);
            }
            
            // boss_1是8帧，boss_2是20帧，都是水平排列，每帧512x512px
            const bossFrameWidth = 512;
            const bossFrameHeight = 512;
            
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
              bossFrameIndex * bossFrameWidth, // 源X
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
              const bossAura = ctx.createRadialGradient(monster.x, monster.y, monsterSize, monster.x, monster.y, pulseRadius);
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
            ctx.arc(monster.x - bossEyeOffset, monster.y - bossEyeOffset, bossEyeSize + 3, 0, Math.PI * 2);
            ctx.arc(monster.x + bossEyeOffset, monster.y - bossEyeOffset, bossEyeSize + 3, 0, Math.PI * 2);
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
            ctx.arc(monster.x - bossEyeOffset, monster.y - bossEyeOffset, bossEyeSize * 0.5, 0, Math.PI * 2);
            ctx.arc(monster.x + bossEyeOffset, monster.y - bossEyeOffset, bossEyeSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // BOSS落地攻击时的爆炸效果
          if (isBoss && jumpAttackState === 'landing') {
            const explosionRadius = (config.jumpAttackDamageRadius || 100);
            const explosionAlpha = 0.8;
            
            // 爆炸光圈
            const explosion = ctx.createRadialGradient(monster.x, monster.y, 0, monster.x, monster.y, explosionRadius);
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
            ctx.fillRect(monster.x - hpBarWidth / 2, monster.y - monsterSize - 15, hpBarWidth, hpBarHeight);
            
            // 血条前景（绿色>30%，红色<=30%）
            ctx.fillStyle = hpPercent > 0.3 ? '#4ade80' : '#ef4444';
            ctx.fillRect(monster.x - hpBarWidth / 2, monster.y - monsterSize - 15, hpBarWidth * hpPercent, hpBarHeight);
          }
        } else {
          // 普通怪物 - 使用序列帧动画
          let enemyFrameDuration = 100; // 每帧100ms
          let enemyTotalFrames = 7; // 7帧
          let enemyTotalDuration = enemyFrameDuration * enemyTotalFrames; // 700ms
          
          // 根据怪物类型选择对应的图片
          let enemyImage = null;
          let isEnemy4 = false;  // 是否是敌人4
          
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
              enemyTotalFrames = enemy_4_2Image.width / 256; // 假设每帧256px宽
              enemyTotalDuration = enemyFrameDuration * enemyTotalFrames;
              
              const animationDuration = enemyTotalDuration;
              const timeSinceShootStart = now - (monster.shootAnimationStartTime || 0);
              
              if (timeSinceShootStart >= animationDuration) {
                // 完整的4_2动画播放完成，切换回4_1
                if (enemy_4_1Image) {
                  enemyImage = enemy_4_1Image;
                  enemyFrameDuration = 100;
                  enemyTotalFrames = Math.floor(enemy_4_1Image.width / 256);
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
                enemyTotalFrames = Math.floor(enemy_4_1Image.width / 256);
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
            const enemyFrameWidth = enemyImage.width / enemyTotalFrames;
            const enemyFrameHeight = enemyImage.height;
            
            // 计算移动方向并判断是否需要镜像
            const isMovingRight = monster.vx > 0.01;
            
            // 根据怪物类型决定镜像规则
            let shouldMirror = false;
            if (monster.monsterType === 1 || monster.monsterType === 2 || monster.monsterType === 4 || monster.monsterType === 5) {
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
              enemyFrameIndex * enemyFrameWidth, // 源X
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
          ctx.fillRect(monster.x - hpBarWidth / 2, monster.y - monsterSize - 15, hpBarWidth, hpBarHeight);
          
          ctx.fillStyle = hpPercent > 0.3 ? '#4ade80' : '#ef4444';
          ctx.fillRect(monster.x - hpBarWidth / 2, monster.y - monsterSize - 15, hpBarWidth * hpPercent, hpBarHeight);
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
            const explosion = ctx.createRadialGradient(monster.x, monster.y, 0, monster.x, monster.y, explosionRadius);
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
      poisonCircles.forEach(circle => {
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
      affixExplosionParticles.forEach(particle => {
        const elapsed = now - particle.startTime;
        const alpha = Math.max(0, 1 - elapsed / particle.duration);
        const size = particle.size * (1 - elapsed / particle.duration * 0.5);
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
      playerHitParticles.forEach(particle => {
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
      coins.forEach(coin => {
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
            ctx.arc(particle.x, particle.y, particle.size * (1 - particle.life / particle.maxLife), 0, Math.PI * 2);
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
              ctx.fillRect(coin.x - coin.size * scale, coin.y - coin.size * scale, coin.size * 2 * scale, coin.size * 2 * scale);
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
              ctx.fillRect(coin.x - coin.size * scale, coin.y - coin.size * scale, coin.size * 2 * scale, coin.size * 2 * scale);
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
              ctx.fillRect(coin.x - coin.size * scale, coin.y - coin.size * scale, coin.size * 2 * scale, coin.size * 2 * scale);
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
          const glowColor = coinType === 'chest' ? 'rgba(255, 215, 0, 0.25)'
            : coinType === 'weapon_upgrade_box' ? 'rgba(255, 105, 180, 0.25)'
            : coinType === 'health_potion' ? 'rgba(50, 205, 50, 0.25)'
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
      
      // 释放累加的伤害数字（超过0.3秒的）
      setAccumulatedDamage(prev => {
        const now = Date.now();
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
          setDamageNumbers(prev => [...prev, ...newDamageNumbers]);
        }
        
        return newMap;
      });
      
      // 更新伤害数字状态
      setDamageNumbers(prev => {
        const now = Date.now();
        const lifetime = 1000; // 伤害数字显示1秒
        const moveDuration = lifetime / 5; // 只在前20%的时间移动
        
        return prev.map(damageNum => {
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
            opacity = 1.0 - ((progress - fadeStart) / (1 - fadeStart));
          }
          
          return {
            ...damageNum,
            opacity: opacity,
            scale: 1.0 + progress * 0.3, // 稍微放大
            y: newY,
          };
        }).filter((num): num is DamageNumber => num !== null);
      });
      
      // 更新金币拖尾粒子
      setCoins(prev => {
        return prev.map(coin => {
          if (!coin.trailParticles || coin.trailParticles.length === 0) {
            return coin;
          }
          
          const updatedParticles = coin.trailParticles
            .map(particle => ({
              ...particle,
              life: particle.life + 16.67, // 假设60fps，每帧约16.67ms
              opacity: 0.8 * (1 - particle.life / particle.maxLife)
            }))
            .filter(particle => particle.life < particle.maxLife);
          
          return {
            ...coin,
            trailParticles: updatedParticles
          };
        });
      });
      
      // 更新金币弹字状态
      setGoldFloatingTexts(prev => {
        const now = Date.now();
        const lifetime = 1000; // 金币弹字显示1秒
        const moveDuration = lifetime / 5; // 只在前20%的时间移动
        
        return prev.map(text => {
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
            opacity = 1.0 - ((progress - fadeStart) / (1 - fadeStart));
          }
          
          return {
            ...text,
            opacity: opacity,
            scale: 1.0 + progress * 0.3, // 稍微放大
            y: newY,
          };
        }).filter((text): text is GoldFloatingText => text !== null);
      });
      
      // 更新爆炸效果（移除过期的）
      setExplosionEffects(prev => prev.filter(explosion => now - explosion.startTime < explosion.totalFrames * explosion.frameDuration));
      
      // 更新穿透光效（移除过期的）
      setPierceEffects(prev => prev.filter(p => now - p.startTime < p.duration));
      
      // 更新烟雾效果（移除过期的）
      setSmokeEffects(prev => prev.filter(smoke => now - smoke.startTime < smoke.duration));
      
      // 更新吸血回复效果（移除过期的）
      setVampireHealEffects(prev => prev.filter(effect => now - effect.startTime < 800));
      
      // 更新词缀爆炸粒子（移动 + 移除过期的）
      setAffixExplosionParticles(prev => {
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
      setPlayerHitParticles(prev => {
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
      
      // 绘制爆炸效果（只读，不修改状态）
      if (boomImage) {
        explosionEffects.forEach(explosion => {
          const elapsed = now - explosion.startTime;
          const totalDuration = explosion.totalFrames * explosion.frameDuration; // 总时长 = 一遍播放
          
          if (elapsed < totalDuration) {
            // 正序播放：从第一帧往最后一帧播放
            const frameProgress = elapsed / explosion.frameDuration;
            const frameIndex = Math.floor(frameProgress); // 从第一帧开始
            
            // 透明度：第一帧(70%) -> 最后一帧(100%)
            // 当前帧索引越大（越接近最后一帧），透明度越高
            const progressToLastFrame = frameIndex / (explosion.totalFrames - 1); // 0(第一帧) -> 1(最后一帧)
            const opacity = 0.7 + (progressToLastFrame * 0.3); // 70% -> 100%
            
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
              srcX, 0, frameWidth, frameHeight, // 源区域
              -explosion.radius, -explosion.radius, // 目标位置（居中）
              explosion.radius * 2, explosion.radius * 2 // 目标大小
            );
            
            ctx.restore();
          }
        });
      }
      
      // 绘制穿透光效（只读，不修改状态）—— 刀光冲击效果
      pierceEffects.forEach(effect => {
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
      if (baseTransformRef.current) { ctx.setTransform(baseTransformRef.current); }

      // 闪现技能图标（右下角圆形）+ 冷却遮罩与倒计时
      if (gameState === 'playing') {
        const dashCenterX = GAME_CONFIG.CANVAS_WIDTH - 86;
        const dashCenterY = GAME_CONFIG.CANVAS_HEIGHT - 86;
        const dashRadius = 40;
        const cdRatio = dashCooldown > 0 ? Math.min(1, dashCooldown / DASH_COOLDOWN_MS) : 0;
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
          ctx.drawImage(skillIconImage, (200 - dw) / 2, (200 - dw) / 2, dw, dw, -dw / 2, -dw / 2, dw, dw);
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
          const cdSecs = Math.max(0, Math.ceil(dashCooldown / 1000));
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
      damageNumbers.forEach(damageNum => {
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
        const baseFontSize = damageNum.isDoubleCrit ? 36 : (damageNum.isCrit ? 30 : 20);
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
          const smallFontSize = Math.round(adjustedFontSize * 0.5 / 10) * 10;
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
      goldFloatingTexts.forEach(text => {
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
      smokeEffects.forEach(smoke => {
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
      if (player.energyAuraLevel > 0) {
        const auraRadius = GAME_CONFIG.ENERGY_AURA_BASE_RADIUS + player.energyAuraLevel * 15;
        const auraPhase = (now % 2000) / 2000; // 2秒周期动画
        
        // 气场外圈光晕（增强亮度）
        const auraGradient = ctx.createRadialGradient(
          player.x, player.y, auraRadius * 0.3,
          player.x, player.y, auraRadius * 1.3
        );
        auraGradient.addColorStop(0, 'rgba(100, 200, 255, 0.1)');
        auraGradient.addColorStop(0.4, 'rgba(100, 200, 255, 0.35)');
        auraGradient.addColorStop(0.7, 'rgba(150, 220, 255, 0.25)');
        auraGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
        
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(player.x, player.y, auraRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        // 气场边界线（呼吸效果，增强亮度和线宽）
        ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 + Math.sin(auraPhase * Math.PI * 2) * 0.3})`;
        ctx.lineWidth = 3 + Math.sin(auraPhase * Math.PI * 2) * 1;
        ctx.beginPath();
        ctx.arc(player.x, player.y, auraRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内圈脉动（增强效果，多层叠加）
        const pulseAlpha = 0.4 + Math.sin(auraPhase * Math.PI * 4) * 0.25;
        ctx.strokeStyle = `rgba(150, 220, 255, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, auraRadius * 0.7 + Math.sin(auraPhase * Math.PI * 4) * 5, 0, Math.PI * 2);
        ctx.stroke();
        
        // 第二层脉动
        ctx.strokeStyle = `rgba(180, 230, 255, ${pulseAlpha * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, auraRadius * 0.4 + Math.sin(auraPhase * Math.PI * 6) * 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // 冲击波效果（增强视觉效果，多层波纹）
        const timeSinceLastShockwave = now - player.lastEnergyAuraShockwaveTime;
        if (timeSinceLastShockwave < 800) { // 延长显示时间到800ms
          const shockwaveProgress = timeSinceLastShockwave / 800;
          
          // 主冲击波
          const shockwaveRadius = auraRadius * (0.3 + shockwaveProgress * 1.0);
          const shockwaveOpacity = 0.8 * (1 - shockwaveProgress);
          
          ctx.strokeStyle = `rgba(100, 200, 255, ${shockwaveOpacity})`;
          ctx.lineWidth = 4 * (1 - shockwaveProgress * 0.5);
          ctx.beginPath();
          ctx.arc(player.x, player.y, shockwaveRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // 内层冲击波
          const innerRadius = auraRadius * (0.1 + shockwaveProgress * 0.7);
          const innerOpacity = 0.5 * (1 - shockwaveProgress);
          
          ctx.strokeStyle = `rgba(150, 220, 255, ${innerOpacity})`;
          ctx.lineWidth = 2 * (1 - shockwaveProgress * 0.5);
          ctx.beginPath();
          ctx.arc(player.x, player.y, innerRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // 外层光晕
          const outerRadius = auraRadius * (0.5 + shockwaveProgress * 1.2);
          const outerGradient = ctx.createRadialGradient(
            player.x, player.y, outerRadius * 0.8,
            player.x, player.y, outerRadius
          );
          outerGradient.addColorStop(0, `rgba(100, 200, 255, 0)`);
          outerGradient.addColorStop(1, `rgba(100, 200, 255, ${shockwaveOpacity * 0.3})`);
          
          ctx.fillStyle = outerGradient;
          ctx.beginPath();
          ctx.arc(player.x, player.y, outerRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // 绘制玩家（使用序列帧动画）
      // 选择动画资源：移动时用走动动画，停止时用待机动画
      const playerAnimImage = player.isMoving ? playerWalkImage : playerIdleImage;

      // 闪现状态：使用 player_3 8帧动画，武器隐藏、不可攻击、无敌
      const dashActive = dashRef.current.active;
      const DASH_FRAME_X = [63, 315, 545, 788, 1041, 1317, 1603, 1858];
      const DASH_FRAME_W = [252, 230, 243, 253, 276, 286, 255, 281];
      
      // 检测是否受击闪红
      const isPlayerHitEffect = player.isHit && (now - player.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION);
      
      if (playerAnimImage) {
        ctx.save();
        
        // 根据瞄准方向计算面朝方向
        const canvasRect = canvas.getBoundingClientRect();
        const aimAngle = Math.atan2(
          mousePos.y - canvasRect.top - GAME_CONFIG.CANVAS_HEIGHT / 2,
          mousePos.x - canvasRect.left - GAME_CONFIG.CANVAS_WIDTH / 2
        );
        
        // 规范化角度到0-360度
        let normalizedAngle = (aimAngle * 180 / Math.PI) % 360;
        if (normalizedAngle < 0) {
          normalizedAngle += 360;
        }
        
        // 判断是否需要镜像：0-90°或270-360°为右侧（需要镜像），90-270°为左侧（不镜像）
        const shouldMirrorPlayer = normalizedAngle <= 90 || normalizedAngle > 270;
        
        // 计算动画帧
        const totalFrames = player.isMoving ? 10 : 9; // 走动10帧，待机9帧
        const frameDuration = 100; // 每帧100ms
        const animTime = now - player.animationStartTime;
        const frameIndex = Math.floor(animTime / frameDuration) % totalFrames;
        
        // 每帧大小（缩小为60%）
        const frameWidth = 256 * 0.6;
        const frameHeight = 192 * 0.6;
        
        // 移动到玩家位置
        ctx.translate(player.x, player.y);
        
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
          if (dashFrameIdx < 0) dashFrameIdx = 7 - ((-dashFrameIdx) % 8);
          srcImg = playerDashImage;
          srcX = DASH_FRAME_X[dashFrameIdx];
          srcW = DASH_FRAME_W[dashFrameIdx];
        }
        ctx.drawImage(
          srcImg,
          srcX,                     // 源X（原尺寸）
          0,                        // 源Y
          srcW,                     // 源宽（原尺寸）
          192,                      // 源高（原尺寸）
          -frameWidth / 2,         // 目标X（居中）
          -frameHeight / 2,        // 目标Y（居中）
          frameWidth,              // 目标宽（缩小后）
          frameHeight              // 目标高（缩小后）
        );
        
        // 受击闪红叠加层（根据人物形状）
        if (isPlayerHitEffect && !dashActive) {
          ctx.save();
          // 使用filter将人物变成红色
          ctx.filter = 'brightness(1.2) sepia(1) saturate(3) hue-rotate(-50deg)';
          ctx.globalAlpha = 0.7;
          ctx.drawImage(
            playerAnimImage,
            frameIndex * 256,         // 源X（原尺寸）
            0,                        // 源Y
            256,                      // 源宽（原尺寸）
            192,                      // 源高（原尺寸）
            -frameWidth / 2,         // 目标X（居中）
            -frameHeight / 2,        // 目标Y（居中）
            frameWidth,              // 目标宽（缩小后）
            frameHeight              // 目标高（缩小后）
          );
          ctx.restore();
        }
        
        ctx.restore();
      } else {
        // 备用绘制（如果图片未加载）：使用简单图形
        const isPlayerHitEffect = player.isHit && (now - player.hitTime < GAME_CONFIG.HIT_EFFECT_DURATION);
        
        ctx.fillStyle = isPlayerHitEffect ? '#ff0000' : '#4ade80';
        ctx.beginPath();
        ctx.arc(player.x, player.y, GAME_CONFIG.PLAYER_SIZE, 0, Math.PI * 2);
        ctx.fill();
        
        // 玩家眼睛
        const eyeOffset = 8;
        const eyeSize = 5;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(player.x - eyeOffset, player.y - eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.arc(player.x + eyeOffset, player.y - eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 玩家武器（使用美术贴图，智能瞄准和镜像翻转）
      const canvasRect = canvas.getBoundingClientRect();
      // 计算鼠标相对于屏幕中心的角度（因为摄像机以玩家为中心）
      let weaponAngle = Math.atan2(
        mousePos.y - canvasRect.top - GAME_CONFIG.CANVAS_HEIGHT / 2,
        mousePos.x - canvasRect.left - GAME_CONFIG.CANVAS_WIDTH / 2
      );
      
      // 获取当前武器的图片
      const currentWeaponImage = getWeaponImage();
      
      // 武器切换旋转动画
      let displayWeaponAngle = weaponAngle;
      let switchAnimationProgress = 1; // 默认完成
      
      if (player.isSwitchingWeapon && currentWeaponImage) {
        const switchDuration = 800; // 切换动画时长（毫秒）
        const elapsed = now - player.weaponSwitchStartTime;
        switchAnimationProgress = Math.min(elapsed / switchDuration, 1);
        
        // 使用缓动函数让动画更自然（ease-out）
        const easedProgress = 1 - Math.pow(1 - switchAnimationProgress, 3);
        
        // 计算旋转角度：从下方（-90度）旋转到瞄准方向
        // 使用最短路径旋转
        const startAngle = -Math.PI / 2; // 从正下方开始（270度位置）
        let targetAngle = weaponAngle;
        
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
        let normalizedAngle = (displayWeaponAngle * 180 / Math.PI) % 360;
        if (normalizedAngle < 0) {
          normalizedAngle += 360;
        }
        
        // 判断是否需要镜像：只在90-270度之间镜像（瞄准左半区）
        // 图片翻转和旋转是独立的，镜像只是翻转图片，不影响旋转角度
        const shouldMirror = normalizedAngle > 90 && normalizedAngle <= 270;
        
        ctx.save();
        
        // 移动到玩家位置
        ctx.translate(player.x, player.y);
        
        // 更新并衰减后坐力（仅视觉效果，切换动画期间不应用）
        const recoilDecay = 0.85; // 后坐力衰减系数
        recoilRef.current = {
          backward: recoilRef.current.backward * recoilDecay,
          upward: recoilRef.current.upward * recoilDecay,
          shake: recoilRef.current.shake * recoilDecay,
        };
        
        // 旋转到瞄准方向 + 后坐力上跳角度
        // 切换动画期间使用动画角度，不应用后坐力
        const recoilUpward = player.isSwitchingWeapon ? 0 : recoilRef.current.upward;
        const recoilBack = player.isSwitchingWeapon ? 0 : recoilRef.current.backward;
        ctx.rotate(displayWeaponAngle - recoilUpward);  // 减去角度使枪口向上
        
        // 只在需要时镜像图片（不影响旋转角度，只是翻转图片）
        if (shouldMirror) {
          ctx.scale(1, -1);  // 垂直镜像（翻转图片，不改变方向）
        }
        
        // 添加晃动效果（随机微小偏移，切换动画期间不应用）
        const shakeX = player.isSwitchingWeapon ? 0 : (Math.random() - 0.5) * recoilRef.current.shake;
        const shakeY = player.isSwitchingWeapon ? 0 : (Math.random() - 0.5) * recoilRef.current.shake;
        
        // 绘制武器贴图（放在玩家前方）
        // 长枪的旋转半径为固定-25px（扛在肩上，向后偏移）
        const baseWeaponOffset = GAME_CONFIG.PLAYER_SIZE + 5;
        const weaponOffset = weaponConfig.isLongGun ? -25 : baseWeaponOffset;
        const weaponScale = 1.56; // 武器缩放比例（1.2 * 1.3 = 1.56，放大30%）
        
        // 切换动画期间，武器从下方旋转过来，稍微拉远一点
        const animOffset = player.isSwitchingWeapon ? 10 * (1 - switchAnimationProgress) : 0;
        
        // 根据不同武器调整大小
        let weaponWidth = 50;
        let weaponHeight = 20;
        
        switch (player.weapon) {
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
          weaponOffset - recoilBack + shakeX + animOffset,  // 后退 + 晃动 + 动画偏移
          -scaledHeight / 2 + shakeY,                       // 晃动
          scaledWidth,
          scaledHeight
        );
        
        ctx.restore();
      }
      
      // 绘制和更新枪火动画
      if (fireImage) {
        const now = Date.now();
        
        // 直接更新 ref，避免触发重新渲染
        muzzleFlashesRef.current = muzzleFlashesRef.current.filter(flash => {
          const elapsed = now - flash.startTime;
          
          // 如果动画未完成，更新并绘制
          if (elapsed < flash.duration) {
            // 计算当前帧（5帧，每帧60ms，300ms总时长）- 复古像素风格
            flash.currentFrame = Math.floor(elapsed / (flash.duration / 5));
            
            const frameWidth = 200; // 每帧宽度
            const frameHeight = 256; // 每帧高度
            const frameIndex = Math.min(flash.currentFrame, 4); // 最多5帧
            
            ctx.save();
            ctx.translate(flash.x, flash.y);
            ctx.rotate(flash.angle);
            
            // 绘制枪火精灵表的当前帧
            ctx.drawImage(
              fireImage,
              frameIndex * frameWidth,  // 源X（当前帧）
              0,                          // 源Y
              frameWidth,                 // 源宽度
              frameHeight,                // 源高度
              0,                          // 目标X
              -frameHeight * flash.scale / 2,  // 目标Y（垂直居中）
              frameWidth * flash.scale,   // 目标宽度
              frameHeight * flash.scale   // 目标高度
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
          player.x + Math.cos(weaponAngle) * GAME_CONFIG.PLAYER_SIZE,
          player.y + Math.sin(weaponAngle) * GAME_CONFIG.PLAYER_SIZE
        );
        ctx.lineTo(
          player.x + Math.cos(weaponAngle) * (GAME_CONFIG.PLAYER_SIZE + 20),
          player.y + Math.sin(weaponAngle) * (GAME_CONFIG.PLAYER_SIZE + 20)
        );
        ctx.stroke();
      }
      
      // 绘制换弹进度条和图标
      if (player.isReloading) {
        const weaponConfig = WEAPONS[player.weapon];
        // 狂暴状态：换弹速度+30%
        const desperateActive = isDesperateFightActive(player);
        const effectiveReloadBonus = player.reloadSpeedBonus + (desperateActive ? 30 : 0);
        const effectiveReloadTime = getEffectiveReloadTime(weaponConfig, effectiveReloadBonus) * (player.weapon === 'pistol' && hasGrowthChainNode(player, 'pistol_final_strike_chain') ? 1.4 : 1);
        const elapsed = now - player.reloadStartTime;
        const progress = Math.min(elapsed / effectiveReloadTime, 1);
        
        // 绘制环形进度条（缩小50%后再缩小20%，位于角色下方再往下40px）
        const progressRadius = (GAME_CONFIG.PLAYER_SIZE + 10) * 0.4;
        const progressY = player.y + GAME_CONFIG.PLAYER_SIZE + 45; // 位于角色下方40px处
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.PI * 2 * progress);
        
        // 背景圆环（圈粗细增加150%：4 → 6）
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(player.x, progressY, progressRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 进度圆环（圈粗细增加150%：4 → 6）
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(player.x, progressY, progressRadius, startAngle, endAngle);
        ctx.stroke();
        
        // 旋转的加载图标（位于角色下方）
        ctx.save();
        ctx.translate(player.x, progressY);
        ctx.rotate(elapsed * 0.005); // 旋转动画
        
        ctx.fillStyle = '#ff8800';
        ctx.font = '20px "Ark Pixel", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↻', 0, 0);
        
        ctx.restore();
      }
      
      // 绘制吸血回复效果（红色上升光效）
      vampireHealEffects.forEach(effect => {
        const elapsed = now - effect.startTime;
        const duration = 800; // 0.8秒动画
        const progress = elapsed / duration;
        
        if (progress < 1) {
          // 红色上升光效
          const effectY = player.y - 30 - progress * 40; // 向上移动
          const opacity = 1 - progress;
          const scale = 1 + progress * 0.5; // 逐渐放大
          
          // 绘制红色光晕（多层叠加）
          const gradient = ctx.createRadialGradient(
            player.x, effectY, 0,
            player.x, effectY, 30 * scale
          );
          gradient.addColorStop(0, `rgba(255, 50, 50, ${opacity * 0.8})`);
          gradient.addColorStop(0.5, `rgba(255, 100, 100, ${opacity * 0.4})`);
          gradient.addColorStop(1, `rgba(255, 50, 50, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(player.x, effectY, 30 * scale, 0, Math.PI * 2);
          ctx.fill();
          
          // 绘制上升的粒子效果
          for (let i = 0; i < 5; i++) {
            const particleY = effectY - i * 10 + Math.sin(elapsed * 0.01 + i) * 5;
            const particleX = player.x + Math.cos(elapsed * 0.02 + i * 1.5) * 10;
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
      if (waveTransition) {
        const nowMs = Date.now();
        const WAVE_DELAY = 4000;      // 波间延迟4秒
        const ANNOUNCE_HOLD = 2000;   // 公告停留2秒
        const ANNOUNCE_FADE = 300;    // 淡出0.3秒
        const COUNTDOWN_DELAY = 500;  // 淡出后间隔0.5秒
        const ANNOUNCE_START = WAVE_DELAY;
        const ANNOUNCE_END = WAVE_DELAY + ANNOUNCE_HOLD;
        const COUNTDOWN_START = WAVE_DELAY + ANNOUNCE_HOLD + ANNOUNCE_FADE + COUNTDOWN_DELAY;
        const COUNTDOWN_EACH = 1000;  // 每个数字停留1秒
        const wElapsed = nowMs - waveTransition.startTime;

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
              const waveTitle = t('waveTitle').replace('{n}', String(waveTransition.waveNumber));
              const waveEnemies = t('waveEnemies').replace('{n}', String(waveTransition.enemyCount));
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
      if (pauseImage && !isPaused) {
        const buttonSize = 40;
        const buttonX = (GAME_CONFIG.CANVAS_WIDTH - buttonSize) / 2;
        const buttonY = 10;
        
        ctx.drawImage(pauseImage, buttonX, buttonY, buttonSize, buttonSize);
      }
      
      // 绘制箭头指示器（指示屏幕外的敌人位置）
      // 只在敌人数量少于5时显示
      if (arrowImage && monsters.length < 5 && monsters.length > 0) {
        const arrowRadius = 120; // 箭头距离玩家的距离
        const arrowSize = 30; // 箭头显示大小
        
        monsters.forEach(monster => {
          if (monster.isDying) return;
          
          // 计算敌人相对于玩家的位置
          const relativeX = monster.x - player.x;
          const relativeY = monster.y - player.y;
          
          // 计算屏幕边界（相对于玩家）
          const screenHalfWidth = GAME_CONFIG.CANVAS_WIDTH / 2;
          const screenHalfHeight = GAME_CONFIG.CANVAS_HEIGHT / 2;
          
          // 检查敌人是否在屏幕外
          const isOffscreen = 
            Math.abs(relativeX) > screenHalfWidth ||
            Math.abs(relativeY) > screenHalfHeight;
          
          if (!isOffscreen) return; // 敌人在屏幕内，不显示箭头
          
          // 计算敌人相对于玩家的角度
          const angle = Math.atan2(relativeY, relativeX);
          
          // 计算箭头在屏幕上的位置（围绕玩家一圈）
          // 玩家在屏幕中心 (GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2)
          const arrowX = (GAME_CONFIG.CANVAS_WIDTH / 2) + Math.cos(angle) * arrowRadius;
          const arrowY = (GAME_CONFIG.CANVAS_HEIGHT / 2) + Math.sin(angle) * arrowRadius;
          
          // 绘制箭头
          ctx.save();
          ctx.translate(arrowX, arrowY);
          // 旋转箭头，使其指向敌人
          // 原始箭头向下（朝向+y），需要旋转angle + Math.PI/2
          ctx.rotate(angle + Math.PI / 2);
          
          ctx.drawImage(
            arrowImage,
            -arrowSize / 2,
            -arrowSize / 2,
            arrowSize,
            arrowSize
          );
          
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
      ctx.fillText(t('hudLevel') + ' ' + level, 10, uiY);
      uiY += 25;
      
      // 分数
      ctx.fillText(t('hudScore') + ': ' + score, 10, uiY);
      uiY += 25;
      
      // 金币
      ctx.fillStyle = '#ffffff';
      ctx.fillText(t('hudGold') + ': ' + player.gold, 10, uiY);
      uiY += 30; // 增加间距
      
      // 剩余怪物（场上存活 + 待生成批次）
      ctx.fillStyle = '#ff4444';
      const aliveMonsters = monsters.filter(m => !m.isDying).length;
      const pendingMonsters = pendingMonsterBatches.reduce((sum, batch) => sum + batch.length, 0);
      const totalRemaining = aliveMonsters + pendingMonsters;
      ctx.fillText(t('hudRemaining') + ': ' + totalRemaining, 10, uiY);
      
      // ========== 右侧信息：武器和玩家状态 ==========
      uiY = 10;
      const rightX = GAME_CONFIG.CANVAS_WIDTH - 10;
      ctx.textAlign = 'right';
      
      // 武器
      ctx.textAlign = 'right';
      ctx.font = `${uiFontSize}px 'Ark Pixel', Arial`;
      
      // 武器
      ctx.fillStyle = '#00ff00';
      ctx.fillText(t('hudWeapon') + ': ' + WEAPONS[player.weapon].name + ' Lv.' + player.weaponLevel, rightX, uiY);
      uiY += 25;
      
      // 射速
      ctx.fillStyle = '#ffaa00';
      ctx.fillText(t('hudFireRate') + ': ' + Math.round(1000 / player.fireRate) + '/' + t('sec'), rightX, uiY);
      uiY += 30; // 增加间距
      
      // 暴击率（显示有效暴击率，带软上限）
      ctx.fillStyle = '#ffd700';
      const effectiveCritRate = getEffectiveCritRate(WEAPONS[player.weapon].critRate, player.critRateBonus + getEquippedWeaponCritPct(player));
      const rawCritRate = WEAPONS[player.weapon].critRate + player.critRateBonus / 100;
      // 如果原始暴击率超过70%，显示有效值和原始值
      if (rawCritRate > 0.7) {
        ctx.fillText('⭐ ' + t('hudCritRate') + ': ' + (effectiveCritRate * 100).toFixed(1) + '% (' + t('hudRaw') + (rawCritRate * 100).toFixed(1) + '%)', rightX, uiY);
      } else {
        ctx.fillText('⭐ ' + t('hudCritRate') + ': ' + (effectiveCritRate * 100).toFixed(1) + '%', rightX, uiY);
      }
      uiY += 25;
      
      // 暴击伤害（显示有效暴击伤害，带软上限）
      ctx.fillStyle = '#ff9900';
      const effectiveCritDamage = getEffectiveCritDamageBonus(1.5, player.critDamageBonus);
      const rawCritDamageBonus = player.critDamageBonus;
      const rawCritDamage = 1.5 + rawCritDamageBonus / 100;
      // 如果原始额外加成超过150%，显示有效值和原始值
      if (rawCritDamageBonus > 150) {
        ctx.fillText('💥 ' + t('hudCritDamage') + ': ' + (effectiveCritDamage * 100).toFixed(0) + '% (' + t('hudRaw') + (rawCritDamage * 100).toFixed(0) + '%)', rightX, uiY);
      } else {
        ctx.fillText('💥 ' + t('hudCritDamage') + ': ' + (effectiveCritDamage * 100).toFixed(0) + '%', rightX, uiY);
      }
      uiY += 25;
      
      // 穿透力
      ctx.fillStyle = '#9b59b6';
      ctx.fillText('🎯 ' + t('hudPenetration') + ': ' + player.penetration, rightX, uiY);
      uiY += 25;
      
      // 伤害
      ctx.fillStyle = '#ffffff';
      ctx.fillText('⚔️ ' + t('hudDamage') + ': ' + player.damage, rightX, uiY);
      uiY += 25;
      
      // 射程
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🎯 ' + t('hudRange') + ': ' + player.weaponRange.toFixed(0), rightX, uiY);
      uiY += 25;
      
      // 子弹速度
      ctx.fillStyle = '#ffffff';
      ctx.fillText('💨 ' + t('hudBulletSpeed') + ': ' + player.bulletSpeed.toFixed(1), rightX, uiY);
      uiY += 25;
      
      // 移动速度
      ctx.fillStyle = '#00ffff';
      ctx.fillText('🏃 ' + t('hudMoveSpeed') + ': ' + player.playerSpeed.toFixed(1), rightX, uiY);
      uiY += 25;
      
      // 换弹速度
      ctx.fillStyle = '#ff8800';
      ctx.fillText('🔄 ' + t('hudReloadTime') + ': ' + (effectiveReloadTime / 1000).toFixed(2) + t('sec'), rightX, uiY);
      
      // ========== 底部中间：血量格子显示 ==========
      if (hpBarImage && hpGreenImage && hpYellowImage && hpRedImage) {
        const currentHp = Math.floor(player.hp); // 当前血量（整数）
        const maxHp = Math.floor(player.maxHp); // 最大血量（整数）
        const hpRatio = currentHp / maxHp; // 血量比例
        
        // 选择血量格子颜色
        let hpImage = hpGreenImage;
        if (hpRatio <= 1/3) {
          hpImage = hpRedImage;
        } else if (hpRatio <= 2/3) {
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
        const totalCellsWidth = (cellWidth * maxHp) + (hpGap * (maxHp - 1));
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
      if (isPaused) {
        drawPauseScreen(ctx);
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, keys, mousePos, isMouseDown, player, monsters, bullets, obstacles, bulletImage, bossImage]);
  
  // 检测关卡完成
  useEffect(() => {
    const isBossLevel = level === 5;
    // 关卡完成条件：当前没有存活敌人 且 没有待生成的敌人批次
    // 使用实际存活的怪物数量，而不是依赖 monstersRemaining 状态变量（可能不同步）
    const aliveMonsters = monsters.filter(m => !m.isDying).length;
    const isLevelComplete = isBossLevel 
      ? (aliveMonsters === 0 && !bossAlive && pendingMonsterBatches.length === 0) 
      : (aliveMonsters === 0 && pendingMonsterBatches.length === 0);
    
    if (isLevelComplete && gameState === 'playing' && !levelCompletionTriggered) {
      // 标记关卡完成已触发
      setLevelCompletionTriggered(true);
      
      // 清除之前的延迟定时器
      if (levelCompleteTimeoutRef.current) {
        clearTimeout(levelCompleteTimeoutRef.current);
      }
      
      // 延迟2秒后显示升级界面
      levelCompleteTimeoutRef.current = setTimeout(() => {
        // 使用 ref 获取最新的玩家状态
        const currentPlayer = playerRef.current;
        if (currentPlayer) {
          selectRandomUpgrades(currentPlayer.weapon, level, currentPlayer);
          setGameState('upgrade');
          setUpgradeRefreshCount(0); // 重置刷新次数
          
          // 停止背景音乐
          stopBGM();
          
          // 播放关卡完成音效
          playSound('level_complete');
        }
      }, 2000);
    }
  }, [monsters, gameState, level, selectRandomUpgrades, levelCompletionTriggered, bossAlive, pendingMonsterBatches.length, stopBGM, playSound]);
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (levelCompleteTimeoutRef.current) {
        clearTimeout(levelCompleteTimeoutRef.current);
        levelCompleteTimeoutRef.current = undefined;
      }
    };
  }, []);
  
  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 处理ESC键暂停游戏（只在未暂停时响应）
      if (e.key === 'Escape' && gameState === 'playing' && !isPaused) {
        e.preventDefault();
        // 暂停游戏
        setIsPaused(true);
        return;
      }
      
      // 暂停时不处理移动键
      if (isPaused) {
        return;
      }
      
      // E键触发闪现（仅在战斗中）
      if ((e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        if (!dashRef.current.active) {
          dashPendingRef.current = true;
        }
        return;
      }
      
      setKeys(prev => new Set(prev).add(e.key));
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key);
        return newKeys;
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // 鼠标滚轮切换武器
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 只在游戏进行中且未暂停时响应
      if (gameState !== 'playing' || isPaused) return;
      
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
  }, [gameState, isPaused, switchWeapon]);
  
  // 数字键快捷切换武器
  useEffect(() => {
    const handleWeaponKey = (e: KeyboardEvent) => {
      // 只在游戏进行中且未暂停时响应
      if (gameState !== 'playing' || isPaused) return;
      // 忽略输入框/文本区域中的按键
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      
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
  }, [gameState, isPaused, switchWeaponTo]);
  
  // 鼠标事件
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaused) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleMouseDown = () => {
    if (!isPaused) {
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
    if (isPaused) {
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
    if (!isPaused && pauseImage) {
      const buttonSize = 40;
      const buttonX = (GAME_CONFIG.CANVAS_WIDTH - buttonSize) / 2;
      const buttonY = 10;
      
      if (
        x >= buttonX && 
        x <= buttonX + buttonSize && 
        y >= buttonY && 
        y <= buttonY + buttonSize
      ) {
        // 点击了暂停按钮，立即暂停
        setIsPaused(true);
        return;
      }
    }
  };
  
  const handleMouseUp = () => setIsMouseDown(false);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="p-6">
        <div className="relative" style={{ width: GAME_CONFIG.CANVAS_WIDTH, height: GAME_CONFIG.CANVAS_HEIGHT }}>
          {/* 加载界面 */}
          {isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg bg-gradient-to-b from-gray-900 to-black">
              {/* 游戏标题 */}
              <h1 className="text-4xl font-bold text-yellow-400 mb-8" style={{ 
                textShadow: '0 0 10px rgba(250, 204, 21, 0.5), 3px 3px 0 #000',
                fontFamily: '"Ark Pixel", Arial'
              }}>
                {t('game_title')}
              </h1>
              
              {/* 加载状态文本 */}
              <p className="text-gray-300 text-lg mb-6" style={{ fontFamily: '"Ark Pixel", Arial' }}>
                {t('loading')}
              </p>
              
              {/* 进度条容器 */}
              <div className="w-80 h-8 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-600 mb-4">
                {/* 进度条填充 */}
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 transition-all duration-200 ease-out"
                  style={{
                    width: `${loadProgress}%`,
                    boxShadow: '0 0 10px rgba(250, 204, 21, 0.5)'
                  }}
                />
              </div>
              
              {/* 进度百分比 */}
              <p className="text-yellow-400 text-2xl font-bold" style={{ fontFamily: '"Ark Pixel", Arial' }}>
                {loadProgress}%
              </p>
              
              {/* 小提示 */}
              <p className="text-gray-500 text-sm mt-8" style={{ fontFamily: '"Ark Pixel", Arial' }}>
                {t('loading_click_to_start')}
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
            onClick={handleClick}
          />
          
          {/* 武器切换提示 */}
          {player.isSwitchingWeapon && (
            <div 
              className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end"
            >
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
                  0%, 100% {
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
          {gameState === 'playing' && !isPaused && (
            <div className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
              {/* 弹药数显示 */}
              <div className="text-white font-bold text-lg" style={{ 
                textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                fontFamily: '"Ark Pixel", Arial'
              }}>
                🔫 {t('ammo')}: {player.currentAmmo}/{getWeaponMagazine(player, player.weapon)}
                {player.isReloading && (
                  <span className="ml-2 text-yellow-300">{t('reloading')}</span>
                )}
              </div>
              

            </div>
          )}
          
          {/* 武器切换UI - 左下角（数字键快捷切换） */}
          {gameState === 'playing' && (
            <div className="absolute bottom-4 left-4 flex flex-col gap-1">
              <div className="text-gray-400/90 text-[11px] font-semibold px-1 mb-0.5 tracking-wide select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                {t('switch_weapon_hint').replace('{keys}', player.weapons.map((_, i) => i + 1).join(' / '))}
              </div>
              <div className="flex flex-col gap-1.5" style={{ backdropFilter: 'blur(6px)' }}>
                {player.weapons.map((wpn, idx) => {
                  const isActive = idx === player.currentWeaponIndex;
                  const inst = getWeaponInstance(player, wpn);
                  const rmeta = RARITY_META[inst.rarity] || RARITY_META[1];
                  const s = getWeaponAffixSummary(player, wpn);
                  const affixText = inst.affixes.map(a => a.valueLabel).join(' · ');
                  return (
                    <div
                      key={wpn}
                      onClick={() => switchWeaponTo(idx)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 min-w-[240px] cursor-pointer select-none transition-all duration-150
                        ${isActive
                          ? 'bg-gray-800/95 border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
                          : 'bg-gray-900/75 border-2 border-gray-600 hover:border-gray-400 active:bg-gray-800/90'}`}
                      style={isActive ? { borderColor: '#22d3ee' } : undefined}
                    >
                      {/* 编号 */}
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black shrink-0
                        ${isActive ? 'bg-cyan-400 text-gray-900' : 'bg-gray-700 text-gray-200'}`}>
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
                        <span className="text-sm font-bold truncate leading-tight" style={{ color: rmeta.color, textShadow: `0 0 6px ${rmeta.color}55` }}>
                          {WEAPONS[wpn].name}
                          <span className="ml-1.5 text-[10px] font-bold opacity-90">{rmeta.name}</span>
                        </span>
                        <span className="text-[10px] text-gray-300/90 truncate leading-tight">
                          {inst.affixes.length > 0
                            ? affixText
                            : <span className="text-gray-500">· 无随机属性 ·</span>}
                          <span className="ml-1 text-gray-400">价值{inst.value}</span>
                        </span>
                      </div>
                      {/* 当前标记 */}
                      {isActive && (
                        <span className="ml-auto text-[10px] font-bold text-cyan-300 tracking-wide">●</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* 静音按钮 - 右上角 */}
          {gameState === 'playing' && !isPaused && (
            <button
              onClick={toggleMute}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-800/80 border-2 border-gray-500 hover:border-white flex items-center justify-center cursor-pointer transition-all duration-200"
              style={{
                backdropFilter: 'blur(5px)'
              }}
              title={isMuted ? t('enable_sound') : t('mute')}
            >
              {isMuted ? (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          )}
          
          {/* 菜单界面 */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{
              backgroundImage: 'url(/assets/bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}>
              {/* 右上角设置按钮 */}
              <button
                onClick={() => setShowSettings(true)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-gray-800/80 border-2 border-gray-400 hover:border-white flex items-center justify-center cursor-pointer transition-all duration-200"
                style={{ backdropFilter: 'blur(5px)' }}
                title={t('settings')}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
                    boxShadow: showInfoPopup ? '0 0 15px rgba(255,255,255,0.3)' : 'none'
                  }}
                >
                  <span className="text-white font-bold text-xl italic">i</span>
                </div>
                
                {/* 信息弹窗 */}
                {showInfoPopup && (
                  <div 
                    className="absolute top-12 left-0 w-80 bg-gray-900/95 border-2 border-gray-500 rounded-lg p-4 shadow-2xl"
                    style={{
                      backdropFilter: 'blur(10px)'
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
                <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">{t('game.title')}</h1>
                <p className="text-gray-300 mb-4 drop-shadow-md text-center">{t('menu.controls')}</p>
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
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* 标题 */}
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">{t('specialBuffPreviewTitle')}</h2>

                  {/* 通用 Buff 区域 */}
                  <h3 className="text-lg font-bold text-yellow-300 mb-4 border-b border-gray-600 pb-2">{t('generalBuffLabel')}</h3>
                  <div className="flex flex-wrap gap-4 justify-center mb-6">
                    {[
                      { icon: '/assets/fire_buff.png', name: t('buffIgniteName'), desc: t('buffIgniteDesc') },
                      { icon: '/assets/poison.png', name: t('buffPoisonName'), desc: t('buffPoisonDesc') },
                      { icon: '/assets/aura.png', name: t('buffAuraName'), desc: t('buffAuraDesc') },
                      { icon: '/assets/execution.png', name: t('buffExecutionName'), desc: t('buffExecutionDesc') },
                      { icon: '/assets/critical_rage.png', name: t('buffRageName'), desc: t('buffRageDesc') },
                      { icon: '/assets/vampire.png', name: t('buffVampireName'), desc: t('buffVampireDesc') },
                      { icon: '/assets/ammo_supply.png', name: t('buffAmmoSupplyName'), desc: t('buffAmmoSupplyDesc') },
                      { icon: '/assets/desperate_fight.png', name: t('buffDesperateFightName'), desc: t('buffDesperateFightDesc') },
                    ].map((buff, index) => (
                      <div
                        key={buff.name}
                        className="flex flex-col items-center"
                        style={{
                          backgroundImage: 'url(/assets/win_1.png)',
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
                            objectFit: 'contain'
                          }}
                        />
                        <div className="text-center w-full" style={{ width: '85%', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          <div className="font-bold text-white text-base">{buff.name}</div>
                          <div className="text-xs text-gray-300 mt-1 leading-tight">{buff.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 武器专属 Buff 区域 */}
                  <h3 className="text-lg font-bold text-orange-300 mb-4 border-b border-gray-600 pb-2">{t('weaponBuffLabel')}</h3>
                  
                  {/* 手枪 */}
                  <h4 className="text-sm font-bold text-gray-400 mb-3 ml-2">🔫 {t('pistolName')}</h4>
                  <div className="flex flex-wrap gap-4 justify-center mb-4">
                    <div
                      className="flex flex-col items-center"
                      style={{
                        backgroundImage: 'url(/assets/win_1.png)',
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
                        style={{ width: '72px', height: '72px', imageRendering: 'pixelated', objectFit: 'contain' }}
                      />
                      <div className="text-center w-full" style={{ width: '85%', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        <div className="font-bold text-white text-base">{t('buffLastBulletName')}</div>
                        <div className="text-xs text-gray-300 mt-1 leading-tight">{t('buffLastBulletDesc')}</div>
                      </div>
                    </div>
                  </div>

                  {/* 火箭筒 */}
                  <h4 className="text-sm font-bold text-gray-400 mb-3 ml-2">🚀 {t('rocketName')}</h4>
                  <div className="flex flex-wrap gap-4 justify-center mb-4">
                    {[
                      { icon: '/assets/RPG_show.png', name: '冲击波', desc: '爆炸伤害后，未死亡敌人从爆炸中心向反方向击退30px，并在1.5秒内减速70%。' },
                      { icon: '/assets/RPG_show.png', name: '穿甲弹', desc: '爆炸伤害+200%，但爆炸范围-80%。' },
                      { icon: '/assets/RPG_show.png', name: '两联装', desc: '弹夹变为2发，0.7秒内连续发射两发。每发伤害60%、范围70%、美术资源60%。' },
                    ].map((buff, index) => (
                      <div
                        key={buff.name}
                        className="flex flex-col items-center"
                        style={{
                          backgroundImage: 'url(/assets/win_1.png)',
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
                          style={{ width: '72px', height: '72px', imageRendering: 'pixelated', objectFit: 'contain' }}
                        />
                        <div className="text-center w-full" style={{ width: '85%', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          <div className="font-bold text-white text-base">{buff.name}</div>
                          <div className="text-xs text-gray-300 mt-1 leading-tight">{buff.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* 武器选择界面 */}
          {gameState === 'weaponSelect' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{
              backgroundImage: 'url(/assets/bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}>
              <div className="absolute inset-0 bg-black/60"></div>
              <div className="relative z-10 text-center">
                <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{t('weaponSelectTitle')}</h2>
                <p className="text-gray-300 mb-8 drop-shadow-md">{t('weaponSelectHint')}</p>
                
                <div className="flex gap-4 justify-center flex-wrap max-w-4xl">
                  {(Object.keys(WEAPONS) as WeaponType[])
                    .filter(w => WEAPONS[w].isStarter)
                    .map(w => {
                      const meta = STARTER_WEAPON_META[w];
                      const cfg = WEAPONS[w];
                      return (
                        <div key={w}
                          className={`bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-lg p-4 cursor-pointer hover:from-gray-700/90 hover:to-gray-800/90 transition-all duration-200 border-2 ${meta.border} w-44`}
                          onClick={() => startGameWithWeapon(w)}
                        >
                          <div className="flex flex-col items-center">
                            <img src={cfg.showIcon} alt={cfg.name} className="w-24 h-24 object-contain mb-2" />
                            <h3 className={`text-lg font-bold ${meta.title} mb-1`}>{cfg.name}</h3>
                            <p className="text-xs text-gray-300 mb-2">{cfg.description}</p>
                            <div className="text-xs text-left w-full space-y-1">
                              {meta.stats.map((s, i) => (
                                <p key={i} className={s.includes('%/') || s.includes('移动') || s.includes('穿透') || s.includes('暴击') ? 'text-green-400' : 'text-gray-400'}>
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
          {gameState === 'upgrade' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              {/* 注入弹跳动画样式 */}
              <style>{bounceInAnimation}</style>
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-2">{t('levelComplete')}</h2>
                <p className="text-gray-300 mb-6">{t('chooseUpgrade')}</p>
                <div className="flex gap-4 justify-center">
                  {availableUpgrades.map((upgrade, index) => {
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
                    disabled={upgradeRefreshCount >= 1}
                    width={220}
                    height={82.5}
                  >
                    <span className="text-gray-700 font-bold text-xl flex items-center justify-center gap-2">
                      {t('refresh')}: {1 - upgradeRefreshCount}
                    </span>
                  </PixelButton>
                </div>
              </div>
            </div>
          )}
          
          {/* 商店界面 */}
          {gameState === 'shop' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/64 rounded-lg">
              {/* 注入弹跳动画样式 */}
              <style>{bounceInAnimation}</style>
              <div className="text-center p-8 max-w-4xl">
                <h2 className="text-4xl font-bold text-white mb-2">{t('shopTitle')}</h2>
                <p className="text-gray-300 mb-4 flex items-center justify-center gap-2">
                  <CoinIcon size={24} />
                  {t('gold')}: <span className="text-yellow-400 font-bold">{player.gold}</span>
                </p>
                
                <div className="flex gap-4 justify-center mb-8">
                  {shopItems.map((item, index) => {
                    // 检查该商品类型是否被锁定
                    const isItemLocked = lockedItems.some(locked => locked.type === item.type);
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
                        canAfford={player.gold >= item.price}
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
                      {lockedItems.length > 0 ? (
                        <>
                          <img src="/assets/suo.png" alt="解锁" className="w-6 h-6" />
                          解锁
                        </>
                      ) : (
                        <>
                          <img src="/assets/suo.png" alt="锁定" className="w-6 h-6" />
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
                    disabled={player.gold < shopRefreshPrice} // 仅金币不足时禁用
                  >
                    <span className="text-gray-700 font-bold text-xl flex items-center justify-center gap-2">
                      🔄 刷新 
                      {player.gold >= shopRefreshPrice ? (
                        <><CoinIcon size={20} /> {shopRefreshPrice}</>
                      ) : (
                        <span className="opacity-50"><CoinIcon size={20} /> {shopRefreshPrice}</span>
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
          {gameState === 'gameover' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center">
                <h2 className="text-5xl font-bold text-red-500 mb-4">{t('gameOver')}</h2>
                <p className="text-gray-300 mb-2">{t('finalLevel')}: {level}</p>
                <p className="text-gray-300 mb-8">{t('finalScore')}: {score}</p>
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
          {gameState === 'playing' && bossAlive && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 rounded-lg p-4 min-w-[300px] border-2 border-red-600">
              <div className="text-center">
                <div className="text-red-500 font-bold text-lg mb-2 flex items-center justify-center gap-2">
                  👹 史莱姆王
                  <span className="text-sm text-gray-300">Lv.{level}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-300 ease-out"
                    style={{ width: `${(bossCurrentHp / bossMaxHp) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                    {Math.round(bossCurrentHp)} / {bossMaxHp}
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
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* 标题 */}
                <h2 className="text-2xl font-bold text-white mb-6 text-center">{t('settings')}</h2>

                {/* 音量调节 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-gray-300 text-base font-medium flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
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
                      onClick={() => { setLanguage('zh'); playSound('button_click'); }}
                      className={`px-4 py-1.5 text-sm font-bold transition-all ${language === 'zh' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >中文</button>
                    <button
                      onClick={() => { setLanguage('en'); playSound('button_click'); }}
                      className={`px-4 py-1.5 text-sm font-bold transition-all ${language === 'en' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >English</button>
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        {t('clickUnmute')}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
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
        {gameState === 'playing' && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            WASD / 方向键 移动 | 鼠标瞄准 | 左键射击 | 躲避红色怪物！
          </div>
        )}
      </Card>
    </div>
  );
}
