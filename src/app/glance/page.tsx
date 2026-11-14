import type { Metadata } from "next";
import { Suspense } from "react";
import { GlanceView } from "@/views/GlanceView";

export const metadata: Metadata = { title: "Glance", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <GlanceView />
    </Suspense>
  );
}
