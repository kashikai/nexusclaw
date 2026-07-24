import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COUNTY_HUNTER_AUCTION_WITH_COUNTY_SELECT,
  COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT,
  COUNTY_HUNTER_PROPERTY_WITH_RELATIONS_SELECT,
} from '../../features/county-hunter/server/selects'

const apiRoot = resolve(process.cwd(), 'app', 'api', 'county-hunter')
const foundation = () =>
  readFileSync(
    resolve(process.cwd(), '..', 'supabase', 'migrations', '202607230001_county_hunter_foundation.sql'),
    'utf8',
  )

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return routeFiles(path)
    return entry.name === 'route.ts' ? [path] : []
  })
}

describe('County Hunter PostgREST relationship selection', () => {
  it('uses the composite tenant foreign keys to disambiguate embedded resources', () => {
    expect(COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT).toContain(
      'county_hunter_states!county_hunter_counties_tenant_state_fk',
    )
    expect(COUNTY_HUNTER_AUCTION_WITH_COUNTY_SELECT).toContain(
      'county_hunter_counties!county_hunter_auctions_tenant_county_fk',
    )
    expect(COUNTY_HUNTER_PROPERTY_WITH_RELATIONS_SELECT).toContain(
      'county_hunter_counties!county_hunter_properties_tenant_county_fk',
    )
    expect(COUNTY_HUNTER_PROPERTY_WITH_RELATIONS_SELECT).toContain(
      'county_hunter_auctions!county_hunter_properties_tenant_auction_fk',
    )
  })

  it('keeps every referenced relationship hint backed by the additive foundation migration', () => {
    const sql = foundation()
    for (const constraint of [
      'county_hunter_counties_tenant_state_fk',
      'county_hunter_auctions_tenant_county_fk',
      'county_hunter_properties_tenant_county_fk',
      'county_hunter_properties_tenant_auction_fk',
    ]) {
      expect(sql).toContain(`constraint ${constraint} foreign key`)
    }
  })

  it('does not leave ambiguous embedded County Hunter relationships in API routes', () => {
    for (const file of routeFiles(apiRoot)) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/county_hunter_states\(/)
      expect(source, file).not.toMatch(/county_hunter_counties\(/)
      expect(source, file).not.toMatch(/county_hunter_auctions\(/)
    }
  })
})
