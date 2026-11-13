import { CURRENT_SEASON, SEASONS } from "@/lib/data/leagues";

// Archive seasons live under /{season}/… ; the current season is served unprefixed.
export const dynamicParams = false;

export function generateStaticParams() {
  return SEASONS.filter((s) => s !== CURRENT_SEASON).map((season) => ({ season }));
}

export default function SeasonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
