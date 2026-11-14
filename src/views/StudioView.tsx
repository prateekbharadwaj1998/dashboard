"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import clsx from "clsx";
import { BASE_PATH } from "@/lib/paths";
import { useBrowserTz } from "@/lib/clientData";
import { localDayOf, useDayMatches } from "@/lib/espn/useDay";
import { FEATURED, compBySlug, compLabel, priorityOf } from "@/lib/espn/competitions";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";

type Widget = "scorebug" | "ticker" | "table";
type Theme = "dark" | "light" | "clear";

const SIZES: Record<Widget, [number, number]> = { scorebug: [600, 200], ticker: [1920, 110], table: [440, 420] };

export function StudioView() {
  const sp = useSearchParams();
  const tz = useBrowserTz();
  const { matches } = useDayMatches(tz ? localDayOf(Date.now(), tz) : null, tz);
  const [widget, setWidget] = useState<Widget>(sp.get("match") ? "scorebug" : "scorebug");
  const [theme, setTheme] = useState<Theme>("dark");
  const [match, setMatch] = useState(sp.get("match") ?? "");
  const [lg, setLg] = useState("eng.1");
  const [rows, setRows] = useState(8);
  const [copied, setCopied] = useState(false);

  const sorted = useMemo(
    () => [...matches].sort((a, b) => Number(b.state === "in") - Number(a.state === "in") || priorityOf(a.league) - priorityOf(b.league) || a.date.localeCompare(b.date)).slice(0, 80),
    [matches],
  );
  const matchId = match || sorted[0]?.id || "";
  const params = new URLSearchParams({ w: widget, theme });
  if (widget === "scorebug") params.set("match", matchId);
  if (widget === "ticker" && lg !== "all") params.set("lg", lg);
  if (widget === "table") {
    params.set("lg", lg === "all" ? "eng.1" : lg);
    params.set("rows", String(rows));
  }
  const path = `${BASE_PATH}/overlay/?${params}`;
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}${path}`;
  const [w, h] = SIZES[widget];
  const previewScale = widget === "ticker" ? 0.42 : 1;
  const comps = FEATURED.flatMap((g) => g.slugs).filter((s) => compBySlug(s));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-[26px] leading-8">Streamer studio</h1>
        <p className="mt-0.5 text-sm text-fg-3">Live score overlays for OBS, Streamlabs and vMix. Transparent, auto-updating every 10 seconds, free.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="Configure">
          <div className="space-y-4 text-sm">
            <div>
              <div className="mb-1.5 text-2xs font-medium text-fg-4">Widget</div>
              <Segmented<Widget> value={widget} onChange={setWidget} options={[{ value: "scorebug", label: "Scorebug" }, { value: "ticker", label: "Ticker" }, { value: "table", label: "Table" }]} />
            </div>
            {widget === "scorebug" && (
              <div>
                <div className="mb-1.5 text-2xs font-medium text-fg-4">Match (today)</div>
                <select value={matchId} onChange={(e) => setMatch(e.target.value)} className="h-9 w-full rounded-md bg-app px-2 shadow-ring outline-none">
                  {sorted.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.state === "in" ? "● " : ""}
                      {m.home.short} v {m.away.short} · {compLabel(m.league)}
                    </option>
                  ))}
                  {!sorted.length && <option value="">No matches today</option>}
                </select>
                <p className="mt-1 text-2xs text-fg-4">Tip: open any match and click “Stream overlay” to land here with it selected.</p>
              </div>
            )}
            {widget !== "scorebug" && (
              <div>
                <div className="mb-1.5 text-2xs font-medium text-fg-4">Competition</div>
                <select value={lg} onChange={(e) => setLg(e.target.value)} className="h-9 w-full rounded-md bg-app px-2 shadow-ring outline-none">
                  {widget === "ticker" && <option value="all">All featured competitions</option>}
                  {comps.map((s) => (
                    <option key={s} value={s}>
                      {compBySlug(s)?.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {widget === "table" && (
              <div>
                <div className="mb-1.5 text-2xs font-medium text-fg-4">Rows: {rows}</div>
                <input type="range" min={4} max={20} value={rows} onChange={(e) => setRows(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
              </div>
            )}
            <div>
              <div className="mb-1.5 text-2xs font-medium text-fg-4">Style</div>
              <Segmented<Theme> value={theme} onChange={setTheme} options={[{ value: "dark", label: "Dark glass" }, { value: "light", label: "Light" }, { value: "clear", label: "Clear" }]} />
            </div>
            <div className="rounded-lg bg-app p-3 shadow-ring">
              <div className="mb-1 text-2xs font-medium text-fg-4">Browser source URL</div>
              <code className="block text-xs break-all text-fg-2">{url}</code>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(url).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    });
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-white hover:bg-accent-hover"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy URL"}
                </button>
                <a href={path} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs text-fg-2 shadow-ring hover:bg-hover">
                  <ExternalLink size={13} /> Open
                </a>
              </div>
            </div>
            <ol className="list-decimal space-y-1 pl-4 text-2xs leading-4 text-fg-3">
              <li>In OBS: Sources → + → Browser.</li>
              <li>Paste the URL. Width {w}, height {h}.</li>
              <li>Leave “Custom CSS” empty — the page background is already transparent.</li>
            </ol>
          </div>
        </Panel>
        <Panel title="Live preview" subtitle={`${w}×${h} · updates live`}>
          <div className="checker flex min-h-[260px] items-start overflow-hidden rounded-lg p-2">
            <div style={{ width: w * previewScale, height: h * previewScale }} className="overflow-hidden">
              <iframe
                key={path}
                src={path}
                title="Overlay preview"
                style={{ width: w, height: h, transform: `scale(${previewScale})`, transformOrigin: "top left", border: 0, background: "transparent" }}
                className={clsx("pointer-events-none")}
              />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
