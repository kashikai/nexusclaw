import type {
  DiscoveryChange,
  ExistingDiscoveryProperty,
  ParsedDiscoveryRecord,
} from './types'

export function buildDiscoveryDiff(
  existing: ExistingDiscoveryProperty[],
  currentRecords: ParsedDiscoveryRecord[],
): DiscoveryChange[] {
  const existingByKey = new Map(existing.map((property) => [property.source_record_key, property]))
  const currentByKey = new Map<string, ParsedDiscoveryRecord>()
  for (const record of currentRecords) {
    if (!currentByKey.has(record.sourceRecordKey)) currentByKey.set(record.sourceRecordKey, record)
  }

  const changes: DiscoveryChange[] = []
  for (const [sourceRecordKey, record] of currentByKey) {
    const property = existingByKey.get(sourceRecordKey)
    changes.push({
      sourceRecordKey,
      changeType: !property
        ? 'added'
        : property.source_record_hash === record.normalizedHash
          ? 'unchanged'
          : 'changed',
      propertyId: property?.id ?? null,
      previousHash: property?.source_record_hash ?? null,
      currentHash: record.normalizedHash,
      record,
    })
  }
  for (const property of existing) {
    if (
      currentByKey.has(property.source_record_key) ||
      property.source_record_status === 'removed_from_current_source'
    ) {
      continue
    }
    changes.push({
      sourceRecordKey: property.source_record_key,
      changeType: 'removed_from_current_source',
      propertyId: property.id,
      previousHash: property.source_record_hash,
      currentHash: null,
      record: null,
    })
  }
  return changes
}

export function describeSnapshotChange(
  previous: { url: string | null; hash: string | null },
  current: { url: string; hash: string },
) {
  return {
    urlChanged: previous.url !== current.url,
    contentChanged: previous.hash !== current.hash,
    preserveSnapshot: true,
  }
}
