"use client";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SITE, SITE_V2, useEspn } from "@/lib/espn/client";
import { matchDetail, standingsGroups, type MatchCard } from "@/lib/espn/normalize";
import { compLabel, priorityOf } from "@/lib/espn/competitions";
import { localDayOf, useDayMatches } from "@/lib/espn/useDay";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { CompLogo } from "@/components/ui/CompLogo";
import { ScoreRoll } from "@/components/live/ScoreRoll";
import { sideColors } from "@/components/matchcentre/colors";

// Chromeless widgets for OBS / Streamlabs browser sources. Transparent page,
// fixed pixel sizes on a 1920×1080 canvas, polling every 10 seconds.
type Theme = "dark" | "light" | "clear";

function panelStyle(theme: Theme): React.CSSProperties {
  if (theme === "light") return { background: "rgb(255 255 255 / .94)", color: "#0f1012", boxShadow: "0 0 0 1px rgb(0 0 0 / .08), 0 8px 24px -8px rgb(0 0 0 / .3)" };
  if (theme === "clear") return { background: "transparent", color: "#fff", textShadow: "0 1px 2px rgb(0 0 0 / .8)" };
  return { background: "rgb(8 9 10 / .88)", color: "#f7f8f8", boxShadow: "inset 0 1px 0 rgb(255 255 255 / .06), 0 0 0 1px rgb(255 255 255 / .08), 0 12px 32px -8px rgb(0 0 0 / .6)" };
}

function Scorebug({ id, theme }: { id: string; theme: Theme }) {
  const { data } = useEspn<unknown>(id ? `${SITE}/all/summary?event=${id}` : null, { ttl: 8000, poll: 10_000 });
  const d = useMemo(() => (data ? matchDetail(data, "all") : null), [data]);
  const prev = useRef<[number, number] | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => {
    if (!d || d.card.home.score == null || d.card.away.score == null) return;
    const now: [number, number] = [d.card.home.score, d.card.away.score];
    const p = prev.current;
    prev.current = now;
    if (!p || (p[0] === now[0] && p[1] === now[1])) return;
    const side = now[0] > p[0] ? "home" : "away";
    const g = [...d.events].reverse().find((e) => e.side === side && /goal|penalty$/.test(e.kind));
    setBanner(`GOAL · ${g?.player ?? d.card[side].short}${g?.minute ? ` ${g.minute}` : ""}`);
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [d]);
  if (!d) return <div style={{ width: 480, height: 64 }} />;
  const m = d.card;
  const [hc, ac] = sideColors(m.home.color, m.away.color);
  const live = m.state === "in";
  return (
    <div style={{ width: 520 }}>
      <div className="flex h-16 items-stretch overflow-hidden rounded-xl" style={panelStyle(theme)}>
        <div className="flex w-14 items-center justify-center">
          <CompLogo slug={d.leagueSlug} size={30} />
        </div>
        <div className="flex flex-1 items-center gap-2.5 pr-3">
          <span className="h-10 w-1 rounded-full" style={{ background: hc }} />
          <TeamLogo src={m.home.logo} abbr={m.home.abbr} size={30} />
          <span className="text-[26px] font-bold tracking-tight">{m.home.abbr}</span>
        </div>
        <div className="flex w-[100px] items-center justify-center gap-1 text-[32px] font-bold" style={{ background: "rgb(255 255 255 / .06)" }}>
          <ScoreRoll value={m.home.score ?? 0} />
          <span className="opacity-40">–</span>
          <ScoreRoll value={m.away.score ?? 0} />
        </div>
        <div className="flex flex-1 items-center justify-end gap-2.5 pl-3">
          <span className="text-[26px] font-bold tracking-tight">{m.away.abbr}</span>
          <TeamLogo src={m.away.logo} abbr={m.away.abbr} size={30} />
          <span className="h-10 w-1 rounded-full" style={{ background: ac }} />
        </div>
        <div className="tnum flex w-[76px] items-center justify-center text-lg font-semibold" style={{ background: live ? "#e5484d" : "rgb(255 255 255 / .08)", color: live ? "#fff" : undefined }}>
          {m.state === "pre" ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(m.date)) : m.status}
        </div>
      </div>
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -12, scaleY: 0.6 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="mt-1.5 rounded-lg px-4 py-2 text-xl font-bold tracking-wide"
            style={{ background: "#4cb782", color: "#08090a", transformOrigin: "top" }}
          >
            {banner}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Ticker({ lg, theme }: { lg?: string; theme: Theme }) {
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const { matches } = useDayMatches(localDayOf(Date.now(), tz), tz);
  const list = matches
    .filter((m) => (lg ? m.league === lg : priorityOf(m.league) < 1000))
    .sort((a, b) => Number(b.state === "in") - Number(a.state === "in") || priorityOf(a.league) - priorityOf(b.league))
    .slice(0, 30);
  const item = (m: MatchCard, k: string) => (
    <span key={k} className="flex shrink-0 items-center gap-2.5 px-6">
      <TeamLogo src={m.home.logo} abbr={m.home.abbr} size={24} />
      <span className="font-semibold">{m.home.abbr}</span>
      <span className="tnum font-bold">{m.state === "pre" ? "v" : `${m.home.score ?? 0}–${m.away.score ?? 0}`}</span>
      <span className="font-semibold">{m.away.abbr}</span>
      <TeamLogo src={m.away.logo} abbr={m.away.abbr} size={24} />
      <span className="tnum text-sm opacity-70" style={m.state === "in" ? { color: "#ff6b70", opacity: 1 } : undefined}>
        {m.state === "pre" ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(m.date)) : m.status}
      </span>
      <span className="pl-4 opacity-30">•</span>
    </span>
  );
  const duration = Math.max(20, list.length * 6);
  return (
    <div className="flex h-14 w-[1920px] items-center overflow-hidden text-xl" style={panelStyle(theme)}>
      <div className="flex h-full shrink-0 items-center gap-2 px-5 font-bold" style={{ background: "#5e6ad2", color: "#fff" }}>
        {lg ? <CompLogo slug={lg} size={26} /> : null}
        {lg ? compLabel(lg) : "LIVE SCORES"}
      </div>
      {list.length ? (
        <div className="flex animate-[marquee_linear_infinite]" style={{ animationDuration: `${duration}s` }}>
          {list.map((m) => item(m, `a-${m.id}`))}
          {list.map((m) => item(m, `b-${m.id}`))}
        </div>
      ) : (
        <span className="px-6 opacity-70">No matches today</span>
      )}
    </div>
  );
}

