import { Suspense } from "react";
import { LEAGUE_BY_ID } from "@/lib/data/leagues";
import type { LeagueSeason } from "@/lib/data/repo";
import { leagueTotals, lastPlayedMatchday } from "@/lib/derive";
import { LeagueMark } from "@/components/shell/LeagueMark";
import { Stat } from "@/components/ui/Stat";
import { OutcomeBar } from "@/components/charts/OutcomeBar";
import { DataBadge } from "@/components/ui/DataBadge";
import { LeagueTabs } from "./LeagueTabs";

export function LeagueHeader({ ls }: { ls: LeagueSeason }) {
  const cfg = LEAGUE_BY_ID[ls.league];
  const t = leagueTotals(ls.matches);
  const md = lastPlayedMatchday(ls.matches);
  const totalMd = (cfg.teams - 1) * 2;
  return (
    <div className="mb-6">
      <div className="hero-glow relative -mx-4 overflow-hidden rounded-none px-4 pt-2 pb-6 md:-mx-8 md:rounded-2xl md:px-8" style={{ ["--team-glow" as string]: `color-mix(in oklab, ${cfg.color} 14%, transparent)` }}>
        <div className="noise absolute inset-0" />
        <div className="relative flex flex-wrap items-start justify-between gap-4 pt-4">
          <div className="flex items-center gap-4">
            <LeagueMark id={ls.league} size={44} />
            <div>
              <h1 className="display text-gradient text-[28px] leading-9 md:text-[32px] md:leading-10">{cfg.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-fg-3">
                <span>{cfg.country}</span>
                <span className="text-fg-4">·</span>
                <span>Season {ls.season.replace("-", "/")}</span>
                <span className="text-fg-4">·</span>
                <span className="tnum">
                  Matchday {md} <span className="text-fg-4">of {totalMd}</span>
                </span>
              </div>
            </div>
          </div>
          <DataBadge meta={ls.meta} />
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Matches played" value={t.played} hint={`${Math.round((t.played / Math.max(1, ls.matches.length)) * 100)}% of season`} />
          <Stat label="Goals" value={t.goals} />
          <Stat label="Goals per game" value={t.gpg} decimals={2} />
          <Stat label="Both teams scored" value={t.btts * 100} suffix="%" />
          <Stat label="Over 2.5 goals" value={t.over25 * 100} suffix="%" />
          <Stat label="HT → FT comebacks" value={t.comebacks} hint={`${t.htSample} matches with HT data`} />
        </div>
        <div className="relative mt-6 max-w-xl">
          <OutcomeBar
            parts={[
              { label: "Home win", value: t.homeWin, color: "var(--s1)" },
              { label: "Draw", value: t.draw, color: "var(--text-quaternary)" },
              { label: "Away win", value: t.awayWin, color: "var(--s2)" },
            ]}
          />
        </div>
      </div>
      <Suspense>
        <LeagueTabs league={ls.league} />
      </Suspense>
    </div>
  );
}
