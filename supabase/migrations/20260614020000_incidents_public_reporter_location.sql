-- Let the reporter of an incident see their own exact location through
-- incidents_public, in addition to admins. Everyone else still gets
-- lat/lng = null and raw "lat, lng" strings in `state` replaced with
-- "Unknown location".
--
-- Note: the reporter column on public.incidents is `reporter_id`.

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
      and not (
        coalesce(i.reporter_id = auth.uid(), false)
        or exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid())
      )
    then 'Unknown location'
    else i.state
  end as state,
  case
    when coalesce(i.reporter_id = auth.uid(), false)
      or exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid())
    then i.lat
    else null
  end as lat,
  case
    when coalesce(i.reporter_id = auth.uid(), false)
      or exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid())
    then i.lng
    else null
  end as lng
from public.incidents i;
