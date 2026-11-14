import type { Metadata } from "next";
import { Suspense } from "react";
import { ClubView } from "@/views/ClubView";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export const metadata: Metadata = { title: "Team" };

// Static shell; the view reads its query params and loads live data in the browser.
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClubView />
    </Suspense>
  );
}
