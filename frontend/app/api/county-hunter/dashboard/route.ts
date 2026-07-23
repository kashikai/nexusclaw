import { NextResponse } from 'next/server'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { countyHunterCount, organizationFilter } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    const organization = organizationFilter(context.organizationId)
    const since = encodeURIComponent(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    const [counties, auctions, properties, shortlisted, pendingReviews, sourceErrors, changesLast24Hours] =
      await Promise.all([
        countyHunterCount(context, 'county_hunter_counties', organization),
        countyHunterCount(context, 'county_hunter_auctions', organization),
        countyHunterCount(context, 'county_hunter_properties', organization),
        countyHunterCount(context, 'county_hunter_properties', `${organization}&status=eq.shortlisted`),
        countyHunterCount(context, 'county_hunter_review_tasks', `${organization}&status=in.(open,in_progress)`),
        countyHunterCount(context, 'county_hunter_sources', `${organization}&status=in.(degraded,unavailable)`),
        countyHunterCount(context, 'county_hunter_monitoring_events', `${organization}&created_at=gte.${since}`),
      ])
    return NextResponse.json({
      counties,
      auctions,
      properties,
      shortlisted,
      pendingReviews,
      sourceErrors,
      changesLast24Hours,
    })
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
