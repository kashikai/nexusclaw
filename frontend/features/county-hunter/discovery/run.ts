import 'server-only'
import { randomUUID } from 'node:crypto'
import type { CountyHunterRequestContext } from '../server/auth'
import { CountyHunterHttpError } from '../server/http-error'
import { countyHunterRest } from '../server/rest'
import {
  COUNTY_HUNTER_DISCOVERY_LIMITS,
  GWINNETT_DISCOVERY_ADAPTER_VERSION,
  GWINNETT_OFFICIAL_HOSTNAMES,
} from './constants'
import { buildDiscoveryDiff } from './diff'
import { discoverGwinnettCurrentList } from './landing'
import { extractPdfTextPages, parseGwinnettPdfPages } from './pdf'
import { fetchDiscoveryResourceSafely, type SecureDiscoveryFetchResult } from './secure-fetch'
import {
  CountyHunterDiscoveryError,
  type DiscoveryChange,
  type DiscoveryRunStatus,
  type ExistingDiscoveryProperty,
  type OfficialDocumentCandidate,
  type ParsedDiscoveryRecord,
} from './types'

type ConfiguredDiscovery = {
  county_id: string
  source_id: string
}

type DiscoverySourceRow = {
  id: string
  organization_id: string
  county_id: string
  url: string
  adapter_key: string
  adapter_version: string
  official_hostnames: string[]
  last_document_url: string | null
  last_document_hash: string | null
}

type AuctionRow = { id: string }

export type DiscoveryRunResult = {
  runId: string
  status: 'completed' | 'review_required'
  saleDate: string
  documentUrl: string
  documentHash: string
  records: number
  added: number
  changed: number
  unchanged: number
  removed: number
  duplicates: number
  reasonCodes: string[]
}

function filters(values: Record<string, string>): string {
  return new URLSearchParams(
    Object.entries(values).map(([key, value]) => [key, `eq.${value}`]),
  ).toString()
}

function safeTimestamp(value: string | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

async function patchRun(
  context: CountyHunterRequestContext,
  runId: string,
  payload: Record<string, unknown>,
) {
  await countyHunterRest(
    context,
    'county_hunter_discovery_runs',
    filters({ id: runId, organization_id: context.organizationId }),
    { method: 'PATCH', body: JSON.stringify(payload), prefer: 'return=minimal' },
  )
}

async function patchSource(
  context: CountyHunterRequestContext,
  sourceId: string,
  payload: Record<string, unknown>,
) {
  await countyHunterRest(
    context,
    'county_hunter_sources',
    filters({ id: sourceId, organization_id: context.organizationId }),
    { method: 'PATCH', body: JSON.stringify(payload), prefer: 'return=minimal' },
  )
}

async function insertSnapshot(
  context: CountyHunterRequestContext,
  runId: string,
  sourceId: string,
  kind: 'landing_page' | 'official_document',
  result: SecureDiscoveryFetchResult,
): Promise<string> {
  const id = randomUUID()
  await countyHunterRest(
    context,
    'county_hunter_discovery_snapshots',
    '',
    {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        id,
        organization_id: context.organizationId,
        run_id: runId,
        source_id: sourceId,
        snapshot_kind: kind,
        original_url: result.originalUrl,
        final_url: result.finalUrl,
        content_hash: result.hash,
        content_type: result.contentType,
        content_length: result.bytes.byteLength,
        response_headers: result.headers,
        content_base64: Buffer.from(result.bytes).toString('base64'),
        fetched_at: result.fetchedAt,
        source_last_modified: safeTimestamp(result.headers['last-modified']),
      }),
    },
  )
  return id
}

