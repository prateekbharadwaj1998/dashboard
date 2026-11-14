// Match importance — decides what the home page shows first.
// S = competition tier + round + big teams + followed + live drama + timing.
import bigTeams from "@/data/bigTeams.json";
import { FEATURED, priorityOf } from "./competitions";
import type { MatchCard } from "./normalize";

const BIG_CLUBS = new Set<string>(bigTeams as string[]);

// Strongest national teams (by name, as ESPN displays them).
const BIG_NATIONS = new Set(
  [
    "Argentina", "France", "Spain", "England", "Brazil", "Portugal", "Netherlands", "Belgium", "Italy", "Germany", "Croatia", "Morocco",
    "Colombia", "Uruguay", "United States", "USA", "Mexico", "Japan", "Senegal", "Switzerland", "Denmark", "Austria", "South Korea", "Ecuador",
  ].map((n) => n.toLowerCase()),
);

const TIER1 = new Set(["eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "uefa.champions", "fifa.world", "uefa.euro", "conmebol.america"]);
const group = (key: string) => new Set(FEATURED.find((g) => g.key === key)?.slugs ?? []);
const TIER2 = new Set([...group("uefa"), ...[...group("intl")].filter((s) => s !== "fifa.friendly"), ...group("cups"), "conmebol.libertadores"]);

function tier(slug: string) {
  if (TIER1.has(slug)) return 40;
  if (TIER2.has(slug)) return 28;
  if (priorityOf(slug) < 1000) return 16;
  return 0;
}

function round(note?: string) {
  const n = (note ?? "").toLowerCase();
  if (/semi/.test(n)) return 22;
  if (/quarter/.test(n)) return 15;
  if (/\bfinal\b/.test(n)) return 30;
  if (/round of 16|last 16|play-?off|knockout/.test(n)) return 8;
  if (/(first|second|third|fourth|fifth|sixth|seventh|eighth|1st|2nd|3rd|[4-8]th) round|prelim|qualif/.test(n)) return -15;
  if (/leg 2|2nd leg/.test(n)) return 4;
  return 0;
}

export const isBig = (t: MatchCard["home"]) => BIG_CLUBS.has(t.id) || BIG_NATIONS.has(t.name.toLowerCase());

export function importance(m: MatchCard, followed: Set<string>, now = Date.now(), seenBig?: Set<string>): number {
  if (/PP|Canc|Abd|Postp|Cancel|Aband/i.test(m.status)) return -100;
  let s = tier(m.league) + round(m.note);
  const big = (t: MatchCard["home"]) => isBig(t) || !!seenBig?.has(t.id);
  const hb = big(m.home);
  const ab = big(m.away);
  s += (hb ? 12 : 0) + (ab ? 12 : 0) + (hb && ab ? 10 : 0);
  if (followed.has(m.home.id) || followed.has(m.away.id)) s += 60;
  const t = Date.parse(m.date);
  if (m.state === "in") {
    s += 25;
    const diff = Math.abs((m.home.score ?? 0) - (m.away.score ?? 0));
    if (diff <= 1) {
      s += 5;
      if ((parseInt(m.status, 10) || 0) >= 75) s += 5;
    }
  } else if (m.state === "pre") {
    if (t - now <= 3600_000) s += 12;
    else if (t - now <= 3 * 3600_000) s += 6;
  } else {
    const ended = t + 2 * 3600_000; // approx full time
    s += now - ended <= 2 * 3600_000 ? 6 : -10;
  }
  return s;
}

const stateRank = (m: MatchCard) => (m.state === "in" ? 0 : m.state === "pre" ? 1 : 2);

/** Sorted by importance, with stable tie-breaks. */
export function rankMatches(ms: MatchCard[], followed: Set<string>, now = Date.now()) {
  // Promoted clubs etc.: anyone seen today in a top-5 league counts as big.
  const seenBig = new Set<string>();
  for (const m of ms) if (["eng.1", "esp.1", "ger.1", "ita.1", "fra.1"].includes(m.league)) (seenBig.add(m.home.id), seenBig.add(m.away.id));
  return ms
    .map((m) => ({ m, s: importance(m, followed, now, seenBig) }))
    .filter((x) => x.s > -100)
    .sort(
      (a, b) =>
        b.s - a.s ||
        stateRank(a.m) - stateRank(b.m) ||
        (a.m.state === "post" ? b.m.date.localeCompare(a.m.date) : a.m.date.localeCompare(b.m.date)) ||
        priorityOf(a.m.league) - priorityOf(b.m.league) ||
        a.m.id.localeCompare(b.m.id),
    );
}
