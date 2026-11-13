"use client";
import Link from "next/link";
import { motion } from "motion/react";
import type { Match } from "@/lib/data/types";
import { teamBySlug } from "@/lib/data/teams";
import { Crest } from "@/components/ui/Crest";
import { CountUp } from "@/components/ui/CountUp";

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

export function ScoreHero({ match: m, logos }: { match: Match; logos: Record<string, string> }) {
  const live = m.status === "live" || m.status === "ht";
  const hasScore = !!m.ft && (m.status === "ft" || live);
  const comeback =
    m.status === "ft" && m.ht && m.ft && ((m.ht[0] < m.ht[1] && m.ft[0] > m.ft[1]) || (m.ht[1] < m.ht[0] && m.ft[1] > m.ft[0]));
  const side = (slug: string, align: "left" | "right") => (
    <Link href={`/team/${slug}`} className="group flex min-w-0 flex-1 flex-col items-center gap-3">
      <motion.div
        initial={{ opacity: 0, x: align === "left" ? -24 : 24, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={spring}
        className="transition-transform duration-300 group-hover:-translate-y-0.5"
      >
        <Crest slug={slug} size={76} logo={logos[slug]} />
      </motion.div>
      <span className="truncate text-center text-base font-medium md:text-lg">{teamBySlug(slug)?.short}</span>
    </Link>
  );
  return (
    <div className="relative mx-auto mt-8 flex max-w-2xl items-start justify-between gap-4">
      {side(m.home, "left")}
      <div className="flex shrink-0 flex-col items-center pt-3">
        {hasScore ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }} className="display tnum flex items-center gap-3 text-[56px] leading-[60px] md:text-[64px]">
            <CountUp value={m.ft![0]} duration={0.6} />
            <span className="text-fg-4">–</span>
            <CountUp value={m.ft![1]} duration={0.6} />
          </motion.div>
        ) : (
          <div className="display pt-3 text-[28px] text-fg-3">vs</div>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs">
          {live ? (
            <span className="flex items-center gap-1.5 font-medium text-live">
              <span className="live-dot" /> {m.status === "ht" ? "Half-time" : m.clock ?? "Live"}
            </span>
          ) : m.status === "ft" ? (
            <span className="font-medium text-fg-3">Full-time</span>
          ) : m.status === "pending" ? (
            <span className="text-fg-4">Result not yet in feed</span>
          ) : m.status === "postponed" ? (
            <span className="text-fg-4">Postponed</span>
          ) : (
            <span className="text-fg-3">Upcoming</span>
          )}
        </div>
        {m.ht && m.status === "ft" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-3 flex items-center gap-2 text-xs">
            <span className="tnum rounded-md bg-hover px-2 py-0.5 text-fg-3">HT {m.ht[0]}–{m.ht[1]}</span>
            <span className="text-fg-4">→</span>
            <span className="tnum rounded-md bg-hover px-2 py-0.5 text-fg-2">FT {m.ft![0]}–{m.ft![1]}</span>
          </motion.div>
        )}
        {comeback && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.8 }}
            className="mt-2 rounded-[4px] bg-accent-soft px-2 py-0.5 text-2xs font-medium text-accent-text"
          >
            Comeback win
          </motion.span>
        )}
      </div>
      {side(m.away, "right")}
    </div>
  );
}
