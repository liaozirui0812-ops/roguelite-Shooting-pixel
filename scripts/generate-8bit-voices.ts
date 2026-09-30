import { TTSClient, Config } from 'coze-coding-dev-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function generateSounds() {
  const config = new Config();
  const ttsClient = new TTSClient(config);
  
  const outputDir = path.join(process.cwd(), 'public/assets/sounds');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('开始生成8-bit风格音效...\n');

  // 生成8-bit风格的"开始"语音（用TTS但参数调整为电子游戏风格）
  console.log('正在生成: level_start (8-bit语音版)...');
  try {
    const response = await ttsClient.synthesize({
      uid: 'game_sound_8bit',
      text: '开始！',
      speaker: 'zh_male_m191_uranus_bigtts',
      speechRate: 50, // 加速，让声音更像游戏音效
      audioFormat: 'mp3',
      sampleRate: 22050,
    });

    const audioResponse = await axios.get(response.audioUri, {
      responseType: 'arraybuffer',
    });

    const outputPath = path.join(outputDir, 'level_start.mp3');
    fs.writeFileSync(outputPath, audioResponse.data);
    console.log(`  ✓ 已保存到: ${outputPath}\n`);
  } catch (error) {
    console.error(`  ✗ 生成失败: ${error}\n`);
  }

  // 生成8-bit风格的"关卡通过"语音
  console.log('正在生成: level_complete (8-bit语音版)...');
  try {
    const response = await ttsClient.synthesize({
      uid: 'game_sound_8bit_complete',
      text: '升级！',
      speaker: 'zh_male_m191_uranus_bigtts',
      speechRate: 50,
      audioFormat: 'mp3',
      sampleRate: 22050,
    });

    const audioResponse = await axios.get(response.audioUri, {
      responseType: 'arraybuffer',
    });

    const outputPath = path.join(outputDir, 'level_complete.mp3');
    fs.writeFileSync(outputPath, audioResponse.data);
    console.log(`  ✓ 已保存到: ${outputPath}\n`);
  } catch (error) {
    console.error(`  ✗ 生成失败: ${error}\n`);
  }

  // 生成8-bit风格的"游戏结束"语音
  console.log('正在生成: game_over (8-bit语音版)...');
  try {
    const response = await ttsClient.synthesize({
      uid: 'game_sound_8bit_over',
      text: '游戏结束！',
      speaker: 'zh_male_m191_uranus_bigtts',
      speechRate: 40,
      audioFormat: 'mp3',
      sampleRate: 22050,
    });

    const audioResponse = await axios.get(response.audioUri, {
      responseType: 'arraybuffer',
    });

    const outputPath = path.join(outputDir, 'game_over.mp3');
    fs.writeFileSync(outputPath, audioResponse.data);
    console.log(`  ✓ 已保存到: ${outputPath}\n`);
  } catch (error) {
    console.error(`  ✗ 生成失败: ${error}\n`);
  }

  // 生成8-bit风格的"Boss出现"语音
  console.log('正在生成: boss_appear (8-bit语音版)...');
  try {
    const response = await ttsClient.synthesize({
      uid: 'game_sound_8bit_boss',
      text: 'Boss来袭！',
      speaker: 'zh_male_m191_uranus_bigtts',
      speechRate: 60,
      audioFormat: 'mp3',
      sampleRate: 22050,
    });

    const audioResponse = await axios.get(response.audioUri, {
      responseType: 'arraybuffer',
    });

    const outputPath = path.join(outputDir, 'boss_appear.mp3');
    fs.writeFileSync(outputPath, audioResponse.data);
    console.log(`  ✓ 已保存到: ${outputPath}\n`);
  } catch (error) {
    console.error(`  ✗ 生成失败: ${error}\n`);
  }

  console.log('所有语音生成完成！');
}

generateSounds().catch(console.error);
