import { NextResponse, type NextRequest } from 'next/server'
import { createCountyHunterChallengeRepository } from '@/features/county-hunter/server/challenge-store'
import { COUNTY_HUNTER_NO_STORE_HEADERS } from '@/features/county-hunter/server/cache-control'
import { isCountyHunterServerEnabled } from '@/features/county-hunter/server/feature-flags'
import { CountyHunterHttpError } from '@/features/county-hunter/server/http-error'
import { logCountyHunterEvent } from '@/features/county-hunter/server/operational-logging'
import {
  COUNTY_HUNTER_RATE_LIMITS,
  countyHunterRequestRateLimitKey,
  enforceCountyHunterRateLimit,
} from '@/features/county-hunter/server/rate-limit'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { issueCountyHunterChallenge } from '@/features/county-hunter/server/siwe'
import { readCountyHunterWalletAuthConfig } from '@/features/county-hunter/server/wallet-auth-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!isCountyHunterServerEnabled()) {
      throw new CountyHunterHttpError('County Hunter is disabled.', 404)
    }

    const body = await request.json().catch(() => null)
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some((key) => key !== 'address') ||
      typeof (body as { address?: unknown }).address !== 'string'
    ) {
      throw new CountyHunterHttpError('A wallet address is required.', 400)
    }

    const address = (body as { address: string }).address
    enforceCountyHunterRateLimit(
      countyHunterRequestRateLimitKey(
        request,
        'siwe-challenge',
        address.toLowerCase(),
      ),
      COUNTY_HUNTER_RATE_LIMITS.siweChallenge,
    )

    const result = await issueCountyHunterChallenge(
      address,
      readCountyHunterWalletAuthConfig(),
      createCountyHunterChallengeRepository(),
    )
    logCountyHunterEvent('siwe_challenge_issued', {
      operation: 'siwe_challenge',
      outcome: 'issued',
    })
    return NextResponse.json(result, {
      headers: COUNTY_HUNTER_NO_STORE_HEADERS,
    })
  } catch (error) {
    logCountyHunterEvent('siwe_challenge_failed', {
      operation: 'siwe_challenge',
      outcome: 'failed',
      reasonCode:
        error instanceof CountyHunterHttpError
          ? `HTTP_${error.status}`
          : 'UNEXPECTED',
    }, 'error')
    return countyHunterErrorResponse(error)
  }
}
