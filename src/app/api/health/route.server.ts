import { NextResponse } from "next/server";
import { getAllLeagues } from "@/lib/data/repo";
import { CURRENT_SEASON } from "@/lib/data/leagues";

export async function GET() {
  const all = await getAllLeagues(CURRENT_SEASON);
  return NextResponse.json({
    ok: true,
    leagues: all.map((l) => ({ league: l.league, matches: l.matches.length, sources: l.meta.sources, lastResultAt: l.meta.lastResultAt })),
  });
}
