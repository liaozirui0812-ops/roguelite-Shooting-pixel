import type { Monster, MonsterType } from '@/game/model/types';
import { MONSTER_CONFIGS } from '@/game/config/monsters';

export interface MonsterSpawn {
  id: string;
  monsterType: MonsterType;
  x: number;
  y: number;
  hpMultiplier?: number;
  baseSpeed?: number;
  speed?: number;
  now: number;
}

export function createMonster(spawn: MonsterSpawn): Monster {
  const { id, monsterType, x, y, now, hpMultiplier = 1 } = spawn;
  const config = MONSTER_CONFIGS[monsterType];
  const baseSpeed = spawn.baseSpeed ?? config.baseSpeed;
  const speed = spawn.speed ?? baseSpeed;
  return {
    id: id,
    x,
    y,
    hp: config.hp * hpMultiplier,
    maxHp: config.hp * hpMultiplier,
    speed: speed,
    baseSpeed: baseSpeed,
    damage: config.damage,
    isHit: false,
    hitTime: 0,
    isDying: false,
    deathTime: 0,
    monsterType: monsterType,
    lastShot: 0,
    lastAttackTime: 0,
    isBoss: config.isBoss || false,
    lastBossAttackTime: 0,
    lastRangedAttackTime: 0, // BOSS远程攻击时间
    vx: 0, // 初始速度向量
    vy: 0, // 初始速度向量
    // 敌人4动画状态
    isShooting: monsterType === 4 ? false : undefined,
    shootAnimationStartTime: monsterType === 4 ? 0 : undefined,
    // BOSS落地攻击初始状态
    jumpAttackState: config.isBoss ? 'idle' : undefined,
    jumpAttackStartTime: config.isBoss ? now : undefined,
  };
}
