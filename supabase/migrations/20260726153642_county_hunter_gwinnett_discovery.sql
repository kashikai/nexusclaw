-- NexusClaw County Hunter - Phase 2 Gwinnett discovery foundation
-- Additive only: preserves the approved Phase 1 tables, data, contracts and flows.

alter table public.county_hunter_sources
  add column adapter_key text,
  add column adapter_version text,
  add column official_hostnames jsonb not null default '[]'::jsonb,
  add column managed_by_adapter boolean not null default false,
  add column last_success_at timestamptz,
  add column last_document_url text,
  add column last_document_hash text,
  add column last_sale_date date,
  add column last_run_id uuid;

alter table public.county_hunter_auctions
  add column source_id uuid,
  add column document_url text,
  add column document_hash text;

alter table public.county_hunter_properties
  add column source_id uuid,
  add column source_record_key text,
  add column parcel_number_original text,
  add column amount_due numeric(16,2) check (amount_due is null or amount_due >= 0),
  add column source_record_hash text,
  add column source_record_status text not null default 'current'
    check (source_record_status in ('current', 'removed_from_current_source')),
  add column first_seen_run_id uuid,
  add column last_seen_run_id uuid,
  add column removed_at timestamptz,
  add column official_notes text;

alter table public.county_hunter_discovery_runs
  add column source_id uuid,
  add column adapter_version text,
  add column landing_snapshot_id uuid,
  add column document_snapshot_id uuid,
  add column landing_url text,
  add column landing_final_url text,
  add column document_url text,
  add column document_final_url text,
  add column landing_hash text,
  add column document_hash text,
  add column landing_content_type text,
  add column document_content_type text,
  add column landing_size bigint check (landing_size is null or landing_size >= 0),
  add column document_size bigint check (document_size is null or document_size >= 0),
  add column sale_date date,
  add column document_published_at timestamptz,
  add column source_last_modified timestamptz,
  add column reason_codes text[] not null default '{}'::text[],
  add column candidate_documents jsonb not null default '[]'::jsonb
    check (jsonb_typeof(candidate_documents) = 'array'),
  add column added_count integer not null default 0 check (added_count >= 0),
  add column changed_count integer not null default 0 check (changed_count >= 0),
  add column unchanged_count integer not null default 0 check (unchanged_count >= 0),
  add column removed_count integer not null default 0 check (removed_count >= 0),
  add column duplicate_count integer not null default 0 check (duplicate_count >= 0),
  add column review_required boolean not null default false;

alter table public.county_hunter_discovery_runs
  drop constraint county_hunter_discovery_runs_status_check;

alter table public.county_hunter_discovery_runs
  add constraint county_hunter_discovery_runs_status_check check (
    status in (
      'queued',
      'fetching_source',
      'fetching_document',
      'parsing',
      'normalizing',
      'comparing',
      'completed',
      'review_required',
      'failed'
    )
  );

alter table public.county_hunter_discovery_runs
  add constraint county_hunter_discovery_runs_org_id_unique unique (organization_id, id);

create table public.county_hunter_discovery_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  source_id uuid not null,
  snapshot_kind text not null check (snapshot_kind in ('landing_page', 'official_document')),
  original_url text not null,
  final_url text not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  content_type text not null,
  content_length bigint not null check (content_length >= 0),
  response_headers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(response_headers) = 'object'),
  content_base64 text not null,
  fetched_at timestamptz not null,
  source_last_modified timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, run_id, snapshot_kind, content_hash),
  unique (organization_id, id)
);

