"use client";
import clsx from "clsx";
import { useState } from "react";
import { usePlayerPhoto } from "@/lib/photos";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Player avatar: real photo (Wikimedia, free licence) when one can be matched
 * with confidence, otherwise initials in the team colour. Optional flag badge.
 */
export function PlayerPhoto({
  name,
  year,
  size = 36,
  color,
  flag,
  rounded = "full",
  className,
}: {
  name: string;
  year?: number;
  size?: number;
  color?: string;
  flag?: string;
  rounded?: "full" | "xl";
  className?: string;
}) {
  const photo = usePlayerPhoto(name, year);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const src = photo && broken !== photo.src ? photo.src : undefined;
  const r = rounded === "full" ? "rounded-full" : "rounded-2xl";
  return (
    <span className={clsx("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <span
        className={clsx("absolute inset-0 flex items-center justify-center overflow-hidden font-semibold text-fg", r)}
        style={{
          fontSize: Math.max(9, size * 0.32),
          background: `linear-gradient(145deg, color-mix(in oklab, ${color ?? "#5e6ad2"} 45%, var(--bg-elevated)), var(--bg-elevated))`,
          boxShadow: "inset 0 0 0 1px rgb(255 255 255 / .08)",
        }}
      >
        {(!src || loaded !== src) && initials(name)}
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={name}
            loading={size >= 64 ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            ref={(el) => {
              if (el?.complete && el.naturalWidth > 0 && loaded !== src) setLoaded(src);
            }}
            onLoad={() => setLoaded(src)}
            onError={() => setBroken(src)}
            className={clsx("absolute inset-0 h-full w-full object-cover object-[50%_18%] transition-opacity duration-300", loaded === src ? "opacity-100" : "opacity-0")}
          />
        )}
      </span>
      {flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://a.espncdn.com/combiner/i?img=${new URL(flag).pathname}&w=40&h=40`}
          alt=""
          loading="lazy"
          className="absolute -right-0.5 -bottom-0.5 rounded-full object-cover ring-2 ring-[var(--bg-panel)]"
          style={{ width: Math.max(12, size * 0.36), height: Math.max(12, size * 0.36) }}
        />
      )}
    </span>
  );
}
