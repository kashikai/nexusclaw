import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { getAddress, verifyMessage } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  createSiweMessage,
  generateSiweNonce,
  parseSiweMessage,
  validateSiweMessage,
} from 'viem/siwe'
import { normalizeCountyHunterSiweOrigin } from '../features/county-hunter/siwe-origin.mjs'
import { readSupabaseAdminKey } from './lib/supabase-admin-key.mjs'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))
const environmentPath = fileURLToPath(
  new URL('../../.env.staging.local', import.meta.url),
)
const rotationDirectory = fileURLToPath(
  new URL('../../cache/county-hunter-fixture-rotation/', import.meta.url),
)
const backupPath = fileURLToPath(
  new URL(
    '../../cache/county-hunter-fixture-rotation/.env.staging.local',
    import.meta.url,
  ),
)
const temporaryPath = fileURLToPath(
  new URL(
    '../../cache/county-hunter-fixture-rotation/.env.staging.local.tmp',
    import.meta.url,
  ),
)
const expectedAuth = normalizeCountyHunterSiweOrigin('https://localhost:3000')
const expectedChainId = 8453
const expectedStagingProjectRef = 'dtwvbwryjcvsyyxmalxh'
const rotationGeneration = 'staging-wallet-rotation-20260731'
const expectedRoles = new Map([
  ['viewer-a', {
    variable: 'COUNTY_HUNTER_TEST_VIEWER_A',
    permissions: ['county_hunter.view'],
    tenant: 'a',
  }],
  ['manager-a', {
    variable: 'COUNTY_HUNTER_TEST_MANAGER_A',
    permissions: ['county_hunter.view', 'county_hunter.manage'],
    tenant: 'a',
  }],
  ['admin-a', {
    variable: 'COUNTY_HUNTER_TEST_ADMIN_A',
    permissions: [
      'county_hunter.view',
      'county_hunter.manage',
      'county_hunter.admin',
    ],
    tenant: 'a',
  }],
  ['admin-b', {
    variable: 'COUNTY_HUNTER_TEST_ADMIN_B',
    permissions: [
      'county_hunter.view',
      'county_hunter.manage',
      'county_hunter.admin',
    ],
    tenant: 'b',
  }],
])

class RotationFailure extends Error {
  constructor(stage, code) {
    super(code)
    this.name = 'RotationFailure'
    this.stage = stage
    this.code = code
  }
}

function fail(stage, code) {
  throw new RotationFailure(stage, code)
}

function parseEnvironment(contents) {
  const environment = {}
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(
      /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/,
    )
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    environment[match[1]] = value
  }
  return environment
}

function updateEnvironmentAssignments(contents, assignments) {
  const newline = contents.includes('\r\n') ? '\r\n' : '\n'
  const trailingNewline = contents.endsWith('\n')
  const seen = new Set()
  const lines = contents.split(/\r?\n/).flatMap((line) => {
    const match = line.match(
      /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/,
    )
    const name = match?.[1]
    if (!name || !assignments.has(name)) return [line]
    if (seen.has(name)) return []
    seen.add(name)
    return [`${name}=${assignments.get(name)}`]
  })
  for (const [name, value] of assignments) {
    if (!seen.has(name)) lines.push(`${name}=${value}`)
  }
  while (lines.length > 0 && lines.at(-1) === '') lines.pop()
  return `${lines.join(newline)}${trailingNewline ? newline : ''}`
}

async function listAllAuthUsers(admin) {
  const users = []
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error) fail('preflight-auth-users', 'auth_admin_query_failed')
    users.push(...(data?.users ?? []))
    if ((data?.users?.length ?? 0) < 1000) return users
  }
  fail('preflight-auth-users', 'auth_admin_pagination_limit')
}

function findWalletAddresses(user) {
  const values = [
    user?.user_metadata?.address,
    user?.user_metadata?.wallet_address,
    user?.user_metadata?.sub,
    user?.user_metadata?.custom_claims?.address,
  ]
  for (const identity of user?.identities ?? []) {
    values.push(
      identity?.id,
      identity?.identity_data?.address,
      identity?.identity_data?.wallet_address,
      identity?.identity_data?.sub,
    )
  }
  return new Set(
    values
      .filter((value) => /^0x[0-9a-f]{40}$/i.test(value ?? ''))
      .map((value) => value.toLowerCase()),
  )
}

