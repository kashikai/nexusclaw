import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const runnerPath = join(
  repositoryRoot,
  'scripts',
  'validate-county-hunter-production.ps1',
)
const runnerSource = readFileSync(runnerPath, 'utf8')
const gitignoreSource = readFileSync(join(repositoryRoot, '.gitignore'), 'utf8')
const migrationDirectory = join(repositoryRoot, 'supabase', 'migrations')
const expectedMigrations = [
  '202607230001_county_hunter_foundation.sql',
  '202607230002_county_hunter_rls.sql',
  '202607230003_county_hunter_seed_counties.sql',
  '202607230004_county_hunter_auth_hardening.sql',
  '202607230005_county_hunter_wallet_auth.sql',
  '20260726153642_county_hunter_gwinnett_discovery.sql',
  '20260726160827_county_hunter_gwinnett_discovery_rpc_fix.sql',
  '20260726174825_county_hunter_snapshot_replay.sql',
  '20260804181518_county_hunter_siwe_server_only_hardening.sql',
  '20260806081241_county_hunter_distributed_rate_limit.sql',
]
const temporaryDirectories: string[] = []

function cleanParentEnvironment() {
  const environment = { ...process.env }
  for (const name of Object.keys(environment)) {
    if (
      /^COUNTY_HUNTER_STAGING_/i.test(name)
      || /^COUNTY_HUNTER_TEST_/i.test(name)
      || /^COUNTY_HUNTER_.*PRIVATE_KEY$/i.test(name)
      || name === 'SUPABASE_SERVICE_ROLE_KEY'
    ) {
      delete environment[name]
    }
  }
  return environment
}

function productionEnvironment(overrides: string[] = []) {
  const entries = [
    'COUNTY_HUNTER_PRODUCTION_CONFIRM=I_UNDERSTAND_THIS_IS_PRODUCTION',
    'COUNTY_HUNTER_PRODUCTION_PROJECT_REF=abcdefghijklmnopqrst',
    'COUNTY_HUNTER_PRODUCTION_DB_URL=postgresql://postgres:synthetic-password@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=require',
    'COUNTY_HUNTER_SUPABASE_SECRET_KEY=sb_secret_synthetic-admin-key',
  ]
  for (const override of overrides) {
    const separator = override.indexOf('=')
    const name = separator < 0 ? override : override.slice(0, separator)
    const existing = entries.findIndex((entry) => entry.startsWith(`${name}=`))
    if (existing < 0) entries.push(override)
    else entries[existing] = override
  }
  return [...entries, ''].join('\r\n')
}

function createFixture(options: {
  environment?: string
  preflightState?: 'PREFLIGHT_EMPTY' | 'PREFLIGHT_COMPATIBLE'
  psqlExitCode?: number
  emitSensitiveError?: boolean
} = {}) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'county-hunter-production-runner-'))
  temporaryDirectories.push(fixtureRoot)
  const scriptsDirectory = join(fixtureRoot, 'scripts')
  const migrationsDirectory = join(fixtureRoot, 'supabase', 'migrations')
  const fakeBin = join(fixtureRoot, 'fake-bin')
  mkdirSync(scriptsDirectory, { recursive: true })
  mkdirSync(migrationsDirectory, { recursive: true })
  mkdirSync(fakeBin, { recursive: true })
  copyFileSync(runnerPath, join(scriptsDirectory, 'validate-county-hunter-production.ps1'))
  writeFileSync(join(fixtureRoot, '.gitignore'), '**/.env.production.local\r\n')
  writeFileSync(
    join(fixtureRoot, '.env.production.local'),
    options.environment ?? productionEnvironment(),
  )
  for (const migration of expectedMigrations) {
    writeFileSync(join(migrationsDirectory, migration), '-- synthetic migration\r\n')
  }

  spawnSync('git', ['init', '--quiet'], { cwd: fixtureRoot })

  const counterPath = join(fixtureRoot, 'psql-counter.txt')
  const logPath = join(fixtureRoot, 'psql-calls.txt')
  const sensitiveError = options.emitSensitiveError
    ? [
        '>&2 echo ERROR: postgresql://postgres:synthetic-password@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
        '>&2 echo DETAIL: 11111111-1111-4111-8111-111111111111 0x1111111111111111111111111111111111111111 sb_secret_synthetic-admin-key',
      ]
    : []
  writeFileSync(
    join(fakeBin, 'psql.cmd'),
    [
      '@echo off',
      'setlocal EnableDelayedExpansion',
      'set CALL_COUNT=0',
      'if exist "%FAKE_PSQL_COUNTER%" set /p CALL_COUNT=<"%FAKE_PSQL_COUNTER%"',
      'set /a CALL_COUNT+=1',
      '>"%FAKE_PSQL_COUNTER%" echo !CALL_COUNT!',
      '>>"%FAKE_PSQL_LOG%" echo CALL !CALL_COUNT! %*',
      'if "!CALL_COUNT!"=="1" echo %FAKE_PREFLIGHT_STATE%',
      'if "!CALL_COUNT!"=="2" echo VERIFY_OK',
      ...sensitiveError,
      'exit /b %FAKE_PSQL_EXIT_CODE%',
      '',
    ].join('\r\n'),
  )

  return {
    fixtureRoot,
    runner: join(scriptsDirectory, 'validate-county-hunter-production.ps1'),
    counterPath,
    logPath,
    environment: {
      ...cleanParentEnvironment(),
      PATH: `${fakeBin};${process.env.PATH ?? ''}`,
      FAKE_PSQL_COUNTER: counterPath,
      FAKE_PSQL_LOG: logPath,
      FAKE_PREFLIGHT_STATE: options.preflightState ?? 'PREFLIGHT_EMPTY',
      FAKE_PSQL_EXIT_CODE: String(options.psqlExitCode ?? 0),
    },
  }
}

