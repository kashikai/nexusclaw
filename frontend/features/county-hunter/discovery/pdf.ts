import { createHash, randomUUID } from 'node:crypto'
import {
  COUNTY_HUNTER_DISCOVERY_LIMITS,
} from './constants'
import {
  CountyHunterDiscoveryError,
  type ParsedDiscoveryRecord,
} from './types'

export type PdfTextItem = {
  text: string
  x: number
  y: number
  width: number
}

export type PdfTextPage = {
  pageNumber: number
  items: PdfTextItem[]
}

type PdfJsTextItem = {
  str: string
  transform: number[]
  width: number
}

function assertPdfEnvelope(bytes: Uint8Array) {
  if (bytes.byteLength > COUNTY_HUNTER_DISCOVERY_LIMITS.documentBytes) {
    throw new CountyHunterDiscoveryError(
      'CONTENT_TYPE_REJECTED',
      'The official PDF exceeds the configured size limit.',
      { reviewRequired: true },
    )
  }
  const prefix = Buffer.from(bytes.subarray(0, 5)).toString('ascii')
  const tail = Buffer.from(bytes.subarray(Math.max(0, bytes.byteLength - 1_024))).toString('latin1')
  if (prefix !== '%PDF-' || !tail.includes('%%EOF')) {
    throw new CountyHunterDiscoveryError(
      'PDF_TEXT_UNAVAILABLE',
      'The official document is not a complete PDF.',
      { reviewRequired: true },
    )
  }
}

export async function extractPdfTextPages(bytes: Uint8Array): Promise<PdfTextPage[]> {
  assertPdfEnvelope(bytes)
  try {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const loadingTask = getDocument({
      data: bytes.slice(),
      isEvalSupported: false,
      stopAtErrors: true,
      useSystemFonts: true,
      useWorkerFetch: false,
    })
    const document = await loadingTask.promise
    const pages: PdfTextPage[] = []
    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber)
        const content = await page.getTextContent()
        const items = content.items.flatMap((item) => {
          if (!('str' in item)) return []
          const textItem = item as PdfJsTextItem
          const text = textItem.str.replace(/\s+/g, ' ').trim()
          if (!text) return []
          return [{
            text,
            x: Number(textItem.transform[4] ?? 0),
            y: Number(textItem.transform[5] ?? 0),
            width: Number(textItem.width ?? 0),
          }]
        })
        pages.push({ pageNumber, items })
      }
    } finally {
      await document.destroy()
    }
    if (!pages.some((page) => page.items.some((item) => item.text.trim()))) {
      throw new CountyHunterDiscoveryError(
        'PDF_TEXT_UNAVAILABLE',
        'The official PDF contains no extractable text and would require OCR.',
        { reviewRequired: true },
      )
    }
    return pages
  } catch (error) {
    if (error instanceof CountyHunterDiscoveryError) throw error
    const safeName = error instanceof Error ? error.name.slice(0, 80) : 'UnknownError'
    const safeMessage = error instanceof Error
      ? error.message
          .replace(/https?:\/\/\S+/gi, '[redacted-url]')
          .replace(/\b0x[0-9a-f]{40,}\b/gi, '[redacted-hex]')
          .slice(0, 240)
      : 'PDF extraction failed.'
    console.error('[county-hunter.discovery] PDF extraction failed', {
      name: safeName,
      message: safeMessage,
    })
    throw new CountyHunterDiscoveryError(
      'PDF_TEXT_UNAVAILABLE',
      'The official PDF text could not be extracted deterministically.',
      { reviewRequired: true, cause: error },
    )
  }
}

type Line = { y: number; items: PdfTextItem[] }

function groupLines(items: PdfTextItem[]): Line[] {
  const lines: Line[] = []
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 4)
    if (line) line.items.push(item)
    else lines.push({ y: item.y, items: [item] })
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => ({ ...line, items: line.items.sort((a, b) => a.x - b.x) }))
}

function parseSaleDate(pages: PdfTextPage[]): string {
  const headerText = pages
    .flatMap((page) => groupLines(page.items).slice(0, 5))
    .flatMap((line) => line.items.map((item) => item.text))
    .join(' ')
  const match = headerText.match(
    /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-3]?\d),\s+(20\d{2})\b/i,
  )
  if (!match) {
    throw new CountyHunterDiscoveryError(
      'SALE_DATE_MISSING',
      'The official PDF does not contain a recognizable sale date.',
      { reviewRequired: true },
    )
  }
  const parsed = new Date(`${match[1]} ${match[2]}, ${match[3]} 00:00:00 UTC`)
  if (Number.isNaN(parsed.getTime())) {
    throw new CountyHunterDiscoveryError(
      'SALE_DATE_MISSING',
      'The official PDF sale date is invalid.',
      { reviewRequired: true },
    )
  }
  return parsed.toISOString().slice(0, 10)
}

function normalizeParcelNumber(value: string | null): string | null {
  const normalized = value?.toUpperCase().replace(/[^A-Z0-9]/g, '') ?? ''
  return normalized || null
}

