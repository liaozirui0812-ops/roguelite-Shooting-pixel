'use client';

import type { GameView } from '@/game/model/View';
import { getWeaponMagazine } from '@/game';

// 生命值条 - 显示在 Canvas 区域下方中间
// 由 B1.2 从 page.tsx 机械抽取；props 由 tsc 未定义标识符报告补齐。
interface HealthBarHudProps {
  view: GameView;
  t: (key: string) => string;
}

export const HealthBarHud: React.FC<HealthBarHudProps> = ({ view, t }) => {
  return (
    <>
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
    </>
  );
};
