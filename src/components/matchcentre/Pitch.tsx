"use client";
import Link from "next/link";
import { motion, useInView } from "motion/react";
import { useMemo, useRef, useState } from "react";
import type { LineupPlayer, TeamLineup } from "@/lib/espn/normalize";
import { ratingStyle } from "@/lib/espn/rating";
import { useSize } from "@/components/charts/core";
import { onColor } from "./colors";
import { usePhotoCoverage, usePlayerPhoto } from "@/lib/photos";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";

// ------------------------------------------------------------ placement
const DEPTH: [RegExp, number][] = [
  [/^G/, 0],
  [/^(CD|CB|D|SW)(-[LR])?$/, 1],
  [/^(LB|RB)$/, 1.1],
  [/^(LWB|RWB|WB)$/, 1.6],
  [/^(DM|CDM)(-[LR])?$/, 2],
  [/^(CM|M)(-[LR])?$/, 2.5],
  [/^(LM|RM)$/, 2.7],
  [/^(AM|CAM)(-[LR])?$/, 3.2],
  [/^(LW|RW)$/, 3.5],
  [/^(F|CF|ST|FW|S)(-[LR])?$/, 4],
];
const depthOf = (pos: string) => DEPTH.find(([re]) => re.test(pos))?.[1] ?? 2.5;
function lateralOf(pos: string) {
  if (/^L(B|M|W|WB)$/.test(pos)) return -1;
  if (/^R(B|M|W|WB)$/.test(pos)) return 1;
  if (/-L$/.test(pos)) return -0.5;
  if (/-R$/.test(pos)) return 0.5;
  return 0;
}

/** Returns rows from the back line forwards (GK excluded), each sorted left → right. */
export function placeRows(lineup: TeamLineup): { gk?: LineupPlayer; rows: LineupPlayer[][] } {
  const gk = lineup.starters.find((p) => p.group === "GK") ?? lineup.starters.find((p) => p.place === 1);
  const outfield = lineup.starters
    .filter((p) => p !== gk)
    .sort((a, b) => depthOf(a.pos) - depthOf(b.pos) || lateralOf(a.pos) - lateralOf(b.pos) || (a.place ?? 0) - (b.place ?? 0));
  const counts = (lineup.formation ?? "").split("-").map(Number).filter((n) => n > 0);
  let rows: LineupPlayer[][] = [];
  if (counts.length && counts.reduce((a, b) => a + b, 0) === outfield.length) {
    let i = 0;
    for (const n of counts) {
      rows.push(outfield.slice(i, i + n));
      i += n;
    }
  } else {
    const buckets = new Map<number, LineupPlayer[]>();
    for (const p of outfield) {
      const d = Math.round(depthOf(p.pos));
      buckets.set(d, [...(buckets.get(d) ?? []), p]);
    }
    rows = [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, ps]) => ps);
  }
  rows = rows.map((r) => r.slice().sort((a, b) => lateralOf(a.pos) - lateralOf(b.pos) || (a.place ?? 0) - (b.place ?? 0)));
  return { gk, rows };
}

interface Node {
  p: LineupPlayer;
  x: number;
  y: number;
  color: string;
  side: "home" | "away";
  order: number;
}

