import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { verifyMessage } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  createSiweMessage,
  generateSiweNonce,
  parseSiweMessage,
  validateSiweMessage,
} from 'viem/siwe'
import { normalizeCountyHunterSiweOrigin } from '../features/county-hunter/siwe-origin.mjs'

const EXPECTED_AUTH = normalizeCountyHunterSiweOrigin('https://localhost:3000')
const EXPECTED_CHAIN_ID = 8453
const SIWE_VALIDITY_MILLISECONDS = 5 * 60 * 1000
const environmentPath = fileURLToPath(new URL('../../.env.staging.local', import.meta.url))

class ProvisioningFailure extends Error {
  constructor(stage, fixtureLabel, cause, fallbackMessage) {
    super(fallbackMessage)
    this.name = 'ProvisioningFailure'
    this.stage = stage
    this.fixtureLabel = fixtureLabel
    this.cause = cause
  }
}

function safeIdentifier(value, fallback = 'unavailable') {
  if (typeof value !== 'string') return fallback
  return /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(value) ? value : fallback
}

function safeStatus(value) {
  return Number.isInteger(value) && value >= 100 && value <= 599
    ? String(value)
    : 'unavailable'
}

function safeErrorMessage(error, fallback) {
  let message = typeof error?.message === 'string' ? error.message : fallback
  if (!message) message = 'The staging operation failed without a safe message.'

  if (/wants you to sign in|(?:URI|Nonce|Issued At|Expiration Time|Signature):/i.test(message)) {
    return 'Supabase rejected the Web3 authentication payload; SIWE details were withheld.'
  }

  message = message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-database-url]')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/\b0x[a-fA-F0-9]{40,}\b/g, '[redacted-hex]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[redacted-uuid]')
    .replace(/\b(?:eyJ|sb_(?:publishable|secret)_)[A-Za-z0-9._-]{12,}\b/g, '[redacted-token]')
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[redacted-value]')
    .replace(/\s+/g, ' ')
    .trim()

  if (!message) return 'The staging operation failed; sensitive details were withheld.'
  return message.length > 240 ? `${message.slice(0, 237)}...` : message
}

function logSanitizedFailure(error) {
  const failure = error instanceof ProvisioningFailure
    ? error
    : new ProvisioningFailure(
        'unexpected',
        'configuration',
        error,
        'An unexpected staging provisioning error occurred.',
      )
  const cause = failure.cause ?? failure

  console.error('SANITIZED STAGING PROVISIONING FAILURE')
  console.error(`stage=${safeIdentifier(failure.stage)}`)
  console.error(`test_user=${safeIdentifier(failure.fixtureLabel)}`)
  console.error(`http_status=${safeStatus(cause?.status)}`)
  console.error(`supabase_code=${safeIdentifier(cause?.code)}`)
  console.error(`error_type=${safeIdentifier(cause?.name ?? cause?.constructor?.name)}`)
  console.error(`safe_message=${safeErrorMessage(cause, failure.message)}`)
}

async function loadLocalEnvironment() {
  let contents
  try {
    contents = await readFile(environmentPath, 'utf8')
  } catch {
    return
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match || process.env[match[1]]) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
}

function setEnvironmentAssignment(contents, name, value) {
  const assignment = `${name}=${value}`
  const expression = new RegExp(`^${name}=.*$`, 'm')
  return expression.test(contents)
    ? contents.replace(expression, assignment)
    : `${contents.trimEnd()}\n${assignment}\n`
}

