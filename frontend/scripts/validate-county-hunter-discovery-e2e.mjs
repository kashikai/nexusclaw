import { readFile } from 'node:fs/promises'
import https from 'node:https'
import { getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { parseSiweMessage } from 'viem/siwe'

const APP_ORIGIN = 'https://localhost:3000'
const SAFE_BODY_LIMIT = 2_000_000
const ALLOWED_ENVIRONMENT = new Set([
  'COUNTY_HUNTER_STAGING_CONFIRM',
  'COUNTY_HUNTER_STAGING_PROJECT_REF',
  'NEXT_PUBLIC_SUPABASE_URL',
  'COUNTY_HUNTER_TEST_ORG_A',
  'COUNTY_HUNTER_TEST_ORG_B',
  'COUNTY_HUNTER_TEST_VIEWER_A',
  'COUNTY_HUNTER_TEST_VIEWER_A_ADDRESS',
  'COUNTY_HUNTER_TEST_VIEWER_A_PRIVATE_KEY',
  'COUNTY_HUNTER_TEST_MANAGER_A',
  'COUNTY_HUNTER_TEST_MANAGER_A_ADDRESS',
  'COUNTY_HUNTER_TEST_MANAGER_A_PRIVATE_KEY',
  'COUNTY_HUNTER_TEST_ADMIN_A',
  'COUNTY_HUNTER_TEST_ADMIN_A_ADDRESS',
  'COUNTY_HUNTER_TEST_ADMIN_A_PRIVATE_KEY',
  'COUNTY_HUNTER_TEST_ADMIN_B',
  'COUNTY_HUNTER_TEST_ADMIN_B_ADDRESS',
  'COUNTY_HUNTER_TEST_ADMIN_B_PRIVATE_KEY',
])

let stage = 'configuration'
const sessions = []

class DiscoveryE2EFailure extends Error {
  constructor(code, status) {
    super(code)
    this.name = 'DiscoveryE2EFailure'
    this.code = code
    this.stage = stage
    this.status = status
  }
}

function assert(condition, code, status) {
  if (!condition) throw new DiscoveryE2EFailure(code, status)
}

function report(label) {
  console.log(`PASS ${label}`)
}

function parseEnvironment(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
      .flatMap((line) => {
        const separator = line.indexOf('=')
        const name = line.slice(0, separator).trim()
        if (!ALLOWED_ENVIRONMENT.has(name)) return []
        let value = line.slice(separator + 1).trim()
        if (
          value.length >= 2 &&
          ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")))
        ) {
          value = value.slice(1, -1)
        }
        return [[name, value]]
      }),
  )
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function fixture(environment, variable, label, organizationId) {
  const privateKey = environment[`${variable}_PRIVATE_KEY`]
  const address = environment[`${variable}_ADDRESS`]
  const userId = environment[variable]
  assert(/^0x[0-9a-f]{64}$/i.test(privateKey ?? ''), `${label}_PRIVATE_KEY_INVALID`)
  assert(isAddress(address ?? ''), `${label}_ADDRESS_INVALID`)
  assert(isUuid(userId), `${label}_USER_ID_INVALID`)
  const account = privateKeyToAccount(privateKey)
  assert(getAddress(account.address) === getAddress(address), `${label}_WALLET_BINDING_INVALID`)
  return { label, account, userId, organizationId }
}

function validateConfiguration(environment) {
  assert(process.env.SUPABASE_SERVICE_ROLE_KEY === undefined, 'SERVICE_ROLE_PRESENT_IN_E2E_RUNTIME')
  assert(process.env.SUPABASE_SECRET_KEY === undefined, 'SECRET_KEY_PRESENT_IN_E2E_RUNTIME')
  assert(environment.COUNTY_HUNTER_STAGING_CONFIRM === 'STAGING_ONLY', 'STAGING_CONFIRMATION_REQUIRED')
  const ref = environment.COUNTY_HUNTER_STAGING_PROJECT_REF
  assert(/^[a-z0-9]{20}$/.test(ref ?? ''), 'STAGING_PROJECT_REF_INVALID')
  assert(environment.NEXT_PUBLIC_SUPABASE_URL === `https://${ref}.supabase.co`, 'STAGING_PROJECT_MISMATCH')
  const organizationA = environment.COUNTY_HUNTER_TEST_ORG_A
  const organizationB = environment.COUNTY_HUNTER_TEST_ORG_B
  assert(isUuid(organizationA) && isUuid(organizationB) && organizationA !== organizationB, 'TENANTS_INVALID')
  return {
    viewerA: fixture(environment, 'COUNTY_HUNTER_TEST_VIEWER_A', 'viewer-a', organizationA),
    managerA: fixture(environment, 'COUNTY_HUNTER_TEST_MANAGER_A', 'manager-a', organizationA),
    adminA: fixture(environment, 'COUNTY_HUNTER_TEST_ADMIN_A', 'admin-a', organizationA),
    adminB: fixture(environment, 'COUNTY_HUNTER_TEST_ADMIN_B', 'admin-b', organizationB),
  }
}

class CookieJar {
  values = new Map()

  header() {
    return [...this.values.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
  }

  update(headers = []) {
    for (const header of headers) {
      const parts = header.split(';').map((part) => part.trim())
      const separator = parts[0].indexOf('=')
      if (separator < 1) continue
      const name = parts[0].slice(0, separator)
      const value = parts[0].slice(separator + 1)
      const attributes = parts.slice(1).map((part) => part.toLowerCase())
      const expired = value === '' || attributes.includes('max-age=0') ||
        attributes.some((attribute) => attribute.startsWith('expires=thu, 01 jan 1970'))
      if (expired) this.values.delete(name)
      else this.values.set(name, value)
    }
  }
}

async function request(session, path, options = {}) {
  assert(path.startsWith('/api/county-hunter/'), 'NON_COUNTY_HUNTER_PATH_REJECTED')
  const url = new URL(path, APP_ORIGIN)
  assert(url.origin === APP_ORIGIN, 'NON_LOCAL_ORIGIN_REJECTED')
  const body = options.body === undefined ? null : JSON.stringify(options.body)
  const headers = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
  }
  const cookie = session.header()
  if (cookie) headers.Cookie = cookie

  const response = await new Promise((resolve, reject) => {
    const pending = https.request(url, {
      method: options.method ?? 'GET',
      rejectUnauthorized: false,
      headers,
    }, (incoming) => {
      const chunks = []
      let size = 0
      incoming.on('data', (chunk) => {
        size += chunk.length
        if (size > SAFE_BODY_LIMIT) incoming.destroy(new Error('RESPONSE_LIMIT_EXCEEDED'))
        else chunks.push(chunk)
      })
      incoming.on('error', reject)
      incoming.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        let json = null
        try { json = raw ? JSON.parse(raw) : null } catch { json = null }
        resolve({
          status: incoming.statusCode ?? 0,
          headers: incoming.headers,
          setCookies: incoming.headers['set-cookie'] ?? [],
          raw,
          json,
        })
      })
    })
    pending.on('error', reject)
    if (body) pending.write(body)
    pending.end()
  }).catch(() => {
    throw new DiscoveryE2EFailure('LOCAL_HTTPS_REQUEST_FAILED')
  })

  session.update(response.setCookies)
  assert(response.headers['cache-control'] === 'private, no-store', 'CACHE_CONTROL_INVALID', response.status)
  assert(response.headers.pragma === 'no-cache', 'PRAGMA_INVALID', response.status)
  assert(response.headers.expires === '0', 'EXPIRES_INVALID', response.status)
  assert(!/access_token|refresh_token|service_role|private_key/i.test(response.raw), 'SECRET_IN_RESPONSE', response.status)
  return response
}

