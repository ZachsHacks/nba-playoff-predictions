-- ==========================================================
-- 006: Add NBA champion scoring key + feature toggle, and
--      restrict picks visibility until they lock.
-- ==========================================================

-- 1. Update existing leagues' settings JSONB to include new keys
update public.leagues
set settings = settings
  || jsonb_build_object(
    'scoring',
    (settings->'scoring') || jsonb_build_object('nba_champion', 50)
  )
  || jsonb_build_object(
    'features',
    (settings->'features') || jsonb_build_object('nba_champion', true)
  )
where (settings->'scoring'->>'nba_champion') is null
   or (settings->'features'->>'nba_champion') is null;

-- 2. Update the default for new leagues
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
    "finals_mvp": 15,
    "finals_game_pick": 5
  },
  "features": {
    "conference_champions": true,
    "nba_champion": true,
    "finals_mvp": true,
    "finals_game_predictions": true
  }
}'::jsonb;

-- 3. Make nba_champion nullable (in case feature is toggled off)
alter table public.pre_playoff_predictions alter column nba_champion drop not null;

-- ==========================================================
-- 4. Pick privacy: hide others' picks until the lock passes.
-- ==========================================================

-- Predictions (series picks): own picks always, others only after
-- the series starts. series_start_time - 30 min is the lock.
drop policy if exists "Predictions are viewable by everyone" on public.predictions;
drop policy if exists "Users see own predictions" on public.predictions;
drop policy if exists "Users see others' predictions after lock" on public.predictions;

create policy "Users see own predictions"
  on public.predictions for select
  using (auth.uid() = user_id);

create policy "Users see others' predictions after series lock"
  on public.predictions for select
  using (
    exists (
      select 1 from public.series s
      where s.id = predictions.series_id
        and s.series_start_time is not null
        and s.series_start_time - interval '30 minutes' <= now()
    )
  );

-- Game predictions: same pattern, using game_start_time
drop policy if exists "Game predictions are viewable by everyone" on public.game_predictions;
drop policy if exists "Users see own game predictions" on public.game_predictions;
drop policy if exists "Users see others' game predictions after lock" on public.game_predictions;

create policy "Users see own game predictions"
  on public.game_predictions for select
  using (auth.uid() = user_id);

create policy "Users see others' game predictions after game lock"
  on public.game_predictions for select
  using (
    game_start_time is not null
    and game_start_time - interval '30 minutes' <= now()
  );

-- Pre-playoff predictions: own always, others only after Round 1 starts
drop policy if exists "Users can read own pre-playoff predictions" on public.pre_playoff_predictions;
drop policy if exists "Users see own pre-playoff predictions" on public.pre_playoff_predictions;
drop policy if exists "Users see others' pre-playoff predictions after Round 1 starts"
  on public.pre_playoff_predictions;

create policy "Users see own pre-playoff predictions"
  on public.pre_playoff_predictions for select
  using (auth.uid() = user_id);

create policy "Users see others' pre-playoff predictions after Round 1 starts"
  on public.pre_playoff_predictions for select
  using (
    exists (
      select 1 from public.series s
      where s.round = 1
        and s.series_start_time is not null
        and s.series_start_time - interval '30 minutes' <= now()
      limit 1
    )
  );