create table public.county_hunter_discovery_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  source_id uuid not null,
  property_id uuid,
  source_order integer not null check (source_order >= 0),
  page_number integer not null check (page_number > 0),
  source_record_key text not null,
  item_number text,
  raw_text text not null check (char_length(raw_text) <= 2048),
  parcel_number_original text,
  parcel_number_normalized text,
  owner_name text,
  property_address text,
  legal_description text,
  amount_due numeric(16,2) check (amount_due is null or amount_due >= 0),
  starting_bid numeric(16,2) check (starting_bid is null or starting_bid >= 0),
  sale_date date,
  official_notes text,
  normalized_hash text not null check (normalized_hash ~ '^[0-9a-f]{64}$'),
  duplicate_source_record boolean not null default false,
  duplicate_of_record_id uuid,
  review_required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, run_id, source_order),
  unique (organization_id, id)
);

create table public.county_hunter_discovery_changes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  source_id uuid not null,
  property_id uuid,
  source_record_key text not null,
  change_type text not null check (
    change_type in ('added', 'changed', 'unchanged', 'removed_from_current_source')
  ),
  previous_hash text,
  current_hash text,
  created_at timestamptz not null default now(),
  unique (organization_id, run_id, source_record_key),
  unique (organization_id, id)
);

create table public.county_hunter_discovery_locks (
  source_id uuid primary key,
  organization_id uuid not null,
  run_id uuid not null unique,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > acquired_at),
  unique (organization_id, source_id)
);

alter table public.county_hunter_discovery_runs
  add constraint county_hunter_runs_tenant_source_fk
  foreign key (organization_id, source_id)
  references public.county_hunter_sources(organization_id, id) on delete restrict;

alter table public.county_hunter_discovery_snapshots
  add constraint county_hunter_snapshots_tenant_run_fk
  foreign key (organization_id, run_id)
  references public.county_hunter_discovery_runs(organization_id, id) on delete restrict,
  add constraint county_hunter_snapshots_tenant_source_fk
  foreign key (organization_id, source_id)
  references public.county_hunter_sources(organization_id, id) on delete restrict;

alter table public.county_hunter_discovery_records
  add constraint county_hunter_records_tenant_run_fk
  foreign key (organization_id, run_id)
  references public.county_hunter_discovery_runs(organization_id, id) on delete restrict,
  add constraint county_hunter_records_tenant_source_fk
  foreign key (organization_id, source_id)
  references public.county_hunter_sources(organization_id, id) on delete restrict,
  add constraint county_hunter_records_tenant_property_fk
  foreign key (organization_id, property_id)
  references public.county_hunter_properties(organization_id, id) on delete restrict,
  add constraint county_hunter_records_tenant_duplicate_fk
  foreign key (organization_id, duplicate_of_record_id)
  references public.county_hunter_discovery_records(organization_id, id) on delete restrict;

alter table public.county_hunter_discovery_changes
  add constraint county_hunter_changes_tenant_run_fk
  foreign key (organization_id, run_id)
  references public.county_hunter_discovery_runs(organization_id, id) on delete restrict,
  add constraint county_hunter_changes_tenant_source_fk
  foreign key (organization_id, source_id)
  references public.county_hunter_sources(organization_id, id) on delete restrict,
  add constraint county_hunter_changes_tenant_property_fk
  foreign key (organization_id, property_id)
  references public.county_hunter_properties(organization_id, id) on delete restrict;

alter table public.county_hunter_discovery_locks
  add constraint county_hunter_locks_tenant_source_fk
  foreign key (organization_id, source_id)
  references public.county_hunter_sources(organization_id, id) on delete cascade,
  add constraint county_hunter_locks_tenant_run_fk
  foreign key (organization_id, run_id)
  references public.county_hunter_discovery_runs(organization_id, id) on delete cascade;

alter table public.county_hunter_auctions
  add constraint county_hunter_auctions_tenant_source_fk
  foreign key (organization_id, source_id)
  references public.county_hunter_sources(organization_id, id) on delete restrict;

