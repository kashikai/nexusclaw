import {
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  isCountyHunterDiscoveryEnabled,
  isCountyHunterServerEnabled,
} from '../../features/county-hunter/server/feature-flags'
import {
  requireCountyHunterDiscoveryEnabled,
} from '../../features/county-hunter/server/discovery-kill-switch'
import {
  countyHunterOpaqueRef,
  logCountyHunterEvent,
} from '../../features/county-hunter/server/operational-logging'
import {
  enforceCountyHunterRateLimit,
} from '../../features/county-hunter/server/rate-limit'
import {
  assertCountyHunterVercelRuntimeBoundary,
  COUNTY_HUNTER_PRODUCTION_APP_ORIGIN,
  validateCountyHunterProductionEnvironment,
} from '../../features/county-hunter/server/production-environment'
import {
  readCountyHunterWalletAuthConfig,
} from '../../features/county-hunter/server/wallet-auth-config'
import {
  resolveWalletRuntimeConfiguration,
} from '../../config/wallet-runtime'

function firstDeployOffEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    COUNTY_HUNTER_ENABLED: 'false',
    COUNTY_HUNTER_DISCOVERY_ENABLED: 'false',
    NEXT_PUBLIC_COUNTY_HUNTER_ENABLED: 'false',
    NEXT_PUBLIC_APP_ORIGIN: COUNTY_HUNTER_PRODUCTION_APP_ORIGIN,
    NEXT_PUBLIC_SUPABASE_URL:
      'https://legacyagentsproject.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      'synthetic-legacy-agents-anon-key',
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      '0123456789abcdef0123456789abcdef',
    NEXT_PUBLIC_BASE_RPC_URL:
      'https://public-rpc.example.com/base',
  }
}

function validProductionEnvironment(): NodeJS.ProcessEnv {
  return {
    ...firstDeployOffEnvironment(),
    COUNTY_HUNTER_ENABLED: 'true',
    NEXT_PUBLIC_COUNTY_HUNTER_ENABLED: 'true',
    COUNTY_HUNTER_PRODUCTION_CONFIRM: 'PRODUCTION_PILOT',
    COUNTY_HUNTER_PRODUCTION_PROJECT_REF: 'abcdefghijklmnopqrst',
    COUNTY_HUNTER_AUTH_ORIGIN: COUNTY_HUNTER_PRODUCTION_APP_ORIGIN,
    NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL:
      'https://abcdefghijklmnopqrst.supabase.co',
    NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY:
      'sb_publishable_abcdefghijklmnopqrstuvwxyz123456',
    COUNTY_HUNTER_SUPABASE_SECRET_KEY:
      'sb_secret_abcdefghijklmnopqrstuvwxyz123456',
    COUNTY_HUNTER_RATE_LIMIT_BACKEND: 'postgres',
    COUNTY_HUNTER_RATE_LIMIT_SECRET:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      'sb_publishable_legacyagents1234567890123456',
    COUNTY_HUNTER_BASE_RPC_URL:
      'https://server-rpc.example.com/base',
  }
}

