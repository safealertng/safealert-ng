-- Fix 1: "Total Users" stat shows 0 on the Admin Dashboard.
-- public.admin_users is a security_invoker view over auth.users, but the
-- authenticated/anon roles have no grants on auth.users — so the dashboard's
-- query fails and silently returns no rows. Replace with a SECURITY DEFINER
-- RPC, gated to admins, mirroring get_subscribers_with_email().
create or replace function public.get_all_users()
returns table (
  id uuid,
  user_id uuid,
  email text,
  created_at timestamptz,
  raw_user_meta_data jsonb,
  full_name text,
  state text,
  banned_until timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.id as user_id,
    u.email,
    u.created_at,
    u.raw_user_meta_data,
    u.raw_user_meta_data->>'full_name' as full_name,
    u.raw_user_meta_data->>'state' as state,
    u.banned_until
  from auth.users u
  where exists (select 1 from public.admin_roles where user_id = auth.uid())
  order by u.created_at desc;
$$;

grant execute on function public.get_all_users() to authenticated;

-- Fix 2: duplicate Freemium rows in user_subscriptions causing the same
-- user to appear multiple times in Manage Subscribers. Caused by a race
-- in the Subscription Plans screen creating more than one "active" row
-- per user. Keep the earliest row per user, drop the rest, then enforce
-- the invariant going forward.
delete from public.user_subscriptions a
using public.user_subscriptions b
where a.user_id = b.user_id
  and a.status = 'active'
  and b.status = 'active'
  and a.created_at > b.created_at;

create unique index if not exists user_subscriptions_one_active_per_user
  on public.user_subscriptions (user_id)
  where status = 'active';
