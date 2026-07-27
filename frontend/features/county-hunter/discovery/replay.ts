import 'server-only'
import { createHash } from 'node:crypto'
import type { CountyHunterRequestContext } from '../server/auth'
import { CountyHunterHttpError } from '../server/http-error'
import { countyHunterRest } from '../server/rest'
import { COUNTY_HUNTER_DISCOVERY_LIMITS, GWINNETT_DISCOVERY_ADAPTER_VERSION } from './constants'
import {
  buildSnapshotReplayDiff,
  type SnapshotReplayBaselineRecord,
} from './diff'
import { extractPdfTextPages, parseGwinnettPdfPages } from './pdf'
import {
  CountyHunterDiscoveryError,
  type DiscoveryChange,
  type ParsedDiscoveryRecord,
} from './types'

type SnapshotReplayStart = {
  run_id: string
  snapshot_id: string
  source_run_id: string
  source_id: string
  county_id: string
  source_sale_date: string | null
  source_document_url: string
  source_document_hash: string
  snapshot_content_type: string
  snapshot_content_length: number
  snapshot_content_base64: string
}

export type SnapshotReplayResult = {
  runId: string
  runType: 'snapshot_replay'
  sourceRunId: string
  snapshotId: string
  adapterVersion: string
  status: 'completed' | 'review_required'
  saleDate: string
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

async function patchReplayRun(
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

async function releaseReplayLock(context: CountyHunterRequestContext, runId: string) {
  const released = await countyHunterRest<boolean>(
    context,
    'rpc/county_hunter_release_discovery_lock',
    '',
    { method: 'POST', body: JSON.stringify({ p_run_id: runId }) },
  )
  if (!released) {
    throw new CountyHunterHttpError('The replay source lock could not be released.', 500)
  }
}

function decodeStoredSnapshot(start: SnapshotReplayStart): Uint8Array {
  const encoded = start.snapshot_content_base64
  if (
    start.snapshot_content_type !== 'application/pdf' ||
    !Number.isSafeInteger(start.snapshot_content_length) ||
    start.snapshot_content_length < 1 ||
    start.snapshot_content_length > COUNTY_HUNTER_DISCOVERY_LIMITS.documentBytes ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
  ) {
    throw new CountyHunterDiscoveryError(
      'PDF_TEXT_UNAVAILABLE',
      'The stored discovery snapshot is not a valid replayable PDF.',
    )
  }

  const decoded = Buffer.from(encoded, 'base64')
  const hash = createHash('sha256').update(decoded).digest('hex')
  if (
    decoded.byteLength !== start.snapshot_content_length ||
    hash !== start.source_document_hash
  ) {
    throw new CountyHunterDiscoveryError(
      'PDF_TEXT_UNAVAILABLE',
      'The stored discovery snapshot failed its integrity check.',
    )
  }
  return Uint8Array.from(decoded)
}

async function loadReplayBaseline(
  context: CountyHunterRequestContext,
  start: SnapshotReplayStart,
): Promise<SnapshotReplayBaselineRecord[]> {
  return countyHunterRest(
    context,
    'county_hunter_discovery_records',
    new URLSearchParams({
      select: 'property_id,source_record_key,normalized_hash',
      organization_id: `eq.${context.organizationId}`,
      run_id: `eq.${start.source_run_id}`,
      source_id: `eq.${start.source_id}`,
      order: 'source_order.asc',
    }).toString(),
  )
}

async function persistReplayRecords(
  context: CountyHunterRequestContext,
  start: SnapshotReplayStart,
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
        run_id: start.run_id,
        source_id: start.source_id,
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

async function persistReplayChanges(
  context: CountyHunterRequestContext,
  start: SnapshotReplayStart,
  changes: DiscoveryChange[],
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
        run_id: start.run_id,
        source_id: start.source_id,
        property_id: change.propertyId,
        source_record_key: change.sourceRecordKey,
        change_type: change.changeType,
        previous_hash: change.previousHash,
        current_hash: change.currentHash,
      }))),
    },
  )
}

function changeCounts(changes: DiscoveryChange[]) {
  return {
    added: changes.filter((change) => change.changeType === 'added').length,
    changed: changes.filter((change) => change.changeType === 'changed').length,
    unchanged: changes.filter((change) => change.changeType === 'unchanged').length,
    removed: changes.filter(
      (change) => change.changeType === 'removed_from_current_source',
    ).length,
  }
}

