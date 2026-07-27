import { NextResponse } from 'next/server'
import { replayGwinnettSnapshot } from '@/features/county-hunter/discovery/replay'
import { requireCountyHunterPermission } from '@/features/county-hunter/server/auth'
import { applyCountyHunterNoStore } from '@/features/county-hunter/server/cache-control'
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
  try {
    const context = await requireCountyHunterPermission(request, 'county_hunter.admin')
    const body = asObject(await request.json())
    assertAllowedKeys(body, ['snapshotId'])
    if (!isUuid(body.snapshotId)) {
      throw new CountyHunterValidationError('snapshotId must be a valid UUID.')
    }
    const result = await replayGwinnettSnapshot(context, body.snapshotId)
    return applyCountyHunterNoStore(NextResponse.json(result))
  } catch (error) {
    return countyHunterErrorResponse(error)
  }
}