function validateLocalPreflight(environment) {
  if (
    !process.argv.includes('--confirm-rotation=STAGING_ONLY')
    || environment.COUNTY_HUNTER_STAGING_CONFIRM !== 'STAGING_ONLY'
  ) {
    fail('preflight-local', 'staging_confirmation_missing')
  }
  if (
    environment.COUNTY_HUNTER_PRODUCTION_CONFIRM === 'PRODUCTION_ONLY'
    || environment.COUNTY_HUNTER_PRODUCTION_DB_URL
    || environment.COUNTY_HUNTER_PRODUCTION_PROJECT_REF
    || environment.NODE_ENV === 'production'
  ) {
    fail('preflight-local', 'production_flag_detected')
  }
  const projectRef = environment.COUNTY_HUNTER_STAGING_PROJECT_REF
  if (projectRef !== expectedStagingProjectRef) {
    fail('preflight-local', 'invalid_staging_project_ref')
  }
  if (
    environment.NEXT_PUBLIC_SUPABASE_URL
    !== `https://${projectRef}.supabase.co`
  ) {
    fail('preflight-local', 'staging_project_mismatch')
  }
  if (
    environment.COUNTY_HUNTER_AUTH_ORIGIN !== expectedAuth.origin
    || !environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    fail('preflight-local', 'staging_auth_configuration_invalid')
  }
  try {
    const databaseUrl = new URL(environment.COUNTY_HUNTER_STAGING_DB_URL)
    if (
      !databaseUrl.hostname.endsWith('.supabase.com')
      || !databaseUrl.username.includes(projectRef)
    ) {
      fail('preflight-local', 'staging_database_mismatch')
    }
  } catch {
    fail('preflight-local', 'staging_database_invalid')
  }
  if (environment.SUPABASE_SERVICE_ROLE_KEY === undefined) {
    fail('preflight-local', 'legacy_presence_not_confirmed')
  }
}

function verifyIgnoredPath(path) {
  const result = spawnSync(
    'git',
    ['check-ignore', '--quiet', '--', path],
    { cwd: repositoryRoot, stdio: 'ignore' },
  )
  if (result.status !== 0) fail('preflight-local', 'backup_path_not_ignored')
}

async function resolveOldFixtures(admin, users) {
  const { data: memberships, error } = await admin
    .from('county_hunter_memberships')
    .select('user_id,organization_id,permissions,active')
  if (error) fail('preflight-memberships', 'membership_query_failed')

  const fixtures = []
  for (const [role, specification] of expectedRoles) {
    const candidates = users.filter((user) => (
      user?.app_metadata?.county_hunter_fixture === true
      && user?.app_metadata?.county_hunter_fixture_role === role
      && user?.app_metadata?.county_hunter_fixture_retired !== true
    ))
    if (candidates.length !== 1) {
      fail('preflight-fixtures', 'old_fixture_ambiguous')
    }
    const user = candidates[0]
    const membershipCandidates = (memberships ?? []).filter((membership) => (
      membership.user_id === user.id
      && membership.organization_id === user?.app_metadata?.organization_id
      && membership.active === true
    ))
    if (membershipCandidates.length !== 1) {
      fail('preflight-fixtures', 'old_membership_ambiguous')
    }
    const actualPermissions = [
      ...(membershipCandidates[0].permissions ?? []),
    ].sort()
    const expectedPermissions = [...specification.permissions].sort()
    if (
      JSON.stringify(actualPermissions)
      !== JSON.stringify(expectedPermissions)
    ) {
      fail('preflight-fixtures', 'old_membership_permissions_invalid')
    }
    const walletAddresses = findWalletAddresses(user)
    if (walletAddresses.size !== 1) {
      fail('preflight-fixtures', 'old_wallet_ambiguous')
    }
    fixtures.push({
      role,
      specification,
      user,
      organizationId: user.app_metadata.organization_id,
      membership: membershipCandidates[0],
      walletAddress: [...walletAddresses][0],
    })
  }
  const tenantA = fixtures
    .filter((fixture) => fixture.specification.tenant === 'a')
    .map((fixture) => fixture.organizationId)
  const tenantB = fixtures.find(
    (fixture) => fixture.specification.tenant === 'b',
  )?.organizationId
  if (
    tenantA.length !== 3
    || !tenantA.every((value) => value === tenantA[0])
    || !tenantB
    || tenantB === tenantA[0]
  ) {
    fail('preflight-tenants', 'tenant_mapping_invalid')
  }
  return { fixtures, tenantA: tenantA[0], tenantB }
}

