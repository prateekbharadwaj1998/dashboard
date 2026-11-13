"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { SEASONS } from "@/lib/data/leagues";
import { teamBySlug } from "@/lib/data/teams";
import type { Match, SeasonId } from "@/lib/data/types";
import { computeTable, headToHead, isPlayed, positionRace, teamSeason } from "@/lib/derive";
import { useLeagueData } from "@/lib/clientData";
import { Panel } from "@/components/ui/Panel";
import { Crest } from "@/components/ui/Crest";
import { FormStrip } from "@/components/ui/FormPill";
import { TeamPicker } from "@/components/ui/TeamPicker";
import { MirrorBars, PositionLine } from "@/components/charts/TeamCharts";
import { OutcomeBar } from "@/components/charts/OutcomeBar";
import { MatchRow } from "@/components/match/MatchRow";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export function CompareView({ season }: { season: SeasonId }) {
  const sp = useSearchParams();
  const { data, error } = useLeagueData([...SEASONS]);

  const view = useMemo(() => {
    if (!data) return null;
    const leagues = data.filter((l) => l.season === season);
    const teams = leagues
      .flatMap((ls) => ls.teams.map((slug) => ({ slug, league: ls.league })))
      .sort((x, y) => (teamBySlug(x.slug)?.short ?? "").localeCompare(teamBySlug(y.slug)?.short ?? ""));
    const epl = leagues[0];
    const top = computeTable(epl.league, epl.matches, epl.teams);
    const a = teams.find((t) => t.slug === sp.get("a"))?.slug ?? top[0].team;
    const b = teams.find((t) => t.slug === sp.get("b") && t.slug !== a)?.slug ?? (top[0].team === a ? top[1].team : top[0].team);
    const side = (slug: string) => {
      const ls = leagues.find((l) => l.teams.includes(slug))!;
      const row = computeTable(ls.league, ls.matches, ls.teams).find((r) => r.team === slug)!;
      const ts = teamSeason(ls.league, ls.matches, ls.teams, slug);
      const race = positionRace(ls.league, ls.matches, ls.teams);
      return { ls, row, ts, race, positions: race.series.find((s) => s.team === slug)!.positions };
    };
    const everything: Match[] = data.flatMap((l) => l.matches);
    return { teams, a, b, A: side(a), B: side(b), h2h: headToHead(everything, a, b) };
  }, [data, season, sp]);

  if (error) return <Panel className="py-10 text-center text-sm text-fg-3">Couldn&apos;t load data ({error}).</Panel>;
  if (!view) return <PageSkeleton />;

  const { teams, a, b, A, B, h2h } = view;
  const pg = (v: number, p: number) => (p ? v / p : 0);
  const sameLeague = A.ls.league === B.ls.league;
  const rounds = A.race.rounds.length <= B.race.rounds.length ? A.race.rounds : B.race.rounds;
  const n = rounds.length;
  const ta = teamBySlug(a)!;
  const tb = teamBySlug(b)!;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-[26px] leading-8">Compare</h1>
        <p className="mt-0.5 text-sm text-fg-3">Side-by-side season profile · {season.replace("-", "/")}</p>
      </div>
      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <TeamPicker param="a" value={a} teams={teams} accent="var(--s1)" />
        <span className="text-center text-xs font-medium text-fg-4">VS</span>
        <TeamPicker param="b" value={b} teams={teams} accent="var(--s2)" />
      </div>

      <Panel>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
          {[A, B].map((S, i) => (
            <div key={i} className={`flex items-center gap-4 ${i ? "order-3 flex-row-reverse text-right" : ""}`}>
              <Crest slug={S.row.team} size={56} logo={S.ls.logos[S.row.team]} />
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">{teamBySlug(S.row.team)?.short}</div>
                <div className="tnum text-sm text-fg-3">
                  #{S.row.pos} · {S.row.pts} pts · {S.row.p} GP
                </div>
                <div className={`mt-2 flex ${i ? "justify-end" : ""}`}>
                  <FormStrip form={S.row.form} size={18} />
                </div>
              </div>
            </div>
          ))}
          <div className="order-2 text-center">
            <div className="text-2xs text-fg-4">Head to head</div>
            <div className="display tnum flex items-center justify-center gap-2 text-[28px]">
              <span>{h2h.aWins}</span>
              <span className="text-fg-4">·</span>
              <span className="text-fg-2">{h2h.draws}</span>
              <span className="text-fg-4">·</span>
              <span>{h2h.bWins}</span>
            </div>
            <div className="text-2xs text-fg-4">wins · draws · wins</div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Season profile" subtitle="Per-game rates — the bolder bar leads">
          <MirrorBars
            colorA="var(--s1)"
            colorB="var(--s2)"
            rows={[
              { label: "Points per game", a: pg(A.row.pts, A.row.p), b: pg(B.row.pts, B.row.p), fmt: "dec2" },
              { label: "Goals scored / game", a: pg(A.row.gf, A.row.p), b: pg(B.row.gf, B.row.p), fmt: "dec2" },
              { label: "Goals conceded / game", a: pg(A.row.ga, A.row.p), b: pg(B.row.ga, B.row.p), fmt: "dec2", lowerIsBetter: true },
              { label: "Win rate", a: pg(A.row.w, A.row.p), b: pg(B.row.w, B.row.p), fmt: "pct" },
              { label: "Clean sheet rate", a: pg(A.ts.cleanSheets, A.row.p), b: pg(B.ts.cleanSheets, B.row.p), fmt: "pct" },
              { label: "Home PPG", a: pg(A.ts.home.pts, A.ts.home.p), b: pg(B.ts.home.pts, B.ts.home.p), fmt: "dec2" },
              { label: "Away PPG", a: pg(A.ts.away.pts, A.ts.away.p), b: pg(B.ts.away.pts, B.ts.away.p), fmt: "dec2" },
            ]}
          />
        </Panel>
        <Panel title="League position" subtitle={sameLeague ? "After every matchday" : "Each within its own league — positions aren't directly comparable"}>
          {n > 1 ? (
            <PositionLine
              key={`${a}-${b}`}
              rounds={rounds}
              positions={A.positions.slice(0, n)}
              teams={Math.max(A.ls.teams.length, B.ls.teams.length)}
              color="var(--s1)"
              height={260}
              compare={{ positions: B.positions.slice(0, n), color: "var(--s2)", label: tb.short, mainLabel: ta.short }}
            />
          ) : (
            <p className="py-10 text-center text-sm text-fg-3">Not enough matchdays yet.</p>
          )}
        </Panel>
      </div>

      <Panel
        title="Meetings"
        subtitle={h2h.list.length ? `${h2h.list.length} league meetings · ${h2h.aGoals}–${h2h.bGoals} on aggregate` : "These teams haven't met in the available seasons"}
        pad={false}
      >
        {h2h.list.length > 0 && (
          <div className="px-4 pb-2">
            <OutcomeBar
              parts={[
                { label: `${ta.short} wins`, value: h2h.aWins, color: "var(--s1)" },
                { label: "Draws", value: h2h.draws, color: "var(--text-quaternary)" },
                { label: `${tb.short} wins`, value: h2h.bWins, color: "var(--s2)" },
              ]}
            />
          </div>
        )}
        <div className="px-2 pb-2">
          {h2h.list.filter(isPlayed).map((m, i) => (
            <MatchRow key={m.id} m={m} index={i} showDate />
          ))}
        </div>
      </Panel>
    </div>
  );
}
