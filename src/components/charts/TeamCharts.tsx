"use client";
import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEntry } from "@/lib/data/types";
import { teamBySlug } from "@/lib/data/teams";
import { ChartTooltip, EASE, Legend, smoothPath, useSize } from "./core";

/** Match-by-match goals: scored above the baseline, conceded below. */
export function GoalsTimeline({ entries, height = 200 }: { entries: FormEntry[]; height?: number }) {
  const [wrapRef, { width }] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(wrapRef, { once: true, amount: 0.3 });
  const router = useRouter();
  const [hi, setHi] = useState<number | null>(null);
  const M = { top: 10, bottom: 10, left: 24, right: 8 };
  const n = entries.length;
  const iw = Math.max(0, width - M.left - M.right);
  const ih = height - M.top - M.bottom;
  const max = Math.max(3, ...entries.flatMap((e) => e.score));
  const zero = M.top + ih / 2;
  const unit = ih / 2 / max;
  const band = n ? iw / n : 0;
  const bw = Math.min(14, Math.max(3, band * 0.55));

  return (
    <div>
      <div className="mb-3">
        <Legend
          items={[
            { key: "f", label: "Scored", color: "var(--div-pos)", shape: "rect" },
            { key: "a", label: "Conceded", color: "var(--div-neg)", shape: "rect" },
          ]}
        />
      </div>
      <div ref={wrapRef} className="relative" style={{ height }}>
        {width > 0 && (
          <svg ref={svgRef} width={width} height={height} onPointerLeave={() => setHi(null)}>
            {[max, 0, -max].map((v) => (
              <g key={v}>
                <line x1={M.left} x2={M.left + iw} y1={zero - v * unit} y2={zero - v * unit} stroke={v === 0 ? "var(--border-strong)" : "var(--grid)"} />
                <text x={M.left - 6} y={zero - v * unit} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--text-quaternary)" className="tnum">
                  {Math.abs(v)}
                </text>
              </g>
            ))}
            {entries.map((e, i) => {
              const cx = M.left + band * i + band / 2;
              return (
                <g key={e.matchId} opacity={hi != null && hi !== i ? 0.45 : 1} style={{ transition: "opacity 150ms" }}>
                  {e.score[0] > 0 && (
                    <motion.rect
                      x={cx - bw / 2}
                      width={bw}
                      rx={Math.min(4, bw / 2)}
                      initial={{ y: zero - 1, height: 0 }}
                      animate={inView ? { y: zero - 1 - e.score[0] * unit + 1, height: e.score[0] * unit - 1 } : {}}
                      transition={{ duration: 0.55, ease: EASE, delay: i * 0.025 }}
                      fill="var(--div-pos)"
                    />
                  )}
                  {e.score[1] > 0 && (
                    <motion.rect
                      x={cx - bw / 2}
                      width={bw}
                      rx={Math.min(4, bw / 2)}
                      initial={{ height: 0 }}
                      animate={inView ? { height: e.score[1] * unit - 1 } : {}}
                      y={zero + 1}
                      transition={{ duration: 0.55, ease: EASE, delay: i * 0.025 + 0.05 }}
                      fill="var(--div-neg)"
                    />
                  )}
                  <rect
                    x={cx - band / 2}
                    width={band}
                    y={M.top}
                    height={ih}
                    fill="transparent"
                    onPointerEnter={() => setHi(i)}
                    onClick={() => router.push(`/match/${e.matchId}`)}
                    className="cursor-pointer"
                  />
                </g>
              );
            })}
          </svg>
        )}
        <ChartTooltip visible={hi != null} x={hi != null ? M.left + band * hi + band / 2 : 0} y={height / 2} width={width}>
          {hi != null && entries[hi] && (
            <div>
              <div className="text-2xs text-fg-4">
                Game {hi + 1} · {entries[hi].venue === "H" ? "Home" : "Away"}
              </div>
              <div className="mt-0.5 font-medium text-fg">
                <span className="tnum">
                  {entries[hi].score[0]}–{entries[hi].score[1]}
                </span>{" "}
                <span className="text-fg-3">{entries[hi].venue === "H" ? "vs" : "at"}</span> {teamBySlug(entries[hi].opponent)?.short}
              </div>
              {entries[hi].ht && (
                <div className="tnum text-2xs text-fg-3">
                  HT {entries[hi].ht![0]}–{entries[hi].ht![1]}
                </div>
              )}
            </div>
          )}
        </ChartTooltip>
      </div>
    </div>
  );
}

