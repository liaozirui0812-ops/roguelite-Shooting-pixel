import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// ============================================================
// 程序级配置表 - 可直接用于代码生成或数据导入
// ============================================================

interface ConfigField {
  fieldName: string;        // 代码字段名
  fieldType: string;        // TypeScript 类型
  defaultValue: any;        // 默认值
  range?: string;           // 取值范围/约束
  description: string;      // 说明
  codePath: string;         // 代码位置/引用方式
  required: boolean;        // 是否必填
}

// ============================================================
// Sheet 1: Player 接口字段定义
// ============================================================
const playerFields: ConfigField[] = [
  { fieldName: 'x', fieldType: 'number', defaultValue: 0, range: '0 ~ CANVAS_WIDTH', description: '玩家X坐标（像素）', codePath: 'player.x', required: true },
  { fieldName: 'y', fieldType: 'number', defaultValue: 0, range: '0 ~ CANVAS_HEIGHT', description: '玩家Y坐标（像素）', codePath: 'player.y', required: true },
  { fieldName: 'hp', fieldType: 'number', defaultValue: 100, range: '0 ~ maxHp', description: '当前生命值', codePath: 'player.hp', required: true },
  { fieldName: 'maxHp', fieldType: 'number', defaultValue: 100, range: '> 0', description: '最大生命值', codePath: 'player.maxHp', required: true },
  { fieldName: 'damage', fieldType: 'number', defaultValue: 10, range: '> 0', description: '武器基础伤害', codePath: 'player.damage', required: true },
  { fieldName: 'fireRate', fieldType: 'number', defaultValue: 400, range: '> 50 (ms)', description: '射击间隔（毫秒）', codePath: 'player.fireRate', required: true },
  { fieldName: 'lastShot', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '上次射击时间戳(ms)', codePath: 'player.lastShot', required: true },
  { fieldName: 'weapon', fieldType: "WeaponType", defaultValue: "'pistol'", range: "'pistol' | 'smg' | 'sniper' | 'shotgun' | 'rpg'", description: '当前武器类型', codePath: 'player.weapon', required: true },
  { fieldName: 'weaponLevel', fieldType: 'number', defaultValue: 1, range: '>= 1', description: '当前武器等级', codePath: 'player.weaponLevel', required: true },
  { fieldName: 'weapons', fieldType: "WeaponType[]", defaultValue: "['pistol']", range: 'WeaponType数组', description: '已解锁的武器列表', codePath: 'player.weapons', required: true },
  { fieldName: 'currentWeaponIndex', fieldType: 'number', defaultValue: 0, range: '0 ~ weapons.length-1', description: '当前武器在数组中的索引', codePath: 'player.currentWeaponIndex', required: true },
  { fieldName: 'currentAmmo', fieldType: 'number', defaultValue: 12, range: '0 ~ magazineSize', description: '当前弹夹剩余弹药', codePath: 'player.currentAmmo', required: true },
  { fieldName: 'weaponAmmo', fieldType: 'Record<WeaponType, number>', defaultValue: '{}', range: '正整数映射', description: '各武器的弹药记录', codePath: 'player.weaponAmmo', required: true },
  { fieldName: 'isReloading', fieldType: 'boolean', defaultValue: false, range: 'true | false', description: '是否正在换弹', codePath: 'player.isReloading', required: true },
  { fieldName: 'reloadStartTime', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '换弹开始时间戳(ms)', codePath: 'player.reloadStartTime', required: true },
  { fieldName: 'reloadInterrupted', fieldType: 'boolean', defaultValue: false, range: 'true | false', description: '换弹是否被中断', codePath: 'player.reloadInterrupted', required: true },
  { fieldName: 'weaponRange', fieldType: 'number', defaultValue: 400, range: '> 0 (px)', description: '子弹最大射程(像素)', codePath: 'player.weaponRange', required: true },
  { fieldName: 'bulletSpeed', fieldType: 'number', defaultValue: 10, range: '> 0', description: '子弹飞行速度', codePath: 'player.bulletSpeed', required: true },
  { fieldName: 'critRate', fieldType: 'number', defaultValue: 0.05, range: '0 ~ 1', description: '暴击率(0.05=5%)', codePath: 'player.critRate', required: true },
  { fieldName: 'penetration', fieldType: 'number', defaultValue: 0, range: '0 ~ 5', description: '穿透数量(0=不穿透)', codePath: 'player.penetration', required: true },
  { fieldName: 'playerSpeed', fieldType: 'number', defaultValue: 2.5, range: '> 0', description: '当前移动速度(像素/帧)', codePath: 'player.playerSpeed', required: true },
  { fieldName: 'magazineSizeBonus', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '弹夹容量加成', codePath: 'player.magazineSizeBonus', required: true },
  { fieldName: 'playerSpeedBonus', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '移动速度加成(百分比)', codePath: 'player.playerSpeedBonus', required: true },
  { fieldName: 'reloadTimeBonus', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '换弹速度加成(百分比)', codePath: 'player.reloadTimeBonus', required: true },
  { fieldName: 'rangeBonus', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '射程加成(像素)', codePath: 'player.rangeBonus', required: true },
  { fieldName: 'penetrationBonus', fieldType: 'number', defaultValue: 0, range: '0 ~ 5', description: '穿透加成', codePath: 'player.penetrationBonus', required: true },
  { fieldName: 'bulletSpeedBonus', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '子弹速度加成(百分比)', codePath: 'player.bulletSpeedBonus', required: true },
  { fieldName: 'coinPickupRangeBonus', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '金币拾取范围加成(百分比)', codePath: 'player.coinPickupRangeBonus', required: true },
  { fieldName: 'gold', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '持有金币数', codePath: 'player.gold', required: true },
  { fieldName: 'kills', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '击杀敌人总数', codePath: 'player.kills', required: true },
  { fieldName: 'isHit', fieldType: 'boolean', defaultValue: false, range: 'true | false', description: '是否被击中(闪烁效果)', codePath: 'player.isHit', required: true },
  { fieldName: 'hitTime', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '被击中时间戳(ms)', codePath: 'player.hitTime', required: true },
  { fieldName: 'fireBuffLevel', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '引火buff等级', codePath: 'player.fireBuffLevel', required: true },
  { fieldName: 'poisonBuffLevel', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '淬毒buff等级', codePath: 'player.poisonBuffLevel', required: true },
  { fieldName: 'energyAuraLevel', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '能量气场buff等级', codePath: 'player.energyAuraLevel', required: true },
  { fieldName: 'executionBuffLevel', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '处决buff等级', codePath: 'player.executionBuffLevel', required: true },
  { fieldName: 'criticalRageLevel', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '暴怒buff等级', codePath: 'player.criticalRageLevel', required: true },
  { fieldName: 'vampireLevel', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '吸血buff等级', codePath: 'player.vampireLevel', required: true },
  { fieldName: 'ammoSupplyLevel', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '弹药补充buff等级', codePath: 'player.ammoSupplyLevel', required: true },
  { fieldName: 'desperateFightLevel', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '险中取胜buff等级', codePath: 'player.desperateFightLevel', required: true },
  { fieldName: 'growthChainNodes', fieldType: "GrowthChainNodeId[]", defaultValue: '[]', range: 'GrowthChainNodeId数组', description: '已获得的成长链节点ID列表', codePath: 'player.growthChainNodes', required: true },
  { fieldName: 'isSwitchingWeapon', fieldType: 'boolean', defaultValue: false, range: 'true | false', description: '是否正在切换武器', codePath: 'player.isSwitchingWeapon', required: true },
  { fieldName: 'weaponSwitchStartTime', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '武器切换开始时间戳(ms)', codePath: 'player.weaponSwitchStartTime', required: true },
];

