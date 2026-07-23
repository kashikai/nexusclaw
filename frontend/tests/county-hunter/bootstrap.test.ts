import { describe, expect, it, vi } from 'vitest'
import type { CountyHunterRequestContext } from '../../features/county-hunter/server/auth'
import {
  parseCountyHunterBootstrapBody,
  runCountyHunterBootstrap,
} from '../../features/county-hunter/server/bootstrap'
import { requireCountyHunterResource } from '../../features/county-hunter/server/resource'

const context: CountyHunterRequestContext = {
  supabaseUrl: 'https://existing-project.supabase.co',
  publishableKey: 'public-publishable-key',
  accessToken: 'verified-cookie-session-token',
  userId: 'a9f7bc9f-2a04-4094-b958-5eb5dd60103d',
  organizationId: '765bde70-80ee-43a8-877b-aae6e5152111',
  permissions: ['county_hunter.admin'],
}

describe('County Hunter bootstrap and API resource behavior', () => {
  it('accepts only an empty bootstrap body', () => {
    expect(parseCountyHunterBootstrapBody('')).toEqual({})
    expect(parseCountyHunterBootstrapBody('{}')).toEqual({})
    expect(() => parseCountyHunterBootstrapBody('{"organization_id":"other"}')).toThrow(/organization_id/)
    expect(() => parseCountyHunterBootstrapBody('{"extra":true}')).toThrow(/extra/)
  })

  it('returns six creations then zero without passing a client tenant to the RPC', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce([{ counties_created: 6 }])
      .mockResolvedValueOnce([{ counties_created: 0 }])

    await expect(runCountyHunterBootstrap(context, rpc)).resolves.toEqual({ counties_created: 6 })
    await expect(runCountyHunterBootstrap(context, rpc)).resolves.toEqual({ counties_created: 0 })
    expect(rpc).toHaveBeenNthCalledWith(1, context)
    expect(rpc).toHaveBeenNthCalledWith(2, context)
  })

  it('maps a nonexistent tenant-scoped resource to 404', () => {
    try {
      requireCountyHunterResource([], 'Property')
      throw new Error('Expected a 404 error.')
    } catch (error) {
      expect(error).toMatchObject({ status: 404, message: 'Property not found.' })
    }
  })
})
