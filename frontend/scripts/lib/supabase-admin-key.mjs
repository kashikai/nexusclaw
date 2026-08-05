const SECRET_KEY_PREFIX = 'sb_secret_'
const STRICT_MODE_VARIABLE = 'COUNTY_HUNTER_STRICT_ADMIN_KEY'
const SECRET_KEY_VARIABLE = 'SUPABASE_SECRET_KEY'
const LEGACY_KEY_VARIABLE = 'SUPABASE_SERVICE_ROLE_KEY'

export class SupabaseAdminKeyConfigurationError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'SupabaseAdminKeyConfigurationError'
    this.code = code
  }
}

function configuredValue(environment, name) {
  const value = environment[name]
  return typeof value === 'string' ? value.trim() : ''
}

function readStrictMode(environment, explicitStrictMode) {
  if (explicitStrictMode !== undefined) return explicitStrictMode

  const value = configuredValue(environment, STRICT_MODE_VARIABLE)
  if (!value || value === 'false') return false
  if (value === 'true') return true
  throw new SupabaseAdminKeyConfigurationError(
    'invalid_strict_admin_key_mode',
    `${STRICT_MODE_VARIABLE} must be true or false.`,
  )
}

export function readSupabaseAdminKey(
  environment = process.env,
  {
    strictLegacy = undefined,
    warn = console.warn,
  } = {},
) {
  const secretKey = configuredValue(environment, SECRET_KEY_VARIABLE)
  const legacyKey = configuredValue(environment, LEGACY_KEY_VARIABLE)
  const strictMode = readStrictMode(environment, strictLegacy)

  if (strictMode && legacyKey) {
    throw new SupabaseAdminKeyConfigurationError(
      'legacy_admin_key_rejected',
      `${LEGACY_KEY_VARIABLE} is rejected in strict admin-key mode.`,
    )
  }

  if (secretKey) {
    if (
      !secretKey.startsWith(SECRET_KEY_PREFIX)
      || secretKey.length <= SECRET_KEY_PREFIX.length
    ) {
      throw new SupabaseAdminKeyConfigurationError(
        'invalid_supabase_secret_key',
        `${SECRET_KEY_VARIABLE} must use the Supabase secret-key format.`,
      )
    }
    return { key: secretKey, source: 'secret' }
  }

  if (legacyKey) {
    warn(
      `WARNING: ${LEGACY_KEY_VARIABLE} is deprecated; configure ${SECRET_KEY_VARIABLE}. No key value was logged.`,
    )
    return { key: legacyKey, source: 'legacy' }
  }

  throw new SupabaseAdminKeyConfigurationError(
    'missing_supabase_admin_key',
    `${SECRET_KEY_VARIABLE} is required; the deprecated legacy fallback is not configured.`,
  )
}
