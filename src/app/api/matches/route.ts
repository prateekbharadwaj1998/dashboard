import { NextResponse } from "next/server";
import { getAllLeagues } from "@/lib/data/repo";
import { CURRENT_SEASON, SEASONS } from "@/lib/data/leagues";
import { dayKey, isDayKey, isValidTz } from "@/lib/data/time";

/** GET /api/matches?date=YYYY-MM-DD&tz=Area/City — every top-five-league match on that local day. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tzParam = url.searchParams.get("tz") ?? undefined;
  const tz = isValidTz(tzParam) ? tzParam : "Europe/London";
  const dateParam = url.searchParams.get("date") ?? undefined;
  const date = isDayKey(dateParam) ? dateParam : dayKey(Date.now(), tz);
  const seasons = await Promise.all(SEASONS.map((s) => getAllLeagues(s)));
  const data = seasons
    .flat()
    .flatMap((l) => l.matches)
    .filter((m) => dayKey(m.kickoff, tz) === date)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const current = seasons[SEASONS.indexOf(CURRENT_SEASON)];
  return NextResponse.json(
    { date, tz, count: data.length, data, live: current.some((l) => l.meta.liveOverlay) },
    { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=60" } },
  );
}
