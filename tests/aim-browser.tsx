import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useGameRuntime, useGameLoop } from '../src/hooks/useGameRuntime';
import { useGameInput } from '../src/hooks/useGameInput';
import { createWorld } from '../src/game/model/World';
import { createGameView } from '../src/game/model/View';
import { createAimPresentation, deriveAimSpread, crosshairGap } from '../src/game/rules/aim';
import { movementSystem } from '../src/game/systems/movementSystem';
import { weaponSystem } from '../src/game/systems/weaponSystem';
import { renderWorld, type RenderWorldContext } from '../src/game/render/renderWorld';
import type { UpdateWorldContext } from '../src/game/systems/context';
import { WEAPONS } from '../src/game/config/weapons';

// Isolated UI fixture: real input hook, fixed clock, movement/fire systems and renderer.
// No enemies, persistent changes, application route or production debug API.
const ref = <T,>(current: T) => ({ current });
function initialWorld() { const w = createWorld(); w.gameState = 'playing'; return w; }
function Fixture() {
  const {runtime, view} = useGameRuntime(initialWorld, createGameView), world = runtime.state;
  const canvasRef = useRef<HTMLCanvasElement>(null), aimPresentationRef = useRef(createAimPresentation());
  const dashRef = useRef({active:false,startTime:0,fromX:0,fromY:0,dirX:0,dirY:0,recoveryStart:0});
  const dashPendingRef = useRef(false), dashCooldownStartRef = useRef(0);
  const cameraPosRef = useRef({x:3000,y:3000}), cameraTargetRef = useRef({x:3000,y:3000});
  const cameraInitRef = useRef(false), playerPrevPosRef = useRef({x:3000,y:3000});
  const baseTransformRef = useRef<DOMMatrix | null>(null);
  const recoilRef = useRef({backward:0,upward:0,shake:0}), muzzleFlashesRef = useRef([]), screenShakeRef = useRef(0);
  const clearInput = () => { runtime.set('keys',new Set());runtime.set('isMouseDown',false);
    dashPendingRef.current=false;aimPresentationRef.current.pointerValid=false;
    if(canvasRef.current)canvasRef.current.style.cursor='default'; };
  const input = useGameInput({world,canvasRef,aimPresentationRef,dashRef,dashPendingRef,assets:{},
    setKeys:runtime.setter('keys'),setMousePos:runtime.setter('mousePos'),setIsMouseDown:runtime.setter('isMouseDown'),
    setIsPaused:runtime.setter('isPaused'),setShowSettings(){},clearInput,switchWeapon(){},switchWeaponTo(){}});
  const context: UpdateWorldContext = { world,runtime,canvasRef,aimPresentationRef,dashRef,dashPendingRef,dashCooldownStartRef,
    DASH_COOLDOWN_MS:5000,NORMAL_MOVE_PPM:.017,viewFx:{recoil:recoilRef,muzzleFlashes:muzzleFlashesRef,screenShake:screenShakeRef},
    playSound(){}, triggerExplosion(){},triggerVampireHeal(){},triggerScreenShake(){},stopBGM(){},checkLevelCompletion(){},boomImage:null,
    setWaveTransition:runtime.setter('waveTransition'),
    setMonsters:runtime.setter('monsters'),
    setCurrentBatchInitialCount:runtime.setter('currentBatchInitialCount'),
    setMonstersRemaining:runtime.setter('monstersRemaining'),
    setPendingMonsterBatches:runtime.setter('pendingMonsterBatches'),
    setNextBatchTime:runtime.setter('nextBatchTime'),
    setDashCooldown:runtime.setter('dashCooldown'),
    setPlayer:runtime.setter('player'),
    setKeys:runtime.setter('keys'),
    setBullets:runtime.setter('bullets'),
    setSmokeEffects:runtime.setter('smokeEffects'),
    setDamageNumbers:runtime.setter('damageNumbers'),
    setAccumulatedDamage:runtime.setter('accumulatedDamage'),
    setScore:runtime.setter('score'),
    setBossAlive:runtime.setter('bossAlive'),
    setCoins:runtime.setter('coins'),
    setBossCurrentHp:runtime.setter('bossCurrentHp'),
    setPierceEffects:runtime.setter('pierceEffects'),
    setGameState:runtime.setter('gameState'),
    setExplosionEffects:runtime.setter('explosionEffects'),
    setAffixExplosionParticles:runtime.setter('affixExplosionParticles'),
    setPoisonCircles:runtime.setter('poisonCircles'),
    setEnemyBullets:runtime.setter('enemyBullets'),
    setPlayerHitParticles:runtime.setter('playerHitParticles'),
    setBossBarrages:runtime.setter('bossBarrages'),
    setGoldFloatingTexts:runtime.setter('goldFloatingTexts'),
    setVampireHealEffects:runtime.setter('vampireHealEffects'),
    setBossMaxHp:runtime.setter('bossMaxHp'),
  };
  const renderer: RenderWorldContext = {
    world,runtime,canvasRef,aimPresentationRef,t:key=>key,screenShakeRef,cameraPosRef,cameraTargetRef,cameraInitRef,
    playerPrevPosRef,baseTransformRef,mapBackgroundCanvasRef:ref(null),obstacleImages:{},dashRef,
    recoilRef,muzzleFlashesRef,DASH_COOLDOWN_MS:5000,getWeaponImage:()=>null,
    CAMERA_FOLLOW_CONFIG:{TAU:.15,DEAD_ZONE_RADIUS:40,LAG_LIMIT_RATIO:.15,LAG_CATCHUP_TIME:.1,HOME_TAU:.2},
    rocketImage:null,bulletImage:null,bossFireBallImage:null,ballImage:null,rangeImage:null,
    bossImage:null,boss2Image:null,enemy_1Image:null,enemy_2Image:null,enemy_3Image:null,enemy_4_1Image:null,enemy_4_2Image:null,
    chestImage:null,weaponUpgradeBoxImage:null,healthPotionImage:null,coinImage:null,boomImage:null,skillIconImage:null,
    smokeImage:null,playerWalkImage:null,playerIdleImage:null,playerDashImage:null,fireImage:null,pauseImage:null,
    arrowImage:null,hpBarImage:null,hpGreenImage:null,hpYellowImage:null,hpRedImage:null,
  };
  useGameLoop(runtime,()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const tick={canvas,now:runtime.now(),weaponConfig:WEAPONS[world.player.weapon],desperateActive:false,effectiveReloadBonus:0,effectiveReloadTime:3000};
    movementSystem(context,tick);weaponSystem(context,tick);
  },delta=>renderWorld(renderer,delta),clearInput);
  const spread=deriveAimSpread(world.player,WEAPONS[world.player.weapon],world.aimSpread.movementBloom);
  const reset = () => { runtime.set('player',p=>({...p,x:3000,y:3000}));cameraInitRef.current=false; };
  return <main>
    <h1>移动散布 · 浏览器验收夹具</h1>
    <p>无敌人；控制按钮用于保持输入，画布使用实际游戏输入与绘制链。</p>
    <nav>
      <button onClick={()=>{reset();runtime.set('keys',new Set(['d']));}}>保持右移</button>
      <button onClick={()=>runtime.set('keys',new Set())}>停止</button>
      <button onClick={()=>runtime.set('player',p=>({...p,accuracyPoints:100}))}>精准 100</button>
      <button onClick={()=>runtime.set('player',p=>({...p,accuracyPoints:0}))}>精准 0</button>
      <button onClick={()=>runtime.set('isPaused',true)}>暂停</button>
      <button onClick={()=>{canvasRef.current!.style.width='600px';canvasRef.current!.style.height='400px';}}>缩放 50%</button>
      <button onClick={()=>{canvasRef.current!.style.width='1200px';canvasRef.current!.style.height='800px';}}>原尺寸</button>
    </nav>
    <output aria-label="散布状态">{JSON.stringify({bloom:+world.aimSpread.movementBloom.toFixed(4),
      halfAngleDeg:+(spread.envelopeHalf*180/Math.PI).toFixed(4),gap:+crosshairGap(spread.envelopeHalf).toFixed(2),
      accuracy:view.player.accuracyPoints,paused:view.isPaused,shots:world.bullets.length})}</output>
    <canvas aria-label="验收画布" ref={canvasRef} width={1200} height={800} tabIndex={0}
      onMouseMove={input.handleMouseMove} onMouseEnter={input.handleMouseMove} onMouseLeave={input.handleMouseLeave}
      onMouseDown={input.handleMouseDown} onMouseUp={input.handleMouseUp} onClick={input.handleClick}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
