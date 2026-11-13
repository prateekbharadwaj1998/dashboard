"use client";
import Link from "next/link";
import clsx from "clsx";
import { motion } from "motion/react";
import type { Match } from "@/lib/data/types";
import { teamBySlug } from "@/lib/data/teams";
import { Crest } from "@/components/ui/Crest";
import { LocalTime } from "./LocalTime";
import { matchHref } from "@/lib/paths";

function Status({ m, tz }: { m: Match; tz?: string }) {
  if (m.status === "live" || m.status === "ht")
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-live">
        <span className="live-dot" />
        <span className="tnum">{m.status === "ht" ? "HT" : m.clock ?? "Live"}</span>
      </span>
    );
  if (m.status === "ft") return <span className="text-xs font-medium text-fg-3">FT</span>;
  if (m.status === "postponed") return <span className="text-xs text-fg-4">PP</span>;
  return (
    <span className="tnum text-xs text-fg-2">
      <LocalTime iso={m.kickoff} tz={tz} opts={{ hour: "2-digit", minute: "2-digit", hour12: false }} />
    </span>
  );
}

export function MatchRow({
  m,
  tz,
  index = 0,
  logos,
  showDate = false,
  highlight,
  compact = false,
}: {
  m: Match;
  tz?: string;
  index?: number;
  logos?: Record<string, string>;
  showDate?: boolean;
  highlight?: string;
  compact?: boolean;
}) {
  const h = teamBySlug(m.home);
  const a = teamBySlug(m.away);
  const done = m.status === "ft" || m.status === "live" || m.status === "ht";
  const hw = done && m.ft && m.ft[0] > m.ft[1];
  const aw = done && m.ft && m.ft[1] > m.ft[0];
  const comeback =
    m.status === "ft" && m.ht && m.ft && ((m.ht[0] < m.ht[1] && m.ft[0] > m.ft[1]) || (m.ht[1] < m.ht[0] && m.ft[1] > m.ft[0]));
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 12) * 0.03 }}
    >
      <Link
        href={matchHref(m.id)}
        title={m.ht && m.status === "ft" ? `Half-time ${m.ht[0]}–${m.ht[1]}` : undefined}
        className={clsx(
          "group grid h-11 items-center gap-2 rounded-lg px-2 transition-colors duration-100 hover:bg-hover",
          compact ? "grid-cols-[44px_1fr_56px_1fr]" : "grid-cols-[40px_1fr_60px_1fr] sm:grid-cols-[64px_1fr_72px_1fr_72px]",
        )}
      >
        <span className="flex flex-col leading-tight">
          <Status m={m} tz={tz} />
          {showDate && (
            <span className="text-2xs text-fg-4">
              <LocalTime iso={m.kickoff} tz={tz} opts={{ day: "numeric", month: "short" }} />
            </span>
          )}
        </span>
        <span className={clsx("flex min-w-0 items-center justify-end gap-2 text-sm", aw ? "text-fg-3" : "text-fg", highlight === m.home && "font-semibold")}>
          <span className="truncate">{h?.short ?? m.home}</span>
          <Crest slug={m.home} size={20} logo={logos?.[m.home]} />
        </span>
        <span className="flex justify-center">
          {done && m.ft ? (
            <span
              className={clsx(
                "tnum inline-flex h-7 min-w-14 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold",
                m.status === "ft" ? "bg-hover text-fg" : "bg-[color-mix(in_oklab,var(--live)_14%,transparent)] text-live",
              )}
            >
              <span className={clsx(aw && "text-fg-3")}>{m.ft[0]}</span>
              <span className="text-fg-4">–</span>
              <span className={clsx(hw && "text-fg-3")}>{m.ft[1]}</span>
            </span>
          ) : m.status === "pending" ? (
            <span className="text-2xs text-fg-4" title="Kick-off has passed; no result in the available feeds yet">
              awaiting
            </span>
          ) : (
            <span className="text-xs text-fg-4">vs</span>
          )}
        </span>
        <span className={clsx("flex min-w-0 items-center gap-2 text-sm", hw ? "text-fg-3" : "text-fg", highlight === m.away && "font-semibold")}>
          <Crest slug={m.away} size={20} logo={logos?.[m.away]} />
          <span className="truncate">{a?.short ?? m.away}</span>
        </span>
        <span className={clsx("items-center justify-end gap-1.5", compact ? "hidden" : "hidden sm:flex")}>
          {comeback && (
            <span className="hidden whitespace-nowrap rounded-[4px] bg-accent-soft px-1.5 text-[10px] font-medium text-accent-text xl:inline" title="Trailed at half-time, won at full-time">
              Comeback
            </span>
          )}
          {m.ht && m.status === "ft" && <span className="tnum whitespace-nowrap text-2xs text-fg-4">HT {m.ht[0]}–{m.ht[1]}</span>}
        </span>
      </Link>
    </motion.div>
  );
}
