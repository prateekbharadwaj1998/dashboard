import { NextResponse } from "next/server";
import { isLeagueId, parseSeason } from "@/lib/data/leagues";
import { getLeagueSeason } from "@/lib/data/repo";
import { computeTable, type Venue } from "@/lib/derive";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isLeagueId(id)) return NextResponse.json({ error: "Unknown league" }, { status: 404 });
  const url = new URL(req.url);
  const season = parseSeason(url.searchParams.get("season") ?? undefined);
  const venue = (["all", "home", "away"].includes(url.searchParams.get("venue") ?? "") ? url.searchParams.get("venue") : "all") as Venue;
  const ls = await getLeagueSeason(id, season);
  const table = computeTable(id, ls.matches, ls.teams, { venue });
  return NextResponse.json(
    { league: id, season, venue, data: table, meta: ls.meta },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } },
  );
}
