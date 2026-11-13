import type { LeagueId, SeasonId } from "@/lib/data/types";
import { getLeagueSeason } from "@/lib/data/repo";
import { lastPlayedMatchday } from "@/lib/derive";
import { LeagueHeader } from "@/components/league/LeagueHeader";
import { FixturesBrowser } from "@/components/league/FixturesBrowser";

export async function LeagueFixtures({ id, season }: { id: LeagueId; season: SeasonId }) {
  const ls = await getLeagueSeason(id, season);
  const totalMd = Math.max(...ls.matches.map((m) => m.matchday));
  const current = Math.min(totalMd, Math.max(1, lastPlayedMatchday(ls.matches) + (season === "2025-26" ? 0 : 1)));
  return (
    <>
      <LeagueHeader ls={ls} />
      <FixturesBrowser matches={ls.matches} total={totalMd} initial={current} logos={ls.logos} />
    </>
  );
}
