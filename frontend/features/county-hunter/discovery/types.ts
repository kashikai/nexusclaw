export const COUNTY_HUNTER_DISCOVERY_REASON_CODES = [
  'NO_CURRENT_LIST',
  'MULTIPLE_CURRENT_LIST_CANDIDATES',
  'HISTORICAL_DOCUMENT_REJECTED',
  'RESULTS_DOCUMENT_REJECTED',
  'PDF_TEXT_UNAVAILABLE',
  'SALE_DATE_MISSING',
  'SALE_DATE_IN_PAST',
  'SOURCE_STRUCTURE_CHANGED',
  'OFFICIAL_DOMAIN_MISMATCH',
  'DOCUMENT_URL_REJECTED',
  'CONTENT_TYPE_REJECTED',
  'SOURCE_FETCH_FAILED',
  'DOCUMENT_FETCH_FAILED',
  'SOURCE_LOCKED',
  'DUPLICATE_SOURCE_RECORD',
] as const

export type CountyHunterDiscoveryReasonCode =
  (typeof COUNTY_HUNTER_DISCOVERY_REASON_CODES)[number]

export type OfficialDocumentCandidate = {
  label: string
  documentUrl: string
  saleDate: string | null
}

export type DiscoveryRunStatus =
  | 'queued'
  | 'fetching_source'
  | 'fetching_document'
  | 'parsing'
  | 'normalizing'
  | 'comparing'
  | 'completed'
  | 'review_required'
  | 'failed'

export type ParsedDiscoveryRecord = {
  rawRecordId: string
  sourceOrder: number
  pageNumber: number
  sourceRecordKey: string
  itemNumber: string | null
  rawText: string
  parcelNumberOriginal: string | null
  parcelNumberNormalized: string | null
  ownerName: string | null
  propertyAddress: string | null
  legalDescription: string | null
  amountDue: number | null
  startingBid: number | null
  saleDate: string
  officialNotes: string | null
  normalizedHash: string
  duplicateSourceRecord: boolean
  duplicateOfRecordId: string | null
  reviewRequired: boolean
}

export type ExistingDiscoveryProperty = {
  id: string
  source_record_key: string
  source_record_hash: string | null
  source_record_status: 'current' | 'removed_from_current_source'
}

export type DiscoveryChange = {
  sourceRecordKey: string
  changeType: 'added' | 'changed' | 'unchanged' | 'removed_from_current_source'
  propertyId: string | null
  previousHash: string | null
  currentHash: string | null
  record: ParsedDiscoveryRecord | null
}

export class CountyHunterDiscoveryError extends Error {
  readonly reasonCode: CountyHunterDiscoveryReasonCode
  readonly reviewRequired: boolean
  readonly candidates: OfficialDocumentCandidate[]

  constructor(
    reasonCode: CountyHunterDiscoveryReasonCode,
    safeMessage: string,
    options: {
      reviewRequired?: boolean
      cause?: unknown
      candidates?: OfficialDocumentCandidate[]
    } = {},
  ) {
    super(safeMessage, { cause: options.cause })
    this.name = 'CountyHunterDiscoveryError'
    this.reasonCode = reasonCode
    this.reviewRequired = options.reviewRequired ?? false
    this.candidates = options.candidates ?? []
  }
}
