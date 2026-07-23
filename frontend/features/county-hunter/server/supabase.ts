import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CountyHunterPermission } from '../types'
import { isUuid } from '../validation'
import { CountyHunterHttpError } from './http-error'
import { countyHunterCookieOptions } from './cookie-options'

export type TrustedCountyHunterIdentity = {
  supabaseUrl: string
  publishableKey: string
  accessToken: string
  userId: string
  organizationId: string
  permissions: CountyHunterPermission[]
}

const COUNTY_HUNTER_PERMISSIONS = new Set<CountyHunterPermission>([
  'county_hunter.view',
  'county_hunter.manage',
  'county_hunter.run_discovery',
  'county_hunter.approve_bid',
  'county_hunter.admin',
])

export async function readTrustedCountyHunterIdentity(): Promise<TrustedCountyHunterIdentity | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !publishableKey) {
    throw new CountyHunterHttpError('The shared Supabase project is not configured.', 503)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookieOptions: countyHunterCookieOptions(),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot set cookies. The scoped middleware refreshes them.
        }
      },
    },
  })

  // getUser() verifies the access token with Supabase Auth. getSession() alone is not
  // used as an authorization source; it is read afterwards only to call PostgREST with RLS.
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user || !isUuid(userData.user.id)) return null

  const organizationId = userData.user.app_metadata?.organization_id
  if (!isUuid(organizationId)) {
    throw new CountyHunterHttpError('The authenticated user has no trusted organization assignment.', 403)
  }

  const { data: membership, error: membershipError } = await supabase
    .from('county_hunter_memberships')
    .select('permissions')
    .eq('user_id', userData.user.id)
    .eq('organization_id', organizationId)
    .eq('active', true)
    .maybeSingle()

  if (membershipError) {
    throw new CountyHunterHttpError('Unable to verify the County Hunter membership.', 503)
  }
  if (!membership) {
    throw new CountyHunterHttpError('No active County Hunter membership exists for this organization.', 403)
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (sessionError || !accessToken) return null

  const rawPermissions = Array.isArray(membership.permissions) ? membership.permissions : []
  const permissions = rawPermissions.filter(
    (permission): permission is CountyHunterPermission =>
      typeof permission === 'string' && COUNTY_HUNTER_PERMISSIONS.has(permission as CountyHunterPermission),
  )

  return {
    supabaseUrl,
    publishableKey,
    accessToken,
    userId: userData.user.id,
    organizationId,
    permissions,
  }
}
