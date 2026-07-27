-- DESTRUCTIVE County Hunter Phase 2 rollback.
-- Never run on shared staging or production without an external backup and review.
-- Enable only in a disposable database:
--   set county_hunter.allow_destructive_phase2_rollback = 'YES';

begin;

do $$
begin
  if current_setting('county_hunter.allow_destructive_phase2_rollback', true) <> 'YES' then
    raise exception 'Explicit disposable-database rollback confirmation is required';
  end if;
  if exists (select 1 from public.county_hunter_discovery_locks) then
    raise exception 'Phase 2 rollback is blocked while discovery locks exist';
  end if;
end;
$$;

revoke all on function public.county_hunter_begin_snapshot_replay(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.county_hunter_configure_gwinnett_discovery()
  from public, anon, authenticated;
revoke all on function public.county_hunter_begin_discovery(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.county_hunter_release_discovery_lock(uuid)
  from public, anon, authenticated;

drop function public.county_hunter_begin_snapshot_replay(uuid, text, integer);
drop function public.county_hunter_configure_gwinnett_discovery();
drop function public.county_hunter_begin_discovery(uuid, text, integer);
drop function public.county_hunter_release_discovery_lock(uuid);

drop policy county_hunter_sources_manager_insert on public.county_hunter_sources;
drop policy county_hunter_sources_admin_insert on public.county_hunter_sources;
drop policy county_hunter_sources_manager_update on public.county_hunter_sources;
drop policy county_hunter_sources_admin_update on public.county_hunter_sources;
drop policy county_hunter_discovery_runs_insert on public.county_hunter_discovery_runs;
drop policy county_hunter_discovery_runs_update on public.county_hunter_discovery_runs;

alter table public.county_hunter_discovery_runs
  drop constraint county_hunter_discovery_runs_tenant_source_run_fk,
  drop constraint county_hunter_discovery_runs_replay_source_check,
  drop constraint county_hunter_discovery_runs_type_check,
  drop constraint county_hunter_runs_landing_snapshot_fk,
  drop constraint county_hunter_runs_document_snapshot_fk,
  drop constraint county_hunter_runs_tenant_source_fk;

alter table public.county_hunter_sources
  drop constraint county_hunter_sources_last_run_fk;

alter table public.county_hunter_properties
  drop constraint county_hunter_properties_tenant_source_fk,
  drop constraint county_hunter_properties_first_run_fk,
  drop constraint county_hunter_properties_last_run_fk;

alter table public.county_hunter_auctions
  drop constraint county_hunter_auctions_tenant_source_fk;

drop index public.county_hunter_discovery_runs_source_run_idx;
drop index public.county_hunter_discovery_runs_source_created_idx;
drop index public.county_hunter_properties_source_record_key_unique;
drop index public.county_hunter_auctions_source_sale_date_unique;

-- These tables contain the raw snapshots, parsed records, diffs and locks.
-- Dropping them permanently removes all Phase 2 provenance.
drop table public.county_hunter_discovery_changes;
drop table public.county_hunter_discovery_records;
drop table public.county_hunter_discovery_snapshots;
drop table public.county_hunter_discovery_locks;

-- Phase 2 runs cannot be represented by the Phase 1 schema and are removed.
delete from public.county_hunter_discovery_runs
where source_id is not null
   or adapter_version is not null
   or run_type = 'snapshot_replay';

delete from public.county_hunter_sources
where managed_by_adapter
  and adapter_key = 'gwinnett-tax-sales';

alter table public.county_hunter_discovery_runs
  drop constraint county_hunter_discovery_runs_org_id_unique,
  drop constraint county_hunter_discovery_runs_status_check,
  drop column run_type,
  drop column source_run_id,
  drop column source_id,
  drop column adapter_version,
  drop column landing_snapshot_id,
  drop column document_snapshot_id,
  drop column landing_url,
  drop column landing_final_url,
  drop column document_url,
  drop column document_final_url,
  drop column landing_hash,
  drop column document_hash,
  drop column landing_content_type,
  drop column document_content_type,
  drop column landing_size,
  drop column document_size,
  drop column sale_date,
  drop column document_published_at,
  drop column source_last_modified,
  drop column reason_codes,
  drop column candidate_documents,
  drop column added_count,
  drop column changed_count,
  drop column unchanged_count,
  drop column removed_count,
  drop column duplicate_count,
  drop column review_required,
  add constraint county_hunter_discovery_runs_status_check
    check (status in ('queued', 'running', 'completed', 'partial', 'failed'));

alter table public.county_hunter_sources
  drop column adapter_key,
  drop column adapter_version,
  drop column official_hostnames,
  drop column managed_by_adapter,
  drop column last_success_at,
  drop column last_document_url,
  drop column last_document_hash,
  drop column last_sale_date,
  drop column last_run_id;

alter table public.county_hunter_auctions
  drop column source_id,
  drop column document_url,
  drop column document_hash;

alter table public.county_hunter_properties
  drop column source_id,
  drop column source_record_key,
  drop column parcel_number_original,
  drop column amount_due,
  drop column source_record_hash,
  drop column source_record_status,
  drop column first_seen_run_id,
  drop column last_seen_run_id,
  drop column removed_at,
  drop column official_notes;

create policy county_hunter_sources_insert
  on public.county_hunter_sources for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.manage'))
  );
create policy county_hunter_sources_update
  on public.county_hunter_sources for update to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.manage'))
  )
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.manage'))
  );
create policy county_hunter_discovery_runs_insert
  on public.county_hunter_discovery_runs for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.run_discovery'))
  );
create policy county_hunter_discovery_runs_update
  on public.county_hunter_discovery_runs for update to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.run_discovery'))
  )
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
  );

commit;
