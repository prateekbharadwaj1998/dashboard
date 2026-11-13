import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { LEAGUE_BY_ID, isLeagueId, parseSeason } from "@/lib/data/leagues";
import { getLeagueSeason } from "@/lib/data/repo";
import { lastPlayedMatchday } from "@/lib/derive";
import { LeagueHeader } from "@/components/league/LeagueHeader";
import { FixturesBrowser } from "@/components/league/FixturesBrowser";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ season?: string; md?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: isLeagueId(id) ? `${LEAGUE_BY_ID[id].name} fixtures` : "Fixtures" };
}

export default async function FixturesPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isLeagueId(id)) notFound();
  const sp = await searchParams;
  const season = parseSeason(sp.season);
  const tz = (await cookies()).get("tz")?.value;
  const ls = await getLeagueSeason(id, season);
  const totalMd = Math.max(...ls.matches.map((m) => m.matchday));
  const current = Math.min(totalMd, Math.max(1, lastPlayedMatchday(ls.matches) + (season === "2025-26" ? 0 : 1)));
  return (
    <>
      <LeagueHeader ls={ls} />
      <FixturesBrowser matches={ls.matches} total={totalMd} initial={current} tz={tz} logos={ls.logos} />
    </>
  );
}
