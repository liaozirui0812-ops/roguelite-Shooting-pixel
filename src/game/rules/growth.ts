import type {
  GrowthChainNodeId,
  GrowthChainNode,
  Player,
  SpecialRewardType,
  Monster,
  PoisonCircle,
  ValueTier,
} from '@/game/model/types';

// 成长链配置
export const GROWTH_CHAIN_NODES: Record<GrowthChainNodeId, GrowthChainNode> = {
  // ========== 淬毒成长链 ==========
  // 第1段：需要淬毒buff解锁
  poison_circle_expand_1: {
    id: 'poison_circle_expand_1',
    name: '毒圈扩大I',
    description: '淬毒毒圈范围增大30%',
    baseBuff: 'poisonBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 8 * level + 10,
    icon: '/assets/poison.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'poison_circle_expand_1'],
    }),
  },
  poison_enhance_1: {
    id: 'poison_enhance_1',
    name: '毒性增强I',
    description: '中毒伤害增加30%，中毒持续时间增加2秒',
    baseBuff: 'poisonBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/poison.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'poison_enhance_1'],
    }),
  },
  // 第2段：需要1个第1段节点解锁
  poison_toxic_2: {
    id: 'poison_toxic_2',
    name: '剧毒II',
    description: '每次毒伤造成敌人剩余生命值10%的真实伤害（对BOSS为1%）',
    baseBuff: 'poisonBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: (level) => 50 + 2 * level,
    priceFormula: (level) => 20 * level,
    icon: '/assets/poison.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'poison_toxic_2'],
    }),
  },
  poison_infection_2: {
    id: 'poison_infection_2',
    name: '传染II',
    description: '中毒敌人每次受到中毒伤害时，有20%概率使距离100px内的另一个敌人中毒',
    baseBuff: 'poisonBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 30 + level * level,
    icon: '/assets/poison.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'poison_infection_2'],
    }),
  },
  poison_circle_expand_2: {
    id: 'poison_circle_expand_2',
    name: '毒圈扩大II',
    description: '淬毒毒圈扩大20%，毒圈持续时间增加30%',
    baseBuff: 'poisonBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 30 + level * level,
    icon: '/assets/poison.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'poison_circle_expand_2'],
    }),
  },
  poison_faster_2: {
    id: 'poison_faster_2',
    name: '剧毒III',
    description: '毒伤的频率由1秒触发一次改为0.7秒触发一次',
    baseBuff: 'poisonBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: (level) => 50 + 2 * level,
    priceFormula: (level) => 20 * level,
    icon: '/assets/poison.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'poison_faster_2'],
    }),
  },
  // 第3段：需要2个第2段节点解锁
  poison_absorb_3: {
    id: 'poison_absorb_3',
    name: '剧毒吸收I',
    description: '玩家站立在毒圈上时，每秒回复2点生命值',
    baseBuff: 'poisonBuff',
    tier: 3,
    requiredPrevTierCount: 2,
    weight: (level) => 50 + 2 * level,
    priceFormula: (level) => 40 * level,
    icon: '/assets/poison.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'poison_absorb_3'],
    }),
  },

  // ========== 手枪专属成长链 ==========
  pistol_last_penetration: {
    id: 'pistol_last_penetration',
    name: '最后一弹',
    description: '手枪的最后一发子弹可以穿透任何敌人（无限穿透，无伤害衰减）',
    baseBuff: 'pistol_last_bullet_penetrate',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 3 * level + 50,
    icon: '/assets/pistol_show.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'pistol_last_penetration'],
    }),
  },
  pistol_final_strike_chain: {
    id: 'pistol_final_strike_chain',
    name: '孤注一掷',
    description:
      '换弹时长+40%，但弹匣最后3发子弹伤害递增50%/100%/200%，且最后一发必定暴击+穿透所有敌人',
    baseBuff: 'pistol_final_strike',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: (level) => 100 + 10 * level,
    priceFormula: (level) => 180 + 10 * level,
    icon: '/assets/pistol_final_strike.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'pistol_final_strike_chain'],
    }),
  },

  // ========== 火箭筒专属成长链 ==========
  rpg_shockwave: {
    id: 'rpg_shockwave',
    name: '冲击波',
    description: '爆炸伤害会击退敌人，未死亡的敌人向反方向击退30px，并在1.5秒内减速70%',
    baseBuff: 'rpg_shockwave',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/RPG_show.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'rpg_shockwave'],
    }),
  },
  rpg_ap_shot: {
    id: 'rpg_ap_shot',
    name: '穿甲弹',
    description: '爆炸伤害增加200%，爆炸范围减少80%',
    baseBuff: 'rpg_ap_shot',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 13 * level,
    icon: '/assets/RPG_show.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'rpg_ap_shot'],
    }),
  },
  rpg_dual_barrel: {
    id: 'rpg_dual_barrel',
    name: '两联装',
    description:
      '弹夹数变为2，点击发射则在0.7秒内连续发射两发。每发爆炸范围为初始的70%，伤害为60%，美术资源大小为60%',
    baseBuff: 'rpg_dual_barrel',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 15 * level,
    icon: '/assets/RPG_show.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'rpg_dual_barrel'],
    }),
  },

  // ========== 引火成长链 ==========
  // T1 - 灼烧加速
  fire_burn_speed_1: {
    id: 'fire_burn_speed_1',
    name: '灼烧加速',
    description: '燃烧伤害频率从 1 秒/次 → 0.7 秒/次',
    baseBuff: 'fireBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 30 + 10 * level,
    icon: '/assets/fire_burn_speed.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'fire_burn_speed_1'],
    }),
  },
  // T1 - 焰痕范围
  fire_trail_range_1: {
    id: 'fire_trail_range_1',
    name: '焰痕范围',
    description: '火焰轨迹/区域半径 +30%',
    baseBuff: 'fireBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 + 20 * level,
    icon: '/assets/fire_trail_range.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'fire_trail_range_1'],
    }),
  },
  // T2 - 炎爆
  fire_blast_2: {
    id: 'fire_blast_2',
    name: '炎爆',
    description: '燃烧状态叠到 5 层时，触发一次小爆炸（50% 武器伤害，范围 60px）',
    baseBuff: 'fireBuff',
    tier: 2,
    requiredPrevTierCount: 2,
    weight: 100,
    priceFormula: (level) => 30 + 30 * level,
    icon: '/assets/fire_blast.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'fire_blast_2'],
    }),
  },
  // T2 - 余烬
  fire_ember_2: {
    id: 'fire_ember_2',
    name: '余烬',
    description:
      '敌人燃烧死亡时，有 30% 概率在原地留下一个小火苗（持续 3 秒，敌人踩中则触发一次燃烧伤害）',
    baseBuff: 'fireBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 + 20 * level,
    icon: '/assets/fire_ember.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'fire_ember_2'],
    }),
  },
  // T2 - 火焰穿透
  fire_penetrate_2: {
    id: 'fire_penetrate_2',
    name: '火焰穿透',
    description: '火焰伤害可以穿透敌人（对周围100px随机一个敌人造成 30% 燃烧伤害）',
    baseBuff: 'fireBuff',
    tier: 2,
    requiredPrevTierCount: 2,
    weight: 100,
    priceFormula: (level) => 30 + 30 * level,
    icon: '/assets/fire_penetrate.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'fire_penetrate_2'],
    }),
  },
  // T3 - 永恒之火
  fire_eternal_3: {
    id: 'fire_eternal_3',
    name: '永恒之火',
    description: '所有火焰效果基础伤害和持续时间翻倍',
    baseBuff: 'fireBuff',
    tier: 3,
    requiredPrevTierCount: 2,
    weight: 100,
    priceFormula: (level) => 50 + 50 * level,
    icon: '/assets/fire_eternal.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'fire_eternal_3'],
    }),
  },
  // 能量气场成长链
  energy_growth_1: {
    id: 'energy_growth_1',
    name: '能量气场成长I',
    description: '预留',
    baseBuff: 'energyAura',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/aura.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'energy_growth_1'],
    }),
  },
  energy_growth_2: {
    id: 'energy_growth_2',
    name: '能量气场成长II',
    description: '预留',
    baseBuff: 'energyAura',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/aura.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'energy_growth_2'],
    }),
  },
  // 处决成长链
  execution_growth_1: {
    id: 'execution_growth_1',
    name: '处决成长I',
    description: '预留',
    baseBuff: 'executionBuff',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/execution.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'execution_growth_1'],
    }),
  },
  execution_growth_2: {
    id: 'execution_growth_2',
    name: '处决成长II',
    description: '预留',
    baseBuff: 'executionBuff',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/execution.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'execution_growth_2'],
    }),
  },
  // 暴怒成长链
  critical_rage_growth_1: {
    id: 'critical_rage_growth_1',
    name: '暴怒成长I',
    description: '预留',
    baseBuff: 'criticalRage',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/critical_rage.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'critical_rage_growth_1'],
    }),
  },
  critical_rage_growth_2: {
    id: 'critical_rage_growth_2',
    name: '暴怒成长II',
    description: '预留',
    baseBuff: 'criticalRage',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/critical_rage.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'critical_rage_growth_2'],
    }),
  },
  // 吸血成长链
  vampire_growth_1: {
    id: 'vampire_growth_1',
    name: '吸血成长I',
    description: '预留',
    baseBuff: 'vampire',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/ui/vampire.svg',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'vampire_growth_1'],
    }),
  },
  vampire_growth_2: {
    id: 'vampire_growth_2',
    name: '吸血成长II',
    description: '预留',
    baseBuff: 'vampire',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/ui/vampire.svg',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'vampire_growth_2'],
    }),
  },
  // 弹药补充成长链
  ammo_supply_growth_1: {
    id: 'ammo_supply_growth_1',
    name: '弹药补充成长I',
    description: '预留',
    baseBuff: 'ammoSupply',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/ammo_supply.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'ammo_supply_growth_1'],
    }),
  },
  ammo_supply_growth_2: {
    id: 'ammo_supply_growth_2',
    name: '弹药补充成长II',
    description: '预留',
    baseBuff: 'ammoSupply',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/ammo_supply.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'ammo_supply_growth_2'],
    }),
  },
  // 险中取胜成长链
  desperate_fight_growth_1: {
    id: 'desperate_fight_growth_1',
    name: '险中取胜成长I',
    description: '预留',
    baseBuff: 'desperateFight',
    tier: 1,
    requiredPrevTierCount: 0,
    weight: 100,
    priceFormula: (level) => 10 * level,
    icon: '/assets/desperate_fight.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'desperate_fight_growth_1'],
    }),
  },
  desperate_fight_growth_2: {
    id: 'desperate_fight_growth_2',
    name: '险中取胜成长II',
    description: '预留',
    baseBuff: 'desperateFight',
    tier: 2,
    requiredPrevTierCount: 1,
    weight: 100,
    priceFormula: (level) => 20 * level,
    icon: '/assets/desperate_fight.png',
    apply: (player) => ({
      ...player,
      growthChainNodes: [...player.growthChainNodes, 'desperate_fight_growth_2'],
    }),
  },
};