function layout(lineups: TeamLineup[], colors: [string, string], vertical: boolean): Node[] {
  const L = 105;
  const W = 68;
  const nodes: Node[] = [];
  for (const lu of lineups) {
    const { gk, rows } = placeRows(lu);
    const color = lu.side === "home" ? colors[0] : colors[1];
    const toXY = (depthFrac: number, latFrac: number) => {
      // depthFrac: 0 = own goal line → 0.5 = halfway line. latFrac: 0 = team's left → 1 = right.
      const along = lu.side === "home" ? depthFrac * L : L - depthFrac * L;
      if (vertical) {
        const x = lu.side === "home" ? latFrac * W : W - latFrac * W;
        return { x, y: L - along };
      }
      const y = lu.side === "home" ? latFrac * W : W - latFrac * W;
      return { x: along, y };
    };
    let order = 0;
    if (gk) nodes.push({ p: gk, ...toXY(0.045, 0.5), color, side: lu.side, order: order++ });
    const R = rows.length;
    rows.forEach((row, ri) => {
      const depth = R === 1 ? 0.3 : 0.14 + (ri / (R - 1)) * 0.28;
      row.forEach((p, i) => {
        const n = row.length;
        let lat = (i + 1) / (n + 1);
        if (n >= 4) lat = 0.5 + (lat - 0.5) * 1.12;
        nodes.push({ p, ...toXY(depth, 0.06 + lat * 0.88), color, side: lu.side, order: order++ });
      });
    });
  }
  return nodes;
}

// ------------------------------------------------------------ drawing
function PitchLines({ vertical }: { vertical: boolean }) {
  const L = 105;
  const W = 68;
  const s = { stroke: "var(--pitch-line)", strokeWidth: 0.35, fill: "none" } as const;
  const g = (
    <g {...s}>
      <rect x={0.5} y={0.5} width={L - 1} height={W - 1} rx={0.6} />
      <line x1={L / 2} y1={0.5} x2={L / 2} y2={W - 0.5} />
      <circle cx={L / 2} cy={W / 2} r={9.15} />
      <circle cx={L / 2} cy={W / 2} r={0.5} fill="var(--pitch-line)" />
      {[0, 1].map((end) => {
        const x0 = end ? L - 0.5 : 0.5;
        const dir = end ? -1 : 1;
        return (
          <g key={end}>
            <rect x={end ? L - 0.5 - 16.5 : 0.5} y={W / 2 - 20.16} width={16.5} height={40.32} />
            <rect x={end ? L - 0.5 - 5.5 : 0.5} y={W / 2 - 9.16} width={5.5} height={18.32} />
            <circle cx={x0 + dir * 11} cy={W / 2} r={0.45} fill="var(--pitch-line)" />
            <path d={`M ${x0 + dir * 16.5} ${W / 2 - 7.3} A 9.15 9.15 0 0 ${end ? 0 : 1} ${x0 + dir * 16.5} ${W / 2 + 7.3}`} />
          </g>
        );
      })}
    </g>
  );
  const stripes = Array.from({ length: 10 }, (_, i) => (
    <rect key={i} x={(i * L) / 10} y={0} width={L / 10} height={W} fill={i % 2 ? "var(--pitch-stripe)" : "transparent"} />
  ));
  return vertical ? (
    <g transform={`translate(${W} 0) rotate(90)`}>
      {stripes}
      {g}
    </g>
  ) : (
    <>
      {stripes}
      {g}
    </>
  );
}