function clientSourceFiles(root: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(root)) {
    const path = resolve(root, name)
    if (statSync(path).isDirectory()) {
      files.push(...clientSourceFiles(path))
    } else if (/\.(?:ts|tsx)$/.test(path)) {
      const source = readFileSync(path, 'utf8')
      if (/^['"]use client['"]/m.test(source)) files.push(path)
    }
  }
  return files
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('County Hunter production pilot safety controls', () => {
  it('requires the explicit first-deploy boundary in production', () => {
    expect(() =>
      isCountyHunterServerEnabled({ NODE_ENV: 'production' }),
    ).toThrow(/NEXT_PUBLIC_APP_ORIGIN/)
    expect(() =>
      isCountyHunterDiscoveryEnabled({ NODE_ENV: 'production' }),
    ).toThrow(/NEXT_PUBLIC_APP_ORIGIN/)
  })

  it('accepts a complete isolated production configuration with collection disabled', () => {
    const environment = validProductionEnvironment()
    const result = validateCountyHunterProductionEnvironment(environment)

    expect(result.supabaseProjectRef).toBe(
      environment.COUNTY_HUNTER_PRODUCTION_PROJECT_REF,
    )
    expect(result.appOrigin).toBe(environment.NEXT_PUBLIC_APP_ORIGIN)
    expect(isCountyHunterServerEnabled(environment)).toBe(true)
    expect(isCountyHunterDiscoveryEnabled(environment)).toBe(false)
  })

  it('binds WalletConnect metadata and SIWE to the same explicit origin', () => {
    const environment = validProductionEnvironment()
    const production = validateCountyHunterProductionEnvironment(environment)
    const wallet = resolveWalletRuntimeConfiguration(
      environment,
      'https://ignored.example.com',
    )
    const siwe = readCountyHunterWalletAuthConfig(environment)

    expect(wallet.walletConnectEnabled).toBe(true)
    expect(wallet.metadata?.url).toBe(environment.NEXT_PUBLIC_APP_ORIGIN)
    expect(wallet.metadata?.url).toBe(production.appOrigin)
    expect(siwe.origin).toBe(production.appOrigin)
    expect(siwe.uri).toBe(`${production.appOrigin}/`)
    expect(siwe.domain).toBe(new URL(production.appOrigin).host)
  })

  it('does not use a browser or dependency fallback in production', () => {
    const environment = validProductionEnvironment()
    delete environment.NEXT_PUBLIC_APP_ORIGIN

    expect(
      resolveWalletRuntimeConfiguration(
        environment,
        'https://runtime.example.com',
      ),
    ).toEqual({ walletConnectEnabled: false })
  })

  it.each([
    ['missing origin', (environment: NodeJS.ProcessEnv) => {
      delete environment.NEXT_PUBLIC_APP_ORIGIN
    }],
    ['HTTP origin', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN = 'http://pilot.example.com'
    }],
    ['localhost origin', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN = 'https://localhost:3000'
      environment.COUNTY_HUNTER_AUTH_ORIGIN = 'https://localhost:3000'
    }],
    ['staging origin', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN =
        'https://county-hunter.staging.nexusclaw.test'
      environment.COUNTY_HUNTER_AUTH_ORIGIN =
        'https://county-hunter.staging.nexusclaw.test'
    }],
    ['loopback IP origin', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN = 'https://127.0.0.1:3000'
      environment.COUNTY_HUNTER_AUTH_ORIGIN = 'https://127.0.0.1:3000'
    }],
    ['test TLD origin', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN = 'https://pilot.example.test'
      environment.COUNTY_HUNTER_AUTH_ORIGIN = 'https://pilot.example.test'
    }],
    ['origin query', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN = 'https://pilot.example.com?mode=test'
    }],
    ['origin fragment', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN = 'https://pilot.example.com#test'
    }],
    ['origin credentials', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN = 'https://user:pass@pilot.example.com'
    }],
    ['origin placeholder', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN = 'REPLACE_WITH_PRODUCTION_ORIGIN'
    }],
    ['origin path', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_APP_ORIGIN =
        'https://county-hunter.nexusclaw.test/unexpected'
    }],
    ['origin mismatch', (environment: NodeJS.ProcessEnv) => {
      environment.COUNTY_HUNTER_AUTH_ORIGIN =
        'https://other.nexusclaw.test'
    }],
    ['missing public RPC', (environment: NodeJS.ProcessEnv) => {
      delete environment.NEXT_PUBLIC_BASE_RPC_URL
    }],
    ['localhost server RPC', (environment: NodeJS.ProcessEnv) => {
      environment.COUNTY_HUNTER_BASE_RPC_URL =
        'https://127.0.0.1:8545'
    }],
    ['placeholder Project ID', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID =
        'REPLACE_WITH_PROJECT_ID'
    }],
    ['invalid Supabase URL', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL =
        'https://unrelated.nexusclaw.test'
    }],
    ['staging project ref present', (environment: NodeJS.ProcessEnv) => {
      environment.COUNTY_HUNTER_STAGING_PROJECT_REF =
        'stagingprojectref000'
    }],
    ['service role present', (environment: NodeJS.ProcessEnv) => {
      environment.SUPABASE_SERVICE_ROLE_KEY = 'sensitive-runtime-value'
    }],
    ['generic secret present', (environment: NodeJS.ProcessEnv) => {
      environment.SUPABASE_SECRET_KEY = 'sensitive-runtime-value'
    }],
    ['database URL present', (environment: NodeJS.ProcessEnv) => {
      environment.DATABASE_URL = 'sensitive-runtime-value'
    }],
    ['production database URL present', (environment: NodeJS.ProcessEnv) => {
      environment.COUNTY_HUNTER_PRODUCTION_DB_URL = 'sensitive-runtime-value'
    }],
    ['test fixture present', (environment: NodeJS.ProcessEnv) => {
      environment.COUNTY_HUNTER_TEST_ADMIN_A_PRIVATE_KEY =
        'sensitive-runtime-value'
    }],
    ['memory rate-limit backend', (environment: NodeJS.ProcessEnv) => {
      environment.COUNTY_HUNTER_RATE_LIMIT_BACKEND = 'memory'
    }],
    ['missing rate-limit secret', (environment: NodeJS.ProcessEnv) => {
      delete environment.COUNTY_HUNTER_RATE_LIMIT_SECRET
    }],
    ['public rate-limit secret', (environment: NodeJS.ProcessEnv) => {
      environment.NEXT_PUBLIC_COUNTY_HUNTER_RATE_LIMIT_SECRET =
        'sensitive-runtime-value'
    }],
  ])('rejects %s without echoing configured values', (_label, mutate) => {
    const environment = validProductionEnvironment()
    mutate(environment)

    let error: unknown
    try {
      validateCountyHunterProductionEnvironment(environment)
    } catch (caught) {
      error = caught
    }
    expect(error).toMatchObject({ status: 503 })
    expect(String(error)).not.toContain('sensitive-runtime-value')
  })

  it('rejects a service-role JWT in a public key variable', () => {
    const environment = validProductionEnvironment()
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
      'base64url',
    )
    const payload = Buffer.from(
      JSON.stringify({ role: 'service_role' }),
    ).toString('base64url')
    environment.NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY =
      `${header}.${payload}.synthetic`

    expect(() =>
      validateCountyHunterProductionEnvironment(environment),
    ).toThrow(/NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY/)
  })

  it('rejects administrative key material in any public variable', () => {
    const environment = validProductionEnvironment()
    environment.NEXT_PUBLIC_ACCIDENTAL_ADMIN_KEY =
      'sb_secret_synthetic-never-public'

    expect(() =>
      validateCountyHunterProductionEnvironment(environment),
    ).toThrow(/NEXT_PUBLIC_ACCIDENTAL_ADMIN_KEY/)
  })

  it('allows all County Hunter flags to remain off without an administrative secret', () => {
    const environment = firstDeployOffEnvironment()
    expect(() => assertCountyHunterVercelRuntimeBoundary(environment)).not.toThrow()
    expect(isCountyHunterServerEnabled(environment)).toBe(false)
    expect(isCountyHunterDiscoveryEnabled(environment)).toBe(false)
  })

  it.each([
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'DATABASE_URL',
    'COUNTY_HUNTER_PRODUCTION_DB_URL',
    'COUNTY_HUNTER_STAGING_PROJECT_REF',
    'COUNTY_HUNTER_TEST_ADMIN_A_PRIVATE_KEY',
  ])('rejects %s even while all County Hunter flags are off', (name) => {
    const environment = firstDeployOffEnvironment()
    environment[name] = 'sensitive-runtime-value'

    expect(() => isCountyHunterServerEnabled(environment)).toThrow(name)
  })

  it('requires the namespaced secret when the production module is enabled', () => {
    const environment = validProductionEnvironment()
    delete environment.COUNTY_HUNTER_SUPABASE_SECRET_KEY

    expect(() => isCountyHunterServerEnabled(environment)).toThrow(
      /COUNTY_HUNTER_SUPABASE_SECRET_KEY/,
    )
  })

  it('requires the distributed rate-limit secret when the production module is enabled', () => {
    const environment = validProductionEnvironment()
    delete environment.COUNTY_HUNTER_RATE_LIMIT_SECRET

    expect(() => isCountyHunterServerEnabled(environment)).toThrow(
      /COUNTY_HUNTER_RATE_LIMIT_SECRET/,
    )
  })

  it('does not allow the collection switch to bypass the module switch', () => {
    const environment = firstDeployOffEnvironment()
    environment.COUNTY_HUNTER_DISCOVERY_ENABLED = 'true'

    expect(() => isCountyHunterDiscoveryEnabled(environment)).toThrow(
      /COUNTY_HUNTER_DISCOVERY_ENABLED/,
    )
  })

  it('blocks Discovery and replay when the independent kill switch is off', () => {
    expect(() =>
      requireCountyHunterDiscoveryEnabled({
        NODE_ENV: 'test',
        COUNTY_HUNTER_ENABLED: 'true',
        COUNTY_HUNTER_DISCOVERY_ENABLED: 'false',
      }),
    ).toThrow(/disabled by the operator/)
  })

  it('enforces server-side fixed-window limits', async () => {
    const key = 'production-safety-test-rate-limit'
    const policy = { limit: 2, windowMs: 1_000 }
    await enforceCountyHunterRateLimit(key, policy, 10_000)
    await enforceCountyHunterRateLimit(key, policy, 10_000)
    await expect(
      enforceCountyHunterRateLimit(key, policy, 10_000),
    ).rejects.toThrow(/Too many County Hunter requests/)
    await expect(
      enforceCountyHunterRateLimit(key, policy, 11_001),
    ).resolves.toBeUndefined()
  })

  it('emits structured logs with only allowlisted sanitized fields', () => {
    const output: string[] = []
    vi.spyOn(console, 'info').mockImplementation((value) => {
      output.push(String(value))
    })
    const unsafe = {
      signature: 'sensitive-signature-value',
      cookie: 'sensitive-cookie-value',
      operation: 'siwe_login',
      outcome: 'authenticated',
      actorRef: countyHunterOpaqueRef('synthetic-user'),
    }

    logCountyHunterEvent('siwe_login_succeeded', unsafe)
    expect(output).toHaveLength(1)
    expect(output[0]).toContain('"event":"siwe_login_succeeded"')
    expect(output[0]).not.toContain('sensitive-signature-value')
    expect(output[0]).not.toContain('sensitive-cookie-value')
    expect(output[0]).not.toContain('synthetic-user')
  })

  it('keeps server-only variables out of client components', () => {
    const clientFiles = [
      ...clientSourceFiles(resolve(process.cwd(), 'app')),
      ...clientSourceFiles(resolve(process.cwd(), 'components')),
      ...clientSourceFiles(resolve(process.cwd(), 'features')),
    ]
    for (const file of clientFiles) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(
        /SUPABASE_SERVICE_ROLE_KEY|(?:COUNTY_HUNTER_)?SUPABASE_SECRET_KEY|COUNTY_HUNTER_RATE_LIMIT_SECRET|DATABASE_URL|COUNTY_HUNTER_BASE_RPC_URL|server\/(?:production-environment|postgres-rate-limit)/,
      )
    }
  })

  it('keeps example production configuration disabled and secret-free', () => {
    const productionExample = readFileSync(
      resolve(process.cwd(), '.env.production.example'),
      'utf8',
    )
    const sharedExample = readFileSync(
      resolve(process.cwd(), '.env.example'),
      'utf8',
    )
    expect(productionExample).toMatch(/^COUNTY_HUNTER_ENABLED=false$/m)
    expect(productionExample).toMatch(
      /^COUNTY_HUNTER_DISCOVERY_ENABLED=false$/m,
    )
    expect(productionExample).not.toMatch(
      /^(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|DATABASE_URL)=/m,
    )
    expect(productionExample).toMatch(
      /^COUNTY_HUNTER_SUPABASE_SECRET_KEY=$/m,
    )
    expect(productionExample).toMatch(
      /^COUNTY_HUNTER_RATE_LIMIT_BACKEND=postgres$/m,
    )
    expect(productionExample).toMatch(
      /^COUNTY_HUNTER_RATE_LIMIT_SECRET=$/m,
    )
    expect(sharedExample).not.toMatch(
      /^NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=[a-f0-9]{32}$/im,
    )
  })

  it('enforces the kill switch in both collection routes and displays pilot notices', () => {
    const discoveryRoute = readFileSync(
      resolve(process.cwd(), 'app/api/county-hunter/discovery/route.ts'),
      'utf8',
    )
    const replayRoute = readFileSync(
      resolve(
        process.cwd(),
        'app/api/county-hunter/discovery/replay/route.ts',
      ),
      'utf8',
    )
    const discoveryPage = readFileSync(
      resolve(process.cwd(), 'app/county-hunter/discovery/page.tsx'),
      'utf8',
    )
    expect(discoveryRoute).toContain(
      'requireCountyHunterDiscoveryEnabled()',
    )
    expect(replayRoute).toContain(
      'requireCountyHunterDiscoveryEnabled()',
    )
    expect(discoveryPage).toContain('Collection disabled')
    expect(discoveryPage).toContain('removed_from_current_source')
    expect(discoveryPage).toContain('not market valuations')
    expect(discoveryPage).toContain('title')
    expect(discoveryPage).toContain('legal or')
    expect(discoveryPage).toContain('Last collection')
    expect(discoveryPage).toContain('Adapter:')
  })
})