// 辅助函数：检查玩家是否拥有特定成长链节点
export const hasGrowthChainNode = (player: Player, nodeId: GrowthChainNodeId): boolean => {
  return player.growthChainNodes.includes(nodeId);
};

// 辅助函数：获取玩家在某个buff的特定段位的节点数量
export const getGrowthChainTierCount = (
  player: Player,
  baseBuff: SpecialRewardType,
  tier: number
): number => {
  return player.growthChainNodes.filter((nodeId) => {
    const node = GROWTH_CHAIN_NODES[nodeId];
    return node && node.baseBuff === baseBuff && node.tier === tier;
  }).length;
};

// 辅助函数：检查成长链节点是否解锁（可以出现在商店/升级中）
export const isGrowthChainNodeUnlocked = (player: Player, nodeId: GrowthChainNodeId): boolean => {
  const node = GROWTH_CHAIN_NODES[nodeId];
  if (!node) return false;

  // 检查是否已拥有
  if (hasGrowthChainNode(player, nodeId)) return false;

  // 检查是否拥有基础buff
  const baseBuffLevelMap: Record<SpecialRewardType, number> = {
    penetration: player.penetration,
    fireBuff: player.fireBuffLevel,
    poisonBuff: player.poisonBuffLevel,
    energyAura: player.energyAuraLevel,
    executionBuff: player.executionLevel,
    criticalRage: player.criticalRageLevel,
    vampire: player.vampireLevel,
    ammoSupply: player.ammoSupplyLevel,
    desperateFight: player.desperateFightLevel,
    pistol_last_bullet_penetrate: player.weapon === 'pistol' ? 1 : 0,
    pistol_final_strike: player.weapon === 'pistol' ? 1 : 0,
    rpg_shockwave: player.weapon === 'rpg' ? 1 : 0,
    rpg_ap_shot: player.weapon === 'rpg' ? 1 : 0,
    rpg_dual_barrel: player.weapon === 'rpg' ? 1 : 0,
    weapon_pistol: player.weapons.includes('pistol') ? 1 : 0,
    weapon_smg: player.weapons.includes('smg') ? 1 : 0,
    weapon_sniper: player.weapons.includes('sniper') ? 1 : 0,
    weapon_shotgun: player.weapons.includes('shotgun') ? 1 : 0,
    weapon_rpg: player.weapons.includes('rpg') ? 1 : 0,
  };

  const baseBuffLevel = baseBuffLevelMap[node.baseBuff] ?? 0;
  if (baseBuffLevel <= 0) return false;

  // 第1段：只需要基础buff
  if (node.tier === 1) return true;

  // 第2段及以上：需要前一段足够的节点数量
  const prevTierCount = getGrowthChainTierCount(player, node.baseBuff, node.tier - 1);
  return prevTierCount >= node.requiredPrevTierCount;
};

