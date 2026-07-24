import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import https from 'node:https'
import { getAddress, isAddress, verifyMessage } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { parseSiweMessage } from 'viem/siwe'

const APP_ORIGIN = 'https://localhost:3000'
const EXPECTED_CHAIN_ID = 8453
const EXPECTED_DOMAIN = 'localhost:3000'
const EXPECTED_URI = 'https://localhost:3000/'
const EXPECTED_STATEMENT = 'Sign in to the NexusClaw County Hunter workspace.'
const SAFE_BODY_LIMIT = 1_000_000

let currentStage = 'configuration'
const sessions = []
let temporarySourceId = null
let adminASession = null
let managerSession = null

class E2EFailure extends Error {
  constructor(stage, code, status) {
    super(code)
    this.name = 'E2EFailure'
    this.stage = stage
    this.code = code
    this.status = status
  }
}

function fail(code, status) {
  throw new E2EFailure(currentStage, code, status)
}

function assert(condition, code, status) {
  if (!condition) fail(code, status)
}

function report(label) {
  console.log(`PASS ${label}`)
}

function parseEnvironment(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=')
        const name = line.slice(0, separator).trim()
        let value = line.slice(separator + 1).trim()
        if (
          value.length >= 2 &&
          ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")))
        ) {
          value = value.slice(1, -1)
        }
        return [name, value]
      }),
  )
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function readFixture(environment, variable, label) {
  const privateKey = environment[`${variable}_PRIVATE_KEY`]
  const expectedAddress = environment[`${variable}_ADDRESS`]
  const userId = environment[variable]
  assert(/^0x[0-9a-f]{64}$/i.test(privateKey ?? ''), `${label}_PRIVATE_KEY_INVALID`)
  assert(isAddress(expectedAddress ?? ''), `${label}_ADDRESS_INVALID`)
  assert(isUuid(userId), `${label}_USER_ID_INVALID`)

  const account = privateKeyToAccount(privateKey)
  assert(
    getAddress(account.address) === getAddress(expectedAddress),
    `${label}_WALLET_BINDING_INVALID`,
  )
  return { label, account, userId }
}

function validateConfiguration(environment) {
  assert(environment.COUNTY_HUNTER_STAGING_CONFIRM === 'STAGING_ONLY', 'STAGING_CONFIRMATION_REQUIRED')
  const projectRef = environment.COUNTY_HUNTER_STAGING_PROJECT_REF
  assert(/^[a-z0-9]{20}$/.test(projectRef ?? ''), 'STAGING_PROJECT_REF_INVALID')
  assert(environment.COUNTY_HUNTER_ENABLED === 'true', 'COUNTY_HUNTER_SERVER_DISABLED')
  assert(environment.NEXT_PUBLIC_COUNTY_HUNTER_ENABLED === 'true', 'COUNTY_HUNTER_CLIENT_DISABLED')

  let supabaseUrl
  let authOrigin
  try {
    supabaseUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL)
    authOrigin = new URL(environment.COUNTY_HUNTER_AUTH_ORIGIN)
  } catch {
    fail('STAGING_URL_INVALID')
  }

  assert(supabaseUrl.origin === `https://${projectRef}.supabase.co`, 'STAGING_SUPABASE_PROJECT_MISMATCH')
  assert(supabaseUrl.pathname === '/', 'STAGING_SUPABASE_URL_HAS_PATH')
  assert(authOrigin.origin === APP_ORIGIN && authOrigin.pathname === '/', 'STAGING_AUTH_ORIGIN_MISMATCH')

  const organizationA = environment.COUNTY_HUNTER_TEST_ORG_A
  const organizationB = environment.COUNTY_HUNTER_TEST_ORG_B
  assert(isUuid(organizationA), 'TENANT_A_ID_INVALID')
  assert(isUuid(organizationB), 'TENANT_B_ID_INVALID')
  assert(organizationA !== organizationB, 'STAGING_TENANTS_MUST_DIFFER')

  return {
    organizationA,
    organizationB,
    viewerA: readFixture(environment, 'COUNTY_HUNTER_TEST_VIEWER_A', 'viewer-a'),
    managerA: readFixture(environment, 'COUNTY_HUNTER_TEST_MANAGER_A', 'manager-a'),
    adminA: readFixture(environment, 'COUNTY_HUNTER_TEST_ADMIN_A', 'admin-a'),
    adminB: readFixture(environment, 'COUNTY_HUNTER_TEST_ADMIN_B', 'admin-b'),
  }
}

class CookieJar {
  values = new Map()

