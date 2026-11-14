// Colour utilities for head-to-head visuals (OKLab-based, so "different" means
// perceptibly different — Portugal red vs Denmark red must not both be red).

type Lab = [number, number, number];

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const unlin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function lab(hex: string): Lab | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363015264 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromLab([L, A, B]: Lab): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, unlin(c))) * 255).toString(16).padStart(2, "0")).join("")}`;
}
const dE = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Clamp lightness so navy/black kits stay visible on dark surfaces (and pale kits on light). */
function legible(hex: string, dark: boolean) {
  const L = lab(hex);
  if (!L) return hex;
  if (dark && L[0] < 0.55) return fromLab([0.55, L[1], L[2]]);
  if (!dark && L[0] > 0.85) return fromLab([0.85, L[1], L[2]]);
  return hex;
}

/** Pick readable text (white or near-black) for a fill colour. */
export function onColor(hex?: string) {
  const rgb = hexToRgb(hex ?? "#5e6ad2");
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.map(lin);
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return Y > 0.4 ? "#08090A" : "#ffffff";
}

/**
 * Team colours for a head-to-head view. Home keeps its colour; if away is too
 * close (OKLab ΔE < 0.15) it switches to its alternate kit colour, and failing
 * that to a neutral (FotMob's approach). Both are clamped for legibility.
 */
export function sideColors(home?: string, away?: string, awayAlt?: string, dark = true): [string, string] {
  const h = legible(hexToRgb(home ?? "") ? home! : "#3987e5", dark);
  const hl = lab(h)!;
  const far = (c?: string) => {
    if (!c || !hexToRgb(c)) return null;
    const v = legible(c, dark);
    return dE(lab(v)!, hl) >= 0.15 ? v : null;
  };
  const a = far(away) ?? far(awayAlt) ?? (dark ? "#E6E6E6" : "#2B2F36");
  return [h, a];
}