// 辅助函数：检查基础buff是否应该从商店/升级池中移除（已获得后）
export const shouldRemoveBaseBuffFromPool = (
  player: Player,
  buffType: SpecialRewardType
): boolean => {
  const buffLevelMap: Record<SpecialRewardType, number> = {
    penetration: player.penetration,
    fireBuff: player.fireBuffLevel,
    poisonBuff: player.poisonBuffLevel,
    energyAura: player.energyAuraLevel,
    executionBuff: player.executionLevel,
    criticalRage: player.criticalRageLevel,
    vampire: player.vampireLevel,
    ammoSupply: player.ammoSupplyLevel,
    desperateFight: player.desperateFightLevel,
    pistol_last_bullet_penetrate: player.weapon === 'pistol' ? 1 : 0,
    pistol_final_strike: player.weapon === 'pistol' ? 1 : 0,
    rpg_shockwave: player.weapon === 'rpg' ? 1 : 0,
    rpg_ap_shot: player.weapon === 'rpg' ? 1 : 0,
    rpg_dual_barrel: player.weapon === 'rpg' ? 1 : 0,
    weapon_pistol: player.weapons.includes('pistol') ? 1 : 0,
    weapon_smg: player.weapons.includes('smg') ? 1 : 0,
    weapon_sniper: player.weapons.includes('sniper') ? 1 : 0,
    weapon_shotgun: player.weapons.includes('shotgun') ? 1 : 0,
    weapon_rpg: player.weapons.includes('rpg') ? 1 : 0,
  };

  // 只对非武器类型的buff应用成长链规则
  const nonWeaponBuffs: SpecialRewardType[] = [
    'penetration',
    'fireBuff',
    'poisonBuff',
    'energyAura',
    'executionBuff',
    'criticalRage',
    'vampire',
    'ammoSupply',
    'desperateFight',
    'pistol_last_bullet_penetrate',
    'pistol_final_strike',
    'rpg_shockwave',
    'rpg_ap_shot',
    'rpg_dual_barrel',
  ];
  if (!nonWeaponBuffs.includes(buffType)) return false;

  return (buffLevelMap[buffType] ?? 0) > 0;
};