  header() {
    return [...this.values.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
  }

  update(setCookieHeaders = []) {
    for (const header of setCookieHeaders) {
      const parts = header.split(';').map((part) => part.trim())
      const separator = parts[0].indexOf('=')
      if (separator < 1) continue
      const name = parts[0].slice(0, separator)
      const value = parts[0].slice(separator + 1)
      const attributes = parts.slice(1).map((part) => part.toLowerCase())
      const expired =
        value === '' ||
        attributes.includes('max-age=0') ||
        attributes.some((attribute) => attribute.startsWith('expires=thu, 01 jan 1970'))
      if (expired) this.values.delete(name)
      else this.values.set(name, value)
    }
  }
}

function assertResponseSecurity(response) {
  assert(response.headers['cache-control'] === 'private, no-store', 'CACHE_CONTROL_INVALID', response.status)
  assert(response.headers.pragma === 'no-cache', 'PRAGMA_INVALID', response.status)
  assert(response.headers.expires === '0', 'EXPIRES_INVALID', response.status)
  assert(!/access_token|refresh_token|sb-[a-z0-9]+-auth-token/i.test(response.raw), 'TOKEN_IN_RESPONSE_BODY')
}

async function request(jar, path, options = {}) {
  assert(path.startsWith('/api/county-hunter/'), 'NON_COUNTY_HUNTER_PATH_REJECTED')
  const url = new URL(path, APP_ORIGIN)
  assert(url.origin === APP_ORIGIN, 'NON_LOCAL_APP_ORIGIN_REJECTED')
  const body = options.body === undefined ? null : JSON.stringify(options.body)
  const headers = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
  }
  const cookie = jar.header()
  if (cookie) headers.Cookie = cookie

  const response = await new Promise((resolve, reject) => {
    const pending = https.request(
      url,
      {
        method: options.method ?? 'GET',
        rejectUnauthorized: false,
        headers,
      },
      (incoming) => {
        const chunks = []
        let size = 0
        incoming.on('data', (chunk) => {
          size += chunk.length
          if (size > SAFE_BODY_LIMIT) {
            incoming.destroy(new Error('RESPONSE_BODY_LIMIT_EXCEEDED'))
            return
          }
          chunks.push(chunk)
        })
        incoming.on('error', reject)
        incoming.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          let json = null
          if (raw) {
            try {
              json = JSON.parse(raw)
            } catch {
              json = null
            }
          }
          resolve({
            status: incoming.statusCode ?? 0,
            headers: incoming.headers,
            setCookies: incoming.headers['set-cookie'] ?? [],
            raw,
            json,
          })
        })
      },
    )
    pending.on('error', reject)
    if (body) pending.write(body)
    pending.end()
  }).catch(() => fail('LOCAL_HTTPS_REQUEST_FAILED'))

  jar.update(response.setCookies)
  assertResponseSecurity(response)
  return response
}

function expectStatus(response, expected, code) {
  assert(response.status === expected, code, response.status)
}

function replaceMessageLine(message, pattern, replacement, code) {
  const changed = message.replace(pattern, replacement)
  assert(changed !== message, code)
  return changed
}

async function signMessage(account, message) {
  const signature = await account.signMessage({ message })
  const parsed = parseSiweMessage(message)
  if (parsed.address && isAddress(parsed.address)) {
    const valid = await verifyMessage({ address: parsed.address, message, signature }).catch(() => false)
    assert(valid, 'LOCAL_SIGNATURE_VERIFICATION_FAILED')
  }
  return signature
}

function validateChallenge(message, fixture) {
  const parsed = parseSiweMessage(message)
  assert(parsed.address && getAddress(parsed.address) === getAddress(fixture.account.address), 'CHALLENGE_WALLET_MISMATCH')
  assert(parsed.domain === EXPECTED_DOMAIN, 'CHALLENGE_DOMAIN_INVALID')
  assert(parsed.uri === EXPECTED_URI, 'CHALLENGE_URI_INVALID')
  assert(parsed.chainId === EXPECTED_CHAIN_ID, 'CHALLENGE_CHAIN_INVALID')
  assert(parsed.statement === EXPECTED_STATEMENT, 'CHALLENGE_STATEMENT_INVALID')
  assert(typeof parsed.nonce === 'string' && /^[A-Za-z0-9]{8,}$/.test(parsed.nonce), 'CHALLENGE_NONCE_INVALID')
  assert(parsed.issuedAt instanceof Date, 'CHALLENGE_ISSUED_AT_INVALID')
  assert(parsed.expirationTime instanceof Date, 'CHALLENGE_EXPIRATION_INVALID')
  const now = Date.now()
  assert(Math.abs(now - parsed.issuedAt.getTime()) < 60_000, 'CHALLENGE_ISSUED_AT_STALE')
  assert(parsed.expirationTime.getTime() > now, 'CHALLENGE_ALREADY_EXPIRED')
}

