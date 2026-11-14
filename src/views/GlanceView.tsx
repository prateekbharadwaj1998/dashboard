"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useBrowserTz } from "@/lib/clientData";
import { localDayOf, useDayMatches } from "@/lib/espn/useDay";
import { compLabel, priorityOf } from "@/lib/espn/competitions";
import { useFollowedTeams } from "@/lib/follow";
import { espnMatchHref } from "@/components/live/LiveMatchRow";

/**
 * "Boss mode": a plain, spreadsheet-looking list of today's scores. No crests,
 * no colour, no motion. The tab title carries the most relevant live score.
 */
export function GlanceView() {
  const tz = useBrowserTz();
  const { matches, updatedAt } = useDayMatches(tz ? localDayOf(Date.now(), tz) : null, tz);
  const { ids } = useFollowedTeams();
  const list = useMemo(
    () =>
      matches
        .filter((m) => ids.has(m.home.id) || ids.has(m.away.id) || priorityOf(m.league) < 30)
        .sort(
          (a, b) =>
            Number(ids.has(b.home.id) || ids.has(b.away.id)) - Number(ids.has(a.home.id) || ids.has(a.away.id)) ||
            Number(b.state === "in") - Number(a.state === "in") ||
            a.date.localeCompare(b.date),
        ),
    [matches, ids],
  );
  useEffect(() => {
    const top = list.find((m) => m.state === "in");
    document.title = top ? `${top.home.abbr} ${top.home.score}-${top.away.score} ${top.away.abbr} ${top.status}` : "Sheet1";
  }, [list]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "b") window.history.length > 1 ? window.history.back() : (window.location.href = "../");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="min-h-dvh bg-[#ffffff] p-3 font-mono text-[12px] text-[#222]" style={{ colorScheme: "light" }}>
      <div className="mb-2 flex items-center justify-between text-[11px] text-[#777]">
        <span>scores.csv — {list.length} rows</span>
        <span>
          {updatedAt ? `synced ${new Date(updatedAt).toLocaleTimeString()}` : "loading…"} · <Link href="/" className="underline">exit (Esc)</Link>
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#f3f3f3] text-left">
            {["", "time", "competition", "home", "score", "away"].map((h, i) => (
              <th key={i} className="border border-[#ddd] px-2 py-0.5 font-normal text-[#666]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((m, i) => (
            <tr key={m.id} className="hover:bg-[#eef4ff]">
              <td className="w-8 border border-[#ddd] px-2 text-right text-[#999]">{i + 1}</td>
              <td className="w-20 border border-[#ddd] px-2">{m.state === "pre" ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(m.date)) : m.status}</td>
              <td className="border border-[#ddd] px-2 text-[#666]">{compLabel(m.league)}</td>
              <td className="border border-[#ddd] px-2">{m.home.short}</td>
              <td className="w-16 border border-[#ddd] px-2 text-center">
                <Link href={espnMatchHref(m.id)}>{m.state === "pre" ? "-" : `${m.home.score ?? 0}-${m.away.score ?? 0}`}</Link>
              </td>
              <td className="border border-[#ddd] px-2">{m.away.short}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
