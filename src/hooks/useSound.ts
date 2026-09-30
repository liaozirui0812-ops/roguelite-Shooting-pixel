'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

// 音效类型
export type SoundType = 
  | 'shoot'           // 开火
  | 'enemy_death'     // 敌人死亡
  | 'explosion'       // 爆炸
  | 'button_click'    // 按钮点击
  | 'coin'            // 金币
  | 'level_start'     // 关卡开始
  | 'level_complete'  // 关卡结束
  | 'game_over'       // 游戏结束
  | 'boss_appear'     // Boss出现
  | 'bgm';            // 背景音乐

// 音效配置
interface SoundConfig {
  type: 'synth' | 'file';  // synth: 合成音效, file: 音频文件
  file?: string;           // 文件路径（type为file时）
  generator?: (ctx: AudioContext, gainNode: GainNode) => void; // 合成函数
  volume?: number;         // 音量 0-1
  rateLimit?: number;      // 限流间隔(ms)
}

// 创建噪声缓冲区的辅助函数
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  return buffer;
}

// 合成高质量开火音效
const generateShootSound = (ctx: AudioContext, gainNode: GainNode) => {
  const now = ctx.currentTime;
  
  // 第一层：枪击噪声（高频爆破感）
  const noiseBuffer = createNoiseBuffer(ctx, 0.1);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  
  // 高通滤波器 - 让枪声更清脆
  const hpFilter = ctx.createBiquadFilter();
  hpFilter.type = 'highpass';
  hpFilter.frequency.setValueAtTime(800, now);
  
  // 低通滤波器 - 控制音色
  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.setValueAtTime(8000, now);
  lpFilter.frequency.exponentialRampToValueAtTime(500, now + 0.05);
  
  // 噪声增益（音量包络）
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  
  // 第二层：低频冲击（枪击的"砰"声）
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
  
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.4, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
  
  // 第三层：中高频泛音（增加金属感）
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(800, now);
  osc2.frequency.exponentialRampToValueAtTime(200, now + 0.03);
  
  const osc2Gain = ctx.createGain();
  osc2Gain.gain.setValueAtTime(0.15, now);
  osc2Gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
  
  // 连接所有层
  noise.connect(hpFilter);
  hpFilter.connect(lpFilter);
  lpFilter.connect(noiseGain);
  noiseGain.connect(gainNode);
  
  osc.connect(oscGain);
  oscGain.connect(gainNode);
  
  osc2.connect(osc2Gain);
  osc2Gain.connect(gainNode);
  
  // 启动所有层
  noise.start(now);
  noise.stop(now + 0.1);
  osc.start(now);
  osc.stop(now + 0.08);
  osc2.start(now);
  osc2.stop(now + 0.05);
};

// 合成高质量爆炸音效
const generateExplosionSound = (ctx: AudioContext, gainNode: GainNode) => {
  const now = ctx.currentTime;
  const duration = 0.6;
  
  // 第一层：低频隆隆声（爆炸的主体）
  const bassOsc = ctx.createOscillator();
  bassOsc.type = 'sawtooth';
  bassOsc.frequency.setValueAtTime(80, now);
  bassOsc.frequency.exponentialRampToValueAtTime(20, now + duration);
  
  const bassGain = ctx.createGain();
  bassGain.gain.setValueAtTime(0.4, now);
  bassGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  // 低通滤波
  const bassFilter = ctx.createBiquadFilter();
  bassFilter.type = 'lowpass';
  bassFilter.frequency.setValueAtTime(400, now);
  bassFilter.frequency.exponentialRampToValueAtTime(50, now + duration);
  
  // 第二层：爆炸噪声（爆裂感）
  const noiseBuffer = createNoiseBuffer(ctx, duration);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.6, now);
  noiseGain.gain.setValueAtTime(0.6, now);
  noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  // 噪声滤波器 - 控制噪声的频率特性
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(1000, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(100, now + duration);
  noiseFilter.Q.setValueAtTime(1, now);
  
  // 第三层：中频冲击（爆炸的"冲击感"）
  const midOsc = ctx.createOscillator();
  midOsc.type = 'square';
  midOsc.frequency.setValueAtTime(200, now);
  midOsc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
  
  const midGain = ctx.createGain();
  midGain.gain.setValueAtTime(0.3, now);
  midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  
  // 连接所有层
  bassOsc.connect(bassFilter);
  bassFilter.connect(bassGain);
  bassGain.connect(gainNode);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(gainNode);
  
  midOsc.connect(midGain);
  midGain.connect(gainNode);
  
  // 启动所有层
  bassOsc.start(now);
  bassOsc.stop(now + duration);
  noise.start(now);
  noise.stop(now + duration);
  midOsc.start(now);
  midOsc.stop(now + 0.4);
};

