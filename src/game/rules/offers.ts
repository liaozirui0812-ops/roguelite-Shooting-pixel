import {
  WeaponType,
  WEAPONS,
  SpecialRewardType,
  GrowthChainNodeId,
  isAtMaxValue,
  getMaxValueDisplay,
  Player,
  UpgradeType,
  Upgrade,
  ShopItemType,
  ShopItem,
  SHOP_ITEM_CONFIGS,
  GROWTH_CHAIN_NODES,
  isGrowthChainNodeUnlocked,
  shouldRemoveBaseBuffFromPool,
  ValueTier,
  VALUE_TIERS,
} from '@/game';

export function buildUpgradeOffers(
  currentWeapon: WeaponType,
  currentLevel: number,
  currentPlayer: Player,
  random: () => number = Math.random
): Upgrade[] {
  // 根据关卡计算每个升级的权重和数值
  const dynamicUpgrades: Upgrade[] = [];

  // 基础伤害：+12%×(1+0.04L)，权重100，贯穿全场的基础
  const damageBonus = Math.floor(12 * (1 + currentLevel * 0.04));
  dynamicUpgrades.push({
    id: 'damage',
    name: '伤害加成',
    description: `伤害 +${damageBonus}%`,
    value: damageBonus,
    icon: '/assets/shanghai.png',
    weight: 100,
  });

  // 生命上限：1+0.5L（向下取整），权重110-2L，前期保命，后期稀释
  const maxHpBonus = Math.floor(1 + currentLevel * 0.5);
  dynamicUpgrades.push({
    id: 'maxHp',
    name: '血量上限',
    description: `血量上限 +${maxHpBonus}`,
    value: maxHpBonus,
    icon: '/assets/shangxian.png',
    weight: Math.max(10, 110 - currentLevel * 2),
  });

  // 暴击率：+4%（固定），权重30+2L（最高90），随关卡变得更易出现
  dynamicUpgrades.push({
    id: 'critRate',
    name: '暴击率',
    description: `暴击率 +4%`,
    value: 4,
    icon: '/assets/baojilv.png',
    weight: Math.min(90, 30 + currentLevel * 2),
  });

  // 暴击伤害：+20%×(1+0.02L)，权重30+2L（最高90），与暴击率同步增长
  const critDamageBonus = Math.floor(20 * (1 + currentLevel * 0.02));
  dynamicUpgrades.push({
    id: 'critDamage',
    name: '暴击伤害',
    description: `暴击伤害 +${critDamageBonus}%`,
    value: critDamageBonus,
    icon: '/assets/baojishanghai.png',
    weight: Math.min(90, 30 + currentLevel * 2),
  });

  // 射速加成：+10%（固定），权重70，稳定收益
  dynamicUpgrades.push({
    id: 'fireRate',
    name: '射速提升',
    description: `射速 +10%`,
    value: 10,
    icon: '/assets/shesu.png',
    weight: 70,
  });

  // 换弹速度：+12%（固定），权重65，稳定收益
  dynamicUpgrades.push({
    id: 'reloadTime',
    name: '换弹速度',
    description: `换弹速度 +12%`,
    value: 12,
    icon: '/assets/huandan.png',
    weight: 65,
  });

  // 移速加成：0.1，权重75-L，后期走位虽强但非核心
  dynamicUpgrades.push({
    id: 'playerSpeed',
    name: '移动速度',
    description: `移动速度 +0.1`,
    value: 0.1,
    icon: '/assets/ui/speed.svg',
    weight: Math.max(10, 75 - currentLevel),
  });

  // 弹夹容量：+2（固定），权重25+L，随关卡重要性提升
  dynamicUpgrades.push({
    id: 'magazineSize',
    name: '弹夹容量',
    description: `弹夹容量 +2`,
    value: 2,
    icon: '/assets/ui/weapon-upgrade.svg',
    weight: 25 + currentLevel,
  });

  // 射程：0.15，权重45-L，前期有用，后期垃圾
  dynamicUpgrades.push({
    id: 'weaponRange',
    name: '射程',
    description: `射程 +0.15`,
    value: 0.15,
    icon: '/assets/shecheng.png',
    weight: Math.max(5, 45 - currentLevel),
  });

  // 穿透力：+1，权重min(30, 6+1.2L)，顶级后期Buff，极贵
  dynamicUpgrades.push({
    id: 'penetration',
    name: '穿透力',
    description: `穿透力 +1`,
    value: 1,
    icon: '/assets/chuantou.png',
    weight: Math.min(30, 6 + currentLevel * 1.2),
  });

  // 击退：+1，权重20+10L
  dynamicUpgrades.push({
    id: 'knockback',
    name: '击退',
    description: `击退 +1`,
    value: 1,
    icon: '/assets/jitui.png',
    weight: 20 + currentLevel * 10,
  });

  // 枪械选项（保持原有权重）
  dynamicUpgrades.push({
    id: 'weapon_pistol',
    name: '手枪',
    description: WEAPONS.pistol.description,
    value: 0,
    icon: WEAPONS.pistol.showIcon,
    weight: Math.max(12, 40 - currentLevel * 2),
  });

  dynamicUpgrades.push({
    id: 'weapon_shotgun',
    name: '散弹枪',
    description: WEAPONS.shotgun.description,
    value: 0,
    icon: WEAPONS.shotgun.showIcon,
    weight: Math.max(12, 40 - currentLevel * 2),
  });

  dynamicUpgrades.push({
    id: 'weapon_sniper',
    name: '狙击枪',
    description: WEAPONS.sniper.description,
    value: 0,
    icon: WEAPONS.sniper.showIcon,
    weight: Math.max(12, 40 - currentLevel * 2),
  });

  dynamicUpgrades.push({
    id: 'weapon_smg',
    name: '冲锋枪',
    description: WEAPONS.smg.description,
    value: 0,
    icon: WEAPONS.smg.showIcon,
    weight: Math.max(12, 40 - currentLevel * 2),
  });

  dynamicUpgrades.push({
    id: 'weapon_rpg',
    name: '火箭筒',
    description: WEAPONS.rpg.description,
    value: 0,
    icon: WEAPONS.rpg.showIcon,
    weight: Math.max(10, 30 - currentLevel * 1.5),
  });

  // 生命回复：12+4L，权重90-2L，逐渐降低，前期容错高
  const healBonus = 12 + currentLevel * 4;
  dynamicUpgrades.push({
    id: 'heal',
    name: '生命回复',
    description: `生命 +${healBonus}`,
    value: healBonus,
    icon: '/assets/huifu.png',
    weight: Math.max(20, 90 - currentLevel * 2),
  });

  // 敌方减速：-4%×(1+0.03L)，权重min(70, 20+2L)，逐渐升高
  const enemySlowdownBonus = Math.floor(4 * (1 + currentLevel * 0.03));
  dynamicUpgrades.push({
    id: 'enemySlowdown',
    name: '敌方减速',
    description: `敌方速度 -${enemySlowdownBonus}%`,
    value: enemySlowdownBonus,
    icon: '/assets/jianshu.png',
    weight: Math.min(70, 20 + currentLevel * 2),
  });

  // 金币奖励：10+4L，权重max(0, 30-1.5L)，前期极高
  const goldReward = 10 + currentLevel * 4;
  dynamicUpgrades.push({
    id: 'gold_reward',
    name: '金币奖励',
    description: `金币 +${goldReward}`,
    value: goldReward,
    icon: '/assets/jinbi.png',
    weight: Math.max(0, 30 - currentLevel * 1.5),
  });

  // 武器升级：1级，权重50，稳健常青
  dynamicUpgrades.push({
    id: 'weapon_upgrade',
    name: '武器升级',
    description: `武器等级 +1`,
    value: 1,
    icon: '/assets/ui/weapon-upgrade.svg',
    weight: 50,
  });

  // 子弹速度：+10%×(1+0.03L)，权重45-L，逐渐降低
  const bulletSpeedBonus = Math.floor(10 * (1 + currentLevel * 0.03));
  dynamicUpgrades.push({
    id: 'bulletSpeed',
    name: '子弹速度',
    description: `子弹速度 +${bulletSpeedBonus}%`,
    value: bulletSpeedBonus,
    icon: '/assets/ui/weapon-upgrade.svg',
    weight: Math.max(10, 45 - currentLevel),
  });

  // 吸血buff：权重100，价格10+2L
  dynamicUpgrades.push({
    id: 'vampire',
    name: '吸血',
    description: '+1 吸血等级',
    value: 1,
    icon: '/assets/ui/vampire.svg',
    weight: 100,
  });

  // 弹药补充buff：权重100，价格10+2L
  dynamicUpgrades.push({
    id: 'ammoSupply',
    name: '弹药补充',
    description: '+1 弹药补充等级',
    value: 1,
    icon: '/assets/ammo_supply.png',
    weight: 100,
  });

  // 险中取胜buff：权重100，价格20+3L
  dynamicUpgrades.push({
    id: 'desperateFight',
    name: '险中取胜',
    description: '+1 险中取胜等级',
    value: 1,
    icon: '/assets/desperate_fight.png',
    weight: 100,
  });

  // 成长链基础buff类型列表（已获得后不再出现在升级池中）
  const growthChainBaseBuffs: UpgradeType[] = ['vampire', 'ammoSupply', 'desperateFight'];

  // 添加成长链节点升级选项
  for (const nodeId of Object.keys(GROWTH_CHAIN_NODES) as GrowthChainNodeId[]) {
    if (isGrowthChainNodeUnlocked(currentPlayer, nodeId)) {
      const node = GROWTH_CHAIN_NODES[nodeId];

      // 手枪专属成长链节点：仅在拥有手枪时才出现
      if (
        (nodeId === 'pistol_last_penetration' || nodeId === 'pistol_final_strike_chain') &&
        currentPlayer.weapon !== 'pistol'
      ) {
        continue;
      }

      // 火箭筒专属成长链节点：仅在拥有火箭筒时才出现
      if (
        (nodeId === 'rpg_shockwave' || nodeId === 'rpg_ap_shot' || nodeId === 'rpg_dual_barrel') &&
        currentPlayer.weapon !== 'rpg'
      ) {
        continue;
      }

      // 只添加淬毒、手枪专属、火箭筒专属的成长链节点（其他buff预留位置暂时不加入升级池）
      if (
        node.baseBuff === 'poisonBuff' ||
        node.baseBuff === 'pistol_last_bullet_penetrate' ||
        node.baseBuff === 'pistol_final_strike' ||
        node.baseBuff === 'rpg_shockwave' ||
        node.baseBuff === 'rpg_ap_shot' ||
        node.baseBuff === 'rpg_dual_barrel'
      ) {
        const weight = typeof node.weight === 'function' ? node.weight(currentLevel) : node.weight;
        dynamicUpgrades.push({
          id: node.baseBuff, // 使用基础buff类型作为分类
          value: 1,
          name: node.name,
          description: node.description,
          icon: node.icon,
          weight,
          growthChainNode: node.id,
        });
      }
    }
  }

  // 根据权重随机选择3个不重复升级
  const selected: Upgrade[] = [];
  const available: Upgrade[] = [];

  // 根据权重创建加权数组，并过滤掉已达到最大值的升级
  dynamicUpgrades.forEach((upgrade) => {
    // 检查是否已达到最大值
    if (isAtMaxValue(currentPlayer, upgrade.id)) {
      return; // 跳过这个升级
    }

    // 检查是否是成长链基础buff且已获得（如果已获得则不出现基础buff，只出现成长链节点）
    if (
      growthChainBaseBuffs.includes(upgrade.id) &&
      shouldRemoveBaseBuffFromPool(currentPlayer, upgrade.id as SpecialRewardType)
    ) {
      return; // 跳过这个升级
    }

    const weight = upgrade.weight || 1;
    for (let i = 0; i < weight; i++) {
      available.push(upgrade);
    }
  });

  while (selected.length < 3 && available.length > 0) {
    const randomIndex = Math.floor(random() * available.length);
    const upgrade = available[randomIndex];

    // 检查是否已选择该升级
    if (!selected.find((u) => u.id === upgrade.id)) {
      selected.push(upgrade);
    }

    // 移除该升级的所有实例
    for (let i = available.length - 1; i >= 0; i--) {
      if (available[i].id === upgrade.id) {
        available.splice(i, 1);
      }
    }
  }

  // 确保没有重复的升级，并添加最大值显示
  const finalSelected: Upgrade[] = [];
  const seenIds = new Set<string>();

  for (const upgrade of selected) {
    if (!seenIds.has(upgrade.id)) {
      seenIds.add(upgrade.id);

      // 检查是否已达到最大值，如果是则修改显示文本
      if (isAtMaxValue(currentPlayer, upgrade.id)) {
        finalSelected.push({
          ...upgrade,
          name: getMaxValueDisplay(upgrade.id, upgrade.name),
          description: `${getMaxValueDisplay(upgrade.id, upgrade.name)} (已满级)`,
        });
      } else {
        finalSelected.push(upgrade);
      }
    }
  }

  return finalSelected;
}