function PlayerNode({ n, i, inView, onSelect, selected, maxX, photos }: { n: Node; i: number; inView: boolean; onSelect: (p: LineupPlayer) => void; selected: boolean; maxX: number; photos: boolean }) {
  const p = n.p;
  const goals = p.stats.G;
  const r = p.rating;
  const rs = ratingStyle(r);
  const fg = onColor(n.color);
  const name = p.last.length > 11 ? `${p.last.slice(0, 10)}…` : p.last;
  const chipX = n.x + 5.8 > maxX ? n.x - 5.6 : n.x + 1.2; // keep the rating chip inside the pitch
  const looked = usePlayerPhoto(photos ? p.name : undefined);
  const photo = photos ? looked : null;
  const clipId = `pc-${n.side}-${p.id}`;
  const R = 2.35; // constant node size — never flips between photo / number
  const zoom = photo?.portrait === false ? 1.6 : 1.25;
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.05 + i * 0.025 }}
      style={{ transformOrigin: `${n.x}px ${n.y}px`, transformBox: "view-box" }}
      className="cursor-pointer"
      onClick={() => onSelect(p)}
    >
      <circle cx={n.x} cy={n.y} r={R} fill={photo || photos ? `color-mix(in oklab, ${n.color} 28%, var(--bg-elevated))` : n.color} />
      {photo ? (
        <>
          <clipPath id={clipId}>
            <circle cx={n.x} cy={n.y} r={R - 0.1} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            <image
              href={photo.src}
              x={n.x - R * zoom}
              y={n.y - R - R * (zoom - 1) * 0.35}
              width={R * 2 * zoom}
              height={R * 2 * zoom}
              preserveAspectRatio="xMidYMin slice"
              style={{ filter: "grayscale(1) contrast(1.08) brightness(1.04)" }}
            />
            <circle cx={n.x} cy={n.y} r={R} fill={n.color} style={{ mixBlendMode: "soft-light" }} opacity={0.45} />
          </g>
        </>
      ) : photos ? (
        // photo set chosen but this player has none: silhouette on the same disc
        <g clipPath={`url(#${clipId})`} opacity={0.55}>
          <clipPath id={clipId}>
            <circle cx={n.x} cy={n.y} r={R - 0.1} />
          </clipPath>
          <circle cx={n.x} cy={n.y - 0.45} r={0.85} fill="var(--text-quaternary)" />
          <path d={`M ${n.x - 1.8} ${n.y + R} c 0 -1.5 0.8 -2.4 1.8 -2.4 s 1.8 0.9 1.8 2.4 z`} fill="var(--text-quaternary)" />
        </g>
      ) : (
        <text x={n.x} y={n.y} dy="0.36em" textAnchor="middle" fontSize={1.95} fontWeight={700} fill={fg} className="tnum">
          {p.jersey}
        </text>
      )}
      <circle cx={n.x} cy={n.y} r={R - 0.08} fill="none" stroke={n.color} strokeWidth={photo || photos ? 0.32 : 0.18} strokeOpacity={photo || photos ? 0.9 : 0.4} />
      {selected && <circle cx={n.x} cy={n.y} r={R + 0.35} fill="none" stroke="var(--text-primary)" strokeWidth={0.35} />}
      <text x={Math.min(maxX - 5.5, Math.max(5.5, n.x))} y={n.y + 4.6} textAnchor="middle" fontSize={1.75} fontWeight={500} fill="var(--text-primary)" style={{ paintOrder: "stroke", stroke: "var(--pitch-text-stroke)", strokeWidth: 0.45 }}>
        {photos && p.jersey ? `${p.jersey} ` : ""}
        {name}
      </text>
      {r != null && (
        <g>
          <rect x={chipX} y={n.y - 4.2} width={4.4} height={2.3} rx={0.5} fill={rs.bg} />
          <text x={chipX + 2.2} y={n.y - 3.05} dy="0.36em" textAnchor="middle" fontSize={1.55} fontWeight={700} fill={rs.fg} className="tnum">
            {r.toFixed(1)}
          </text>
        </g>
      )}
      {p.motm && <text x={n.x - 3.9} y={n.y - 2.4} fontSize={2} fill="#f5c84c">★</text>}
      {goals > 0 && (
        <g>
          <circle cx={n.x - 2.3} cy={n.y + 1.9} r={0.9} fill="#fff" stroke="#08090a" strokeWidth={0.2} />
          <circle cx={n.x - 2.3} cy={n.y + 1.9} r={0.32} fill="#08090a" />
          {goals > 1 && (
            <text x={n.x - 3.4} y={n.y + 2.5} fontSize={1.4} fill="var(--text-primary)" textAnchor="end">
              {goals}
            </text>
          )}
        </g>
      )}
      {(p.stats.YC > 0 || p.stats.RC > 0) && (
        <rect x={n.x - 3.3} y={n.y - 2.3} width={1.1} height={1.55} rx={0.2} fill={p.stats.RC > 0 ? "#E5484D" : "#F5C84C"} />
      )}
      {p.subbedOut != null && (
        <g>
          <circle cx={n.x + 2.3} cy={n.y + 1.9} r={0.9} fill="var(--loss)" />
          <path d={`M ${n.x + 2.3} ${n.y + 1.45} v 0.9 m -0.4 -0.38 l 0.4 0.4 l 0.4 -0.4`} stroke="#fff" strokeWidth={0.22} fill="none" />
        </g>
      )}
    </motion.g>
  );
}

