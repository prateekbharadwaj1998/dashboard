"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Radio, Star, Tv, ArrowRight, Bell, BellOff } from "lucide-react";
import clsx from "clsx";
import { useBrowserTz } from "@/lib/clientData";
import { addDays, isDayKey } from "@/lib/data/time";
import { localDayOf, useDayMatches, useGoalFlashes } from "@/lib/espn/useDay";
import { compLabel, groupOf, priorityOf, compBySlug } from "@/lib/espn/competitions";
import type { MatchCard } from "@/lib/espn/normalize";
import { useFollowedTeams } from "@/lib/follow";
import { LiveMatchRow, espnMatchHref } from "@/components/live/LiveMatchRow";
import { ScoreRoll } from "@/components/live/ScoreRoll";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { CompLogo } from "@/components/ui/CompLogo";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";

type Filter = "all" | "live" | "upcoming" | "finished";

const fmtDay = (day: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

function useAgo(ts?: number) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 5000);
    return () => clearInterval(id);
  }, []);
  if (!ts) return "—";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  return s < 5 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
}

function DayStrip({ selected, today }: { selected: string; today: string }) {
  const router = useRouter();
  const days = Array.from({ length: 15 }, (_, i) => addDays(selected, i - 7));
  const href = (d: string) => (d === today ? "/" : `/?date=${d}`);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,[cmdk-root]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") router.push(href(addDays(selected, -1)), { scroll: false });
      if (e.key === "ArrowRight") router.push(href(addDays(selected, 1)), { scroll: false });
      if (e.key === "t") router.push("/", { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className="panel flex items-center gap-1 overflow-x-auto p-1.5 [scrollbar-width:none]">
      {days.map((d) => {
        const active = d === selected;
        return (
          <Link
            key={d}
            href={href(d)}
            scroll={false}
            className={clsx(
              "relative flex h-14 min-w-[48px] flex-1 flex-col items-center justify-center rounded-lg transition-colors",
              active ? "text-fg" : "text-fg-3 hover:bg-hover hover:text-fg-2",
            )}
          >
            {active && <motion.span layoutId="day-pill" className="absolute inset-0 rounded-lg bg-active shadow-ring" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className={clsx("relative text-2xs font-medium", d === today && "text-accent-text")}>{d === today ? "Today" : fmtDay(d, { weekday: "short" })}</span>
            <span className="tnum relative text-sm font-semibold">{fmtDay(d, { day: "numeric" })}</span>
          </Link>
        );
      })}
    </div>
  );
}

function LiveRail({ matches, flashes }: { matches: MatchCard[]; flashes: Record<string, "home" | "away"> }) {
  return (
    <div className="edge-fade -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {matches.map((m) => {
        const minute = parseInt(m.status, 10);
        const pct = m.status === "HT" ? 50 : Number.isFinite(minute) ? Math.min(100, (minute / 90) * 100) : 0;
        return (
          <Link
            key={m.id}
            href={espnMatchHref(m.id)}
            className={clsx(
              "relative w-[224px] shrink-0 snap-start overflow-hidden rounded-xl bg-elevated p-3 shadow-elevated transition-transform hover:-translate-y-0.5",
              flashes[m.id] && "ring-1 ring-win/50",
            )}
          >
            <div className="flex items-center justify-between text-2xs text-fg-3">
              <span className="truncate">{compLabel(m.league)}</span>
              <span className="tnum flex items-center gap-1 font-semibold text-live">
                <span className="live-dot" /> {m.status}
              </span>
            </div>
            {(["home", "away"] as const).map((s) => (
              <div key={s} className="mt-1.5 flex items-center gap-2">
                <TeamLogo src={m[s].logo} abbr={m[s].abbr} color={m[s].color} size={20} />
                <span className="flex-1 truncate text-sm">{m[s].short}</span>
                <span className="text-base font-semibold">
                  <ScoreRoll value={m[s].score} />
                </span>
              </div>
            ))}
            <span className="absolute inset-x-0 bottom-0 h-[2px] bg-line">
              <span className="block h-full bg-live transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function CompetitionGroup({
  slug,
  matches,
  flashes,
  index,
  defaultOpen = true,
}: {
  slug: string;
  matches: MatchCard[];
  flashes: Record<string, "home" | "away">;
  index: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const live = matches.filter((m) => m.state === "in").length;
  const comp = compBySlug(slug);
  return (
    <Panel pad={false} delay={Math.min(index, 8) * 0.03}>
      <div className="flex h-11 items-center gap-2.5 px-3">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-expanded={open}>
          <CompLogo slug={slug} size={20} />
          <span className="truncate text-sm font-medium text-fg">{comp?.name ?? slug}</span>
          <span className="tnum text-xs text-fg-4">{matches.length}</span>
          {live > 0 && <span className="rounded-[4px] bg-[color-mix(in_oklab,var(--live)_15%,transparent)] px-1.5 text-[10px] font-semibold text-live">{live} LIVE</span>}
          <motion.span animate={{ rotate: open ? 0 : -90 }} className="text-fg-4">
            <ChevronDown size={14} />
          </motion.span>
        </button>
        <Link href={`/competition?lg=${slug}`} className="shrink-0 text-xs text-fg-3 hover:text-fg">
          Table
        </Link>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-1.5 pb-1.5">
              {matches.map((m, i) => (
                <LiveMatchRow key={m.id} m={m} index={i} flash={flashes[m.id]} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

export function LiveView() {
  const sp = useSearchParams();
  const tz = useBrowserTz();
  const today = tz ? localDayOf(Date.now(), tz) : null;
  const q = sp.get("date") ?? undefined;
  const selected = isDayKey(q) ? q : today;
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const { matches, loaded, error, updatedAt, pollMs } = useDayMatches(selected, tz);
  const { flashes, goals } = useGoalFlashes(matches);
  const followed = useFollowedTeams();
  const ago = useAgo(updatedAt);

  const live = matches.filter((m) => m.state === "in");
  const counts = {
    all: matches.length,
    live: live.length,
    upcoming: matches.filter((m) => m.state === "pre").length,
    finished: matches.filter((m) => m.state === "post").length,
  };
  const visible = matches.filter((m) =>
    filter === "all" ? true : filter === "live" ? m.state === "in" : filter === "upcoming" ? m.state === "pre" : m.state === "post",
  );
  const pinned = visible.filter((m) => followed.ids.has(m.home.id) || followed.ids.has(m.away.id));

  const groups = useMemo(() => {
    const by = new Map<string, MatchCard[]>();
    for (const m of visible) {
      if (!by.has(m.league)) by.set(m.league, []);
      by.get(m.league)!.push(m);
    }
    return [...by.entries()].sort((a, b) => priorityOf(a[0]) - priorityOf(b[0]) || a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((m) => `${m.id}:${m.status}:${m.home.score}:${m.away.score}`).join("|")]);
  const featured = groups.filter(([s]) => groupOf(s));
  const others = groups.filter(([s]) => !groupOf(s));

  // Ambient live state: tab title shows live count.
  useEffect(() => {
    document.title = live.length ? `(${live.length} live) Halfspace` : "Halfspace — Live football";
  }, [live.length]);

  // Opt-in browser notifications for goals (works while this tab is open).
  const [alerts, setAlerts] = useState(false);
  useEffect(() => {
    try {
      setAlerts(localStorage.getItem("halfspace:alerts") === "1" && Notification.permission === "granted");
    } catch {}
  }, []);
  useEffect(() => {
    if (!alerts || !goals.length) return;
    const g = goals[0];
    const relevant = followed.ids.size === 0 || followed.ids.has(g.m.home.id) || followed.ids.has(g.m.away.id);
    if (!relevant) return;
    try {
      new Notification(`GOAL · ${g.m[g.side].short}`, {
        body: `${g.m.home.short} ${g.m.home.score}–${g.m.away.score} ${g.m.away.short} · ${g.m.status}`,
        icon: g.m[g.side].logo,
        tag: g.key,
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals[0]?.key, alerts]);
  const toggleAlerts = async () => {
    if (alerts) {
      setAlerts(false);
      try { localStorage.setItem("halfspace:alerts", "0"); } catch {}
      return;
    }
    try {
      const p = await Notification.requestPermission();
      if (p === "granted") {
        setAlerts(true);
        localStorage.setItem("halfspace:alerts", "1");
      }
    } catch {}
  };

  const goalsToday = matches.reduce((t, m) => t + (m.home.score ?? 0) + (m.away.score ?? 0), 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      {live.length > 0 && <div className="live-hairline" />}
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-[26px] leading-8">Matches</h1>
            <p className="mt-0.5 h-5 text-sm text-fg-3">
              {selected && fmtDay(selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {tz && <span className="text-fg-4"> · {tz.replace(/_/g, " ")}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 text-2xs text-fg-4">
            <span className={clsx("h-1.5 w-1.5 rounded-full", live.length ? "bg-live" : "bg-win")} />
            <span suppressHydrationWarning>
              Live data · updated {ago}
              {pollMs ? ` · refresh ${Math.round(pollMs / 1000)}s` : ""}
            </span>
          </div>
        </div>

        {selected && today && <DayStrip selected={selected} today={today} />}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All ${counts.all || ""}`.trim() },
              { value: "live", label: `Live ${counts.live || ""}`.trim() },
              { value: "upcoming", label: "Upcoming" },
              { value: "finished", label: "Finished" },
            ]}
          />
          <button
            onClick={toggleAlerts}
            className={clsx("inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs shadow-ring transition-colors", alerts ? "bg-accent-soft text-accent-text" : "text-fg-3 hover:text-fg")}
            title={followed.ids.size ? "Notify me when a followed team scores (while this tab is open)" : "Notify me about goals (follow teams to narrow it down)"}
          >
            {alerts ? <Bell size={13} /> : <BellOff size={13} />} Goal alerts
          </button>
          <span className="hidden items-center gap-1 text-2xs text-fg-4 lg:flex">
            <kbd>←</kbd>
            <kbd>→</kbd> days · <kbd>T</kbd> today · <kbd>⌘K</kbd> search
          </span>
        </div>

        {live.length > 0 && filter !== "finished" && filter !== "upcoming" && (
          <section>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-fg-2">
              <Radio size={13} className="text-live" /> Live now
            </div>
            <LiveRail matches={live} flashes={flashes} />
          </section>
        )}

        {!loaded && !error ? (
          <div className="space-y-3" aria-busy aria-label="Loading matches">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="panel space-y-2 p-3">
                <div className="skeleton h-5 w-40" />
                {Array.from({ length: 3 }, (_, j) => (
                  <div key={j} className="skeleton h-9" />
                ))}
              </div>
            ))}
          </div>
        ) : error && !matches.length ? (
          <Panel className="py-10 text-center">
            <p className="text-sm text-fg-2">Live data is unavailable right now.</p>
            <p className="mt-1 text-xs text-fg-4">{error} · retrying automatically</p>
          </Panel>
        ) : visible.length === 0 ? (
          <Panel className="py-12 text-center">
            <p className="text-sm text-fg-2">{filter === "all" ? "No matches on this day." : `No ${filter} matches right now.`}</p>
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="mt-3 text-xs text-accent-text hover:underline">
                Show all matches
              </button>
            )}
          </Panel>
        ) : (
          <div className="space-y-3">
            {pinned.length > 0 && (
              <Panel pad={false}>
                <div className="flex h-11 items-center gap-2 px-3 text-sm font-medium">
                  <Star size={14} className="text-draw" fill="currentColor" /> Following
                </div>
                <div className="px-1.5 pb-1.5">
                  {pinned.map((m, i) => (
                    <LiveMatchRow key={m.id} m={m} index={i} flash={flashes[m.id]} showLeague={compLabel(m.league)} />
                  ))}
                </div>
              </Panel>
            )}
            {featured.map(([slug, ms], i) => (
              <CompetitionGroup key={slug} slug={slug} matches={ms} flashes={flashes} index={i} />
            ))}
            {others.length > 0 && (
              <>
                <button
                  onClick={() => setShowAll((s) => !s)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm text-fg-3 shadow-ring transition-colors hover:bg-hover hover:text-fg"
                >
                  {showAll ? "Hide" : "Show"} {others.length} more competitions · {others.reduce((t, [, ms]) => t + ms.length, 0)} matches
                  <motion.span animate={{ rotate: showAll ? 180 : 0 }}>
                    <ChevronDown size={14} />
                  </motion.span>
                </button>
                {showAll && others.map(([slug, ms], i) => <CompetitionGroup key={slug} slug={slug} matches={ms} flashes={flashes} index={i} />)}
              </>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <Panel title="Today in numbers" delay={0.05}>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Matches", counts.all],
              ["Live", counts.live],
              ["Goals", goalsToday],
            ].map(([label, v]) => (
              <div key={label}>
                <div className="text-2xs text-fg-3">{label}</div>
                <div className={clsx("tnum text-xl font-semibold", label === "Live" && counts.live ? "text-live" : "")}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-2xs text-fg-4">{new Set(matches.map((m) => m.league)).size} competitions worldwide</div>
        </Panel>
        <Panel title="Streamer studio" subtitle="Live scorebugs, tickers and tables for OBS" delay={0.1}>
          <Link
            href="/studio"
            className="group flex items-center justify-between rounded-lg bg-accent-soft px-3 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Tv size={15} /> Build an overlay
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Panel>
        <Panel title="Competitions" delay={0.15} pad={false}>
          <div className="grid grid-cols-1 gap-px px-2 pb-2">
            {["eng.1", "esp.1", "uefa.champions", "fifa.world", "uefa.nations", "ind.1", "ksa.1", "usa.1"].map((s) => (
              <Link key={s} href={`/competition?lg=${s}`} className="flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-fg-2 hover:bg-hover hover:text-fg">
                <CompLogo slug={s} size={16} />
                <span className="truncate">{compBySlug(s)?.name}</span>
              </Link>
            ))}
            <Link href="/competitions" className="mt-1 px-2 text-xs text-accent-text hover:underline">
              All competitions →
            </Link>
          </div>
        </Panel>
      </aside>

      {/* goal toasts */}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {goals.map((g) => {
            const t = g.m[g.side];
            const ev = [...g.m.events].reverse().find((e) => e.team === g.side && e.type !== "yellow" && e.type !== "red");
            return (
              <motion.div
                key={g.key}
                layout
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="pointer-events-auto flex w-72 items-center gap-3 rounded-xl bg-elevated p-3 shadow-modal"
              >
                <TeamLogo src={t.logo} abbr={t.abbr} color={t.color} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-2xs font-bold tracking-wide text-win">GOAL · {compLabel(g.m.league)}</div>
                  <div className="truncate text-sm font-medium">{ev?.player ? `${ev.player} ${ev.minute}` : t.short}</div>
                  <div className="tnum text-xs text-fg-3">
                    {g.m.home.abbr} {g.m.home.score}–{g.m.away.score} {g.m.away.abbr}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
