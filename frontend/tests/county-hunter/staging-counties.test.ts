import { describe, expect, it } from 'vitest'
import {
  CountyDatasetValidationError,
  REQUIRED_STAGING_COUNTIES,
  validateApplicationCountiesAgainstAdmin,
} from '../../scripts/lib/county-hunter-staging-counties.mjs'

const tenantA = 'tenant-a'
const tenantB = 'tenant-b'

type CountyRow = {
  id: string
  organization_id: string
  state_id: string
  name: string
  slug: string
}

function rows(organizationId = tenantA): CountyRow[] {
  return REQUIRED_STAGING_COUNTIES.map((county, index) => ({
    id: `county-${index}`,
    organization_id: organizationId,
    state_id: `${organizationId}-georgia`,
    ...county,
  }))
}

function validate(applicationRows = rows(), adminRows = rows()) {
  return validateApplicationCountiesAgainstAdmin({
    applicationRows,
    adminRows,
    expectedOrganizationId: tenantA,
    forbiddenOrganizationId: tenantB,
  })
}

function errorCode(run: () => unknown) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(CountyDatasetValidationError)
    return (error as CountyDatasetValidationError & { code: string }).code
  }
  throw new Error('Expected county dataset validation to fail')
}

describe('County Hunter staging county dataset validation', () => {
  it('accepts an additional authorized county when application and admin scopes agree', () => {
    const additional = {
      id: 'county-additional',
      organization_id: tenantA,
      state_id: `${tenantA}-georgia`,
      name: 'Additional County',
      slug: 'additional-county-ga',
    }
    expect(validate([...rows(), additional], [...rows(), additional])).toEqual({
      applicationCount: REQUIRED_STAGING_COUNTIES.length + 1,
      adminCount: REQUIRED_STAGING_COUNTIES.length + 1,
    })
  })

  it.each([
    ['Gwinnett', 'gwinnett-county-ga'],
    ['Greene', 'greene-county-ga'],
  ])('rejects the dataset when %s County is absent', (_label, missingSlug) => {
    const withoutCounty = rows().filter((row) => row.slug !== missingSlug)
    expect(errorCode(() => validate(withoutCounty, withoutCounty))).toBe('REQUIRED_COUNTY_MISSING')
  })

  it('rejects a county from Tenant B', () => {
    const leaked = [{ ...rows()[0], organization_id: tenantB }, ...rows().slice(1)]
    expect(errorCode(() => validate(leaked))).toBe('COUNTY_FORBIDDEN_TENANT_EXPOSED')
  })

  it('rejects a duplicate logical county key', () => {
    const duplicate = { ...rows()[0], id: 'duplicate-id' }
    expect(errorCode(() => validate([...rows(), duplicate]))).toBe('COUNTY_LOGICAL_DUPLICATE')
  })

  it('keeps Viewer A isolated from Tenant B while matching the admin scope', () => {
    const result = validate()
    expect(result.applicationCount).toBe(result.adminCount)
    expect(rows().every((row) => row.organization_id !== tenantB)).toBe(true)
  })
})