async function createAuthenticatedFixture({
  admin,
  environment,
  fixture,
  account,
  rotationTime,
}) {
  const issuedAt = new Date()
  const expirationTime = new Date(issuedAt.getTime() + 5 * 60 * 1000)
  const nonce = generateSiweNonce()
  const message = createSiweMessage({
    address: account.address,
    chainId: expectedChainId,
    domain: expectedAuth.domain,
    uri: expectedAuth.uri,
    nonce,
    issuedAt,
    expirationTime,
    statement: 'Authenticate to NexusClaw County Hunter staging.',
    version: '1',
  })
  const parsed = parseSiweMessage(message)
  if (
    parsed.domain !== expectedAuth.domain
    || parsed.uri !== expectedAuth.uri
    || parsed.chainId !== expectedChainId
    || !validateSiweMessage({
      address: account.address,
      domain: expectedAuth.domain,
      message: parsed,
      nonce,
      time: issuedAt,
    })
  ) {
    fail('create-siwe', 'local_siwe_validation_failed')
  }
  const signature = await account.signMessage({ message })
  const validSignature = await verifyMessage({
    address: account.address,
    message,
    signature,
  })
  if (!validSignature) fail('create-siwe', 'local_signature_invalid')

  const walletClient = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  )
  const { data, error } = await walletClient.auth.signInWithWeb3({
    chain: 'ethereum',
    message,
    signature,
  })
  if (error || !data?.user?.id) {
    fail('create-web3-user', 'web3_sign_in_failed')
  }
  await walletClient.auth.signOut({ scope: 'local' })

  const { data: updated, error: updateError } =
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: {
        ...data.user.app_metadata,
        organization_id: fixture.organizationId,
        county_hunter_fixture: true,
        county_hunter_fixture_role: fixture.role,
        county_hunter_fixture_generation: rotationGeneration,
        county_hunter_fixture_retired: false,
        county_hunter_fixture_rotated_at: rotationTime,
      },
    })
  if (updateError || !updated?.user) {
    fail('configure-new-user', 'auth_metadata_update_failed')
  }

  const { error: membershipError } = await admin
    .from('county_hunter_memberships')
    .upsert({
      user_id: updated.user.id,
      organization_id: fixture.organizationId,
      permissions: fixture.specification.permissions,
      active: true,
    }, { onConflict: 'user_id,organization_id' })
  if (membershipError) {
    fail('configure-new-membership', 'membership_upsert_failed')
  }

  return {
    role: fixture.role,
    specification: fixture.specification,
    organizationId: fixture.organizationId,
    userId: updated.user.id,
    account,
  }
}

async function retireOldFixtures(admin, fixtures, rotationTime) {
  for (const fixture of fixtures) {
    const { error: membershipError } = await admin
      .from('county_hunter_memberships')
      .update({ active: false })
      .eq('user_id', fixture.user.id)
      .eq('organization_id', fixture.organizationId)
    if (membershipError) {
      fail('retire-old-membership', 'membership_retirement_failed')
    }
    const { error: userError } = await admin.auth.admin.updateUserById(
      fixture.user.id,
      {
        app_metadata: {
          ...fixture.user.app_metadata,
          county_hunter_fixture_retired: true,
          county_hunter_fixture_retired_at: rotationTime,
          county_hunter_fixture_replaced_by_generation: rotationGeneration,
        },
      },
    )
    if (userError) fail('retire-old-user', 'user_retirement_failed')
  }
}

async function validateRotation({
  admin,
  oldFixtures,
  newFixtures,
  environmentContents,
}) {
  const users = await listAllAuthUsers(admin)
  const { data: memberships, error } = await admin
    .from('county_hunter_memberships')
    .select('user_id,organization_id,permissions,active')
  if (error) fail('validate-rotation', 'membership_validation_failed')
  const environment = parseEnvironment(environmentContents)

  for (const fixture of newFixtures) {
    const activeMatches = users.filter((user) => (
      user.id === fixture.userId
      && user?.app_metadata?.county_hunter_fixture === true
      && user?.app_metadata?.county_hunter_fixture_role === fixture.role
      && user?.app_metadata?.county_hunter_fixture_generation
        === rotationGeneration
      && user?.app_metadata?.county_hunter_fixture_retired === false
    ))
    const membershipMatches = (memberships ?? []).filter((membership) => (
      membership.user_id === fixture.userId
      && membership.organization_id === fixture.organizationId
      && membership.active === true
    ))
    const variable = fixture.specification.variable
    if (
      activeMatches.length !== 1
      || membershipMatches.length !== 1
      || environment[variable] !== fixture.userId
      || getAddress(environment[`${variable}_ADDRESS`])
        !== getAddress(fixture.account.address)
      || privateKeyToAccount(environment[`${variable}_PRIVATE_KEY`]).address
        !== fixture.account.address
    ) {
      fail('validate-rotation', 'new_fixture_validation_failed')
    }
  }
  for (const fixture of oldFixtures) {
    const user = users.find((candidate) => candidate.id === fixture.user.id)
    const membership = (memberships ?? []).find((candidate) => (
      candidate.user_id === fixture.user.id
      && candidate.organization_id === fixture.organizationId
    ))
    if (
      user?.app_metadata?.county_hunter_fixture_retired !== true
      || membership?.active !== false
    ) {
      fail('validate-rotation', 'old_fixture_retirement_invalid')
    }
  }
}

