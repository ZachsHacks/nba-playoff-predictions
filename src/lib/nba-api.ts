// Fetches NBA postseason data from balldontlie.io.
// Docs: https://docs.balldontlie.io
// Free tier = 5 req/min which is plenty for a daily cron.

type BDLGame = {
  id: number;
  date: string;
  season: number;
  postseason: boolean;
  status: string;
  home_team: { id: number; full_name: string; abbreviation: string; conference: string };
  visitor_team: { id: number; full_name: string; abbreviation: string; conference: string };
  home_team_score: number;
  visitor_team_score: number;
};

type BDLResponse = {
  data: BDLGame[];
  meta: { next_cursor: number | null; per_page: number };
};

const API_BASE = "https://api.balldontlie.io/v1";

async function fetchBDL(endpoint: string): Promise<BDLResponse> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: process.env.NBA_API_KEY! },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BDL API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export type PlayoffSeries = {
  external_id: string;                   // `${season}-${lowTeamId}-${highTeamId}`
  round: number;                         // 1=first round, 2=semis, 3=conf finals, 4=finals
  conference: "East" | "West" | "Finals";
  team_a: string;
  team_b: string;
  team_a_wins: number;
  team_b_wins: number;
  series_start_time: string | null;
  status: "upcoming" | "active" | "complete";
  winner: string | null;
  final_score: string | null;            // e.g. "4-2"
};

export async function fetchPlayoffData(): Promise<PlayoffSeries[]> {
  // 2025-26 season starts in Oct 2025. balldontlie uses starting-year convention.
  const now = new Date();
  const season = now.getMonth() < 9 ? now.getFullYear() - 1 : now.getFullYear();

  let allGames: BDLGame[] = [];
  let cursor: number | null = null;

  do {
    const params = new URLSearchParams({
      seasons: String(season),
      postseason: "true",
      per_page: "100",
    });
    if (cursor) params.set("cursor", String(cursor));
    const response = await fetchBDL(`/games?${params}`);
    allGames = allGames.concat(response.data);
    cursor = response.meta.next_cursor;
  } while (cursor);

  if (allGames.length === 0) return [];

  const seriesMap = new Map<string, BDLGame[]>();
  for (const game of allGames) {
    const ids = [game.home_team.id, game.visitor_team.id].sort((a, b) => a - b);
    const key = `${season}-${ids[0]}-${ids[1]}`;
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key)!.push(game);
  }

  const seriesList: PlayoffSeries[] = [];
  for (const [key, games] of seriesMap) {
    games.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const firstGame = games[0];
    const teamA = firstGame.home_team;
    const teamB = firstGame.visitor_team;

    let aWins = 0;
    let bWins = 0;
    for (const g of games) {
      if (g.status !== "Final") continue;
      const homeWon = g.home_team_score > g.visitor_team_score;
      const winnerId = homeWon ? g.home_team.id : g.visitor_team.id;
      if (winnerId === teamA.id) aWins++;
      else bWins++;
    }

    const conference =
      teamA.conference === teamB.conference
        ? (teamA.conference as "East" | "West")
        : "Finals";

    let status: PlayoffSeries["status"] = "upcoming";
    if (aWins === 4 || bWins === 4) status = "complete";
    else if (games.some((g) => g.status === "Final" || g.status === "In Progress")) status = "active";

    const winner = aWins === 4 ? teamA.full_name : bWins === 4 ? teamB.full_name : null;
    const finalScore =
      status === "complete"
        ? `${Math.max(aWins, bWins)}-${Math.min(aWins, bWins)}`
        : null;

    seriesList.push({
      external_id: key,
      round: 0,
      conference,
      team_a: teamA.full_name,
      team_b: teamB.full_name,
      team_a_wins: aWins,
      team_b_wins: bWins,
      series_start_time: firstGame.date ? new Date(firstGame.date).toISOString() : null,
      status,
      winner,
      final_score: finalScore,
    });
  }

  // Round detection: chronological order within each conference.
  // First 4 series per conference = Round 1, next 2 = Semis, next 1 = Conf Finals.
  // Finals always = Round 4.
  for (const conf of ["East", "West", "Finals"] as const) {
    const confSeries = seriesList
      .filter((s) => s.conference === conf)
      .sort((a, b) => {
        const aTime = a.series_start_time ? new Date(a.series_start_time).getTime() : Infinity;
        const bTime = b.series_start_time ? new Date(b.series_start_time).getTime() : Infinity;
        return aTime - bTime;
      });

    if (conf === "Finals") {
      confSeries.forEach((s) => (s.round = 4));
    } else {
      confSeries.forEach((s, i) => {
        if (i < 4) s.round = 1;
        else if (i < 6) s.round = 2;
        else s.round = 3;
      });
    }
  }

  return seriesList;
}

export function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function teamsMatch(a: string, b: string): boolean {
  return normalizeTeamName(a) === normalizeTeamName(b);
}
