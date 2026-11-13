"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

/** Frequency of final scorelines - sequential single-hue (accent), light → dark by count. */
export function ScorelineGrid({ grid, max, cap, total }: { grid: number[][]; max: number; cap: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <div ref={ref}>
      <div className="flex">
        <div className="flex w-5 items-center justify-center text-[10px] text-fg-4">
          <span className="[writing-mode:vertical-rl] rotate-180">Home goals</span>
        </div>
        <div className="flex-1">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `16px repeat(${cap + 1}, minmax(0,1fr))` }}>
            {grid.map((row, h) => (
              <div key={h} className="contents">
                <div className="tnum flex items-center justify-center text-[10px] text-fg-4">{h === cap ? `${cap}+` : h}</div>
                {row.map((v, a) => {
                  const t = max ? v / max : 0;
                  return (
                    <motion.div
                      key={a}
                      title={`${h}${h === cap ? "+" : ""}–${a}${a === cap ? "+" : ""}: ${v} matches (${total ? ((v / total) * 100).toFixed(1) : 0}%)`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={inView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ type: "spring", stiffness: 380, damping: 26, delay: (h + a) * 0.03 }}
                      className="tnum flex aspect-[1.35] items-center justify-center rounded-[4px] text-[11px] font-medium transition-[filter] hover:brightness-125"
                      style={{
                        background: v ? `color-mix(in oklab, var(--accent) ${12 + t * 78}%, var(--bg-panel))` : "var(--bg-hover)",
                        color: t > 0.45 ? "#fff" : v ? "var(--text-secondary)" : "var(--text-quaternary)",
                      }}
                    >
                      {v || ""}
                    </motion.div>
                  );
                })}
              </div>
            ))}
            <div />
            {grid[0].map((_, a) => (
              <div key={a} className="tnum text-center text-[10px] text-fg-4">
                {a === cap ? `${cap}+` : a}
              </div>
            ))}
          </div>
          <div className="mt-1 text-center text-[10px] text-fg-4">Away goals</div>
        </div>
      </div>
    </div>
  );
}
