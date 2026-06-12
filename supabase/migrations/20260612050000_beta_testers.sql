-- Beta Testing signup on the landing page. Capped at 100 spots with an
-- auto-assigned spot_number. All access goes through security-definer
-- functions so anonymous visitors can sign up, see the live "X / 100"
-- count, and look up their own spot by email without reading other
-- testers' data.

create sequence if not exists public.beta_testers_spot_seq;

create table if not exists public.beta_testers (
  id uuid primary key default gen_random_uuid(),
  spot_number integer not null default nextval('public.beta_testers_spot_seq'),
  name text not null,
  email text not null unique,
  state text not null,
  phone text not null,
  why text,
  created_at timestamptz not null default now()
);

alter sequence public.beta_testers_spot_seq owned by public.beta_testers.spot_number;

alter table public.beta_testers enable row level security;

-- Live "X / 100 spots taken" counter.
create or replace function public.get_beta_signup_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer from public.beta_testers;
$$;

grant execute on function public.get_beta_signup_count() to anon, authenticated;

-- Sign up for the beta. If the email is already registered, just return
-- their existing spot (no duplicate row). If the beta is full and this is
-- a new email, raises 'BETA_FULL'.
create or replace function public.signup_beta_tester(
  p_name text, p_email text, p_state text, p_phone text, p_why text
)
returns table (spot_number integer, already_registered boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_spot integer;
begin
  select bt.spot_number into v_spot from public.beta_testers bt where bt.email = v_email;
  if v_spot is not null then
    return query select v_spot, true;
    return;
  end if;

  if (select count(*) from public.beta_testers) >= 100 then
    raise exception 'BETA_FULL';
  end if;

  insert into public.beta_testers (name, email, state, phone, why)
  values (trim(p_name), v_email, p_state, trim(p_phone), p_why)
  returning beta_testers.spot_number into v_spot;

  return query select v_spot, false;
end;
$$;

grant execute on function public.signup_beta_tester(text, text, text, text, text) to anon, authenticated;
