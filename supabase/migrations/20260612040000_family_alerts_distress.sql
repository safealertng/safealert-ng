-- Add a "distress" alert type (separate from a routine check-in) carrying
-- the sender's live coordinates so the recipient can be shown an emergency
-- banner with location + one-tap emergency call buttons.

alter table public.family_alerts
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Widen the existing type check constraint (auto-generated name) to allow
-- 'distress' alongside 'checkin' and 'panic'.
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.family_alerts'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%checkin%panic%';

  if cname is not null then
    execute format('alter table public.family_alerts drop constraint %I', cname);
  end if;

  execute 'alter table public.family_alerts add constraint family_alerts_type_check check (type in (''checkin'', ''panic'', ''distress''))';
end $$;

-- Re-create get_pending_family_alerts() to also return lat/lng for distress alerts.
-- Must be dropped first since the return type (OUT params) is changing.
drop function if exists public.get_pending_family_alerts();

create function public.get_pending_family_alerts()
returns table (
  id uuid,
  from_user_id uuid,
  from_name text,
  type text,
  created_at timestamptz,
  lat double precision,
  lng double precision
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
    fa.created_at,
    fa.lat,
    fa.lng
  from public.family_alerts fa
  join auth.users au on au.id = fa.from_user_id
  where fa.to_user_id = auth.uid() and fa.read_at is null
  order by fa.created_at desc;
$$;

grant execute on function public.get_pending_family_alerts() to authenticated;
