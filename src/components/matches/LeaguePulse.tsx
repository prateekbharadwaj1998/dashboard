"use client";
import Link from "next/link";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { LEAGUE_BY_ID } from "@/lib/data/leagues";
import type { LeagueId } from "@/lib/data/types";
import { LeagueMark } from "@/components/shell/LeagueMark";

/** Single-series ranked bars — one color, no legend; value at the bar tip. */
export function LeaguePulse({ rows }: { rows: { league: LeagueId; gpg: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const sorted = [...rows].sort((a, b) => b.gpg - a.gpg);
  const max = Math.max(...sorted.map((r) => r.gpg), 1);
  return (
    <div ref={ref} className="space-y-2.5">
      {sorted.map((r, i) => (
        <Link key={r.league} href={`/league/${r.league}/stats`} className="group grid grid-cols-[96px_1fr] items-center gap-3">
          <span className="flex items-center gap-2 truncate text-xs text-fg-2 group-hover:text-fg">
            <LeagueMark id={r.league} size={14} />
            {LEAGUE_BY_ID[r.league].name}
          </span>
          <span className="flex items-center gap-2">
            <motion.span
              className="h-2 rounded-r-[4px] rounded-l-[1px] bg-accent"
              initial={{ width: 0 }}
              animate={inView ? { width: `${(r.gpg / max) * 82}%` } : {}}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.06 }}
            />
            <span className="tnum text-xs font-medium text-fg">{r.gpg.toFixed(2)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
