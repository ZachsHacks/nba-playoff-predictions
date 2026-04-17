-- Let commissioners delete their own leagues.
-- ON DELETE CASCADE on league_members/predictions/pre_playoff_predictions/game_predictions
-- means all related data is cleaned up automatically.

create policy "Commissioners can delete their leagues"
  on public.leagues for delete
  using (auth.uid() = commissioner_id);
