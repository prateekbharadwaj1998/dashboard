// Builds src/data/competitions.json: every soccer competition ESPN covers
// (id → slug, name, logo). Scoreboard events only carry the numeric league id,
// so the app needs this map. Run: npm run catalog (also runs in CI before build).
import { writeFile, readFile } from "node:fs/promises";

const CORE = "https://sports.core.api.espn.com/v2/sports/soccer";
const OUT = new URL("../src/data/competitions.json", import.meta.url);

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url.replace(/^http:/, "https:"), { signal: AbortSignal.timeout(15000) });
      if (r.ok) return r.json();
    } catch {}
    await new Promise((res) => setTimeout(res, 500 * (i + 1)));
  }
  throw new Error(`failed ${url}`);
}

try {
  const list = await getJson(`${CORE}/leagues?limit=400`);
  const refs = list.items.map((i) => i.$ref);
  const out = [];
  for (let i = 0; i < refs.length; i += 16) {
    const batch = await Promise.all(
      refs.slice(i, i + 16).map((ref) =>
        getJson(ref).then(
          (l) => ({
            id: String(l.id),
            slug: l.slug,
            name: l.name,
            short: l.abbreviation || l.shortName || l.name,
            logo: l.logos?.[0]?.href,
            logoDark: l.logos?.find((x) => x.rel?.includes("dark"))?.href,
            tournament: !!l.isTournament,
          }),
          () => null,
        ),
      ),
    );
    out.push(...batch.filter((x) => x && x.slug));
  }
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  await writeFile(OUT, JSON.stringify(out, null, 0) + "\n");
  console.log(`catalog: ${out.length} competitions`);
} catch (e) {
  // Network trouble at build time must never break the build: keep the committed catalog.
  const existing = JSON.parse(await readFile(OUT, "utf8").catch(() => "[]"));
  console.warn(`catalog refresh failed (${e.message}); keeping ${existing.length} committed entries`);
}
