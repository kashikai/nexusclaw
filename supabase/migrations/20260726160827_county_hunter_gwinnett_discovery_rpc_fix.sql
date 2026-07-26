-- Fix PL/pgSQL output-column ambiguity in the idempotent Gwinnett source RPC.
-- The original Phase 2 migration is also corrected for clean installations.

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

revoke all on function public.county_hunter_configure_gwinnett_discovery() from public, anon;
grant execute on function public.county_hunter_configure_gwinnett_discovery() to authenticated;
