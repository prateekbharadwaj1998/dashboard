"use client";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { MatchCard } from "@/lib/espn/normalize";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { LocalTime } from "@/components/match/LocalTime";
import { ScoreRoll } from "./ScoreRoll";

export const espnMatchHref = (id: string) => `/match?id=${id}`;

function Minute({ m }: { m: MatchCard }) {
  if (m.state === "in") {
    const ht = m.status === "HT";
    const clock = (m.status || "").replace(/'$/, "");
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-live">
        <span className="live-dot" />
        <span className="tnum">
          {ht ? "HT" : clock}
          {!ht && <span className="blink-tick">&apos;</span>}
        </span>
      </span>
    );
  }
  if (m.state === "post") return <span className={clsx("text-xs font-medium", m.completed ? "text-fg-3" : "text-fg-4")}>{m.status || "FT"}</span>;
  if (/PP|Canc|Abd/.test(m.status)) return <span className="text-xs text-fg-4">{m.status}</span>;
  return (
    <span className="tnum text-xs text-fg-2">
      <LocalTime iso={m.date} opts={{ hour: "2-digit", minute: "2-digit", hour12: false }} />
    </span>
  );
}

const Card = ({ red }: { red: number }) =>
  red > 0 ? (
    <motion.span
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="inline-block h-[11px] w-2 shrink-0 rounded-[2px] bg-[#E5484D]"
      title={`${red} red card${red > 1 ? "s" : ""}`}
    />
  ) : null;

export function LiveMatchRow({ m, index = 0, flash, showLeague }: { m: MatchCard; index?: number; flash?: "home" | "away"; showLeague?: string }) {
  const live = m.state === "in";
  const done = m.state === "post";
  const hs = m.home.score;
  const as = m.away.score;
  const hw = done && hs != null && as != null && (hs > as || (m.home.shootout ?? 0) > (m.away.shootout ?? 0));
  const aw = done && hs != null && as != null && (as > hs || (m.away.shootout ?? 0) > (m.home.shootout ?? 0));
  const reds = (side: "home" | "away") => m.events.filter((e) => e.type === "red" && e.team === side).length;
  const scorers = (side: "home" | "away") =>
    m.events.filter((e) => (e.type === "goal" || e.type === "penalty" || e.type === "own-goal") && e.team === side);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 12) * 0.03 }}
      className="relative overflow-hidden rounded-lg"
    >
      <Link
        href={espnMatchHref(m.id)}
        className={clsx(
          "group relative grid min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-100 hover:bg-hover",
          "grid-cols-[44px_1fr_64px_1fr] sm:grid-cols-[56px_1fr_76px_1fr_minmax(0,140px)]",
          live && "live-row",
        )}
      >
        <span className="flex flex-col leading-tight">
          <Minute m={m} />
          {showLeague && <span className="truncate text-[10px] text-fg-4">{showLeague}</span>}
        </span>
        <span className={clsx("flex min-w-0 items-center justify-end gap-2 text-sm", aw ? "text-fg-3" : "text-fg", flash === "home" && "font-semibold")}>
          <Card red={reds("home")} />
          <span className="truncate">{m.home.short}</span>
          <TeamLogo src={m.home.logo} abbr={m.home.abbr} color={m.home.color} size={22} />
        </span>
        <span className="flex justify-center">
          {hs != null && as != null ? (
            <motion.span
              animate={flash ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={clsx(
                "relative inline-flex h-7 min-w-14 items-center justify-center gap-1 overflow-hidden rounded-md px-2 text-sm font-semibold",
                live ? "bg-[color-mix(in_oklab,var(--live)_14%,transparent)] text-live" : "bg-hover text-fg",
                flash && "ring-1 ring-win/40",
              )}
            >
              <span className={clsx(aw && "text-fg-3")}>
                <ScoreRoll value={hs} />
              </span>
              <span className="text-fg-4">–</span>
              <span className={clsx(hw && "text-fg-3")}>
                <ScoreRoll value={as} />
              </span>
              <AnimatePresence>
                {flash && (
                  <motion.span
                    key="flash"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 1.6 }}
                    className="absolute inset-0 bg-win/35"
                  />
                )}
              </AnimatePresence>
            </motion.span>
          ) : (
            <span className="text-xs text-fg-4">vs</span>
          )}
        </span>
        <span className={clsx("flex min-w-0 items-center gap-2 text-sm", hw ? "text-fg-3" : "text-fg", flash === "away" && "font-semibold")}>
          <TeamLogo src={m.away.logo} abbr={m.away.abbr} color={m.away.color} size={22} />
          <span className="truncate">{m.away.short}</span>
          <Card red={reds("away")} />
        </span>
        <span className="hidden min-w-0 flex-col items-end text-[10.5px] leading-[14px] text-fg-4 sm:flex">
          {(m.home.shootout != null || m.away.shootout != null) && (
            <span className="tnum">
              Pens {m.home.shootout ?? 0}–{m.away.shootout ?? 0}
            </span>
          )}
          {[...scorers("home").slice(0, 2), ...scorers("away").slice(0, 2)].length > 0 && (
            <span className="max-w-full truncate" title={m.events.filter((e) => e.type !== "yellow" && e.type !== "red").map((e) => `${e.player} ${e.minute}`).join(", ")}>
              ⚽ {[...scorers("home"), ...scorers("away")].slice(0, 2).map((e) => `${(e.player ?? "").split(" ").slice(-1)[0]} ${e.minute}`).join(", ")}
            </span>
          )}
          {m.note && <span className="max-w-full truncate">{m.note}</span>}
        </span>
      </Link>
      <AnimatePresence>{flash && <motion.span key="sweep" className="goal-sweep" exit={{ opacity: 0 }} />}</AnimatePresence>
      <AnimatePresence>
        {flash && (
          <motion.span
            key="goal-chip"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 rounded-[4px] bg-win px-1.5 text-[10px] font-bold tracking-wide text-black"
          >
            GOAL
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
