import { LEAGUES, SEASONS, isLeagueId } from "@/lib/data/leagues";
import { getLeagueSeason } from "@/lib/data/repo";
import type { SeasonId } from "@/lib/data/types";

// Static JSON data API: /data/{season}/{league}.json
// Pre-rendered at build time (and on GitHub Pages served as plain files).
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return SEASONS.flatMap((season) => LEAGUES.map((l) => ({ season, file: `${l.id}.json` })));
}

export async function GET(_req: Request, { params }: { params: Promise<{ season: string; file: string }> }) {
  const { season, file } = await params;
  const id = file.replace(/\.json$/, "");
  if (!isLeagueId(id) || !(SEASONS as string[]).includes(season)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(await getLeagueSeason(id, season as SeasonId));
}
