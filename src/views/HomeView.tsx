"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import clsx from "clsx";
import { useBrowserTz } from "@/lib/clientData";
import { addDays, isDayKey } from "@/lib/data/time";
import { localDayOf, useDayMatches, useGoalFlashes } from "@/lib/espn/useDay";
import { rankMatches } from "@/lib/espn/importance";
import { compBySlug, compLabel, isRedundantNote } from "@/lib/espn/competitions";
import type { MatchCard } from "@/lib/espn/normalize";
import { useFollowedTeams } from "@/lib/follow";
import { LiveMatchRow, espnMatchHref } from "@/components/live/LiveMatchRow";
import { ScoreRoll } from "@/components/live/ScoreRoll";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { CompLogo } from "@/components/ui/CompLogo";
import { LocalTime } from "@/components/match/LocalTime";

// Non-featured competitions max out at 35 when live, so they never take the hero
// (unless a followed team plays); any featured competition does.
const HERO_MIN = 40;
const fmtDay = (day: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

function minuteOf(m: MatchCard) {
  if (m.status === "HT") return 45;
  return parseInt(m.status, 10) || 0;
}

function Countdown({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.max(0, Math.round((Date.parse(iso) - now) / 60_000));
  if (mins <= 0) return <>Kicking off</>;
  if (mins < 60) return <>In {mins} min</>;
  const h = Math.floor(mins / 60);
  return (
    <>
      In {h}h {mins % 60 ? `${mins % 60}m` : ""}
    </>
  );
}

function FormPips({ form }: { form?: string }) {
  if (!form) return null;
  return (
    <span className="flex gap-0.5">
      {form.slice(-5).split("").map((r, i) => (
        <span key={i} className={clsx("h-1.5 w-3 rounded-full", r === "W" ? "bg-win" : r === "L" ? "bg-loss" : "bg-draw")} title={r} />
      ))}
    </span>
  );
}

/** The one thing to look at. Live → Next up → Result of the day. */
function Hero({ m, kind, flash }: { m: MatchCard; kind: "live" | "next" | "result"; flash?: "home" | "away" }) {
  const live = kind === "live";
  const comp = compBySlug(m.league);
  const scorers = (side: "home" | "away") => m.events.filter((e) => e.team === side && e.type !== "yellow");
  const pct = Math.min(100, (minuteOf(m) / 90) * 100);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
      <Link
        href={espnMatchHref(m.id)}
        className={clsx("hero-glow group relative block overflow-hidden rounded-2xl p-5 shadow-elevated transition-transform duration-200 hover:-translate-y-0.5 md:p-6", live ? "bg-elevated" : "bg-panel")}
        style={{ ["--team-glow" as string]: `color-mix(in oklab, ${m.home.color ?? "#5e6ad2"} 18%, transparent)`, ["--glow-x" as string]: "20%" }}
      >
        <div className="noise absolute inset-0" />
        <div className="relative flex items-center justify-between gap-3 text-xs text-fg-3">
          <span className="flex min-w-0 items-center gap-2">
            <CompLogo slug={m.league} size={18} />
            <span className="truncate">
              {comp?.name ?? compLabel(m.league)}
              {m.note && !isRedundantNote(m.note, m.league) ? <span className="text-fg-4"> · {m.note}</span> : null}
            </span>
          </span>
          <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold", live ? "bg-[color-mix(in_oklab,var(--live)_16%,transparent)] text-live" : "bg-hover text-fg-3")}>
            {live ? "LIVE" : kind === "next" ? "NEXT UP" : "RESULT"}
          </span>
        </div>
        <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {(["home", "away"] as const).map((s, i) => (
            <div key={s} className={clsx("flex min-w-0 flex-col items-center gap-2 text-center", i === 1 && "order-3")}>
              <TeamLogo src={m[s].logo} abbr={m[s].abbr} color={m[s].color} size={56} />
              <span className={clsx("max-w-full truncate text-base font-semibold md:text-lg", flash === s && "text-win")}>{m[s].short}</span>
              {kind === "next" ? (
                <FormPips form={m[s].form} />
              ) : (
                <ul className="min-h-4 space-y-0.5 text-[11px] text-fg-3">
                  {scorers(s).slice(0, 3).map((e, k) => (
                    <li key={k} className="tnum">
                      {e.type === "red" && <span className="mr-1 inline-block h-2 w-1.5 rounded-[1px] bg-[#E5484D] align-[-1px]" />}
                      {(e.player ?? "").split(" ").slice(-1)[0]} {e.minute}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div className="order-2 flex flex-col items-center">
            {kind === "next" ? (
              <>
                <span className="display tnum text-[34px] leading-10">
                  <LocalTime iso={m.date} opts={{ hour: "2-digit", minute: "2-digit", hour12: false }} />
                </span>
                <span className="text-xs text-fg-3">
                  <Countdown iso={m.date} />
                </span>
              </>
            ) : (
              <>
                <span className="display flex items-center gap-2 text-[44px] leading-[52px] md:text-[52px]">
                  <ScoreRoll value={m.home.score} />
                  <span className="text-fg-4">–</span>
                  <ScoreRoll value={m.away.score} />
                </span>
                <span className={clsx("tnum text-xs font-semibold", live ? "text-live" : "text-fg-3")}>
                  {live && <span className="live-dot mr-1.5 inline-block align-middle" />}
                  {m.status}
                </span>
              </>
            )}
          </div>
        </div>
        {live && (
          <div className="relative mt-5 h-[3px] overflow-hidden rounded-full bg-line">
            <motion.span className="block h-full bg-live" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "linear" }} />
          </div>
        )}
        <div className="relative mt-4 flex items-center justify-end text-xs font-medium text-accent-text">
          Match centre <ArrowRight size={13} className="ml-1 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}

function LiveChip({ m, active, onClick, flash }: { m: MatchCard; active: boolean; onClick: () => void; flash?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 text-xs shadow-ring transition-colors",
        active ? "bg-active text-fg" : "text-fg-2 hover:bg-hover",
        flash && "ring-1 ring-win/60",
      )}
    >
      <TeamLogo src={m.home.logo} abbr={m.home.abbr} size={16} />
      <span className="font-medium">{m.home.abbr}</span>
      <span className="tnum font-semibold">
        {m.home.score ?? 0}–{m.away.score ?? 0}
      </span>
      <span className="font-medium">{m.away.abbr}</span>
      <TeamLogo src={m.away.logo} abbr={m.away.abbr} size={16} />
      <span className="tnum text-live">{m.status}</span>
    </button>
  );
}

export function HomeView() {
  const sp = useSearchParams();
  const tz = useBrowserTz();
  const today = tz ? localDayOf(Date.now(), tz) : null;
  const q = sp.get("date") ?? undefined;
  const day = isDayKey(q) ? q : today;
  const { matches, loaded, error, updatedAt, pollMs } = useDayMatches(day, tz);
  const { flashes, goals } = useGoalFlashes(matches);
  const followed = useFollowedTeams();
  const [expanded, setExpanded] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const heroRef = useRef<{ id: string; score: number; endedAt?: number } | null>(null);
  const [hintDismissed, setHintDismissed] = useState(true);
  useEffect(() => {
    try {
      setHintDismissed(localStorage.getItem("halfspace:hint:follow") === "1");
    } catch {}
  }, []);

  const ranked = useMemo(() => rankMatches(matches, followed.ids), [matches, followed.ids]);
  const live = ranked.filter((x) => x.m.state === "in");
  const isToday = day === today;

  // ---- hero selection (sticky: only swap on a clear upgrade, or 5 min after FT)
  const hero = useMemo(() => {
    const byId = new Map(ranked.map((x) => [x.m.id, x]));
    if (chosen && byId.get(chosen)?.m.state === "in") return { ...byId.get(chosen)!, kind: "live" as const };
    const eligible = live.filter((x) => x.s >= HERO_MIN || followed.ids.has(x.m.home.id) || followed.ids.has(x.m.away.id));
    const cur = heroRef.current && byId.get(heroRef.current.id);
    if (cur) {
      const best = eligible[0];
      const stillLive = cur.m.state === "in";
      const recentFt = cur.m.state === "post" && Date.now() - (heroRef.current!.endedAt ?? Date.now()) < 5 * 60_000;
      if ((stillLive && !(best && best.m.id !== cur.m.id && best.s - cur.s >= 15)) || recentFt) {
        return { ...cur, kind: stillLive ? ("live" as const) : ("result" as const) };
      }
    }
    if (eligible[0]) return { ...eligible[0], kind: "live" as const };
    const next = ranked.find((x) => x.m.state === "pre" && (!isToday || Date.parse(x.m.date) - Date.now() < 6 * 3600_000));
    if (next) return { ...next, kind: "next" as const };
    const result = ranked.find((x) => x.m.state === "post");
    if (result) return { ...result, kind: "result" as const };
    const anyNext = ranked.find((x) => x.m.state === "pre");
    return anyNext ? { ...anyNext, kind: "next" as const } : null;
  }, [ranked, live, chosen, followed.ids, isToday]);

  useEffect(() => {
    if (!hero) return;
    const prev = heroRef.current;
    heroRef.current = {
      id: hero.m.id,
      score: hero.s,
      endedAt: hero.m.state === "post" ? (prev?.id === hero.m.id ? prev.endedAt ?? Date.now() : Date.now()) : undefined,
    };
  }, [hero]);

  const otherLive = live.filter((x) => x.m.id !== hero?.m.id);
  const lowTierLiveOnly = live.length > 0 && hero?.kind !== "live";
  const top = ranked.filter((x) => x.m.id !== hero?.m.id && !(hero?.kind === "live" && x.m.state === "in" && otherLive.slice(0, 5).some((o) => o.m.id === x.m.id)));
  const shown = top.slice(0, expanded ? 20 : 8);
  // Pick by importance, then read like a schedule: live first, then upcoming by
  // kick-off, then results (latest first).
  const sections = (
    [
      { key: "in", label: "Live", items: shown.filter((x) => x.m.state === "in") },
      { key: "pre", label: "Upcoming", items: shown.filter((x) => x.m.state === "pre").sort((a, b) => a.m.date.localeCompare(b.m.date)) },
      { key: "post", label: "Results", items: shown.filter((x) => x.m.state === "post").sort((a, b) => b.m.date.localeCompare(a.m.date)) },
    ] as const
  ).filter((sec) => sec.items.length);
  const comps = new Set(matches.map((m) => m.league)).size;
  const stale = updatedAt && pollMs && Date.now() - updatedAt > 2 * pollMs + 30_000;

  useEffect(() => {
    document.title = live.length ? `(${live.length} live) Halfspace` : "Halfspace — Live football";
  }, [live.length]);

  const prevDay = day ? addDays(day, -1) : null;
  const nextDay = day ? addDays(day, 1) : null;
  const dayHref = (d: string) => (d === today ? "/" : `/?date=${d}`);
  const topIds = new Set(ranked.slice(0, 20).map((x) => x.m.id));

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      {live.length > 0 && <div className="live-hairline" />}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="display text-[26px] leading-8">{isToday ? "Today" : day ? fmtDay(day, { weekday: "long", day: "numeric", month: "short" }) : "Today"}</h1>
          {day && isToday && <p className="text-sm text-fg-3">{fmtDay(day, { weekday: "long", day: "numeric", month: "long" })}</p>}
          {!isToday && today && (
            <Link href="/" className="text-sm text-accent-text hover:underline">
              Back to today
            </Link>
          )}
        </div>
        {day && (
          <div className="flex items-center gap-1 rounded-lg p-0.5 shadow-ring">
            <Link href={dayHref(prevDay!)} scroll={false} aria-label="Previous day" className="rounded-md p-1.5 text-fg-3 hover:bg-hover hover:text-fg">
              <ChevronLeft size={16} />
            </Link>
            <span className="px-1 text-xs font-medium text-fg-2">{fmtDay(day, { weekday: "short", day: "numeric", month: "short" })}</span>
            <Link href={dayHref(nextDay!)} scroll={false} aria-label="Next day" className="rounded-md p-1.5 text-fg-3 hover:bg-hover hover:text-fg">
              <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </div>

      {stale && <p className="rounded-md bg-hover px-3 py-2 text-xs text-fg-3">Scores may be delayed · reconnecting…</p>}

      {!loaded && !error ? (
        <div className="space-y-3" aria-busy aria-label="Loading">
          <div className="skeleton h-[240px] !rounded-2xl" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-11" />
          ))}
        </div>
      ) : error && !matches.length ? (
        <div className="panel px-6 py-10 text-center text-sm text-fg-2">Can&apos;t reach live scores. Retrying…</div>
      ) : !hero ? (
        <div className="panel px-6 py-12 text-center">
          <p className="text-base font-medium">No matches {isToday ? "today" : "on this day"}.</p>
          {nextDay && (
            <Link href={dayHref(nextDay)} className="mt-3 inline-flex items-center gap-1 text-sm text-accent-text hover:underline">
              Next day <ArrowRight size={13} />
            </Link>
          )}
        </div>
      ) : (
        <>
          {lowTierLiveOnly && (
            <Link href={`/matches?state=live${q ? `&date=${q}` : ""}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-fg-2 shadow-ring hover:bg-hover">
              <span className="live-dot" /> Live now: {live.length} lower-league match{live.length > 1 ? "es" : ""}
              <ArrowRight size={12} className="ml-auto" />
            </Link>
          )}

          <AnimatePresence mode="popLayout">
            <Hero key={hero.m.id} m={hero.m} kind={hero.kind} flash={flashes[hero.m.id]} />
          </AnimatePresence>

          {hero.kind === "live" && otherLive.length > 0 && (
            <div className="edge-fade -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {otherLive.slice(0, 5).map((x) => (
                <LiveChip key={x.m.id} m={x.m} active={false} flash={!!flashes[x.m.id]} onClick={() => setChosen(x.m.id)} />
              ))}
              {otherLive.length > 5 && (
                <Link href="/matches?state=live" className="flex h-9 shrink-0 items-center rounded-full px-3 text-xs text-fg-3 shadow-ring hover:bg-hover">
                  +{otherLive.length - 5} live
                </Link>
              )}
            </div>
          )}

          <section>
            <div className="mb-2 flex items-end justify-between px-1">
              <h2 className="text-sm font-medium">Top matches</h2>
              <span className="text-2xs text-fg-4">Ranked by competition, stage and what&apos;s live</span>
            </div>
            <div className="panel px-1.5 py-1.5">
              {sections.map((sec, si) => (
                <div key={sec.key} className={clsx(si > 0 && "mt-1.5 border-t border-line pt-1.5")}>
                  <div className="px-2 pt-1 pb-0.5 text-2xs font-medium tracking-wide text-fg-4 uppercase">
                    {sec.label}
                  </div>
                  {sec.items.map((x, i) => (
                    <LiveMatchRow key={x.m.id} m={x.m} index={si * 3 + i} flash={flashes[x.m.id]} showLeague={compLabel(x.m.league)} />
                  ))}
                </div>
              ))}
              {!shown.length && <p className="py-6 text-center text-sm text-fg-4">That&apos;s the only match of note today.</p>}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
              {top.length > 8 && (
                <button onClick={() => setExpanded((e) => !e)} className="cursor-pointer rounded-md px-2 py-1 text-sm text-fg-2 hover:bg-hover hover:text-fg">
                  {expanded ? "Show less" : `Show more (${Math.min(12, top.length - 8)})`}
                </button>
              )}
              <Link href={`/matches${q ? `?date=${q}` : ""}`} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-accent-text hover:underline">
                See all {matches.length} matches · {comps} competitions <ArrowRight size={13} />
              </Link>
            </div>
          </section>

          {!hintDismissed && followed.ids.size === 0 && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-fg-3 shadow-ring">
              Follow teams to always see their matches first.
              <button
                aria-label="Dismiss"
                onClick={() => {
                  setHintDismissed(true);
                  try {
                    localStorage.setItem("halfspace:hint:follow", "1");
                  } catch {}
                }}
                className="ml-auto cursor-pointer rounded p-0.5 hover:bg-hover"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </>
      )}

      {/* goal toasts — only for top or followed matches */}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {goals
            .filter((g) => topIds.has(g.m.id) || followed.ids.has(g.m.home.id) || followed.ids.has(g.m.away.id))
            .map((g) => {
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
