export type CountyHunterPermission =
  | 'county_hunter.view'
  | 'county_hunter.manage'
  | 'county_hunter.run_discovery'
  | 'county_hunter.approve_bid'
  | 'county_hunter.admin'

export type SourceStatus =
  | 'active'
  | 'degraded'
  | 'unavailable'
  | 'pending_manual_configuration'

export type AuctionType = 'in_person' | 'online' | 'hybrid' | 'unknown'

export type CountyHunterCounty = {
  id: string
  organization_id: string
  state_id: string
  name: string
  slug: string
  tax_sale_authority: string | null
  official_website_url: string | null
  tax_sale_page_url: string | null
  assessor_url: string | null
  gis_url: string | null
  clerk_url: string | null
  legal_newspaper_name: string | null
  legal_newspaper_url: string | null
  auction_type: AuctionType
  auction_location: string | null
  registration_rules: string | null
  payment_rules: string | null
  typical_schedule: string | null
  source_status: SourceStatus
  last_checked_at: string | null
  operational_notes: string | null
  active: boolean
  created_at: string
  updated_at: string
  state?: { code: string; name: string } | null
}

export type CountyHunterSource = {
  id: string
  organization_id: string
  county_id: string
  name: string
  source_type: string
  url: string | null
  is_official: boolean
  status: SourceStatus
  coverage_percent: number
  last_attempt_at: string | null
  failure_reason: string | null
  human_intervention_required: boolean
  notes: string | null
  adapter_key: string | null
  adapter_version: string | null
  official_hostnames: string[]
  managed_by_adapter: boolean
  last_success_at: string | null
  last_document_url: string | null
  last_document_hash: string | null
  last_sale_date: string | null
  last_run_id: string | null
  created_at: string
  updated_at: string
}

export type CountyHunterDiscoveryRun = {
  id: string
  organization_id: string
  county_id: string
  source_id: string
  run_type: 'official_fetch' | 'snapshot_replay'
  source_run_id: string | null
  status:
    | 'queued'
    | 'fetching_source'
    | 'fetching_document'
    | 'parsing'
    | 'normalizing'
    | 'comparing'
    | 'completed'
    | 'review_required'
    | 'failed'
  adapter_version: string
  document_snapshot_id: string | null
  sale_date: string | null
  document_url: string | null
  document_final_url: string | null
  document_hash: string | null
  properties_found: number
  added_count: number
  changed_count: number
  unchanged_count: number
  removed_count: number
  duplicate_count: number
  review_required: boolean
  reason_codes: string[]
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export type CountyHunterDiscoverySnapshotMetadata = {
  id: string
  snapshot_kind: 'landing_page' | 'official_document'
  original_url: string
  final_url: string
  content_hash: string
  content_type: string
  content_length: number
  fetched_at: string
  source_last_modified: string | null
}

export type CountyHunterDiscoveryOverview = {
  county: CountyHunterCounty | null
  source: CountyHunterSource | null
  latestRun: CountyHunterDiscoveryRun | null
  snapshots: CountyHunterDiscoverySnapshotMetadata[]
  collectionEnabled: boolean
  canRun: boolean
}

export type CountyHunterAuction = {
  id: string
  organization_id: string
  county_id: string
  sale_date: string | null
  auction_type: AuctionType
  location: string | null
  registration_deadline: string | null
  status: 'discovered' | 'confirmed' | 'changed' | 'cancelled' | 'completed' | 'unknown'
  official_source_url: string | null
  property_count: number
  withdrawn_count: number
  notes: string | null
  created_at: string
  updated_at: string
  county?: { name: string; slug: string } | null
}

export type CountyHunterProperty = {
  id: string
  organization_id: string
  auction_id: string
  county_id: string
  parcel_number: string | null
  address: string | null
  legal_description: string | null
  owner_name: string | null
  property_type: 'single_family' | 'multifamily' | 'commercial' | 'land' | 'industrial' | 'unknown'
  opening_bid: number | null
  assessed_value: number | null
  estimated_value: number | null
  max_bid: number | null
  estimated_margin: number | null
  status: 'discovered' | 'resolving' | 'analyzing' | 'shortlisted' | 'rejected' | 'withdrawn' | 'sold' | 'manual_review'
  data_coverage: number
  confidence_score: number
  risk_score: number | null
  human_review_required: boolean
  created_at: string
  updated_at: string
  county?: { name: string } | null
  auction?: { sale_date: string | null } | null
}

export type CountyHunterReviewTask = {
  id: string
  organization_id: string
  property_id: string | null
  county_id: string
  task_type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  source_url: string | null
  assigned_to: string | null
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  due_at: string | null
  result: string | null
  created_at: string
  updated_at: string
}

export type CountyHunterDashboard = {
  counties: number
  auctions: number
  properties: number
  shortlisted: number
  pendingReviews: number
  sourceErrors: number
  changesLast24Hours: number
}

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  active: 'Confirmed',
  degraded: 'Partial coverage',
  unavailable: 'Source unavailable',
  pending_manual_configuration: 'Configuration required',
}
