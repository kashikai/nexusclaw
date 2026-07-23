import { NextResponse } from 'next/server'
import type { CountyHunterProperty } from '@/features/county-hunter/types'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { parsePropertyCreate } from '@/features/county-hunter/server/payloads'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    const url = new URL(request.url)
    const query = new URLSearchParams({
      select: '*,county:county_hunter_counties(name),auction:county_hunter_auctions(sale_date)',
      organization_id: `eq.${context.organizationId}`,
      order: 'updated_at.desc',
      limit: '200',
    })
    for (const key of ['county_id', 'auction_id', 'status', 'property_type']) {
      const value = url.searchParams.get(key)
      if (value) query.set(key, `eq.${value}`)
    }
    const parcel = url.searchParams.get('parcel_number')
    if (parcel) query.set('parcel_number', `ilike.*${parcel.replace(/[%*,()]/g, '')}*`)
    const rows = await countyHunterRest<CountyHunterProperty[]>(context, 'county_hunter_properties', query.toString())
    return NextResponse.json(rows)
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.manage')
    const payload = parsePropertyCreate(await request.json())
    const rows = await countyHunterRest<CountyHunterProperty[]>(context, 'county_hunter_properties', '', {
      method: 'POST',
      body: JSON.stringify({ ...payload, organization_id: context.organizationId, created_by: context.userId }),
      prefer: 'return=representation',
    })
    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
