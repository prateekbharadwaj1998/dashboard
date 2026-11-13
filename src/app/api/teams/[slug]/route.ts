import { NextResponse } from "next/server";
import { parseSeason } from "@/lib/data/leagues";
import { teamBySlug } from "@/lib/data/teams";
import { teamLeagueSeason } from "@/lib/seasonOf";
import { computeTable, teamSeason } from "@/lib/derive";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = teamBySlug(slug);
  if (!team) return NextResponse.json({ error: "Unknown team" }, { status: 404 });
  const season = parseSeason(new URL(req.url).searchParams.get("season") ?? undefined);
  const res = await teamLeagueSeason(slug, season);
  if (!res) return NextResponse.json({ error: "No data" }, { status: 404 });
  const { ls } = res;
  const ts = teamSeason(ls.league, ls.matches, ls.teams, slug);
  const row = computeTable(ls.league, ls.matches, ls.teams).find((r) => r.team === slug);
  return NextResponse.json({
    team,
    league: ls.league,
    season: ls.season,
    standing: row,
    home: ts.home,
    away: ts.away,
    cleanSheets: ts.cleanSheets,
    longestUnbeaten: ts.longestUnbeaten,
    matches: ts.matches,
    meta: ls.meta,
  });
}
