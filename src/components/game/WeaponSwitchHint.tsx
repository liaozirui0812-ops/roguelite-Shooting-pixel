'use client';

// 武器切换提示
// 由 B1.2 从 page.tsx 机械抽取（纯展示，无 props）。
export const WeaponSwitchHint: React.FC = () => {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end">
        {/* 切换进度条 */}
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-48">
          <div className="h-2 bg-gray-800/80 rounded-full overflow-hidden border border-cyan-500/50">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              style={{
                width: '100%',
                animation: 'weaponSwitchProgress 1s ease-out forwards',
              }}
            />
          </div>
          <div
            className="text-center text-white font-bold mt-2"
            style={{
              textShadow: '2px 2px 0 #000',
              fontFamily: '"Ark Pixel", Arial',
              animation: 'weaponSwitchPulse 0.4s ease-in-out infinite',
            }}
          >
            切换武器中...
          </div>
        </div>

        {/* 动画样式 */}
        <style jsx>{`
          @keyframes weaponSwitchProgress {
            from {
              width: 0%;
              background: linear-gradient(to right, transparent, #06b6d4);
            }
            to {
              width: 100%;
              background: linear-gradient(to right, #06b6d4, #3b82f6);
            }
          }
          @keyframes weaponSwitchPulse {
            0%,
            100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.05);
            }
          }
        `}</style>
      </div>
    </>
  );
};
