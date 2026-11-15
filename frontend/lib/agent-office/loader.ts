import { parsePublicState, ValidationError } from './validate'
import type { DataSource, LoadResult, MockScenario } from './types'

// The static URL the signal bot publishes to (must allow CORS if cross-origin; Supabase Storage public objects do).
export const PUBLIC_STATE_URL = process.env.NEXT_PUBLIC_AGENT_OFFICE_STATE_URL || '/public_state.json'
export const MOCK_URL = '/agent-office/public_state.mock.json'
// The bot uploads within about a second of each event, so this is the visible delay.
export const POLL_INTERVAL_MS = 5_000

// A changing query string keeps a CDN in front of the file from serving an old copy.
function withCacheBuster(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
}

const TS_KEYS = new Set(['updated_at', 'last_event_at', 'ts'])

// Shifts every timestamp so the mock's reference_time becomes "now"; keeps relative ages (e.g. the stale scenario) intact.
function rebaseTimestamps(value: unknown, offsetMs: number): unknown {
  if (Array.isArray(value)) return value.map(v => rebaseTimestamps(v, offsetMs))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => {
      if (TS_KEYS.has(k) && typeof v === 'string' && Number.isFinite(Date.parse(v))) {
        return [k, new Date(Date.parse(v) + offsetMs).toISOString()]
      }
      return [k, rebaseTimestamps(v, offsetMs)]
    }))
  }
  return value
}

async function loadMockRaw(scenario: MockScenario, signal: AbortSignal): Promise<string> {
  const res = await fetch(MOCK_URL, { cache: 'no-store', signal })
  if (!res.ok) throw new Error(`Mock file HTTP ${res.status}`)
  const file = await res.json() as { reference_time: string; scenarios: Record<string, unknown> }
  const scenarioData = file.scenarios?.[scenario]
  if (!scenarioData) throw new Error(`Mock scenario "${scenario}" not found`)
  const offset = Date.now() - Date.parse(file.reference_time)
  return JSON.stringify(rebaseTimestamps(scenarioData, offset))
}

export async function loadPublicState(source: DataSource, signal: AbortSignal): Promise<LoadResult> {
  const fetchedAt = Date.now()
  try {
    let raw: string
    if (source.kind === 'mock') {
      raw = await loadMockRaw(source.scenario, signal)
    } else {
      const res = await fetch(withCacheBuster(PUBLIC_STATE_URL), { cache: 'no-store', signal })
      if (res.status === 404) return { status: 'missing', fetchedAt }
      if (!res.ok) return { status: 'error', reason: `HTTP ${res.status}`, fetchedAt }
      raw = await res.text()
    }
    return { status: 'ok', data: parsePublicState(raw), fetchedAt }
  } catch (err) {
    if (err instanceof ValidationError) return { status: 'invalid', reason: err.message, fetchedAt }
    return { status: 'error', reason: err instanceof Error ? err.message : 'Unknown error', fetchedAt }
  }
}
