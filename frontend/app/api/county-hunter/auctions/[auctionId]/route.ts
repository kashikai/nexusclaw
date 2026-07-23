import { NextResponse } from 'next/server'
import type { CountyHunterAuction } from '@/features/county-hunter/types'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { parseAuctionPatch } from '@/features/county-hunter/server/payloads'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { CountyHunterValidationError, isUuid } from '@/features/county-hunter/validation'
import { requireCountyHunterResource } from '@/features/county-hunter/server/resource'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { auctionId: string } }

function filters(organizationId: string, auctionId: string) {
  if (!isUuid(auctionId)) throw new CountyHunterValidationError('auctionId is invalid.')
  return new URLSearchParams({
    id: `eq.${auctionId}`,
    organization_id: `eq.${organizationId}`,
    select: '*,county:county_hunter_counties(name,slug)',
  }).toString()
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    const rows = await countyHunterRest<CountyHunterAuction[]>(
      context,
      'county_hunter_auctions',
      filters(context.organizationId, params.auctionId),
    )
    return NextResponse.json(requireCountyHunterResource(rows, 'Auction'))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.manage')
    const payload = parseAuctionPatch(await request.json())
    const rows = await countyHunterRest<CountyHunterAuction[]>(
      context,
      'county_hunter_auctions',
      filters(context.organizationId, params.auctionId),
      { method: 'PATCH', body: JSON.stringify(payload), prefer: 'return=representation' },
    )
    return NextResponse.json(requireCountyHunterResource(rows, 'Auction'))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
