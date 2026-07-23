import { CountyHunterHttpError } from './http-error'

export const COUNTY_HUNTER_CHAIN_ID = 8453
export const COUNTY_HUNTER_SIWE_STATEMENT = 'Sign in to the NexusClaw County Hunter workspace.'
export const COUNTY_HUNTER_CHALLENGE_TTL_MS = 5 * 60 * 1000

export type CountyHunterWalletAuthConfig = {
  origin: string
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

  let url: URL
  try {
    url = new URL(configuredOrigin)
  } catch {
    throw new CountyHunterHttpError('County Hunter wallet authentication is not configured.', 503)
  }

  const localDevelopment = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' && !(environment.NODE_ENV !== 'production' && localDevelopment))
  ) {
    throw new CountyHunterHttpError('County Hunter wallet authentication origin is invalid.', 503)
  }

  return {
    origin: url.origin,
    domain: url.host,
    chainId: COUNTY_HUNTER_CHAIN_ID,
    statement: COUNTY_HUNTER_SIWE_STATEMENT,
    challengeTtlMs: COUNTY_HUNTER_CHALLENGE_TTL_MS,
    baseRpcUrl: environment.COUNTY_HUNTER_BASE_RPC_URL || 'https://mainnet.base.org',
  }
}
