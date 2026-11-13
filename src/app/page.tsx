import { Suspense } from "react";
import Link from "next/link";
import { getAllLeagues } from "@/lib/data/repo";
import { CURRENT_SEASON, LEAGUES } from "@/lib/data/leagues";
import { computeTable, leagueTotals } from "@/lib/derive";
import { teamBySlug } from "@/lib/data/teams";
import { Panel } from "@/components/ui/Panel";
import { Crest } from "@/components/ui/Crest";
import { LeagueMark } from "@/components/shell/LeagueMark";
import { LeaguePulse } from "@/components/matches/LeaguePulse";
import { MatchesView } from "@/views/MatchesView";

export default async function MatchesPage() {
  const current = await getAllLeagues(CURRENT_SEASON);
  const logos: Record<string, string> = Object.assign({}, ...current.map((l) => l.logos));
  const leaders = current.map((ls) => ({ league: ls.league, rows: computeTable(ls.league, ls.matches, ls.teams).slice(0, 3) }));
  const pulse = current.map((ls) => ({ league: ls.league, gpg: leagueTotals(ls.matches).gpg }));

  const rail = (
    <>
      <Panel title="Leaders" subtitle={`Season ${CURRENT_SEASON.replace("-", "/")}`} delay={0.1} pad={false}>
        <div className="space-y-1 px-2 pb-2">
          {leaders.map(({ league, rows }) => (
            <div key={league}>
              <Link href={`/league/${league}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-fg-3 hover:text-fg">
                <LeagueMark id={league} size={14} />
                {LEAGUES.find((l) => l.id === league)?.name}
              </Link>
              {rows.map((r) => (
                <Link key={r.team} href={`/team/${r.team}`} className="flex h-7 items-center gap-2 rounded-md px-2 text-sm hover:bg-hover">
                  <span className="tnum w-3 text-2xs text-fg-4">{r.pos}</span>
                  <Crest slug={r.team} size={16} logo={logos[r.team]} />
                  <span className="flex-1 truncate text-fg-2">{teamBySlug(r.team)?.short}</span>
                  <span className="tnum text-xs text-fg-3">{r.p} GP</span>
                  <span className="tnum w-6 text-right font-semibold">{r.pts}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Goals per game" subtitle="By league, this season" delay={0.15}>
        <LeaguePulse rows={pulse} />
      </Panel>
    </>
  );

  return (
    <Suspense>
      <MatchesView rail={rail} />
    </Suspense>
  );
}
