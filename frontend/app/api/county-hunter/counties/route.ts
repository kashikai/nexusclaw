import { NextResponse } from 'next/server'
import type { CountyHunterCounty } from '@/features/county-hunter/types'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { countyHunterRest, organizationFilter } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT } from '@/features/county-hunter/server/selects'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    const query = new URLSearchParams({
      select: COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT,
      organization_id: `eq.${context.organizationId}`,
      order: 'name.asc',
    })
    const counties = await countyHunterRest<CountyHunterCounty[]>(context, 'county_hunter_counties', query.toString())
    return NextResponse.json(counties)
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function HEAD(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    await countyHunterRest(context, 'county_hunter_counties', organizationFilter(context.organizationId), {
      method: 'HEAD',
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
