// Pure analytics over normalized matches. Safe to import on server and client.
import type { FormEntry, LeagueId, Match, Outcome, Score, StandingRow } from "./data/types";
import { zoneFor } from "./data/leagues";

export const isPlayed = (m: Match): m is Match & { ft: Score } => m.status === "ft" && !!m.ft;

export function outcomeFor(m: Match & { ft: Score }, team: string): Outcome {
  const [h, a] = m.ft;
  const mine = m.home === team ? h : a;
  const theirs = m.home === team ? a : h;
  return mine > theirs ? "W" : mine < theirs ? "L" : "D";
}

export function perspective(m: Match & { ft: Score }, team: string): FormEntry {
  const home = m.home === team;
  return {
    outcome: outcomeFor(m, team),
    matchId: m.id,
    opponent: home ? m.away : m.home,
    venue: home ? "H" : "A",
    score: home ? m.ft : [m.ft[1], m.ft[0]],
    ht: m.ht ? (home ? m.ht : [m.ht[1], m.ht[0]]) : undefined,
  };
}

export type Venue = "all" | "home" | "away";

export interface TableOptions {
  venue?: Venue;
  lastN?: number; // only each team's last N matches (form table)
  upToMatchday?: number;
}

export function computeTable(
  league: LeagueId,
  matches: Match[],
  teams: string[],
  opts: TableOptions = {},
): StandingRow[] {
  const { venue = "all", lastN, upToMatchday } = opts;
  const rows = new Map<string, StandingRow>(
    teams.map((t) => [t, { pos: 0, team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: [] }]),
  );
  const played = matches.filter(isPlayed).filter((m) => upToMatchday == null || m.matchday <= upToMatchday);

  const perTeam = new Map<string, (Match & { ft: Score })[]>();
  for (const m of played) {
    for (const t of [m.home, m.away]) {
      if (venue === "home" && m.home !== t) continue;
      if (venue === "away" && m.away !== t) continue;
      if (!perTeam.has(t)) perTeam.set(t, []);
      perTeam.get(t)!.push(m);
    }
  }

  for (const [t, list] of perTeam) {
    const row = rows.get(t);
    if (!row) continue;
    const ms = lastN ? list.slice(-lastN) : list;
    for (const m of ms) {
      const pe = perspective(m, t);
      row.p++;
      row.gf += pe.score[0];
      row.ga += pe.score[1];
      if (pe.outcome === "W") row.w++;
      else if (pe.outcome === "D") row.d++;
      else row.l++;
    }
    row.form = list.slice(-5).map((m) => perspective(m, t));
  }

  const out = [...rows.values()].map((r) => ({ ...r, gd: r.gf - r.ga, pts: r.w * 3 + r.d }));
  out.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  out.forEach((r, i) => {
    r.pos = i + 1;
    r.zone = venue === "all" && !lastN ? zoneFor(league, r.pos) : undefined;
  });
  return out;
}

/** Highest matchday that has at least one result. */
export const lastPlayedMatchday = (matches: Match[]) =>
  matches.filter(isPlayed).reduce((mx, m) => Math.max(mx, m.matchday), 0);

export interface RaceSeries {
  team: string;
  positions: number[]; // index = matchday-1
  points: number[];
}

/** League position and cumulative points for every team after each matchday. */
export function positionRace(league: LeagueId, matches: Match[], teams: string[]) {
  const maxMd = lastPlayedMatchday(matches);
  const rounds = Array.from({ length: maxMd }, (_, i) => i + 1);
  const series = new Map<string, RaceSeries>(teams.map((t) => [t, { team: t, positions: [], points: [] }]));
  for (const md of rounds) {
    for (const r of computeTable(league, matches, teams, { upToMatchday: md })) {
      const s = series.get(r.team)!;
      s.positions.push(r.pos);
      s.points.push(r.pts);
    }
  }
  return { rounds, series: [...series.values()] };
}

export interface LeagueTotals {
  played: number;
  goals: number;
  gpg: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  btts: number;
  over25: number;
  cleanSheets: number;
  firstHalfGoals: number;
  secondHalfGoals: number;
  htSample: number;
  comebacks: number;
}

export function leagueTotals(matches: Match[]): LeagueTotals {
  const p = matches.filter(isPlayed);
  const n = Math.max(1, p.length);
  let goals = 0, hw = 0, dr = 0, aw = 0, btts = 0, o25 = 0, cs = 0, h1 = 0, h2 = 0, htn = 0, cb = 0;
  for (const m of p) {
    const [h, a] = m.ft;
    goals += h + a;
    if (h > a) hw++;
    else if (h === a) dr++;
    else aw++;
    if (h > 0 && a > 0) btts++;
    if (h + a > 2) o25++;
    if (h === 0) cs++;
    if (a === 0) cs++;
    if (m.ht) {
      htn++;
      h1 += m.ht[0] + m.ht[1];
      h2 += h + a - m.ht[0] - m.ht[1];
      const [hh, ha] = m.ht;
      if ((hh < ha && h > a) || (hh > ha && h < a)) cb++;
    }
  }
  return {
    played: p.length,
    goals,
    gpg: goals / n,
    homeWin: hw / n,
    draw: dr / n,
    awayWin: aw / n,
    btts: btts / n,
    over25: o25 / n,
    cleanSheets: cs,
    firstHalfGoals: h1,
    secondHalfGoals: h2,
    htSample: htn,
    comebacks: cb,
  };
}

export interface HtFtRow {
  team: string;
  ledAtHt: number;
  heldLead: number; // led at HT → won
  blownLead: number; // led at HT → drew or lost
  trailedAtHt: number;
  comebacks: number; // trailed at HT → won
  rescued: number; // trailed at HT → drew
  pointsFromLosing: number;
  pointsDroppedFromWinning: number;
}

