import { useEffect } from 'react';
import { GAME_CONFIG, type Position } from '@/game';
import type { GameWorld } from '@/game/model/World';
import type { ValueUpdate } from '@/game/runtime/GameRuntime';
import type { GameAssets } from './useGameAssets';
import { clientToCanvas, type AimPresentation } from '@/game/rules/aim';

interface DashState {
  active: boolean;
  startTime: number;
  fromX: number;
  fromY: number;
  dirX: number;
  dirY: number;
  recoveryStart: number;
}

export interface GameInputDeps {
  aimPresentationRef: React.RefObject<AimPresentation>;
  world: GameWorld;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  dashRef: React.RefObject<DashState>;
  dashPendingRef: React.RefObject<boolean>;
  assets: GameAssets;
  setKeys: (update: ValueUpdate<Set<string>>) => void;
  setMousePos: (update: ValueUpdate<Position>) => void;
  setIsMouseDown: (update: ValueUpdate<boolean>) => void;
  setIsPaused: (update: ValueUpdate<boolean>) => void;
  setShowSettings: (show: boolean) => void;
  clearInput: () => void;
  switchWeapon: (direction?: 'next' | 'prev') => void;
  switchWeaponTo: (index: number) => void;
}

export interface GameInputHandlers {
  handleMouseLeave: () => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseDown: () => void;
  handleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
}

/**
 * 输入绑定：键盘（移动/闪现/ESC暂停）、滚轮与数字键换枪、鼠标按下/移动/抬起、
 * Canvas 内暂停/继续/设置按钮命中。由 B1.3 从 page.tsx 机械抽取，语义不变。
 * 注意：world 是 runtime.state 的可变引用，闭包内读取的始终是最新值，键盘 Effect 因此维持空依赖。
 */
export function useGameInput({
  aimPresentationRef,
  world,
  canvasRef,
  dashRef,
  dashPendingRef,
  assets,
  setKeys,
  setMousePos,
  setIsMouseDown,
  setIsPaused,
  setShowSettings,
  clearInput,
  switchWeapon,
  switchWeaponTo,
}: GameInputDeps): GameInputHandlers {
  useEffect(() => {
    if (world.isPaused || world.gameState !== 'playing') {
      aimPresentationRef.current.pointerValid = false;
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    }
  }, [world.isPaused, world.gameState, aimPresentationRef, canvasRef]);
  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 处理ESC键暂停游戏（只在未暂停时响应）
      if (e.key === 'Escape' && world.gameState === 'playing' && !world.isPaused) {
        e.preventDefault();
        // 暂停游戏
        clearInput();
        setIsPaused(true);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;
      // Input commands are only accepted during active combat.
      if (world.gameState !== 'playing' || world.isPaused) {
        return;
      }

      // E键触发闪现（仅在战斗中）
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (!dashRef.current.active) {
          dashPendingRef.current = true;
        }
        return;
      }

      setKeys((prev) => new Set(prev).add(e.key));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key);
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const releaseMouse = () => setIsMouseDown(false);
    window.addEventListener('mouseup', releaseMouse);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', releaseMouse);
    };
    // world 为可变引用，闭包读取最新状态；setter 与 clearInput 均稳定。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 鼠标滚轮切换武器
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 只在游戏进行中且未暂停时响应
      if (world.gameState !== 'playing' || world.isPaused) return;

      // 阻止默认滚动行为
      e.preventDefault();

      // deltaY > 0 表示向下滚动，切换到下一个武器
      // deltaY < 0 表示向上滚动，切换到上一个武器
      if (e.deltaY > 0) {
        switchWeapon('next');
      } else if (e.deltaY < 0) {
        switchWeapon('prev');
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [world.gameState, world.isPaused, switchWeapon]);

  // 数字键快捷切换武器
  useEffect(() => {
    const handleWeaponKey = (e: KeyboardEvent) => {
      // 只在游戏进行中且未暂停时响应
      if (world.gameState !== 'playing' || world.isPaused) return;
      // 忽略输入框/文本区域中的按键
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;

      // 数字键 1-9，对应武器索引 0-8
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 9) {
        // 防止与方向键误触（不拦截，仅当有对应武器时触发）
        switchWeaponTo(keyNum - 1);
      }
    };

    window.addEventListener('keydown', handleWeaponKey);

    return () => {
      window.removeEventListener('keydown', handleWeaponKey);
    };
  }, [world.gameState, world.isPaused, switchWeaponTo]);

  // 鼠标事件
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (world.gameState === 'playing' && !world.isPaused && !aimPresentationRef.current.blocked) {
      setMousePos({ x: e.clientX, y: e.clientY });
      aimPresentationRef.current.pointerValid = true;
    }
  };

  const handleMouseDown = () => {
    if (world.gameState === 'playing' && !world.isPaused &&
      aimPresentationRef.current.pointerValid && !aimPresentationRef.current.blocked) {
      setIsMouseDown(true);
    }
  };

  // 处理canvas点击事件
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    // 计算点击位置相对于canvas的坐标
    const rect = canvasRef.current.getBoundingClientRect();
    const point = clientToCanvas({ x: e.clientX, y: e.clientY }, rect, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    if (!point) return;
    const { x, y } = point;

    // 如果游戏暂停，检查是否点击了继续游戏按钮或设置按钮
    if (world.isPaused) {
      // 继续游戏按钮
      const buttonY = GAME_CONFIG.CANVAS_HEIGHT - 60;
      const buttonX = GAME_CONFIG.CANVAS_WIDTH / 2 - 60;
      const buttonWidth = 120;
      const buttonHeight = 40;

      if (
        x >= buttonX &&
        x <= buttonX + buttonWidth &&
        y >= buttonY - 20 &&
        y <= buttonY - 20 + buttonHeight
      ) {
        // 点击了继续游戏按钮，立即恢复游戏
        setIsPaused(false);
        return;
      }

      // 设置按钮（左下角）
      const settingsBtnX = 20;
      const settingsBtnY = GAME_CONFIG.CANVAS_HEIGHT - 60;
      const settingsBtnWidth = 100;
      const settingsBtnHeight = 40;

      if (
        x >= settingsBtnX &&
        x <= settingsBtnX + settingsBtnWidth &&
        y >= settingsBtnY - 20 &&
        y <= settingsBtnY - 20 + settingsBtnHeight
      ) {
        // 点击了设置按钮，打开设置弹窗
        setShowSettings(true);
        return;
      }
    }

    // 检查是否点击了暂停按钮（只在游戏未暂停时响应）
    if (!world.isPaused && assets.pause) {
      const buttonSize = 40;
      const buttonX = (GAME_CONFIG.CANVAS_WIDTH - buttonSize) / 2;
      const buttonY = 10;

      if (x >= buttonX && x <= buttonX + buttonSize && y >= buttonY && y <= buttonY + buttonSize) {
        // 点击了暂停按钮，立即暂停
        clearInput();
        setIsPaused(true);
        return;
      }
    }
  };

  const handleMouseUp = () => setIsMouseDown(false);
  const handleMouseLeave = () => {
    aimPresentationRef.current.pointerValid = false;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    setIsMouseDown(false);
  };

  return { handleMouseMove, handleMouseDown, handleClick, handleMouseUp, handleMouseLeave };
}
