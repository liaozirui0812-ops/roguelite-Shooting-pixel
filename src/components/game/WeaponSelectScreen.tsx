'use client';

import type { GameView } from '@/game/model/View';
import { WEAPONS, STARTER_WEAPON_META, type WeaponType } from '@/game';

// 武器选择界面
// 由 B1.2 从 page.tsx 机械抽取。
interface WeaponSelectScreenProps {
  t: (key: string) => string;
  startGameWithWeapon: (weaponType: WeaponType) => void;
  setGameState: (state: GameView['gameState']) => void;
}

export const WeaponSelectScreen: React.FC<WeaponSelectScreenProps> = ({
  t,
  startGameWithWeapon,
  setGameState,
}) => {
  return (
    <>
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
    </>
  );
};
