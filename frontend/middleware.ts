import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  applyCountyHunterNoStore,
  COUNTY_HUNTER_NO_STORE_HEADERS,
} from '@/features/county-hunter/server/cache-control'
import { countyHunterCookieOptions } from '@/features/county-hunter/server/cookie-options'

export async function middleware(request: NextRequest) {
  if (process.env.COUNTY_HUNTER_ENABLED !== 'true') {
    return new NextResponse(null, { status: 404, headers: COUNTY_HUNTER_NO_STORE_HEADERS })
  }

  let response = NextResponse.next({ request })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (supabaseUrl && publishableKey) {
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
  }

  return applyCountyHunterNoStore(response)
}

export const config = {
  matcher: ['/county-hunter/:path*', '/api/county-hunter/:path*'],
}
