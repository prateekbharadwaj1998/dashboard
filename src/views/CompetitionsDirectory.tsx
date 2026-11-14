"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ALL_COMPETITIONS, FEATURED, compBySlug } from "@/lib/espn/competitions";
import { CompLogo } from "@/components/ui/CompLogo";
import { Panel } from "@/components/ui/Panel";

// Rough region from ESPN slug prefixes (country codes / confederations).
const REGION: [RegExp, string][] = [
  [/^(fifa|uefa\.nations|uefa\.euro|conmebol\.america|concacaf\.gold|caf\.nations|afc\.asian|afc\.cupq)/, "International"],
  [/^(uefa|conmebol|concacaf|caf|afc|ofc)\./, "Continental clubs"],
  [/^(eng|sco|wal|nir|irl|esp|ger|ita|fra|ned|por|bel|tur|aut|sui|gre|den|nor|swe|fin|rus|ukr|pol|cze|cro|srb|rou|bul|hun|svk|isl|cyp|isr)\./, "Europe"],
  [/^(usa|mex|can|bra|arg|col|chi|uru|per|ecu|par|ven|bol|crc|hon|gua|slv|jam|pan)\./, "Americas"],
  [/^(ksa|uae|qat|ind|jpn|chn|kor|aus|tha|idn|mys|sgp|vie|irn|egy|rsa|mar|nga|gha|tun|alg)\./, "Asia, Africa & Oceania"],
];
const regionOf = (slug: string) => (/\.w\.|wchampions|wwc|women/.test(slug) ? "Women" : REGION.find(([re]) => re.test(slug))?.[1] ?? "Other");

export function CompetitionsDirectory() {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return ALL_COMPETITIONS.filter((c) => !n || `${c.name} ${c.short} ${c.slug}`.toLowerCase().includes(n));
  }, [q]);
  const regions = ["International", "Europe", "Continental clubs", "Americas", "Asia, Africa & Oceania", "Women", "Other"];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-[26px] leading-8">Competitions</h1>
          <p className="mt-0.5 text-sm text-fg-3">{ALL_COMPETITIONS.length} competitions worldwide · live scores, tables and squads</p>
        </div>
        <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg bg-panel px-3 text-sm shadow-ring">
          <Search size={14} className="text-fg-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a league or cup…" className="w-full bg-transparent outline-none placeholder:text-fg-4" />
        </label>
      </div>
      {!q && (
        <Panel title="Featured" pad={false}>
          <div className="grid grid-cols-1 gap-px px-2 pb-2 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED.flatMap((g) => g.slugs)
              .filter((s) => compBySlug(s))
              .map((s) => (
                <Link key={s} href={`/competition?lg=${s}`} className="flex h-10 min-w-0 items-center gap-2.5 rounded-md px-2 text-sm text-fg-2 hover:bg-hover hover:text-fg">
                  <CompLogo slug={s} size={20} />
                  <span className="truncate">{compBySlug(s)!.name}</span>
                </Link>
              ))}
          </div>
        </Panel>
      )}
      {regions.map((r) => {
        const items = list.filter((c) => regionOf(c.slug) === r);
        if (!items.length) return null;
        return (
          <Panel key={r} title={`${r} · ${items.length}`} pad={false}>
            <div className="grid grid-cols-1 gap-px px-2 pb-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <Link key={c.slug} href={`/competition?lg=${c.slug}`} className="flex h-10 min-w-0 items-center gap-2.5 rounded-md px-2 text-sm text-fg-2 hover:bg-hover hover:text-fg">
                  <CompLogo slug={c.slug} size={20} />
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
