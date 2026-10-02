import type React from 'react';
import {
  Position,
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
  Obstacle,
} from '@/game';
import type { GameRuntime, ValueUpdate } from '@/game/runtime/GameRuntime';
import type { GameWorld } from '@/game/model/World';
import type { SoundType } from '@/hooks/useSound';
export interface UpdateWorldContext {
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
  checkRectCollision: (pos: Position, size: number, obstacle: Obstacle) => boolean;
  setKeys: (update: ValueUpdate<Set<string>>) => void;
  setBullets: (update: ValueUpdate<Bullet[]>) => void;
  playSound: (soundType: SoundType) => void;
  muzzleFlashesRef: React.RefObject<MuzzleFlash[]>;
  recoilRef: React.RefObject<{ backward: number; upward: number; shake: number }>;
  setSmokeEffects: (update: ValueUpdate<SmokeEffect[]>) => void;
  triggerExplosion: (
    x: number,
    y: number,
    radius: number,
    damage: number,
    hasShockwave?: boolean,
    hasAPShot?: boolean
  ) => void;
  checkCollision: (pos1: Position, pos2: Position, size1: number, size2: number) => boolean;
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
  screenShakeRef: React.RefObject<number>;
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
