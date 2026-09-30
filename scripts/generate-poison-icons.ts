import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// 用户提供的参考图片URL
const referenceImageUrl = 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2Fimage.png&nonce=965ff8d3-fa44-4fc4-b075-100c704b5522&project_id=7605903781947113507&sign=93b0f31f99565780ec8633ca49d7bc75e23abce9e50f97a548adf6add1777b29';

// 图标配置
const icons = [
  {
    name: 'poison_buff',
    filename: 'poison_buff.png',
    prompt: 'Pixel art game icon, 100x100 pixels, purple toxic liquid puddle with dripping effect, dark purple and light purple gradient, white highlight pixels for glossy effect, black outline, simple and clean design on transparent background, retro video game style, poison buff icon',
  },
  {
    name: 'poison_expand',
    filename: 'poison_expand.png',
    prompt: 'Pixel art game icon, 100x100 pixels, expanding purple toxic circle with multiple rings spreading outward, dark purple center fading to light purple edges, white sparkle highlights, black outline, expansion arrows or radiating lines, transparent background, retro video game style, poison area expansion icon',
  },
  {
    name: 'poison_infect',
    filename: 'poison_infect.png',
    prompt: 'Pixel art game icon, 100x100 pixels, purple toxic liquid spreading from one puddle to two smaller puddles, infection chain effect, dark purple and light purple, white highlight pixels, black outline, contagion spread visual, transparent background, retro video game style, poison infection icon',
  },
  {
    name: 'poison_enhance',
    filename: 'poison_enhance.png',
    prompt: 'Pixel art game icon, 100x100 pixels, intense purple toxic liquid with glowing effect and multiple bubbles, darker more concentrated purple color, bright white highlights, toxic aura, black outline, power-up visual with sparkle effects, transparent background, retro video game style, poison enhancement icon',
  },
];

async function generateIcons() {
  const config = new Config();
  const client = new ImageGenerationClient(config);

  const outputDir = path.join(process.cwd(), 'public/assets');
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('开始生成毒系图标...\n');

  for (const icon of icons) {
    console.log(`正在生成: ${icon.name}...`);
    
    try {
      const response = await client.generate({
        prompt: icon.prompt,
        image: referenceImageUrl,
        size: '2K',
        watermark: false,
      });

      const helper = client.getResponseHelper(response);

      if (helper.success && helper.imageUrls[0]) {
        console.log(`  ✓ 图片生成成功，正在下载...`);
        
        // 下载图片
        const imageResponse = await axios.get(helper.imageUrls[0], {
          responseType: 'arraybuffer',
        });

        const outputPath = path.join(outputDir, icon.filename);
        fs.writeFileSync(outputPath, imageResponse.data);
        
        console.log(`  ✓ 已保存到: ${outputPath}\n`);
      } else {
        console.error(`  ✗ 生成失败: ${helper.errorMessages.join(', ')}\n`);
      }
    } catch (error) {
      console.error(`  ✗ 发生错误: ${error}\n`);
    }
  }

  console.log('所有图标生成完成！');
}

generateIcons().catch(console.error);
