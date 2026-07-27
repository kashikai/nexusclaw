-- NexusClaw County Hunter - Phase 2 administrative snapshot replay
-- Replay is additive, tenant-scoped and never changes the original snapshot.

alter table public.county_hunter_discovery_runs
  add column run_type text not null default 'official_fetch',
  add column source_run_id uuid;

alter table public.county_hunter_discovery_runs
  add constraint county_hunter_discovery_runs_type_check
    check (run_type in ('official_fetch', 'snapshot_replay')),
  add constraint county_hunter_discovery_runs_replay_source_check
    check (
      (run_type = 'official_fetch' and source_run_id is null)
      or
      (run_type = 'snapshot_replay' and source_run_id is not null)
    ),
  add constraint county_hunter_discovery_runs_tenant_source_run_fk
    foreign key (organization_id, source_run_id)
    references public.county_hunter_discovery_runs(organization_id, id)
    on delete restrict;

create index county_hunter_discovery_runs_source_run_idx
  on public.county_hunter_discovery_runs (
    organization_id,
    source_run_id,
    created_at desc
  )
  where source_run_id is not null;

create or replace function public.county_hunter_begin_snapshot_replay(
  p_snapshot_id uuid,
  p_adapter_version text,
  p_lock_seconds integer default 300
)
returns table (
  run_id uuid,
  snapshot_id uuid,
  source_run_id uuid,
  source_id uuid,
  county_id uuid,
  source_sale_date date,
  source_document_url text,
  source_document_hash text,
  snapshot_content_type text,
  snapshot_content_length bigint,
  snapshot_content_base64 text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  calling_user uuid := auth.uid();
  calling_organization uuid := public.county_hunter_current_organization_id();
  selected_snapshot public.county_hunter_discovery_snapshots%rowtype;
  selected_source_run public.county_hunter_discovery_runs%rowtype;
  selected_source public.county_hunter_sources%rowtype;
  new_run_id uuid := gen_random_uuid();
begin
  if calling_user is null
     or calling_organization is null
     or not exists (
       select 1
       from public.county_hunter_memberships membership
       where membership.user_id = calling_user
         and membership.organization_id = calling_organization
         and membership.active
         and 'county_hunter.admin' = any(membership.permissions)
     ) then
    raise exception 'County Hunter admin membership is required' using errcode = '42501';
  end if;
  if p_snapshot_id is null then
    raise exception 'Replay snapshot is required' using errcode = '22023';
  end if;
  if p_adapter_version is null
     or char_length(p_adapter_version) < 1
     or char_length(p_adapter_version) > 64
     or p_adapter_version !~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$' then
    raise exception 'Replay adapter version is invalid' using errcode = '22023';
  end if;
  if p_lock_seconds < 30 or p_lock_seconds > 900 then
    raise exception 'Replay lock duration is invalid' using errcode = '22023';
  end if;

  select snapshot.* into selected_snapshot
  from public.county_hunter_discovery_snapshots snapshot
  where snapshot.id = p_snapshot_id
    and snapshot.organization_id = calling_organization
    and snapshot.snapshot_kind = 'official_document'
    and snapshot.content_type = 'application/pdf';

  if not found then
    raise exception 'Replay snapshot was not found' using errcode = 'P0002';
  end if;

  select discovery_run.* into selected_source_run
  from public.county_hunter_discovery_runs discovery_run
  where discovery_run.id = selected_snapshot.run_id
    and discovery_run.organization_id = calling_organization
    and discovery_run.document_snapshot_id = selected_snapshot.id;

  if not found then
    raise exception 'Replay source run was not found' using errcode = 'P0002';
  end if;

  select source.* into selected_source
  from public.county_hunter_sources source
  where source.id = selected_snapshot.source_id
    and source.organization_id = calling_organization
    and source.county_id = selected_source_run.county_id
    and source.is_official
    and source.managed_by_adapter
    and source.adapter_key = 'gwinnett-tax-sales';

  if not found then
    raise exception 'Replay source is not an approved Gwinnett adapter' using errcode = 'P0002';
  end if;

  delete from public.county_hunter_discovery_locks discovery_lock
  where discovery_lock.source_id = selected_source.id
    and discovery_lock.organization_id = calling_organization
    and discovery_lock.expires_at <= now();

  insert into public.county_hunter_discovery_runs (
    id,
    organization_id,
    county_id,
    source_id,
    status,
    run_type,
    source_run_id,
    adapter_version,
    landing_snapshot_id,
    document_snapshot_id,
    landing_url,
    landing_final_url,
    document_url,
    document_final_url,
    landing_hash,
    document_hash,
    landing_content_type,
    document_content_type,
    landing_size,
    document_size,
    sale_date,
    document_published_at,
    source_last_modified,
    requested_by,
    sources_checked
  ) values (
    new_run_id,
    calling_organization,
    selected_source_run.county_id,
    selected_source.id,
    'queued',
    'snapshot_replay',
    selected_source_run.id,
    p_adapter_version,
    selected_source_run.landing_snapshot_id,
    selected_snapshot.id,
    selected_source_run.landing_url,
    selected_source_run.landing_final_url,
    selected_snapshot.original_url,
    selected_snapshot.final_url,
    selected_source_run.landing_hash,
    selected_snapshot.content_hash,
    selected_source_run.landing_content_type,
    selected_snapshot.content_type,
    selected_source_run.landing_size,
    selected_snapshot.content_length,
    selected_source_run.sale_date,
    selected_source_run.document_published_at,
    selected_snapshot.source_last_modified,
    calling_user,
    0
  );

  begin
    insert into public.county_hunter_discovery_locks (
      source_id,
      organization_id,
      run_id,
      expires_at
    ) values (
      selected_source.id,
      calling_organization,
      new_run_id,
      now() + make_interval(secs => p_lock_seconds)
    );
  exception when unique_violation then
    raise exception 'A discovery run already holds the source lock' using errcode = '55P03';
  end;

  return query
  select
    new_run_id,
    selected_snapshot.id,
    selected_source_run.id,
    selected_source.id,
    selected_source_run.county_id,
    selected_source_run.sale_date,
    selected_snapshot.final_url,
    selected_snapshot.content_hash,
    selected_snapshot.content_type,
    selected_snapshot.content_length,
    selected_snapshot.content_base64;
end;
$$;

revoke all on function public.county_hunter_begin_snapshot_replay(uuid, text, integer)
  from public, anon;
grant execute on function public.county_hunter_begin_snapshot_replay(uuid, text, integer)
  to authenticated;

-- Recovery is non-destructive: revoke the replay RPC first. The new run metadata
-- columns remain backward compatible. A destructive rollback is documented and
-- must run only after backing up replay runs and their dependent records/changes.
