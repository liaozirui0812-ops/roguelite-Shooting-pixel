# 优化执行方案

创建日期：2026-10-18。基于当日对工作区源码的静态核对（依赖 import / export 扫描、行号定位、跨文件搜索），未修改任何代码，未运行安装或构建。

**本文是施工单，不是架构说明。** 架构描述、债务成因与优先级判断见 `technical_debt.md`；本文只回答"先做什么、改哪个文件、怎么验收"。

行号用于定位本次核对版本（page.tsx 2527 行）。后续代码变化时**以函数/字段名为准**，不要按行号机械搜索。

## 0. 三条执行原则

1. **一次只移动一个职责。** page.tsx 的拆分必须逐个落地，每次改动后跑完全套验证再进下一项。不要一次性重排 2500 行。
2. **保住现有合同。** GameRuntime 单写入者、单 RAF、`updateWorld` 固定系统顺序、`runtime.now()` / `schedule()` 做战斗计时、绘制不推进模拟——这些均已实现且有对应回归，不得在拆分过程中顺手改造。`transaction()` 没有回滚能力，不要按数据库事务的预期使用它。
3. **不能把缺陷修复升级为大重构。** R02～R18 的数值/政策问题优先于结构整理；反过来，也不要以"等 page.tsx 拆完"为理由推迟任何缺陷修复。

验证入口（`AGENTS.md` 第 4 章）：

```bash
pnpm test:game
pnpm check:assets
pnpm exec tsc --noEmit --incremental false
pnpm lint:build
```

不要通过 `pnpm build`（会安装依赖）或 `pnpm export:config`（覆盖快照）做只读验证。

---

## 批次总览

| 批次 | 内容 | 相对成本 | 是否需要玩法确认 | 可否独立交付 | 状态 |
| --- | --- | --- | --- | --- | --- |
| A | 工程侧噪音清理 | 低 | 否 | 是，任意挑项 | A2 / A3 已完成；A1 未动 |
| B | 单文件热点收敛（page.tsx / context.ts / affixes） | 中 | 否 | 按 B1.1～B1.5 分步 | 未开始 |
| C | 局部契约修正（现有 R08/R10/R12/R13/R14/R15） | 低 | 否 | 是 | ✅ 六项全部完成，回归 49 全通过 |
| D | 政策依赖型整理（R19/R20 的剩余部分） | 中 | 是 | 否，需在 C 之后 | 未开始 |
| — | 不做清单（见第 5 节） | — | — | — | — |

依赖摘要：批次之间的唯一硬依赖是 **B1.1（asset hook）必须先于 B1.2（UI 拆分）**，因为两者都会改 page.tsx 顶部 250 行区域，同改易冲突。A 完全独立，可与任何批次并行。

---

## 批次 A · 零风险工程清理

本批次**不改任何游戏行为**，全部是"让目录结构反映真实项目"的工作。可整批做完再验证一次。

### A1 · 移除零引用的服务端依赖 ⏸ 未开始

**推迟原因**：这是全方案唯一需要重装卸 `node_modules` 的条目。为避免多次 `pnpm install`，与 A2 遗留的 `@radix-ui/*`、`recharts`、`vaul`、`input-otp`、`cmdk`、`embla-carousel-react`、`react-day-picker`、`react-resizable-panels`、`lucide-react` 等合并到一次清理中完成。届时 `dependencies` 需保留 `@radix-ui/react-slot`（`button.tsx`）、`class-variance-authority`、`clsx`、`tailwind-merge`、`xlsx`、`axios`、`coze-coding-dev-sdk` 及其余经搜索确认有引用者。

**核对结果**：`pg` `/` `@supabase/supabase-js` `/` `drizzle-orm` `/` `drizzle-zod` `/` `drizzle-kit` `/` `@aws-sdk/*` `/` `dotenv` `/` `date-fns` 在 `src/`、`tests/`、除生成脚本外的 `scripts/` 中**零 import**。

