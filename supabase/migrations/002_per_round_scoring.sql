-- Migrate existing leagues from flat scoring to per-round scoring
-- Old structure: { scoring: { series_winner, series_score_bonus, conference_champion, finals_mvp, finals_game_pick } }
-- New structure: { scoring: { rounds: { 1: {...}, 2: {...}, 3: {...}, 4: {...} }, conference_champion, finals_mvp, finals_game_pick } }

update public.leagues
set settings = jsonb_set(
  settings,
  '{scoring}',
  jsonb_build_object(
    'rounds', jsonb_build_object(
      '1', jsonb_build_object(
        'series_winner', coalesce((settings->'scoring'->>'series_winner')::int, 10),
        'series_score_bonus', coalesce((settings->'scoring'->>'series_score_bonus')::int, 5)
      ),
      '2', jsonb_build_object(
        'series_winner', coalesce((settings->'scoring'->>'series_winner')::int, 10) * 2,
        'series_score_bonus', coalesce((settings->'scoring'->>'series_score_bonus')::int, 5) * 2
      ),
      '3', jsonb_build_object(
        'series_winner', coalesce((settings->'scoring'->>'series_winner')::int, 10) * 3,
        'series_score_bonus', coalesce((settings->'scoring'->>'series_score_bonus')::int, 5) * 3
      ),
      '4', jsonb_build_object(
        'series_winner', coalesce((settings->'scoring'->>'series_winner')::int, 10) * 4,
        'series_score_bonus', coalesce((settings->'scoring'->>'series_score_bonus')::int, 5) * 4
      )
    ),
    'conference_champion', coalesce((settings->'scoring'->>'conference_champion')::int, 25),
    'finals_mvp', coalesce((settings->'scoring'->>'finals_mvp')::int, 15),
    'finals_game_pick', coalesce((settings->'scoring'->>'finals_game_pick')::int, 5)
  )
)
where settings->'scoring'->>'series_winner' is not null
  and (settings->'scoring'->'rounds') is null;

-- Update the default for new leagues
alter table public.leagues alter column settings set default '{
  "scoring": {
    "rounds": {
      "1": { "series_winner": 10, "series_score_bonus": 5 },
      "2": { "series_winner": 20, "series_score_bonus": 10 },
      "3": { "series_winner": 30, "series_score_bonus": 15 },
      "4": { "series_winner": 40, "series_score_bonus": 20 }
    },
    "conference_champion": 25,
    "finals_mvp": 15,
    "finals_game_pick": 5
  },
  "features": {
    "conference_champions": true,
    "finals_mvp": true,
    "finals_game_predictions": true
  }
}'::jsonb;
