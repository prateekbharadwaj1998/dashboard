import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioView } from "@/views/StudioView";

export const metadata: Metadata = { title: "Streamer studio" };

export default function Page() {
  return (
    <Suspense>
      <StudioView />
    </Suspense>
  );
}
