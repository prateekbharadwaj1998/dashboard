/** Pick readable text (white or near-black) for a fill colour. */
export function onColor(hex?: string) {
  const h = (hex ?? "#5e6ad2").replace("#", "");
  if (h.length < 6) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? "#08090A" : "#ffffff";
}

function lum(hex: string) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0) / 3;
}

/** Team colours for a head-to-head view: make sure the two sides are distinguishable. */
export function sideColors(home?: string, away?: string): [string, string] {
  const h = home && home.length >= 7 ? home : "#3987e5";
  let a = away && away.length >= 7 ? away : "#d95926";
  const dist = Math.abs(lum(h) - lum(a)) + (h.slice(1, 3) === a.slice(1, 3) ? 0 : 40);
  if (h.toLowerCase() === a.toLowerCase() || dist < 30) a = lum(h) > 128 ? "#2b2f36" : "#e6e6e6";
  return [h, a];
}
