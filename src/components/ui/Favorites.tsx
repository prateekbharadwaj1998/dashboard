"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";
import { motion } from "motion/react";

const KEY = "halfspace:following";
const Ctx = createContext<{ following: string[]; toggle: (slug: string) => void }>({ following: [], toggle: () => {} });

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [following, setFollowing] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFollowing(JSON.parse(raw));
    } catch {}
  }, []);
  const toggle = useCallback((slug: string) => {
    setFollowing((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  return <Ctx.Provider value={{ following, toggle }}>{children}</Ctx.Provider>;
}

export const useFavorites = () => useContext(Ctx);

export function FollowButton({ slug, size = 14, withLabel = false }: { slug: string; size?: number; withLabel?: boolean }) {
  const { following, toggle } = useFavorites();
  const on = following.includes(slug);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={on}
      aria-label={on ? "Unfollow team" : "Follow team"}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md transition-colors",
        withLabel ? "h-7 px-2.5 text-xs font-medium shadow-ring hover:bg-hover" : "p-1 hover:bg-hover",
        on ? "text-draw" : "text-fg-4 hover:text-fg-2",
      )}
    >
      <motion.span key={String(on)} initial={{ scale: 0.6, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
        <Star size={size} fill={on ? "currentColor" : "none"} strokeWidth={1.75} />
      </motion.span>
      {withLabel && <span className={on ? "text-fg" : ""}>{on ? "Following" : "Follow"}</span>}
    </button>
  );
}
