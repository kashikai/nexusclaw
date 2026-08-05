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

-- Policies created by later migrations may intentionally supersede these
-- baseline policies. On replay, preserve an existing named policy instead of
-- briefly replacing it with an older definition.
create or replace function pg_temp.county_hunter_create_policy_if_absent(
  p_table regclass,
  p_policy_name text,
  p_ddl text
)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policy policy_row
    where policy_row.polrelid = p_table
      and policy_row.polname = p_policy_name
  ) then
    execute p_ddl;
  end if;
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
    'county_hunter_shortlists', 'county_hunter_monitoring_events',
    'county_hunter_review_tasks', 'county_hunter_discovery_runs',
    'county_hunter_bid_assignments', 'county_hunter_settings', 'county_hunter_audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    perform pg_temp.county_hunter_create_policy_if_absent(
      format('public.%I', table_name)::regclass,
      table_name || '_select',
      format(
        'create policy %I on public.%I for select to authenticated using (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.view'')))',
        table_name || '_select', table_name
      )
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
    -- Source write policies are installed once with their final managed-adapter
    -- boundary by the Gwinnett discovery migration.
    if table_name <> 'county_hunter_sources' then
      perform pg_temp.county_hunter_create_policy_if_absent(
        format('public.%I', table_name)::regclass,
        table_name || '_insert',
        format(
          'create policy %I on public.%I for insert to authenticated with check (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.manage'')))',
          table_name || '_insert', table_name
        )
      );
      perform pg_temp.county_hunter_create_policy_if_absent(
        format('public.%I', table_name)::regclass,
        table_name || '_update',
        format(
          'create policy %I on public.%I for update to authenticated using (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.manage''))) with check (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.manage'')))',
          table_name || '_update', table_name
        )
      );
    end if;
    perform pg_temp.county_hunter_create_policy_if_absent(
      format('public.%I', table_name)::regclass,
      table_name || '_delete',
      format(
        'create policy %I on public.%I for delete to authenticated using (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.admin'')))',
        table_name || '_delete', table_name
      )
    );
  end loop;
end;
$$;

grant insert, update on public.county_hunter_discovery_runs to authenticated;
-- Discovery-run write policies are installed once with their final admin-only
-- authorization by the Gwinnett discovery migration.

grant insert, update on public.county_hunter_bid_assignments to authenticated;
do $$
begin
  perform pg_temp.county_hunter_create_policy_if_absent(
    'public.county_hunter_bid_assignments'::regclass,
    'county_hunter_bid_assignments_insert',
    'create policy county_hunter_bid_assignments_insert on public.county_hunter_bid_assignments for insert to authenticated with check (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.manage'')) and approval_status = ''draft'')'
  );
  perform pg_temp.county_hunter_create_policy_if_absent(
    'public.county_hunter_bid_assignments'::regclass,
    'county_hunter_bid_assignments_update',
    'create policy county_hunter_bid_assignments_update on public.county_hunter_bid_assignments for update to authenticated using (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.approve_bid''))) with check (organization_id = (select public.county_hunter_current_organization_id()))'
  );
end;
$$;

grant insert, update on public.county_hunter_settings to authenticated;
do $$
begin
  perform pg_temp.county_hunter_create_policy_if_absent(
    'public.county_hunter_settings'::regclass,
    'county_hunter_settings_insert',
    'create policy county_hunter_settings_insert on public.county_hunter_settings for insert to authenticated with check (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.admin'')))'
  );
  perform pg_temp.county_hunter_create_policy_if_absent(
    'public.county_hunter_settings'::regclass,
    'county_hunter_settings_update',
    'create policy county_hunter_settings_update on public.county_hunter_settings for update to authenticated using (organization_id = (select public.county_hunter_current_organization_id()) and (select public.county_hunter_has_permission(''county_hunter.admin''))) with check (organization_id = (select public.county_hunter_current_organization_id()))'
  );
end;
$$;

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

create or replace function pg_temp.county_hunter_ensure_trigger(
  p_table regclass,
  p_trigger_name text,
  p_expected_definition text,
  p_ddl text
)
returns void
language plpgsql
as $$
declare
  existing_definition text;
begin
  select pg_catalog.pg_get_triggerdef(trigger_row.oid, true)
    into existing_definition
  from pg_catalog.pg_trigger trigger_row
  where trigger_row.tgrelid = p_table
    and trigger_row.tgname = p_trigger_name
    and not trigger_row.tgisinternal;

  if existing_definition is null then
    execute p_ddl;
    return;
  end if;

  if lower(regexp_replace(replace(existing_definition, 'public.', ''), '\s+', '', 'g')) <>
     lower(regexp_replace(replace(p_expected_definition, 'public.', ''), '\s+', '', 'g')) then
    raise exception 'County Hunter migration conflict for trigger %: definition differs', p_trigger_name;
  end if;
end;
$$;

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
    perform pg_temp.county_hunter_ensure_trigger(
      format('public.%I', table_name)::regclass,
      table_name || '_audit',
      format(
        'create trigger %I after insert or delete or update on %I for each row execute function county_hunter_write_audit_log()',
        table_name || '_audit', table_name
      ),
      format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.county_hunter_write_audit_log()',
        table_name || '_audit', table_name
      )
    );
  end loop;
end;
$$;

-- All policies fail closed when organization_id or permissions are absent from app_metadata.
