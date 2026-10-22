const { test } = require('node:test');
const assert = require('node:assert/strict');
const { GameRuntime } = require('../src/game/runtime/GameRuntime.ts');
const { FixedStepClock } = require('../src/game/runtime/FixedStepClock.ts');
const { createWorld } = require('../src/game/model/World.ts');
const { createPlayer } = require('../src/game/runtime/createPlayer.ts');
const { resetRunWorld } = require('../src/game/runtime/createRun.ts');
const { movementSystem } = require('../src/game/systems/movementSystem.ts');
const { weaponSystem } = require('../src/game/systems/weaponSystem.ts');
const { projectileSystem } = require('../src/game/systems/projectileSystem.ts');
const { switchWeapon, switchWeaponTo } = require('../src/game/commands/weapon.ts');
const { startGameWithWeapon } = require('../src/game/commands/gameFlow.ts');
const { WEAPONS } = require('../src/game/config/weapons.ts');
const { AIM_CONFIG, WEAPON_AIM_CONFIG, CROSSHAIR_CONFIG, validateAimConfig } = require('../src/game/config/aim.ts');
const { createAimPresentation, movementSpeedRatio, advanceMovementBloom, deriveAimSpread,
  sampleShotAngle, crosshairGap, clientToCanvas, canvasToWorld, getAimAngle } = require('../src/game/rules/aim.ts');
const { drawCrosshair } = require('../src/game/render/crosshair.ts');

const near = (actual, expected, eps = 1e-8) => assert.ok(Math.abs(actual - expected) < eps, `${actual} != ${expected}`);
function fixture(weapon = 'pistol', random = () => 1 - 1e-10) {
  const world = createWorld();
  world.gameState = 'playing'; world.player = createPlayer(weapon);
  world.mousePos = { x: 1100, y: 400 };
  const runtime = new GameRuntime(world, random), ref = current => ({ current });
  const canvas = { width:1200, height:800, style:{}, getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800}) };
  const context = { world, runtime, canvasRef:ref(canvas),
    aimPresentationRef:ref({...createAimPresentation(), pointerValid:true, viewport:{a:1,b:0,c:0,d:1,e:-2400,f:-2600}}),
    dashRef:ref({active:false,startTime:0,fromX:0,fromY:0,dirX:0,dirY:0,recoveryStart:0}),
    dashPendingRef:ref(false), dashCooldownStartRef:ref(0), DASH_COOLDOWN_MS:5000, NORMAL_MOVE_PPM:.017,
    viewFx:{muzzleFlashes:ref([]),recoil:ref({backward:0,upward:0,shake:0}),screenShake:ref(0)},
    playSound(){}, triggerExplosion(){}, triggerVampireHeal(){}, triggerScreenShake(){},
  };
  for (const key of Object.keys(world)) context['set'+key[0].toUpperCase()+key.slice(1)] = runtime.setter(key);
  const tick = () => ({ now:runtime.now(), canvas, weaponConfig:WEAPONS[world.player.weapon], effectiveReloadTime:999999 });
  return { world, runtime, context, tick, step(system=movementSystem){runtime.step(()=>system(context,tick()));} };
}
function fire(f) {
  f.world.isMouseDown = true; f.world.player.lastShot = 0;
  weaponSystem(f.context, f.tick());
  f.world.isMouseDown = false;
  return f.world.bullets.at(-1);
}
const angle = bullet => Math.atan2(bullet.vy,bullet.vx);

test('aim configuration validates all five weapons and rejects invalid authoring', () => {
  validateAimConfig(WEAPONS);
  for (const patch of [{expandMs:-1},{recoverMs:NaN},{movementCurveExponent:0},{accuracyMaxPoints:-1},{accuracyBasePoints:0}])
    assert.throws(()=>validateAimConfig(WEAPONS,{...AIM_CONFIG,...patch}));
  for (const patch of [{maxGapPx:1},{dashAlpha:2},{lineWidthPx:0}])
    assert.throws(()=>validateAimConfig(WEAPONS,AIM_CONFIG,{...CROSSHAIR_CONFIG,...patch}));
  assert.throws(()=>validateAimConfig(WEAPONS,AIM_CONFIG,CROSSHAIR_CONFIG,{...WEAPON_AIM_CONFIG,pistol:undefined}));
  assert.throws(()=>validateAimConfig(WEAPONS,AIM_CONFIG,CROSSHAIR_CONFIG,{...WEAPON_AIM_CONFIG,pistol:{movementHalfAngleDeg:90}}));
});

