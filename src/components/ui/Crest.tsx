"use client";
import { teamBySlug } from "@/lib/data/teams";
import { useState } from "react";
import clsx from "clsx";

/** Team mark: the club's crest when a feed provides one, otherwise a monogram in club color. */
export function Crest({ slug, size = 20, logo, className }: { slug: string; size?: number; logo?: string; className?: string }) {
  const t = teamBySlug(slug);
  const [broken, setBroken] = useState(false);
  const color = t?.color ?? "#888";
  if (logo && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        className={clsx("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const label = (t?.abbr ?? slug.slice(0, 3)).slice(0, 3);
  return (
    <span
      aria-hidden
      className={clsx("relative inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold", className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        fontSize: Math.max(7, size * (label.length > 2 ? 0.3 : 0.36)),
        letterSpacing: "-0.02em",
        color: "var(--text-primary)",
        background: `linear-gradient(145deg, color-mix(in oklab, ${color} 55%, var(--bg-elevated)), color-mix(in oklab, ${color} 22%, var(--bg-panel)))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 45%, transparent), inset 0 1px 0 rgb(255 255 255 / .12)`,
      }}
    >
      {size >= 16 ? label : null}
    </span>
  );
}

export function TeamName({ slug, variant = "short" }: { slug: string; variant?: "short" | "name" | "abbr" }) {
  const t = teamBySlug(slug);
  return <>{t ? t[variant] : slug}</>;
}
