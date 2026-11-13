"use client";
import { MotionConfig } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { FavoritesProvider } from "@/components/ui/Favorites";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });
const PaletteCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });
const NavCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [open, setOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || "dark");
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      const root = document.documentElement;
      root.classList.add("theme-transition");
      root.dataset.theme = next;
      try {
        localStorage.setItem("halfspace:theme", next);
      } catch {}
      window.setTimeout(() => root.classList.remove("theme-transition"), 300);
      return next;
    });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <ThemeCtx.Provider value={{ theme, toggle }}>
        <PaletteCtx.Provider value={{ open, setOpen }}>
          <NavCtx.Provider value={{ open: navOpen, setOpen: setNavOpen }}>
            <FavoritesProvider>{children}</FavoritesProvider>
          </NavCtx.Provider>
        </PaletteCtx.Provider>
      </ThemeCtx.Provider>
    </MotionConfig>
  );
}

export const useTheme = () => useContext(ThemeCtx);
export const usePalette = () => useContext(PaletteCtx);
export const useMobileNav = () => useContext(NavCtx);
