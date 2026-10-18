# MEMORY.md

## 项目定位

2D 俯视角像素 **Roguelite 射击**游戏（非卡牌游戏）。战斗是 WASD + 鼠标瞄准射击，"卡牌"仅存在于关间三选一升级和商店卡片 UI。用户口头常称"肉鸽卡牌游戏"，沟通时注意口径但不必纠正。

技术栈：Next.js 16 App Router + React 19 + TypeScript 5 + Tailwind v4 + pnpm 9+（`preinstall` 强制）。

## 环境事实（重要，会反复遇到）

**`pnpm` 不在 PATH 中**（Git Bash 下报 `pnpm: command not found`）。不要用 `pnpm xxx`，直接用本地 `node_modules` 里的入口 + managed node：

```bash
cd /c/Users/Administrator/Desktop/roguelite-Shooting-pixel
NODE="C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-6/node.exe"
$NODE node_modules/typescript/lib/tsc.js -p tsconfig.json --noEmit --incremental false
$NODE node_modules/eslint/bin/eslint.js . --quiet
$NODE scripts/run-game-tests.cjs
$NODE scripts/check-assets.cjs
```

`rm` 批量删除多个文件时会触发 SIGTERM 中断，**必须分成 5 个一批**。

## 分支/删除安全

项目是 git 仓库，删除文件可用 `git checkout -- <path>` 恢复。`test-results/` 已被 `.gitignore` 第 5 行排除且未跟踪 —— 该目录下的 lint 报错是本地产物噪声，**属既存失败，不要动它**（AGENTS.md §4）。

## 文档分工

- `AGENTS.md` — Agent 工作规则，**改代码前必读**
- `design.md` — 当前架构（标了 As-Is / To-Be，准确度高）
- `technical_debt.md` — R01～R27 债务清单，带复现依据与验证方法
- `docs/REFACTOR_PLAN.md` — 执行施工单（2026-10-18 创建）

## 优化进度（2026-10-18）

**已完成**：A2（删未用 shadcn 组件，src 源文件 113 → 62，仅留 `button.tsx` / `card.tsx`）、A3（package name + README 重写）、**批次 C 全部六项**（R12 淬毒图标接入 → R13 存储保护/语言保存接通 → R08 弹速浮点 → R10 hitTime → R14 选枪数值由配置生成 → R15 零权重+累积权重抽样）。回归 37 → 49，`check:assets` 转绿。

**新增 `src/game/rules/weighted.ts`** 是现在唯一的加权抽样工具（resolveWeight / pickWeightedIndex / pickWeightedItem）；`offers.ts` 四处已迁移，`systems/spawnMonsters.ts:58` 还是旧写法（改刷怪分布会影响平衡，暂不动）。

A1（删零引用依赖）**故意推迟**——唯一需要重装 `node_modules` 的条目，要与 A2 遗留的 UI 依赖合并成一次清理。

下一步：批次 B（page.tsx 拆分 B1.1 → B1.5 → B2 → B3），或批次 D 的政策表（R02/R16/R17/R18 加上新登记的 R27）。

## 新登记债务 R27（待政策确认，勿擅自修）

`acquireWeapon` 走 `applyWeaponStatsToPlayer`，该函数不写 `penetration` → 局内获得的狙击枪没有标志性穿透（`createPlayer` / `equipWeaponFields` 两条路径都有）。修它会改变战斗结果，属属性合同问题，等 R02 定语义。

## 写回归的经验（本项目）

验证"某内容不可被抽到"时，不要用随机种子：0 权重候选概率可能低到几千次也碰不上（本次实测约 0.2%～0.4%）。改用**固定 random 返回值扫描整条累积分布**，确定且穷尽。每条缺陷修复都应做「临时还原旧逻辑 → 测试须失败 → 还原修复」的反向确认。

## 保留约定

不得引入 ECS / DI 容器 / 通用事件总线；不得给 `transaction()` 加回滚语义；不得把 World 改成深度不可变；`renderWorld.ts` 在拿到 R25 帧耗时数据前不要重写。
