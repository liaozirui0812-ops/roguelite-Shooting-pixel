import axios from 'axios';
import fs from 'fs';
import path from 'path';

// 音效配置 - 使用公开免费的音效资源
const sounds = [
  {
    name: 'shoot',
    filename: 'shoot.mp3',
    // 使用 Mixkit 免费音效
    url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Gun shot
    fallback: 'https://cdn.freesound.org/previews/171/171958_2437358-lq.mp3'
  },
  {
    name: 'enemy_death',
    filename: 'enemy_death.mp3',
    url: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3', // Quick impact
    fallback: 'https://cdn.freesound.org/previews/382/382460_7459374-lq.mp3'
  },
  {
    name: 'explosion',
    filename: 'explosion.mp3',
    url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Explosion
    fallback: 'https://cdn.freesound.org/previews/352/352661_3908071-lq.mp3'
  },
  {
    name: 'button_click',
    filename: 'button_click.mp3',
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // UI Click
    fallback: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3'
  },
  {
    name: 'level_start',
    filename: 'level_start.mp3',
    url: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Game start
    fallback: 'https://cdn.freesound.org/previews/320/320656_5260872-lq.mp3'
  },
  {
    name: 'level_complete',
    filename: 'level_complete.mp3',
    url: 'https://assets.mixkit.co/active_storage/sfx/1990/1990-preview.mp3', // Success
    fallback: 'https://cdn.freesound.org/previews/352/352660_3908071-lq.mp3'
  },
  {
    name: 'coin',
    filename: 'coin.mp3',
    url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Coin
    fallback: 'https://cdn.freesound.org/previews/415/415310_5121236-lq.mp3'
  },
];

async function downloadSounds() {
  const outputDir = path.join(process.cwd(), 'public/assets/sounds');
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('开始下载游戏音效...\n');

  for (const sound of sounds) {
    console.log(`正在下载: ${sound.name}...`);
    
    try {
      // 尝试主URL
      const response = await axios.get(sound.url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status === 200) {
        const outputPath = path.join(outputDir, sound.filename);
        fs.writeFileSync(outputPath, response.data);
        console.log(`  ✓ 已保存到: ${outputPath}\n`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`  主URL下载失败，尝试备用URL...`);
      
      try {
        const fallbackResponse = await axios.get(sound.fallback, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (fallbackResponse.status === 200) {
          const outputPath = path.join(outputDir, sound.filename);
          fs.writeFileSync(outputPath, fallbackResponse.data);
          console.log(`  ✓ 已保存到: ${outputPath}\n`);
        }
      } catch (fallbackError) {
        console.error(`  ✗ 下载失败: ${fallbackError}\n`);
      }
    }
  }

  console.log('所有音效下载完成！');
  console.log(`音效文件保存在: ${outputDir}`);
}

downloadSounds().catch(console.error);
