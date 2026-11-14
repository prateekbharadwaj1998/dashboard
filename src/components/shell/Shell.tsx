"use client";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { splitSeason } from "@/lib/paths";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/** App chrome, except on chromeless routes (OBS overlays, glance mode). */
export function Shell({ children }: { children: ReactNode }) {
  const { rest } = splitSeason(usePathname() ?? "/");
  const bare = rest.startsWith("/overlay") || rest.startsWith("/glance");
  const overlay = rest.startsWith("/overlay");
  useEffect(() => {
    const el = document.documentElement;
    if (overlay) {
      el.style.background = "transparent";
      el.style.colorScheme = "normal";
      el.style.overflow = "hidden";
      document.body.style.background = "transparent";
    }
    return () => {
      el.style.background = "";
      el.style.colorScheme = "";
      el.style.overflow = "";
      document.body.style.background = "";
    };
  }, [overlay]);
  if (bare) return <>{children}</>;
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div id="scroll-root" className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar />
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
