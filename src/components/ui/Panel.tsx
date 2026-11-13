"use client";
import clsx from "clsx";
import { motion } from "motion/react";
import { useRef, type ReactNode } from "react";

export function Panel({
  children,
  className,
  title,
  subtitle,
  action,
  delay = 0,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  delay?: number;
  pad?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        cancelAnimationFrame(raf.current);
        const { clientX, clientY } = e;
        raf.current = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--x", `${clientX - r.left}px`);
          el.style.setProperty("--y", `${clientY - r.top}px`);
        });
      }}
      className={clsx("panel spotlight min-w-0", className)}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-1">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-medium text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-fg-3">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={clsx(pad && "px-4 pb-4 pt-2")}>{children}</div>
    </motion.section>
  );
}
