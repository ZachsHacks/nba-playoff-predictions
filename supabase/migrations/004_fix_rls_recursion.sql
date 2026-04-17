-- Fix infinite recursion on league_members RLS policy.
-- The original policy referenced league_members from inside its own using() clause,
-- which Postgres RLS treats as subject to the same RLS, causing recursion.
--
-- Predictions / game_predictions had the same pattern via join to league_members.
-- All three are now simple public-read since leagues/membership aren't sensitive
-- (the leagues table was already publicly readable).

drop policy if exists "League members are viewable by league members" on public.league_members;
drop policy if exists "Users can read predictions in their leagues" on public.predictions;
drop policy if exists "Users can read game predictions in their leagues" on public.game_predictions;

create policy "League members are viewable by everyone"
  on public.league_members for select using (true);

create policy "Predictions are viewable by everyone"
  on public.predictions for select using (true);

create policy "Game predictions are viewable by everyone"
  on public.game_predictions for select using (true);
