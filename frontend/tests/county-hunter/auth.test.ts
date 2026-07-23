import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  requireCountyHunterPermission,
  type CountyHunterIdentityResolver,
} from '../../features/county-hunter/server/auth'
import type { TrustedCountyHunterIdentity } from '../../features/county-hunter/server/supabase'
import { CountyHunterHttpError } from '../../features/county-hunter/server/http-error'

const USER_ID = 'a9f7bc9f-2a04-4094-b958-5eb5dd60103d'
const ORGANIZATION_ID = '765bde70-80ee-43a8-877b-aae6e5152111'
const request = (authorization?: string) =>
  new Request('https://nexusclaw.test/api/county-hunter/counties', {
    headers: authorization ? { Authorization: authorization } : undefined,
  })

function identity(overrides: Partial<TrustedCountyHunterIdentity> = {}): TrustedCountyHunterIdentity {
  return {
    supabaseUrl: 'https://existing-project.supabase.co',
    publishableKey: 'public-publishable-key',
    accessToken: 'verified-cookie-session-token',
    userId: USER_ID,
    organizationId: ORGANIZATION_ID,
    permissions: ['county_hunter.view'],
    ...overrides,
  }
}

const resolve = (value: TrustedCountyHunterIdentity | null): CountyHunterIdentityResolver => async () => value

describe('County Hunter shared authorization adapter', () => {
  beforeEach(() => {
    process.env.COUNTY_HUNTER_ENABLED = 'true'
  })

  afterEach(() => {
    delete process.env.COUNTY_HUNTER_ENABLED
  })

  it('returns 401 for a missing or invalid cookie session', async () => {
    await expect(requireCountyHunterPermission(request(), 'county_hunter.view', resolve(null))).rejects.toMatchObject({
      status: 401,
    })
  })

  it('fails immediately when the current membership is inactive or revoked', async () => {
    const inactiveMembership: CountyHunterIdentityResolver = async () => {
      throw new CountyHunterHttpError('No active County Hunter membership exists for this organization.', 403)
    }
    await expect(
      requireCountyHunterPermission(request(), 'county_hunter.view', inactiveMembership),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('fails closed when the trusted session has no organization', async () => {
    await expect(
      requireCountyHunterPermission(
        request(),
        'county_hunter.view',
        resolve(identity({ organizationId: '' })),
      ),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('fails closed when membership permission is missing', async () => {
    await expect(
      requireCountyHunterPermission(request(), 'county_hunter.manage', resolve(identity({ permissions: [] }))),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('rejects bootstrap authorization for a non-admin membership', async () => {
    await expect(
      requireCountyHunterPermission(
        request(),
        'county_hunter.admin',
        resolve(identity({ permissions: ['county_hunter.view', 'county_hunter.manage'] })),
      ),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('accepts an admin membership as an explicit permission superset', async () => {
    const context = await requireCountyHunterPermission(
      request(),
      'county_hunter.manage',
      resolve(identity({ permissions: ['county_hunter.admin'] })),
    )
    expect(context.organizationId).toBe(ORGANIZATION_ID)
  })

  it('ignores arbitrary Authorization headers and uses only the trusted resolver', async () => {
    const context = await requireCountyHunterPermission(
      request('Bearer attacker-controlled-token'),
      'county_hunter.view',
      resolve(identity()),
    )
    expect(context.accessToken).toBe('verified-cookie-session-token')
  })

  it('returns 404 when the private server flag is disabled', async () => {
    process.env.COUNTY_HUNTER_ENABLED = 'false'
    await expect(
      requireCountyHunterPermission(request(), 'county_hunter.view', resolve(identity())),
    ).rejects.toMatchObject({ status: 404 })
  })
})
