import "server-only";
import { findTeamLeague } from "./data/repo";
import { SEASONS } from "./data/leagues";
import type { SeasonId } from "./data/types";

/** Resolve the league season for a team, falling back to another season if the team wasn't in the top flight. */
export async function teamLeagueSeason(slug: string, season: SeasonId) {
  const primary = await findTeamLeague(slug, season);
  if (primary) return { ls: primary, fellBack: false };
  for (const s of SEASONS) {
    if (s === season) continue;
    const alt = await findTeamLeague(slug, s);
    if (alt) return { ls: alt, fellBack: true };
  }
  return null;
}