async function login(user) {
  stage = `${user.label}.login`
  const session = new CookieJar()
  sessions.push(session)
  const challenge = await request(session, '/api/county-hunter/auth/challenge', {
    method: 'POST',
    body: { address: user.account.address },
  })
  assert(challenge.status === 200 && typeof challenge.json?.message === 'string', 'CHALLENGE_FAILED', challenge.status)
  const parsed = parseSiweMessage(challenge.json.message)
  assert(parsed.domain === 'localhost:3000', 'SIWE_DOMAIN_INVALID')
  assert(parsed.uri === 'https://localhost:3000/', 'SIWE_URI_INVALID')
  assert(parsed.chainId === 8453, 'SIWE_CHAIN_INVALID')
  const signature = await user.account.signMessage({ message: challenge.json.message })
  const verified = await request(session, '/api/county-hunter/auth/verify', {
    method: 'POST',
    body: { message: challenge.json.message, signature },
  })
  assert(verified.status === 200 && verified.json?.authenticated === true, 'SIWE_VERIFY_FAILED', verified.status)
  const active = await request(session, '/api/county-hunter/auth/session')
  assert(active.status === 200 && active.json?.authenticated === true, 'SESSION_NOT_ACTIVE', active.status)
  report(`${user.label} real SIWE session`)
  return session
}

async function logoutAll() {
  for (const session of sessions) {
    await request(session, '/api/county-hunter/auth/logout', { method: 'POST' }).catch(() => undefined)
  }
}

async function overview(session) {
  const response = await request(session, '/api/county-hunter/discovery')
  assert(response.status === 200 && response.json, 'DISCOVERY_OVERVIEW_FAILED', response.status)
  return response.json
}

