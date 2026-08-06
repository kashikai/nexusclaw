import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import { createSiweMessage } from 'viem/siwe'

vi.mock('server-only', () => ({}))

import {
  createCountyHunterPostgresRateLimitBackend,
  hashCountyHunterRateLimitBucket,
  type CountyHunterRateLimitRpcClient,
} from '../../features/county-hunter/server/postgres-rate-limit'
import {
  countyHunterSiweRateLimitBucketMaterial,
} from '../../features/county-hunter/server/rate-limit'
import {
  enforceCountyHunterSiweChallengeRateLimit,
  enforceCountyHunterSiweVerifyRateLimit,
  normalizeCountyHunterWalletForRateLimit,
} from '../../features/county-hunter/server/siwe-rate-limit'

const LIVE = process.env.COUNTY_HUNTER_RATE_LIMIT_STAGING_LIVE === 'true'
const describeLive = LIVE ? describe : describe.skip
const bucketHashes = new Set<string>()

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`STAGING_CONFIGURATION_MISSING_${name}`)
  return value
}

function address(index: number): Address {
  return `0x${index.toString(16).padStart(40, '0')}` as Address
}

function message(index: number) {
  return createSiweMessage({
    address: address(index),
    chainId: 8453,
    domain: 'localhost:3000',
    uri: 'https://localhost:3000/',
    version: '1',
    nonce: '12345678',
    issuedAt: new Date(),
  })
}

function documentationIp(): string {
  const groups = randomBytes(12).toString('hex').match(/.{1,4}/g)
  if (!groups || groups.length !== 6) throw new Error('IP_GENERATION_FAILED')
  return `2001:db8:${groups.join(':')}`
}

function request(ip: string) {
  return new Request('https://localhost:3000/api/county-hunter/auth/verify', {
    headers: { 'x-vercel-forwarded-for': ip },
  })
}

function trackBucket(
  request_: Request,
  scope: string,
  discriminator: string,
): string {
  const material = countyHunterSiweRateLimitBucketMaterial(
    request_,
    scope,
    discriminator,
    process.env,
  )
  const hash = hashCountyHunterRateLimitBucket(material, process.env)
  bucketHashes.add(hash)
  return hash
}

function trackVerify(request_: Request, wallet: string | null): void {
  trackBucket(request_, 'siwe-verify-global', '')
  trackBucket(
    request_,
    wallet ? 'siwe-verify-wallet' : 'siwe-verify-invalid-payload',
    wallet ?? 'invalid-payload',
  )
}

function trackChallenge(request_: Request, wallet: string): void {
  trackBucket(request_, 'siwe-challenge', wallet)
}

function psqlCommand(): string {
  const command = process.platform === 'win32' ? 'psql.exe' : 'psql'
  const local = process.platform === 'win32' && process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'PostgreSQL', '17-client', 'bin', command)
    : null
  return local && existsSync(local) ? local : command
}

function postgresEnvironment(): NodeJS.ProcessEnv {
  const databaseUrl = new URL(required('COUNTY_HUNTER_STAGING_DB_URL'))
  return {
    ...process.env,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    PGHOST: databaseUrl.hostname,
    PGPORT: databaseUrl.port || '5432',
    PGUSER: decodeURIComponent(databaseUrl.username),
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
    PGDATABASE: decodeURIComponent(databaseUrl.pathname.slice(1)),
    PGSSLMODE: 'require',
    PGGSSENCMODE: 'disable',
  }
}

function runPrivateSql(sql: string): void {
  const result = spawnSync(
    psqlCommand(),
    ['-X', '-q', '-v', 'ON_ERROR_STOP=1'],
    {
      input: sql,
      env: postgresEnvironment(),
      encoding: 'utf8',
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 64 * 1024,
    },
  )
  if (result.status !== 0) {
    throw new Error('STAGING_PRIVATE_BUCKET_OPERATION_FAILED')
  }
}

async function expectRateLimited(run: Promise<unknown>, limit: number) {
  try {
    await run
  } catch (error) {
    expect(error).toMatchObject({
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
      },
    })
    const headers = (error as { headers?: Record<string, string> }).headers
    expect(headers).toEqual(expect.objectContaining({
      'Retry-After': expect.stringMatching(/^\d+$/),
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': expect.stringMatching(/^\d+$/),
    }))
    return
  }
  throw new Error('EXPECTED_STAGING_RATE_LIMIT_DENIAL')
}