test('movement uses collision-resolved distance and direction-specific maximum without changing movement', () => {
  for (const keys of [['d'],['d','s']]) {
    const f=fixture(); f.world.keys=new Set(keys);
    for(let i=0;i<6;i++)f.step(); near(f.world.aimSpread.movementBloom,1);
  }
  const f=fixture(); f.world.keys.add('d');
  f.world.obstacles=[{id:'wall',x:3025,y:3000,width:40,height:300,collisionWidth:40,collisionHeight:300,image:''}];
  f.world.aimSpread.movementBloom=1;
  for(let i=0;i<14;i++)f.step(); near(f.world.player.x,3000); near(f.world.aimSpread.movementBloom,0);
  f.world.keys=new Set(['d','s']); for(let i=0;i<15;i++)f.step();
  near(f.world.aimSpread.movementBloom,Math.pow(1/Math.sqrt(2),1.5));
  near(movementSpeedRatio(1,2,1),.5); near(movementSpeedRatio(2,2,Math.sqrt(2)),1/Math.sqrt(2));
  near(movementSpeedRatio(10,0,1),0);
  for(const keys of [[],['a','d'],['w','s']]){const g=fixture();g.world.keys=new Set(keys);g.step();near(g.world.aimSpread.movementBloom,0);}
});

test('effective maximum includes weapon multiplier, hit slow and current speed growth', () => {
  for(const weapon of Object.keys(WEAPONS)) {
    const f=fixture(weapon); f.world.player.playerSpeed+=3; f.world.player.isHit=true;f.world.player.hitTime=f.runtime.now();
    f.world.keys.add('d');for(let i=0;i<7;i++)f.step();near(f.world.aimSpread.movementBloom,1);
  }
});

test('expansion/recovery use fixed simulation time, freeze paused, and have no overshoot', () => {
  const f=fixture();f.world.keys.add('d');for(let i=0;i<6;i++)f.step();near(f.world.aimSpread.movementBloom,1);
  f.runtime.set('isPaused',true);for(let i=0;i<60;i++)f.step();near(f.world.aimSpread.movementBloom,1);
  f.runtime.set('isPaused',false);for(let i=0;i<7;i++)f.step();
  near(f.world.aimSpread.movementBloom,1-7*f.runtime.stepMs/220);
  for(let i=0;i<7;i++)f.step();near(f.world.aimSpread.movementBloom,0);
  const before={expandMs:AIM_CONFIG.expandMs,recoverMs:AIM_CONFIG.recoverMs};
  try{AIM_CONFIG.expandMs=0;AIM_CONFIG.recoverMs=0;near(advanceMovementBloom(0,.5,16),.5**1.5);near(advanceMovementBloom(1,0,16),0);}
  finally{Object.assign(AIM_CONFIG,before);}
});

test('30/60/144Hz render input produces identical movement bloom and positions', () => {
  const results=[];
  for(const hz of [30,60,144]){const f=fixture(),clock=new FixedStepClock();f.world.keys.add('d');
    for(let frame=0;frame<=hz;frame++)clock.advance(frame*1000/hz,()=>true,()=>f.step());
    results.push([f.world.player.x,f.world.aimSpread.movementBloom,f.runtime.metrics.steps]);
  }
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[0],results[2]);
});

test('actual five-weapon fire uses spread envelope and accuracy, preserving pellet counts and zero-spread center', () => {
  for(const weapon of Object.keys(WEAPONS))for(const bloom of [0,.5,1])for(const accuracy of [0,100,300,500]) {
    const f=fixture(weapon);f.world.aimSpread.movementBloom=bloom;f.world.player.accuracyPoints=accuracy;
    fire(f);assert.equal(f.world.bullets.length,WEAPONS[weapon].bulletsPerShot);
    const spread=deriveAimSpread(f.world.player,WEAPONS[weapon],bloom);
    for(const b of f.world.bullets) assert.ok(Math.abs(angle(b))<=spread.envelopeHalf+1e-8);
    assert.equal(new Set(f.world.bullets.map(angle)).size,WEAPONS[weapon].bulletsPerShot);
    near(angle(f.world.bullets.at(-1)),spread.envelopeHalf);
  }
  const f=fixture();f.world.aimSpread.movementBloom=1;f.world.player.accuracyPoints=100;
  near(angle(fire(f)),2*Math.PI/180);near(crosshairGap(2*Math.PI/180),9.2857385089,1e-6);
});