// ========== 淬毒成长链辅助函数 ==========
// 计算毒圈半径（应用成长链加成）
export const getPoisonCircleRadius = (player: Player, baseRadius: number): number => {
  let radius = baseRadius;
  // 毒圈扩大I: +30%
  if (hasGrowthChainNode(player, 'poison_circle_expand_1')) {
    radius *= 1.3;
  }
  // 毒圈扩大II: +20%
  if (hasGrowthChainNode(player, 'poison_circle_expand_2')) {
    radius *= 1.2;
  }
  return radius;
};

// 计算毒圈持续时间（应用成长链加成）
export const getPoisonCircleDuration = (player: Player, baseDuration: number): number => {
  let duration = baseDuration;
  // 毒圈扩大II: +30%
  if (hasGrowthChainNode(player, 'poison_circle_expand_2')) {
    duration *= 1.3;
  }
  return duration;
};

// 计算中毒伤害（应用成长链加成）
export const getPoisonDamage = (player: Player, baseDamage: number): number => {
  let damage = baseDamage;
  // 毒性增强I: +30%
  if (hasGrowthChainNode(player, 'poison_enhance_1')) {
    damage *= 1.3;
  }
  return damage;
};

// 计算中毒持续时间（应用成长链加成）
export const getPoisonDuration = (player: Player, baseDuration: number): number => {
  let duration = baseDuration;
  // 毒性增强I: +2秒
  if (hasGrowthChainNode(player, 'poison_enhance_1')) {
    duration += 2000;
  }
  return duration;
};

