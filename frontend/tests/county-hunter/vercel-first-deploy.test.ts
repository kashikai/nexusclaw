import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { GET as healthCheck } from '../../app/api/health/route'

const repositoryRoot = resolve(process.cwd(), '..')
const deploymentGuide = resolve(
  repositoryRoot,
  'docs/county-hunter/VERCEL_FIRST_DEPLOY_OFF.md',
)

const firstDeployRequired = [
  'NEXT_PUBLIC_APP_ORIGIN',
  'NEXT_PUBLIC_COUNTY_HUNTER_ENABLED',
  'COUNTY_HUNTER_ENABLED',
  'COUNTY_HUNTER_DISCOVERY_ENABLED',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  'NEXT_PUBLIC_BASE_RPC_URL',
]

const enableLater = [
  'NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL',
  'NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY',
  'COUNTY_HUNTER_SUPABASE_SECRET_KEY',
  'COUNTY_HUNTER_RATE_LIMIT_BACKEND',
  'COUNTY_HUNTER_RATE_LIMIT_SECRET',
  'COUNTY_HUNTER_AUTH_ORIGIN',
  'COUNTY_HUNTER_PRODUCTION_CONFIRM',
  'COUNTY_HUNTER_PRODUCTION_PROJECT_REF',
  'COUNTY_HUNTER_BASE_RPC_URL',
]

describe('County Hunter Vercel first deploy with flags off', () => {
  it('has one Vercel configuration under the proven frontend root', () => {
    expect(existsSync(resolve(repositoryRoot, 'vercel.json'))).toBe(false)
    const configuration = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as Record<string, unknown>

    expect(configuration).toEqual({
      $schema: 'https://openapi.vercel.sh/vercel.json',
      framework: 'nextjs',
      installCommand: 'npm ci',
    })
    expect(configuration).not.toHaveProperty('builds')
    expect(configuration).not.toHaveProperty('routes')
    expect(configuration).not.toHaveProperty('outputDirectory')
  })

  it('pins the supported Node major and preserves Next autodetection', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      engines?: { node?: string }
      scripts?: { build?: string }
    }

    expect(packageJson.engines?.node).toBe('24.x')
    expect(packageJson.scripts?.build).toBe('next build')
  })

  it('returns a minimal public no-store health response', async () => {
    const response = await healthCheck()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('keeps the health route independent from environment and services', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/api/health/route.ts'),
      'utf8',
    )

    expect(source).not.toMatch(
      /process\.env|Supabase|secret|rate.?limit|Discovery|session|cookie|fetch\(/i,
    )
  })

  it('excludes local environments and backups from Vercel uploads', () => {
    const ignore = readFileSync(
      resolve(process.cwd(), '.vercelignore'),
      'utf8',
    )

    for (const pattern of ['.env', '.env.*', '*.local', '*.bak', '*.backup']) {
      expect(ignore).toContain(pattern)
    }
  })

  it('fails County Hunter page and API requests before Supabase when off', () => {
    const middleware = readFileSync(
      resolve(process.cwd(), 'middleware.ts'),
      'utf8',
    )
    const countyLayout = readFileSync(
      resolve(process.cwd(), 'app/county-hunter/layout.tsx'),
      'utf8',
    )

    expect(middleware).toContain("status: 404")
    expect(middleware).toContain("'/api/county-hunter/:path*'")
    expect(middleware.indexOf('if (!isCountyHunterServerEnabled())')).toBeLessThan(
      middleware.indexOf('readCountyHunterPublicSupabaseConfig()'),
    )
    expect(countyLayout).toContain(
      'if (!isCountyHunterServerEnabled()) notFound()',
    )
  })

  it('keeps Discovery and replay behind the independent kill switch', () => {
    for (const path of [
      'app/api/county-hunter/discovery/route.ts',
      'app/api/county-hunter/discovery/replay/route.ts',
    ]) {
      expect(readFileSync(resolve(process.cwd(), path), 'utf8')).toContain(
        'requireCountyHunterDiscoveryEnabled()',
      )
    }
  })

  it('hides County Hunter navigation when its public flag is false', () => {
    const topNav = readFileSync(
      resolve(process.cwd(), 'components/layout/TopNav.tsx'),
      'utf8',
    )

    expect(topNav).toContain(
      "process.env.NEXT_PUBLIC_COUNTY_HUNTER_ENABLED === 'true'",
    )
    expect(topNav).toContain(
      "...(COUNTY_HUNTER_ENABLED ? [{ href: '/county-hunter'",
    )
  })

  it('enforces the production runtime boundary from the root layout', () => {
    const layout = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8')

    expect(layout).toContain('assertCountyHunterVercelRuntimeBoundary()')
  })

  it('documents the exact first-deploy and later-enable matrices', () => {
    const guide = readFileSync(deploymentGuide, 'utf8')

    for (const variable of firstDeployRequired) {
      expect(guide, variable).toContain(`\`${variable}\``)
    }
    for (const variable of enableLater) {
      expect(guide, variable).toContain(`\`${variable}\``)
    }
    expect(guide).toContain('COUNTY_HUNTER_PRODUCTION_DB_URL')
    expect(guide).toContain('MIGRATION_ONLY')
  })

  it('keeps the example configuration explicitly disabled', () => {
    const example = readFileSync(
      resolve(process.cwd(), '.env.production.example'),
      'utf8',
    )

    expect(example).toMatch(
      /^NEXT_PUBLIC_APP_ORIGIN=https:\/\/county-hunter\.nexusclaw\.tech$/m,
    )
    expect(example).toMatch(/^NEXT_PUBLIC_COUNTY_HUNTER_ENABLED=false$/m)
    expect(example).toMatch(/^COUNTY_HUNTER_ENABLED=false$/m)
    expect(example).toMatch(/^COUNTY_HUNTER_DISCOVERY_ENABLED=false$/m)
  })

  it('keeps the Hobby WAF rule documented but outside repository config', () => {
    const guide = readFileSync(deploymentGuide, 'utf8')
    const vercel = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')

    expect(guide).toContain('60 requests / 300 seconds / IP')
    expect(guide).toContain('HTTP 429')
    expect(guide).toContain('NOT CONFIGURED')
    expect(vercel).not.toMatch(/waf|rate.?limit/i)
  })
})
