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
const runner = readFileSync(
  resolve(
    process.cwd(),
    '..',
    'scripts',
    'validate-county-hunter-phase2-rollback.ps1',
  ),
  'utf8',
)
const disposableFixture = readFileSync(
  resolve(
    process.cwd(),
    '..',
    'supabase',
    'tests',
    'county_hunter_disposable_phase2_fixture.sql',
  ),
  'utf8',
)
const postRollback = readFileSync(
  resolve(
    process.cwd(),
    '..',
    'supabase',
    'tests',
    'county_hunter_disposable_post_rollback.sql',
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

  it('runs only against a named loopback disposable database', () => {
    expect(runner).toContain(
      "$DatabaseHost -notin @('127.0.0.1', 'localhost')",
    )
    expect(runner).toContain(
      "'^county_hunter_disposable_[a-z0-9_]+$'",
    )
    expect(runner).toContain(
      "current_database() !~ '^county_hunter_disposable_'",
    )
    expect(runner).not.toMatch(
      /COUNTY_HUNTER_STAGING|SUPABASE_SERVICE_ROLE|DATABASE_URL/,
    )
  })

  it('backs up, rolls back, reapplies and removes the disposable database', () => {
    expect(runner).toContain('--format custom')
    expect(runner).toContain('& $tools.pg_restore --list')
    expect(runner).toContain(
      "set county_hunter.allow_destructive_phase2_rollback = 'YES'",
    )
    expect(runner).toContain('Reapplying Phase 2 migration')
    expect(runner).toContain('Repeating the complete RLS matrix after reapply')
    expect(runner).toContain('& $tools.dropdb')
  })

  it('persists a 25-record discovery and 25-unchanged replay fixture', () => {
    expect(disposableFixture).toContain('from generate_series(1, 25)')
    expect(disposableFixture).toContain('properties_found = 25')
    expect(disposableFixture).toContain("change_type = 'unchanged'")
    expect(disposableFixture).toContain(
      'Disposable replay did not persist 25 unchanged records',
    )
  })

  it('verifies Phase 2 removal and Phase 1 preservation after rollback', () => {
    expect(postRollback).toContain(
      "to_regclass('public.county_hunter_discovery_snapshots') is not null",
    )
    expect(postRollback).toContain(
      "to_regprocedure('public.county_hunter_seed_georgia()') is null",
    )
    expect(postRollback).toContain(
      'Permanent disposable memberships were not preserved',
    )
    expect(postRollback).toContain(
      'Phase 1 cross-tenant SELECT failed after rollback',
    )
  })
})
