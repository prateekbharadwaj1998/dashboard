export type LeagueId = "epl" | "laliga" | "bundesliga" | "seriea" | "ligue1";
export type SeasonId = "2025-26" | "2026-27";

export type MatchStatus =
  | "scheduled" // in the future
  | "live"
  | "ht"
  | "ft"
  | "pending" // kick-off has passed but no result in any reachable feed yet
  | "postponed";

export type Score = [home: number, away: number];

export interface Match {
  id: string;
  league: LeagueId;
  season: SeasonId;
  matchday: number;
  kickoff: string; // ISO UTC
  home: string; // team slug
  away: string;
  status: MatchStatus;
  clock?: string; // e.g. "67'" when live
  ft?: Score;
  ht?: Score;
  source: "openfootball" | "espn";
}

export type Outcome = "W" | "D" | "L";

export interface FormEntry {
  outcome: Outcome;
  matchId: string;
  opponent: string;
  venue: "H" | "A";
  score: Score; // from the team's perspective [for, against]
  ht?: Score;
}

export interface StandingRow {
  pos: number;
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  form: FormEntry[]; // oldest → newest, last 5
  zone?: Zone;
}

export type Zone = "ucl" | "uel" | "uecl" | "playoff" | "rel";

export interface DataMeta {
  sources: string[];
  fetchedAt: string;
  lastResultAt?: string;
  liveOverlay: boolean;
}
