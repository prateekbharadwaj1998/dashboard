"use client";
import clsx from "clsx";
import { useState } from "react";
import { usePlayerPhoto, type Photo } from "@/lib/photos";

/** Crop rules that make mixed Wikimedia shots read as one set of headshots. */
export function photoCrop(p: Photo) {
  return p.portrait === false ? { pos: "50% 22%", scale: 1.6 } : { pos: "50% 14%", scale: 1.25 };
}

/** Neutral head-and-shoulders silhouette for players without a free photo. */
export function Silhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="15.5" r="7.2" fill="currentColor" />
      <path d="M6 40c0-8.6 6.3-14.2 14-14.2S34 31.4 34 40z" fill="currentColor" />
    </svg>
  );
}

/**
 * Uniform player avatar: team-tinted disc, consistent crop, duotone below 48px,
 * team-colour ring; silhouette (never random initials) when there's no photo.
 */
export function PlayerPhoto({
  name,
  year,
  size = 36,
  color,
  flag,
  jersey,
  rounded = "full",
  className,
}: {
  name: string;
  year?: number;
  size?: number;
  color?: string;
  flag?: string;
  jersey?: string;
  rounded?: "full" | "xl";
  className?: string;
}) {
  const photo = usePlayerPhoto(name, year);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const src = photo && broken !== photo.src ? photo.src : undefined;
  const c = color ?? "#5e6ad2";
  const r = rounded === "full" ? "rounded-full" : "rounded-2xl";
  const small = size < 48;
  const crop = photo ? photoCrop(photo) : null;
  return (
    <span className={clsx("relative inline-flex shrink-0", className)} style={{ width: size, height: size }} title={name}>
      <span
        className={clsx("absolute inset-0 overflow-hidden", r)}
        style={{
          background: `linear-gradient(145deg, color-mix(in oklab, ${c} 28%, var(--bg-elevated)), var(--bg-elevated))`,
          boxShadow: `0 0 0 1.5px color-mix(in oklab, ${c} 75%, transparent), inset 0 0 0 1px rgb(255 255 255 / .08)`,
        }}
      >
        {(!src || loaded !== src) && <Silhouette className="absolute inset-x-[12%] bottom-0 h-[88%] w-[76%] text-fg-4 opacity-50" />}
        {src && crop && (
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
            className={clsx("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", loaded === src ? "opacity-100" : "opacity-0")}
            style={{
              objectPosition: crop.pos,
              transform: `scale(${crop.scale})`,
              transformOrigin: crop.pos,
              filter: small ? "grayscale(1) contrast(1.08) brightness(1.04)" : undefined,
            }}
          />
        )}
        {src && loaded === src && small && <span className="absolute inset-0" style={{ background: c, mixBlendMode: "soft-light", opacity: 0.4 }} />}
        {src && loaded === src && !small && <span className="absolute inset-0" style={{ boxShadow: "inset 0 0 24px rgb(0 0 0 / .35)" }} />}
      </span>
      {jersey && !src && (
        <span className="tnum absolute -right-0.5 -bottom-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8.5px] font-bold" style={{ background: c, color: "#fff" }}>
          {jersey}
        </span>
      )}
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
