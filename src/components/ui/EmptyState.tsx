import Link from "next/link";
import type { ReactNode } from "react";

/** Friendly empty/error state with a way forward. */
export function EmptyState({ title, body, actions }: { title: string; body: ReactNode; actions?: { href: string; label: string }[] }) {
  return (
    <div className="panel mx-auto mt-6 max-w-lg px-6 py-10 text-center">
      <h2 className="text-base font-medium text-fg">{title}</h2>
      <p className="mt-1.5 text-sm text-fg-3">{body}</p>
      {actions && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions.map((a, i) => (
            <Link key={a.href} href={a.href} className={i === 0 ? "inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover" : "inline-flex h-8 items-center rounded-md px-3 text-sm text-fg-2 shadow-ring hover:bg-hover"}>
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
