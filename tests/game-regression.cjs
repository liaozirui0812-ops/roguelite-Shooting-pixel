const { test } = require('node:test');
const assert = require('node:assert/strict');
const { GameRuntime } = require('../src/game/runtime/GameRuntime.ts');
const { FixedStepClock } = require('../src/game/runtime/FixedStepClock.ts');
const { createWorld } = require('../src/game/model/World.ts');
const { createGameView } = require('../src/game/model/View.ts');
const { createPlayer } = require('../src/game/runtime/createPlayer.ts');
const { deriveCombatStats } = require('../src/game/rules/combatStats.ts');
const { applyUpgradeEffect } = require('../src/game/rules/upgradeEffect.ts');
const { buildUpgradeOffers, buildShopOffers } = require('../src/game/rules/offers.ts');
const { resolveMonsterDamage } = require('../src/game/rules/damage.ts');
const { buyShopOffer } = require('../src/game/rules/shop.ts');
const { canCompleteLevel } = require('../src/game/rules/level.ts');
const { AffixSystem } = require('../src/game/systems/affixes.ts');
const { updateWorld } = require('../src/game/systems/updateWorld.ts');
const { loadImageAsset } = require('../src/game/assets/loader.ts');

const live = () => {
  const world = createWorld();
  world.gameState = 'playing';
  return new GameRuntime(world, () => 0.8, createGameView);
};
function fixture(runtime) {
  const ref = (value) => ({ current: value });
  const context = {
    world: runtime.state,
    runtime,
    canvasRef: ref({
      width: 1200,
      height: 800,
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
    }),
    dashPendingRef: ref(false),
    dashRef: ref({
      active: false,
      startTime: 0,
      fromX: 0,
      fromY: 0,
      dirX: 0,
      dirY: 0,
      recoveryStart: 0,
    }),
    DASH_COOLDOWN_MS: 5000,
    NORMAL_MOVE_PPM: 0.017,
    dashCooldownStartRef: ref(0),
    recoilRef: ref({ backward: 0, upward: 0, shake: 0 }),
    muzzleFlashesRef: ref([]),
    screenShakeRef: ref(0),
    boomImage: null,
    playSound() {},
    stopBGM() {},
    triggerExplosion() {},
    triggerVampireHeal() {},
    triggerScreenShake() {},
    checkLevelCompletion() {},
    checkRectCollision: () => false,
    checkCollision: (a, b, ra, rb) => Math.hypot(a.x - b.x, a.y - b.y) < ra + rb,
  };
  for (const key of Object.keys(runtime.state))
    context['set' + key[0].toUpperCase() + key.slice(1)] = runtime.setter(key);
  return context;
}
function enemy(id, hp = 10) {
  return {
    id,
    x: 3100,
    y: 3000,
    hp,
    maxHp: hp,
    speed: 0,
    baseSpeed: 0,
    damage: 0,
    color: '#fff',
    monsterType: 1,
    isDying: false,
    isHit: false,
    lastAttackTime: 0,
  };
}
test('synchronous nested same-field commands do not lose updates or run twice', () => {
  const runtime = new GameRuntime({ gameState: 'playing', isPaused: false, value: 0 });
  let calls = 0;
  runtime.set('value', (value) => {
    calls++;
    runtime.set('value', (next) => next + 2);
    return value + 1;
  });
  assert.equal(runtime.state.value, 3);
  assert.equal(calls, 1);
});
test('movement is identical at 30/60/120Hz rendering and HUD publishes remain bounded', () => {
  const positions = [];
  for (const hz of [30, 60, 120]) {
    const runtime = live(),
      context = fixture(runtime),
      clock = new FixedStepClock();
    runtime.state.keys.add('d');
    for (let frame = 0; frame <= hz * 10; frame++)
      clock.advance(
        (frame * 1000) / hz,
        () => true,
        () => runtime.step(() => updateWorld(context))
      );
    assert.equal(runtime.metrics.steps, 600);
    assert.ok(runtime.metrics.publishes <= 101);
    positions.push(runtime.state.player.x);
  }
  assert.equal(new Set(positions).size, 1);
});
test('pausing freezes delayed RPG-like tasks and a new run cancels them', () => {
  const runtime = live();
  let shots = 0;
  runtime.schedule(() => shots++, 700);
  for (let i = 0; i < 20; i++) runtime.step(() => {});
  const time = runtime.now();
  runtime.set('isPaused', true);
  for (let i = 0; i < 600; i++) runtime.step(() => {});
  assert.equal(runtime.now(), time);
  assert.equal(shots, 0);
  runtime.set('isPaused', false);
  for (let i = 0; i < 22; i++) runtime.step(() => {});
  assert.equal(shots, 1);
  runtime.schedule(() => shots++, 700);
  runtime.resetRun();
  for (let i = 0; i < 60; i++) runtime.step(() => {});
  assert.equal(shots, 1);
});
test('leaving combat cancels tasks and clears held input', () => {
  const runtime = live();
  runtime.state.keys.add('w');
  runtime.state.isMouseDown = true;
  runtime.schedule(() => assert.fail('old task ran'), 2000);
  runtime.set('gameState', 'gameover');
  assert.equal(runtime.pendingTaskCount, 0);
  assert.equal(runtime.state.keys.size, 0);
  assert.equal(runtime.state.isMouseDown, false);
});
test('catch-up is bounded and hidden time is discarded after reset', () => {
  const clock = new FixedStepClock();
  let ticks = 0;
  clock.advance(
    0,
    () => true,
    () => ticks++
  );
  clock.advance(
    10000,
    () => true,
    () => ticks++
  );
  assert.equal(ticks, 6);
  clock.reset();
  clock.advance(
    20000,
    () => true,
    () => ticks++
  );
  assert.equal(ticks, 6);
});
test('two bullets killing one enemy yield one score and one death claim', () => {
  const runtime = live(),
    context = fixture(runtime),
    monster = enemy('target', 1);
  runtime.state.monsters = [monster];
  runtime.state.bullets = [0, 1].map((i) => ({
    id: 'bullet-' + i,
    x: monster.x,
    y: monster.y,
    vx: 0,
    vy: 0,
    weapon: 'pistol',
    size: 5,
    color: '#fff',
    damage: 5,
    actualDamage: 5,
    isCrit: false,
    penetration: 0,
    hitCount: 0,
    range: 800,
    startX: monster.x,
    startY: monster.y,
    lastHitMonsterId: null,
    lastHitMonsterTime: 0,
  }));
  runtime.step(() => updateWorld(context));
  assert.equal(runtime.state.score, 10);
  assert.equal(runtime.state.monsters[0].isDying, true);
  assert.equal(runtime.claimDeath('target'), false);
  assert.equal(runtime.state.bullets.length, 1); // The second bullet keeps travelling past an already dead enemy.
  assert.equal(runtime.state.coins.length, 1);
});
test('shield intercepts three direct hits while poison circle retains bypass policy', () => {
  let monster = AffixSystem.init(enemy('shield'), 'shield');
  for (let i = 0; i < 3; i++) {
    const hit = resolveMonsterDamage({
      target: monster,
      amount: 2,
      source: 'projectile',
      interceptAffix: true,
      respectInvincible: true,
    });
    assert.equal(hit.blocked, true);
    assert.equal(hit.hp, 10);
    monster = hit.monster;
  }
  assert.equal(
    resolveMonsterDamage({
      target: monster,
      amount: 2,
      source: 'projectile',
      interceptAffix: true,
      respectInvincible: true,
    }).hp,
    8
  );
  const shield = AffixSystem.init({ ...enemy('poison'), isInvincible: true }, 'shield');
  assert.equal(
    resolveMonsterDamage({
      target: shield,
      amount: 2,
      source: 'poisonCircle',
      interceptAffix: false,
      respectInvincible: false,
    }).hp,
    8
  );
});
test('combat stats include weapon affix/desperate bonuses without applying bookkeeping twice', () => {
  const player = createPlayer('pistol');
  player.desperateFightLevel = 1;
  player.hp = 1;
  player.critRateBonus = 20;
  player.weaponInstances.pistol = {
    rarity: 1,
    value: 0,
    affixes: [{ id: 'critRate', value: 10, gain: 0, tier: 1 }],
  };
  const stats = deriveCombatStats(player, 1000000);
  assert.equal(stats.critRate, 0.5);
  assert.equal(stats.damage, player.damage);
  assert.equal(stats.fireInterval, player.fireRate * 0.7);
});
test('upgrade effect consumes a numeric value independently of description', () => {
  const player = createPlayer('pistol');
  const offer = { id: 'maxHp', value: 3, description: '任意文案 999' };
  assert.equal(applyUpgradeEffect(player, offer.id, offer.value).maxHp, player.maxHp + 3);
  const offers = buildUpgradeOffers('pistol', 1, player, () => 0.2);
  assert.ok(offers.length > 0);
  assert.ok(offers.every((item) => Number.isFinite(item.value)));
});
test('locked shop items retain IDs/values and purchased offers cannot be consumed twice', () => {
  const runtime = live();
  runtime.set('gameState', 'shop');
  runtime.state.player.gold = 100;
  const locked = {
    id: 'locked-1',
    type: 'maxHp',
    name: 'HP',
    description: '+2 HP',
    icon: '/assets/shangxian.png',
    value: 2,
    price: 10,
  };
  const offers = buildShopOffers(
    runtime.state.player,
    2,
    [locked],
    () => 0.5,
    () => runtime.nextId('shop')
  );
  assert.equal(offers[0], locked);
  assert.equal(new Set(offers.map((item) => item.id)).size, 3);
  runtime.state.shopItems = offers;
  runtime.state.lockedItems = [locked];
  assert.equal(buyShopOffer(runtime, locked.id), true);
  assert.equal(buyShopOffer(runtime, locked.id), false);
  assert.equal(runtime.state.player.gold, 90);
  assert.equal(runtime.state.lockedItems.length, 0);
});
test('pending waves and living boss prevent premature level completion', () => {
  const runtime = live();
  assert.equal(canCompleteLevel(runtime.state), true);
  runtime.state.pendingMonsterBatches = [[enemy('pending')]];
  assert.equal(canCompleteLevel(runtime.state), false);
  runtime.state.pendingMonsterBatches = [];
  runtime.state.level = 5;
  runtime.state.bossAlive = true;
  assert.equal(canCompleteLevel(runtime.state), false);
});
test('UI snapshots do not expose the mutable player or all battle entities', () => {
  const runtime = live(),
    view = createGameView(runtime.state);
  runtime.state.player.hp = 1;
  assert.notEqual(view.player.hp, 1);
  assert.equal('bullets' in view, false);
});
test('asset handlers precede src and load results keep their identity despite completion order', async () => {
  const controller = new AbortController(),
    completions = [];
  const makeImage = () => ({
    onload: null,
    onerror: null,
    set src(value) {
      this.url = value;
      completions.push(() => this.onload());
    },
  });
  const first = loadImageAsset(
    { key: 'obstacle1', src: '/one.png' },
    controller.signal,
    1,
    makeImage
  );
  const second = loadImageAsset(
    { key: 'obstacle2', src: '/two.png' },
    controller.signal,
    1,
    makeImage
  );
  completions[1]();
  completions[0]();
  const results = await Promise.all([first, second]);
  assert.deepEqual(
    results.map((item) => item.key),
    ['obstacle1', 'obstacle2']
  );
  const immediate = await loadImageAsset(
    { key: 'cached', src: '/cached.png' },
    controller.signal,
    1,
    () => ({
      set src(value) {
        this.onload();
      },
    })
  );
  assert.equal(immediate.status, 'loaded');
});
test('asset abort, timeout and failure are not reported as success', async () => {
  const controller = new AbortController();
  const pending = loadImageAsset(
    { key: 'abort', src: '/abort.png' },
    controller.signal,
    1,
    () => ({})
  );
  controller.abort();
  assert.equal((await pending).status, 'aborted');
  const timeout = await loadImageAsset(
    { key: 'timeout', src: '/timeout.png' },
    new AbortController().signal,
    1,
    () => ({}),
    1
  );
  assert.equal(timeout.status, 'failed');
});

