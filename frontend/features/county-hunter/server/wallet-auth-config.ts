import { CountyHunterHttpError } from './http-error'
import { normalizeCountyHunterSiweOrigin } from '../siwe-origin.mjs'

export const COUNTY_HUNTER_CHAIN_ID = 8453
export const COUNTY_HUNTER_SIWE_STATEMENT = 'Sign in to the NexusClaw County Hunter workspace.'
export const COUNTY_HUNTER_CHALLENGE_TTL_MS = 5 * 60 * 1000

export type CountyHunterWalletAuthConfig = {
  origin: string
  uri: string
  domain: string
  chainId: typeof COUNTY_HUNTER_CHAIN_ID
  statement: typeof COUNTY_HUNTER_SIWE_STATEMENT
  challengeTtlMs: number
  baseRpcUrl: string
}

export function readCountyHunterWalletAuthConfig(
  environment: NodeJS.ProcessEnv = process.env,
): CountyHunterWalletAuthConfig {
  const configuredOrigin = environment.COUNTY_HUNTER_AUTH_ORIGIN
  if (!configuredOrigin) {
    throw new CountyHunterHttpError('County Hunter wallet authentication is not configured.', 503)
  }

  let normalizedOrigin: ReturnType<typeof normalizeCountyHunterSiweOrigin>
  try {
    normalizedOrigin = normalizeCountyHunterSiweOrigin(configuredOrigin, {
      allowHttpLocalhost: environment.NODE_ENV !== 'production',
    })
  } catch {
    throw new CountyHunterHttpError('County Hunter wallet authentication origin is invalid.', 503)
  }

  return {
    origin: normalizedOrigin.origin,
    uri: normalizedOrigin.uri,
    domain: normalizedOrigin.domain,
    chainId: COUNTY_HUNTER_CHAIN_ID,
    statement: COUNTY_HUNTER_SIWE_STATEMENT,
    challengeTtlMs: COUNTY_HUNTER_CHALLENGE_TTL_MS,
    baseRpcUrl: environment.COUNTY_HUNTER_BASE_RPC_URL || 'https://mainnet.base.org',
  }
}
