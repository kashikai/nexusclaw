\set ON_ERROR_STOP on

-- Required psql variables: org_a, org_b, viewer_a, manager_a, admin_a, admin_b.
-- The four user UUIDs must already exist in auth.users in the dedicated staging project.
begin;

create temporary table county_hunter_validation_context (
  org_a uuid not null,
  org_b uuid not null,
  viewer_a uuid not null,
  manager_a uuid not null,
  admin_a uuid not null,
  admin_b uuid not null,
  outsider uuid not null
) on commit drop;

insert into county_hunter_validation_context
values (
  :'org_a'::uuid,
  :'org_b'::uuid,
  :'viewer_a'::uuid,
  :'manager_a'::uuid,
  :'admin_a'::uuid,
  :'admin_b'::uuid,
  gen_random_uuid()
);

grant select on county_hunter_validation_context to authenticated;

do $$
begin
  if (select org_a = org_b from county_hunter_validation_context) then
    raise exception 'org_a and org_b must be distinct';
  end if;
  if (select count(distinct user_id) from (
    select viewer_a as user_id from county_hunter_validation_context
    union all select manager_a from county_hunter_validation_context
    union all select admin_a from county_hunter_validation_context
    union all select admin_b from county_hunter_validation_context
  ) users) <> 4 then
    raise exception 'all four staging users must be distinct';
  end if;
end;
$$;

insert into public.county_hunter_memberships (
  user_id,
  organization_id,
  permissions,
  active
)
select viewer_a, org_a, array['county_hunter.view']::text[], true
from county_hunter_validation_context
union all
select manager_a, org_a, array['county_hunter.view', 'county_hunter.manage']::text[], true
from county_hunter_validation_context
union all
select
  admin_a,
  org_a,
  array['county_hunter.view', 'county_hunter.manage', 'county_hunter.admin']::text[],
  true
from county_hunter_validation_context
union all
select
  admin_b,
  org_b,
  array['county_hunter.view', 'county_hunter.manage', 'county_hunter.admin']::text[],
  true
from county_hunter_validation_context
where true
on conflict (user_id, organization_id)
do update set
  permissions = excluded.permissions,
  active = excluded.active,
  updated_at = now();

-- Admin A bootstraps only A, gets 6 then 0, and records exact invocation audit.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select admin_a from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_a from county_hunter_validation_context))
  )::text,
  true
);
do $$
declare
  initial_count integer;
  initial_audit_count integer;
  first_count integer;
  second_count integer;
begin
  select count(*) into initial_count from public.county_hunter_counties;
  select count(*) into initial_audit_count
  from public.county_hunter_audit_logs
  where action = 'bootstrap'
    and entity_type = 'county_hunter_seed_georgia'
    and actor_user_id = (select admin_a from county_hunter_validation_context)
    and organization_id = (select org_a from county_hunter_validation_context);
  select counties_created into first_count from public.county_hunter_seed_georgia();
  select counties_created into second_count from public.county_hunter_seed_georgia();
  if initial_count not in (0, 6)
     or first_count <> (case when initial_count = 0 then 6 else 0 end)
     or second_count <> 0 then
    raise exception 'organization A bootstrap is not idempotent from baseline %: first %, second %', initial_count, first_count, second_count;
  end if;
  if (select count(*) from public.county_hunter_counties) <> 6 then
    raise exception 'organization A did not receive exactly six counties';
  end if;
  if (
    select count(*) from public.county_hunter_audit_logs
    where action = 'bootstrap'
      and entity_type = 'county_hunter_seed_georgia'
      and actor_user_id = (select admin_a from county_hunter_validation_context)
      and organization_id = (select org_a from county_hunter_validation_context)
      and created_at is not null
      and coalesce(current_data::text, '') !~* '(service_role|password|secret|access_token|refresh_token)'
  ) <> initial_audit_count + 2 then
    raise exception 'organization A bootstrap audit fields are incorrect';
  end if;
end;
$$;
reset role;

-- Admin B independently bootstraps B and cannot see A while doing so.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select admin_b from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_b from county_hunter_validation_context))
  )::text,
  true
);
do $$
declare
  initial_count integer;
  initial_audit_count integer;
  first_count integer;
  second_count integer;