// ============================================================
// Sheet 2: WeaponConfig 接口字段定义
// ============================================================
const weaponConfigFields: ConfigField[] = [
  { fieldName: 'id', fieldType: 'WeaponType', defaultValue: "'pistol'", range: '唯一标识符', description: '武器唯一ID', codePath: 'WEAPONS[id].id', required: true },
  { fieldName: 'name', fieldType: 'string', defaultValue: "'手枪'", range: '任意字符串', description: '武器显示名称', codePath: 'WEAPONS[id].name', required: true },
  { fieldName: 'description', fieldType: 'string', defaultValue: "''", range: '任意字符串', description: '武器描述文本', codePath: 'WEAPONS[id].description', required: true },
  { fieldName: 'icon', fieldType: 'string', defaultValue: "'/assets/Pistol.png'", range: '图片路径', description: '武器图标路径(小)', codePath: 'WEAPONS[id].icon', required: true },
  { fieldName: 'showIcon', fieldType: 'string', defaultValue: "'/assets/Pistol_show.png'", range: '图片路径', description: '武器展示图片路径(大)', codePath: 'WEAPONS[id].showIcon', required: true },
  { fieldName: 'damage', fieldType: 'number', defaultValue: 10, range: '> 0', description: '单发伤害', codePath: 'WEAPONS[id].damage', required: true },
  { fieldName: 'fireRate', fieldType: 'number', defaultValue: 400, range: '> 50 (ms)', description: '射击间隔(毫秒),越小越快', codePath: 'WEAPONS[id].fireRate', required: true },
  { fieldName: 'magazineSize', fieldType: 'number', defaultValue: 12, range: '> 0', description: '弹夹容量', codePath: 'WEAPONS[id].magazineSize', required: true },
  { fieldName: 'bulletRange', fieldType: 'number', defaultValue: 400, range: '> 0 (px)', description: '子弹最大飞行距离(像素)', codePath: 'WEAPONS[id].bulletRange', required: true },
  { fieldName: 'bulletSpeed', fieldType: 'number', defaultValue: 10, range: '> 0', description: '子弹每帧移动像素数', codePath: 'WEAPONS[id].bulletSpeed', required: true },
  { fieldName: 'critRate', fieldType: 'number', defaultValue: 0.05, range: '0 ~ 1', description: '暴击概率(0.05=5%)', codePath: 'WEAPONS[id].critRate', required: true },
  { fieldName: 'playerSpeedBonus', fieldType: 'number', defaultValue: 0.5, range: '可负数', description: '装备时移速加成(负数为减速)', codePath: 'WEAPONS[id].playerSpeedBonus', required: true },
  { fieldName: 'isLongGun', fieldType: 'boolean', defaultValue: false, range: 'true | false', description: '是否为长枪(影响绘制偏移)', codePath: 'WEAPONS[id].isLongGun', required: true },
  { fieldName: 'basePrice', fieldType: 'number', defaultValue: 2, range: '> 0', description: '商店购买价格', codePath: 'WEAPONS[id].basePrice', required: true },
  { fieldName: 'levelPriceFactor', fieldType: 'number', defaultValue: 2, range: '> 0', description: '升级价格增量系数', codePath: 'WEAPONS[id].levelPriceFactor', required: true },
];

