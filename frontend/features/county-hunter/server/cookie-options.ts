import type { CookieOptionsWithName } from '@supabase/ssr'

export function countyHunterCookieOptions(
  environment: NodeJS.ProcessEnv = process.env,
): CookieOptionsWithName {
  const configuredOrigin = environment.COUNTY_HUNTER_AUTH_ORIGIN
  const secure = environment.NODE_ENV === 'production' || configuredOrigin?.startsWith('https://') === true

  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
  }
}

export function isSupabaseAuthCookieName(name: string): boolean {
  return /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/i.test(name)
}
