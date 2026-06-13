-- Safe Convoy revamp: real-time convoy tracking, group chat, stop-vehicle
-- alerts and dynamic danger routes.

-- ─────────────────────────────────────────────────────────────────────────
-- CLEANUP: drop stale tables left behind by an earlier failed run of this
-- migration (created with an older draft schema, e.g. missing is_leader /
-- created_at). This feature has never been wired up, so no real data exists.
-- ─────────────────────────────────────────────────────────────────────────

drop table if exists public.convoy_messages cascade;
drop table if exists public.convoy_events cascade;
drop table if exists public.danger_route_confirmations cascade;
drop table if exists public.danger_routes cascade;
drop table if exists public.convoy_members cascade;
drop table if exists public.convoys cascade;

-- ─────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.convoys (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  destination text not null,
  route text not null,
  leader_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  pin text,
  has_pin boolean generated always as (pin is not null) stored,
  route_distance_km numeric,
  start_lat double precision,
  start_lng double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_convoys_leader on public.convoys (leader_id);

create table if not exists public.convoy_members (
  id uuid primary key default gen_random_uuid(),
  convoy_id uuid not null references public.convoys(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  vehicle_type text,
  vehicle_color text,
  plate_number text,
  avatar_url text,
  lat double precision,
  lng double precision,
  speed double precision not null default 0,
  heading double precision,
  status text not null default 'moving' check (status in ('moving','warning','stopped','offline')),
  stopped_since timestamptz,
  is_leader boolean not null default false,
  joined_at timestamptz not null default now(),
  last_updated timestamptz not null default now(),
  unique (convoy_id, user_id)
);

create index if not exists idx_convoy_members_convoy on public.convoy_members (convoy_id);
create index if not exists idx_convoy_members_user on public.convoy_members (user_id);

create table if not exists public.convoy_messages (
  id uuid primary key default gen_random_uuid(),
  convoy_id uuid not null references public.convoys(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  message text not null,
  message_type text not null default 'user' check (message_type in ('user','system')),
  created_at timestamptz not null default now()
);

create index if not exists idx_convoy_messages_convoy on public.convoy_messages (convoy_id, created_at);

create table if not exists public.convoy_events (
  id uuid primary key default gen_random_uuid(),
  convoy_id uuid not null references public.convoys(id) on delete cascade,
  member_id uuid references public.convoy_members(id) on delete set null,
  event_type text not null check (event_type in ('joined','stopped','resumed','distress','distress_cancelled')),
  location_lat double precision,
  location_lng double precision,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_convoy_events_convoy on public.convoy_events (convoy_id, created_at);

create table if not exists public.danger_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  state text,
  risk_level text not null check (risk_level in ('HIGH','MEDIUM','LOW')),
  incident_count integer not null default 0,
  last_incident_at timestamptz,
  lat double precision,
  lng double precision,
  confirmations_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.danger_route_confirmations (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.danger_routes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (route_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- HELPER: membership check (security definer to avoid RLS self-recursion)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.is_convoy_member(p_convoy_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1 from public.convoy_members cm
    where cm.convoy_id = p_convoy_id and cm.user_id = auth.uid()
  );
$$;

grant execute on function public.is_convoy_member(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────

alter table public.convoys enable row level security;
alter table public.convoy_members enable row level security;
alter table public.convoy_messages enable row level security;
alter table public.convoy_events enable row level security;
alter table public.danger_routes enable row level security;
alter table public.danger_route_confirmations enable row level security;

drop policy if exists "Members and leader can view convoy" on public.convoys;
create policy "Members and leader can view convoy"
  on public.convoys for select
  using (leader_id = auth.uid() or public.is_convoy_member(id));

drop policy if exists "Leader can update convoy" on public.convoys;
create policy "Leader can update convoy"
  on public.convoys for update
  using (leader_id = auth.uid());

drop policy if exists "Members can view convoy roster" on public.convoy_members;
create policy "Members can view convoy roster"
  on public.convoy_members for select
  using (public.is_convoy_member(convoy_id));

drop policy if exists "Members can update own roster row" on public.convoy_members;
create policy "Members can update own roster row"
  on public.convoy_members for update
  using (user_id = auth.uid());

drop policy if exists "Members can view convoy messages" on public.convoy_messages;
create policy "Members can view convoy messages"
  on public.convoy_messages for select
  using (public.is_convoy_member(convoy_id));

drop policy if exists "Members can send convoy messages" on public.convoy_messages;
create policy "Members can send convoy messages"
  on public.convoy_messages for insert
  with check (public.is_convoy_member(convoy_id) and (user_id = auth.uid() or user_id is null));

drop policy if exists "Members can view convoy events" on public.convoy_events;
create policy "Members can view convoy events"
  on public.convoy_events for select
  using (public.is_convoy_member(convoy_id));

drop policy if exists "Members can log own convoy events" on public.convoy_events;
create policy "Members can log own convoy events"
  on public.convoy_events for insert
  with check (
    public.is_convoy_member(convoy_id)
    and exists (
      select 1 from public.convoy_members cm
      where cm.id = member_id and cm.user_id = auth.uid() and cm.convoy_id = convoy_events.convoy_id
    )
  );

drop policy if exists "Anyone authenticated can view danger routes" on public.danger_routes;
create policy "Anyone authenticated can view danger routes"
  on public.danger_routes for select
  to authenticated
  using (true);

drop policy if exists "Users can view own route confirmations" on public.danger_route_confirmations;
create policy "Users can view own route confirmations"
  on public.danger_route_confirmations for select
  using (user_id = auth.uid());

drop policy if exists "Users can confirm a route" on public.danger_route_confirmations;
create policy "Users can confirm a route"
  on public.danger_route_confirmations for insert
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- RPCs
-- ─────────────────────────────────────────────────────────────────────────

-- Create a new convoy and add the caller as its leader.
create or replace function public.create_convoy(
  p_destination text,
  p_route text,
  p_pin text,
  p_vehicle_type text,
  p_vehicle_color text,
  p_plate_number text,
  p_lat double precision,
  p_lng double precision,
  p_route_distance_km numeric,
  p_name text,
  p_avatar_url text
)
returns public.convoys
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_pin text;
  v_convoy public.convoys;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_pin := nullif(trim(coalesce(p_pin, '')), '');

  loop
    v_code := 'NGS-' || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from public.convoys where code = v_code);
  end loop;

  insert into public.convoys (code, destination, route, leader_id, pin, route_distance_km, start_lat, start_lng)
  values (v_code, p_destination, p_route, v_uid, v_pin, p_route_distance_km, p_lat, p_lng)
  returning * into v_convoy;

  insert into public.convoy_members
    (convoy_id, user_id, name, vehicle_type, vehicle_color, plate_number, avatar_url, lat, lng, status, is_leader, last_updated)
  values
    (v_convoy.id, v_uid, coalesce(p_name, 'Convoy Leader'), p_vehicle_type, p_vehicle_color, upper(p_plate_number), p_avatar_url, p_lat, p_lng, 'moving', true, now());

  return v_convoy;
end;
$$;

grant execute on function public.create_convoy(text, text, text, text, text, text, double precision, double precision, numeric, text, text) to authenticated;

-- Join an existing active convoy by its code (and PIN if private).
create or replace function public.join_convoy(
  p_code text,
  p_pin text,
  p_vehicle_type text,
  p_vehicle_color text,
  p_plate_number text,
  p_name text,
  p_avatar_url text,
  p_lat double precision,
  p_lng double precision
)
returns public.convoys
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_convoy public.convoys;
  v_member_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_convoy from public.convoys where upper(code) = upper(trim(p_code));

  if v_convoy.id is null then
    raise exception 'Convoy not found — check the code and try again';
  end if;

  if v_convoy.status <> 'active' then
    raise exception 'This convoy has ended';
  end if;

  if v_convoy.has_pin and (p_pin is null or trim(p_pin) <> v_convoy.pin) then
    raise exception 'Incorrect PIN for this convoy';
  end if;

  insert into public.convoy_members
    (convoy_id, user_id, name, vehicle_type, vehicle_color, plate_number, avatar_url, lat, lng, status, stopped_since, is_leader, last_updated)
  values
    (v_convoy.id, v_uid, coalesce(p_name, 'Member'), p_vehicle_type, p_vehicle_color, upper(p_plate_number), p_avatar_url, p_lat, p_lng, 'moving', null, false, now())
  on conflict (convoy_id, user_id) do update
    set vehicle_type = excluded.vehicle_type,
        vehicle_color = excluded.vehicle_color,
        plate_number = excluded.plate_number,
        avatar_url = excluded.avatar_url,
        lat = excluded.lat,
        lng = excluded.lng,
        status = 'moving',
        stopped_since = null,
        last_updated = now()
  returning id into v_member_id;

  insert into public.convoy_messages (convoy_id, user_id, sender_name, message, message_type)
  values (v_convoy.id, null, 'System', coalesce(p_name, 'A member') || ' joined the convoy', 'system');

  insert into public.convoy_events (convoy_id, member_id, event_type, location_lat, location_lng, description)
  values (v_convoy.id, v_member_id, 'joined', p_lat, p_lng, coalesce(p_name, 'A member') || ' joined the convoy');

  return v_convoy;
end;
$$;

grant execute on function public.join_convoy(text, text, text, text, text, text, text, double precision, double precision) to authenticated;

-- List active convoys the caller hasn't joined yet, optionally filtered by
-- route text and sorted/annotated by distance from a given point.
create or replace function public.get_active_convoys(
  p_route text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (
  id uuid,
  code text,
  destination text,
  route text,
  has_pin boolean,
  member_count integer,
  leader_lat double precision,
  leader_lng double precision,
  distance_km double precision,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public, auth
as $$
  select
    c.id,
    c.code,
    c.destination,
    c.route,
    c.has_pin,
    (select count(*)::int from public.convoy_members cm where cm.convoy_id = c.id) as member_count,
    lead.lat as leader_lat,
    lead.lng as leader_lng,
    case
      when p_lat is not null and p_lng is not null and lead.lat is not null and lead.lng is not null
      then 2 * 6371 * asin(sqrt(
        sin(radians((lead.lat - p_lat) / 2)) ^ 2 +
        cos(radians(p_lat)) * cos(radians(lead.lat)) * sin(radians((lead.lng - p_lng) / 2)) ^ 2
      ))
      else null
    end as distance_km,
    c.created_at
  from public.convoys c
  left join public.convoy_members lead on lead.convoy_id = c.id and lead.is_leader = true
  where c.status = 'active'
    and (p_route is null or trim(p_route) = '' or c.route ilike '%' || trim(p_route) || '%')
    and not exists (
      select 1 from public.convoy_members me where me.convoy_id = c.id and me.user_id = auth.uid()
    )
  order by c.created_at desc
  limit 20;
$$;

grant execute on function public.get_active_convoys(text, double precision, double precision) to authenticated;

-- Persist the caller's latest GPS sample for their own convoy_members row.
-- p_status is computed client-side ('moving' | 'warning' | 'stopped').
create or replace function public.update_convoy_member_location(
  p_convoy_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_speed double precision,
  p_heading double precision,
  p_status text
)
returns void
language sql
security definer
set search_path = public, auth
as $$
  update public.convoy_members
  set lat = p_lat,
      lng = p_lng,
      speed = p_speed,
      heading = p_heading,
      last_updated = now(),
      status = coalesce(p_status, status),
      stopped_since = case
        when p_status = 'stopped' and stopped_since is null then now()
        when p_status <> 'stopped' then null
        else stopped_since
      end
  where convoy_id = p_convoy_id and user_id = auth.uid();
$$;

grant execute on function public.update_convoy_member_location(uuid, double precision, double precision, double precision, double precision, text) to authenticated;

-- Log a convoy_events row for the caller's own member row (stopped, resumed,
-- distress, distress_cancelled).
create or replace function public.log_convoy_event(
  p_convoy_id uuid,
  p_event_type text,
  p_lat double precision,
  p_lng double precision,
  p_description text
)
returns public.convoy_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_member_id uuid;
  v_event public.convoy_events;
begin
  select id into v_member_id from public.convoy_members
  where convoy_id = p_convoy_id and user_id = auth.uid();

  if v_member_id is null then
    raise exception 'Not a member of this convoy';
  end if;

  insert into public.convoy_events (convoy_id, member_id, event_type, location_lat, location_lng, description)
  values (p_convoy_id, v_member_id, p_event_type, p_lat, p_lng, p_description)
  returning * into v_event;

  return v_event;
end;
$$;

grant execute on function public.log_convoy_event(uuid, text, double precision, double precision, text) to authenticated;

-- Record (or no-op if already done) the caller's "this route is dangerous"
-- confirmation, bumping the route's confirmations_count once per user.
create or replace function public.confirm_danger_route(p_route_id uuid)
returns public.danger_routes
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_route public.danger_routes;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.danger_route_confirmations (route_id, user_id)
  values (p_route_id, v_uid)
  on conflict (route_id, user_id) do nothing;

  if found then
    update public.danger_routes
    set confirmations_count = confirmations_count + 1
    where id = p_route_id
    returning * into v_route;
  else
    select * into v_route from public.danger_routes where id = p_route_id;
  end if;

  return v_route;
end;
$$;

grant execute on function public.confirm_danger_route(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.convoy_members;
alter publication supabase_realtime add table public.convoy_messages;
alter publication supabase_realtime add table public.convoy_events;

-- ─────────────────────────────────────────────────────────────────────────
-- SEED DATA — known Nigerian danger routes
-- ─────────────────────────────────────────────────────────────────────────

insert into public.danger_routes (name, state, risk_level, incident_count, last_incident_at, lat, lng) values
  ('Kaduna–Abuja Expressway', 'Kaduna', 'HIGH', 12, now() - interval '2 hours', 9.79, 7.41),
  ('Lokoja–Abuja Road', 'Kogi', 'HIGH', 8, now() - interval '5 hours', 8.44, 7.07),
  ('Enugu–Onitsha Expressway', 'Enugu', 'MEDIUM', 4, now() - interval '1 day', 6.35, 7.15),
  ('Lagos–Ibadan Expressway', 'Lagos', 'MEDIUM', 3, now() - interval '2 days', 6.95, 3.66),
  ('Benin–Ore Road', 'Edo', 'HIGH', 9, now() - interval '3 hours', 6.54, 5.24)
on conflict (name) do nothing;