async function rollbackRotation({
  admin,
  oldFixtures,
  generatedAccounts,
  backupCreated,
}) {
  let rollbackSucceeded = true
  try {
    if (backupCreated) await copyFile(backupPath, environmentPath)
  } catch {
    rollbackSucceeded = false
  }
  try {
    const users = await listAllAuthUsers(admin)
    const generatedAddresses = new Set(
      generatedAccounts.map((account) => account.address.toLowerCase()),
    )
    const generatedUsers = users.filter((user) => (
      user?.app_metadata?.county_hunter_fixture_generation
        === rotationGeneration
      || [...findWalletAddresses(user)].some(
        (address) => generatedAddresses.has(address),
      )
    ))
    for (const user of generatedUsers) {
      await admin
        .from('county_hunter_memberships')
        .delete()
        .eq('user_id', user.id)
      await admin.auth.admin.deleteUser(user.id, false)
    }
  } catch {
    rollbackSucceeded = false
  }
  try {
    for (const fixture of oldFixtures) {
      const { error: membershipError } = await admin
        .from('county_hunter_memberships')
        .upsert({
          user_id: fixture.membership.user_id,
          organization_id: fixture.membership.organization_id,
          permissions: fixture.membership.permissions,
          active: fixture.membership.active,
        }, { onConflict: 'user_id,organization_id' })
      if (membershipError) rollbackSucceeded = false
      const { error: userError } = await admin.auth.admin.updateUserById(
        fixture.user.id,
        {
          app_metadata: {
            ...fixture.user.app_metadata,
            county_hunter_fixture_retired:
              fixture.user.app_metadata?.county_hunter_fixture_retired
              ?? false,
            county_hunter_fixture_retired_at:
              fixture.user.app_metadata?.county_hunter_fixture_retired_at
              ?? null,
            county_hunter_fixture_replaced_by_generation:
              fixture.user.app_metadata
                ?.county_hunter_fixture_replaced_by_generation
              ?? null,
          },
        },
      )
      if (userError) rollbackSucceeded = false
    }
  } catch {
    rollbackSucceeded = false
  }
  await rm(temporaryPath, { force: true }).catch(() => {
    rollbackSucceeded = false
  })
  await rm(backupPath, { force: true }).catch(() => {
    rollbackSucceeded = false
  })
  await rm(rotationDirectory, { force: true, recursive: true }).catch(() => {
    rollbackSucceeded = false
  })
  return rollbackSucceeded
}

