import { NextResponse } from 'next/server'
import type {
  CountyHunterCounty,
  CountyHunterDiscoveryOverview,
  CountyHunterDiscoveryRun,
  CountyHunterDiscoverySnapshotMetadata,
  CountyHunterSource,
} from '@/features/county-hunter/types'
import { runGwinnettDiscovery } from '@/features/county-hunter/discovery/run'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { applyCountyHunterNoStore } from '@/features/county-hunter/server/cache-control'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT } from '@/features/county-hunter/server/selects'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    const counties = await countyHunterRest<CountyHunterCounty[]>(
      context,
      'county_hunter_counties',
      new URLSearchParams({
        select: COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT,
        organization_id: `eq.${context.organizationId}`,
        slug: 'eq.gwinnett-county-ga',
        limit: '1',
      }).toString(),
    )
    const county = counties[0] ?? null
    let source: CountyHunterSource | null = null
    let latestRun: CountyHunterDiscoveryRun | null = null
    let snapshots: CountyHunterDiscoverySnapshotMetadata[] = []

    if (county) {
      const sources = await countyHunterRest<CountyHunterSource[]>(
        context,
        'county_hunter_sources',
        new URLSearchParams({
          select: '*',
          organization_id: `eq.${context.organizationId}`,
          county_id: `eq.${county.id}`,
          adapter_key: 'eq.gwinnett-tax-sales',
          limit: '1',
        }).toString(),
      )
      source = sources[0] ?? null
    }
    if (source) {
      const runs = await countyHunterRest<CountyHunterDiscoveryRun[]>(
        context,
        'county_hunter_discovery_runs',
        new URLSearchParams({
          select: '*',
          organization_id: `eq.${context.organizationId}`,
          source_id: `eq.${source.id}`,
          order: 'created_at.desc',
          limit: '1',
        }).toString(),
      )
      latestRun = runs[0] ?? null
    }
    if (latestRun) {
      const snapshotQuery = new URLSearchParams({
        select: 'id,snapshot_kind,original_url,final_url,content_hash,content_type,content_length,fetched_at,source_last_modified',
        organization_id: `eq.${context.organizationId}`,
        order: 'created_at.asc',
      })
      if (latestRun.run_type === 'snapshot_replay') {
        snapshotQuery.set('id', `eq.${latestRun.document_snapshot_id}`)
      } else {
        snapshotQuery.set('run_id', `eq.${latestRun.id}`)
      }
      snapshots = await countyHunterRest<CountyHunterDiscoverySnapshotMetadata[]>(
        context,
        'county_hunter_discovery_snapshots',
        snapshotQuery.toString(),
      )
    }

    const overview: CountyHunterDiscoveryOverview = {
      county,
      source,
      latestRun,
      snapshots,
      canRun: context.permissions.includes('county_hunter.admin'),
    }
    return applyCountyHunterNoStore(NextResponse.json(overview))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.admin')
    const result = await runGwinnettDiscovery(context)
    return applyCountyHunterNoStore(NextResponse.json(result))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
