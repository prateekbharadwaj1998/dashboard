import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_SEASON } from "@/lib/data/leagues";
import { CompareView } from "@/views/CompareView";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "Compare" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CompareView season={CURRENT_SEASON} />
    </Suspense>
  );
}
