-- 2026 NBA Playoffs First Round Matchups
-- First round starts Sunday, April 19, 2026
-- All times in UTC. ET = UTC-4 in April (EDT).
-- We use a conservative lock time (April 19 17:00 UTC = 1pm ET, earliest confirmed game)
-- so predictions for any first-round series lock Sunday 12:30pm ET.

insert into public.series (
  external_id, round, conference, team_a, team_b,
  series_start_time, status
) values
  -- Eastern Conference
  ('2026-manual-east-r1-celtics-76ers', 1, 'East', 'Boston Celtics', 'Philadelphia 76ers',
   '2026-04-19 17:00:00+00', 'upcoming'),
  ('2026-manual-east-r1-knicks-hawks', 1, 'East', 'New York Knicks', 'Atlanta Hawks',
   '2026-04-19 17:00:00+00', 'upcoming'),
  ('2026-manual-east-r1-cavs-raptors', 1, 'East', 'Cleveland Cavaliers', 'Toronto Raptors',
   '2026-04-19 17:00:00+00', 'upcoming'),
  ('2026-manual-east-r1-pistons-seed8', 1, 'East', 'Detroit Pistons', 'TBD (Play-in Winner)',
   '2026-04-19 17:00:00+00', 'upcoming'),

  -- Western Conference
  ('2026-manual-west-r1-spurs-blazers', 1, 'West', 'San Antonio Spurs', 'Portland Trail Blazers',
   '2026-04-19 17:00:00+00', 'upcoming'),
  ('2026-manual-west-r1-nuggets-wolves', 1, 'West', 'Denver Nuggets', 'Minnesota Timberwolves',
   '2026-04-19 17:00:00+00', 'upcoming'),
  ('2026-manual-west-r1-lakers-rockets', 1, 'West', 'Los Angeles Lakers', 'Houston Rockets',
   '2026-04-19 17:00:00+00', 'upcoming'),
  ('2026-manual-west-r1-thunder-seed8', 1, 'West', 'Oklahoma City Thunder', 'TBD (Play-in Winner)',
   '2026-04-19 17:00:00+00', 'upcoming')
on conflict (external_id) do update set
  team_a = excluded.team_a,
  team_b = excluded.team_b,
  series_start_time = excluded.series_start_time,
  status = excluded.status;


-- ============================================================
-- AFTER PLAY-IN FINISHES TONIGHT (Fri April 17), RUN THESE
-- UPDATES with the actual winners:
-- ============================================================
-- Eastern Conference 8-seed (Magic vs Hornets, 7:30pm ET):
--   update public.series
--   set team_b = 'Orlando Magic'  -- or 'Charlotte Hornets'
--   where external_id = '2026-manual-east-r1-pistons-seed8';
--
-- Western Conference 8-seed (Suns vs Warriors, 10pm ET):
--   update public.series
--   set team_b = 'Golden State Warriors'  -- or 'Phoenix Suns'
--   where external_id = '2026-manual-west-r1-thunder-seed8';
-- ============================================================


-- ============================================================
-- ADMIN HELPER: Update a series when games complete
-- ============================================================
-- When a series ends, run this to trigger scoring for all leagues.
-- The scoring engine runs automatically via the cron job when it
-- detects a status flip to 'complete', but you can force it by
-- updating status here:
--
--   update public.series
--   set status = 'complete',
--       winner = 'Boston Celtics',
--       final_score = '4-2'
--   where external_id = '2026-manual-east-r1-celtics-76ers';
--
-- To manually score (if cron is delayed), hit:
-- curl -H "Authorization: Bearer <CRON_SECRET>" \
--   https://nba-playoff-predictions-zeta.vercel.app/api/cron/update-nba
-- ============================================================
