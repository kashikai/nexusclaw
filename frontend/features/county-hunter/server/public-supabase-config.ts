import 'server-only'

import { CountyHunterHttpError } from './http-error'

type CountyHunterPublicSupabaseConfig = {
  supabaseUrl: string
  publishableKey: string
  usedDeprecatedFallback: boolean
}

const PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{20,}$/

function configurationError(): CountyHunterHttpError {
  return new CountyHunterHttpError(
    'The County Hunter Supabase project is not configured.',
    503,
  )
}

function isSafePublicKey(value: string): boolean {
  if (PUBLISHABLE_KEY.test(value)) return true
  if (value.startsWith('sb_secret_')) return false

  const jwtParts = value.split('.')
  if (jwtParts.length !== 3) return false
  try {
    const encodedPayload = jwtParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(jwtParts[1].length / 4) * 4, '=')
    const payload = JSON.parse(atob(encodedPayload)) as { role?: unknown }
    return payload.role === 'anon'
  } catch {
    return false
  }
}

function validatePublicConfig(
  configuredUrl: string | undefined,
  publishableKey: string | undefined,
): { supabaseUrl: string; publishableKey: string } {
  let supabaseUrl: URL
  try {
    supabaseUrl = new URL(configuredUrl ?? '')
  } catch {
    throw configurationError()
  }

  if (
    supabaseUrl.protocol !== 'https:' ||
    supabaseUrl.username ||
    supabaseUrl.password ||
    supabaseUrl.pathname !== '/' ||
    supabaseUrl.search ||
    supabaseUrl.hash ||
    !publishableKey ||
    !isSafePublicKey(publishableKey)
  ) {
    throw configurationError()
  }

  return { supabaseUrl: supabaseUrl.origin, publishableKey }
}

export function readCountyHunterPublicSupabaseConfig(
  environment: NodeJS.ProcessEnv = process.env,
): CountyHunterPublicSupabaseConfig {
  const countyHunterUrl =
    environment.NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL?.trim()
  const countyHunterPublishableKey =
    environment.NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY?.trim()
  const hasCountyHunterConfig = Boolean(
    countyHunterUrl || countyHunterPublishableKey,
  )

  if (hasCountyHunterConfig) {
    return {
      ...validatePublicConfig(countyHunterUrl, countyHunterPublishableKey),
      usedDeprecatedFallback: false,
    }
  }

  if (environment.NODE_ENV === 'production') {
    throw configurationError()
  }

  const legacyUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const legacyPublishableKey =
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  return {
    ...validatePublicConfig(legacyUrl, legacyPublishableKey),
    usedDeprecatedFallback: true,
  }
}
