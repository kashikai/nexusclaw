\set ON_ERROR_STOP on

begin;

create temporary table county_hunter_disposable_context (
  org_a uuid not null,
  org_b uuid not null,
  viewer_a uuid not null,
  admin_a uuid not null,
  admin_b uuid not null
) on commit drop;

insert into county_hunter_disposable_context
values (
  :'org_a'::uuid,
  :'org_b'::uuid,
  :'viewer_a'::uuid,
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
  configured_county uuid;
  configured_source uuid;
  discovery_run uuid;
  landing_snapshot uuid := gen_random_uuid();
  document_snapshot uuid := gen_random_uuid();
  auction_id uuid := gen_random_uuid();
  replay_run uuid;
  replay_snapshot uuid;
  replay_source_run uuid;
  replay_content text;
  lock_released boolean;
begin
  select county_id, source_id
  into configured_county, configured_source
  from public.county_hunter_configure_gwinnett_discovery();

  discovery_run := public.county_hunter_begin_discovery(
    configured_source,
    '1.0.0',
    300
  );

  insert into public.county_hunter_discovery_snapshots (
    id,
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
  )
  values
    (
      landing_snapshot,
      (select org_a from county_hunter_disposable_context),
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
    ),
    (
      document_snapshot,
      (select org_a from county_hunter_disposable_context),
      discovery_run,
      configured_source,
      'official_document',
      'https://www.gwinnetttaxcommissioner.com/documents/d/egov/disposable-fixture',
      'https://www.gwinnetttaxcommissioner.com/documents/d/egov/disposable-fixture',
      repeat('c', 64),
      'application/pdf',
      18,
      '{"content-type":"application/pdf"}'::jsonb,
      'JVBERi0xLjQKJXNhbml0aXplZA==',
      now()
    );

  insert into public.county_hunter_auctions (
    id,
    organization_id,
    county_id,
    source_id,
    sale_date,
    status,
    official_source_url,
    document_url,
    document_hash,
    created_by
  ) values (
    auction_id,
    (select org_a from county_hunter_disposable_context),
    configured_county,
    configured_source,
    current_date + 7,
    'confirmed',
    'https://www.gwinnetttaxcommissioner.com/documents/d/egov/disposable-fixture',
    'https://www.gwinnetttaxcommissioner.com/documents/d/egov/disposable-fixture',
    repeat('c', 64),
    (select admin_a from county_hunter_disposable_context)
  );

  insert into public.county_hunter_properties (
    organization_id,
    auction_id,
    county_id,
    source_id,
    source_record_key,
    parcel_number,
    parcel_number_original,
    owner_name,
    address,
    amount_due,
    source_record_hash,
    source_record_status,
    first_seen_run_id,
    last_seen_run_id,
    created_by
  )
  select
    (select org_a from county_hunter_disposable_context),
    auction_id,
    configured_county,
    configured_source,
    'GATE' || lpad(item::text, 4, '0'),
    'GATE' || lpad(item::text, 4, '0'),
    'GATE ' || lpad(item::text, 4, '0'),
    'DISPOSABLE OWNER ' || item,
    item || ' DISPOSABLE WAY',
    item::numeric,
    encode(
      digest('GATE' || lpad(item::text, 4, '0'), 'sha256'),
      'hex'
    ),
    'current',
    discovery_run,
    discovery_run,
    (select admin_a from county_hunter_disposable_context)
  from generate_series(1, 25) item;

  insert into public.county_hunter_discovery_records (
    organization_id,
    run_id,
    source_id,
    property_id,
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
  )
  select
    property.organization_id,
    discovery_run,
    configured_source,
    property.id,
    row_number() over (order by property.source_record_key) - 1,
    1,
    property.source_record_key,
    property.source_record_key || ' DISPOSABLE FIXTURE',
    property.parcel_number_original,
    property.parcel_number,
    property.owner_name,
    property.address,
    property.amount_due,
    current_date + 7,
    property.source_record_hash
  from public.county_hunter_properties property
  where property.organization_id =
        (select org_a from county_hunter_disposable_context)
    and property.source_id = configured_source;

  insert into public.county_hunter_discovery_changes (
    organization_id,
    run_id,
    source_id,
    property_id,
    source_record_key,
    change_type,
    current_hash
  )
  select
    property.organization_id,
    discovery_run,
    configured_source,
    property.id,
    property.source_record_key,
    'added',
    property.source_record_hash
  from public.county_hunter_properties property
  where property.organization_id =
        (select org_a from county_hunter_disposable_context)
    and property.source_id = configured_source;

  update public.county_hunter_discovery_runs
  set
    status = 'completed',
    finished_at = now(),
    properties_found = 25,
    added_count = 25,
    landing_snapshot_id = landing_snapshot,
    document_snapshot_id = document_snapshot,
    landing_url = 'https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales',
    landing_final_url = 'https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales',
    document_url = 'https://www.gwinnetttaxcommissioner.com/documents/d/egov/disposable-fixture',
    document_final_url = 'https://www.gwinnetttaxcommissioner.com/documents/d/egov/disposable-fixture',
    landing_hash = repeat('a', 64),
    document_hash = repeat('c', 64),
    landing_content_type = 'text/html',
    document_content_type = 'application/pdf',
    landing_size = 11,
    document_size = 18,
    sale_date = current_date + 7
  where id = discovery_run;

  lock_released := public.county_hunter_release_discovery_lock(discovery_run);
  if not lock_released then
    raise exception 'Disposable discovery lock was not released';
  end if;

  select
    replay.run_id,
    replay.snapshot_id,
    replay.source_run_id,
    replay.snapshot_content_base64
  into
    replay_run,
    replay_snapshot,
    replay_source_run,
    replay_content
  from public.county_hunter_begin_snapshot_replay(
    document_snapshot,
    '1.1.0',
    300
  ) replay;

  if replay_snapshot <> document_snapshot
     or replay_source_run <> discovery_run
     or replay_content <> 'JVBERi0xLjQKJXNhbml0aXplZA==' then
    raise exception 'Disposable snapshot replay lineage is invalid';
  end if;

  insert into public.county_hunter_discovery_records (
    organization_id,
    run_id,
    source_id,
    property_id,
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
  )
  select
    property.organization_id,
    replay_run,
    configured_source,
    property.id,
    row_number() over (order by property.source_record_key) - 1,
    1,
    property.source_record_key,
    property.source_record_key || ' DISPOSABLE REPLAY',
    property.parcel_number_original,
    property.parcel_number,
    property.owner_name,
    property.address,
    property.amount_due,
    current_date + 7,
    property.source_record_hash
  from public.county_hunter_properties property
  where property.organization_id =
        (select org_a from county_hunter_disposable_context)
    and property.source_id = configured_source;

  insert into public.county_hunter_discovery_changes (
    organization_id,
    run_id,
    source_id,
    property_id,
    source_record_key,
    change_type,
    previous_hash,
    current_hash
  )
  select
    property.organization_id,
    replay_run,
    configured_source,
    property.id,
    property.source_record_key,
    'unchanged',
    property.source_record_hash,
    property.source_record_hash
  from public.county_hunter_properties property
  where property.organization_id =
        (select org_a from county_hunter_disposable_context)
    and property.source_id = configured_source;

  update public.county_hunter_discovery_runs
  set
    status = 'completed',
    finished_at = now(),
    properties_found = 25,
    unchanged_count = 25
  where id = replay_run;

  lock_released := public.county_hunter_release_discovery_lock(replay_run);
  if not lock_released then
    raise exception 'Disposable replay lock was not released';
  end if;

  if (
    select count(*)
    from public.county_hunter_discovery_records
    where run_id = discovery_run
  ) <> 25 then
    raise exception 'Disposable discovery did not persist 25 records';
  end if;
  if (
    select count(*)
    from public.county_hunter_discovery_changes
    where run_id = replay_run
      and change_type = 'unchanged'
  ) <> 25 then
    raise exception 'Disposable replay did not persist 25 unchanged records';
  end if;
  if not exists (
    select 1
    from public.county_hunter_audit_logs
    where organization_id =
          (select org_a from county_hunter_disposable_context)
      and actor_user_id =
          (select admin_a from county_hunter_disposable_context)
      and entity_type = 'county_hunter_discovery_runs'
      and entity_id = replay_run
      and action = 'insert'
  ) then
    raise exception 'Disposable replay audit attribution is invalid';
  end if;
end;
$$;

reset role;
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
  if (
    select count(*)
    from public.county_hunter_discovery_changes
    where change_type in ('added', 'unchanged')
  ) <> 50 then
    raise exception 'Viewer A cannot read the disposable discovery and replay';
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
  configured_county uuid;
  configured_source uuid;
  affected integer;
begin
  if exists (select 1 from public.county_hunter_discovery_runs) then
    raise exception 'Disposable cross-tenant SELECT exposed organization A';
  end if;

  select county_id, source_id
  into configured_county, configured_source
  from public.county_hunter_configure_gwinnett_discovery();

  update public.county_hunter_discovery_runs
  set status = 'failed';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Disposable cross-tenant UPDATE changed organization A';
  end if;
end;
$$;

reset role;

commit;
