"use client";
// Browser-side client for ESPN's public soccer API (CORS-enabled).
// - in-memory cache per URL with TTL, plus request de-duplication
// - useEspn(): SWR-style hook with polling that pauses while the tab is hidden
//   and backs off on errors. No dependencies.
import { useEffect, useRef, useState } from "react";

export const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
export const SITE_V2 = "https://site.api.espn.com/apis/v2/sports/soccer";
export const WEB = "https://site.web.api.espn.com/apis/common/v3/sports/soccer";
export const CORE = "https://sports.core.api.espn.com/v2/sports/soccer";

type Entry = { at: number; data?: unknown; promise?: Promise<unknown>; error?: string };
const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function notify(url: string) {
  listeners.get(url)?.forEach((fn) => fn());
}

export async function espnFetch<T>(url: string, ttlMs: number, force = false): Promise<T> {
  const hit = cache.get(url);
  if (!force && hit?.data !== undefined && Date.now() - hit.at < ttlMs) return hit.data as T;
  if (hit?.promise) return hit.promise as Promise<T>;
  const promise = fetch(url, { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      cache.set(url, { at: Date.now(), data });
      notify(url);
      return data;
    })
    .catch((e) => {
      const prev = cache.get(url);
      cache.set(url, { at: prev?.at ?? 0, data: prev?.data, error: String(e?.message ?? e) });
      notify(url);
      throw e;
    });
  cache.set(url, { ...(hit ?? { at: 0 }), promise });
  return promise as Promise<T>;
}

export interface EspnState<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  updatedAt: number | undefined;
  refresh: () => void;
}

/**
 * Fetch (and optionally poll) an ESPN endpoint. Pass `null` to skip.
 * `poll` may change between renders (e.g. faster while a match is live).
 */
export function useEspn<T>(url: string | null, opts: { ttl?: number; poll?: number } = {}): EspnState<T> {
  const ttl = opts.ttl ?? 30_000;
  const [, force] = useState(0);
  const failures = useRef(0);
  const entry = url ? cache.get(url) : undefined;

  useEffect(() => {
    if (!url) return;
    const set = listeners.get(url) ?? new Set();
    const fn = () => force((x) => x + 1);
    set.add(fn);
    listeners.set(url, set);
    espnFetch(url, ttl).then(() => (failures.current = 0), () => (failures.current += 1));
    return () => {
      set.delete(fn);
    };
  }, [url, ttl]);

  useEffect(() => {
    if (!url || !opts.poll) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const backoff = Math.min(8, 2 ** failures.current);
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") {
          try {
            await espnFetch(url, 0, true);
            failures.current = 0;
          } catch {
            failures.current += 1;
          }
        }
        tick();
      }, opts.poll! * backoff);
    };
    tick();
    const onVis = () => {
      if (document.visibilityState === "visible") espnFetch(url, Math.min(ttl, opts.poll!)).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [url, opts.poll, ttl]);

  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    loading: !!url && entry?.data === undefined && !entry?.error,
    updatedAt: entry?.at || undefined,
    refresh: () => url && espnFetch(url, 0, true).catch(() => {}),
  };
}

/** Several URLs at once (e.g. one scoreboard per competition). */
export function useEspnMany<T>(urls: string[], opts: { ttl?: number; poll?: number } = {}) {
  const ttl = opts.ttl ?? 30_000;
  const [, force] = useState(0);
  const key = urls.join("|");
  useEffect(() => {
    const fn = () => force((x) => x + 1);
    for (const u of urls) {
      const set = listeners.get(u) ?? new Set();
      set.add(fn);
      listeners.set(u, set);
      espnFetch(u, ttl).catch(() => {});
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    if (opts.poll) {
      timer = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        for (const u of urls) espnFetch(u, 0, true).catch(() => {});
      }, opts.poll);
    }
    return () => {
      for (const u of urls) listeners.get(u)?.delete(fn);
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ttl, opts.poll]);
  return urls.map((u) => {
    const e = cache.get(u);
    return { url: u, data: e?.data as T | undefined, error: e?.error, updatedAt: e?.at || undefined };
  });
}

export const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