async function issueChallenge(jar, fixture) {
  currentStage = `${fixture.label}.challenge`
  const response = await request(jar, '/api/county-hunter/auth/challenge', {
    method: 'POST',
    body: { address: fixture.account.address },
  })
  expectStatus(response, 200, 'CHALLENGE_REQUEST_FAILED')
  assert(typeof response.json?.message === 'string', 'CHALLENGE_MESSAGE_MISSING')
  validateChallenge(response.json.message, fixture)
  return response.json.message
}

async function verifyProof(jar, message, signature) {
  return request(jar, '/api/county-hunter/auth/verify', {
    method: 'POST',
    body: { message, signature },
  })
}

async function confirmSession(session, fixture) {
  currentStage = `${fixture.label}.session`
  const response = await request(session, '/api/county-hunter/auth/session')
  expectStatus(response, 200, 'SESSION_ENDPOINT_FAILED')
  assert(response.json?.authenticated === true, 'SESSION_NOT_AUTHENTICATED')
}

async function login(fixture) {
  const session = new CookieJar()
  sessions.push({ fixture, session })
  const message = await issueChallenge(session, fixture)
  currentStage = `${fixture.label}.verify`
  const signature = await signMessage(fixture.account, message)
  const response = await verifyProof(session, message, signature)
  expectStatus(response, 200, 'SIWE_VERIFY_FAILED')
  assert(response.json?.authenticated === true, 'SIWE_SESSION_NOT_CREATED')
  await confirmSession(session, fixture)
  report(`${fixture.label} real SIWE session`)
  return session
}

async function viewerFailureMatrixAndLogin(viewer, otherFixture) {
  const session = new CookieJar()
  sessions.push({ fixture: viewer, session })
  const message = await issueChallenge(session, viewer)

  const failureCases = [
    {
      label: 'wrong domain',
      message: replaceMessageLine(
        message,
        /^localhost:3000 wants you to sign in with your Ethereum account:/m,
        'attacker.invalid wants you to sign in with your Ethereum account:',
        'DOMAIN_MUTATION_FAILED',
      ),
      signer: viewer.account,
    },
    {
      label: 'URI without trailing slash',
      message: replaceMessageLine(
        message,
        /^URI: https:\/\/localhost:3000\/$/m,
        'URI: https://localhost:3000',
        'URI_WITHOUT_SLASH_MUTATION_FAILED',
      ),
      signer: viewer.account,
    },
    {
      label: 'URI with unauthorized path',
      message: replaceMessageLine(
        message,
        /^URI: https:\/\/localhost:3000\/$/m,
        'URI: https://localhost:3000/county-hunter',
        'URI_PATH_MUTATION_FAILED',
      ),
      signer: viewer.account,
    },
    {
      label: 'wrong chain',
      message: replaceMessageLine(
        message,
        /^Chain ID: 8453$/m,
        'Chain ID: 1',
        'CHAIN_MUTATION_FAILED',
      ),
      signer: viewer.account,
    },
    {
      label: 'expired challenge',
      message: replaceMessageLine(
        message,
        /^Expiration Time: .*$/m,
        `Expiration Time: ${new Date(Date.now() - 60_000).toISOString()}`,
        'EXPIRATION_MUTATION_FAILED',
      ),
      signer: viewer.account,
    },
    {
      label: 'signature from another wallet',
      message,
      signer: otherFixture.account,
    },
  ]

  for (const testCase of failureCases) {
    currentStage = `siwe-failure.${testCase.label}`
    const signature = await testCase.signer.signMessage({ message: testCase.message })
    const response = await verifyProof(session, testCase.message, signature)
    expectStatus(response, 401, 'SIWE_FAILURE_WAS_ACCEPTED')
    report(`SIWE rejects ${testCase.label}`)
  }

  currentStage = 'siwe-failure.invalid-signature'
  const invalidResponse = await verifyProof(session, message, `0x${'00'.repeat(65)}`)
  expectStatus(invalidResponse, 401, 'INVALID_SIGNATURE_WAS_ACCEPTED')
  report('SIWE rejects invalid signature')

  currentStage = 'viewer-a.verify'
  const signature = await signMessage(viewer.account, message)
  const validResponse = await verifyProof(session, message, signature)
  expectStatus(validResponse, 200, 'VALID_VIEWER_SIWE_REJECTED')
  assert(validResponse.json?.authenticated === true, 'VIEWER_SESSION_NOT_CREATED')
  await confirmSession(session, viewer)
  report('viewer-a real SIWE session')

  currentStage = 'siwe-failure.replay'
  const replay = await verifyProof(session, message, signature)
  expectStatus(replay, 401, 'SIWE_REPLAY_WAS_ACCEPTED')
  report('SIWE rejects nonce replay')
  return session
}

