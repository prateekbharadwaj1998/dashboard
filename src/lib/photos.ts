"use client";
// Real player photos from Wikipedia / Wikimedia Commons (free licences only —
// the PageImages API returns free images by default). ESPN publishes no soccer
// headshots, so this is the legitimate open source for them.
//
// Requests are batched (≤50 titles per call), de-duplicated, cached in
// localStorage, and matched defensively so a namesake is never shown:
//   1. candidate titles: "Name (footballer, born YYYY)", "Name (footballer)", "Name"
//   2. the page description must say footballer/soccer player
//   3. birth year must match when we know it; otherwise reject anyone born
//      more than 44 years ago (a retired namesake)
import { useEffect, useState } from "react";

export interface Photo {
  src: string;
  page: string; // Wikipedia article title (for attribution)
  file?: string; // image file name on Commons/Wikipedia
}

type Entry = { p: Photo | null; t: number };
const KEY = "halfspace:photos:v1";
const HIT_TTL = 14 * 864e5;
const MISS_TTL = 3 * 864e5;
const API = "https://en.wikipedia.org/w/api.php";

const mem = new Map<string, Entry>();
const waiters = new Map<string, Set<(p: Photo | null) => void>>();
let queue: { key: string; name: string; year?: number }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let loaded = false;
let pausedUntil = 0;
let failures = 0; // consecutive failed batches → exponential back-off, then give up for this session
const MAX_FAILURES = 5;

function loadStore() {
  if (loaded || typeof localStorage === "undefined") return;
  loaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, Entry>;
    const now = Date.now();
    for (const [k, v] of Object.entries(raw)) if (now - v.t < (v.p ? HIT_TTL : MISS_TTL)) mem.set(k, v);
  } catch {}
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveStore() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const obj: Record<string, Entry> = {};
      // keep the most recent 1500 entries
      [...mem.entries()].sort((a, b) => b[1].t - a[1].t).slice(0, 1500).forEach(([k, v]) => (obj[k] = v));
      localStorage.setItem(KEY, JSON.stringify(obj));
    } catch {}
  }, 500);
}

const keyOf = (name: string, year?: number) => `${name.trim().toLowerCase()}|${year ?? ""}`;

function candidates(name: string, year?: number) {
  const n = name.trim();
  return [...(year ? [`${n} (footballer, born ${year})`] : []), `${n} (footballer)`, n];
}

const FOOTBALLER = /footballer|soccer player|association football/i;

function accept(desc: string | undefined, year?: number) {
  if (!desc || !FOOTBALLER.test(desc)) return false;
  const born = Number(desc.match(/born (\d{4})/)?.[1]);
  if (year && born) return born === year;
  if (!year && born) return born >= new Date().getFullYear() - 44;
  return true;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchBatch(items: { key: string; name: string; year?: number }[]) {
  const titleSet = new Set<string>();
  for (const it of items) candidates(it.name, it.year).forEach((t) => titleSet.add(t));
  const titles = [...titleSet];
  const pages = new Map<string, any>(); // requested title → page
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      origin: "*",
      redirects: "1",
      prop: "pageimages|description",
      piprop: "thumbnail|name",
      pithumbsize: "330",
      titles: chunk.join("|"),
    });
    const r = await fetch(`${API}?${params}`);
    if (r.status === 429) {
      const base = (Number(r.headers.get("retry-after")) || 30) * 1000;
      pausedUntil = Date.now() + Math.min(10 * 60_000, base * 2 ** failures);
      throw new Error("rate limited");
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const js = await r.json();
    const q = js?.query ?? {};
    const alias = new Map<string, string>();
    for (const n of q.normalized ?? []) alias.set(n.from, n.to);
    for (const n of q.redirects ?? []) alias.set(n.from, n.to);
    const byTitle = new Map<string, any>((q.pages ?? []).map((p: any) => [p.title, p]));
    for (const t of chunk) {
      let final = t;
      for (let hop = 0; hop < 3 && alias.has(final); hop++) final = alias.get(final)!;
      const p = byTitle.get(final);
      if (p && !p.missing) pages.set(t, p);
    }
  }
  for (const it of items) {
    let photo: Photo | null = null;
    for (const t of candidates(it.name, it.year)) {
      const p = pages.get(t);
      if (p?.thumbnail?.source && accept(p.description, it.year)) {
        photo = { src: p.thumbnail.source, page: p.title, file: p.pageimage };
        break;
      }
    }
    resolve(it.key, photo);
  }
}

function resolve(key: string, p: Photo | null) {
  mem.set(key, { p, t: Date.now() });
  saveStore();
  waiters.get(key)?.forEach((fn) => fn(p));
  waiters.delete(key);
}

function flush() {
  timer = null;
  const wait = pausedUntil - Date.now();
  if (wait > 0) {
    timer = setTimeout(flush, wait);
    return;
  }
  const batch = queue.splice(0, 40);
  if (!batch.length) return;
  fetchBatch(batch).then(
    () => (failures = 0),
    () => {
      failures += 1;
      if (failures >= MAX_FAILURES) {
        // Stop asking for this session: show initials instead (not cached, so a later visit retries).
        for (const it of [...batch, ...queue]) {
          waiters.get(it.key)?.forEach((fn) => fn(null));
          waiters.delete(it.key);
        }
        queue = [];
        return;
      }
      queue = [...batch, ...queue];
      if (!timer) timer = setTimeout(flush, Math.max(5000 * 2 ** failures, pausedUntil - Date.now()));
    },
  );
  if (queue.length && !timer) timer = setTimeout(flush, 250);
}

export function requestPhoto(name: string, year?: number, cb?: (p: Photo | null) => void): Photo | null | undefined {
  loadStore();
  const key = keyOf(name, year);
  const hit = mem.get(key);
  if (hit) return hit.p;
  if (failures >= MAX_FAILURES) return null;
  if (cb) {
    const set = waiters.get(key) ?? new Set();
    set.add(cb);
    waiters.set(key, set);
  }
  if (!queue.some((q) => q.key === key)) queue.push({ key, name, year });
  if (!timer) timer = setTimeout(flush, 40);
  return undefined;
}

/** Photo for a player: undefined while loading, null when none is available. */
export function usePlayerPhoto(name: string | undefined, year?: number) {
  const [photo, setPhoto] = useState<Photo | null | undefined>(undefined);
  useEffect(() => {
    if (!name) return setPhoto(null);
    const cb = (p: Photo | null) => setPhoto(p);
    setPhoto(requestPhoto(name, year, cb));
    return () => {
      waiters.get(keyOf(name, year))?.delete(cb);
    };
  }, [name, year]);
  return photo;
}

export const yearOf = (dob?: string) => {
  const y = Number(String(dob ?? "").match(/(\d{4})/)?.[1]);
  return y > 1900 ? y : undefined;
};

export const fileUrl = (p: Photo) => (p.file ? `https://en.wikipedia.org/wiki/File:${encodeURIComponent(p.file)}` : `https://en.wikipedia.org/wiki/${encodeURIComponent(p.page)}`);
