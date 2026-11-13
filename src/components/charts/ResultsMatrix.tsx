"use client";
import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { teamBySlug } from "@/lib/data/teams";
import type { Match } from "@/lib/data/types";
import { ChartTooltip, useSize } from "./core";

/** Home × away grid of every result. Cell tint = home team's result; the score is printed in the cell. */
export function ResultsMatrix({ teams, matches }: { teams: string[]; matches: Match[] }) {
  const [wrapRef, { width }] = useSize<HTMLDivElement>();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const router = useRouter();
  const [hover, setHover] = useState<{ m?: Match; h: string; a: string; x: number; y: number } | null>(null);
  const byPair = new Map(matches.map((m) => [`${m.home}|${m.away}`, m]));
  const n = teams.length;
  const label = 40;
  const cell = Math.max(18, Math.min(52, Math.floor((width - label - 4) / n)));

  return (
    <div ref={wrapRef} className="relative">
      <div ref={ref} className="overflow-x-auto pb-1">
        <div className="relative" style={{ width: label + cell * n, paddingTop: label }}>
          {/* column headers */}
          <div className="absolute top-0 flex" style={{ left: label }}>
            {teams.map((t) => (
              <div key={t} className="flex items-end justify-center pb-1.5 text-[10px] font-medium text-fg-4" style={{ width: cell, height: label }}>
                <span className="[writing-mode:vertical-rl] rotate-180">{teamBySlug(t)?.abbr}</span>
              </div>
            ))}
          </div>
          {teams.map((h, r) => (
            <div key={h} className="flex items-center">
              <div className="truncate pr-2 text-right text-[10px] font-medium text-fg-4" style={{ width: label }}>
                {teamBySlug(h)?.abbr}
              </div>
              {teams.map((a, c) => {
                if (h === a)
                  return <div key={a} style={{ width: cell, height: cell }} className="p-px"><div className="h-full w-full rounded-[3px] bg-[repeating-linear-gradient(135deg,var(--border-subtle)_0_1px,transparent_1px_5px)]" /></div>;
                const m = byPair.get(`${h}|${a}`);
                const ft = m?.status === "ft" ? m.ft : undefined;
                const res = ft ? (ft[0] > ft[1] ? "win" : ft[0] < ft[1] ? "loss" : "draw") : null;
                return (
                  <div key={a} style={{ width: cell, height: cell }} className="p-px">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={inView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ type: "spring", stiffness: 400, damping: 28, delay: (r + c) * 0.012 }}
                      onPointerEnter={(e) => {
                        const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const wrap = wrapRef.current!.getBoundingClientRect();
                        setHover({ m, h, a, x: box.left - wrap.left + box.width / 2, y: box.top - wrap.top + box.height / 2 });
                      }}
                      onPointerLeave={() => setHover(null)}
                      onClick={() => m && router.push(`/match/${m.id}`)}
                      aria-label={`${teamBySlug(h)?.short} vs ${teamBySlug(a)?.short}${ft ? ` ${ft[0]}–${ft[1]}` : ""}`}
                      className="tnum flex h-full w-full items-center justify-center rounded-[4px] text-[10.5px] font-medium transition-[filter] hover:brightness-125 hover:ring-1 hover:ring-fg-3"
                      style={{
                        background: res ? `color-mix(in oklab, var(--${res}) ${res === "draw" ? 22 : 30}%, var(--bg-panel))` : "var(--bg-hover)",
                        color: res ? "var(--text-primary)" : "var(--text-quaternary)",
                      }}
                    >
                      {ft && cell >= 24 ? `${ft[0]}-${ft[1]}` : !ft && cell >= 24 ? "·" : ""}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <ChartTooltip visible={!!hover} x={hover?.x ?? 0} y={hover?.y ?? 0} width={width}>
        {hover && (
          <div>
            <div className="text-2xs text-fg-4">{hover.m?.status === "ft" ? `Matchday ${hover.m.matchday}` : hover.m ? "Not played yet" : "No fixture"}</div>
            <div className="mt-0.5 flex items-center gap-2 font-medium text-fg">
              {teamBySlug(hover.h)?.short}
              <span className="tnum text-fg">{hover.m?.ft && hover.m.status === "ft" ? `${hover.m.ft[0]}–${hover.m.ft[1]}` : "vs"}</span>
              {teamBySlug(hover.a)?.short}
            </div>
            {hover.m?.ht && hover.m.status === "ft" && <div className="tnum text-2xs text-fg-3">HT {hover.m.ht[0]}–{hover.m.ht[1]}</div>}
          </div>
        )}
      </ChartTooltip>
      <div className="mt-3 flex flex-wrap gap-3 text-2xs text-fg-3">
        {(["win", "draw", "loss"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: `color-mix(in oklab, var(--${k}) 45%, var(--bg-panel))` }} />
            Home {k}
          </span>
        ))}
        <span className="text-fg-4">Rows: home team · Columns: away team</span>
      </div>
    </div>
  );
}