async function getOrCreateAuction(
  context: CountyHunterRequestContext,
  configured: ConfiguredDiscovery,
  saleDate: string,
  documentUrl: string,
  documentHash: string,
  propertyCount: number,
): Promise<string> {
  const saleTimestamp = `${saleDate}T00:00:00.000Z`
  const query = new URLSearchParams({
    select: 'id',
    organization_id: `eq.${context.organizationId}`,
    source_id: `eq.${configured.source_id}`,
    sale_date: `eq.${saleTimestamp}`,
    limit: '1',
  }).toString()
  const existing = await countyHunterRest<AuctionRow[]>(
    context,
    'county_hunter_auctions',
    query,
  )
  if (existing[0]) {
    await countyHunterRest(
      context,
      'county_hunter_auctions',
      filters({ id: existing[0].id, organization_id: context.organizationId }),
      {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          status: 'confirmed',
          official_source_url: documentUrl,
          document_url: documentUrl,
          document_hash: documentHash,
          property_count: propertyCount,
        }),
      },
    )
    return existing[0].id
  }

  const id = randomUUID()
  await countyHunterRest(
    context,
    'county_hunter_auctions',
    '',
    {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        id,
        organization_id: context.organizationId,
        county_id: configured.county_id,
        source_id: configured.source_id,
        sale_date: saleTimestamp,
        auction_type: 'in_person',
        status: 'confirmed',
        official_source_url: documentUrl,
        document_url: documentUrl,
        document_hash: documentHash,
        property_count: propertyCount,
        created_by: context.userId,
      }),
    },
  )
  return id
}

async function existingProperties(
  context: CountyHunterRequestContext,
  sourceId: string,
): Promise<ExistingDiscoveryProperty[]> {
  return countyHunterRest(
    context,
    'county_hunter_properties',
    new URLSearchParams({
      select: 'id,source_record_key,source_record_hash,source_record_status',
      organization_id: `eq.${context.organizationId}`,
      source_id: `eq.${sourceId}`,
    }).toString(),
  )
}

async function normalizeProperties(
  context: CountyHunterRequestContext,
  configured: ConfiguredDiscovery,
  runId: string,
  auctionId: string,
  changes: DiscoveryChange[],
): Promise<Map<string, string>> {
  const propertyIds = new Map<string, string>()
  for (const change of changes) {
    if (change.changeType === 'removed_from_current_source') {
      if (!change.propertyId) continue
      await countyHunterRest(
        context,
        'county_hunter_properties',
        filters({ id: change.propertyId, organization_id: context.organizationId }),
        {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({
            source_record_status: 'removed_from_current_source',
            removed_at: new Date().toISOString(),
          }),
        },
      )
      propertyIds.set(change.sourceRecordKey, change.propertyId)
      continue
    }

    const record = change.record
    if (!record) continue
    const payload = {
      organization_id: context.organizationId,
      auction_id: auctionId,
      county_id: configured.county_id,
      source_id: configured.source_id,
      source_record_key: record.sourceRecordKey,
      parcel_number: record.parcelNumberNormalized,
      parcel_number_original: record.parcelNumberOriginal,
      address: record.propertyAddress,
      owner_name: record.ownerName,
      legal_description: record.legalDescription,
      amount_due: record.amountDue,
      official_notes: record.officialNotes,
      source_record_hash: record.normalizedHash,
      source_record_status: 'current',
      last_seen_run_id: runId,
      removed_at: null,
      status: record.reviewRequired ? 'manual_review' : 'discovered',
      human_review_required: record.reviewRequired,
    }
    if (change.propertyId) {
      await countyHunterRest(
        context,
        'county_hunter_properties',
        filters({ id: change.propertyId, organization_id: context.organizationId }),
        {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify(payload),
        },
      )
      propertyIds.set(change.sourceRecordKey, change.propertyId)
    } else {
      const id = randomUUID()
      await countyHunterRest(
        context,
        'county_hunter_properties',
        '',
        {
          method: 'POST',
          prefer: 'return=minimal',
          body: JSON.stringify({
            id,
            ...payload,
            first_seen_run_id: runId,
            created_by: context.userId,
          }),
        },
      )
      propertyIds.set(change.sourceRecordKey, id)
    }
  }
  return propertyIds
}

