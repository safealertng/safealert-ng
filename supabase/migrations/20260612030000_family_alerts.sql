-- Persisted family check-in / panic alerts. These are saved regardless of
-- whether the recipient has push notifications enabled, so they can see
-- "your family member is checking on you" the next time they open the app.

create table if not exists public.family_alerts (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'checkin' check (type in ('checkin', 'panic')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint family_alerts_no_self check (from_user_id <> to_user_id)
);

create index if not exists idx_family_alerts_to_unread
  on public.family_alerts (to_user_id)
  where read_at is null;

alter table public.family_alerts enable row level security;

drop policy if exists "Sender can create alerts" on public.family_alerts;
create policy "Sender can create alerts"
  on public.family_alerts for insert
  with check (auth.uid() = from_user_id);

drop policy if exists "Participants can view their alerts" on public.family_alerts;
create policy "Participants can view their alerts"
  on public.family_alerts for select
  using (auth.uid() = to_user_id or auth.uid() = from_user_id);

drop policy if exists "Recipient can dismiss their alerts" on public.family_alerts;
create policy "Recipient can dismiss their alerts"
  on public.family_alerts for update
  using (auth.uid() = to_user_id);

alter publication supabase_realtime add table public.family_alerts;

-- List pending (unread) alerts for the caller, with sender info.
create or replace function public.get_pending_family_alerts()
returns table (
  id uuid,
  from_user_id uuid,
  from_name text,
  type text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    fa.id,
    fa.from_user_id,
    au.raw_user_meta_data->>'full_name' as from_name,
    fa.type,
    fa.created_at
  from public.family_alerts fa
  join auth.users au on au.id = fa.from_user_id
  where fa.to_user_id = auth.uid() and fa.read_at is null
  order by fa.created_at desc;
$$;

grant execute on function public.get_pending_family_alerts() to authenticated;
