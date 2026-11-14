"use client";
import { compBySlug } from "@/lib/espn/competitions";
import { TeamLogo } from "./TeamLogo";

/** Competition logo that swaps to ESPN's dark-surface variant in the dark theme. */
export function CompLogo({ slug, size = 20 }: { slug: string; size?: number }) {
  const c = compBySlug(slug);
  const abbr = (c?.short ?? slug).replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  if (c?.logoDark && c.logo && c.logoDark !== c.logo) {
    return (
      <>
        <span className="theme-dark-only inline-flex">
          <TeamLogo src={c.logoDark} abbr={abbr} size={size} />
        </span>
        <span className="theme-light-only inline-flex">
          <TeamLogo src={c.logo} abbr={abbr} size={size} />
        </span>
      </>
    );
  }
  return <TeamLogo src={c?.logo} abbr={abbr} size={size} />;
}
