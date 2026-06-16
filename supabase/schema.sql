-- ============================================================================
-- Good Buddies Ryder Cup — Supabase provisioning (no-auth model)
-- Anyone can view and score; players/teams/matches are managed by an admin
-- (gated by an app passcode) via the service role. Run once in the SQL editor.
--
-- This script TEARS DOWN the old auth-based schema and rebuilds. Safe to run on
-- a fresh project or to migrate the earlier auth version (there is no real data
-- to preserve yet). Idempotent.
-- ============================================================================

-- ---------- Teardown (old auth-based objects) ----------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.hole_results cascade;
drop table if exists public.matches cascade;
drop table if exists public.course_holes cascade;
drop table if exists public.golf_sessions cascade;
drop table if exists public.profiles cascade;
drop table if exists public.players cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.enforce_profile_update_restrictions() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.user_in_match(integer) cascade;
drop function if exists public.recompute_match(integer) cascade;
drop function if exists public.on_hole_result_change() cascade;

-- ---------- Enums ----------
do $$ begin create type team as enum ('europe','usa'); exception when duplicate_object then null; end $$;
do $$ begin create type match_format as enum ('best_ball','scramble','singles'); exception when duplicate_object then null; end $$;
do $$ begin create type match_status as enum ('pending','active','complete'); exception when duplicate_object then null; end $$;
do $$ begin create type hole_winner as enum ('europe','usa','halved'); exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table public.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  team        team,
  handicap    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.golf_sessions (
  id              serial primary key,
  session_number  integer not null,
  format          match_format not null,
  name            text not null,
  is_active       boolean not null default false
);

create table public.course_holes (
  id            serial primary key,
  hole_number   integer not null unique,
  stroke_index  integer not null,
  par           integer not null
);

create table public.matches (
  id                serial primary key,
  session_id        integer not null references public.golf_sessions(id) on delete cascade,
  europe_player_ids uuid[] not null,
  usa_player_ids    uuid[] not null,
  status            match_status not null default 'pending',
  europe_points     numeric(3,1) not null default 0,
  usa_points        numeric(3,1) not null default 0,
  match_order       integer not null default 0
);

create table public.hole_results (
  id            serial primary key,
  match_id      integer not null references public.matches(id) on delete cascade,
  hole_number   integer not null,
  winner        hole_winner,
  europe_gross  integer[],
  usa_gross     integer[],
  updated_at    timestamptz not null default now(),
  unique (match_id, hole_number)
);

-- ---------- Match recompute (authoritative points, server-side) ----------
create or replace function public.recompute_match(p_match_id integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_europe int; v_usa int; v_played int; v_total int := 18;
  v_diff int; v_remaining int; v_lead int; v_complete boolean;
begin
  select
    count(*) filter (where winner = 'europe'),
    count(*) filter (where winner = 'usa'),
    count(*) filter (where winner is not null)
  into v_europe, v_usa, v_played
  from public.hole_results where match_id = p_match_id;

  v_diff := v_europe - v_usa;
  v_remaining := v_total - v_played;
  v_lead := abs(v_diff);
  v_complete := (v_played = v_total) or (v_lead > v_remaining);

  update public.matches set
    status = case when v_complete then 'complete'
                  when v_played > 0 then 'active'
                  else 'pending' end,
    europe_points = case when v_complete then (case when v_diff > 0 then 1 when v_diff = 0 then 0.5 else 0 end) else 0 end,
    usa_points    = case when v_complete then (case when v_diff < 0 then 1 when v_diff = 0 then 0.5 else 0 end) else 0 end
  where id = p_match_id;
end; $$;

create or replace function public.on_hole_result_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_match(coalesce(new.match_id, old.match_id));
  return null;
end; $$;

create trigger hole_results_recompute
  after insert or update or delete on public.hole_results
  for each row execute function public.on_hole_result_change();

-- ---------- Row-Level Security ----------
alter table public.players       enable row level security;
alter table public.golf_sessions enable row level security;
alter table public.course_holes  enable row level security;
alter table public.matches       enable row level security;
alter table public.hole_results  enable row level security;

-- Everyone can read everything (the whole app is public).
create policy players_select  on public.players       for select using (true);
create policy sessions_select on public.golf_sessions  for select using (true);
create policy holes_select    on public.course_holes   for select using (true);
create policy matches_select  on public.matches        for select using (true);
create policy results_select  on public.hole_results   for select using (true);

-- Anyone can score a hole (no login). No insert/update policies exist for the
-- other tables, so under RLS the anon key CANNOT modify players/teams/matches —
-- those are written only by the admin via the service role (which bypasses RLS).
create policy results_insert on public.hole_results for insert with check (true);
create policy results_update on public.hole_results for update using (true) with check (true);

-- ---------- Realtime ----------
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.hole_results;
exception when duplicate_object then null; end $$;

-- ---------- Static reference data ----------
insert into public.golf_sessions (session_number, format, name, is_active) values
  (1, 'best_ball', 'Session 1 — Best Ball', false),
  (2, 'scramble',  'Session 2 — Scramble',  false),
  (3, 'singles',   'Session 3 — Singles',   false);

-- Real course stroke index and par (updated from scorecard).
insert into public.course_holes (hole_number, stroke_index, par) values
  (1,15,5),(2,9,4),(3,13,4),(4,1,4),(5,7,3),(6,17,5),(7,11,4),(8,5,3),(9,3,4),
  (10,14,5),(11,6,4),(12,2,4),(13,18,4),(14,4,4),(15,10,3),(16,12,4),(17,16,3),(18,8,5);
