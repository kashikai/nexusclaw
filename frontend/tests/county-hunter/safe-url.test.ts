import { describe, expect, it, vi } from 'vitest'
import {
  fetchCountyHunterUrlSafely,
  validateCountyHunterOutboundUrl,
  type CountyHunterDnsLookup,
} from '../../features/county-hunter/server/safe-url'

describe('County Hunter outbound URL guard', () => {
  it('rejects a public hostname that resolves to a private address', async () => {
    const lookup: CountyHunterDnsLookup = async () => [{ address: '10.20.30.40', family: 4 }]
    await expect(validateCountyHunterOutboundUrl('https://records.example.gov', lookup)).rejects.toThrow(
      /private or reserved/,
    )
  })

  it('rejects a redirect to a private address before the second request', async () => {
    const lookup: CountyHunterDnsLookup = async () => [{ address: '93.184.216.34', family: 4 }]
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/internal' } }),
    )

    await expect(
      fetchCountyHunterUrlSafely('https://records.example.gov/start', { lookup, fetcher }),
    ).rejects.toThrow(/private or reserved/)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('allows a public HTTPS target with public DNS', async () => {
    const lookup: CountyHunterDnsLookup = async () => [{ address: '93.184.216.34', family: 4 }]
    await expect(validateCountyHunterOutboundUrl('https://records.example.gov', lookup)).resolves.toBeInstanceOf(URL)
  })
})
