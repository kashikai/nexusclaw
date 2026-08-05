import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  readSupabaseAdminKey,
} from '../../scripts/lib/supabase-admin-key.mjs'

const root = process.cwd()
const environment = (
  values: Record<string, string> = {},
): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  ...values,
})

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : []
  })
}

describe('Supabase administrative key migration', () => {
  it('accepts a Supabase secret key for the authorized local script', () => {
    const key = 'sb_secret_synthetic-admin-key'
    expect(
      readSupabaseAdminKey(environment({ SUPABASE_SECRET_KEY: key })),
    ).toEqual({ key, source: 'secret' })
  })

  it('prefers the secret key without logging either configured value', () => {
    const warn = vi.fn()
    const secret = 'sb_secret_preferred-synthetic-value'
    const legacy = 'synthetic-legacy-admin-value'
    const result = readSupabaseAdminKey(
      environment({
        SUPABASE_SECRET_KEY: secret,
        SUPABASE_SERVICE_ROLE_KEY: legacy,
      }),
      { warn },
    )

    expect(result).toEqual({ key: secret, source: 'secret' })
    expect(warn).not.toHaveBeenCalled()
    expect(JSON.stringify(warn.mock.calls)).not.toContain(secret)
    expect(JSON.stringify(warn.mock.calls)).not.toContain(legacy)
  })

  it('supports the deprecated fallback with a sanitized warning', () => {
    const warn = vi.fn()
    const legacy = 'synthetic-legacy-admin-value'
    const result = readSupabaseAdminKey(
      environment({ SUPABASE_SERVICE_ROLE_KEY: legacy }),
      { warn },
    )

    expect(result).toEqual({ key: legacy, source: 'legacy' })
    expect(warn).toHaveBeenCalledOnce()
    const warning = String(warn.mock.calls[0][0])
    expect(warning).toContain('deprecated')
    expect(warning).toContain('SUPABASE_SECRET_KEY')
    expect(warning).not.toContain(legacy)
  })

  it('rejects the legacy variable in strict mode without exposing it', () => {
    const legacy = 'synthetic-legacy-admin-value'
    expect(() =>
      readSupabaseAdminKey(environment({
        COUNTY_HUNTER_STRICT_ADMIN_KEY: 'true',
        SUPABASE_SERVICE_ROLE_KEY: legacy,
      })),
    ).toThrow(/rejected in strict admin-key mode/)

    try {
      readSupabaseAdminKey(environment({
        COUNTY_HUNTER_STRICT_ADMIN_KEY: 'true',
        SUPABASE_SERVICE_ROLE_KEY: legacy,
      }))
    } catch (error) {
      expect(String(error)).not.toContain(legacy)
    }
  })

  it('fails safely when no administrative key exists', () => {
    expect(() => readSupabaseAdminKey(environment())).toThrow(
      /SUPABASE_SECRET_KEY is required/,
    )
  })

  it('rejects a malformed secret key without logging its value', () => {
    const invalid = 'synthetic-not-a-secret-key'
    const warn = vi.fn()
    try {
      readSupabaseAdminKey(
        environment({ SUPABASE_SECRET_KEY: invalid }),
        { warn },
      )
      throw new Error('Expected the malformed key to be rejected.')
    } catch (error) {
      expect(String(error)).toMatch(/SUPABASE_SECRET_KEY/)
      expect(String(error)).not.toContain(invalid)
      expect(warn).not.toHaveBeenCalled()
    }
  })

  it('keeps administrative variables out of deployed sources and publishable auth intact', () => {
    const browserReachable = [
      ...sourceFiles(join(root, 'app')),
      ...sourceFiles(join(root, 'components')),
      ...sourceFiles(join(root, 'features', 'county-hunter', 'client')),
      join(root, 'middleware.ts'),
    ]
    for (const file of browserReachable) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(
        /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/,
      )
    }

    for (const file of [
      join(root, 'middleware.ts'),
      join(root, 'features', 'county-hunter', 'server', 'route-supabase.ts'),
      join(root, 'features', 'county-hunter', 'server', 'supabase.ts'),
    ]) {
      expect(readFileSync(file, 'utf8'), file).toContain(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      )
    }

    const serverAdmin = readFileSync(
      join(root, 'features', 'county-hunter', 'server', 'admin-supabase.ts'),
      'utf8',
    )
    expect(serverAdmin.startsWith("import 'server-only'")).toBe(true)
    expect(serverAdmin).toContain('SUPABASE_SECRET_KEY')
    expect(serverAdmin).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('routes staging administration through the isolated helper', () => {
    const provisioner = readFileSync(
      join(root, 'scripts', 'provision-county-hunter-staging.mjs'),
      'utf8',
    )
    expect(provisioner).toContain(
      "import { readSupabaseAdminKey } from './lib/supabase-admin-key.mjs'",
    )
    expect(provisioner).toContain('readSupabaseAdminKey(process.env')
    expect(provisioner).toContain(
      'createClient(supabaseUrl.origin, adminKey',
    )
    expect(provisioner).toContain(
      "new Set(['SUPABASE_SERVICE_ROLE_KEY'])",
    )
    expect(provisioner).toContain(
      'strict_environment_update_required',
    )
    expect(provisioner).toContain(
      'if (strict) {',
    )
    expect(provisioner).toContain(
      'county_hunter_fixture_retired !== true',
    )
    expect(provisioner).toContain(
      'county_hunter_fixture_retired: false',
    )
    expect(provisioner).toContain(
      'user?.user_metadata?.custom_claims?.address',
    )
    expect(provisioner).not.toMatch(
      /process\.env\.SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY/,
    )
  })

  it('keeps staging wallet rotation strict, reversible, and local-only', () => {
    const rotation = readFileSync(
      join(root, 'scripts', 'rotate-county-hunter-staging-fixtures.mjs'),
      'utf8',
    )
    expect(rotation).toContain("import { generatePrivateKey")
    expect(rotation).toContain(
      "SUPABASE_SERVICE_ROLE_KEY: undefined",
    )
    expect(rotation).toContain(
      "COUNTY_HUNTER_STRICT_ADMIN_KEY: 'true'",
    )
    expect(rotation).toContain('fsConstants.COPYFILE_EXCL')
    expect(rotation).toContain(
      'cache/county-hunter-fixture-rotation/.env.staging.local',
    )
    expect(rotation).toContain(
      'county_hunter_fixture_retired: true',
    )
    expect(rotation).toContain('.update({ active: false })')
    expect(rotation).toContain('async function rollbackRotation')
    expect(rotation).toContain(
      'if (assignments.size !== 14)',
    )
    expect(rotation).not.toMatch(
      /console\.(?:log|error)\([^)]*(?:privateKey|account\.address|userId|organizationId)/,
    )
  })
})