async function persistRawRecords(
  context: CountyHunterRequestContext,
  configured: ConfiguredDiscovery,
  runId: string,
  records: ParsedDiscoveryRecord[],
  propertyIds: Map<string, string>,
) {
  await countyHunterRest(
    context,
    'county_hunter_discovery_records',
    '',
    {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify(records.map((record) => ({
        id: record.rawRecordId,
        organization_id: context.organizationId,
        run_id: runId,
        source_id: configured.source_id,
        property_id: propertyIds.get(record.sourceRecordKey) ?? null,
        source_order: record.sourceOrder,
        page_number: record.pageNumber,
        source_record_key: record.sourceRecordKey,
        item_number: record.itemNumber,
        raw_text: record.rawText,
        parcel_number_original: record.parcelNumberOriginal,
        parcel_number_normalized: record.parcelNumberNormalized,
        owner_name: record.ownerName,
        property_address: record.propertyAddress,
        legal_description: record.legalDescription,
        amount_due: record.amountDue,
        starting_bid: record.startingBid,
        sale_date: record.saleDate,
        official_notes: record.officialNotes,
        normalized_hash: record.normalizedHash,
        duplicate_source_record: record.duplicateSourceRecord,
        duplicate_of_record_id: record.duplicateOfRecordId,
        review_required: record.reviewRequired,
      }))),
    },
  )
}

async function persistChanges(
  context: CountyHunterRequestContext,
  configured: ConfiguredDiscovery,
  runId: string,
  changes: DiscoveryChange[],
  propertyIds: Map<string, string>,
) {
  await countyHunterRest(
    context,
    'county_hunter_discovery_changes',
    '',
    {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify(changes.map((change) => ({
        organization_id: context.organizationId,
        run_id: runId,
        source_id: configured.source_id,
        property_id: propertyIds.get(change.sourceRecordKey) ?? change.propertyId,
        source_record_key: change.sourceRecordKey,
        change_type: change.changeType,
        previous_hash: change.previousHash,
        current_hash: change.currentHash,
      }))),
    },
  )
}

async function releaseLock(context: CountyHunterRequestContext, runId: string) {
  const released = await countyHunterRest<boolean>(
    context,
    'rpc/county_hunter_release_discovery_lock',
    '',
    { method: 'POST', body: JSON.stringify({ p_run_id: runId }) },
  )
  if (!released) throw new CountyHunterHttpError('The discovery source lock could not be released.', 500)
}

function counts(changes: DiscoveryChange[]) {
  return {
    added: changes.filter((change) => change.changeType === 'added').length,
    changed: changes.filter((change) => change.changeType === 'changed').length,
    unchanged: changes.filter((change) => change.changeType === 'unchanged').length,
    removed: changes.filter((change) => change.changeType === 'removed_from_current_source').length,
  }
}

async function finishFailedRun(
  context: CountyHunterRequestContext,
  runId: string,
  sourceId: string,
  error: unknown,
) {
  const discoveryError =
    error instanceof CountyHunterDiscoveryError
      ? error
      : new CountyHunterDiscoveryError('SOURCE_STRUCTURE_CHANGED', 'Discovery failed unexpectedly.', {
          cause: error,
        })
  const status: DiscoveryRunStatus = discoveryError.reviewRequired ? 'review_required' : 'failed'
  await patchRun(context, runId, {
    status,
    finished_at: new Date().toISOString(),
    review_required: discoveryError.reviewRequired,
    reason_codes: [discoveryError.reasonCode],
    ...(discoveryError.candidates.length > 0
      ? { candidate_documents: sanitizeCandidates(discoveryError.candidates) }
      : {}),
    errors: discoveryError.reviewRequired
      ? []
      : [{ code: discoveryError.reasonCode, message: discoveryError.message }],
  }).catch(() => undefined)
  await patchSource(context, sourceId, {
    status: discoveryError.reviewRequired ? 'degraded' : 'unavailable',
    failure_reason: discoveryError.reasonCode,
    human_intervention_required: discoveryError.reviewRequired,
  }).catch(() => undefined)
}

