"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSeasonHref } from "@/lib/useSeasonHref";
import { motion } from "motion/react";
import clsx from "clsx";
import type { LeagueId } from "@/lib/data/types";

export function LeagueTabs({ league }: { league: LeagueId }) {
  const pathname = usePathname();
  const href = useSeasonHref();
  const tabs = [
    { href: href(`/league/${league}`), label: "Overview" },
    { href: href(`/league/${league}/fixtures`), label: "Fixtures" },
    { href: href(`/league/${league}/stats`), label: "Insights" },
  ];
  return (
    <div className="flex gap-1 border-b">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            scroll={false}
            className={clsx("relative px-3 pt-1 pb-2.5 text-sm transition-colors", active ? "text-fg" : "text-fg-3 hover:text-fg-2")}
          >
            {t.label}
            {active && (
              <motion.span
                layoutId="league-tab"
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
