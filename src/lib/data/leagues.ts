import type { LeagueId, SeasonId, Zone } from "./types";

export interface LeagueConfig {
  id: LeagueId;
  name: string;
  short: string;
  country: string;
  flag: string;
  ofCode: string; // openfootball file code
  espnCode: string;
  tz: string; // kick-off times in source data are local to this zone
  teams: number;
  color: string;
  zones: { zone: Zone; from: number; to: number }[];
}

export const SEASONS: SeasonId[] = ["2026-27", "2025-26"];
export const CURRENT_SEASON: SeasonId = "2026-27";

export const LEAGUES: LeagueConfig[] = [
  {
    id: "epl",
    name: "Premier League",
    short: "EPL",
    country: "England",
    flag: "🏴",
    ofCode: "en.1",
    espnCode: "eng.1",
    tz: "Europe/London",
    teams: 20,
    color: "#7C83FF",
    zones: [
      { zone: "ucl", from: 1, to: 4 },
      { zone: "uel", from: 5, to: 5 },
      { zone: "uecl", from: 6, to: 6 },
      { zone: "rel", from: 18, to: 20 },
    ],
  },
  {
    id: "laliga",
    name: "LaLiga",
    short: "LIGA",
    country: "Spain",
    flag: "🇪🇸",
    ofCode: "es.1",
    espnCode: "esp.1",
    tz: "Europe/Madrid",
    teams: 20,
    color: "#F2A65A",
    zones: [
      { zone: "ucl", from: 1, to: 4 },
      { zone: "uel", from: 5, to: 6 },
      { zone: "uecl", from: 7, to: 7 },
      { zone: "rel", from: 18, to: 20 },
    ],
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    short: "BUN",
    country: "Germany",
    flag: "🇩🇪",
    ofCode: "de.1",
    espnCode: "ger.1",
    tz: "Europe/Berlin",
    teams: 18,
    color: "#EB5757",
    zones: [
      { zone: "ucl", from: 1, to: 4 },
      { zone: "uel", from: 5, to: 5 },
      { zone: "uecl", from: 6, to: 6 },
      { zone: "playoff", from: 16, to: 16 },
      { zone: "rel", from: 17, to: 18 },
    ],
  },
  {
    id: "seriea",
    name: "Serie A",
    short: "SA",
    country: "Italy",
    flag: "🇮🇹",
    ofCode: "it.1",
    espnCode: "ita.1",
    tz: "Europe/Rome",
    teams: 20,
    color: "#5BB8F5",
    zones: [
      { zone: "ucl", from: 1, to: 4 },
      { zone: "uel", from: 5, to: 5 },
      { zone: "uecl", from: 6, to: 6 },
      { zone: "rel", from: 18, to: 20 },
    ],
  },
  {
    id: "ligue1",
    name: "Ligue 1",
    short: "L1",
    country: "France",
    flag: "🇫🇷",
    ofCode: "fr.1",
    espnCode: "fra.1",
    tz: "Europe/Paris",
    teams: 18,
    color: "#4CC9A6",
    zones: [
      { zone: "ucl", from: 1, to: 4 },
      { zone: "uel", from: 5, to: 5 },
      { zone: "uecl", from: 6, to: 6 },
      { zone: "playoff", from: 16, to: 16 },
      { zone: "rel", from: 17, to: 18 },
    ],
  },
];

export const LEAGUE_BY_ID = Object.fromEntries(LEAGUES.map((l) => [l.id, l])) as Record<
  LeagueId,
  LeagueConfig
>;

export function isLeagueId(x: string): x is LeagueId {
  return x in LEAGUE_BY_ID;
}

export function parseSeason(x: string | string[] | undefined): SeasonId {
  const v = Array.isArray(x) ? x[0] : x;
  return (SEASONS as string[]).includes(v ?? "") ? (v as SeasonId) : CURRENT_SEASON;
}

export function zoneFor(league: LeagueId, pos: number): Zone | undefined {
  return LEAGUE_BY_ID[league].zones.find((z) => pos >= z.from && pos <= z.to)?.zone;
}

export const ZONE_LABEL: Record<Zone, string> = {
  ucl: "Champions League",
  uel: "Europa League",
  uecl: "Conference League",
  playoff: "Relegation play-off",
  rel: "Relegation",
};