保留，`package.json` 中仍被引用：`axios` 与 `coze-coding-dev-sdk`（仅 `scripts/download-sounds.ts`、`generate-8bit-voices.ts`、`generate-poison-icons.ts`、`generate-voice-prompts.ts` 使用）；`xlsx`（`generate-buff-excel.ts` 使用）；`sharp` / `zod` 见脚本与 loader 实际引用。

步骤：逐个从 `package.json` 的 `dependencies` 移除，然后 `pnpm install` 并单独跑一遍完整验证。

- 收益：安装体积、依赖树可读性。
- 风险：**低，但会触发一次依赖重装**。这是全方案里唯一需要动 `node_modules` 的条目。若不确定以后会不会加存档/后端，可以先做 A2，把 A1 留到最后。
- 验收：四项验证命令全过；本地启动仍能进入菜单并完成一局。

### A2 · 清理未使用的 shadcn 组件 ✅ 已完成 2026-10-18

**执行结果**：删除 51 个文件，`src/components/ui/` 仅保留 `button.tsx` / `card.tsx`（及其依赖 `@/lib/utils`）。
- `tsc --noEmit --incremental false` 退出码 0，无任何残留引用。
- `pnpm test:game` 37/37 通过。
- `pnpm lint:build` 剩 4 个错，全部位于 `test-results/map-assets/check.cjs`——该目录已被 `.gitignore` 第 5 行排除、未被 git 跟踪，属本地运行产物的**既存噪声**，与本次删除无关，按 `AGENTS.md` §4 不予擅自修改。
- **`package.json` 的依赖清理推迟到 A1 统一处理**，避免多次触发 `pnpm install`。当前 `dependencies` 仍含这些包，但已无任何代码 import 它们。
- 文档核对：`design.md:29` 早已写明"游戏页面直接使用 `Button`、`Card`，不能把整个 UI 组件库算成游戏功能"，本次删除后与该描述完全一致，`design.md` 无需改动。

**当时核对依据（保留存档）**：`src/components/ui/` 下 53 个文件、6126 行（约占源码 27%），而 `src/app`、`src/components/game`、`src/hooks` 实际 import 的**只有 `button` 和 `card` 两个**。其余 radix/recharts/vaul/input-otp 等的引用只存在于 shadcn 组件自身内部。

步骤：保留 `button.tsx`、`card.tsx`、`components.json` 及其直接依赖（`lib/utils.ts` 的 `cn`），删除其余 51 个文件，同步移除 `package.json` 中对应的 `@radix-ui/*`、`recharts`、`vaul`、`input-otp`、`cmdk`、`embla-carousel-react`、`react-day-picker`、`react-resizable-panels`、`lucide-react` 若无他处引用。

- 收益：把 113 个源文件降到约 62 个，新人浏览目录时能立刻看到真正的项目结构。
- 风险：**低。** Next.js 会 tree-shake，未引用组件不进 bundle，所以这是**可读性收益，不是性能收益**——不要按性能优化来立项。代价是以后想加 UI 组件需要重新 `npx shadcn add`，但 shadcn 本来就是复制粘贴模式，成本可忽略。
- 验收：`pnpm exec tsc --noEmit --incremental false`（这一步最关键，能一次性暴露漏删的跨引用），再跑 `pnpm lint:build`。

### A3 · 修正项目标识与 README ✅ 已完成 2026-10-18

**执行结果**：`package.json` 的 `name` 由 `"projects"` 改为 `"roguelite-shooting-pixel"`；`README.md` 全文重写为技术栈、包管理脚本表、目录结构、操作说明、文档入口与按变更范围的检查清单。写作时已剔除一处虚构：`map/` 目录属 B1.5 的目标结构，当前尚不存在，已从目录树中移除。

**核对结果**：`package.json:2` 的 `name` 仍为脚手架默认的 `"projects"`；`README.md` 全文是扣子 CLI 模板内容（`coze dev` / `coze build` / Zustand 示例 / Prisma 示例），与本仓库实际情况完全无关——真实启动命令在 `scripts/dev.sh`，真实结构在 `src/game/`。

