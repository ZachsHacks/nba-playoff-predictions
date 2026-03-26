import { SupabaseClient } from "@supabase/supabase-js";
import type { LeagueSettings, PrePlayoffPrediction, Series } from "@/lib/types";

export async function scoreSeries(supabase: SupabaseClient, seriesId: string) {
  const { data: series } = await supabase
    .from("series")
    .select("*")
    .eq("id", seriesId)
    .single();

  if (!series || series.status !== "complete") return;

  const { data: predictions } = await supabase
    .from("predictions")
    .select("*, leagues(settings)")
    .eq("series_id", seriesId);

  if (!predictions || predictions.length === 0) return;

  const byLeague = new Map<string, typeof predictions>();
  for (const pred of predictions) {
    if (!byLeague.has(pred.league_id)) byLeague.set(pred.league_id, []);
    byLeague.get(pred.league_id)!.push(pred);
  }

  for (const [leagueId, preds] of byLeague) {
    const settings = preds[0].leagues.settings as LeagueSettings;

    for (const pred of preds) {
      let points = 0;

      if (pred.predicted_winner === series.winner) {
        points += settings.scoring.series_winner;

        if (pred.predicted_score === series.final_score) {
          points += settings.scoring.series_score_bonus;
        }
      }

      if (points > 0) {
        await supabase.rpc("increment_score", {
          p_league_id: leagueId,
          p_user_id: pred.user_id,
          p_points: points,
        });
      }
    }

    if (series.round === 3 && settings.features.conference_champions) {
      await scoreConferenceChampion(supabase, series as Series, leagueId, settings);
    }

    if (series.round === 4) {
      await scoreFinalsPredictions(supabase, series as Series, leagueId, settings);
    }
  }
}

async function scoreConferenceChampion(
  supabase: SupabaseClient,
  series: Series,
  leagueId: string,
  settings: LeagueSettings
) {
  if (!series.winner) return;

  const confField =
    series.conference === "East"
      ? "conference_champion_east"
      : "conference_champion_west";

  const { data: prePlays } = await supabase
    .from("pre_playoff_predictions")
    .select("user_id, conference_champion_east, conference_champion_west")
    .eq("league_id", leagueId)
    .returns<Pick<PrePlayoffPrediction, "user_id" | "conference_champion_east" | "conference_champion_west">[]>();

  if (!prePlays) return;

  for (const pp of prePlays) {
    const predicted = pp[confField as "conference_champion_east" | "conference_champion_west"];
    if (predicted === series.winner) {
      await supabase.rpc("increment_score", {
        p_league_id: leagueId,
        p_user_id: pp.user_id,
        p_points: settings.scoring.conference_champion,
      });
    }
  }
}

async function scoreFinalsPredictions(
  supabase: SupabaseClient,
  series: Series,
  leagueId: string,
  settings: LeagueSettings
) {
  if (!series.winner) return;

  const { data: prePlays } = await supabase
    .from("pre_playoff_predictions")
    .select("user_id, nba_champion, finals_mvp")
    .eq("league_id", leagueId);

  if (!prePlays) return;

  for (const pp of prePlays) {
    let points = 0;

    if (pp.nba_champion === series.winner) {
      points += settings.scoring.conference_champion;
    }

    if (settings.features.finals_mvp && series.finals_mvp && pp.finals_mvp === series.finals_mvp) {
      points += settings.scoring.finals_mvp;
    }

    if (points > 0) {
      await supabase.rpc("increment_score", {
        p_league_id: leagueId,
        p_user_id: pp.user_id,
        p_points: points,
      });
    }
  }

  if (settings.features.finals_game_predictions) {
    await scoreFinalsGames(supabase, series, leagueId, settings);
  }
}

async function scoreFinalsGames(
  supabase: SupabaseClient,
  series: Series,
  leagueId: string,
  settings: LeagueSettings
) {
  const { data: gamePreds } = await supabase
    .from("game_predictions")
    .select("*")
    .eq("league_id", leagueId)
    .eq("series_id", series.id);

  if (!gamePreds || gamePreds.length === 0) return;

  // Finals game-by-game scoring requires individual game results
  // For MVP, this is a placeholder -- game results would need to be stored
  // in a separate games table or derived from the NBA API data
  console.log(`Finals game scoring for league ${leagueId}: ${gamePreds.length} predictions found (scoring deferred)`);
}