export async function runGwinnettDiscovery(
  context: CountyHunterRequestContext,
): Promise<DiscoveryRunResult> {
  const configuredRows = await countyHunterRest<ConfiguredDiscovery[]>(
    context,
    'rpc/county_hunter_configure_gwinnett_discovery',
    '',
    { method: 'POST', body: '{}' },
  )
  const configured = configuredRows[0]
  if (!configured) throw new CountyHunterHttpError('The Gwinnett discovery source was not configured.', 500)

  const sourceRows = await countyHunterRest<DiscoverySourceRow[]>(
    context,
    'county_hunter_sources',
    new URLSearchParams({
      select: 'id,organization_id,county_id,url,adapter_key,adapter_version,official_hostnames,last_document_url,last_document_hash',
      id: `eq.${configured.source_id}`,
      organization_id: `eq.${context.organizationId}`,
      limit: '1',
    }).toString(),
  )
  const source = sourceRows[0]
  if (
    !source ||
    source.adapter_key !== 'gwinnett-tax-sales' ||
    source.adapter_version !== GWINNETT_DISCOVERY_ADAPTER_VERSION ||
    !Array.isArray(source.official_hostnames) ||
    source.official_hostnames.length !== 1 ||
    source.official_hostnames[0] !== GWINNETT_OFFICIAL_HOSTNAMES[0]
  ) {
    throw new CountyHunterDiscoveryError(
      'OFFICIAL_DOMAIN_MISMATCH',
      'The configured source does not match the approved Gwinnett adapter.',
      { reviewRequired: true },
    )
  }

  let runId: string
  try {
    runId = await countyHunterRest<string>(
      context,
      'rpc/county_hunter_begin_discovery',
      '',
      {
        method: 'POST',
        body: JSON.stringify({
          p_source_id: source.id,
          p_adapter_version: GWINNETT_DISCOVERY_ADAPTER_VERSION,
          p_lock_seconds: 300,
        }),
      },
    )
  } catch (error) {
    if (error instanceof CountyHunterHttpError && /lock/i.test(error.message)) {
      throw new CountyHunterDiscoveryError('SOURCE_LOCKED', 'A discovery run is already active.')
    }
    throw error
  }

  try {
    await patchRun(context, runId, {
      status: 'fetching_source',
      started_at: new Date().toISOString(),
    })
    const landing = await fetchDiscoveryResourceSafely(source.url, {
      allowedHostnames: GWINNETT_OFFICIAL_HOSTNAMES,
      allowedContentTypes: ['text/html'],
      maxBytes: COUNTY_HUNTER_DISCOVERY_LIMITS.landingBytes,
      failureReason: 'SOURCE_FETCH_FAILED',
    })
    const landingSnapshotId = await insertSnapshot(
      context,
      runId,
      source.id,
      'landing_page',
      landing,
    )
    await patchRun(context, runId, {
      landing_snapshot_id: landingSnapshotId,
      landing_final_url: landing.finalUrl,
      landing_hash: landing.hash,
      landing_content_type: landing.contentType,
      landing_size: landing.bytes.byteLength,
      source_last_modified: safeTimestamp(landing.headers['last-modified']),
      sources_checked: 1,
    })

    const landingHtml = new TextDecoder('utf-8', { fatal: true }).decode(landing.bytes)
    const discovered = discoverGwinnettCurrentList(landingHtml, landing.finalUrl)
    await patchRun(context, runId, {
      status: 'fetching_document',
      sale_date: discovered.candidate.saleDate,
      document_url: discovered.candidate.documentUrl,
      candidate_documents: discovered.candidates,
      reason_codes: discovered.reasonCodes,
    })

    const document = await fetchDiscoveryResourceSafely(discovered.candidate.documentUrl, {
      allowedHostnames: GWINNETT_OFFICIAL_HOSTNAMES,
      allowedContentTypes: ['application/pdf'],
      maxBytes: COUNTY_HUNTER_DISCOVERY_LIMITS.documentBytes,
      failureReason: 'DOCUMENT_FETCH_FAILED',
    })
    const documentSnapshotId = await insertSnapshot(
      context,
      runId,
      source.id,
      'official_document',
      document,
    )
    await patchRun(context, runId, {
      status: 'parsing',
      document_snapshot_id: documentSnapshotId,
      document_final_url: document.finalUrl,
      document_hash: document.hash,
      document_content_type: document.contentType,
      document_size: document.bytes.byteLength,
    })

    const pages = await extractPdfTextPages(document.bytes)
    const parsed = parseGwinnettPdfPages(pages)
    if (parsed.saleDate !== discovered.candidate.saleDate) {
      throw new CountyHunterDiscoveryError(
        'SOURCE_STRUCTURE_CHANGED',
        'The sale date on the official PDF does not match its landing-page link.',
        { reviewRequired: true, candidates: discovered.candidates },
      )
    }

    const reasonCodes = [...new Set([
      ...discovered.reasonCodes,
      ...parsed.reasonCodes,
      ...(parsed.records.some((record) => record.reviewRequired)
        ? (['SOURCE_STRUCTURE_CHANGED'] as const)
        : []),
    ])]
    await patchRun(context, runId, {
      status: 'normalizing',
      reason_codes: reasonCodes,
      properties_found: parsed.records.length,
    })

    const previous = await existingProperties(context, source.id)
    const changes = buildDiscoveryDiff(previous, parsed.records)
    const uniqueCurrentCount = new Set(parsed.records.map((record) => record.sourceRecordKey)).size
    const auctionId = await getOrCreateAuction(
      context,
      configured,
      parsed.saleDate,
      document.finalUrl,
      document.hash,
      uniqueCurrentCount,
    )
    await patchRun(context, runId, { status: 'comparing', auctions_found: 1 })
    const propertyIds = await normalizeProperties(
      context,
      configured,
      runId,
      auctionId,
      changes,
    )
    await persistRawRecords(context, configured, runId, parsed.records, propertyIds)
    await persistChanges(context, configured, runId, changes, propertyIds)

    const changeCounts = counts(changes)
    const duplicateCount = parsed.records.filter((record) => record.duplicateSourceRecord).length
    const reviewRequired = reasonCodes.length > 0
    await releaseLock(context, runId)
    await patchSource(context, source.id, {
      status: reviewRequired ? 'degraded' : 'active',
      last_success_at: new Date().toISOString(),
      last_document_url: document.finalUrl,
      last_document_hash: document.hash,
      last_sale_date: parsed.saleDate,
      last_run_id: runId,
      failure_reason: reviewRequired ? reasonCodes[0] : null,
      human_intervention_required: reviewRequired,
    })
    await countyHunterRest(
      context,
      'county_hunter_counties',
      filters({ id: configured.county_id, organization_id: context.organizationId }),
      {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          source_status: reviewRequired ? 'degraded' : 'active',
          last_checked_at: new Date().toISOString(),
        }),
      },
    )
    const finalStatus = reviewRequired ? 'review_required' : 'completed'
    await patchRun(context, runId, {
      status: finalStatus,
      finished_at: new Date().toISOString(),
      review_required: reviewRequired,
      added_count: changeCounts.added,
      changed_count: changeCounts.changed,
      unchanged_count: changeCounts.unchanged,
      removed_count: changeCounts.removed,
      duplicate_count: duplicateCount,
    })

    return {
      runId,
      status: finalStatus,
      saleDate: parsed.saleDate,
      documentUrl: document.finalUrl,
      documentHash: document.hash,
      records: parsed.records.length,
      added: changeCounts.added,
      changed: changeCounts.changed,
      unchanged: changeCounts.unchanged,
      removed: changeCounts.removed,
      duplicates: duplicateCount,
      reasonCodes,
    }
  } catch (error) {
    await releaseLock(context, runId).catch(() => undefined)
    await finishFailedRun(context, runId, source.id, error)
    throw error
  }
}

export function sanitizeCandidates(
  candidates: OfficialDocumentCandidate[],
): OfficialDocumentCandidate[] {
  return candidates.map(({ label, documentUrl, saleDate }) => ({
    label: label.slice(0, 160),
    documentUrl,
    saleDate,
  }))
}
