const { chromium, devices } = require('playwright');
// Interaction tests (run: npm run e2e).
const BASE = process.env.E2E_BASE || 'http://localhost:3200/dashboard';
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const path = () => new URL(p.url()).pathname + new URL(p.url()).search;
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, e.message.split('\n')[0].slice(0, 140)); } };

  await step('standings filters', async () => {
    await p.goto(BASE + '/2025-26/league/epl/', { waitUntil: 'networkidle' });
    const first = async () => (await p.locator('tbody tr').first().innerText()).split('\n').join(' ');
    const all = await first();
    await p.click('role=tab[name="Away"]'); await p.waitForTimeout(700);
    const away = await first();
    await p.click('role=tab[name="Last 5"]'); await p.waitForTimeout(700);
    const l5 = await first();
    ok('standings filters re-rank', all !== away || all !== l5, `${all.slice(0, 30)} | ${away.slice(0, 30)} | ${l5.slice(0, 30)}`);
    const rows = await p.locator('tbody tr').count();
    ok('standings 20 rows', rows === 20, String(rows));
  });

  await step('race chart', async () => {
    const lines = p.locator('svg[aria-label*="by matchday"] path[stroke="transparent"]');
    ok('race chart has 20 hit paths', (await lines.count()) === 20, String(await lines.count()));
    await p.click('role=tab[name="Points"]'); await p.waitForTimeout(900);
    ok('race chart switches to points', (await p.locator('svg[aria-label^="Cumulative points"]').count()) === 1);
    const before = await p.locator('section:has-text("Season race") button:has-text("×")').count();
    await lines.nth(10).click({ force: true }); await p.waitForTimeout(400);
    const after = await p.locator('section:has-text("Season race") button:has-text("×")').count();
    ok('click line adds to legend', after === before + 1, `${before}→${after}`);
  });

  await step('command palette', async () => {
    await p.keyboard.press('Control+k'); await p.waitForTimeout(300);
    await p.keyboard.type('arsenal'); await p.waitForTimeout(300);
    await p.keyboard.press('Enter'); await p.waitForURL(/team\/arsenal/, { timeout: 5000 });
    ok('⌘K → Arsenal', /\/team\/arsenal/.test(path()), path());
  });

  await step('g-shortcuts', async () => {
    await p.locator('body').click({ position: { x: 700, y: 30 } });
    await p.keyboard.press('g'); await p.keyboard.press('2'); await p.waitForURL(/league\/laliga/, { timeout: 5000 });
    ok('g 2 → LaLiga', /league\/laliga/.test(path()), path());
  });

  await step('theme persists', async () => {
    await p.click('button[aria-label^="Switch to light"]'); await p.waitForTimeout(400);
    await p.reload({ waitUntil: 'networkidle' });
    ok('light theme persists', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'light');
    await p.click('button[aria-label^="Switch to dark"]'); await p.waitForTimeout(300);
  });

  await step('follow team', async () => {
    await p.goto(BASE + '/team/arsenal/', { waitUntil: 'networkidle' });
    await p.click('button:has-text("Follow")'); await p.waitForTimeout(400);
    ok('follow shows in sidebar', (await p.locator('aside nav a:has-text("Arsenal")').count()) > 0);
    await p.goto(BASE + '/?date=2026-09-19', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    ok('following group on matches', (await p.locator('text=Following').count()) >= 2);
  });

  await step('date strip keys', async () => {
    await p.goto(BASE + '/?date=2026-09-20', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    await p.keyboard.press('ArrowLeft'); await p.waitForURL(/date=2026-09-19/, { timeout: 5000 });
    ok('← moves a day', /2026-09-19/.test(path()), path());
    await p.keyboard.press('t'); await p.waitForTimeout(800);
    ok('t → today', !/date=/.test(path()), path());
  });

  await step('fixtures browser', async () => {
    await p.goto(BASE + '/2025-26/league/seriea/fixtures/', { waitUntil: 'networkidle' });
    const label = async () => (await p.locator('text=/Matchday \\d+ ·/').first().innerText());
    const a = await label(); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500); const c = await label();
    ok('fixtures ← changes matchday', a !== c, `${a} → ${c}`);
    ok('fixtures rows', (await p.locator('a[href*="match/?id="]').count()) >= 10);
  });

  await step('compare picker', async () => {
    await p.goto(BASE + '/compare/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    await p.locator('button:has(svg.lucide-chevrons-up-down)').nth(1).click();
    await p.keyboard.type('Barcelona'); await p.waitForTimeout(200);
    await p.locator('div.absolute button:has-text("Barcelona")').first().click(); await p.waitForTimeout(800);
    ok('compare picker updates URL', /b=barcelona/.test(path()), path());
    ok('compare shows Barcelona', (await p.locator('main :text("Barcelona")').count()) > 1);
  });

  await step('matrix → match', async () => {
    await p.goto(BASE + '/2025-26/league/epl/stats/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
    await p.locator('button[aria-label*=" vs "]').nth(3).click(); await p.waitForURL(/match/, { timeout: 5000 }); await p.waitForTimeout(800);
    ok('matrix cell opens match', /match\/\?id=epl-2526/.test(path()), path());
    ok('match page rendered', (await p.locator('text=Table impact').count()) === 1);
    await p.goBack({ waitUntil: 'networkidle' });
    ok('back returns to stats', /stats/.test(path()), path());
  });

  await step('season switch + back', async () => {
    await p.goto(BASE + '/league/epl/stats/', { waitUntil: 'networkidle' });
    await p.click('button[role=tab]:has-text("2025/26")'); await p.waitForURL(/2025-26/, { timeout: 5000 });
    ok('season switch keeps tab', /2025-26\/league\/epl\/stats/.test(path()), path());
    await p.goBack(); await p.waitForTimeout(800);
    ok('back restores season', /\/league\/epl\/stats/.test(path()) && !/2025-26/.test(path()), path());
  });

  await step('404', async () => {
    const r = await p.goto(BASE + '/404.html'); 
    ok('404 page renders', (await p.locator('text=offside').count()) === 1);
    const href = await p.locator('a:has-text("Back to matches")').getAttribute('href');
    ok('404 link has basePath', href.startsWith(new URL(BASE).pathname), href);
  });

  await step('mobile drawer', async () => {
    const m = await (await b.newContext({ ...devices['iPhone 14'] })).newPage();
    m.on('pageerror', e => errs.push('mobile ' + e.message));
    await m.goto(BASE + '/', { waitUntil: 'networkidle' });
    await m.click('button[aria-label="Open menu"]'); await m.waitForTimeout(500);
    await m.locator('aside.fixed nav a', { hasText: 'Serie A' }).click(); await m.waitForURL(/seriea/, { timeout: 5000 }); await m.waitForTimeout(500);
    ok('mobile drawer navigates + closes', (await m.locator('button[aria-label="Close menu"]').count()) === 0);
  });

  ok('no runtime errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log(results.join('\n'));
  await b.close();
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
