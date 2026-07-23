import {
  asObject,
  assertAllowedKeys,
  compactObject,
  isUuid,
  oneOf,
  optionalBoolean,
  optionalDate,
  optionalHttpsUrl,
  optionalNumber,
  optionalText,
  requiredText,
  CountyHunterValidationError,
} from '../validation'

const AUCTION_TYPES = ['in_person', 'online', 'hybrid', 'unknown'] as const
const SOURCE_STATUSES = ['active', 'degraded', 'unavailable', 'pending_manual_configuration'] as const
const AUCTION_STATUSES = ['discovered', 'confirmed', 'changed', 'cancelled', 'completed', 'unknown'] as const
const PROPERTY_TYPES = ['single_family', 'multifamily', 'commercial', 'land', 'industrial', 'unknown'] as const
const PROPERTY_STATUSES = ['discovered', 'resolving', 'analyzing', 'shortlisted', 'rejected', 'withdrawn', 'sold', 'manual_review'] as const

export function parseCountyPatch(input: unknown) {
  const body = asObject(input)
  assertAllowedKeys(body, [
    'tax_sale_authority', 'official_website_url', 'tax_sale_page_url', 'assessor_url', 'gis_url',
    'clerk_url', 'legal_newspaper_name', 'legal_newspaper_url', 'auction_type', 'auction_location',
    'registration_rules', 'payment_rules', 'typical_schedule', 'source_status', 'operational_notes', 'active',
  ])
  return compactObject({
    tax_sale_authority: optionalText(body.tax_sale_authority, 'tax_sale_authority', 500),
    official_website_url: optionalHttpsUrl(body.official_website_url, 'official_website_url'),
    tax_sale_page_url: optionalHttpsUrl(body.tax_sale_page_url, 'tax_sale_page_url'),
    assessor_url: optionalHttpsUrl(body.assessor_url, 'assessor_url'),
    gis_url: optionalHttpsUrl(body.gis_url, 'gis_url'),
    clerk_url: optionalHttpsUrl(body.clerk_url, 'clerk_url'),
    legal_newspaper_name: optionalText(body.legal_newspaper_name, 'legal_newspaper_name', 300),
    legal_newspaper_url: optionalHttpsUrl(body.legal_newspaper_url, 'legal_newspaper_url'),
    auction_type: body.auction_type === undefined ? undefined : oneOf(body.auction_type, 'auction_type', AUCTION_TYPES),
    auction_location: optionalText(body.auction_location, 'auction_location', 1000),
    registration_rules: optionalText(body.registration_rules, 'registration_rules'),
    payment_rules: optionalText(body.payment_rules, 'payment_rules'),
    typical_schedule: optionalText(body.typical_schedule, 'typical_schedule', 1000),
    source_status:
      body.source_status === undefined ? undefined : oneOf(body.source_status, 'source_status', SOURCE_STATUSES),
    operational_notes: optionalText(body.operational_notes, 'operational_notes'),
    active: optionalBoolean(body.active, 'active'),
  })
}

export function parseSourceCreate(input: unknown, countyId: string) {
  const body = asObject(input)
  assertAllowedKeys(body, [
    'name', 'source_type', 'url', 'is_official', 'status', 'coverage_percent', 'failure_reason',
    'human_intervention_required', 'notes',
  ])
  if (!isUuid(countyId)) throw new CountyHunterValidationError('county_id is invalid.')
  return {
    county_id: countyId,
    name: requiredText(body.name, 'name', 300),
    source_type: requiredText(body.source_type, 'source_type', 100),
    url: optionalHttpsUrl(body.url, 'url') ?? null,
    is_official: optionalBoolean(body.is_official, 'is_official') ?? false,
    status: body.status === undefined ? 'pending_manual_configuration' : oneOf(body.status, 'status', SOURCE_STATUSES),
    coverage_percent: optionalNumber(body.coverage_percent, 'coverage_percent', 0, 100) ?? 0,
    failure_reason: optionalText(body.failure_reason, 'failure_reason'),
    human_intervention_required:
      optionalBoolean(body.human_intervention_required, 'human_intervention_required') ?? false,
    notes: optionalText(body.notes, 'notes'),
  }
}

export function parseSourcePatch(input: unknown) {
  const body = asObject(input)
  assertAllowedKeys(body, [
    'name', 'source_type', 'url', 'is_official', 'status', 'coverage_percent', 'failure_reason',
    'human_intervention_required', 'notes',
  ])
  return compactObject({
    name: body.name === undefined ? undefined : requiredText(body.name, 'name', 300),
    source_type: body.source_type === undefined ? undefined : requiredText(body.source_type, 'source_type', 100),
    url: optionalHttpsUrl(body.url, 'url'),
    is_official: optionalBoolean(body.is_official, 'is_official'),
    status: body.status === undefined ? undefined : oneOf(body.status, 'status', SOURCE_STATUSES),
    coverage_percent: optionalNumber(body.coverage_percent, 'coverage_percent', 0, 100),
    failure_reason: optionalText(body.failure_reason, 'failure_reason'),
    human_intervention_required: optionalBoolean(body.human_intervention_required, 'human_intervention_required'),
    notes: optionalText(body.notes, 'notes'),
  })
}

