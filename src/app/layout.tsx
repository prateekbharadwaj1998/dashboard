import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shell/Providers";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { CommandMenu, type SearchTeam } from "@/components/shell/CommandMenu";
import { getAllLeagues } from "@/lib/data/repo";
import { CURRENT_SEASON } from "@/lib/data/leagues";
import { teamBySlug } from "@/lib/data/teams";

export const metadata: Metadata = {
  title: { default: "Halfspace — Football intelligence", template: "%s · Halfspace" },
  description: "Live scores, tables and season analytics for Europe's top five leagues.",
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
          <div className="flex h-dvh overflow-hidden">
            <Sidebar />
            <div id="scroll-root" className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
              <Topbar />
              <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
            </div>
          </div>
          <CommandMenu teams={teams} />
        </Providers>
      </body>
    </html>
  );
}
