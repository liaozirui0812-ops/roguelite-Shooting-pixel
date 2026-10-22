import type React from 'react';
import {
  Player,
  Monster,
  PoisonCircle,
  Coin,
  EnemyBullet,
  DamageNumber,
  AffixExplosionParticle,
  PlayerHitParticle,
  BossBarrage,
  GoldFloatingText,
  VampireHealEffect,
  ExplosionEffect,
  MuzzleFlash,
  SmokeEffect,
  PierceEffect,
  Bullet,
} from '@/game';
import type { GameRuntime, ValueUpdate } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import type { SoundType } from '@/hooks/useSound';
import type { AimPresentation } from '@/game/rules/aim';
/**
 * 表现类可变 ref 的合集（枪火/后坐力/震屏）。
 * B2 收敛：三个独立 ref 字段合并为一个 viewFx 对象传入，
 * 模拟层只做读写衰减，不拥有这些 ref 的生命周期（页面持有）。
 */
export interface ViewFxRefs {
  muzzleFlashes: React.RefObject<MuzzleFlash[]>;
  recoil: React.RefObject<{ backward: number; upward: number; shake: number }>;
  screenShake: React.RefObject<number>;
}
export interface UpdateWorldContext {
  aimPresentationRef: React.RefObject<AimPresentation>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  world: GameWorld;
  runtime: GameRuntime<GameWorld>;
  setWaveTransition: (
    update: ValueUpdate<{ startTime: number; waveNumber: number; enemyCount: number } | null>
  ) => void;
  setMonsters: (update: ValueUpdate<Monster[]>) => void;
  setCurrentBatchInitialCount: (update: ValueUpdate<number>) => void;
  setMonstersRemaining: (value: ValueUpdate<number>) => void;
  setPendingMonsterBatches: (update: ValueUpdate<Monster[][]>) => void;
  setNextBatchTime: (update: ValueUpdate<number | null>) => void;
  dashPendingRef: React.RefObject<boolean>;
  dashRef: React.RefObject<{
    active: boolean;
    startTime: number;
    fromX: number;
    fromY: number;
    dirX: number;
    dirY: number;
    recoveryStart: number;
  }>;
  setDashCooldown: (update: ValueUpdate<number>) => void;
  DASH_COOLDOWN_MS: number;
  dashCooldownStartRef: React.RefObject<number>;
  setPlayer: (update: ValueUpdate<Player>) => void;
  NORMAL_MOVE_PPM: number;
  setKeys: (update: ValueUpdate<Set<string>>) => void;
  setBullets: (update: ValueUpdate<Bullet[]>) => void;
  playSound: (soundType: SoundType) => void;
  viewFx: ViewFxRefs;
  setSmokeEffects: (update: ValueUpdate<SmokeEffect[]>) => void;
  triggerExplosion: (
    x: number,
    y: number,
    radius: number,
    damage: number,
    hasShockwave?: boolean,
    hasAPShot?: boolean
  ) => void;
  setDamageNumbers: (update: ValueUpdate<DamageNumber[]>) => void;
  setAccumulatedDamage: (
    update: ValueUpdate<
      Map<
        string,
        {
          damage: number;
          isCrit: boolean;
          isDoubleCrit: boolean;
          lastTime: number;
          x: number;
          y: number;
        }
      >
    >
  ) => void;
  setScore: (update: ValueUpdate<number>) => void;
  setBossAlive: (value: boolean) => void;
  setCoins: (update: ValueUpdate<Coin[]>) => void;
  triggerVampireHeal: (healAmount: number) => void;
  setBossCurrentHp: (value: number) => void;
  setPierceEffects: (update: ValueUpdate<PierceEffect[]>) => void;
  setGameState: (
    update: ValueUpdate<'menu' | 'weaponSelect' | 'playing' | 'upgrade' | 'shop' | 'gameover'>
  ) => void;
  triggerScreenShake: (intensity: number) => void;
  boomImage: HTMLImageElement | null;
  setExplosionEffects: (update: ValueUpdate<ExplosionEffect[]>) => void;
  setAffixExplosionParticles: (update: ValueUpdate<AffixExplosionParticle[]>) => void;
  setPoisonCircles: (update: ValueUpdate<PoisonCircle[]>) => void;
  setEnemyBullets: (update: ValueUpdate<EnemyBullet[]>) => void;
  stopBGM: () => void;
  setPlayerHitParticles: (update: ValueUpdate<PlayerHitParticle[]>) => void;
  setBossBarrages: (update: ValueUpdate<BossBarrage[]>) => void;
  setGoldFloatingTexts: (update: ValueUpdate<GoldFloatingText[]>) => void;
  setVampireHealEffects: (update: ValueUpdate<VampireHealEffect[]>) => void;
  checkLevelCompletion: () => void;
  setBossMaxHp: (value: number) => void;
}
export interface TickContext {
  canvas: HTMLCanvasElement;
  now: number;
  weaponConfig: import('@/game/model/types').WeaponConfig;
  desperateActive: boolean;
  effectiveReloadBonus: number;
  effectiveReloadTime: number;
}
