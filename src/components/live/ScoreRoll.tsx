"use client";
import { AnimatePresence, motion } from "motion/react";

const snap = { type: "spring", stiffness: 420, damping: 32, mass: 0.8 } as const;

/** A score digit that rolls up when it changes (never re-counts from zero). */
export function ScoreRoll({ value, className }: { value: number | undefined; className?: string }) {
  return (
    <span className={`relative inline-flex h-[1.15em] min-w-[0.62em] justify-center overflow-hidden tnum ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value ?? "-"}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={snap}
          className="block leading-[1.15em]"
        >
          {value ?? "–"}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
