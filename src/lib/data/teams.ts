// Curated identity for every club that appears in the 2025-26 and 2026-27
// top-five-league data. Colors are the clubs' primary kit colors, tuned so they
// stay legible on a near-black surface.
export interface TeamIdentity {
  slug: string;
  name: string;
  short: string;
  abbr: string;
  color: string;
}

type Entry = [name: string, short: string, abbr: string, color: string];

const ENTRIES: Entry[] = [
  // England
  ["AFC Bournemouth", "Bournemouth", "BOU", "#DA291C"],
  ["Arsenal FC", "Arsenal", "ARS", "#EF0107"],
  ["Aston Villa FC", "Aston Villa", "AVL", "#95BFE5"],
  ["Brentford FC", "Brentford", "BRE", "#E30613"],
  ["Brighton & Hove Albion FC", "Brighton", "BHA", "#0057B8"],
  ["Burnley FC", "Burnley", "BUR", "#8A1538"],
  ["Chelsea FC", "Chelsea", "CHE", "#034694"],
  ["Coventry City FC", "Coventry", "COV", "#59CBE8"],
  ["Crystal Palace FC", "Crystal Palace", "CRY", "#1B458F"],
  ["Everton FC", "Everton", "EVE", "#274488"],
  ["Fulham FC", "Fulham", "FUL", "#E6E6E6"],
  ["Hull City AFC", "Hull City", "HUL", "#F5A12D"],
  ["Ipswich Town FC", "Ipswich", "IPS", "#3A64A3"],
  ["Leeds United FC", "Leeds", "LEE", "#FFCD00"],
  ["Liverpool FC", "Liverpool", "LIV", "#C8102E"],
  ["Manchester City FC", "Man City", "MCI", "#6CABDD"],
  ["Manchester United FC", "Man United", "MUN", "#DA291C"],
  ["Newcastle United FC", "Newcastle", "NEW", "#D9D9D9"],
  ["Nottingham Forest FC", "Nott'm Forest", "NFO", "#DD0000"],
  ["Sunderland AFC", "Sunderland", "SUN", "#EB172B"],
  ["Tottenham Hotspur FC", "Tottenham", "TOT", "#E8E8F0"],
  ["West Ham United FC", "West Ham", "WHU", "#7A263A"],
  ["Wolverhampton Wanderers FC", "Wolves", "WOL", "#FDB913"],
  // Spain
  ["Athletic Club", "Athletic", "ATH", "#EE2523"],
  ["CA Osasuna", "Osasuna", "OSA", "#D91A21"],
  ["Club Atlético de Madrid", "Atlético", "ATM", "#CB3524"],
  ["Deportivo Alavés", "Alavés", "ALA", "#3B6FB6"],
  ["Elche CF", "Elche", "ELC", "#05A156"],
  ["FC Barcelona", "Barcelona", "BAR", "#A50044"],
  ["Getafe CF", "Getafe", "GET", "#3E6FB0"],
  ["Girona FC", "Girona", "GIR", "#CD2534"],
  ["Levante UD", "Levante", "LEV", "#B4053F"],
  ["Málaga CF", "Málaga", "MAL", "#4C9FD8"],
  ["RC Celta de Vigo", "Celta", "CEL", "#8AC3EE"],
  ["RC Deportivo La Coruña", "Deportivo", "DEP", "#2C6BB5"],
  ["RCD Espanyol de Barcelona", "Espanyol", "ESP", "#2E77C9"],
  ["RCD Mallorca", "Mallorca", "MLL", "#E20613"],
  ["Rayo Vallecano de Madrid", "Rayo", "RAY", "#E53027"],
  ["Real Betis Balompié", "Real Betis", "BET", "#0BB363"],
  ["Real Madrid CF", "Real Madrid", "RMA", "#F2F2F2"],
  ["Real Oviedo", "Oviedo", "OVI", "#2F68B4"],
  ["Real Racing Club de Santander", "Racing", "RAC", "#13A538"],
  ["Real Sociedad de Fútbol", "Real Sociedad", "RSO", "#2D6CB5"],
  ["Sevilla FC", "Sevilla", "SEV", "#D8001F"],
  ["Valencia CF", "Valencia", "VAL", "#EE8707"],
  ["Villarreal CF", "Villarreal", "VIL", "#FFE667"],
  // Germany
  ["1. FC Heidenheim 1846", "Heidenheim", "HDH", "#E30613"],
  ["1. FC Köln", "Köln", "KOE", "#ED1C24"],
  ["1. FC Union Berlin", "Union Berlin", "FCU", "#EB1923"],
  ["1. FSV Mainz 05", "Mainz", "M05", "#C3141E"],
  ["Bayer 04 Leverkusen", "Leverkusen", "B04", "#E32221"],
  ["Borussia Dortmund", "Dortmund", "BVB", "#FDE100"],
  ["Borussia Mönchengladbach", "M'gladbach", "BMG", "#1CA64C"],
  ["Eintracht Frankfurt", "Frankfurt", "SGE", "#E1000F"],
  ["FC Augsburg", "Augsburg", "FCA", "#BA3733"],
  ["FC Bayern München", "Bayern", "FCB", "#DC052D"],
  ["FC Schalke 04", "Schalke", "S04", "#004D9D"],
  ["FC St. Pauli 1910", "St. Pauli", "STP", "#A0522D"],
  ["Hamburger SV", "Hamburg", "HSV", "#0A3F86"],
  ["RB Leipzig", "Leipzig", "RBL", "#DD0741"],
  ["SC Freiburg", "Freiburg", "SCF", "#E2001A"],
  ["SC Paderborn 07", "Paderborn", "SCP", "#2C5AA0"],
  ["SV 07 Elversberg", "Elversberg", "SVE", "#2B2B2B"],
  ["SV Werder Bremen", "Werder", "SVW", "#1D9053"],
  ["TSG 1899 Hoffenheim", "Hoffenheim", "TSG", "#1C63B7"],
  ["VfB Stuttgart", "Stuttgart", "VFB", "#E32219"],
  ["VfL Wolfsburg", "Wolfsburg", "WOB", "#65B32E"],
  // Italy
  ["AC Milan", "Milan", "MIL", "#FB090B"],
  ["AC Monza", "Monza", "MON", "#E30613"],
  ["AC Pisa 1909", "Pisa", "PIS", "#1B3D8F"],
  ["ACF Fiorentina", "Fiorentina", "FIO", "#7B3FA0"],
  ["AS Roma", "Roma", "ROM", "#F0BC42"],
  ["Atalanta BC", "Atalanta", "ATA", "#1E71B8"],
  ["Bologna FC 1909", "Bologna", "BOL", "#A21C26"],
  ["Cagliari Calcio", "Cagliari", "CAG", "#C8102E"],
  ["Como 1907", "Como", "COM", "#2E5FA8"],
  ["FC Internazionale Milano", "Inter", "INT", "#1E4FBF"],
  ["Frosinone Calcio", "Frosinone", "FRO", "#F7D117"],
  ["Genoa CFC", "Genoa", "GEN", "#AD1919"],
  ["Hellas Verona FC", "Verona", "VER", "#F5D130"],
  ["Juventus FC", "Juventus", "JUV", "#EDEDED"],
  ["Parma Calcio 1913", "Parma", "PAR", "#F6D12B"],
  ["SS Lazio", "Lazio", "LAZ", "#87D8F7"],
  ["SSC Napoli", "Napoli", "NAP", "#12A0D7"],
  ["Torino FC", "Torino", "TOR", "#8A1E03"],
  ["US Cremonese", "Cremonese", "CRE", "#C8102E"],
  ["US Lecce", "Lecce", "LEC", "#F5D12B"],
  ["US Sassuolo Calcio", "Sassuolo", "SAS", "#00A752"],
  ["Udinese Calcio", "Udinese", "UDI", "#D9D9D9"],
  ["Venezia FC", "Venezia", "VEN", "#F47920"],
  // France
  ["AJ Auxerre", "Auxerre", "AJA", "#3A75C4"],
  ["AS Monaco FC", "Monaco", "ASM", "#E7192E"],
  ["Angers SCO", "Angers", "SCO", "#E6E6E6"],
  ["ES Troyes AC", "Troyes", "ETR", "#2E64B3"],
  ["FC Lorient", "Lorient", "FCL", "#F58113"],
  ["FC Metz", "Metz", "FCM", "#A6192E"],
  ["FC Nantes", "Nantes", "FCN", "#FCD405"],
  ["Le Havre AC", "Le Havre", "HAC", "#5EA4DB"],
  ["Le Mans FC", "Le Mans", "LMF", "#E30613"],
  ["Lille OSC", "Lille", "LIL", "#E01E13"],
  ["OGC Nice", "Nice", "NIC", "#D2001F"],
  ["Olympique Lyonnais", "Lyon", "OL", "#DA0812"],
  ["Olympique de Marseille", "Marseille", "OM", "#2FAEE0"],
  ["Paris FC", "Paris FC", "PFC", "#2B4A8F"],
  ["Paris Saint-Germain FC", "PSG", "PSG", "#1E5BC6"],
  ["RC Strasbourg Alsace", "Strasbourg", "RCS", "#009FE3"],
  ["Racing Club de Lens", "Lens", "RCL", "#FFD200"],
  ["Stade Brestois 29", "Brest", "SB29", "#E2001A"],
  ["Stade Rennais FC 1901", "Rennes", "SRFC", "#E13327"],
  ["Toulouse FC", "Toulouse", "TFC", "#6B3FA0"],
];

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const BY_NAME = new Map<string, TeamIdentity>();
const BY_SLUG = new Map<string, TeamIdentity>();

for (const [name, short, abbr, color] of ENTRIES) {
  const t: TeamIdentity = { slug: slugify(short), name, short, abbr, color };
  BY_NAME.set(name, t);
  BY_SLUG.set(t.slug, t);
}

function hashHue(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

/** Resolve a provider team name to a stable identity; unknown names get a deterministic fallback. */
export function teamIdentity(name: string): TeamIdentity {
  const known = BY_NAME.get(name);
  if (known) return known;
  const stripped = name
    .replace(/\b(FC|AFC|CF|SC|AC|SS|SSC|US|RC|RCD|CA|UD|OSC|BC|1\.|\d{4})\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const short = stripped || name;
  const t: TeamIdentity = {
    slug: slugify(short),
    name,
    short,
    abbr: short.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase(),
    color: `hsl(${hashHue(name)} 65% 55%)`,
  };
  BY_NAME.set(name, t);
  BY_SLUG.set(t.slug, t);
  return t;
}

export function teamBySlug(slug: string): TeamIdentity | undefined {
  return BY_SLUG.get(slug);
}

export const ALL_TEAMS = () => [...BY_SLUG.values()];
