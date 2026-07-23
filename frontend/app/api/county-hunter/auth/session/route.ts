import { NextResponse, type NextRequest } from 'next/server'
import { isCountyHunterServerEnabled } from '@/features/county-hunter/server/feature-flags'
import { CountyHunterHttpError } from '@/features/county-hunter/server/http-error'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { createCountyHunterRouteSupabaseClient } from '@/features/county-hunter/server/route-supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!isCountyHunterServerEnabled()) {
      throw new CountyHunterHttpError('County Hunter is disabled.', 404)
    }
    const routeClient = createCountyHunterRouteSupabaseClient(request)
    const { data, error } = await routeClient.supabase.auth.getUser()
    const response = NextResponse.json(
      { authenticated: !error && data.user !== null },
    )
    return routeClient.applyCookies(response)
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
