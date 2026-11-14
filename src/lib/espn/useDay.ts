"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { SITE, useEspnMany } from "./client";
import { scoreboardMatches, type MatchCard } from "./normalize";

/** ESPN "days" run 05:00Z→05:00Z. Return the ESPN dates (YYYYMMDD) overlapping a local day. */
export function espnDatesFor(localDay: string, tz: string): string[] {
  const start = zonedMidnightUtc(localDay, tz);
  const end = start + 24 * 3600_000 - 1;
  const toEspn = (t: number) => new Date(t - 5 * 3600_000).toISOString().slice(0, 10).replace(/-/g, "");
  const out = new Set<string>();
  for (let t = start; t <= end; t += 6 * 3600_000) out.add(toEspn(t));
  out.add(toEspn(end));
  return [...out];
}

function zonedMidnightUtc(day: string, tz: string) {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const off = (ts: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
        .formatToParts(new Date(ts))
        .map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ts;
  };
  return guess - off(guess);
}

export const localDayOf = (iso: string | number | Date, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

/**
 * Every match on a local day, across all ~220 competitions, from one or two
 * `all/scoreboard` calls. Polls fast while anything is live.
 */
export function useDayMatches(localDay: string | null, tz: string | null) {
  const urls = useMemo(
    () => (localDay && tz ? espnDatesFor(localDay, tz).map((d) => `${SITE}/all/scoreboard?dates=${d}&limit=500`) : []),
    [localDay, tz],
  );
  const [poll, setPoll] = useState<number | undefined>(undefined);
  const results = useEspnMany<unknown>(urls, { ttl: 20_000, poll });
  const loaded = results.length > 0 && results.every((r) => r.data !== undefined || r.error);
  const error = results.find((r) => r.error && r.data === undefined)?.error;
  const updatedAt = Math.max(0, ...results.map((r) => r.updatedAt ?? 0)) || undefined;

  const matches = useMemo(() => {
    if (!localDay || !tz) return [];
    const seen = new Map<string, MatchCard>();
    for (const r of results) for (const m of scoreboardMatches(r.data, "all")) seen.set(m.id, m);
    return [...seen.values()].filter((m) => localDayOf(m.date, tz) === localDay).sort((a, b) => a.date.localeCompare(b.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.map((r) => r.updatedAt).join(","), localDay, tz]);

  const anyLive = matches.some((m) => m.state === "in");
  const soon = matches.some((m) => m.state === "pre" && Date.parse(m.date) - Date.now() < 15 * 60_000 && Date.parse(m.date) > Date.now() - 3600_000);
  useEffect(() => setPoll(anyLive ? 20_000 : soon ? 60_000 : 300_000), [anyLive, soon]);

  return { matches, loaded, error, updatedAt, live: anyLive, pollMs: poll };
}

/** Detects score changes between polls → which side just scored, per match id. */
export function useGoalFlashes(matches: MatchCard[]) {
  const prev = useRef(new Map<string, [number, number]>());
  const [flashes, setFlashes] = useState<Record<string, "home" | "away">>({});
  const [goals, setGoals] = useState<{ key: string; m: MatchCard; side: "home" | "away" }[]>([]);
  useEffect(() => {
    const next: Record<string, "home" | "away"> = {};
    const fresh: { key: string; m: MatchCard; side: "home" | "away" }[] = [];
    for (const m of matches) {
      if (m.home.score == null || m.away.score == null) continue;
      const p = prev.current.get(m.id);
      if (p && m.state === "in") {
        if (m.home.score > p[0]) next[m.id] = "home";
        else if (m.away.score > p[1]) next[m.id] = "away";
        if (next[m.id]) fresh.push({ key: `${m.id}-${m.home.score}-${m.away.score}`, m, side: next[m.id] });
      }
      prev.current.set(m.id, [m.home.score, m.away.score]);
    }
    if (!Object.keys(next).length) return;
    setFlashes((f) => ({ ...f, ...next }));
    setGoals((g) => [...fresh, ...g].slice(0, 3));
    const t = setTimeout(() => {
      setFlashes((f) => {
        const c = { ...f };
        for (const k of Object.keys(next)) delete c[k];
        return c;
      });
    }, 2600);
    const t2 = setTimeout(() => setGoals((g) => g.filter((x) => !fresh.some((f) => f.key === x.key))), 4500);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [matches]);
  return { flashes, goals };
}
