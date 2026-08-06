import 'server-only'

import { createHmac } from 'node:crypto'
import { createCountyHunterServerAdminClient } from './admin-supabase'
import { CountyHunterHttpError } from './http-error'
import type {
  CountyHunterRateLimitBackend,
  CountyHunterRateLimitDecision,
  CountyHunterRateLimitRequest,
} from './rate-limit'

const RATE_LIMIT_SECRET_HEX = /^[A-Fa-f0-9]{64,}$/
const RATE_LIMIT_SECRET_BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/
const PLACEHOLDER_SECRET =
  /(?:replace|placeholder|change[-_ ]?me|example|synthetic|testing|^test$)/i

type RateLimitRpcRow = {
  bucket_index?: unknown
  allowed?: unknown
  limit?: unknown
  remaining?: unknown
  reset_at?: unknown
}

export type CountyHunterRateLimitRpcClient = {
  rpc(
    name: string,
    arguments_: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: unknown }>
}

function configurationError(): CountyHunterHttpError {
  return new CountyHunterHttpError(
    'County Hunter authentication is temporarily unavailable.',
    503,
  )
}

function decodeRateLimitSecret(value: string): Buffer | null {
  if (
    PLACEHOLDER_SECRET.test(value) ||
    /^(.)\1+$/.test(value) ||
    value.startsWith('sb_secret_') ||
    value.startsWith('sb_publishable_') ||
    value.startsWith('0x')
  ) {
    return null
  }
  if (RATE_LIMIT_SECRET_HEX.test(value) && value.length % 2 === 0) {
    return Buffer.from(value, 'hex')
  }
  if (RATE_LIMIT_SECRET_BASE64.test(value)) {
    const unpadded = value.replace(/=+$/, '')
    if (unpadded.length % 4 === 1) return null
    const normalized = unpadded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(unpadded.length / 4) * 4, '=')
    return Buffer.from(normalized, 'base64')
  }
  return null
}

export function readCountyHunterRateLimitSecret(
  environment: NodeJS.ProcessEnv = process.env,
): Buffer {
  const value = environment.COUNTY_HUNTER_RATE_LIMIT_SECRET?.trim()
  const decoded = value ? decodeRateLimitSecret(value) : null
  const forbiddenValues = [
    environment.COUNTY_HUNTER_SUPABASE_SECRET_KEY,
    environment.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    environment.POSTGRES_PASSWORD,
    ...Object.entries(environment)
      .filter(([name]) =>
        /^COUNTY_HUNTER_TEST_.+_PRIVATE_KEY$/.test(name),
      )
      .map(([, candidate]) => candidate),
  ]
  if (
    !value ||
    !decoded ||
    decoded.byteLength < 32 ||
    forbiddenValues.some((candidate) => candidate?.trim() === value)
  ) {
    throw configurationError()
  }
  return decoded
}

export function hashCountyHunterRateLimitBucket(
  material: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return createHmac('sha256', readCountyHunterRateLimitSecret(environment))
    .update(material)
    .digest('hex')
}

function parseDecision(row: RateLimitRpcRow): {
  index: number
  decision: CountyHunterRateLimitDecision
} | null {
  const index = row.bucket_index
  const limit = row.limit
  const remaining = row.remaining
  const resetAt = typeof row.reset_at === 'string'
    ? Date.parse(row.reset_at)
    : Number.NaN
  if (
    typeof index !== 'number' ||
    !Number.isSafeInteger(index) ||
    typeof row.allowed !== 'boolean' ||
    typeof limit !== 'number' ||
    !Number.isSafeInteger(limit) ||
    typeof remaining !== 'number' ||
    !Number.isSafeInteger(remaining) ||
    !Number.isFinite(resetAt)
  ) {
    return null
  }
  return {
    index,
    decision: {
      allowed: row.allowed,
      limit,
      remaining,
      resetAt,
    },
  }
}

class CountyHunterPostgresRateLimitBackend
implements CountyHunterRateLimitBackend {
  constructor(
    private readonly client: CountyHunterRateLimitRpcClient,
    private readonly environment: NodeJS.ProcessEnv,
  ) {}

  async consume(
    requests: readonly CountyHunterRateLimitRequest[],
    _now: number,
  ): Promise<readonly CountyHunterRateLimitDecision[]> {
    if (
      requests.length < 1 ||
      requests.length > 2 ||
      requests.some(({ scope, policy }) =>
        !scope ||
        policy.windowMs % 1_000 !== 0 ||
        !Number.isSafeInteger(policy.limit),
      )
    ) {
      throw configurationError()
    }

    const bucketHashes = requests.map(({ key }) =>
      hashCountyHunterRateLimitBucket(key, this.environment),
    )
    let result: { data: unknown; error: unknown }
    try {
      result = await this.client.rpc(
        'county_hunter_consume_rate_limit_buckets',
        {
          p_scopes: requests.map(({ scope }) => scope),
          p_bucket_hashes: bucketHashes,
          p_limits: requests.map(({ policy }) => policy.limit),
          p_window_seconds: requests.map(({ policy }) =>
            policy.windowMs / 1_000,
          ),
        },
      )
    } catch {
      throw configurationError()
    }

    if (result.error || !Array.isArray(result.data)) {
      throw configurationError()
    }
    const decisions: Array<CountyHunterRateLimitDecision | undefined> =
      new Array(requests.length)
    for (const candidate of result.data as RateLimitRpcRow[]) {
      const parsed = parseDecision(candidate)
      if (
        !parsed ||
        parsed.index < 1 ||
        parsed.index > requests.length ||
        decisions[parsed.index - 1]
      ) {
        throw configurationError()
      }
      decisions[parsed.index - 1] = parsed.decision
    }
    if (decisions.some((decision) => !decision)) {
      throw configurationError()
    }
    return decisions as CountyHunterRateLimitDecision[]
  }
}

export function createCountyHunterPostgresRateLimitBackend({
  environment = process.env,
  client,
}: {
  environment?: NodeJS.ProcessEnv
  client?: CountyHunterRateLimitRpcClient
} = {}): CountyHunterRateLimitBackend {
  if (!client && !environment.COUNTY_HUNTER_SUPABASE_SECRET_KEY?.trim()) {
    throw configurationError()
  }
  const adminClient = client ??
    (createCountyHunterServerAdminClient(environment) as unknown as
      CountyHunterRateLimitRpcClient)
  readCountyHunterRateLimitSecret(environment)
  return new CountyHunterPostgresRateLimitBackend(adminClient, environment)
}
