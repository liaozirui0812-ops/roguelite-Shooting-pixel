# 光影系统实现与验收记录

日期：2026-10-09。当前实现见 [design.md](../design.md) 3.13、4.7；施工范围与预算见 [LIGHTING_PLAN.md](LIGHTING_PLAN.md)。本次没有增加运行时依赖、法线素材文件或修改用户美术资源。

## 1. 交付范围

- 玩家中心照明：默认外径800px、内径600px，环境色/强度、光色/强度、柔边与衰减均可配置。
- 玩家三组动画、enemy_1/2/3/4_1/4_2、boss/boss2、五种障碍共15个资源身份共享三种模板；大小、镜像与稳定Alpha范围在shader中适配。
- 一个离屏WebGL通道批量准备，主Canvas按原身体位置合成；一次基础倍率与K=T/B补偿，无二次距离衰减。必要提示位于倍率场之后。
- 设置提供关闭、基础、标准、精细边缘与可选四级明暗；故障自动回基础。配置仅在当前页面内保留。
- R01 路径索引独立修正；暂停隐藏武器栏以使设置按钮可点击。没有改系统顺序、战斗时间、伤害、碰撞算法或玩法数值。

## 2. 自动检查

| 检查 | 实际结果 |
| --- | --- |
| `pnpm test:game` 等价的 `node scripts/run-game-tests.cjs` | 34/34通过（原25例+9例相关回归） |
| `pnpm exec tsc --noEmit --incremental false` 等价的直接CLI | 正常权限环境下通过；沙盒中基线与本次均出现192条UI类型诊断，正常权限未复现，不能归因为本次代码错误 |
| `pnpm lint:build` 等价的直接CLI | 通过 |
| `pnpm exec next build --webpack` 等价的直接CLI | 编译、TypeScript、静态页面及构建完成，通过 |
| `pnpm check:assets` 等价的直接CLI | 未通过：仅原有 `/assets/poison.png` 缺失（R12），保留用户删除，不擅自补资源 |
| `git diff --check` | 通过；工作区原有美术修改/删除保留 |

依赖用项目声明的pnpm9、`--frozen-lockfile`安装；未改锁文件。沙盒会阻止SWC规范化工作区路径、Edge临时配置及部分类型解析，因此浏览器、生产构建和最终类型检查使用正常本机权限。

## 3. 浏览器验证

硬件：AMD Ryzen 7 9800X3D、NVIDIA GeForce RTX 5070 Ti；Windows、Edge 139.0.3405.119，ANGLE D3D11，MAX_TEXTURE_SIZE=16384。逻辑/CSS均1200×800、DPR=1；另验证600×400 CSS缩放。基准RAF约160Hz，未另行测量物理显示器刷新率。

| 用例 | 结果 / 证据范围 |
| --- | --- |
| 原渲染兼容 | 基线提交c706ba610e4bf7167d2cc2859efae22076676ca0；普通/压力各70组动画状态，共140组，关闭光照后RGBA逐像素一致 |
| 真实素材与GPU输出 | 四档像素校验和不同；完整材质、所有玩家/敌人图集、Boss起跳/空中/落地、左右镜像均可绘制；无槽位溢出 |
| 基础照明颜色 | 白底采样中心、软边、外半径及圈外，与CPU公式允许的量化误差≤3/255 |
| 坐标 | 四角/中心、震屏和CSS缩放下，光源屏幕位置与实际玩家drawImage变换一致，外半径400px |
| 缓存/重置 | 调用真实resetRunWorld 20次，上传次数、纹理数量与估算缓存稳定；重载一个图像只多扫描一次、纹理数量不增长；卸载估算归零 |
| 能力限制 | 注入2048px MAX_TEXTURE_SIZE，实际使用重排页上传并绘制Boss尾帧；无溢出/驱动错误 |
| 失败回退 | 禁用WebGL、注入shader编译失败、原色上传失败，均回basic并继续Canvas；lose/restore循环3次成功 |
| 实际游戏入口 | 开发与生产服务均验证开始→手枪→移动/闪现/射击→暂停→四档/色阶设置→恢复；新局24个障碍；context丢失时可继续移动，恢复后仍playing，context与RAF启动数不增长，无pageerror |

基本数学/模板/分页检查属于Node回归；GPU编译、真实图片、像素合成和资源生命周期由浏览器实际运行证明，两者不能替代。

本次原始结果留在Git忽略的 `test-results/lighting/`：[功能/缓存](../test-results/lighting/functional.json)、[140组兼容比较](../test-results/lighting/compatibility.json)、[普通性能](../test-results/lighting/normal.json)、[压力性能](../test-results/lighting/stress.json)、[生产交互](../test-results/lighting/app-production.json)。[标准档截图](../test-results/lighting/standard.png) 是确定性验证夹具，[实际游戏截图](../test-results/lighting/game.png) 来自生产服务。长期基准数值保存在本文；这些生成文件不是构建依赖。

## 4. 性能记录

每档预热10秒、采样60秒、重复3次。普通负载：玩家+30敌人+100弹体+24障碍；压力负载：玩家+100敌人+500弹体+24障碍+1Boss，并在采样全程维持受击及爆炸表现。位置和时序固定，仅渲染夹具，不修改正式刷怪。

普通与压力场景均完成四档三轮，标准档六组对照全部满足原定预算：新增CPU中位数0.1～0.2ms、P95 0.1～0.3ms，RAF P95最多6.4ms，平均159.91～159.99 FPS，无>33.34ms长帧。两类素材pilot先通过性能门槛才扩面。CPU为renderWorld提交时间，RAF含混合合成；不包含战斗模拟、React更新和音频负载，不能视为完整长局性能保证。

