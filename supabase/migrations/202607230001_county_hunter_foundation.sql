-- NexusClaw County Hunter - additive foundation
-- This migration creates only county_hunter_* objects and does not alter existing tables.

create extension if not exists pgcrypto;

create table if not exists public.county_hunter_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  code text not null check (char_length(code) = 2),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.county_hunter_counties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  state_id uuid not null references public.county_hunter_states(id) on delete restrict,
  name text not null,
  slug text not null,
  tax_sale_authority text,
  official_website_url text,
  tax_sale_page_url text,
  assessor_url text,
  gis_url text,
  clerk_url text,
  legal_newspaper_name text,
  legal_newspaper_url text,
  auction_type text not null default 'unknown' check (auction_type in ('in_person', 'online', 'hybrid', 'unknown')),
  auction_location text,
  registration_rules text,
  payment_rules text,
  typical_schedule text,
  source_status text not null default 'pending_manual_configuration' check (source_status in ('active', 'degraded', 'unavailable', 'pending_manual_configuration')),
  last_checked_at timestamptz,
  operational_notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, state_id, slug)
);

create table if not exists public.county_hunter_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  county_id uuid not null references public.county_hunter_counties(id) on delete cascade,
  name text not null,
  source_type text not null,
  url text,
  is_official boolean not null default false,
  status text not null default 'pending_manual_configuration' check (status in ('active', 'degraded', 'unavailable', 'pending_manual_configuration')),
  coverage_percent numeric(5,2) not null default 0 check (coverage_percent between 0 and 100),
  last_attempt_at timestamptz,
  failure_reason text,
  human_intervention_required boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, county_id, name)
);

create table if not exists public.county_hunter_auctions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  county_id uuid not null references public.county_hunter_counties(id) on delete restrict,
  sale_date timestamptz,
  auction_type text not null default 'unknown' check (auction_type in ('in_person', 'online', 'hybrid', 'unknown')),
  location text,
  registration_deadline timestamptz,
  status text not null default 'unknown' check (status in ('discovered', 'confirmed', 'changed', 'cancelled', 'completed', 'unknown')),
  official_source_url text,
  property_count integer not null default 0 check (property_count >= 0),
  withdrawn_count integer not null default 0 check (withdrawn_count >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.county_hunter_auction_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  auction_id uuid not null references public.county_hunter_auctions(id) on delete cascade,
  source_id uuid references public.county_hunter_sources(id) on delete set null,
  source_url text not null,
  source_type text not null,
  content_hash text,
  snapshot_reference text,
  fetched_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'available', 'changed', 'unavailable', 'manual_review_required')),
  failure_reason text,
  created_at timestamptz not null default now(),
  unique (organization_id, auction_id, source_url)
);

create table if not exists public.county_hunter_properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  auction_id uuid not null references public.county_hunter_auctions(id) on delete restrict,
  county_id uuid not null references public.county_hunter_counties(id) on delete restrict,
  parcel_number text,
  address text,
  legal_description text,
  owner_name text,
  property_type text not null default 'unknown' check (property_type in ('single_family', 'multifamily', 'commercial', 'land', 'industrial', 'unknown')),
  land_area numeric(16,2),
  building_area numeric(16,2),
  year_built integer check (year_built is null or year_built between 1600 and 2200),
  assessed_value numeric(16,2) check (assessed_value is null or assessed_value >= 0),
  opening_bid numeric(16,2) check (opening_bid is null or opening_bid >= 0),
  estimated_value numeric(16,2) check (estimated_value is null or estimated_value >= 0),
  max_bid numeric(16,2) check (max_bid is null or max_bid >= 0),
  estimated_margin numeric(16,2),
  latitude numeric(10,7) check (latitude is null or latitude between -90 and 90),
  longitude numeric(10,7) check (longitude is null or longitude between -180 and 180),
  status text not null default 'discovered' check (status in ('discovered', 'resolving', 'analyzing', 'shortlisted', 'rejected', 'withdrawn', 'sold', 'manual_review')),
  data_coverage numeric(5,2) not null default 0 check (data_coverage between 0 and 100),
  confidence_score numeric(5,2) not null default 0 check (confidence_score between 0 and 100),
  risk_score numeric(5,2) check (risk_score is null or risk_score between 0 and 100),
  human_review_required boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, auction_id, parcel_number)
);

