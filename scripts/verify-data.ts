// Sanity checks for the data layer against the real snapshot. Run: npm run verify
import { getAllLeagues } from "../src/lib/data/repo";
import { computeTable, positionRace, leagueTotals, htFtTable } from "../src/lib/derive";
import { teamBySlug } from "../src/lib/data/teams";

for (const season of ["2025-26", "2026-27"] as const) {
  const all = await getAllLeagues(season);
  for (const ls of all) {
    const unknown = ls.teams.filter((t) => !teamBySlug(t));
    const table = computeTable(ls.league, ls.matches, ls.teams);
    const t = leagueTotals(ls.matches);
    const race = positionRace(ls.league, ls.matches, ls.teams);
    const top = table.slice(0, 3).map((r) => `${teamBySlug(r.team)?.short} ${r.pts}`).join(", ");
    const statuses = ls.matches.reduce<Record<string, number>>((a, m) => ((a[m.status] = (a[m.status] ?? 0) + 1), a), {});
    console.log(`${season} ${ls.league.padEnd(10)} teams=${ls.teams.length} ${JSON.stringify(statuses)} md=${race.rounds.length} gpg=${t.gpg.toFixed(2)} src=${ls.meta.sources.join("+")} | ${top}`);
    if (unknown.length) throw new Error(`unknown teams: ${unknown}`);
    if (ls.teams.length !== table.length) throw new Error("table size");
    const cb = htFtTable(ls.matches, ls.teams).reduce((s, r) => s + r.comebacks, 0);
    if (cb !== t.comebacks) throw new Error(`comeback mismatch ${cb} vs ${t.comebacks}`);
  }
}
console.log("data layer OK");

// ESPN display names → our registry (ESPN is unreachable from CI, so test the resolver directly).
import { resolveEspnTeam } from "../src/lib/data/espn";
const all26 = await getAllLeagues("2026-27");
const pool = (lg: string) => all26.find((l) => l.league === lg)!.teams.map((s) => teamBySlug(s)!);
const cases: [string, string, string][] = [
  ["epl", "Manchester City", "man-city"], ["epl", "Manchester United", "man-united"], ["epl", "Tottenham Hotspur", "tottenham"],
  ["epl", "Brighton & Hove Albion", "brighton"], ["epl", "Nottingham Forest", "nott-m-forest"], ["epl", "AFC Bournemouth", "bournemouth"],
  ["epl", "Ipswich Town", "ipswich"], ["epl", "Coventry City", "coventry"], ["epl", "Newcastle United", "newcastle"],
  ["laliga", "Atlético Madrid", "atletico"], ["laliga", "Real Madrid", "real-madrid"], ["laliga", "Athletic Club", "athletic"],
  ["laliga", "Real Betis", "real-betis"], ["laliga", "Celta Vigo", "celta"], ["laliga", "Rayo Vallecano", "rayo"],
  ["bundesliga", "Bayern Munich", "bayern"], ["bundesliga", "Borussia Mönchengladbach", "m-gladbach"], ["bundesliga", "Bayer Leverkusen", "leverkusen"],
  ["bundesliga", "Eintracht Frankfurt", "frankfurt"], ["bundesliga", "VfB Stuttgart", "stuttgart"], ["bundesliga", "Werder Bremen", "werder"],
  ["seriea", "Internazionale", "inter"], ["seriea", "AC Milan", "milan"], ["seriea", "AS Roma", "roma"], ["seriea", "Napoli", "napoli"],
  ["ligue1", "Paris Saint-Germain", "psg"], ["ligue1", "Marseille", "marseille"], ["ligue1", "Lyon", "lyon"], ["ligue1", "AS Monaco", "monaco"],
];
let bad = 0;
for (const [lg, name, want] of cases) {
  const got = resolveEspnTeam(name, pool(lg))?.slug;
  if (got !== want) { bad++; console.log(`  ✗ ${lg} "${name}" → ${got} (want ${want})`); }
}
if (bad) throw new Error(`${bad} ESPN name resolutions failed`);
console.log(`ESPN resolver OK (${cases.length} cases)`);
