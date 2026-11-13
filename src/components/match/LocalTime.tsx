"use client";
import { useEffect, useState } from "react";

/**
 * Formats an instant in the viewer's own timezone. The pre-rendered HTML uses `tz`
 * (or UTC); after mount it switches to the browser's zone.
 */
export function LocalTime({ iso, tz, opts }: { iso: string; tz?: string; opts: Intl.DateTimeFormatOptions }) {
  const [zone, setZone] = useState(tz ?? "UTC");
  useEffect(() => {
    try {
      setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {}
  }, []);
  let text: string;
  try {
    text = new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: zone }).format(new Date(iso));
  } catch {
    text = new Intl.DateTimeFormat("en-GB", opts).format(new Date(iso));
  }
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
