"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { teamBySlug } from "@/lib/data/teams";
import { LEAGUE_BY_ID } from "@/lib/data/leagues";
import type { LeagueId } from "@/lib/data/types";
import { Crest } from "./Crest";

export function TeamPicker({ param, value, teams, accent }: { param: "a" | "b"; value: string; teams: { slug: string; league: LeagueId }[]; accent: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return teams.filter((t) => {
      const id = teamBySlug(t.slug);
      return !needle || `${id?.short} ${id?.name} ${id?.abbr}`.toLowerCase().includes(needle);
    });
  }, [q, teams]);
  const pick = (slug: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set(param, slug);
    router.push(`/compare?${next}`, { scroll: false });
    setOpen(false);
    setQ("");
  };
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center gap-3 rounded-lg bg-panel px-3 text-left shadow-ring transition-colors hover:bg-hover"
      >
        <span className="h-6 w-[3px] rounded-full" style={{ background: accent }} />
        <Crest slug={value} size={22} />
        <span className="flex-1 truncate text-sm font-medium">{teamBySlug(value)?.short}</span>
        <ChevronsUpDown size={14} className="text-fg-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl bg-elevated shadow-modal"
          >
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search teams…"
              className="h-10 w-full border-b bg-transparent px-3 text-sm outline-none placeholder:text-fg-4"
            />
            <div className="max-h-72 overflow-y-auto p-1">
              {list.map((t) => (
                <button key={t.slug} onClick={() => pick(t.slug)} className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm text-fg-2 hover:bg-hover hover:text-fg">
                  <Crest slug={t.slug} size={16} />
                  <span className="flex-1 truncate">{teamBySlug(t.slug)?.short}</span>
                  <span className="text-2xs text-fg-4">{LEAGUE_BY_ID[t.league].name}</span>
                </button>
              ))}
              {!list.length && <div className="px-2 py-4 text-center text-sm text-fg-4">No teams</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
