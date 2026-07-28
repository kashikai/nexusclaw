import 'server-only'

import { createHash } from 'node:crypto'
import { CountyHunterHttpError } from './http-error'

type CountyHunterRateLimitPolicy = {
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

const buckets =
  globalRateLimitState.__countyHunterRateLimits ??
  new Map<string, Bucket>()
globalRateLimitState.__countyHunterRateLimits = buckets

export const COUNTY_HUNTER_RATE_LIMITS = {
  siweChallenge: { limit: 10, windowMs: 5 * 60 * 1000 },
  siweVerify: { limit: 10, windowMs: 5 * 60 * 1000 },
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

export function enforceCountyHunterRateLimit(
  key: string,
  policy: CountyHunterRateLimitPolicy,
  now = Date.now(),
): void {
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + policy.windowMs })
    return
  }
  if (existing.count >= policy.limit) {
    throw new CountyHunterHttpError(
      'Too many County Hunter requests. Try again later.',
      429,
    )
  }
  existing.count += 1

  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey)
    }
  }
}
