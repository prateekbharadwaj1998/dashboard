"use client";
import { motion, useInView } from "motion/react";
import { useMemo, useRef } from "react";
import type { CommentaryItem, MatchEvent } from "@/lib/espn/normalize";
import { useSize } from "@/components/charts/core";

// Weight of each commentary action as attacking pressure for the acting side.
const W: [RegExp, number, boolean?][] = [
  [/^goal|penalty - scored/i, 5],
  [/shot on target|attempt saved|saved/i, 3],
  [/woodwork|post|bar/i, 2.5],
  [/shot off target|missed/i, 1.5],
  [/shot blocked|blocked/i, 1.5],
  [/corner/i, 1],
  [/penalty/i, 3],
  [/offside/i, 0.4],
  [/foul/i, 0.35, true], // the fouled side won a free kick
];

export function pulseSeries(items: CommentaryItem[], end: number) {
  const n = Math.max(1, Math.ceil(end)) + 1;
  const home = new Array(n).fill(0);
  const away = new Array(n).fill(0);
  for (const c of items) {
    if (!c.kind || !c.side || c.sec == null) continue;
    const rule = W.find(([re]) => re.test(c.kind!));
    if (!rule) continue;
    const side = rule[2] ? (c.side === "home" ? "away" : "home") : c.side;
    const m = Math.min(n - 1, Math.floor(c.sec / 60));
    (side === "home" ? home : away)[m] += rule[1];
  }
  // exponential decay smoothing so pressure carries for a few minutes
  const smooth = (arr: number[]) => {
    const out: number[] = [];
    let acc = 0;
    for (const v of arr) {
      acc = acc * 0.72 + v;
      out.push(acc);
    }
    return out;
  };
  return { home: smooth(home), away: smooth(away) };
}

/** Momentum ("Pulse") derived from live commentary — mirrored areas, home above. */
export function Pulse({ commentary, events, minute, colors, live }: { commentary: CommentaryItem[]; events: MatchEvent[]; minute: number; colors: [string, string]; live: boolean }) {
  const [wrapRef, { width }] = useSize<HTMLDivElement>();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const end = Math.max(live ? minute : 90, minute, 1);
  const { home, away } = useMemo(() => pulseSeries(commentary, end), [commentary, end]);
  const H = 140;
  const mid = H / 2;
  const pad = 14;
  const max = Math.max(4, ...home, ...away);
  const x = (i: number) => pad + (i / Math.max(1, home.length - 1)) * Math.max(0, width - pad * 2);
  const path = (arr: number[], dir: 1 | -1) => {
    if (!arr.length) return "";
    let d = `M ${x(0)} ${mid}`;
    arr.forEach((v, i) => (d += ` L ${x(i)} ${mid - dir * (v / max) * (mid - 8)}`));
    return `${d} L ${x(arr.length - 1)} ${mid} Z`;
  };
  const goals = events.filter((e) => /goal|penalty$/.test(e.kind));
  const empty = home.every((v) => v === 0) && away.every((v) => v === 0);
  return (
    <div ref={wrapRef}>
      <div ref={ref} className="relative" style={{ height: H }}>
        {width > 0 && !empty && (
          <svg width={width} height={H}>
            <defs>
              <clipPath id="pulse-reveal">
                <motion.rect x={0} y={0} height={H} initial={{ width: 0 }} animate={inView ? { width } : {}} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
              </clipPath>
            </defs>
            <g clipPath="url(#pulse-reveal)">
              <path d={path(home, 1)} fill={colors[0]} fillOpacity={0.55} />
              <path d={path(away, -1)} fill={colors[1]} fillOpacity={0.55} />
            </g>
            <line x1={pad} x2={width - pad} y1={mid} y2={mid} stroke="var(--border-strong)" />
            <line x1={x(45)} x2={x(45)} y1={8} y2={H - 8} stroke="var(--grid)" strokeDasharray="2 3" />
            {goals.map((g) => {
              const m = parseInt(g.minute, 10) || 0;
              return (
                <g key={g.id}>
                  <circle cx={x(Math.min(m, home.length - 1))} cy={mid} r={4.5} fill="var(--bg-panel)" stroke="var(--text-primary)" strokeWidth={1.5} />
                  <title>{`${g.minute} ${g.player ?? "Goal"}`}</title>
                </g>
              );
            })}
          </svg>
        )}
        {empty && <div className="flex h-full items-center justify-center text-sm text-fg-4">Pulse appears once play-by-play arrives.</div>}
      </div>
      <div className="mt-1 flex justify-between text-2xs text-fg-4">
        <span>Derived from live commentary — shots, corners, set pieces. Not xG.</span>
        <span className="tnum">0&apos; — {Math.round(end)}&apos;</span>
      </div>
    </div>
  );
}
