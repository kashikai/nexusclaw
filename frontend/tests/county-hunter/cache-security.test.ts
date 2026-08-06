import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  applyCountyHunterNoStore,
  COUNTY_HUNTER_NO_STORE_HEADERS,
} from '../../features/county-hunter/server/cache-control'

const root = process.cwd()
const readSource = (...segments: string[]) =>
  readFileSync(join(root, ...segments), 'utf8')

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return routeFiles(path)
    return entry.name === 'route.ts' ? [path] : []
  })
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : []
  })
}

describe('County Hunter authenticated cache isolation', () => {
  it('applies the complete private no-store policy to responses that set cookies', () => {
    const response = applyCountyHunterNoStore(
      new Response(JSON.stringify({ authenticated: true }), {
        headers: { 'Set-Cookie': 'sb-test-auth-token=server-issued-value; HttpOnly' },
      }),
    )

    expect(Object.fromEntries(response.headers.entries())).toMatchObject({
      'cache-control': 'private, no-store',
      expires: '0',
      pragma: 'no-cache',
    })
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
  })

  it('keeps the canonical policy stable for middleware and route handlers', () => {
    expect(COUNTY_HUNTER_NO_STORE_HEADERS).toEqual({
      'Cache-Control': 'private, no-store',
      Pragma: 'no-cache',
      Expires: '0',
    })

    const middleware = readSource('middleware.ts')
    expect(middleware).toContain("matcher: ['/county-hunter/:path*', '/api/county-hunter/:path*']")
    expect(middleware).toContain('applyCountyHunterNoStore(response)')
  })

  it('prevents ISR for every County Hunter page and dynamic caching for every API route', () => {
    const layout = readSource('app', 'county-hunter', 'layout.tsx')
    expect(layout).toContain("export const dynamic = 'force-dynamic'")
    expect(layout).not.toMatch(/export const revalidate\s*=\s*[1-9]/)

    const apiRoutes = routeFiles(join(root, 'app', 'api', 'county-hunter'))
    expect(apiRoutes.length).toBeGreaterThan(0)
    apiRoutes.forEach((file) => {
      const source = readFileSync(file, 'utf8')
      expect(source, file).toContain("export const dynamic = 'force-dynamic'")
      expect(source, file).not.toMatch(/export const revalidate\s*=\s*[1-9]/)
    })
  })

  it('makes login, refresh, logout and error responses non-cacheable without returning tokens', () => {
    const challenge = readSource('app', 'api', 'county-hunter', 'auth', 'challenge', 'route.ts')
    const login = readSource('app', 'api', 'county-hunter', 'auth', 'verify', 'route.ts')
    const refresh = readSource('app', 'api', 'county-hunter', 'auth', 'session', 'route.ts')
    const logout = readSource('app', 'api', 'county-hunter', 'auth', 'logout', 'route.ts')
    const routeClient = readSource('features', 'county-hunter', 'server', 'route-supabase.ts')
    const errors = readSource('features', 'county-hunter', 'server', 'responses.ts')

    expect(challenge).toContain('COUNTY_HUNTER_NO_STORE_HEADERS')
    expect(login).toContain('routeClient.applyCookies(response)')
    expect(refresh).toContain('routeClient.applyCookies(response)')
    expect(logout).toContain('clearCountyHunterSupabaseCookies')
    expect(routeClient).toContain('applyCountyHunterNoStore(response)')
    expect(errors).toContain('COUNTY_HUNTER_NO_STORE_HEADERS')

    ;[challenge, login, refresh, logout].forEach((source) => {
      expect(source).not.toMatch(
        /access_token|refresh_token|SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY/i,
      )
    })
  })

  it('keeps every administrative key out of browser-reachable County Hunter sources', () => {
    const browserSources = [
      ...sourceFiles(join(root, 'app', 'api', 'county-hunter')),
      ...sourceFiles(join(root, 'app', 'county-hunter')),
      ...sourceFiles(join(root, 'features', 'county-hunter', 'client')),
      join(root, 'middleware.ts'),
    ]

    browserSources.forEach((file) => {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/\bSUPABASE_SERVICE_ROLE_KEY\b/)
      expect(source, file).not.toMatch(/\bSUPABASE_SECRET_KEY\b/)
      expect(source, file).not.toContain('COUNTY_HUNTER_SUPABASE_SECRET_KEY')
      expect(source, file).not.toContain('COUNTY_HUNTER_RATE_LIMIT_SECRET')
    })

    const serverSources = sourceFiles(join(root, 'features', 'county-hunter', 'server'))
    serverSources.forEach((file) => {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/\bSUPABASE_SERVICE_ROLE_KEY\b/)
      if (!file.endsWith('admin-supabase.ts')) {
        expect(source, file).not.toMatch(/\bSUPABASE_SECRET_KEY\b/)
      }
    })

    expect(readSource('scripts', 'lib', 'supabase-admin-key.mjs')).toContain(
      'SUPABASE_SERVICE_ROLE_KEY',
    )
    expect(readSource('scripts', 'lib', 'supabase-admin-key.mjs')).toContain(
      'SUPABASE_SECRET_KEY',
    )
    expect(readSource('features', 'county-hunter', 'server', 'admin-supabase.ts')).toContain(
      "import 'server-only'",
    )
    expect(readSource('features', 'county-hunter', 'server', 'postgres-rate-limit.ts')).toContain(
      "import 'server-only'",
    )
  })
})
