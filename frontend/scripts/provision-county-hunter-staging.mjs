import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createSiweMessage, generateSiweNonce } from 'viem/siwe'

const environmentPath = fileURLToPath(new URL('../../.env.staging.local', import.meta.url))

async function loadLocalEnvironment() {
  let contents
  try { contents = await readFile(environmentPath, 'utf8') } catch { return }
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
  if (!process.env[name]) throw new Error(`Missing required staging variable: ${name}`)
}
if (process.env.COUNTY_HUNTER_STAGING_CONFIRM !== 'STAGING_ONLY') {
  throw new Error('COUNTY_HUNTER_STAGING_CONFIRM must be STAGING_ONLY.')
}

const projectRef = process.env.COUNTY_HUNTER_STAGING_PROJECT_REF
if (!/^[a-z0-9]{20}$/.test(projectRef)) {
  throw new Error('COUNTY_HUNTER_STAGING_PROJECT_REF must be the exact 20-character staging project ref.')
}
const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
if (supabaseUrl.hostname !== `${projectRef}.supabase.co`) {
  throw new Error('Supabase URL and the confirmed staging project ref do not match.')
}
const authOrigin = new URL(process.env.COUNTY_HUNTER_AUTH_ORIGIN)
if (authOrigin.protocol !== 'https:' || authOrigin.origin !== process.env.COUNTY_HUNTER_AUTH_ORIGIN) {
  throw new Error('COUNTY_HUNTER_AUTH_ORIGIN must be an exact HTTPS origin without a path.')
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

function setEnvironmentAssignment(contents, name, value) {
  const assignment = `${name}=${value}`
  const expression = new RegExp(`^${name}=.*$`, 'm')
  return expression.test(contents)
    ? contents.replace(expression, assignment)
    : `${contents.trimEnd()}\n${assignment}\n`
}

let environmentContents = await readFile(environmentPath, 'utf8')
const preparedFixtures = fixtures.map((fixture) => {
  const privateKeyVariable = `${fixture.variable}_PRIVATE_KEY`
  const addressVariable = `${fixture.variable}_ADDRESS`
  let privateKey = process.env[privateKeyVariable]
  if (privateKey && !/^0x[0-9a-f]{64}$/i.test(privateKey)) {
    throw new Error(`${privateKeyVariable} is not a valid disposable private key.`)
  }
  if (!privateKey) privateKey = generatePrivateKey()

  const account = privateKeyToAccount(privateKey)
  process.env[privateKeyVariable] = privateKey
  process.env[addressVariable] = account.address
  environmentContents = setEnvironmentAssignment(environmentContents, privateKeyVariable, privateKey)
  environmentContents = setEnvironmentAssignment(environmentContents, addressVariable, account.address)
  return { ...fixture, privateKeyVariable, addressVariable, account }
})

// Persist disposable keys only in the ignored staging environment. They are never
// printed, passed to the admin client, or committed.
await writeFile(environmentPath, environmentContents, { encoding: 'utf8', mode: 0o600 })

async function ensureWalletUser(fixture) {
  const issuedAt = new Date()
  const expirationTime = new Date(issuedAt.getTime() + 5 * 60 * 1000)
  const message = createSiweMessage({
    address: fixture.account.address,
    chainId: 8453,
    domain: authOrigin.host,
    uri: authOrigin.origin,
    version: '1',
    nonce: generateSiweNonce(),
    issuedAt,
    expirationTime,
    statement: 'Sign in to NexusClaw County Hunter.',
  })
  const signature = await fixture.account.signMessage({ message })
  const walletClient = createClient(
    supabaseUrl.origin,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
  )
  const { data, error } = await walletClient.auth.signInWithWeb3({
    chain: 'ethereum',
    message,
    signature,
  })
  if (error || !data.user) {
    throw new Error(`Unable to authenticate disposable staging wallet ${fixture.role}.`)
  }

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: {
      ...data.user.app_metadata,
      organization_id: fixture.organizationId,
      county_hunter_fixture: true,
      county_hunter_fixture_role: fixture.role,
    },
  })
  await walletClient.auth.signOut({ scope: 'local' })
  if (updateError || !updated.user) {
    throw new Error(`Unable to assign trusted metadata to staging wallet ${fixture.role}.`)
  }

  return { ...fixture, userId: updated.user.id }
}

const results = []
for (const fixture of preparedFixtures) results.push(await ensureWalletUser(fixture))

for (const result of results) {
  process.env[result.variable] = result.userId
  environmentContents = setEnvironmentAssignment(environmentContents, result.variable, result.userId)
}
await writeFile(environmentPath, environmentContents, { encoding: 'utf8', mode: 0o600 })

const membershipErrors = []
for (const result of results) {
  const { error } = await admin.from('county_hunter_memberships').upsert({
    user_id: result.userId,
    organization_id: result.organizationId,
    permissions: result.permissions,
    active: true,
  }, { onConflict: 'user_id,organization_id' })
  if (error) membershipErrors.push(error.code || 'unknown')
}

console.log('Disposable County Hunter staging wallets are ready. Private keys remain only in .env.staging.local.')
console.log(`COUNTY_HUNTER_TEST_ORG_A=${process.env.COUNTY_HUNTER_TEST_ORG_A}`)
console.log(`COUNTY_HUNTER_TEST_ORG_B=${process.env.COUNTY_HUNTER_TEST_ORG_B}`)
for (const result of results) {
  console.log(`${result.variable}=${result.userId}`)
  console.log(`${result.addressVariable}=${result.account.address}`)
}
if (membershipErrors.length > 0) {
  console.log('Users were created and UUIDs were saved locally. Apply migrations, then rerun this script to persist memberships.')
  const expectedMissingTable = membershipErrors.every((code) => ['42P01', 'PGRST204', 'PGRST205'].includes(code))
  if (!expectedMissingTable) process.exitCode = 2
}
