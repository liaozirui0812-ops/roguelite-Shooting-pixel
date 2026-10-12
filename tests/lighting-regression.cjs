const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLightingConfig, lightAttenuation, lightMultiplier, normalCorrection, worldToScreen, packLightSprites } = require('../src/game/render/lighting/lightingMath.ts');
const { createNormalAtlas, alphaBounds, planTexturePages } = require('../src/game/render/lighting/normalProfiles.ts');
const { LightingRenderer, obstacleAssetId } = require('../src/game/render/lighting/lightingRenderer.ts');
const { playerSprite, monsterSprite } = require('../src/game/render/lighting/spriteLayout.ts');
const { SPRITE_ATLASES } = require('../src/game/assets/atlases.ts');
const { ASSET_PATHS } = require('../src/game/assets/manifest.ts');
const { createPlayer } = require('../src/game/runtime/createPlayer.ts');

test('lighting keeps the requested outer diameter, inner soft edge and finite defaults', () => {
  const c = normalizeLightingConfig({ lightHeight: NaN, softEdgeRatio: 0, brightnessFloor: 0, lightLevels: 1 });
  assert.equal(c.lightHeight, 120); assert.ok(c.softEdgeRatio > 0); assert.ok(c.brightnessFloor > 0);
  assert.equal(c.lightLevels, 0);
  const d = normalizeLightingConfig();
  assert.equal(lightAttenuation(300, 1200, d), 1);
  assert.equal(lightAttenuation(350, 1200, d), 0.25);
  assert.equal(lightAttenuation(400, 1200, d), 0);
  assert.equal(lightAttenuation(800, 1200, d), 0);
});
test('sprite correction times the world base equals one attenuation, even at brightness clamps', () => {
  for (const ambientIntensity of [0, 0.3, 1]) for (const lightIntensity of [0, 0.85, 2]) {
    const c = normalizeLightingConfig({ ambientIntensity, lightIntensity });
    for (const a of [0, 0.25, 1]) for (const diffuse of [0, 0.5, 1]) {
      const base = lightMultiplier(a, 1, c), correction = normalCorrection(a, diffuse, c);
      const total = lightMultiplier(a, 1 - c.normalStrength * (1 - diffuse), c);
      total.forEach((v, i) => assert.ok(Math.abs(v - base[i] * correction[i]) < 1e-12));
    }
  }
  assert.deepEqual(worldToScreen({ x: 35, y: 50 }, { x: -10, y: 20 }), { x: 45, y: 30 });
});
test('shared normal profiles are normalized, bounded and have padded borders', () => {
  const a = createNormalAtlas();
  assert.equal(a.pixels.byteLength, 52272);
  for (let i = 0; i < a.pixels.length; i += 4) {
    const length = Math.hypot(...a.pixels.slice(i, i + 3).map(v => v));
    assert.ok(Number.isFinite(length));
    const n = [0, 1, 2].map(k => a.pixels[i + k] / 255 * 2 - 1);
    assert.ok(Math.abs(Math.hypot(...n) - 1) < 0.012);
    assert.equal(a.pixels[i + 3], 255);
  }
  for (let tile = 0; tile < 3; tile++) {
    const offset = tile * a.stride * 4;
    assert.deepEqual(a.pixels.slice(offset, offset + 4), a.pixels.slice(offset + 4, offset + 8));
  }
});
test('stable alpha bounds ignore transparent padding and include every animation frame', () => {
  const pixels = new Uint8ClampedArray(8 * 4 * 4);
  for (const [x, y] of [[2, 1], [5, 2]]) pixels[(y * 8 + x) * 4 + 3] = 255;
  assert.deepEqual(alphaBounds(pixels, 8, [{ x: 0, y: 0, width: 4, height: 4 }, { x: 4, y: 0, width: 4, height: 4 }]),
    { x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
});
test('Boss pages retain the truncated final frame and respect small device limits', () => {
  const frames = SPRITE_ATLASES.boss2.frames;
  for (const limit of [1024, 2048, 4096, 8192]) {
    const pages = planTexturePages(frames, limit);
    assert.ok(pages.length > 0);
    const entries = pages.flatMap(page => {
      assert.ok(page.width <= limit && page.height <= limit);
      for (const { rect } of page.frames) assert.ok(rect.x + rect.width < page.width && rect.y + rect.height < page.height);
      return page.frames;
    });
    assert.equal(entries.length, 20);
    assert.equal(entries[19].rect.width, frames[19].width);
  }
  assert.deepEqual(planTexturePages(frames, 256), []);
  const slots = packLightSprites([{ id: 'large', width: 80, height: 80 }, { id: 'small', width: 10, height: 10 }], 32, 32);
  assert.equal(slots.has('large'), false); assert.equal(slots.has('small'), true);
});
test('frame adapters preserve variable dash frames, mirroring and Boss attack selection', () => {
  const image = { width: 2140, height: 192 }, player = createPlayer();
  const before = structuredClone(player);
  const dash = playerSprite(player, 100150, { playerIdle: image, playerDash: image }, { active: true, startTime: 100000, dirX: -1 }, false);
  assert.deepEqual(dash.source, SPRITE_ATLASES.playerDash.frames[3]); assert.equal(dash.flip, true);
  assert.deepEqual(player, before);
  const boss = { id: 'boss', monsterType: 5, isBoss: true, x: 0, y: 0, vx: 0,
    jumpAttackState: 'landing', jumpAttackStartTime: 100000 };
  assert.deepEqual(monsterSprite(boss, 100300, { boss: image, boss2: image }).source, SPRITE_ATLASES.boss2.frames[19]);
  for (let i = 1; i <= 5; i++) assert.equal(obstacleAssetId(ASSET_PATHS['obstacle_' + i]), 'obstacle_' + i);
});
test('lighting remains safe without browser globals and can be disposed repeatedly', () => {
  const renderer = new LightingRenderer();
  renderer.setConfig({ enabled: false });
  renderer.prepareFrame({ width: 1200, height: 800, camera: { x: 0, y: 0 }, light: { x: 100, y: 100 }, images: {}, sprites: [] });
  assert.equal(renderer.getDiagnostics().mode, 'off');
  renderer.dispose(); renderer.dispose();
  assert.equal(renderer.getDiagnostics().state, 'disposed');
  assert.equal(renderer.getDiagnostics().gpuBytes, 0);
});

test('the actual page obstacle generator consumes path-keyed images and places 24 collidable obstacles', () => {
  // Run the page's real callback without mounting React or making a parallel map generator.
  const fs = require('node:fs'), ts = require('typescript');
  const { GAME_CONFIG } = require('../src/game/config/base.ts');
  const { checkCollisionWithObstacle } = require('../src/game/rules/geometry.ts');
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/app/page.tsx'), 'utf8');
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'generateObstacles') callback = node.initializer.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(callback);
  const code = ts.transpileModule(`const generate = ${callback};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const images = Object.fromEntries([5, 2, 4, 1, 3].map(i => [ASSET_PATHS['obstacle_' + i], { width: i === 5 ? 256 : 512, height: 256 }]));
  let seed = 123456, result;
  const runtime = { now: () => 1_000_000, random: () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; } };
  const run = new Function('obstacleImages', 'GAME_CONFIG', 'runtime', 'setObstacles', code + '\nreturn generate();');
  run(images, GAME_CONFIG, runtime, value => { result = value; });
  assert.equal(result.length, GAME_CONFIG.OBSTACLE_COUNT);
  assert.equal(new Set(result.map(o => o.image)).size, 5);
  for (const obstacle of result) {
    assert.ok(images[obstacle.image]);
    assert.ok(obstacle.collisionWidth <= obstacle.width && obstacle.collisionHeight <= obstacle.height);
    assert.ok(checkCollisionWithObstacle(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, 10, obstacle));
    assert.equal(checkCollisionWithObstacle(obstacle.x - 100, obstacle.y - 100, 10, obstacle), false);
    assert.ok(Math.hypot(obstacle.x + obstacle.width / 2 - GAME_CONFIG.WORLD_WIDTH / 2,
      obstacle.y + obstacle.height / 2 - GAME_CONFIG.WORLD_HEIGHT / 2) >= 200);
  }
  result.forEach((a, i) => result.slice(i + 1).forEach(b => assert.ok(Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2) >= 220)));
});
