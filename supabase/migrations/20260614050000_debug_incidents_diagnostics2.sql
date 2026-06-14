do $$
declare
  v_incident record;
  v_admin_uid uuid;
  v_other_uid uuid := '00000000-0000-0000-0000-000000000001';
  v_lat double precision;
  v_lng double precision;
  v_state text;
  v_real_count int;
  v_zero_count int;
begin
  select count(*) into v_real_count from public.incidents where lat is not null and lat <> 0 and lng <> 0;
  raise notice 'INCIDENTS_WITH_REAL_COORDS: %', v_real_count;

  select count(*) into v_zero_count from public.incidents where lat = 0 and lng = 0;
  raise notice 'INCIDENTS_WITH_ZERO_COORDS: %', v_zero_count;

  select user_id into v_admin_uid from public.admin_roles limit 1;
  raise notice 'USING_ADMIN_UID: %', v_admin_uid;

  for v_incident in
    select id, reporter_id, lat, lng, state
    from public.incidents
    where lat is not null and lat <> 0 and lng <> 0
    order by created_at desc
    limit 3
  loop
    raise notice '--- INCIDENT % (reporter=%) real lat=% lng=% state=% ---', v_incident.id, v_incident.reporter_id, v_incident.lat, v_incident.lng, v_incident.state;

    perform set_config('request.jwt.claims', json_build_object('sub', v_admin_uid, 'role','authenticated')::text, true);
    select ip.lat, ip.lng, ip.state into v_lat, v_lng, v_state from public.incidents_public ip where ip.id = v_incident.id;
    raise notice '  AS_ADMIN -> lat=% lng=% state=%', v_lat, v_lng, v_state;

    perform set_config('request.jwt.claims', json_build_object('sub', v_incident.reporter_id, 'role','authenticated')::text, true);
    select ip.lat, ip.lng, ip.state into v_lat, v_lng, v_state from public.incidents_public ip where ip.id = v_incident.id;
    raise notice '  AS_REPORTER -> lat=% lng=% state=%', v_lat, v_lng, v_state;

    perform set_config('request.jwt.claims', json_build_object('sub', v_other_uid, 'role','authenticated')::text, true);
    select ip.lat, ip.lng, ip.state into v_lat, v_lng, v_state from public.incidents_public ip where ip.id = v_incident.id;
    raise notice '  AS_OTHER_USER -> lat=% lng=% state=%', v_lat, v_lng, v_state;
  end loop;

  perform set_config('request.jwt.claims', '', true);
end $$;
