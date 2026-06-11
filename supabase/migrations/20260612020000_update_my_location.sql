-- Lets a user broadcast their current GPS coordinates to every
-- family_members row where they are the connected member (i.e. share their
-- live location with everyone who has added them as family on the app).
-- SECURITY DEFINER bypasses RLS, but the WHERE clause restricts updates to
-- rows tied to the caller's own member_user_id, so a user can only ever
-- publish their own location.
create or replace function public.update_my_location(p_lat double precision, p_lng double precision)
returns void
language sql
security definer
set search_path = public, auth
as $$
  update public.family_members
  set last_lat = p_lat, last_lng = p_lng, last_seen = now()
  where member_user_id = auth.uid();
$$;

grant execute on function public.update_my_location(double precision, double precision) to authenticated;
