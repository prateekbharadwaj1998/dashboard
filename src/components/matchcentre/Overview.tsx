"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CalendarClock, MapPin, Trophy, Tv, Users } from "lucide-react";
import clsx from "clsx";
import { SITE, useEspn } from "@/lib/espn/client";
import { scoreboardMatches, type CommentaryItem, type LineupPlayer, type MatchDetail, type StandingGroup } from "@/lib/espn/normalize";
import { compBySlug } from "@/lib/espn/competitions";
import { Panel } from "@/components/ui/Panel";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { InfoTip } from "@/components/ui/InfoTip";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { LocalTime } from "@/components/match/LocalTime";
import { Momentum, MomentumTitle } from "./Momentum";
import { TopStats } from "./TopStats";
import { Timeline } from "./Timeline";
import { RatingChip } from "./RatingChip";

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 >= 11 && n % 100 <= 13 ? 0 : Math.min(n % 10, 4) % 4] ?? "th"}`;

/** Plain-language stakes line from the live table. */
export function stakesLine(d: MatchDetail): string | null {
  const g = d.standings.find((x) => x.rows.some((r) => r.team.id === d.card.home.id) && x.rows.some((r) => r.team.id === d.card.away.id));
  if (!g) return null;
  const h = g.rows.find((r) => r.team.id === d.card.home.id)!;
  const a = g.rows.find((r) => r.team.id === d.card.away.id)!;
  if (!h.gp && !a.gp) return null;
  const where = g.name && !/standings|table/i.test(g.name) ? ` in ${g.name.replace(/^.*?(Group|League)/i, "$1")}` : "";
  const desc = (r: typeof h, name: string) => (r.rank === 1 ? `${name} top${where} on ${r.pts} pts` : `${name} ${ordinal(r.rank)} on ${r.pts} pts`);
  const gap = Math.abs(h.pts - a.pts);
  const tail = gap === 0 ? " — level on points" : gap <= 3 ? ` — ${gap} point${gap > 1 ? "s" : ""} apart` : "";
  return `${desc(h, d.card.home.short)} · ${desc(a, d.card.away.short)}${tail}.`;
}

function LatestCommentary({ items, onMore }: { items: CommentaryItem[]; onMore: () => void }) {
  const latest = items.slice(0, 3);
  const key = /goal|card|penalty|var|substitution/i;
  return (
    <Panel title="Latest" pad={false}>
      <ol className="px-2">
        {latest.map((c) => (
          <li key={c.seq} className="grid grid-cols-[40px_1fr] gap-2 border-b border-line/60 px-2 py-2.5 text-sm last:border-0">
            <span className="tnum text-xs font-semibold text-fg-3">{c.minute || "—"}</span>
            <span className={clsx(key.test(c.kind ?? "") ? "font-medium text-fg" : "text-fg-2")}>{c.text}</span>
          </li>
        ))}
      </ol>
      <button onClick={onMore} className="flex w-full cursor-pointer items-center justify-center gap-1 border-t py-2.5 text-sm font-medium text-fg-2 transition-colors hover:bg-hover hover:text-fg">
        Full commentary <ArrowRight size={13} />
      </button>
    </Panel>
  );
}

function FormScores({ d }: { d: MatchDetail }) {
  if (!d.form.length) return null;
  return (
    <Panel title="Team form" subtitle="Last five matches · tap for the match">
      <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
        {d.form.map((f) => {
          const team = d.card[f.side];
          return (
            <div key={f.side} className="space-y-1">
              {f.games.slice(0, 5).map((g) => {
                const left = g.teamHome ? team.short : g.opponent;
                const right = g.teamHome ? g.opponent : team.short;
                const score = g.hs != null && g.as != null ? `${g.hs}–${g.as}` : g.score.replace("-", "–");
                const bg = g.result === "W" ? "var(--win)" : g.result === "L" ? "var(--loss)" : "var(--text-quaternary)";
                return (
                  <Link key={g.id} href={`/match?id=${g.id}`} className="grid h-9 grid-cols-[1fr_auto_1fr] items-center gap-2.5 rounded-md px-2 text-sm hover:bg-hover">
                    <span className={clsx("truncate text-right", left === team.short ? "font-medium text-fg" : "text-fg-2")}>{left}</span>
                    <span className="tnum inline-flex h-6 min-w-12 items-center justify-center rounded-md px-1.5 text-xs font-semibold text-black/85" style={{ background: bg }} title={g.result === "W" ? "Win" : g.result === "L" ? "Loss" : "Draw"}>
                      {score}
                    </span>
                    <span className={clsx("truncate", right === team.short ? "font-medium text-fg" : "text-fg-2")}>{right}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function GroupSnippet({ g, d }: { g: StandingGroup; d: MatchDetail }) {
  const ids = [d.card.home.id, d.card.away.id];
  const idx = g.rows.map((r, i) => (ids.includes(r.team.id) ? i : -1)).filter((i) => i >= 0);
  const lo = Math.max(0, Math.min(...idx) - 1);
  const rows = g.rows.length <= 6 ? g.rows : g.rows.slice(lo, Math.max(lo + 4, Math.max(...idx) + 2));
  return (
    <Panel title={g.name} pad={false}>
      <div className="px-2 pb-2">
        <div className="grid grid-cols-[22px_1fr_28px_36px_32px] gap-2 px-2 pb-1 text-2xs text-fg-4">
          <span>#</span>
          <span>Team</span>
          <span className="text-center">P</span>
          <span className="text-center">GD</span>
          <span className="text-right">Pts</span>
        </div>
        {rows.map((r) => (
          <Link
            key={r.team.id || r.team.name}
            href={`/team?id=${r.team.id}&lg=${d.leagueSlug}`}
            className={clsx("grid h-8 grid-cols-[22px_1fr_28px_36px_32px] items-center gap-2 rounded-md px-2 text-sm hover:bg-hover", ids.includes(r.team.id) && "bg-accent-soft")}
          >
            <span className="tnum text-xs text-fg-3">{r.rank}</span>
            <span className="flex min-w-0 items-center gap-2">
              <TeamLogo src={r.team.logo} abbr={r.team.abbr} size={16} />
              <span className="truncate">{r.team.short || r.team.name}</span>
            </span>
            <span className="tnum text-center text-fg-3">{r.gp}</span>
            <span className="tnum text-center text-fg-3">{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
            <span className="tnum text-right font-semibold">{r.pts}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function OtherMatches({ d }: { d: MatchDetail }) {
  // ESPN days run 05:00Z→05:00Z
  const espnDay = new Date(Date.parse(d.card.date) - 5 * 3600_000).toISOString().slice(0, 10).replace(/-/g, "");
  const { data } = useEspn<unknown>(`${SITE}/${d.leagueSlug}/scoreboard?dates=${espnDay}&limit=100`, { ttl: 20_000, poll: d.card.state === "in" ? 30_000 : undefined });
  const list = useMemo(() => {
    const all = data ? scoreboardMatches(data, d.leagueSlug).filter((m) => m.id !== d.card.id) : [];
    const sameGroup = d.card.note ? all.filter((m) => m.note === d.card.note) : [];
    return (sameGroup.length ? sameGroup : all).slice(0, 6);
  }, [data, d.card.id, d.card.note, d.leagueSlug]);
  if (!list.length) return null;
  return (
    <Panel title={d.card.note ? `Also in ${d.card.note}` : "Other matches today"} pad={false}>
      <div className="px-2 pb-2">
        {list.map((m) => (
          <Link key={m.id} href={`/match?id=${m.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 hover:bg-hover">
            <span className="min-w-0 space-y-1">
              {(["home", "away"] as const).map((s) => (
                <span key={s} className="flex items-center gap-2 text-sm">
                  <TeamLogo src={m[s].logo} abbr={m[s].abbr} size={16} />
                  <span className="flex-1 truncate">{m[s].short}</span>
                  <span className="tnum w-4 text-right font-semibold">{m.state === "pre" ? "" : m[s].score}</span>
                </span>
              ))}
            </span>
            <span className={clsx("tnum w-12 text-center text-xs", m.state === "in" ? "font-semibold text-live" : "text-fg-3")}>
              {m.state === "pre" ? <LocalTime iso={m.date} opts={{ hour: "2-digit", minute: "2-digit", hour12: false }} /> : m.status}
            </span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function MatchInfo({ d }: { d: MatchDetail }) {
  const comp = compBySlug(d.leagueSlug);
  const rows: [React.ReactNode, React.ReactNode][] = [
    [<Trophy key="i" size={14} />, <>{comp?.name ?? d.leagueName}{d.card.note && !(comp?.name ?? d.leagueName ?? "").toLowerCase().includes(d.card.note.toLowerCase()) ? ` · ${d.card.note}` : ""}</>],
    [<CalendarClock key="i" size={14} />, <LocalTime key="t" iso={d.card.date} opts={{ weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }} />],
  ];
  if (d.venue) rows.push([<MapPin key="i" size={14} />, `${d.venue}${d.city ? `, ${d.city}` : ""}`]);
  if (d.attendance) rows.push([<Users key="i" size={14} />, `${d.attendance.toLocaleString()} fans`]);
  if (d.referee) rows.push([<span key="i" className="text-[13px]">🟨</span>, `Referee: ${d.referee}`]);
  return (
    <Panel title="Match info" pad={false}>
      <ul className="space-y-2 px-4 pb-3 text-sm text-fg-2">
        {rows.map(([icon, text], i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 text-fg-4">{icon}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <Link href={`/studio?match=${d.card.id}`} className="flex items-center gap-2 border-t px-4 py-2.5 text-sm text-accent-text hover:bg-hover" title="Free OBS / browser-source scoreboard for streamers">
        <Tv size={14} /> Use this match on your stream <ArrowRight size={12} className="ml-auto" />
      </Link>
    </Panel>
  );
}

function TopRated({ d, onSelect }: { d: MatchDetail; onSelect: (p: LineupPlayer) => void }) {
  const list = d.lineups
    .flatMap((l) => [...l.starters, ...l.bench].map((p) => ({ p, l })))
    .filter((x) => x.p.rating != null)
    .sort((a, b) => (b.p.rating ?? 0) - (a.p.rating ?? 0))
    .slice(0, 5);
  if (!list.length || (d.card.state === "in" && d.minute < 15)) return null;
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-1.5">
          Player ratings
          <InfoTip label="HS Rating" onceKey="rating">
            Our own open 0–10 rating from public stats: goals, assists, shots, saves, cards and the result. Everyone starts at 6.0. Tap a player to see the maths. Beta — there is no passing data.
          </InfoTip>
        </span>
      }
      subtitle="HS Rating · beta"
      pad={false}
    >
      <div className="px-2 pb-2">
        {list.map(({ p, l }) => (
          <button key={p.id} onClick={() => onSelect(p)} className="flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left hover:bg-hover">
            <PlayerPhoto name={p.name} size={32} color={l.team.color} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{p.name}</span>
              <span className="block text-2xs text-fg-4">
                {l.team.short} · {p.pos}
              </span>
            </span>
            <RatingChip r={p.rating} motm={p.motm} />
          </button>
        ))}
      </div>
    </Panel>
  );
}

/** Overview tab: story first (events, latest), then momentum + stats, then context. */
export function Overview({ d, colors, onTab, onSelect }: { d: MatchDetail; colors: [string, string]; onTab: (t: "commentary" | "stats") => void; onSelect: (p: LineupPlayer) => void }) {
  const started = d.card.state !== "pre";
  const group = d.standings.find((g) => g.rows.some((r) => r.team.id === d.card.home.id || r.team.id === d.card.away.id));
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        {started && d.events.some((e) => e.kind !== "period") && (
          <Panel title="Key events" pad={false}>
            <div className="px-4 pb-2">
              <Timeline events={d.events} minute={d.minute} live={d.card.state === "in"} colors={colors} />
            </div>
          </Panel>
        )}
        {started && d.commentary.length > 0 && <LatestCommentary items={d.commentary} onMore={() => onTab("commentary")} />}
        {started && (
          <Panel pad={false}>
            <div className="grid xl:grid-cols-2">
              <div className="p-4 xl:border-r">
                <h2 className="mb-2 text-sm font-medium">
                  <MomentumTitle />
                </h2>
                <Momentum card={d.card} commentary={d.commentary} events={d.events} minute={d.minute} colors={colors} />
              </div>
              <div className="border-t p-4 xl:border-t-0">
                <h2 className="mb-3 text-sm font-medium">Top stats</h2>
                {d.stats.length ? (
                  <TopStats stats={d.stats} colors={colors} names={[d.card.home.short, d.card.away.short]} />
                ) : (
                  <p className="py-6 text-center text-sm text-fg-4">Stats arrive a few minutes into the match.</p>
                )}
              </div>
            </div>
            {d.stats.length > 0 && (
              <button onClick={() => onTab("stats")} className="flex w-full cursor-pointer items-center justify-center gap-1 border-t py-2.5 text-sm font-medium text-fg-2 transition-colors hover:bg-hover hover:text-fg">
                All stats <ArrowRight size={13} />
              </button>
            )}
          </Panel>
        )}
        {!started && (
          <Panel className="py-8 text-center">
            <p className="text-sm text-fg-2">
              Kick-off <LocalTime iso={d.card.date} opts={{ weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }} /> your time
            </p>
            <p className="mt-1 text-xs text-fg-4">Team sheets usually land about an hour before kick-off. We&apos;ll drop them in here.</p>
          </Panel>
        )}
        <FormScores d={d} />
      </div>
      <div className="space-y-4">
        <TopRated d={d} onSelect={onSelect} />
        {group && <GroupSnippet g={group} d={d} />}
        <OtherMatches d={d} />
        <MatchInfo d={d} />
      </div>
    </div>
  );
}
