import { NextResponse } from 'next/server'
import type { CountyHunterCounty } from '@/features/county-hunter/types'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { parseCountyPatch } from '@/features/county-hunter/server/payloads'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { CountyHunterValidationError, isUuid } from '@/features/county-hunter/validation'
import { requireCountyHunterResource } from '@/features/county-hunter/server/resource'
import { COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT } from '@/features/county-hunter/server/selects'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { countyId: string } }

function filters(context: { organizationId: string }, countyId: string) {
  if (!isUuid(countyId)) throw new CountyHunterValidationError('countyId is invalid.')
  return new URLSearchParams({
    id: `eq.${countyId}`,
    organization_id: `eq.${context.organizationId}`,
    select: COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT,
  }).toString()
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    const rows = await countyHunterRest<CountyHunterCounty[]>(
      context,
      'county_hunter_counties',
      filters(context, params.countyId),
    )
    return NextResponse.json(requireCountyHunterResource(rows, 'County'))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.manage')
    const payload = parseCountyPatch(await request.json())
    const rows = await countyHunterRest<CountyHunterCounty[]>(
      context,
      'county_hunter_counties',
      filters(context, params.countyId),
      { method: 'PATCH', body: JSON.stringify(payload), prefer: 'return=representation' },
    )
    return NextResponse.json(requireCountyHunterResource(rows, 'County'))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