test('angular sampling is symmetric, centered and skips RNG at zero jitter', () => {
  const f=fixture();const spread=deriveAimSpread(f.world.player,WEAPONS.pistol,1);
  near(sampleShotAngle(0,0,1,spread,()=>0),-spread.jitterHalf);
  near(sampleShotAngle(0,0,1,spread,()=>.5),0);
  near(sampleShotAngle(0,0,1,deriveAimSpread(f.world.player,WEAPONS.pistol,0),()=>{throw Error('unexpected RNG');}),0);
});

test('disabled feature preserves legacy jitter, ignores accuracy and movement, and clears bloom', () => {
  try{AIM_CONFIG.enabled=false;
    for(const weapon of Object.keys(WEAPONS)){const f=fixture(weapon);f.world.player.accuracyPoints=300;f.world.aimSpread.movementBloom=1;
      const b=fire(f),w=WEAPONS[weapon];near(angle(b),(w.bulletsPerShot>1?w.spreadAngle/2:0)+w.spreadAngle*.15);
      f.step();near(f.world.aimSpread.movementBloom,0);}
  }finally{AIM_CONFIG.enabled=true;}
});

test('dash holds maximum bloom including its final step, then recovers; reload does not clear it', () => {
  const f=fixture();f.world.keys.add('d');f.context.dashPendingRef.current=true;f.step();near(f.world.aimSpread.movementBloom,1);
  f.world.keys.clear();let guard=40;while(f.context.dashRef.current.active&&guard-->0){f.step();near(f.world.aimSpread.movementBloom,1);}
  assert.ok(guard>0);f.world.player.isReloading=true;f.world.player.reloadStartTime=f.runtime.now();f.step();
  assert.ok(f.world.aimSpread.movementBloom<1);fire(f); // ordinary fire may interrupt reload as before
});

test('switching weapon retains accuracy and bloom; phase exit clears bloom; new run clears accuracy', () => {
  const f=fixture();f.world.player.weapons=['pistol','smg'];f.world.player.accuracyPoints=100;f.world.aimSpread.movementBloom=.8;
  switchWeapon(f.runtime);near(f.world.player.accuracyPoints,100);near(f.world.aimSpread.movementBloom,.8);
  f.world.player.isSwitchingWeapon=false;switchWeaponTo(f.runtime,0);near(f.world.player.accuracyPoints,100);near(f.world.aimSpread.movementBloom,.8);
  f.runtime.set('gameState','upgrade');near(f.world.aimSpread.movementBloom,0);near(f.world.player.accuracyPoints,100);
  f.runtime.set('gameState','shop');f.runtime.set('gameState','playing');near(f.world.aimSpread.movementBloom,0);
  resetRunWorld(f.runtime,'pistol');near(f.world.player.accuracyPoints,0);near(f.world.aimSpread.movementBloom,0);
});

test('RPG delayed second shot reads latest pointer, bloom and accuracy and retains direction while accelerating', () => {
  const f=fixture('rpg');f.world.player.growthChainNodes=['rpg_dual_barrel'];f.world.player.currentAmmo=2;
  fire(f);assert.equal(f.world.bullets.length,1);
  f.world.mousePos={x:600,y:700};f.world.aimSpread.movementBloom=1;f.world.player.accuracyPoints=100;
  for(let i=0;i<43;i++)f.runtime.step(()=>{});
  assert.equal(f.world.bullets.length,2);const b=f.world.bullets[1];near(angle(b),Math.PI/2+2.5*Math.PI/180);
  const before=angle(b);projectileSystem(f.context,f.tick());near(angle(f.world.bullets[1]),before);
});

test('RPG delayed shot cancels for current invalid combat conditions and freezes during pause', () => {
  for(const change of [f=>f.context.dashRef.current.active=true,f=>f.world.player.hp=0,
    f=>f.world.player.weapon='pistol',f=>f.world.player.isReloading=true,f=>f.world.player.isSwitchingWeapon=true,
    f=>f.context.aimPresentationRef.current.viewport=null,f=>f.context.aimPresentationRef.current.pointerValid=false,
    f=>f.context.aimPresentationRef.current.blocked=true,f=>f.world.player.growthChainNodes=[],f=>f.world.player.currentAmmo=0,
    f=>f.runtime.set('gameState','shop')]) {
    const f=fixture('rpg');f.world.player.growthChainNodes=['rpg_dual_barrel'];f.world.player.currentAmmo=2;fire(f);change(f);
    for(let i=0;i<43;i++)f.runtime.step(()=>{});assert.equal(f.world.bullets.length,1);
  }
  const f=fixture('rpg');f.world.player.growthChainNodes=['rpg_dual_barrel'];f.world.player.currentAmmo=2;fire(f);
  f.runtime.set('isPaused',true);for(let i=0;i<50;i++)f.runtime.step(()=>{});assert.equal(f.world.bullets.length,1);
});

