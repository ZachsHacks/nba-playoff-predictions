-- 007: Per-league team name + allow members to update their own team_name,
--      and let commissioners update invite codes (already covered by existing
--      "Commissioners can update their leagues" policy; no new policy needed).

-- 1. Add team_name column (nullable, falls back to profiles.display_name in UI)
alter table public.league_members add column if not exists team_name text;

-- 2. Allow league members to update their own row (team_name only, scores are
--    written by the cron service role so RLS doesn't apply).
--    The existing schema had no update policy for league_members.
create policy "Users can update their own membership"
  on public.league_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Add a unique constraint on (league_id, team_name) where team_name is set,
--    so two people in the same league can't pick the exact same team name.
create unique index if not exists uniq_league_team_name
  on public.league_members (league_id, team_name)
  where team_name is not null;
