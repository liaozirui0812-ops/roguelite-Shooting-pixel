# 两只新 Boss 可玩首版实施记录

日期：2026-10-20。目标项目：roguelite-Shooting-pixel。用户已确认本方案及全部推荐玩法规则。

## 已接入行为

- 野猪王：五个基准方向皮肤加镜像、四足部件骨骼、头身和尾部跟随、鼻息/扬尘；700ms追踪蓄力+450ms锁线、障碍/边界截断的直线冲锋、撞击硬直；双踏及两轮9枚碎岩。每次冲锋一次伤害，踏击近身圈与同轮碎岩共享命中预算。
- 多足机械：八条独立耐久腿，落脚目标与两段IK；完好/半破/断裂图块、断面残桩、断裂火花；左右交替分节触手穿刺、两组存活足端各3发齐射。断腿移除对应命中/支撑并取消待发弹幕，组身份不会在断腿后重排重复发射。
- 全断腿：1000ms无伤害转换，停止移动、底盘下沉、核心暴露，主体受伤1.25倍；保留慢节奏触手及9发泄压环，预留连续3个方向的固定出口。仅击毁主体结算胜利，腿无击杀奖励。
- 新技能尊重闪现免伤；冲锋锁定/运动/急停期抗击退。实体与延迟动作沿原模拟时钟；新Boss实际入场才计时。死亡取消未发技能，单场已发自由弹继续；离开playing清理新Boss来源弹，不修改旧弹保留政策。
- 第五关唯一Boss槽等权选择史莱姆/野猪/机械，普通敌人的分批规则保留。血条显示真实名称，机械有8条腿的独立耐久摘要。新增五种限流合成音效。

## 代码与资源

状态/规则：`src/game/model/bossTypes.ts`、`src/game/config/bosses.ts`、`src/game/rules/bossPose.ts`、`bossGeometry.ts`、`bossDamage.ts`。技能：`src/game/systems/bossSystem.ts`，仍由现有enemyAttackSystem调用。原型默认数值集中在bosses.ts。

实际PNG（内置image_gen生成，保留alpha；每页1254×1254，4×4单元，以整数边界0/314/627/941/1254登记）：

| 文件 | 内容 |
| --- | --- |
| `public/assets/bosses/boar_king/parts-v1.png` | 5方向身体、5方向头部、分段腿、蹄、尾、鼻息/尘 |
| `public/assets/bosses/mech_centipede/parts-v1.png` | 主体3档、核心、腿装甲/破损/残桩、足端、触手节块 |
| `public/assets/bosses/shared/effects-v1.png` | 碎岩4帧、能量弹4帧、鼻息4帧、碎裂火花4帧 |

图集、loader、原图路径和旋转光影已接入；不在绘制中改变规则或消费战斗随机。新增PNG解码约18MiB，尚未作为GPU总驻留实测。完整生成提示词与工具来源见 [BOSS_ART_PROMPTS.json](BOSS_ART_PROMPTS.json)。

## 验证

- 本轮 `node scripts/run-game-tests.cjs`：83/83通过（原有49+新增34）；覆盖真实updateWorld、projectileSystem、enemyAttackSystem、explodeWorld和zoneSystem路径。
- TypeScript `tsc --noEmit --incremental false`：通过。`check:assets`：94条大小写精确路径、15份图集通过。
- 本次全部改动TS/TSX/CJS文件的eslint检查通过。全仓 `lint:build` 另报4条已有错误，均在未修改的 `test-results/map-assets/check.cjs`（require导入规则）；未删除文件或改lint规则来规避。
- 本地3010真实页面已核对两只Boss的资源加载、装配、名称和机械腿摘要，观察到机械线形预警；浏览器未记录error/warn。静态截图和自动化结果不代替完整真人玩法与平衡验收。
- 生产构建：`next build --webpack` 通过（包含TypeScript与全部静态页面生成）；构建后 next-env.d.ts 与仓库基线一致。

## 试玩

直接使用Next CLI启动（依赖已存在）：`node node_modules/next/dist/bin/next dev --webpack -p 3010`。避免使用包含端口强杀的dev包装脚本。

- `http://localhost:3010/?boss=boar`：开始游戏→选择武器，即进入野猪王。
- `http://localhost:3010/?boss=mech`：同样进入机械。
- `http://localhost:3010/?boss=slime`：旧Boss对照；无参数则为正常流程。

WASD移动、鼠标瞄准、左键射击、E闪现，Escape暂停（以现有输入实现为准）。试玩使用真实初始武器与生命，没有暗加属性；单测不代表这些初始装备适合最终平衡。

重点人工检查：锁线后横移/撞障碍、机械L1与R4分别断腿、预警中断腿减弹、八腿全断后击杀核心；前摇和断腿时暂停/恢复、死亡重开/下一关无旧来源弹。

## 首版限制

这是骨骼与技能均可玩的首版资源，不宣称已完成原计划所有最低逐帧美术量：独立40帧表情、全部入场/死亡手绘帧和完整音效素材尚未制作。当前以部件变换、状态换肤、16帧共享特效和五种合成提示呈现；方向皮肤与关节细节还需美术精修，尤其野猪上下方向步态和机械遮挡层次。

野猪低血二连冲按原方案保持关闭；基础两技能先验收。机械触手不独立受损。完整人工躲避成功率、成型构筑、GPU驻留/帧时和专门的WebGL回退组合尚未验收，不能称为最终平衡或正式美术验收。