// 合成敌人死亡音效
const generateEnemyDeathSound = (ctx: AudioContext, gainNode: GainNode) => {
  const now = ctx.currentTime;
  
  // 使用频率下降的振荡器模拟死亡音效
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
  
  // 音量包络 - 快速下降
  gainNode.gain.setValueAtTime(0.25, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
  
  osc.connect(gainNode);
  osc.start(now);
  osc.stop(now + 0.15);
};

// 合成按钮点击音效
const generateButtonClickSound = (ctx: AudioContext, gainNode: GainNode) => {
  const now = ctx.currentTime;
  
  // 短促的高频点击
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
  
  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
  
  osc.connect(gainNode);
  osc.start(now);
  osc.stop(now + 0.05);
};

// 合成金币音效
const generateCoinSound = (ctx: AudioContext, gainNode: GainNode) => {
  const now = ctx.currentTime;
  
  // 两个高频音符组合成"叮"的声音
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1500, now);
  
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(2000, now);
  
  // 音量包络
  gainNode.gain.setValueAtTime(0.25, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
  
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  
  osc1.start(now);
  osc1.stop(now + 0.18);
  osc2.start(now + 0.02);
  osc2.stop(now + 0.2);
};

// 音效配置表
const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  shoot: {
    type: 'synth',
    generator: generateShootSound,
    volume: 0.5,
    rateLimit: 50,
  },
  enemy_death: {
    type: 'synth',
    generator: generateEnemyDeathSound,
    volume: 0.3,
    rateLimit: 30,
  },
  explosion: {
    type: 'synth',
    generator: generateExplosionSound,
    volume: 0.5,
    rateLimit: 100,
  },
  button_click: {
    type: 'synth',
    generator: generateButtonClickSound,
    volume: 0.2,
  },
  coin: {
    type: 'synth',
    generator: generateCoinSound,
    volume: 0.3,
  },
  level_start: {
    type: 'file',
    file: '/assets/sounds/level_start.mp3',
    volume: 0.7,
  },
  level_complete: {
    type: 'file',
    file: '/assets/sounds/level_complete.mp3',
    volume: 0.7,
  },
  game_over: {
    type: 'file',
    file: '/assets/sounds/game_over.mp3',
    volume: 0.7,
  },
  boss_appear: {
    type: 'file',
    file: '/assets/sounds/boss_appear.mp3',
    volume: 0.7,
  },
  bgm: {
    type: 'synth',
    volume: 0.15,
  },
};

// 音效缓存
const audioCache: Map<string, AudioBuffer> = new Map();

// 8-bit战斗背景音乐生成器
class BGMGenerator {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private isPlaying: boolean = false;
  private tempo: number = 140; // BPM
  private beatDuration: number;
  private oscillators: OscillatorNode[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  
  // 音符频率表（C大调）
  private noteFrequencies: Record<string, number> = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  };
  
