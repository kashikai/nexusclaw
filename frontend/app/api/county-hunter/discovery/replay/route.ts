import { NextResponse } from 'next/server'
import { replayGwinnettSnapshot } from '@/features/county-hunter/discovery/replay'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { applyCountyHunterNoStore } from '@/features/county-hunter/server/cache-control'
import { requireCountyHunterDiscoveryEnabled } from '@/features/county-hunter/server/discovery-kill-switch'
import {
  countyHunterOpaqueRef,
  logCountyHunterEvent,
} from '@/features/county-hunter/server/operational-logging'
import {
  COUNTY_HUNTER_RATE_LIMITS,
  countyHunterIdentityRateLimitKey,
  enforceCountyHunterRateLimit,
} from '@/features/county-hunter/server/rate-limit'
import { countyHunterErrorResponse } from '@/features/county-hunter/server/responses'
import {
  asObject,
  assertAllowedKeys,
  CountyHunterValidationError,
  isUuid,
} from '@/features/county-hunter/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const startedAt = Date.now()
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.admin')
    requireCountyHunterDiscoveryEnabled()
    await enforceCountyHunterRateLimit(
      countyHunterIdentityRateLimitKey(
        'snapshot-replay',
        context.userId,
        context.organizationId,
      ),
      COUNTY_HUNTER_RATE_LIMITS.replayRun,
    )
    const body = asObject(await request.json())
    assertAllowedKeys(body, ['snapshotId'])
    if (!isUuid(body.snapshotId)) {
      throw new CountyHunterValidationError('snapshotId must be a valid UUID.')
    }
    const logRefs = {
      actorRef: countyHunterOpaqueRef(context.userId),
      tenantRef: countyHunterOpaqueRef(context.organizationId),
    }
    logCountyHunterEvent('replay_started', {
      operation: 'snapshot_replay',
      outcome: 'started',
      ...logRefs,
    })
    const result = await replayGwinnettSnapshot(context, body.snapshotId)
    logCountyHunterEvent('replay_completed', {
      operation: 'snapshot_replay',
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
    logCountyHunterEvent('replay_failed', {
      operation: 'snapshot_replay',
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