create table if not exists public.county_hunter_parcel_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  property_id uuid not null references public.county_hunter_properties(id) on delete cascade,
  external_parcel_id text,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  match_confidence numeric(5,2) not null default 0 check (match_confidence between 0 and 100),
  match_method text not null check (match_method in ('parcel_exact', 'address_exact', 'legal_description', 'owner_match', 'manual')),
  conflicts jsonb not null default '[]'::jsonb,
  source_url text,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.county_hunter_property_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  property_id uuid not null references public.county_hunter_properties(id) on delete cascade,
  source_url text not null,
  source_type text not null,
  content_hash text not null,
  content_reference text,
  normalized_data jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, property_id, source_url, content_hash)
);

create table if not exists public.county_hunter_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  property_id uuid not null references public.county_hunter_properties(id) on delete cascade,
  overall_risk text not null check (overall_risk in ('low', 'medium', 'high', 'inconclusive')),
  score numeric(5,2) not null check (score between 0 and 100),
  findings jsonb not null default '[]'::jsonb,
  human_review_required boolean not null default false,
  coverage_notes text,
  analysis_version text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.county_hunter_valuation_scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  property_id uuid not null references public.county_hunter_properties(id) on delete cascade,
  scenario text not null check (scenario in ('conservative', 'probable', 'optimistic')),
  exit_value numeric(16,2),
  estimated_rent numeric(16,2),
  renovation_cost numeric(16,2) not null default 0,
  legal_cost numeric(16,2) not null default 0,
  quiet_title_cost numeric(16,2) not null default 0,
  redemption_foreclosure_cost numeric(16,2) not null default 0,
  occupancy_cost numeric(16,2) not null default 0,
  additional_taxes numeric(16,2) not null default 0,
  selling_cost numeric(16,2) not null default 0,
  contingency_reserve numeric(16,2) not null default 0,
  minimum_profit numeric(16,2) not null default 0,
  calculated_max_bid numeric(16,2),
  input_metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, property_id, scenario)
);

create table if not exists public.county_hunter_shortlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  property_id uuid not null references public.county_hunter_properties(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'rejected', 'inspection', 'legal_review', 'local_representative', 'archived')),
  notes text,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, property_id)
);

create table if not exists public.county_hunter_monitoring_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  property_id uuid references public.county_hunter_properties(id) on delete cascade,
  auction_id uuid references public.county_hunter_auctions(id) on delete cascade,
  source_id uuid references public.county_hunter_sources(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  summary text not null,
  previous_value jsonb,
  current_value jsonb,
  source_url text,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.county_hunter_review_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  property_id uuid references public.county_hunter_properties(id) on delete cascade,
  county_id uuid not null references public.county_hunter_counties(id) on delete restrict,
  task_type text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  description text not null,
  source_url text,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  due_at timestamptz,
  notes text,
  result text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.county_hunter_discovery_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  county_id uuid not null references public.county_hunter_counties(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'partial', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  sources_checked integer not null default 0 check (sources_checked >= 0),
  auctions_found integer not null default 0 check (auctions_found >= 0),
  properties_found integer not null default 0 check (properties_found >= 0),
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  requested_by uuid references auth.users(id) on delete set null,
  worker_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.county_hunter_bid_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  property_id uuid not null references public.county_hunter_properties(id) on delete restrict,
  auction_id uuid not null references public.county_hunter_auctions(id) on delete restrict,
  approved_max_bid numeric(16,2) not null check (approved_max_bid >= 0),
  approval_status text not null default 'draft' check (approval_status in ('draft', 'approved', 'revoked')),
  local_representative text,
  attendance_confirmed boolean not null default false,
  instructions text not null default '',
  result text check (result is null or result in ('won', 'lost', 'withdrawn', 'not_attended')),
  winning_bid numeric(16,2) check (winning_bid is null or winning_bid >= 0),
  evidence_files jsonb not null default '[]'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, property_id, auction_id)
);

