import 'server-only'

import { createHash } from 'node:crypto'

export type CountyHunterOperationalEvent =
  | 'siwe_challenge_issued'
  | 'siwe_challenge_failed'
  | 'siwe_login_succeeded'
  | 'siwe_login_failed'
  | 'siwe_logout'
  | 'permission_denied'
  | 'discovery_started'
  | 'discovery_completed'
  | 'discovery_failed'
  | 'replay_started'
  | 'replay_completed'
  | 'replay_failed'
  | 'kill_switch_blocked'
  | 'request_failed'

export type CountyHunterLogDetails = {
  operation?: string
  outcome?: string
  reasonCode?: string
  permission?: string
  status?: string
  actorRef?: string
  tenantRef?: string
  records?: number
  added?: number
  changed?: number
  unchanged?: number
  removed?: number
  durationMs?: number
}

const SAFE_TOKEN = /^[a-z0-9_.:-]{1,64}$/i
const STRING_FIELDS = new Set([
  'operation',
  'outcome',
  'reasonCode',
  'permission',
  'status',
  'actorRef',
  'tenantRef',
])
const NUMERIC_FIELDS = new Set([
  'records',
  'added',
  'changed',
  'unchanged',
  'removed',
  'durationMs',
])

export function countyHunterOpaqueRef(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

export function logCountyHunterEvent(
  event: CountyHunterOperationalEvent,
  details: CountyHunterLogDetails = {},
  level: 'info' | 'error' = 'info',
): void {
  const sanitized: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(details)) {
    if (value === undefined) continue
    if (NUMERIC_FIELDS.has(name)) {
      if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
        sanitized[name] = value
      }
      continue
    }
    if (
      STRING_FIELDS.has(name) &&
      typeof value === 'string' &&
      SAFE_TOKEN.test(value)
    ) {
      sanitized[name] = value
    }
  }

  const entry = JSON.stringify({
    component: 'county-hunter',
    event,
    timestamp: new Date().toISOString(),
    ...sanitized,
  })
  if (level === 'error') {
    console.error(entry)
  } else {
    console.info(entry)
  }
}
