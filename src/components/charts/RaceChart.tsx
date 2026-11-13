"use client";
import { motion, useInView } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { teamBySlug } from "@/lib/data/teams";
import { Segmented } from "@/components/ui/Segmented";
import { ChartTooltip, EASE, Legend, SERIES, TooltipRow, bumpPath, niceTicks, useSize } from "./core";

export interface RaceProps {
  rounds: number[];
  series: { team: string; positions: number[]; points: number[] }[];
  initialSelected: string[];
  zones: { zone: string; from: number; to: number }[];
  height?: number;
}

type Mode = "position" | "points";
const MAX_SELECTED = 6;
const M = { top: 14, right: 56, bottom: 26, left: 34 };

/**
 * Season race. "Position" is a bump chart; "Points" is cumulative points.
 * Both modes share one path grammar, so switching morphs every line in place.
 * Color follows the selected team (fixed slot by selection order), never its rank.
 */
export function RaceChart({ rounds, series, initialSelected, zones, height = 340 }: RaceProps) {
  const [mode, setMode] = useState<Mode>("position");
  const [selected, setSelected] = useState<string[]>(initialSelected.slice(0, 4));
  const [hoverTeam, setHoverTeam] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [wrapRef, { width }] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(wrapRef, { once: true, amount: 0.3 });

  const n = rounds.length;
  const N = series.length;
  const iw = Math.max(0, width - M.left - M.right);
  const ih = height - M.top - M.bottom;
  const maxPts = Math.max(3, ...series.map((s) => s.points.at(-1) ?? 0));
  const ptTicks = niceTicks(maxPts, 4);
  const ptMax = ptTicks.at(-1)!;

  const x = (i: number) => M.left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (s: RaceProps["series"][number], i: number) =>
    mode === "position" ? M.top + ((s.positions[i] - 1) / Math.max(1, N - 1)) * ih : M.top + ih - (s.points[i] / ptMax) * ih;

  const colorOf = (team: string) => {
    const i = selected.indexOf(team);
    return i >= 0 ? SERIES[i % SERIES.length] : undefined;
  };

  const paths = useMemo(
    () =>
      series.map((s) => ({
        team: s.team,
        d: bumpPath(s.positions.map((_, i) => [x(i), y(s, i)] as [number, number])),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, mode, width, height],
  );

  // Draw order: background teams first, selected on top, hovered last.
  const order = [...paths].sort((a, b) => rank(a.team) - rank(b.team));
  function rank(t: string) {
    if (t === hoverTeam) return 3;
    if (selected.includes(t)) return 2;
    return 1;
  }

  const toggle = (t: string) =>
    setSelected((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= MAX_SELECTED ? prev : [...prev, t]));

  // End labels for selected teams with simple collision relaxation.
  const endLabels = useMemo(() => {
    if (!n) return [];
    const items = series
      .filter((s) => selected.includes(s.team))
      .map((s) => ({ team: s.team, y: y(s, n - 1), color: colorOf(s.team)! }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 13) items[i].y = items[i - 1].y + 13;
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, selected, mode, width, n]);

  const tooltipTeams =
    hoverIdx == null
      ? []
      : series
          .filter((s) => selected.includes(s.team) || s.team === hoverTeam)
          .sort((a, b) => a.positions[hoverIdx] - b.positions[hoverIdx]);

  const onMove = (e: React.PointerEvent) => {
    if (!n || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = n <= 1 ? 0 : Math.round(((px - M.left) / iw) * (n - 1));
    setHoverIdx(Math.min(n - 1, Math.max(0, i)));
  };

  const zoneFill: Record<string, string> = {
    ucl: "var(--accent-soft)",
    rel: "color-mix(in oklab, var(--loss) 9%, transparent)",
    playoff: "color-mix(in oklab, var(--draw) 7%, transparent)",
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Legend
          items={selected.map((t, i) => ({ key: t, label: teamBySlug(t)?.short ?? t, color: SERIES[i % SERIES.length] }))}
          onRemove={(k) => setSelected((p) => p.filter((x) => x !== k))}
        />
        <div className="flex items-center gap-2">
          <span className="hidden text-2xs text-fg-4 sm:inline">Click a line to add · max {MAX_SELECTED}</span>
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: "position", label: "Position" },
              { value: "points", label: "Points" },
            ]}
          />
        </div>
      </div>
      <div ref={wrapRef} className="relative" style={{ height }}>
        {width > 0 && (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            role="img"
            aria-label={`${mode === "position" ? "League position" : "Cumulative points"} by matchday`}
            onPointerMove={onMove}
            onPointerLeave={() => {
              setHoverIdx(null);
              setHoverTeam(null);
            }}
            className="overflow-visible select-none"
          >
            {/* zones */}
            <g>
              {zones
                .filter((z) => zoneFill[z.zone])
                .map((z) => {
                  const y0 = M.top + ((z.from - 1.5) / Math.max(1, N - 1)) * ih;
                  const y1 = M.top + ((z.to - 0.5) / Math.max(1, N - 1)) * ih;
                  return (
                    <motion.rect
                      key={z.zone}
                      x={M.left}
                      width={iw}
                      initial={false}
                      animate={{ y: Math.max(M.top - 6, y0), height: Math.max(0, Math.min(M.top + ih + 6, y1) - Math.max(M.top - 6, y0)), opacity: mode === "position" ? 1 : 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      fill={zoneFill[z.zone]}
                      rx={4}
                    />
                  );
                })}
            </g>
            {/* y grid + ticks */}
            <g className="text-[10px]" fill="var(--text-quaternary)">
              {(mode === "position" ? [1, 5, 10, 15, N].filter((v, i, a) => v <= N && a.indexOf(v) === i) : ptTicks).map((v) => {
                const yy = mode === "position" ? M.top + ((v - 1) / Math.max(1, N - 1)) * ih : M.top + ih - (v / ptMax) * ih;
                return (
                  <motion.g key={`${mode}-${v}`} initial={{ opacity: 0 }} animate={{ opacity: 1, y: yy }} transition={{ duration: 0.4, ease: EASE }}>
                    <line x1={M.left} x2={M.left + iw} stroke="var(--grid)" />
                    <text x={M.left - 8} dy="0.32em" textAnchor="end" className="tnum">
                      {v}
                    </text>
                  </motion.g>
                );
              })}
            </g>
            {/* x ticks */}
            <g fontSize={10} fill="var(--text-quaternary)">
              {rounds.map((r, i) =>
                n <= 12 || i % Math.ceil(n / 10) === 0 || i === n - 1 ? (
                  <text key={r} x={x(i)} y={height - 6} textAnchor="middle" className="tnum">
                    {r}
                  </text>
                ) : null,
              )}
            </g>
            {/* crosshair */}
            {hoverIdx != null && (
              <motion.line
                initial={false}
                animate={{ x1: x(hoverIdx), x2: x(hoverIdx) }}
                transition={{ type: "spring", stiffness: 600, damping: 45 }}
                y1={M.top - 6}
                y2={M.top + ih + 6}
                stroke="var(--border-strong)"
              />
            )}
            {/* lines */}
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {order.map((p, k) => {
                const c = colorOf(p.team);
                const isHover = hoverTeam === p.team;
                const dimmed = hoverTeam != null && !isHover;
                const stroke = c ?? (isHover ? "var(--text-secondary)" : "var(--border-strong)");
                return (
                  <g key={p.team}>
                    <motion.path
                      d={p.d}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={inView ? { pathLength: 1, opacity: dimmed ? (c ? 0.35 : 0.25) : 1, d: p.d } : {}}
                      transition={{
                        pathLength: { duration: 1.1, ease: EASE, delay: c ? 0.25 + selected.indexOf(p.team) * 0.08 : k * 0.012 },
                        opacity: { duration: 0.2 },
                        d: { duration: 0.6, ease: [0.65, 0, 0.35, 1] },
                      }}
                      stroke={stroke}
                      strokeWidth={c || isHover ? 2 : 1.25}
                    />
                    <path
                      d={p.d}
                      stroke="transparent"
                      strokeWidth={12}
                      onPointerEnter={() => setHoverTeam(p.team)}
                      onClick={() => toggle(p.team)}
                      className="cursor-pointer"
                    />
                  </g>
                );
              })}
            </g>
            {/* hover dots */}
            {hoverIdx != null &&
              tooltipTeams.map((s) => (
                <motion.circle
                  key={s.team}
                  initial={false}
                  animate={{ cx: x(hoverIdx), cy: y(s, hoverIdx) }}
                  transition={{ type: "spring", stiffness: 600, damping: 45 }}
                  r={4}
                  fill={colorOf(s.team) ?? "var(--text-secondary)"}
                  stroke="var(--bg-panel)"
                  strokeWidth={2}
                />
              ))}
            {/* end markers + labels */}
            {inView &&
              endLabels.map((l, i) => {
                const s = series.find((s) => s.team === l.team)!;
                return (
                  <motion.g key={l.team} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + i * 0.06 }}>
                    <motion.circle
                      initial={{ r: 0, cx: x(n - 1), cy: y(s, n - 1) }}
                      animate={{ r: 4, cx: x(n - 1), cy: y(s, n - 1) }}
                      transition={{ type: "spring", stiffness: 500, damping: 25, cx: { duration: 0.6 }, cy: { duration: 0.6, ease: [0.65, 0, 0.35, 1] } }}
                      fill={l.color}
                      stroke="var(--bg-panel)"
                      strokeWidth={2}
                    />
                    <motion.text
                      initial={false}
                      animate={{ y: l.y }}
                      transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
                      x={x(n - 1) + 10}
                      dy="0.32em"
                      fontSize={11}
                      fontWeight={500}
                      fill="var(--text-secondary)"
                    >
                      {teamBySlug(l.team)?.abbr}
                      <tspan fill="var(--text-quaternary)" dx={4} className="tnum">
                        {mode === "position" ? `#${s.positions[n - 1]}` : s.points[n - 1]}
                      </tspan>
                    </motion.text>
                  </motion.g>
                );
              })}
          </svg>
        )}
        <ChartTooltip
          visible={hoverIdx != null && tooltipTeams.length > 0}
          x={hoverIdx != null ? x(hoverIdx) : 0}
          y={height / 2}
          width={width}
        >
          {hoverIdx != null && (
            <>
              <div className="mb-1 text-2xs font-medium text-fg-4">After matchday {rounds[hoverIdx]}</div>
              {tooltipTeams.map((s) => (
                <TooltipRow
                  key={s.team}
                  color={colorOf(s.team) ?? "var(--text-secondary)"}
                  value={mode === "position" ? `#${s.positions[hoverIdx]}` : s.points[hoverIdx]}
                  label={
                    <>
                      {teamBySlug(s.team)?.short}
                      <span className="text-fg-4"> · {mode === "position" ? `${s.points[hoverIdx]} pts` : `#${s.positions[hoverIdx]}`}</span>
                    </>
                  }
                />
              ))}
            </>
          )}
        </ChartTooltip>
      </div>
    </div>
  );
}
