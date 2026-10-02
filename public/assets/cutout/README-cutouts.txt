PNG 透明背景处理结果

源文件夹：D:\roguelite-Shooting-pixel\public\assets
检查：78 张 PNG；处理：19 张图标。
55 张已有透明通道的素材保留；bg.png 与 HP_green.png、HP_red.png、HP_yellow.png 是游戏背景或血条填充纹理，保留。

处理方式：Python + Pillow + NumPy，根据逐张检查的背景类型生成透明通道。
所有 19 张图均保持 2048 × 2048；RGB 数据逐像素一致；只修改 alpha。
白色高光与图标内部实心白色区域保留；火焰环中心、灵气间隙、斧头孔洞、链环孔洞已设为透明。
发光边缘保留半透明效果。

assets/ 中是 19 张处理后 PNG，保持原文件名。
原文件未覆盖，游戏当前素材路径也未修改。
需要在游戏中使用时，可先备份原文件，再将这 19 张 PNG 复制到原 assets 文件夹。

pistol_final_strike.png 的原图主体是红色方块，本次保留原主体，只去掉外围棋盘格。
原图中覆盖在主体上的文字或水印保持原像素；背景区域随背景一起透明化。

cutout-manifest.json 记录每张图的原文件和结果 SHA-256、尺寸、透明像素统计。
cutout-preview.jpg 提供深色、浅色背景预览。
cutout_assets.py 保存了本次针对这些素材的处理逻辑；其中源目录路径需按实际环境调整。
