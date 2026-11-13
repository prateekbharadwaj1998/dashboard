"use client";
import { usePathname } from "next/navigation";
import { seasonHref, splitSeason } from "./paths";

/** Build links that stay within the season the viewer is currently browsing. */
export function useSeasonHref() {
  const { season } = splitSeason(usePathname() ?? "/");
  return (path: string) => seasonHref(path, season);
}
