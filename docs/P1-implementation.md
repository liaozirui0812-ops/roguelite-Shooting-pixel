# P1 优化实施与验收记录

实施日期：2026-10-02。对应原方案 S01–S09。

已将战斗状态从 React 页面迁入独立运行时，拆出模拟系统与绘制系统，修复输入、延迟任务、伤害重复结算和资源加载问题。修改保留在项目工作区，尚未提交 Git。原有 PNG、cutout 和 public/assets/buff_config.xlsx 未被重写。

## 1. 对照原方案的结果

| 编号 | 已落实的修改 | 主要代码入口 |
| --- | --- | --- |
| S01 | 稳定 RAF；运行时持有高频世界状态；HUD 接收不可变快照，战斗中按约 10Hz 合并更新；关键阶段/暂停立即发布 | src/game/runtime/GameRuntime.ts、src/hooks/useGameRuntime.ts、src/game/model/View.ts |
| S02 | 战斗更新同步执行；同字段嵌套操作排队，防止覆盖；伤害来源策略明确；统一死亡转换和得分入口，按敌人 ID 去重；修复穿透子弹过滤条件 | src/game/rules/damage.ts、src/game/systems/death.ts、projectileSystem.ts、explosion.ts |
| S03 | 固定 1/60 秒模拟步长；战斗冷却、动画、DOT、波次和清场等待共用模拟时钟；更新和绘制分开 | src/game/runtime/FixedStepClock.ts、src/game/systems/updateWorld.ts、src/game/render/renderWorld.ts |
| S04 | 输入监听读取实时阶段；Esc 暂停；输入框过滤；暂停、鼠标离开、失焦、隐藏页面、pointercancel 清理按住状态 | src/app/page.tsx、src/hooks/useGameRuntime.ts |
| S05 | RPG 第二发、传播和清场等待统一登记为带局次的模拟任务；暂停冻结，新局和离开战斗取消 | src/game/runtime/GameRuntime.ts、src/game/runtime/createRun.ts、weaponSystem.ts |
| S06 | 统一实际生效的类型、配置、几何/属性计算和 Player/Monster/Run 工厂；旧 types/constants 改为兼容导出；抽出五种 UI 组件 | src/game/model、config、runtime；src/components/game/AssetWidgets.tsx |
| S07 | Upgrade 显式保存 value；效果不再解析文案；共享属性及相同效果函数；统一商店生成/补货；锁定实例沿用 ID/数值；购买按权威商品 ID 消费一次 | src/game/rules/offers.ts、effects.ts、upgradeEffect.ts、shop.ts、combatStats.ts |
| S08 | 图片处理器先于 src；成功/失败/取消分开；超时、重试和旧轮次取消；障碍物按稳定资源路径取图，不依赖完成顺序 | src/game/assets/manifest.ts、loader.ts；src/app/page.tsx |
| S09 | 修复字体路径；五个缺失 UI 图使用 SVG 备用素材；删除不存在的 tile 请求并显式采用深色背景；新增大小写及图集尺寸/矩形检查 | public/assets/ui、src/app/globals.css、src/game/assets/atlases.ts、scripts/check-assets.cjs |

主页面从 12,272 行缩减至约 2,485 行。模拟调度入口约 90 行；各系统独立维护，不再放在大 Effect 中。行数仅反映职责拆分，不作为性能提升指标。

## 2. 运行时顺序与维护入口

每个模拟步执行：到期任务 → 波次 → 移动/冲刺 → 换弹/射击 → 玩家弹体 → 敌人移动/状态 → 敌人攻击/Boss → 区域效果 → 拾取 → 特效生命周期 → 派生计数/关卡完成。死亡离开战斗后停止继续执行本步余下的战斗系统。

- 新增玩家字段：更新 model/types.ts 和 runtime/createPlayer.ts。新局通过 createRun/resetRunWorld 完整重置 World。
- 新增怪物默认字段：更新 runtime/createMonster.ts；生成与分批逻辑在 systems/spawnMonsters.ts、waveSystem.ts。
- 修改武器/敌人数值：分别在 config/weapons.ts、config/monsters.ts；通用规则在 config/base.ts。
- 修改升级数值或价格：使用 rules/rewards.ts、offers.ts、effects.ts；文案与效果数值分离。
- 新增图片：维护 assets/manifest.ts；序列帧同时维护 atlases.ts，运行 check:assets。
- 新增战斗延迟：使用 runtime.schedule；不使用浏览器 setTimeout 作为战斗计时。
- 新增绘制：renderWorld 读取 World，生命周期放到对应模拟系统。

## 3. 保留的玩法策略与明确修复

普通弹体、RPG 爆炸和自爆对其他敌人的伤害保留无敌/词缀拦截；DOT 和毒圈保留原来的绕过策略。各伤害来源的掉落差异保留在来源系统中，共享死亡转换与一次得分入口。气场继续承担击退、减速和消除敌方子弹。

普通穿透后续伤害减半，手枪末发保留不衰减例外。旧代码末尾的过滤条件会移除已经命中、但仍有穿透次数的弹体，本次明确修复，因此穿透现在能够继续生效。