alter table public.county_hunter_properties
  add constraint county_hunter_properties_tenant_source_fk
  foreign key (organization_id, source_id)
  references public.county_hunter_sources(organization_id, id) on delete restrict,
  add constraint county_hunter_properties_first_run_fk
  foreign key (organization_id, first_seen_run_id)
  references public.county_hunter_discovery_runs(organization_id, id) on delete restrict,
  add constraint county_hunter_properties_last_run_fk
  foreign key (organization_id, last_seen_run_id)
  references public.county_hunter_discovery_runs(organization_id, id) on delete restrict;

alter table public.county_hunter_sources
  add constraint county_hunter_sources_last_run_fk
  foreign key (organization_id, last_run_id)
  references public.county_hunter_discovery_runs(organization_id, id) on delete restrict;

alter table public.county_hunter_discovery_runs
  add constraint county_hunter_runs_landing_snapshot_fk
  foreign key (organization_id, landing_snapshot_id)
  references public.county_hunter_discovery_snapshots(organization_id, id) on delete restrict,
  add constraint county_hunter_runs_document_snapshot_fk
  foreign key (organization_id, document_snapshot_id)
  references public.county_hunter_discovery_snapshots(organization_id, id) on delete restrict;

create unique index county_hunter_auctions_source_sale_date_unique
  on public.county_hunter_auctions (organization_id, source_id, sale_date)
  where source_id is not null and sale_date is not null;

create unique index county_hunter_properties_source_record_key_unique
  on public.county_hunter_properties (organization_id, source_id, source_record_key)
  where source_id is not null and source_record_key is not null;

create index county_hunter_discovery_runs_source_created_idx
  on public.county_hunter_discovery_runs (organization_id, source_id, created_at desc);

create index county_hunter_discovery_records_run_order_idx
  on public.county_hunter_discovery_records (organization_id, run_id, source_order);

create index county_hunter_discovery_changes_run_type_idx
  on public.county_hunter_discovery_changes (organization_id, run_id, change_type);

-- New public tables are explicitly granted because Supabase no longer exposes new
-- public tables to the Data API by default. RLS remains the row-level boundary.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'county_hunter_discovery_snapshots',
    'county_hunter_discovery_records',
    'county_hunter_discovery_changes',
    'county_hunter_discovery_locks'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
  end loop;
end;
$$;

grant select (
  id, organization_id, run_id, source_id, snapshot_kind, original_url, final_url,
  content_hash, content_type, content_length, response_headers, fetched_at,
  source_last_modified, created_at
) on public.county_hunter_discovery_snapshots to authenticated;
grant insert on public.county_hunter_discovery_snapshots to authenticated;
grant select, insert on public.county_hunter_discovery_records to authenticated;
grant select, insert on public.county_hunter_discovery_changes to authenticated;
grant select, insert, delete on public.county_hunter_discovery_locks to authenticated;

create policy county_hunter_discovery_snapshots_select
  on public.county_hunter_discovery_snapshots for select to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.view'))
  );
create policy county_hunter_discovery_snapshots_insert
  on public.county_hunter_discovery_snapshots for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  );

create policy county_hunter_discovery_records_select
  on public.county_hunter_discovery_records for select to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.view'))
  );
create policy county_hunter_discovery_records_insert
  on public.county_hunter_discovery_records for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  );

create policy county_hunter_discovery_changes_select
  on public.county_hunter_discovery_changes for select to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.view'))
  );
create policy county_hunter_discovery_changes_insert
  on public.county_hunter_discovery_changes for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  );

create policy county_hunter_discovery_locks_admin
  on public.county_hunter_discovery_locks for all to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  )
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  );

-- A manager may continue to maintain manual sources, but an adapter-managed
-- official source can only be created or changed by an administrator.
drop policy county_hunter_sources_insert on public.county_hunter_sources;
drop policy county_hunter_sources_update on public.county_hunter_sources;

create policy county_hunter_sources_manager_insert
  on public.county_hunter_sources for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and not managed_by_adapter
    and (select public.county_hunter_has_permission('county_hunter.manage'))
  );
