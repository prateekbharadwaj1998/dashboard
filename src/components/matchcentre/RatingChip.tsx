"use client";
import { ratingStyle } from "@/lib/espn/rating";
import { Star } from "lucide-react";

export function RatingChip({ r, motm, size = "sm" }: { r: number | null | undefined; motm?: boolean; size?: "sm" | "md" }) {
  if (r == null) return null;
  const { bg, fg } = ratingStyle(r);
  return (
    <span
      className={`tnum inline-flex items-center gap-0.5 rounded-[4px] font-semibold leading-none ${size === "md" ? "h-6 px-2 text-sm" : "h-[17px] px-1 text-[11px]"}`}
      style={{ background: bg, color: fg }}
      title={`HS Rating ${r.toFixed(1)} (beta)${motm ? " · Player of the match" : ""}`}
    >
      {motm && <Star size={size === "md" ? 11 : 9} fill="currentColor" strokeWidth={0} />}
      {r.toFixed(1)}
    </span>
  );
}
