import { NextResponse } from 'next/server'
import type { CountyHunterSource } from '@/features/county-hunter/types'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { parseSourcePatch } from '@/features/county-hunter/server/payloads'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { CountyHunterValidationError, isUuid } from '@/features/county-hunter/validation'
import { requireCountyHunterResource } from '@/features/county-hunter/server/resource'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { sourceId: string } }

function filters(organizationId: string, sourceId: string) {
  if (!isUuid(sourceId)) throw new CountyHunterValidationError('sourceId is invalid.')
  return new URLSearchParams({ id: `eq.${sourceId}`, organization_id: `eq.${organizationId}` }).toString()
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.manage')
    const payload = parseSourcePatch(await request.json())
    const rows = await countyHunterRest<CountyHunterSource[]>(
      context,
      'county_hunter_sources',
      filters(context.organizationId, params.sourceId),
      { method: 'PATCH', body: JSON.stringify(payload), prefer: 'return=representation' },
    )
    return NextResponse.json(requireCountyHunterResource(rows, 'Source'))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.admin')
    await countyHunterRest(
      context,
      'county_hunter_sources',
      filters(context.organizationId, params.sourceId),
      { method: 'DELETE', prefer: 'return=minimal' },
    )
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
