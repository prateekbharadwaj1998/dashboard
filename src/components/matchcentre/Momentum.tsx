"use client";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import type { CommentaryItem, MatchCard, MatchEvent } from "@/lib/espn/normalize";
import { useSize } from "@/components/charts/core";
import { InfoTip } from "@/components/ui/InfoTip";

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

function series(items: CommentaryItem[], slots: number) {
  const home = new Array(slots).fill(0);
  const away = new Array(slots).fill(0);
  const perMinute: CommentaryItem[][] = Array.from({ length: slots }, () => []);
  for (const c of items) {
    if (c.sec == null) continue;
    const m = Math.min(slots - 1, Math.floor(c.sec / 60));
    if (c.kind && !/^(kickoff|start|end|halftime|delay)/i.test(c.kind)) perMinute[m].push(c);
    if (!c.kind || !c.side) continue;
    const rule = W.find(([re]) => re.test(c.kind!));
    if (!rule) continue;
    const side = rule[2] ? (c.side === "home" ? "away" : "home") : c.side;
    (side === "home" ? home : away)[m] += rule[1];
  }
  const smooth = (arr: number[]) => {
    let acc = 0;
    return arr.map((v) => (acc = acc * 0.72 + v));
  };
  const h = smooth(home);
  const a = smooth(away);
  return { raw: { home, away }, h, a, net: h.map((v, i) => v - a[i]), perMinute };
}

const SHOT = /shot|attempt|goal/i;
const CORNER = /corner/i;

/** Plain-language "who's on top" over the last 10 minutes. */
function verdict(raw: { home: number[]; away: number[] }, items: CommentaryItem[], minute: number, live: boolean, names: [string, string]) {
  if (minute < 10 && live) return "Too early to call — building from kick-off.";
  const from = Math.max(0, minute - 10);
  const sum = (arr: number[]) => arr.slice(from, minute + 1).reduce((a, b) => a + b, 0);
  const h = sum(raw.home);
  const a = sum(raw.away);
  const inWindow = items.filter((c) => c.sec != null && c.sec / 60 >= from && c.sec / 60 <= minute + 1);
  const count = (side: "home" | "away", re: RegExp) => inWindow.filter((c) => c.side === side && c.kind && re.test(c.kind)).length;
  if (Math.abs(h - a) < 2.5) return live ? "Even right now — nobody has taken control." : "Evenly matched over the final stretch.";
  const side = h > a ? "home" : "away";
  const shots = count(side, SHOT);
  const corners = count(side, CORNER);
  const bits = [shots ? `${shots} shot${shots > 1 ? "s" : ""}` : "", corners ? `${corners} corner${corners > 1 ? "s" : ""}` : ""].filter(Boolean).join(" and ");
  return `${names[side === "home" ? 0 : 1]} ${live ? "pushing" : "finished stronger"}${bits ? `: ${bits} in the last 10 minutes` : ""}.`;
}

