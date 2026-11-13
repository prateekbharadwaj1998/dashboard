"use client";
// Client-side access to the per-league JSON the app publishes at /data/{season}/{league}.json.
// Works identically on a Node server (route handler) and on GitHub Pages (static file).
import { useEffect, useState } from "react";
import type { LeagueSeason } from "./data/repo";
import type { LeagueId, SeasonId } from "./data/types";
import { LEAGUES } from "./data/leagues";
import { BASE_PATH } from "./paths";

const memo = new Map<string, Promise<LeagueSeason>>();

export function fetchLeagueSeason(season: SeasonId, league: LeagueId, fresh = false): Promise<LeagueSeason> {
  const key = `${season}/${league}`;
  if (!fresh && memo.has(key)) return memo.get(key)!;
  const p = fetch(`${BASE_PATH}/data/${season}/${league}.json`, { cache: fresh ? "no-store" : "default" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<LeagueSeason>;
  });
  p.catch(() => memo.delete(key));
  memo.set(key, p);
  return p;
}

/** Load every league for the given seasons. Optionally re-poll (used while matches are live). */
export function useLeagueData(seasons: SeasonId[], leagues: LeagueId[] = LEAGUES.map((l) => l.id), pollMs?: number) {
  const [data, setData] = useState<LeagueSeason[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${seasons.join(",")}|${leagues.join(",")}`;
  useEffect(() => {
    let alive = true;
    const load = (fresh: boolean) =>
      Promise.all(seasons.flatMap((s) => leagues.map((l) => fetchLeagueSeason(s, l, fresh))))
        .then((d) => alive && (setData(d), setError(null)))
        .catch((e) => alive && setError(String(e)));
    load(false);
    const id = pollMs ? setInterval(() => load(true), pollMs) : undefined;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pollMs]);
  return { data, error };
}

export function useBrowserTz() {
  const [tz, setTz] = useState<string | null>(null);
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setTz("UTC");
    }
  }, []);
  return tz;
}
