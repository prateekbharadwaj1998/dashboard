"use client";
import Link from "next/link";
import clsx from "clsx";
import { LayoutGroup, motion } from "motion/react";
import { useMemo, useState } from "react";
import { computeTable, type Venue } from "@/lib/derive";
import { LEAGUE_BY_ID, ZONE_LABEL } from "@/lib/data/leagues";
import type { LeagueId, Match, Zone } from "@/lib/data/types";
import { teamBySlug } from "@/lib/data/teams";
import { Crest } from "@/components/ui/Crest";
import { FormStrip } from "@/components/ui/FormPill";
import { FollowButton, useFavorites } from "@/components/ui/Favorites";
import { Segmented } from "@/components/ui/Segmented";
import { useSeasonHref } from "@/lib/useSeasonHref";

type Filter = Venue | "form";

const ZONE_COLOR: Record<Zone, string> = {
  ucl: "var(--accent)",
  uel: "var(--s2)",
  uecl: "var(--s3)",
  playoff: "var(--draw)",
  rel: "var(--loss)",
};

export function StandingsTable({
  league,
  matches,
  teams,
  logos,
  compact = false,
  highlight,
}: {
  league: LeagueId;
  matches: Match[];
  teams: string[];
  logos?: Record<string, string>;
  compact?: boolean;
  highlight?: string[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const { following } = useFavorites();
  const href = useSeasonHref();
  const rows = useMemo(
    () =>
      computeTable(league, matches, teams, filter === "form" ? { lastN: 5 } : { venue: filter }),
    [league, matches, teams, filter],
  );
  const base = useMemo(() => computeTable(league, matches, teams), [league, matches, teams]);
  const basePos = new Map(base.map((r) => [r.team, r.pos]));
  const zones = LEAGUE_BY_ID[league].zones;

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex items-center justify-between gap-3 px-4">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "home", label: "Home" },
              { value: "away", label: "Away" },
              { value: "form", label: "Last 5" },
            ]}
          />
          <span className="hidden text-2xs text-fg-4 sm:block">Hover form for scores · rows re-rank live</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="h-8 border-b text-2xs font-medium text-fg-4">
              <th className="w-10 pl-4 text-left font-medium">#</th>
              <th className="text-left font-medium">Team</th>
              <th className="w-9 text-center font-medium">P</th>
              <th className="w-9 text-center font-medium">W</th>
              <th className="w-9 text-center font-medium">D</th>
              <th className="w-9 text-center font-medium">L</th>
              {!compact && <th className="w-16 text-center font-medium">Goals</th>}
              <th className="w-11 text-center font-medium">GD</th>
              <th className="w-11 text-center font-medium text-fg-3">Pts</th>
              {!compact && <th className="w-[132px] pr-4 text-left font-medium">Form</th>}
            </tr>
          </thead>
          <LayoutGroup>
            <tbody>
              {rows.map((r, i) => {
                const delta = filter !== "all" ? (basePos.get(r.team) ?? r.pos) - r.pos : 0;
                const followed = following.includes(r.team) || highlight?.includes(r.team);
                return (
                  <motion.tr
                    layout="position"
                    key={r.team}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      layout: { type: "spring", stiffness: 500, damping: 40 },
                      opacity: { duration: 0.3, delay: Math.min(i, 12) * 0.02 },
                    }}
                    className={clsx(
                      "group relative h-9 border-b border-line/60 transition-colors duration-100 last:border-0 hover:bg-hover",
                      followed && "bg-accent-soft/60",
                    )}
                  >
                    <td className="relative pl-4">
                      {r.zone && (
                        <span
                          className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full"
                          style={{ background: ZONE_COLOR[r.zone] }}
                          title={ZONE_LABEL[r.zone]}
                        />
                      )}
                      <span className="tnum inline-flex w-5 justify-center text-xs text-fg-3">{r.pos}</span>
                    </td>
                    <td className="min-w-0 py-0">
                      <Link href={href(`/team/${r.team}`)} className="flex min-w-0 items-center gap-2.5">
                        <Crest slug={r.team} size={18} logo={logos?.[r.team]} />
                        <span className="truncate text-fg">{teamBySlug(r.team)?.short}</span>
                        {delta !== 0 && (
                          <motion.span
                            key={`${filter}-${delta}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={clsx("tnum text-[10px] font-medium", delta > 0 ? "text-win" : "text-loss")}
                          >
                            {delta > 0 ? `▲${delta}` : `▼${-delta}`}
                          </motion.span>
                        )}
                        <span className="opacity-0 transition-opacity group-hover:opacity-100">
                          <FollowButton slug={r.team} size={12} />
                        </span>
                      </Link>
                    </td>
                    <td className="tnum text-center text-fg-2">{r.p}</td>
                    <td className="tnum text-center text-fg-2">{r.w}</td>
                    <td className="tnum text-center text-fg-2">{r.d}</td>
                    <td className="tnum text-center text-fg-2">{r.l}</td>
                    {!compact && (
                      <td className="tnum text-center text-fg-3">
                        {r.gf}:{r.ga}
                      </td>
                    )}
                    <td className={clsx("tnum text-center", r.gd > 0 ? "text-fg-2" : r.gd < 0 ? "text-fg-3" : "text-fg-3")}>
                      {r.gd > 0 ? `+${r.gd}` : r.gd}
                    </td>
                    <td className="tnum text-center font-semibold text-fg">{r.pts}</td>
                    {!compact && (
                      <td className="pr-4">
                        <FormStrip form={r.form} size={18} />
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </tbody>
          </LayoutGroup>
        </table>
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 pt-3 text-2xs text-fg-3">
          {zones.map((z) => (
            <span key={z.zone} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-[3px] rounded-full" style={{ background: ZONE_COLOR[z.zone] }} />
              {ZONE_LABEL[z.zone]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