// 计算中毒伤害间隔（应用成长链加成）
export const getPoisonTickInterval = (player: Player): number => {
  // 剧毒III: 从1秒改为0.7秒
  if (hasGrowthChainNode(player, 'poison_faster_2')) {
    return 700;
  }
  return 1000;
};

// 计算真实伤害（剧毒II效果）
export const getPoisonTrueDamage = (player: Player, monster: Monster): number => {
  if (!hasGrowthChainNode(player, 'poison_toxic_2')) return 0;

  const hpPercent = monster.hp / monster.maxHp;
  // 对BOSS为1%，其他敌人为10%
  const percent = monster.isBoss ? 0.01 : 0.1;
  return Math.floor(monster.hp * percent);
};

// 检查是否触发传染（传染II效果）
export const shouldPoisonInfect = (player: Player, random: () => number = Math.random): boolean => {
  if (!hasGrowthChainNode(player, 'poison_infection_2')) return false;
  return random() < 0.2; // 20%概率
};

// 检查玩家是否在毒圈内并计算回复（剧毒吸收I效果）
export const checkPoisonCircleHeal = (player: Player, poisonCircles: PoisonCircle[]): number => {
  if (!hasGrowthChainNode(player, 'poison_absorb_3')) return 0;

  for (const circle of poisonCircles) {
    const dist = Math.sqrt(Math.pow(player.x - circle.x, 2) + Math.pow(player.y - circle.y, 2));
    if (dist <= circle.radius) {
      return 2; // 每秒回复2点生命值
    }
  }
  return 0;
};

export const VALUE_TIERS: ValueTier[] = [
  { value: (level: number) => Math.floor(1 + level / 2), weightFormula: (level: number) => 100 },
  {
    value: (level: number) => Math.floor(5 + level / 1.5),
    weightFormula: (level: number) => 30 + level * 2,
  },
  {
    value: (level: number) => Math.floor(10 + level / 1.2),
    weightFormula: (level: number) => 10 + level * 2,
  },
  { value: (level: number) => Math.floor(level * 2), weightFormula: (level: number) => 10 + level },
];
