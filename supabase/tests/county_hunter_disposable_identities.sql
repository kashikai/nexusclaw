\set ON_ERROR_STOP on

begin;

insert into auth.users (id)
values
  (:'viewer_a'::uuid),
  (:'manager_a'::uuid),
  (:'admin_a'::uuid),
  (:'admin_b'::uuid)
on conflict (id) do nothing;

insert into public.county_hunter_memberships (
  user_id,
  organization_id,
  permissions,
  active
)
values
  (
    :'viewer_a'::uuid,
    :'org_a'::uuid,
    array['county_hunter.view']::text[],
    true
  ),
  (
    :'manager_a'::uuid,
    :'org_a'::uuid,
    array['county_hunter.view', 'county_hunter.manage']::text[],
    true
  ),
  (
    :'admin_a'::uuid,
    :'org_a'::uuid,
    array['county_hunter.view', 'county_hunter.manage', 'county_hunter.admin']::text[],
    true
  ),
  (
    :'admin_b'::uuid,
    :'org_b'::uuid,
    array['county_hunter.view', 'county_hunter.manage', 'county_hunter.admin']::text[],
    true
  )
on conflict (user_id, organization_id)
do update set
  permissions = excluded.permissions,
  active = excluded.active,
  updated_at = now();

create temporary table county_hunter_disposable_context (
  org_a uuid not null,
  org_b uuid not null,
  admin_a uuid not null,
  admin_b uuid not null
) on commit drop;

insert into county_hunter_disposable_context
values (
  :'org_a'::uuid,
  :'org_b'::uuid,
  :'admin_a'::uuid,
  :'admin_b'::uuid
);

grant select on county_hunter_disposable_context to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select admin_a from county_hunter_disposable_context),
    'role', 'authenticated',
    'app_metadata', json_build_object(
      'organization_id',
      (select org_a from county_hunter_disposable_context)
    )
  )::text,
  true
);

do $$
declare
  first_count integer;
  second_count integer;
begin
  select counties_created into first_count
  from public.county_hunter_seed_georgia();
  select counties_created into second_count
  from public.county_hunter_seed_georgia();
  if first_count <> 6 or second_count <> 0 then
    raise exception 'Disposable organization A bootstrap did not return 6 then 0';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select admin_b from county_hunter_disposable_context),
    'role', 'authenticated',
    'app_metadata', json_build_object(
      'organization_id',
      (select org_b from county_hunter_disposable_context)
    )
  )::text,
  true
);

do $$
declare
  first_count integer;
  second_count integer;
begin
  select counties_created into first_count
  from public.county_hunter_seed_georgia();
  select counties_created into second_count
  from public.county_hunter_seed_georgia();
  if first_count <> 6 or second_count <> 0 then
    raise exception 'Disposable organization B bootstrap did not return 6 then 0';
  end if;
end;
$$;

reset role;

commit;
