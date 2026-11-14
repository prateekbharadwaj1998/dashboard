// Test helper: serve ESPN/ESPN-CDN requests from Node (which reaches them through
// the sandbox proxy) so headless Chromium can render live data during local tests.
module.exports.routeEspn = async function routeEspn(ctx) {
  if (!process.env.E2E_ROUTE_ESPN) return;
  await ctx.route(/https:\/\/([a-z.]*espn\.com|a\.espncdn\.com)\//, async (route) => {
    try {
      const r = await fetch(route.request().url(), { signal: AbortSignal.timeout(20000) });
      const body = Buffer.from(await r.arrayBuffer());
      await route.fulfill({ status: r.status, body, headers: { 'content-type': r.headers.get('content-type') || 'application/json', 'access-control-allow-origin': '*' } });
    } catch (e) { await route.abort(); }
  });
};
