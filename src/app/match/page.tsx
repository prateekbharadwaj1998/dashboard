import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchView } from "@/views/MatchView";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "Match" };

// One static page renders every fixture (/match?id=…) from the published JSON data.
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MatchView />
    </Suspense>
  );
}