export function Momentum({
  card,
  commentary,
  events,
  minute,
  colors,
}: {
  card: MatchCard;
  commentary: CommentaryItem[];
  events: MatchEvent[];
  minute: number;
  colors: [string, string];
}) {
  const live = card.state === "in";
  const [wrapRef, { width }] = useSize<HTMLDivElement>();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const now = Math.max(0, Math.min(130, Math.round(minute)));
  const slots = Math.max(90, now + (live ? 0 : 1));
  const s = useMemo(() => series(commentary, slots), [commentary, slots]);
  const played = live ? now : card.state === "post" ? slots : 0;

  const small = width > 0 && width < 640;
  const PLOT = small ? 88 : 112;
  const LANE = 18;
  const LABELS = 16;
  const H = LANE + PLOT + LABELS;
  const padX = 6;
  const plotW = Math.max(0, width - padX * 2);
  const slot = plotW / slots;
  const barW = Math.max(1.5, slot * 0.62);
  const mid = LANE + PLOT / 2;
  const maxV = Math.max(6, ...s.net.slice(0, Math.max(1, played)).map(Math.abs));
  const x = (m: number) => padX + m * slot;
  const yOf = (v: number) => (Math.abs(v) / maxV) * (PLOT / 2 - 4);

  const goals = events.filter((e) => /goal|penalty$/.test(e.kind) && e.kind !== "penalty-miss");
  const reds = events.filter((e) => e.kind === "red");
  const evMin = (e: MatchEvent) => Math.min(slots - 1, parseInt(e.minute, 10) || 0);

  const onPoint = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !slot) return;
    const m = Math.floor((clientX - r.left - padX) / slot);
    setHover(m >= 0 && m < Math.max(1, played) ? m : null);
  };

  const names: [string, string] = [card.home.short, card.away.short];
  const info =
    hover != null
      ? (() => {
          const hh = s.h[hover];
          const aa = s.a[hover];
          const share = hh + aa > 0 ? Math.round((hh / (hh + aa)) * 100) : 50;
          return { minute: hover + 1, share, items: s.perMinute[hover] };
        })()
      : null;

  return (
    <div ref={wrapRef}>
      <div className="mb-2 flex min-h-10 items-start gap-2 text-sm">
        {info ? (
          <div className="w-full">
            <div className="flex items-center gap-2 text-xs">
              <span className="tnum font-semibold text-fg">{info.minute}&apos;</span>
              <span className="flex h-1.5 w-24 overflow-hidden rounded-full">
                <span style={{ width: `${info.share}%`, background: colors[0] }} />
                <span style={{ width: `${100 - info.share}%`, background: colors[1] }} />
              </span>
              <span className="text-fg-3">
                {names[0]} {info.share}% · {names[1]} {100 - info.share}%
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-2xs text-fg-3">
              {info.items.length ? (
                info.items.slice(0, 4).map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.side === "home" ? colors[0] : c.side === "away" ? colors[1] : "var(--text-quaternary)" }} />
                    {c.kind}
                  </span>
                ))
              ) : (
                <span>Quiet minute</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-fg-2">{verdict(s.raw, commentary, live ? now : slots - 1, live, names)}</p>
        )}
      </div>
      <div
        ref={ref}
        className="relative cursor-crosshair touch-pan-y select-none"
        style={{ height: H }}
        onPointerMove={(e) => onPoint(e.clientX)}
        onPointerDown={(e) => onPoint(e.clientX)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
      >
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`Match momentum, ${names[0]} above the line, ${names[1]} below`}>
            {/* future wash */}
            {played < slots && <rect x={x(played)} y={LANE} width={Math.max(0, x(slots) - x(played))} height={PLOT} fill="var(--bg-hover)" opacity={0.35} rx={3} />}
            {/* HT line */}
            <line x1={x(45)} x2={x(45)} y1={LANE} y2={LANE + PLOT} stroke="var(--border-strong)" strokeDasharray="3 3" />
            {/* baseline */}
            <line x1={padX} x2={x(played)} y1={mid} y2={mid} stroke="var(--border-strong)" />
            {played < slots && <line x1={x(played)} x2={x(slots)} y1={mid} y2={mid} stroke="var(--grid)" strokeDasharray="2 4" />}
            {/* hover column */}
            {hover != null && <rect x={x(hover)} y={LANE} width={slot} height={PLOT} fill="var(--bg-hover)" />}
            {/* bars */}
            {s.net.slice(0, played).map((v, i) => {
              if (Math.abs(v) < 0.05) return null;
              const hgt = Math.max(1, yOf(v));
              const up = v > 0;
              return (
                <motion.rect
                  key={i}
                  x={x(i) + (slot - barW) / 2}
                  y={up ? mid - hgt : mid}
                  width={barW}
                  height={hgt}
                  rx={Math.min(1, barW / 2)}
                  fill={up ? colors[0] : colors[1]}
                  fillOpacity={hover == null || hover === i ? 0.9 : 0.45}
                  style={{ transformBox: "fill-box", transformOrigin: up ? "bottom" : "top" }}
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={inView ? { scaleY: 1 } : undefined}
                  transition={i >= played - 1 && live ? { type: "spring", stiffness: 300, damping: 30 } : { duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: i * 0.005 }}
                />
              );
            })}
            {/* event lane */}
            {goals.map((e, k) => {
              const cx = x(evMin(e)) + slot / 2;
              const stack = goals.slice(0, k).filter((g) => Math.abs(x(evMin(g)) - x(evMin(e))) < 10).length;
              return (
                <g key={e.id}>
                  <line x1={cx} x2={cx} y1={LANE - 2} y2={mid} stroke={e.side === "home" ? colors[0] : colors[1]} strokeOpacity={0.35} />
                  <circle cx={cx} cy={9 - stack * 0} r={6} fill={e.side === "home" ? colors[0] : colors[1]} stroke="var(--bg-panel)" strokeWidth={1.5} />
                  <text x={cx} y={9} dy="0.35em" textAnchor="middle" fontSize={8}>
                    ⚽
                  </text>
                  <title>{`${e.minute} ${e.player ?? "Goal"}`}</title>
                </g>
              );
            })}
            {reds.map((e) => {
              const cx = x(evMin(e)) + slot / 2;
              return (
                <g key={e.id}>
                  <rect x={cx - 3.5} y={4} width={7} height={10} rx={1.5} fill="#E5484D" />
                  <title>{`${e.minute} ${e.player ?? "Red card"}`}</title>
                </g>
              );
            })}
            {/* now marker */}
            {live && (
              <g>
                <line x1={x(played)} x2={x(played)} y1={LANE - 4} y2={LANE + PLOT} stroke="var(--live)" />
                <circle cx={x(played)} cy={LANE - 4} r={2.5} fill="var(--live)" />
              </g>
            )}
            {/* labels */}
            {[
              [0, "0'"],
              [45, "HT"],
              [slots, slots > 90 ? `${slots}'` : "FT"],
            ].map(([m, l]) => (
              <text key={String(l)} x={Math.min(width - 12, Math.max(10, x(m as number)))} y={H - 3} fontSize={11} textAnchor="middle" fill="var(--text-quaternary)" className="tnum">
                {l}
              </text>
            ))}
            {live && played > 6 && played < slots - 6 && (
              <text x={x(played)} y={H - 3} fontSize={11} textAnchor="middle" fill="var(--live)" className="tnum">
                {played}&apos;
              </text>
            )}
          </svg>
        )}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-2xs text-fg-4">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors[0] }} /> {names[0]} above
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors[1] }} /> {names[1]} below
        </span>
        <span className="ml-auto">Hover or drag to explore</span>
      </div>
    </div>
  );
}

export function MomentumTitle() {
  return (
    <span className="inline-flex items-center gap-1.5">
      Momentum
      <InfoTip label="Momentum" onceKey="momentum">
        Which side is pressing, minute by minute. Built from live commentary: shots, corners and set pieces. Taller bars mean more pressure. It is not xG.
      </InfoTip>
    </span>
  );
}
