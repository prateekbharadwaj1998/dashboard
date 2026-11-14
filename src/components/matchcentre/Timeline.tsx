"use client";
import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import type { MatchEvent } from "@/lib/espn/normalize";
import { useSize, ChartTooltip } from "@/components/charts/core";

const ICON: Record<string, string> = { goal: "⚽", "own-goal": "⚽", penalty: "⚽", "penalty-miss": "✕", yellow: "", red: "", sub: "⇅", var: "VAR" };

function minuteNum(m: string) {
  const x = m.match(/(\d+)(?:'?\s*\+\s*(\d+))?/);
  return x ? Number(x[1]) + (x[2] ? Number(x[2]) * 0.15 : 0) : 0;
}

/** Horizontal 0–90+ match track: home events above, away below. */
export function Timeline({ events, minute, live, colors }: { events: MatchEvent[]; minute: number; live: boolean; colors: [string, string] }) {
  const [wrapRef, { width }] = useSize<HTMLDivElement>();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [hover, setHover] = useState<{ e: MatchEvent; x: number; y: number } | null>(null);
  const list = events.filter((e) => e.kind !== "period" && e.side);
  const end = Math.max(90, minute, ...list.map((e) => minuteNum(e.minute)));
  const H = 120;
  const pad = 14;
  const x = (m: number) => pad + (Math.min(m, end) / end) * Math.max(0, width - pad * 2);
  // stack overlapping icons outward
  const lanes: Record<string, number[]> = { home: [], away: [] };
  const placed = list.map((e) => {
    const px = x(minuteNum(e.minute));
    const used = lanes[e.side!];
    let lane = 0;
    while (used.some((u, i) => i % 1 === 0 && Math.abs(u - px) < 18 && Math.floor(i) === lane)) lane++;
    used.push(px);
    const level = Math.min(2, used.filter((u) => Math.abs(u - px) < 18).length - 1);
    return { e, px, level };
  });
  return (
    <div ref={wrapRef} className="relative">
      <div ref={ref} style={{ height: H }}>
        {width > 0 && (
          <svg width={width} height={H} className="overflow-visible">
            <line x1={pad} x2={width - pad} y1={H / 2} y2={H / 2} stroke="var(--border-strong)" strokeWidth={2} strokeLinecap="round" />
            {live && (
              <motion.line
                x1={pad}
                y1={H / 2}
                y2={H / 2}
                initial={{ x2: pad }}
                animate={{ x2: x(minute) }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                stroke="var(--live)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}
            <line x1={x(45)} x2={x(45)} y1={H / 2 - 6} y2={H / 2 + 6} stroke="var(--text-quaternary)" strokeDasharray="2 2" />
            {[0, 45, 90].map((m) => (
              <text key={m} x={x(m)} y={H / 2 + 18} fontSize={10} textAnchor="middle" fill="var(--text-quaternary)" className="tnum">
                {m === 45 ? "HT" : `${m}'`}
              </text>
            ))}
            {live && <circle cx={x(minute)} cy={H / 2} r={4} fill="var(--live)" className="animate-pulse" />}
            {placed.map(({ e, px, level }, i) => {
              const up = e.side === "home";
              const stem = 14 + level * 18;
              const cy = up ? H / 2 - stem : H / 2 + stem;
              const color = up ? colors[0] : colors[1];
              return (
                <motion.g
                  key={e.id}
                  initial={{ opacity: 0, y: up ? 6 : -6 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.1 + i * 0.03, type: "spring", stiffness: 400, damping: 28 }}
                  onPointerEnter={() => setHover({ e, x: px, y: cy })}
                  onPointerLeave={() => setHover(null)}
                  className="cursor-default"
                >
                  <line x1={px} x2={px} y1={H / 2} y2={cy} stroke="var(--border-strong)" />
                  {e.kind === "yellow" || e.kind === "red" ? (
                    <rect x={px - 4} y={cy - 6} width={8} height={11} rx={1.5} fill={e.kind === "red" ? "#E5484D" : "#F5C84C"} />
                  ) : (
                    <>
                      <circle cx={px} cy={cy} r={8} fill={/goal|penalty$/.test(e.kind) ? color : "var(--bg-elevated)"} stroke={/goal|penalty$/.test(e.kind) ? "rgb(255 255 255 / .35)" : "var(--border-strong)"} />
                      <text x={px} y={cy} dy="0.35em" textAnchor="middle" fontSize={e.kind === "var" ? 5 : 9} fill="var(--text-primary)">
                        {ICON[e.kind]}
                      </text>
                    </>
                  )}
                </motion.g>
              );
            })}
          </svg>
        )}
      </div>
      <ChartTooltip visible={!!hover} x={hover?.x ?? 0} y={hover?.y ?? 0} width={width}>
        {hover && (
          <div className="max-w-[220px]">
            <div className="tnum text-2xs text-fg-4">{hover.e.minute}</div>
            <div className="font-medium text-fg">{hover.e.player ?? hover.e.kind}</div>
            {hover.e.related && <div className="text-2xs text-fg-3">{hover.e.kind === "sub" ? `replaces ${hover.e.related}` : `assist ${hover.e.related}`}</div>}
          </div>
        )}
      </ChartTooltip>
    </div>
  );
}
