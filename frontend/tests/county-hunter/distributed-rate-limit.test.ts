import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import { createSiweMessage } from 'viem/siwe'

vi.mock('server-only', () => ({}))

import {
  createCountyHunterPostgresRateLimitBackend,
  readCountyHunterRateLimitSecret,
  type CountyHunterRateLimitRpcClient,
} from '../../features/county-hunter/server/postgres-rate-limit'
import {
  readCountyHunterTrustedClientIp,
} from '../../features/county-hunter/server/rate-limit'
import {
  enforceCountyHunterSiweChallengeRateLimit,
  enforceCountyHunterSiweVerifyRateLimit,
} from '../../features/county-hunter/server/siwe-rate-limit'

const RATE_LIMIT_ENVIRONMENT: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  COUNTY_HUNTER_RATE_LIMIT_SECRET:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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
    issuedAt: new Date('2026-08-05T00:00:00.000Z'),
  })
}

function request(ip = '203.0.113.10') {
  return new Request('https://localhost:3000/api/county-hunter/auth/verify', {
    headers: { 'x-vercel-forwarded-for': ip },
  })
}

class AtomicRateLimitRpcClient implements CountyHunterRateLimitRpcClient {
  readonly calls: Array<Record<string, unknown>> = []
  now = 1_000
  fail = false
  private readonly buckets = new Map<string, number>()
  private queue = Promise.resolve()

  rpc(name: string, arguments_: Record<string, unknown>) {
    const run = this.queue.then(() => {
      if (this.fail) return { data: null, error: { code: 'UNAVAILABLE' } }
      if (name !== 'county_hunter_consume_rate_limit_buckets') {
        return { data: null, error: { code: 'UNEXPECTED_RPC' } }
      }
      this.calls.push(structuredClone(arguments_))
      const scopes = arguments_.p_scopes as string[]
      const hashes = arguments_.p_bucket_hashes as string[]
      const limits = arguments_.p_limits as number[]
      const windows = arguments_.p_window_seconds as number[]
      const rows = scopes.map((scope, index) => {
        const windowMs = windows[index] * 1_000
        const windowStart = Math.floor(this.now / windowMs) * windowMs
        const key = `${scope}:${hashes[index]}:${windowStart}`
        const count = Math.min(
          (this.buckets.get(key) ?? 0) + 1,
          limits[index] + 1,
        )
        this.buckets.set(key, count)
        return {
          bucket_index: index + 1,
          allowed: count <= limits[index],
          limit: limits[index],
          remaining: Math.max(0, limits[index] - count),
          reset_at: new Date(windowStart + windowMs).toISOString(),
        }
      })
      return { data: rows, error: null }
    })
    this.queue = run.then(() => undefined, () => undefined)
    return run
  }
}

function backend(client: AtomicRateLimitRpcClient) {
  return createCountyHunterPostgresRateLimitBackend({
    client,
    environment: RATE_LIMIT_ENVIRONMENT,
  })
}

