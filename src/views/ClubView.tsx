"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { SITE, SITE_V2, useEspn } from "@/lib/espn/client";
import { matchCard, standingsGroups, teamRef, type MatchCard } from "@/lib/espn/normalize";
import { compLabel } from "@/lib/espn/competitions";
import { useFollowedTeams } from "@/lib/follow";
import { LiveMatchRow } from "@/components/live/LiveMatchRow";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { Panel } from "@/components/ui/Panel";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { MiniTable } from "./MatchCentre";
import { EmptyState } from "@/components/ui/EmptyState";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Tab = "overview" | "fixtures" | "squad" | "table";

export interface SquadPlayer {
  id: string;
  name: string;
  jersey?: string;
  pos: string;
  group: "Goalkeepers" | "Defenders" | "Midfielders" | "Forwards" | "Other";
  age?: number;
  nationality?: string;
  flag?: string;
  height?: string;
  apps: number;
  subs: number;
  goals: number;
  assists: number;
  yc: number;
  rc: number;
  injured?: boolean;
}

function squadFrom(roster: any): SquadPlayer[] {
  return (roster?.athletes ?? []).map((a: any) => {
    const st: Record<string, number> = {};
    for (const c of a.statistics?.splits?.categories ?? []) for (const s of c.stats ?? []) st[s.abbreviation] = Number(s.value ?? s.displayValue) || 0;
    const pn = a.position?.name ?? "";
    const group = /goal/i.test(pn) ? "Goalkeepers" : /def/i.test(pn) ? "Defenders" : /mid/i.test(pn) ? "Midfielders" : /forw|strik|att/i.test(pn) ? "Forwards" : "Other";
    return {
      id: String(a.id),
      name: a.displayName,
      jersey: a.jersey,
      pos: a.position?.abbreviation ?? "",
      group,
      age: a.age,
      nationality: a.citizenship,
      flag: a.flag?.href,
      height: a.displayHeight,
      apps: st.APP ?? 0,
      subs: st.SUB ?? 0,
      goals: st.G ?? 0,
      assists: st.A ?? 0,
      yc: st.YC ?? 0,
      rc: st.RC ?? 0,
      injured: (a.injuries ?? []).length > 0,
    } satisfies SquadPlayer;
  });
}

function scheduleMatches(js: any): MatchCard[] {
  return (js?.events ?? [])
    .map((e: any) => matchCard(e, e.league?.slug ?? e.competitions?.[0]?.league?.slug ?? "all", e.league?.name))
    .filter(Boolean) as MatchCard[];
}

function Avatar({ name, flag, color }: { name: string; flag?: string; color?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-fg" style={{ background: `linear-gradient(145deg, color-mix(in oklab, ${color ?? "#5e6ad2"} 45%, var(--bg-elevated)), var(--bg-elevated))` }}>
      {initials}
      {flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://a.espncdn.com/combiner/i?img=${new URL(flag).pathname}&w=40&h=40`} alt="" className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full object-cover ring-2 ring-[var(--bg-panel)]" loading="lazy" />
      )}
    </span>
  );
}