export async function replayGwinnettSnapshot(
  context: CountyHunterRequestContext,
  snapshotId: string,
): Promise<SnapshotReplayResult> {
  let start: SnapshotReplayStart
  try {
    const rows = await countyHunterRest<SnapshotReplayStart[]>(
      context,
      'rpc/county_hunter_begin_snapshot_replay',
      '',
      {
        method: 'POST',
        body: JSON.stringify({
          p_snapshot_id: snapshotId,
          p_adapter_version: GWINNETT_DISCOVERY_ADAPTER_VERSION,
          p_lock_seconds: 300,
        }),
      },
    )
    start = rows[0]
  } catch (error) {
    if (error instanceof CountyHunterHttpError && /lock/i.test(error.message)) {
      throw new CountyHunterDiscoveryError('SOURCE_LOCKED', 'A discovery run is already active.')
    }
    if (
      error instanceof CountyHunterHttpError &&
      /replay (snapshot|source run|source).*not found/i.test(error.message)
    ) {
      throw new CountyHunterHttpError('The replay snapshot is unavailable.', 404)
    }
    throw error
  }
  if (!start) {
    throw new CountyHunterHttpError('The replay run could not be initialized.', 500)
  }

  try {
    await patchReplayRun(context, start.run_id, {
      status: 'parsing',
      started_at: new Date().toISOString(),
    })
    const bytes = decodeStoredSnapshot(start)
    const pages = await extractPdfTextPages(bytes)
    const parsed = parseGwinnettPdfPages(pages)
    if (start.source_sale_date && parsed.saleDate !== start.source_sale_date) {
      throw new CountyHunterDiscoveryError(
        'SOURCE_STRUCTURE_CHANGED',
        'The replayed sale date does not match the preserved source run.',
      )
    }

    await patchReplayRun(context, start.run_id, {
      status: 'normalizing',
      properties_found: parsed.records.length,
      reason_codes: parsed.reasonCodes,
    })
    const baseline = await loadReplayBaseline(context, start)
    const changes = buildSnapshotReplayDiff(baseline, parsed.records)
    const propertyIds = new Map(
      baseline.flatMap((record) => (
        record.property_id ? [[record.source_record_key, record.property_id] as const] : []
      )),
    )

    await patchReplayRun(context, start.run_id, { status: 'comparing' })
    await persistReplayRecords(context, start, parsed.records, propertyIds)
    await persistReplayChanges(context, start, changes)

    const counts = changeCounts(changes)
    const duplicates = parsed.records.filter(
      (record) => record.duplicateSourceRecord,
    ).length
    const reviewRequired = parsed.reasonCodes.length > 0
    const status = reviewRequired ? 'review_required' : 'completed'
    await releaseReplayLock(context, start.run_id)
    await patchReplayRun(context, start.run_id, {
      status,
      finished_at: new Date().toISOString(),
      review_required: reviewRequired,
      added_count: counts.added,
      changed_count: counts.changed,
      unchanged_count: counts.unchanged,
      removed_count: counts.removed,
      duplicate_count: duplicates,
    })

    return {
      runId: start.run_id,
      runType: 'snapshot_replay',
      sourceRunId: start.source_run_id,
      snapshotId: start.snapshot_id,
      adapterVersion: GWINNETT_DISCOVERY_ADAPTER_VERSION,
      status,
      saleDate: parsed.saleDate,
      records: parsed.records.length,
      added: counts.added,
      changed: counts.changed,
      unchanged: counts.unchanged,
      removed: counts.removed,
      duplicates,
      reasonCodes: parsed.reasonCodes,
    }
  } catch (error) {
    await releaseReplayLock(context, start.run_id).catch(() => undefined)
    const discoveryError = error instanceof CountyHunterDiscoveryError
      ? error
      : new CountyHunterDiscoveryError(
          'SOURCE_STRUCTURE_CHANGED',
          'Snapshot replay failed unexpectedly.',
          { cause: error },
        )
    await patchReplayRun(context, start.run_id, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      review_required: false,
      reason_codes: [discoveryError.reasonCode],
      errors: [{ code: discoveryError.reasonCode, message: discoveryError.message }],
    }).catch(() => undefined)
    throw discoveryError
  }
}
