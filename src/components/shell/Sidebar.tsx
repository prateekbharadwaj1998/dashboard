"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { seasonHref, splitSeason } from "@/lib/paths";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { CalendarDays, GitCompareArrows, Search, Star, X } from "lucide-react";
import { LEAGUES } from "@/lib/data/leagues";
import { teamBySlug } from "@/lib/data/teams";
import { Crest } from "@/components/ui/Crest";
import { useFavorites } from "@/components/ui/Favorites";
import { Logo } from "./Logo";
import { useMobileNav, usePalette } from "./Providers";
import { LeagueMark } from "./LeagueMark";
import { Suspense, type ReactNode } from "react";

function NavItem({ href, active, icon, children, trailing }: { href: string; active: boolean; icon: ReactNode; children: ReactNode; trailing?: ReactNode }) {
  const { setOpen } = useMobileNav();
  return (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={clsx(
        "group relative flex h-7 items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-100",
        active ? "text-fg" : "text-fg-2 hover:bg-hover hover:text-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-md bg-active"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <span className="relative flex w-4 justify-center text-fg-3 group-hover:text-fg-2">{icon}</span>
      <span className="relative flex-1 truncate">{children}</span>
      {trailing && <span className="relative">{trailing}</span>}
    </Link>
  );
}

function SidebarInner() {
  const { season, rest: pathname } = splitSeason(usePathname() ?? "/");
  const href = (p: string) => seasonHref(p, season);
  const { following } = useFavorites();
  const { setOpen } = usePalette();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-2.5 px-4">
        <Logo />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-[-0.01em]">Halfspace</div>
        </div>
        <span className="ml-auto rounded-[4px] bg-accent-soft px-1.5 py-px text-[10px] font-semibold text-accent-text" title="All features included">
          PRO
        </span>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 w-full items-center gap-2 rounded-md bg-panel px-2.5 text-sm text-fg-3 shadow-ring transition-colors hover:text-fg-2"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search</span>
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pt-2 pb-4">
        <div className="space-y-px">
          <NavItem href="/" active={pathname === "/"} icon={<CalendarDays size={15} />}>
            Matches
          </NavItem>
          <NavItem href={href("/compare")} active={pathname.startsWith("/compare")} icon={<GitCompareArrows size={15} />}>
            Compare
          </NavItem>
        </div>

        <div>
          <div className="mb-1 px-2 text-2xs font-medium text-fg-4">Leagues</div>
          <div className="space-y-px">
            {LEAGUES.map((l) => (
              <NavItem key={l.id} href={href(`/league/${l.id}`)} active={pathname.startsWith(`/league/${l.id}`)} icon={<LeagueMark id={l.id} size={15} />}>
                {l.name}
              </NavItem>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center px-2 text-2xs font-medium text-fg-4">
            Following
            <Star size={10} className="ml-1.5" />
          </div>
          <AnimatePresence initial={false}>
            {following.length === 0 ? (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-2 text-xs text-fg-4">
                Star a team to pin it here.
              </motion.p>
            ) : (
              following.map((slug) => (
                <motion.div key={slug} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <NavItem href={href(`/team/${slug}`)} active={pathname === `/team/${slug}`} icon={<Crest slug={slug} size={14} />}>
                    {teamBySlug(slug)?.short ?? slug}
                  </NavItem>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </nav>

      <div className="border-t px-4 py-3 text-2xs leading-4 text-fg-4">
        Real results from <span className="text-fg-3">openfootball</span>
        <br />
        Live overlay via ESPN when reachable
      </div>
    </div>
  );
}

export function Sidebar() {
  const { open, setOpen } = useMobileNav();
  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r bg-app md:block">
        <Suspense>
          <SidebarInner />
        </Suspense>
      </aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 border-r bg-app shadow-modal md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
            >
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 rounded-md p-1 text-fg-3 hover:bg-hover" aria-label="Close menu">
                <X size={16} />
              </button>
              <Suspense>
                <SidebarInner />
              </Suspense>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
