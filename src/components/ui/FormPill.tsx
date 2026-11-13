"use client";
import type { FormEntry, Outcome } from "@/lib/data/types";
import { teamBySlug } from "@/lib/data/teams";
import Link from "next/link";
import clsx from "clsx";
import { motion } from "motion/react";

const BG: Record<Outcome, string> = { W: "bg-win", D: "bg-draw", L: "bg-loss" };

export function FormPill({ e, size = 18, index = 0, animate = true }: { e: FormEntry; size?: number; index?: number; animate?: boolean }) {
  const opp = teamBySlug(e.opponent)?.short ?? e.opponent;
  const title = `${e.outcome} · ${e.score[0]}–${e.score[1]} ${e.venue === "H" ? "vs" : "at"} ${opp}${e.ht ? ` (HT ${e.ht[0]}–${e.ht[1]})` : ""}`;
  return (
    <motion.span
      initial={animate ? { opacity: 0, scale: 0.6 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30, delay: index * 0.03 }}
      className="group/pill relative inline-flex"
    >
      <Link
        href={`/match/${e.matchId}`}
        aria-label={title}
        className={clsx(
          "inline-flex items-center justify-center rounded-[4px] text-[10px] font-semibold text-black/80 transition-transform duration-100 hover:scale-110",
          BG[e.outcome],
        )}
        style={{ width: size, height: size }}
      >
        {e.outcome}
      </Link>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-elevated px-2 py-1 text-2xs text-fg-2 opacity-0 shadow-elevated transition-all duration-150 group-hover/pill:translate-y-0 group-hover/pill:opacity-100"
      >
        <span className="tnum font-medium text-fg">{e.score[0]}–{e.score[1]}</span> {e.venue === "H" ? "vs" : "at"} {opp}
        {e.ht && <span className="text-fg-4"> · HT {e.ht[0]}–{e.ht[1]}</span>}
      </span>
    </motion.span>
  );
}

export function FormStrip({ form, size }: { form: FormEntry[]; size?: number }) {
  return (
    <span className="inline-flex gap-1">
      {form.map((e, i) => (
        <FormPill key={e.matchId} e={e} index={i} size={size} />
      ))}
    </span>
  );
}
