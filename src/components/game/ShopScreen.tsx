'use client';

import type { GameView } from '@/game/model/View';
import type { ShopItem } from '@/game';
import { CoinIcon, ShopItemCard, PixelButton, bounceInAnimation } from './AssetWidgets';

// 商店界面
// 由 B1.2 从 page.tsx 机械抽取。
interface ShopScreenProps {
  view: GameView;
  t: (key: string) => string;
  buyShopItem: (item: ShopItem) => void;
  toggleLockItems: () => void;
  refreshShop: () => void;
  exitShop: () => void;
}

export const ShopScreen: React.FC<ShopScreenProps> = ({
  view,
  t,
  buyShopItem,
  toggleLockItems,
  refreshShop,
  exitShop,
}) => {
  return (
    <>
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
    </>
  );
};
