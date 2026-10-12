// Browser tooling is optional and external to the shipped game. Use PLAYWRIGHT_MODULE or NODE_PATH.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.LIGHTING_QA_OUTPUT || path.join(os.tmpdir(), 'lighting-qa'));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const esbuild = require(require.resolve('esbuild', { paths: [require.resolve('drizzle-kit')] }));
const bundle = esbuild.buildSync({ entryPoints: [path.join(root, 'tests/lighting-browser.ts')], bundle: true,
  write: false, platform: 'browser', format: 'iife', tsconfig: path.join(root, 'tsconfig.json') }).outputFiles[0].text;
// Optional historical pixel check. Explicit ref makes this reproducible after the feature is committed.
let legacyBundle = '';
if (process.env.LIGHTING_BASELINE_REF) {
  const source = execFileSync('git', ['show', `${process.env.LIGHTING_BASELINE_REF}:src/game/render/renderWorld.ts`], { cwd: root, encoding: 'utf8' });
  legacyBundle = esbuild.buildSync({ stdin: { contents: source + '\nObject.assign(window,{lightingLegacyRender:renderWorld});',
    resolveDir: path.join(root, 'src/game/render'), loader: 'ts' }, bundle: true, write: false, platform: 'browser',
    format: 'iife', tsconfig: path.join(root, 'tsconfig.json') }).outputFiles[0].text;
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#111"><canvas width="1200" height="800" style="display:block"></canvas><script src="/legacy.js"></script><script src="/qa.js"></script></body></html>'); return; }
  if (url.pathname === '/legacy.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(legacyBundle); return; }
  if (url.pathname === '/qa.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle); return; }
  const file = path.resolve(root, 'public', '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(path.join(root, 'public') + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; res.end(); return; }
  res.setHeader('Content-Type', file.endsWith('.svg') ? 'image/svg+xml' : 'image/png'); fs.createReadStream(file).pipe(res);
});
const report = { date: new Date().toISOString(), cpu: os.cpus()[0]?.model, platform: os.platform(), mode: process.argv.includes('--benchmark') ? 'benchmark' : 'smoke', tests: [], runs: [] };
let browser;
(async () => {
  fs.mkdirSync(output, { recursive: true }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ channel: process.env.LIGHTING_BROWSER || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => window.lightingQA.ready);
  report.browser = await browser.version(); report.device = await page.evaluate(() => window.lightingQA.glInfo());
  console.log(JSON.stringify(report.device));
  const pilot = process.argv.includes('--pilot');
  await page.evaluate(pilot => window.lightingQA.scene(false, pilot), pilot);
  if (legacyBundle) {
    report.legacy = [];
    for (const stress of [false, true]) {
      await page.evaluate(stress => window.lightingQA.scene(stress), stress);
      for (const kind of ['idle', 'walk', 'dash', 'shoot', 'boss:jump_start', 'boss:airborne', 'boss:landing']) for (let i = 0; i < 10; i++) {
        await page.evaluate(([kind, i]) => window.lightingQA.animation(kind, i), [kind, i]);
        const result = await page.evaluate(() => window.lightingQA.compareLegacy());
        assert.equal(result.differentPixels, 0, `${stress}/${kind}/${i}: ${JSON.stringify(result)}`);
        report.legacy.push({ stress, kind, frame: i, ...result });
      }
    }
    console.log('Legacy renderer pixel equality passed');
    await page.evaluate(pilot => window.lightingQA.scene(false, pilot), pilot);
  }
  for (const quality of ['off', 'basic', 'standard', 'high']) {
    const metrics = await page.evaluate(quality => window.lightingQA.set({ enabled: quality !== 'off', quality: quality === 'off' ? 'standard' : quality }), quality);
    if (quality === 'standard' || quality === 'high') { assert.equal(metrics.state, 'ready', metrics.reason); assert.ok(metrics.lit > 0); assert.equal(metrics.overflow, 0); }
    assert.ok(await page.evaluate(() => window.lightingQA.snapshotUnchanged()));
    await page.screenshot({ path: path.join(output, `${pilot ? 'pilot' : 'all'}-${quality}.png`) });
    report.tests.push({ quality, metrics, checksum: await page.evaluate(() => window.lightingQA.checksum()) });
  }
  assert.equal(new Set(report.tests.map(test => test.checksum)).size, 4, 'lighting quality levels must change the rendered pixels');
  const steady = await page.evaluate(() => window.lightingQA.set({ quality: 'standard' }));
  for (const kind of ['idle', 'walk', 'dash', 'shoot']) for (let i = 0; i < 10; i++) await page.evaluate(([kind, i]) => window.lightingQA.animation(kind, i), [kind, i]);
  // First walk/dash use uploads once. Then cycles/new scenes reuse these image identities.
  const cached = await page.evaluate(() => window.lightingQA.set({ quality: 'standard' }));
  for (let i = 0; i < 20; i++) await page.evaluate(pilot => window.lightingQA.newRun(pilot), pilot);
  const reused = await page.evaluate(() => window.lightingQA.diagnostics());
  assert.equal(reused.uploads, cached.uploads); assert.equal(reused.textures, cached.textures); assert.equal(reused.gpuBytes, cached.gpuBytes);
  report.cache = { steady, cached, reused };
  console.log('Cached images and 20 scene resets passed');
  report.reload = await page.evaluate(() => window.lightingQA.reload());
  assert.equal(report.reload.textures, reused.textures); assert.equal(report.reload.scans, reused.scans + 1);
  report.unavailable = await page.evaluate(() => window.lightingQA.unavailable()); assert.equal(report.unavailable.mode, 'basic');
  report.failures = [];
  for (const kind of ['shader', 'upload']) {
    const failure = await page.evaluate(kind => window.lightingQA.gpuFailure(kind), kind);
    assert.equal(failure.mode, 'basic'); assert.ok(failure.reason); report.failures.push({ kind, ...failure });
  }
  report.cycles = [];
  for (let i = 0; i < 3; i++) {
    const cycle = await page.evaluate(() => Promise.race([window.lightingQA.contextCycle(), new Promise((_, reject) => setTimeout(() => reject(new Error('context restore timeout')), 8000))]));
    assert.equal(cycle.lost.mode, 'basic'); assert.equal(cycle.restored.state, 'ready'); assert.ok(cycle.restored.lit > 0);
    report.cycles.push(cycle);
  }
  await page.evaluate(pilot => { window.lightingQA.scene(true, pilot); window.lightingQA.set({ quality: 'high', lightLevels: 4 }); }, pilot);
  if (!pilot) for (const kind of ['boss:jump_start', 'boss:airborne', 'boss:landing']) for (let i = 0; i < 20; i++) await page.evaluate(([kind, i]) => window.lightingQA.animation(kind, i), [kind, i]);
  await page.screenshot({ path: path.join(output, `${pilot ? 'pilot' : 'all'}-stress.png`) });
  report.stress = await page.evaluate(() => window.lightingQA.diagnostics()); assert.equal(report.stress.overflow, 0);
  assert.ok(report.stress.gpuBytes <= 64 * 1024 * 1024); assert.ok(report.stress.outputBytes <= 16 * 1024 * 1024);
  if (!pilot) {
    for (const kind of ['walk', 'dash', 'shoot', 'idle']) {
      const coverage = await page.evaluate(kind => window.lightingQA.animation(kind, 0), kind);
      assert.equal(coverage.state, 'ready'); assert.equal(coverage.overflow, 0); assert.ok(coverage.lit > 0);
    }
    report.coverage = await page.evaluate(() => window.lightingQA.diagnostics());
    assert.ok(report.coverage.textures >= 16, '15 source materials and one shared normal atlas must be cached');
    assert.ok(report.coverage.gpuBytes <= 64 * 1024 * 1024);
    report.smallDevice = await page.evaluate(() => window.lightingQA.smallDevice());
    assert.equal(report.smallDevice.state, 'ready'); assert.equal(report.smallDevice.overflow, 0); assert.equal(report.smallDevice.maxTextureSize, 2048);
  }
  report.baseSamples = await page.evaluate(() => window.lightingQA.baseSamples());
  for (const [index, expected] of [[0, [255, 255, 239]], [2, [112, 110, 117]], [3, [57, 61, 77]], [4, [57, 61, 77]]])
    expected.forEach((value, channel) => assert.ok(Math.abs(report.baseSamples[index][channel] - value) <= 3, JSON.stringify(report.baseSamples)));
  await page.evaluate(pilot => { window.lightingQA.scene(false, pilot, true); window.lightingQA.set({ quality: 'standard' }); }, pilot);
  await page.screenshot({ path: path.join(output, `${pilot ? 'pilot' : 'all'}-edge.png`) });
  await page.evaluate(() => { window.lightingQA.pause(true); window.lightingQA.pause(false); });
  report.alignment = await page.evaluate(() => window.lightingQA.alignment());
  for (const entry of report.alignment) {
    assert.ok(Math.hypot(entry.actual.x - entry.diagnostics.lightScreen.x, entry.actual.y - entry.diagnostics.lightScreen.y) < 0.001);
    assert.equal(entry.diagnostics.radius, 400);
  }
  if (report.mode === 'benchmark') {
    const warmMs = Number(process.env.LIGHTING_WARM_MS || 10000), sampleMs = Number(process.env.LIGHTING_SAMPLE_MS || 60000), repeats = Number(process.env.LIGHTING_REPEATS || 3);
    report.measurement = { warmMs, sampleMs, repeats, gpuTime: 'Asynchronous EXT_disjoint_timer_query, WebGL pass only; zero samples means unavailable/disjoint, not zero GPU cost' };
    const qualities = (process.env.LIGHTING_QUALITIES || 'off,basic,standard,high').split(',');
    const scenarios = pilot || process.env.LIGHTING_SCENARIOS === 'normal' ? [false] : process.env.LIGHTING_SCENARIOS === 'stress' ? [true] : [false, true];
    for (const stress of scenarios) for (let repeat = 0; repeat < repeats; repeat++) for (const quality of qualities) {
      await page.evaluate(([stress, pilot]) => window.lightingQA.scene(stress, pilot), [stress, pilot]);
      const result = await page.evaluate(([quality, warmMs, sampleMs]) => window.lightingQA.benchmark({ enabled: quality !== 'off', quality: quality === 'off' ? 'standard' : quality }, warmMs, sampleMs), [quality, warmMs, sampleMs]);
      report.runs.push({ stress, repeat, quality, ...result });
      fs.writeFileSync(path.join(output, `${pilot ? 'pilot' : 'all'}-report.json`), JSON.stringify(report, null, 2));
      console.log(JSON.stringify(report.runs.at(-1)));
    }
    report.budgets = [];
    report.fullSampling = warmMs >= 10000 && sampleMs >= 60000 && repeats >= 3;
    for (const stress of scenarios) for (let repeat = 0; repeat < repeats; repeat++) {
      const baseline = report.runs.find(run => run.stress === stress && run.repeat === repeat && run.quality === 'off');
      const standard = report.runs.find(run => run.stress === stress && run.repeat === repeat && run.quality === 'standard');
      if (!baseline || !standard) continue;
      const deltaMedian = standard.cpuMedian - baseline.cpuMedian, deltaP95 = standard.cpuP95 - baseline.cpuP95;
      const passed = deltaMedian <= 2 && deltaP95 <= 4 && (baseline.fps < 58 ||
        standard.fps >= 55 && standard.intervalP95 <= baseline.intervalP95 * 1.2) &&
        standard.metrics.lit === standard.metrics.requested && standard.metrics.overflow === 0;
      report.budgets.push({ stress, repeat, deltaMedian, deltaP95, passed });
      assert.ok(passed, `Standard lighting exceeds budget: ${JSON.stringify(report.budgets.at(-1))}`);
    }
  }
  assert.deepEqual(errors, []); report.errors = errors; report.disposed = await page.evaluate(() => window.lightingQA.dispose());
  assert.equal(report.disposed.textures, 0); assert.equal(report.disposed.gpuBytes, 0);
  fs.writeFileSync(path.join(output, `${pilot ? 'pilot' : 'all'}-report.json`), JSON.stringify(report, null, 2));
  console.log(`Lighting QA passed: ${path.join(output, `${pilot ? 'pilot' : 'all'}-report.json`)}`);
})().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await browser?.close(); server.close(); });
