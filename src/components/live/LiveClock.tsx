"use client";
import { useEffect, useState } from "react";
import type { MatchCard } from "@/lib/espn/normalize";

/**
 * A match clock that ticks every second between data refreshes, from the
 * elapsed seconds ESPN reports at fetch time. Stoppage time and half-time use
 * ESPN's own label (e.g. 45'+2', HT).
 */
export function LiveClock({ m, fetchedAt, className }: { m: MatchCard; fetchedAt?: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  const ticking = m.state === "in" && m.status !== "HT" && m.clockSec != null;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);
  if (!ticking) return <span className={className}>{m.status}</span>;
  // In stoppage time ESPN freezes the clock at 45:00/90:00 and reports "+N" — show its label.
  if (/\+/.test(m.status)) return <span className={className}>{m.status}</span>;
  const base = m.clockSec!;
  const elapsed = base + Math.max(0, Math.min(120, (now - (fetchedAt ?? now)) / 1000));
  const cap = m.period === 1 ? 45 * 60 : m.period === 2 ? 90 * 60 : Infinity;
  const secs = Math.min(elapsed, cap);
  const mm = Math.floor(secs / 60);
  const ss = Math.floor(secs % 60);
  return (
    <span className={`tnum ${className ?? ""}`} title={`${m.status} · live clock`}>
      {mm}:{String(ss).padStart(2, "0")}
    </span>
  );
}