describeLive('County Hunter distributed rate limit staging integration', () => {
  beforeAll(() => {
    expect(required('COUNTY_HUNTER_STAGING_CONFIRM')).toBe('STAGING_ONLY')
    expect(required('COUNTY_HUNTER_RATE_LIMIT_BACKEND')).toBe('postgres')
    expect(required('COUNTY_HUNTER_SUPABASE_SECRET_KEY')).toMatch(/^sb_secret_/)
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined()
    expect(process.env.COUNTY_HUNTER_PRODUCTION_CONFIRM).toBeUndefined()
  })

  afterAll(() => {
    if (bucketHashes.size < 1) return
    const hashes = [...bucketHashes]
    if (hashes.some((hash) => !/^[a-f0-9]{64}$/.test(hash))) {
      throw new Error('INVALID_TEST_BUCKET_HASH')
    }
    runPrivateSql(
      `delete from private.county_hunter_rate_limit_buckets ` +
      `where bucket_hash = any(array[${hashes.map((hash) => `'${hash}'`).join(',')}]);`,
    )
  })

  it('allows 12 valid-form verifies from four wallets on one IP', async () => {
    const ip = documentationIp()
    const backend = createCountyHunterPostgresRateLimitBackend()
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const walletIndex = (attempt % 4) + 1
      const request_ = request(ip)
      const wallet = normalizeCountyHunterWalletForRateLimit(address(walletIndex))
      trackVerify(request_, wallet)
      await enforceCountyHunterSiweVerifyRateLimit(
        request_, message(walletIndex), Date.now(), backend,
      )
    }
  })

  it('blocks the eleventh verify for one wallet with all four HTTP headers', async () => {
    const ip = documentationIp()
    const backend = createCountyHunterPostgresRateLimitBackend()
    const wallet = normalizeCountyHunterWalletForRateLimit(address(1))
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const request_ = request(ip)
      trackVerify(request_, wallet)
      await enforceCountyHunterSiweVerifyRateLimit(
        request_, message(1), Date.now(), backend,
      )
    }
    await expectRateLimited(
      enforceCountyHunterSiweVerifyRateLimit(
        request(ip), message(1), Date.now(), backend,
      ),
      10,
    )
  })

  it('blocks above 30 verifies on one IP', async () => {
    const ip = documentationIp()
    const backend = createCountyHunterPostgresRateLimitBackend()
    for (let index = 1; index <= 30; index += 1) {
      const request_ = request(ip)
      const wallet = normalizeCountyHunterWalletForRateLimit(address(index))
      trackVerify(request_, wallet)
      await enforceCountyHunterSiweVerifyRateLimit(
        request_, message(index), Date.now(), backend,
      )
    }
    await expectRateLimited(
      enforceCountyHunterSiweVerifyRateLimit(
        request(ip), message(31), Date.now(), backend,
      ),
      30,
    )
  })

  it('keeps challenge, verify and invalid-payload buckets separate', async () => {
    const ip = documentationIp()
    const backend = createCountyHunterPostgresRateLimitBackend()
    const wallet = normalizeCountyHunterWalletForRateLimit(address(1))
    if (!wallet) throw new Error('TEST_WALLET_INVALID')
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const request_ = request(ip)
      trackChallenge(request_, wallet)
      await enforceCountyHunterSiweChallengeRateLimit(
        request_, wallet, Date.now(), backend,
      )
    }
    const validVerifyRequest = request(ip)
    trackVerify(validVerifyRequest, wallet)
    await enforceCountyHunterSiweVerifyRateLimit(
      validVerifyRequest, message(1), Date.now(), backend,
    )
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const invalidRequest = request(ip)
      trackVerify(invalidRequest, null)
      await enforceCountyHunterSiweVerifyRateLimit(
        invalidRequest, null, Date.now(), backend,
      )
    }
    await expectRateLimited(
      enforceCountyHunterSiweVerifyRateLimit(
        request(ip), null, Date.now(), backend,
      ),
      10,
    )
  })

  it('shares buckets across two backends and enforces atomic concurrency', async () => {
    const sharedIp = documentationIp()
    const first = createCountyHunterPostgresRateLimitBackend()
    const second = createCountyHunterPostgresRateLimitBackend()
    const wallet = normalizeCountyHunterWalletForRateLimit(address(1))
    const trackedRequest = request(sharedIp)
    trackVerify(trackedRequest, wallet)
    const outcomes = await Promise.allSettled(
      Array.from({ length: 20 }, (_, index) =>
        enforceCountyHunterSiweVerifyRateLimit(
          request(sharedIp),
          message(1),
          Date.now(),
          index % 2 === 0 ? first : second,
        ),
      ),
    )
    expect(outcomes.filter(({ status }) => status === 'fulfilled')).toHaveLength(10)
    expect(outcomes.filter(({ status }) => status === 'rejected')).toHaveLength(10)
  })

  it('starts a new budget when the stored window is expired', async () => {
    const ip = documentationIp()
    const backend = createCountyHunterPostgresRateLimitBackend()
    const wallet = normalizeCountyHunterWalletForRateLimit(address(1))
    if (!wallet) throw new Error('TEST_WALLET_INVALID')
    const request_ = request(ip)
    const hash = trackBucket(request_, 'siwe-verify-wallet', wallet)
    trackBucket(request_, 'siwe-verify-global', '')
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(
        request(ip), message(1), Date.now(), backend,
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 1_100))
    runPrivateSql(
      `do $test$ begin ` +
      `update private.county_hunter_rate_limit_buckets ` +
      `set expires_at = clock_timestamp() - interval '100 milliseconds' ` +
      `where scope = 'siwe-verify-wallet' and bucket_hash = '${hash}'; ` +
      `if not found then raise exception 'test bucket missing'; end if; ` +
      `end $test$;`,
    )
    await expect(enforceCountyHunterSiweVerifyRateLimit(
      request(ip), message(1), Date.now(), backend,
    )).resolves.toBeUndefined()
  })

  it('stores only HMAC-shaped bucket identifiers', () => {
    runPrivateSql(
      `do $test$ begin ` +
      `if exists (` +
      `select 1 from private.county_hunter_rate_limit_buckets ` +
      `where bucket_hash !~ '^[a-f0-9]{64}$'` +
      `) then raise exception 'invalid bucket storage'; end if; ` +
      `end $test$;`,
    )
  })

  it('fails closed with 503 when the backend cannot decide', async () => {
    const unavailableClient: CountyHunterRateLimitRpcClient = {
      rpc: async () => ({ data: null, error: { code: 'UNAVAILABLE' } }),
    }
    const backend = createCountyHunterPostgresRateLimitBackend({
      client: unavailableClient,
    })
    await expect(enforceCountyHunterSiweVerifyRateLimit(
      request(documentationIp()), message(1), Date.now(), backend,
    )).rejects.toMatchObject({
      status: 503,
      message: 'County Hunter authentication is temporarily unavailable.',
    })
  })
})
