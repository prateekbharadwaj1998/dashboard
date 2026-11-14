import type { Metadata } from "next";
import { Suspense } from "react";
import { OverlayView } from "@/views/OverlayView";

export const metadata: Metadata = { title: "Overlay", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <OverlayView />
    </Suspense>
  );
}
