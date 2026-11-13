import type { Metadata } from "next";
import { CURRENT_SEASON } from "@/lib/data/leagues";
import { leagueParams, leagueTitle, resolveLeague } from "@/lib/routeParams";
import { LeagueFixtures } from "@/views/LeagueFixtures";

type Props = { params: Promise<{ id: string }> };
export const dynamicParams = false;
export const generateStaticParams = leagueParams;
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => ({ title: leagueTitle((await params).id, " fixtures") });

export default async function Page({ params }: Props) {
  return <LeagueFixtures id={resolveLeague((await params).id)} season={CURRENT_SEASON} />;
}
