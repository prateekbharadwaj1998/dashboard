"use client";
import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import Link from "next/link";
import { teamBySlug } from "@/lib/data/teams";
import { Crest } from "@/components/ui/Crest";
import { Legend } from "./core";
import { useSeasonHref } from "@/lib/useSeasonHref";

export interface StackRow {
  team: string;
  values: number[];
  note?: string;
}

/** Horizontal stacked bars (2px surface gap between segments), one row per team. */
export function StackedHBars({ rows, keys, colors, max }: { rows: StackRow[]; keys: string[]; colors: string[]; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const [hover, setHover] = useState<string | null>(null);
  const href = useSeasonHref();
  const top = max ?? Math.max(1, ...rows.map((r) => r.values.reduce((a, b) => a + b, 0)));
  return (
    <div ref={ref}>
      <div className="mb-3">
        <Legend items={keys.map((k, i) => ({ key: k, label: k, color: colors[i], shape: "rect" }))} />
      </div>
      <div className="space-y-[3px]">
        {rows.map((r, i) => {
          const total = r.values.reduce((a, b) => a + b, 0);
          return (
            <Link
              href={href(`/team/${r.team}`)}
              key={r.team}
              onPointerEnter={() => setHover(r.team)}
              onPointerLeave={() => setHover(null)}
              className="group grid grid-cols-[104px_1fr_72px] items-center gap-3 rounded-md px-1 py-[3px] hover:bg-hover"
              style={{ opacity: hover && hover !== r.team ? 0.55 : 1, transition: "opacity 150ms" }}
            >
              <span className="flex min-w-0 items-center gap-2 text-xs text-fg-2">
                <Crest slug={r.team} size={14} />
                <span className="truncate">{teamBySlug(r.team)?.short}</span>
              </span>
              <span className="flex h-3.5 items-center gap-[2px]">
                {r.values.map((v, k) =>
                  v > 0 ? (
                    <motion.span
                      key={k}
                      initial={{ width: 0 }}
                      animate={inView ? { width: `${(v / top) * 100}%` } : {}}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.025 + k * 0.08 }}
                      className={`h-full ${k === r.values.length - 1 ? "rounded-r-[4px]" : ""} ${k === 0 ? "rounded-l-[1px]" : ""}`}
                      style={{ background: colors[k] }}
                      title={`${keys[k]}: ${v}`}
                    />
                  ) : null,
                )}
              </span>
              <span className="tnum text-right text-xs text-fg-3">
                {r.values.map((v, k) => (
                  <span key={k}>
                    {k > 0 && <span className="text-fg-4"> / </span>}
                    <span className={k === 0 ? "text-fg" : ""}>{v}</span>
                  </span>
                ))}
                <span className="sr-only">total {total}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Diverging bars around a zero line: positive to the right, negative to the left. */
export function DivergingHBars({
  rows,
  posLabel,
  negLabel,
}: {
  rows: { team: string; pos: number; neg: number; posNote?: string; negNote?: string }[];
  posLabel: string;
  negLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const max = Math.max(1, ...rows.flatMap((r) => [r.pos, r.neg]));
  const href = useSeasonHref();
  return (
    <div ref={ref}>
      <div className="mb-3">
        <Legend
          items={[
            { key: "neg", label: negLabel, color: "var(--div-neg)", shape: "rect" },
            { key: "pos", label: posLabel, color: "var(--div-pos)", shape: "rect" },
          ]}
        />
      </div>
      <div className="space-y-[3px]">
        {rows.map((r, i) => (
          <Link
            href={href(`/team/${r.team}`)}
            key={r.team}
            className="grid grid-cols-[28px_1fr_104px_1fr_28px] items-center gap-2 rounded-md px-1 py-[3px] hover:bg-hover"
          >
            <span className="tnum text-right text-xs text-fg-3">{r.neg || ""}</span>
            <span className="flex h-3.5 justify-end">
              <motion.span
                initial={{ width: 0 }}
                animate={inView ? { width: `${(r.neg / max) * 100}%` } : {}}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.025 }}
                className="h-full rounded-l-[4px]"
                style={{ background: "var(--div-neg)" }}
                title={r.negNote}
              />
            </span>
            <span className="flex min-w-0 items-center justify-center gap-1.5 text-xs text-fg-2">
              <Crest slug={r.team} size={14} />
              <span className="truncate">{teamBySlug(r.team)?.short}</span>
            </span>
            <span className="flex h-3.5">
              <motion.span
                initial={{ width: 0 }}
                animate={inView ? { width: `${(r.pos / max) * 100}%` } : {}}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.025 }}
                className="h-full rounded-r-[4px]"
                style={{ background: "var(--div-pos)" }}
                title={r.posNote}
              />
            </span>
            <span className="tnum text-xs text-fg-3">{r.pos || ""}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
