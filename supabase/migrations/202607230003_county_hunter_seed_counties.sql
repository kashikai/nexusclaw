-- NexusClaw County Hunter - idempotent Georgia county provisioning
-- No official URLs, dates, payment rules or auction formats are assumed.

create or replace function public.county_hunter_seed_georgia(p_organization_id uuid)
returns table (counties_created integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  georgia_id uuid;
  inserted_count integer;
begin
  if p_organization_id is null
     or p_organization_id <> (select public.county_hunter_current_organization_id())
     or not (select public.county_hunter_has_permission('county_hunter.admin')) then
    raise exception 'County Hunter organization or admin permission is invalid' using errcode = '42501';
  end if;

  insert into public.county_hunter_states (organization_id, code, name)
  values (p_organization_id, 'GA', 'Georgia')
  on conflict (organization_id, code) do update set name = excluded.name
  returning id into georgia_id;

  with inserted as (
    insert into public.county_hunter_counties (
      organization_id,
      state_id,
      name,
      slug,
      auction_type,
      source_status,
      active
    ) values
      (p_organization_id, georgia_id, 'Fulton County', 'fulton-county-ga', 'unknown', 'pending_manual_configuration', true),
      (p_organization_id, georgia_id, 'Cobb County', 'cobb-county-ga', 'unknown', 'pending_manual_configuration', true),
      (p_organization_id, georgia_id, 'Chatham County', 'chatham-county-ga', 'unknown', 'pending_manual_configuration', true),
      (p_organization_id, georgia_id, 'Greene County', 'greene-county-ga', 'unknown', 'pending_manual_configuration', true),
      (p_organization_id, georgia_id, 'Bryan County', 'bryan-county-ga', 'unknown', 'pending_manual_configuration', true),
      (p_organization_id, georgia_id, 'Camden County', 'camden-county-ga', 'unknown', 'pending_manual_configuration', true)
    on conflict (organization_id, state_id, slug) do nothing
    returning 1
  )
  select count(*)::integer into inserted_count from inserted;

  return query select inserted_count;
end;
$$;

revoke all on function public.county_hunter_seed_georgia(uuid) from public, anon;
grant execute on function public.county_hunter_seed_georgia(uuid) to authenticated;
