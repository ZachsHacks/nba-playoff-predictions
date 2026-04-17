export type RoundScoring = {
  series_winner: number;
  series_score_bonus: number;
};

export type RoundNumber = 1 | 2 | 3 | 4;

export const ROUND_LABELS: Record<RoundNumber, string> = {
  1: "First Round",
  2: "Conference Semifinals",
  3: "Conference Finals",
  4: "NBA Finals",
};

export type LeagueSettings = {
  scoring: {
    rounds: Record<RoundNumber, RoundScoring>;
    conference_champion: number;
    finals_mvp: number;
    finals_game_pick: number;
  };
  features: {
    conference_champions: boolean;
    finals_mvp: boolean;
    finals_game_predictions: boolean;
  };
};

export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  scoring: {
    rounds: {
      1: { series_winner: 10, series_score_bonus: 5 },
      2: { series_winner: 20, series_score_bonus: 10 },
      3: { series_winner: 30, series_score_bonus: 15 },
      4: { series_winner: 40, series_score_bonus: 20 },
    },
    conference_champion: 25,
    finals_mvp: 15,
    finals_game_pick: 5,
  },
  features: {
    conference_champions: true,
    finals_mvp: true,
    finals_game_predictions: true,
  },
};

export type Profile = {
  id: string;
  display_name: string;
  created_at: string;
};

export type League = {
  id: string;
  name: string;
  invite_code: string;
  commissioner_id: string;
  settings: LeagueSettings;
  created_at: string;
};

export type LeagueMember = {
  league_id: string;
  user_id: string;
  total_score: number;
  joined_at: string;
  profiles?: Profile;
};

export type Series = {
  id: string;
  round: number;
  conference: "East" | "West" | "Finals";
  team_a: string;
  team_b: string;
  series_start_time: string | null;
  status: "upcoming" | "active" | "complete";
  winner: string | null;
  final_score: string | null;
  finals_mvp: string | null;
  external_id: string | null;
  created_at: string;
};

export type Prediction = {
  id: string;
  user_id: string;
  league_id: string;
  series_id: string;
  predicted_winner: string;
  predicted_score: string;
  created_at: string;
  updated_at: string;
};

export type PrePlayoffPrediction = {
  id: string;
  user_id: string;
  league_id: string;
  conference_champion_east: string | null;
  conference_champion_west: string | null;
  nba_champion: string;
  finals_mvp: string | null;
  created_at: string;
  updated_at: string;
};

export type GamePrediction = {
  id: string;
  user_id: string;
  league_id: string;
  series_id: string;
  game_number: number;
  predicted_winner: string;
  game_start_time: string | null;
  created_at: string;
};

export type SeriesScore = "4-0" | "4-1" | "4-2" | "4-3";
