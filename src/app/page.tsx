import { Suspense } from "react";
import { LiveView } from "@/views/LiveView";

// Live matches across every competition ESPN covers, fetched in the browser.
export default function Page() {
  return (
    <Suspense>
      <LiveView />
    </Suspense>
  );
}
