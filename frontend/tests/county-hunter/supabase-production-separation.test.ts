import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { readCountyHunterPublicSupabaseConfig } from '../../features/county-hunter/server/public-supabase-config'

const root = process.cwd()
const source = (...segments: string[]) =>
  readFileSync(resolve(root, ...segments), 'utf8')

function sourceFiles(directory: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name)
    if (statSync(path).isDirectory()) files.push(...sourceFiles(path))
    else if (/\.(?:ts|tsx)$/.test(path)) files.push(path)
  }
  return files
}

describe('County Hunter Supabase production separation', () => {
  it('selects the dedicated project without changing generic legacy configuration', () => {
    const config = readCountyHunterPublicSupabaseConfig({
      NODE_ENV: 'test',
      NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL:
        'https://county-hunter-project.supabase.co',
      NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_synthetic-county-hunter-key',
      NEXT_PUBLIC_SUPABASE_URL: 'https://legacy-agents-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_synthetic-legacy-key',
    })

    expect(config).toEqual({
      supabaseUrl: 'https://county-hunter-project.supabase.co',
      publishableKey: 'sb_publishable_synthetic-county-hunter-key',
      usedDeprecatedFallback: false,
    })
  })

  it('allows the documented transition fallback outside production', () => {
    expect(readCountyHunterPublicSupabaseConfig({
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://staging-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_synthetic-staging-key',
    })).toMatchObject({
      supabaseUrl: 'https://staging-project.supabase.co',
      usedDeprecatedFallback: true,
    })
  })

  it('prohibits the generic project fallback in production', () => {
    expect(() => readCountyHunterPublicSupabaseConfig({
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://legacy-agents-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_synthetic-legacy-key',
    })).toThrowError(expect.objectContaining({ status: 503 }))
  })

  it('preserves agents and signal-agent on the generic project variables', () => {
    for (const file of [
      source('app', 'agents', 'page.tsx'),
      source('app', 'signal-agent', 'SignalAgentContent.tsx'),
    ]) {
      expect(file).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(file).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      expect(file).not.toContain('NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL')
      expect(file).not.toContain('NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY')
    }
  })

  it('routes every County Hunter user-session client through the isolated resolver', () => {
    for (const file of [
      source('middleware.ts'),
      source('features', 'county-hunter', 'server', 'route-supabase.ts'),
      source('features', 'county-hunter', 'server', 'supabase.ts'),
    ]) {
      expect(file).toContain('readCountyHunterPublicSupabaseConfig')
      expect(file).not.toMatch(/process\.env\.NEXT_PUBLIC_SUPABASE_(?:URL|PUBLISHABLE_KEY)/)
    }
  })

  it('keeps administrative secrets and database URLs outside browser code', () => {
    const runtimeFiles = [
      ...sourceFiles(resolve(root, 'app')),
      ...sourceFiles(resolve(root, 'components')),
      ...sourceFiles(resolve(root, 'features', 'county-hunter')),
      resolve(root, 'middleware.ts'),
    ]

    for (const file of runtimeFiles) {
      const fileSource = readFileSync(file, 'utf8')
      if (/^['"]use client['"]/m.test(fileSource)) {
        expect(fileSource, file).not.toMatch(
          /COUNTY_HUNTER_SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|COUNTY_HUNTER_PRODUCTION_DB_URL/,
        )
      }
      if (!file.endsWith('production-environment.ts')) {
        expect(fileSource, file).not.toContain('COUNTY_HUNTER_PRODUCTION_DB_URL')
      }
    }
  })

  it('keeps SIWE privileged operations behind the server-only repository', () => {
    const adminClient = source(
      'features',
      'county-hunter',
      'server',
      'admin-supabase.ts',
    )
    const challengeStore = source(
      'features',
      'county-hunter',
      'server',
      'challenge-store.ts',
    )

    expect(adminClient.startsWith("import 'server-only'")).toBe(true)
    expect(adminClient).toContain('COUNTY_HUNTER_SUPABASE_SECRET_KEY')
    expect(adminClient).not.toContain('Authorization')
    expect(challengeStore).toContain('createCountyHunterServerAdminClient')
    expect(challengeStore).toContain('county_hunter_issue_auth_challenge')
    expect(challengeStore).toContain('county_hunter_consume_auth_challenge')
  })
})