function runRunner(
  arguments_: string[],
  options: Parameters<typeof createFixture>[0] = {},
) {
  const fixture = createFixture(options)
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      fixture.runner,
      ...arguments_,
    ],
    {
      cwd: fixture.fixtureRoot,
      encoding: 'utf8',
      env: fixture.environment,
    },
  )
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    calls: existsSync(fixture.logPath)
      ? readFileSync(fixture.logPath, 'utf8')
      : '',
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe.runIf(process.platform === 'win32')('County Hunter production runner', () => {
  it('has an explicit ten-migration manifest matching the repository', () => {
    const actualMigrations = expectedMigrations.filter((name) =>
      existsSync(join(migrationDirectory, name)),
    )

    expect(actualMigrations).toEqual(expectedMigrations)
    expect(runnerSource).toContain("$productionEnvironmentPath = Join-Path $repositoryRoot '.env.production.local'")
    expect(runnerSource).not.toContain('.env.staging.local')
    expect(runnerSource).not.toContain('frontend/.env.development.local')
    for (const migration of expectedMigrations) {
      expect(runnerSource).toContain(`'${migration}'`)
    }
    expect(gitignoreSource).toContain('**/.env.production.local')
  })

  it('blocks implicit mode before loading an environment or running psql', () => {
    const result = runRunner([])

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('Choose exactly one explicit mode')
    expect(result.calls).toBe('')
  })

  it('performs a sanitized read-only preflight against a direct connection', () => {
    const result = runRunner(['-PreflightOnly'])

    expect(result.status, result.output).toBe(0)
    expect(result.output).toContain('READY FOR COUNTY HUNTER PRODUCTION MIGRATION VALIDATION')
    expect(result.output).toContain('DIRECT_CONNECTION=true')
    expect(result.output).toContain('PORT_5432=true')
    expect(result.output).toContain('SSL_REQUIRED=true')
    expect(result.output).toContain('PROJECT_STATE=EMPTY')
    expect(result.output).not.toContain('synthetic-password')
    expect(result.output).not.toContain('abcdefghijklmnopqrst')
    expect(result.output).not.toContain('sb_secret_')
    expect(result.calls).toContain('ON_ERROR_STOP=1')
    expect(result.calls).not.toContain('-f')
  })

  it.each([
    [
      'incorrect confirmation',
      productionEnvironment([
        'COUNTY_HUNTER_PRODUCTION_CONFIRM=WRONG_CONFIRMATION',
      ]),
    ],
    [
      'pooler endpoint',
      productionEnvironment([
        'COUNTY_HUNTER_PRODUCTION_DB_URL=postgresql://postgres.abcdefghijklmnopqrst:synthetic-password@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require',
      ]),
    ],
    [
      'transaction pooler port',
      productionEnvironment([
        'COUNTY_HUNTER_PRODUCTION_DB_URL=postgresql://postgres:synthetic-password@db.abcdefghijklmnopqrst.supabase.co:6543/postgres?sslmode=require',
      ]),
    ],
    [
      'staging variable',
      productionEnvironment(['COUNTY_HUNTER_STAGING_CONFIRM=STAGING_ONLY']),
    ],
    [
      'fixture private key',
      productionEnvironment(['COUNTY_HUNTER_TEST_ADMIN_A_PRIVATE_KEY=synthetic']),
    ],
    [
      'legacy service role',
      productionEnvironment(['SUPABASE_SERVICE_ROLE_KEY=synthetic']),
    ],
    [
      'placeholder project ref',
      productionEnvironment([
        'COUNTY_HUNTER_PRODUCTION_PROJECT_REF=REPLACE_WITH_PROJECT_REF',
      ]),
    ],
  ])('rejects %s before any database command', (_label, environment) => {
    const result = runRunner(['-PreflightOnly'], { environment })

    expect(result.status).not.toBe(0)
    expect(result.calls).toBe('')
    expect(result.output).not.toContain('synthetic-password')
    expect(result.output).not.toContain('sb_secret_')
  })

  it('queues all migrations once in one fail-fast transaction', () => {
    const result = runRunner(['-MigrationsOnly'])

    expect(result.status).toBe(0)
    expect(result.output).toContain('completed in one controlled transaction')
    expect(result.calls).toContain('--single-transaction')
    expect(result.calls).toContain('ON_ERROR_STOP=1')
    for (const migration of expectedMigrations) {
      expect(result.calls).toContain(migration)
    }
    expect(result.calls).not.toContain('county_hunter_rls_test.sql')
    expect(result.calls).not.toContain('provision-county-hunter')
    expect(result.calls).not.toContain('county_hunter_configure_gwinnett_discovery')
    expect(result.output).not.toContain('synthetic-password')
  })

  it('runs metadata-only verification without applying migrations', () => {
    const result = runRunner(['-VerifyOnly'], {
      preflightState: 'PREFLIGHT_COMPATIBLE',
    })

    expect(result.status, result.output).toBe(0)
    expect(result.output).toContain('COUNTY HUNTER PRODUCTION METADATA VERIFIED')
    expect(result.output).toContain('RLS_ENABLED=true')
    expect(result.output).toContain('SIWE_SERVICE_ROLE_ONLY=true')
    expect(result.output).toContain('STAGING_FIXTURES_ABSENT=true')
    expect(result.calls).not.toContain('supabase\\migrations')
    for (const migration of expectedMigrations) {
      expect(result.calls).not.toContain(migration)
    }
  })

  it('redacts native psql diagnostics and stops on the first failure', () => {
    const result = runRunner(['-PreflightOnly'], {
      psqlExitCode: 7,
      emitSensitiveError: true,
    })

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('[redacted-database-url]')
    expect(result.output).toContain('[redacted-uuid]')
    expect(result.output).toContain('[redacted-wallet-or-key]')
    expect(result.output).toContain('[redacted-token]')
    expect(result.output).not.toContain('synthetic-password')
    expect(result.output).not.toContain('abcdefghijklmnopqrst')
    expect(result.output).not.toContain('sb_secret_synthetic-admin-key')
  })

  it('encodes the required metadata and ACL checks without fixture execution', () => {
    expect(runnerSource).toContain('security_definer_count <> 7')
    expect(runnerSource).toContain('VERIFY_SIWE_ISSUE_ACL')
    expect(runnerSource).toContain('VERIFY_SIWE_CONSUME_ACL')
    expect(runnerSource).toContain('VERIFY_AUDIT_FUNCTION_ACL')
    expect(runnerSource).toContain('VERIFY_BOOTSTRAP_ACL')
    expect(runnerSource).toContain('VERIFY_REPLAY_ACL')
    expect(runnerSource).toContain('VERIFY_RATE_LIMIT_ACL')
    expect(runnerSource).toContain('VERIFY_PRIVATE_SCHEMA_EXPOSURE')
    expect(runnerSource).toContain('VERIFY_UNEXPECTED_PRODUCTION_FIXTURE_OR_DISCOVERY_DATA')
    expect(runnerSource).not.toContain('COUNTY_HUNTER_TEST_ORG_A')
    expect(runnerSource).not.toContain('provision-county-hunter-staging')
  })
})
