import type { CountyHunterPermission } from '../types'
import { isUuid } from '../validation'
import { isCountyHunterServerEnabled } from './feature-flags'
import {
  readTrustedCountyHunterIdentity,
  type TrustedCountyHunterIdentity,
} from './supabase'
import { CountyHunterHttpError } from './http-error'

export { CountyHunterHttpError } from './http-error'

export type CountyHunterRequestContext = TrustedCountyHunterIdentity
export type CountyHunterIdentityResolver = () => Promise<TrustedCountyHunterIdentity | null>

export async function requireCountyHunterPermission(
  request: Request,
  requiredPermission: CountyHunterPermission,
  resolveIdentity: CountyHunterIdentityResolver = readTrustedCountyHunterIdentity,
): Promise<CountyHunterRequestContext> {
  if (!isCountyHunterServerEnabled()) {
    throw new CountyHunterHttpError('County Hunter is disabled.', 404)
  }

  // Authorization headers are deliberately ignored. Authentication comes only from
  // the Supabase SSR cookie session established by NexusClaw's existing auth flow.
  void request
  const identity = await resolveIdentity()
  if (!identity) throw new CountyHunterHttpError('Authentication is required.', 401)
  if (!isUuid(identity.userId)) throw new CountyHunterHttpError('The authenticated user identifier is invalid.', 401)
  if (!isUuid(identity.organizationId)) {
    throw new CountyHunterHttpError('The authenticated session has no valid organization assignment.', 403)
  }

  if (
    !identity.permissions.includes(requiredPermission) &&
    !identity.permissions.includes('county_hunter.admin')
  ) {
    throw new CountyHunterHttpError(`Missing permission: ${requiredPermission}.`, 403)
  }

  return identity
}
