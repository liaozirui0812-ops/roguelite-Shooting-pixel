'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { GameRuntime, type RuntimePhase } from '@/game/runtime/GameRuntime';
import { FixedStepClock } from '@/game/runtime/FixedStepClock';

export function useGameRuntime<S extends RuntimePhase, V>(
  create: () => S,
  makeView: (state: S) => V
) {
  const [runtime] = useState(() => new GameRuntime(create(), Math.random, makeView));
  const view = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot
  ) as V;
  return { runtime, view };
}

/** One RAF registration; fresh callbacks without restarting for HUD/input changes. */
export function useGameLoop<S extends RuntimePhase>(
  runtime: GameRuntime<S>,
  update: () => void,
  render: (deltaMs: number) => void,
  clearInput: () => void
) {
  const callbacks = useRef({ update, render, clearInput });
  useEffect(() => {
    callbacks.current = { update, render, clearInput };
  });
  useEffect(() => {
    let raf = 0;
    const clock = new FixedStepClock();
    let stopped = false;
    const frame = (timestamp: number) => {
      if (stopped) return;
      const elapsed = clock.advance(
        timestamp,
        () => runtime.state.gameState === 'playing' && !runtime.state.isPaused,
        () => runtime.step(callbacks.current.update)
      );
      if (runtime.state.gameState === 'playing') {
        callbacks.current.render(Math.min(elapsed, 100));
        runtime.recordRender();
      }
      raf = requestAnimationFrame(frame);
    };
    const loseFocus = () => {
      callbacks.current.clearInput();
      if (runtime.state.gameState === 'playing') runtime.set('isPaused', true as S['isPaused']);
      clock.reset();
    };
    const hidden = () => {
      if (document.hidden) loseFocus();
    };
    runtime.recordLoopStart();
    raf = requestAnimationFrame(frame);
    window.addEventListener('blur', loseFocus);
    const cancelPointer = () => callbacks.current.clearInput();
    window.addEventListener('pointercancel', cancelPointer);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('blur', loseFocus);
      window.removeEventListener('pointercancel', cancelPointer);
      document.removeEventListener('visibilitychange', hidden);
      runtime.clearTasks();
    };
  }, [runtime]);
}
