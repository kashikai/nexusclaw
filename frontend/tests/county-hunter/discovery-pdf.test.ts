import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  extractPdfTextPages,
  parseGwinnettPdfPages,
  type PdfTextPage,
} from '../../features/county-hunter/discovery/pdf'

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/county-hunter/fixtures/gwinnett-current-list.json'), 'utf8'),
) as PdfTextPage

function minimalPdf(text: string): Uint8Array {
  const escaped = text.replace(/([\\()])/g, '\\$1')
  const stream = text ? `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET` : ''
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body))
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(body)
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(body)
}

describe('Gwinnett current-list PDF adapter', () => {
  it('keeps PDF.js outside the Next.js server bundle for native Node execution', () => {
    const nextConfig = readFileSync(resolve(process.cwd(), 'next.config.js'), 'utf8')
    expect(nextConfig).toContain("serverExternalPackages: ['pdfjs-dist']")
  })

  it('parses the sanitized column fixture without inventing fields', () => {
    const result = parseGwinnettPdfPages([fixture])
    expect(result.saleDate).toBe('2026-08-04')
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toMatchObject({
      pageNumber: 1,
      sourceOrder: 0,
      parcelNumberOriginal: 'R1001 001',
      parcelNumberNormalized: 'R1001001',
      ownerName: 'SAMPLE OWNER ONE LLC',
      propertyAddress: '100 EXAMPLE WAY',
      amountDue: 12345.67,
      legalDescription: null,
      startingBid: null,
    })
  })

  it('detects duplicate parcel identities without silently discarding rows', () => {
    const duplicate: PdfTextPage = {
      ...fixture,
      items: fixture.items.map((item) =>
        item.text === 'R1001 002' ? { ...item, text: 'R1001 001' } : item),
    }
    const result = parseGwinnettPdfPages([duplicate])
    expect(result.records).toHaveLength(2)
    expect(result.reasonCodes).toEqual(['DUPLICATE_SOURCE_RECORD'])
    expect(result.records.every((record) => record.reviewRequired)).toBe(true)
    expect(result.records[1].duplicateOfRecordId).toBe(result.records[0].rawRecordId)
  })

  it('extracts embedded text without OCR and rejects empty or truncated PDFs', async () => {
    const pages = await extractPdfTextPages(minimalPdf('Embedded text'))
    expect(pages.flatMap((page) => page.items).map((item) => item.text).join(' ')).toContain('Embedded text')
    await expect(extractPdfTextPages(minimalPdf(''))).rejects.toMatchObject({
      reasonCode: 'PDF_TEXT_UNAVAILABLE',
    })
    await expect(extractPdfTextPages(minimalPdf('truncated').slice(0, -8))).rejects.toMatchObject({
      reasonCode: 'PDF_TEXT_UNAVAILABLE',
    })
  }, 20_000)

  it('requires the expected labeled PDF columns', () => {
    const changed = {
      ...fixture,
      items: fixture.items.filter((item) => item.text !== 'Amount Due'),
    }
    let caught: unknown
    try {
      parseGwinnettPdfPages([changed])
    } catch (error) {
      caught = error
    }
    expect(caught).toMatchObject({ reasonCode: 'SOURCE_STRUCTURE_CHANGED' })
  })
})