function decodeJwtPayload(value) {
  const segments = value.split('.')
  if (segments.length !== 3) return null
  try {
    return JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

function diagnosticCause(name, status, code, message) {
  return { name, status, code, message }
}

async function validatePublishableKeyForStaging({ supabaseUrl, projectRef }) {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (publishableKey === serviceRoleKey || publishableKey.startsWith('sb_secret_')) {
    throw new ProvisioningFailure(
      'validate-publishable-key',
      'configuration',
      diagnosticCause(
        'PublishableKeyValidationError',
        undefined,
        'privileged_key_rejected',
        'The browser key is privileged and cannot be used for Web3 sign-in.',
      ),
      'The configured browser key is not publishable.',
    )
  }

  const jwtPayload = decodeJwtPayload(publishableKey)
  if (jwtPayload?.role && jwtPayload.role !== 'anon') {
    throw new ProvisioningFailure(
      'validate-publishable-key',
      'configuration',
      diagnosticCause(
        'PublishableKeyValidationError',
        undefined,
        'unexpected_key_role',
        'The browser key does not have the expected public role.',
      ),
      'The configured browser key has an unexpected role.',
    )
  }
  if (jwtPayload?.ref && jwtPayload.ref !== projectRef) {
    throw new ProvisioningFailure(
      'validate-publishable-key',
      'configuration',
      diagnosticCause(
        'PublishableKeyValidationError',
        undefined,
        'project_ref_mismatch',
        'The browser key does not belong to the confirmed staging project.',
      ),
      'The configured browser key does not match staging.',
    )
  }

  let response
  try {
    response = await fetch(new URL('/auth/v1/settings', supabaseUrl), {
      method: 'GET',
      headers: { apikey: publishableKey },
      redirect: 'error',
    })
    await response.arrayBuffer()
  } catch (error) {
    throw new ProvisioningFailure(
      'validate-publishable-key',
      'configuration',
      error,
      'The staging Auth settings endpoint could not be reached.',
    )
  }
  if (!response.ok) {
    throw new ProvisioningFailure(
      'validate-publishable-key',
      'configuration',
      diagnosticCause(
        'PublishableKeyValidationError',
        response.status,
        'publishable_key_rejected',
        'The staging Auth endpoint rejected the configured publishable key.',
      ),
      'The configured browser key was rejected by staging.',
    )
  }
}

function normalizeWalletAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? value.toLowerCase()
    : null
}

function userWalletAddresses(user) {
  const candidates = [
    user?.user_metadata?.address,
    user?.user_metadata?.wallet_address,
    user?.user_metadata?.sub,
  ]
  for (const identity of user?.identities ?? []) {
    candidates.push(
      identity?.id,
      identity?.identity_data?.address,
      identity?.identity_data?.wallet_address,
      identity?.identity_data?.sub,
    )
  }
  return new Set(candidates.map(normalizeWalletAddress).filter(Boolean))
}

async function listAllAuthUsers(admin) {
  const users = []
  const perPage = 1000
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new ProvisioningFailure(
        'admin-list-users',
        'configuration',
        error,
        'Unable to inspect existing staging Auth users.',
      )
    }
    users.push(...data.users)
    if (data.users.length < perPage) return users
  }
  throw new ProvisioningFailure(
    'admin-list-users',
    'configuration',
    diagnosticCause(
      'AuthUserPaginationError',
      undefined,
      'pagination_limit_reached',
      'The safe Auth user reconciliation limit was reached.',
    ),
    'Unable to complete staging Auth user reconciliation.',
  )
}

function findExistingFixtureUser(users, fixture) {
  const expectedAddress = fixture.account.address.toLowerCase()
  const walletMatches = users.filter((user) => userWalletAddresses(user).has(expectedAddress))
  const roleMatches = users.filter((user) => (
    user?.app_metadata?.county_hunter_fixture === true
    && user?.app_metadata?.county_hunter_fixture_role === fixture.role
  ))
  const candidates = [...new Map(
    [...walletMatches, ...roleMatches].map((user) => [user.id, user]),
  ).values()]

  if (candidates.length > 1) {
    throw new ProvisioningFailure(
      'admin-reconcile-user',
      fixture.role,
      diagnosticCause(
        'AuthIdentityConflictError',
        409,
        'duplicate_fixture_identity',
        'More than one staging Auth user matches this disposable fixture.',
      ),
      'A duplicate staging identity was detected.',
    )
  }

  const existing = candidates[0] ?? null
  if (existing) {
    const knownAddresses = userWalletAddresses(existing)
    if (knownAddresses.size > 0 && !knownAddresses.has(expectedAddress)) {
      throw new ProvisioningFailure(
        'admin-reconcile-user',
        fixture.role,
        diagnosticCause(
          'AuthIdentityConflictError',
          409,
          'fixture_wallet_mismatch',
          'The existing fixture role belongs to a different disposable wallet.',
        ),
        'The existing staging fixture does not match its local wallet.',
      )
    }
  }
  return existing
}