/** One team's league position after each matchday, with an area wash. */
export function PositionLine({
  rounds,
  positions,
  teams,
  color = "var(--s1)",
  height = 200,
  compare,
}: {
  rounds: number[];
  positions: number[];
  teams: number;
  color?: string;
  height?: number;
  compare?: { positions: number[]; color: string; label: string; mainLabel: string };
}) {
  const [wrapRef, { width }] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(wrapRef, { once: true, amount: 0.3 });
  const [hi, setHi] = useState<number | null>(null);
  const M = { top: 12, bottom: 22, left: 28, right: 14 };
  const n = rounds.length;
  const iw = Math.max(0, width - M.left - M.right);
  const ih = height - M.top - M.bottom;
  const x = (i: number) => M.left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (p: number) => M.top + ((p - 1) / Math.max(1, teams - 1)) * ih;
  const pts = positions.map((p, i) => [x(i), y(p)] as [number, number]);
  const line = smoothPath(pts);
  const area = n ? `${line} L${x(n - 1)},${M.top + ih} L${x(0)},${M.top + ih} Z` : "";
  const cmpLine = compare ? smoothPath(compare.positions.map((p, i) => [x(i), y(p)] as [number, number])) : "";

  return (
    <div>
      {compare && (
        <div className="mb-3">
          <Legend
            items={[
              { key: "a", label: compare.mainLabel, color },
              { key: "b", label: compare.label, color: compare.color },
            ]}
          />
        </div>
      )}
      <div ref={wrapRef} className="relative" style={{ height }}>
        {width > 0 && n > 0 && (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            onPointerMove={(e) => {
              const r = svgRef.current!.getBoundingClientRect();
              const i = n <= 1 ? 0 : Math.round(((e.clientX - r.left - M.left) / iw) * (n - 1));
              setHi(Math.max(0, Math.min(n - 1, i)));
            }}
            onPointerLeave={() => setHi(null)}
          >
            <defs>
              <linearGradient id="pos-wash" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {[1, Math.ceil(teams / 4), Math.ceil(teams / 2), Math.ceil((3 * teams) / 4), teams].map((p) => (
              <g key={p}>
                <line x1={M.left} x2={M.left + iw} y1={y(p)} y2={y(p)} stroke="var(--grid)" />
                <text x={M.left - 8} y={y(p)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--text-quaternary)" className="tnum">
                  {p}
                </text>
              </g>
            ))}
            {rounds.map((r, i) =>
              n <= 12 || i % Math.ceil(n / 8) === 0 || i === n - 1 ? (
                <text key={r} x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="var(--text-quaternary)" className="tnum">
                  {r}
                </text>
              ) : null,
            )}
            <motion.path d={area} fill="url(#pos-wash)" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.5, duration: 0.6 }} />
            {compare && (
              <motion.path
                d={cmpLine}
                fill="none"
                stroke={compare.color}
                strokeWidth={2}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={inView ? { pathLength: 1 } : {}}
                transition={{ duration: 1, ease: EASE, delay: 0.15 }}
              />
            )}
            <motion.path
              d={line}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : {}}
              transition={{ duration: 1, ease: EASE }}
            />
            {inView && (
              <motion.circle
                cx={x(n - 1)}
                cy={y(positions[n - 1])}
                fill={color}
                stroke="var(--bg-panel)"
                strokeWidth={2}
                initial={{ r: 0 }}
                animate={{ r: 4.5 }}
                transition={{ type: "spring", stiffness: 500, damping: 20, delay: 1 }}
              />
            )}
            {hi != null && (
              <>
                <line x1={x(hi)} x2={x(hi)} y1={M.top} y2={M.top + ih} stroke="var(--border-strong)" />
                <circle cx={x(hi)} cy={y(positions[hi])} r={4} fill={color} stroke="var(--bg-panel)" strokeWidth={2} />
                {compare && <circle cx={x(hi)} cy={y(compare.positions[hi])} r={4} fill={compare.color} stroke="var(--bg-panel)" strokeWidth={2} />}
              </>
            )}
          </svg>
        )}
        <ChartTooltip visible={hi != null} x={hi != null ? x(hi) : 0} y={height / 2} width={width}>
          {hi != null && (
            <div>
              <div className="mb-0.5 text-2xs text-fg-4">After matchday {rounds[hi]}</div>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />
                <span className="tnum font-semibold text-fg">#{positions[hi]}</span>
                {compare && <span className="text-fg-3">{compare.mainLabel}</span>}
              </div>
              {compare && (
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: compare.color }} />
                  <span className="tnum font-semibold text-fg">#{compare.positions[hi]}</span>
                  <span className="text-fg-3">{compare.label}</span>
                </div>
              )}
            </div>
          )}
        </ChartTooltip>
      </div>
    </div>
  );
}

