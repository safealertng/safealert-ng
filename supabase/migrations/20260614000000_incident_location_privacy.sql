-- Hide exact GPS coordinates on community incident reports from non-admin users.
--
-- Row Level Security policies are row-level (they decide which *rows* a
-- query can see), not column-level — they can't let a user read a row but
-- hide just `lat`/`lng` on it. To get that column-level masking, we expose
-- a view that nulls out `lat`/`lng` (and any raw "lat, lng" string that
-- ended up in `state`) unless the caller has a row in admin_roles.
--
-- The view is created without `security_invoker`, so it runs with the
-- definer's privileges and bypasses the underlying incidents RLS policies
-- by design — it is the masking layer itself, not a pass-through. Those
-- existing policies on public.incidents are left untouched so direct
-- access (admin dashboard, the reporter's own rows, realtime) keeps working
-- exactly as before.

create or replace view public.incidents_public as
select
  i.id,
  i.reporter_id,
  i.type,
  i.description,
  i.status,
  i.video_url,
  i.created_at,
  case
    when i.state ~ '^-?\d+\.\d+,\s*-?\d+\.\d+$'
      and not exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid())
    then 'Unknown location'
    else i.state
  end as state,
  case
    when exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid())
    then i.lat
    else null
  end as lat,
  case
    when exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid())
    then i.lng
    else null
  end as lng
from public.incidents i;

grant select on public.incidents_public to authenticated;
