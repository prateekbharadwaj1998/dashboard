// HS Rating (beta): our own, transparent 0–10 player rating built only from the
// public per-player match stats ESPN publishes. No xG, passing or defensive data
// exists in the feed, so this is deliberately simple and fully explainable.

export type PosGroup = "GK" | "DEF" | "MID" | "FWD";

export interface PlayerMatchStats {
  G: number; // goals
  A: number; // assists
  SHOT: number;
  SOG: number;
  SV: number; // saves
  GA: number; // goals against (keepers)
  FC: number; // fouls committed
  FA: number; // fouls suffered
  YC: number;
  RC: number;
  OG: number;
}

export interface RatingInput {
  pos: PosGroup;
  stats: PlayerMatchStats;
  minutes: number;
  teamConceded: number; // while the player was on the pitch (approximated by full-time when unknown)
  result: "W" | "D" | "L" | null; // null while live
}

export interface RatingLine {
  label: string;
  delta: number;
}

const GOAL: Record<PosGroup, number> = { GK: 1.3, DEF: 1.3, MID: 1.1, FWD: 0.9 };
const CLEAN: Record<PosGroup, number> = { GK: 0.7, DEF: 0.5, MID: 0.2, FWD: 0 };
const CONCEDE: Record<PosGroup, number> = { GK: -0.25, DEF: -0.15, MID: 0, FWD: 0 };

export function posGroup(abbr?: string, name?: string): PosGroup {
  const s = `${abbr ?? ""} ${name ?? ""}`.toUpperCase();
  if (/\bG(K)?\b|GOALKEEPER/.test(s)) return "GK";
  if (/\b(D|CB|LB|RB|CD-L|CD-R|LWB|RWB|SW)\b|DEFENDER|BACK/.test(s)) return "DEF";
  if (/\b(F|FW|ST|CF|LW|RW|CF-L|CF-R)\b|FORWARD|STRIKER|WING/.test(s)) return "FWD";
  return "MID";
}

export function hsRating(input: RatingInput): { rating: number | null; lines: RatingLine[] } {
  const { pos, stats: s, minutes, teamConceded, result } = input;
  if (minutes < 15) return { rating: null, lines: [{ label: "Played under 15 minutes", delta: 0 }] };
  const lines: RatingLine[] = [];
  const add = (label: string, delta: number) => {
    if (Math.abs(delta) > 1e-9) lines.push({ label, delta: Math.round(delta * 100) / 100 });
  };
  add(`${s.G} goal${s.G === 1 ? "" : "s"}`, s.G * GOAL[pos]);
  add(`${s.A} assist${s.A === 1 ? "" : "s"}`, s.A * 0.7);
  const sogNonGoal = Math.max(0, s.SOG - s.G);
  add(`${sogNonGoal} shot${sogNonGoal === 1 ? "" : "s"} on target`, sogNonGoal * 0.15);
  const off = Math.max(0, s.SHOT - s.SOG);
  add(`${off} shot${off === 1 ? "" : "s"} off target`, off * -0.05);
  if (pos === "GK") add(`${s.SV} save${s.SV === 1 ? "" : "s"}`, s.SV * 0.3);
  if (teamConceded === 0 && minutes >= 60) add("Clean sheet", CLEAN[pos]);
  if (teamConceded > 0) add(`${teamConceded} conceded`, teamConceded * CONCEDE[pos]);
  add(`${s.FC} foul${s.FC === 1 ? "" : "s"} committed`, s.FC * -0.1);
  add(`${s.FA} foul${s.FA === 1 ? "" : "s"} won`, s.FA * 0.05);
  add("Yellow card", s.YC * -0.4);
  add("Red card", s.RC * -1.5);
  add("Own goal", s.OG * -1);
  if (result === "W") add("Team won", 0.3);
  if (result === "L") add("Team lost", -0.3);
  if (pos === "FWD" && minutes >= 60 && s.SHOT === 0) add("No shots", -0.2);
  const raw = 6 + lines.reduce((t, l) => t + l.delta, 0);
  const rating = Math.round(Math.min(10, Math.max(3, raw)) * 10) / 10;
  return { rating, lines };
}

/** Rating chip colours — solid fills legible in both themes. */
export function ratingStyle(r: number | null | undefined): { bg: string; fg: string } {
  if (r == null) return { bg: "var(--bg-active)", fg: "var(--text-tertiary)" };
  if (r >= 9) return { bg: "#5E6AD2", fg: "#fff" };
  if (r >= 8) return { bg: "#199E70", fg: "#fff" };
  if (r >= 7) return { bg: "#4CB782", fg: "#08090A" };
  if (r >= 6.5) return { bg: "#C98500", fg: "#08090A" };
  if (r >= 6) return { bg: "#D97A26", fg: "#08090A" };
  return { bg: "#E5484D", fg: "#fff" };
}