function Squad({ players, league, color }: { players: SquadPlayer[]; league: string; color?: string }) {
  const [sort, setSort] = useState<"pos" | "goals" | "apps">("pos");
  const order = ["Goalkeepers", "Defenders", "Midfielders", "Forwards", "Other"] as const;
  const groups = order.map((g) => ({ g, ps: players.filter((p) => p.group === g) })).filter((x) => x.ps.length);
  const sorted = sort === "pos" ? null : [...players].sort((a, b) => (sort === "goals" ? b.goals - a.goals || b.assists - a.assists : b.apps - a.apps));
  const avgAge = players.filter((p) => p.age).reduce((t, p, _, arr) => t + (p.age ?? 0) / arr.length, 0);
  const nations = new Set(players.map((p) => p.nationality).filter(Boolean)).size;
  const row = (p: SquadPlayer, i: number) => (
    <motion.li key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}>
      <Link href={`/player?id=${p.id}&lg=${league}`} className="grid grid-cols-[36px_1fr_44px_44px_44px_44px] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover sm:grid-cols-[36px_1fr_120px_44px_44px_44px_44px]">
        <Avatar name={p.name} flag={p.flag} color={color} />
        <span className="min-w-0">
          <span className="block truncate text-sm">
            {p.name} {p.injured && <span className="text-2xs text-loss" title="Injured">✚</span>}
          </span>
          <span className="block text-2xs text-fg-4">
            {p.jersey ? `#${p.jersey} · ` : ""}
            {p.pos}
            {p.age ? ` · ${p.age} yrs` : ""}
          </span>
        </span>
        <span className="hidden truncate text-xs text-fg-3 sm:block">{p.nationality}</span>
        <span className="tnum text-center text-sm text-fg-2">{p.apps}</span>
        <span className="tnum text-center text-sm font-medium">{p.goals}</span>
        <span className="tnum text-center text-sm text-fg-2">{p.assists}</span>
        <span className="tnum text-center text-xs text-fg-3">
          {p.yc ? <span className="mr-0.5 inline-block h-2.5 w-[7px] rounded-[1.5px] bg-[#F5C84C] align-[-1px]" /> : null}
          {p.yc || ""}
          {p.rc ? ` ${p.rc}R` : ""}
        </span>
      </Link>
    </motion.li>
  );
  const header = (
    <div className="grid grid-cols-[36px_1fr_44px_44px_44px_44px] gap-2 px-2 pb-1 text-2xs text-fg-4 sm:grid-cols-[36px_1fr_120px_44px_44px_44px_44px]">
      <span />
      <span>Player</span>
      <span className="hidden sm:block">Nationality</span>
      <span className="text-center">Apps</span>
      <span className="text-center">Goals</span>
      <span className="text-center">Ast</span>
      <span className="text-center">Cards</span>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-5 text-sm">
          <span><b className="tnum">{players.length}</b> <span className="text-fg-3">players</span></span>
          {avgAge > 0 && <span><b className="tnum">{avgAge.toFixed(1)}</b> <span className="text-fg-3">avg age</span></span>}
          <span><b className="tnum">{nations}</b> <span className="text-fg-3">nationalities</span></span>
        </div>
        <div className="flex gap-1 text-xs">
          {(["pos", "goals", "apps"] as const).map((k) => (
            <button key={k} onClick={() => setSort(k)} className={clsx("rounded-md px-2 py-1 shadow-ring", sort === k ? "bg-accent-soft text-accent-text" : "text-fg-3")}>
              {k === "pos" ? "By position" : k === "goals" ? "Top scorers" : "Most used"}
            </button>
          ))}
        </div>
      </div>
      {sorted ? (
        <Panel pad={false}>
          <div className="pt-3">{header}</div>
          <ul className="px-1 pb-2">{sorted.map(row)}</ul>
        </Panel>
      ) : (
        groups.map(({ g, ps }) => (
          <Panel key={g} title={g} pad={false}>
            {header}
            <ul className="px-1 pb-2">{ps.map(row)}</ul>
          </Panel>
        ))
      )}
      <p className="text-2xs text-fg-4">Season stats are for this competition. ESPN does not publish player photos, so we show initials with nationality.</p>
    </div>
  );
}

