import { notFound } from "next/navigation";
import Link from "next/link";
import { LEAGUE_BY_ID, ZONE_LABEL } from "@/lib/data/leagues";
import type { SeasonId } from "@/lib/data/types";
import { seasonHref } from "@/lib/paths";
import { teamBySlug } from "@/lib/data/teams";
import { teamLeagueSeason } from "@/lib/seasonOf";
import { computeTable, halvesTable, htFtTable, isPlayed, positionRace, teamSeason } from "@/lib/derive";
import { Crest } from "@/components/ui/Crest";
import { FollowButton } from "@/components/ui/Favorites";
import { FormStrip } from "@/components/ui/FormPill";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { DataBadge } from "@/components/ui/DataBadge";
import { GoalsTimeline, MirrorBars, PositionLine } from "@/components/charts/TeamCharts";
import { StandingsTable } from "@/components/league/StandingsTable";
import { MatchRow } from "@/components/match/MatchRow";
import { LeagueMark } from "@/components/shell/LeagueMark";

const perGame = (v: number, p: number) => (p ? v / p : 0);

export async function TeamView({ slug, season }: { slug: string; season: SeasonId }) {
  const team = teamBySlug(slug);
  if (!team) notFound();
  const res = await teamLeagueSeason(slug, season);
  if (!res) notFound();
  const { ls, fellBack } = res;
  const cfg = LEAGUE_BY_ID[ls.league];
  const ts = teamSeason(ls.league, ls.matches, ls.teams, slug);
  const table = computeTable(ls.league, ls.matches, ls.teams);
  const row = table.find((r) => r.team === slug)!;
  const race = positionRace(ls.league, ls.matches, ls.teams);
  const mine = race.series.find((s) => s.team === slug)!;
  const halves = halvesTable(ls.matches, [slug])[0];
  const gs = htFtTable(ls.matches, [slug])[0];
  const fixtures = ls.matches.filter((m) => m.home === slug || m.away === slug);
  const upcoming = fixtures.filter((m) => !isPlayed(m)).slice(0, 5);
  const recent = fixtures.filter(isPlayed).slice(-8).reverse();
  const ppg = perGame(row.pts, row.p);

  return (
    <>
      <div
        className="hero-glow relative -mx-4 mb-6 overflow-hidden px-4 pt-6 pb-7 md:-mx-8 md:rounded-2xl md:px-8"
        style={{ ["--team-glow" as string]: `color-mix(in oklab, ${team.color} 22%, transparent)`, ["--glow-x" as string]: "12%" }}
      >
        <div className="noise absolute inset-0" />
        {fellBack && (
          <div className="relative mb-4 rounded-md bg-hover px-3 py-2 text-xs text-fg-3 shadow-ring">
            {team.short} isn&apos;t in a top-five league that season — showing {ls.season.replace("-", "/")} instead.
          </div>
        )}
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <Crest slug={slug} size={72} logo={ls.logos[slug]} />
            <div>
              <h1 className="display text-gradient text-[32px] leading-10">{team.short}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-3">
                <span>{team.name}</span>
                <span className="text-fg-4">·</span>
                <Link href={seasonHref(`/league/${ls.league}`, ls.season)} className="inline-flex items-center gap-1.5 hover:text-fg">
                  <LeagueMark id={ls.league} size={14} /> {cfg.name}
                </Link>
                <span className="text-fg-4">·</span>
                <span>{ls.season.replace("-", "/")}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <FollowButton slug={slug} withLabel />
                {row.form.length > 0 && <FormStrip form={row.form} size={20} />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-panel/70 px-4 py-3 text-center shadow-ring backdrop-blur">
              <div className="text-2xs text-fg-3">Position</div>
              <div className="display text-[34px] leading-10">{row.pos}</div>
              <div className="text-2xs text-fg-4">{row.zone ? ZONE_LABEL[row.zone] : `of ${ls.teams.length}`}</div>
            </div>
            <div className="rounded-xl bg-panel/70 px-4 py-3 text-center shadow-ring backdrop-blur">
              <div className="text-2xs text-fg-3">Points</div>
              <div className="display text-[34px] leading-10">{row.pts}</div>
              <div className="tnum text-2xs text-fg-4">{ppg.toFixed(2)} per game</div>
            </div>
          </div>
        </div>
        <div className="relative mt-7 grid grid-cols-3 gap-x-6 gap-y-5 sm:grid-cols-6">
          <Stat label="Played" value={row.p} hint={`${row.w}W ${row.d}D ${row.l}L`} />
          <Stat label="Goals for" value={row.gf} hint={`${perGame(row.gf, row.p).toFixed(2)} per game`} />
          <Stat label="Goals against" value={row.ga} hint={`${perGame(row.ga, row.p).toFixed(2)} per game`} />
          <Stat label="Clean sheets" value={ts.cleanSheets} />
          <Stat label="Longest unbeaten" value={ts.longestUnbeaten} hint="matches" />
          <Stat
            label="Current streak"
            value={ts.currentStreak?.length ?? 0}
            hint={ts.currentStreak ? { W: "wins", D: "draws", L: "defeats" }[ts.currentStreak.kind] : "—"}
          />
        </div>
        <div className="relative mt-5">
          <DataBadge meta={ls.meta} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="League position" subtitle="After every matchday" delay={0.05}>
          {race.rounds.length > 1 ? (
            <PositionLine rounds={race.rounds} positions={mine.positions} teams={ls.teams.length} color={"var(--s1)"} />
          ) : (
            <p className="py-10 text-center text-sm text-fg-3">Not enough matchdays yet.</p>
          )}
        </Panel>
        <Panel title="Match by match" subtitle="Goals scored and conceded in every game · click a bar for the match" delay={0.1}>
          <GoalsTimeline entries={ts.matches} />
        </Panel>
        <Panel title="Home vs away" subtitle="Per-game averages" delay={0.05}>
          <div className="mb-3 flex justify-between text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 text-fg-2"><span className="h-2 w-2 rounded-[2px] bg-[var(--s1)]" /> Home · {ts.home.p} GP</span>
            <span className="inline-flex items-center gap-1.5 text-fg-2">Away · {ts.away.p} GP <span className="h-2 w-2 rounded-[2px] bg-[var(--s2)]" /></span>
          </div>
          <MirrorBars
            colorA="var(--s1)"
            colorB="var(--s2)"
            rows={[
              { label: "Points per game", a: perGame(ts.home.pts, ts.home.p), b: perGame(ts.away.pts, ts.away.p), fmt: "dec2" },
              { label: "Win rate", a: perGame(ts.home.w, ts.home.p), b: perGame(ts.away.w, ts.away.p), fmt: "pct" },
              { label: "Goals scored / game", a: perGame(ts.home.gf, ts.home.p), b: perGame(ts.away.gf, ts.away.p), fmt: "dec2" },
              { label: "Goals conceded / game", a: perGame(ts.home.ga, ts.home.p), b: perGame(ts.away.ga, ts.away.p), fmt: "dec2", lowerIsBetter: true },
            ]}
          />
        </Panel>
        <Panel title="Game state" subtitle={`From ${halves.n} matches with half-time scores`} delay={0.1}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Stat label="Scored in 1st half" value={halves.for1} hint={`conceded ${halves.against1}`} />
            <Stat label="Scored in 2nd half" value={halves.for2} hint={`conceded ${halves.against2}`} />
            <Stat label="Leads held at HT" value={gs.heldLead} hint={`of ${gs.ledAtHt} half-time leads`} />
            <Stat label="Comeback wins" value={gs.comebacks} hint={`${gs.rescued} draws rescued from behind`} />
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <Panel title="Upcoming" pad={false}>
              <div className="px-2 pb-2">
                {upcoming.map((m, i) => (
                  <MatchRow key={m.id} m={m} index={i} logos={ls.logos} showDate highlight={slug} />
                ))}
              </div>
            </Panel>
          )}
          <Panel title="Recent results" pad={false}>
            <div className="px-2 pb-2">
              {recent.length ? (
                recent.map((m, i) => <MatchRow key={m.id} m={m} index={i} logos={ls.logos} showDate highlight={slug} />)
              ) : (
                <p className="px-2 py-6 text-center text-sm text-fg-3">No results yet.</p>
              )}
            </div>
          </Panel>
        </div>
        <Panel title={cfg.name} subtitle="Standings" pad={false} className="pb-2">
          <StandingsTable league={ls.league} matches={ls.matches.filter(isPlayed)} teams={ls.teams} logos={ls.logos} compact highlight={[slug]} />
        </Panel>
      </div>
    </>
  );
}
