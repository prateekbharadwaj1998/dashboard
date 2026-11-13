"use client";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { Match } from "@/lib/data/types";
import { MatchRow } from "@/components/match/MatchRow";
import { LocalTime } from "@/components/match/LocalTime";
import { Panel } from "@/components/ui/Panel";

export function FixturesBrowser({ matches, total, initial, tz, logos }: { matches: Match[]; total: number; initial: number; tz?: string; logos?: Record<string, string> }) {
  const [md, setMd] = useState(initial);
  const [dir, setDir] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const list = useMemo(() => matches.filter((m) => m.matchday === md), [matches, md]);
  const go = (n: number) => {
    const next = Math.max(1, Math.min(total, n));
    setDir(next > md ? 1 : -1);
    setMd(next);
  };
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-md="${md}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [md]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea")) return;
      if (e.key === "ArrowLeft") go(md - 1);
      if (e.key === "ArrowRight") go(md + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const byDay = new Map<string, Match[]>();
  for (const m of list) {
    const k = m.kickoff.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(m);
  }
  const playedCount = (n: number) => matches.filter((m) => m.matchday === n && m.status === "ft").length;
  const countIn = (n: number) => matches.filter((m) => m.matchday === n).length || 1;

  return (
    <Panel pad={false}>
      <div className="flex items-center gap-2 border-b px-2 py-2">
        <button onClick={() => go(md - 1)} disabled={md <= 1} className="rounded-md p-1.5 text-fg-3 hover:bg-hover disabled:opacity-30" aria-label="Previous matchday">
          <ChevronLeft size={16} />
        </button>
        <div ref={stripRef} className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
            const p = playedCount(n) / countIn(n);
            return (
              <button
                key={n}
                data-md={n}
                onClick={() => go(n)}
                className={clsx("relative flex h-10 min-w-10 flex-col items-center justify-center rounded-md text-xs transition-colors", n === md ? "text-fg" : "text-fg-3 hover:bg-hover hover:text-fg-2")}
              >
                {n === md && <motion.span layoutId="md-pill" className="absolute inset-0 rounded-md bg-active shadow-ring" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span className="tnum relative font-medium">{n}</span>
                <span className="relative mt-1 h-[2px] w-4 overflow-hidden rounded-full bg-line-strong">
                  <span className="block h-full bg-accent" style={{ width: `${p * 100}%` }} />
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={() => go(md + 1)} disabled={md >= total} className="rounded-md p-1.5 text-fg-3 hover:bg-hover disabled:opacity-30" aria-label="Next matchday">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="relative min-h-[300px] overflow-hidden px-2 py-2">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={md}
            custom={dir}
            initial={{ opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-2 pt-1 pb-2 text-2xs font-medium text-fg-4">
              Matchday {md} · {list.filter((m) => m.status === "ft").length}/{list.length} played · <kbd>←</kbd> <kbd>→</kbd>
            </div>
            {[...byDay.entries()].map(([day, ms]) => (
              <div key={day} className="mb-2">
                <div className="sticky top-0 px-2 py-1 text-xs font-medium text-fg-3">
                  <LocalTime iso={ms[0].kickoff} tz={tz} opts={{ weekday: "long", day: "numeric", month: "long" }} />
                </div>
                {ms.map((m, i) => (
                  <MatchRow key={m.id} m={m} tz={tz} index={i} logos={logos} />
                ))}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </Panel>
  );
}