async function createValidatedSiwe(fixture, authContext) {
  const issuedAt = new Date()
  const expirationTime = new Date(issuedAt.getTime() + SIWE_VALIDITY_MILLISECONDS)
  const nonce = generateSiweNonce()
  if (!/^[A-Za-z0-9]{8,}$/.test(nonce)) {
    throw new ProvisioningFailure(
      'validate-siwe',
      fixture.role,
      diagnosticCause(
        'SiweValidationError',
        undefined,
        'invalid_nonce',
        'The generated SIWE nonce is invalid.',
      ),
      'Local SIWE validation failed.',
    )
  }

  const message = createSiweMessage({
    address: fixture.account.address,
    chainId: EXPECTED_CHAIN_ID,
    domain: EXPECTED_AUTH.domain,
    uri: EXPECTED_AUTH.uri,
    version: '1',
    nonce,
    issuedAt,
    expirationTime,
    statement: 'Sign in to NexusClaw County Hunter.',
  })
  const parsed = parseSiweMessage(message)
  const validationTime = new Date()
  const issuedAtAge = parsed.issuedAt instanceof Date
    ? validationTime.getTime() - parsed.issuedAt.getTime()
    : Number.POSITIVE_INFINITY
  const expirationRemaining = parsed.expirationTime instanceof Date
    ? parsed.expirationTime.getTime() - validationTime.getTime()
    : Number.NEGATIVE_INFINITY

  const envelopeIsValid = (
    authContext.domain === EXPECTED_AUTH.domain
    && authContext.origin === EXPECTED_AUTH.origin
    && authContext.uri === EXPECTED_AUTH.uri
    && parsed.domain === EXPECTED_AUTH.domain
    && parsed.uri === EXPECTED_AUTH.uri
    && parsed.chainId === EXPECTED_CHAIN_ID
    && parsed.version === '1'
    && parsed.nonce === nonce
    && issuedAtAge >= -5000
    && issuedAtAge <= 60_000
    && expirationRemaining > 0
    && expirationRemaining <= SIWE_VALIDITY_MILLISECONDS
    && validateSiweMessage({
      address: fixture.account.address,
      domain: EXPECTED_AUTH.domain,
      message: parsed,
      nonce,
      time: validationTime,
    })
  )
  if (!envelopeIsValid) {
    throw new ProvisioningFailure(
      'validate-siwe',
      fixture.role,
      diagnosticCause(
        'SiweValidationError',
        undefined,
        'invalid_siwe_envelope',
        'The locally generated SIWE envelope failed validation.',
      ),
      'Local SIWE validation failed.',
    )
  }

  const signature = await fixture.account.signMessage({ message })
  const signatureIsValid = await verifyMessage({
    address: fixture.account.address,
    message,
    signature,
  })
  if (!signatureIsValid) {
    throw new ProvisioningFailure(
      'validate-siwe-signature',
      fixture.role,
      diagnosticCause(
        'SiweSignatureValidationError',
        undefined,
        'signature_wallet_mismatch',
        'The disposable wallet signature did not verify locally.',
      ),
      'Local SIWE signature validation failed.',
    )
  }

  return { message, signature }
}

async function ensureWalletUser({
  fixture,
  admin,
  supabaseUrl,
  authContext,
  knownUsers,
}) {
  const existing = findExistingFixtureUser(knownUsers, fixture)
  const { message, signature } = await createValidatedSiwe(fixture, authContext)
  const walletClient = createClient(
    supabaseUrl.origin,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
  )

  let data
  let signInError
  try {
    const response = await walletClient.auth.signInWithWeb3({
      chain: 'ethereum',
      message,
      signature,
    })
    data = response.data
    signInError = response.error
  } catch (error) {
    throw new ProvisioningFailure(
      'signInWithWeb3',
      fixture.role,
      error,
      'Supabase Web3 authentication threw before returning a response.',
    )
  }
  if (signInError || !data?.user) {
    throw new ProvisioningFailure(
      'signInWithWeb3',
      fixture.role,
      signInError ?? diagnosticCause(
        'AuthInvalidTokenResponseError',
        500,
        'missing_auth_user',
        'Supabase Web3 authentication returned no user.',
      ),
      'Unable to authenticate the disposable staging wallet.',
    )
  }
  if (existing && existing.id !== data.user.id) {
    await walletClient.auth.signOut({ scope: 'local' })
    throw new ProvisioningFailure(
      'admin-reconcile-user',
      fixture.role,
      diagnosticCause(
        'AuthIdentityConflictError',
        409,
        'existing_user_mismatch',
        'Web3 authentication returned a different user than the reconciled fixture.',
      ),
      'The existing staging fixture could not be reconciled safely.',
    )
  }

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: {
      ...data.user.app_metadata,
      organization_id: fixture.organizationId,
      county_hunter_fixture: true,
      county_hunter_fixture_role: fixture.role,
    },
  })
  const { error: signOutError } = await walletClient.auth.signOut({ scope: 'local' })
  if (signOutError) {
    throw new ProvisioningFailure(
      'clear-local-session',
      fixture.role,
      signOutError,
      'Unable to clear the local disposable Web3 session.',
    )
  }
  if (updateError || !updated.user) {
    throw new ProvisioningFailure(
      'admin-update-metadata',
      fixture.role,
      updateError ?? diagnosticCause(
        'AuthInvalidUserResponseError',
        500,
        'missing_updated_user',
        'Auth Admin returned no updated staging user.',
      ),
      'Unable to assign trusted metadata to the staging wallet.',
    )
  }

  const knownIndex = knownUsers.findIndex((user) => user.id === updated.user.id)
  if (knownIndex >= 0) knownUsers[knownIndex] = updated.user
  else knownUsers.push(updated.user)
  return { ...fixture, userId: updated.user.id }
}