/** Tiny inline trend line (no axes) - for table rows and tiles. */
export function Sparkline({ values, width = 64, height = 18, invert = false, color = "var(--accent-text)" }: { values: number[]; width?: number; height?: number; invert?: boolean; color?: string }) {
  if (values.length < 2) return <span style={{ width, height }} className="inline-block" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const t = (v - min) / span;
    return [(i / (values.length - 1)) * (width - 4) + 2, 2 + (invert ? t : 1 - t) * (height - 4)] as [number, number];
  });
  const d = smoothPath(pts);
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <motion.path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={2} fill={color} />
    </svg>
  );
}

/** Mirrored comparison bars: team A to the left, team B to the right, per metric. */
export function MirrorBars({
  rows,
  colorA,
  colorB,
}: {
  rows: { label: string; a: number; b: number; fmt?: "dec2" | "pct" | "int"; lowerIsBetter?: boolean }[];
  colorA: string;
  colorB: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <div ref={ref} className="space-y-3">
      {rows.map((r, i) => {
        const max = Math.max(r.a, r.b) || 1;
        const fmt = (v: number) => (r.fmt === "pct" ? `${Math.round(v * 100)}%` : r.fmt === "dec2" ? v.toFixed(2) : String(Math.round(v)));
        const aBetter = r.lowerIsBetter ? r.a < r.b : r.a > r.b;
        const bBetter = r.lowerIsBetter ? r.b < r.a : r.b > r.a;
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className={`tnum ${aBetter ? "font-semibold text-fg" : "text-fg-3"}`}>{fmt(r.a)}</span>
              <span className="text-fg-3">{r.label}</span>
              <span className={`tnum ${bBetter ? "font-semibold text-fg" : "text-fg-3"}`}>{fmt(r.b)}</span>
            </div>
            <div className="grid grid-cols-2 gap-[2px]">
              <div className="flex h-1.5 justify-end overflow-hidden rounded-l-full bg-hover">
                <motion.div
                  className="h-full rounded-l-full"
                  style={{ background: colorA, opacity: aBetter ? 1 : 0.45 }}
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${(r.a / max) * 100}%` } : {}}
                  transition={{ duration: 0.7, ease: EASE, delay: i * 0.05 }}
                />
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-r-full bg-hover">
                <motion.div
                  className="h-full rounded-r-full"
                  style={{ background: colorB, opacity: bBetter ? 1 : 0.45 }}
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${(r.b / max) * 100}%` } : {}}
                  transition={{ duration: 0.7, ease: EASE, delay: i * 0.05 }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
