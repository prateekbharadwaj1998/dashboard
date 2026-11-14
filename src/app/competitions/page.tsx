import type { Metadata } from "next";
import { CompetitionsDirectory } from "@/views/CompetitionsDirectory";

export const metadata: Metadata = { title: "All competitions" };

export default function Page() {
  return <CompetitionsDirectory />;
}
