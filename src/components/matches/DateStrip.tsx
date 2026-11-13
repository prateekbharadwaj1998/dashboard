"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DayCell {
  day: string; // YYYY-MM-DD
  count: number;
  live: number;
}

const fmt = (day: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

export function DateStrip({ days, selected, today }: { days: DayCell[]; selected: string; today: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const idx = days.findIndex((d) => d.day === selected);
  const href = (d: string) => (d === today ? "/" : `/?date=${d}`);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(`[data-day="${selected}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,[cmdk-root]") || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowLeft" && idx > 0) router.push(href(days[idx - 1].day), { scroll: false });
      if (e.key === "ArrowRight" && idx < days.length - 1) router.push(href(days[idx + 1].day), { scroll: false });
      if (e.key === "t") router.push("/", { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const maxCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="panel flex items-center gap-1 p-1.5">
      <Link
        href={idx > 0 ? href(days[idx - 1].day) : "#"}
        scroll={false}
        className="rounded-md p-1.5 text-fg-3 hover:bg-hover hover:text-fg"
        aria-label="Previous day"
      >
        <ChevronLeft size={16} />
      </Link>
      <div ref={ref} className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
        {days.map((d) => {
          const active = d.day === selected;
          const isToday = d.day === today;
          return (
            <Link
              key={d.day}
              href={href(d.day)}
              scroll={false}
              data-day={d.day}
              className={clsx(
                "relative flex h-14 min-w-[52px] flex-1 flex-col items-center justify-center rounded-lg transition-colors",
                active ? "text-fg" : d.count ? "text-fg-2 hover:bg-hover" : "text-fg-4 hover:bg-hover",
              )}
            >
              {active && (
                <motion.span layoutId="day-pill" className="absolute inset-0 rounded-lg bg-active shadow-ring" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
              <span className={clsx("relative text-2xs font-medium", isToday ? "text-accent-text" : "")}>
                {isToday ? "Today" : fmt(d.day, { weekday: "short" })}
              </span>
              <span className="tnum relative text-sm font-semibold">{fmt(d.day, { day: "numeric" })}</span>
              <span className="relative mt-1 flex h-[3px] w-6 items-end justify-center">
                {d.live > 0 ? (
                  <span className="live-dot !h-[5px] !w-[5px]" />
                ) : d.count > 0 ? (
                  <span className="h-[3px] rounded-full bg-accent" style={{ width: `${30 + (d.count / maxCount) * 70}%`, opacity: active ? 1 : 0.6 }} />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
      <Link
        href={idx < days.length - 1 ? href(days[idx + 1].day) : "#"}
        scroll={false}
        className="rounded-md p-1.5 text-fg-3 hover:bg-hover hover:text-fg"
        aria-label="Next day"
      >
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