export function Pitch({ lineups, colors, onSelect, selectedId }: { lineups: TeamLineup[]; colors: [string, string]; onSelect: (p: LineupPlayer) => void; selectedId?: string }) {
  const [wrapRef, { width }] = useSize<HTMLDivElement>();
  const vertical = width > 0 && width < 640;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const nodes = useMemo(() => layout(lineups, colors, vertical), [lineups, colors, vertical]);
  const starters = useMemo(() => lineups.flatMap((l) => l.starters.map((p) => p.name)), [lineups]);
  // Photos only when ≥70% of starters have one — otherwise uniform shirt numbers.
  const photos = usePhotoCoverage(starters) === true;
  const vb = vertical ? "0 0 68 105" : "0 0 105 68";
  return (
    <div ref={wrapRef}>
      <div ref={ref} className="pitch relative mx-auto max-w-[920px] overflow-hidden rounded-xl" style={{ aspectRatio: vertical ? "68 / 105" : "105 / 68" }}>
        <svg viewBox={vb} className="absolute inset-0 h-full w-full select-none" role="img" aria-label="Starting line-ups on the pitch">
          <PitchLines vertical={vertical} />
          {nodes.map((n, i) => (
            <PlayerNode key={`${n.side}-${n.p.id}-${i}`} n={n} i={i} inView={inView} onSelect={onSelect} selected={selectedId === n.p.id} maxX={vertical ? 68 : 105} photos={photos} />
          ))}
        </svg>
      </div>
    </div>
  );
}

/** Bench / substitutes list with ratings and sub minutes. */
export function BenchList({ lineup, color, onSelect, league }: { lineup: TeamLineup; color: string; onSelect: (p: LineupPlayer) => void; league: string }) {
  const used = lineup.bench.filter((p) => p.subbedIn != null);
  const unused = lineup.bench.filter((p) => p.subbedIn == null);
  const [open, setOpen] = useState(false);
  const row = (p: LineupPlayer) => (
    <button key={p.id} onClick={() => onSelect(p)} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-hover">
      <PlayerPhoto name={p.name} size={24} color={color} />
      <span className="tnum w-5 shrink-0 text-center text-2xs text-fg-4">{p.jersey}</span>
      <span className="min-w-0 flex-1 truncate">{p.name}</span>
      {p.subbedIn != null && <span className="tnum text-2xs text-win">↑ {p.subbedIn}</span>}
      {p.stats.G > 0 && <span className="text-2xs">⚽{p.stats.G > 1 ? `×${p.stats.G}` : ""}</span>}
      {p.rating != null && (
        <span className="tnum rounded-[4px] px-1 text-[11px] font-semibold" style={{ background: ratingStyle(p.rating).bg, color: ratingStyle(p.rating).fg }}>
          {p.rating.toFixed(1)}
        </span>
      )}
    </button>
  );
  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-2 text-2xs font-medium text-fg-4">
        <span>Substitutes{lineup.coach ? ` · Coach ${lineup.coach}` : ""}</span>
        <Link href={`/team?id=${lineup.team.id}&lg=${league}`} className="hover:text-fg">
          Squad →
        </Link>
      </div>
      {used.map(row)}
      {unused.length > 0 && (
        <>
          {open && unused.map(row)}
          <button onClick={() => setOpen((o) => !o)} className="px-2 py-1 text-2xs text-fg-4 hover:text-fg-2">
            {open ? "Hide" : `${unused.length} unused`}
          </button>
        </>
      )}
    </div>
  );
}
