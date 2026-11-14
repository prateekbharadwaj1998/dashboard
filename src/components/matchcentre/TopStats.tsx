"use client";
import { motion } from "motion/react";
import type { TeamStatPair } from "@/lib/espn/normalize";
import { onColor } from "./colors";

const ROWS: [string, string][] = [
  ["totalShots", "Total shots"],
  ["shotsOnTarget", "Shots on target"],
  ["wonCorners", "Corners"],
  ["foulsCommitted", "Fouls"],
  ["passPct", "Pass accuracy"],
];
const LOWER_BETTER = new Set(["foulsCommitted"]);

/** Possession pill + key rows; the leading value sits in a pill of its team colour. */
export function TopStats({ stats, colors, names }: { stats: TeamStatPair[]; colors: [string, string]; names: [string, string] }) {
  const by = new Map(stats.map((s) => [s.key, s]));
  const pos = by.get("possessionPct");
  const hp = pos ? Math.round(pos.home) : 50;
  const ap = pos ? Math.round(pos.away) : 50;
  const total = hp + ap || 100;
  return (
    <div>
      {pos && (
        <div className="mb-4">
          <div className="mb-1.5 text-center text-xs text-fg-3">Ball possession</div>
          <div className="flex h-7 gap-[2px] overflow-hidden rounded-full" aria-label={`Possession ${names[0]} ${hp}%, ${names[1]} ${ap}%`}>
            <motion.div
              className="flex items-center pl-3 text-[13px] font-semibold"
              style={{ background: colors[0], color: onColor(colors[0]), borderRadius: "999px 0 0 999px" }}
              initial={false}
              animate={{ width: `${(hp / total) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            >
              <span className="tnum">{hp}%</span>
            </motion.div>
            <motion.div
              className="flex flex-1 items-center justify-end pr-3 text-[13px] font-semibold"
              style={{ background: colors[1], color: onColor(colors[1]), borderRadius: "0 999px 999px 0" }}
            >
              <span className="tnum">{ap}%</span>
            </motion.div>
          </div>
        </div>
      )}
      <div className="space-y-1">
        {ROWS.map(([key, label]) => {
          const s = by.get(key);
          if (!s) return null;
          const lower = LOWER_BETTER.has(key);
          const hLead = lower ? s.home < s.away : s.home > s.away;
          const aLead = lower ? s.away < s.home : s.away > s.home;
          const cell = (v: string, lead: boolean, c: string, align: "left" | "right") => (
            <span className={`flex ${align === "right" ? "justify-end" : ""}`}>
              <span
                className="tnum inline-flex h-6 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors"
                style={lead ? { background: c, color: onColor(c) } : { color: "var(--text-secondary)" }}
              >
                {v}
              </span>
            </span>
          );
          return (
            <div key={key} className="grid h-9 grid-cols-[64px_1fr_64px] items-center">
              {cell(s.homeLabel, hLead, colors[0], "left")}
              <span className="text-center text-sm text-fg-2">{label}</span>
              {cell(s.awayLabel, aLead, colors[1], "right")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
