-- App-based family connection system: search for SafeAlertNG users by
-- email or name, send a family request, and on acceptance both users are
-- linked to each other in family_members (member_user_id-based, the same
-- field shake-to-SOS already targets).

create table if not exists public.family_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint family_requests_no_self check (from_user_id <> to_user_id)
);

create index if not exists idx_family_requests_to on public.family_requests (to_user_id);
create index if not exists idx_family_requests_from on public.family_requests (from_user_id);

create unique index if not exists family_requests_one_pending
  on public.family_requests (from_user_id, to_user_id)
  where status = 'pending';

alter table public.family_requests enable row level security;

drop policy if exists "Participants can view their requests" on public.family_requests;
create policy "Participants can view their requests"
  on public.family_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "Sender can cancel pending request" on public.family_requests;
create policy "Sender can cancel pending request"
  on public.family_requests for delete
  using (auth.uid() = from_user_id and status = 'pending');

-- Prevent duplicate mutual links once connections start being created.
create unique index if not exists family_members_owner_member_unique
  on public.family_members (owner_id, member_user_id)
  where member_user_id is not null;

-- Look up other SafeAlertNG users by exact email or partial name match.
create or replace function public.search_safealert_users(p_query text)
returns table (
  id uuid,
  full_name text,
  email text,
  state text,
  connection_status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_query text := trim(coalesce(p_query, ''));
begin
  if v_uid is null or length(v_query) < 2 then
    return;
  end if;

  return query
  select
    au.id,
    au.raw_user_meta_data->>'full_name' as full_name,
    au.email::text as email,
    au.raw_user_meta_data->>'state' as state,
    case
      when exists (select 1 from public.family_members fm where fm.owner_id = v_uid and fm.member_user_id = au.id) then 'connected'
      when exists (select 1 from public.family_requests fr where fr.from_user_id = v_uid and fr.to_user_id = au.id and fr.status = 'pending') then 'pending_sent'
      when exists (select 1 from public.family_requests fr where fr.from_user_id = au.id and fr.to_user_id = v_uid and fr.status = 'pending') then 'pending_received'
      else 'none'
    end as connection_status
  from auth.users au
  where au.id <> v_uid
    and au.deleted_at is null
    and (
      lower(au.email) = lower(v_query)
      or au.raw_user_meta_data->>'full_name' ilike '%' || v_query || '%'
    )
  order by au.raw_user_meta_data->>'full_name'
  limit 8;
end;
$$;

grant execute on function public.search_safealert_users(text) to authenticated;

-- Create a pending family request from the caller to another user.
create or replace function public.send_family_request(p_to_user_id uuid)
returns public.family_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.family_requests;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if v_uid = p_to_user_id then
    raise exception 'Cannot send a family request to yourself';
  end if;
  if not exists (select 1 from auth.users where id = p_to_user_id and deleted_at is null) then
    raise exception 'User not found';
  end if;
  if exists (select 1 from public.family_members where owner_id = v_uid and member_user_id = p_to_user_id) then
    raise exception 'Already connected';
  end if;
  if exists (select 1 from public.family_requests where from_user_id = p_to_user_id and to_user_id = v_uid and status = 'pending') then
    raise exception 'This user already sent you a request — check your incoming requests';
  end if;

  insert into public.family_requests (from_user_id, to_user_id, status)
  values (v_uid, p_to_user_id, 'pending')
  on conflict (from_user_id, to_user_id) where status = 'pending' do nothing
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Request already pending';
  end if;

  return v_row;
end;
$$;

grant execute on function public.send_family_request(uuid) to authenticated;

-- List pending incoming family requests for the caller, with sender info.
create or replace function public.get_pending_family_requests()
returns table (
  id uuid,
  from_user_id uuid,
  from_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    fr.id,
    fr.from_user_id,
    au.raw_user_meta_data->>'full_name' as from_name,
    fr.created_at
  from public.family_requests fr
  join auth.users au on au.id = fr.from_user_id
  where fr.to_user_id = auth.uid() and fr.status = 'pending'
  order by fr.created_at desc;
$$;

grant execute on function public.get_pending_family_requests() to authenticated;

-- Accept or decline a pending family request. On accept, both users are
-- linked to each other in family_members (mutual, app-connection based).
create or replace function public.respond_family_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.family_requests;
  v_from_name text;
  v_to_name text;
begin
  select * into v_req from public.family_requests where id = p_request_id for update;
  if v_req.id is null then
    raise exception 'Request not found';
  end if;
  if v_req.to_user_id <> v_uid then
    raise exception 'Not authorized';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'Request already resolved';
  end if;

  if p_accept then
    select raw_user_meta_data->>'full_name' into v_from_name from auth.users where id = v_req.from_user_id;
    select raw_user_meta_data->>'full_name' into v_to_name from auth.users where id = v_req.to_user_id;

    insert into public.family_members (owner_id, member_user_id, nickname, relation, status)
    values (v_req.to_user_id, v_req.from_user_id, coalesce(v_from_name, 'Family Member'), 'Family', 'offline')
    on conflict do nothing;

    insert into public.family_members (owner_id, member_user_id, nickname, relation, status)
    values (v_req.from_user_id, v_req.to_user_id, coalesce(v_to_name, 'Family Member'), 'Family', 'offline')
    on conflict do nothing;

    update public.family_requests set status = 'accepted', resolved_at = now() where id = p_request_id;
  else
    update public.family_requests set status = 'declined', resolved_at = now() where id = p_request_id;
  end if;
end;
$$;

grant execute on function public.respond_family_request(uuid, boolean) to authenticated;
