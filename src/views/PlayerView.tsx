"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { WEB, useEspn } from "@/lib/espn/client";
import { compLabel } from "@/lib/espn/competitions";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { CompLogo } from "@/components/ui/CompLogo";
import { Panel } from "@/components/ui/Panel";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CountUp } from "@/components/ui/CountUp";
import { onColor } from "@/components/matchcentre/colors";
import { usePlayerPhoto, yearOf } from "@/lib/photos";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import { EmptyState } from "@/components/ui/EmptyState";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Eye-catching "back of the shirt" in team colours — we have no player photos. */
function Shirt({ name, number, color }: { name: string; number?: string; color: string }) {
  const fg = onColor(color);
  const surname = name.split(" ").slice(-1)[0].toUpperCase();
  return (
    <motion.svg
      viewBox="0 0 200 210"
      className="h-[190px] w-[180px] drop-shadow-[0_18px_30px_rgba(0,0,0,.45)]"
      initial={{ opacity: 0, y: 12, rotate: -3 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="shirt-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={`color-mix(in oklab, ${color} 70%, black)`} />
        </linearGradient>
      </defs>
      <path d="M62 10 L82 4 Q100 18 118 4 L138 10 L190 42 L172 84 L150 74 L150 204 L50 204 L50 74 L28 84 L10 42 Z" fill="url(#shirt-g)" stroke="rgb(255 255 255 / .18)" strokeWidth="1.5" />
      <path d="M82 4 Q100 18 118 4" fill="none" stroke="rgb(255 255 255 / .35)" strokeWidth="3" />
      <text x="100" y="72" textAnchor="middle" fontSize={surname.length > 9 ? 13 : 16} fontWeight={700} letterSpacing="2" fill={fg}>
        {surname}
      </text>
      <text x="100" y="160" textAnchor="middle" fontSize="84" fontWeight={800} fill={fg} style={{ fontFeatureSettings: '"tnum"' }}>
        {number ?? ""}
      </text>
    </motion.svg>
  );
}

/** Real photo (Wikimedia) as a portrait card; the team-colour shirt when none exists. */
function Portrait({ name, year, number, color }: { name: string; year?: number; number?: string; color: string }) {
  const photo = usePlayerPhoto(name, year);
  const [ok, setOk] = useState(false);
  if (photo === null) return <Shirt name={name} number={number} color={color} />;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="relative h-[220px] w-[176px] overflow-hidden rounded-2xl shadow-elevated"
        style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${color} 55%, var(--bg-elevated)), var(--bg-elevated))` }}
      >
        {!ok && <span className="skeleton absolute inset-0 !rounded-2xl" />}
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.src}
            alt={name}
            referrerPolicy="no-referrer"
            onLoad={() => setOk(true)}
            className={clsx("h-full w-full object-cover object-[50%_15%] transition-opacity duration-500", ok ? "opacity-100" : "opacity-0")}
          />
        )}
        {number && (
          <span className="tnum absolute right-2 bottom-2 rounded-md px-1.5 py-0.5 text-sm font-bold" style={{ background: color, color: onColor(color) }}>
            {number}
          </span>
        )}
      </motion.div>
      <span className="text-[10px] text-fg-4">
        <PhotoCredit photo={photo} />
      </span>
    </div>
  );
}

export function PlayerView() {
  const sp = useSearchParams();
  const id = sp.get("id") ?? "";
  const lg = sp.get("lg");
  const base = `${WEB}${lg && lg !== "all" ? `/${lg}` : ""}/athletes/${id}`;
  const bio = useEspn<any>(id ? base : null, { ttl: 3600_000 });
  const overview = useEspn<any>(id ? `${WEB}/athletes/${id}/overview` : null, { ttl: 1800_000 });
  const gamelog = useEspn<any>(id ? `${WEB}/athletes/${id}/gamelog` : null, { ttl: 1800_000 });
  const a = bio.data?.athlete;

  useEffect(() => {
    if (a?.displayName) document.title = `${a.displayName} · Halfspace`;
  }, [a?.displayName]);

  const seasonRows = useMemo(() => {
    const st = overview.data?.statistics;
    if (!st?.splits) return [];
    const labels: string[] = st.labels ?? [];
    return (st.splits as any[]).map((s) => {
      const v: Record<string, string> = {};
      labels.forEach((l, i) => (v[l] = s.stats?.[i] ?? "0"));
      return { name: s.displayName as string, slug: s.leagueSlug as string | undefined, v };
    });
  }, [overview.data]);

  const games = useMemo(() => {
    const g = gamelog.data;
    if (!g) return [];
    const labels: string[] = g.labels ?? [];
    const statsById = new Map<string, string[]>();
    for (const st of g.seasonTypes ?? []) for (const c of st.categories ?? []) for (const e of c.events ?? []) statsById.set(e.eventId, e.stats);
    return Object.values(g.events ?? {})
      .map((e: any) => {
        const s = statsById.get(e.id) ?? [];
        const v: Record<string, string> = {};
        labels.forEach((l, i) => (v[l] = s[i] ?? "0"));
        return { id: e.id, date: e.gameDate, atVs: e.atVs, opp: e.opponent, score: e.score, result: e.gameResult, league: e.leagueShortName ?? e.leagueName, v };
      })
      .sort((x: any, y: any) => String(y.date).localeCompare(String(x.date)))
      .slice(0, 15);
  }, [gamelog.data]);

  if (!id) return <EmptyState title="Pick a player" body="Tap any player in a line-up, a squad list or a top-scorers table to see their profile, season stats and recent matches." actions={[{ href: "/", label: "Today’s matches" }, { href: "/competitions", label: "Browse competitions" }]} />;
  if (bio.loading) return <PageSkeleton />;
  if (!a) return <EmptyState title="Player not found" body={`We couldn’t load this player from the live feed${bio.error ? ` (${bio.error})` : ""}.`} actions={[{ href: "/", label: "Today’s matches" }]} />;

  const team = a.team;
  const color = team?.color ? `#${team.color}` : "#5e6ad2";
  const totals = seasonRows.reduce(
    (t, r) => ({ g: t.g + Number(r.v.G || 0), a: t.a + Number(r.v.A || 0), s: t.s + Number(r.v.STRT || 0), sh: t.sh + Number(r.v.SHOT || 0) }),
    { g: 0, a: 0, s: 0, sh: 0 },
  );
  const facts: [string, React.ReactNode][] = [
    ["Age", a.age ? `${a.age} yrs` : "—"],
    ["Born", a.displayDOB ?? "—"],
    ["Height", a.displayHeight ?? "—"],
    ["Weight", a.displayWeight ?? "—"],
    ["Position", a.position?.displayName ?? "—"],
    [
      "Nationality",
      a.citizenship ? (
        <span className="inline-flex items-center gap-1.5">
          {a.flag?.href && <TeamLogo src={a.flag.href} size={14} />} {a.citizenship}
        </span>
      ) : (
        "—"
      ),
    ],
  ];

  return (
    <>
      <div
        className="hero-glow relative -mx-4 mb-4 overflow-hidden px-4 pt-6 pb-4 md:-mx-8 md:rounded-2xl md:px-8"
        style={{ ["--team-glow" as string]: `color-mix(in oklab, ${color} 26%, transparent)`, ["--glow-x" as string]: "75%" }}
      >
        <div className="noise absolute inset-0" />
        <div className="pointer-events-none absolute -top-6 right-6 select-none text-[180px] leading-none font-extrabold text-fg opacity-[0.04]">{a.jersey}</div>
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-fg-3">
              {team && (
                <Link href={`/team?id=${team.id}${lg ? `&lg=${lg}` : ""}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                  <TeamLogo src={team.logos?.[0]?.href} abbr={team.abbreviation} size={18} /> {team.displayName}
                </Link>
              )}
              {a.jersey && <span>· #{a.jersey}</span>}
            </div>
            <h1 className="display text-gradient mt-1 text-[32px] leading-10 md:text-[40px] md:leading-[48px]">{a.displayName}</h1>
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <div className="text-2xs text-fg-4">{k}</div>
                  <div className="text-sm text-fg">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <Portrait name={a.displayName} year={yearOf(a.dateOfBirth ?? a.displayDOB)} number={a.jersey} color={color} />
        </div>
        <div className="relative mt-5 grid grid-cols-4 gap-4 border-t pt-4">
          {[
            ["Goals", totals.g],
            ["Assists", totals.a],
            ["Starts", totals.s],
            ["Shots", totals.sh],
          ].map(([k, v]) => (
            <div key={k as string}>
              <div className="text-2xs text-fg-3">{k} · season</div>
              <div className="text-[26px] leading-8 font-semibold">
                <CountUp value={Number(v)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Season by competition" pad={false}>
          {seasonRows.length ? (
            <div className="overflow-x-auto px-2 pb-2">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="h-8 text-2xs text-fg-4">
                    <th className="text-left font-medium">Competition</th>
                    {["STRT", "G", "A", "SHOT", "SOG", "YC", "RC"].map((h) => (
                      <th key={h} className="w-10 text-center font-medium">{h === "STRT" ? "Starts" : h === "SOG" ? "On tgt" : h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seasonRows.map((r) => (
                    <tr key={r.name} className="h-9 border-t border-line/60">
                      <td>
                        <span className="flex items-center gap-2">
                          {r.slug && <CompLogo slug={r.slug} size={16} />}
                          <span className="truncate">{r.slug ? compLabel(r.slug) : r.name}</span>
                        </span>
                      </td>
                      {["STRT", "G", "A", "SHOT", "SOG", "YC", "RC"].map((h) => (
                        <td key={h} className={clsx("tnum text-center", h === "G" ? "font-semibold" : "text-fg-2")}>
                          {r.v[h] ?? "0"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 pb-4 text-sm text-fg-4">No season stats available.</p>
          )}
        </Panel>
        <Panel title="Recent matches" pad={false}>
          <div className="px-2 pb-2">
            {games.map((g: any) => (
              <Link key={g.id} href={`/match?id=${g.id}`} className="grid h-10 grid-cols-[20px_22px_1fr_44px_28px_28px] items-center gap-2 rounded-md px-2 text-sm hover:bg-hover">
                <span className={clsx("inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-[10px] font-semibold text-black/80", g.result === "W" ? "bg-win" : g.result === "L" ? "bg-loss" : "bg-draw")}>{g.result ?? "–"}</span>
                <TeamLogo src={g.opp?.logo} abbr={g.opp?.abbreviation} size={18} />
                <span className="min-w-0 truncate">
                  <span className="text-fg-4">{g.atVs === "@" ? "at " : "vs "}</span>
                  {g.opp?.displayName}
                </span>
                <span className="tnum text-center text-fg-2">{g.score}</span>
                <span className="tnum text-center font-semibold" title="Goals">{Number(g.v.G) ? `⚽${g.v.G}` : ""}</span>
                <span className="tnum text-center text-xs text-fg-3" title="Assists">{Number(g.v.A) ? `A${g.v.A}` : ""}</span>
              </Link>
            ))}
            {!games.length && <p className="py-6 text-center text-sm text-fg-4">No recent matches.</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}