  // 主旋律（8小节循环）
  private melody = [
    'E5', 'E5', 'E5', 'C5', 'E5', 'G5', 'G4', null,
    'C5', null, 'G4', null, 'E4', null, 'A4', 'B4',
    'A4', 'A4', 'G4', 'E5', 'G5', 'A5', 'F5', 'G5',
    'E5', null, 'C5', 'D5', 'B4', 'C5', null, 'G4',
    'E5', 'E5', 'E5', 'C5', 'E5', 'G5', 'G4', null,
    'C5', null, 'G4', 'E4', 'C4', 'G4', 'E4', 'C4',
    'G4', 'G4', 'A4', 'B4', 'C5', null, 'G4', 'A4',
    'F5', 'G5', 'E5', 'C5', 'D5', 'B4', 'G4', null,
  ];
  
  // 低音线条
  private bass = [
    'C3', null, null, null, 'C3', null, 'G3', null,
    'A3', null, 'E3', null, 'F3', null, 'C3', null,
    'C3', null, null, null, 'G3', null, 'E3', null,
    'A3', null, 'F3', null, 'G3', null, 'E3', null,
  ];
  
  // 鼓点节奏
  private drums = [
    1, 0, 0, 0, 1, 0, 0, 0, // 底鼓
    0, 0, 1, 0, 0, 0, 1, 0, // 军鼓
    1, 1, 1, 1, 1, 1, 1, 1, // 踩镲
  ];
  
  private currentBeat: number = 0;
  
  constructor(ctx: AudioContext, masterGain: GainNode) {
    this.ctx = ctx;
    this.masterGain = masterGain;
    this.beatDuration = 60 / this.tempo / 2; // 16分音符的时值
  }
  
  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentBeat = 0;
    
