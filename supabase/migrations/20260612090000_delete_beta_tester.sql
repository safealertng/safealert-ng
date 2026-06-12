-- Admin Dashboard "Beta Testers" tab: allow super admins to remove a beta
-- signup. beta_testers has RLS enabled with no policies, so deletes must
-- go through a security-definer RPC, gated to super_admin only.
create or replace function public.delete_beta_tester(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_roles where user_id = auth.uid() and role = 'super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  delete from public.beta_testers where id = p_id;
end;
$$;

grant execute on function public.delete_beta_tester(uuid) to authenticated;
