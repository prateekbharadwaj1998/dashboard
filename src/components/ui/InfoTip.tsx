"use client";
import { AnimatePresence, motion } from "motion/react";
import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Small ⓘ explainer. Click/tap (or focus + Enter) toggles a popover; optionally
 * auto-opens once per browser (`onceKey`) so first-time users learn the term.
 */
export function InfoTip({ children, label, onceKey }: { children: ReactNode; label: string; onceKey?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!onceKey) return;
    try {
      const k = `hs.onboarded.${onceKey}`;
      if (!localStorage.getItem(k) && !sessionStorage.getItem("hs.hint.shown")) {
        localStorage.setItem(k, "1");
        sessionStorage.setItem("hs.hint.shown", "1"); // never more than one hint per visit
        const t = setTimeout(() => setOpen(true), 900);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [onceKey]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex cursor-pointer rounded-full p-0.5 text-fg-4 transition-colors hover:text-fg-2"
      >
        <Info size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute top-full left-0 z-40 mt-2 w-[min(300px,80vw)] rounded-xl bg-elevated p-3 text-xs leading-5 font-normal text-fg-2 shadow-modal"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
