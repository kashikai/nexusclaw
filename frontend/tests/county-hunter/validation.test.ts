import { describe, expect, it } from 'vitest'
import {
  CountyHunterValidationError,
  isUuid,
  optionalHttpsUrl,
  optionalNumber,
} from '../../features/county-hunter/validation'
import {
  parseCountyPatch,
  parsePropertyCreate,
  parseSourceCreate,
} from '../../features/county-hunter/server/payloads'

const COUNTY_ID = '71c41439-f252-4d05-8fed-c35ab78e2439'
const AUCTION_ID = 'd95de004-04b2-4f87-a864-fec57c201bd6'
const OTHER_ORGANIZATION = 'c5dbdb28-bc45-4f8e-bfa3-f190e5a81509'

describe('County Hunter validation', () => {
  it('accepts valid UUIDs and rejects arbitrary identifiers', () => {
    expect(isUuid(COUNTY_ID)).toBe(true)
    expect(isUuid('county-1')).toBe(false)
    expect(() => parsePropertyCreate({ auction_id: 'bad', county_id: COUNTY_ID })).toThrow(
      CountyHunterValidationError,
    )
  })

  it.each([
    'http://example.gov',
    'ftp://example.gov/file',
    'https://localhost/admin',
    'https://127.0.0.1/admin',
    'https://10.10.0.1/file',
    'https://172.16.0.1/file',
    'https://192.168.1.2/file',
    'https://[::1]/admin',
    'https://[fc00::1]/admin',
    'https://user:pass@example.gov',
  ])('rejects unsafe URL %s', (url) => {
    expect(() => optionalHttpsUrl(url, 'url')).toThrow(CountyHunterValidationError)
  })

  it('accepts a syntactically public HTTPS URL', () => {
    expect(optionalHttpsUrl('https://example.gov/tax-sale', 'url')).toBe('https://example.gov/tax-sale')
  })

  it('enforces percentage bounds', () => {
    expect(optionalNumber(100, 'coverage', 0, 100)).toBe(100)
    expect(() => optionalNumber(101, 'coverage', 0, 100)).toThrow(CountyHunterValidationError)
  })

  it('keeps nullable county URLs explicit', () => {
    expect(parseCountyPatch({ official_website_url: '' })).toEqual({ official_website_url: null })
  })

  it('normalizes a manually configured source without starting crawling', () => {
    expect(parseSourceCreate({ name: 'County tax sale', source_type: 'tax_sale', url: '' }, COUNTY_ID)).toMatchObject({
      county_id: COUNTY_ID,
      url: null,
      status: 'pending_manual_configuration',
    })
  })

  it('rejects extra fields and organization mass assignment', () => {
    expect(() => parseCountyPatch({ unexpected: true })).toThrow(/Unexpected field/)
    expect(() => parseCountyPatch({ organization_id: OTHER_ORGANIZATION })).toThrow(/organization_id/)
    expect(() =>
      parsePropertyCreate({
        auction_id: AUCTION_ID,
        county_id: COUNTY_ID,
        organization_id: OTHER_ORGANIZATION,
      }),
    ).toThrow(/organization_id/)
  })

  it('accepts valid property relationships without accepting a tenant field', () => {
    const result = parsePropertyCreate({ auction_id: AUCTION_ID, county_id: COUNTY_ID })
    expect(result.status).toBe('discovered')
  })
})
