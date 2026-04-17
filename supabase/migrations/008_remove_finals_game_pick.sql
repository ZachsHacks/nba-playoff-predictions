-- 008: Remove the unused Finals game-by-game pick feature.
-- We drop the keys from all existing leagues and update the JSONB default.
-- The game_predictions table is left in place (no data anywhere) in case we
-- ever bring the feature back.

update public.leagues
set settings = jsonb_build_object(
  'scoring', (settings->'scoring') - 'finals_game_pick',
  'features', (settings->'features') - 'finals_game_predictions'
) || (settings - 'scoring' - 'features');

alter table public.leagues alter column settings set default '{
  "scoring": {
    "rounds": {
      "1": { "series_winner": 10, "series_score_bonus": 5 },
      "2": { "series_winner": 20, "series_score_bonus": 10 },
      "3": { "series_winner": 30, "series_score_bonus": 15 },
      "4": { "series_winner": 40, "series_score_bonus": 20 }
    },
    "conference_champion": 25,
    "nba_champion": 50,
    "finals_mvp": 15
  },
  "features": {
    "conference_champions": true,
    "nba_champion": true,
    "finals_mvp": true
  }
}'::jsonb;