export function buildShopOffers(
  player: Player,
  currentLevel: number,
  preserved: ShopItem[],
  random: () => number,
  nextId: () => string
): ShopItem[] {
  const newItems: ShopItem[] = preserved.slice(0, 3);
  const itemTypes: ShopItemType[] = [
    'critDamage',
    'critRate',
    'magazineSize',
    'fireRate',
    'damage',
    'playerSpeed',
    'reloadTime',
    'weaponRange',
    'maxHp',
    'penetration',
    'knockback',
    'weapon_pistol',
    'weapon_smg',
    'weapon_sniper',
    'weapon_shotgun',
    'weapon_rpg',
    'bulletSpeed',
    'fireBuff',
    'poisonBuff',
    'coinPickupRange',
    'energyAura',
    'executionBuff',
    'criticalRage',
    'vampire',
    'ammoSupply',
    'desperateFight',
  ];

  // 成长链基础buff类型列表
  const growthChainBaseBuffs: ShopItemType[] = [
    'fireBuff',
    'poisonBuff',
    'energyAura',
    'executionBuff',
    'criticalRage',
    'vampire',
    'ammoSupply',
    'desperateFight',
  ];

  // Preserved offers keep their instance IDs, prices and values.

  const remainingCount = 3 - preserved.length;

  for (let i = 0; i < remainingCount; i++) {
    // 构建加权商品池
    interface WeightedItem {
      type: 'normal' | 'growthChain';
      shopType?: ShopItemType;
      growthNodeId?: GrowthChainNodeId;
      weight: number;
    }
    const weightedPool: WeightedItem[] = [];

    // 添加普通商品
    for (const type of itemTypes) {
      // 检查是否已达到最大值
      if (type === 'playerSpeed' && isAtMaxValue(player, type)) continue;
      if (type === 'weaponRange' && isAtMaxValue(player, type)) continue;
      if (type === 'penetration' && isAtMaxValue(player, type)) continue;
      if (type === 'knockback' && isAtMaxValue(player, type)) continue;
      if (type === 'coinPickupRange' && isAtMaxValue(player, type)) continue;

      // 检查是否是成长链基础buff且已获得（如果已获得则不出现基础buff，只出现成长链节点）
      if (
        growthChainBaseBuffs.includes(type) &&
        shouldRemoveBaseBuffFromPool(player, type as SpecialRewardType)
      ) {
        continue;
      }

      // 获取商品权重
      const config = SHOP_ITEM_CONFIGS[type];
      const weight = typeof config.weight === 'number' ? config.weight : 100;

      for (let j = 0; j < weight; j++) {
        weightedPool.push({ type: 'normal', shopType: type, weight });
      }
    }

    // 添加成长链节点商品
    for (const nodeId of Object.keys(GROWTH_CHAIN_NODES) as GrowthChainNodeId[]) {
      if (isGrowthChainNodeUnlocked(player, nodeId)) {
        const node = GROWTH_CHAIN_NODES[nodeId];

        // 手枪专属成长链节点：仅在拥有手枪时才出现
        if (
          (nodeId === 'pistol_last_penetration' || nodeId === 'pistol_final_strike_chain') &&
          player.weapon !== 'pistol'
        ) {
          continue;
        }

        // 火箭筒专属成长链节点：仅在拥有火箭筒时才出现
        if (
          (nodeId === 'rpg_shockwave' ||
            nodeId === 'rpg_ap_shot' ||
            nodeId === 'rpg_dual_barrel') &&
          player.weapon !== 'rpg'
        ) {
          continue;
        }

        // 只添加淬毒、手枪专属、火箭筒专属的成长链节点（其他buff预留位置暂时不加入商品池）
        if (
          node.baseBuff === 'poisonBuff' ||
          node.baseBuff === 'pistol_last_bullet_penetrate' ||
          node.baseBuff === 'pistol_final_strike' ||
          node.baseBuff === 'rpg_shockwave' ||
          node.baseBuff === 'rpg_ap_shot' ||
          node.baseBuff === 'rpg_dual_barrel'
        ) {
          const weight =
            typeof node.weight === 'function' ? node.weight(currentLevel) : node.weight;
          for (let j = 0; j < weight; j++) {
            weightedPool.push({ type: 'growthChain', growthNodeId: nodeId, weight });
          }
        }
      }
    }

    // 如果没有可用商品，跳过
    if (weightedPool.length === 0) continue;

    // 随机选择一个商品
    const selected = weightedPool[Math.floor(random() * weightedPool.length)];

    if (selected.type === 'growthChain' && selected.growthNodeId) {
      // 成长链节点商品
      const node = GROWTH_CHAIN_NODES[selected.growthNodeId];
      newItems.push({
        id: nextId(),
        type: node.baseBuff, // 使用基础buff类型作为分类
        name: node.name,
        description: node.description,
        icon: node.icon,
        value: 1,
        price: node.priceFormula(currentLevel),
        growthChainNode: node.id,
      });
    } else if (selected.shopType) {
      // 普通商品
      const type = selected.shopType;
      const config = SHOP_ITEM_CONFIGS[type];

      let price: number;
      let value: number;
      let description: string;

      // 检查是否为枪械类型
      if (type.startsWith('weapon_')) {
        // 枪械商品价格 = basePrice + levelPriceFactor × 关卡数
        price = config.basePrice + config.levelPriceFactor * currentLevel;
        value = 1; // 枪械商品不需要数值
        description = config.name; // 直接使用武器名称作为描述
      } else {
        // 普通商品

        // 穿透力特殊处理：value固定为1
        if (type === 'penetration') {
          value = 1;
          price = config.basePrice + config.levelPriceFactor * currentLevel;
          description = '+1 穿透力';
        } else if (type === 'knockback') {
          // 击退特殊处理：value固定为1，价格=15+18L
          value = 1;
          price = 15 + 18 * currentLevel;
          description = '+1 击退';
        } else if (type === 'fireBuff') {
          // 引火特殊处理：value固定为1
          value = 1;
          price = config.basePrice + config.levelPriceFactor * currentLevel;
          description = '+1 引火等级';
        } else if (type === 'poisonBuff') {
          // 淬毒特殊处理：value固定为1
          value = 1;
          price = config.basePrice + config.levelPriceFactor * currentLevel;
          description = '+1 淬毒等级';
        } else if (type === 'coinPickupRange') {
          // 金币拾取范围特殊处理：value固定为50%，价格=3L+5
          value = 50;
          price = 3 * currentLevel + 5;
          description = '+50% 金币拾取范围';
        } else if (type === 'energyAura') {
          // 能量气场特殊处理：value固定为1
          value = 1;
          price = config.basePrice + config.levelPriceFactor * currentLevel;
          description = '+1 能量气场等级';
        } else if (type === 'executionBuff') {
          // 处决buff特殊处理：价格=30+3L
          value = 1;
          price = 30 + 3 * currentLevel;
          description = '+1 处决等级';
        } else if (type === 'criticalRage') {
          // 暴怒buff特殊处理：价格=25+1.5L
          value = 1;
          price = Math.floor(25 + 1.5 * currentLevel);
          description = '+1 暴怒等级';
        } else if (type === 'vampire') {
          // 吸血buff特殊处理：价格=10+2L
          value = 1;
          price = 10 + 2 * currentLevel;
          description = '+1 吸血等级';
        } else if (type === 'ammoSupply') {
          // 弹药补充buff特殊处理：价格=10+2L
          value = 1;
          price = 10 + 2 * currentLevel;
          description = '+1 弹药补充等级';
        } else if (type === 'desperateFight') {
          // 险中取胜buff特殊处理：价格=20+3L
          value = 1;
          price = 20 + 3 * currentLevel;
          description = '+1 险中取胜等级';
        } else {
          // 其他商品：根据权重随机选择数值档位
          const weightedTiers: { tier: ValueTier; value: number }[] = [];
          VALUE_TIERS.forEach((tier) => {
            const weight = tier.weightFormula(currentLevel);
            const tierValue =
              typeof tier.value === 'function' ? tier.value(currentLevel) : tier.value;
            for (let j = 0; j < weight; j++) {
              weightedTiers.push({ tier, value: tierValue });
            }
          });

          const selectedTier = weightedTiers[Math.floor(random() * weightedTiers.length)];
          value = selectedTier.value;
          // 价格 = basePrice + levelPriceFactor × 关卡数 + 数值 × 2
          // 使用加法公式避免高数值商品价格过高
          const baseCost = config.basePrice + config.levelPriceFactor * currentLevel;
          price = Math.floor(baseCost + value * 2);

          // 生成描述
          const valueStr = config.isPercentage ? `${value}%` : `${value}`;
          description = `+${valueStr} ${config.name}`;
        }
      }

      // 检查是否已达到最大值，如果是则修改显示文本
      let finalName = description;
      let finalDescription = description;

      if (isAtMaxValue(player, type)) {
        finalName = getMaxValueDisplay(type, config.name);
        finalDescription = `${finalName} (已满级)`;
      }

      newItems.push({
        id: nextId(),
        type,
        name: finalName,
        description: finalDescription,
        icon: config.icon,
        value,
        price,
      });
    }
  }

  return newItems;
}
