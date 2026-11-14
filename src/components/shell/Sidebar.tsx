"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import clsx from "clsx";
import { CalendarDays, ChevronDown, Search, Trophy, Tv, X } from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { splitSeason } from "@/lib/paths";
import { useFollowedTeams, usePinnedComps } from "@/lib/follow";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { CompLogo } from "@/components/ui/CompLogo";
import { compBySlug } from "@/lib/espn/competitions";
import { Logo } from "./Logo";
import { useMobileNav, usePalette } from "./Providers";

// Sidebar IA (council review): Search · Primary (2) · Following (pins + teams) ·
// Competitions (5 defaults) · footer. Everything else lives in ⌘K or on L2 pages.
const DEFAULT_COMPS = ["eng.1", "esp.1", "uefa.champions", "ger.1", "ita.1"];
const FOLLOW_CAP = 8;

function NavItem({ href, active, icon, children, trailing }: { href: string; active: boolean; icon: ReactNode; children: ReactNode; trailing?: ReactNode }) {
  return (
    <Link
      href={href}
      className={clsx(
        "group relative flex h-7 items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-100",
        active ? "text-fg" : "text-fg-2 hover:bg-hover hover:text-fg",
      )}
    >
      {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-active" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
      <span className="relative flex w-4 justify-center text-fg-3 group-hover:text-fg-2">{icon}</span>
      <span className="relative flex-1 truncate">{children}</span>
      {trailing && <span className="relative">{trailing}</span>}
    </Link>
  );
}

/** Collapsible group; open state remembered per group. */
function Group({ id, title, action, defaultOpen = true, forceOpen, children }: { id: string; title: string; action?: ReactNode; defaultOpen?: boolean; forceOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    try {
      const v = localStorage.getItem(`halfspace:nav:${id}`);
      if (v) setOpen(v === "1");
    } catch {}
  }, [id]);
  const isOpen = open || !!forceOpen;
  return (
    <div>
      <div className="mb-1 flex items-center px-2">
        <button
          aria-expanded={isOpen}
          onClick={() => {
            setOpen(!isOpen);
            try {
              localStorage.setItem(`halfspace:nav:${id}`, !isOpen ? "1" : "0");
            } catch {}
          }}
          className="flex cursor-pointer items-center gap-1 text-[10.5px] font-semibold tracking-[0.06em] text-fg-4 uppercase hover:text-fg-3"
        >
          {title}
          <ChevronDown size={11} className={clsx("transition-transform duration-150", !isOpen && "-rotate-90")} />
        </button>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="space-y-px overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarInner() {
  const { rest: pathname } = splitSeason(usePathname() ?? "/");
  const sp = useSearchParams();
  const lgParam = sp.get("lg");
  const idParam = sp.get("id");
  const { teams } = useFollowedTeams();
  const { pins, toggle: togglePin } = usePinnedComps();
  const { setOpen } = usePalette();
  const [more, setMore] = useState(false);

  const followItems: ({ kind: "comp"; slug: string } | { kind: "team"; t: (typeof teams)[number] })[] = [
    ...pins.map((slug) => ({ kind: "comp" as const, slug })),
    ...teams.map((t) => ({ kind: "team" as const, t })),
  ];
  const visible = more ? followItems : followItems.slice(0, FOLLOW_CAP);
  const defaults = DEFAULT_COMPS.filter((s) => !pins.includes(s));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-2.5 px-4">
        <Logo />
        <div className="text-sm font-semibold tracking-[-0.01em]">Halfspace</div>
      </div>

      <div className="px-3 pb-3">
        <button onClick={() => setOpen(true)} className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md bg-panel px-2.5 text-sm text-fg-3 shadow-ring transition-colors hover:text-fg-2">
          <Search size={14} />
          <span className="flex-1 text-left">Search</span>
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        <div className="space-y-px">
          <NavItem href="/" active={pathname === "/" || pathname.startsWith("/matches")} icon={<CalendarDays size={15} />}>
            Matches
          </NavItem>
          <NavItem href="/competitions" active={pathname.startsWith("/competition")} icon={<Trophy size={15} />}>
            Competitions
          </NavItem>
        </div>

        <Group id="following" title="Following">
          {followItems.length === 0 ? (
            <p className="px-2 text-xs leading-4 text-fg-4">Star a team or competition to pin it here.</p>
          ) : (
            <>
              {visible.map((it, i) => {
                const divider = i > 0 && it.kind === "team" && visible[i - 1].kind === "comp";
                return it.kind === "comp" ? (
                  <div key={`c-${it.slug}`} className="group/row relative">
                    <NavItem href={`/competition?lg=${it.slug}`} active={pathname === "/competition" && lgParam === it.slug} icon={<CompLogo slug={it.slug} size={15} />}>
                      {compBySlug(it.slug)?.short ?? it.slug}
                    </NavItem>
                    <button
                      aria-label="Unpin competition"
                      onClick={() => togglePin(it.slug)}
                      className="absolute top-1 right-1 hidden cursor-pointer rounded p-0.5 text-fg-4 group-hover/row:block hover:bg-active hover:text-fg"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <div key={`t-${it.t.id}`} className={clsx(divider && "mt-1 border-t border-line pt-1")}>
                    <NavItem href={`/team?id=${it.t.id}${it.t.league ? `&lg=${it.t.league}` : ""}`} active={pathname === "/team" && idParam === it.t.id} icon={<TeamLogo src={it.t.logo} abbr={it.t.name.slice(0, 3)} size={15} />}>
                      {it.t.name}
                    </NavItem>
                  </div>
                );
              })}
              {followItems.length > FOLLOW_CAP && (
                <button onClick={() => setMore((m) => !m)} className="cursor-pointer px-2 text-xs text-fg-4 hover:text-fg-2">
                  {more ? "Show less" : `Show ${followItems.length - FOLLOW_CAP} more`}
                </button>
              )}
            </>
          )}
        </Group>

        {defaults.length > 0 && (
          <Group
            id="competitions"
            title="Competitions"
            defaultOpen={pins.length === 0}
            forceOpen={pathname === "/competition" && !!lgParam && defaults.includes(lgParam)}
            action={
              <Link href="/competitions" className="text-[11px] text-fg-4 hover:text-fg-2">
                Browse all
              </Link>
            }
          >
            {defaults.map((slug) => (
              <NavItem key={slug} href={`/competition?lg=${slug}`} active={pathname === "/competition" && lgParam === slug} icon={<CompLogo slug={slug} size={15} />}>
                {compBySlug(slug)?.short ?? slug}
              </NavItem>
            ))}
          </Group>
        )}
      </nav>

      <div className="space-y-px border-t px-3 py-2">
        <NavItem href="/studio" active={pathname.startsWith("/studio")} icon={<Tv size={15} />}>
          Streamer studio
        </NavItem>
        <p className="px-2 pt-1 text-[10.5px] text-fg-4" title="Live data: ESPN public API · Player photos: Wikimedia Commons · History: openfootball">
          Live data via ESPN
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { open, setOpen } = useMobileNav();
  const pathname = usePathname();
  const sp = useSearchParams();
  // close the drawer on any navigation
  useEffect(() => setOpen(false), [pathname, sp, setOpen]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r bg-app md:block">
        <LayoutGroup id="nav-desk">
          <SidebarInner />
        </LayoutGroup>
      </aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 border-r bg-app shadow-modal md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.4, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -400) setOpen(false);
              }}
            >
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 cursor-pointer rounded-md p-1 text-fg-3 hover:bg-hover" aria-label="Close menu">
                <X size={16} />
              </button>
              <LayoutGroup id="nav-drawer">
                <SidebarInner />
              </LayoutGroup>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function SidebarSuspense() {
  return (
    <Suspense>
      <Sidebar />
    </Suspense>
  );
}
