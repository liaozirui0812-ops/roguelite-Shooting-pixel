import {
  AFFIX_SPAWN_CONFIG,
  AFFIX_CONFIGS,
  SHIELD_CONFIG,
  BERSERK_CONFIG,
  SELF_DESTRUCT_CONFIG,
} from '@/game/config/monsters';
import type { AffixType, AffixConfig, Monster } from '@/game/model/types';

// 计算当前关卡的词缀出现概率
export const getAffixSpawnChance = (level: number): number => {
  if (level < AFFIX_SPAWN_CONFIG.MIN_LEVEL) return 0;
  const chance =
    AFFIX_SPAWN_CONFIG.BASE_CHANCE +
    (level - AFFIX_SPAWN_CONFIG.MIN_LEVEL) * AFFIX_SPAWN_CONFIG.CHANCE_PER_LEVEL;
  return Math.min(chance, AFFIX_SPAWN_CONFIG.MAX_CHANCE);
};

// 按权重随机抽取一个词缀类型
export const rollAffixType = (random: () => number = Math.random): AffixType | null => {
  const entries = Object.entries(AFFIX_CONFIGS) as [AffixType, AffixConfig][];
  const totalWeight = entries.reduce((sum, [, cfg]) => sum + cfg.weight, 0);
  if (totalWeight <= 0) return null;
  let rand = random() * totalWeight;
  for (const [type, cfg] of entries) {
    rand -= cfg.weight;
    if (rand <= 0) return type;
  }
  return entries[0][0];
};

