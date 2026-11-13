import type { Metadata } from "next";
import { CURRENT_SEASON } from "@/lib/data/leagues";
import { leagueParams, leagueTitle, resolveLeague } from "@/lib/routeParams";
import { LeagueOverview } from "@/views/LeagueOverview";

type Props = { params: Promise<{ id: string }> };
export const dynamicParams = false;
export const generateStaticParams = leagueParams;
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => ({ title: leagueTitle((await params).id) });

export default async function Page({ params }: Props) {
  return <LeagueOverview id={resolveLeague((await params).id)} season={CURRENT_SEASON} />;
}