describe('County Hunter distributed SIWE rate limiting', () => {
  it('accepts a padded standard-base64 secret representing at least 32 bytes', () => {
    const secret = Buffer.from(
      Array.from({ length: 32 }, (_, index) => index),
    ).toString('base64')
    expect(readCountyHunterRateLimitSecret({
      NODE_ENV: 'test',
      COUNTY_HUNTER_RATE_LIMIT_SECRET: secret,
    })).toHaveLength(32)
  })

  it('shares one wallet budget across two simulated serverless instances', async () => {
    const database = new AtomicRateLimitRpcClient()
    const instanceA = backend(database)
    const instanceB = backend(database)
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(
        request(),
        message(1),
        database.now,
        attempt % 2 === 0 ? instanceA : instanceB,
        RATE_LIMIT_ENVIRONMENT,
      )
    }
    await expect(enforceCountyHunterSiweVerifyRateLimit(
      request(),
      message(1),
      database.now,
      instanceB,
      RATE_LIMIT_ENVIRONMENT,
    )).rejects.toMatchObject({ status: 429 })
  })

  it('allows twelve verifies from four wallets on one IP', async () => {
    const database = new AtomicRateLimitRpcClient()
    const instances = [backend(database), backend(database)]
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await expect(enforceCountyHunterSiweVerifyRateLimit(
        request(),
        message((attempt % 4) + 1),
        database.now,
        instances[attempt % 2],
        RATE_LIMIT_ENVIRONMENT,
      )).resolves.toBeUndefined()
    }
  })

  it('blocks above thirty verifies from one IP across distinct wallets', async () => {
    const database = new AtomicRateLimitRpcClient()
    const distributedBackend = backend(database)
    for (let wallet = 1; wallet <= 30; wallet += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(
        request(),
        message(wallet),
        database.now,
        distributedBackend,
        RATE_LIMIT_ENVIRONMENT,
      )
    }
    await expect(enforceCountyHunterSiweVerifyRateLimit(
      request(),
      message(31),
      database.now,
      distributedBackend,
      RATE_LIMIT_ENVIRONMENT,
    )).rejects.toMatchObject({ status: 429 })
  })

  it('limits invalid payloads without sharing the challenge and verify buckets', async () => {
    const database = new AtomicRateLimitRpcClient()
    const distributedBackend = backend(database)
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweChallengeRateLimit(
        request(), address(1), database.now, distributedBackend,
        RATE_LIMIT_ENVIRONMENT,
      )
    }
    await expect(enforceCountyHunterSiweVerifyRateLimit(
      request(), message(1), database.now, distributedBackend,
      RATE_LIMIT_ENVIRONMENT,
    )).resolves.toBeUndefined()
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(
        request(), null, database.now, distributedBackend,
        RATE_LIMIT_ENVIRONMENT,
      )
    }
    await expect(enforceCountyHunterSiweVerifyRateLimit(
      request(), null, database.now, distributedBackend,
      RATE_LIMIT_ENVIRONMENT,
    )).rejects.toMatchObject({ status: 429 })
    await expect(enforceCountyHunterSiweChallengeRateLimit(
      request(), address(1), database.now, distributedBackend,
      RATE_LIMIT_ENVIRONMENT,
    )).rejects.toMatchObject({ status: 429 })
  })

  it('serializes concurrent requests without allowing more than ten', async () => {
    const database = new AtomicRateLimitRpcClient()
    const instances = [backend(database), backend(database)]
    const outcomes = await Promise.allSettled(
      Array.from({ length: 20 }, (_, index) =>
        enforceCountyHunterSiweVerifyRateLimit(
          request(),
          message(1),
          database.now,
          instances[index % 2],
          RATE_LIMIT_ENVIRONMENT,
        ),
      ),
    )
    expect(outcomes.filter(({ status }) => status === 'fulfilled')).toHaveLength(10)
    expect(outcomes.filter(({ status }) => status === 'rejected')).toHaveLength(10)
  })

  it('starts a new budget after the fixed window expires', async () => {
    const database = new AtomicRateLimitRpcClient()
    const distributedBackend = backend(database)
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(
        request(), message(1), database.now, distributedBackend,
        RATE_LIMIT_ENVIRONMENT,
      )
    }
    database.now = 300_001
    await expect(enforceCountyHunterSiweVerifyRateLimit(
      request(), message(1), database.now, distributedBackend,
      RATE_LIMIT_ENVIRONMENT,
    )).resolves.toBeUndefined()
  })

  it('stores only distinct HMACs, never raw IPs or wallets', async () => {
    const database = new AtomicRateLimitRpcClient()
    const distributedBackend = backend(database)
    await enforceCountyHunterSiweVerifyRateLimit(
      request(), message(1), database.now, distributedBackend,
      RATE_LIMIT_ENVIRONMENT,
    )
    await enforceCountyHunterSiweVerifyRateLimit(
      request(), message(2), database.now, distributedBackend,
      RATE_LIMIT_ENVIRONMENT,
    )

    const firstHashes = database.calls[0].p_bucket_hashes as string[]
    const secondHashes = database.calls[1].p_bucket_hashes as string[]
    expect(firstHashes[0]).toBe(secondHashes[0])
    expect(firstHashes[1]).not.toBe(secondHashes[1])
    expect([...firstHashes, ...secondHashes]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^[a-f0-9]{64}$/),
      ]),
    )
    const serialized = JSON.stringify(database.calls)
    expect(serialized).not.toContain('203.0.113.10')
    expect(serialized).not.toContain(address(1))
    expect(serialized).not.toContain(address(2))
  })

  it('fails closed with a sanitized 503 when Postgres is unavailable', async () => {
    const database = new AtomicRateLimitRpcClient()
    database.fail = true
    await expect(enforceCountyHunterSiweVerifyRateLimit(
      request(), message(1), database.now, backend(database),
      RATE_LIMIT_ENVIRONMENT,
    )).rejects.toMatchObject({
      status: 503,
      message: 'County Hunter authentication is temporarily unavailable.',
    })
  })

  it('trusts only a valid Vercel-forwarded IP in production', () => {
    expect(readCountyHunterTrustedClientIp(
      request('2001:db8:0:0:0:0:0:1'),
      RATE_LIMIT_ENVIRONMENT,
    )).toBe('2001:db8::1')
    expect(() => readCountyHunterTrustedClientIp(
      new Request('https://localhost:3000', {
        headers: { 'x-real-ip': '203.0.113.10' },
      }),
      RATE_LIMIT_ENVIRONMENT,
    )).toThrowError(expect.objectContaining({ status: 503 }))
  })

  it('keeps the table private and grants the atomic RPC only to service_role', () => {
    const sql = readFileSync(resolve(
      process.cwd(),
      '..',
      'supabase',
      'migrations',
      '20260806081241_county_hunter_distributed_rate_limit.sql',
    ), 'utf8')
    expect(sql).toContain('private.county_hunter_rate_limit_buckets')
    expect(sql).not.toMatch(/\b(?:ip|wallet)_address\b/)
    expect(sql).toContain('security definer')
    expect(sql).toContain("set search_path = ''")
    expect(sql).toContain('on conflict on constraint county_hunter_rate_limit_buckets_pkey')
    expect(sql).toMatch(/county_hunter_consume_rate_limit_buckets[\s\S]+from public, anon, authenticated, service_role/)
    expect(sql).toMatch(/county_hunter_consume_rate_limit_buckets[\s\S]+to service_role/)
    expect(sql).not.toMatch(/county_hunter_consume_rate_limit_buckets[\s\S]+to (?:anon|authenticated)/)
    expect(sql).toContain('limit 64')
    expect(sql).toContain('for update skip locked')
  })
})