步骤：改 `name` 为项目实际名；重写 `README.md`，内容限定为：启动/构建/验证三条命令、`src/game/` 分层一句话说明、`AGENTS.md` 与两份文档的入口指向。

- 风险：**低。** 注意改 `name` 不影响运行（本项目未部署 npm 包）。
- 验收：按 README 里的命令从干净状态跑通。

---

## 批次 B · 单文件热点收敛

这是本次真正的核心。`technical_debt.md` 的 R19 已经记录了问题，本节给出落地步骤。

### B1 · 拆分 `src/app/page.tsx`（2527 行）

**当前职责分布（已核对）**

| 行区间 | 职责 | 归属建议 |
| --- | --- | --- |
| 53–107 | runtime 与 40+ 个 `runtime.setter` | 留在页面，但交由 B2 收敛 |
| 108–228 | UI state、约 20 张图片的 `useState`、语言、`useSound` | **B1.1 抽出** |
| 230–255 | BGM 播放、最高分读写（`localStorage`） | 归入 C 批次，与 R13 一起修 |
| 258–379 | 资源装配：`AssetSpec` 列表（260–342）+ 并发加载 + 地块/障碍分组 | **B1.1 抽出** |
| 382–~520 | `generateMapBackground()`：地块拼接成整图 | **B1.5 抽出** |
| ~520–630 | `generateObstacles()`：24 个障碍的放置与间距校验 | **B1.5 抽出** |
| 633–654 | `spawnMonsters()`：已是对 `systems/spawnMonsters` 的薄封装 | 留在页面（仅一层转发，抽出去收益为负） |
| 657–703 | `startLevel()`：权重/HP 倍率计算 + 重置批次与 Boss 字段 | **B1.4 抽出** |
| 706–742 | `startGameWithWeapon()`：清冷却、`resetRunWorld`、重生成地图、入 playing | **B1.4 抽出** |
| 745–812 | `switchWeapon()` / `switchWeaponTo()` | **B1.4 抽出** |
| 814–839 | `applyUpgrade()` | **B1.4 抽出** |
| 842–861 | `generateShopItems()` / `toggleLockItems()` | **B1.4 抽出** |
| 862–920 | `enterShop()` / `refreshShop()` / `buyShopItem()` / `exitShop()` | **B1.4 抽出** |
| 921–928 | `togglePause()` | 留在页面（最薄，且被输入层直接用） |
| 930–932 | `restartGame()` | **B1.4 抽出** |
| 935–1003 | 几何与表现触发：`checkCollision` / `checkRectCollision` / `triggerVampireHeal` / `triggerScreenShake` / `triggerExplosion` | 见下方说明 |
| 1006–1034 | `checkLevelCompletion()` | **B1.4 抽出** |
| 1035–1141 | `simulationContext` 装配对象 | 随 B2 收敛 |
| 1142–1151 | `useGameLoop` 挂载 | 留在页面 |
| 1152–1343 | 输入绑定：键盘、鼠标、滚轮、Canvas 按钮命中 | **B1.3 抽出** |
| 1345–2527 | JSX，13 个界面区块 | **B1.2 抽出** |

**B1.1 · 资源装配 → `src/hooks/useGameAssets.ts`**

把 108–228 的图片 `useState` 与 258–379 的加载 Effect 整体搬入，返回 `{ assets, tileImages, obstacleImages, isLoading, loadProgress, resourceErrors }`。`ASSET_PATHS` 与 `loadImageAsset` 已在 `src/game/assets/` 下，不需要重新实现 loader。

注意保留现有语义：`required: false` 的地块允许部分失败并回退纯色（当前代码 `:374` 注释已明确），失败列表才决定 `isLoading`。

**B1.2 · JSX 界面 → `src/components/game/`**

与现有 13 个注释区块一一对应，**不要重新设计 UI 结构**：

