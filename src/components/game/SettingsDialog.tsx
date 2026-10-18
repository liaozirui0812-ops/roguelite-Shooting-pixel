'use client';

import type { LightingConfig, LightingQuality } from '@/game/config/lighting';
import type { Language } from '@/i18n';
import type { SoundType } from '@/hooks/useSound';

// 设置弹窗
// 由 B1.2 从 page.tsx 机械抽取。
interface SettingsDialogProps {
  t: (key: string) => string;
  setShowSettings: (show: boolean) => void;
  volume: number;
  setVolume: (value: number) => void;
  playSound: (soundType: SoundType) => void;
  lightingConfig: LightingConfig;
  setLightingConfig: React.Dispatch<React.SetStateAction<LightingConfig>>;
  language: Language;
  switchLanguage: (lang: Language) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  t,
  setShowSettings,
  volume,
  setVolume,
  playSound,
  lightingConfig,
  setLightingConfig,
  language,
  switchLanguage,
  isMuted,
  toggleMute,
}) => {
  return (
    <>
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
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* 标题 */}
          <h2 className="text-2xl font-bold text-white mb-6 text-center">{t('settings')}</h2>

          {/* 音量调节 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-gray-300 text-base font-medium flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
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

          {/* 光影设置 */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <label htmlFor="lighting-quality" className="text-gray-400 text-sm font-medium">{t('lighting')}</label>
            <select id="lighting-quality" className="bg-gray-800 text-gray-100 border border-gray-600 rounded px-3 py-2"
              value={lightingConfig.enabled ? lightingConfig.quality : 'off'}
              onChange={(event) => {
                const quality = event.target.value;
                setLightingConfig(previous => ({ ...previous, enabled: quality !== 'off',
                  quality: quality === 'off' ? previous.quality : quality as LightingQuality }));
              }}>
              <option value="off">{t('lightingOff')}</option>
              <option value="basic">{t('lightingBasic')}</option>
              <option value="standard">{t('lightingStandard')}</option>
              <option value="high">{t('lightingHigh')}</option>
            </select>
          </div>
          <label className="mb-6 flex items-center gap-3 text-sm text-gray-300">
            <input type="checkbox" checked={lightingConfig.lightLevels === 4}
              onChange={(event) => setLightingConfig(previous => ({ ...previous,
                lightLevels: event.target.checked ? 4 : 0 }))} />
            {t('lightingSteps')}
          </label>
          {/* 语言切换 */}
          <div className="flex justify-center items-center gap-3 mb-6">
            <span className="text-gray-400 text-sm font-medium">{t('language')}</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-600">
              <button
                onClick={() => {
                  switchLanguage('zh');
                  playSound('button_click');
                }}
                className={`px-4 py-1.5 text-sm font-bold transition-all ${language === 'zh' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                中文
              </button>
              <button
                onClick={() => {
                  switchLanguage('en');
                  playSound('button_click');
                }}
                className={`px-4 py-1.5 text-sm font-bold transition-all ${language === 'en' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                English
              </button>
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
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </svg>
                  {t('clickUnmute')}
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                  {t('clickMute')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
