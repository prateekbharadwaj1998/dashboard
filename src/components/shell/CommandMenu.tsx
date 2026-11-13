"use client";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { CalendarDays, GitCompareArrows, Moon, Sun, CornerDownLeft } from "lucide-react";
import { LEAGUES, LEAGUE_BY_ID } from "@/lib/data/leagues";
import { teamBySlug } from "@/lib/data/teams";
import type { LeagueId } from "@/lib/data/types";
import { Crest } from "@/components/ui/Crest";
import { LeagueMark } from "./LeagueMark";
import { usePalette, useTheme } from "./Providers";

export interface SearchTeam {
  slug: string;
  league: LeagueId;
}

const item =
  "flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm text-fg-2 data-[selected=true]:bg-hover data-[selected=true]:text-fg";

export function CommandMenu({ teams }: { teams: SearchTeam[] }) {
  const { open, setOpen } = usePalette();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const gPressed = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, [contenteditable=true]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
        return;
      }
      if (typing || open || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // Linear-style "g then x" navigation
      if (e.key === "g") {
        gPressed.current = Date.now();
        return;
      }
      if (Date.now() - gPressed.current < 900) {
        gPressed.current = 0;
        if (e.key === "m") router.push("/");
        else if (e.key === "c") router.push("/compare");
        else if (/^[1-5]$/.test(e.key)) router.push(`/league/${LEAGUES[+e.key - 1].id}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, router]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[4px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-[16vh] left-1/2 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl bg-elevated shadow-modal"
          >
            <Command label="Command menu" loop>
              <Command.Input
                autoFocus
                placeholder="Search teams, leagues, or jump to…"
                className="h-12 w-full border-b bg-transparent px-4 text-[15px] text-fg outline-none placeholder:text-fg-4 focus-visible:outline-none"
              />
              <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-4">
                <Command.Empty className="px-3 py-8 text-center text-sm text-fg-3">No results.</Command.Empty>
                <Command.Group heading="Navigate">
                  <Command.Item className={item} onSelect={() => go("/")} keywords={["today", "fixtures", "scores"]}>
                    <CalendarDays size={15} className="text-fg-3" /> Matches
                    <span className="ml-auto flex gap-1"><kbd>G</kbd><kbd>M</kbd></span>
                  </Command.Item>
                  <Command.Item className={item} onSelect={() => go("/compare")} keywords={["versus", "vs", "head to head"]}>
                    <GitCompareArrows size={15} className="text-fg-3" /> Compare teams
                    <span className="ml-auto flex gap-1"><kbd>G</kbd><kbd>C</kbd></span>
                  </Command.Item>
                  <Command.Item className={item} onSelect={() => { toggle(); setOpen(false); }} keywords={["theme", "dark", "light", "mode"]}>
                    {theme === "dark" ? <Sun size={15} className="text-fg-3" /> : <Moon size={15} className="text-fg-3" />}
                    Switch to {theme === "dark" ? "light" : "dark"} theme
                  </Command.Item>
                </Command.Group>
                <Command.Group heading="Leagues">
                  {LEAGUES.map((l, i) => (
                    <Command.Item key={l.id} className={item} value={`${l.name} ${l.country}`} onSelect={() => go(`/league/${l.id}`)}>
                      <LeagueMark id={l.id} size={16} /> {l.name}
                      <span className="text-fg-4">{l.country}</span>
                      <span className="ml-auto flex gap-1"><kbd>G</kbd><kbd>{i + 1}</kbd></span>
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Teams">
                  {teams.map((t) => {
                    const id = teamBySlug(t.slug);
                    return (
                      <Command.Item
                        key={t.slug}
                        className={item}
                        value={`${id?.short} ${id?.name} ${id?.abbr}`}
                        onSelect={() => go(`/team/${t.slug}`)}
                      >
                        <Crest slug={t.slug} size={18} />
                        {id?.short}
                        <span className="truncate text-fg-4">{LEAGUE_BY_ID[t.league].name}</span>
                        <CornerDownLeft size={13} className="ml-auto text-fg-4 opacity-0 [[data-selected=true]_&]:opacity-100" />
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              </Command.List>
              <div className="flex items-center gap-3 border-t px-4 py-2 text-2xs text-fg-4">
                <span className="flex items-center gap-1"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd>↵</kbd> open</span>
                <span className="flex items-center gap-1"><kbd>esc</kbd> close</span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