```
src/components/game/
  LoadingScreen.tsx        # 1352–1427
  WeaponSwitchHint.tsx     # 1429–1481
  HealthBarHud.tsx         # 1482–1501
  WeaponSlotBar.tsx        # 1502–1578
  MuteButton.tsx           # 1579–1626
  MenuScreen.tsx           # 1627–1804
  BuffPreviewDialog.tsx    # 1805–2040
  WeaponSelectScreen.tsx   # 2041–2111
  UpgradeScreen.tsx        # 2112–2157
  ShopScreen.tsx           # 2158–2250
  GameOverScreen.tsx       # 2251–2283
  BossHealthBar.tsx        # 2284–2304
  SettingsDialog.tsx       # 2305–2527
```

`AssetWidgets.tsx` 已有同名目录先例（418 行），沿用其 props 风格。这些组件的数据全部来自 `view` 快照 + `t()` 文案 + 上层的 callback，**不应直接 import `GameRuntime`**。

**B1.3 · 输入绑定 → `src/hooks/useGameInput.ts`**

搬运 1152–1343 的 5 个 Effect 与 `handleMouseMove` / `handleMouseDown` / `handleClick` / `handleMouseUp` / `handleWheel` / `handleKeyDown` / `handleKeyUp` / `handleWeaponKey`。该 hook 需要 `runtime`、`setters`、几何判定与 Canvas ref。

注意 `handleClick`（1283–1331）内含 Canvas 内暂停按钮的命中判定，坐标依赖 `GAME_CONFIG.CANVAS_WIDTH` 与 rect 换算——搬移时连同 R11 一起复核，但**不要顺手改 Canvas 尺寸合同**。

**B1.4 · 阶段命令 → `src/game/commands/`（新增目录）**

把 `startLevel` / `startGameWithWeapon` / `switchWeapon*` / `applyUpgrade` / 商店四个命令 / `restartGame` / `checkLevelCompletion` 抽成显式传入 `(runtime, setters, deps)` 的纯函数。这是 R19 建议的"随具体工作抽出命令"，不是引入命令总线——保持直接函数调用，不要新增事件接口。

**前置**：`startGameWithWeapon` 依赖 `dashRef` / `dashCooldownStartRef` / `cameraInitRef` / `muzzleFlashesRef` / `recoilRef` / `screenShakeRef` 六个 ref。建议先用 R17 明确"页面 ref 跨局保留表"再搬，否则容易把 ref 摊销合同一起搬错。若不想等，可**最后搬这一个**，其余七个先走。

**B1.5 · 地图生成 → `src/game/map/`**

`generateMapBackground`（内含调试用 `console.log`，搬迁时顺手删掉）与 `generateObstacles` 都是纯计算 + `setObstacles`，依赖 `obstacleImages` 与 `tileImages`。抽成 `(runtime, images, opts) => Obstacle[]` 形式最干净。

注意 R01 已经把 `generateObstacles` 的图片键从数字索引改成 `imagePath`，**搬迁时不要退回旧的 `obstacleImages[obstacleIndex]` 写法**。

**B1 验收**：`pnpm exec tsc --noEmit` + `pnpm lint:build` + 按 `technical_debt.md` 第 7 章共同验收链人工过一遍（资源失败重试 → 三武器 → 移动/射击/换弹/换枪/闪现 → 暂停/失焦 → 波次与清场 → 升级/购买/锁定 → 下一关 → 死亡重开）。

### B2 · 收敛 `UpdateWorldContext`（context.ts）

**核对结果**：接口共有约 45 个字段（`context.ts:29`–`:106`），其中混入了 7 个 `React.RefObject`（`canvasRef` / `dashRef` / `dashPendingRef` / `dashCooldownStartRef` / `muzzleFlashesRef` / `recoilRef` / `screenShakeRef`）、`boomImage`、`playSound` / `stopBGM`、以及 `triggerExplosion` / `triggerVampireHeal` / `triggerScreenShake` / `checkLevelCompletion` 等页面回调。这直接导致"离线验证需要伪造 Canvas 与音频"。

