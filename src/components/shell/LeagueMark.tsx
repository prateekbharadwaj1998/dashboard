import { LEAGUE_BY_ID } from "@/lib/data/leagues";
import type { LeagueId } from "@/lib/data/types";

/** Original, brand-neutral league glyph: a rounded tile in the league's accent with its initials. */
export function LeagueMark({ id, size = 16 }: { id: LeagueId; size?: number }) {
  const l = LEAGUE_BY_ID[id];
  const txt = { epl: "PL", laliga: "LL", bundesliga: "BL", seriea: "SA", ligue1: "L1" }[id];
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center font-semibold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        fontSize: size * 0.42,
        letterSpacing: "-0.03em",
        background: `linear-gradient(140deg, ${l.color}, color-mix(in oklab, ${l.color} 55%, black))`,
        boxShadow: "inset 0 1px 0 rgb(255 255 255 / .2)",
      }}
    >
      {txt}
    </span>
  );
}