export function htFtTable(matches: Match[], teams: string[]): HtFtRow[] {
  const rows = new Map<string, HtFtRow>(
    teams.map((t) => [t, { team: t, ledAtHt: 0, heldLead: 0, blownLead: 0, trailedAtHt: 0, comebacks: 0, rescued: 0, pointsFromLosing: 0, pointsDroppedFromWinning: 0 }]),
  );
  for (const m of matches.filter(isPlayed)) {
    if (!m.ht) continue;
    for (const t of [m.home, m.away]) {
      const pe = perspective(m, t);
      const r = rows.get(t);
      if (!r || !pe.ht) continue;
      const [hf, ha] = pe.ht;
      if (hf > ha) {
        r.ledAtHt++;
        if (pe.outcome === "W") r.heldLead++;
        else {
          r.blownLead++;
          r.pointsDroppedFromWinning += pe.outcome === "D" ? 2 : 3;
        }
      } else if (hf < ha) {
        r.trailedAtHt++;
        if (pe.outcome === "W") {
          r.comebacks++;
          r.pointsFromLosing += 3;
        } else if (pe.outcome === "D") {
          r.rescued++;
          r.pointsFromLosing += 1;
        }
      }
    }
  }
  return [...rows.values()];
}

export interface HalvesRow {
  team: string;
  for1: number;
  for2: number;
  against1: number;
  against2: number;
  n: number;
}

export function halvesTable(matches: Match[], teams: string[]): HalvesRow[] {
  const rows = new Map<string, HalvesRow>(teams.map((t) => [t, { team: t, for1: 0, for2: 0, against1: 0, against2: 0, n: 0 }]));
  for (const m of matches.filter(isPlayed)) {
    if (!m.ht) continue;
    for (const t of [m.home, m.away]) {
      const pe = perspective(m, t);
      const r = rows.get(t);
      if (!r || !pe.ht) continue;
      r.n++;
      r.for1 += pe.ht[0];
      r.against1 += pe.ht[1];
      r.for2 += pe.score[0] - pe.ht[0];
      r.against2 += pe.score[1] - pe.ht[1];
    }
  }
  return [...rows.values()];
}

/** Frequency of each final scoreline (home-away), capped at 5+. */
export function scorelineGrid(matches: Match[], cap = 5) {
  const grid = Array.from({ length: cap + 1 }, () => Array<number>(cap + 1).fill(0));
  let max = 0;
  for (const m of matches.filter(isPlayed)) {
    const h = Math.min(cap, m.ft[0]);
    const a = Math.min(cap, m.ft[1]);
    grid[h][a]++;
    max = Math.max(max, grid[h][a]);
  }
  return { grid, max, cap };
}

export function biggestWins(matches: Match[], n = 5) {
  return matches
    .filter(isPlayed)
    .slice()
    .sort((x, y) => {
      const mx = Math.abs(x.ft[0] - x.ft[1]);
      const my = Math.abs(y.ft[0] - y.ft[1]);
      return my - mx || y.ft[0] + y.ft[1] - (x.ft[0] + x.ft[1]);
    })
    .slice(0, n);
}

export interface TeamSeason {
  team: string;
  matches: FormEntry[];
  played: (Match & { ft: Score })[];
  home: StandingRow;
  away: StandingRow;
  all: StandingRow;
  cleanSheets: number;
  failedToScore: number;
  longestUnbeaten: number;
  longestWinRun: number;
  currentStreak: { kind: Outcome; length: number } | null;
}

export function teamSeason(league: LeagueId, matches: Match[], teams: string[], team: string): TeamSeason {
  const played = matches.filter(isPlayed).filter((m) => m.home === team || m.away === team);
  const entries = played.map((m) => perspective(m, team));
  const pick = (v: Venue) => computeTable(league, matches, teams, { venue: v }).find((r) => r.team === team)!;
  let unb = 0, bestUnb = 0, win = 0, bestWin = 0;
  for (const e of entries) {
    unb = e.outcome === "L" ? 0 : unb + 1;
    win = e.outcome === "W" ? win + 1 : 0;
    bestUnb = Math.max(bestUnb, unb);
    bestWin = Math.max(bestWin, win);
  }
  let currentStreak: TeamSeason["currentStreak"] = null;
  if (entries.length) {
    const kind = entries.at(-1)!.outcome;
    let len = 0;
    for (let i = entries.length - 1; i >= 0 && entries[i].outcome === kind; i--) len++;
    currentStreak = { kind, length: len };
  }
  return {
    team,
    matches: entries,
    played,
    home: pick("home"),
    away: pick("away"),
    all: pick("all"),
    cleanSheets: entries.filter((e) => e.score[1] === 0).length,
    failedToScore: entries.filter((e) => e.score[0] === 0).length,
    longestUnbeaten: bestUnb,
    longestWinRun: bestWin,
    currentStreak,
  };
}

export function headToHead(matches: Match[], a: string, b: string) {
  const list = matches
    .filter(isPlayed)
    .filter((m) => (m.home === a && m.away === b) || (m.home === b && m.away === a))
    .sort((x, y) => y.kickoff.localeCompare(x.kickoff));
  let aw = 0, d = 0, bw = 0, ag = 0, bg = 0;
  for (const m of list) {
    const pe = perspective(m, a);
    ag += pe.score[0];
    bg += pe.score[1];
    if (pe.outcome === "W") aw++;
    else if (pe.outcome === "D") d++;
    else bw++;
  }
  return { list, aWins: aw, draws: d, bWins: bw, aGoals: ag, bGoals: bg };
}

export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
