"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel mx-auto mt-16 max-w-md p-8 text-center">
      <h2 className="text-base font-medium">Something went sideways</h2>
      <p className="mt-1 text-sm text-fg-3">A data feed didn&apos;t respond as expected. Cached results are still available.</p>
      <button onClick={reset} className="mt-5 h-8 rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover">
        Try again
      </button>
    </div>
  );
}
