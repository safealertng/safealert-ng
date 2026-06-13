-- Allow non-leader convoy members to remove their own roster row ("Leave Convoy").
-- Ending a convoy (leader) just flips convoys.status — already permitted by the
-- existing "Leader can update convoy" policy — so no RPC is needed for either flow.

drop policy if exists "Members can leave convoy" on public.convoy_members;
create policy "Members can leave convoy"
  on public.convoy_members for delete
  using (user_id = auth.uid() and is_leader = false);