// ============================================================
// Sheet 3: BuffConfig 接口字段定义
// ============================================================
const buffConfigFields: ConfigField[] = [
  { fieldName: 'id', fieldType: 'UpgradeType', defaultValue: "'fireBuff'", range: 'UpgradeType枚举', description: 'Buff唯一ID', codePath: 'BUFFS[id].id', required: true },
  { fieldName: 'name', fieldType: 'string', defaultValue: "'引火'", range: '任意字符串', description: 'Buff名称', codePath: 'BUFFS[id].name', required: true },
  { fieldName: 'description', fieldType: 'string', defaultValue: "''", range: '任意字符串', description: 'Buff效果描述', codePath: 'BUFFS[id].description', required: true },
  { fieldName: 'icon', fieldType: 'string', defaultValue: "'/assets/fire.png'", range: '图片路径', description: 'Buff图标路径', codePath: 'BUFFS[id].icon', required: true },
  { fieldName: 'basePrice', fieldType: 'number', defaultValue: 20, range: '>= 0 或 特殊', description: '基础购买价格(0表示特殊公式)', codePath: 'BUFFS[id].basePrice', required: true },
  { fieldName: 'levelPriceFactor', fieldType: 'number', defaultValue: 15, range: '>= 0', description: '等级价格增量(0表示特殊公式)', codePath: 'BUFFS[id].levelPriceFactor', required: true },
  { fieldName: 'priceFormula', fieldType: '(level: number) => number', defaultValue: 'null', range: '函数或null', description: '自定义价格计算函数(优先于basePrice+levelPriceFactor*level)', codePath: 'BUFFS[id].priceFormula', required: false },
  { fieldName: 'applyEffect', fieldType: '(player: Player) => Player', defaultValue: 'null', range: '函数', description: '应用效果的回调函数', codePath: 'BUFFS[id].applyEffect', required: true },
  { fieldName: 'hasGrowthChain', fieldType: 'boolean', defaultValue: false, range: 'true | false', description: '是否有成长链系统', codePath: 'BUFFS[id].hasGrowthChain', required: true },
];