**建议顺序**：不要在 B1 完成前单独重构它。正确做法是 **B1.4 落地时同步收窄**——每抽出一个命令，就把 context 里对应的回调改成命令模块直接调用，字段随之减少。

可以立刻独立做的一小步：把表现类 ref（`muzzleFlashesRef` / `recoilRef` / `screenShakeRef`）归入一个 `viewFxRef` 对象传入，一次性减少三个字段，风险极低。

**明确不要做**：不要为了"去掉 Canvas 依赖"把 viewport 尺寸提前塞进 World。这会改变 World 的序列化与快照合同，收益低于风险（`technical_debt.md` R19 已标明这条是真需 DOM 测试时才做）。

### B3 · 修正 `rules/damage` → `systems/affixes` 层级倒置

**核对结果**：这是全仓唯一的反向依赖（`src/game/rules/damage.ts:2` import `systems/affixes`）。根因是 `AffixSystem` 一个对象里同时放了两组东西：

- 纯逻辑：`init` / `onDamage` / `update`（`affixes.ts:38` / `:62` / `:90`）
- 绘制：`render` / `renderBelowHpBar`（`affixes.ts:177` / `:260`，直接收 `CanvasRenderingContext2D`）

而 `damage.ts` 只需要 `onDamage`。

**步骤（三步，按顺序）**

1. 把 `render` / `renderBelowHpBar` 移到新的 `src/game/render/renderAffixes.ts`，导出为独立函数。
2. `renderWorld.ts` 改 import 新位置；核对词缀在敌人、Boss、血条下方的绘制调用点保持不变。这一步是纯搬迁，`git diff` 应当只有移动没有逻辑变化。
3. `damage.ts` 改为从新模块导入纯逻辑部分——或更保守地，先保留 import 路径不变，仅搬走绘制代码，确保 `affixes.ts` 不再出现 `CanvasRenderingContext2D`。

若第 3 步遇到导出重排困难，**只做第 1、2 步也能消除大部分问题**，剩余的路径引用可在后续提交收尾。

**验收**：除四项命令外，重点看 Canvas 上词缀图标/光环的绘制与改造前逐帧一致——这条只能人工验，建议在 Boss 关跑一局确认。

---

## 批次 C · 局部契约修正（可与 B 并行）

这些在 `technical_debt.md` 已有完整依据与验证方法，本文不重复。按投入产出排序：

| 顺序 | 编号 | 一句话 | 为什么排这个位置 |
| --- | --- | --- | --- |
| 1 | R12 ✅ | 接上同批已存在的三张淬毒专属图标（`poison_buff/enhance/expand.png`），非占位 | `pnpm check:assets` 已转绿（91 路径、12 图集通过） |
| 2 | R13 ✅ | 语言/最高分存储加异常保护与有限数校验，设置按钮接入 `switchLanguage` | 回归 37 → 40 全通过 |
| 3 | R08 ✅ | 移除三处 `Math.floor`，弹速改浮点存储（HUD 本就用 `toFixed(1)`） | 正增益变负收益，玩家可感知，改动面小 |
| 4 | R10 ✅ | 爆炸非致死命中写 `hitTime`，`lastHitTime` 已从全仓消失 | 单行级修正；200ms 减速/受击表现路径已验 |
| 5 | R14 ✅ | `STARTER_WEAPON_META` 的 stats 全部由 WEAPONS 生成，新增两个共享常量 | 选枪界面数值撒谎，影响第一印象 |
| 6 | R15 ✅ | 新增 `rules/weighted.ts`，零权重过滤 + 缺省值与 0 区分 + 累积权重抽样 | 会改变随机序列，建议单独提交便于回溯 |

**每条都必须配套一条最小回归**（R21）。复用 `tests/game-regression.cjs` 已有的 Node/TS 加载器与可注入随机/模拟时间，不要引入新测试框架。

### C 批次已完成（2026-10-18）

回归 40 → **49 全通过**，`tsc --noEmit` 0、`eslint src tests` 0、`check:assets` 保持绿。每条都补了最小回归，并确认该回归能真正抓到缺陷：