begin
  select count(*) into initial_count from public.county_hunter_counties;
  select count(*) into initial_audit_count
  from public.county_hunter_audit_logs
  where action = 'bootstrap'
    and actor_user_id = (select admin_b from county_hunter_validation_context)
    and organization_id = (select org_b from county_hunter_validation_context);
  select counties_created into first_count from public.county_hunter_seed_georgia();
  select counties_created into second_count from public.county_hunter_seed_georgia();
  if initial_count not in (0, 6)
     or first_count <> (case when initial_count = 0 then 6 else 0 end)
     or second_count <> 0 then
    raise exception 'organization B bootstrap is not idempotent from baseline %: first %, second %', initial_count, first_count, second_count;
  end if;
  if (select count(*) from public.county_hunter_counties) <> 6 then
    raise exception 'organization B did not receive exactly six isolated counties';
  end if;
  if (
    select count(*) from public.county_hunter_audit_logs
    where action = 'bootstrap'
      and actor_user_id = (select admin_b from county_hunter_validation_context)
      and organization_id = (select org_b from county_hunter_validation_context)
      and created_at is not null
  ) <> initial_audit_count + 2 then
    raise exception 'organization B bootstrap audit fields are incorrect';
  end if;
end;
$$;
reset role;

-- Viewer A reads A only. Forged metadata, JWT permission arrays and request headers grant nothing.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select viewer_a from county_hunter_validation_context),
    'role', 'authenticated',
    'permissions', json_build_array('county_hunter.admin'),
    'user_metadata', json_build_object('permissions', json_build_array('county_hunter.admin')),
    'app_metadata', json_build_object(
      'organization_id', (select org_a from county_hunter_validation_context),
      'permissions', json_build_array('county_hunter.admin')
    )
  )::text,
  true
);
select set_config('request.headers', '{"x-county-hunter-permission":"county_hunter.admin"}', true);
do $$
declare
  affected integer;
begin
  if (select count(*) from public.county_hunter_counties) <> 6 then
    raise exception 'viewer A did not see exactly its own tenant counties';
  end if;
  if exists (
    select 1 from public.county_hunter_counties
    where organization_id = (select org_b from county_hunter_validation_context)
  ) then
    raise exception 'cross-tenant SELECT exposed organization B to viewer A';
  end if;

  update public.county_hunter_counties set operational_notes = 'forbidden viewer update';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'viewer unexpectedly updated a County Hunter record';
  end if;

  begin
    insert into public.county_hunter_settings (organization_id)
    values ((select org_a from county_hunter_validation_context));
    raise exception 'forged claims or headers granted viewer admin access';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform * from public.county_hunter_seed_georgia();
    raise exception 'viewer unexpectedly executed bootstrap';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- Missing organization, missing membership, and inactive membership all fail closed.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select viewer_a from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', '{}'::jsonb
  )::text,
  true
);
do $$
begin
  if (select count(*) from public.county_hunter_counties) <> 0 then
    raise exception 'a session without organization_id accessed tenant rows';
  end if;
end;
$$;
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select outsider from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_a from county_hunter_validation_context))
  )::text,
  true
);
do $$
begin
  if (select count(*) from public.county_hunter_counties) <> 0 then
    raise exception 'a session without membership accessed tenant rows';
  end if;
end;
$$;
reset role;

update public.county_hunter_memberships
set active = false
where user_id = (select viewer_a from county_hunter_validation_context)
  and organization_id = (select org_a from county_hunter_validation_context);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select viewer_a from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_a from county_hunter_validation_context))
  )::text,
  true
);
do $$
begin
  if (select count(*) from public.county_hunter_counties) <> 0 then
    raise exception 'an inactive membership retained access';
  end if;
end;
$$;
reset role;
update public.county_hunter_memberships
set active = true
where user_id = (select viewer_a from county_hunter_validation_context)
  and organization_id = (select org_a from county_hunter_validation_context);

-- Manager A can create/update its source, but cannot target B, move tenant, delete, or bootstrap.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select manager_a from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_a from county_hunter_validation_context))
  )::text,
  true
);
do $$
declare
  source_id uuid;
  affected integer;
  initial_audit_count integer;