async function runDiscovery(session) {
  const response = await request(session, '/api/county-hunter/discovery', { method: 'POST' })
  assert(response.status === 200 && response.json, 'DISCOVERY_RUN_FAILED', response.status)
  assert(['completed', 'review_required'].includes(response.json.status), 'DISCOVERY_STATUS_INVALID')
  assert(response.json.records > 0, 'DISCOVERY_RECORDS_EMPTY')
  return response.json
}

async function replaySnapshot(session, snapshotId) {
  const response = await request(session, '/api/county-hunter/discovery/replay', {
    method: 'POST',
    body: { snapshotId },
  })
  assert(response.status === 200 && response.json, 'SNAPSHOT_REPLAY_FAILED', response.status)
  assert(response.json.runType === 'snapshot_replay', 'SNAPSHOT_REPLAY_TYPE_INVALID')
  assert(response.json.snapshotId === snapshotId, 'SNAPSHOT_REPLAY_LINEAGE_INVALID')
  assert(response.json.records > 0, 'SNAPSHOT_REPLAY_RECORDS_EMPTY')
  return response.json
}

async function main() {
  try {
    const environment = {
      ...parseEnvironment(await readFile('../.env.staging.local', 'utf8')),
      ...Object.fromEntries(
        [...ALLOWED_ENVIRONMENT].flatMap((name) => process.env[name] ? [[name, process.env[name]]] : []),
      ),
    }
    const users = validateConfiguration(environment)

    const adminA = await login(users.adminA)
    stage = 'admin-a.discovery.first'
    const first = await runDiscovery(adminA)
    report(`admin-a discovery records=${first.records}`)
    stage = 'admin-a.discovery.idempotent'
    const second = await runDiscovery(adminA)
    assert(second.records === first.records, 'IDEMPOTENT_RECORD_COUNT_CHANGED')
    assert(second.added === 0 && second.changed === 0 && second.removed === 0, 'SECOND_RUN_NOT_IDEMPOTENT')
    assert(second.unchanged === second.records, 'SECOND_RUN_UNCHANGED_COUNT_INVALID')
    report(`admin-a idempotent discovery unchanged=${second.unchanged}`)
    const adminOverview = await overview(adminA)
    assert(adminOverview.source?.organization_id === users.adminA.organizationId, 'ADMIN_A_SOURCE_TENANT_INVALID')
    assert(adminOverview.latestRun?.id === second.runId, 'ADMIN_A_LATEST_RUN_INVALID')
    assert(adminOverview.snapshots?.length === 2, 'ADMIN_A_SNAPSHOTS_INVALID')
    assert(adminOverview.snapshots.every((snapshot) => !('content_base64' in snapshot)), 'SNAPSHOT_BODY_EXPOSED')
    report('admin-a snapshot provenance')
    const adminASnapshot = adminOverview.snapshots.find(
      (snapshot) => snapshot.snapshot_kind === 'official_document',
    )
    assert(adminASnapshot, 'ADMIN_A_DOCUMENT_SNAPSHOT_MISSING')
    const originalSnapshotHash = adminASnapshot.content_hash

    stage = 'admin-a.snapshot-replay.first'
    const firstReplay = await replaySnapshot(adminA, adminASnapshot.id)
    assert(firstReplay.sourceRunId === second.runId, 'SNAPSHOT_REPLAY_SOURCE_RUN_INVALID')
    assert(
      firstReplay.records === second.records &&
        firstReplay.added === 0 &&
        firstReplay.changed === 0 &&
        firstReplay.removed === 0 &&
        firstReplay.unchanged === firstReplay.records,
      'SNAPSHOT_REPLAY_DIFF_INVALID',
    )
    const replayOverview = await overview(adminA)
    assert(replayOverview.latestRun?.id === firstReplay.runId, 'SNAPSHOT_REPLAY_LATEST_RUN_INVALID')
    assert(replayOverview.latestRun?.run_type === 'snapshot_replay', 'SNAPSHOT_REPLAY_METADATA_INVALID')
    assert(replayOverview.snapshots?.length === 1, 'SNAPSHOT_REPLAY_PROVENANCE_INVALID')
    assert(
      replayOverview.snapshots[0].id === adminASnapshot.id &&
        replayOverview.snapshots[0].content_hash === originalSnapshotHash &&
        !('content_base64' in replayOverview.snapshots[0]),
      'SNAPSHOT_REPLAY_MUTATED_SOURCE',
    )
    stage = 'admin-a.snapshot-replay.idempotent'
    const secondReplay = await replaySnapshot(adminA, adminASnapshot.id)
    assert(
      secondReplay.records === firstReplay.records &&
        secondReplay.added === 0 &&
        secondReplay.changed === 0 &&
        secondReplay.removed === 0 &&
        secondReplay.unchanged === secondReplay.records,
      'SNAPSHOT_REPLAY_NOT_IDEMPOTENT',
    )
    const missingReplay = await request(adminA, '/api/county-hunter/discovery/replay', {
      method: 'POST',
      body: { snapshotId: '00000000-0000-4000-8000-000000000000' },
    })
    assert(
      missingReplay.status >= 400 && missingReplay.status < 500,
      'MISSING_SNAPSHOT_REPLAY_NOT_BLOCKED',
      missingReplay.status,
    )
    report(`admin-a snapshot replay unchanged=${secondReplay.unchanged}`)

    const viewer = await login(users.viewerA)
    const viewerOverview = await overview(viewer)
    assert(viewerOverview.canRun === false, 'VIEWER_RUN_PERMISSION_EXPOSED')
    assert(viewerOverview.source?.organization_id === users.viewerA.organizationId, 'VIEWER_TENANT_INVALID')
    const viewerRun = await request(viewer, '/api/county-hunter/discovery', { method: 'POST' })
    assert(viewerRun.status === 403, 'VIEWER_DISCOVERY_NOT_BLOCKED', viewerRun.status)
    const viewerReplay = await request(viewer, '/api/county-hunter/discovery/replay', {
      method: 'POST',
      body: { snapshotId: adminASnapshot.id },
    })
    assert(viewerReplay.status === 403, 'VIEWER_REPLAY_NOT_BLOCKED', viewerReplay.status)
    report('viewer read-only discovery')

    const manager = await login(users.managerA)
    const managerOverview = await overview(manager)
    assert(managerOverview.canRun === false, 'MANAGER_RUN_PERMISSION_EXPOSED')
    const managerRun = await request(manager, '/api/county-hunter/discovery', { method: 'POST' })
    assert(managerRun.status === 403, 'MANAGER_DISCOVERY_NOT_BLOCKED', managerRun.status)
    const managerReplay = await request(manager, '/api/county-hunter/discovery/replay', {
      method: 'POST',
      body: { snapshotId: adminASnapshot.id },
    })
    assert(managerReplay.status === 403, 'MANAGER_REPLAY_NOT_BLOCKED', managerReplay.status)
    report('manager discovery execution blocked')

    const adminB = await login(users.adminB)
    const beforeB = await overview(adminB)
    assert(beforeB.source?.organization_id !== users.adminA.organizationId, 'ADMIN_B_SAW_ADMIN_A_SOURCE')
    const runB = await runDiscovery(adminB)
    const afterB = await overview(adminB)
    assert(afterB.source?.organization_id === users.adminB.organizationId, 'ADMIN_B_SOURCE_TENANT_INVALID')
    assert(afterB.latestRun?.id === runB.runId && runB.runId !== second.runId, 'ADMIN_B_RUN_ISOLATION_INVALID')
    const adminBSnapshot = afterB.snapshots.find(
      (snapshot) => snapshot.snapshot_kind === 'official_document',
    )
    assert(adminBSnapshot, 'ADMIN_B_DOCUMENT_SNAPSHOT_MISSING')
    const replayB = await replaySnapshot(adminB, adminBSnapshot.id)
    assert(replayB.sourceRunId === runB.runId, 'ADMIN_B_REPLAY_SOURCE_INVALID')
    const crossTenantReplay = await request(adminB, '/api/county-hunter/discovery/replay', {
      method: 'POST',
      body: { snapshotId: adminASnapshot.id },
    })
    assert(
      crossTenantReplay.status >= 400 && crossTenantReplay.status < 500,
      'ADMIN_B_REPLAY_CROSS_TENANT_NOT_BLOCKED',
      crossTenantReplay.status,
    )
    report('admin-b isolated discovery')

    const refreshed = await request(adminA, '/api/county-hunter/auth/session')
    assert(refreshed.status === 200 && refreshed.json?.authenticated === true, 'SESSION_REFRESH_FAILED')
    report('discovery sessions survived refresh')
  } finally {
    await logoutAll()
  }
}

main()
  .then(() => {
    console.log('COUNTY HUNTER DISCOVERY STAGING E2E PASSED')
  })
  .catch((error) => {
    const safe = error instanceof DiscoveryE2EFailure
      ? `stage=${error.stage} code=${error.code}${error.status ? ` status=${error.status}` : ''}`
      : 'stage=unexpected code=UNHANDLED_E2E_FAILURE'
    console.error(`COUNTY HUNTER DISCOVERY STAGING E2E FAILED ${safe}`)
    process.exitCode = 1
  })
