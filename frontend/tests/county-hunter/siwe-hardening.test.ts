import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { readCountyHunterServerAdminConfig } from '../../features/county-hunter/server/admin-supabase'
import { readCountyHunterPublicSupabaseConfig } from '../../features/county-hunter/server/public-supabase-config'
import {
  assertCountyHunterSiweOrigin,
  COUNTY_HUNTER_CHALLENGE_BODY_LIMIT,
  readCountyHunterSiweJson,
} from '../../features/county-hunter/server/siwe-request'

const root = process.cwd()
const source = (...segments: string[]) =>
  readFileSync(join(root, ...segments), 'utf8')

describe('County Hunter server-only SIWE hardening', () => {
  it('uses the isolated County Hunter project and secret in production', () => {
    expect(readCountyHunterServerAdminConfig({
      NODE_ENV: 'production',
      NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL: 'https://production-project.supabase.co',
      NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_synthetic-production-key',
      COUNTY_HUNTER_SUPABASE_SECRET_KEY:
        'sb_secret_synthetic-server-only-key',
      NEXT_PUBLIC_SUPABASE_URL: 'https://legacy-agents.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_synthetic-legacy-key',
    })).toEqual({
      supabaseUrl: 'https://production-project.supabase.co',
      secretKey: 'sb_secret_synthetic-server-only-key',
    })
  })

  it('keeps the deprecated generic staging fallback outside production only', () => {
    expect(readCountyHunterServerAdminConfig({
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://staging-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_synthetic-staging-key',
      SUPABASE_SECRET_KEY: 'sb_secret_synthetic-staging-key',
    })).toEqual({
      supabaseUrl: 'https://staging-project.supabase.co',
      secretKey: 'sb_secret_synthetic-staging-key',
    })

    expect(() => readCountyHunterServerAdminConfig({
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://staging-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_synthetic-staging-key',
      SUPABASE_SECRET_KEY: 'sb_secret_synthetic-staging-key',
    })).toThrowError(expect.objectContaining({ status: 503 }))
  })

  it('never mixes an incomplete County Hunter public configuration with legacy values', () => {
    expect(() => readCountyHunterPublicSupabaseConfig({
      NODE_ENV: 'test',
      NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL:
        'https://isolated-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_URL: 'https://legacy-agents.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_synthetic-legacy-key',
    })).toThrowError(expect.objectContaining({ status: 503 }))
  })

  it('requires the canonical request origin', () => {
    const expected = 'https://localhost:3000'
    expect(() => assertCountyHunterSiweOrigin(
      new Request(`${expected}/api/county-hunter/auth/challenge`, {
        headers: { Origin: expected },
      }),
      expected,
    )).not.toThrow()
    expect(() => assertCountyHunterSiweOrigin(
      new Request(`${expected}/api/county-hunter/auth/challenge`, {
        headers: { Origin: 'https://attacker.invalid' },
      }),
      expected,
    )).toThrowError(expect.objectContaining({ status: 403 }))
  })

  it('requires JSON and enforces the request body limit from actual bytes', async () => {
    await expect(readCountyHunterSiweJson(
      new Request('https://localhost:3000/api/county-hunter/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: '{}',
      }),
      COUNTY_HUNTER_CHALLENGE_BODY_LIMIT,
    )).rejects.toMatchObject({ status: 415 })

    await expect(readCountyHunterSiweJson(
      new Request('https://localhost:3000/api/county-hunter/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: 'x'.repeat(COUNTY_HUNTER_CHALLENGE_BODY_LIMIT) }),
      }),
      COUNTY_HUNTER_CHALLENGE_BODY_LIMIT,
    )).rejects.toMatchObject({ status: 413 })
  })

  it('keeps privileged RPCs behind Route Handlers and the server-only client', () => {
    const adminClient = source('features', 'county-hunter', 'server', 'admin-supabase.ts')
    const challengeStore = source('features', 'county-hunter', 'server', 'challenge-store.ts')
    const challengeRoute = source('app', 'api', 'county-hunter', 'auth', 'challenge', 'route.ts')
    const verifyRoute = source('app', 'api', 'county-hunter', 'auth', 'verify', 'route.ts')

    expect(adminClient.startsWith("import 'server-only'")).toBe(true)
    expect(adminClient).toContain('COUNTY_HUNTER_SUPABASE_SECRET_KEY')
    expect(adminClient).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(adminClient).toContain('SUPABASE_SECRET_KEY.test(secretKey)')
    expect(adminClient).toContain('autoRefreshToken: false')
    expect(adminClient).toContain('detectSessionInUrl: false')
    expect(adminClient).toContain('persistSession: false')
    expect(adminClient).not.toContain('console.')

    expect(challengeStore).toContain('createCountyHunterServerAdminClient')
    expect(challengeStore).not.toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    expect(challengeStore).not.toContain('NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY')
    expect(challengeRoute).toContain('assertCountyHunterSiweOrigin')
    expect(challengeRoute).toContain('readCountyHunterSiweJson')
    expect(verifyRoute).toContain('assertCountyHunterSiweOrigin')
    expect(verifyRoute).toContain('readCountyHunterSiweJson')
  })
})
