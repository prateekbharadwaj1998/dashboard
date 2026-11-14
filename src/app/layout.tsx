import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shell/Providers";
import { Shell } from "@/components/shell/Shell";
import { CommandMenu, type SearchTeam } from "@/components/shell/CommandMenu";
import { getAllLeagues } from "@/lib/data/repo";
import { CURRENT_SEASON } from "@/lib/data/leagues";
import { teamBySlug } from "@/lib/data/teams";

export const metadata: Metadata = {
  title: { default: "Halfspace — Live football", template: "%s · Halfspace" },
  description: "Live scores, line-ups, player ratings and stream overlays for 220+ competitions worldwide.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08090a" },
    { media: "(prefers-color-scheme: light)", color: "#f7f8f9" },
  ],
};

// Runs before paint so the stored theme never flashes.
const themeScript = `try{var t=localStorage.getItem("halfspace:theme");if(t!=="light")t="dark";document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const leagues = await getAllLeagues(CURRENT_SEASON);
  const teams: SearchTeam[] = leagues
    .flatMap((ls) => ls.teams.map((slug) => ({ slug, league: ls.league })))
    .sort((a, b) => (teamBySlug(a.slug)?.short ?? "").localeCompare(teamBySlug(b.slug)?.short ?? ""));

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <Shell>{children}</Shell>
          <CommandMenu teams={teams} />
        </Providers>
      </body>
    </html>
  );
}
