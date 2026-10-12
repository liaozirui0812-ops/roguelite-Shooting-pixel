// Start Next.js separately. This script only controls a disposable local test browser.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const output = path.resolve(process.env.LIGHTING_QA_OUTPUT || path.join(os.tmpdir(), 'lighting-qa'));
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.LIGHTING_BROWSER || 'msedge', headless: true });
  const report = { date: new Date().toISOString(), browser: await browser.version(), errors: [], qualities: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.addInitScript(() => {
      const stats = { contexts: [], obstacles: 0, player: null, light: null, frames: 0 };
      Object.assign(window, { lightingAppQA: stats });
      const get = HTMLCanvasElement.prototype.getContext, wrapped = new WeakSet();
      HTMLCanvasElement.prototype.getContext = function(...args) {
        const ctx = get.apply(this, args);
        if (!ctx) return ctx;
        if (args[0] === 'webgl' && !stats.contexts.includes(ctx)) stats.contexts.push(ctx);
        if (args[0] === '2d' && !wrapped.has(ctx)) {
          wrapped.add(ctx);
          const draw = ctx.drawImage, fill = ctx.fillRect;
          ctx.fillRect = function(x, y, width, height) {
            if (this.canvas.getAttribute('aria-label') === '战斗画布' && width === 1200 && height === 800) { stats.obstacles = 0; stats.frames++; }
            return fill.call(this, x, y, width, height);
          };
          ctx.drawImage = function(...values) {
            if (this.canvas.getAttribute('aria-label') === '战斗画布') {
              if (values.length === 9 && values[7] === 100 && [50, 100].includes(values[8])) stats.obstacles++;
              if (values.length === 9 && Math.abs(values[7] - 153.6) < 0.001 && Math.abs(values[8] - 115.2) < 0.001) {
                const m = this.getTransform(); stats.player = { x: m.e, y: m.f };
              }
            } else if (this.canvas.width === 1200 && this.canvas.height === 800 && values.length === 5 && values[3] === 800 && values[4] === 800)
              stats.light = { x: values[1] + 400, y: values[2] + 400 };
            return draw.apply(this, values);
          };
        }
        return ctx;
      };
    });
    await page.goto(process.env.LIGHTING_APP_URL || 'http://localhost:3100');
    const start = page.getByText('开始游戏', { exact: true });
    await start.waitFor({ timeout: 30000 }); await start.hover(); await start.click();
    await page.getByRole('heading', { name: '手枪', exact: true }).click();
    const canvas = page.locator('canvas[aria-label="战斗画布"]');
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="战斗画布"]')?.dataset.gameState === 'playing' && window.lightingAppQA.obstacles === 24);
    const box = await canvas.boundingBox();
    const stats = () => page.evaluate(() => ({ ...window.lightingAppQA, contexts: window.lightingAppQA.contexts.length }));
    report.initial = await stats(); assert.equal(report.initial.obstacles, 24);
    await page.keyboard.down('d'); await page.waitForTimeout(400); await page.keyboard.press('e'); await page.waitForTimeout(450); await page.keyboard.up('d');
    await page.mouse.move(box.x + 900, box.y + 400); await page.mouse.down(); await page.waitForTimeout(450); await page.mouse.up();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="战斗画布"]')?.dataset.paused === 'true');
    await page.mouse.click(box.x + 70, box.y + 740);
    const select = page.locator('#lighting-quality');
    try { await select.waitFor({ timeout: 3000 }); } catch (error) {
      console.log('Settings hit target', await page.evaluate(([x,y]) => {
        const e = document.elementFromPoint(x,y); return { tag: e?.tagName, text: e?.textContent, html: e?.outerHTML.slice(0,500) };
      }, [box.x + 70, box.y + 740]));
      await page.screenshot({ path: path.join(output, 'app-settings-hit.png') }); throw error;
    }
    for (const quality of ['off', 'basic', 'standard', 'high']) {
      await select.selectOption(quality); await page.waitForTimeout(80);
      report.qualities.push({ quality, stats: await stats() });
    }
    await page.getByLabel('四级明暗').check();
    await page.getByTitle('关闭', { exact: true }).click();
    await page.mouse.click(box.x + 600, box.y + 740);
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="战斗画布"]')?.dataset.paused === 'false');
    await page.screenshot({ path: path.join(output, 'app-playing.png') });
    report.active = await stats();
    assert.ok(Math.hypot(report.active.player.x - report.active.light.x, report.active.player.y - report.active.light.y) < 0.001);
    const starts = await canvas.getAttribute('data-runtime-starts');
    await page.evaluate(() => {
      window.lightingAppQA.lossExtension = window.lightingAppQA.contexts.at(-1).getExtension('WEBGL_lose_context');
      window.lightingAppQA.lossExtension.loseContext();
    });
    await page.waitForTimeout(200); await page.keyboard.down('a'); await page.waitForTimeout(200); await page.keyboard.up('a');
    report.lost = await stats(); assert.ok(report.lost.frames > report.active.frames);
    await page.screenshot({ path: path.join(output, 'app-basic-fallback.png') });
    await page.evaluate(() => window.lightingAppQA.lossExtension.restoreContext());
    await page.waitForTimeout(300); report.restored = await stats();
    assert.equal(await canvas.getAttribute('data-runtime-starts'), starts);
    assert.equal(await canvas.getAttribute('data-game-state'), 'playing'); assert.deepEqual(report.errors, []);
    fs.writeFileSync(path.join(output, 'app-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
