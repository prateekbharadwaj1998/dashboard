// Timezone helpers built on Intl only (no date library).

function offsetMinutes(ts: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUtc - ts) / 60000;
}

/** Convert a wall-clock date/time in `tz` to a UTC ISO string. */
export function zonedToUtc(date: string, time: string | undefined, tz: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "15:00").split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ts = guess - offsetMinutes(guess, tz) * 60000;
  const second = guess - offsetMinutes(ts, tz) * 60000;
  if (second !== ts) ts = second;
  return new Date(ts).toISOString();
}

/** YYYY-MM-DD of an instant as seen in `tz`. */
export function dayKey(iso: string | number | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function isValidTz(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const isDayKey = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
