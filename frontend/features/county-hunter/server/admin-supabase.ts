import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { CountyHunterHttpError } from './http-error'

type CountyHunterServerAdminConfig = {
  supabaseUrl: string
  secretKey: string
}

export function readCountyHunterServerAdminConfig(
  environment: NodeJS.ProcessEnv = process.env,
): CountyHunterServerAdminConfig {
  const configuredUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const secretKey = environment.SUPABASE_SECRET_KEY?.trim()

  let supabaseUrl: URL
  try {
    supabaseUrl = new URL(configuredUrl ?? '')
  } catch {
    throw new CountyHunterHttpError(
      'County Hunter wallet authentication is not configured.',
      503,
    )
  }

  if (
    supabaseUrl.protocol !== 'https:' ||
    supabaseUrl.username ||
    supabaseUrl.password ||
    supabaseUrl.pathname !== '/' ||
    supabaseUrl.search ||
    supabaseUrl.hash ||
    !secretKey?.startsWith('sb_secret_')
  ) {
    throw new CountyHunterHttpError(
      'County Hunter wallet authentication is not configured.',
      503,
    )
  }

  return { supabaseUrl: supabaseUrl.origin, secretKey }
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
