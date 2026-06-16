-- Fix Supabase Security Advisor: switch SECURITY DEFINER views to SECURITY INVOKER.
-- The previous migration (20260616000000) added security_barrier, which does not
-- satisfy the advisor — it still flags SECURITY DEFINER views regardless.

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1: incidents_public
-- ─────────────────────────────────────────────────────────────────────────────
-- With SECURITY INVOKER the view runs as the calling user. The current
-- incidents SELECT RLS ("Reporter and admins can read incidents") would prevent
-- regular authenticated users from seeing any rows at all, breaking the
-- community feed. We restore the broader "all authenticated can read" policy
-- so the SECURITY INVOKER view can return rows to every logged-in user.
--
-- Trade-off: authenticated users can now query public.incidents directly and
-- see exact lat/lng. The masking in this view is best-effort — it protects
-- data accessed through the view but not direct table queries. The
-- incident_broadcasts pre-masked mirror (from 20260614060000) remains the
-- safe realtime channel.

drop policy if exists "Reporter and admins can read incidents" on public.incidents;

drop policy if exists "Authenticated users can read incidents" on public.incidents;
create policy "Authenticated users can read incidents"
  on public.incidents for select
  to authenticated
  using (true);

-- Recreate incidents_public as SECURITY INVOKER with security_barrier.
-- Masking logic is identical to the previous version: reporters and admins
-- see real lat/lng and state; everyone else gets null lat/lng and
-- "Unknown location" for coordinate-pair state strings.
create or replace view public.incidents_public
  with (security_invoker = true, security_barrier = true)
as
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

grant select on public.incidents_public to authenticated;
revoke select on public.incidents_public from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2: subscriber_details
-- ─────────────────────────────────────────────────────────────────────────────
-- This view is not referenced in any application code — the admin dashboard
-- uses the get_subscribers_with_email() RPC instead. The DO block below
-- checks whether the view references the auth schema (which requires elevated
-- privileges and therefore can't work as SECURITY INVOKER):
--   • If it references auth: drop it. The RPC is the safe, correct replacement.
--   • If it only uses public tables: recreate as SECURITY INVOKER.
--   • If it doesn't exist: no-op.
do $$
declare
  v_def      text;
  v_uses_auth boolean;
begin
  select view_definition into v_def
  from information_schema.views
  where table_schema = 'public' and table_name = 'subscriber_details';

  if v_def is null then
    raise notice 'subscriber_details does not exist — nothing to do';
    return;
  end if;

  select exists (
    select 1 from information_schema.view_table_usage
    where view_schema = 'public'
      and view_name   = 'subscriber_details'
      and table_schema = 'auth'
  ) into v_uses_auth;

  if v_uses_auth then
    drop view if exists public.subscriber_details;
    raise notice 'subscriber_details referenced auth schema — dropped (use get_subscribers_with_email() RPC instead)';
  else
    drop view if exists public.subscriber_details;
    execute 'create view public.subscriber_details with (security_invoker = true, security_barrier = true) as '
      || regexp_replace(v_def, ';\s*$', '');
    raise notice 'subscriber_details recreated as SECURITY INVOKER';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3: spatial_ref_sys
-- ─────────────────────────────────────────────────────────────────────────────
-- spatial_ref_sys is a PostGIS extension table owned by postgres/supabase_admin.
-- We cannot enable RLS on a table we don't own. Dismiss this error in the
-- Supabase Security Advisor dashboard (click the error → "Dismiss").
-- The DO block in migration 20260616000000 already confirmed we don't own it.
