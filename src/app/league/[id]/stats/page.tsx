import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEAGUE_BY_ID, isLeagueId, parseSeason } from "@/lib/data/leagues";
import { getLeagueSeason } from "@/lib/data/repo";
import { biggestWins, computeTable, halvesTable, htFtTable, leagueTotals, scorelineGrid } from "@/lib/derive";
import { LeagueHeader } from "@/components/league/LeagueHeader";
import { Panel } from "@/components/ui/Panel";
import { ResultsMatrix } from "@/components/charts/ResultsMatrix";
import { ScorelineGrid } from "@/components/charts/ScorelineGrid";
import { DivergingHBars, StackedHBars } from "@/components/charts/HBars";
import { MatchRow } from "@/components/match/MatchRow";
import { cookies } from "next/headers";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ season?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: isLeagueId(id) ? `${LEAGUE_BY_ID[id].name} insights` : "Insights" };
}

export default async function StatsPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isLeagueId(id)) notFound();
  const season = parseSeason((await searchParams).season);
  const tz = (await cookies()).get("tz")?.value;
  const ls = await getLeagueSeason(id, season);
  const table = computeTable(id, ls.matches, ls.teams);
  const order = table.map((r) => r.team);
  const totals = leagueTotals(ls.matches);
  const halves = halvesTable(ls.matches, ls.teams).sort((a, b) => b.for1 + b.for2 - (a.for1 + a.for2));
  const htft = htFtTable(ls.matches, ls.teams).sort(
    (a, b) => b.pointsFromLosing - b.pointsDroppedFromWinning - (a.pointsFromLosing - a.pointsDroppedFromWinning),
  );
  const sg = scorelineGrid(ls.matches);
  const wins = biggestWins(ls.matches, 6);
  const h1 = totals.firstHalfGoals;
  const h2 = totals.secondHalfGoals;

  return (
    <>
      <LeagueHeader ls={ls} />
      <div className="grid gap-4">
        <Panel title="Results matrix" subtitle="Every fixture of the season, home side down the left, ordered by current table position">
          <ResultsMatrix teams={order} matches={ls.matches} />
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            delay={0.05}
            title="When teams score"
            subtitle={`Goals scored by half · league-wide ${h1 + h2 ? Math.round((h2 / (h1 + h2)) * 100) : 0}% arrive after the break`}
          >
            <StackedHBars
              rows={halves.map((r) => ({ team: r.team, values: [r.for1, r.for2] }))}
              keys={["1st half", "2nd half"]}
              colors={["var(--s1)", "var(--s3)"]}
            />
          </Panel>
          <Panel
            delay={0.1}
            title="Game state"
            subtitle="Points won from losing positions at half-time vs points dropped from winning ones"
          >
            <DivergingHBars
              rows={htft.map((r) => ({
                team: r.team,
                pos: r.pointsFromLosing,
                neg: r.pointsDroppedFromWinning,
                posNote: `${r.comebacks} comeback wins, ${r.rescued} rescued draws`,
                negNote: `${r.blownLead} leads not converted`,
              }))}
              posLabel="Points won from behind"
              negLabel="Points dropped from ahead"
            />
          </Panel>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel delay={0.05} title="Scoreline frequency" subtitle={`${totals.played} matches · darker = more common`}>
            <ScorelineGrid grid={sg.grid} max={sg.max} cap={sg.cap} total={totals.played} />
          </Panel>
          <Panel delay={0.1} title="Biggest wins" subtitle="Largest margins, then most goals" pad={false}>
            <div className="px-2 pb-2">
              {wins.map((m, i) => (
                <MatchRow key={m.id} m={m} tz={tz} index={i} logos={ls.logos} showDate />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
