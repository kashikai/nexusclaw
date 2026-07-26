import { NextResponse } from 'next/server'
import type { CountyHunterProperty } from '@/features/county-hunter/types'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { parsePropertyPatch } from '@/features/county-hunter/server/payloads'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { CountyHunterValidationError, isUuid } from '@/features/county-hunter/validation'
import { requireCountyHunterResource } from '@/features/county-hunter/server/resource'
import { COUNTY_HUNTER_PROPERTY_WITH_RELATIONS_SELECT } from '@/features/county-hunter/server/selects'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ propertyId: string }> }

function filters(organizationId: string, propertyId: string) {
  if (!isUuid(propertyId)) throw new CountyHunterValidationError('propertyId is invalid.')
  return new URLSearchParams({
    id: `eq.${propertyId}`,
    organization_id: `eq.${organizationId}`,
    select: COUNTY_HUNTER_PROPERTY_WITH_RELATIONS_SELECT,
  }).toString()
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    const { propertyId } = await params
    const rows = await countyHunterRest<CountyHunterProperty[]>(
      context,
      'county_hunter_properties',
      filters(context.organizationId, propertyId),
    )
    return NextResponse.json(requireCountyHunterResource(rows, 'Property'))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.manage')
    const { propertyId } = await params
    const payload = parsePropertyPatch(await request.json())
    const rows = await countyHunterRest<CountyHunterProperty[]>(
      context,
      'county_hunter_properties',
      filters(context.organizationId, propertyId),
      { method: 'PATCH', body: JSON.stringify(payload), prefer: 'return=representation' },
    )
    return NextResponse.json(requireCountyHunterResource(rows, 'Property'))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
