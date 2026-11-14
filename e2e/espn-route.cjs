// Test helper: serve third-party data requests (ESPN, ESPN CDN, Wikipedia,
// Wikimedia) from Node instead of the browser. Needed where the headless browser
// cannot reach them directly: sandboxes behind a proxy, and CI, where ESPN's
// edge refuses headless Chromium from datacenter IPs. Enable with E2E_ROUTE_ESPN=1.
const HOSTS = /https:\/\/([a-z.]*espn\.com|a\.espncdn\.com|en\.wikipedia\.org|[a-z]+\.wikimedia\.org)\//;
const UA = 'HalfspaceE2E/0.1 (football dashboard automated tests)';

module.exports.routeEspn = async function routeEspn(ctx) {
  if (!process.env.E2E_ROUTE_ESPN) return;
  await ctx.route(HOSTS, async (route) => {
    try {
      const r = await fetch(route.request().url(), { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
      const body = Buffer.from(await r.arrayBuffer());
      const headers = { 'content-type': r.headers.get('content-type') || 'application/json', 'access-control-allow-origin': '*' };
      const ra = r.headers.get('retry-after');
      if (ra) headers['retry-after'] = ra;
      await route.fulfill({ status: r.status, body, headers });
    } catch {
      await route.abort();
    }
  });
};
