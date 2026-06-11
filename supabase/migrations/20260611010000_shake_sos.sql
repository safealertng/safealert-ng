-- Shake-to-SOS: lets a user shake their phone 3x to silently alert their
-- own family tracker contacts with their live GPS location, and shake 3x
-- again to cancel.
create table if not exists public.shake_sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision,
  lng double precision,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists shake_sos_events_user_id_idx
  on public.shake_sos_events (user_id);

alter table public.shake_sos_events enable row level security;

drop policy if exists "Users manage their own shake SOS events" on public.shake_sos_events;
create policy "Users manage their own shake SOS events"
  on public.shake_sos_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can view all shake SOS events" on public.shake_sos_events;
create policy "Admins can view all shake SOS events"
  on public.shake_sos_events for select
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
