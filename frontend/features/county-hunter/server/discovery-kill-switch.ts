import 'server-only'

import { isCountyHunterDiscoveryEnabled } from './feature-flags'
import { CountyHunterHttpError } from './http-error'
import { logCountyHunterEvent } from './operational-logging'

export function requireCountyHunterDiscoveryEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): void {
  if (!isCountyHunterDiscoveryEnabled(environment)) {
    logCountyHunterEvent('kill_switch_blocked', {
      operation: 'discovery',
      outcome: 'blocked',
    })
    throw new CountyHunterHttpError(
      'County Hunter collection is disabled by the operator.',
      503,
    )
  }
}