| 场景 / 档位 | CPU中位数：三轮(ms) | CPU P95：三轮(ms) | FPS：三轮 | RAF P95(ms) |
| --- | --- | --- | --- | --- |
| 普通 / off | 0.60 / 0.60 / 0.50 | 0.90 / 0.90 / 0.80 | 159.96 / 159.99 / 159.99 | 6.40 / 6.40 / 6.40 |
| 普通 / basic | 0.50 / 0.60 / 0.50 | 0.90 / 1.00 / 0.80 | 159.99 / 159.99 / 159.98 | 6.40 / 6.40 / 6.40 |
| 普通 / standard | 0.70 / 0.70 / 0.70 | 1.10 / 1.10 / 1.10 | 159.99 / 159.99 / 159.96 | 6.40 / 6.40 / 6.40 |
| 普通 / high | 0.70 / 0.60 / 0.70 | 1.10 / 1.00 / 1.10 | 159.99 / 159.98 / 159.99 | 6.40 / 6.40 / 6.40 |
| 压力 / off | 1.20 / 1.20 / 1.20 | 1.60 / 1.60 / 1.60 | 159.94 / 159.99 / 159.99 | 6.40 / 6.40 / 6.40 |
| 压力 / basic | 1.10 / 1.10 / 1.10 | 1.50 / 1.50 / 1.50 | 159.94 / 159.99 / 159.98 | 6.30 / 6.40 / 6.40 |
| 压力 / standard | 1.40 / 1.30 / 1.30 | 1.80 / 1.70 / 1.70 | 159.96 / 159.99 / 159.99 | 6.30 / 6.40 / 6.40 |
| 压力 / high | 1.30 / 1.40 / 1.30 | 1.70 / 1.90 / 1.70 | 159.91 / 159.99 / 159.99 | 6.40 / 6.40 / 6.40 |

压力标准档GPU异步查询中位数三轮为0.0122 / 0.0132 / 0.0128ms，P95为0.0136 / 0.0150 / 0.0155ms；仅表示该WebGL批次，不含Canvas合成或驱动总成本。

着色/合成缓存约14.11MiB（含2048×1024输出、1200×800倍率场、800²渐变及脚底椭圆），共享法线52,272字节。压力场景常驻新增GPU估算约52.26MiB；15种原色全部缓存时峰值约56.71MiB，低于16/64MiB预算；不含浏览器驱动、CPU解码、原主Canvas等既有开销。

压力夹具异步EXT_disjoint_timer_query只围绕prepareFrame采样；普通场景早期GPU查询包围整个renderWorld，包含跨画布调度/等待，因此不把该数值解释为shader执行时间，也不与压力GPU时间直接比较。预算判断以同负载CPU增量与RAF为准。

## 5. 复现方式

复用项目已有依赖运行Node回归、类型、lint、资源检查。下面两个新脚本需要可用的Playwright测试工具；它不是游戏依赖，当前用宿主工具提供的模块，不自动安装。

```powershell
# Playwright不在Node查找路径时，指向本机现有模块；不要照抄另一台机器的绝对路径。
$env:PLAYWRIGHT_MODULE = '<本机playwright模块绝对路径>'
$env:LIGHTING_QA_OUTPUT = '<截图与JSON结果输出目录>'
node scripts/check-lighting-browser.cjs             # 真实素材、回退、缓存、坐标与分页
node scripts/check-lighting-browser.cjs --benchmark # 四档×两负载×三轮，约28分钟

# 可选：对比施工前的实际渲染器
$env:LIGHTING_BASELINE_REF = 'c706ba610e4bf7167d2cc2859efae22076676ca0'
node scripts/check-lighting-browser.cjs
Remove-Item Env:LIGHTING_BASELINE_REF

# 单独启动服务，不使用带安装/端口强杀的包装；已构建时也可 next start --port 3100。
pnpm exec next dev --webpack --port 3100
# 另一个终端继承/设置上面的测试环境变量
node scripts/check-lighting-app.cjs
```

`LIGHTING_BROWSER`默认msedge，可设chrome；`LIGHTING_APP_URL`默认http://localhost:3100。性能脚本可用LIGHTING_SCENARIOS=normal/stress拆分运行，LIGHTING_QUALITIES指定档位；LIGHTING_WARM_MS/LIGHTING_SAMPLE_MS/LIGHTING_REPEATS可调整采样，缩短采样仅用于调试，不作为完整预算验收。结果目录生成JSON、四档/压力/边缘截图；脚本关闭自己的临时浏览器与夹具服务，不结束其他服务。

## 6. 已知限制与人工复核

- 验证设备属于桌面高性能GPU；其他设备、驱动、浏览器及移动端仍须单独测量。未实现自动按帧率降档，用户可选basic/关闭；故障回退独立于性能降档。
- 通用模板只近似外体积，不能恢复骨骸眼窝、装备细节或每块石头；不产生挡光、长投影或新的火焰光源。艺术观感可通过材质强度/预设调整，不默认新增逐帧法线。
- R01主路径与玩家/弹体/采样闪现已验证；完整敌人避障、Boss落地/击退、燃烧/中毒/词缀组合，以及升级→商店→跨关→死亡重开的完整长局仍需人工复核。R04/R07、闪现落地伤害等既有债务未整改。
- 人工检查：五种障碍旁绕行/闪现并射击；Boss各攻击阶段与DOT/词缀同时出现时看血条、预警及受击色；依次暂停/失焦/升级/购物/死亡重开，确认输入清理、光圈跟随、无旧图集残影；低性能设备对比standard/basic。
