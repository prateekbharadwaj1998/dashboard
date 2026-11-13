import "server-only";
import { notFound } from "next/navigation";
import { LEAGUES, LEAGUE_BY_ID, SEASONS, isLeagueId } from "./data/leagues";
import { getAllLeagues } from "./data/repo";
import { teamBySlug } from "./data/teams";
import type { LeagueId, SeasonId } from "./data/types";

export const leagueParams = () => LEAGUES.map((l) => ({ id: l.id }));

export function resolveLeague(id: string): LeagueId {
  if (!isLeagueId(id)) notFound();
  return id;
}

export function resolveSeason(s: string): SeasonId {
  if (!(SEASONS as string[]).includes(s)) notFound();
  return s as SeasonId;
}

export async function teamParams(seasons: SeasonId[]) {
  const all = await Promise.all(seasons.map((s) => getAllLeagues(s)));
  return [...new Set(all.flat().flatMap((l) => l.teams))].map((slug) => ({ slug }));
}

export const leagueTitle = (id: string, suffix = "") => (isLeagueId(id) ? `${LEAGUE_BY_ID[id].name}${suffix}` : "League");
export const teamTitle = (slug: string) => teamBySlug(slug)?.short ?? "Team";
