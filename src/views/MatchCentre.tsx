"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Users, Whistle, X, Tv } from "lucide-react";
import clsx from "clsx";
import { SITE, useEspn } from "@/lib/espn/client";
import { matchDetail, type LineupPlayer, type MatchDetail } from "@/lib/espn/normalize";
import { compLabel } from "@/lib/espn/competitions";
import { useFollowedTeams } from "@/lib/follow";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { CompLogo } from "@/components/ui/CompLogo";
import { Panel } from "@/components/ui/Panel";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { LocalTime } from "@/components/match/LocalTime";
import { ScoreRoll } from "@/components/live/ScoreRoll";
import { Pitch, BenchList } from "@/components/matchcentre/Pitch";
import { Timeline } from "@/components/matchcentre/Timeline";
import { Pulse } from "@/components/matchcentre/Pulse";
import { StatBars } from "@/components/matchcentre/StatBars";
import { RatingChip } from "@/components/matchcentre/RatingChip";
import { sideColors } from "@/components/matchcentre/colors";
import { ratingStyle } from "@/lib/espn/rating";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { Tabs, TabPanels, useUrlTab } from "@/components/ui/Tabs";
import { PhotoCredit } from "@/components/ui/PhotoCredit";

type Tab = "overview" | "lineups" | "stats" | "commentary" | "table" | "h2h";

function FollowTeam({ id, name, logo, league }: { id: string; name: string; logo?: string; league: string }) {
  const f = useFollowedTeams();
  const on = f.ids.has(id);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        f.toggle({ id, name, logo, league });
      }}
      className={clsx("rounded-full px-2 py-0.5 text-2xs font-medium shadow-ring transition-colors", on ? "bg-accent-soft text-accent-text" : "text-fg-3 hover:text-fg")}
    >
      {on ? "★ Following" : "☆ Follow"}
    </button>
  );
}

