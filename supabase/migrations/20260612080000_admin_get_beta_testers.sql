-- Admin Dashboard "Beta Testers" tab: list all beta signups with their
-- spot number, name, email, state and signup date. Gated to admins, same
-- pattern as get_all_users().
create or replace function public.get_all_beta_testers()
returns table (
  id uuid,
  spot_number integer,
  name text,
  email text,
  state text,
  phone text,
  why text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select bt.id, bt.spot_number, bt.name, bt.email, bt.state, bt.phone, bt.why, bt.created_at
  from public.beta_testers bt
  where exists (select 1 from public.admin_roles where user_id = auth.uid())
  order by bt.spot_number asc;
$$;

grant execute on function public.get_all_beta_testers() to authenticated;
