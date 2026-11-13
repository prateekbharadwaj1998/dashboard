"use client";
import { motion } from "motion/react";

/** Thin segmented bar of one whole (e.g. home win / draw / away win share). */
export function OutcomeBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full">
        {parts.map((p, i) =>
          p.value > 0 ? (
            <motion.div
              key={p.label}
              title={`${p.label}: ${((p.value / total) * 100).toFixed(0)}%`}
              initial={{ flexGrow: 0.0001 }}
              animate={{ flexGrow: p.value / total }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.08 }}
              className="h-full basis-0"
              style={{ background: p.color }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-2 flex justify-between text-2xs">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5 text-fg-3">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
            {p.label} <span className="tnum font-medium text-fg-2">{((p.value / total) * 100).toFixed(0)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
