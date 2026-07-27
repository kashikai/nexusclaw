import { describe, expect, it } from 'vitest'
import {
  buildDiscoveryDiff,
  buildSnapshotReplayDiff,
  describeSnapshotChange,
} from '../../features/county-hunter/discovery/diff'
import type { ParsedDiscoveryRecord } from '../../features/county-hunter/discovery/types'

function record(key: string, hash: string): ParsedDiscoveryRecord {
  return {
    rawRecordId: `00000000-0000-4000-8000-${key.padStart(12, '0')}`,
    sourceOrder: Number(key),
    pageNumber: 1,
    sourceRecordKey: key,
    itemNumber: null,
    rawText: `record ${key}`,
    parcelNumberOriginal: key,
    parcelNumberNormalized: key,
    ownerName: 'Fixture Owner',
    propertyAddress: 'Fixture Address',
    legalDescription: null,
    amountDue: 1,
    startingBid: null,
    saleDate: '2026-08-04',
    officialNotes: null,
    normalizedHash: hash,
    duplicateSourceRecord: false,
    duplicateOfRecordId: null,
    reviewRequired: false,
  }
}

describe('County Hunter discovery diff', () => {
  it('classifies added, changed, unchanged and removed records deterministically', () => {
    const changes = buildDiscoveryDiff(
      [
        { id: 'p1', source_record_key: '1', source_record_hash: 'same', source_record_status: 'current' },
        { id: 'p2', source_record_key: '2', source_record_hash: 'old', source_record_status: 'current' },
        { id: 'p3', source_record_key: '3', source_record_hash: 'gone', source_record_status: 'current' },
        { id: 'p5', source_record_key: '5', source_record_hash: 'removed', source_record_status: 'removed_from_current_source' },
      ],
      [record('1', 'same'), record('2', 'new'), record('4', 'added')],
    )
    expect(changes.map((change) => [change.sourceRecordKey, change.changeType])).toEqual([
      ['1', 'unchanged'],
      ['2', 'changed'],
      ['4', 'added'],
      ['3', 'removed_from_current_source'],
    ])
  })

  it('is idempotent for an identical current snapshot', () => {
    const changes = buildDiscoveryDiff(
      [{ id: 'p1', source_record_key: '1', source_record_hash: 'same', source_record_status: 'current' }],
      [record('1', 'same')],
    )
    expect(changes).toHaveLength(1)
    expect(changes[0].changeType).toBe('unchanged')
  })

  it('preserves snapshots for same URL/new content and new URL/same content', () => {
    expect(describeSnapshotChange(
      { url: 'https://official/list', hash: 'old' },
      { url: 'https://official/list', hash: 'new' },
    )).toEqual({ urlChanged: false, contentChanged: true, preserveSnapshot: true })
    expect(describeSnapshotChange(
      { url: 'https://official/old', hash: 'same' },
      { url: 'https://official/new', hash: 'same' },
    )).toEqual({ urlChanged: true, contentChanged: false, preserveSnapshot: true })
  })

  it('compares a replay with its source-run records without mutating canonical properties', () => {
    const changes = buildSnapshotReplayDiff(
      [
        { property_id: 'p1', source_record_key: '1', normalized_hash: 'same' },
        { property_id: 'p2', source_record_key: '2', normalized_hash: 'old' },
        { property_id: null, source_record_key: '3', normalized_hash: 'removed' },
      ],
      [record('1', 'same'), record('2', 'new'), record('4', 'added')],
    )
    expect(changes.map((change) => [
      change.sourceRecordKey,
      change.changeType,
      change.propertyId,
    ])).toEqual([
      ['1', 'unchanged', 'p1'],
      ['2', 'changed', 'p2'],
      ['4', 'added', null],
      ['3', 'removed_from_current_source', null],
    ])
  })

  it('makes repeated replay of the same parser output idempotent', () => {
    const changes = buildSnapshotReplayDiff(
      [{ property_id: 'p1', source_record_key: '1', normalized_hash: 'same' }],
      [record('1', 'same')],
    )
    expect(changes).toHaveLength(1)
    expect(changes[0].changeType).toBe('unchanged')
  })
})
