// Normalizes ESPN soccer JSON into small, stable shapes the UI renders.
// Every field access is defensive: ESPN omits fields freely between competitions.

import { compBySlug, slugFromUid } from "./competitions";

export type LiveState = "pre" | "in" | "post";

export interface TeamRef {
  id: string;
  name: string;
  short: string;
  abbr: string;
  logo?: string;
  color?: string;
}

export interface MatchCard {
  id: string;
  league: string; // ESPN slug, e.g. eng.1
  leagueName?: string;
  date: string; // ISO
  state: LiveState;
  status: string; // e.g. "FT", "HT", "67'", "Postponed"
  statusLong: string;
  clock?: string;
  period?: number;
  completed: boolean;
  home: TeamRef & { score?: number; winner?: boolean; form?: string; shootout?: number };
  away: TeamRef & { score?: number; winner?: boolean; form?: string; shootout?: number };
  venue?: string;
  note?: string; // e.g. "Group A", "Leg 1 of 2"
  events: { minute: string; type: "goal" | "own-goal" | "penalty" | "red" | "yellow"; team: "home" | "away"; player?: string }[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const num = (v: unknown) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

export function teamRef(t: Any): TeamRef {
  const logo = t?.logo ?? t?.logos?.[0]?.href ?? (t?.id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${t.id}.png` : undefined);
  return {
    id: String(t?.id ?? ""),
    name: t?.displayName ?? t?.name ?? "TBD",
    short: t?.shortDisplayName ?? t?.displayName ?? t?.name ?? "TBD",
    abbr: t?.abbreviation ?? (t?.displayName ?? "").slice(0, 3).toUpperCase(),
    logo,
    color: t?.color ? `#${String(t.color).replace("#", "")}` : undefined,
  };
}

export function statusOf(st: Any): Pick<MatchCard, "state" | "status" | "statusLong" | "clock" | "period" | "completed"> {
  const type = st?.type ?? {};
  const state: LiveState = type.state === "in" ? "in" : type.state === "post" ? "post" : "pre";
  const name: string = type.name ?? "";
  let status = type.shortDetail ?? type.detail ?? "";
  if (state === "in") status = /HALFTIME/.test(name) ? "HT" : st?.displayClock ?? status;
  if (/POSTPONED/.test(name)) status = "PP";
  if (/CANCELED/.test(name)) status = "Canc.";
  if (/ABANDONED/.test(name)) status = "Abd.";
  return {
    state,
    status,
    statusLong: type.description ?? status,
    clock: st?.displayClock,
    period: num(st?.period),
    completed: !!type.completed,
  };
}

function cleanNote(note: string | undefined, leagueName?: string) {
  if (!note) return undefined;
  let n = note;
  if (leagueName && n.startsWith(leagueName)) n = n.slice(leagueName.length).replace(/^[\s,:–-]+/, "");
  return n || undefined;
}

/** One scoreboard event → MatchCard. */
export function matchCard(ev: Any, leagueSlug: string, leagueName?: string): MatchCard | null {
  const comp = ev?.competitions?.[0];
  const cs: Any[] = comp?.competitors ?? [];
  const h = cs.find((c) => c.homeAway === "home") ?? cs[0];
  const a = cs.find((c) => c.homeAway === "away") ?? cs[1];
  if (!ev?.id || !h || !a) return null;
  const s = statusOf(ev.status ?? comp.status);
  const side = (c: Any) => ({
    ...teamRef(c.team),
    score: s.state === "pre" ? undefined : num(c.score?.value ?? c.score),
    winner: c.winner,
    form: c.form,
    shootout: num(c.shootoutScore),
  });
  const events: MatchCard["events"] = [];
  for (const d of comp.details ?? []) {
    const type = d.ownGoal ? "own-goal" : d.redCard ? "red" : d.scoringPlay && d.penaltyKick ? "penalty" : d.scoringPlay ? "goal" : d.yellowCard ? "yellow" : null;
    if (!type || d.shootout) continue;
    events.push({
      minute: d.clock?.displayValue ?? "",
      type,
      team: String(d.team?.id) === String(h.team?.id) ? "home" : "away",
      player: d.athletesInvolved?.[0]?.shortName ?? d.athletesInvolved?.[0]?.displayName,
    });
  }
  return {
    id: String(ev.id),
    league: leagueSlug,
    leagueName,
    date: ev.date ?? comp.date,
    ...s,
    home: side(h),
    away: side(a),
    venue: comp.venue?.fullName ?? ev.venue?.displayName,
    note: cleanNote(comp.notes?.[0]?.headline ?? comp.altGameNote, leagueName),
    events,
  };
}

export function scoreboardMatches(sb: Any, fallbackSlug: string): MatchCard[] {
  const lg = sb?.leagues?.[0];
  const slug = lg?.slug ?? fallbackSlug;
  return (sb?.events ?? [])
    .map((ev: Any) => {
      const evSlug = slugFromUid(ev?.uid) ?? ev?.competitions?.[0]?.league?.slug ?? ev?.league?.slug ?? slug;
      return matchCard(ev, evSlug, compBySlug(evSlug)?.name ?? lg?.name);
    })
    .filter(Boolean) as MatchCard[];
}

/* ------------------------------------------------------------- standings */

export interface StandingRowX {
  rank: number;
  team: TeamRef;
  gp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  note?: { color?: string; description?: string };
}

export interface StandingGroup {
  name: string;
  rows: StandingRowX[];
}

export function standingsGroups(js: Any): StandingGroup[] {
  const groups: Any[] = js?.children?.length ? js.children : js?.standings ? [js] : [];
  return groups
    .map((g) => {
      const entries: Any[] = g?.standings?.entries ?? [];
      const rows = entries.map((e) => {
        const stat = (k: string) => {
          const s = (e.stats ?? []).find((x: Any) => x.abbreviation === k || x.name === k || x.type === k.toLowerCase());
          return num(s?.value ?? s?.displayValue) ?? 0;
        };
        return {
          rank: stat("R") || num(e.note?.rank) || 0,
          team: teamRef(e.team),
          gp: stat("GP"),
          w: stat("W"),
          d: stat("D"),
          l: stat("L"),
          gf: stat("F"),
          ga: stat("A"),
          gd: stat("GD"),
          pts: stat("P"),
          note: e.note ? { color: e.note.color, description: e.note.description } : undefined,
        } as StandingRowX;
      });
      rows.sort((a, b) => (a.rank || 99) - (b.rank || 99) || b.pts - a.pts || b.gd - a.gd);
      rows.forEach((r, i) => (r.rank = r.rank || i + 1));
      return { name: g?.name ?? g?.abbreviation ?? "Table", rows };
    })
    .filter((g) => g.rows.length);
}

/* ---------------------------------------------------------- match detail */
import { hsRating, posGroup, type PlayerMatchStats, type PosGroup, type RatingLine } from "./rating";

export interface LineupPlayer {
  id: string;
  name: string;
  short: string;
  last: string;
  jersey?: string;
  pos: string; // ESPN abbreviation e.g. CD-L
  posName: string;
  group: PosGroup;
  starter: boolean;
  place?: number;
  subbedIn?: string; // minute
  subbedOut?: string;
  stats: PlayerMatchStats;
  minutes: number;
  rating: number | null;
  ratingLines: RatingLine[];
  motm?: boolean;
}

export interface TeamLineup {
  team: TeamRef;
  side: "home" | "away";
  formation?: string;
  starters: LineupPlayer[];
  bench: LineupPlayer[];
  coach?: string;
}

export interface MatchEvent {
  id: string;
  minute: string;
  sortKey: number; // seconds, stoppage-aware
  period: number;
  kind: "goal" | "own-goal" | "penalty" | "penalty-miss" | "yellow" | "red" | "sub" | "var" | "period";
  side?: "home" | "away";
  text: string;
  player?: string;
  playerId?: string;
  related?: string; // assist or player replaced
  x?: number; // field position 0–100 when ESPN provides it
  y?: number;
}

export interface TeamStatPair {
  key: string;
  label: string;
  home: number;
  away: number;
  homeLabel: string;
  awayLabel: string;
  pct?: boolean;
}

export interface CommentaryItem {
  seq: number;
  minute: string;
  text: string;
  kind?: string;
  side?: "home" | "away";
  sec?: number;
}

export interface MatchDetail {
  card: MatchCard;
  leagueSlug: string;
  leagueName: string;
  season?: string;
  lineups: TeamLineup[];
  events: MatchEvent[];
  stats: TeamStatPair[];
  commentary: CommentaryItem[];
  standings: StandingGroup[];
  venue?: string;
  city?: string;
  attendance?: number;
  referee?: string;
  form: { side: "home" | "away"; games: { id: string; date: string; result?: string; score: string; opponent: string; opponentLogo?: string; atVs?: string }[] }[];
  h2h: { id: string; date: string; home: string; away: string; score: string; leagueName?: string }[];
  minute: number; // current/last minute for timelines
}

const STAT_LABELS: [string, string, boolean?][] = [
  ["possessionPct", "Possession", true],
  ["totalShots", "Shots"],
  ["shotsOnTarget", "Shots on target"],
  ["blockedShots", "Blocked shots"],
  ["wonCorners", "Corners"],
  ["accuratePasses", "Accurate passes"],
  ["totalPasses", "Passes"],
  ["passPct", "Pass accuracy", true],
  ["totalCrosses", "Crosses"],
  ["totalLongBalls", "Long balls"],
  ["effectiveTackles", "Tackles won"],
  ["interceptions", "Interceptions"],
  ["effectiveClearance", "Clearances"],
  ["saves", "Saves"],
  ["foulsCommitted", "Fouls"],
  ["offsides", "Offsides"],
  ["yellowCards", "Yellow cards"],
  ["redCards", "Red cards"],
];

function minuteToSeconds(display: string | undefined, value?: number) {
  if (value != null && Number.isFinite(value)) return value;
  const m = (display ?? "").match(/(\d+)(?:'?\s*\+\s*(\d+))?/);
  if (!m) return 0;
  return (Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0)) * 60;
}

function playerStats(arr: Any[] | undefined): PlayerMatchStats {
  const s: Any = {};
  for (const x of arr ?? []) s[x.abbreviation ?? x.name] = num(x.value ?? x.displayValue) ?? 0;
  return { G: s.G ?? 0, A: s.A ?? 0, SHOT: s.SHOT ?? s.SH ?? 0, SOG: s.SOG ?? s.ST ?? 0, SV: s.SV ?? 0, GA: s.GA ?? 0, FC: s.FC ?? 0, FA: s.FA ?? 0, YC: s.YC ?? 0, RC: s.RC ?? 0, OG: s.OG ?? 0 };
}

export function matchDetail(js: Any, slugHint: string): MatchDetail | null {
  const header = js?.header;
  const comp = header?.competitions?.[0];
  if (!comp) return null;
  const leagueSlug = header?.league?.slug ?? slugHint;
  const card = matchCard({ id: header.id, date: comp.date, status: comp.status, competitions: [comp] }, leagueSlug, header?.league?.name);
  if (!card) return null;
  const homeId = card.home.id;
  const sideOf = (teamId: unknown, name?: string): "home" | "away" | undefined => {
    if (teamId != null) return String(teamId) === homeId ? "home" : "away";
    if (!name) return undefined;
    const n = name.toLowerCase();
    if (n === card.home.name.toLowerCase() || n === card.home.short.toLowerCase()) return "home";
    if (n === card.away.name.toLowerCase() || n === card.away.short.toLowerCase()) return "away";
    return undefined;
  };
  const nowMinute = Math.max(1, Math.round(((comp.status?.clock as number) ?? 0) / 60)) || (card.state === "post" ? 90 : 0);
  const endMinute = card.state === "post" ? Math.max(90, nowMinute) : card.state === "in" ? nowMinute : 0;

  // --- events
  const events: MatchEvent[] = [];
  for (const e of js.keyEvents ?? []) {
    const t = (e.type?.text ?? "").toLowerCase();
    let kind: MatchEvent["kind"] | null = null;
    if (/own goal/.test(t)) kind = "own-goal";
    else if (/penalty - (missed|saved)/.test(t)) kind = "penalty-miss";
    else if (/penalty - scored/.test(t)) kind = "penalty";
    else if (e.scoringPlay || t === "goal" || /^goal/.test(t)) kind = "goal";
    else if (/red card/.test(t)) kind = "red";
    else if (/yellow card/.test(t)) kind = "yellow";
    else if (/substitution/.test(t)) kind = "sub";
    else if (/var/.test(t)) kind = "var";
    else if (/halftime|end regular time|end of extra|full time/.test(t)) kind = "period";
    if (!kind) continue;
    const parts = e.participants ?? [];
    events.push({
      id: String(e.id),
      minute: e.clock?.displayValue ?? "",
      sortKey: minuteToSeconds(e.clock?.displayValue, e.clock?.value),
      period: e.period?.number ?? 1,
      kind,
      side: sideOf(e.team?.id),
      text: e.text ?? e.shortText ?? e.type?.text ?? "",
      player: parts[0]?.athlete?.displayName,
      playerId: parts[0]?.athlete?.id,
      related: parts[1]?.athlete?.displayName,
      x: num(e.fieldPositionX),
      y: num(e.fieldPositionY),
    });
  }
  events.sort((a, b) => a.sortKey - b.sortKey);

  // --- lineups + ratings
  const ftHome = card.home.score ?? 0;
  const ftAway = card.away.score ?? 0;
  const lineups: TeamLineup[] = (js.rosters ?? []).map((r: Any) => {
    const side: "home" | "away" = r.homeAway === "home" || String(r.team?.id) === homeId ? "home" : "away";
    const conceded = side === "home" ? ftAway : ftHome;
    const result = card.state !== "post" ? null : (side === "home" ? ftHome - ftAway : ftAway - ftHome) > 0 ? "W" : ftHome === ftAway ? "D" : "L";
    const players: LineupPlayer[] = (r.roster ?? []).map((p: Any) => {
      const plays: Any[] = p.plays ?? [];
      const subMinute = plays.find((x) => x.substitution)?.clock?.displayValue as string | undefined;
      const subbedIn = p.subbedIn ? subMinute ?? "" : undefined;
      const subbedOut = p.subbedOut ? subMinute ?? "" : undefined;
      const m = (x?: string) => (x ? parseInt(x, 10) || 0 : 0);
      let minutes = 0;
      if (p.starter) minutes = (p.subbedOut ? m(subbedOut) : endMinute);
      else if (p.subbedIn) minutes = Math.max(0, endMinute - m(subbedIn));
      const stats = playerStats(p.stats);
      const group = posGroup(p.position?.abbreviation, p.position?.name);
      const { rating, lines } = minutes > 0 ? hsRating({ pos: group, stats, minutes, teamConceded: conceded, result }) : { rating: null, lines: [] };
      const a = p.athlete ?? {};
      return {
        id: String(a.id ?? ""),
        name: a.displayName ?? "",
        short: a.shortName ?? a.displayName ?? "",
        last: a.lastName || (a.displayName ?? "").split(" ").slice(-1)[0],
        jersey: p.jersey,
        pos: p.position?.abbreviation ?? "",
        posName: p.position?.displayName ?? p.position?.name ?? "",
        group,
        starter: !!p.starter,
        place: num(p.formationPlace),
        subbedIn,
        subbedOut,
        stats,
        minutes,
        rating,
        ratingLines: lines,
      } satisfies LineupPlayer;
    });
    return {
      team: teamRef(r.team),
      side,
      formation: r.formation,
      starters: players.filter((p) => p.starter),
      bench: players.filter((p) => !p.starter),
      coach: r.coach?.[0]?.displayName,
    } satisfies TeamLineup;
  });
  lineups.sort((a) => (a.side === "home" ? -1 : 1));
  const all = lineups.flatMap((l) => [...l.starters, ...l.bench]).filter((p) => p.rating != null);
  if (card.state === "post" && all.length) {
    const best = all.reduce((x, y) => ((y.rating ?? 0) > (x.rating ?? 0) ? y : x));
    best.motm = true;
  }

  // --- team stats
  const bs: Any[] = js.boxscore?.teams ?? [];
  const bh = bs.find((t) => String(t.team?.id) === homeId) ?? bs[0];
  const ba = bs.find((t) => String(t.team?.id) !== homeId) ?? bs[1];
  const statOf = (t: Any, k: string) => (t?.statistics ?? []).find((x: Any) => x.name === k);
  const stats: TeamStatPair[] = [];
  for (const [k, label, pct] of STAT_LABELS) {
    const h = statOf(bh, k);
    const a = statOf(ba, k);
    if (!h && !a) continue;
    let hv = num(h?.displayValue) ?? 0;
    let av = num(a?.displayValue) ?? 0;
    if (k === "passPct") {
      hv = Math.round(hv * (hv <= 1 ? 100 : 1));
      av = Math.round(av * (av <= 1 ? 100 : 1));
    }
    stats.push({ key: k, label, home: hv, away: av, homeLabel: pct ? `${Math.round(hv)}%` : String(hv), awayLabel: pct ? `${Math.round(av)}%` : String(av), pct });
  }

  // --- commentary (newest first)
  const commentary: CommentaryItem[] = (js.commentary ?? [])
    .map((c: Any) => ({
      seq: c.sequence ?? 0,
      minute: c.time?.displayValue ?? "",
      text: c.text ?? "",
      kind: c.play?.type?.text,
      side: sideOf(c.play?.team?.id, c.play?.team?.displayName),
      sec: num(c.time?.value) ?? num(c.play?.clock?.value),
    }))
    .filter((c: CommentaryItem) => c.text)
    .sort((a: CommentaryItem, b: CommentaryItem) => b.seq - a.seq);

  // --- standings embedded in the summary
  const standings: StandingGroup[] = [];
  for (const g of js.standings?.groups ?? []) {
    const rows: StandingRowX[] = (g.standings?.entries ?? []).map((e: Any, i: number) => {
      const st = (k: string) => num((e.stats ?? []).find((x: Any) => x.abbreviation === k || x.name === k || x.type === k)?.value ?? (e.stats ?? []).find((x: Any) => x.abbreviation === k)?.displayValue) ?? 0;
      return {
        rank: st("R") || i + 1,
        team: { id: String(e.id ?? ""), name: e.team ?? "", short: e.team ?? "", abbr: (e.team ?? "").slice(0, 3).toUpperCase(), logo: e.logo?.[0]?.href ?? (e.id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${e.id}.png` : undefined) },
        gp: st("GP") || st("gamesPlayed"),
        w: st("W") || st("wins"),
        d: st("D") || st("ties"),
        l: st("L") || st("losses"),
        gf: st("F") || st("pointsFor"),
        ga: st("A") || st("pointsAgainst"),
        gd: st("GD") || st("pointDifferential"),
        pts: st("P") || st("points"),
      };
    });
    if (rows.length) standings.push({ name: g.header ?? js.standings?.header ?? "Table", rows });
  }

  // --- recent form + head to head
  const form: MatchDetail["form"] = (js.lastFiveGames ?? []).map((f: Any) => ({
    side: sideOf(f.team?.id) ?? "home",
    games: (f.events ?? []).map((g: Any) => ({
      id: String(g.id),
      date: g.gameDate,
      result: g.gameResult,
      score: g.score ?? "",
      opponent: g.opponent?.displayName ?? g.opponent?.abbreviation ?? "",
      opponentLogo: g.opponentLogo ?? g.opponent?.logo,
      atVs: g.atVs,
    })),
  }));
  const h2h: MatchDetail["h2h"] = [];
  for (const ss of js.headToHeadGames ?? []) {
    for (const g of ss.events ?? []) {
      h2h.push({ id: String(g.id), date: g.gameDate, home: g.homeTeamId, away: g.awayTeamId, score: g.score ?? "", leagueName: g.leagueName });
    }
  }

  const officials: Any[] = js.gameInfo?.officials ?? [];
  return {
    card,
    leagueSlug,
    leagueName: header?.league?.name ?? "",
    season: header?.season?.name,
    lineups,
    events,
    stats,
    commentary,
    standings,
    venue: js.gameInfo?.venue?.fullName,
    city: [js.gameInfo?.venue?.address?.city, js.gameInfo?.venue?.address?.country].filter(Boolean).join(", ") || undefined,
    attendance: num(js.gameInfo?.attendance) || undefined,
    referee: officials[0]?.displayName ?? officials[0]?.fullName,
    form,
    h2h,
    minute: endMinute,
  };
}