async function main() {
  verifyIgnoredPath('cache/county-hunter-fixture-rotation/.env.staging.local')
  verifyIgnoredPath(
    'cache/county-hunter-fixture-rotation/.env.staging.local.tmp',
  )
  const rawEnvironment = await readFile(environmentPath)
  const hasBom = rawEnvironment.subarray(0, 3).equals(
    Buffer.from([0xef, 0xbb, 0xbf]),
  )
  const environmentContents = rawEnvironment
    .subarray(hasBom ? 3 : 0)
    .toString('utf8')
  const environment = parseEnvironment(environmentContents)
  validateLocalPreflight(environment)

  let adminKey
  try {
    adminKey = readSupabaseAdminKey(
      {
        ...environment,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
        COUNTY_HUNTER_STRICT_ADMIN_KEY: 'true',
      },
      { strictLegacy: true },
    ).key
  } catch {
    fail('preflight-admin-key', 'strict_secret_key_required')
  }
  const admin = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    adminKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  )

  const oldUsers = await listAllAuthUsers(admin)
  const { fixtures: oldFixtures, tenantA, tenantB } =
    await resolveOldFixtures(admin, oldUsers)
  console.log('ROTATION_PREFLIGHT=PASS')
  console.log('ADMIN_KEY_SELECTED=SUPABASE_SECRET_KEY')
  console.log('LEGACY_FALLBACK_USED=false')
  if (process.argv.includes('--preflight-only')) {
    console.log('STAGING_MUTATED=false')
    return
  }

  const generatedWallets = []
  const newFixtures = []
  let backupCreated = false
  let stage = 'generate-wallets'
  try {
    for (const oldFixture of oldFixtures) {
      const privateKey = generatePrivateKey()
      const account = privateKeyToAccount(privateKey)
      if (
        oldFixtures.some(
          (fixture) => fixture.walletAddress === account.address.toLowerCase(),
        )
        || generatedWallets.some(
          (candidate) => candidate.account.address === account.address,
        )
      ) {
        fail('generate-wallets', 'wallet_collision_detected')
      }
      generatedWallets.push({ account, privateKey })
    }
    console.log('NEW_WALLETS_GENERATED=true')

    const rotationTime = new Date().toISOString()
    stage = 'create-new-fixtures'
    for (let index = 0; index < oldFixtures.length; index += 1) {
      const oldFixture = oldFixtures[index]
      newFixtures.push(await createAuthenticatedFixture({
        admin,
        environment,
        fixture: oldFixture,
        account: generatedWallets[index].account,
        rotationTime,
      }))
    }

    stage = 'retire-old-fixtures'
    await retireOldFixtures(admin, oldFixtures, rotationTime)

    stage = 'write-local-environment'
    await mkdir(rotationDirectory, { recursive: true })
    await copyFile(
      environmentPath,
      backupPath,
      fsConstants.COPYFILE_EXCL,
    )
    backupCreated = true
    const assignments = new Map([
      ['COUNTY_HUNTER_TEST_ORG_A', tenantA],
      ['COUNTY_HUNTER_TEST_ORG_B', tenantB],
    ])
    for (const fixture of newFixtures) {
      assignments.set(fixture.specification.variable, fixture.userId)
      assignments.set(
        `${fixture.specification.variable}_ADDRESS`,
        fixture.account.address,
      )
      assignments.set(
        `${fixture.specification.variable}_PRIVATE_KEY`,
        generatedWallets.find(
          (wallet) => wallet.account.address === fixture.account.address,
        ).privateKey,
      )
    }
    if (assignments.size !== 14) {
      fail('write-local-environment', 'assignment_count_invalid')
    }
    const updatedEnvironment = updateEnvironmentAssignments(
      environmentContents,
      assignments,
    )
    const encodedEnvironment = Buffer.from(updatedEnvironment, 'utf8')
    await writeFile(
      temporaryPath,
      hasBom
        ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), encodedEnvironment])
        : encodedEnvironment,
      { mode: 0o600 },
    )
    await rename(temporaryPath, environmentPath)

    stage = 'validate-rotation'
    const savedEnvironment = await readFile(environmentPath, 'utf8')
    await validateRotation({
      admin,
      oldFixtures,
      newFixtures,
      environmentContents: savedEnvironment,
    })
    await rm(backupPath, { force: true })
    backupCreated = false
    await rm(rotationDirectory, { force: true, recursive: true })
    console.log('OLD_FIXTURES_RETIRED=true')
    console.log('NEW_FIXTURES_PROVISIONED=true')
    console.log('ENVIRONMENT_ASSIGNMENTS_UPDATED=14')
    console.log('ROTATION_VALIDATION=PASS')
  } catch (error) {
    const rollbackSucceeded = await rollbackRotation({
      admin,
      oldFixtures,
      generatedAccounts: generatedWallets.map((wallet) => wallet.account),
      backupCreated,
    })
    const failureStage = error instanceof RotationFailure
      ? error.stage
      : stage
    console.error('SANITIZED STAGING FIXTURE ROTATION FAILURE')
    console.error(`stage=${failureStage}`)
    console.error('safe_error=The staging fixture rotation did not complete.')
    console.error(`rollback_executed=${rollbackSucceeded}`)
    console.error('credentials_revealed=false')
    process.exitCode = 1
  }
}

await main().catch((error) => {
  const stage = error instanceof RotationFailure
    ? error.stage
    : 'unexpected-preflight'
  console.error('SANITIZED STAGING FIXTURE ROTATION FAILURE')
  console.error(`stage=${stage}`)
  console.error('safe_error=The staging rotation preflight failed.')
  console.error('rollback_executed=false')
  console.error('credentials_revealed=false')
  process.exitCode = 1
})
