-- 7-day auto-resolution timer for incidents.
--
-- Adds auto_resolve_at / resolved_by / resolution_note (resolved_at already
-- exists on incidents). A daily pg_cron job flags stale 'active' incidents
-- as 'pending_review' for admin triage, an admin-only mark_incident_resolved
-- RPC lets admins close incidents with a note, and a notification queue +
-- edge function dispatch push the reporter in both cases.

alter table public.incidents
  add column if not exists auto_resolve_at timestamptz default (now() + interval '7 days'),
  add column if not exists resolved_by uuid references auth.users(id) default null,
  add column if not exists resolution_note text default null;

-- ─────────────────────────────────────────────────────────────────────────
-- Notification queue: rows here are delivered as web-push notifications by
-- the send-incident-status-notification edge function. RLS is enabled with
-- no policies, so only the table owner (the security definer functions
-- below) and the edge function's service-role key can read/write it.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.incident_notifications (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('pending_review', 'resolved')),
  resolution_note text,
  incident_created_at timestamptz not null,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.incident_notifications enable row level security;
revoke all on public.incident_notifications from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- pg_net + edge function dispatch. send-incident-status-notification has
-- verify_jwt = false (like the other send-* functions), so no auth header
-- is needed for this server-to-server call.
-- ─────────────────────────────────────────────────────────────────────────
create extension if not exists pg_net;

create or replace function public.fn_dispatch_incident_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  select net.http_post(
    url := 'https://smrbhjfpybeqkiuutmpw.supabase.co/functions/v1/send-incident-status-notification',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Daily cron: flag stale incidents for admin review
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.fn_auto_flag_stale_incidents()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flagged int;
begin
  with stale as (
    update public.incidents
    set status = 'pending_review'
    where status = 'active'
      and auto_resolve_at <= now()
      -- "no admin followup in last 7 days": trg_incidents_updated_at bumps
      -- updated_at on every status change, so an untouched row's
      -- updated_at still equals its created_at.
      and updated_at <= now() - interval '7 days'
    returning id, reporter_id, created_at
  )
  insert into public.incident_notifications (incident_id, reporter_id, kind, incident_created_at)
  select id, reporter_id, 'pending_review', created_at
  from stale
  where reporter_id is not null;

  get diagnostics v_flagged = row_count;
  if v_flagged > 0 then
    perform public.fn_dispatch_incident_notifications();
  end if;
end;
$$;

select cron.schedule(
  'incidents-auto-resolve-daily',
  '0 0 * * *',
  $$select public.fn_auto_flag_stale_incidents();$$
);

-- ─────────────────────────────────────────────────────────────────────────
-- Admin RPC: mark an incident resolved with an optional note
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.mark_incident_resolved(p_incident_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter_id uuid;
  v_created_at timestamptz;
begin
  if not exists (select 1 from public.admin_roles where user_id = auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  end if;

  update public.incidents
  set status = 'resolved',
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution_note = p_note
  where id = p_incident_id
  returning reporter_id, created_at into v_reporter_id, v_created_at;

  if v_created_at is null then
    return jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  end if;

  if v_reporter_id is not null then
    insert into public.incident_notifications (incident_id, reporter_id, kind, resolution_note, incident_created_at)
    values (p_incident_id, v_reporter_id, 'resolved', p_note, v_created_at);
    perform public.fn_dispatch_incident_notifications();
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.mark_incident_resolved(uuid, text) to authenticated;