function Table({ lg, rows, theme, highlight }: { lg: string; rows: number; theme: Theme; highlight?: string }) {
  const { data } = useEspn<unknown>(`${SITE_V2}/${lg}/standings`, { ttl: 60_000, poll: 60_000 });
  const g = useMemo(() => (data ? standingsGroups(data)[0] : null), [data]);
  if (!g) return null;
  let list = g.rows.slice(0, rows);
  if (highlight) {
    const i = g.rows.findIndex((r) => r.team.id === highlight);
    if (i >= rows) list = g.rows.slice(Math.max(0, i - Math.floor(rows / 2)), Math.max(0, i - Math.floor(rows / 2)) + rows);
  }
  return (
    <div className="w-[380px] overflow-hidden rounded-xl" style={panelStyle(theme)}>
      <div className="flex h-11 items-center gap-2 px-4 text-base font-bold">
        <CompLogo slug={lg} size={22} /> {compLabel(lg)}
        <span className="ml-auto text-xs font-medium opacity-60">P · GD · PTS</span>
      </div>
      {list.map((r) => (
        <div key={r.team.id} className="flex h-8 items-center gap-2.5 px-4 text-[15px]" style={r.team.id === highlight ? { background: "rgb(94 106 210 / .35)" } : undefined}>
          <span className="tnum w-5 opacity-60">{r.rank}</span>
          <TeamLogo src={r.team.logo} abbr={r.team.abbr} size={20} />
          <span className="flex-1 truncate font-medium">{r.team.short}</span>
          <span className="tnum w-6 text-right opacity-70">{r.gp}</span>
          <span className="tnum w-8 text-right opacity-70">{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
          <span className="tnum w-8 text-right font-bold">{r.pts}</span>
        </div>
      ))}
    </div>
  );
}

export function OverlayView() {
  const sp = useSearchParams();
  const w = sp.get("w") ?? "scorebug";
  const theme = (["dark", "light", "clear"].includes(sp.get("theme") ?? "") ? sp.get("theme") : "dark") as Theme;
  const scale = Math.min(3, Math.max(0.5, Number(sp.get("scale")) || 1));
  return (
    <div className="p-6" style={{ transform: `scale(${scale})`, transformOrigin: "top left", fontFamily: "Inter Variable, system-ui, sans-serif" }}>
      {w === "scorebug" && <Scorebug id={sp.get("match") ?? ""} theme={theme} />}
      {w === "ticker" && <Ticker lg={sp.get("lg") ?? undefined} theme={theme} />}
      {w === "table" && <Table lg={sp.get("lg") ?? "eng.1"} rows={Number(sp.get("rows")) || 8} theme={theme} highlight={sp.get("team") ?? undefined} />}
    </div>
  );
}
