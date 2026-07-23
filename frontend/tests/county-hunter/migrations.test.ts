import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = (name: string) => readFileSync(resolve(process.cwd(), '..', 'supabase', 'migrations', name), 'utf8')
const stagingTest = () => readFileSync(resolve(process.cwd(), '..', 'supabase', 'tests', 'county_hunter_rls_test.sql'), 'utf8')
const stagingRunner = () => readFileSync(resolve(process.cwd(), '..', 'scripts', 'validate-county-hunter-staging.ps1'), 'utf8')

describe('County Hunter additive migrations', () => {
  it('creates only prefixed domain tables', () => {
    const sql = migration('202607230001_county_hunter_foundation.sql')
    const createdTables = [...sql.matchAll(/create table if not exists public\.([a-z0-9_]+)/g)].map((match) => match[1])
    expect(createdTables.length).toBeGreaterThan(10)
    expect(createdTables.every((name) => name.startsWith('county_hunter_'))).toBe(true)
  })

  it('enables RLS on every foundation table', () => {
    const foundation = migration('202607230001_county_hunter_foundation.sql')
    const rls = migration('202607230002_county_hunter_rls.sql')
    const tables = [...foundation.matchAll(/create table if not exists public\.([a-z0-9_]+)/g)].map((match) => match[1])
    for (const table of tables) expect(rls).toContain(`'${table}'`)
    expect(rls).toContain('enable row level security')
  })

  it('moves permissions to active memberships and removes the bootstrap tenant argument', () => {
    const sql = migration('202607230004_county_hunter_auth_hardening.sql')
    expect(sql).toContain('county_hunter_memberships')
    expect(sql).toContain('membership.user_id = (select auth.uid())')
    expect(sql).toContain('membership.organization_id = (select public.county_hunter_current_organization_id())')
    expect(sql).toContain('create function public.county_hunter_seed_georgia()')
    expect(sql).not.toContain('service_role')
  })

  it('seeds exactly the approved counties without source URLs', () => {
    const sql = migration('202607230004_county_hunter_auth_hardening.sql')
    for (const county of ['Fulton County', 'Cobb County', 'Chatham County', 'Greene County', 'Bryan County', 'Camden County']) {
      expect(sql).toContain(county)
    }
    expect(sql).not.toMatch(/https?:\/\//)
    expect(sql).toContain('pending_manual_configuration')
    expect(sql).toContain("'bootstrap'")
  })

  it('locks SIWE hashes behind narrow anonymous RPCs without table or service-role access', () => {
    const sql = migration('202607230005_county_hunter_wallet_auth.sql')
    expect(sql).toContain('county_hunter_auth_challenges')
    expect(sql).toContain('nonce_hash')
    expect(sql).toContain('force row level security')
    expect(sql).toContain('revoke all on public.county_hunter_auth_challenges from public, anon, authenticated')
    expect(sql).toContain('security definer')
    expect(sql).toContain('create or replace function public.county_hunter_issue_auth_challenge')
    expect(sql).toContain('create or replace function public.county_hunter_consume_auth_challenge')
    expect(sql).toContain('pg_advisory_xact_lock')
    expect(sql).toContain('grant execute on function public.county_hunter_issue_auth_challenge')
    expect(sql).toContain('grant execute on function public.county_hunter_consume_auth_challenge')
    expect(sql).not.toContain('service_role')
    expect(sql).toContain('alter function public.county_hunter_write_audit_log() set search_path = pg_catalog, public')
  })

  it('ships rollback-only cross-tenant staging checks for two organizations and four users', () => {
    const sql = stagingTest()
    expect(sql).toContain('viewer_a')
    expect(sql).toContain('manager_a')
    expect(sql).toContain('admin_b')
    expect(sql).toContain('admin_a')
    expect(sql).toContain('cross-tenant SELECT')
    expect(sql).toContain('payload organization_id')
    expect(sql).toContain('inactive membership')
    expect(sql).toContain('request.headers')
    expect(sql).toContain('organization_id was altered by update')
    expect(sql).toContain('rollback;')
  })

  it('can apply guarded staging migrations before disposable wallet provisioning', () => {
    const script = stagingRunner()
    expect(script).toContain('[switch]$MigrationsOnly')
    expect(script).toContain('COUNTY_HUNTER_STAGING_CONFIRM')
    expect(script).toContain('The database host/user does not match COUNTY_HUNTER_STAGING_PROJECT_REF')
    expect(script).toContain("if ($MigrationsOnly)")
    expect(script).toContain('RLS fixtures were not requested')
  })
})
