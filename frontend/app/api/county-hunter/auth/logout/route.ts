import { NextResponse, type NextRequest } from 'next/server'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import {
  clearCountyHunterSupabaseCookies,
  createCountyHunterRouteSupabaseClient,
} from '@/features/county-hunter/server/route-supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const routeClient = createCountyHunterRouteSupabaseClient(request)
    await routeClient.supabase.auth.signOut({ scope: 'local' })
    let response = NextResponse.json(
      { authenticated: false },
    )
    response = routeClient.applyCookies(response)
    return clearCountyHunterSupabaseCookies(request, response)
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
