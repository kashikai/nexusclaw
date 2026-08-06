import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import { createSiweMessage } from 'viem/siwe'

vi.mock('server-only', () => ({}))

import {
  COUNTY_HUNTER_RATE_LIMITS,
  createCountyHunterInMemoryRateLimitBackend,
} from '../../features/county-hunter/server/rate-limit'
import {
  enforceCountyHunterSiweChallengeRateLimit,
  enforceCountyHunterSiweVerifyRateLimit,
  readDeclaredCountyHunterWalletForRateLimit,
} from '../../features/county-hunter/server/siwe-rate-limit'
import { countyHunterErrorResponse } from '../../features/county-hunter/server/responses'

const START = 1_000

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

function request() {
  return new Request('https://localhost:3000/api/county-hunter/auth/verify', {
    headers: { 'x-vercel-forwarded-for': '203.0.113.10' },
  })
}

async function captureRateLimitError(run: () => Promise<unknown>) {
  try {
    await run()
  } catch (error) {
    return error as { status?: number; headers?: Record<string, string> }
  }
  throw new Error('Expected rate limiting to reject the request')
}

describe('County Hunter layered SIWE verify rate limits', () => {
  it('allows twelve verifies from four wallets sharing one client address', async () => {
    const backend = createCountyHunterInMemoryRateLimitBackend()
    for (let round = 0; round < 3; round += 1) {
      for (let wallet = 1; wallet <= 4; wallet += 1) {
        await expect(
          enforceCountyHunterSiweVerifyRateLimit(
            request(),
            message(wallet),
            START,
            backend,
          ),
        ).resolves.toBeUndefined()
      }
    }
  })

  it('blocks the eleventh verify from one wallet and returns exact window headers', async () => {
    const backend = createCountyHunterInMemoryRateLimitBackend()
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(request(), message(1), START, backend)
    }

    const error = await captureRateLimitError(() =>
      enforceCountyHunterSiweVerifyRateLimit(request(), message(1), 101_000, backend),
    )
    expect(error.status).toBe(429)
    expect(error.headers).toEqual({
      'Retry-After': '200',
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '301',
    })
  })

  it('keeps wallet buckets separate while every wallet shares the global bucket', async () => {
    const backend = createCountyHunterInMemoryRateLimitBackend()
    for (let wallet = 1; wallet <= 30; wallet += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(request(), message(wallet), START, backend)
    }

    const error = await captureRateLimitError(() =>
      enforceCountyHunterSiweVerifyRateLimit(request(), message(31), START, backend),
    )
    expect(error.status).toBe(429)
    expect(error.headers?.['X-RateLimit-Limit']).toBe('30')
  })

  it('uses one invalid-payload bucket per client address', async () => {
    const backend = createCountyHunterInMemoryRateLimitBackend()
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(request(), 'not-siwe', START, backend)
    }

    const error = await captureRateLimitError(() =>
      enforceCountyHunterSiweVerifyRateLimit(request(), null, START, backend),
    )
    expect(error.status).toBe(429)
    expect(error.headers?.['X-RateLimit-Limit']).toBe('10')
    expect(readDeclaredCountyHunterWalletForRateLimit('not-siwe')).toBeNull()
  })

  it('shares a wallet bucket across valid and invalid proofs declared by that wallet', async () => {
    const backend = createCountyHunterInMemoryRateLimitBackend()
    const valid = message(1)
    const proofVariants = [
      valid,
      valid.replace('Chain ID: 8453', 'Chain ID: 1'),
      valid.replace('localhost:3000', 'attacker.invalid'),
      valid.replace('Nonce: 12345678', 'Nonce: invalid'),
    ]
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(
        request(),
        proofVariants[attempt % proofVariants.length],
        START,
        backend,
      )
    }

    await expect(
      enforceCountyHunterSiweVerifyRateLimit(request(), valid, START, backend),
    ).rejects.toMatchObject({ status: 429 })
  })

  it('keeps challenge and verify scopes separate', async () => {
    const backend = createCountyHunterInMemoryRateLimitBackend()
    for (let attempt = 0; attempt < COUNTY_HUNTER_RATE_LIMITS.siweChallenge.limit; attempt += 1) {
      await enforceCountyHunterSiweChallengeRateLimit(
        request(),
        address(1),
        START,
        backend,
      )
    }
    await expect(
      enforceCountyHunterSiweVerifyRateLimit(request(), message(1), START, backend),
    ).resolves.toBeUndefined()
  })

  it('starts empty when a new in-memory process backend is created', async () => {
    const firstProcess = createCountyHunterInMemoryRateLimitBackend()
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(request(), message(1), START, firstProcess)
    }
    await expect(
      enforceCountyHunterSiweVerifyRateLimit(request(), message(1), START, firstProcess),
    ).rejects.toMatchObject({ status: 429 })

    const restartedProcess = createCountyHunterInMemoryRateLimitBackend()
    await expect(
      enforceCountyHunterSiweVerifyRateLimit(request(), message(1), START, restartedProcess),
    ).resolves.toBeUndefined()
  })

  it('preserves rate-limit metadata on the sanitized HTTP response', async () => {
    const backend = createCountyHunterInMemoryRateLimitBackend()
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await enforceCountyHunterSiweVerifyRateLimit(request(), message(1), START, backend)
    }
    const error = await captureRateLimitError(() =>
      enforceCountyHunterSiweVerifyRateLimit(request(), message(1), 101_000, backend),
    )
    const response = countyHunterErrorResponse(error)
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('200')
    expect(response.headers.get('x-ratelimit-limit')).toBe('10')
    expect(response.headers.get('x-ratelimit-remaining')).toBe('0')
    expect(response.headers.get('x-ratelimit-reset')).toBe('301')
    await expect(response.json()).resolves.toEqual({
      error: 'Too many County Hunter requests. Try again later.',
    })
  })

  it('contains no test-only bypass or caller-controlled bucket key', () => {
    const source = readFileSync(
      join(process.cwd(), 'features', 'county-hunter', 'server', 'siwe-rate-limit.ts'),
      'utf8',
    )
    expect(source).not.toMatch(/test.?mode|bypass|x-rate-limit-key/i)
    expect(source).not.toContain('signature')
    expect(source).toContain('parseSiweMessage')
    expect(source).toContain("configured === 'postgres'")
    expect(source).toContain("environment.NODE_ENV === 'production'")
  })
})
