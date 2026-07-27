import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const rollback = readFileSync(
  resolve(
    process.cwd(),
    '..',
    'supabase',
    'rollback',
    'county_hunter_phase2.sql',
  ),
  'utf8',
)

function position(fragment: string) {
  const index = rollback.indexOf(fragment)
  expect(index).toBeGreaterThanOrEqual(0)
  return index
}

describe('County Hunter Phase 2 destructive rollback', () => {
  it('fails closed without explicit disposable-database confirmation', () => {
    expect(rollback).toContain(
      "current_setting('county_hunter.allow_destructive_phase2_rollback', true) <> 'YES'",
    )
    expect(position('Explicit disposable-database rollback confirmation')).toBeLessThan(
      position('drop function public.county_hunter_begin_snapshot_replay'),
    )
    expect(position('Phase 2 rollback is blocked while discovery locks exist')).toBeLessThan(
      position('drop table public.county_hunter_discovery_locks'),
    )
  })

  it('revokes RPCs and removes dependent objects before their parents', () => {
    expect(position('revoke all on function public.county_hunter_begin_snapshot_replay')).toBeLessThan(
      position('drop function public.county_hunter_begin_snapshot_replay'),
    )
    expect(position('drop constraint county_hunter_runs_landing_snapshot_fk')).toBeLessThan(
      position('drop table public.county_hunter_discovery_snapshots'),
    )
    expect(position('drop table public.county_hunter_discovery_changes')).toBeLessThan(
      position('delete from public.county_hunter_discovery_runs'),
    )
    expect(position('delete from public.county_hunter_discovery_runs')).toBeLessThan(
      position('drop column adapter_version'),
    )
  })

  it('restores Phase 1 policies and preserves foundation tables', () => {
    expect(rollback).toContain('create policy county_hunter_sources_insert')
    expect(rollback).toContain('create policy county_hunter_sources_update')
    expect(rollback).toContain('create policy county_hunter_discovery_runs_insert')
    expect(rollback).toContain('create policy county_hunter_discovery_runs_update')
    expect(rollback).toContain(
      "check (status in ('queued', 'running', 'completed', 'partial', 'failed'))",
    )
    expect(rollback).not.toContain('drop table public.county_hunter_counties')
    expect(rollback).not.toContain('drop table public.county_hunter_memberships')
    expect(rollback).not.toContain(' cascade;')
  })
})
