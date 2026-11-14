"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Menu, Moon, Search, Sun } from "lucide-react";
import { motion } from "motion/react";
import { LEAGUE_BY_ID, SEASONS, isLeagueId } from "@/lib/data/leagues";
import { seasonHref, splitSeason } from "@/lib/paths";
import { teamBySlug } from "@/lib/data/teams";
import { Segmented } from "@/components/ui/Segmented";
import type { SeasonId } from "@/lib/data/types";
import { useMobileNav, usePalette, useTheme } from "./Providers";
import { Suspense } from "react";

function useCrumbs(): { label: string; href?: string }[] {
  const pathname = usePathname() ?? "/";
  const sp = useSearchParams();
  const { season, rest } = splitSeason(pathname);
  const parts = rest.split("/").filter(Boolean);
  const href = (p: string) => seasonHref(p, season);
  if (!parts.length) return [{ label: "Matches" }];
  if (parts[0] === "league" && parts[1] && isLeagueId(parts[1])) {
    const c: { label: string; href?: string }[] = [{ label: "Leagues" }, { label: LEAGUE_BY_ID[parts[1]].name, href: href(`/league/${parts[1]}`) }];
    if (parts[2]) c.push({ label: parts[2] === "stats" ? "Insights" : parts[2][0].toUpperCase() + parts[2].slice(1) });
    return c;
  }
  if (parts[0] === "team" && parts[1]) return [{ label: "Teams" }, { label: teamBySlug(parts[1])?.short ?? parts[1] }];
  if (parts[0] === "match") {
    const id = sp.get("id") ?? "";
    const lg = id.split("-")[0];
    const [h, a] = id.split("-").slice(2).join("-").split("-v-");
    if (!isLeagueId(lg) || !h || !a) return [{ label: "Match" }];
    return [
      { label: LEAGUE_BY_ID[lg].name, href: `/league/${lg}` },
      { label: `${teamBySlug(h)?.short ?? h} vs ${teamBySlug(a)?.short ?? a}` },
    ];
  }
  if (parts[0] === "compare") return [{ label: "Compare" }];
  const LABELS: Record<string, string> = { competition: "Competition", competitions: "Competitions", team: "Team", player: "Player", studio: "Streamer studio", glance: "Glance" };
  if (LABELS[parts[0]]) return [{ label: LABELS[parts[0]] }];
  return [{ label: parts[0] }];
}

function SeasonSwitch() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { season, rest } = splitSeason(pathname);
  // Season switching only applies to the archive analytics pages.
  if (!/^\/(league|team\/|compare)/.test(rest)) return null;
  return (
    <Segmented<SeasonId>
      value={season}
      onChange={(v) => {
        const qs = sp.toString();
        router.push(seasonHref(rest, v) + (qs ? `?${qs}` : ""), { scroll: false });
      }}
      options={SEASONS.map((s) => ({ value: s, label: s.replace("-", "/") }))}
    />
  );
}

function Breadcrumbs() {
  const crumbs = useCrumbs();
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {crumbs.map((c, i) => (
        <motion.span
          key={`${c.label}-${i}`}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.2 }}
          className="flex min-w-0 items-center gap-1.5"
        >
          {i > 0 && <ChevronRight size={13} className="shrink-0 text-fg-4" />}
          {c.href && i < crumbs.length - 1 ? (
            <Link href={c.href} className="truncate text-fg-3 hover:text-fg">
              {c.label}
            </Link>
          ) : (
            <span className={i === crumbs.length - 1 ? "truncate font-medium text-fg" : "truncate text-fg-3"}>{c.label}</span>
          )}
        </motion.span>
      ))}
    </nav>
  );
}

export function Topbar() {
  const { theme, toggle } = useTheme();
  const { setOpen } = usePalette();
  const nav = useMobileNav();
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b bg-app/80 px-4 backdrop-blur-xl md:px-6">
      <button className="-ml-1 rounded-md p-1 text-fg-3 hover:bg-hover md:hidden" onClick={() => nav.setOpen(true)} aria-label="Open menu">
        <Menu size={18} />
      </button>
      <Suspense>
        <Breadcrumbs />
      </Suspense>
      <div className="ml-auto flex items-center gap-2">
        <Suspense>
          <SeasonSwitch />
        </Suspense>
        <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-fg-3 hover:bg-hover hover:text-fg md:hidden" aria-label="Search">
          <Search size={16} />
        </button>
        <button
          onClick={toggle}
          className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-hover hover:text-fg"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} className="block">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </motion.span>
        </button>
      </div>
    </header>
  );
}