// ============================================================
// Sheet 4: GrowthChainNode 接口字段定义
// ============================================================
const growthChainFields: ConfigField[] = [
  { fieldName: 'id', fieldType: 'GrowthChainNodeId', defaultValue: "'poison_circle_expand_1'", range: '唯一标识符', description: '成长链节点ID', codePath: 'GROWTH_CHAIN_NODES[id].id', required: true },
  { fieldName: 'name', fieldType: 'string', defaultValue: "'毒圈扩大I'", range: '任意字符串', description: '节点名称', codePath: 'GROWTH_CHAIN_NODES[id].name', required: true },
  { fieldName: 'description', fieldType: 'string', defaultValue: "''", range: '任意字符串', description: '节点效果描述', codePath: 'GROWTH_CHAIN_NODES[id].description', required: true },
  { fieldName: 'tier', fieldType: 'number', defaultValue: 1, range: '1 | 2 | 3', description: '段位(1=初级,2=中级,3=高级)', codePath: 'GROWTH_CHAIN_NODES[id].tier', required: true },
  { fieldName: 'baseBuffId', fieldType: 'UpgradeType', defaultValue: "'poisonBuff'", range: 'UpgradeType枚举', description: '所属的基础Buff ID', codePath: 'GROWTH_CHAIN_NODES[id].baseBuffId', required: true },
  { fieldName: 'unlockCondition', fieldType: '(player: Player) => boolean', defaultValue: 'null', range: '函数', description: '解锁条件判断函数', codePath: 'GROWTH_CHAIN_NODES[id].unlockCondition', required: true },
  { fieldName: 'weight', fieldType: 'number', defaultValue: 100, range: '> 0', description: '出现权重(越高越容易出现)', codePath: 'GROWTH_CHAIN_NODES[id].weight', required: true },
  { fieldName: 'priceFormula', fieldType: '(level: number) => number', defaultValue: 'null', range: '函数', description: '价格计算函数(level为当前关卡)', codePath: 'GROWTH_CHAIN_NODES[id].priceFormula', required: true },
  { fieldName: 'applyEffect', fieldType: '(player: Player) => Player', defaultValue: 'null', range: '函数', description: '应用效果的回调函数', codePath: 'GROWTH_CHAIN_NODES[id].applyEffect', required: true },
];

// ============================================================
// Sheet 5: ShopItem 接口字段定义
// ============================================================
const shopItemFields: ConfigField[] = [
  { fieldName: 'id', fieldType: 'string', defaultValue: "''", range: '唯一字符串', description: '商品唯一ID', codePath: 'shopItem.id', required: true },
  { fieldName: 'type', fieldType: "'upgrade' | 'weapon' | 'growthChain'", defaultValue: "'upgrade'", range: '枚举值', description: '商品类型', codePath: 'shopItem.type', required: true },
  { fieldName: 'upgradeId', fieldType: 'UpgradeType | null', defaultValue: 'null', range: 'UpgradeType或null', description: '升级/Buff的ID(type为upgrade/growthChain时使用)', codePath: 'shopItem.upgradeId', required: false },
  { fieldName: 'weaponId', fieldType: 'WeaponType | null', defaultValue: 'null', range: 'WeaponType或null', description: '武器ID(type为weapon时使用)', codePath: 'shopItem.weaponId', required: false },
  { fieldName: 'growthChainNode', fieldType: 'GrowthChainNodeId | null', defaultValue: 'null', range: 'GrowthChainNodeId或null', description: '成长链节点ID(type为growthChain时使用)', codePath: 'shopItem.growthChainNode', required: false },
  { fieldName: 'name', fieldType: 'string', defaultValue: "''", range: '任意字符串', description: '商品显示名称', codePath: 'shopItem.name', required: true },
  { fieldName: 'description', fieldType: 'string', defaultValue: "''", range: '任意字符串', description: '商品描述', codePath: 'shopItem.description', required: true },
  { fieldName: 'icon', fieldType: 'string', defaultValue: "''", range: '图片路径', description: '商品图标路径', codePath: 'shopItem.icon', required: true },
  { fieldName: 'price', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '商品价格(金币)', codePath: 'shopItem.price', required: true },
  { fieldName: 'isLocked', fieldType: 'boolean', defaultValue: false, range: 'true | false', description: '是否被锁定(需要先买其他商品解锁)', codePath: 'shopItem.isLocked', required: true },
  { fieldName: 'lockedBy', fieldType: 'string[]', defaultValue: '[]', range: '字符串数组', description: '锁定此商品的依赖商品ID列表', codePath: 'shopItem.lockedBy', required: true },
];

