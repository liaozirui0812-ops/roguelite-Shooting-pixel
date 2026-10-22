import { ASSET_PATHS, type AssetId } from '../src/game/assets/manifest';
import { LightingRenderer } from '../src/game/render/lighting/lightingRenderer';
import { renderWorld, type RenderWorldContext } from '../src/game/render/renderWorld';
import { createWorld } from '../src/game/model/World';
import { GameRuntime } from '../src/game/runtime/GameRuntime';
import { resetRunWorld } from '../src/game/runtime/createRun';
import type { Monster } from '../src/game/model/types';
import { LIGHTING_DEFAULTS, type LightingConfig } from '../src/game/config/lighting';
import { translate } from '../src/i18n';
import { createAimPresentation } from '../src/game/rules/aim';

// Isolated, deterministic rendering fixture. Never included in the application bundle.
const canvas = document.querySelector('canvas')!;
const images: Partial<Record<AssetId, HTMLImageElement>> = {};
const ref = <T>(current: T) => ({ current });
const renderer = new LightingRenderer();
let time = 1_000_000;
let stressActive = false;
const world = createWorld();
world.gameState = 'playing';
world.mousePos = { x: 1000, y: 400 };
const runtime = new GameRuntime(world, () => { throw new Error('render consumed simulation randomness'); });
runtime.now = () => time;
const context: RenderWorldContext = {
  aimPresentationRef: ref(createAimPresentation()),
  canvasRef: ref(canvas), world, runtime, lighting: renderer, t: key => translate(key, 'zh'),
  screenShakeRef: ref(0), cameraPosRef: ref({ x: 3000, y: 3000 }), cameraTargetRef: ref({ x: 3000, y: 3000 }),
  cameraInitRef: ref(false), playerPrevPosRef: ref({ x: 3000, y: 3000 }), baseTransformRef: ref(null),
  mapBackgroundCanvasRef: ref(null), obstacleImages: {},
  CAMERA_FOLLOW_CONFIG: { TAU: 0.18, DEAD_ZONE_RADIUS: 100, LAG_LIMIT_RATIO: 0.25, LAG_CATCHUP_TIME: 0.5, HOME_TAU: 0.2 },
  dashRef: ref({ active: false, startTime: 0, fromX: 0, fromY: 0, dirX: 0, dirY: 0, recoveryStart: 0 }),
  recoilRef: ref({ backward: 0, upward: 0, shake: 0 }), muzzleFlashesRef: ref([]),
  DASH_COOLDOWN_MS: 5000, getWeaponImage: () => images.pistol ?? null,
  rocketImage: null, bulletImage: null, bossFireBallImage: null, ballImage: null, rangeImage: null,
  bossImage: null, boss2Image: null, enemy_1Image: null, enemy_2Image: null, enemy_3Image: null,
  enemy_4_1Image: null, enemy_4_2Image: null, chestImage: null, weaponUpgradeBoxImage: null,
  healthPotionImage: null, coinImage: null, boomImage: null, skillIconImage: null, smokeImage: null,
  playerWalkImage: null, playerIdleImage: null, playerDashImage: null, fireImage: null, pauseImage: null,
  arrowImage: null, hpBarImage: null, hpGreenImage: null, hpYellowImage: null, hpRedImage: null,
};
const ready = Promise.all(Object.entries(ASSET_PATHS).filter(([key]) => key !== 'start').map(async ([key, url]) => {
  const image = new Image(); image.src = url; await image.decode(); images[key as AssetId] = image;
  if (key.startsWith('obstacle_')) context.obstacleImages[url] = image;
  else if (`${key}Image` in context) Object.assign(context, { [`${key}Image`]: image });
}));