function parseMoney(value: string | null): number | null {
  if (!value) return null
  const normalized = value.replace(/[$,\s]/g, '')
  if (!/^\d+(?:\.\d{2})?$/.test(normalized)) return null
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

function stableRecordHash(record: {
  parcelNumberNormalized: string | null
  ownerName: string | null
  propertyAddress: string | null
  amountDue: number | null
  saleDate: string
}): string {
  return createHash('sha256').update(JSON.stringify(record)).digest('hex')
}

function columnText(items: PdfTextItem[], start: number, end: number): string | null {
  const text = items
    .filter((item) => item.x >= start - 1 && item.x < end - 1)
    .map((item) => item.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

export function parseGwinnettPdfPages(pages: PdfTextPage[]): {
  saleDate: string
  records: ParsedDiscoveryRecord[]
  reasonCodes: ('DUPLICATE_SOURCE_RECORD')[]
} {
  const saleDate = parseSaleDate(pages)
  const records: ParsedDiscoveryRecord[] = []
  let sourceOrder = 0

  for (const page of pages) {
    const lines = groupLines(page.items)
    const header = lines.find((line) => {
      const text = line.items.map((item) => item.text).join(' ')
      return /\bPIN\b/i.test(text) && /OwnerName/i.test(text) && /\bSitus\b/i.test(text) && /Amount Due/i.test(text)
    })
    if (!header) continue

    const findHeaderX = (pattern: RegExp) =>
      header.items.find((item) => pattern.test(item.text))?.x
    const pinX = findHeaderX(/^PIN$/i)
    const ownerX = findHeaderX(/OwnerName/i)
    const situsX = findHeaderX(/^Situs$/i)
    const amountX = findHeaderX(/Amount Due/i)
    if (
      pinX === undefined ||
      ownerX === undefined ||
      situsX === undefined ||
      amountX === undefined ||
      !(pinX < ownerX && ownerX < situsX && situsX < amountX)
    ) {
      throw new CountyHunterDiscoveryError(
        'SOURCE_STRUCTURE_CHANGED',
        'The official PDF column structure is no longer recognizable.',
        { reviewRequired: true },
      )
    }
    const ownerSitusBoundary = (ownerX + situsX) / 2
    const situsAmountBoundary = (situsX + amountX) / 2

    for (const line of lines.filter((candidate) => candidate.y < header.y - 1)) {
      const parcelItem = line.items.find(
        (item) => item.x < ownerSitusBoundary && /^R[A-Z0-9]+(?:\s+[A-Z0-9]+)?$/i.test(item.text),
      )
      const parcelOriginal = parcelItem?.text ?? null
      const ownerName = line.items
        .filter((item) =>
          item !== parcelItem &&
          item.x < ownerSitusBoundary,
        )
        .map((item) => item.text)
        .join(' ')
        .trim() || null
      const propertyAddress = columnText(line.items, ownerSitusBoundary, situsAmountBoundary)
      const amountLabel = columnText(line.items, situsAmountBoundary, Number.POSITIVE_INFINITY)
      if (!parcelOriginal && !ownerName && !propertyAddress && !amountLabel) continue
      if (!parcelOriginal) continue

      const parcelNumberNormalized = normalizeParcelNumber(parcelOriginal)
      const rawText = line.items.map((item) => item.text).join(' ').slice(
        0,
        COUNTY_HUNTER_DISCOVERY_LIMITS.rawRecordText,
      )
      const amountDue = parseMoney(amountLabel)
      const reviewRequired = !parcelNumberNormalized || !ownerName || !propertyAddress || amountDue === null
      const sourceRecordKey =
        parcelNumberNormalized ?? createHash('sha256').update(rawText).digest('hex')
      const normalizedHash = stableRecordHash({
        parcelNumberNormalized,
        ownerName,
        propertyAddress,
        amountDue,
        saleDate,
      })
      records.push({
        rawRecordId: randomUUID(),
        sourceOrder,
        pageNumber: page.pageNumber,
        sourceRecordKey,
        itemNumber: null,
        rawText,
        parcelNumberOriginal: parcelOriginal,
        parcelNumberNormalized,
        ownerName,
        propertyAddress,
        legalDescription: null,
        amountDue,
        startingBid: null,
        saleDate,
        officialNotes: null,
        normalizedHash,
        duplicateSourceRecord: false,
        duplicateOfRecordId: null,
        reviewRequired,
      })
      sourceOrder += 1
    }
  }

  if (records.length === 0) {
    throw new CountyHunterDiscoveryError(
      'SOURCE_STRUCTURE_CHANGED',
      'The official PDF contains no deterministic property rows.',
      { reviewRequired: true },
    )
  }

  const firstByKey = new Map<string, ParsedDiscoveryRecord>()
  let duplicateCount = 0
  for (const record of records) {
    const first = firstByKey.get(record.sourceRecordKey)
    if (!first) {
      firstByKey.set(record.sourceRecordKey, record)
      continue
    }
    record.duplicateSourceRecord = true
    record.duplicateOfRecordId = first.rawRecordId
    record.reviewRequired = true
    first.duplicateSourceRecord = true
    first.reviewRequired = true
    duplicateCount += 1
  }

  return {
    saleDate,
    records,
    reasonCodes: duplicateCount > 0 ? ['DUPLICATE_SOURCE_RECORD'] : [],
  }
}
