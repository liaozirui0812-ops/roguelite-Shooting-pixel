'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

import { SpecialRewardType, isSpecialReward, getSpecialRewardDescription } from '@/game';

import { loadImageAsset } from '@/game/assets/loader';

// 金币图标组件
interface CoinIconProps {
  size?: number;
  className?: string;
}

export const CoinIcon: React.FC<CoinIconProps> = ({ size = 24, className = '' }) => {
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
  upgradeType?: string; // 升级类型（用于判断是否为特殊奖励）
  animationDelay?: number; // 动画延迟（毫秒）
}

// 弹跳动画关键帧（内联样式）
export const bounceInAnimation = `
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

export const UpgradeCard: React.FC<UpgradeCardProps> = ({
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
        backgroundImage: `url(/assets/ui/upgrade-panel.svg)`,
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
            width: '96px', // 放大20%：80px * 1.2
            height: '96px', // 放大20%：80px * 1.2
            imageRendering: 'pixelated',
            objectFit: 'contain',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: '80px',
            lineHeight: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
        <SpecialRewardTooltip type={upgradeType as SpecialRewardType} visible={isHovering} />
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
  isLocked?: boolean; // 是否被锁定
  itemType?: string; // 商品类型（用于判断是否为特殊奖励）
  onClick: () => void;
  animationDelay?: number; // 动画延迟（毫秒）
}

export const ShopItemCard: React.FC<ShopItemCardProps> = ({
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
        width: '288px', // 240 * 1.2 = 288，放大20%
        height: '360px', // 300 * 1.2 = 360，放大20%
        padding: '20px 25px', // 减少padding，使内容更紧凑
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
          <img src="/assets/ui/lock.svg" alt="已锁定" style={{ width: '40px', height: '40px' }} />
        </div>
      )}
      {/* 图标区域 - 占据中间80%的上部 */}
      <div style={{ height: '40px' }}></div>
      {/* 判断 icon 是否为图片路径 */}
      {icon.startsWith('/') ? (
        <img
          src={icon}
          alt={name}
          style={{ width: '130px', height: '130px', objectFit: 'contain', marginTop: '60px' }} // 放大20%：108px * 1.2
        />
      ) : (
        <span className="text-5xl">{icon}</span> // 增大字体
      )}
      <div className="text-center w-full mt-3" style={{ marginTop: '6px' }}>
        <div className="font-bold text-white text-lg">{name}</div>
        <div className="text-sm text-white mt-1" style={{ marginTop: '2px' }}>
          {description}
        </div>
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
        <SpecialRewardTooltip type={itemType as SpecialRewardType} visible={isHovering} />
      )}
    </div>
  );
};

// 特殊奖励悬停提示组件
interface SpecialRewardTooltipProps {
  type: SpecialRewardType;
  visible: boolean;
}

export const SpecialRewardTooltip: React.FC<SpecialRewardTooltipProps> = ({ type, visible }) => {
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
      <div className="text-gray-200 text-sm leading-relaxed mb-2">{info.description}</div>

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

export const PixelButton: React.FC<PixelButtonProps> = ({
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
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const imageLoaded = loadedSource === imageUrl;
  const [isHovering, setIsHovering] = useState(false);
  const [canClick, setCanClick] = useState(false);

  // 加载图片并创建canvas用于透明度检测
  useEffect(() => {
    const controller = new AbortController();
    canvasRef.current = null;
    loadImageAsset({ key: 'button', src: imageUrl }, controller.signal, 0).then((result) => {
      if (result.status !== 'loaded' || controller.signal.aborted) return;
      const img = result.image;
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvasRef.current = canvas;
        setLoadedSource(imageUrl);
      }
    });
    return () => controller.abort();
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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imageLoaded) return;

      const hit = checkHitTest(e.clientX, e.clientY);
      setCanClick(hit);
      setIsHovering(hit);

      // 更新鼠标样式
      if (buttonRef.current) {
        buttonRef.current.style.cursor = hit ? 'pointer' : 'default';
      }
    },
    [imageLoaded, checkHitTest]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setCanClick(false);
    if (buttonRef.current) {
      buttonRef.current.style.cursor = 'default';
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (canClick && !disabled) {
        onClick();
      }
    },
    [canClick, onClick, disabled]
  );

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
        opacity: disabled ? 0.5 : isHovering && !disabled ? 0.8 : 1,
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
