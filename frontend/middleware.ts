import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  applyCountyHunterNoStore,
  COUNTY_HUNTER_NO_STORE_HEADERS,
} from '@/features/county-hunter/server/cache-control'
import { countyHunterCookieOptions } from '@/features/county-hunter/server/cookie-options'
import { isCountyHunterServerEnabled } from '@/features/county-hunter/server/feature-flags'
import { readCountyHunterPublicSupabaseConfig } from '@/features/county-hunter/server/public-supabase-config'

export async function middleware(request: NextRequest) {
  if (!isCountyHunterServerEnabled()) {
    return new NextResponse(null, { status: 404, headers: COUNTY_HUNTER_NO_STORE_HEADERS })
  }

  let response = NextResponse.next({ request })
  const { supabaseUrl, publishableKey } =
    readCountyHunterPublicSupabaseConfig()

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookieOptions: countyHunterCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  await supabase.auth.getUser()

  return applyCountyHunterNoStore(response)
}

export const config = {
  matcher: ['/county-hunter/:path*', '/api/county-hunter/:path*'],
}
