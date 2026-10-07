# 游戏架构优化方案

## 当前架构分析

### 现状问题
- **单文件过大**：`page.tsx` 共 10,635 行，所有内容混杂
- **无模块化**：类型定义、游戏逻辑、UI组件、资源加载全部在一起
- **数据与逻辑耦合**：配置、状态、渲染、音效、交互全部混杂
- **扩展困难**：添加新武器、Buff、怪物都需要修改同一个大文件
- **可维护性低**：新人难以理解，修改容易产生连锁反应

### 当前文件包含内容
1. UI组件（UpgradeCard、CoinIcon等）
2. 类型定义（Player、Monster、WeaponConfig等）
3. 常量配置（GAME_CONFIG、WEAPONS、BUFFS等）
4. 状态管理（useState）
5. 游戏逻辑（碰撞检测、AI、子弹、怪物）
6. 渲染循环（Canvas绘制）
7. 音效管理
8. 资源加载
9. 事件处理
10. 商城和升级系统

---

## 优化后的架构

### 文件结构建议
```
src/
├── app/
│   └── page.tsx              # 主入口（仅协调，~500行）
│
├── types/                     # 类型定义
│   ├── index.ts
│   ├── game.ts                # Player, Monster, Bullet, Obstacle
│   ├── weapons.ts             # WeaponConfig
│   ├── buffs.ts               # BuffConfig, GrowthChainNode
│   └── items.ts               # ShopItem, Upgrade
│
├── constants/                 # 游戏配置
│   ├── index.ts
│   ├── game.config.ts         # GAME_CONFIG
│   ├── weapons.config.ts      # WEAPONS
│   ├── monsters.config.ts     # MONSTER_CONFIGS
│   ├── buffs.config.ts        # BUFFS, GROWTH_CHAIN_NODES
│   └── upgrades.config.ts     # UPGRADES, SHOP_ITEM_CONFIGS
│
├── hooks/                     # 自定义Hooks
│   ├── useSound.ts            # 音效管理（已有）
│   ├── useGameState.ts        # 游戏状态管理
│   ├── useResourceLoading.ts  # 资源加载管理
│   ├── usePlayer.ts           # 玩家逻辑
│   ├── useMonsters.ts         # 怪物AI和逻辑
│   ├── useBullets.ts          # 子弹管理
│   └── useShop.ts             # 商城逻辑
│
├── game/                      # 游戏核心逻辑
│   ├── index.ts
│   ├── collision.ts           # 碰撞检测
│   ├── physics.ts             # 物理计算
│   ├── ai.ts                  # 怪物AI
│   ├── effects.ts             # 特效、Buff效果
│   └── damage.ts              # 伤害计算
│
├── render/                    # 渲染逻辑
│   ├── index.ts
│   ├── player.render.ts       # 玩家绘制
│   ├── monsters.render.ts     # 怪物绘制
│   ├── bullets.render.ts      # 子弹绘制
│   ├── ui.render.ts           # UI HUD绘制
│   └── particles.ts           # 粒子效果
│
├── components/                # React UI组件
│   ├── game/
│   │   ├── LoadingScreen.tsx  # 加载界面
│   │   ├── MainMenu.tsx       # 主菜单
│   │   ├── UpgradePanel.tsx   # 升级面板
│   │   ├── ShopPanel.tsx      # 商城面板
│   │   ├── PauseMenu.tsx      # 暂停菜单
│   │   └── SettingsModal.tsx  # 设置弹窗
│   └── ui/
│       ├── UpgradeCard.tsx    # 升级卡片（移到这里）
│       └── CoinIcon.tsx       # 金币图标（移到这里）
│
├── utils/                     # 工具函数
│   ├── math.ts                # 数学计算
│   ├── random.ts              # 随机数生成
│   └── helpers.ts             # 通用帮助函数
│
└── assets/                    # 静态资源
    └── images.ts              # 资源路径常量
```

---

## 核心改进点

### 1. 模块化拆分

#### 优势
- **可并行开发**：不同人员可以同时开发不同模块
- **易于测试**：模块独立，单元测试更容易
- **责任清晰**：每个文件有明确的职责
- **变更风险小**：修改一个模块不影响其他模块

### 2. 可扩展性设计

#### 新增武器（无需改核心代码）
```typescript
// 只需在 constants/weapons.config.ts 中新增配置
export const NEW_WEAPON: WeaponConfig = {
  id: 'new_weapon',
  name: '新武器',
  // ... 配置
};

// 自动纳入系统
```

#### 新增Buff
```typescript
// 只需在 constants/buffs.config.ts 中新增
export const NEW_BUFF: BuffConfig = {
  id: 'new_buff',
  // ... 配置
};
```

#### 新增怪物
```typescript
// 只需在 constants/monsters.config.ts 中新增
export const NEW_MONSTER: MonsterConfig = {
  id: 'new_monster',
  // ... 配置
};
```

### 3. 状态管理优化

