import { NextResponse } from 'next/server'
import type { CountyHunterSource } from '@/features/county-hunter/types'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { parseSourceCreate } from '@/features/county-hunter/server/payloads'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { CountyHunterValidationError, isUuid } from '@/features/county-hunter/validation'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { countyId: string } }

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    if (!isUuid(params.countyId)) throw new CountyHunterValidationError('countyId is invalid.')
    const query = new URLSearchParams({
      county_id: `eq.${params.countyId}`,
      organization_id: `eq.${context.organizationId}`,
      order: 'name.asc',
    })
    const rows = await countyHunterRest<CountyHunterSource[]>(context, 'county_hunter_sources', query.toString())
    return NextResponse.json(rows)
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.manage')
    const payload = parseSourceCreate(await request.json(), params.countyId)
    const rows = await countyHunterRest<CountyHunterSource[]>(context, 'county_hunter_sources', '', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        organization_id: context.organizationId,
        created_by: context.userId,
      }),
      prefer: 'return=representation',
    })
    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
