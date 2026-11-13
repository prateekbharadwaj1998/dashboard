import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { LEAGUE_BY_ID, isLeagueId, parseSeason } from "@/lib/data/leagues";
import { getLeagueSeason } from "@/lib/data/repo";
import { computeTable, isPlayed, positionRace } from "@/lib/derive";
import { LeagueHeader } from "@/components/league/LeagueHeader";
import { StandingsTable } from "@/components/league/StandingsTable";
import { RaceChart } from "@/components/charts/RaceChart";
import { Panel } from "@/components/ui/Panel";
import { MatchRow } from "@/components/match/MatchRow";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ season?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: isLeagueId(id) ? LEAGUE_BY_ID[id].name : "League" };
}

export default async function LeaguePage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isLeagueId(id)) notFound();
  const season = parseSeason((await searchParams).season);
  const tz = (await cookies()).get("tz")?.value;
  const ls = await getLeagueSeason(id, season);
  const played = ls.matches.filter(isPlayed);
  const table = computeTable(id, ls.matches, ls.teams);
  const race = positionRace(id, ls.matches, ls.teams);
  const recent = played.slice(-6).reverse();
  const upcoming = ls.matches.filter((m) => m.status === "scheduled" || m.status === "live" || m.status === "ht").slice(0, 6);

  return (
    <>
      <LeagueHeader ls={ls} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Standings" subtitle="Computed from every result — tie-breaks: points, goal difference, goals scored" pad={false} className="pb-3">
          <div className="pt-2">
            <StandingsTable league={id} matches={played} teams={ls.teams} logos={ls.logos} />
          </div>
        </Panel>
        <div className="flex flex-col gap-4">
          {upcoming.length > 0 && (
            <Panel title="Up next" delay={0.05} pad={false}>
              <div className="px-2 pb-2">
                {upcoming.map((m, i) => (
                  <MatchRow key={m.id} m={m} tz={tz} index={i} logos={ls.logos} showDate compact />
                ))}
              </div>
            </Panel>
          )}
          <Panel title="Latest results" delay={0.1} pad={false}>
            <div className="px-2 pb-2">
              {recent.length ? (
                recent.map((m, i) => <MatchRow key={m.id} m={m} tz={tz} index={i} logos={ls.logos} showDate compact />)
              ) : (
                <p className="px-2 py-6 text-center text-sm text-fg-3">No results yet this season.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
      {race.rounds.length > 1 && (
        <Panel
          className="mt-4"
          delay={0.15}
          title="Season race"
          subtitle="League position after every matchday. Toggle to points to see the gaps open up."
        >
          <RaceChart
            rounds={race.rounds}
            series={race.series}
            initialSelected={table.slice(0, 4).map((r) => r.team)}
            zones={LEAGUE_BY_ID[id].zones}
          />
        </Panel>
      )}
    </>
  );
}
