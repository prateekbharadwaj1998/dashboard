import type { Metadata } from "next";
import { CURRENT_SEASON, SEASONS } from "@/lib/data/leagues";
import { teamParams, teamTitle } from "@/lib/routeParams";
import { TeamView } from "@/views/TeamView";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
// Every club from any season gets a page; clubs outside the top flight this season fall back to their latest season.
export const generateStaticParams = () => teamParams([...SEASONS]);
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => ({ title: teamTitle((await params).slug) });

export default async function Page({ params }: Props) {
  return <TeamView slug={(await params).slug} season={CURRENT_SEASON} />;
}
