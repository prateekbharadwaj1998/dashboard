"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import clsx from "clsx";
import { SITE, SITE_V2, useEspn } from "@/lib/espn/client";
import { scoreboardMatches, standingsGroups, type MatchCard } from "@/lib/espn/normalize";
import { compBySlug } from "@/lib/espn/competitions";
import { LiveMatchRow } from "@/components/live/LiveMatchRow";
import { CompLogo } from "@/components/ui/CompLogo";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { Panel } from "@/components/ui/Panel";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { MiniTable } from "./MatchCentre";
import { EmptyState } from "@/components/ui/EmptyState";

type Tab = "matches" | "table" | "stats";

// Our deep-analytics pages exist for the top five leagues (built from openfootball).
const INSIGHTS: Record<string, string> = { "eng.1": "epl", "esp.1": "laliga", "ger.1": "bundesliga", "ita.1": "seriea", "fra.1": "ligue1" };

const monthKey = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
const shiftMonth = (key: string, n: number) => {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(4)) - 1 + n, 1);
  return monthKey(d);
};

function Fixtures({ slug }: { slug: string }) {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const { data, error } = useEspn<unknown>(`${SITE}/${slug}/scoreboard?dates=${month}&limit=500`, { ttl: 60_000, poll: 30_000 });
  const matches = useMemo(() => (data ? scoreboardMatches(data, slug) : []), [data, slug]);
  const byDay = useMemo(() => {
    const m = new Map<string, MatchCard[]>();
    for (const x of matches) {
      const k = new Intl.DateTimeFormat("en-CA").format(new Date(x.date));
      m.set(k, [...(m.get(k) ?? []), x]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches]);
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(Number(month.slice(0, 4)), Number(month.slice(4)) - 1, 1));
  return (
    <Panel pad={false}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="rounded-md p-1.5 text-fg-3 hover:bg-hover" aria-label="Previous month">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium">{label}</span>
        <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="rounded-md p-1.5 text-fg-3 hover:bg-hover" aria-label="Next month">
          <ChevronRight size={16} />
        </button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={month} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="px-1.5 py-1.5">
          {!data && !error ? (
            <div className="space-y-2 p-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-9" />)}</div>
          ) : byDay.length === 0 ? (
            <p className="py-10 text-center text-sm text-fg-4">No matches this month.</p>
          ) : (
            byDay.map(([day, ms]) => (
              <div key={day} className="mb-1">
                <div className="px-2 pt-2 pb-1 text-xs font-medium text-fg-3">
                  {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(ms[0].date))}
                </div>
                {ms.map((m, i) => (
                  <LiveMatchRow key={m.id} m={m} index={i} />
                ))}
              </div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </Panel>
  );
}

function Standings({ slug }: { slug: string }) {
  const { data, error } = useEspn<unknown>(`${SITE_V2}/${slug}/standings`, { ttl: 120_000 });
  const groups = useMemo(() => (data ? standingsGroups(data) : []), [data]);
  if (!data && !error) return <PageSkeleton rows={10} />;
  if (!groups.length) return <Panel className="py-10 text-center text-sm text-fg-4">No table for this competition (knockout or not started).</Panel>;
  const notes = [...new Map(groups.flatMap((g) => g.rows).filter((r) => r.note?.color).map((r) => [r.note!.description, r.note!.color])).entries()];
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Panel key={g.name} title={groups.length > 1 ? g.name : "Table"} pad={false}>
          <MiniTable rows={g.rows} league={slug} />
        </Panel>
      ))}
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-2xs text-fg-3">
          {notes.map(([desc, color]) => (
            <span key={desc} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-[3px] rounded-full" style={{ background: color }} /> {desc}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function Leaders({ slug }: { slug: string }) {
  const { data, error } = useEspn<any>(`${SITE}/${slug}/statistics`, { ttl: 600_000 });
  if (!data && !error) return <PageSkeleton rows={10} />;
  const cats: any[] = data?.stats ?? [];
  if (!cats.length) return <Panel className="py-10 text-center text-sm text-fg-4">No player leaderboards for this competition.</Panel>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cats.map((c) => (
        <Panel key={c.name} title={`Top ${String(c.displayName).toLowerCase()}`} pad={false}>
          <ol className="px-2 pb-2">
            {(c.leaders ?? []).slice(0, 15).map((l: any, i: number) => {
              const a = l.athlete ?? {};
              const team = a.team ?? l.team ?? {};
              const max = c.leaders?.[0]?.value || 1;
              return (
                <li key={a.id ?? i}>
                  <Link href={`/player?id=${a.id}&lg=${slug}`} className="relative flex h-10 items-center gap-2.5 overflow-hidden rounded-md px-2 hover:bg-hover">
                    <motion.span
                      className="absolute inset-y-1 left-0 rounded-r-md bg-accent-soft"
                      initial={{ width: 0 }}
                      animate={{ width: `${(l.value / max) * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.03 }}
                    />
                    <span className="tnum relative w-5 text-xs text-fg-4">{i + 1}</span>
                    {team.logos?.[0]?.href || team.logo ? <TeamLogo src={team.logos?.[0]?.href ?? team.logo} abbr={team.abbreviation} size={18} /> : null}
                    <span className="relative min-w-0 flex-1 truncate text-sm">{a.displayName}</span>
                    <span className="relative text-2xs text-fg-4">{(l.shortDisplayValue ?? "").split(":")[0]?.replace("M", "")} apps</span>
                    <span className="tnum relative w-8 text-right font-semibold">{l.value}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Panel>
      ))}
    </div>
  );
}

export function CompetitionView() {
  const slug = useSearchParams().get("lg") ?? "eng.1";
  const comp = compBySlug(slug);
  const [tab, setTab] = useState<Tab>("matches");
  if (!comp) return <EmptyState title="Competition not found" body={`“${slug}” isn’t one of the ${"220"} competitions in the live feed.`} actions={[{ href: "/competitions", label: "Browse all competitions" }]} />;
  const tabs: { key: Tab; label: string }[] = [
    { key: "matches", label: "Matches" },
    { key: "table", label: "Table" },
    { key: "stats", label: "Top scorers" },
  ];
  return (
    <>
      <div className="hero-glow relative -mx-4 mb-4 overflow-hidden px-4 pt-6 pb-6 md:-mx-8 md:rounded-2xl md:px-8">
        <div className="noise absolute inset-0" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CompLogo slug={slug} size={56} />
            <div>
              <h1 className="display text-gradient text-[28px] leading-9 md:text-[32px] md:leading-10">{comp.name}</h1>
              <p className="text-sm text-fg-3">{comp.tournament ? "Tournament" : "League"} · live from ESPN</p>
            </div>
          </div>
          {INSIGHTS[slug] && (
            <Link href={`/league/${INSIGHTS[slug]}/stats`} className="inline-flex h-8 items-center gap-2 rounded-md bg-accent-soft px-3 text-sm font-medium text-accent-text hover:bg-accent hover:text-white">
              <BarChart3 size={14} /> Season insights
            </Link>
          )}
        </div>
      </div>
      <div className="mb-4 flex gap-1 border-b">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={clsx("relative px-3 pt-1 pb-2.5 text-sm", tab === t.key ? "text-fg" : "text-fg-3 hover:text-fg-2")}>
            {t.label}
            {tab === t.key && <motion.span layoutId="comp-tab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      {tab === "matches" && <Fixtures slug={slug} />}
      {tab === "table" && <Standings slug={slug} />}
      {tab === "stats" && <Leaders slug={slug} />}
    </>
  );
}
