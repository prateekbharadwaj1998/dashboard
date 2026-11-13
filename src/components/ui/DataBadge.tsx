"use client";
import type { DataMeta } from "@/lib/data/types";
import { useEffect, useState } from "react";

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

/** Honest data provenance: where the numbers came from and how fresh they are. */
export function DataBadge({ meta }: { meta: DataMeta }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const last = meta.lastResultAt
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(meta.lastResultAt))
    : "—";
  return (
    <div className="flex items-center gap-2 rounded-full bg-panel/70 py-1 pr-3 pl-2 text-2xs text-fg-3 shadow-ring backdrop-blur" title={`Sources: ${meta.sources.join(", ")}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.liveOverlay ? "bg-win" : "bg-draw"}`} />
      <span suppressHydrationWarning>
        {meta.liveOverlay ? "Live feed" : "Results"} · latest result {last} · synced {ago(meta.fetchedAt)}
      </span>
    </div>
  );
}
