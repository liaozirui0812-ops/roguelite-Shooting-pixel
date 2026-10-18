import type { GameRuntime } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import { getWeaponMagazine, applyWeaponStatsToPlayer } from '@/game';

type Runtime = GameRuntime<GameWorld>;

/**
 * 切换武器（支持向前或向后切换）。
 * 由 B1.4 从 page.tsx 机械抽取，纯状态迁移：只写 player，不读快照。
 */
export function switchWeapon(runtime: Runtime, direction: 'next' | 'prev' = 'next') {
  runtime.set('player', (prev) => {
    if (prev.weapons.length <= 1) return prev; // 只有一个武器时不切换
    if (prev.isSwitchingWeapon) return prev; // 正在切换武器时不切换

    // 保存当前武器的弹药状态
    const newWeaponAmmo = { ...prev.weaponAmmo, [prev.weapon]: prev.currentAmmo };

    // 计算下一个武器索引
    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = (prev.currentWeaponIndex + 1) % prev.weapons.length;
    } else {
      nextIndex = (prev.currentWeaponIndex - 1 + prev.weapons.length) % prev.weapons.length;
    }
    const nextWeapon = prev.weapons[nextIndex];

    // 获取该武器的弹药（如果没有记录则满弹匣，弹匣容量包含该武器的随机弹容量加成）
    const magCapacity = getWeaponMagazine(prev, nextWeapon);
    const savedAmmo = newWeaponAmmo[nextWeapon] ?? magCapacity;

    return {
      ...applyWeaponStatsToPlayer(prev, nextWeapon),
      weapon: nextWeapon,
      currentWeaponIndex: nextIndex,
      weaponAmmo: newWeaponAmmo,
      currentAmmo: savedAmmo,
      isReloading: false,
      reloadStartTime: 0,
      reloadInterrupted: false,
      // 设置武器切换状态
      isSwitchingWeapon: true,
      weaponSwitchStartTime: runtime.now(),
    };
  });
}

/** 切换到指定索引的武器（数字键快捷切换） */
export function switchWeaponTo(runtime: Runtime, index: number) {
  runtime.set('player', (prev) => {
    if (prev.weapons.length <= 1) return prev; // 只有一把武器时不切换
    if (prev.isSwitchingWeapon) return prev; // 切换动画中不响应
    if (index < 0 || index >= prev.weapons.length) return prev; // 索引越界
    if (index === prev.currentWeaponIndex) return prev; // 切到当前武器无效果

    // 保存当前武器的弹药状态
    const newWeaponAmmo = { ...prev.weaponAmmo, [prev.weapon]: prev.currentAmmo };
    const nextWeapon = prev.weapons[index];

    // 获取目标武器的弹药（无记录则满弹匣，弹匣容量包含该武器随机弹容量加成）
    const magCapacity = getWeaponMagazine(prev, nextWeapon);
    const savedAmmo = newWeaponAmmo[nextWeapon] ?? magCapacity;

    return {
      ...applyWeaponStatsToPlayer(prev, nextWeapon),
      weapon: nextWeapon,
      currentWeaponIndex: index,
      weaponAmmo: newWeaponAmmo,
      currentAmmo: savedAmmo,
      isReloading: false,
      reloadStartTime: 0,
      reloadInterrupted: false,
      isSwitchingWeapon: true,
      weaponSwitchStartTime: runtime.now(),
    };
  });
}
