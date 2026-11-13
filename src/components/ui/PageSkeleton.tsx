export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy aria-label="Loading">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-4 w-72" />
      <div className="panel space-y-2 p-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton h-9" style={{ opacity: 1 - i * 0.08 }} />
        ))}
      </div>
    </div>
  );
}