function scene(stress = false, pilot = false, edge = false) {
  stressActive = stress;
  world.player.x = edge ? 90 : 3000; world.player.y = edge ? 100 : 3000;
  world.player.isHit = stress; world.player.hitTime = time; world.player.isMoving = false; context.dashRef.current.active = false;
  world.isPaused = false; world.player.isReloading = false;
  world.mousePos = { x: 1000, y: 400 };
  context.cameraInitRef.current = false;
  const px = world.player.x, py = world.player.y;
  world.monsters = Array.from({ length: stress ? 100 : 30 }, (_, i): Monster => ({
    id: `enemy-${i}`, x: px + Math.cos(i * 2.399) * (80 + i % 8 * 40),
    y: py + Math.sin(i * 2.399) * (80 + i % 8 * 35), vx: i % 2 ? 1 : -1, vy: 0,
    monsterType: pilot ? 1 : (i % 4 + 1) as 1 | 2 | 3 | 4,
    hp: 50, maxHp: 100, speed: 0, baseSpeed: 0, damage: 0,
    isDying: false, deathTime: 0, isHit: stress && i % 5 === 0, hitTime: time, lastAttackTime: 0,
    lastShot: 0, isBoss: false, lastBossAttackTime: 0, lastRangedAttackTime: 0,
  }));
  if (stress && !pilot) world.monsters.push({ ...world.monsters[0], id: 'boss', isBoss: true,
    monsterType: 5, x: px + 260, y: py + 50, jumpAttackState: 'idle', jumpAttackStartTime: time,
    jumpAttackTargetX: px + 100, jumpAttackTargetY: py + 100 });
  world.obstacles = Array.from({ length: 24 }, (_, i) => {
    const key = `obstacle_${i % 5 + 1}` as AssetId, image = images[key]!;
    return { id: `obstacle-${i}`, x: px - 440 + i % 8 * 115, y: py - 280 + Math.floor(i / 8) * 230,
      width: 100, height: 100 * image.height / image.width, image: ASSET_PATHS[key],
      collisionWidth: 70, collisionHeight: 40 };
  });
  world.bullets = Array.from({ length: stress ? 500 : 100 }, (_, i) => ({
    id: `shot-${i}`, x: px - 550 + i * 71 % 1100, y: py - 330 + i * 113 % 660,
    vx: 1, vy: 0, size: 5, weapon: 'pistol', range: 1000, startX: px, startY: py,
    isCrit: false, penetration: 0, hitCount: 0,
    color: '#fff', damage: 10, actualDamage: 10, distanceTraveled: 0, isRocket: false,
    explosionRadius: 0, explosionDamage: 0, initialSpeed: 1, finalSpeed: 1,
    accelerationStartTime: time, accelerationDuration: 0, lastSmokeTime: 0,
  }));
  world.explosionEffects = stress ? [{ id: 'explosion', x: px - 220, y: py + 100, startTime: time,
    radius: 80, maxRadius: 100, totalFrames: 9, frameDuration: 30, firstPassComplete: false, rotation: 0 }] : [];
  world.damageNumbers = [{ id: 'number', monsterId: 'enemy-0', x: px + 80, y: py - 40,
    damage: 123, opacity: 1, scale: 1, startTime: time, isCrit: true }];
}
function draw() { renderWorld(context, 1000 / 60); }
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))] ?? 0;
async function benchmark(config: Partial<LightingConfig>, warmMs: number, sampleMs: number) {
  renderer.setConfig({ ...LIGHTING_DEFAULTS, ...config });
  const costs: number[] = [], intervals: number[] = [];
  const gl = renderer.canvas?.getContext('webgl');
  // WebGL 1 timer-query extension; read only AVAILABLE queries, never wait synchronously.
  const timer = gl?.getExtension('EXT_disjoint_timer_query');
  const pending: WebGLQuery[] = [], gpuMs: number[] = [];
  let frames = 0;
  const prepare = renderer.prepareFrame;
  renderer.prepareFrame = frame => {
    const query = timer && frames++ % 120 === 0 && pending.length < 4 ? timer.createQueryEXT() : null;
    if (query) timer.beginQueryEXT(timer.TIME_ELAPSED_EXT, query);
    prepare.call(renderer, frame);
    if (query) { timer.endQueryEXT(timer.TIME_ELAPSED_EXT); pending.push(query); }
  };
  let start = 0, previous = 0, sampleStart = 0;
  const result = await new Promise<Record<string, unknown>>(resolve => {
    const tick = (now: number) => {
      start ||= now; time = 1_000_000 + now - start;
      if (stressActive) {
        // Fixture preparation stays outside the measured renderer and maintains representative effects.
        world.player.hitTime = time - 50;
        for (const monster of world.monsters) if (monster.isHit) monster.hitTime = time - 50;
        for (const explosion of world.explosionEffects) explosion.startTime = time - 120;
      }
      const before = performance.now(); draw(); const cost = performance.now() - before;
      while (timer && pending.length && timer.getQueryObjectEXT(pending[0], timer.QUERY_RESULT_AVAILABLE_EXT)) {
        const q = pending.shift()!;
        if (!gl?.getParameter(timer.GPU_DISJOINT_EXT) && now - start >= warmMs)
          gpuMs.push(timer.getQueryObjectEXT(q, timer.QUERY_RESULT_EXT) / 1e6);
        timer.deleteQueryEXT(q);
      }
      if (now - start >= warmMs) {
        if (!sampleStart) { sampleStart = now; previous = 0; }
        costs.push(cost); if (previous) intervals.push(now - previous); previous = now;
      }
      if (sampleStart && now - sampleStart >= sampleMs) {
        pending.forEach(q => timer?.deleteQueryEXT(q));
        renderer.prepareFrame = prepare;
        resolve({ cpuMedian: percentile(costs, 0.5), cpuP95: percentile(costs, 0.95),
          intervalP95: percentile(intervals, 0.95), fps: intervals.length / ((now - sampleStart) / 1000),
          longFrames: intervals.filter(n => n > 33.34).length, frames: costs.length,
          gpuSamples: gpuMs.length, gpuMedianMs: percentile(gpuMs, 0.5), gpuP95Ms: percentile(gpuMs, 0.95), metrics: renderer.getDiagnostics() });
      } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  return result;
}
function set(config: Partial<LightingConfig>) { renderer.setConfig({ ...LIGHTING_DEFAULTS, ...config }); draw(); return renderer.getDiagnostics(); }
function snapshotUnchanged() {
  const before = JSON.stringify(world, (_k, v) => v instanceof Set ? [...v] : v instanceof Map ? [...v] : v);
  const recoil = JSON.stringify(context.recoilRef.current); draw(); draw();
  return before === JSON.stringify(world, (_k, v) => v instanceof Set ? [...v] : v instanceof Map ? [...v] : v) && recoil === JSON.stringify(context.recoilRef.current);
}
function checksum() {
  const data = canvas.getContext('2d')!.getImageData(0, 0, 1200, 800).data;
  let hash = 2166136261;
  for (const byte of data) hash = Math.imul(hash ^ byte, 16777619);
  return hash >>> 0;
}
function compareLegacy() {
  const legacy = (window as Window & { lightingLegacyRender?: typeof renderWorld }).lightingLegacyRender;
  if (!legacy) return { available: false, differentPixels: -1 };
  renderer.setConfig({ ...LIGHTING_DEFAULTS, enabled: false });
  context.cameraInitRef.current = false; draw();
  const c = canvas.getContext('2d')!, current = c.getImageData(0, 0, 1200, 800).data;
  context.cameraInitRef.current = false; legacy(context, 1000 / 60);
  const before = c.getImageData(0, 0, 1200, 800).data;
  let differentPixels = 0;
  for (let i = 0; i < before.length; i += 4)
    if ([0,1,2,3].some(k => current[i+k] !== before[i+k])) differentPixels++;
  return { available: true, differentPixels };
}
function glInfo() {
  const gl = renderer.canvas?.getContext('webgl'), debug = gl?.getExtension('WEBGL_debug_renderer_info');
  return { vendor: debug && gl?.getParameter(debug.UNMASKED_VENDOR_WEBGL), renderer: debug && gl?.getParameter(debug.UNMASKED_RENDERER_WEBGL),
    gpuTimerAvailable: !!gl?.getExtension('EXT_disjoint_timer_query'), maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE),
    userAgent: navigator.userAgent, dpr: devicePixelRatio, logical: [canvas.width, canvas.height], css: [canvas.clientWidth, canvas.clientHeight] };
}
async function contextCycle() {
  const gl = renderer.canvas?.getContext('webgl'), extension = gl?.getExtension('WEBGL_lose_context');
  if (!extension || !renderer.canvas) throw new Error('WEBGL_lose_context is unavailable');
  await new Promise<void>(resolve => { renderer.canvas!.addEventListener('webglcontextlost', () => resolve(), { once: true }); extension.loseContext(); });
  draw(); const lost = renderer.getDiagnostics();
  await new Promise<void>(resolve => {
    renderer.canvas!.addEventListener('webglcontextrestored', () => resolve(), { once: true });
    // Restoration is permitted after dispatch of the lost event has completed.
    setTimeout(() => extension.restoreContext(), 100);
  });
  draw(); return { lost, restored: renderer.getDiagnostics() };
}
function animation(kind: string, index: number) {
  const boss = world.monsters.find(m => m.isBoss);
  world.player.isMoving = kind === 'walk'; context.dashRef.current.active = kind === 'dash';
  world.player.animationStartTime = time - index * 100;
  context.dashRef.current.startTime = time - index * 50;
  context.dashRef.current.dirX = index % 2 ? -1 : 1;
  for (const monster of world.monsters) if (monster.monsterType === 4) {
    monster.isShooting = kind === 'shoot'; monster.shootAnimationStartTime = time - index * 100;
  }
  if (boss && kind.startsWith('boss:')) { boss.jumpAttackState = kind.slice(5) as NonNullable<Monster['jumpAttackState']>; boss.jumpAttackStartTime = time - index * 100; }
  draw(); return renderer.getDiagnostics();
}
async function reload() {
  const image = new Image(); image.src = ASSET_PATHS.playerIdle + '?lighting-reload=' + Date.now(); await image.decode();
  images.playerIdle = image; context.playerIdleImage = image; draw(); return renderer.getDiagnostics();
}
function unavailable() {
  const noGpu = new LightingRenderer(() => {
    const c = document.createElement('canvas');
    const get = c.getContext.bind(c);
    c.getContext = ((type: string) => type === 'webgl' ? null : get(type as '2d')) as typeof c.getContext;
    return c;
  });
  context.lighting = noGpu; draw(); const result = noGpu.getDiagnostics();
  context.lighting = renderer; noGpu.dispose(); return result;
}
function smallDevice() {
  const capped = new LightingRenderer(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false })!;
    const get = gl.getParameter.bind(gl);
    gl.getParameter = (parameter: number) => parameter === gl.MAX_TEXTURE_SIZE ? 2048 : get(parameter);
    return c;
  });
  context.lighting = capped; draw(); const result = capped.getDiagnostics();
  context.lighting = renderer; capped.dispose(); draw(); return result;
}
function gpuFailure(kind: 'shader' | 'upload') {
  const failed = new LightingRenderer(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', { antialias: false, depth: false, stencil: false })!;
    if (kind === 'shader') {
      const source = gl.shaderSource.bind(gl);
      gl.shaderSource = (shader, code) => source(shader, code.includes('gl_FragColor') ? 'deliberate invalid fragment shader' : code);
    } else {
      const upload = gl.texImage2D.bind(gl);
      gl.texImage2D = ((...args: Parameters<WebGLRenderingContext['texImage2D']>) => {
        if (args.length === 6) throw new Error('injected texture upload failure');
        upload(...args);
      }) as typeof gl.texImage2D;
    }
    return c;
  });
  context.lighting = failed; draw(); const result = failed.getDiagnostics();
  context.lighting = renderer; failed.dispose(); return result;
}
function baseSamples() {
  const target = document.createElement('canvas'); target.width = 1200; target.height = 800;
  const c = target.getContext('2d')!;
  c.fillStyle = '#fff'; c.fillRect(0, 0, 1200, 800);
  renderer.setConfig({ ...LIGHTING_DEFAULTS, quality: 'basic' });
  renderer.prepareFrame({ width: 1200, height: 800, camera: { x: 0, y: 0 }, light: { x: 600, y: 400 }, images, sprites: [] });
  renderer.applyBase(c);
  return [600, 900, 950, 1000, 1100].map(x => [...c.getImageData(x, 400, 1, 1).data]);
}
function alignment() {
  const ctx = canvas.getContext('2d')!, original = ctx.drawImage;
  let playerScreen = { x: NaN, y: NaN };
  ctx.drawImage = (function(...args: Parameters<CanvasRenderingContext2D['drawImage']>) {
    if (Math.abs(args[7] - 153.6) < 0.001 && Math.abs(args[8] - 115.2) < 0.001) {
      const transform = ctx.getTransform(); playerScreen = { x: transform.e, y: transform.f };
    }
    original.apply(ctx, args);
  }) as typeof ctx.drawImage;
  const results = [];
  try {
    canvas.style.width = '600px'; canvas.style.height = '400px'; context.screenShakeRef.current = 15;
    for (const [x, y] of [[90,100], [5910,100], [90,5900], [5910,5900], [3000,3000]]) {
      world.player.x = x; world.player.y = y; context.cameraInitRef.current = false;
      draw(); results.push({ actual: { ...playerScreen }, diagnostics: renderer.getDiagnostics() });
    }
  } finally {
    ctx.drawImage = original; canvas.style.width = ''; canvas.style.height = ''; context.screenShakeRef.current = 0;
  }
  return results;
}
Object.assign(window, { lightingQA: { ready, scene, draw, set, checksum, glInfo, benchmark, contextCycle,
  baseSamples, smallDevice, alignment, gpuFailure, compareLegacy,
  newRun: (pilot: boolean) => { resetRunWorld(runtime, 'pistol'); scene(false, pilot); draw(); },
  animation, reload, unavailable, snapshotUnchanged, diagnostics: () => renderer.getDiagnostics(),
  pause: (paused: boolean) => { world.isPaused = paused; draw(); },
  dispose: () => { renderer.dispose(); return renderer.getDiagnostics(); } } });
ready.then(() => { scene(); draw(); document.title = 'Lighting QA ready'; });
