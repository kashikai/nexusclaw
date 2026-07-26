import { describe, expect, it, vi } from 'vitest'
import { fetchDiscoveryResourceSafely } from '../../features/county-hunter/discovery/secure-fetch'
import type { CountyHunterDnsLookup } from '../../features/county-hunter/server/safe-url'
import { CountyHunterDiscoveryError } from '../../features/county-hunter/discovery/types'

const host = 'www.gwinnetttaxcommissioner.com'
const start = `https://${host}/tax-sales`
const lookup: CountyHunterDnsLookup = async () => [{ address: '93.184.216.34', family: 4 }]

const options = {
  allowedHostnames: [host],
  allowedContentTypes: ['text/html'],
  maxBytes: 1_024,
  failureReason: 'SOURCE_FETCH_FAILED' as const,
  lookup,
}

describe('County Hunter official-source fetcher', () => {
  it('uses no credentials and follows a validated official redirect', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { location: '/current' },
      }))
      .mockResolvedValueOnce(new Response('<html>current</html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }))
    const result = await fetchDiscoveryResourceSafely(start, { ...options, fetcher })
    expect(result.finalUrl).toBe(`https://${host}/current`)
    expect(result.redirects).toBe(1)
    const init = fetcher.mock.calls[0][1] as RequestInit
    expect(init.credentials).toBe('omit')
    expect(new Headers(init.headers).has('Cookie')).toBe(false)
    expect(new Headers(init.headers).has('Authorization')).toBe(false)
    expect(new Headers(init.headers).get('User-Agent')).toMatch(/NexusClaw-CountyHunter/)
  })

  it('rejects redirects and lookalike domains outside the exact allowlist', async () => {
    const redirect = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'https://evil-gwinnetttaxcommissioner.com/list.pdf' },
    }))
    await expect(fetchDiscoveryResourceSafely(start, { ...options, fetcher: redirect }))
      .rejects.toMatchObject({ reasonCode: 'OFFICIAL_DOMAIN_MISMATCH' })
    await expect(fetchDiscoveryResourceSafely(
      'https://evil-gwinnetttaxcommissioner.com/start',
      options,
    )).rejects.toMatchObject({ reasonCode: 'OFFICIAL_DOMAIN_MISMATCH' })
  })

  it('rejects private DNS, unexpected content and oversized bodies', async () => {
    const privateLookup: CountyHunterDnsLookup = async () => [{ address: '169.254.169.254', family: 4 }]
    await expect(fetchDiscoveryResourceSafely(start, { ...options, lookup: privateLookup }))
      .rejects.toMatchObject({ reasonCode: 'DOCUMENT_URL_REJECTED' })

    const wrongType = vi.fn().mockResolvedValue(new Response('not html', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    }))
    await expect(fetchDiscoveryResourceSafely(start, { ...options, fetcher: wrongType }))
      .rejects.toMatchObject({ reasonCode: 'CONTENT_TYPE_REJECTED' })

    const tooLarge = vi.fn().mockResolvedValue(new Response('x'.repeat(2_000), {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }))
    await expect(fetchDiscoveryResourceSafely(start, { ...options, fetcher: tooLarge }))
      .rejects.toBeInstanceOf(CountyHunterDiscoveryError)
  })
})
