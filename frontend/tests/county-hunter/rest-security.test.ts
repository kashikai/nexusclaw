import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CountyHunterRequestContext } from '../../features/county-hunter/server/auth'
import {
  countyHunterRest,
  organizationFilter,
} from '../../features/county-hunter/server/rest'

const context: CountyHunterRequestContext = {
  supabaseUrl: 'https://existing-project.supabase.co',
  publishableKey: 'public-publishable-key',
  accessToken: 'verified-user-session-token',
  userId: 'a9f7bc9f-2a04-4094-b958-5eb5dd60103d',
  organizationId: '765bde70-80ee-43a8-877b-aae6e5152111',
  permissions: ['county_hunter.view'],
}

describe('County Hunter PostgREST boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('cannot be upgraded to service role through caller headers', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetcher)

    await countyHunterRest(context, 'county_hunter_counties', organizationFilter(context.organizationId), {
      headers: { Authorization: 'Bearer arbitrary-service-role-value', apikey: 'arbitrary-key' },
    })

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(url).toContain(`organization_id=eq.${context.organizationId}`)
    expect(headers.get('Authorization')).toBe('Bearer verified-user-session-token')
    expect(headers.get('apikey')).toBe('public-publishable-key')
  })

  it('builds the tenant filter only from the trusted context value', () => {
    expect(organizationFilter(context.organizationId)).toBe(`organization_id=eq.${context.organizationId}`)
  })
})
