"use client";
import clsx from "clsx";
import { LayoutGroup, motion, useAnimate, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface TabItem<T extends string> {
  key: T;
  label: ReactNode;
}

const HOVER = { type: "spring", stiffness: 700, damping: 45, mass: 0.5 } as const;
const UNDERLINE = { type: "spring", stiffness: 520, damping: 38 } as const;

/**
 * Tab state that switches instantly (local state) and is mirrored to ?tab= with
 * history.replaceState — no Next.js navigation, so there is no round-trip on click.
 * Back leaves the page rather than stepping through tabs.
 */
export function useUrlTab<T extends string>(valid: T[], fallback: T, param = "tab"): [T, (t: T) => void] {
  const sp = useSearchParams();
  const fromUrl = sp.get(param) as T | null;
  const [value, setValue] = useState<T>(fromUrl && valid.includes(fromUrl) ? fromUrl : fallback);
  // follow external URL changes (e.g. a link to ?tab=lineups)
  useEffect(() => {
    if (fromUrl && valid.includes(fromUrl)) setValue(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl]);
  const set = useCallback(
    (t: T) => {
      setValue(t);
      const url = new URL(window.location.href);
      if (t === fallback) url.searchParams.delete(param);
      else url.searchParams.set(param, t);
      window.history.replaceState(window.history.state, "", url.toString());
    },
    [fallback, param],
  );
  return [value, set];
}

/**
 * Linear-style tab bar:
 *  - a hover pill glides under the pointer between tabs (pointer devices only)
 *  - a separate active underline springs to the selected tab
 *  - activates on pointer-down for mouse (feels instant), click for touch/keyboard
 *  - roving tabindex, ←/→/Home/End, optional 1–9 hotkeys, full ARIA
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  hotkeys = false,
  trailing,
  idBase,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  hotkeys?: boolean;
  trailing?: ReactNode;
  idBase?: string;
}) {
  const uid = useId();
  const base = idBase ?? uid;
  const [hovered, setHovered] = useState<T | null>(null);
  const [canHover, setCanHover] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => setCanHover(window.matchMedia("(hover: hover)").matches), []);

  // keep the active tab visible in a horizontally scrolling bar
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-key="${value}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [value, reduce]);

  useEffect(() => {
    if (!hotkeys) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable=true],[cmdk-root]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= items.length) onChange(items[n - 1].key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkeys, items, onChange]);

  const move = (dir: number | "first" | "last") => {
    const i = items.findIndex((t) => t.key === value);
    const j = dir === "first" ? 0 : dir === "last" ? items.length - 1 : (i + dir + items.length) % items.length;
    onChange(items[j].key);
    listRef.current?.querySelector<HTMLElement>(`[data-key="${items[j].key}"]`)?.focus();
  };

  return (
    <LayoutGroup id={base}>
      <div className={clsx("flex items-center", className)}>
        <div
          ref={listRef}
          role="tablist"
          aria-label={label}
          onPointerLeave={() => setHovered(null)}
          className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none]"
        >
          {items.map((t) => {
            const active = t.key === value;
            return (
              <button
                key={t.key}
                data-key={t.key}
                id={`${base}-tab-${t.key}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`${base}-panel-${t.key}`}
                tabIndex={active ? 0 : -1}
                onPointerEnter={() => canHover && setHovered(t.key)}
                onPointerDown={(e) => {
                  if (e.pointerType === "mouse" && e.button === 0 && !active) onChange(t.key);
                }}
                onClick={() => !active && onChange(t.key)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") (e.preventDefault(), move(1));
                  else if (e.key === "ArrowLeft") (e.preventDefault(), move(-1));
                  else if (e.key === "Home") (e.preventDefault(), move("first"));
                  else if (e.key === "End") (e.preventDefault(), move("last"));
                }}
                className={clsx(
                  "relative shrink-0 touch-manipulation px-3 pt-2 pb-2.5 text-sm transition-colors duration-[120ms] select-none",
                  "rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
                  active ? "cursor-default text-fg" : "cursor-pointer text-fg-3 hover:text-fg",
                )}
              >
                {hovered === t.key && (
                  <motion.span
                    layoutId="hover-pill"
                    className="absolute inset-x-0.5 top-1 bottom-1.5 rounded-md bg-hover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={reduce ? { duration: 0 } : { ...HOVER, opacity: { duration: 0.12 } }}
                  />
                )}
                <motion.span className="relative inline-block" whileTap={reduce ? undefined : { scale: 0.97 }} transition={{ duration: 0.08 }}>
                  {t.label}
                </motion.span>
                {active && (
                  <motion.span
                    layoutId="underline"
                    className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent"
                    transition={reduce ? { duration: 0 } : UNDERLINE}
                  />
                )}
              </button>
            );
          })}
        </div>
        {trailing}
      </div>
    </LayoutGroup>
  );
}

function Panel({ active, dir, id, labelledBy, children }: { active: boolean; dir: number; id: string; labelledBy: string; children: ReactNode }) {
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!active || !scope.current) return;
    if (reduce) animate(scope.current, { opacity: [0, 1] }, { duration: 0.1 });
    else animate(scope.current, { opacity: [0, 1], x: [12 * dir, 0] }, { duration: 0.16, ease: [0.2, 0, 0, 1] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return (
    <div ref={scope} id={id} role="tabpanel" aria-labelledby={labelledBy} tabIndex={0} hidden={!active} className="outline-none">
      {children}
    </div>
  );
}

/**
 * Panels that stay mounted once visited (instant switching, preserved state and
 * scroll), with a short direction-aware slide when a panel becomes active.
 */
export function TabPanels<T extends string>({
  order,
  value,
  render,
  idBase,
}: {
  order: T[];
  value: T;
  render: (key: T) => ReactNode;
  idBase: string;
}) {
  const [visited, setVisited] = useState<Set<T>>(() => new Set([value]));
  const prev = useRef(value);
  const dir = Math.sign(order.indexOf(value) - order.indexOf(prev.current)) || 1;
  useEffect(() => {
    prev.current = value;
    setVisited((v) => (v.has(value) ? v : new Set(v).add(value)));
  }, [value]);
  return (
    <>
      {order
        .filter((k) => visited.has(k) || k === value)
        .map((k) => (
          <Panel key={k} active={k === value} dir={dir} id={`${idBase}-panel-${k}`} labelledBy={`${idBase}-tab-${k}`}>
            {render(k)}
          </Panel>
        ))}
    </>
  );
}
