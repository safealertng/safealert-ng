-- Daily Active Users tracking: one row per user per calendar day.
create extension if not exists pgcrypto;

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default current_date,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

create index if not exists user_activity_activity_date_idx
  on public.user_activity (activity_date);

alter table public.user_activity enable row level security;

drop policy if exists "Users can log their own activity" on public.user_activity;
create policy "Users can log their own activity"
  on public.user_activity for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own activity" on public.user_activity;
create policy "Users can update their own activity"
  on public.user_activity for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can view all activity" on public.user_activity;
create policy "Admins can view all activity"
  on public.user_activity for select
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
