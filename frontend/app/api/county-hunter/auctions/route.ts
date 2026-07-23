import { NextResponse } from 'next/server'
import type { CountyHunterAuction } from '@/features/county-hunter/types'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { parseAuctionCreate } from '@/features/county-hunter/server/payloads'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    const url = new URL(request.url)
    const query = new URLSearchParams({
      select: '*,county:county_hunter_counties(name,slug)',
      organization_id: `eq.${context.organizationId}`,
      order: 'sale_date.asc.nullslast',
      limit: '100',
    })
    const countyId = url.searchParams.get('county_id')
    const status = url.searchParams.get('status')
    if (countyId) query.set('county_id', `eq.${countyId}`)
    if (status) query.set('status', `eq.${status}`)
    const rows = await countyHunterRest<CountyHunterAuction[]>(context, 'county_hunter_auctions', query.toString())
    return NextResponse.json(rows)
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.manage')
    const payload = parseAuctionCreate(await request.json())
    const rows = await countyHunterRest<CountyHunterAuction[]>(context, 'county_hunter_auctions', '', {
      method: 'POST',
      body: JSON.stringify({ ...payload, organization_id: context.organizationId, created_by: context.userId }),
      prefer: 'return=representation',
    })
    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
