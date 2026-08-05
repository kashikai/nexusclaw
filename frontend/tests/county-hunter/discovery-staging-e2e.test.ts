import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = readFileSync(
  resolve(process.cwd(), 'scripts/validate-county-hunter-discovery-e2e.mjs'),
  'utf8',
)

describe('County Hunter discovery staging E2E harness', () => {
  it('uses all four real Web3 profiles and rejects administrative keys', () => {
    for (const profile of ['VIEWER_A', 'MANAGER_A', 'ADMIN_A', 'ADMIN_B']) {
      expect(script).toContain(`COUNTY_HUNTER_TEST_${profile}_PRIVATE_KEY`)
      expect(script).toContain(`COUNTY_HUNTER_TEST_${profile}_ADDRESS`)
    }
    expect(script).toContain("process.env.SUPABASE_SERVICE_ROLE_KEY === undefined")
    expect(script).toContain("process.env.SUPABASE_SECRET_KEY === undefined")
    expect(script).not.toMatch(/environment\.SUPABASE_SERVICE_ROLE_KEY/)
    expect(script).not.toMatch(/environment\.SUPABASE_SECRET_KEY/)
    expect(script).not.toContain('SUPABASE_SERVICE_ROLE_KEY,')
    expect(script).not.toContain('SUPABASE_SECRET_KEY,')
  })

  it('checks idempotency, snapshots, role boundaries and tenant isolation', () => {
    expect(script).toContain('SECOND_RUN_NOT_IDEMPOTENT')
    expect(script).toContain('SNAPSHOT_BODY_EXPOSED')
    expect(script).toContain('VIEWER_DISCOVERY_NOT_BLOCKED')
    expect(script).toContain('MANAGER_DISCOVERY_NOT_BLOCKED')
    expect(script).toContain('ADMIN_B_RUN_ISOLATION_INVALID')
    expect(script).toContain('SNAPSHOT_REPLAY_NOT_IDEMPOTENT')
    expect(script).toContain('SNAPSHOT_REPLAY_MUTATED_SOURCE')
    expect(script).toContain('MISSING_SNAPSHOT_REPLAY_NOT_BLOCKED')
    expect(script).toContain('VIEWER_REPLAY_NOT_BLOCKED')
    expect(script).toContain('MANAGER_REPLAY_NOT_BLOCKED')
    expect(script).toContain('ADMIN_B_REPLAY_CROSS_TENANT_NOT_BLOCKED')
    expect(script).toContain('COUNTY HUNTER DISCOVERY STAGING E2E PASSED')
  })

  it('never prints wallet, signature, cookie, token or identifiers', () => {
    expect(script).not.toMatch(/console\.(?:log|error)\([^)]*(?:privateKey|signature|cookie|userId|organizationId|address)/)
    expect(script).not.toContain('console.log(environment')
    expect(script).not.toContain('console.error(error')
  })
})
