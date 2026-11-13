import "server-only";
import type { LeagueConfig } from "./leagues";
import type { Match, MatchStatus, Score } from "./types";
import { slugify, type TeamIdentity } from "./teams";

// ESPN's public site API. Unofficial and best-effort: every call has a strict
// timeout, every field is validated, and any failure simply means "no overlay".

interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: { displayName?: string; shortDisplayName?: string; name?: string; logo?: string; id?: string };
  linescores?: { value?: number }[];
}
interface EspnEvent {
  id?: string;
  date?: string;
  status?: {
    displayClock?: string;
    type?: { state?: string; completed?: boolean; name?: string; shortDetail?: string };
  };
  competitions?: { competitors?: EspnCompetitor[] }[];
}

export interface EspnMatch {
  espnId: string;
  kickoff: string;
  homeName: string;
  awayName: string;
  status: MatchStatus;
  clock?: string;
  ft?: Score;
  ht?: Score;
  logos: Record<string, string>;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

export async function fetchEspnRange(
  league: LeagueConfig,
  from: Date,
  to: Date,
  revalidate: number,
): Promise<EspnMatch[] | null> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnCode}/scoreboard?dates=${ymd(from)}-${ymd(to)}&limit=1000`;
  try {
    const res = await fetch(url, {
      next: { revalidate, tags: [`espn:${league.id}`] },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { events?: EspnEvent[] };
    if (!Array.isArray(json?.events)) return null;
    return json.events.map(parseEvent).filter((x): x is EspnMatch => x !== null);
  } catch {
    return null;
  }
}

function parseEvent(e: EspnEvent): EspnMatch | null {
  const comps = e.competitions?.[0]?.competitors;
  const home = comps?.find((c) => c.homeAway === "home");
  const away = comps?.find((c) => c.homeAway === "away");
  if (!e.id || !e.date || !home?.team?.displayName || !away?.team?.displayName) return null;

  const state = e.status?.type?.state;
  const name = e.status?.type?.name ?? "";
  let status: MatchStatus = "scheduled";
  if (/POSTPONED|CANCELED|SUSPENDED/i.test(name)) status = "postponed";
  else if (state === "post") status = "ft";
  else if (state === "in") status = /HALFTIME/i.test(name) ? "ht" : "live";

  const num = (s?: string) => (s != null && s !== "" && Number.isFinite(+s) ? +s : undefined);
  const hs = num(home.score);
  const as = num(away.score);
  const score: Score | undefined = hs != null && as != null ? [hs, as] : undefined;
  const h1 = home.linescores?.[0]?.value;
  const a1 = away.linescores?.[0]?.value;
  const ht: Score | undefined =
    Number.isFinite(h1) && Number.isFinite(a1) ? [h1 as number, a1 as number] : undefined;

  const logos: Record<string, string> = {};
  if (home.team.logo) logos.home = home.team.logo;
  if (away.team.logo) logos.away = away.team.logo;

  return {
    espnId: e.id,
    kickoff: new Date(e.date).toISOString(),
    homeName: home.team.displayName,
    awayName: away.team.displayName,
    status,
    clock: status === "live" ? e.status?.type?.shortDetail ?? e.status?.displayClock : undefined,
    ft: status === "scheduled" || status === "postponed" ? undefined : score,
    ht,
    logos,
  };
}

// --- Team-name resolution between providers --------------------------------

const ALIASES: Record<string, string> = {
  "bayern-munich": "bayern",
  "inter-milan": "inter",
  internazionale: "inter",
  "atletico-madrid": "atletico",
  "paris-saint-germain": "psg",
  "manchester-united": "man-united",
  "manchester-city": "man-city",
  "wolverhampton-wanderers": "wolves",
  "nottingham-forest": "nott-m-forest",
  "brighton-and-hove-albion": "brighton",
  "borussia-monchengladbach": "m-gladbach",
  "ac-milan": "milan",
  "as-roma": "roma",
  "1-fc-koln": "koln",
  "fc-cologne": "koln",
  "tsg-hoffenheim": "hoffenheim",
  "sport-club-freiburg": "freiburg",
  "deportivo-la-coruna": "deportivo",
  "racing-santander": "racing",
  "celta-vigo": "celta",
  "stade-rennais": "rennes",
  "paris-fc": "paris-fc",
};

const STOP = new Set(["fc", "afc", "cf", "sc", "ac", "as", "ss", "ssc", "us", "rc", "rcd", "ca", "ud", "de", "club", "calcio", "1", "04", "05", "07", "29"]);
const tokens = (s: string) => new Set(slugify(s).split("-").filter((t) => t && !STOP.has(t) && !/^\d{4}$/.test(t)));

/** Map an ESPN display name onto one of the league's known teams. */
export function resolveEspnTeam(name: string, candidates: TeamIdentity[]): TeamIdentity | undefined {
  const s = slugify(name);
  const alias = ALIASES[s];
  const direct = candidates.find((t) => t.slug === (alias ?? s));
  if (direct) return direct;
  const want = tokens(name);
  let best: TeamIdentity | undefined;
  let bestScore = 0;
  for (const t of candidates) {
    const have = new Set([...tokens(t.name), ...tokens(t.short)]);
    let hit = 0;
    for (const w of want) if (have.has(w)) hit++;
    const score = hit / Math.max(1, want.size);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return bestScore >= 0.5 ? best : undefined;
}