begin
  select count(*) into initial_audit_count
  from public.county_hunter_audit_logs
  where actor_user_id = (select manager_a from county_hunter_validation_context)
    and organization_id = (select org_a from county_hunter_validation_context)
    and entity_type = 'county_hunter_sources'
    and action in ('insert', 'update');

  insert into public.county_hunter_sources (organization_id, county_id, name, source_type)
  select
    (select org_a from county_hunter_validation_context),
    county.id,
    'Staging manual source',
    'manual'
  from public.county_hunter_counties county
  order by county.name
  limit 1
  returning id into source_id;

  update public.county_hunter_sources
  set notes = 'authorized manager update'
  where id = source_id;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'manager A could not update its own authorized source';
  end if;

  update public.county_hunter_states
  set name = name
  where organization_id = (select org_b from county_hunter_validation_context);
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'manager A altered organization B';
  end if;

  delete from public.county_hunter_states
  where organization_id = (select org_b from county_hunter_validation_context);
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'manager A deleted organization B';
  end if;

  begin
    insert into public.county_hunter_states (organization_id, code, name)
    values ((select org_b from county_hunter_validation_context), 'FL', 'Florida');
    raise exception 'payload organization_id overrode the trusted tenant';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.county_hunter_sources
    set organization_id = (select org_b from county_hunter_validation_context)
    where id = source_id;
    raise exception 'organization_id was altered by update';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform * from public.county_hunter_seed_georgia();
    raise exception 'manager unexpectedly executed admin bootstrap';
  exception when insufficient_privilege then
    null;
  end;

  if (
    select count(*) from public.county_hunter_audit_logs
    where actor_user_id = (select manager_a from county_hunter_validation_context)
      and organization_id = (select org_a from county_hunter_validation_context)
      and entity_type = 'county_hunter_sources'
      and action in ('insert', 'update')
      and created_at is not null
      and coalesce(previous_data::text, '') !~* '(service_role|password|secret|access_token|refresh_token)'
      and coalesce(current_data::text, '') !~* '(service_role|password|secret|access_token|refresh_token)'
  ) <> initial_audit_count + 2 then
    raise exception 'manager source audit actor, tenant, action, timestamp or redaction is incorrect';
  end if;
end;
$$;
reset role;

-- Even an A admin cannot update or delete B; rows remain undisclosed.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select admin_a from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_a from county_hunter_validation_context))
  )::text,
  true
);
do $$
declare
  affected integer;
begin
  update public.county_hunter_states
  set name = name
  where organization_id = (select org_b from county_hunter_validation_context);
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'admin A updated organization B';
  end if;

  delete from public.county_hunter_states
  where organization_id = (select org_b from county_hunter_validation_context);
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'admin A deleted organization B';
  end if;

  if exists (
    select 1 from public.county_hunter_audit_logs
    where organization_id = (select org_b from county_hunter_validation_context)
  ) then
    raise exception 'admin A read organization B audit records';
  end if;
end;
$$;
reset role;

-- Phase 2 discovery tables remain tenant-scoped, viewer-readable and admin-writable.
create temporary table county_hunter_discovery_validation (
  org_a_county uuid not null,
  org_a_source uuid not null,
  org_a_run uuid not null
) on commit drop;
grant select, insert on county_hunter_discovery_validation to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select admin_a from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_a from county_hunter_validation_context))
  )::text,
  true
);
do $$
declare
  configured_county uuid;
  configured_source uuid;
  discovery_run uuid;
  lock_released boolean;
begin
  select county_id, source_id
  into configured_county, configured_source
  from public.county_hunter_configure_gwinnett_discovery();

  if configured_county is null or configured_source is null then
    raise exception 'admin A could not configure the approved Gwinnett source';
  end if;
  if (
    select count(*)
    from public.county_hunter_sources source
    where source.id = configured_source
      and source.organization_id = (select org_a from county_hunter_validation_context)
      and source.managed_by_adapter
      and source.adapter_key = 'gwinnett-tax-sales'
      and source.official_hostnames = '["www.gwinnetttaxcommissioner.com"]'::jsonb
  ) <> 1 then
    raise exception 'Gwinnett source configuration is not exact or tenant-scoped';
  end if;

  discovery_run := public.county_hunter_begin_discovery(configured_source, '1.0.0', 300);
  begin
    perform public.county_hunter_begin_discovery(configured_source, '1.0.0', 300);
    raise exception 'a concurrent discovery run acquired the same source lock';
  exception when lock_not_available then
    null;
  end;

  insert into public.county_hunter_discovery_snapshots (
    organization_id,
    run_id,
    source_id,
    snapshot_kind,
    original_url,
    final_url,
    content_hash,
    content_type,
    content_length,
    response_headers,
    content_base64,
    fetched_at
  ) values (
    (select org_a from county_hunter_validation_context),
    discovery_run,
    configured_source,
    'landing_page',
    'https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales',
    'https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales',
    repeat('a', 64),
    'text/html',
    11,
    '{"content-type":"text/html"}'::jsonb,
    'PHNhbml0aXplZD4=',
    now()
  );

  insert into public.county_hunter_discovery_records (
    organization_id,
    run_id,
    source_id,
    source_order,
    page_number,
    source_record_key,
    raw_text,
    parcel_number_original,
    parcel_number_normalized,
    owner_name,
    property_address,
    amount_due,
    sale_date,
    normalized_hash
  ) values (
    (select org_a from county_hunter_validation_context),
    discovery_run,
    configured_source,
    0,
    1,
    'RTEST0001',
    'RTEST 0001 FIXTURE OWNER 100 FIXTURE WAY $1.00',
    'RTEST 0001',
    'RTEST0001',
    'FIXTURE OWNER',
    '100 FIXTURE WAY',
    1.00,
    current_date + 7,
    repeat('b', 64)
  );

  insert into public.county_hunter_discovery_changes (
    organization_id,
    run_id,
    source_id,
    source_record_key,
    change_type,
    current_hash
  ) values (
    (select org_a from county_hunter_validation_context),
    discovery_run,
    configured_source,
    'RTEST0001',
    'added',
    repeat('b', 64)
  );

  lock_released := public.county_hunter_release_discovery_lock(discovery_run);
  if not lock_released then
    raise exception 'admin A could not release the discovery source lock';
  end if;

  update public.county_hunter_discovery_runs
  set
    status = 'completed',
    finished_at = now(),
    added_count = 1,
    properties_found = 1
  where id = discovery_run;

  insert into county_hunter_discovery_validation values (
    configured_county,
    configured_source,
    discovery_run
  );

  if not exists (
    select 1
    from public.county_hunter_audit_logs
    where organization_id = (select org_a from county_hunter_validation_context)
      and actor_user_id = (select admin_a from county_hunter_validation_context)
      and entity_type = 'county_hunter_discovery_runs'
      and action in ('insert', 'update')
      and created_at is not null
  ) then
    raise exception 'discovery audit actor, tenant or action is incorrect';
  end if;
