import { deriveCombatStats } from '@/game/rules/combatStats';

import { isDesperateFightActive, WEAPONS, MONSTER_CONFIGS } from '@/game';

import type { UpdateWorldContext } from './context';
import { waveSystem } from './waveSystem';
import { movementSystem } from './movementSystem';
import { weaponSystem } from './weaponSystem';
import { projectileSystem } from './projectileSystem';
import { monsterSystem } from './monsterSystem';
import { enemyAttackSystem } from './enemyAttackSystem';
import { zoneSystem } from './zoneSystem';
import { pickupSystem } from './pickupSystem';
import { effectSystem } from './effectSystem';

/** Fixed order preserves the legacy combat rules; drawing never advances a system. */
export function updateWorld(context: UpdateWorldContext) {
  const {
    canvasRef,
    world,
    runtime,
    setMonstersRemaining,
    setPlayer,
    muzzleFlashesRef,
    recoilRef,
    setBossAlive,
    setBossCurrentHp,
    screenShakeRef,
    checkLevelCompletion,
    setBossMaxHp,
  } = context;
  recoilRef.current = {
    backward: recoilRef.current.backward * 0.85,
    upward: recoilRef.current.upward * 0.85,
    shake: recoilRef.current.shake * 0.85,
  };
  muzzleFlashesRef.current = muzzleFlashesRef.current.filter(
    (flash) => runtime.now() - flash.startTime < flash.duration
  );
  screenShakeRef.current *= 0.86;
  if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const now = runtime.now();
  if (world.player.isSwitchingWeapon && now - world.player.weaponSwitchStartTime >= 1000) {
    setPlayer((prev) => ({ ...prev, isSwitchingWeapon: false, weaponSwitchStartTime: 0 }));
  }
  const weaponConfig = WEAPONS[world.player.weapon];
  const desperateActive = isDesperateFightActive(world.player);
  const effectiveReloadBonus = world.player.reloadSpeedBonus + (desperateActive ? 30 : 0);
  const effectiveReloadTime = deriveCombatStats(world.player, now).reloadTime;

  const tick = {
    canvas,
    now,
    weaponConfig,
    desperateActive,
    effectiveReloadBonus,
    effectiveReloadTime,
  };
  const systems = [
    waveSystem,
    movementSystem,
    weaponSystem,
    projectileSystem,
    monsterSystem,
    enemyAttackSystem,
    zoneSystem,
    pickupSystem,
    effectSystem,
  ];
  for (const system of systems) {
    system(context, tick);
    if (world.gameState !== 'playing') break;
  }
  setMonstersRemaining(
    world.monsters.filter((m) => !m.isDying).length +
      world.pendingMonsterBatches.reduce((n, batch) => n + batch.length, 0)
  );
  const boss = [...world.monsters, ...world.pendingMonsterBatches.flat()].find(
    (m) => MONSTER_CONFIGS[m.monsterType].isBoss && !m.isDying
  );
  setBossAlive(!!boss);
  if (boss) {
    setBossCurrentHp(boss.hp);
    setBossMaxHp(boss.maxHp);
  }
  checkLevelCompletion();
}
