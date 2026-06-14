-- incidents_public is masked (lat/lng nulled for non-admins), but it should
-- still only be reachable by logged-in users, matching the underlying
-- incidents table which anon cannot read at all. New views pick up the
-- default public-schema grant to anon — revoke it explicitly here.

revoke select on public.incidents_public from anon;
