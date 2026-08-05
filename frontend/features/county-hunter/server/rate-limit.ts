import 'server-only'

import { createHash } from 'node:crypto'
import { CountyHunterHttpError } from './http-error'

export type CountyHunterRateLimitPolicy = {
  limit: number
  windowMs: number
}

type Bucket = {
  count: number
  resetAt: number
}

const globalRateLimitState = globalThis as typeof globalThis & {
  __countyHunterRateLimits?: Map<string, Bucket>
}

export type CountyHunterRateLimitRequest = {
  key: string
  policy: CountyHunterRateLimitPolicy
}

export type CountyHunterRateLimitDecision = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

export interface CountyHunterRateLimitBackend {
  consume(
    requests: readonly CountyHunterRateLimitRequest[],
    now: number,
  ): Promise<readonly CountyHunterRateLimitDecision[]>
}

class CountyHunterInMemoryRateLimitBackend implements CountyHunterRateLimitBackend {
  constructor(private readonly buckets: Map<string, Bucket>) {}

  async consume(
    requests: readonly CountyHunterRateLimitRequest[],
    now: number,
  ): Promise<readonly CountyHunterRateLimitDecision[]> {
    const decisions = requests.map(({ key, policy }) => {
      const previous = this.buckets.get(key)
      const bucket = !previous || previous.resetAt <= now
        ? { count: 0, resetAt: now + policy.windowMs }
        : previous
      const allowed = bucket.count < policy.limit
      if (allowed) bucket.count += 1
      this.buckets.set(key, bucket)
      return {
        allowed,
        limit: policy.limit,
        remaining: Math.max(0, policy.limit - bucket.count),
        resetAt: bucket.resetAt,
      }
    })

    if (this.buckets.size > 10_000) {
      for (const [bucketKey, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(bucketKey)
      }
    }

    return decisions
  }
}

export function createCountyHunterInMemoryRateLimitBackend(): CountyHunterRateLimitBackend {
  return new CountyHunterInMemoryRateLimitBackend(new Map())
}

const sharedBuckets =
  globalRateLimitState.__countyHunterRateLimits ??
  new Map<string, Bucket>()
globalRateLimitState.__countyHunterRateLimits = sharedBuckets
const defaultBackend = new CountyHunterInMemoryRateLimitBackend(sharedBuckets)

export const COUNTY_HUNTER_RATE_LIMITS = {
  siweChallenge: { limit: 10, windowMs: 5 * 60 * 1000 },
  siweVerifyGlobal: { limit: 30, windowMs: 5 * 60 * 1000 },
  siweVerifyWallet: { limit: 10, windowMs: 5 * 60 * 1000 },
  siweVerifyInvalidPayload: { limit: 10, windowMs: 5 * 60 * 1000 },
  discoveryRead: { limit: 120, windowMs: 60 * 1000 },
  discoveryRun: { limit: 1, windowMs: 5 * 60 * 1000 },
  replayRun: { limit: 3, windowMs: 15 * 60 * 1000 },
  bootstrap: { limit: 3, windowMs: 15 * 60 * 1000 },
} as const satisfies Record<string, CountyHunterRateLimitPolicy>

export function countyHunterRequestRateLimitKey(
  request: Request,
  scope: string,
  discriminator = '',
): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientAddress =
    request.headers.get('x-real-ip')?.trim() || forwarded || 'unavailable'
  return createHash('sha256')
    .update(`${scope}:${clientAddress}:${discriminator}`)
    .digest('hex')
}

export function countyHunterIdentityRateLimitKey(
  scope: string,
  userId: string,
  organizationId: string,
): string {
  return createHash('sha256')
    .update(`${scope}:${userId}:${organizationId}`)
    .digest('hex')
}

function rateLimitHeaders(
  decision: CountyHunterRateLimitDecision,
  now: number,
): Readonly<Record<string, string>> {
  return {
    'Retry-After': String(Math.max(1, Math.ceil((decision.resetAt - now) / 1_000))),
    'X-RateLimit-Limit': String(decision.limit),
    'X-RateLimit-Remaining': String(decision.remaining),
    'X-RateLimit-Reset': String(Math.ceil(decision.resetAt / 1_000)),
  }
}

export async function enforceCountyHunterRateLimits(
  requests: readonly CountyHunterRateLimitRequest[],
  now = Date.now(),
  backend: CountyHunterRateLimitBackend = defaultBackend,
): Promise<readonly CountyHunterRateLimitDecision[]> {
  const decisions = await backend.consume(requests, now)
  if (decisions.length !== requests.length) {
    throw new CountyHunterHttpError('County Hunter rate limiting is unavailable.', 503)
  }

  const denied = decisions
    .filter((decision) => !decision.allowed)
    .sort((left, right) =>
      right.resetAt - left.resetAt || left.limit - right.limit,
    )[0]
  if (denied) {
    throw new CountyHunterHttpError(
      'Too many County Hunter requests. Try again later.',
      429,
      rateLimitHeaders(denied, now),
    )
  }
  return decisions
}

export async function enforceCountyHunterRateLimit(
  key: string,
  policy: CountyHunterRateLimitPolicy,
  now = Date.now(),
  backend: CountyHunterRateLimitBackend = defaultBackend,
): Promise<void> {
  await enforceCountyHunterRateLimits([{ key, policy }], now, backend)
}
