"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LEAGUES, SEASONS } from "@/lib/data/leagues";
import { addDays, dayKey, isDayKey } from "@/lib/data/time";
import type { Match } from "@/lib/data/types";
import { isPlayed, leagueTotals } from "@/lib/derive";
import { useBrowserTz, useLeagueData } from "@/lib/clientData";
import { IS_STATIC } from "@/lib/paths";
import { DateStrip, type DayCell } from "@/components/matches/DateStrip";
import { MatchesBoard, type LeagueGroup } from "@/components/matches/MatchesBoard";
import { Panel } from "@/components/ui/Panel";
import { MatchRow } from "@/components/match/MatchRow";

const fmtDay = (day: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

function BoardSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Loading matches">
      <div className="skeleton h-[68px] rounded-xl" />
      <div className="panel space-y-2 p-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="skeleton h-9" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Matches by day. Rendered client-side so the day buckets follow the *viewer's* timezone,
 * and so it works unchanged as a static page (GitHub Pages) or on a Node server.
 */
export function MatchesView({ rail }: { rail: ReactNode }) {
  const sp = useSearchParams();
  const tz = useBrowserTz();
  // On a Node server the JSON is regenerated every ~30s, so poll while anything is live.
  const [poll, setPoll] = useState(false);
  const { data, error } = useLeagueData([...SEASONS], undefined, poll && !IS_STATIC ? 30_000 : undefined);
  const hasLiveData = !!data?.some((l) => l.matches.some((m) => m.status === "live" || m.status === "ht"));
  useEffect(() => setPoll(hasLiveData), [hasLiveData]);

  const view = useMemo(() => {
    if (!data || !tz) return null;
    const today = dayKey(Date.now(), tz);
    const q = sp.get("date") ?? undefined;
    const selected = isDayKey(q) ? q : today;
    const logos: Record<string, string> = Object.assign({}, ...data.map((l) => l.logos));
    const byDay = new Map<string, Match[]>();
    for (const m of data.flatMap((l) => l.matches)) {
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
    const sortedDays = [...byDay.keys()].sort();
    const nextDay = sortedDays.find((d) => d > selected);
    const resultDay = [...sortedDays].reverse().find((d) => d <= selected && (byDay.get(d) ?? []).some(isPlayed));
    const results = (resultDay ? byDay.get(resultDay)! : []).filter(isPlayed);
    const topScoring = results.slice().sort((a, b) => b.ft[0] + b.ft[1] - (a.ft[0] + a.ft[1]))[0];
    const comeback = results.find(
      (m) => m.ht && ((m.ht[0] < m.ht[1] && m.ft[0] > m.ft[1]) || (m.ht[1] < m.ht[0] && m.ft[1] > m.ft[0])),
    );
    return {
      today,
      selected,
      logos,
      days,
      groups,
      nextDay,
      hasLive: dayMatches.some((m) => m.status === "live" || m.status === "ht"),
      resultDay,
      totals: leagueTotals(results),
      topScoring,
      comeback,
    };
  }, [data, tz, sp]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="display text-[26px] leading-8">Matches</h1>
            <p className="mt-0.5 h-5 text-sm text-fg-3">
              {view && (
                <>
                  {fmtDay(view.selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  <span className="text-fg-4"> · times in {tz?.replace("_", " ")}</span>
                </>
              )}
            </p>
          </div>
          <div className="hidden items-center gap-1 text-2xs text-fg-4 sm:flex">
            <kbd>←</kbd>
            <kbd>→</kbd> days · <kbd>T</kbd> today
          </div>
        </div>
        {error ? (
          <Panel className="py-10 text-center text-sm text-fg-3">Couldn&apos;t load match data ({error}).</Panel>
        ) : !view ? (
          <BoardSkeleton />
        ) : (
          <>
            <DateStrip days={view.days} selected={view.selected} today={view.today} />
            <MatchesBoard
              groups={view.groups}
              logos={view.logos}
              nextDay={view.nextDay}
              nextDayLabel={view.nextDay ? fmtDay(view.nextDay, { weekday: "short", day: "numeric", month: "short" }) : undefined}
            />
          </>
        )}
      </div>

      <aside className="space-y-4">
        {view?.resultDay && (
          <Panel title="In numbers" subtitle={fmtDay(view.resultDay, { weekday: "long", day: "numeric", month: "short" })}>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-2xs text-fg-3">Matches</div>
                <div className="tnum text-xl font-semibold">{view.totals.played}</div>
              </div>
              <div>
                <div className="text-2xs text-fg-3">Goals</div>
                <div className="tnum text-xl font-semibold">{view.totals.goals}</div>
              </div>
              <div>
                <div className="text-2xs text-fg-3">Per game</div>
                <div className="tnum text-xl font-semibold">{view.totals.gpg.toFixed(1)}</div>
              </div>
            </div>
            {view.topScoring && (
              <div className="mt-4">
                <div className="mb-1 text-2xs font-medium text-fg-4">Highest scoring</div>
                <div className="-mx-2">
                  <MatchRow m={view.topScoring} logos={view.logos} compact />
                </div>
              </div>
            )}
            {view.comeback && (
              <div className="mt-2">
                <div className="mb-1 text-2xs font-medium text-fg-4">Comeback of the day</div>
                <div className="-mx-2">
                  <MatchRow m={view.comeback} logos={view.logos} compact />
                </div>
              </div>
            )}
          </Panel>
        )}
        {rail}
      </aside>
    </div>
  );
}
