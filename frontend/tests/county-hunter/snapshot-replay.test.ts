import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(...segments: string[]) {
  return readFileSync(resolve(process.cwd(), ...segments), 'utf8')
}

const replay = source('features', 'county-hunter', 'discovery', 'replay.ts')
const route = source('app', 'api', 'county-hunter', 'discovery', 'replay', 'route.ts')
const migration = source(
  '..',
  'supabase',
  'migrations',
  '20260726174825_county_hunter_snapshot_replay.sql',
)

describe('County Hunter stored snapshot replay', () => {
  it('is a server-only Admin operation with a minimal request body', () => {
    expect(replay).toContain("import 'server-only'")
    expect(route).toContain("requireCountyHunterPermission(request, 'county_hunter.admin')")
    expect(route).toContain("assertAllowedKeys(body, ['snapshotId'])")
    expect(route).toContain('isUuid(body.snapshotId)')
    expect(route).toContain("export const runtime = 'nodejs'")
  })

  it('never fetches the official source or mutates canonical snapshots/properties', () => {
    expect(replay).not.toContain('fetchDiscoveryResourceSafely')
    expect(replay).not.toContain("'./secure-fetch'")
    expect(replay).not.toMatch(/\bfetch\s*\(/)
    expect(replay).not.toContain('insertSnapshot')
    expect(replay).not.toContain('county_hunter_discovery_snapshots')
    expect(replay).not.toContain('county_hunter_properties')
    expect(replay).not.toContain('normalizeProperties')
  })

  it('verifies stored bytes, uses source-run records and fails closed', () => {
    expect(replay).toContain("createHash('sha256')")
    expect(replay).toContain('decoded.byteLength !== start.snapshot_content_length')
    expect(replay).toContain('hash !== start.source_document_hash')
    expect(replay).toContain('return Uint8Array.from(decoded)')
    expect(replay).toContain("run_id: `eq.${start.source_run_id}`")
    expect(replay).toContain("status: 'failed'")
    expect(replay).toContain("CountyHunterHttpError('The replay snapshot is unavailable.', 404)")
    expect(replay).not.toContain('console.')
  })

  it('adds a tenant-bound replay lineage and a narrowly granted RPC', () => {
    expect(migration).toContain("run_type in ('official_fetch', 'snapshot_replay')")
    expect(migration).toContain('foreign key (organization_id, source_run_id)')
    expect(migration).toContain('snapshot.organization_id = calling_organization')
    expect(migration).toContain("'county_hunter.admin' = any(membership.permissions)")
    expect(migration).toContain("source.adapter_key = 'gwinnett-tax-sales'")
    expect(migration).toContain('selected_snapshot.content_base64')
    expect(migration).toContain('security definer')
    expect(migration).toContain('set search_path = pg_catalog, public')
    expect(migration).toContain(
      'revoke all on function public.county_hunter_begin_snapshot_replay',
    )
    expect(migration).toContain(
      'grant execute on function public.county_hunter_begin_snapshot_replay',
    )
    expect(migration).not.toContain('service_role')
  })
})
