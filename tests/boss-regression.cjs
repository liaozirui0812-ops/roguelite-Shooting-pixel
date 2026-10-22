const { test } = require('node:test');
const assert = require('node:assert/strict');
const { GameRuntime } = require('../src/game/runtime/GameRuntime.ts');
const { createWorld } = require('../src/game/model/World.ts');
const { createGameView } = require('../src/game/model/View.ts');
const { createMonster } = require('../src/game/runtime/createMonster.ts');
const { updateWorld } = require('../src/game/systems/updateWorld.ts');
const { monsterSystem } = require('../src/game/systems/monsterSystem.ts');
const { enemyAttackSystem } = require('../src/game/systems/enemyAttackSystem.ts');
const { projectileSystem } = require('../src/game/systems/projectileSystem.ts');
const { bossSystem, activateBoss } = require('../src/game/systems/bossSystem.ts');
const { spawnMonsterWaves } = require('../src/game/systems/spawnMonsters.ts');
const { explodeWorld } = require('../src/game/systems/explosion.ts');
const { startBossTrial } = require('../src/game/commands/bossTrial.ts');
const { evaluateBossPose, solveTwoBoneIK, hitBoss, bossExplosionHit } = require('../src/game/rules/bossPose.ts');
const { traceBossPath, segmentCapsuleT } = require('../src/game/rules/bossGeometry.ts');
const { resolveMonsterDamage } = require('../src/game/rules/damage.ts');
const { bossSprites } = require('../src/game/render/bossSprites.ts');
const { MECH, BOAR } = require('../src/game/config/bosses.ts');

function fixture(type = 7) {
  const world = createWorld(); world.gameState = 'playing'; world.player.x = 1800; world.player.y = 1000;
  const runtime = new GameRuntime(world, () => 0.8, createGameView);
  const ref = current => ({ current });
  const context = { world, runtime, aimPresentationRef:ref({viewport:null,pointerValid:false,blocked:false}), canvasRef:ref({width:1200,height:800}), dashPendingRef:ref(false),
    dashRef:ref({active:false,startTime:0,fromX:0,fromY:0,dirX:0,dirY:0,recoveryStart:0}),
    dashCooldownStartRef:ref(0), DASH_COOLDOWN_MS:5000, NORMAL_MOVE_PPM:0.017,
    viewFx:{recoil:ref({backward:0,upward:0,shake:0}),muzzleFlashes:ref([]),screenShake:ref(0)},
    boomImage:null,playSound(){},stopBGM(){},triggerExplosion(){},triggerVampireHeal(){},triggerScreenShake(){},checkLevelCompletion(){} };
  for(const key of Object.keys(world))context['set'+key[0].toUpperCase()+key.slice(1)]=runtime.setter(key);
  world.monsters=[createMonster({id:'boss',monsterType:type,x:1000,y:1000,now:runtime.now()})];
  return {world,runtime,context,get boss(){return world.monsters[0];}};
}
const tick = f => ({now:f.runtime.now()});
function advance(f,ms,system=bossSystem){for(let i=0;i<Math.ceil(ms/f.runtime.stepMs);i++)f.runtime.step(()=>system(f.context,tick(f)));}
function ready(f,skill,phase,elapsed=0){
  f.world.monsters=[activateBoss(f.boss,f.runtime.now(),f.world.obstacles)];
  Object.assign(f.boss.boss,{skill,phase,phaseStartedAt:f.runtime.now()-elapsed,sequence:1,previousPlayer:{...f.world.player}});
}
function shot(f,x,y,vx=0,vy=0){return {id:'bullet',x,y,vx,vy,size:2,weapon:'pistol',damage:100,actualDamage:100,isCrit:false,penetration:100,hitCount:0,range:3000,distanceTraveled:0,startX:x,startY:y,isRocket:false};}

