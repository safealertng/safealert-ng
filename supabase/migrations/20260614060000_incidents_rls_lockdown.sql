-- Close the privacy gap on public.incidents: the table currently grants
-- SELECT to every authenticated user ("Authenticated users can read
-- incidents", qual = auth.role() = 'authenticated'), so anyone can bypass
-- the incidents_public masking view — and Supabase Realtime, which enforces
-- this same policy for postgres_changes — to read real lat/lng/state for
-- every incident, including panic-video broadcasts from other users.
--
-- Lock SELECT down to the reporter and admins. incidents_public (defined
-- without security_invoker, so it runs with the view-owner's privileges and
-- bypasses this RLS by design) remains the only masked read path for
-- everyone else, and keeps working unchanged.

drop policy if exists "Authenticated users can read incidents" on public.incidents;

create policy "Reporter and admins can read incidents"
  on public.incidents for select
  using (
    auth.uid() = reporter_id
    or exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid())
  );

-- The admin dashboard updates status on incidents reported by other users.
-- The only existing UPDATE policy was reporter-only, so admins need their
-- own grant here too.
drop policy if exists "Admins can update any incident" on public.incidents;

create policy "Admins can update any incident"
  on public.incidents for update
  using (exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- incident_broadcasts: pre-masked realtime mirror
--
-- With public.incidents locked down, non-reporter/non-admin clients no
-- longer receive postgres_changes events for it at all (Realtime enforces
-- the same RLS). But Realtime's postgres_changes can only target real
-- tables, not views, so incidents_public can't fill that gap directly.
-- This table is a trigger-populated mirror containing only pre-masked
-- columns (no lat/lng, coordinate-pair state strings replaced), so it's
-- safe to expose to every authenticated user for "new incident" feeds.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.incident_broadcasts (
  id uuid primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  description text,
  status text not null,
  video_url text,
  state text,
  created_at timestamptz not null default now()
);

alter table public.incident_broadcasts enable row level security;

revoke all on public.incident_broadcasts from anon, authenticated;
grant select on public.incident_broadcasts to authenticated;

drop policy if exists "Authenticated users can read incident broadcasts" on public.incident_broadcasts;
create policy "Authenticated users can read incident broadcasts"
  on public.incident_broadcasts for select
  to authenticated
  using (true);

create or replace function public.fn_broadcast_incident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.incident_broadcasts (id, reporter_id, type, description, status, video_url, state, created_at)
  values (
    new.id,
    new.reporter_id,
    new.type::text,
    new.description,
    new.status::text,
    new.video_url,
    case when new.state ~ '^-?\d+\.\d+,\s*-?\d+\.\d+$' then 'Unknown location' else new.state end,
    new.created_at
  );
  return new;
end;
$$;

drop trigger if exists trg_broadcast_incident on public.incidents;
create trigger trg_broadcast_incident
  after insert on public.incidents
  for each row execute function public.fn_broadcast_incident();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'incident_broadcasts'
  ) then
    alter publication supabase_realtime add table public.incident_broadcasts;
  end if;
end $$;
