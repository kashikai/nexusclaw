import 'server-only'

import { getAddress, isAddress } from 'viem'
import { parseSiweMessage } from 'viem/siwe'
import {
  COUNTY_HUNTER_RATE_LIMITS,
  countyHunterRequestRateLimitKey,
  enforceCountyHunterRateLimits,
  type CountyHunterRateLimitBackend,
} from './rate-limit'

export function readDeclaredCountyHunterWalletForRateLimit(
  message: unknown,
): string | null {
  if (typeof message !== 'string' || message.length < 1 || message.length > 4096) {
    return null
  }
  try {
    const address = parseSiweMessage(message).address
    return address && isAddress(address) ? getAddress(address).toLowerCase() : null
  } catch {
    return null
  }
}

export async function enforceCountyHunterSiweVerifyRateLimit(
  request: Request,
  message: unknown,
  now = Date.now(),
  backend?: CountyHunterRateLimitBackend,
): Promise<void> {
  const declaredWallet = readDeclaredCountyHunterWalletForRateLimit(message)
  const requests = [
    {
      key: countyHunterRequestRateLimitKey(request, 'siwe-verify-global'),
      policy: COUNTY_HUNTER_RATE_LIMITS.siweVerifyGlobal,
    },
    declaredWallet
      ? {
          key: countyHunterRequestRateLimitKey(
            request,
            'siwe-verify-wallet',
            declaredWallet,
          ),
          policy: COUNTY_HUNTER_RATE_LIMITS.siweVerifyWallet,
        }
      : {
          key: countyHunterRequestRateLimitKey(
            request,
            'siwe-verify-invalid-payload',
          ),
          policy: COUNTY_HUNTER_RATE_LIMITS.siweVerifyInvalidPayload,
        },
  ]
  await enforceCountyHunterRateLimits(requests, now, backend)
}
