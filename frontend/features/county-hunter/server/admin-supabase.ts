import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { CountyHunterHttpError } from './http-error'
import { readCountyHunterPublicSupabaseConfig } from './public-supabase-config'

type CountyHunterServerAdminConfig = {
  supabaseUrl: string
  secretKey: string
}

const SUPABASE_SECRET_KEY = /^sb_secret_[A-Za-z0-9_-]{20,}$/

export function readCountyHunterServerAdminConfig(
  environment: NodeJS.ProcessEnv = process.env,
): CountyHunterServerAdminConfig {
  const { supabaseUrl } = readCountyHunterPublicSupabaseConfig(environment)
  const countyHunterSecretKey =
    environment.COUNTY_HUNTER_SUPABASE_SECRET_KEY?.trim()
  const deprecatedStagingSecretKey = environment.SUPABASE_SECRET_KEY?.trim()
  const secretKey = countyHunterSecretKey || (
    environment.NODE_ENV === 'production'
      ? undefined
      : deprecatedStagingSecretKey
  )

  if (!secretKey || !SUPABASE_SECRET_KEY.test(secretKey)) {
    throw new CountyHunterHttpError(
      'County Hunter wallet authentication is not configured.',
      503,
    )
  }

  return { supabaseUrl, secretKey }
}

export function createCountyHunterServerAdminClient(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const { supabaseUrl, secretKey } = readCountyHunterServerAdminConfig(environment)
  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