async function main() {
  await loadLocalEnvironment()

  const required = [
    'COUNTY_HUNTER_STAGING_PROJECT_REF',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'COUNTY_HUNTER_AUTH_ORIGIN',
    'COUNTY_HUNTER_TEST_ORG_A',
    'COUNTY_HUNTER_TEST_ORG_B',
  ]
  for (const name of required) {
    if (!process.env[name]) {
      throw new ProvisioningFailure(
        'validate-configuration',
        'configuration',
        diagnosticCause(
          'ConfigurationError',
          undefined,
          'missing_staging_variable',
          `Missing required staging variable: ${name}`,
        ),
        'A required staging variable is missing.',
      )
    }
  }
  if (process.env.COUNTY_HUNTER_STAGING_CONFIRM !== 'STAGING_ONLY') {
    throw new ProvisioningFailure(
      'validate-configuration',
      'configuration',
      diagnosticCause(
        'ConfigurationError',
        undefined,
        'staging_confirmation_missing',
        'COUNTY_HUNTER_STAGING_CONFIRM must be STAGING_ONLY.',
      ),
      'The staging confirmation is missing.',
    )
  }

  const projectRef = process.env.COUNTY_HUNTER_STAGING_PROJECT_REF
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new ProvisioningFailure(
      'validate-configuration',
      'configuration',
      diagnosticCause(
        'ConfigurationError',
        undefined,
        'invalid_project_ref',
        'The staging project ref has an invalid format.',
      ),
      'The staging project reference is invalid.',
    )
  }
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (supabaseUrl.hostname !== `${projectRef}.supabase.co`) {
    throw new ProvisioningFailure(
      'validate-configuration',
      'configuration',
      diagnosticCause(
        'ConfigurationError',
        undefined,
        'project_url_mismatch',
        'The Supabase URL does not match the confirmed staging project.',
      ),
      'The staging project URL is inconsistent.',
    )
  }
  let authContext
  try {
    authContext = normalizeCountyHunterSiweOrigin(process.env.COUNTY_HUNTER_AUTH_ORIGIN)
  } catch {
    throw new ProvisioningFailure(
      'validate-configuration',
      'configuration',
      diagnosticCause(
        'ConfigurationError',
        undefined,
        'auth_origin_mismatch',
        'The staging Auth origin must be the confirmed HTTPS localhost origin.',
      ),
      'The staging Auth origin is invalid.',
    )
  }
  if (
    authContext.origin !== EXPECTED_AUTH.origin
    || authContext.uri !== EXPECTED_AUTH.uri
    || authContext.domain !== EXPECTED_AUTH.domain
  ) {
    throw new ProvisioningFailure(
      'validate-configuration',
      'configuration',
      diagnosticCause(
        'ConfigurationError',
        undefined,
        'auth_origin_mismatch',
        'The staging Auth origin must match the confirmed HTTPS localhost origin.',
      ),
      'The staging Auth origin is invalid.',
    )
  }

  const admin = createClient(supabaseUrl.origin, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
  const fixtures = [
    {
      variable: 'COUNTY_HUNTER_TEST_VIEWER_A',
      role: 'viewer-a',
      organizationId: process.env.COUNTY_HUNTER_TEST_ORG_A,
      permissions: ['county_hunter.view'],
    },
    {
      variable: 'COUNTY_HUNTER_TEST_MANAGER_A',
      role: 'manager-a',
      organizationId: process.env.COUNTY_HUNTER_TEST_ORG_A,
      permissions: ['county_hunter.view', 'county_hunter.manage'],
    },
    {
      variable: 'COUNTY_HUNTER_TEST_ADMIN_A',
      role: 'admin-a',
      organizationId: process.env.COUNTY_HUNTER_TEST_ORG_A,
      permissions: ['county_hunter.view', 'county_hunter.manage', 'county_hunter.admin'],
    },
    {
      variable: 'COUNTY_HUNTER_TEST_ADMIN_B',
      role: 'admin-b',
      organizationId: process.env.COUNTY_HUNTER_TEST_ORG_B,
      permissions: ['county_hunter.view', 'county_hunter.manage', 'county_hunter.admin'],
    },
  ]

  let environmentContents = await readFile(environmentPath, 'utf8')
  const preparedFixtures = fixtures.map((fixture) => {
    const privateKeyVariable = `${fixture.variable}_PRIVATE_KEY`
    const addressVariable = `${fixture.variable}_ADDRESS`
    let privateKey = process.env[privateKeyVariable]
    if (privateKey && !/^0x[0-9a-f]{64}$/i.test(privateKey)) {
      throw new ProvisioningFailure(
        'prepare-disposable-wallet',
        fixture.role,
        diagnosticCause(
          'DisposableWalletValidationError',
          undefined,
          'invalid_private_key_format',
          'An existing disposable wallet key has an invalid format.',
        ),
        'A local disposable wallet is invalid.',
      )
    }
    if (!privateKey) privateKey = generatePrivateKey()

    const account = privateKeyToAccount(privateKey)
    process.env[privateKeyVariable] = privateKey
    process.env[addressVariable] = account.address
    environmentContents = setEnvironmentAssignment(environmentContents, privateKeyVariable, privateKey)
    environmentContents = setEnvironmentAssignment(environmentContents, addressVariable, account.address)
    return { ...fixture, privateKeyVariable, addressVariable, account }
  })

  // Persist disposable keys only in the ignored staging environment. They are
  // never printed, passed to the admin client, or committed.
  await writeFile(environmentPath, environmentContents, { encoding: 'utf8', mode: 0o600 })

  await validatePublishableKeyForStaging({ supabaseUrl, projectRef })
  const knownUsers = await listAllAuthUsers(admin)
  const results = []
  for (const fixture of preparedFixtures) {
    results.push(await ensureWalletUser({
      fixture,
      admin,
      supabaseUrl,
      authContext,
      knownUsers,
    }))
  }

  for (const result of results) {
    process.env[result.variable] = result.userId
    environmentContents = setEnvironmentAssignment(environmentContents, result.variable, result.userId)
  }
  await writeFile(environmentPath, environmentContents, { encoding: 'utf8', mode: 0o600 })

  const reconciledUsers = await listAllAuthUsers(admin)
  for (const result of results) {
    const reconciled = findExistingFixtureUser(reconciledUsers, result)
    if (!reconciled || reconciled.id !== result.userId) {
      throw new ProvisioningFailure(
        'admin-reconcile-user',
        result.role,
        diagnosticCause(
          'AuthIdentityReconciliationError',
          409,
          'fixture_reconciliation_failed',
          'The provisioned staging user could not be reconciled through Auth Admin.',
        ),
        'A staging fixture could not be reconciled safely.',
      )
    }
  }

  for (const result of results) {
    const { error } = await admin.from('county_hunter_memberships').upsert({
      user_id: result.userId,
      organization_id: result.organizationId,
      permissions: result.permissions,
      active: true,
    }, { onConflict: 'user_id,organization_id' })
    if (error) {
      throw new ProvisioningFailure(
        'persist-membership',
        result.role,
        error,
        'Unable to persist a staging County Hunter membership.',
      )
    }
  }

  console.log('Provisioned four disposable Web3 users and reconciled their Auth identities.')
  console.log('Persisted four active County Hunter memberships.')
  console.log('Tenant A roles: viewer, manager, and admin. Tenant B role: admin.')
  console.log('Fixture identifiers and wallet material remain only in the ignored staging environment file.')
}

try {
  await main()
} catch (error) {
  logSanitizedFailure(error)
  process.exitCode = 1
}
