// Crawl test (run: npm run e2e). Bug-bash crawler: visits every exported page at desktop + mobile, records
// page errors, console errors, failed requests, horizontal overflow, and empty mains.
const { chromium, devices } = require('playwright');
const { routeEspn } = require('./espn-route.cjs');
const fs = require('fs'), path = require('path');
const BASE = process.env.E2E_BASE || 'http://localhost:3200/dashboard';
const root = process.env.E2E_ROOT || 'out';
function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (f !== '_next' && f !== 'data') walk(p, acc); }
    else if (f === 'index.html') acc.push('/' + path.relative(root, path.dirname(p)).replace(/\\/g, '/') + (path.dirname(p) === root ? '' : '/'));
  }
  return acc;
}
(async () => {
  let routes = walk(root).map(r => r.replace('//', '/'));
  const ids = JSON.parse(fs.readFileSync(path.join(root, 'data/2026-27/epl.json'))).matches;
  routes.push(`/match/?id=${ids[0].id}`, '/match/?id=401879244', '/match/?id=bogus-id', '/match/', '/compare/?a=psg&b=inter', '/compare/?a=nope', '/?date=2026-11-21', '/?date=garbage',
    '/competition/?lg=eng.1', '/competition/?lg=fifa.world', '/competition/?lg=ind.1', '/competition/?lg=bogus', '/team/?id=359&lg=eng.1', '/team/?id=464', '/player/?id=253989', '/studio/', '/overlay/?w=ticker', '/overlay/?w=table&lg=esp.1', '/glance/');
  const b = await chromium.launch();
  const issues = [];
  for (const [label, opts] of [['desk', { viewport: { width: 1440, height: 900 } }], ['mob', { ...devices['iPhone 14'] }], ['tablet', { viewport: { width: 820, height: 1100 } }]]) {
    const ctx = await b.newContext({ ...opts, timezoneId: 'America/Los_Angeles' });
    await routeEspn(ctx);
    const list = label !== 'desk' ? routes.filter((r, i) => i % 4 === 0 || !r.includes('/team/')) : [...routes];
    let n = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      const p = await ctx.newPage();
      let cur = '';
      p.on('pageerror', e => issues.push(`${label} ${cur} PAGEERROR ${e.message.slice(0, 160)}`));
      p.on('console', m => { if ((m.type() === 'error' && !/Failed to load resource/.test(m.text())) || (m.type() === 'warning' && /hydrat|key/i.test(m.text()))) issues.push(`${label} ${cur} CONSOLE ${m.text().slice(0, 160)}`); });
      p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(new URL(BASE).origin) && !r.url().includes('bogus')) issues.push(`${label} ${cur} HTTP ${r.status()} ${r.url().replace(BASE, '')}`); });
      while (list.length) {
        cur = list.shift(); n++;
        try {
          await p.goto(BASE + cur, { waitUntil: 'networkidle', timeout: 20000 });
          await p.waitForTimeout(600);
          const r = await p.evaluate(() => ({
            over: document.documentElement.scrollWidth - window.innerWidth,
            sr: (() => { const el = document.getElementById('scroll-root'); return el ? el.scrollWidth - el.clientWidth : 0; })(),
            main: (document.querySelector('main')?.innerText || document.body.innerText || '').trim().length,
            busy: !!document.querySelector('[aria-busy]'),
            nan: /\bNaN\b|undefined|Infinity/.test(document.querySelector('main')?.innerText || ''),
            title: document.title,
          }));
          if ((r.over > 1 || r.sr > 1) && !/overlay/.test(cur)) issues.push(`${label} ${cur} OVERFLOW doc=${r.over} scroll=${r.sr}`);
          if (r.main < 40 && !/overlay|glance/.test(cur)) issues.push(`${label} ${cur} EMPTY main (${r.main} chars)`);
          if (r.busy) issues.push(`${label} ${cur} STILL LOADING after networkidle`);
          if (r.nan) issues.push(`${label} ${cur} NaN/undefined text visible`);
        } catch (e) { issues.push(`${label} ${cur} NAV ${e.message.slice(0, 100)}`); }
      }
      await p.close();
    }));
    console.log(label, 'visited', n);
    await ctx.close();
  }
  await b.close();
  const uniq = [...new Set(issues)];
  console.log('ISSUES', uniq.length);
  uniq.slice(0, 80).forEach(i => console.log(i));
  process.exit(uniq.length ? 1 : 0);
})();
