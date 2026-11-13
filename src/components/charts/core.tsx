"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];
export const EASE = [0.22, 1, 0.36, 1] as const;

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (Math.abs(s.width - width) < 1 && Math.abs(s.height - height) < 1 ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Smooth bump-style path: horizontal tangents at every point (sigmoid between steps). */
export function bumpPath(pts: [number, number][]) {
  if (!pts.length) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}

/** Monotone-ish smooth line (Catmull-Rom → Bezier with tension 0.5, clamped). */
export function smoothPath(pts: [number, number][]) {
  if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const t = 0.18;
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    // clamp control points vertically between neighbours to avoid overshoot
    const lo = Math.min(p1[1], p2[1]);
    const hi = Math.max(p1[1], p2[1]);
    c1[1] = Math.min(hi, Math.max(lo, c1[1]));
    c2[1] = Math.min(hi, Math.max(lo, c2[1]));
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(Math.round(v * 100) / 100);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

/** Floating tooltip that springs to the pointer and flips at the edges. */
export function ChartTooltip({
  x,
  y,
  width,
  visible,
  children,
}: {
  x: number;
  y: number;
  width: number;
  visible: boolean;
  children: ReactNode;
}) {
  const flip = x > width - 200;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="tt"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1, x: flip ? x - 12 : x + 12, y }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ type: "spring", stiffness: 500, damping: 40, opacity: { duration: 0.12 } }}
          style={{ translateX: flip ? "-100%" : "0%", translateY: "-50%" }}
          className="pointer-events-none absolute left-0 top-0 z-20 min-w-[148px] rounded-lg bg-elevated px-3 py-2 text-xs shadow-modal"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TooltipRow({ color, label, value, dim }: { color?: string; label: ReactNode; value: ReactNode; dim?: boolean }) {
  return (
    <div className={`flex items-center gap-2 py-0.5 ${dim ? "opacity-50" : ""}`}>
      {color && <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />}
      <span className="tnum min-w-6 font-semibold text-fg">{value}</span>
      <span className="truncate text-fg-3">{label}</span>
    </div>
  );
}

export function Legend({ items, onRemove }: { items: { key: string; label: string; color: string; shape?: "line" | "rect" }[]; onRemove?: (k: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((it) => (
        <motion.button
          layout
          key={it.key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onRemove ? () => onRemove(it.key) : undefined}
          disabled={!onRemove}
          className="group inline-flex items-center gap-1.5 text-xs text-fg-2 enabled:hover:text-fg"
        >
          <span
            className={it.shape === "rect" ? "h-2 w-2 rounded-[2px]" : "h-0.5 w-3 rounded-full"}
            style={{ background: it.color }}
          />
          {it.label}
          {onRemove && <span className="text-fg-4 opacity-0 transition-opacity group-hover:opacity-100">×</span>}
        </motion.button>
      ))}
    </div>
  );
}