// ============================================================
// Sheet 6: Upgrade 接口字段定义
// ============================================================
const upgradeFields: ConfigField[] = [
  { fieldName: 'id', fieldType: 'UpgradeType', defaultValue: "'fireRate'", range: 'UpgradeType枚举', description: '升级项唯一ID', codePath: 'upgrade.id', required: true },
  { fieldName: 'name', fieldType: 'string', defaultValue: "'射速'", range: '任意字符串', description: '升级项名称', codePath: 'upgrade.name', required: true },
  { fieldName: 'description', fieldType: 'string', defaultValue: "''", range: '任意字符串', description: '升级效果描述', codePath: 'upgrade.description', required: true },
  { fieldName: 'icon', fieldType: 'string', defaultValue: "''", range: '图片路径', description: '升级项图标路径', codePath: 'upgrade.icon', required: true },
  { fieldName: 'currentLevel', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '当前等级', codePath: 'upgrade.currentLevel', required: true },
  { fieldName: 'nextLevelPrice', fieldType: 'number', defaultValue: 0, range: '>= 0', description: '下一级升级所需金币', codePath: 'upgrade.nextLevelPrice', required: true },
  { fieldName: 'maxLevel', fieldType: 'number', defaultValue: -1, range: '-1(无限制) 或 >0', description: '最大等级(-1表示无限制)', codePath: 'upgrade.maxLevel', required: true },
  { fieldName: 'isPercentage', fieldType: 'boolean', defaultValue: false, range: 'true | false', description: '是否为百分比加成', codePath: 'upgrade.isPercentage', required: true },
  { fieldName: 'valuePerLevel', fieldType: 'number', defaultValue: 0, range: '任意数值', description: '每级增加的数值', codePath: 'upgrade.valuePerLevel', required: true },
  { fieldName: 'effectDescription', fieldType: 'string', defaultValue: "''", range: '任意字符串', description: '效果描述模板(如"+{value}伤害")', codePath: 'upgrade.effectDescription', required: true },
];

// ============================================================
// Sheet 7: MonsterConfig 接口字段定义
// ============================================================
const monsterConfigFields: ConfigField[] = [
  { fieldName: 'id', fieldType: 'string', defaultValue: "'normal'", range: '唯一标识符', description: '怪物类型ID', codePath: 'MONSTER_CONFIGS[id].id', required: true },
  { fieldName: 'name', fieldType: 'string', defaultValue: "'普通怪'", range: '任意字符串', description: '怪物名称', codePath: 'MONSTER_CONFIGS[id].name', required: true },
  { fieldName: 'color', fieldType: 'string', defaultValue: "'#ff4444'", range: 'CSS颜色值', description: '怪物颜色', codePath: 'MONSTER_CONFIGS[id].color', required: true },
  { fieldName: 'size', fieldType: 'number', defaultValue: 15, range: '> 0 (px)', description: '怪物半径(像素)', codePath: 'MONSTER_CONFIGS[id].size', required: true },
  { fieldName: 'speed', fieldType: 'number', defaultValue: 1.5, range: '> 0', description: '基础移动速度', codePath: 'MONSTER_CONFIGS[id].speed', required: true },
  { fieldName: 'hp', fieldType: 'number', defaultValue: 30, range: '> 0', description: '基础生命值', codePath: 'MONSTER_CONFIGS[id].hp', required: true },
  { fieldName: 'damage', fieldType: 'number', defaultValue: 10, range: '> 0', description: '接触伤害', codePath: 'MONSTER_CONFIGS[id].damage', required: true },
  { fieldName: 'weight', fieldType: 'number', defaultValue: 60, range: '> 0', description: '出现权重(越高越常见)', codePath: 'MONSTER_CONFIGS[id].weight', required: true },
  { fieldName: 'goldDrop', fieldType: 'number', defaultValue: 3, range: '>= 0', description: '掉落金币数', codePath: 'MONSTER_CONFIGS[id].goldDrop', required: true },
  { fieldName: 'scoreValue', fieldType: 'number', defaultValue: 10, range: '>= 0', description: '击杀得分', codePath: 'MONSTER_CONFIGS[id].scoreValue', required: true },
  { fieldName: 'expReward', fieldType: 'number', defaultValue: 5, range: '>= 0', description: '经验奖励', codePath: 'MONSTER_CONFIGS[id].expReward', required: true },
  { fieldName: 'canBePoisoned', fieldType: 'boolean', defaultValue: true, range: 'true | false', description: '是否可中毒', codePath: 'MONSTER_CONFIGS[id].canBePoisoned', required: true },
  { fieldName: 'canBeIgnited', fieldType: 'boolean', defaultValue: true, range: 'true | false', description: '是否可点燃', codePath: 'MONSTER_CONFIGS[id].canBeIgnited', required: true },
  { fieldName: 'isBoss', fieldType: 'boolean', defaultValue: false, range: 'true | false', description: '是否为Boss', codePath: 'MONSTER_CONFIGS[id].isBoss', required: true },
];

