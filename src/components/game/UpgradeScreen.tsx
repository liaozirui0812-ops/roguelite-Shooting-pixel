'use client';

import type { GameView } from '@/game/model/View';
import type { UpgradeType } from '@/game';
import { UpgradeCard, PixelButton, bounceInAnimation } from './AssetWidgets';

// 升级界面
// 由 B1.2 从 page.tsx 机械抽取。
interface UpgradeScreenProps {
  view: GameView;
  t: (key: string) => string;
  applyUpgrade: (upgradeId: UpgradeType) => void;
  refreshUpgrades: () => void;
}

export const UpgradeScreen: React.FC<UpgradeScreenProps> = ({
  view,
  t,
  applyUpgrade,
  refreshUpgrades,
}) => {
  return (
    <>
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
    </>
  );
};
