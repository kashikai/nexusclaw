import 'server-only'

import { Buffer } from 'node:buffer'
import { CountyHunterHttpError } from './http-error'

const PRODUCTION_CONFIRMATION = 'PRODUCTION_PILOT'
export const COUNTY_HUNTER_PRODUCTION_APP_ORIGIN =
  'https://county-hunter.nexusclaw.tech'
const SUPABASE_PROJECT_REF = /^[a-z0-9]{20}$/
const WALLETCONNECT_PROJECT_ID = /^[a-f0-9]{32}$/i
const SUPABASE_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{20,}$/
const SECRET_KEY_FORMAT = /^sb_secret_[A-Za-z0-9_-]{20,}$/
const RATE_LIMIT_SECRET_HEX = /^(?:[A-Fa-f0-9]{2}){32,}$/
const RATE_LIMIT_SECRET_BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/
const NON_PRODUCTION_SECRET = /(?:example|synthetic|test(?:ing)?)/i
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
    url.hostname.endsWith('.test') ||
    url.hostname.endsWith('.invalid') ||
    (originOnly && (url.pathname !== '/' || url.search || url.hash)) ||
    (browserPublic && (url.search || url.hash))
  ) {
    throw configurationError(variable)
  }
  return url
}

function decodedJwtRole(value: string): unknown {
  const jwtParts = value.split('.')
  if (jwtParts.length !== 3) return undefined
  try {
    const encodedPayload = jwtParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(jwtParts[1].length / 4) * 4, '=')
    const payload = JSON.parse(
      atob(encodedPayload),
    ) as { role?: unknown }
    return payload.role
  } catch {
    return undefined
  }
}

function assertPublicSupabaseKey(value: string, variable: string): void {
  if (
    !SUPABASE_PUBLISHABLE_KEY.test(value) ||
    PLACEHOLDER_VALUE.test(value)
  ) {
    throw configurationError(variable)
  }
}

function rateLimitSecretHasEnoughBytes(value: string): boolean {
  if (RATE_LIMIT_SECRET_HEX.test(value)) return true
  if (!RATE_LIMIT_SECRET_BASE64.test(value)) return false
  const unpadded = value.replace(/=+$/, '')
  if (unpadded.length % 4 === 1) return false
  try {
    const normalized = unpadded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(unpadded.length / 4) * 4, '=')
    return Buffer.from(normalized, 'base64').byteLength >= 32
  } catch {
    return false
  }
}

function assertNoAdministrativePublicVariables(
  environment: NodeJS.ProcessEnv,
): void {
  for (const [name, rawValue] of Object.entries(environment)) {
    const value = rawValue?.trim()
    if (
      name.startsWith('NEXT_PUBLIC_') &&
      value &&
      (
        name.includes('RATE_LIMIT_SECRET') ||
        value.startsWith('sb_secret_') ||
        decodedJwtRole(value) === 'service_role'
      )
    ) {
      throw configurationError(name)
    }
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

function assertWalletConnectProjectId(value: string): void {
  if (
    !WALLETCONNECT_PROJECT_ID.test(value) ||
    /^([a-f0-9])\1{31}$/i.test(value)
  ) {
    throw configurationError('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')
  }
}

export function assertCountyHunterVercelRuntimeBoundary(
  environment: NodeJS.ProcessEnv = process.env,
): void {
  if (environment.NODE_ENV !== 'production') return

  assertNoProhibitedRuntimeVariables(environment)
  assertNoAdministrativePublicVariables(environment)

  const appOriginUrl = strictHttpsUrl(environment, 'NEXT_PUBLIC_APP_ORIGIN', {
    originOnly: true,
  })
  if (appOriginUrl.origin !== COUNTY_HUNTER_PRODUCTION_APP_ORIGIN) {
    throw configurationError('NEXT_PUBLIC_APP_ORIGIN')
  }

  for (const name of [
    'NEXT_PUBLIC_COUNTY_HUNTER_ENABLED',
    'COUNTY_HUNTER_ENABLED',
    'COUNTY_HUNTER_DISCOVERY_ENABLED',
  ] as const) {
    if (environment[name] !== 'true' && environment[name] !== 'false') {
      throw configurationError(name)
    }
  }
  if (
    environment.COUNTY_HUNTER_DISCOVERY_ENABLED === 'true' &&
    environment.COUNTY_HUNTER_ENABLED !== 'true'
  ) {
    throw configurationError('COUNTY_HUNTER_DISCOVERY_ENABLED')
  }

  const walletConnectProjectId = required(
    environment,
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  )
  assertWalletConnectProjectId(walletConnectProjectId)
  strictHttpsUrl(environment, 'NEXT_PUBLIC_BASE_RPC_URL', {
    browserPublic: true,
  })
  strictHttpsUrl(environment, 'NEXT_PUBLIC_SUPABASE_URL', {
    originOnly: true,
  })

  const legacyPublicKey = required(environment, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (
    legacyPublicKey.length < 20 ||
    legacyPublicKey.startsWith('sb_secret_') ||
    decodedJwtRole(legacyPublicKey) === 'service_role'
  ) {
    throw configurationError('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
}

export function validateCountyHunterProductionEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): CountyHunterProductionEnvironment {
  assertCountyHunterVercelRuntimeBoundary(environment)

  if (environment.COUNTY_HUNTER_PRODUCTION_CONFIRM !== PRODUCTION_CONFIRMATION) {
    throw configurationError('COUNTY_HUNTER_PRODUCTION_CONFIRM')
  }

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
    'NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL',
    { originOnly: true },
  )
  if (supabaseUrl.hostname !== `${productionProjectRef}.supabase.co`) {
    throw configurationError('NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL')
  }

  const publishableKey = required(
    environment,
    'NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY',
  )
  assertPublicSupabaseKey(
    publishableKey,
    'NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY',
  )

  const secretKey = required(
    environment,
    'COUNTY_HUNTER_SUPABASE_SECRET_KEY',
  )
  if (!SECRET_KEY_FORMAT.test(secretKey)) {
    throw configurationError('COUNTY_HUNTER_SUPABASE_SECRET_KEY')
  }

  const rateLimitBackend = required(
    environment,
    'COUNTY_HUNTER_RATE_LIMIT_BACKEND',
  )
  if (rateLimitBackend !== 'postgres') {
    throw configurationError('COUNTY_HUNTER_RATE_LIMIT_BACKEND')
  }

  const rateLimitSecret = required(
    environment,
    'COUNTY_HUNTER_RATE_LIMIT_SECRET',
  )
  if (
    !rateLimitSecretHasEnoughBytes(rateLimitSecret) ||
    NON_PRODUCTION_SECRET.test(rateLimitSecret) ||
    /^(.)\1+$/.test(rateLimitSecret) ||
    rateLimitSecret === secretKey ||
    Object.entries(environment).some(([name, value]) =>
      name.startsWith('NEXT_PUBLIC_') && value?.trim() === rateLimitSecret,
    )
  ) {
    throw configurationError('COUNTY_HUNTER_RATE_LIMIT_SECRET')
  }

  const walletConnectProjectId = required(
    environment,
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  )
  assertWalletConnectProjectId(walletConnectProjectId)

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
