"use client";
import { CountUp } from "./CountUp";
import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  decimals = 0,
  suffix,
  hint,
  children,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-2xs font-medium text-fg-3">{label}</div>
      <div className="mt-1 text-[22px] leading-7 font-semibold tracking-[-0.018em] text-fg">
        <CountUp value={value} decimals={decimals} suffix={suffix} />
      </div>
      {hint && <div className="mt-0.5 text-2xs text-fg-4">{hint}</div>}
      {children}
    </div>
  );
}