create policy county_hunter_sources_admin_insert
  on public.county_hunter_sources for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  );
create policy county_hunter_sources_manager_update
  on public.county_hunter_sources for update to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and not managed_by_adapter
    and (select public.county_hunter_has_permission('county_hunter.manage'))
  )
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and not managed_by_adapter
    and (select public.county_hunter_has_permission('county_hunter.manage'))
  );
create policy county_hunter_sources_admin_update
  on public.county_hunter_sources for update to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  )
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  );

drop policy county_hunter_discovery_runs_insert on public.county_hunter_discovery_runs;
drop policy county_hunter_discovery_runs_update on public.county_hunter_discovery_runs;

create policy county_hunter_discovery_runs_insert
  on public.county_hunter_discovery_runs for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  );
create policy county_hunter_discovery_runs_update
  on public.county_hunter_discovery_runs for update to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  )
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  );

create or replace function public.county_hunter_configure_gwinnett_discovery()
returns table (county_id uuid, source_id uuid)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  calling_user uuid := auth.uid();
  calling_organization uuid := public.county_hunter_current_organization_id();
  georgia_id uuid;
  configured_county_id uuid;
  configured_source_id uuid;
begin
  if calling_user is null
     or calling_organization is null
     or not public.county_hunter_has_permission('county_hunter.admin') then
    raise exception 'County Hunter admin membership is required' using errcode = '42501';
  end if;

  insert into public.county_hunter_states (organization_id, code, name)
  values (calling_organization, 'GA', 'Georgia')
  on conflict (organization_id, code) do update set name = excluded.name
  returning id into georgia_id;

  insert into public.county_hunter_counties (
    organization_id,
    state_id,
    name,
    slug,
    tax_sale_authority,
    official_website_url,
    tax_sale_page_url,
    auction_type,
    typical_schedule,
    source_status,
    operational_notes,
    active,
    created_by
  ) values (
    calling_organization,
    georgia_id,
    'Gwinnett County',
    'gwinnett-county-ga',
    'Gwinnett County Tax Commissioner',
    'https://www.gwinnetttaxcommissioner.com/',
    'https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales',
    'in_person',
    'Dates are discovered from the official Tax Liens & Tax Sales page.',
    'active',
    'Phase 2 uses only the current official property-list document discovered from the official landing page.',
    true,
    calling_user
  )
  on conflict (organization_id, state_id, slug) do update set
    name = excluded.name,
    tax_sale_authority = excluded.tax_sale_authority,
    official_website_url = excluded.official_website_url,
    tax_sale_page_url = excluded.tax_sale_page_url,
    auction_type = excluded.auction_type,
    typical_schedule = excluded.typical_schedule,
    source_status = excluded.source_status,
    operational_notes = excluded.operational_notes,
    active = true,
    updated_at = now()
  returning id into configured_county_id;

  insert into public.county_hunter_sources (
    organization_id,
    county_id,
    name,
    source_type,
    url,
    is_official,
    status,
    coverage_percent,
    human_intervention_required,
    notes,
    created_by,
    adapter_key,
    adapter_version,
    official_hostnames,
    managed_by_adapter
  ) values (
    calling_organization,
    configured_county_id,
    'Gwinnett County Tax Commissioner - Current Tax Sale List',
    'tax_sale_current_list',
    'https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales',
    true,
    'active',
    100,
    false,
    'The landing page is authoritative; the current PDF URL is discovered on every run.',
    calling_user,
    'gwinnett-tax-sales',
    '1.0.0',
    '["www.gwinnetttaxcommissioner.com"]'::jsonb,
    true
  )
  on conflict on constraint county_hunter_sources_organization_id_county_id_name_key do update set
    source_type = excluded.source_type,
    url = excluded.url,
    is_official = true,
    status = excluded.status,
    coverage_percent = excluded.coverage_percent,
    human_intervention_required = false,
    notes = excluded.notes,
    adapter_key = excluded.adapter_key,
    adapter_version = excluded.adapter_version,
    official_hostnames = excluded.official_hostnames,
    managed_by_adapter = true,
    updated_at = now()
  returning id into configured_source_id;

  return query select configured_county_id, configured_source_id;
