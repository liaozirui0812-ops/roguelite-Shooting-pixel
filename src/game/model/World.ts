import type {
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
  SmokeEffect,
  PierceEffect,
  Bullet,
  Obstacle,
  Upgrade,
  ShopItem,
} from './types';
import { createPlayer } from '../runtime/createPlayer';

export interface GameWorld {
  gameState: 'menu' | 'weaponSelect' | 'playing' | 'upgrade' | 'shop' | 'gameover';
  shopItems: ShopItem[];
  lockedItems: ShopItem[];
  shopRefreshCount: number;
  shopRefreshPrice: number;
  upgradeRefreshCount: number;
  player: Player;
  monsters: Monster[];
  poisonCircles: PoisonCircle[];
  bullets: Bullet[];
  enemyBullets: EnemyBullet[];
  coins: Coin[];
  obstacles: Obstacle[];
  damageNumbers: DamageNumber[];
  goldFloatingTexts: GoldFloatingText[];
  explosionEffects: ExplosionEffect[];
  smokeEffects: SmokeEffect[];
  vampireHealEffects: VampireHealEffect[];
  affixExplosionParticles: AffixExplosionParticle[];
  pierceEffects: PierceEffect[];
  playerHitParticles: PlayerHitParticle[];
  bossBarrages: BossBarrage[];
  accumulatedDamage: Map<
    string,
    {
      damage: number;
      isCrit: boolean;
      isDoubleCrit: boolean;
      lastTime: number;
      x: number;
      y: number;
    }
  >;
  level: number;
  monstersRemaining: number;
  levelCompletionTriggered: boolean;
  pendingMonsterBatches: Monster[][];
  currentBatchInitialCount: number;
  nextBatchTime: number | null;
  totalMonstersToSpawn: number;
  thisLevelWaveTotal: number;
  waveTransition: { startTime: number; waveNumber: number; enemyCount: number } | null;
  bossAlive: boolean;
  bossCurrentHp: number;
  bossMaxHp: number;
  score: number;
  availableUpgrades: Upgrade[];
  keys: Set<string>;
  mousePos: Position;
  isMouseDown: boolean;
  isPaused: boolean;
  dashCooldown: number;
  lastPoisonHealTime: number;
}

export function createWorld(): GameWorld {
  return {
    gameState: 'menu',
    shopItems: [],
    lockedItems: [],
    shopRefreshCount: 0,
    shopRefreshPrice: 0,
    upgradeRefreshCount: 0,
    player: createPlayer(),
    monsters: [],
    poisonCircles: [],
    bullets: [],
    enemyBullets: [],
    coins: [],
    obstacles: [],
    damageNumbers: [],
    goldFloatingTexts: [],
    explosionEffects: [],
    smokeEffects: [],
    vampireHealEffects: [],
    affixExplosionParticles: [],
    pierceEffects: [],
    playerHitParticles: [],
    bossBarrages: [],
    accumulatedDamage: new Map(),
    level: 1,
    monstersRemaining: 0,
    levelCompletionTriggered: false,
    pendingMonsterBatches: [],
    currentBatchInitialCount: 0,
    nextBatchTime: null,
    totalMonstersToSpawn: 0,
    thisLevelWaveTotal: 0,
    waveTransition: null,
    bossAlive: false,
    bossCurrentHp: 1200,
    bossMaxHp: 1200,
    score: 0,
    availableUpgrades: [],
    keys: new Set(),
    mousePos: { x: 0, y: 0 },
    isMouseDown: false,
    isPaused: false,
    dashCooldown: 0,
    lastPoisonHealTime: 0,
  };
}
