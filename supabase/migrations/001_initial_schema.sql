-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Leagues
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  commissioner_id uuid not null references public.profiles(id),
  settings jsonb not null default '{
    "scoring": {
      "series_winner": 10,
      "series_score_bonus": 5,
      "conference_champion": 10,
      "finals_mvp": 10,
      "finals_game_pick": 5
    },
    "features": {
      "conference_champions": true,
      "finals_mvp": true,
      "finals_game_predictions": true
    }
  }'::jsonb,
  created_at timestamptz default now()
);

-- League Members
create table public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_score int not null default 0,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

-- Series (populated by NBA data cron)
create table public.series (
  id uuid primary key default gen_random_uuid(),
  round int not null check (round between 1 and 4),
  conference text not null check (conference in ('East', 'West', 'Finals')),
  team_a text not null,
  team_b text not null,
  series_start_time timestamptz,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'complete')),
  winner text,
  final_score text,
  finals_mvp text,
  external_id text unique,
  created_at timestamptz default now()
);

-- Pre-playoff predictions
create table public.pre_playoff_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  conference_champion_east text,
  conference_champion_west text,
  nba_champion text not null,
  finals_mvp text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, league_id)
);

-- Series predictions
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  predicted_winner text not null,
  predicted_score text not null check (predicted_score in ('4-0', '4-1', '4-2', '4-3')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, league_id, series_id)
);

-- Finals game-by-game predictions
create table public.game_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  game_number int not null check (game_number between 1 and 7),
  predicted_winner text not null,
  game_start_time timestamptz,
  created_at timestamptz default now(),
  unique (user_id, league_id, series_id, game_number)
);

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.series enable row level security;
alter table public.pre_playoff_predictions enable row level security;
alter table public.predictions enable row level security;
alter table public.game_predictions enable row level security;

-- Profiles: users can read all, update own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Leagues: anyone can read, authenticated can create
create policy "Leagues are viewable by everyone" on public.leagues for select using (true);
create policy "Authenticated users can create leagues" on public.leagues for insert with check (auth.uid() = commissioner_id);
create policy "Commissioners can update their leagues" on public.leagues for update using (auth.uid() = commissioner_id);

-- League Members: members can read their league, authenticated can join
create policy "League members are viewable by league members" on public.league_members
  for select using (
    exists (select 1 from public.league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid())
  );
create policy "Authenticated users can join leagues" on public.league_members
  for insert with check (auth.uid() = user_id);

-- Series: readable by all, writable only by service role (cron)
create policy "Series are viewable by everyone" on public.series for select using (true);

-- Pre-playoff predictions: users can read own + league members, write own
create policy "Users can read own pre-playoff predictions" on public.pre_playoff_predictions
  for select using (auth.uid() = user_id);
create policy "Users can insert own pre-playoff predictions" on public.pre_playoff_predictions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own pre-playoff predictions" on public.pre_playoff_predictions
  for update using (auth.uid() = user_id);

-- Predictions: users can read league members' predictions (after lock), write own
create policy "Users can read predictions in their leagues" on public.predictions
  for select using (
    exists (select 1 from public.league_members lm where lm.league_id = predictions.league_id and lm.user_id = auth.uid())
  );
create policy "Users can insert own predictions" on public.predictions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own predictions" on public.predictions
  for update using (auth.uid() = user_id);

-- Game predictions: same pattern as predictions
create policy "Users can read game predictions in their leagues" on public.game_predictions
  for select using (
    exists (select 1 from public.league_members lm where lm.league_id = game_predictions.league_id and lm.user_id = auth.uid())
  );
create policy "Users can insert own game predictions" on public.game_predictions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own game predictions" on public.game_predictions
  for update using (auth.uid() = user_id);

-- ============ FUNCTIONS ============

create or replace function public.increment_score(
  p_league_id uuid,
  p_user_id uuid,
  p_points int
)
returns void as $$
begin
  update public.league_members
  set total_score = total_score + p_points
  where league_id = p_league_id and user_id = p_user_id;
end;
$$ language plpgsql security definer;
