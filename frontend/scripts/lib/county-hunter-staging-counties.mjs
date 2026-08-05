export const REQUIRED_STAGING_COUNTIES = Object.freeze([
  Object.freeze({ name: 'Fulton County', slug: 'fulton-county-ga' }),
  Object.freeze({ name: 'Cobb County', slug: 'cobb-county-ga' }),
  Object.freeze({ name: 'Chatham County', slug: 'chatham-county-ga' }),
  Object.freeze({ name: 'Greene County', slug: 'greene-county-ga' }),
  Object.freeze({ name: 'Bryan County', slug: 'bryan-county-ga' }),
  Object.freeze({ name: 'Camden County', slug: 'camden-county-ga' }),
  Object.freeze({ name: 'Gwinnett County', slug: 'gwinnett-county-ga' }),
])

export class CountyDatasetValidationError extends Error {
  constructor(code) {
    super(code)
    this.name = 'CountyDatasetValidationError'
    this.code = code
  }
}

function assertDataset(condition, code) {
  if (!condition) throw new CountyDatasetValidationError(code)
}

function logicalCountyKey(row) {
  assertDataset(typeof row?.organization_id === 'string', 'COUNTY_ORGANIZATION_INVALID')
  assertDataset(typeof row?.state_id === 'string', 'COUNTY_STATE_INVALID')
  assertDataset(typeof row?.slug === 'string' && row.slug.length > 0, 'COUNTY_SLUG_INVALID')
  return `${row.organization_id}:${row.state_id}:${row.slug}`
}

function validateTenantDataset(rows, expectedOrganizationId, forbiddenOrganizationId) {
  assertDataset(Array.isArray(rows), 'COUNTY_RESPONSE_INVALID')

  const logicalKeys = new Set()
  const countiesBySlug = new Map()
  for (const row of rows) {
    assertDataset(
      !forbiddenOrganizationId || row?.organization_id !== forbiddenOrganizationId,
      'COUNTY_FORBIDDEN_TENANT_EXPOSED',
    )
    assertDataset(row?.organization_id === expectedOrganizationId, 'COUNTY_TENANT_MISMATCH')

    const logicalKey = logicalCountyKey(row)
    assertDataset(!logicalKeys.has(logicalKey), 'COUNTY_LOGICAL_DUPLICATE')
    logicalKeys.add(logicalKey)
    countiesBySlug.set(row.slug, row)
  }

  for (const expectedCounty of REQUIRED_STAGING_COUNTIES) {
    const county = countiesBySlug.get(expectedCounty.slug)
    assertDataset(county?.name === expectedCounty.name, 'REQUIRED_COUNTY_MISSING')
  }

  return { logicalKeys, count: rows.length }
}

export function validateApplicationCountiesAgainstAdmin({
  applicationRows,
  adminRows,
  expectedOrganizationId,
  forbiddenOrganizationId,
}) {
  const application = validateTenantDataset(
    applicationRows,
    expectedOrganizationId,
    forbiddenOrganizationId,
  )
  const admin = validateTenantDataset(
    adminRows,
    expectedOrganizationId,
    forbiddenOrganizationId,
  )

  assertDataset(application.count === admin.count, 'COUNTY_ADMIN_SCOPE_MISMATCH')
  assertDataset(
    [...application.logicalKeys].every((logicalKey) => admin.logicalKeys.has(logicalKey)),
    'COUNTY_ADMIN_SCOPE_MISMATCH',
  )

  return {
    applicationCount: application.count,
    adminCount: admin.count,
  }
}
