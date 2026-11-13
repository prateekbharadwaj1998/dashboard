"use client";

/** Formats an instant in the viewer's own timezone. Server renders with the tz cookie, so hydration matches. */
export function LocalTime({ iso, tz, opts }: { iso: string; tz?: string; opts: Intl.DateTimeFormatOptions }) {
  let zone = tz;
  if (typeof window !== "undefined") {
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}
  }
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
