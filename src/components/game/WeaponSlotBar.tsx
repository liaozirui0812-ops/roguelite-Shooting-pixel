'use client';

import type { GameView } from '@/game/model/View';
import { WEAPONS, RARITY_META, getWeaponInstance, getWeaponAffixSummary } from '@/game';

// 武器切换UI - 左下角（数字键快捷切换）
// 由 B1.2 从 page.tsx 机械抽取。
interface WeaponSlotBarProps {
  view: GameView;
  t: (key: string) => string;
  switchWeaponTo: (index: number) => void;
}

export const WeaponSlotBar: React.FC<WeaponSlotBarProps> = ({ view, t, switchWeaponTo }) => {
  return (
    <>
      <div className="absolute bottom-4 left-4 flex flex-col gap-1">
        <div
          className="text-gray-400/90 text-[11px] font-semibold px-1 mb-0.5 tracking-wide select-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          {t('switch_weapon_hint').replace(
            '{keys}',
            view.player.weapons.map((_, i) => i + 1).join(' / ')
          )}
        </div>
        <div className="flex flex-col gap-1.5" style={{ backdropFilter: 'blur(6px)' }}>
          {view.player.weapons.map((wpn, idx) => {
            const isActive = idx === view.player.currentWeaponIndex;
            const inst = getWeaponInstance(view.player, wpn);
            const rmeta = RARITY_META[inst.rarity] || RARITY_META[1];
            const s = getWeaponAffixSummary(view.player, wpn);
            const affixText = inst.affixes.map((a) => a.valueLabel).join(' · ');
            return (
              <div
                key={wpn}
                onClick={() => switchWeaponTo(idx)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 min-w-[240px] cursor-pointer select-none transition-all duration-150
                  ${
                    isActive
                      ? 'bg-gray-800/95 border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
                      : 'bg-gray-900/75 border-2 border-gray-600 hover:border-gray-400 active:bg-gray-800/90'
                  }`}
                style={isActive ? { borderColor: '#22d3ee' } : undefined}
              >
                {/* 编号 */}
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black shrink-0
                  ${isActive ? 'bg-cyan-400 text-gray-900' : 'bg-gray-700 text-gray-200'}`}
                >
                  {idx + 1}
                </span>
                {/* 武器图标 */}
                <img
                  src={WEAPONS[wpn].showIcon}
                  alt={WEAPONS[wpn].name}
                  className={`w-7 h-7 object-contain shrink-0 transition-all duration-150 ${isActive ? 'brightness-110 scale-105' : 'opacity-80'}`}
                />
                {/* 名称 + 稀有度 + 属性 */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="text-sm font-bold truncate leading-tight"
                    style={{ color: rmeta.color, textShadow: `0 0 6px ${rmeta.color}55` }}
                  >
                    {WEAPONS[wpn].name}
                    <span className="ml-1.5 text-[10px] font-bold opacity-90">
                      {rmeta.name}
                    </span>
                  </span>
                  <span className="text-[10px] text-gray-300/90 truncate leading-tight">
                    {inst.affixes.length > 0 ? (
                      affixText
                    ) : (
                      <span className="text-gray-500">· 无随机属性 ·</span>
                    )}
                    <span className="ml-1 text-gray-400">价值{inst.value}</span>
                  </span>
                </div>
                {/* 当前标记 */}
                {isActive && (
                  <span className="ml-auto text-[10px] font-bold text-cyan-300 tracking-wide">
                    ●
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