// ============================================================
// Affix 基类（纯静态方法 + 面向数据编程，避免 React state 中存 class 实例）
// 所有词缀状态存储在 monster.affixState 中，保证可序列化
// ============================================================
export const AffixSystem = {
  // 生成时为怪物初始化词缀状态
  init(monster: Monster, type: AffixType): Monster {
    const cfg = AFFIX_CONFIGS[type];
    const newMonster = { ...monster, affix: { type, name: cfg.name } };
    switch (type) {
      case 'berserk':
        newMonster.affixState = { activated: false };
        break;
      case 'shield':
        newMonster.affixState = { charges: SHIELD_CONFIG.MAX_CHARGES };
        break;
      case 'self_destruct':
        newMonster.affixState = {
          phase: 'idle' as 'idle' | 'charging' | 'exploded',
          chargeStartTime: 0,
          explodeX: 0,
          explodeY: 0,
        };
        break;
    }
    return newMonster;
  },

  // 伤害事件：返回 { monster, actualDamage, blocked }
  // blocked = true 表示该次伤害被完全吸收（实际 hp 不变）
  onDamage(
    monster: Monster,
    rawDamage: number
  ): { monster: Monster; actualDamage: number; blocked: boolean } {
    if (!monster.affix || !monster.affixState) {
      return { monster, actualDamage: rawDamage, blocked: false };
    }
    switch (monster.affix.type) {
      case 'shield': {
        const charges = (monster.affixState.charges as number) ?? 0;
        if (charges > 0) {
          // 抵挡一次伤害
          const newState = { ...monster.affixState, charges: charges - 1 };
          return {
            monster: { ...monster, affixState: newState },
            actualDamage: 0,
            blocked: true,
          };
        }
        return { monster, actualDamage: rawDamage, blocked: false };
      }
      default:
        return { monster, actualDamage: rawDamage, blocked: false };
    }
  },

  // 每帧更新（在怪物移动之前调用）
  // 返回 { monster, speedMultiplier, damageMultiplier, attackSpeedMultiplier, stopMovement, triggerExplosion }
  update(
    monster: Monster,
    now: number,
    playerX: number,
    playerY: number
  ): {
    monster: Monster;
    speedMultiplier: number; // 移速倍率
    damageMultiplier: number; // 伤害倍率
    attackSpeedMultiplier: number; // 攻击间隔倍率（<1 表示更快）
    stopMovement: boolean; // 是否停止移动
    shouldExplode: boolean; // 本帧是否触发自爆
    explodeDamage: number; // 自爆伤害
    explodeRadius: number; // 自爆范围
  } {
    const result = {
      monster,
      speedMultiplier: 1,
      damageMultiplier: 1,
      attackSpeedMultiplier: 1,
      stopMovement: false,
      shouldExplode: false,
      explodeDamage: 0,
      explodeRadius: 0,
    };
    if (!monster.affix || !monster.affixState) return result;

    switch (monster.affix.type) {
      case 'berserk': {
        const hpPercent = monster.hp / monster.maxHp;
        const shouldActivate = hpPercent <= BERSERK_CONFIG.HP_THRESHOLD;
        const wasActivated = !!monster.affixState.activated;
        if (shouldActivate !== wasActivated) {
          result.monster = {
            ...monster,
            affixState: { ...monster.affixState, activated: shouldActivate },
          };
        }
        if (shouldActivate) {
          result.speedMultiplier = 1 + BERSERK_CONFIG.SPEED_BONUS;
          result.damageMultiplier = 1 + BERSERK_CONFIG.DAMAGE_BONUS;
          result.attackSpeedMultiplier = BERSERK_CONFIG.ATTACK_SPEED_BONUS;
        }
        break;
      }
      case 'self_destruct': {
        const state = monster.affixState;
        const phase = state.phase as string;
        const dx = playerX - monster.x;
        const dy = playerY - monster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (phase === 'idle' && dist <= SELF_DESTRUCT_CONFIG.TRIGGER_DISTANCE) {
          // 进入充能阶段
          result.monster = {
            ...monster,
            affixState: {
              ...state,
              phase: 'charging',
              chargeStartTime: now,
            },
          };
          result.stopMovement = true;
        } else if (phase === 'charging') {
          result.stopMovement = true;
          const elapsed = now - (state.chargeStartTime as number);
          if (elapsed >= SELF_DESTRUCT_CONFIG.FUSE_DURATION) {
            // 触发爆炸
            result.shouldExplode = true;
            result.explodeDamage = Math.floor(monster.maxHp * SELF_DESTRUCT_CONFIG.DAMAGE_RATIO);
            result.explodeRadius = SELF_DESTRUCT_CONFIG.EXPLOSION_RADIUS;
            result.monster = {
              ...monster,
              affixState: { ...state, phase: 'exploded' },
            };
          }
        }
        break;
      }
      default:
        break;
    }
    return result;
  },

  // 绘制词缀视觉效果（在怪物 sprite 绘制之后、血条之前调用）
  // ctx 为游戏渲染上下文，monsterSize 为怪物大小，isBoss 为是否 Boss
  render(
    ctx: CanvasRenderingContext2D,
    monster: Monster,
    monsterSize: number,
    isBoss: boolean,
    now: number
  ): void {
    if (!monster.affix || !monster.affixState || monster.isDying) return;

    switch (monster.affix.type) {
      case 'berserk': {
        const activated = !!monster.affixState.activated;
        if (activated) {
          // 激活态：紫色呼吸光效（alpha 脉冲）
          const phase = (now % BERSERK_CONFIG.PULSE_CYCLE) / BERSERK_CONFIG.PULSE_CYCLE;
          const alpha =
            BERSERK_CONFIG.PULSE_MIN_ALPHA +
            Math.sin(phase * Math.PI * 2) *
              0.5 *
              (BERSERK_CONFIG.PULSE_MAX_ALPHA - BERSERK_CONFIG.PULSE_MIN_ALPHA);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = BERSERK_CONFIG.AURA_COLOR;
          ctx.beginPath();
          ctx.arc(monster.x, monster.y, monsterSize * 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // 未激活：紫色描边
          ctx.save();
          ctx.strokeStyle = BERSERK_CONFIG.OUTLINE_COLOR;
          ctx.lineWidth = isBoss ? 4 : 2;
          ctx.beginPath();
          ctx.arc(monster.x, monster.y, monsterSize + (isBoss ? 4 : 2), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case 'shield': {
        const charges = (monster.affixState.charges as number) ?? 0;
        if (charges <= 0) break;
        // 蓝色半透明描边
        ctx.save();
        ctx.strokeStyle = SHIELD_CONFIG.OUTLINE_COLOR;
        ctx.globalAlpha = SHIELD_CONFIG.OUTLINE_ALPHA;
        ctx.lineWidth = isBoss ? 4 : 2;
        ctx.beginPath();
        ctx.arc(monster.x, monster.y, monsterSize + (isBoss ? 4 : 2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'self_destruct': {
        const phase = monster.affixState.phase as string;
        if (phase === 'charging') {
          // 红色轮廓加速闪烁：沿怪物 sprite 外接矩形描边（与敌人形状保持一致）
          const flashCount = Math.floor(
            (now - (monster.affixState.chargeStartTime as number)) /
              SELF_DESTRUCT_CONFIG.FLASH_INTERVAL
          );
          if (flashCount % 2 === 0) {
            const half = monsterSize * 1.05;
            ctx.save();
            ctx.strokeStyle = '#ff2222';
            ctx.lineWidth = isBoss ? 5 : 3;
            // 外发光感：两层轮廓（外粗内细）
            ctx.globalAlpha = 0.75;
            ctx.strokeRect(monster.x - half - 1, monster.y - half - 1, half * 2 + 2, half * 2 + 2);
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = isBoss ? 8 : 5;
            ctx.strokeRect(monster.x - half - 2, monster.y - half - 2, half * 2 + 4, half * 2 + 4);
            ctx.restore();
          }
        }
        break;
      }
      default:
        break;
    }
  },

  // 绘制血条下方的词缀 UI（如护盾方格）
  renderBelowHpBar(
    ctx: CanvasRenderingContext2D,
    monster: Monster,
    monsterSize: number,
    isBoss: boolean
  ): void {
    if (!monster.affix || !monster.affixState || monster.isDying) return;

    if (monster.affix.type === 'shield') {
      const charges = (monster.affixState.charges as number) ?? 0;
      const totalCells = SHIELD_CONFIG.MAX_CHARGES;
      const totalWidth =
        totalCells * SHIELD_CONFIG.CELL_WIDTH + (totalCells - 1) * SHIELD_CONFIG.CELL_GAP;
      // 位置：血条下方
      const barY = monster.y - monsterSize - 15;
      const hpBarHeight = isBoss ? 12 : 8;
      const cellY = barY + hpBarHeight + 3;
      const startX = monster.x - totalWidth / 2;

      for (let i = 0; i < totalCells; i++) {
        const cx = startX + i * (SHIELD_CONFIG.CELL_WIDTH + SHIELD_CONFIG.CELL_GAP);
        const active = i < charges;
        ctx.fillStyle = active
          ? SHIELD_CONFIG.CELL_ACTIVE_COLOR
          : SHIELD_CONFIG.CELL_INACTIVE_COLOR;
        ctx.fillRect(cx, cellY, SHIELD_CONFIG.CELL_WIDTH, SHIELD_CONFIG.CELL_HEIGHT);
        // 描边
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cellY, SHIELD_CONFIG.CELL_WIDTH, SHIELD_CONFIG.CELL_HEIGHT);
      }
    }
  },
};
