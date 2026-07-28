import { NextResponse } from 'next/server'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import {
  COUNTY_HUNTER_RATE_LIMITS,
  countyHunterIdentityRateLimitKey,
  enforceCountyHunterRateLimit,
} from '@/features/county-hunter/server/rate-limit'
import {
  parseCountyHunterBootstrapBody,
  runCountyHunterBootstrap,
} from '@/features/county-hunter/server/bootstrap'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.admin')
    enforceCountyHunterRateLimit(
      countyHunterIdentityRateLimitKey(
        'bootstrap',
        context.userId,
        context.organizationId,
      ),
      COUNTY_HUNTER_RATE_LIMITS.bootstrap,
    )
    parseCountyHunterBootstrapBody(await request.text())
    const result = await runCountyHunterBootstrap(context, (trustedContext) =>
      countyHunterRest<{ counties_created: number }[]>(trustedContext, 'rpc/county_hunter_seed_georgia', '', {
        method: 'POST',
        body: '{}',
      }),
    )
    return NextResponse.json(result)
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
