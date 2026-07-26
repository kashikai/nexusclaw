import { describe, expect, it } from 'vitest'
import {
  COUNTY_HUNTER_DISCOVERY_LIMITS,
  GWINNETT_OFFICIAL_HOSTNAMES,
  GWINNETT_TAX_SALE_LANDING_URL,
} from '../../features/county-hunter/discovery/constants'
import { discoverGwinnettCurrentList } from '../../features/county-hunter/discovery/landing'
import { extractPdfTextPages, parseGwinnettPdfPages } from '../../features/county-hunter/discovery/pdf'
import { fetchDiscoveryResourceSafely } from '../../features/county-hunter/discovery/secure-fetch'

const live = process.env.COUNTY_HUNTER_LIVE_SOURCE_TEST === '1' ? describe : describe.skip

live('Gwinnett official live source (opt-in)', () => {
  it('discovers and parses the current official textual PDF without OCR', async () => {
    const landing = await fetchDiscoveryResourceSafely(GWINNETT_TAX_SALE_LANDING_URL, {
      allowedHostnames: GWINNETT_OFFICIAL_HOSTNAMES,
      allowedContentTypes: ['text/html'],
      maxBytes: COUNTY_HUNTER_DISCOVERY_LIMITS.landingBytes,
      failureReason: 'SOURCE_FETCH_FAILED',
    })
    const candidate = discoverGwinnettCurrentList(
      new TextDecoder().decode(landing.bytes),
      landing.finalUrl,
    ).candidate
    const document = await fetchDiscoveryResourceSafely(candidate.documentUrl, {
      allowedHostnames: GWINNETT_OFFICIAL_HOSTNAMES,
      allowedContentTypes: ['application/pdf'],
      maxBytes: COUNTY_HUNTER_DISCOVERY_LIMITS.documentBytes,
      failureReason: 'DOCUMENT_FETCH_FAILED',
    })
    const pages = await extractPdfTextPages(document.bytes)
    const parsed = parseGwinnettPdfPages(pages)
    expect(document.contentType).toBe('application/pdf')
    expect(parsed.saleDate).toBe(candidate.saleDate)
    expect(parsed.records).toHaveLength(25)
    expect(parsed.reasonCodes).toEqual([])
    expect(parsed.records.every((record) => record.parcelNumberNormalized)).toBe(true)
  }, 30_000)
})
