"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { LEAGUE_BY_ID, SEASONS, isLeagueId } from "@/lib/data/leagues";
import { teamBySlug } from "@/lib/data/teams";
import type { LeagueId } from "@/lib/data/types";
import { computeTable, headToHead, isPlayed, perspective } from "@/lib/derive";
import { useLeagueData } from "@/lib/clientData";
import { IS_STATIC, seasonHref } from "@/lib/paths";
import { Crest } from "@/components/ui/Crest";
import { Panel } from "@/components/ui/Panel";
import { FormStrip } from "@/components/ui/FormPill";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { MirrorBars } from "@/components/charts/TeamCharts";
import { OutcomeBar } from "@/components/charts/OutcomeBar";
import { MatchRow } from "@/components/match/MatchRow";
import { LocalTime } from "@/components/match/LocalTime";
import { ScoreHero } from "@/components/match/ScoreHero";
import { LeagueMark } from "@/components/shell/LeagueMark";

function NotFoundPanel() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="display text-gradient text-[48px] leading-none">No match</div>
      <p className="mt-3 text-sm text-fg-3">We couldn&apos;t find that fixture.</p>
      <Link href="/" className="mt-6 inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover">
        Back to matches
      </Link>
    </div>
  );
}

export function MatchView() {
  const id = useSearchParams().get("id") ?? "";
  const league = id.split("-")[0];
  const valid = isLeagueId(league);
  const live = useLeagueData([...SEASONS], valid ? [league as LeagueId] : [], IS_STATIC ? undefined : 30_000);
  const data = valid ? live.data : [];

  const view = useMemo(() => {
    if (!data) return null;
    const ls = data.find((l) => l.matches.some((m) => m.id === id));
    if (!ls) return undefined;
    const m = ls.matches.find((x) => x.id === id)!;
    const before = ls.matches.filter((x) => isPlayed(x) && x.kickoff < m.kickoff);
    const tBefore = computeTable(m.league, before, ls.teams);
    const tAfter = isPlayed(m) ? computeTable(m.league, [...before, m], ls.teams) : null;
    const h2h = headToHead(data.flatMap((l) => l.matches).filter((x) => x.id !== m.id), m.home, m.away);
    return { ls, m, before, tBefore, tAfter, h2h };
  }, [data, id]);

  useEffect(() => {
    if (view) document.title = `${teamBySlug(view.m.home)?.short} vs ${teamBySlug(view.m.away)?.short} · Halfspace`;
  }, [view]);

  if (live.error) return <Panel className="py-10 text-center text-sm text-fg-3">Couldn&apos;t load data ({live.error}).</Panel>;
  if (view === null) return <PageSkeleton />;
  if (!view) return <NotFoundPanel />;

  const { ls, m, before, tBefore, tAfter, h2h } = view;
  const cfg = LEAGUE_BY_ID[m.league];
  const home = teamBySlug(m.home)!;
  const away = teamBySlug(m.away)!;
  const pos = (t: typeof tBefore, s: string) => t.find((r) => r.team === s)!;
  const formOf = (slug: string) =>
    before.filter((x) => x.home === slug || x.away === slug).filter(isPlayed).slice(-5).map((x) => perspective(x, slug));
  const rowH = pos(tBefore, m.home);
  const rowA = pos(tBefore, m.away);
  const pg = (v: number, p: number) => (p ? v / p : 0);

  return (
    <>
      <div
        className="hero-glow relative -mx-4 mb-6 overflow-hidden px-4 pt-6 pb-8 md:-mx-8 md:rounded-2xl md:px-8"
        style={{ ["--team-glow" as string]: `color-mix(in oklab, ${home.color} 20%, transparent)`, ["--glow-x" as string]: "18%" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(40% 60% at 82% 0%, color-mix(in oklab, ${away.color} 18%, transparent), transparent 70%)` }}
        />
        <div className="noise absolute inset-0" />
        <div className="relative flex flex-wrap items-center justify-center gap-2 text-xs text-fg-3">
          <Link href={seasonHref(`/league/${m.league}`, m.season)} className="inline-flex items-center gap-1.5 hover:text-fg">
            <LeagueMark id={m.league} size={14} /> {cfg.name}
          </Link>
          <span className="text-fg-4">·</span>
          <span>Matchday {m.matchday}</span>
          <span className="text-fg-4">·</span>
          <LocalTime iso={m.kickoff} opts={{ weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }} />
        </div>
        <ScoreHero match={m} logos={ls.logos} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Table impact" subtitle={tAfter ? "Position before → after this result" : "Current positions going into this fixture"}>
          <div className="space-y-2">
            {[m.home, m.away].map((s) => {
              const b = pos(tBefore, s);
              const a = tAfter ? pos(tAfter, s) : null;
              const delta = a ? b.pos - a.pos : 0;
              return (
                <Link key={s} href={seasonHref(`/team/${s}`, m.season)} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-hover">
                  <Crest slug={s} size={24} logo={ls.logos[s]} />
                  <span className="flex-1 text-sm font-medium">{teamBySlug(s)?.short}</span>
                  <span className="tnum text-sm text-fg-3">{b.p ? `#${b.pos}` : "—"}</span>
                  {a && (
                    <>
                      <span className="text-fg-4">→</span>
                      <span className="tnum text-sm font-semibold">#{a.pos}</span>
                      <span className={`tnum w-8 text-right text-xs font-medium ${delta > 0 ? "text-win" : delta < 0 ? "text-loss" : "text-fg-4"}`}>
                        {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : "–"}
                      </span>
                    </>
                  )}
                  <span className="tnum w-14 text-right text-xs text-fg-3">{a ? a.pts : b.pts} pts</span>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel title="Form going in" subtitle="Last five league results before kick-off">
          <div className="space-y-4">
            {[m.home, m.away].map((s) => {
              const f = formOf(s);
              return (
                <div key={s} className="flex items-center gap-3">
                  <Crest slug={s} size={22} logo={ls.logos[s]} />
                  <span className="w-28 truncate text-sm">{teamBySlug(s)?.short}</span>
                  {f.length ? <FormStrip form={f} size={22} /> : <span className="text-xs text-fg-4">First match of the season</span>}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Season averages" subtitle={`Before this match · ${home.short} left, ${away.short} right`}>
          <div className="mb-3 flex justify-between text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 text-fg-2"><span className="h-2 w-2 rounded-[2px] bg-[var(--s1)]" />{home.short}</span>
            <span className="inline-flex items-center gap-1.5 text-fg-2">{away.short}<span className="h-2 w-2 rounded-[2px] bg-[var(--s2)]" /></span>
          </div>
          {rowH.p + rowA.p > 0 ? (
            <MirrorBars
              colorA="var(--s1)"
              colorB="var(--s2)"
              rows={[
                { label: "Points per game", a: pg(rowH.pts, rowH.p), b: pg(rowA.pts, rowA.p), fmt: "dec2" },
                { label: "Goals scored / game", a: pg(rowH.gf, rowH.p), b: pg(rowA.gf, rowA.p), fmt: "dec2" },
                { label: "Goals conceded / game", a: pg(rowH.ga, rowH.p), b: pg(rowA.ga, rowA.p), fmt: "dec2", lowerIsBetter: true },
                { label: "Win rate", a: pg(rowH.w, rowH.p), b: pg(rowA.w, rowA.p), fmt: "pct" },
              ]}
            />
          ) : (
            <p className="py-6 text-center text-sm text-fg-3">Opening matchday — no averages yet.</p>
          )}
        </Panel>

        <Panel title="Head to head" subtitle={`${h2h.list.length} league meetings in our data`} pad={false}>
          <div className="px-4 pb-3">
            {h2h.list.length > 0 ? (
              <OutcomeBar
                parts={[
                  { label: `${home.short} wins`, value: h2h.aWins, color: "var(--s1)" },
                  { label: "Draws", value: h2h.draws, color: "var(--text-quaternary)" },
                  { label: `${away.short} wins`, value: h2h.bWins, color: "var(--s2)" },
                ]}
              />
            ) : (
              <p className="py-4 text-sm text-fg-3">No previous meetings in the available seasons.</p>
            )}
          </div>
          <div className="px-2 pb-2">
            {h2h.list.slice(0, 5).map((x, i) => (
              <MatchRow key={x.id} m={x} index={i} logos={ls.logos} showDate />
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
