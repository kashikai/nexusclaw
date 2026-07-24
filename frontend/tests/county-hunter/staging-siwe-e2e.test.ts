import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = () =>
  readFileSync(
    join(process.cwd(), 'scripts', 'validate-county-hunter-siwe-e2e.mjs'),
    'utf8',
  )

describe('County Hunter real staging SIWE E2E harness', () => {
  it('is locked to the local HTTPS app and confirmed staging fixtures', () => {
    const source = script()
    expect(source).toContain("const APP_ORIGIN = 'https://localhost:3000'")
    expect(source).toContain("COUNTY_HUNTER_STAGING_CONFIRM === 'STAGING_ONLY'")
    expect(source).toContain('STAGING_SUPABASE_PROJECT_MISMATCH')
    expect(source).toContain('STAGING_TENANTS_MUST_DIFFER')
  })

  it('reuses all four disposable wallets without generating or printing secrets', () => {
    const source = script()
    for (const variable of [
      'COUNTY_HUNTER_TEST_VIEWER_A',
      'COUNTY_HUNTER_TEST_MANAGER_A',
      'COUNTY_HUNTER_TEST_ADMIN_A',
      'COUNTY_HUNTER_TEST_ADMIN_B',
    ]) {
      expect(source).toContain(variable)
    }
    expect(source).not.toContain('generatePrivateKey')
    expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(source).not.toMatch(/console\.(?:log|error)\([^)]*(?:privateKey|signature|message|cookie|userId|organizationId)/)
  })

  it('covers real role authorization, tenant isolation, cleanup, replay and SIWE failures', () => {
    const source = script()
    for (const evidence of [
      'viewer-a source creation blocked',
      'viewer-a county update blocked',
      'manager-a source creation',
      'manager-a source update',
      'manager-a bootstrap blocked',
      'admin-b tenant-a read blocked',
      'admin-b tenant-a update blocked',
      'temporary manager source removed',
      'SIWE rejects nonce replay',
      'SIWE rejects invalid signature',
      "label: 'wrong domain'",
      "label: 'URI without trailing slash'",
      "label: 'URI with unauthorized path'",
      "label: 'wrong chain'",
      "label: 'expired challenge'",
      "label: 'signature from another wallet'",
      'report(`SIWE rejects ${testCase.label}`)',
    ]) {
      expect(source).toContain(evidence)
    }
  })
})
