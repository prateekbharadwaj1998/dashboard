import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LeagueConfig } from "./leagues";
import type { Match, Score, SeasonId } from "./types";
import { teamIdentity } from "./teams";
import { zonedToUtc } from "./time";

interface RawMatch {
  round: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  score?: { ft?: number[]; ht?: number[] } | number[];
}
interface RawSeason {
  name: string;
  matches: RawMatch[];
}

const BASE = "https://raw.githubusercontent.com/openfootball/football.json/master";

async function loadSnapshot(season: SeasonId, code: string): Promise<RawSeason | null> {
  try {
    const file = path.join(process.cwd(), "data/snapshot", `${season}.${code}.json`);
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

export async function fetchOpenFootball(
  league: LeagueConfig,
  season: SeasonId,
): Promise<{ raw: RawSeason; origin: "live" | "snapshot" } | null> {
  try {
    const res = await fetch(`${BASE}/${season}/${league.ofCode}.json`, {
      next: { revalidate: 1800, tags: [`of:${league.id}:${season}`] },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const raw = (await res.json()) as RawSeason;
      if (Array.isArray(raw?.matches)) return { raw, origin: "live" };
    }
  } catch {
    // fall through to snapshot
  }
  const snap = await loadSnapshot(season, league.ofCode);
  return snap ? { raw: snap, origin: "snapshot" } : null;
}

const pair = (x: unknown): Score | undefined =>
  Array.isArray(x) && x.length === 2 && x.every((n) => Number.isFinite(n))
    ? [x[0] as number, x[1] as number]
    : undefined;

export function matchId(league: string, season: string, home: string, away: string) {
  return `${league}-${season.replace("-", "").slice(2)}-${home}-v-${away}`;
}

export function normalizeOpenFootball(
  raw: RawSeason,
  league: LeagueConfig,
  season: SeasonId,
  now = Date.now(),
): Match[] {
  return raw.matches.map((m) => {
    const home = teamIdentity(m.team1).slug;
    const away = teamIdentity(m.team2).slug;
    // Quirk: some 0-0s are encoded as a bare array instead of {ft, ht}.
    const s = m.score;
    const ft = Array.isArray(s) ? pair(s) : pair(s?.ft);
    const ht = Array.isArray(s) ? undefined : pair(s?.ht);
    const kickoff = zonedToUtc(m.date, m.time, league.tz);
    const started = Date.parse(kickoff) + 2.25 * 3600_000 < now;
    return {
      id: matchId(league.id, season, home, away),
      league: league.id,
      season,
      matchday: Number(m.round.match(/\d+/)?.[0] ?? 0),
      kickoff,
      home,
      away,
      status: ft ? "ft" : started ? "pending" : "scheduled",
      ft,
      ht,
      source: "openfootball",
    } satisfies Match;
  });
}