// ============================================================
// Sheet 8: GAME_CONFIG 常量配置
// ============================================================
const gameConfigFields: ConfigField[] = [
  { fieldName: 'CANVAS_WIDTH', fieldType: 'number', defaultValue: 800, range: '> 0', description: '画布宽度(像素)', codePath: 'GAME_CONFIG.CANVAS_WIDTH', required: true },
  { fieldName: 'CANVAS_HEIGHT', fieldType: 'number', defaultValue: 600, range: '> 0', description: '画布高度(像素)', codePath: 'GAME_CONFIG.CANVAS_HEIGHT', required: true },
  { fieldName: 'PLAYER_SIZE', fieldType: 'number', defaultValue: 18, range: '> 0', description: '玩家碰撞半径(像素)', codePath: 'GAME_CONFIG.PLAYER_SIZE', required: true },
  { fieldName: 'BULLET_SIZE', fieldType: 'number', defaultValue: 6, range: '> 0', description: '子弹半径(像素)', codePath: 'GAME_CONFIG.BULLET_SIZE', required: true },
  { fieldName: 'COIN_SIZE', fieldType: 'number', defaultValue: 12, range: '> 0', description: '金币拾取半径(像素)', codePath: 'GAME_CONFIG.COIN_SIZE', required: true },
  { fieldName: 'ENEMY_SPAWN_INTERVAL', fieldType: 'number', defaultValue: 2000, range: '> 0 (ms)', description: '敌人生成间隔(毫秒)', codePath: 'GAME_CONFIG.ENEMY_SPAWN_INTERVAL', required: true },
  { fieldName: 'SHOP_ITEM_COUNT', fieldType: 'number', defaultValue: 4, range: '1 ~ 8', description: '商店每次显示商品数', codePath: 'GAME_CONFIG.SHOP_ITEM_COUNT', required: true },
  { fieldName: 'UPGRADE_COUNT', fieldType: 'number', defaultValue: 3, range: '1 ~ 6', description: '升级界面选项数', codePath: 'GAME_CONFIG.UPGRADE_COUNT', required: true },
  { fieldName: 'BOSS_SPAWN_KILL_THRESHOLD', fieldType: 'number', defaultValue: 30, range: '> 0', description: 'Boss出现所需击杀数', codePath: 'GAME_CONFIG.BOSS_SPAWN_KILL_THRESHOLD', required: true },
  { fieldName: 'MAX_LEVEL', fieldType: 'number', defaultValue: 20, range: '> 0', description: '游戏最大关卡数', codePath: 'GAME_CONFIG.MAX_LEVEL', required: true },
  { fieldName: 'POISON_BASE_DURATION', fieldType: 'number', defaultValue: 5000, range: '> 0 (ms)', description: '淬毒基础持续时间(毫秒)', codePath: 'GAME_CONFIG.POISON_BASE_DURATION', required: true },
  { fieldName: 'POISON_BASE_DAMAGE', fieldType: 'number', defaultValue: 2, range: '> 0', description: '淬毒基础每秒伤害', codePath: 'GAME_CONFIG.POISON_BASE_DAMAGE', required: true },
  { fieldName: 'POISON_CIRCLE_RADIUS', fieldType: 'number', defaultValue: 80, range: '> 0 (px)', description: '淬毒毒圈基础半径(像素)', codePath: 'GAME_CONFIG.POISON_CIRCLE_RADIUS', required: true },
  { fieldName: 'FIRE_BASE_DURATION', fieldType: 'number', defaultValue: 3000, range: '> 0 (ms)', description: '引火基础持续时间(毫秒)', codePath: 'GAME_CONFIG.FIRE_BASE_DURATION', required: true },
  { fieldName: 'FIRE_BASE_DAMAGE', fieldType: 'number', defaultValue: 3, range: '> 0', description: '引火基础每秒伤害', codePath: 'GAME_CONFIG.FIRE_BASE_DAMAGE', required: true },
  { fieldName: 'ENERGY_AURA_RADIUS', fieldType: 'number', defaultValue: 120, range: '> 0 (px)', description: '能量气场半径(像素)', codePath: 'GAME_CONFIG.ENERGY_AURA_RADIUS', required: true },
  { fieldName: 'ENERGY_AURA_DAMAGE', fieldType: 'number', defaultValue: 5, range: '> 0', description: '能量气场每秒伤害', codePath: 'GAME_CONFIG.ENERGY_AURA_DAMAGE', required: true },
  { fieldName: 'VAMPIRE_HEAL_PERCENT', fieldType: 'number', defaultValue: 0.05, range: '0 ~ 1', description: '吸血回复比例(0.05=5%伤害转回血)', codePath: 'GAME_CONFIG.VAMPIRE_HEAL_PERCENT', required: true },
  { fieldName: 'CRITICAL_RAGE_RANGE', fieldType: 'number', defaultValue: 100, range: '> 0 (px)', description: '暴怒范围伤害半径', codePath: 'GAME_CONFIG.CRITICAL_RAGE_RANGE', required: true },
  { fieldName: 'CRITICAL_RAGE_RATIO', fieldType: 'number', defaultValue: 0.5, range: '0 ~ 1', description: '暴怒范围伤害比例(相对于暴击伤害)', codePath: 'GAME_CONFIG.CRITICAL_RAGE_RATIO', required: true },
  { fieldName: 'EXECUTION_THRESHOLD', fieldType: 'number', defaultValue: 0.25, range: '0 ~ 1', description: '处决触发血量阈值(0.25=25%血量以下)', codePath: 'GAME_CONFIG.EXECUTION_THRESHOLD', required: true },
  { fieldName: 'EXECUTION_MULTIPLIER', fieldType: 'number', defaultValue: 2.0, range: '> 1', description: '处决伤害倍率', codePath: 'GAME_CONFIG.EXECUTION_MULTIPLIER', required: true },
  { fieldName: 'DESPERATE_FIGHT_MAX_BONUS', fieldType: 'number', defaultValue: 2.0, range: '> 1', description: '险中取胜最大伤害倍率(1血时)', codePath: 'GAME_CONFIG.DESPERATE_FIGHT_MAX_BONUS', required: true },
];