async function getCounties(session, expectedOrganization, expectedCount, label) {
  currentStage = `${label}.read-counties`
  const response = await request(session, '/api/county-hunter/counties')
  expectStatus(response, 200, 'COUNTY_READ_FAILED')
  assert(Array.isArray(response.json), 'COUNTY_RESPONSE_INVALID')
  assert(response.json.length === expectedCount, 'COUNTY_COUNT_UNEXPECTED')
  assert(
    response.json.every((row) => row?.organization_id === expectedOrganization),
    'COUNTY_TENANT_MISMATCH',
  )
  report(`${label} reads own tenant`)
  return response.json
}

async function expectBlocked(session, path, method, body, expectedStatus, label) {
  currentStage = label
  const response = await request(session, path, { method, body })
  expectStatus(response, expectedStatus, 'EXPECTED_AUTHORIZATION_BLOCK_MISSING')
  report(label)
}

async function logoutAll() {
  for (const { fixture, session } of sessions) {
    currentStage = `${fixture.label}.logout`
    const logout = await request(session, '/api/county-hunter/auth/logout', { method: 'POST' })
    expectStatus(logout, 200, 'SESSION_LOGOUT_FAILED')
    const blocked = await request(session, '/api/county-hunter/counties')
    expectStatus(blocked, 401, 'LOGGED_OUT_SESSION_STILL_AUTHORIZED')
    report(`${fixture.label} logout`)
  }
}

