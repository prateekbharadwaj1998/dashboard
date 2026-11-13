export function Logo({ size = 22 }: { size?: number }) {
  // Original mark: a pitch split by the half-way line, with the right half lit.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="hs-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B93FF" />
          <stop offset="1" stopColor="#5E6AD2" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#hs-g)" />
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill="none" stroke="rgb(255 255 255 / .25)" />
      <path d="M12 5.5v13" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path d="M5.5 8.5h2.2v7H5.5" fill="none" stroke="rgb(255 255 255 / .55)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M18.5 8.5h-2.2v7h2.2" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