test('factory gives distinct inactive states, eight stable legs and no slime jump fields',()=>{
  for(const type of [6,7]){const f=fixture(type);assert.equal(f.boss.jumpAttackState,undefined);assert.equal(f.boss.boss.phase,'inactive');}
  const f=fixture();assert.deepEqual(f.boss.boss.legs.map(l=>l.id),['L1','L2','L3','L4','R1','R2','R3','R4']);
  assert.ok(f.boss.boss.legs.every(l=>l.hp===160));
  assert.equal(fixture(5).boss.jumpAttackState,'idle');
});
test('first actual activation rebases clocks and feet after a long queued-wave wait',()=>{
  const f=fixture();const m=f.boss;f.world.monsters=[];advance(f,20000);
  const active=activateBoss({...m,x:2300,y:2200},f.runtime.now(),[]);
  assert.equal(active.boss.phase,'intro');assert.equal(active.boss.phaseStartedAt,f.runtime.now());
  assert.ok(active.boss.legs.every(l=>Math.abs(l.foot.x-active.x)<200&&Math.abs(l.foot.y-active.y)<150));
});
test('activation avoids obstacles and respects support/world margins',()=>{
  const f=fixture();const obstacle={id:'wall',x:900,y:900,width:200,height:200,collisionWidth:200,collisionHeight:200,image:''};
  const m=activateBoss(f.boss,f.runtime.now(),[obstacle]);assert.ok(Math.hypot(m.x-1000,m.y-1000)>170);
  const edge=activateBoss({...f.boss,x:0,y:0},f.runtime.now(),[]);assert.ok(edge.x>=200&&edge.y>=200);
});
test('IK preserves both segment lengths and deterministic pose evaluation is read-only',()=>{
  const hip={x:0,y:0},foot={x:130,y:30},knee=solveTwoBoneIK(hip,foot,90,100,1);
  assert.ok(Math.abs(Math.hypot(knee.x,knee.y)-90)<1e-7);
  assert.ok(Math.abs(Math.hypot(foot.x-knee.x,foot.y-knee.y)-100)<1e-7);
  const f=fixture(),before=structuredClone(f.boss);const a=evaluateBossPose(f.boss,f.runtime.now());
  assert.deepEqual(a,evaluateBossPose(f.boss,f.runtime.now()));assert.deepEqual(f.boss,before);assert.equal(a.feet.length,8);
});
test('swept capsules catch high-speed crossings and point contacts',()=>{
  assert.notEqual(segmentCapsuleT({x:-100,y:25},{x:100,y:25},{x:0,y:0},{x:0,y:50},8),null);
  assert.equal(segmentCapsuleT({x:-100,y:70},{x:100,y:70},{x:0,y:0},{x:0,y:50},8),null);
});
test('boar corridor is truncated at actual obstacle surface and world boundary',()=>{
  const wall={id:'wall',x:1300,y:800,width:100,height:400,collisionWidth:100,collisionHeight:400,image:''};
  const p=traceBossPath({x:1000,y:1000},{x:2000,y:1000},75,[wall],6000,6000);
  assert.ok(p.blocked);assert.ok(p.to.x<=1225&&p.to.x>1224);
  const edge=traceBossPath({x:500,y:500},{x:-200,y:500},75,[],6000,6000);assert.ok(edge.to.x>=75&&edge.to.x<76);
});
test('outer leg is selectable while center shot targets chassis and broken geometry disappears',()=>{
  const f=fixture(),foot=f.boss.boss.legs[1].foot;
  const hit=hitBoss(f.boss,{x:foot.x-100,y:foot.y},{x:foot.x+10,y:foot.y},2,f.runtime.now());
  assert.equal(hit.legId,'L2');
  assert.equal(hitBoss(f.boss,{x:1000,y:1000},{x:1000,y:1000},2,f.runtime.now()).legId,undefined);
  f.boss.boss.legs[1].hp=0;assert.ok(!evaluateBossPose(f.boss,f.runtime.now()).feet.some(foot=>foot.id==='L2'));
});
test('leg damage routes once to body, changes only that leg, and large overkill cannot repeat a break',()=>{
  const f=fixture();const event={target:f.boss,amount:100,source:'projectile',respectInvincible:true,interceptAffix:true,bossHit:{core:false,legIds:['L1'],now:f.runtime.now()}};
  const hit=resolveMonsterDamage(event);assert.equal(hit.actualDamage,35);assert.equal(hit.monster.boss.legs[0].hp,60);
  assert.equal(hit.monster.boss.legs[1].hp,160);
  const kill=resolveMonsterDamage({...event,target:hit.monster,amount:1000});assert.deepEqual(kill.brokenLegs,['L1']);
  const repeat=resolveMonsterDamage({...event,target:kill.monster});assert.equal(repeat.actualDamage,0);assert.deepEqual(repeat.brokenLegs,[]);
});
test('explosion shares one leg budget and does not add a second body packet',()=>{
  const f=fixture();const hit=resolveMonsterDamage({target:f.boss,amount:100,source:'explosion',respectInvincible:true,interceptAffix:true,bossHit:{core:true,legIds:f.boss.boss.legs.map(l=>l.id),now:f.runtime.now()}});
  assert.equal(hit.partDamage,100);assert.equal(hit.actualDamage,100);assert.equal(hit.monster.boss.legs.reduce((n,l)=>n+l.hp,0),1180);
});
test('real explosion hits an outside leg without a core-center inclusion requirement or death reward',()=>{
  const f=fixture(),foot=f.boss.boss.legs[1].foot;
  const hit=bossExplosionHit(f.boss,foot,15,f.runtime.now());assert.equal(hit.core,false);assert.ok(hit.legIds.includes('L2'));
  explodeWorld({...f.context,triggerVampireHeal(){},triggerScreenShake(){}},foot.x,foot.y,15,100);
  assert.equal(f.boss.hp,2400-35);assert.ok(f.boss.boss.legs[1].hp<160);assert.equal(f.world.score,0);assert.equal(f.world.coins.length,0);
});
test('real projectile path deduplicates a new Boss across ticks and updates its leg',()=>{
  const f=fixture(),foot=f.boss.boss.legs[1].foot;f.world.bullets=[shot(f,foot.x,foot.y)];
  projectileSystem(f.context,tick(f));const hp=f.boss.hp;assert.equal(hp,2365);assert.equal(f.boss.boss.legs[1].hp,60);
  projectileSystem(f.context,tick(f));assert.equal(f.boss.hp,hp);assert.equal(f.world.bullets[0].hitCount,1);
});
test('poison/burning damage stays on body without multiplying into legs',()=>{
  const f=fixture();const d=resolveMonsterDamage({target:f.boss,amount:20,source:'dot',interceptAffix:false,respectInvincible:false});
  assert.equal(d.hp,2380);assert.ok(d.monster.boss.legs.every(l=>l.hp===160));
});
test('all legs broken enters a safe transition, exposes core and remains killable',()=>{
  const f=fixture();ready(f,'volley','aim');f.boss.boss.legs.forEach(l=>l.hp=0);
  bossSystem(f.context,tick(f));assert.equal(f.boss.boss.phase,'transition');assert.equal(f.boss.boss.exposed,true);assert.equal(f.world.enemyBullets.length,0);
  const d=resolveMonsterDamage({target:f.boss,amount:100,source:'projectile',respectInvincible:true,interceptAffix:true});assert.equal(d.actualDamage,125);
  const x=f.boss.x;advance(f,1800);assert.equal(f.boss.x,x);
});
test('locked charge never retargets and damages at most once; generic contact is disabled',()=>{
  const f=fixture(6);ready(f,'charge','lock',BOAR.charge.lock);
  f.world.player.x=1020;f.world.player.y=1000;
  f.boss.boss.path={from:{x:1000,y:1000},to:{x:1500,y:1000},blocked:false};f.boss.boss.previousPlayer={x:1020,y:1000};
  const hp=f.world.player.hp;advance(f,350,enemyAttackSystem);assert.equal(f.world.player.hp,hp-12);assert.equal(f.boss.y,1000);
  f.world.player.y=1300;advance(f,100);assert.equal(f.boss.y,1000);
});
test('new attacks respect dash immunity without inheriting slime attack logic',()=>{
  const f=fixture(6);ready(f,'charge','attack');f.boss.boss.path={from:{x:1000,y:1000},to:{x:1500,y:1000},blocked:false};
  f.world.player.x=1020;f.boss.boss.previousPlayer={x:1020,y:1000};f.context.dashRef.current.active=true;
  const hp=f.world.player.hp;advance(f,300,enemyAttackSystem);assert.equal(f.world.player.hp,hp);assert.equal(f.boss.jumpAttackState,undefined);
});
test('stomp melee and its rock fan share one hit budget',()=>{
  const f=fixture(6);ready(f,'stomp','aim',BOAR.stomp.aim);f.world.player.x=1000;f.world.player.y=1000;
  const hp=f.world.player.hp;enemyAttackSystem(f.context,tick(f));assert.equal(f.world.player.hp,hp-8);assert.equal(f.world.enemyBullets.length,0);
});
test('destroyed legs cancel future volley sockets without reshuffling fired legs into the second group',()=>{
  const f=fixture();ready(f,'volley','aim',MECH.volley.aim);
  f.boss.boss.volleyGroups=[['L1','L2','L3','L4'],['R1','R2','R3','R4']];
  bossSystem(f.context,tick(f));assert.equal(f.world.enemyBullets.length,12);
  f.boss.boss.legs[4].hp=0;advance(f,500);assert.equal(f.world.enemyBullets.length,21);
});
test('full break ring has nine fixed directions and does not close its three-direction exit',()=>{
  const f=fixture();ready(f,'ring','aim',MECH.ring.aim);f.boss.boss.legs.forEach(l=>l.hp=0);f.boss.boss.exposed=true;
  bossSystem(f.context,tick(f));assert.equal(f.world.enemyBullets.length,9);
  const angles=f.world.enemyBullets.map(b=>Math.atan2(b.vy,b.vx));assert.equal(new Set(angles).size,9);
});
test('pause freezes skill clocks, feet and attack submissions',()=>{
  const f=fixture();ready(f,'volley','aim');const before=structuredClone(f.boss);const time=f.runtime.now();
  f.runtime.set('isPaused',true);advance(f,3000);assert.equal(f.runtime.now(),time);assert.deepEqual(f.boss,before);assert.equal(f.world.enemyBullets.length,0);
});
test('dead owner cannot emit but already submitted free bullets survive until leaving playing',()=>{
  const f=fixture();ready(f,'volley','aim',900);bossSystem(f.context,tick(f));const n=f.world.enemyBullets.length;
  f.boss.isDying=true;advance(f,1000);assert.equal(f.world.enemyBullets.length,n);
  f.world.enemyBullets.push({id:'legacy',x:0,y:0});f.runtime.set('gameState','upgrade');
  assert.deepEqual(f.world.enemyBullets.map(b=>b.id),['legacy']);
});
test('fifth-level Boss slot selects each of the three kinds and normal waves never get extra Boss copies',()=>{
  for(const [random,type] of [[0,5],[0.4,6],[0.8,7]]) {
    const world=createWorld(),runtime=new GameRuntime(world,()=>random,createGameView);
    spawnMonsterWaves(runtime,1,1,1,5);const bosses=[...world.monsters,...world.pendingMonsterBatches.flat()].filter(m=>m.isBoss);
    assert.equal(bosses.length,1);assert.equal(bosses[0].monsterType,type);
  }
});
test('isolated trial accepts only known kinds, clears queued waves, projects actual Boss name and independent leg values',()=>{
  const f=fixture();assert.equal(startBossTrial(f.runtime,'unknown'),false);
  assert.equal(startBossTrial(f.runtime,'boar'),true);assert.equal(f.world.monsters[0].monsterType,6);assert.equal(f.world.pendingMonsterBatches.length,0);
  startBossTrial(f.runtime,'mech');const view=createGameView(f.world);assert.equal(view.bossName,'多足机械');assert.equal(view.bossLegs.length,8);
  view.bossLegs[0].hp=0;assert.equal(f.world.monsters[0].boss.legs[0].hp,160);
});
test('all sprite instances reuse static sheets and rendering pose selection never mutates combat or RNG',()=>{
  const f=fixture();const images={bossMechParts:{width:1254,height:1254}};
  const before=structuredClone(f.boss);const sprites=bossSprites(f.boss,f.runtime.now(),images);
  assert.ok(sprites.length>25);assert.ok(sprites.every(s=>s.image===images.bossMechParts));assert.deepEqual(f.boss,before);
});
for(const phase of ['idle','locking','recovery','jump_start','airborne','landing'])test(`real updateWorld preserves nonlethal Boss DOT in ${phase}`,()=>{
  const f=fixture(5),now=f.runtime.now();
  Object.assign(f.boss,{hp:1000,maxHp:1000,isBurning:true,burningStacks:1,burningDamage:7,burningEndTime:now+5000,lastBurnTickTime:now-1001,
    isPoisoned:true,poisonStacks:1,poisonDamage:8,poisonEndTime:now+5000,lastPoisonTickTime:now-1001,
    jumpAttackState:phase,jumpAttackStartTime:now,jumpAttackTargetX:1000,jumpAttackTargetY:1000,lastRangedAttackTime:now});
  updateWorld(f.context);assert.equal(f.boss.hp,985);assert.equal(f.boss.lastBurnTickTime,now);assert.equal(f.boss.lastPoisonTickTime,now);
});
test('real Boss status path clears expired states and awards one death for two simultaneous DOTs',()=>{
  const f=fixture(5),now=f.runtime.now();
  Object.assign(f.boss,{isBurning:true,burningStacks:1,burningEndTime:now-1,isPoisoned:true,poisonStacks:1,poisonEndTime:now-1});
  monsterSystem(f.context,tick(f));assert.equal(f.boss.isBurning,false);assert.equal(f.boss.isPoisoned,false);
  Object.assign(f.boss,{hp:5,isBurning:true,burningStacks:1,burningDamage:7,burningEndTime:now+5000,lastBurnTickTime:now-1001,isPoisoned:true,poisonStacks:1,poisonDamage:8,poisonEndTime:now+5000,lastPoisonTickTime:now-1001});
  monsterSystem(f.context,tick(f));monsterSystem(f.context,tick(f));assert.equal(f.world.score,10);assert.equal(f.boss.isDying,true);
});