| 编号 | 新增回归 | 反向确认有效 |
| --- | --- | --- |
| R08 | 五种基础弹速 × 四档增益严格递增；三种初始枪连续 5 次武器升级递增 | 是（还原 `Math.floor` 即失败） |
| R10 | 爆炸非致死命中 `hitTime === now()`、不存在 `lastHitTime` 键 | 是 |
| R14 | 三种初始枪展示行与配置逐项相等，`+1`/`30%` 旧错值不再出现 | 是 |
| R15 | 工具函数行为 + 固定 random 扫描全分布，L≥20 金币奖励零命中、L=1 仍可达 | 是 |

**过程中新增登记一条债务 R27**：`acquireWeapon` 走 `applyWeaponStatsToPlayer`，不写 `penetration`，因此"升级获得狙击枪"拿不到其标志性穿透，与 `createPlayer`/`equipWeaponFields` 两条路径不一致。属属性合同问题，**依赖 R02 确认后修**，本次只登记不动行为——否则会在展示修复里偷偷改战斗结果。

`systems/spawnMonsters.ts:58` 仍是旧的按权重复制数组写法，因改动会同时影响刷怪平衡，留到 R02/R25 有平衡数据时再说；`rules/offers.ts` 的四处迁移可作它的参照模板。

---

## 批次 D · 需先确认政策再做

以下四条属玩法政策类问题，**在政策明确前不要动代码**，动就是猜：

- **R02**：属性加成语义（哪些跨枪保留、加成单位、RPG 爆炸伤害是否走 Player.damage）
- **R16**：伤害来源 × 闪现免伤政策（Boss 落地可否穿透、延迟第二发能否继续）
- **R17**：阶段/实体跨关保留表（弹体、敌弹、掉落、毒圈、锁定报价各保留什么）
- **R18**：来源效果矩阵（护盾/无敌/处决/吸血/补弹/传播/掉落）

建议产出物是一张表而不是代码：列出「来源 × 效果」或「阶段 × 保留字段」的决定。表一旦定稿，R19/R20 剩下的整理工作和 R04/R05/R06/R09 的修复就都能各自独立推进了。

---

## 5. 明确不做的事

对照 `technical_debt.md` §1.2，以下都是已确认的"保留现有简单实现"，不要因为"看起来更优雅"就顺手做：

- 不重写 `GameRuntime`，不引入 ECS / DI 容器 / 通用事件总线
- 不把所有伤害来源强行统一到一个万能回调（会抹平当前明确存在的差异）
- 不因为拆分而 refactor `useGameRuntime.ts`（71 行，职责干净：单 RAF + ref 持有回调避免 HUD/输入变化重启循环）
- 不给 `transaction()` 加回滚语义
- 不把 World 改成深度不可变
- 不做 `renderWorld.ts`（2482 行）的整体重写——除非拿到 R25 要求的真实帧耗时数据。**没有数据就先别动它**，它的风险高于 page.tsx 而收益并不更大。
- 不自动补齐从未实现的功能（火链、遗物、存档、五关终局）——那是范围规划，不是债务

---

## 6. 建议的动工顺序

```
第一步（约半天）：A2 → A3                    ✅ 已完成
第二步（约半天）：R12 → R13                  ✅ 已完成，check:assets 已转绿
第三步（约半天）：R08 → R10 → R14 → R15        ✅ 已完成，C 批次全部收口
第四步（2-3 天）  ：B1.1 → B1.5 → B2 → B3      核心拆分，逐项验证
第五步（政策表）  ：D 批次确认后再开（含本次新增登记的 R27）
```

每次落地之间跑一遍第 0 节的四条命令。任何一步出现"结果与预期不符"，停下来核对入口与调用方，不要继续叠加改动。

完成后按 `AGENTS.md` §5 更新 `technical_debt.md` 对应 R 条目的状态/验证结果/残余风险，并同步 `design.md` 第 2～4 章的当前实现描述。**只提了方案或改了注释不能标记已解决。**
