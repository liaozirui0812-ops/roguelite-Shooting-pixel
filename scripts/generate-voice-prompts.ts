import { TTSClient, Config } from 'coze-coding-dev-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// TTS 语音提示配置
const voicePrompts = [
  {
    name: 'level_start',
    filename: 'level_start.mp3',
    text: '战斗开始！',
    speaker: 'zh_male_m191_uranus_bigtts', // 男声
    speechRate: 10, // 稍快一点
  },
  {
    name: 'level_complete',
    filename: 'level_complete.mp3',
    text: '关卡通过！选择升级！',
    speaker: 'zh_male_m191_uranus_bigtts',
    speechRate: 10,
  },
  {
    name: 'game_over',
    filename: 'game_over.mp3',
    text: '游戏结束！',
    speaker: 'zh_male_m191_uranus_bigtts',
    speechRate: 0,
  },
  {
    name: 'boss_appear',
    filename: 'boss_appear.mp3',
    text: 'Boss出现！小心！',
    speaker: 'zh_male_m191_uranus_bigtts',
    speechRate: 20,
  },
];

async function generateVoicePrompts() {
  const config = new Config();
  const client = new TTSClient(config);

  const outputDir = path.join(process.cwd(), 'public/assets/sounds');
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('开始生成语音提示...\n');

  for (const prompt of voicePrompts) {
    console.log(`正在生成: ${prompt.name} ("${prompt.text}")...`);
    
    try {
      const response = await client.synthesize({
        uid: 'game_sound_gen',
        text: prompt.text,
        speaker: prompt.speaker,
        speechRate: prompt.speechRate,
        audioFormat: 'mp3',
        sampleRate: 22050,
      });

      console.log(`  ✓ TTS合成成功，正在下载音频...`);
      
      // 下载音频
      const audioResponse = await axios.get(response.audioUri, {
        responseType: 'arraybuffer',
      });

      const outputPath = path.join(outputDir, prompt.filename);
      fs.writeFileSync(outputPath, audioResponse.data);
      
      console.log(`  ✓ 已保存到: ${outputPath} (${response.audioSize} bytes)\n`);
    } catch (error) {
      console.error(`  ✗ 生成失败: ${error}\n`);
    }
  }

  console.log('所有语音提示生成完成！');
}

generateVoicePrompts().catch(console.error);