test('alternating pierce skills use both roots and aim from the actual emitting socket',()=>{
  const f=fixture();ready(f,'pierce','aim');
  for(const [sequence,side] of [[1,-1],[3,1]]) {
    Object.assign(f.boss.boss,{sequence,phase:'aim',phaseStartedAt:f.runtime.now()});
    bossSystem(f.context,tick(f));
    assert.equal(f.boss.boss.path.from.x,f.boss.x+side*38);
    const path=f.boss.boss.path;
    const expected=Math.atan2(f.world.player.y-path.from.y,f.world.player.x-path.from.x);
    assert.ok(Math.abs(f.boss.boss.angle-expected)<1e-9);
  }
});
test('poison circle touching an external leg damages the owner once without draining leg durability',()=>{
  const { zoneSystem } = require('../src/game/systems/zoneSystem.ts');
  const f=fixture(),foot=f.boss.boss.legs[1].foot,now=f.runtime.now();
  f.world.poisonCircles=[{id:'circle',...foot,radius:15,damage:10,startTime:now,endTime:now+1000,lastTickTime:now-501}];
  zoneSystem(f.context,tick(f));assert.equal(f.boss.hp,2390);assert.ok(f.boss.boss.legs.every(l=>l.hp===160));
});
test('aura cannot displace a locked charge and retains its timed slowdown',()=>{
  const { zoneSystem } = require('../src/game/systems/zoneSystem.ts');
  const f=fixture(6);ready(f,'charge','lock');f.world.player.x=1000;f.world.player.y=1010;
  f.world.player.energyAuraLevel=1;f.world.player.lastEnergyAuraShockwaveTime=f.runtime.now()-4000;
  zoneSystem(f.context,tick(f));assert.equal(f.boss.x,1000);assert.equal(f.boss.y,1000);assert.ok(f.boss.auraSlowdownEndTime>f.runtime.now());
});

test('lethal owned bullet during the actual updater cannot restore cleared cross-stage hazards',()=>{
  const f=fixture();f.world.player.hp=4;
  const bullet={id:'lethal',ownerId:'boss',x:f.world.player.x,y:f.world.player.y,vx:0,vy:0,size:10,damage:5,distanceTraveled:0,range:1000};
  f.world.enemyBullets=[bullet,{...bullet,id:'other',x:1500},{...bullet,id:'old',ownerId:undefined,x:1500}];
  enemyAttackSystem(f.context,tick(f));assert.equal(f.world.gameState,'gameover');
  assert.deepEqual(f.world.enemyBullets.map(b=>b.id),['old']);
});