test('pointer/viewport validity gates actual first-shot consumption', () => {
  for(const change of [f=>f.context.aimPresentationRef.current.viewport=null,f=>f.context.aimPresentationRef.current.pointerValid=false,
    f=>f.context.aimPresentationRef.current.blocked=true]){const f=fixture();change(f);const ammo=f.world.player.currentAmmo;fire(f);
    assert.equal(f.world.bullets.length,0);assert.equal(f.world.player.currentAmmo,ammo);}
});

test('normal new-game command clears prior viewport and pointer before the first presented frame', () => {
  const f=fixture();f.world.player.accuracyPoints=100;f.world.aimSpread.movementBloom=1;
  startGameWithWeapon(f.runtime,'pistol',{
    aimPresentationRef:f.context.aimPresentationRef,dashRef:f.context.dashRef,
    dashPendingRef:f.context.dashPendingRef,dashCooldownStartRef:f.context.dashCooldownStartRef,
    cameraInitRef:{current:true},muzzleFlashesRef:f.context.viewFx.muzzleFlashes,
    recoilRef:f.context.viewFx.recoil,screenShakeRef:f.context.viewFx.screenShake,levelCompleteTimeoutRef:{current:undefined},
  },{playSound(){},regenerateMap(){}});
  assert.equal(f.context.aimPresentationRef.current.viewport,null);
  assert.equal(f.context.aimPresentationRef.current.pointerValid,false);
  near(f.world.player.accuracyPoints,0);near(f.world.aimSpread.movementBloom,0);
  fire(f);assert.equal(f.world.bullets.length,0);
});

test('client scaling and inverse viewport work at all world edges, with camera lag and shake', () => {
  const rect={left:100,top:40,width:600,height:400};
  assert.deepEqual(clientToCanvas({x:400,y:240},rect,1200,800),{x:600,y:400});
  assert.equal(clientToCanvas({x:0,y:0},{...rect,width:0},1200,800),null);
  for(const x of [30,3000,5970])for(const y of [30,3000,5970]){
    const f=fixture();f.world.player.x=x;f.world.player.y=y;
    const cameraX=Math.max(0,Math.min(4800,x-500))+3, cameraY=Math.max(0,Math.min(5200,y-300))-2;
    const viewport={a:1,b:0,c:0,d:1,e:-cameraX,f:-cameraY};f.context.aimPresentationRef.current.viewport=viewport;
    f.context.canvasRef.current.getBoundingClientRect=()=>rect;
    f.world.mousePos={x:450,y:220};
    const target=canvasToWorld(clientToCanvas(f.world.mousePos,rect,1200,800),viewport);
    near(getAimAngle(f.world.player,f.world.mousePos,f.context.canvasRef.current,viewport),Math.atan2(target.y-y,target.x-x));
    near(angle(fire(f)),Math.atan2(target.y-y,target.x-x));
  }
  assert.deepEqual(canvasToWorld({x:22,y:33},{a:2,b:0,c:0,d:3,e:2,f:3}),{x:10,y:10});
});

test('four-arm crosshair uses the same envelope and does not mutate state or consume randomness', () => {
  const f=fixture('shotgun');f.world.aimSpread.movementBloom=1;
  const before=structuredClone(f.world),moves=[],lines=[],strokes=[];
  const ctx={save(){},restore(){},beginPath(){},moveTo(x,y){moves.push([x,y]);},lineTo(x,y){lines.push([x,y]);},stroke(){strokes.push(this.lineWidth);}};
  const spread=deriveAimSpread(f.world.player,WEAPONS.shotgun,1),gap=crosshairGap(spread.envelopeHalf);
  f.runtime.random=()=>{throw Error('render RNG');};drawCrosshair(ctx,{x:600,y:400},spread.envelopeHalf);
  assert.equal(moves.length,4);assert.equal(lines.length,4);assert.deepEqual(strokes,[4,2]);
  near(lines[0][1],400-gap);assert.deepEqual(f.world,before);
});
