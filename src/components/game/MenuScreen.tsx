'use client';

import type { GameView } from '@/game/model/View';
import { PixelButton } from './AssetWidgets';

// 菜单界面
// 由 B1.2 从 page.tsx 机械抽取。
interface MenuScreenProps {
  t: (key: string) => string;
  highScore: number;
  showInfoPopup: boolean;
  setShowInfoPopup: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowBuffPreview: (show: boolean) => void;
  setGameState: (state: GameView['gameState']) => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({
  t,
  highScore,
  showInfoPopup,
  setShowInfoPopup,
  setShowSettings,
  setShowBuffPreview,
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
    </>
  );
};
