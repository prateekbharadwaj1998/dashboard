export default function Loading() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-4 w-72" />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="panel space-y-2 p-4">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="skeleton h-7" style={{ opacity: 1 - i * 0.07 }} />
          ))}
        </div>
        <div className="panel space-y-2 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-9" />
          ))}
        </div>
      </div>
    </div>
  );
}
