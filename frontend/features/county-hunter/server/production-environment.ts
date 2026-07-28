import 'server-only'

import { CountyHunterHttpError } from './http-error'

const PRODUCTION_CONFIRMATION = 'PRODUCTION_PILOT'
const SUPABASE_PROJECT_REF = /^[a-z0-9]{20}$/
const WALLETCONNECT_PROJECT_ID = /^[a-f0-9]{32}$/i
const PLACEHOLDER_VALUE =
  /(replace(?:_with)?|placeholder|change[-_ ]?me|your[-_ ]|dominio-de-producao|<[^>]+>|\$\{[^}]+\}|^demo$)/i
const PROHIBITED_RUNTIME_NAME =
  /^(?:SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY|DATABASE_URL|COUNTY_HUNTER_(?:STAGING_.+|TEST_.+|PRODUCTION_DB_URL)|POSTGRES_PASSWORD)$/

export type CountyHunterProductionEnvironment = {
  appOrigin: string
  authOrigin: string
  supabaseUrl: string
  supabaseProjectRef: string
  walletConnectProjectId: string
  publicBaseRpcUrl: string
  serverBaseRpcUrl: string
}

function configurationError(variable: string): CountyHunterHttpError {
  return new CountyHunterHttpError(
    `County Hunter production configuration is invalid: ${variable}.`,
    503,
  )
}

function required(
  environment: NodeJS.ProcessEnv,
  variable: string,
): string {
  const value = environment[variable]?.trim()
  if (!value || PLACEHOLDER_VALUE.test(value)) {
    throw configurationError(variable)
  }
  return value
}

function strictHttpsUrl(
  environment: NodeJS.ProcessEnv,
  variable: string,
  {
    originOnly = false,
    browserPublic = false,
  }: { originOnly?: boolean; browserPublic?: boolean } = {},
): URL {
  const value = required(environment, variable)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw configurationError(variable)
  }

  const hostnameLabels = url.hostname.toLowerCase().split('.')
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '::1' ||
    hostnameLabels.includes('staging') ||
    url.hostname.endsWith('.invalid') ||
    (originOnly && (url.pathname !== '/' || url.search || url.hash)) ||
    (browserPublic && (url.search || url.hash))
  ) {
    throw configurationError(variable)
  }
  return url
}

function assertPublicSupabaseKey(value: string): void {
  if (
    value.length < 20 ||
    value.startsWith('sb_secret_') ||
    PLACEHOLDER_VALUE.test(value)
  ) {
    throw configurationError('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }

  const jwtParts = value.split('.')
  if (jwtParts.length !== 3) return
  try {
    const encodedPayload = jwtParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(jwtParts[1].length / 4) * 4, '=')
    const payload = JSON.parse(
      atob(encodedPayload),
    ) as { role?: unknown }
    if (payload.role === 'service_role') {
      throw configurationError('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    }
  } catch (error) {
    if (error instanceof CountyHunterHttpError) throw error
    throw configurationError('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }
}

function assertNoProhibitedRuntimeVariables(
  environment: NodeJS.ProcessEnv,
): void {
  for (const [name, value] of Object.entries(environment)) {
    if (value && PROHIBITED_RUNTIME_NAME.test(name)) {
      throw configurationError(name)
    }
  }
}

export function validateCountyHunterProductionEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): CountyHunterProductionEnvironment {
  if (environment.COUNTY_HUNTER_PRODUCTION_CONFIRM !== PRODUCTION_CONFIRMATION) {
    throw configurationError('COUNTY_HUNTER_PRODUCTION_CONFIRM')
  }

  assertNoProhibitedRuntimeVariables(environment)

  const appOriginUrl = strictHttpsUrl(environment, 'NEXT_PUBLIC_APP_ORIGIN', {
    originOnly: true,
  })
  const authOriginUrl = strictHttpsUrl(environment, 'COUNTY_HUNTER_AUTH_ORIGIN', {
    originOnly: true,
  })
  if (appOriginUrl.origin !== authOriginUrl.origin) {
    throw configurationError('COUNTY_HUNTER_AUTH_ORIGIN')
  }

  const productionProjectRef = required(
    environment,
    'COUNTY_HUNTER_PRODUCTION_PROJECT_REF',
  ).toLowerCase()
  if (!SUPABASE_PROJECT_REF.test(productionProjectRef)) {
    throw configurationError('COUNTY_HUNTER_PRODUCTION_PROJECT_REF')
  }

  const supabaseUrl = strictHttpsUrl(
    environment,
    'NEXT_PUBLIC_SUPABASE_URL',
    { originOnly: true },
  )
  if (supabaseUrl.hostname !== `${productionProjectRef}.supabase.co`) {
    throw configurationError('NEXT_PUBLIC_SUPABASE_URL')
  }

  const publishableKey = required(
    environment,
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  )
  assertPublicSupabaseKey(publishableKey)

  const walletConnectProjectId = required(
    environment,
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  )
  if (
    !WALLETCONNECT_PROJECT_ID.test(walletConnectProjectId) ||
    /^([a-f0-9])\1{31}$/i.test(walletConnectProjectId)
  ) {
    throw configurationError('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')
  }

  const publicBaseRpcUrl = strictHttpsUrl(
    environment,
    'NEXT_PUBLIC_BASE_RPC_URL',
    { browserPublic: true },
  )
  const serverBaseRpcUrl = strictHttpsUrl(
    environment,
    'COUNTY_HUNTER_BASE_RPC_URL',
  )

  return {
    appOrigin: appOriginUrl.origin,
    authOrigin: authOriginUrl.origin,
    supabaseUrl: supabaseUrl.origin,
    supabaseProjectRef: productionProjectRef,
    walletConnectProjectId,
    publicBaseRpcUrl: publicBaseRpcUrl.toString(),
    serverBaseRpcUrl: serverBaseRpcUrl.toString(),
  }
}
