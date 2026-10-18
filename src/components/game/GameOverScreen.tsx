'use client';

import type { GameView } from '@/game/model/View';
import { PixelButton } from './AssetWidgets';

// 游戏结束界面
// 由 B1.2 从 page.tsx 机械抽取。
interface GameOverScreenProps {
  view: GameView;
  t: (key: string) => string;
  restartGame: () => void;
  setGameState: (state: GameView['gameState']) => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  view,
  t,
  restartGame,
  setGameState,
}) => {
  return (
    <>
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
    </>
  );
};
