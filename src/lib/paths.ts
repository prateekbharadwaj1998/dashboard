// URL helpers shared by server and client. The current season lives at unprefixed
// paths (/league/epl); other seasons are prefixed (/2025-26/league/epl). This keeps
// every page statically exportable — no query-string-driven server rendering.
import { CURRENT_SEASON, SEASONS } from "./data/leagues";
import type { SeasonId } from "./data/types";

export function seasonHref(path: string, season: SeasonId) {
  if (season === CURRENT_SEASON) return path;
  return `/${season}${path === "/" ? "" : path}`;
}

export function splitSeason(pathname: string): { season: SeasonId; rest: string } {
  const m = pathname.match(/^\/(\d{4}-\d{2})(\/.*)?$/);
  if (m && (SEASONS as string[]).includes(m[1])) return { season: m[1] as SeasonId, rest: m[2] || "/" };
  return { season: CURRENT_SEASON, rest: pathname || "/" };
}

export const matchHref = (id: string) => `/match?id=${encodeURIComponent(id)}`;

export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
