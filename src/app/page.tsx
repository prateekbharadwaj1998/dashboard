import { Suspense } from "react";
import { HomeView } from "@/views/HomeView";

// Home: one hero (the live match that matters most), then the top matches.
export default function Page() {
  return (
    <Suspense>
      <HomeView />
    </Suspense>
  );
}
