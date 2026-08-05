-- NexusClaw County Hunter - Phase 1.1 membership authorization and bootstrap hardening

create table if not exists public.county_hunter_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null,
  permissions text[] not null default '{}'::text[] check (
    permissions <@ array[
      'county_hunter.view',
      'county_hunter.manage',
      'county_hunter.run_discovery',
      'county_hunter.approve_bid',
      'county_hunter.admin'
    ]::text[]
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create index if not exists county_hunter_memberships_org_user_idx
  on public.county_hunter_memberships (organization_id, user_id)
  where active;

do $$
declare
  existing_definition text;
begin
  select pg_catalog.pg_get_indexdef(index_relation.oid)
    into existing_definition
  from pg_catalog.pg_class index_relation
  join pg_catalog.pg_namespace namespace on namespace.oid = index_relation.relnamespace
  join pg_catalog.pg_index index_row on index_row.indexrelid = index_relation.oid
  where namespace.nspname = 'public'
    and index_relation.relname = 'county_hunter_memberships_org_user_idx';

  if existing_definition is null
     or lower(regexp_replace(existing_definition, '\s+', '', 'g')) <>
        lower(regexp_replace(
          'CREATE INDEX county_hunter_memberships_org_user_idx ON public.county_hunter_memberships USING btree (organization_id, user_id) WHERE active',
          '\s+', '', 'g'
        )) then
    raise exception 'County Hunter migration conflict for index county_hunter_memberships_org_user_idx: definition differs';
  end if;
end;
$$;

do $$
declare
  existing_definition text;
begin
  select pg_catalog.pg_get_triggerdef(trigger_row.oid, true)
    into existing_definition
  from pg_catalog.pg_trigger trigger_row
  where trigger_row.tgrelid = 'public.county_hunter_memberships'::regclass
    and trigger_row.tgname = 'county_hunter_memberships_updated_at'
    and not trigger_row.tgisinternal;

  if existing_definition is null then
    create trigger county_hunter_memberships_updated_at
      before update on public.county_hunter_memberships
      for each row execute function public.county_hunter_set_updated_at();
  elsif lower(regexp_replace(replace(existing_definition, 'public.', ''), '\s+', '', 'g')) <>
        lower(regexp_replace(
          'CREATE TRIGGER county_hunter_memberships_updated_at BEFORE UPDATE ON county_hunter_memberships FOR EACH ROW EXECUTE FUNCTION county_hunter_set_updated_at()',
          '\s+', '', 'g'
        )) then
    raise exception 'County Hunter migration conflict for trigger county_hunter_memberships_updated_at: definition differs';
  end if;
end;
$$;

alter table public.county_hunter_memberships enable row level security;
alter table public.county_hunter_memberships force row level security;
revoke all on public.county_hunter_memberships from anon, authenticated;
grant select on public.county_hunter_memberships to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policy policy_row
    where policy_row.polrelid = 'public.county_hunter_memberships'::regclass
      and policy_row.polname = 'county_hunter_memberships_select'
  ) then
    create policy county_hunter_memberships_select
      on public.county_hunter_memberships for select to authenticated
      using (
        user_id = (select auth.uid())
        and organization_id = (select public.county_hunter_current_organization_id())
        and active
      );
  end if;
end;
$$;

-- Permissions are sourced from the membership table, never from client-controlled
-- input or user_metadata. Admin is an explicit superset for County Hunter operations.
create or replace function public.county_hunter_has_permission(required_permission text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.county_hunter_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.organization_id = (select public.county_hunter_current_organization_id())
      and membership.active
      and (
        required_permission = any(membership.permissions)
        or 'county_hunter.admin' = any(membership.permissions)
      )
  );
$$;

revoke all on function public.county_hunter_has_permission(text) from public;
grant execute on function public.county_hunter_has_permission(text) to authenticated;

-- Remove the organization argument entirely. The trusted JWT app_metadata claim and
-- matching active membership are the only tenant inputs accepted by this RPC.
drop function if exists public.county_hunter_seed_georgia(uuid);

create or replace function public.county_hunter_seed_georgia()
returns table (counties_created integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  calling_user uuid := auth.uid();
  calling_organization uuid := public.county_hunter_current_organization_id();
  georgia_id uuid;
  inserted_count integer;
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

  insert into public.county_hunter_states (organization_id, code, name)
  values (calling_organization, 'GA', 'Georgia')
  on conflict (organization_id, code) do nothing
  returning id into georgia_id;

  if georgia_id is null then
    select state.id into georgia_id
    from public.county_hunter_states state
    where state.organization_id = calling_organization and state.code = 'GA';
  end if;

  with inserted as (
    insert into public.county_hunter_counties (
      organization_id,
      state_id,
      name,
      slug,
      auction_type,
      source_status,
      active,
      created_by
    ) values
      (calling_organization, georgia_id, 'Fulton County', 'fulton-county-ga', 'unknown', 'pending_manual_configuration', true, calling_user),
      (calling_organization, georgia_id, 'Cobb County', 'cobb-county-ga', 'unknown', 'pending_manual_configuration', true, calling_user),
      (calling_organization, georgia_id, 'Chatham County', 'chatham-county-ga', 'unknown', 'pending_manual_configuration', true, calling_user),
      (calling_organization, georgia_id, 'Greene County', 'greene-county-ga', 'unknown', 'pending_manual_configuration', true, calling_user),
      (calling_organization, georgia_id, 'Bryan County', 'bryan-county-ga', 'unknown', 'pending_manual_configuration', true, calling_user),
      (calling_organization, georgia_id, 'Camden County', 'camden-county-ga', 'unknown', 'pending_manual_configuration', true, calling_user)
    on conflict (organization_id, state_id, slug) do nothing
    returning 1
  )
  select count(*)::integer into inserted_count from inserted;

  insert into public.county_hunter_audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    current_data,
    manual_override
  ) values (
    calling_organization,
    calling_user,
    'bootstrap',
    'county_hunter_seed_georgia',
    jsonb_build_object('counties_created', inserted_count),
    true
  );

  return query select inserted_count;
end;
$$;

revoke all on function public.county_hunter_seed_georgia() from public, anon;
grant execute on function public.county_hunter_seed_georgia() to authenticated;

-- Recovery: revoke execute on county_hunter_seed_georgia(), restore the prior
-- permission function/RPC from migrations 002-003, then drop memberships last.
