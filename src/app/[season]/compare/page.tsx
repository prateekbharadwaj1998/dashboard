import type { Metadata } from "next";
import { Suspense } from "react";
import { resolveSeason } from "@/lib/routeParams";
import { CompareView } from "@/views/CompareView";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "Compare" };

export default async function Page({ params }: { params: Promise<{ season: string }> }) {
  const season = resolveSeason((await params).season);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CompareView season={season} />
    </Suspense>
  );
}
