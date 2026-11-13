import type { Metadata } from "next";
import { leagueParams, leagueTitle, resolveLeague, resolveSeason } from "@/lib/routeParams";
import { LeagueStats } from "@/views/LeagueStats";

type Props = { params: Promise<{ season: string; id: string }> };
export const generateStaticParams = leagueParams;
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const p = await params;
  return { title: `${leagueTitle(p.id)} ${p.season}` };
};

export default async function Page({ params }: Props) {
  const p = await params;
  return <LeagueStats id={resolveLeague(p.id)} season={resolveSeason(p.season)} />;
}