async function main() {
  const environmentText = await readFile(new URL('../../.env.staging.local', import.meta.url), 'utf8')
  const fixtures = validateConfiguration(parseEnvironment(environmentText))
  report('staging configuration and disposable fixtures')

  const viewerSession = await viewerFailureMatrixAndLogin(fixtures.viewerA, fixtures.managerA)
  const tenantACounties = await getCounties(
    viewerSession,
    fixtures.organizationA,
    6,
    'viewer-a',
  )
  const tenantACounty = tenantACounties[0]
  assert(isUuid(tenantACounty?.id), 'TENANT_A_COUNTY_ID_INVALID')

  await expectBlocked(
    viewerSession,
    `/api/county-hunter/counties/${tenantACounty.id}/sources`,
    'POST',
    {},
    403,
    'viewer-a source creation blocked',
  )
  await expectBlocked(
    viewerSession,
    `/api/county-hunter/counties/${tenantACounty.id}`,
    'PATCH',
    {},
    403,
    'viewer-a county update blocked',
  )
  await expectBlocked(
    viewerSession,
    '/api/county-hunter/bootstrap',
    'POST',
    undefined,
    403,
    'viewer-a bootstrap blocked',
  )

  managerSession = await login(fixtures.managerA)
  const managerCounties = await getCounties(
    managerSession,
    fixtures.organizationA,
    6,
    'manager-a',
  )
  assert(
    managerCounties.map((row) => row.id).sort().join(',') ===
      tenantACounties.map((row) => row.id).sort().join(','),
    'TENANT_A_ROLE_DATA_MISMATCH',
  )

  adminASession = await login(fixtures.adminA)

  currentStage = 'manager-a.create-source'
  const sourceName = `Phase 1.4 temporary source ${randomUUID()}`
  const createdSource = await request(
    managerSession,
    `/api/county-hunter/counties/${tenantACounty.id}/sources`,
    {
      method: 'POST',
      body: {
        name: sourceName,
        source_type: 'manual_e2e_fixture',
        is_official: false,
        status: 'pending_manual_configuration',
        coverage_percent: 0,
        notes: 'Temporary staging fixture; removed after Phase 1.4 E2E.',
      },
    },
  )
  expectStatus(createdSource, 201, 'MANAGER_SOURCE_CREATE_FAILED')
  temporarySourceId = createdSource.json?.id
  assert(isUuid(temporarySourceId), 'TEMPORARY_SOURCE_ID_INVALID')
  assert(createdSource.json?.organization_id === fixtures.organizationA, 'MANAGER_SOURCE_TENANT_MISMATCH')
  assert(createdSource.json?.url === null, 'TEMPORARY_SOURCE_URL_MUST_BE_EMPTY')
  report('manager-a source creation')

  currentStage = 'manager-a.update-source'
  const updatedSource = await request(
    managerSession,
    `/api/county-hunter/sources/${temporarySourceId}`,
    {
      method: 'PATCH',
      body: {
        notes: 'Temporary staging fixture updated by Phase 1.4 E2E.',
        coverage_percent: 1,
      },
    },
  )
  expectStatus(updatedSource, 200, 'MANAGER_SOURCE_UPDATE_FAILED')
  assert(Number(updatedSource.json?.coverage_percent) === 1, 'MANAGER_SOURCE_UPDATE_NOT_PERSISTED')
  report('manager-a source update')

  await expectBlocked(
    managerSession,
    '/api/county-hunter/bootstrap',
    'POST',
    undefined,
    403,
    'manager-a bootstrap blocked',
  )

  const adminBSession = await login(fixtures.adminB)
  currentStage = 'admin-b.bootstrap-first'
  const firstBootstrap = await request(adminBSession, '/api/county-hunter/bootstrap', { method: 'POST' })
  expectStatus(firstBootstrap, 200, 'ADMIN_B_BOOTSTRAP_FAILED')
  assert([0, 6].includes(firstBootstrap.json?.counties_created), 'ADMIN_B_BOOTSTRAP_COUNT_INVALID')
  const firstBootstrapCount = firstBootstrap.json.counties_created

  currentStage = 'admin-b.bootstrap-second'
  const secondBootstrap = await request(adminBSession, '/api/county-hunter/bootstrap', { method: 'POST' })
  expectStatus(secondBootstrap, 200, 'ADMIN_B_SECOND_BOOTSTRAP_FAILED')
  assert(secondBootstrap.json?.counties_created === 0, 'ADMIN_B_BOOTSTRAP_NOT_IDEMPOTENT')
  report(`admin-b bootstrap ${firstBootstrapCount} -> 0`)

  const tenantBCounties = await getCounties(
    adminBSession,
    fixtures.organizationB,
    6,
    'admin-b',
  )
  const tenantBCounty = tenantBCounties[0]
  assert(isUuid(tenantBCounty?.id), 'TENANT_B_COUNTY_ID_INVALID')
  const tenantAIds = new Set(tenantACounties.map((row) => row.id))
  assert(tenantBCounties.every((row) => !tenantAIds.has(row.id)), 'CROSS_TENANT_COUNTY_LEAK')
  report('admin-b sees no tenant-a rows')

  await expectBlocked(
    managerSession,
    `/api/county-hunter/counties/${tenantBCounty.id}`,
    'GET',
    undefined,
    404,
    'manager-a tenant-b access blocked',
  )
  await expectBlocked(
    adminBSession,
    `/api/county-hunter/counties/${tenantACounty.id}`,
    'GET',
    undefined,
    404,
    'admin-b tenant-a read blocked',
  )
  await expectBlocked(
    adminBSession,
    `/api/county-hunter/counties/${tenantACounty.id}`,
    'PATCH',
    { active: tenantACounty.active },
    404,
    'admin-b tenant-a update blocked',
  )

  currentStage = 'admin-a.cleanup-source'
  const cleanup = await request(
    adminASession,
    `/api/county-hunter/sources/${temporarySourceId}`,
    { method: 'DELETE' },
  )
  expectStatus(cleanup, 204, 'TEMPORARY_SOURCE_CLEANUP_FAILED')
  temporarySourceId = null
  report('temporary manager source removed')

  await logoutAll()
}

let exitCode = 0
try {
  await main()
} catch (error) {
  exitCode = 1
  if (error instanceof E2EFailure) {
    console.error(
      `SIWE_E2E_FAILURE stage=${error.stage} code=${error.code}` +
        (Number.isInteger(error.status) ? ` status=${error.status}` : ''),
    )
  } else {
    console.error(`SIWE_E2E_FAILURE stage=${currentStage} code=UNEXPECTED_FAILURE`)
  }
} finally {
  if (temporarySourceId && adminASession) {
    currentStage = 'emergency-cleanup-source'
    const cleanup = await request(
      adminASession,
      `/api/county-hunter/sources/${temporarySourceId}`,
      { method: 'DELETE' },
    ).catch(() => null)
    if (!cleanup || cleanup.status !== 204) {
      exitCode = 1
      console.error('SIWE_E2E_FAILURE stage=emergency-cleanup-source code=CLEANUP_FAILED')
    } else {
      console.log('PASS emergency temporary source cleanup')
      temporarySourceId = null
    }
  }
}

process.exitCode = exitCode
