// Pulls real fixtures/results from openfootball into data/snapshot so the app
// always has real data to render, even when upstream APIs are unreachable.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SEASONS = ["2025-26", "2026-27"];
const LEAGUES = ["en.1", "es.1", "de.1", "it.1", "fr.1"];
const out = path.resolve("data/snapshot");
await mkdir(out, { recursive: true });

for (const season of SEASONS) {
  for (const code of LEAGUES) {
    const url = `https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${code}.json`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`skip ${season}/${code}: HTTP ${res.status}`);
      continue;
    }
    const json = await res.json();
    await writeFile(path.join(out, `${season}.${code}.json`), JSON.stringify(json));
    console.log(`ok ${season}/${code} — ${json.matches?.length ?? 0} matches`);
  }
}
