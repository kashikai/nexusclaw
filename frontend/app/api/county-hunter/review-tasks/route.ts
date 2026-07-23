import { NextResponse } from 'next/server'
import type { CountyHunterReviewTask } from '@/features/county-hunter/types'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    const url = new URL(request.url)
    const query = new URLSearchParams({
      organization_id: `eq.${context.organizationId}`,
      order: 'priority.desc,created_at.asc',
      limit: '200',
    })
    const status = url.searchParams.get('status')
    if (status) query.set('status', `eq.${status}`)
    const rows = await countyHunterRest<CountyHunterReviewTask[]>(
      context,
      'county_hunter_review_tasks',
      query.toString(),
    )
    return NextResponse.json(rows)
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
