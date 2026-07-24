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
  first_count integer;
  second_count integer;
begin
  select counties_created into first_count from public.county_hunter_seed_georgia();
  select counties_created into second_count from public.county_hunter_seed_georgia();
  if first_count <> 6 or second_count <> 0 then
    raise exception 'organization A bootstrap is not idempotent: first %, second %', first_count, second_count;
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
  ) <> 2 then
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
  first_count integer;
  second_count integer;
begin
  if (select count(*) from public.county_hunter_counties) <> 0 then
    raise exception 'admin B saw organization A counties before its own bootstrap';
  end if;
  select counties_created into first_count from public.county_hunter_seed_georgia();
  select counties_created into second_count from public.county_hunter_seed_georgia();
  if first_count <> 6 or second_count <> 0 then
    raise exception 'organization B bootstrap is not idempotent: first %, second %', first_count, second_count;
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
  ) <> 2 then
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
begin
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
  ) <> 2 then
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

rollback;
