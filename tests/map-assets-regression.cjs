const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { ASSET_PATHS } = require('../src/game/assets/manifest.ts');
const { GAME_CONFIG } = require('../src/game/config/base.ts');

// Execute the real page callbacks with fake I/O, without a second map implementation.
const source = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let loadEffect, generateMap;
const visit = node => {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' &&
      node.arguments[0]?.getText(ast).includes('const resources: AssetSpec[]')) loadEffect = node.arguments[0];
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'generateMapBackground')
    generateMap = node.initializer.arguments[0];
  ts.forEachChild(node, visit);
};
visit(ast);
function execute(callback, scope) {
  assert.ok(callback, 'page callback exists');
  const code = ts.transpileModule(`const run = ${callback.getText(ast)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn run();')(...Object.values(scope));
}
async function loadAssets(failedTiles = []) {
  const captured = {}, requests = [];
  const scope = {
    ASSET_PATHS, AbortController, imageVersion: 15,
    loadImageAsset: resource => new Promise(resolve => requests.push({ resource, resolve })),
  };
  const findSetters = node => {
    if (ts.isIdentifier(node) && /^set[A-Z]/.test(node.text))
      scope[node.text] = value => { captured[node.text] = value; };
    ts.forEachChild(node, findSetters);
  };
  findSetters(loadEffect);
  const cleanup = execute(loadEffect, scope);
  // Complete in reverse order to exercise cached/asynchronous image loads.
  for (const { resource, resolve } of requests.slice().reverse()) resolve(
    failedTiles.includes(resource.key)
      ? { key: resource.key, status: 'failed', reason: 'load failed' }
      : { key: resource.key, status: 'loaded', image: { src: resource.src, width: 625, height: 350 } }
  );
  await new Promise(resolve => setImmediate(resolve));
  cleanup();
  return captured;
}

test('the page loads all five existing tiles in manifest order regardless of completion order', async () => {
  const loaded = await loadAssets();
  const urls = [1, 2, 3, 4, 5].map(i => ASSET_PATHS['tile' + i]);
  assert.deepEqual(loaded.setTileImages.map(image => image.src), urls);
  for (const url of [...urls, ASSET_PATHS.upgradePanel])
    assert.ok(fs.existsSync(path.join(__dirname, '../public', url)), url);
  assert.deepEqual(loaded.setResourceErrors, []);
  assert.equal(loaded.setIsLoading, false);
});

test('missing decorative tiles do not block startup and use remaining tiles or the solid fallback', async () => {
  const partial = await loadAssets(['tile2', 'tile4']);
  assert.deepEqual(partial.setTileImages.map(image => image.src), [1, 3, 5].map(i => ASSET_PATHS['tile' + i]));
  assert.equal(partial.setIsLoading, false);
  const missing = await loadAssets(['tile1', 'tile2', 'tile3', 'tile4', 'tile5']);
  assert.deepEqual(missing.setTileImages, []);
  assert.deepEqual(missing.setResourceErrors, []);
  assert.equal(missing.setIsLoading, false);
  const background = { current: { old: true } };
  execute(generateMap, { tileImages: [], mapBackgroundCanvasRef: background });
  assert.equal(background.current, null, 'failed reload clears a stale map cache');
});

test('the page stitcher covers the world at the original scale, caches it and accepts a partial set', () => {
  for (const count of [5, 1]) {
    const tiles = Array.from({ length: count }, (_, i) => ({ width: 625, height: 350, id: i }));
    const draws = [], fills = [], background = { current: null };
    const context = { drawImage: (...args) => draws.push(args), fillRect: (...args) => fills.push(args), save() {}, restore() {} };
    const canvas = { getContext: () => context };
    execute(generateMap, {
      tileImages: tiles, mapBackgroundCanvasRef: background, GAME_CONFIG,
      document: { createElement: () => canvas }, console: { log() {} },
      // A visual background must not consume a seeded battle random source.
      runtime: { random: () => assert.fail('map decoration consumed battle randomness') },
    });
    assert.equal(background.current, canvas);
    assert.equal(canvas.width, GAME_CONFIG.WORLD_WIDTH);
    assert.equal(canvas.height, GAME_CONFIG.WORLD_HEIGHT);
    const columns = Math.ceil(canvas.width / (625 / 6)), rows = Math.ceil(canvas.height / (350 / 6));
    assert.equal(draws.length, columns * rows);
    assert.deepEqual(draws[0].slice(1), [0, 0, 625 / 6, 350 / 6]);
    const last = draws.at(-1);
    assert.ok(last[1] + last[3] >= canvas.width && last[2] + last[4] >= canvas.height);
    assert.ok(draws.every(draw => tiles.includes(draw[0])));
    assert.deepEqual(fills, Array.from({ length: 2 }, () => [0, 0, canvas.width, canvas.height]));
  }
});