end;
$$;

create or replace function public.county_hunter_begin_discovery(
  p_source_id uuid,
  p_adapter_version text,
  p_lock_seconds integer default 300
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  calling_user uuid := auth.uid();
  calling_organization uuid := public.county_hunter_current_organization_id();
  configured_source public.county_hunter_sources%rowtype;
  new_run_id uuid := gen_random_uuid();
begin
  if calling_user is null
     or calling_organization is null
     or not public.county_hunter_has_permission('county_hunter.admin') then
    raise exception 'County Hunter admin membership is required' using errcode = '42501';
  end if;
  if p_lock_seconds < 30 or p_lock_seconds > 900 then
    raise exception 'Discovery lock duration is invalid' using errcode = '22023';
  end if;
  if p_adapter_version is null or char_length(p_adapter_version) > 64 then
    raise exception 'Discovery adapter version is invalid' using errcode = '22023';
  end if;

  select source.* into configured_source
  from public.county_hunter_sources source
  where source.id = p_source_id
    and source.organization_id = calling_organization
    and source.status = 'active'
    and source.is_official
    and source.managed_by_adapter
    and source.adapter_key = 'gwinnett-tax-sales';

  if not found then
    raise exception 'The approved Gwinnett discovery source is unavailable' using errcode = 'P0002';
  end if;

  delete from public.county_hunter_discovery_locks
  where source_id = p_source_id
    and organization_id = calling_organization
    and expires_at <= now();

  insert into public.county_hunter_discovery_runs (
    id,
    organization_id,
    county_id,
    source_id,
    status,
    adapter_version,
    landing_url,
    requested_by
  ) values (
    new_run_id,
    calling_organization,
    configured_source.county_id,
    configured_source.id,
    'queued',
    p_adapter_version,
    configured_source.url,
    calling_user
  );

  begin
    insert into public.county_hunter_discovery_locks (
      source_id,
      organization_id,
      run_id,
      expires_at
    ) values (
      configured_source.id,
      calling_organization,
      new_run_id,
      now() + make_interval(secs => p_lock_seconds)
    );
  exception when unique_violation then
    raise exception 'A discovery run already holds the source lock' using errcode = '55P03';
  end;

  update public.county_hunter_sources
  set last_attempt_at = now(), failure_reason = null
  where id = configured_source.id
    and organization_id = calling_organization;

  return new_run_id;
end;
$$;

create or replace function public.county_hunter_release_discovery_lock(p_run_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  calling_organization uuid := public.county_hunter_current_organization_id();
  removed_count integer;
begin
  if auth.uid() is null
     or calling_organization is null
     or not public.county_hunter_has_permission('county_hunter.admin') then
    raise exception 'County Hunter admin membership is required' using errcode = '42501';
  end if;

  delete from public.county_hunter_discovery_locks
  where run_id = p_run_id
    and organization_id = calling_organization;
  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

revoke all on function public.county_hunter_configure_gwinnett_discovery() from public, anon;
revoke all on function public.county_hunter_begin_discovery(uuid, text, integer) from public, anon;
revoke all on function public.county_hunter_release_discovery_lock(uuid) from public, anon;
grant execute on function public.county_hunter_configure_gwinnett_discovery() to authenticated;
grant execute on function public.county_hunter_begin_discovery(uuid, text, integer) to authenticated;
grant execute on function public.county_hunter_release_discovery_lock(uuid) to authenticated;

-- Recovery is intentionally explicit: disable the Gwinnett source, revoke the three
-- RPCs, and preserve runs/snapshots/records for audit. Destructive rollback requires
-- a separately reviewed migration and is not part of normal recovery.
