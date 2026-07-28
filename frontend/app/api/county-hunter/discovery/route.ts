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
import { requireCountyHunterDiscoveryEnabled } from '@/features/county-hunter/server/discovery-kill-switch'
import {
  isCountyHunterDiscoveryEnabled,
} from '@/features/county-hunter/server/feature-flags'
import {
  countyHunterOpaqueRef,
  logCountyHunterEvent,
} from '@/features/county-hunter/server/operational-logging'
import {
  COUNTY_HUNTER_RATE_LIMITS,
  countyHunterIdentityRateLimitKey,
  enforceCountyHunterRateLimit,
} from '@/features/county-hunter/server/rate-limit'
import { countyHunterRest } from '@/features/county-hunter/server/rest'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import { COUNTY_HUNTER_COUNTY_WITH_STATE_SELECT } from '@/features/county-hunter/server/selects'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.view')
    enforceCountyHunterRateLimit(
      countyHunterIdentityRateLimitKey(
        'discovery-read',
        context.userId,
        context.organizationId,
      ),
      COUNTY_HUNTER_RATE_LIMITS.discoveryRead,
    )
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

    const collectionEnabled = isCountyHunterDiscoveryEnabled()
    const overview: CountyHunterDiscoveryOverview = {
      county,
      source,
      latestRun,
      snapshots,
      collectionEnabled,
      canRun:
        collectionEnabled &&
        context.permissions.includes('county_hunter.admin'),
    }
    return applyCountyHunterNoStore(NextResponse.json(overview))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.admin')
    requireCountyHunterDiscoveryEnabled()
    enforceCountyHunterRateLimit(
      countyHunterIdentityRateLimitKey(
        'discovery-run',
        context.userId,
        context.organizationId,
      ),
      COUNTY_HUNTER_RATE_LIMITS.discoveryRun,
    )
    const logRefs = {
      actorRef: countyHunterOpaqueRef(context.userId),
      tenantRef: countyHunterOpaqueRef(context.organizationId),
    }
    logCountyHunterEvent('discovery_started', {
      operation: 'discovery',
      outcome: 'started',
      ...logRefs,
    })
    const result = await runGwinnettDiscovery(context)
    logCountyHunterEvent('discovery_completed', {
      operation: 'discovery',
      outcome: result.status,
      ...logRefs,
      records: result.records,
      added: result.added,
      changed: result.changed,
      unchanged: result.unchanged,
      removed: result.removed,
      durationMs: Date.now() - startedAt,
    })
    return applyCountyHunterNoStore(NextResponse.json(result))
  } catch (error) {
    logCountyHunterEvent('discovery_failed', {
      operation: 'discovery',
      outcome: 'failed',
      reasonCode:
        error instanceof Error && 'reasonCode' in error
          ? String(error.reasonCode)
          : 'REQUEST_REJECTED',
      durationMs: Date.now() - startedAt,
    }, 'error')
    return countyHunterErrorResponse(error)
  }
}
