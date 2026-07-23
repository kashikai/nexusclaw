import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { verifySiweMessage } from 'viem/siwe'
import { NextResponse, type NextRequest } from 'next/server'
import { createCountyHunterChallengeRepository } from '@/features/county-hunter/server/challenge-store'
import { isCountyHunterServerEnabled } from '@/features/county-hunter/server/feature-flags'
import { CountyHunterHttpError } from '@/features/county-hunter/server/http-error'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { createCountyHunterRouteSupabaseClient } from '@/features/county-hunter/server/route-supabase'
import { verifyAndConsumeCountyHunterChallenge } from '@/features/county-hunter/server/siwe'
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
      Object.keys(body).some((key) => key !== 'message' && key !== 'signature')
    ) {
      throw new CountyHunterHttpError('The wallet authentication proof is invalid.', 400)
    }

    const config = readCountyHunterWalletAuthConfig()
    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    })
    const candidate = body as Record<string, unknown>
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
    return routeClient.applyCookies(response)
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
