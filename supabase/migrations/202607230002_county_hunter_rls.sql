-- NexusClaw County Hunter - RLS, permissions and append-only audit trail

create or replace function public.county_hunter_current_organization_id()
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  claim text;
begin
  claim := (select auth.jwt()) -> 'app_metadata' ->> 'organization_id';
  if claim is null or claim = '' then return null; end if;
  return claim::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function public.county_hunter_has_permission(required_permission text)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    coalesce((select auth.jwt()) -> 'app_metadata' -> 'permissions', '[]'::jsonb) ? required_permission
    or coalesce((select auth.jwt()) -> 'app_metadata' -> 'permissions', '[]'::jsonb) ? 'county_hunter.admin';
$$;

revoke all on function public.county_hunter_current_organization_id() from public;
revoke all on function public.county_hunter_has_permission(text) from public;
grant execute on function public.county_hunter_current_organization_id() to authenticated;
grant execute on function public.county_hunter_has_permission(text) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'county_hunter_states', 'county_hunter_counties', 'county_hunter_sources',
    'county_hunter_auctions', 'county_hunter_auction_sources', 'county_hunter_properties',
    'county_hunter_parcel_matches', 'county_hunter_property_snapshots',
    'county_hunter_risk_assessments', 'county_hunter_valuation_scenarios',
    'county_hunter_shortlists', 'county_hunter_monitoring_events',
    'county_hunter_review_tasks', 'county_hunter_discovery_runs',
    'county_hunter_bid_assignments', 'county_hunter_settings', 'county_hunter_audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.view'')))',
      table_name || '_select', table_name
    );
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'county_hunter_states', 'county_hunter_counties', 'county_hunter_sources',
    'county_hunter_auctions', 'county_hunter_auction_sources', 'county_hunter_properties',
    'county_hunter_parcel_matches', 'county_hunter_property_snapshots',
    'county_hunter_risk_assessments', 'county_hunter_valuation_scenarios',
    'county_hunter_shortlists', 'county_hunter_monitoring_events', 'county_hunter_review_tasks'
  ] loop
    execute format('grant insert, update, delete on public.%I to authenticated', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.manage'')))',
      table_name || '_insert', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.manage''))) with check (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.manage'')))',
      table_name || '_update', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.admin'')))',
      table_name || '_delete', table_name
    );
  end loop;
end;
$$;

grant insert, update on public.county_hunter_discovery_runs to authenticated;
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
  with check (organization_id = (select public.county_hunter_current_organization_id()));

grant insert, update on public.county_hunter_bid_assignments to authenticated;
create policy county_hunter_bid_assignments_insert
  on public.county_hunter_bid_assignments for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.manage'))
    and approval_status = 'draft'
  );
create policy county_hunter_bid_assignments_update
  on public.county_hunter_bid_assignments for update to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.approve_bid'))
  )
  with check (organization_id = (select public.county_hunter_current_organization_id()));

grant insert, update on public.county_hunter_settings to authenticated;
create policy county_hunter_settings_insert
  on public.county_hunter_settings for insert to authenticated
  with check (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  );
create policy county_hunter_settings_update
  on public.county_hunter_settings for update to authenticated
  using (
    organization_id = (select public.county_hunter_current_organization_id())
    and (select public.county_hunter_has_permission('county_hunter.admin'))
  )
  with check (organization_id = (select public.county_hunter_current_organization_id()));

revoke insert, update, delete on public.county_hunter_audit_logs from authenticated;

create or replace function public.county_hunter_write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row jsonb;
  after_row jsonb;
  row_data jsonb;
begin
  before_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  after_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  row_data := coalesce(after_row, before_row);

  insert into public.county_hunter_audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    previous_data,
    current_data,
    manual_override
  ) values (
    (row_data ->> 'organization_id')::uuid,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    (row_data ->> 'id')::uuid,
    before_row,
    after_row,
    false
  );

  return null;
end;
$$;

revoke all on function public.county_hunter_write_audit_log() from public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'county_hunter_counties', 'county_hunter_sources', 'county_hunter_auctions',
    'county_hunter_properties', 'county_hunter_parcel_matches',
    'county_hunter_risk_assessments', 'county_hunter_valuation_scenarios',
    'county_hunter_shortlists', 'county_hunter_review_tasks',
    'county_hunter_discovery_runs', 'county_hunter_bid_assignments', 'county_hunter_settings'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_audit', table_name);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.county_hunter_write_audit_log()',
      table_name || '_audit', table_name
    );
  end loop;
end;
$$;

-- All policies fail closed when organization_id or permissions are absent from app_metadata.
