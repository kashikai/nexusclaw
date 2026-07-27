\set ON_ERROR_STOP on

begin;

do $$
begin
  if to_regclass('public.county_hunter_discovery_snapshots') is not null
     or to_regclass('public.county_hunter_discovery_records') is not null
     or to_regclass('public.county_hunter_discovery_changes') is not null
     or to_regclass('public.county_hunter_discovery_locks') is not null then
    raise exception 'A Phase 2 table survived the destructive rollback';
  end if;

  if to_regprocedure(
    'public.county_hunter_begin_snapshot_replay(uuid,text,integer)'
  ) is not null
     or to_regprocedure(
       'public.county_hunter_configure_gwinnett_discovery()'
     ) is not null
     or to_regprocedure(
       'public.county_hunter_begin_discovery(uuid,text,integer)'
     ) is not null
     or to_regprocedure(
       'public.county_hunter_release_discovery_lock(uuid)'
     ) is not null then
    raise exception 'A Phase 2 RPC survived the destructive rollback';
  end if;

  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'county_hunter_discovery_runs_source_run_idx',
        'county_hunter_discovery_runs_source_created_idx',
        'county_hunter_properties_source_record_key_unique',
        'county_hunter_auctions_source_sale_date_unique'
      )
  ) then
    raise exception 'A Phase 2 index survived the destructive rollback';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname in (
      'county_hunter_discovery_runs_tenant_source_run_fk',
      'county_hunter_discovery_runs_replay_source_check',
      'county_hunter_discovery_runs_type_check',
      'county_hunter_runs_landing_snapshot_fk',
      'county_hunter_runs_document_snapshot_fk',
      'county_hunter_runs_tenant_source_fk',
      'county_hunter_sources_last_run_fk',
      'county_hunter_properties_tenant_source_fk',
      'county_hunter_properties_first_run_fk',
      'county_hunter_properties_last_run_fk',
      'county_hunter_auctions_tenant_source_fk'
    )
  ) then
    raise exception 'A Phase 2 constraint survived the destructive rollback';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'county_hunter_sources' and column_name = 'adapter_key')
        or (
          table_name = 'county_hunter_discovery_runs'
          and column_name in ('run_type', 'source_run_id', 'adapter_version')
        )
        or (
          table_name = 'county_hunter_properties'
          and column_name in ('source_record_key', 'first_seen_run_id')
        )
      )
  ) then
    raise exception 'A Phase 2 column survived the destructive rollback';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'county_hunter_sources_insert',
        'county_hunter_sources_update',
        'county_hunter_discovery_runs_insert',
        'county_hunter_discovery_runs_update'
      )
  ) <> 4 then
    raise exception 'Phase 1 policies were not restored';
  end if;

  if to_regclass('public.county_hunter_counties') is null
     or to_regclass('public.county_hunter_memberships') is null
     or to_regclass('public.county_hunter_auth_challenges') is null
     or to_regprocedure('public.county_hunter_seed_georgia()') is null then
    raise exception 'A Phase 1 object was removed';
  end if;

  if (select count(*) from public.county_hunter_memberships) <> 4 then
    raise exception 'Permanent disposable memberships were not preserved';
  end if;
  if exists (
    select 1
    from public.county_hunter_sources
    where name = 'Gwinnett County Tax Commissioner - Current Tax Sale List'
  ) then
    raise exception 'A managed Phase 2 source survived rollback';
  end if;
end;
$$;

create temporary table county_hunter_disposable_context (
  org_a uuid not null,
  org_b uuid not null,
  viewer_a uuid not null,
  admin_a uuid not null
) on commit drop;

insert into county_hunter_disposable_context
values (
  :'org_a'::uuid,
  :'org_b'::uuid,
  :'viewer_a'::uuid,
  :'admin_a'::uuid
);

grant select on county_hunter_disposable_context to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select viewer_a from county_hunter_disposable_context),
    'role', 'authenticated',
    'app_metadata', json_build_object(
      'organization_id',
      (select org_a from county_hunter_disposable_context)
    )
  )::text,
  true
);

do $$
begin
  if (select count(*) from public.county_hunter_counties) not in (6, 7) then
    raise exception 'Viewer A lost its Phase 1 counties after rollback';
  end if;
  if exists (
    select 1
    from public.county_hunter_counties
    where organization_id =
          (select org_b from county_hunter_disposable_context)
  ) then
    raise exception 'Phase 1 cross-tenant SELECT failed after rollback';
  end if;
end;
$$;

reset role;
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
  bootstrap_count integer;
begin
  select counties_created into bootstrap_count
  from public.county_hunter_seed_georgia();
  if bootstrap_count <> 0 then
    raise exception 'Phase 1 bootstrap was not idempotent after rollback';
  end if;
end;
$$;

reset role;

rollback;