#### 当前问题
- 所有状态都在主组件，10,635行难以维护
- 状态更新逻辑混杂在渲染循环中

#### 优化方案
```typescript
// hooks/useGameState.ts
export const useGameState = () => {
  const [gameState, setGameState] = useState<GameStateType>('menu');
  const [level, setLevel] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  return {
    gameState, setGameState,
    level, setLevel,
    isPaused, setIsPaused,
    showSettings, setShowSettings,
  };
};

// hooks/usePlayer.ts
export const usePlayer = () => {
  const [player, setPlayer] = useState<Player | null>(null);
  
  const initPlayer = useCallback((...args) => { ... }, []);
  const updatePlayer = useCallback((updates) => { ... }, []);
  const applyUpgrade = useCallback((upgrade) => { ... }, []);
  
  return { player, setPlayer, initPlayer, updatePlayer, applyUpgrade };
};
```

### 4. 渲染逻辑分离

#### 当前问题
- Canvas绘制逻辑与游戏更新逻辑混杂在一个循环中
- 2000+行绘制代码难以维护

#### 优化方案
```typescript
// render/player.render.ts
export const renderPlayer = (context: CanvasRenderingContext2D, player: Player) => {
  // 仅绘制玩家
};

// render/monsters.render.ts
export const renderMonsters = (context: CanvasRenderingContext2D, monsters: Monster[]) => {
  // 仅绘制怪物
};

// 主循环中调用
useEffect(() => {
  const gameLoop = () => {
    // 更新逻辑（独立）
    updateGame();
    // 渲染逻辑（独立）
    renderGame(context);
  };
}, []);
```

### 5. 配置驱动架构

#### 当前问题
- 配置与逻辑耦合
- 添加新内容需要修改逻辑代码

#### 优化方案
```typescript
// 一切通过配置驱动，逻辑代码无需改动
export const WEAPONS: Record<WeaponId, WeaponConfig> = { ... };
export const MONSTER_CONFIGS: Record<MonsterType, MonsterConfig> = { ... };
export const BUFFS: Record<SpecialRewardType, BuffConfig> = { ... };

// 游戏逻辑读取配置，不硬编码
const handleBullet = (bullet: Bullet) => {
  const weaponConfig = WEAPONS[bullet.weapon];
  // 使用配置，不硬编码数值
};
```

---

## 分阶段重构建议

### 第一阶段：类型和配置分离（低风险）
```
# 改动：创建新文件，从page.tsx中抽离
- 提取所有类型定义到 src/types/
- 提取所有常量配置到 src/constants/
- page.tsx中通过import引入
- 不影响现有功能
```

### 第二阶段：Hooks拆分（中风险）
```
# 改动：创建自定义Hooks
- 提取资源加载到 useResourceLoading.ts
- 提取玩家逻辑到 usePlayer.ts
- 提取怪物逻辑到 useMonsters.ts
- 提取商城逻辑到 useShop.ts
- page.tsx中组合使用Hooks
```

### 第三阶段：渲染和逻辑分离（中风险）
```
# 改动：分离绘制代码
- 提取绘制函数到 src/render/
- 主循环只负责调用
- 渲染逻辑独立测试
```

### 第四阶段：核心逻辑模块化（高风险）
```
# 改动：重构游戏核心
- 碰撞检测独立
- 物理计算独立
- AI逻辑独立
- 伤害计算独立
```

---

## 未来扩展支持

### 多角色系统
```typescript
// types/characters.ts
export interface Character {
  id: CharacterId;
  name: string;
  icon: string;
  baseStats: Partial<Player>;
  specialAbility: Ability;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  soldier: { id: 'soldier', name: '士兵', ... },
  engineer: { id: 'engineer', name: '工程师', ... },
  ninja: { id: 'ninja', name: '忍者', ... },
};
```

### 更多掉落物系统
```typescript
// types/drops.ts
export type DropType = 'health' | 'ammo' | 'weapon_part' | 'skill_book';

export interface DropConfig {
  id: DropId;
  type: DropType;
  rarity: Rarity;
  dropChance: number;
  effect: (player: Player) => void;
}
```

### 更多武器系统
```typescript
// weapons.config.ts 扩展
export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  // 现有武器...
  minigun: { id: 'minigun', name: '加特林', ... },
  flamethrower: { id: 'flamethrower', name: '火焰喷射器', ... },
  grenade_launcher: { id: 'grenade_launcher', name: '榴弹发射器', ... },
  laser_rifle: { id: 'laser_rifle', name: '激光步枪', ... },
};
```

---

## 总结

### 当前问题
✅ 单文件10,635行
✅ 无模块化
✅ 耦合度高
✅ 扩展困难

### 优化收益
✅ 支持未来大量内容扩展（武器、Buff、怪物、角色）
✅ 代码可维护性大幅提升
✅ 多人协作可行
✅ 测试更容易
✅ 新增内容无需改核心代码

### 重构策略
✅ 分阶段，低风险优先
✅ 保持功能不变，只改结构
✅ 每阶段都可独立交付
