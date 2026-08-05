import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { verifySiweMessage } from 'viem/siwe'
import { NextResponse, type NextRequest } from 'next/server'
import { createCountyHunterChallengeRepository } from '@/features/county-hunter/server/challenge-store'
import { isCountyHunterServerEnabled } from '@/features/county-hunter/server/feature-flags'
import { CountyHunterHttpError } from '@/features/county-hunter/server/http-error'
import { logCountyHunterEvent } from '@/features/county-hunter/server/operational-logging'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { createCountyHunterRouteSupabaseClient } from '@/features/county-hunter/server/route-supabase'
import { verifyAndConsumeCountyHunterChallenge } from '@/features/county-hunter/server/siwe'
import { enforceCountyHunterSiweVerifyRateLimit } from '@/features/county-hunter/server/siwe-rate-limit'
import {
  assertCountyHunterSiweOrigin,
  COUNTY_HUNTER_VERIFY_BODY_LIMIT,
  readCountyHunterSiweJson,
} from '@/features/county-hunter/server/siwe-request'
import { readCountyHunterWalletAuthConfig } from '@/features/county-hunter/server/wallet-auth-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!isCountyHunterServerEnabled()) {
      throw new CountyHunterHttpError('County Hunter is disabled.', 404)
    }

    const config = readCountyHunterWalletAuthConfig()
    assertCountyHunterSiweOrigin(request, config.origin)
    let body: unknown
    try {
      body = await readCountyHunterSiweJson(
        request,
        COUNTY_HUNTER_VERIFY_BODY_LIMIT,
      )
    } catch (error) {
      await enforceCountyHunterSiweVerifyRateLimit(request, null)
      throw new CountyHunterHttpError(
        'The wallet authentication proof is invalid.',
        error instanceof CountyHunterHttpError && error.status === 413 ? 413 : 400,
      )
    }
    const candidate = body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null
    await enforceCountyHunterSiweVerifyRateLimit(request, candidate?.message)
    if (
      !candidate ||
      Object.keys(candidate).some((key) => key !== 'message' && key !== 'signature')
    ) {
      throw new CountyHunterHttpError('The wallet authentication proof is invalid.', 400)
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    })
    const proof = await verifyAndConsumeCountyHunterChallenge(
      { message: candidate.message, signature: candidate.signature },
      config,
      createCountyHunterChallengeRepository(),
      ({ message, signature, address, domain, nonce, now }) =>
        verifySiweMessage(publicClient, { message, signature, address, domain, nonce, time: now }),
    )

    const routeClient = createCountyHunterRouteSupabaseClient(request)
    const { data, error } = await routeClient.supabase.auth.signInWithWeb3({
      chain: 'ethereum',
      message: proof.message,
      signature: proof.signature,
    })
    if (error || !data.user || !data.session) {
      throw new CountyHunterHttpError('Wallet authentication could not be completed.', 401)
    }

    const response = NextResponse.json(
      { authenticated: true },
    )
    logCountyHunterEvent('siwe_login_succeeded', {
      operation: 'siwe_login',
      outcome: 'authenticated',
    })
    return routeClient.applyCookies(response)
  } catch (error) {
    logCountyHunterEvent('siwe_login_failed', {
      operation: 'siwe_login',
      outcome: 'failed',
      reasonCode:
        error instanceof CountyHunterHttpError
          ? `HTTP_${error.status}`
          : 'VERIFICATION_FAILED',
    }, 'error')
    return countyHunterErrorResponse(error)
  }
}
