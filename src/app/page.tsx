import { cookies } from "next/headers";
import Link from "next/link";
import { getAllLeagues } from "@/lib/data/repo";
import { CURRENT_SEASON, LEAGUES } from "@/lib/data/leagues";
import { addDays, dayKey, isDayKey, isValidTz } from "@/lib/data/time";
import { computeTable, isPlayed, leagueTotals } from "@/lib/derive";
import { teamBySlug } from "@/lib/data/teams";
import type { Match } from "@/lib/data/types";
import { DateStrip, type DayCell } from "@/components/matches/DateStrip";
import { MatchesBoard, type LeagueGroup } from "@/components/matches/MatchesBoard";
import { Panel } from "@/components/ui/Panel";
import { Crest } from "@/components/ui/Crest";
import { LeagueMark } from "@/components/shell/LeagueMark";
import { LeaguePulse } from "@/components/matches/LeaguePulse";
import { MatchRow } from "@/components/match/MatchRow";

type Props = { searchParams: Promise<{ date?: string }> };

const fmtDay = (day: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

export default async function MatchesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const cookieTz = (await cookies()).get("tz")?.value;
  const tz = isValidTz(cookieTz) ? cookieTz : "Europe/London";
  const today = dayKey(Date.now(), tz);
  const selected = isDayKey(sp.date) ? sp.date : today;

  const [current, previous] = await Promise.all([getAllLeagues(CURRENT_SEASON), getAllLeagues("2025-26")]);
  const logos = Object.assign({}, ...current.map((l) => l.logos));
  const all: Match[] = [...previous, ...current].flatMap((l) => l.matches);

  const byDay = new Map<string, Match[]>();
  for (const m of all) {
    const k = dayKey(m.kickoff, tz);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(m);
  }

  const days: DayCell[] = Array.from({ length: 21 }, (_, i) => {
    const day = addDays(selected, i - 10);
    const ms = byDay.get(day) ?? [];
    return { day, count: ms.length, live: ms.filter((m) => m.status === "live" || m.status === "ht").length };
  });

  const dayMatches = byDay.get(selected) ?? [];
  const groups: LeagueGroup[] = LEAGUES.map((l) => ({
    league: l.id,
    matches: dayMatches.filter((m) => m.league === l.id).sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
  })).filter((g) => g.matches.length);
  const hasLive = dayMatches.some((m) => m.status === "live" || m.status === "ht");

  const sortedDays = [...byDay.keys()].sort();
  const nextDay = sortedDays.find((d) => d > selected);

  // Most recent day (on or before selected) with results — for the "In numbers" rail.
  const resultDay = [...sortedDays].reverse().find((d) => d <= selected && (byDay.get(d) ?? []).some(isPlayed));
  const resultMatches = (resultDay ? byDay.get(resultDay)! : []).filter(isPlayed);
  const dayTotals = leagueTotals(resultMatches);
  const topScoring = resultMatches.slice().sort((a, b) => b.ft[0] + b.ft[1] - (a.ft[0] + a.ft[1]))[0];
  const comeback = resultMatches.find(
    (m) => m.ht && ((m.ht[0] < m.ht[1] && m.ft[0] > m.ft[1]) || (m.ht[1] < m.ht[0] && m.ft[1] > m.ft[0])),
  );

  const leaders = current.map((ls) => ({ league: ls.league, rows: computeTable(ls.league, ls.matches, ls.teams).slice(0, 3) }));
  const pulse = current.map((ls) => ({ league: ls.league, gpg: leagueTotals(ls.matches).gpg }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="display text-[26px] leading-8">Matches</h1>
            <p className="mt-0.5 text-sm text-fg-3">
              {fmtDay(selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              <span className="text-fg-4"> · times in {tz.replace("_", " ")}</span>
            </p>
          </div>
          <div className="hidden items-center gap-1 text-2xs text-fg-4 sm:flex">
            <kbd>←</kbd>
            <kbd>→</kbd> days · <kbd>T</kbd> today
          </div>
        </div>
        <DateStrip days={days} selected={selected} today={today} />
        <MatchesBoard
          groups={groups}
          tz={tz}
          logos={logos}
          hasLive={hasLive}
          nextDay={nextDay}
          nextDayLabel={nextDay ? fmtDay(nextDay, { weekday: "short", day: "numeric", month: "short" }) : undefined}
        />
      </div>

      <aside className="space-y-4">
        {resultDay && (
          <Panel title="In numbers" subtitle={fmtDay(resultDay, { weekday: "long", day: "numeric", month: "short" })} delay={0.05}>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-2xs text-fg-3">Matches</div>
                <div className="tnum text-xl font-semibold">{dayTotals.played}</div>
              </div>
              <div>
                <div className="text-2xs text-fg-3">Goals</div>
                <div className="tnum text-xl font-semibold">{dayTotals.goals}</div>
              </div>
              <div>
                <div className="text-2xs text-fg-3">Per game</div>
                <div className="tnum text-xl font-semibold">{dayTotals.gpg.toFixed(1)}</div>
              </div>
            </div>
            {topScoring && (
              <div className="mt-4">
                <div className="mb-1 text-2xs font-medium text-fg-4">Highest scoring</div>
                <div className="-mx-2">
                  <MatchRow m={topScoring} tz={tz} logos={logos} compact />
                </div>
              </div>
            )}
            {comeback && (
              <div className="mt-2">
                <div className="mb-1 text-2xs font-medium text-fg-4">Comeback of the day</div>
                <div className="-mx-2">
                  <MatchRow m={comeback} tz={tz} logos={logos} compact />
                </div>
              </div>
            )}
          </Panel>
        )}

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
      </aside>
    </div>
  );
}