RPG 双发改为模拟任务后，第一发立即扣弹；第二发条件据剩余弹药校正，并继续在回调校验武器、弹药、换弹和换枪状态。

商店离开命令同步确定下一关；阶段变化在事务结束时立即发布。余额与商品资格由运行时的当前商品校验，不使用过期 UI 副本。

武器数值、抽取权重和斜向移动规则沿用当前生效配置。为减少同时改变单位带来的风险，速度数据暂保留“每个 60Hz 模拟步的像素数”，不再随渲染频率变化；震屏/阻尼每步执行。最大补步为 6 步（约 100ms），隐藏页面暂停并丢弃后台累计时间。长卡顿超过上限的时间丢弃，避免突跳或连发补算。

UI 的加载/按钮延迟仍使用界面时间；音频继续使用音频系统自身时钟。阶段适配器负责进入战斗时播放、离开战斗时停止 BGM。

## 4. 自动验证

| 检查 | 结果 |
| --- | --- |
| TypeScript：tsc --noEmit --incremental false | 通过 |
| ESLint：eslint . --quiet | 通过，0 error；未声明所有 warning 均已清理 |
| 生产构建：next build --webpack | 通过，首页静态生成成功 |
| 回归：test:game | 25/25 通过 |
| 静态资源：check:assets | 83 个路径存在且大小写一致，12 个图集尺寸/矩形通过 |
| 配置导出 | 在临时文件验证 57 个 Player 字段、HP=20、10 个工作表；未覆盖项目现有 xlsx |

回归包括：同帧双弹/重叠爆炸/火毒共同致死只记分和掉落一次；护盾三次拦截与毒圈绕过；实际 RPG 双发暂停/恢复/新局取消；穿透衰减与末发例外；关键阶段事务只发布一次；新局完整重置；锁定商品保持实例、重复购买不会扣第二次金币；待刷批次/Boss 阻止提前清场；不可变 UI 快照；乱序/缓存/失败/超时/取消加载；图集越界检查；绘制不修改 World、后坐力或模拟随机源。

相同固定输入下，模拟 30/60/120Hz 渲染节奏：10 秒位移一致；15 秒射击次数、DOT 结果和波次一致。这是确定性回归，未作为实际设备 FPS 或耗时采样结果。

原始基线：类型和生产构建通过，lint 有 11 个已有 error。迁移同时处理了阻挡当前检查的两个外围类型问题：Excel 导出字段 unknown 与 webkitAudioContext 类型。没有进行 P2 音频生命周期改造。

## 5. 浏览器验收与资源说明

在本机生产版本中验证：资源加载 → 开始游戏 → 选择初始武器 → 战斗 → Esc 暂停。手枪及冲锋枪开局均检查；开发测试中还经历游戏结束和重开。生产运行时 loopStarts=1，HUD/阶段操作未增加启动次数；验收页面控制台无 error。截图保存在本次工作区 outputs/p1-paused-game.jpg。

- `____.ttf`确认为 M+ HZK 12 Regular 像素字体，字体路径使用现有文件。
- lock.svg、speed.svg、weapon-upgrade.svg、vampire.svg、upgrade-panel.svg 为新增备用矢量素材。未来取得正式 PNG 后可在资源配置处替换。
- 五张 tile 图片在原目录缺失，背景明确使用深色 fallback，未生成替代地图美术。
- enemy_4_2 为 1033px 宽，定义 4 个 256px 帧并忽略尾部 9px；boss2 为 10198px 宽，最后一帧明确裁至 470px；闪现图使用现有不等宽帧矩形。
- 配置导出脚本从当前工厂/配置读取实例和完整生效配置，避免旧手写默认值影响导出结果。

## 6. 重跑与审阅

使用 packageManager 指定的 pnpm 9.x，安装依赖时保持 frozen-lockfile；本次锁文件未改动。

```powershell
pnpm test:game
pnpm check:assets
pnpm lint:build
pnpm ts-check
pnpm exec next build --webpack
pnpm exec next start --port 5002
# 可指定输出，避免覆盖现有配置表
pnpm export:config D:/temp/live-config.xlsx
```

原有 build/dev 的 Bash 包装保留；Windows 验证直接运行 Next CLI。避免同时构建和类型检查，以免 Next 重建 .next/types 时产生临时文件缺失。

Git 基线为 50e7f8014f1b462e6ebf8aa7e51b6229cea84d4a。当前 main 工作区包含全部改动。按方案尝试创建独立分支，但 .git 写入在单独授权后仍返回 Permission denied；未强行更改 Git 权限，也未提交。可通过 git diff 与新增 src/game、tests 等目录审阅。next-env.d.ts 的路由类型引用由生产构建自动更新。

本次未进行移动端真机、完整多关长局/Boss 战斗、10 分钟音频内存或碰撞耗时采样；没有 FPS 提升百分比。P2 的音频节点回收、空间索引/分块缓存、视口剔除和移动端适配仍按原方案后续推进。
