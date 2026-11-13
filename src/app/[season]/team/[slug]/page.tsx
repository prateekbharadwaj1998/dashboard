import type { Metadata } from "next";
import { resolveSeason, teamParams, teamTitle } from "@/lib/routeParams";
import { TeamView } from "@/views/TeamView";

type Props = { params: Promise<{ season: string; slug: string }> };
export const generateStaticParams = async ({ params }: { params: { season: string } }) => teamParams([resolveSeason(params.season)]);
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const p = await params;
  return { title: `${teamTitle(p.slug)} ${p.season}` };
};

export default async function Page({ params }: Props) {
  const p = await params;
  return <TeamView slug={p.slug} season={resolveSeason(p.season)} />;
}
