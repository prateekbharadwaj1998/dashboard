"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import type { TeamStatPair } from "@/lib/espn/normalize";

const LOWER_BETTER = new Set(["foulsCommitted", "offsides", "yellowCards", "redCards"]);

export function StatBars({ stats, colors, limit }: { stats: TeamStatPair[]; colors: [string, string]; limit?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const list = limit ? stats.slice(0, limit) : stats;
  if (!list.length) return <p className="py-6 text-center text-sm text-fg-4">No team stats for this match yet.</p>;
  return (
    <div ref={ref} className="space-y-3.5">
      {list.map((s, i) => {
        const total = s.home + s.away || 1;
        const lower = LOWER_BETTER.has(s.key);
        const hLead = lower ? s.home < s.away : s.home > s.away;
        const aLead = lower ? s.away < s.home : s.away > s.home;
        return (
          <div key={s.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className={`tnum ${hLead ? "font-semibold text-fg" : "text-fg-3"}`}>{s.homeLabel}</span>
              <span className="text-fg-3">{s.label}</span>
              <span className={`tnum ${aLead ? "font-semibold text-fg" : "text-fg-3"}`}>{s.awayLabel}</span>
            </div>
            <div className="flex h-1.5 gap-[3px]">
              <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-active">
                <motion.div
                  className="h-full rounded-l-full"
                  style={{ background: hLead ? colors[0] : "var(--text-quaternary)", transformOrigin: "right", width: `${(s.home / total) * 100}%` }}
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                />
              </div>
              <div className="flex flex-1 overflow-hidden rounded-r-full bg-active">
                <motion.div
                  className="h-full rounded-r-full"
                  style={{ background: aLead ? colors[1] : "var(--text-quaternary)", transformOrigin: "left", width: `${(s.away / total) * 100}%` }}
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
