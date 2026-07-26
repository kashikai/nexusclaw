import { describe, expect, it } from 'vitest'
import { discoverGwinnettCurrentList } from '../../features/county-hunter/discovery/landing'
import { CountyHunterDiscoveryError } from '../../features/county-hunter/discovery/types'

const landingUrl =
  'https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales'
const now = new Date('2026-07-27T00:00:00.000Z')

function page(body: string) {
  return `<html><body><h3>Upcoming Tax Sales</h3>${body}</body></html>`
}

async function reason(action: () => unknown) {
  try {
    action()
    return null
  } catch (error) {
    expect(error).toBeInstanceOf(CountyHunterDiscoveryError)
    return (error as CountyHunterDiscoveryError).reasonCode
  }
}

describe('Gwinnett landing-page adapter', () => {
  it('discovers one current relative property-list link and its sale date', () => {
    const result = discoverGwinnettCurrentList(
      page('<strong>August 4, 2026 (<a href="/documents/current-list?">List of Properties</a>)</strong>'),
      landingUrl,
      now,
    )
    expect(result.candidate).toEqual({
      label: 'List of Properties',
      documentUrl: 'https://www.gwinnetttaxcommissioner.com/documents/current-list?',
      saleDate: '2026-08-04',
    })
    expect(result.reasonCodes).toEqual([])
  })

  it('reports no current list when the upcoming section has dates only', async () => {
    expect(await reason(() => discoverGwinnettCurrentList(page('October 6, 2026'), landingUrl, now)))
      .toBe('NO_CURRENT_LIST')
  })

  it('requires administrative review for multiple current candidates', async () => {
    const html = page(`
      August 4, 2026 (<a href="/documents/a">List of Properties</a>)
      October 6, 2026 (<a href="/documents/b">List of Properties</a>)
    `)
    expect(await reason(() => discoverGwinnettCurrentList(html, landingUrl, now)))
      .toBe('MULTIPLE_CURRENT_LIST_CANDIDATES')
  })

  it('rejects historical, excess-funds and results documents', async () => {
    expect(await reason(() => discoverGwinnettCurrentList(
      page('<a href="/archive/2025-property-list">Historical Property List</a>'),
      landingUrl,
      now,
    ))).toBe('HISTORICAL_DOCUMENT_REJECTED')
    expect(await reason(() => discoverGwinnettCurrentList(
      page('<a href="/tax-sale-excess-funds">Tax Sale Excess Funds</a>'),
      landingUrl,
      now,
    ))).toBe('RESULTS_DOCUMENT_REJECTED')
    expect(await reason(() => discoverGwinnettCurrentList(
      page('<a href="/tax-sale-results">Tax Sale Results</a>'),
      landingUrl,
      now,
    ))).toBe('RESULTS_DOCUMENT_REJECTED')
  })

  it('preserves a past current list but marks it for review', () => {
    const result = discoverGwinnettCurrentList(
      page('July 7, 2026 (<a href="/documents/current">List of Properties</a>)'),
      landingUrl,
      now,
    )
    expect(result.reasonCodes).toEqual(['SALE_DATE_IN_PAST'])
  })

  it('rejects a missing date and an unexpected source structure', async () => {
    expect(await reason(() => discoverGwinnettCurrentList(
      page('<a href="/documents/current">List of Properties</a>'),
      landingUrl,
      now,
    ))).toBe('SALE_DATE_MISSING')
    expect(await reason(() => discoverGwinnettCurrentList(
      '<html><a href="/documents/current">List of Properties</a></html>',
      landingUrl,
      now,
    ))).toBe('SOURCE_STRUCTURE_CHANGED')
  })
})
