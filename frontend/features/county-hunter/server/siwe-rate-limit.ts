import 'server-only'

import { getAddress, isAddress } from 'viem'
import { parseSiweMessage } from 'viem/siwe'
import {
  COUNTY_HUNTER_RATE_LIMITS,
  countyHunterSiweRateLimitBucketMaterial,
  createCountyHunterInMemoryRateLimitBackend,
  enforceCountyHunterRateLimits,
  type CountyHunterRateLimitBackend,
} from './rate-limit'
import { CountyHunterHttpError } from './http-error'
import { createCountyHunterPostgresRateLimitBackend } from './postgres-rate-limit'

const developmentBackend = createCountyHunterInMemoryRateLimitBackend()

export function normalizeCountyHunterWalletForRateLimit(
  wallet: unknown,
): string | null {
  return typeof wallet === 'string' && isAddress(wallet)
    ? getAddress(wallet).toLowerCase()
    : null
}

export function readDeclaredCountyHunterWalletForRateLimit(
  message: unknown,
): string | null {
  if (typeof message !== 'string' || message.length < 1 || message.length > 4096) {
    return null
  }
  try {
    const address = parseSiweMessage(message).address
    return normalizeCountyHunterWalletForRateLimit(address)
  } catch {
    return null
  }
}

function resolveCountyHunterSiweRateLimitBackend(
  environment: NodeJS.ProcessEnv,
): CountyHunterRateLimitBackend {
  const configured = environment.COUNTY_HUNTER_RATE_LIMIT_BACKEND?.trim()
  if (configured === 'postgres') {
    return createCountyHunterPostgresRateLimitBackend({ environment })
  }
  if (
    environment.NODE_ENV === 'production' ||
    (configured !== undefined && configured !== '' && configured !== 'memory')
  ) {
    throw new CountyHunterHttpError(
      'County Hunter authentication is temporarily unavailable.',
      503,
    )
  }
  return developmentBackend
}

export async function enforceCountyHunterSiweChallengeRateLimit(
  request: Request,
  wallet: unknown,
  now = Date.now(),
  backend?: CountyHunterRateLimitBackend,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const normalizedWallet = normalizeCountyHunterWalletForRateLimit(wallet)
  const scope = normalizedWallet
    ? 'siwe-challenge'
    : 'siwe-challenge-invalid-payload'
  await enforceCountyHunterRateLimits(
    [{
      scope,
      key: countyHunterSiweRateLimitBucketMaterial(
        request,
        scope,
        normalizedWallet ?? 'invalid-payload',
        environment,
      ),
      policy: normalizedWallet
        ? COUNTY_HUNTER_RATE_LIMITS.siweChallenge
        : COUNTY_HUNTER_RATE_LIMITS.siweChallengeInvalidPayload,
    }],
    now,
    backend ?? resolveCountyHunterSiweRateLimitBackend(environment),
  )
}

export async function enforceCountyHunterSiweVerifyRateLimit(
  request: Request,
  message: unknown,
  now = Date.now(),
  backend?: CountyHunterRateLimitBackend,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const declaredWallet = readDeclaredCountyHunterWalletForRateLimit(message)
  const requests = [
    {
      scope: 'siwe-verify-global',
      key: countyHunterSiweRateLimitBucketMaterial(
        request,
        'siwe-verify-global',
        '',
        environment,
      ),
      policy: COUNTY_HUNTER_RATE_LIMITS.siweVerifyGlobal,
    },
    declaredWallet
      ? {
          scope: 'siwe-verify-wallet',
          key: countyHunterSiweRateLimitBucketMaterial(
            request,
            'siwe-verify-wallet',
            declaredWallet,
            environment,
          ),
          policy: COUNTY_HUNTER_RATE_LIMITS.siweVerifyWallet,
        }
      : {
          scope: 'siwe-verify-invalid-payload',
          key: countyHunterSiweRateLimitBucketMaterial(
            request,
            'siwe-verify-invalid-payload',
            'invalid-payload',
            environment,
          ),
          policy: COUNTY_HUNTER_RATE_LIMITS.siweVerifyInvalidPayload,
        },
  ]
  await enforceCountyHunterRateLimits(
    requests,
    now,
    backend ?? resolveCountyHunterSiweRateLimitBackend(environment),
  )
}