test('actual dual-barrel RPG fires its second shot after remaining simulation time', () => {
  const runtime = live(),
    context = fixture(runtime);
  runtime.state.player = createPlayer('rpg');
  runtime.state.player.growthChainNodes = ['rpg_dual_barrel'];
  runtime.state.player.currentAmmo = 2;
  runtime.state.isMouseDown = true;
  runtime.step(() => updateWorld(context));
  runtime.state.isMouseDown = false;
  assert.equal(runtime.state.bullets.length, 1);
  assert.equal(runtime.pendingTaskCount, 1);
  for (let i = 0; i < 20; i++) runtime.step(() => updateWorld(context));
  runtime.set('isPaused', true);
  for (let i = 0; i < 600; i++) runtime.step(() => updateWorld(context));
  assert.equal(runtime.state.bullets.length, 1);
  runtime.set('isPaused', false);
  for (let i = 0; i < 22; i++) runtime.step(() => updateWorld(context));
  assert.equal(runtime.state.bullets.length, 2);
  assert.equal(runtime.state.player.currentAmmo, 0);
});

const { SPRITE_ATLASES, validateAtlas } = require('../src/game/assets/atlases.ts');
const { acquireWeapon, rollWeaponInstance } = require('../src/game/rules/weapons.ts');
const { spawnMonsterWaves } = require('../src/game/systems/spawnMonsters.ts');
const { explodeWorld } = require('../src/game/systems/explosion.ts');
const { renderWorld } = require('../src/game/render/renderWorld.ts');
test('seeded weapon acquisition and wave spawning are reproducible', () => {
  assert.deepEqual(
    rollWeaponInstance(() => 0.2),
    rollWeaponInstance(() => 0.2)
  );
  assert.deepEqual(
    acquireWeapon(createPlayer('pistol'), 'rpg', () => 0.2),
    acquireWeapon(createPlayer('pistol'), 'rpg', () => 0.2)
  );
  const first = live(),
    second = live();
  spawnMonsterWaves(first, 7, 1.2, 1, 5);
  spawnMonsterWaves(second, 7, 1.2, 1, 5);
  assert.deepEqual(first.state.monsters, second.state.monsters);
  assert.deepEqual(first.state.pendingMonsterBatches, second.state.pendingMonsterBatches);
  assert.equal(
    [...first.state.monsters, ...first.state.pendingMonsterBatches.flat()].filter(
      (monster) => monster.isBoss
    ).length,
    1
  );
});
test('burn and poison in the same tick cannot reward one enemy twice', () => {
  const runtime = live(),
    context = fixture(runtime);
  runtime.state.monsters = [
    {
      ...enemy('dot', 1),
      isBurning: true,
      burningStacks: 1,
      burningDamage: 2,
      burningEndTime: runtime.now() + 5000,
      lastBurnTickTime: runtime.now() - 1001,
      isPoisoned: true,
      poisonStacks: 1,
      poisonDamage: 2,
      poisonEndTime: runtime.now() + 5000,
      lastPoisonTickTime: runtime.now() - 1001,
    },
  ];
  runtime.step(() => updateWorld(context));
  assert.equal(runtime.state.score, 10);
  assert.equal(runtime.state.coins.length, 1);
});
test('two overlapping explosions settle one enemy once', () => {
  const runtime = live();
  runtime.state.monsters = [enemy('explosion', 1)];
  const context = {
    runtime,
    world: runtime.state,
    boomImage: null,
    playSound() {},
    triggerScreenShake() {},
    triggerVampireHeal() {},
  };
  runtime.transaction(() => {
    explodeWorld(context, 3100, 3000, 150, 10);
    explodeWorld(context, 3100, 3000, 150, 10);
  });
  assert.equal(runtime.state.score, 10);
  assert.equal(runtime.state.coins.length, 1);
  assert.equal(runtime.state.monsters[0].isDying, true);
});
test('shot count, DOT and scheduled wave spawning agree at 30/60/120Hz rendering', () => {
  const results = [];
  for (const hz of [30, 60, 120]) {
    const runtime = live(),
      context = fixture(runtime),
      clock = new FixedStepClock();
    let shots = 0;
    context.playSound = (sound) => {
      if (sound === 'shoot') shots++;
    };
    runtime.state.isMouseDown = true;
    runtime.state.monsters = [
      {
        ...enemy('dot', 10000),
        isPoisoned: true,
        poisonStacks: 1,
        poisonDamage: 1,
        poisonEndTime: runtime.now() + 60000,
        lastPoisonTickTime: runtime.now(),
      },
    ];
    runtime.state.pendingMonsterBatches = [[enemy('next', 10000)]];
    runtime.state.nextBatchTime = runtime.now() + 3000;
    for (let frame = 0; frame <= hz * 15; frame++)
      clock.advance(
        (frame * 1000) / hz,
        () => true,
        () => runtime.step(() => updateWorld(context))
      );
    results.push({
      shots,
      hp: runtime.state.monsters.find((monster) => monster.id === 'dot').hp,
      waves: runtime.state.pendingMonsterBatches.length,
      nextSpawned: runtime.state.monsters.some((monster) => monster.id === 'next'),
    });
  }
  assert.ok(results[0].shots > 0);
  assert.ok(results[0].hp < 10000);
  assert.equal(results[0].nextSpawned, true);
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[0], results[2]);
});
test('all explicit sprite frames stay within the actual atlas dimensions', () => {
  for (const [key, atlas] of Object.entries(SPRITE_ATLASES))
    assert.equal(validateAtlas(key, atlas.width, atlas.height), undefined);
  assert.equal(SPRITE_ATLASES.enemy_4_2.frames.length, 4);
  assert.equal(SPRITE_ATLASES.boss2.frames.at(-1).width, 470);
  assert.ok(validateAtlas('boss2', 10240, 512));
});
test('rendering leaves World, recoil and simulation random state unchanged', () => {
  const runtime = live(),
    context = fixture(runtime),
    ref = (current) => ({ current });
  const ctx = new Proxy(
    {
      measureText: () => ({ width: 0 }),
      getTransform: () => ({}),
      createRadialGradient: () => ({ addColorStop() {} }),
      createLinearGradient: () => ({ addColorStop() {} }),
    },
    {
      get: (target, key) => target[key] ?? (() => {}),
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    }
  );
  const canvas = {
    width: 1200,
    height: 800,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const renderer = {
    ...context,
    canvasRef: ref(canvas),
    t: (key) => key,
    obstacleImages: {},
    cameraPosRef: ref({ x: 3000, y: 3000 }),
    cameraTargetRef: ref({ x: 3000, y: 3000 }),
    cameraInitRef: ref(false),
    playerPrevPosRef: ref({ x: 3000, y: 3000 }),
    baseTransformRef: ref(null),
    mapBackgroundCanvasRef: ref(null),
    CAMERA_FOLLOW_CONFIG: {
      TAU: 0.18,
      DEAD_ZONE_RADIUS: 100,
      LAG_LIMIT_RATIO: 0.25,
      LAG_CATCHUP_TIME: 0.5,
      HOME_TAU: 0.2,
    },
    getWeaponImage: () => null,
  };
  for (const key of [
    'rocket',
    'bullet',
    'bossFireBall',
    'ball',
    'range',
    'boss',
    'boss2',
    'enemy_1',
    'enemy_2',
    'enemy_3',
    'enemy_4_1',
    'enemy_4_2',
    'chest',
    'weaponUpgradeBox',
    'healthPotion',
    'coin',
    'boom',
    'skillIcon',
    'smoke',
    'playerWalk',
    'playerIdle',
    'playerDash',
    'fire',
    'pause',
    'arrow',
    'hpBar',
    'hpGreen',
    'hpYellow',
    'hpRed',
  ])
    renderer[key + 'Image'] = null;
  const before = structuredClone(runtime.state),
    recoil = structuredClone(context.recoilRef.current);
  let randomCalls = 0;
  runtime.random = () => {
    randomCalls++;
    return 0.8;
  };
  renderWorld(renderer, 16.67);
  renderWorld(renderer, 16.67);
  assert.deepEqual(runtime.state, before);
  assert.deepEqual(context.recoilRef.current, recoil);
  assert.equal(randomCalls, 0);
});

test('a loaded image with wrong atlas dimensions is reported as failure', async () => {
  const result = await loadImageAsset(
    { key: 'boss2', src: '/boss.png' },
    new AbortController().signal,
    1,
    () => ({
      width: 10240,
      height: 512,
      set src(value) {
        this.onload();
      },
    })
  );
  assert.equal(result.status, 'failed');
  assert.match(result.reason, /atlas dimensions/);
});

const { resetRunWorld } = require('../src/game/runtime/createRun.ts');
test('a phase change within a transaction publishes immediately and only once', () => {
  const runtime = live();
  runtime.set('gameState', 'shop');
  let commits = 0;
  runtime.subscribe(() => commits++);
  runtime.transaction(() => {
    runtime.set('level', 2);
    runtime.set('gameState', 'playing');
  });
  assert.equal(runtime.getSnapshot().gameState, 'playing');
  assert.equal(runtime.getSnapshot().level, 2);
  assert.equal(commits, 1);
});
test('a new run resets all world data and cancels an actual pending RPG shot', () => {
  const runtime = live(),
    context = fixture(runtime);
  runtime.state.player = createPlayer('rpg');
  runtime.state.player.growthChainNodes = ['rpg_dual_barrel'];
  runtime.state.player.currentAmmo = 2;
  runtime.state.isMouseDown = true;
  runtime.step(() => updateWorld(context));
  assert.equal(runtime.pendingTaskCount, 1);
  runtime.state.score = 90;
  runtime.state.poisonCircles = [{ id: 'old' }];
  runtime.state.lockedItems = [{ id: 'old' }];
  resetRunWorld(runtime, 'smg');
  assert.equal(runtime.pendingTaskCount, 0);
  assert.equal(runtime.state.score, 0);
  assert.equal(runtime.state.bullets.length, 0);
  assert.equal(runtime.state.poisonCircles.length, 0);
  assert.equal(runtime.state.lockedItems.length, 0);
  assert.equal(runtime.state.player.weapon, 'smg');
  assert.equal(runtime.state.player.currentAmmo, 30);
  for (let i = 0; i < 60; i++) runtime.step(() => updateWorld(context));
  assert.equal(runtime.state.bullets.length, 0);
});
test('penetration halves follow-up damage while the pistol last-shot exception remains', () => {
  for (const lastShot of [false, true]) {
    const runtime = live(),
      context = fixture(runtime),
      first = enemy('first', 100),
      second = enemy('second', 100);
    second.x = 3200;
    runtime.state.monsters = [first, second];
    runtime.state.bullets = [
      {
        id: 'piercing',
        x: first.x,
        y: first.y,
        vx: 0,
        vy: 0,
        weapon: 'pistol',
        size: 5,
        actualDamage: 10,
        isCrit: false,
        penetration: 1,
        hitCount: 0,
        range: 800,
        startX: first.x,
        startY: first.y,
        isPistolLastBullet: lastShot,
      },
    ];
    runtime.step(() => updateWorld(context));
    assert.equal(runtime.state.monsters[0].hp, 90);
    runtime.state.bullets[0].x = second.x;
    runtime.step(() => updateWorld(context));
    assert.equal(runtime.state.monsters[1].hp, lastShot ? 90 : 95);
    assert.equal(runtime.state.bullets.length, 0);
  }
});
