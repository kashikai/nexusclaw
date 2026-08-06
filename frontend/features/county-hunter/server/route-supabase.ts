import 'server-only'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { applyCountyHunterNoStore } from './cache-control'
import { countyHunterCookieOptions, isSupabaseAuthCookieName } from './cookie-options'
import { readCountyHunterPublicSupabaseConfig } from './public-supabase-config'

type PendingCookie = { name: string; value: string; options: CookieOptions }

export function createCountyHunterRouteSupabaseClient(request: NextRequest) {
  const { supabaseUrl, publishableKey } =
    readCountyHunterPublicSupabaseConfig()

  const pendingCookies: PendingCookie[] = []
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookieOptions: countyHunterCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => { pendingCookies.push(...cookiesToSet) },
    },
  })

  return {
    supabase,
    applyCookies<T>(response: NextResponse<T>): NextResponse<T> {
      const enforced = countyHunterCookieOptions()
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, { ...options, ...enforced })
      })
      return applyCountyHunterNoStore(response)
    },
  }
}

export function clearCountyHunterSupabaseCookies<T>(request: NextRequest, response: NextResponse<T>): NextResponse<T> {
  const enforced = countyHunterCookieOptions()
  request.cookies.getAll().forEach(({ name }) => {
    if (isSupabaseAuthCookieName(name)) {
      response.cookies.set(name, '', { ...enforced, expires: new Date(0), maxAge: 0 })
    }
  })
  return applyCountyHunterNoStore(response)
}