create table if not exists public.county_hunter_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique,
  maximum_capital numeric(16,2),
  minimum_margin numeric(8,2),
  maximum_risk_score numeric(5,2) check (maximum_risk_score is null or maximum_risk_score between 0 and 100),
  enabled_property_types jsonb not null default '[]'::jsonb,
  default_costs jsonb not null default '{}'::jsonb,
  contingency_reserve numeric(16,2),
  minimum_profit numeric(16,2),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.county_hunter_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_agent text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  source_url text,
  content_hash text,
  analysis_version text,
  previous_data jsonb,
  current_data jsonb,
  human_decision text,
  manual_override boolean not null default false,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Composite tenant keys prevent a row from referencing an entity owned by another organization.
alter table public.county_hunter_states add constraint county_hunter_states_org_id_unique unique (organization_id, id);
alter table public.county_hunter_counties add constraint county_hunter_counties_org_id_unique unique (organization_id, id);
alter table public.county_hunter_sources add constraint county_hunter_sources_org_id_unique unique (organization_id, id);
alter table public.county_hunter_auctions add constraint county_hunter_auctions_org_id_unique unique (organization_id, id);
alter table public.county_hunter_properties add constraint county_hunter_properties_org_id_unique unique (organization_id, id);

alter table public.county_hunter_counties add constraint county_hunter_counties_tenant_state_fk foreign key (organization_id, state_id) references public.county_hunter_states(organization_id, id);
alter table public.county_hunter_sources add constraint county_hunter_sources_tenant_county_fk foreign key (organization_id, county_id) references public.county_hunter_counties(organization_id, id);
alter table public.county_hunter_auctions add constraint county_hunter_auctions_tenant_county_fk foreign key (organization_id, county_id) references public.county_hunter_counties(organization_id, id);
alter table public.county_hunter_auction_sources add constraint county_hunter_auction_sources_tenant_auction_fk foreign key (organization_id, auction_id) references public.county_hunter_auctions(organization_id, id);
alter table public.county_hunter_auction_sources add constraint county_hunter_auction_sources_tenant_source_fk foreign key (organization_id, source_id) references public.county_hunter_sources(organization_id, id);
alter table public.county_hunter_properties add constraint county_hunter_properties_tenant_auction_fk foreign key (organization_id, auction_id) references public.county_hunter_auctions(organization_id, id);
alter table public.county_hunter_properties add constraint county_hunter_properties_tenant_county_fk foreign key (organization_id, county_id) references public.county_hunter_counties(organization_id, id);
alter table public.county_hunter_parcel_matches add constraint county_hunter_parcel_matches_tenant_property_fk foreign key (organization_id, property_id) references public.county_hunter_properties(organization_id, id);
alter table public.county_hunter_property_snapshots add constraint county_hunter_property_snapshots_tenant_property_fk foreign key (organization_id, property_id) references public.county_hunter_properties(organization_id, id);
alter table public.county_hunter_risk_assessments add constraint county_hunter_risks_tenant_property_fk foreign key (organization_id, property_id) references public.county_hunter_properties(organization_id, id);
alter table public.county_hunter_valuation_scenarios add constraint county_hunter_valuations_tenant_property_fk foreign key (organization_id, property_id) references public.county_hunter_properties(organization_id, id);
alter table public.county_hunter_shortlists add constraint county_hunter_shortlists_tenant_property_fk foreign key (organization_id, property_id) references public.county_hunter_properties(organization_id, id);
alter table public.county_hunter_monitoring_events add constraint county_hunter_events_tenant_property_fk foreign key (organization_id, property_id) references public.county_hunter_properties(organization_id, id);
alter table public.county_hunter_monitoring_events add constraint county_hunter_events_tenant_auction_fk foreign key (organization_id, auction_id) references public.county_hunter_auctions(organization_id, id);
alter table public.county_hunter_monitoring_events add constraint county_hunter_events_tenant_source_fk foreign key (organization_id, source_id) references public.county_hunter_sources(organization_id, id);
alter table public.county_hunter_review_tasks add constraint county_hunter_reviews_tenant_property_fk foreign key (organization_id, property_id) references public.county_hunter_properties(organization_id, id);
alter table public.county_hunter_review_tasks add constraint county_hunter_reviews_tenant_county_fk foreign key (organization_id, county_id) references public.county_hunter_counties(organization_id, id);
alter table public.county_hunter_discovery_runs add constraint county_hunter_runs_tenant_county_fk foreign key (organization_id, county_id) references public.county_hunter_counties(organization_id, id);
alter table public.county_hunter_bid_assignments add constraint county_hunter_bids_tenant_property_fk foreign key (organization_id, property_id) references public.county_hunter_properties(organization_id, id);
alter table public.county_hunter_bid_assignments add constraint county_hunter_bids_tenant_auction_fk foreign key (organization_id, auction_id) references public.county_hunter_auctions(organization_id, id);