export function parseAuctionCreate(input: unknown) {
  const body = asObject(input)
  assertAllowedKeys(body, [
    'county_id', 'sale_date', 'auction_type', 'location', 'registration_deadline', 'status',
    'official_source_url', 'notes',
  ])
  if (!isUuid(body.county_id)) throw new CountyHunterValidationError('county_id is invalid.')
  return {
    county_id: body.county_id,
    sale_date: optionalDate(body.sale_date, 'sale_date') ?? null,
    auction_type: body.auction_type === undefined ? 'unknown' : oneOf(body.auction_type, 'auction_type', AUCTION_TYPES),
    location: optionalText(body.location, 'location', 1000),
    registration_deadline: optionalDate(body.registration_deadline, 'registration_deadline'),
    status: body.status === undefined ? 'unknown' : oneOf(body.status, 'status', AUCTION_STATUSES),
    official_source_url: optionalHttpsUrl(body.official_source_url, 'official_source_url'),
    notes: optionalText(body.notes, 'notes'),
  }
}

export function parseAuctionPatch(input: unknown) {
  const body = asObject(input)
  assertAllowedKeys(body, [
    'sale_date', 'auction_type', 'location', 'registration_deadline', 'status', 'official_source_url', 'notes',
  ])
  return compactObject({
    sale_date: optionalDate(body.sale_date, 'sale_date'),
    auction_type: body.auction_type === undefined ? undefined : oneOf(body.auction_type, 'auction_type', AUCTION_TYPES),
    location: optionalText(body.location, 'location', 1000),
    registration_deadline: optionalDate(body.registration_deadline, 'registration_deadline'),
    status: body.status === undefined ? undefined : oneOf(body.status, 'status', AUCTION_STATUSES),
    official_source_url: optionalHttpsUrl(body.official_source_url, 'official_source_url'),
    notes: optionalText(body.notes, 'notes'),
  })
}

export function parsePropertyCreate(input: unknown) {
  const body = asObject(input)
  assertAllowedKeys(body, [
    'auction_id', 'county_id', 'parcel_number', 'address', 'legal_description', 'owner_name',
    'property_type', 'opening_bid', 'assessed_value', 'status', 'data_coverage', 'confidence_score',
    'human_review_required',
  ])
  if (!isUuid(body.auction_id)) throw new CountyHunterValidationError('auction_id is invalid.')
  if (!isUuid(body.county_id)) throw new CountyHunterValidationError('county_id is invalid.')
  return {
    auction_id: body.auction_id,
    county_id: body.county_id,
    parcel_number: optionalText(body.parcel_number, 'parcel_number', 200),
    address: optionalText(body.address, 'address', 1000),
    legal_description: optionalText(body.legal_description, 'legal_description', 10000),
    owner_name: optionalText(body.owner_name, 'owner_name', 500),
    property_type: body.property_type === undefined ? 'unknown' : oneOf(body.property_type, 'property_type', PROPERTY_TYPES),
    opening_bid: optionalNumber(body.opening_bid, 'opening_bid'),
    assessed_value: optionalNumber(body.assessed_value, 'assessed_value'),
    status: body.status === undefined ? 'discovered' : oneOf(body.status, 'status', PROPERTY_STATUSES),
    data_coverage: optionalNumber(body.data_coverage, 'data_coverage', 0, 100) ?? 0,
    confidence_score: optionalNumber(body.confidence_score, 'confidence_score', 0, 100) ?? 0,
    human_review_required: optionalBoolean(body.human_review_required, 'human_review_required') ?? false,
  }
}

export function parsePropertyPatch(input: unknown) {
  const body = asObject(input)
  assertAllowedKeys(body, [
    'parcel_number', 'address', 'legal_description', 'owner_name', 'property_type', 'opening_bid',
    'assessed_value', 'estimated_value', 'max_bid', 'estimated_margin', 'status', 'data_coverage',
    'confidence_score', 'risk_score', 'human_review_required',
  ])
  return compactObject({
    parcel_number: optionalText(body.parcel_number, 'parcel_number', 200),
    address: optionalText(body.address, 'address', 1000),
    legal_description: optionalText(body.legal_description, 'legal_description', 10000),
    owner_name: optionalText(body.owner_name, 'owner_name', 500),
    property_type: body.property_type === undefined ? undefined : oneOf(body.property_type, 'property_type', PROPERTY_TYPES),
    opening_bid: optionalNumber(body.opening_bid, 'opening_bid'),
    assessed_value: optionalNumber(body.assessed_value, 'assessed_value'),
    estimated_value: optionalNumber(body.estimated_value, 'estimated_value'),
    max_bid: optionalNumber(body.max_bid, 'max_bid'),
    estimated_margin: optionalNumber(body.estimated_margin, 'estimated_margin'),
    status: body.status === undefined ? undefined : oneOf(body.status, 'status', PROPERTY_STATUSES),
    data_coverage: optionalNumber(body.data_coverage, 'data_coverage', 0, 100),
    confidence_score: optionalNumber(body.confidence_score, 'confidence_score', 0, 100),
    risk_score: optionalNumber(body.risk_score, 'risk_score', 0, 100),
    human_review_required: optionalBoolean(body.human_review_required, 'human_review_required'),
  })
}
