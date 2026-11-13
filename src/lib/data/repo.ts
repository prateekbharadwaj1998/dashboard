import "server-only";
import { cache } from "react";
import { fetchEspnRange, resolveEspnTeam } from "./espn";
import { LEAGUES, LEAGUE_BY_ID, CURRENT_SEASON } from "./leagues";
import { fetchOpenFootball, matchId, normalizeOpenFootball } from "./openfootball";
import { teamBySlug, type TeamIdentity } from "./teams";
import type { DataMeta, LeagueId, Match, SeasonId } from "./types";

export interface LeagueSeason {
  league: LeagueId;
  season: SeasonId;
  matches: Match[];
  teams: string[]; // slugs
  logos: Record<string, string>;
  meta: DataMeta;
}

/**
 * The single source of truth for a league season:
 *   openfootball (full fixture list + HT/FT results) ← base layer
 *   ESPN scoreboard (live + recent finals + crests)   ← overlay, current season only
 *   bundled snapshot                                  ← fallback if openfootball is unreachable
 */
export const getLeagueSeason = cache(async (league: LeagueId, season: SeasonId): Promise<LeagueSeason> => {
  const cfg = LEAGUE_BY_ID[league];
  const of = await fetchOpenFootball(cfg, season);
  const matches = of ? normalizeOpenFootball(of.raw, cfg, season) : [];
  const sources = of ? [of.origin === "live" ? "openfootball" : "openfootball (snapshot)"] : [];
  const teams = [...new Set(matches.flatMap((m) => [m.home, m.away]))].sort();
  const logos: Record<string, string> = {};
  let liveOverlay = false;

  if (season === CURRENT_SEASON && matches.length) {
    const lastFt = matches.filter((m) => m.ft).map((m) => m.kickoff).sort().at(-1);
    const from = new Date(Date.parse(lastFt ?? matches[0].kickoff) - 86400_000);
    const to = new Date(Date.now() + 8 * 86400_000);
    const espn = await fetchEspnRange(cfg, from, to, 30);
    if (espn) {
      liveOverlay = true;
      sources.push("ESPN");
      const byId = new Map(matches.map((m) => [m.id, m]));
      const candidates = teams.map((s) => teamBySlug(s)).filter(Boolean) as TeamIdentity[];
      for (const e of espn) {
        const h = resolveEspnTeam(e.homeName, candidates);
        const a = resolveEspnTeam(e.awayName, candidates);
        if (!h || !a) continue;
        const m = byId.get(matchId(league, season, h.slug, a.slug));
        if (!m) continue;
        m.status = e.status;
        m.kickoff = e.kickoff;
        m.clock = e.clock;
        if (e.ft) m.ft = e.ft;
        if (e.ht) m.ht = e.ht;
        m.source = "espn";
        if (e.logos.home) logos[h.slug] = e.logos.home;
        if (e.logos.away) logos[a.slug] = e.logos.away;
      }
    }
  }

  matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.home.localeCompare(b.home));
  const lastResultAt = matches.filter((m) => m.status === "ft").at(-1)?.kickoff;
  return {
    league,
    season,
    matches,
    teams,
    logos,
    meta: { sources, fetchedAt: new Date().toISOString(), lastResultAt, liveOverlay },
  };
});

export const getAllLeagues = cache(async (season: SeasonId) =>
  Promise.all(LEAGUES.map((l) => getLeagueSeason(l.id, season))),
);

/** Find which league a team plays in for a season. */
export async function findTeamLeague(slug: string, season: SeasonId) {
  const all = await getAllLeagues(season);
  return all.find((ls) => ls.teams.includes(slug));
}

export async function findMatch(id: string) {
  const prefix = id.split("-")[0] as LeagueId;
  if (!(prefix in LEAGUE_BY_ID)) return undefined;
  const yy = id.split("-")[1];
  const season = (["2025-26", "2026-27"] as SeasonId[]).find((s) => s.replace("-", "").slice(2) === yy);
  if (!season) return undefined;
  const ls = await getLeagueSeason(prefix, season);
  const match = ls.matches.find((m) => m.id === id);
  return match ? { match, ls } : undefined;
}
