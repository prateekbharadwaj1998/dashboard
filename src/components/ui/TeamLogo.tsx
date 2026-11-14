"use client";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

const sized = (src: string, px: number) => {
  try {
    const u = new URL(src);
    if (!/espncdn\.com$/.test(u.hostname) || !u.pathname.startsWith("/i/")) return src;
    return `https://a.espncdn.com/combiner/i?img=${u.pathname}&w=${px}&h=${px}`;
  } catch {
    return src;
  }
};

/**
 * Real club / national-team crest from ESPN's CDN, resized server-side.
 * Dark theme prefers ESPN's dark-surface variant (white crests for Spurs, Newcastle…),
 * then falls back to the standard crest, then to a monogram in the team colour.
 */
export function TeamLogo({ src, abbr, color, size = 20, className }: { src?: string; abbr?: string; color?: string; size?: number; className?: string }) {
  const px = Math.min(500, Math.round(size * 2.5));
  // Theme is known only in the browser; start with the standard crest, upgrade after mount.
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme !== "light"), []);
  const candidates = useMemo(() => {
    if (!src) return [];
    const list = [sized(src, px)];
    if (dark && /\/teamlogos\/soccer\/500\//.test(src)) list.unshift(sized(src.replace("/500/", "/500-dark/"), px));
    return list;
  }, [src, px, dark]);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState<string | null>(null);
  const current = candidates.find((c) => !failed.has(c));

  if (!current) {
    const c = color ?? "#6b6f76";
    return (
      <span
        aria-hidden
        className={clsx("inline-flex shrink-0 items-center justify-center font-semibold text-fg", className)}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.32,
          fontSize: Math.max(7, size * 0.32),
          background: `linear-gradient(145deg, color-mix(in oklab, ${c} 55%, var(--bg-elevated)), color-mix(in oklab, ${c} 22%, var(--bg-panel)))`,
          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${c} 45%, transparent)`,
        }}
      >
        {size >= 16 ? (abbr ?? "").slice(0, 3) : null}
      </span>
    );
  }
  const isLoaded = loaded === current;
  return (
    <span className={clsx("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {!isLoaded && <span className="skeleton absolute inset-0 !rounded-full" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current}
        ref={(el) => {
          // Cached images can finish before React attaches onLoad.
          if (el?.complete && el.naturalWidth > 0 && loaded !== current) setLoaded(current);
        }}
        src={current}
        alt=""
        width={size}
        height={size}
        loading={size >= 48 ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(current)}
        onError={() => setFailed((f) => new Set(f).add(current))}
        className={clsx("crest-shadow h-full w-full object-contain transition-opacity duration-200", isLoaded ? "opacity-100" : "opacity-0")}
      />
    </span>
  );
}
