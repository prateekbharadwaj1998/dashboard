// Interaction tests (run: npm run e2e). Live data comes from ESPN; tests assert
// structure and behaviour, not specific scores, so they pass on any matchday.
const { chromium, devices } = require('playwright');
const { routeEspn } = require('./espn-route.cjs');
const BASE = process.env.E2E_BASE || 'http://localhost:3200/dashboard';
const MATCH = '401879244'; // Brighton 2-0 Brentford, 8 Nov 2026 (finished, full data)
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Europe/London' });
  await routeEspn(ctx);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text().slice(0, 200)));
  const path = () => new URL(p.url()).pathname + new URL(p.url()).search;
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      ok(name, false, e.message.split('\n')[0].slice(0, 160));
    }
  };
  const go = (u) => p.goto(BASE + u, { waitUntil: 'networkidle', timeout: 45000 });

  await step('live home', async () => {
    await go('/');
    await p.waitForSelector('[aria-busy]', { state: 'detached', timeout: 30000 }).catch(() => {});
    const body = await p.locator('main').innerText();
    ok('home loads live data', /Live data · updated/.test(body) && !/unavailable/.test(body), body.slice(0, 80).replace(/\n/g, ' '));
    const rows = await p.locator('a[href*="match/?id="], a[href*="match?id="]').count();
    const empty = await p.locator('text=No matches on this day').count();
    ok('home shows matches or empty state', rows > 0 || empty > 0, `${rows} rows`);
    await p.keyboard.press('ArrowRight');
    await p.waitForURL(/date=/, { timeout: 8000 });
    ok('→ moves a day', /date=\d{4}-\d{2}-\d{2}/.test(path()), path());
    await p.click('role=tab[name=/Finished/]');
    await p.waitForTimeout(400);
    ok('filter tabs respond', (await p.locator('role=tab[name=/Finished/]').getAttribute('aria-selected')) === 'true');
  });

  await step('match centre', async () => {
    await go(`/match/?id=${MATCH}`);
    await p.waitForSelector('text=Brighton', { timeout: 30000 });
    ok('match hero renders', (await p.locator('text=Full Time').count()) > 0);
    ok('timeline + pulse render', (await p.locator('text=Timeline').count()) === 1 && (await p.locator('text=Pulse').count()) >= 1);
    await p.click('button:has-text("Line-ups")');
    await p.waitForTimeout(1200);
    const nodes = await p.locator('.pitch svg g.cursor-pointer').count();
    ok('pitch shows 22 starters', nodes === 22, String(nodes));
    await p.locator('.pitch svg g.cursor-pointer').first().click();
    await p.waitForTimeout(600);
    ok('player sheet with rating breakdown', (await p.locator('text=HS Rating breakdown').count()) === 1);
    await p.keyboard.press('Escape');
    await p.locator('aside button[aria-label="Close"]').click().catch(() => {});
    await p.click('button:has-text("Stats")');
    await p.waitForTimeout(500);
    ok('team stats tab', (await p.locator('text=Possession').count()) > 0);
    await p.click('button:has-text("Commentary")');
    await p.waitForTimeout(500);
    ok('commentary tab', (await p.locator('main ol li').count()) > 20);
  });

  await step('competition', async () => {
    await go('/competition/?lg=eng.1');
    await p.waitForTimeout(1500);
    ok('competition fixtures', (await p.locator('a[href*="match"]').count()) > 0);
    await p.click('button:has-text("Table")');
    await p.waitForTimeout(1500);
    const rows = await p.locator('main tbody tr').count();
    ok('competition table has 20 rows', rows === 20, String(rows));
    await p.click('button:has-text("Top scorers")');
    await p.waitForTimeout(1500);
    ok('top scorers list', (await p.locator('main ol li').count()) >= 10);
  });

  await step('team + follow', async () => {
    await go('/team/?id=359&lg=eng.1');
    await p.waitForSelector('h1:has-text("Arsenal")', { timeout: 30000 });
    await p.click('button:has-text("Follow")');
    await p.waitForTimeout(400);
    ok('followed team in sidebar', (await p.locator('aside nav a:has-text("Arsenal")').count()) > 0);
    await p.click('button:has-text("squad")');
    await p.waitForTimeout(1500);
    const players = await p.locator('main a[href*="player"]').count();
    ok('squad lists players', players >= 15, String(players));
    await p.locator('main a[href*="player"]').first().click();
    await p.waitForURL(/player/, { timeout: 8000 });
    await p.waitForTimeout(1500);
    ok('player page from squad', (await p.locator('text=Season by competition').count()) === 1);
  });

  await step('player', async () => {
    await go('/player/?id=253989&lg=eng.1');
    await p.waitForSelector('h1:has-text("Haaland")', { timeout: 30000 });
    ok('player bio', (await p.locator('text=Nationality').count()) > 0);
    ok('player game log', (await p.locator('a[href*="match"]').count()) > 3);
  });

  await step('studio + overlays', async () => {
    await go('/studio/');
    await p.waitForTimeout(1500);
    ok('studio url built', /overlay\/\?w=scorebug/.test(await p.locator('code').innerText()));
    await go(`/overlay/?w=scorebug&match=${MATCH}`);
    await p.waitForTimeout(2000);
    ok('scorebug renders', (await p.locator('text=BHA').count()) > 0 && (await p.locator('aside').count()) === 0);
    await go('/overlay/?w=table&lg=eng.1&rows=6');
    await p.waitForTimeout(2000);
    ok('table overlay renders', (await p.locator('text=Premier League').count()) > 0);
  });

  await step('glance mode', async () => {
    await go('/');
    await p.waitForTimeout(800);
    await p.locator('body').click({ position: { x: 700, y: 30 } });
    await p.keyboard.press('b');
    await p.waitForURL(/glance/, { timeout: 8000 });
    await p.waitForTimeout(1500);
    ok('B opens glance', (await p.locator('table').count()) === 1 && (await p.locator('aside').count()) === 0);
  });

  await step('command palette', async () => {
    await go('/');
    await p.keyboard.press('Control+k');
    await p.waitForTimeout(300);
    await p.keyboard.type('nations league');
    await p.waitForTimeout(400);
    await p.keyboard.press('Enter');
    await p.waitForURL(/competition/, { timeout: 8000 });
    ok('⌘K → competition', /lg=uefa\.nations/.test(path()), path());
  });

  await step('season insights (archive)', async () => {
    await go('/2025-26/league/epl/');
    await p.click('role=tab[name="Away"]');
    await p.waitForTimeout(600);
    ok('archive table re-ranks', (await p.locator('tbody tr').count()) === 20);
    ok('race chart', (await p.locator('svg[aria-label*="by matchday"] path[stroke="transparent"]').count()) === 20);
  });

  await step('theme persists', async () => {
    await go('/competitions/');
    await p.click('button[aria-label^="Switch to light"]');
    await p.reload({ waitUntil: 'networkidle' });
    ok('light theme persists', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'light');
    await p.click('button[aria-label^="Switch to dark"]');
  });

  await step('404', async () => {
    await p.goto(BASE + '/404.html');
    ok('404 page renders', (await p.locator('text=offside').count()) === 1);
  });

  await step('mobile drawer', async () => {
    const mctx = await b.newContext({ ...devices['iPhone 14'] });
    await routeEspn(mctx);
    const m = await mctx.newPage();
    m.on('pageerror', (e) => errs.push('mobile ' + e.message));
    await m.goto(BASE + '/competitions/', { waitUntil: 'networkidle' });
    await m.click('button[aria-label="Open menu"]');
    await m.waitForTimeout(500);
    await m.locator('aside.fixed nav a', { hasText: 'Streamer studio' }).click();
    await m.waitForURL(/studio/, { timeout: 8000 });
    await m.waitForTimeout(500);
    ok('mobile drawer navigates + closes', (await m.locator('button[aria-label="Close menu"]').count()) === 0);
  });

  ok('no runtime errors', errs.length === 0, errs.slice(0, 4).join(' | '));
  console.log(results.join('\n'));
  await b.close();
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
