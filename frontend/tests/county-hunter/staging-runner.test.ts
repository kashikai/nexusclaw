import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const runnerPath = join(repositoryRoot, 'scripts', 'validate-county-hunter-staging.ps1')
const runnerSource = readFileSync(runnerPath, 'utf8')
const rlsTestPath = join(repositoryRoot, 'supabase', 'tests', 'county_hunter_rls_test.sql')
const rlsTestSource = readFileSync(rlsTestPath, 'utf8')
const temporaryDirectories: string[] = []

const testEnvironment = {
  ...process.env,
  COUNTY_HUNTER_STAGING_CONFIRM: 'STAGING_ONLY',
  COUNTY_HUNTER_STAGING_PROJECT_REF: 'abcdefghijklmnopqrst',
  COUNTY_HUNTER_STAGING_DB_URL:
    'postgresql://postgres.abcdefghijklmnopqrst:synthetic-password@aws-0-test.pooler.supabase.com:6543/postgres',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  COUNTY_HUNTER_TEST_ORG_A: '11111111-1111-4111-8111-111111111111',
  COUNTY_HUNTER_TEST_ORG_B: '22222222-2222-4222-8222-222222222222',
  COUNTY_HUNTER_TEST_VIEWER_A: '33333333-3333-4333-8333-333333333333',
  COUNTY_HUNTER_TEST_MANAGER_A: '44444444-4444-4444-8444-444444444444',
  COUNTY_HUNTER_TEST_ADMIN_A: '55555555-5555-4555-8555-555555555555',
  COUNTY_HUNTER_TEST_ADMIN_B: '66666666-6666-4666-8666-666666666666',
}

function runRunner(
  arguments_: string[],
  psqlExitCode = 0,
  environmentOverrides: Record<string, string> = {},
) {
  const fakeBin = mkdtempSync(join(tmpdir(), 'county-hunter-runner-'))
  temporaryDirectories.push(fakeBin)
  const simulatedError =
    psqlExitCode === 0
      ? []
      : [
          '>&2 echo ERROR: postgresql://synthetic:synthetic-password@example.invalid/database',
          '>&2 echo DETAIL: 33333333-3333-4333-8333-333333333333 0x1111111111111111111111111111111111111111 eyJsynthetic-token-value',
        ]
  writeFileSync(
    join(fakeBin, 'psql.cmd'),
    [
      '@echo off',
      'echo FAKE_PSQL %*',
      ...simulatedError,
      `exit /b ${psqlExitCode}`,
      '',
    ].join('\r\n'),
  )

  const result = spawnSync(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      runnerPath,
      ...arguments_,
    ],
    {
      encoding: 'utf8',
      env: {
        ...testEnvironment,
        ...environmentOverrides,
        PATH: `${fakeBin};${process.env.PATH ?? ''}`,
      },
    },
  )

  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe.runIf(process.platform === 'win32')('County Hunter staging runner', () => {
  it('runs only the rollback-only RLS SQL in -RlsOnly mode', () => {
    const migrationBranch = runnerSource.indexOf('if ($MigrationsOnly) {')
    const migrationRead = runnerSource.indexOf('Get-ChildItem -LiteralPath $migrationDirectory')
    const rlsScriptRead = runnerSource.indexOf(
      "Join-Path $repositoryRoot 'supabase\\tests\\county_hunter_rls_test.sql'",
    )

    expect(migrationBranch).toBeGreaterThan(-1)
    expect(migrationRead).toBeGreaterThan(migrationBranch)
    expect(rlsScriptRead).toBeGreaterThan(migrationRead)

    const result = runRunner(['-RlsOnly'])

    expect(result.status).toBe(0)
    expect(result.output).toContain('FAKE_PSQL')
    expect(result.output).toContain('county_hunter_rls_test.sql')
    expect(result.output).toContain('ON_ERROR_STOP=1')
    expect(result.output).toContain('RLS-only validation completed successfully')
    expect(result.output).not.toContain('supabase\\migrations')
    expect(result.output).not.toContain('provision-county-hunter-staging')
    expect(result.output).not.toContain('synthetic-password')
    expect(result.output).not.toContain('postgresql://')
    expect(result.output).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    )
  })

  it('stops with a nonzero exit code when psql reports a SQL failure', () => {
    const result = runRunner(['-RlsOnly'], 7)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('County Hunter staging RLS validation failed.')
    expect(result.output).not.toContain('RLS-only validation completed successfully')
    expect(result.output).toContain('[redacted-database-url]')
    expect(result.output).toContain('[redacted-uuid]')
    expect(result.output).toContain('[redacted-wallet-or-key]')
    expect(result.output).toContain('[redacted-token]')
    expect(result.output).not.toContain('synthetic-password')
    expect(result.output).not.toContain('postgresql://')
    expect(result.output).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    )
  })

  it('blocks implicit full mode before psql can reapply migrations', () => {
    const result = runRunner([])

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('No implicit full mode is allowed.')
    expect(result.output).not.toContain('FAKE_PSQL')
    expect(result.output).not.toContain('Applying migration')
    expect(result.output).not.toContain('synthetic-password')
    expect(result.output).not.toContain('postgresql://')
  })

  it('rejects a Supabase API URL with a REST path before any remote command', () => {
    const result = runRunner(
      ['-PreflightOnly'],
      0,
      {
        NEXT_PUBLIC_SUPABASE_URL:
          'https://abcdefghijklmnopqrst.supabase.co/rest/v1/',
      },
    )

    expect(result.status).not.toBe(0)
    expect(result.output).toContain(
      'NEXT_PUBLIC_SUPABASE_URL must be an HTTPS origin without a path, query, fragment, or credentials.',
    )
    expect(result.output).not.toContain('FAKE_PSQL')
    expect(result.output).not.toContain('synthetic-password')
    expect(result.output).not.toContain('postgresql://')
  })
})

describe('County Hunter RLS fixture transaction', () => {
  it('normalizes existing memberships with a rollback-only upsert', () => {
    const beginPosition = rlsTestSource.search(/^\s*begin\s*;/im)
    const upsertPosition = rlsTestSource.search(
      /on\s+conflict\s*\(\s*user_id\s*,\s*organization_id\s*\)/i,
    )
    const updatePosition = rlsTestSource.search(/do\s+update\s+set/i)
    const rollbackPosition = rlsTestSource.search(/^\s*rollback\s*;\s*$/im)

    expect(beginPosition).toBeGreaterThan(-1)
    expect(upsertPosition).toBeGreaterThan(beginPosition)
    expect(updatePosition).toBeGreaterThan(upsertPosition)
    expect(rollbackPosition).toBeGreaterThan(updatePosition)
    expect(rlsTestSource).toMatch(/rollback\s*;\s*$/i)
    expect(rlsTestSource).not.toMatch(/^\s*commit\s*;/im)
  })
})