// ============================================================
// Sheet 9: 枚举类型定义
// ============================================================
const enumData = [
  ['枚举名', '枚举值', '说明'],
  ['WeaponType', "'pistol'", '手枪'],
  ['WeaponType', "'smg'", '冲锋枪'],
  ['WeaponType', "'sniper'", '狙击枪'],
  ['WeaponType', "'shotgun'", '散弹枪'],
  ['WeaponType', "'rpg'", '火箭筒'],
  ['', '', ''],
  ['UpgradeType', "'magazineSize'", '弹夹容量'],
  ['UpgradeType', "'fireRate'", '射速'],
  ['UpgradeType', "'damage'", '伤害'],
  ['UpgradeType', "'playerSpeed'", '移动速度'],
  ['UpgradeType', "'reloadTime'", '换弹速度'],
  ['UpgradeType', "'weaponRange'", '射程'],
  ['UpgradeType', "'maxHp'", '生命上限'],
  ['UpgradeType', "'penetration'", '穿透力'],
  ['UpgradeType', "'bulletSpeed'", '子弹速度'],
  ['UpgradeType', "'coinPickupRange'", '金币拾取范围'],
  ['', '', ''],
  ['UpgradeType', "'fireBuff'", '引火Buff'],
  ['UpgradeType', "'poisonBuff'", '淬毒Buff'],
  ['UpgradeType', "'energyAura'", '能量气场Buff'],
  ['UpgradeType', "'executionBuff'", '处决Buff'],
  ['UpgradeType', "'criticalRage'", '暴怒Buff'],
  ['UpgradeType', "'vampire'", '吸血Buff'],
  ['UpgradeType', "'ammoSupply'", '弹药补充Buff'],
  ['UpgradeType', "'desperateFight'", '险中取胜Buff'],
  ['', '', ''],
  ['GrowthChainNodeId', "'poison_circle_expand_1'", '毒圈扩大I (Tier 1)'],
  ['GrowthChainNodeId', "'poison_enhance_1'", '毒性增强I (Tier 1)'],
  ['GrowthChainNodeId', "'poison_toxic_2'", '剧毒II (Tier 2)'],
  ['GrowthChainNodeId', "'poison_infection_2'", '传染II (Tier 2)'],
  ['GrowthChainNodeId', "'poison_circle_expand_2'", '毒圈扩大II (Tier 2)'],
  ['GrowthChainNodeId', "'poison_faster_2'", '剧毒III (Tier 2)'],
  ['GrowthChainNodeId', "'poison_absorb_3'", '剧毒吸收I (Tier 3)'],
  ['', '', ''],
  ['GameState', "'menu'", '主菜单'],
  ['GameState', "'playing'", '游戏中'],
  ['GameState', "'paused'", '暂停'],
  ['GameState', "'shop'", '商店'],
  ['GameState', "'upgrade'", '升级选择'],
  ['GameState', "'gameover'", '游戏结束'],
  ['GameState', "'victory'", '胜利'],
];

