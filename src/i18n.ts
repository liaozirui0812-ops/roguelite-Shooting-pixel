// 全局多语言字典：key -> { zh, en }
// 页面通过 t(key) 读取当前语言文本
export type Language = 'zh' | 'en';

export const DEFAULT_LANGUAGE: Language = 'zh';

export const LOCALE_STORAGE_KEY = 'pixel_battle_language';

interface Entry { zh: string; en: string }

const dict: Record<string, Entry> = {
  // ===== 主菜单 =====
  menu: { zh: '主菜单', en: 'Main Menu' },
  startGame: { zh: '开始游戏', en: 'Start Game' },
  continueGame: { zh: '继续游戏', en: 'Continue' },
  buffPreview: { zh: 'Buff预览', en: 'Buff Preview' },
  settings: { zh: '设置', en: 'Settings' },
  settingsHint: { zh: '这里可以查看游戏设置', en: 'Adjust game settings here' },

  // ===== 设置 =====
  soundVolume: { zh: '音效音量', en: 'Sound Volume' },
  musicVolume: { zh: '音乐音量', en: 'Music Volume' },
  mute: { zh: '静音', en: 'Mute' },
  maxVolume: { zh: '最大', en: 'Max' },
  clickToUnmute: { zh: '点击解除静音', en: 'Click to unmute' },
  clickToMute: { zh: '点击静音', en: 'Click to mute' },
  closeHint: { zh: '关闭', en: 'Close' },
  language: { zh: '语言', en: 'Language' },
  languageZh: { zh: '中文', en: 'Chinese' },
  languageEn: { zh: '英文', en: 'English' },

  // ===== 武器选择 =====
  chooseWeapon: { zh: '选择初始武器', en: 'Choose Starting Weapon' },
  weaponHint: { zh: '每种武器都有独特的特性', en: 'Each weapon has unique traits' },
  backToMenu: { zh: '返回菜单', en: 'Back to Menu' },

  // ===== 升级 =====
  levelComplete: { zh: '关卡完成！', en: 'Level Complete!' },
  chooseUpgrade: { zh: '选择一个升级奖励', en: 'Choose an upgrade' },
  refresh: { zh: '刷新', en: 'Refresh' },

  // ===== 商店 =====
  shop: { zh: '商店', en: 'Shop' },
  gold: { zh: '金币', en: 'Gold' },
  unlock: { zh: '解锁', en: 'Unlock' },
  lock: { zh: '锁定', en: 'Lock' },
  exitShop: { zh: '退出商店', en: 'Exit Shop' },

  // ===== 游戏结束 =====
  gameover: { zh: '游戏结束', en: 'Game Over' },
  finalLevel: { zh: '最终关卡', en: 'Final Level' },
  finalScore: { zh: '最终分数', en: 'Final Score' },
  restart: { zh: '重新开始', en: 'Restart' },

  // ===== BOSS =====
  slimeKing: { zh: '史莱姆王', en: 'Slime King' },

  // ===== 操作提示 =====
  controlHint: { zh: 'WASD / 方向键 移动 | 鼠标瞄准 | 左键射击 | 躲避红色怪物！', en: 'WASD / Arrows move | Mouse aim | LMB shoot | Avoid red monsters!' },

  // ===== 武器名称 =====
  weapon_pistol: { zh: '手枪', en: 'Pistol' },
  weapon_smg: { zh: '冲锋枪', en: 'SMG' },
  weapon_sniper: { zh: '狙击枪', en: 'Sniper' },
  weapon_shotgun: { zh: '散弹枪', en: 'Shotgun' },
  weapon_rpg: { zh: '火箭筒', en: 'RPG' },

  // ===== 怪物类型 =====
  monster_1: { zh: '标准敌人', en: 'Grunt' },
  monster_2: { zh: '中型敌人', en: 'Brute' },
  monster_3: { zh: '大型敌人', en: 'Behemoth' },
  monster_4: { zh: '远程敌人', en: 'Shooter' },
  monster_5: { zh: '史莱姆王', en: 'Slime King' },

  // ===== 游戏标题 / 加载 =====
  game_title: { zh: '末日幸存者', en: 'Pixel Survivor' },
  game_subtitle: { zh: '像素风生存射击', en: 'Pixel Survival Shooter' },
  loading: { zh: '加载中...', en: 'Loading...' },
  loading_click_to_start: { zh: '点击任意位置进入', en: 'Click anywhere to enter' },
  menu_title: { zh: '主菜单', en: 'Main Menu' },
  menu_controls: { zh: '操作方式：WASD 移动 | 鼠标瞄准 | 左键射击', en: 'Controls: WASD move | mouse aim | LMB shoot' },
  menu_highScore: { zh: '历史最高分', en: 'Best Score' },
  menu_start: { zh: '开始游戏', en: 'Start Game' },
  menu_buffPreview: { zh: 'Buff预览', en: 'Buff Preview' },
  enable_sound: { zh: '开启声音', en: 'Enable Sound' },
  max: { zh: '最大', en: 'Max' },
  clickMute: { zh: '点击静音', en: 'Click to mute' },
  clickUnmute: { zh: '点击解除静音', en: 'Click to unmute' },

  // ===== 战斗 HUD =====
  ammo: { zh: '弹药', en: 'Ammo' },
  reloading: { zh: '换弹中', en: 'Reloading' },
  switch_weapon_hint: { zh: '按 1~9 切换武器', en: 'Press 1~9 to switch weapon' },
  hp: { zh: '生命', en: 'HP' },
  level: { zh: '关卡', en: 'Level' },
  score: { zh: '分数', en: 'Score' },
  enemies: { zh: '剩余敌人', en: 'Enemies Left' },
  wave: { zh: '波次', en: 'Wave' },
  boss: { zh: 'BOSS', en: 'BOSS' },
  prepare: { zh: '准备阶段', en: 'Prepare' },
  paused: { zh: '已暂停', en: 'Paused' },

  // ===== 功能特性 =====
  feature_weapons: { zh: '多武器系统：手枪、冲锋枪、狙击枪、散弹枪、火箭筒 各有独特射击方式', en: 'Multi-weapon system: Pistol, SMG, Sniper, Shotgun, RPG with unique firing' },
  feature_upgrade_reward: { zh: '成长天赋：击败敌人获得升级奖励，构筑你的专属流派', en: 'Growth talents: defeat enemies for upgrade rewards, build your build' },
  feature_shop: { zh: '商店系统：通关后在商店购买强化，逐步变强', en: 'Shop: buy upgrades after clearing a level to grow stronger' },
  feature_buffs: { zh: '特殊Buff：引火、淬毒、暴怒、吸血等 12+ 种特效', en: 'Special buffs: Ignite, Poison, Rage, Vampire and 12+ effects' },
  feature_affix: { zh: '词缀怪：第4关起敌人随机携带狂暴/护盾/自爆词缀', en: 'Affix monsters: random Berserk/Shield/Self-destruct from level 4' },
  feature_knockback: { zh: '击退系统：击退敌人，掌控战场节奏', en: 'Knockback: push enemies back to control the battlefield' },
  feature_weaponUpgrade: { zh: '武器升级系统 - 提升武器等级，增强伤害/射速/射程', en: 'Weapon upgrade system - raise weapon level to boost damage/fire rate/range' },
  feature_crit: { zh: '暴击系统 - 暴击率/暴击伤害，带软上限机制', en: 'Crit system - crit chance/damage with soft caps' },
  feature_reload: { zh: '换弹机制 - 双曲线递减公式，最低250ms', en: 'Reload mechanic - hyperbolic curve, min 250ms' },
  feature_pierce: { zh: '穿透系统 - 子弹穿透多个敌人', en: 'Pierce system - bullets pierce multiple enemies' },
  feature_gold: { zh: '金币系统 - 击杀敌人掉落金币，用于商城购买', en: 'Gold system - enemies drop gold for shop purchases' },
  feature_chest: { zh: '宝箱系统 - 敌人死亡掉落宝箱，打开获得金币', en: 'Chest system - enemies drop chests that give gold' },
  feature_obstacle: { zh: '障碍物系统 - 地图随机生成障碍物', en: 'Obstacle system - random obstacles on the map' },
  feature_slowFocus: { zh: '敌方减速机制 - 减缓敌人移动速度', en: 'Slow mechanic - reduces enemy move speed' },
  feature_shooterEnemy: { zh: '远程敌人 - 敌人类型4可发射子弹攻击玩家', en: 'Ranged enemy - type-4 enemies shoot at the player' },
  feature_dmgNumbers: { zh: '伤害数字显示 - 实时显示造成的伤害', en: 'Damage numbers - show damage in real time' },
  feature_rocketExplosion: { zh: '火箭弹爆炸效果 - RPG武器专属爆炸特效', en: 'Rocket explosion - RPG weapon exclusive effect' },

  // ===== Buff预览面板 =====
  specialBuffPreviewTitle: { zh: '特殊 Buff 预览', en: 'Special Buff Preview' },
  generalBuffLabel: { zh: '通用 Buff', en: 'General Buffs' },
  weaponBuffLabel: { zh: '武器专属 Buff', en: 'Weapon-Specific Buffs' },

  // ===== 特殊Buff名称 =====
  buffIgniteName: { zh: '引火', en: 'Ignite' },
  buffPoisonName: { zh: '淬毒', en: 'Poison' },
  buffAuraName: { zh: '二次暴击', en: 'Aura Crit' },
  buffExecutionName: { zh: '处决', en: 'Execution' },
  buffRageName: { zh: '暴怒', en: 'Rage' },
  buffVampireName: { zh: '吸血', en: 'Vampire' },
  buffAmmoSupplyName: { zh: '弹药补给', en: 'Ammo Supply' },
  buffDesperateFightName: { zh: '险中取胜', en: 'Desperate Fight' },
  buffLastBulletName: { zh: '孤注一掷', en: 'Last Stand' },

  // ===== 特殊Buff描述 =====
  buffIgniteDesc: { zh: '攻击点燃敌人，持续灼烧叠层', en: 'Attacks ignite enemies with stacking burn' },
  buffPoisonDesc: { zh: '攻击使敌人中毒，持续掉血', en: 'Attacks poison enemies for damage over time' },
  buffAuraDesc: { zh: '有几率追击产生二次暴击', en: 'Chance to trigger a secondary crit strike' },
  buffExecutionDesc: { zh: '对低血量敌人造成处决伤害', en: 'Execute enemies below a HP threshold' },
  buffRageDesc: { zh: '血量越低，伤害与攻速越高', en: 'Lower HP grants more damage and attack speed' },
  buffVampireDesc: { zh: '造成伤害时按比例回复生命', en: 'Heal a percentage of damage dealt' },
  buffAmmoSupplyDesc: { zh: '击杀敌人有几率回复弹药', en: 'Kills have a chance to restore ammo' },
  buffDesperateFightDesc: { zh: '濒临死亡时获得大幅属性加成', en: 'Gain big stat boost when near death' },
  buffLastBulletDesc: { zh: '换弹更慢，但弹匣末三发伤害递增且必暴击', en: 'Slower reload; last 3 bullets deal more and always crit' },
  pistolName: { zh: '手枪', en: 'Pistol' },
  shotgunName: { zh: '散弹枪', en: 'Shotgun' },
  smgName: { zh: '冲锋枪', en: 'SMG' },
  sniperName: { zh: '狙击枪', en: 'Sniper' },
  rocketName: { zh: '火箭筒', en: 'RPG' },

  // ===== 暂停/属性面板 =====
  gamePaused: { zh: '游戏暂停', en: 'Game Paused' },
  resume: { zh: '继续游戏', en: 'Resume' },
  mainMenu: { zh: '返回主菜单', en: 'Main Menu' },
  statsPanel: { zh: '数值属性', en: 'Stats' },
  effectsPanel: { zh: '特殊效果', en: 'Effects' },
  effectsEmpty: { zh: '暂无特殊效果', en: 'No active effects' },
  effectsEmptyHint: { zh: '可在通关奖励或商店中获取引火、淬毒等', en: 'Obtain ignite/poison etc. via rewards or shop' },
  currentWeapon: { zh: '当前武器', en: 'Current Weapon' },
  weaponLv: { zh: '等级', en: 'Level' },
  statMaxHp: { zh: '生命上限', en: 'Max HP' },
  statDamage: { zh: '伤害', en: 'Damage' },
  statCritRate: { zh: '暴击率', en: 'Crit Rate' },
  statCritDamage: { zh: '暴击伤害', en: 'Crit Damage' },
  statFireRate: { zh: '射速', en: 'Fire Rate' },
  statMoveSpeed: { zh: '移动速度', en: 'Move Speed' },
  statRange: { zh: '武器射程', en: 'Weapon Range' },
  statPenetration: { zh: '穿透力', en: 'Penetration' },
  statMagazine: { zh: '弹夹容量', en: 'Magazine' },
  statReload: { zh: '换弹速度', en: 'Reload Speed' },
  statAmmo: { zh: '弹药', en: 'Ammo' },
  settingsTitle: { zh: '设置', en: 'Settings' },
  settingsBtn: { zh: '⚙ 设置', en: '⚙ Settings' },
  btnContinue: { zh: '继续游戏', en: 'Continue' },
  // 暂停面板属性（attr*）
  attrMaxHp: { zh: '生命上限', en: 'Max HP' },
  attrDamage: { zh: '伤害', en: 'Damage' },
  attrCritRate: { zh: '暴击率', en: 'Crit Rate' },
  attrCritDamage: { zh: '暴击伤害', en: 'Crit Damage' },
  attrFireRate: { zh: '射速', en: 'Fire Rate' },
  attrMoveSpeed: { zh: '移动速度', en: 'Move Speed' },
  attrRange: { zh: '射程', en: 'Range' },
  attrPenetration: { zh: '穿透力', en: 'Penetration' },
  attrMagazine: { zh: '弹夹容量', en: 'Magazine' },
  attrReload: { zh: '换弹速度', en: 'Reload Speed' },
  attrCoinPickup: { zh: '金币拾取', en: 'Coin Pickup' },
  // 特殊效果面板（effect*）
  effectIgniteTitle: { zh: '引火', en: 'Ignite' },
  effectPoisonTitle: { zh: '淬毒', en: 'Poison' },
  effectTriggerChance: { zh: '触发概率', en: 'Trigger Chance' },
  effectIgniteDps: { zh: '燃烧伤害', en: 'Burn DMG' },
  effectPoisonDps: { zh: '中毒伤害', en: 'Poison DMG' },
  effectPerLayerPerSec: { zh: '每层/秒', en: '/stack/s' },
  effectMaxStacks: { zh: '层数上限', en: 'Max Stacks' },
  effectUpTo5: { zh: '上限 5 层', en: 'up to 5' },
  effectSpreadRange: { zh: '传染范围', en: 'Spread Range' },
  effectSlow: { zh: '减速', en: 'Slow' },
  effectZoneRadius: { zh: '毒圈半径', en: 'Zone Radius' },
  effectZoneDps: { zh: '毒圈伤害', en: 'Zone DMG' },
  effectPerHalfSec: { zh: '每 0.5 秒', en: 'per 0.5s' },
  effectZoneLimit: { zh: '场上最多 3 个', en: 'Max 3 active' },
  effectEmpty: { zh: '暂无特殊效果', en: 'No special effects' },
  effectEmptyHint: { zh: '可在商店购买引火或淬毒', en: 'Buy Ignite or Poison in shop' },
  // 游戏 HUD（hud*）
  hudLevel: { zh: '关卡', en: 'Level' },
  hudScore: { zh: '得分', en: 'Score' },
  hudGold: { zh: '金币', en: 'Gold' },
  hudRemaining: { zh: '剩余', en: 'Left' },
  hudWeapon: { zh: '当前武器', en: 'Weapon' },
  hudRaw: { zh: '基础', en: 'Raw' },
  hudDamage: { zh: '伤害', en: 'Damage' },
  hudCritRate: { zh: '暴击率', en: 'Crit Rate' },
  hudCritDamage: { zh: '暴击伤害', en: 'Crit Damage' },
  hudFireRate: { zh: '射速', en: 'Fire Rate' },
  hudBulletSpeed: { zh: '子弹速度', en: 'Bullet Speed' },
  hudRange: { zh: '射程', en: 'Range' },
  hudPenetration: { zh: '穿透力', en: 'Penetration' },
  hudMoveSpeed: { zh: '移速', en: 'Move Speed' },
  hudReloadTime: { zh: '换弹时间', en: 'Reload Time' },
  sec: { zh: '秒', en: 's' },
  // 关闭按钮 title
  close: { zh: '关闭', en: 'Close' },
  // 主菜单特性列表
  feature_animation: { zh: '打击感炫酷、光影粒子特效丰富', en: 'Flashy hits, rich light & particle effects' },
  feature_boss: { zh: '多阶段BOSS战', en: 'Multi-stage boss battles' },
  feature_levelWeight: { zh: '关卡成长式数值体系', en: 'Progressive level-scaling stats' },
  feature_wave: { zh: '挑战更宏伟的敌人浪潮', en: 'Survive ever-bigger enemy waves' },
  waveTitle: { zh: '第{n}波', en: 'Wave {n}' },
  waveEnemies: { zh: '敌人数量：{n}', en: 'Enemies: {n}' },
  // 游戏结束/商店
  gameOver: { zh: '游戏结束', en: 'GAME OVER' },
  shopTitle: { zh: '商店', en: 'Shop' },
  weaponSelectTitle: { zh: '选择初始武器', en: 'Choose Starter Weapon' },
  weaponSelectHint: { zh: '点击选择你的第一把武器', en: 'Pick your first weapon' },
};

// 读取当前语言
export function loadLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === 'en' || stored === 'zh' ? stored : DEFAULT_LANGUAGE;
}

// 翻译函数
export function translate(key: string, lang: Language): string {
  // 兼容点号命名空间（game.title -> game_title）
  const normalized = key.replace(/\./g, '_');
  const entry = dict[normalized] ?? dict[key];
  if (!entry) return key;
  return entry[lang] ?? entry.zh;
}

// 供 React 组件使用的 hook 辅助：在组件外供 t 批量替换使用
export function buildDictKeyMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const k of Object.keys(dict)) {
    map[k] = [k, dict[k].zh, dict[k].en];
  }
  return map;
}