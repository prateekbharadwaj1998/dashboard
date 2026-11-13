"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Star, ArrowRight } from "lucide-react";
import clsx from "clsx";
import type { LeagueId, Match } from "@/lib/data/types";
import { LEAGUE_BY_ID } from "@/lib/data/leagues";
import { MatchRow } from "@/components/match/MatchRow";
import { LeagueMark } from "@/components/shell/LeagueMark";
import { useFavorites } from "@/components/ui/Favorites";
import { Panel } from "@/components/ui/Panel";

export interface LeagueGroup {
  league: LeagueId;
  matches: Match[];
}

export function MatchesBoard({
  groups,
  logos,
  nextDay,
  nextDayLabel,
}: {
  groups: LeagueGroup[];
  logos: Record<string, string>;
  nextDay?: string;
  nextDayLabel?: string;
}) {
  const { following } = useFavorites();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const all = groups.flatMap((g) => g.matches);
  const pinned = all.filter((m) => following.includes(m.home) || following.includes(m.away));

  if (!all.length) {
    return (
      <Panel className="py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-hover text-fg-3 shadow-ring">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 5v14M3 9h3v6H3M21 9h-3v6h3" /></svg>
          </div>
          <h3 className="text-base font-medium text-fg">No top-flight matches this day</h3>
          <p className="mt-1 max-w-sm text-sm text-fg-3">Likely an international break or a rest day across Europe&apos;s top five leagues.</p>
          {nextDay && (
            <Link href={`/?date=${nextDay}`} scroll={false} className="group mt-5 inline-flex h-8 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/.2)] transition-colors hover:bg-accent-hover">
              Next matches · {nextDayLabel}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </Panel>
    );
  }

  const pending = all.filter((m) => m.status === "pending").length;

  return (
    <div className="space-y-3">
      {pending > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg bg-[color-mix(in_oklab,var(--draw)_9%,transparent)] px-3 py-2.5 text-xs text-fg-2 shadow-ring">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-draw" />
          <span>
            {pending} result{pending > 1 ? "s" : ""} from this day {pending > 1 ? "haven't" : "hasn't"} been published by the open-data feed yet. Deploy
            with outbound access to ESPN and the live overlay fills them in automatically.
          </span>
        </div>
      )}
      <AnimatePresence>
        {pinned.length > 0 && (
          <motion.div key="following" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Panel pad={false}>
              <div className="flex h-10 items-center gap-2 px-4 text-sm font-medium">
                <Star size={14} className="text-draw" fill="currentColor" /> Following
              </div>
              <div className="px-2 pb-2">
                {pinned.map((m, i) => (
                  <MatchRow key={m.id} m={m} index={i} logos={logos} />
                ))}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
      {groups.map((g, gi) => {
        const cfg = LEAGUE_BY_ID[g.league];
        const isCollapsed = collapsed[g.league];
        const live = g.matches.filter((m) => m.status === "live" || m.status === "ht").length;
        return (
          <Panel key={g.league} pad={false} delay={gi * 0.04}>
            <div className="flex h-11 items-center gap-2.5 px-4">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [g.league]: !c[g.league] }))}
                className="flex flex-1 items-center gap-2.5 text-left"
                aria-expanded={!isCollapsed}
              >
                <LeagueMark id={g.league} size={18} />
                <span className="text-sm font-medium text-fg">{cfg.name}</span>
                <span className="text-xs text-fg-4">{cfg.country}</span>
                {live > 0 && <span className="rounded-[4px] bg-[color-mix(in_oklab,var(--live)_15%,transparent)] px-1.5 text-[10px] font-semibold text-live">{live} LIVE</span>}
                <motion.span animate={{ rotate: isCollapsed ? -90 : 0 }} className="ml-1 text-fg-4">
                  <ChevronDown size={14} />
                </motion.span>
              </button>
              <Link href={`/league/${g.league}`} className="text-xs text-fg-3 hover:text-fg">
                Table
              </Link>
            </div>
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className={clsx("overflow-hidden")}
                >
                  <div className="px-2 pb-2">
                    {g.matches.map((m, i) => (
                      <MatchRow key={m.id} m={m} index={i} logos={logos} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        );
      })}
    </div>
  );
}