// ============================================================
// 创建工作簿
// ============================================================
const workbook = XLSX.utils.book_new();

function createSheet(fields: ConfigField[], sheetName: string) {
  const data = [
    ['字段名', 'TypeScript类型', '默认值', '取值范围/约束', '说明', '代码引用路径', '是否必填'],
    ...fields.map(f => [
      f.fieldName,
      f.fieldType,
      typeof f.defaultValue === 'object' ? JSON.stringify(f.defaultValue) : String(f.defaultValue),
      f.range || '-',
      f.description,
      f.codePath,
      f.required ? '是' : '否'
    ])
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [{ wch: 28 }, { wch: 35 }, { wch: 22 }, { wch: 25 }, { wch: 40 }, { wch: 28 }, { wch: 10 }];
  
  // 设置表头样式
  sheet['!rows'] = [{ hpt: 20 }];
  return sheet;
}

XLSX.utils.book_append_sheet(workbook, createSheet(playerFields, 'Player接口'), 'Player接口');
XLSX.utils.book_append_sheet(workbook, createSheet(weaponConfigFields, 'WeaponConfig接口'), 'WeaponConfig接口');
XLSX.utils.book_append_sheet(workbook, createSheet(buffConfigFields, 'BuffConfig接口'), 'BuffConfig接口');
XLSX.utils.book_append_sheet(workbook, createSheet(growthChainFields, 'GrowthChainNode接口'), 'GrowthChainNode接口');
XLSX.utils.book_append_sheet(workbook, createSheet(shopItemFields, 'ShopItem接口'), 'ShopItem接口');
XLSX.utils.book_append_sheet(workbook, createSheet(upgradeFields, 'Upgrade接口'), 'Upgrade接口');
XLSX.utils.book_append_sheet(workbook, createSheet(monsterConfigFields, 'MonsterConfig接口'), 'MonsterConfig接口');
XLSX.utils.book_append_sheet(workbook, createSheet(gameConfigFields, 'GAME_CONFIG常量'), 'GAME_CONFIG常量');

const enumSheet = XLSX.utils.aoa_to_sheet(enumData);
enumSheet['!cols'] = [{ wch: 22 }, { wch: 32 }, { wch: 30 }];
XLSX.utils.book_append_sheet(workbook, enumSheet, '枚举类型定义');

// 保存文件
const outputPath = path.join(process.cwd(), 'public/assets/buff_config.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`✅ 程序级配置表已生成: ${outputPath}`);
console.log('\n📊 包含工作表:');
console.log('  1. Player接口 - 44个字段');
console.log('  2. WeaponConfig接口 - 16个字段');
console.log('  3. BuffConfig接口 - 9个字段');
console.log('  4. GrowthChainNode接口 - 10个字段');
console.log('  5. ShopItem接口 - 12个字段');
console.log('  6. Upgrade接口 - 11个字段');
console.log('  7. MonsterConfig接口 - 14个字段');
console.log('  8. GAME_CONFIG常量 - 24个配置项');
console.log('  9. 枚举类型定义 - 所有枚举值');