function Hero({ d }: { d: MatchDetail }) {
  const m = d.card;
  const [hc, ac] = sideColors(m.home.color, m.away.color);
  const scorers = (side: "home" | "away") =>
    d.events.filter((e) => e.side === side && /goal|penalty$/.test(e.kind) && e.kind !== "penalty-miss");
  const reds = (side: "home" | "away") => d.events.filter((e) => e.side === side && e.kind === "red");
  const side = (s: "home" | "away") => {
    const t = m[s];
    return (
      <div className={clsx("flex min-w-0 flex-1 flex-col items-center gap-2 text-center")}>
        <Link href={`/team?id=${t.id}&lg=${d.leagueSlug}`} className="group flex flex-col items-center gap-2.5">
          <motion.span initial={{ opacity: 0, scale: 0.85, x: s === "home" ? -16 : 16 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
            <TeamLogo src={t.logo} abbr={t.abbr} color={t.color} size={72} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
          </motion.span>
          <span className="max-w-full truncate text-base font-semibold md:text-lg">{t.short}</span>
        </Link>
        <FollowTeam id={t.id} name={t.name} logo={t.logo} league={d.leagueSlug} />
        <ul className="space-y-0.5 text-xs text-fg-3">
          {scorers(s).map((e) => (
            <li key={e.id} className="tnum">
              {e.player?.split(" ").slice(-1)[0]} {e.minute}
              {e.kind === "penalty" ? " (P)" : e.kind === "own-goal" ? " (OG)" : ""}
            </li>
          ))}
          {reds(s).map((e) => (
            <li key={e.id} className="tnum text-loss">
              <span className="mr-1 inline-block h-2.5 w-[7px] rounded-[1.5px] bg-[#E5484D] align-[-1px]" />
              {e.player?.split(" ").slice(-1)[0]} {e.minute}
            </li>
          ))}
        </ul>
      </div>
    );
  };
  const live = m.state === "in";
  return (
    <div
      className="hero-glow relative -mx-4 mb-4 overflow-hidden px-4 pt-5 pb-6 md:-mx-8 md:rounded-2xl md:px-8"
      style={{ ["--team-glow" as string]: `color-mix(in oklab, ${hc} 20%, transparent)`, ["--glow-x" as string]: "18%" }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(40% 60% at 82% 0%, color-mix(in oklab, ${ac} 18%, transparent), transparent 70%)` }} />
      <div className="noise absolute inset-0" />
      <div className="relative flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-fg-3">
        <Link href={`/competition?lg=${d.leagueSlug}`} className="inline-flex items-center gap-1.5 hover:text-fg">
          <CompLogo slug={d.leagueSlug} size={16} /> {d.leagueName || compLabel(d.leagueSlug)}
        </Link>
        {m.note && !(d.leagueName || "").toLowerCase().includes(m.note.toLowerCase()) && (
          <>
            <span className="text-fg-4">·</span>
            <span>{m.note}</span>
          </>
        )}
        <span className="text-fg-4">·</span>
        <LocalTime iso={m.date} opts={{ weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }} />
      </div>
      <div className="relative mx-auto mt-6 flex max-w-3xl items-start justify-between gap-3">
        {side("home")}
        <div className="flex shrink-0 flex-col items-center pt-2">
          {m.home.score != null && m.away.score != null ? (
            <div className={clsx("display flex items-center gap-3 text-[52px] leading-[60px] md:text-[64px]", live && "text-fg")}>
              <ScoreRoll value={m.home.score} />
              <span className="text-fg-4">–</span>
              <ScoreRoll value={m.away.score} />
            </div>
          ) : (
            <div className="display pt-3 text-[28px] text-fg-3">
              <LocalTime iso={m.date} opts={{ hour: "2-digit", minute: "2-digit", hour12: false }} />
            </div>
          )}
          <div className="mt-1 text-xs">
            {live ? (
              <span className="flex items-center gap-1.5 font-semibold text-live">
                <span className="live-dot" /> {m.status === "HT" ? "Half-time" : m.status}
              </span>
            ) : (
              <span className="text-fg-3">{m.state === "pre" ? (/PP|Canc/.test(m.status) ? m.statusLong : "Kick-off") : m.statusLong}</span>
            )}
          </div>
          {(m.home.shootout != null || m.away.shootout != null) && (
            <div className="tnum mt-1 rounded-md bg-hover px-2 py-0.5 text-xs text-fg-2">
              Penalties {m.home.shootout ?? 0}–{m.away.shootout ?? 0}
            </div>
          )}
        </div>
        {side("away")}
      </div>
      <div className="relative mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-2xs text-fg-4">
        {d.venue && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} /> {d.venue}
            {d.city ? `, ${d.city}` : ""}
          </span>
        )}
        {d.attendance && (
          <span className="tnum inline-flex items-center gap-1">
            <Users size={11} /> {d.attendance.toLocaleString()}
          </span>
        )}
        {d.referee && (
          <span className="inline-flex items-center gap-1">
            <Whistle size={11} /> {d.referee}
          </span>
        )}
        <Link href={`/studio?match=${m.id}`} className="inline-flex items-center gap-1 text-accent-text hover:underline">
          <Tv size={11} /> Stream overlay
        </Link>
      </div>
    </div>
  );
}

function PlayerSheet({ p, onClose, league, teamName }: { p: LineupPlayer | null; onClose: () => void; league: string; teamName?: string }) {
  return (
    <AnimatePresence>
      {p && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 right-0 z-50 w-[min(380px,92vw)] overflow-y-auto bg-elevated p-5 shadow-modal"
          >
            <button onClick={onClose} className="absolute top-3 right-3 rounded-md p-1 text-fg-3 hover:bg-hover" aria-label="Close">
              <X size={16} />
            </button>
            <div className="flex items-center gap-4">
              <PlayerPhoto name={p.name} size={72} rounded="xl" />
              <div className="min-w-0">
                <div className="text-2xs text-fg-4">{teamName} · {p.posName || p.pos}</div>
                <div className="mt-0.5 text-[20px] leading-7 font-semibold tracking-[-0.015em]">{p.name}</div>
                <div className="mt-1">
                  <RatingChip r={p.rating} motm={p.motm} size="md" />
                </div>
              </div>
            </div>
            <div className="mt-1 text-xs text-fg-3">
              #{p.jersey} · {p.minutes}&apos; played
              {p.subbedIn != null && ` · on ${p.subbedIn}`}
              {p.subbedOut != null && ` · off ${p.subbedOut}`}
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {[
                ["Goals", p.stats.G],
                ["Assists", p.stats.A],
                ["Shots", p.stats.SHOT],
                ["On target", p.stats.SOG],
                ["Fouls won", p.stats.FA],
                ["Fouls", p.stats.FC],
                ...(p.group === "GK" ? [["Saves", p.stats.SV] as const, ["Conceded", p.stats.GA] as const] : []),
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-panel p-2 text-center shadow-ring">
                  <div className="tnum text-lg font-semibold">{v}</div>
                  <div className="text-[10px] text-fg-4">{k}</div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-medium">
                <span>HS Rating breakdown</span>
                <span className="text-2xs text-fg-4">beta</span>
              </div>
              {p.rating == null ? (
                <p className="text-sm text-fg-3">Not rated (needs 15+ minutes).</p>
              ) : (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-fg-3">
                    <span>Base</span>
                    <span className="tnum">6.00</span>
                  </div>
                  {p.ratingLines.map((l) => (
                    <div key={l.label} className="flex justify-between">
                      <span className="text-fg-2">{l.label}</span>
                      <span className={clsx("tnum", l.delta > 0 ? "text-win" : "text-loss")}>
                        {l.delta > 0 ? "+" : ""}
                        {l.delta.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Rating (clamped 3–10)</span>
                    <span className="tnum" style={{ color: ratingStyle(p.rating).bg }}>
                      {p.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="pt-2 text-2xs leading-4 text-fg-4">
                    Our own transparent formula from public match stats (goals, assists, shots, saves, cards, fouls, result). It is not an official rating and has no
                    passing or xG data.
                  </p>
                </div>
              )}
            </div>
            <Link href={`/player?id=${p.id}&lg=${league}`} className="mt-6 inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover">
              Full player profile →
            </Link>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function MatchCentre({ id }: { id: string }) {
  const [urlTab, setTab] = useUrlTab<Tab>(["overview", "lineups", "stats", "commentary", "table", "h2h"], "overview");
  const sentinel = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<LineupPlayer | null>(null);
  const url = `${SITE}/all/summary?event=${encodeURIComponent(id)}`;
  const [poll, setPoll] = useState<number | undefined>();
  const { data, error, updatedAt } = useEspn<unknown>(url, { ttl: 15_000, poll });
  const d = useMemo(() => (data ? matchDetail(data, "all") : null), [data]);

  useEffect(() => {
    if (!d) return;
    const soon = d.card.state === "pre" && Date.parse(d.card.date) - Date.now() < 2 * 3600_000;
    setPoll(d.card.state === "in" ? 15_000 : soon ? 60_000 : undefined);
    const t = d.card;
    document.title =
      t.state === "pre"
        ? `${t.home.short} vs ${t.away.short} · Halfspace`
        : `${t.state === "in" ? `${t.status} ` : ""}${t.home.abbr} ${t.home.score}–${t.away.score} ${t.away.abbr} · Halfspace`;
  }, [d]);

  if (error && !d) return <Panel className="py-10 text-center text-sm text-fg-3">Couldn&apos;t load this match ({error}). Retrying…</Panel>;
  if (!d) return <PageSkeleton />;

  const colors = sideColors(d.card.home.color, d.card.away.color);
  const hasLineups = d.lineups.some((l) => l.starters.length);
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "overview", label: "Overview", show: true },
    { key: "lineups", label: "Line-ups", show: hasLineups },
    { key: "stats", label: "Stats", show: d.stats.length > 0 },
    { key: "commentary", label: "Commentary", show: d.commentary.length > 0 },
    { key: "table", label: "Table", show: d.standings.length > 0 },
    { key: "h2h", label: "Form", show: d.form.length > 0 },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const tab: Tab = visibleTabs.some((t) => t.key === urlTab) ? urlTab : "overview";
  const topRated = d.lineups
    .flatMap((l) => [...l.starters, ...l.bench].map((p) => ({ p, l })))
    .filter((x) => x.p.rating != null)
    .sort((a, b) => (b.p.rating ?? 0) - (a.p.rating ?? 0))
    .slice(0, 5);

  return (
    <>
      <Hero d={d} />
      <div ref={sentinel} className="scroll-mt-12" />
      <div className="sticky top-12 z-20 -mx-4 mb-4 border-b bg-app/90 px-4 md:-mx-8 md:px-8">
        <Tabs<Tab>
          items={visibleTabs.map((t) => ({ key: t.key, label: t.label }))}
          value={tab}
          onChange={(t) => {
            setTab(t);
            // if the bar is stuck (page scrolled past it), start the new panel at its top
            const r = sentinel.current?.getBoundingClientRect();
            if (r && r.top < 48) sentinel.current?.scrollIntoView({ block: "start" });
          }}
          label="Match sections"
          idBase="mc"
          hotkeys
          trailing={
            <span className="ml-3 hidden shrink-0 items-center text-2xs text-fg-4 sm:flex" suppressHydrationWarning>
              {d.card.state === "in" ? (
                <>
                  <span className="live-dot mr-1.5" /> Live · every 15s
                </>
              ) : updatedAt ? (
                "Up to date"
              ) : (
                ""
              )}
            </span>
          }
        />
      </div>

      <TabPanels<Tab>
        idBase="mc"
        order={visibleTabs.map((t) => t.key)}
        value={tab}
        render={(k) => (
          <>
          {k === "overview" && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                {d.events.length > 0 && (
                  <Panel title="Timeline" subtitle={`${d.card.home.short} above · ${d.card.away.short} below`}>
                    <Timeline events={d.events} minute={d.minute} live={d.card.state === "in"} colors={colors} />
                  </Panel>
                )}
                {d.commentary.length > 0 && (
                  <Panel title="Pulse" subtitle="Who's on top, minute by minute">
                    <Pulse commentary={d.commentary} events={d.events} minute={d.minute} colors={colors} live={d.card.state === "in"} />
                  </Panel>
                )}
                {d.stats.length > 0 && (
                  <Panel title="Key stats">
                    <StatBars stats={d.stats.filter((s) => ["possessionPct", "totalShots", "shotsOnTarget", "wonCorners", "passPct", "foulsCommitted"].includes(s.key))} colors={colors} />
                  </Panel>
                )}
                {!d.events.length && !d.stats.length && d.card.state === "pre" && (
                  <Panel className="py-10 text-center">
                    <p className="text-sm text-fg-2">Kick-off <LocalTime iso={d.card.date} opts={{ weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }} /></p>
                    <p className="mt-1 text-xs text-fg-4">Line-ups usually appear about an hour before kick-off. This page updates by itself.</p>
                  </Panel>
                )}
              </div>
              <div className="space-y-4">
                {topRated.length > 0 && (
                  <Panel title="Top rated" subtitle="HS Rating · beta" pad={false}>
                    <div className="px-2 pb-2">
                      {topRated.map(({ p, l }) => (
                        <button key={p.id} onClick={() => setSelected(p)} className="flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left hover:bg-hover">
                          <PlayerPhoto name={p.name} size={30} />
                          <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                          <TeamLogo src={l.team.logo} abbr={l.team.abbr} size={16} />
                          <span className="text-2xs text-fg-4">{p.pos}</span>
                          <RatingChip r={p.rating} motm={p.motm} />
                        </button>
                      ))}
                    </div>
                  </Panel>
                )}
                {d.form.length > 0 && (
                  <Panel title="Recent form" pad={false}>
                    <div className="space-y-3 px-4 pb-4">
                      {d.form.map((f) => {
                        const t = d.card[f.side];
                        return (
                          <div key={f.side} className="flex items-center gap-2">
                            <TeamLogo src={t.logo} abbr={t.abbr} size={18} />
                            <span className="w-24 truncate text-sm">{t.short}</span>
                            <span className="flex gap-1">
                              {f.games.slice(0, 5).map((g) => (
                                <Link
                                  key={g.id}
                                  href={`/match?id=${g.id}`}
                                  title={`${g.atVs ?? ""} ${g.opponent} ${g.score}`}
                                  className={clsx(
                                    "inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-[10px] font-semibold text-black/80",
                                    g.result === "W" ? "bg-win" : g.result === "L" ? "bg-loss" : "bg-draw",
                                  )}
                                >
                                  {g.result ?? "–"}
                                </Link>
                              ))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}
              </div>
            </div>
          )}

          {k === "lineups" && (
            <div className="space-y-4">
              <Panel
                title={
                  <span className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: colors[0] }} /> {d.lineups[0]?.team.short} {d.lineups[0]?.formation}
                    </span>
                    <span className="text-fg-4">vs</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: colors[1] }} /> {d.lineups[1]?.team.short} {d.lineups[1]?.formation}
                    </span>
                  </span>
                }
                subtitle={<>Tap a player for stats and the rating breakdown · <PhotoCredit /></>}
              >
                <Pitch lineups={d.lineups} colors={colors} onSelect={setSelected} selectedId={selected?.id} />
              </Panel>
              <div className="grid gap-4 md:grid-cols-2">
                {d.lineups.map((l) => (
                  <Panel key={l.side} pad={false} title={<span className="flex items-center gap-2"><TeamLogo src={l.team.logo} abbr={l.team.abbr} size={16} />{l.team.short}</span>}>
                    <div className="px-2 pb-2">
                      <BenchList lineup={l} color={l.side === "home" ? colors[0] : colors[1]} onSelect={setSelected} league={d.leagueSlug} />
                    </div>
                  </Panel>
                ))}
              </div>
            </div>
          )}

          {k === "stats" && (
            <Panel title="Team stats">
              <div className="mb-4 flex justify-between text-sm font-medium">
                <span className="flex items-center gap-2"><TeamLogo src={d.card.home.logo} abbr={d.card.home.abbr} size={18} />{d.card.home.short}</span>
                <span className="flex items-center gap-2">{d.card.away.short}<TeamLogo src={d.card.away.logo} abbr={d.card.away.abbr} size={18} /></span>
              </div>
              <StatBars stats={d.stats} colors={colors} />
            </Panel>
          )}

          {k === "commentary" && <CommentaryFeed d={d} />}

          {k === "table" && (
            <div className="space-y-4">
              {d.standings.map((g) => (
                <Panel key={g.name} title={g.name} pad={false}>
                  <MiniTable rows={g.rows} highlight={[d.card.home.id, d.card.away.id]} league={d.leagueSlug} />
                </Panel>
              ))}
            </div>
          )}

          {k === "h2h" && (
            <div className="grid gap-4 md:grid-cols-2">
              {d.form.map((f) => {
                const t = d.card[f.side];
                return (
                  <Panel key={f.side} title={<span className="flex items-center gap-2"><TeamLogo src={t.logo} abbr={t.abbr} size={16} />{t.short} · last {f.games.length}</span>} pad={false}>
                    <div className="px-2 pb-2">
                      {f.games.map((g) => (
                        <Link key={g.id} href={`/match?id=${g.id}`} className="flex h-10 items-center gap-2.5 rounded-md px-2 text-sm hover:bg-hover">
                          <span className={clsx("inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-[10px] font-semibold text-black/80", g.result === "W" ? "bg-win" : g.result === "L" ? "bg-loss" : "bg-draw")}>
                            {g.result ?? "–"}
                          </span>
                          <span className="w-6 text-2xs text-fg-4">{g.atVs}</span>
                          {g.opponentLogo && <TeamLogo src={g.opponentLogo} size={16} />}
                          <span className="min-w-0 flex-1 truncate">{g.opponent}</span>
                          <span className="tnum font-medium">{g.score}</span>
                          <span className="tnum w-16 text-right text-2xs text-fg-4">
                            {g.date ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(g.date)) : ""}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
          </>
        )}
      />

      <PlayerSheet
        p={selected}
        onClose={() => setSelected(null)}
        league={d.leagueSlug}
        teamName={d.lineups.find((l) => [...l.starters, ...l.bench].some((p) => p.id === selected?.id))?.team.short}
      />
    </>
  );
}

function CommentaryFeed({ d }: { d: MatchDetail }) {
  const [keyOnly, setKeyOnly] = useState(false);
  const key = /goal|card|penalty|var|substitution|half|full|kick/i;
  const list = d.commentary.filter((c) => !keyOnly || key.test(c.kind ?? ""));
  return (
    <Panel
      title="Commentary"
      action={
        <button onClick={() => setKeyOnly((k) => !k)} className={clsx("rounded-md px-2 py-1 text-2xs shadow-ring", keyOnly ? "bg-accent-soft text-accent-text" : "text-fg-3")}>
          Key moments
        </button>
      }
      pad={false}
    >
      <ol className="divide-y divide-line px-2 pb-2">
        <AnimatePresence initial={false}>
          {list.slice(0, 250).map((c) => {
            const isKey = key.test(c.kind ?? "");
            const col = /goal|penalty - scored/i.test(c.kind ?? "") ? "var(--win)" : /red/i.test(c.kind ?? "") ? "#E5484D" : /yellow/i.test(c.kind ?? "") ? "#F5C84C" : undefined;
            return (
              <motion.li
                key={c.seq}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="grid grid-cols-[40px_1fr] gap-2 px-2 py-2.5 text-sm"
                style={col ? { boxShadow: `inset 2px 0 0 ${col}` } : undefined}
              >
                <span className="tnum text-xs text-fg-4">{c.minute}</span>
                <span className={clsx(isKey ? "font-medium text-fg" : "text-fg-2")}>{c.text}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </Panel>
  );
}

export function MiniTable({ rows, highlight = [], league }: { rows: { rank: number; team: { id: string; name: string; short: string; abbr: string; logo?: string }; gp: number; w: number; d: number; l: number; gd: number; pts: number; note?: { color?: string; description?: string } }[]; highlight?: string[]; league: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="h-8 border-b text-2xs text-fg-4">
            <th className="w-10 pl-4 text-left font-medium">#</th>
            <th className="text-left font-medium">Team</th>
            <th className="w-9 text-center font-medium">P</th>
            <th className="w-9 text-center font-medium">W</th>
            <th className="w-9 text-center font-medium">D</th>
            <th className="w-9 text-center font-medium">L</th>
            <th className="w-11 text-center font-medium">GD</th>
            <th className="w-11 pr-3 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <motion.tr
              key={r.team.id || r.team.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i, 12) * 0.02 }}
              className={clsx("h-9 border-b border-line/60 last:border-0 hover:bg-hover", highlight.includes(r.team.id) && "bg-accent-soft")}
            >
              <td className="relative pl-4">
                {r.note?.color && <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full" style={{ background: r.note.color }} title={r.note.description} />}
                <span className="tnum text-xs text-fg-3">{r.rank}</span>
              </td>
              <td>
                <Link href={`/team?id=${r.team.id}&lg=${league}`} className="flex min-w-0 items-center gap-2.5">
                  <TeamLogo src={r.team.logo} abbr={r.team.abbr} size={18} />
                  <span className="truncate">{r.team.short || r.team.name}</span>
                </Link>
              </td>
              <td className="tnum text-center text-fg-2">{r.gp}</td>
              <td className="tnum text-center text-fg-2">{r.w}</td>
              <td className="tnum text-center text-fg-2">{r.d}</td>
              <td className="tnum text-center text-fg-2">{r.l}</td>
              <td className="tnum text-center text-fg-3">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="tnum pr-3 text-center font-semibold">{r.pts}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
