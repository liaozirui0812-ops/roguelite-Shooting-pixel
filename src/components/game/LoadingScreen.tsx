'use client';

import { Button } from '@/components/ui/button';

// 加载界面
// 由 B1.2 从 page.tsx 机械抽取。
interface LoadingScreenProps {
  t: (key: string) => string;
  loadProgress: number;
  resourceErrors: string[];
  retryLoad: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  t,
  loadProgress,
  resourceErrors,
  retryLoad,
}) => {
  return (
    <>
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
            <Button className="mt-2" onClick={retryLoad}>
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
    </>
  );
};
