'use client';

import type { GameView } from '@/game/model/View';
import { bounceInAnimation } from './AssetWidgets';

// Buff 预览弹窗
// 由 B1.2 从 page.tsx 机械抽取。
interface BuffPreviewDialogProps {
  view: GameView;
  t: (key: string) => string;
  setShowBuffPreview: (show: boolean) => void;
}

export const BuffPreviewDialog: React.FC<BuffPreviewDialogProps> = ({
  view,
  t,
  setShowBuffPreview,
}) => {
  return (
    <>
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
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {t('specialBuffPreviewTitle')}
            </h2>

            {/* 通用 Buff 区域 */}
            <h3 className="text-lg font-bold text-yellow-300 mb-4 border-b border-gray-600 pb-2">
              {t('generalBuffLabel')}
            </h3>
            <div className="flex flex-wrap gap-4 justify-center mb-6">
              {[
                {
                  icon: '/assets/fire_buff.png',
                  name: t('buffIgniteName'),
                  desc: t('buffIgniteDesc'),
                },
                {
                  icon: '/assets/poison_buff.png',
                  name: t('buffPoisonName'),
                  desc: t('buffPoisonDesc'),
                },
                {
                  icon: '/assets/aura.png',
                  name: t('buffAuraName'),
                  desc: t('buffAuraDesc'),
                },
                {
                  icon: '/assets/execution.png',
                  name: t('buffExecutionName'),
                  desc: t('buffExecutionDesc'),
                },
                {
                  icon: '/assets/critical_rage.png',
                  name: t('buffRageName'),
                  desc: t('buffRageDesc'),
                },
                {
                  icon: '/assets/ui/vampire.svg',
                  name: t('buffVampireName'),
                  desc: t('buffVampireDesc'),
                },
                {
                  icon: '/assets/ammo_supply.png',
                  name: t('buffAmmoSupplyName'),
                  desc: t('buffAmmoSupplyDesc'),
                },
                {
                  icon: '/assets/desperate_fight.png',
                  name: t('buffDesperateFightName'),
                  desc: t('buffDesperateFightDesc'),
                },
              ].map((buff, index) => (
                <div
                  key={buff.name}
                  className="flex flex-col items-center"
                  style={{
                    backgroundImage: 'url(/assets/ui/upgrade-panel.svg)',
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
                      objectFit: 'contain',
                    }}
                  />
                  <div
                    className="text-center w-full"
                    style={{ width: '85%', wordBreak: 'break-word', whiteSpace: 'normal' }}
                  >
                    <div className="font-bold text-white text-base">{buff.name}</div>
                    <div className="text-xs text-gray-300 mt-1 leading-tight">
                      {buff.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 武器专属 Buff 区域 */}
            <h3 className="text-lg font-bold text-orange-300 mb-4 border-b border-gray-600 pb-2">
              {t('weaponBuffLabel')}
            </h3>

            {/* 手枪 */}
            <h4 className="text-sm font-bold text-gray-400 mb-3 ml-2">
              🔫 {t('pistolName')}
            </h4>
            <div className="flex flex-wrap gap-4 justify-center mb-4">
              <div
                className="flex flex-col items-center"
                style={{
                  backgroundImage: 'url(/assets/ui/upgrade-panel.svg)',
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
                  style={{
                    width: '72px',
                    height: '72px',
                    imageRendering: 'pixelated',
                    objectFit: 'contain',
                  }}
                />
                <div
                  className="text-center w-full"
                  style={{ width: '85%', wordBreak: 'break-word', whiteSpace: 'normal' }}
                >
                  <div className="font-bold text-white text-base">
                    {t('buffLastBulletName')}
                  </div>
                  <div className="text-xs text-gray-300 mt-1 leading-tight">
                    {t('buffLastBulletDesc')}
                  </div>
                </div>
              </div>
            </div>

            {/* 火箭筒 */}
            <h4 className="text-sm font-bold text-gray-400 mb-3 ml-2">
              🚀 {t('rocketName')}
            </h4>
            <div className="flex flex-wrap gap-4 justify-center mb-4">
              {[
                {
                  icon: '/assets/RPG_show.png',
                  name: '冲击波',
                  desc: '爆炸伤害后，未死亡敌人从爆炸中心向反方向击退30px，并在1.5秒内减速70%。',
                },
                {
                  icon: '/assets/RPG_show.png',
                  name: '穿甲弹',
                  desc: '爆炸伤害+200%，但爆炸范围-80%。',
                },
                {
                  icon: '/assets/RPG_show.png',
                  name: '两联装',
                  desc: '弹夹变为2发，0.7秒内连续发射两发。每发伤害60%、范围70%、美术资源60%。',
                },
              ].map((buff, index) => (
                <div
                  key={buff.name}
                  className="flex flex-col items-center"
                  style={{
                    backgroundImage: 'url(/assets/ui/upgrade-panel.svg)',
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
                    style={{
                      width: '72px',
                      height: '72px',
                      imageRendering: 'pixelated',
                      objectFit: 'contain',
                    }}
                  />
                  <div
                    className="text-center w-full"
                    style={{ width: '85%', wordBreak: 'break-word', whiteSpace: 'normal' }}
                  >
                    <div className="font-bold text-white text-base">{buff.name}</div>
                    <div className="text-xs text-gray-300 mt-1 leading-tight">
                      {buff.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    </>
  );
};
