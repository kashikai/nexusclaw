import { CountyHunterHttpError } from './http-error'
import {
  assertCountyHunterVercelRuntimeBoundary,
  validateCountyHunterProductionEnvironment,
} from './production-environment'

function readFlag(
  environment: NodeJS.ProcessEnv,
  name: 'COUNTY_HUNTER_ENABLED' | 'COUNTY_HUNTER_DISCOVERY_ENABLED',
): boolean {
  const value = environment[name]
  if (value === undefined || value === '' || value === 'false') return false
  if (value === 'true') return true
  if (environment.NODE_ENV === 'production') {
    throw new CountyHunterHttpError(
      `County Hunter production configuration is invalid: ${name}.`,
      503,
    )
  }
  return false
}

export function isCountyHunterServerEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  assertCountyHunterVercelRuntimeBoundary(environment)
  const enabled = readFlag(environment, 'COUNTY_HUNTER_ENABLED')
  if (enabled && environment.NODE_ENV === 'production') {
    validateCountyHunterProductionEnvironment(environment)
  }
  return enabled
}

export function isCountyHunterDiscoveryEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  const serverEnabled = isCountyHunterServerEnabled(environment)
  const discoveryEnabled = readFlag(
    environment,
    'COUNTY_HUNTER_DISCOVERY_ENABLED',
  )
  if (
    environment.NODE_ENV === 'production' &&
    discoveryEnabled &&
    !serverEnabled
  ) {
    throw new CountyHunterHttpError(
      'County Hunter production configuration is invalid: COUNTY_HUNTER_DISCOVERY_ENABLED.',
      503,
    )
  }
  return serverEnabled && discoveryEnabled
}
