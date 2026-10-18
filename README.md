# roguetile-Shooting-pixel

单人 2D 俯视角像素 Roguelite 射击游戏。WASD 或方向键移动，鼠标瞄准并按住射击，清场后进入升级 / 商店，再进入下一关。战场用 Canvas 2D 绘制，菜单与阶段面板用 React 渲染。

## 技术栈

- Next.js 16.1.1（App Router）+ React 19.2 + TypeScript 5
- Tailwind CSS v4
- pnpm 9+（已通过 `preinstall` 强制，用 npm / yarn 安装会直接报错）

## 快速开始

```bash
pnpm install
pnpm dev          # 开发服务器，默认 http://localhost:5000
```

可用的包管理脚本：

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建（会先执行 `pnpm install`） |
| `pnpm start` | 启动生产服务器 |
| `pnpm ts-check` | TypeScript 类型检查 |
| `pnpm lint:build` | ESLint 检查 |
| `pnpm validate` | 并行执行类型检查与 lint |
| `pnpm test:game` | 模拟层回归测试 |
| `pnpm check:assets` | 校验代码里引用的图片资源是否存在 |
| `pnpm export:config` | 导出 buff 配置表（会覆盖 `public/assets/buff_config.xlsx`） |

如果两个包管理脚本都不需要，也可以直接用 Next CLI：`pnpm exec next dev --webpack --port 5000`。

> `pnpm dev` 与 `pnpm start` 是 Bash 包装脚本，启动前会对目标端口执行 `kill -9`，在 Windows 原生终端下不能直接照搬。详情见 `technical_debt.md` 的 R23。

## 项目结构

```
src/
├── app/page.tsx        # 游戏入口页面：输入、阶段协调、装配
├── hooks/              # useGameRuntime(RAF 与主循环)、useSound
├── components/game/    # 游戏 UI 组件
├── components/ui/      # 少量 shadcn 基础组件
└── game/               # 游戏本体，与 React 解耦的一层
    ├── config/         # 武器、怪物、基础常量、光影配置
    ├── model/          # 类型定义与实体工厂
    ├── runtime/        # GameRuntime：状态写入、模拟时钟、延时任务
    ├── systems/        # 每帧推进的模拟系统
    ├── rules/          # 纯计算与命令（伤害、掉落、成长、商店）
    ├── render/         # Canvas 绘制
    └── assets/         # 资源清单与加载器
```

分层依赖是单向的：`config / model` → `rules` → `systems` → `runtime` → 页面；`render` 只读取世界状态，不推进模拟。

## 操作

| 按键 | 功能 |
| --- | --- |
| WASD / 方向键 | 移动 |
| 鼠标移动 | 瞄准 |
| 按住鼠标左键 | 射击 |
| E | 闪现 |
| R | 换弹 |
| 滚轮 / 数字键 1-5 | 切换武器 |
| Esc | 暂停 |

窗口失焦或页面隐藏时会自动暂停。

## 开发文档

- `AGENTS.md`：Agent 的工作规则、操作流程与交付要求。**改代码前先读。**
- `design.md`：当前架构、模块边界、数据结构与扩展入口。As-Is / To-Be 有明确标记。
- `technical_debt.md`：已知问题清单与整改状态，R01～R26 带复现依据与验证方法。
- `docs/REFACTOR_PLAN.md`：待执行的优化施工单。

三者分工不同：`design.md` 描述"现在是什么样"，`technical_debt.md` 描述"还差什么"，本文和 `REFACTOR_PLAN.md` 是"先做什么"。

## 修改代码后

按变更范围执行对应检查：

```bash
pnpm test:game        # 改了模拟、规则、状态或局次生命周期
pnpm ts-check         # 改了 TypeScript 代码
pnpm lint:build       # 改了任何代码
pnpm check:assets     # 改了图片路径或资源装配
```

注意 `pnpm build` 会安装依赖，`pnpm dev` 包含端口强杀，**不要把它们当作只读验证命令**。