create index if not exists county_hunter_states_org_idx on public.county_hunter_states (organization_id);
create index if not exists county_hunter_counties_org_state_idx on public.county_hunter_counties (organization_id, state_id);
create index if not exists county_hunter_counties_source_status_idx on public.county_hunter_counties (organization_id, source_status);
create index if not exists county_hunter_sources_county_status_idx on public.county_hunter_sources (organization_id, county_id, status);
create index if not exists county_hunter_auctions_date_idx on public.county_hunter_auctions (organization_id, sale_date);
create index if not exists county_hunter_auctions_county_idx on public.county_hunter_auctions (organization_id, county_id);
create index if not exists county_hunter_properties_parcel_idx on public.county_hunter_properties (organization_id, parcel_number);
create index if not exists county_hunter_properties_status_idx on public.county_hunter_properties (organization_id, status);
create index if not exists county_hunter_properties_risk_idx on public.county_hunter_properties (organization_id, risk_score);
create index if not exists county_hunter_properties_auction_idx on public.county_hunter_properties (organization_id, auction_id);
create index if not exists county_hunter_review_tasks_status_idx on public.county_hunter_review_tasks (organization_id, status, priority);
create index if not exists county_hunter_discovery_runs_county_idx on public.county_hunter_discovery_runs (organization_id, county_id, created_at desc);
create index if not exists county_hunter_monitoring_events_created_idx on public.county_hunter_monitoring_events (organization_id, created_at desc);
create index if not exists county_hunter_audit_logs_entity_idx on public.county_hunter_audit_logs (organization_id, entity_type, entity_id, created_at desc);

create or replace function public.county_hunter_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'county_hunter_states', 'county_hunter_counties', 'county_hunter_sources',
    'county_hunter_auctions', 'county_hunter_properties', 'county_hunter_parcel_matches',
    'county_hunter_valuation_scenarios', 'county_hunter_shortlists', 'county_hunter_review_tasks',
    'county_hunter_discovery_runs', 'county_hunter_bid_assignments', 'county_hunter_settings'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.county_hunter_set_updated_at()',
      table_name || '_updated_at', table_name
    );
  end loop;
end;
$$;

-- Rollback (manual, destructive): drop county_hunter_* tables in reverse dependency order,
-- then drop public.county_hunter_set_updated_at(). Existing NexusClaw objects are unaffected.
