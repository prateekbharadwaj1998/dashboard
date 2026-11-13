import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="display text-gradient text-[64px] leading-none">404</div>
      <p className="mt-3 text-sm text-fg-3">That page is offside. Nothing here.</p>
      <Link href="/" className="mt-6 inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover">
        Back to matches
      </Link>
    </div>
  );
}
