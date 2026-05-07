-- ============================================================
-- RLS — Row Level Security para todas as tabelas da RunLab
-- Executa no Supabase Dashboard > SQL Editor
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
alter table profiles enable row level security;

drop policy if exists "profiles: select own" on profiles;
drop policy if exists "profiles: insert own" on profiles;
drop policy if exists "profiles: update own" on profiles;

create policy "profiles: select own" on profiles
  for select using (auth.uid() = id);

create policy "profiles: insert own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles: update own" on profiles
  for update using (auth.uid() = id);


-- ── training_plans ───────────────────────────────────────────
alter table training_plans enable row level security;

drop policy if exists "plans: select own" on training_plans;
drop policy if exists "plans: insert own" on training_plans;
drop policy if exists "plans: update own" on training_plans;
drop policy if exists "plans: delete own" on training_plans;

create policy "plans: select own" on training_plans
  for select using (auth.uid() = user_id);

create policy "plans: insert own" on training_plans
  for insert with check (auth.uid() = user_id);

create policy "plans: update own" on training_plans
  for update using (auth.uid() = user_id);

create policy "plans: delete own" on training_plans
  for delete using (auth.uid() = user_id);


-- ── workouts ─────────────────────────────────────────────────
alter table workouts enable row level security;

drop policy if exists "workouts: select own" on workouts;
drop policy if exists "workouts: insert own" on workouts;
drop policy if exists "workouts: update own" on workouts;
drop policy if exists "workouts: delete own" on workouts;

create policy "workouts: select own" on workouts
  for select using (auth.uid() = user_id);

create policy "workouts: insert own" on workouts
  for insert with check (auth.uid() = user_id);

create policy "workouts: update own" on workouts
  for update using (auth.uid() = user_id);

create policy "workouts: delete own" on workouts
  for delete using (auth.uid() = user_id);


-- ── strava_connections ───────────────────────────────────────
alter table strava_connections enable row level security;

drop policy if exists "strava: select own" on strava_connections;
drop policy if exists "strava: insert own" on strava_connections;
drop policy if exists "strava: update own" on strava_connections;
drop policy if exists "strava: delete own" on strava_connections;

create policy "strava: select own" on strava_connections
  for select using (auth.uid() = user_id);

create policy "strava: insert own" on strava_connections
  for insert with check (auth.uid() = user_id);

create policy "strava: update own" on strava_connections
  for update using (auth.uid() = user_id);

create policy "strava: delete own" on strava_connections
  for delete using (auth.uid() = user_id);


-- ── service role bypass (para Edge Functions) ────────────────
-- As Edge Functions usam SUPABASE_SERVICE_ROLE_KEY que bypassa
-- RLS automaticamente — não é necessária policy adicional.