end;
$$;
reset role;

-- Viewer A can see normalized discovery metadata but cannot execute or write.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select viewer_a from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_a from county_hunter_validation_context))
  )::text,
  true
);
do $$
begin
  if (select count(*) from public.county_hunter_discovery_records) <> 1 then
    raise exception 'viewer A could not read its discovery record';
  end if;
  if (select count(*) from public.county_hunter_discovery_changes) <> 1 then
    raise exception 'viewer A could not read its discovery diff';
  end if;
  begin
    perform public.county_hunter_begin_discovery(
      (select org_a_source from county_hunter_discovery_validation),
      '1.0.0',
      300
    );
    raise exception 'viewer unexpectedly executed discovery';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.county_hunter_discovery_changes (
      organization_id, run_id, source_id, source_record_key, change_type
    ) values (
      (select org_a from county_hunter_validation_context),
      (select org_a_run from county_hunter_discovery_validation),
      (select org_a_source from county_hunter_discovery_validation),
      'FORBIDDEN',
      'added'
    );
    raise exception 'viewer unexpectedly wrote discovery data';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- Manager A keeps manual-source permissions but cannot alter the managed adapter or run it.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select manager_a from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_a from county_hunter_validation_context))
  )::text,
  true
);
do $$
declare
  affected integer;
begin
  update public.county_hunter_sources
  set adapter_version = 'forbidden'
  where id = (select org_a_source from county_hunter_discovery_validation);
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'manager altered the adapter-managed Gwinnett source';
  end if;

  begin
    perform public.county_hunter_begin_discovery(
      (select org_a_source from county_hunter_discovery_validation),
      '1.0.0',
      300
    );
    raise exception 'manager unexpectedly executed discovery';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- Admin B can configure only B and cannot see or mutate A discovery objects.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select admin_b from county_hunter_validation_context),
    'role', 'authenticated',
    'app_metadata', json_build_object('organization_id', (select org_b from county_hunter_validation_context))
  )::text,
  true
);
do $$
declare
  configured_county uuid;
  configured_source uuid;
  affected integer;
begin
  if (select count(*) from public.county_hunter_discovery_runs) <> 0 then
    raise exception 'admin B saw organization A discovery runs';
  end if;
  if (select count(*) from public.county_hunter_discovery_snapshots) <> 0 then
    raise exception 'admin B saw organization A snapshots';
  end if;

  select county_id, source_id
  into configured_county, configured_source
  from public.county_hunter_configure_gwinnett_discovery();
  if configured_county is null or configured_source is null then
    raise exception 'admin B could not configure its own isolated Gwinnett source';
  end if;

  update public.county_hunter_discovery_runs
  set status = 'failed'
  where id = (select org_a_run from county_hunter_discovery_validation);
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'admin B updated organization A discovery run';
  end if;
end;
$$;
reset role;

rollback;