export function ClubView() {
  const sp = useSearchParams();
  const id = sp.get("id") ?? "";
  const [tab, setTab] = useState<Tab>("overview");
  const results = useEspn<any>(id ? `${SITE}/all/teams/${id}/schedule` : null, { ttl: 120_000 });
  const fixtures = useEspn<any>(id ? `${SITE}/all/teams/${id}/schedule?fixture=true` : null, { ttl: 120_000, poll: 60_000 });
  const played = useMemo(() => scheduleMatches(results.data), [results.data]);
  const upcoming = useMemo(() => scheduleMatches(fixtures.data).filter((m) => m.state !== "post"), [fixtures.data]);
  // League for roster + table: explicit ?lg=, else the competition this team plays most in.
  const lg = useMemo(() => {
    const q = sp.get("lg");
    if (q && q !== "all") return q;
    const counts = new Map<string, number>();
    for (const m of [...played, ...upcoming]) counts.set(m.league, (counts.get(m.league) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [sp, played, upcoming]);
  const roster = useEspn<any>(id && lg ? `${SITE}/${lg}/teams/${id}/roster` : null, { ttl: 3600_000 });
  const standings = useEspn<any>(lg ? `${SITE_V2}/${lg}/standings` : null, { ttl: 300_000 });
  const followed = useFollowedTeams();

  const team = useMemo(() => {
    const t = roster.data?.team ?? results.data?.team ?? fixtures.data?.team;
    return t ? teamRef(t) : null;
  }, [roster.data, results.data, fixtures.data]);
  const squad = useMemo(() => squadFrom(roster.data), [roster.data]);
  const groups = useMemo(() => (standings.data ? standingsGroups(standings.data) : []), [standings.data]);
  const myGroup = groups.find((g) => g.rows.some((r) => r.team.id === id));
  const myRow = myGroup?.rows.find((r) => r.team.id === id);
  const finished = played.filter((m) => m.state === "post" && m.completed).sort((a, b) => b.date.localeCompare(a.date));
  const form = finished.slice(0, 5).map((m) => {
    const home = m.home.id === id;
    const f = home ? m.home.score! : m.away.score!;
    const a = home ? m.away.score! : m.home.score!;
    return { m, r: f > a ? "W" : f < a ? "L" : "D" };
  });

  if (!id) return <EmptyState title="Pick a team" body="Open any club or national team from a match, a table or a competition to see fixtures, results and the full squad." actions={[{ href: "/competitions", label: "Browse competitions" }, { href: "/", label: "Today’s matches" }]} />;
  if (!team && (results.loading || fixtures.loading)) return <PageSkeleton />;
  if (!team) return <EmptyState title="Team not found" body="We couldn’t find this team in the live feed. It may have moved competition or the link is out of date." actions={[{ href: "/competitions", label: "Browse competitions" }]} />;

  const on = followed.ids.has(id);
  const next = upcoming.sort((a, b) => a.date.localeCompare(b.date))[0];
  return (
    <>
      <div
        className="hero-glow relative -mx-4 mb-4 overflow-hidden px-4 pt-6 pb-6 md:-mx-8 md:rounded-2xl md:px-8"
        style={{ ["--team-glow" as string]: `color-mix(in oklab, ${team.color ?? "#5e6ad2"} 24%, transparent)`, ["--glow-x" as string]: "12%" }}
      >
        <div className="noise absolute inset-0" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <TeamLogo src={team.logo} abbr={team.abbr} color={team.color} size={80} />
            <div>
              <h1 className="display text-gradient text-[30px] leading-9 md:text-[34px] md:leading-10">{team.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-fg-3">
                {lg && (
                  <Link href={`/competition?lg=${lg}`} className="hover:text-fg">
                    {compLabel(lg)}
                  </Link>
                )}
                {myRow && <span className="tnum">· {myRow.rank}{["st", "nd", "rd"][myRow.rank - 1] ?? "th"} · {myRow.pts} pts</span>}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => followed.toggle({ id, name: team.name, logo: team.logo, league: lg })}
                  className={clsx("h-7 rounded-md px-2.5 text-xs font-medium shadow-ring", on ? "bg-accent-soft text-accent-text" : "text-fg-2 hover:bg-hover")}
                >
                  {on ? "★ Following" : "☆ Follow"}
                </button>
                <span className="flex gap-1">
                  {form.map(({ m, r }) => (
                    <Link key={m.id} href={`/match?id=${m.id}`} title={`${m.home.short} ${m.home.score}–${m.away.score} ${m.away.short}`} className={clsx("inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-[10px] font-semibold text-black/80", r === "W" ? "bg-win" : r === "L" ? "bg-loss" : "bg-draw")}>
                      {r}
                    </Link>
                  ))}
                </span>
              </div>
            </div>
          </div>
          {myRow && (
            <div className="flex gap-3">
              {[
                ["Position", myRow.rank],
                ["Points", myRow.pts],
                ["Goal diff", myRow.gd > 0 ? `+${myRow.gd}` : myRow.gd],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-panel/70 px-4 py-2.5 text-center shadow-ring backdrop-blur">
                  <div className="text-2xs text-fg-3">{k}</div>
                  <div className="display tnum text-[26px] leading-8">{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mb-4 flex gap-1 border-b">
        {(["overview", "fixtures", "squad", "table"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("relative px-3 pt-1 pb-2.5 text-sm capitalize", tab === t ? "text-fg" : "text-fg-3 hover:text-fg-2")}>
            {t}
            {tab === t && <motion.span layoutId="club-tab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {next && (
              <Panel title="Next match" pad={false}>
                <div className="px-1.5 pb-1.5">
                  <LiveMatchRow m={next} showLeague={compLabel(next.league)} />
                </div>
              </Panel>
            )}
            <Panel title="Latest results" pad={false}>
              <div className="px-1.5 pb-1.5">
                {finished.slice(0, 8).map((m, i) => (
                  <LiveMatchRow key={m.id} m={m} index={i} showLeague={compLabel(m.league)} />
                ))}
                {!finished.length && <p className="py-6 text-center text-sm text-fg-4">No results yet.</p>}
              </div>
            </Panel>
          </div>
          <div className="space-y-4">
            {squad.length > 0 && (
              <Panel title="Top scorers" pad={false}>
                <div className="px-2 pb-2">
                  {[...squad].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 5).map((p) => (
                    <Link key={p.id} href={`/player?id=${p.id}&lg=${lg}`} className="flex h-10 items-center gap-2.5 rounded-md px-2 hover:bg-hover">
                      <Avatar name={p.name} flag={p.flag} color={team.color} />
                      <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                      <span className="tnum text-sm font-semibold">{p.goals}</span>
                      <span className="tnum w-8 text-right text-2xs text-fg-4">{p.assists} A</span>
                    </Link>
                  ))}
                </div>
              </Panel>
            )}
            {myGroup && (
              <Panel title={compLabel(lg!)} pad={false}>
                <MiniTable rows={myGroup.rows.slice(Math.max(0, (myRow?.rank ?? 1) - 3), Math.max(5, (myRow?.rank ?? 1) + 2))} highlight={[id]} league={lg!} />
              </Panel>
            )}
          </div>
        </div>
      )}
      {tab === "fixtures" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Upcoming" pad={false}>
            <div className="px-1.5 pb-1.5">
              {upcoming.map((m, i) => (
                <LiveMatchRow key={m.id} m={m} index={i} showLeague={compLabel(m.league)} />
              ))}
              {!upcoming.length && <p className="py-6 text-center text-sm text-fg-4">No scheduled fixtures.</p>}
            </div>
          </Panel>
          <Panel title="Results" pad={false}>
            <div className="px-1.5 pb-1.5">
              {finished.map((m, i) => (
                <LiveMatchRow key={m.id} m={m} index={i} showLeague={compLabel(m.league)} />
              ))}
            </div>
          </Panel>
        </div>
      )}
      {tab === "squad" && (roster.loading ? <PageSkeleton rows={12} /> : squad.length ? <Squad players={squad} league={lg ?? "all"} color={team.color} /> : <Panel className="py-10 text-center text-sm text-fg-4">No squad list available for this team.</Panel>)}
      {tab === "table" &&
        (groups.length ? (
          groups
            .filter((g) => g === myGroup || groups.length === 1)
            .map((g) => (
              <Panel key={g.name} title={g.name} pad={false}>
                <MiniTable rows={g.rows} highlight={[id]} league={lg!} />
              </Panel>
            ))
        ) : (
          <Panel className="py-10 text-center text-sm text-fg-4">No table available.</Panel>
        ))}
    </>
  );
}
