// Competition catalogue: all ~220 ESPN soccer competitions (built by
// scripts/espn-catalog.mjs) plus our curated, region-grouped featured list.
import catalog from "@/data/competitions.json";

export interface Competition {
  id: string;
  slug: string;
  name: string;
  short: string;
  logo?: string;
  logoDark?: string;
  tournament?: boolean;
}

export const ALL_COMPETITIONS = catalog as Competition[];
const BY_SLUG = new Map(ALL_COMPETITIONS.map((c) => [c.slug, c]));
const BY_ID = new Map(ALL_COMPETITIONS.map((c) => [c.id, c]));

export const compBySlug = (slug: string) => BY_SLUG.get(slug);
export const compById = (id: string) => BY_ID.get(id);

export interface CompGroup {
  key: string;
  label: string;
  slugs: string[];
}

/** Ordered by priority; the Today screen sorts competitions by this order. */
export const FEATURED: CompGroup[] = [
  { key: "top", label: "Top leagues", slugs: ["eng.1", "esp.1", "ger.1", "ita.1", "fra.1"] },
  { key: "uefa", label: "European cups", slugs: ["uefa.champions", "uefa.europa", "uefa.europa.conf", "uefa.super_cup"] },
  {
    key: "intl",
    label: "International",
    slugs: [
      "fifa.world",
      "uefa.nations",
      "fifa.worldq.uefa",
      "fifa.worldq.conmebol",
      "fifa.worldq.concacaf",
      "fifa.worldq.afc",
      "fifa.worldq.caf",
      "uefa.euro",
      "uefa.euroq",
      "conmebol.america",
      "concacaf.gold",
      "afc.asian.cup",
      "caf.nations",
      "fifa.friendly",
      "fifa.cwc",
    ],
  },
  {
    key: "europe",
    label: "Europe",
    slugs: ["eng.2", "ned.1", "por.1", "sco.1", "bel.1", "tur.1", "aut.1", "gre.1", "den.1", "nor.1", "swe.1"],
  },
  {
    key: "cups",
    label: "Domestic cups",
    slugs: ["eng.fa", "eng.league_cup", "esp.copa_del_rey", "ger.dfb_pokal", "ita.coppa_italia", "fra.coupe_de_france"],
  },
  {
    key: "americas",
    label: "Americas",
    slugs: ["usa.1", "mex.1", "bra.1", "arg.1", "conmebol.libertadores", "conmebol.sudamericana", "concacaf.champions"],
  },
  { key: "asia", label: "Asia, Africa & Middle East", slugs: ["ksa.1", "ind.1", "jpn.1", "aus.1", "chn.1", "afc.champions", "caf.champions"] },
  { key: "women", label: "Women", slugs: ["eng.w.1", "uefa.wchampions", "fifa.wwc"] },
];

export const FEATURED_ORDER = new Map(FEATURED.flatMap((g) => g.slugs).map((s, i) => [s, i]));
export const priorityOf = (slug: string) => FEATURED_ORDER.get(slug) ?? 1000;
export const groupOf = (slug: string) => FEATURED.find((g) => g.slugs.includes(slug));

/** Short label for chips and dense rows. */
export function compLabel(slug: string) {
  const c = BY_SLUG.get(slug);
  return c?.short || c?.name || slug;
}

/** Competition logo; `dark` picks ESPN's dark-surface variant when one exists. */
export function compLogo(slug: string, dark = true) {
  const c = BY_SLUG.get(slug);
  return (dark && c?.logoDark) || c?.logo;
}

/** Resolve the league of a scoreboard event (events only carry the numeric id in `uid`). */
export function slugFromUid(uid: string | undefined) {
  const id = uid?.match(/~l:(\d+)/)?.[1];
  return id ? BY_ID.get(id)?.slug : undefined;
}
