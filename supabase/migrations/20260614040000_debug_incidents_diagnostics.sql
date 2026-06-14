do $$
declare
  v_viewdef text;
  v_admin_count int;
  v_admin_row record;
  v_incident record;
  v_auth_uid uuid;
  v_is_admin boolean;
  v_lat numeric;
  v_lng numeric;
  v_state text;
  v_cols text;
begin
  -- 1. Current view definition
  select pg_get_viewdef('public.incidents_public', true) into v_viewdef;
  raise notice 'VIEWDEF: %', v_viewdef;

  -- 2. admin_roles columns
  select string_agg(column_name || ':' || data_type, ', ' order by ordinal_position)
  into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'admin_roles';
  raise notice 'ADMIN_ROLES_COLUMNS: %', v_cols;

  select count(*) into v_admin_count from public.admin_roles;
  raise notice 'ADMIN_ROLES_COUNT: %', v_admin_count;

  for v_admin_row in select * from public.admin_roles limit 3 loop
    raise notice 'ADMIN_ROW: %', v_admin_row;
  end loop;

  -- 3. incidents column types
  select string_agg(column_name || ':' || data_type, ', ' order by ordinal_position)
  into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'incidents'
    and column_name in ('reporter_id','lat','lng','state');
  raise notice 'INCIDENTS_RELEVANT_COLUMNS: %', v_cols;

  -- 4. Pick an incident with non-null lat/lng and a reporter_id
  for v_incident in
    select id, reporter_id, lat, lng, state
    from public.incidents
    where lat is not null
    limit 1
  loop
    raise notice 'INCIDENT_SAMPLE: id=% reporter_id=% lat=% lng=% state=%',
      v_incident.id, v_incident.reporter_id, v_incident.lat, v_incident.lng, v_incident.state;

    -- Simulate auth.uid() = reporter_id
    perform set_config('request.jwt.claims', json_build_object('sub', v_incident.reporter_id, 'role','authenticated')::text, true);
    v_auth_uid := auth.uid();
    raise notice 'SIMULATED_REPORTER_AUTH_UID: %', v_auth_uid;

    select ip.lat, ip.lng, ip.state into v_lat, v_lng, v_state
    from public.incidents_public ip where ip.id = v_incident.id;
    raise notice 'AS_REPORTER -> lat=% lng=% state=%', v_lat, v_lng, v_state;
  end loop;

  -- 5. Simulate auth.uid() = first admin_roles user_id
  for v_admin_row in select * from public.admin_roles limit 1 loop
    raise notice 'ADMIN_ROW_FOR_SIM: %', v_admin_row;

    perform set_config('request.jwt.claims', json_build_object('sub', v_admin_row.user_id, 'role','authenticated')::text, true);
    v_auth_uid := auth.uid();
    v_is_admin := exists (select 1 from public.admin_roles ar where ar.user_id = v_auth_uid);
    raise notice 'SIMULATED_ADMIN_AUTH_UID: % IS_ADMIN: %', v_auth_uid, v_is_admin;

    select ip.lat, ip.lng, ip.state into v_lat, v_lng, v_state
    from public.incidents_public ip
    order by ip.created_at desc
    limit 1;
    raise notice 'AS_ADMIN -> lat=% lng=% state=%', v_lat, v_lng, v_state;
  end loop;

  -- reset (transaction-local anyway)
  perform set_config('request.jwt.claims', '', true);
end $$;
