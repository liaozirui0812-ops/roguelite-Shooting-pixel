'use client';

import type { GameView } from '@/game/model/View';

// BOSS血条
// 由 B1.2 从 page.tsx 机械抽取；props 由 tsc 未定义标识符报告补齐。
interface BossHealthBarProps {
  view: GameView;
  t: (key: string) => string;
}

export const BossHealthBar: React.FC<BossHealthBarProps> = ({ view, t }) => {
  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 rounded-lg p-4 min-w-[300px] border-2 border-red-600">
        <div className="text-center">
          <div className="text-red-500 font-bold text-lg mb-2 flex items-center justify-center gap-2">
            👹 {view.bossName}
            <span className="text-sm text-gray-300">Lv.{view.level}</span>
          </div>
          {view.bossLegs.length > 0 && <div className="flex justify-center gap-1 mb-2" aria-label="机械腿耐久">
            {view.bossLegs.map(leg => <span key={leg.id} title={`${leg.id}: ${Math.ceil(leg.hp)} / ${leg.maxHp}`} className={`text-xs px-1 rounded ${leg.hp <= 0 ? 'bg-gray-800 text-gray-500 line-through' : leg.hp <= leg.maxHp / 2 ? 'bg-amber-900 text-amber-200' : 'bg-teal-900 text-teal-200'}`}>{leg.id}</span>)}
          </div>}
          <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-300 ease-out"
              style={{ width: `${(view.bossCurrentHp / view.bossMaxHp) * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
              {Math.round(view.bossCurrentHp)} / {view.bossMaxHp}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
