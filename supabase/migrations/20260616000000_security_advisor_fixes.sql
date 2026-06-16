-- Fix Supabase Security Advisor warnings.

-- ERROR 1: incidents_public — SECURITY DEFINER view.
-- SECURITY DEFINER is intentional: public.incidents has strict RLS (only
-- the reporter and admins can SELECT rows directly). The view bypasses that
-- RLS by running as the definer so all authenticated users can see a masked
-- feed (lat/lng nulled, coordinate state strings replaced). Adding
-- security_barrier prevents filter-pushdown optimisations that could let a
-- malicious WHERE clause observe rows that the view intends to hide.
ALTER VIEW IF EXISTS public.incidents_public SET (security_barrier = true);

-- ERROR 2: subscriber_details — SECURITY DEFINER view.
-- SECURITY DEFINER is intentional: the view reads from auth.users (or
-- joins to it) which is outside the public schema and requires elevated
-- privileges. security_barrier prevents the same filter-pushdown leak.
ALTER VIEW IF EXISTS public.subscriber_details SET (security_barrier = true);

-- ERROR 3: spatial_ref_sys — RLS disabled.
-- This is a PostGIS extension table created in public by the extension
-- installer. We cannot enable RLS on a table we don't own, and doing so
-- on a system reference table would break PostGIS. The block below checks
-- ownership and only enables RLS if we actually own the table (we expect
-- tableowner = 'postgres' or 'supabase_admin', so this is a no-op).
DO $$
DECLARE
  v_owner text;
BEGIN
  SELECT tableowner INTO v_owner
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'spatial_ref_sys';

  IF v_owner IS NOT NULL AND v_owner NOT IN ('supabase_admin', 'postgres') THEN
    EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