    this.intervalId = setInterval(() => this.playBeat(), this.beatDuration * 1000);
  }
  
  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // 停止所有振荡器
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    this.oscillators = [];
  }
  
  private playBeat() {
    const beat = this.currentBeat % 32;
    const now = this.ctx.currentTime;
    
    // 播放旋律
    const melodyNote = this.melody[beat];
    if (melodyNote && this.noteFrequencies[melodyNote]) {
      this.playSquareNote(this.noteFrequencies[melodyNote], 0.15, 0.08);
    }
    
    // 播放低音（每4拍一次）
    if (beat % 4 === 0) {
      const bassNote = this.bass[beat];
      if (bassNote && this.noteFrequencies[bassNote]) {
        this.playSquareNote(this.noteFrequencies[bassNote], 0.25, this.beatDuration * 3.5);
      }
    }
    
    // 播放鼓点
    if (this.drums[beat % 8] === 1) {
      this.playDrum(0.12);
    }
    if (beat % 8 === 4) { // 军鼓
      this.playSnare(0.1);
    }
    // 踩镲（每拍）
    this.playHiHat(0.03);
    
    this.currentBeat++;
  }
  
  private playSquareNote(freq: number, volume: number, duration: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    // 音量包络
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.01);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.1);
    
    this.oscillators.push(osc);
  }
  
  private playDrum(volume: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
    
    this.oscillators.push(osc);
  }
  
  private playSnare(volume: number) {
    // 噪声模拟军鼓
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start();
    noise.stop(this.ctx.currentTime + 0.15);
  }
  
  private playHiHat(volume: number) {
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, this.ctx.currentTime);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.03);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start();
  }
}

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const lastPlayTimeRef = useRef<Map<SoundType, number>>(new Map());
  const bgmGeneratorRef = useRef<BGMGenerator | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);

  // 初始化 AudioContext
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;
    
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;
    
    // 创建主音量节点
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;
    
    setIsInitialized(true);
    return ctx;
  }, [volume]);

  // 预加载音频文件
  const preloadSounds = useCallback(async () => {
    const ctx = initAudioContext();
    if (!ctx) return;
    
    const fileSounds = Object.entries(SOUND_CONFIGS).filter(([_, config]) => config.type === 'file');
    
    for (const [name, config] of fileSounds) {
      if (config.file && !audioCache.has(config.file)) {
        try {
          const response = await fetch(config.file);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          audioCache.set(config.file, audioBuffer);
          console.log(`预加载音效: ${name}`);
        } catch (error) {
          console.warn(`加载音效失败: ${config.file}`, error);
        }
      }
    }
  }, [initAudioContext]);

  // 播放音效
  const play = useCallback((soundType: SoundType) => {
    if (isMuted) return;
    
    const config = SOUND_CONFIGS[soundType];
    if (!config) return;
    
    // 限流检查
    if (config.rateLimit) {
      const now = Date.now();
      const lastTime = lastPlayTimeRef.current.get(soundType) || 0;
      if (now - lastTime < config.rateLimit) return;
      lastPlayTimeRef.current.set(soundType, now);
    }
    
    const ctx = initAudioContext();
    if (!ctx || !masterGainRef.current) return;
    
    // 如果 AudioContext 被暂停，恢复它
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // 创建独立的 GainNode 用于此音效
    const gainNode = ctx.createGain();
    const soundVolume = (config.volume ?? 0.5) * volume;
    gainNode.gain.setValueAtTime(soundVolume, ctx.currentTime);
    gainNode.connect(masterGainRef.current);
    
    if (config.type === 'synth' && config.generator) {
      // 合成音效
      config.generator(ctx, gainNode);
    } else if (config.type === 'file' && config.file) {
      // 文件音效
      const cachedBuffer = audioCache.get(config.file);
      if (cachedBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = cachedBuffer;
        source.connect(gainNode);
        source.start();
      } else {
        // 尝试动态加载
        fetch(config.file)
          .then(res => res.arrayBuffer())
          .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
          .then(audioBuffer => {
            audioCache.set(config.file!, audioBuffer);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(gainNode);
            source.start();
          })
          .catch(err => console.warn('播放音效失败:', err));
      }
    }
  }, [isMuted, volume, initAudioContext]);

  // 播放背景音乐
  const playBGM = useCallback(() => {
    if (isBgmPlaying || isMuted) return;
    
    const ctx = initAudioContext();
    if (!ctx || !masterGainRef.current) return;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // 创建BGM专用的增益节点（音量更低）
    const bgmGain = ctx.createGain();
    bgmGain.gain.setValueAtTime(0.3, ctx.currentTime); // BGM音量系数
    bgmGain.connect(masterGainRef.current);
    
    // 创建BGM生成器
    bgmGeneratorRef.current = new BGMGenerator(ctx, bgmGain);
    bgmGeneratorRef.current.start();
    setIsBgmPlaying(true);
  }, [isBgmPlaying, isMuted, initAudioContext]);

  // 停止背景音乐
  const stopBGM = useCallback(() => {
    if (bgmGeneratorRef.current) {
      bgmGeneratorRef.current.stop();
      bgmGeneratorRef.current = null;
    }
    setIsBgmPlaying(false);
  }, []);

  // 切换静音
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (masterGainRef.current) {
        masterGainRef.current.gain.setValueAtTime(
          newMuted ? 0 : volume,
          audioContextRef.current?.currentTime || 0
        );
      }
      // 静音时停止BGM
      if (newMuted && bgmGeneratorRef.current) {
        bgmGeneratorRef.current.stop();
        bgmGeneratorRef.current = null;
        setIsBgmPlaying(false);
      }
      return newMuted;
    });
  }, [volume]);

  // 设置音量
  const setMasterVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (masterGainRef.current && !isMuted) {
      masterGainRef.current.gain.setValueAtTime(
        newVolume,
        audioContextRef.current?.currentTime || 0
      );
    }
  }, [isMuted]);

  // 用户交互后初始化
  useEffect(() => {
    const handleFirstInteraction = () => {
      initAudioContext();
      preloadSounds();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [initAudioContext, preloadSounds]);

  // 清理
  useEffect(() => {
    return () => {
      if (bgmGeneratorRef.current) {
        bgmGeneratorRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    play,
    playBGM,
    stopBGM,
    isMuted,
    toggleMute,
    volume,
    setVolume: setMasterVolume,
    isInitialized,
    isBgmPlaying,
    preloadSounds,
  };
}
