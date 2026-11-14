import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveView } from "@/views/LiveView";

export const metadata: Metadata = { title: "All matches" };

// L2: every match on a day across all competitions, with filters and the date strip.
export default function Page() {
  return (
    <Suspense>
      <LiveView />
    </Suspense>
  );
}
