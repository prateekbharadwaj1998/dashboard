"use client";
import clsx from "clsx";
import { motion } from "motion/react";
import { useId } from "react";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "xs";
}) {
  const id = useId();
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-app p-0.5 shadow-ring">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              "relative rounded-md font-medium transition-colors duration-150",
              size === "sm" ? "h-6 px-2.5 text-xs" : "h-5 px-2 text-2xs",
              active ? "text-fg" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-md bg-elevated shadow-elevated"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
