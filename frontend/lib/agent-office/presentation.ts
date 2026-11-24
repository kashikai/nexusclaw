import { AGENT_IDS, type AgentId, type AgentStatus, type OfficeEvent, type PublicState } from './types'

/**
 * Display-side privacy and visual policy for the Agent Office.
 *
 * Pure helpers: they never mutate the validated PublicState, never add fields to the contract and never
 * look up details anywhere else. They only decide what the UI is allowed to show.
 */

/**
 * The privacy gate. It reads the raw published open-position count and deliberately ignores
 * staleness: data that went stale while a position was open stays restricted.
 */
export function isPrivacyRestricted(state: PublicState | null): boolean {
  return (state?.portfolio.open_positions ?? 0) > 0
}

/**
 * Immutable display projection consumed by every visual sink (3D, 2D fallback, cards, feed, ARIA).
 * While any position is open, free text (agent labels and event texts) is replaced: labels become empty,
 * so every sink falls back to the localized status, and each event keeps its real timestamp and agent but
 * shows `protectedEventText`. Nothing is inferred from the text itself (no "closed" detection).
 * Aggregates are left untouched. Idempotent; returns the input when no restriction applies.
 */
export function projectPublicState(state: PublicState | null, protectedEventText: string): PublicState | null {
  if (!state || !isPrivacyRestricted(state)) return state
  return {
    ...state,
    agents: state.agents.map(a => ({ id: a.id, status: a.status, label: '', last_event_at: a.last_event_at })),
    recent_events: state.recent_events.map(e => ({ ts: e.ts, agent: e.agent, text: protectedEventText })),
  }
}

export interface AgentPresentation {
  id: AgentId
  /** Status shown on screen: the published status, or idle when data is stale/unavailable. */
  status: AgentStatus
  working: boolean
  error: boolean
}

export interface ScenePresentation {
  hasState: boolean
  dimmed: boolean
  live: boolean
  agents: Record<AgentId, AgentPresentation>
  workingCount: number
  /** At least one agent is working: the core may show energy. */
  coreActive: boolean
  /** Scanner or analyst working: the 15D scan band may run. */
  scanActive: boolean
  hasError: boolean
  /** Raw published count (aggregate only). */
  openPositions: number
  privacyRestricted: boolean
}

/** Single visual policy derived from the validated state; no synthetic activity when idle, stale or missing. */
export function derivePresentation(state: PublicState | null, dimmed: boolean): ScenePresentation {
  const live = !!state && !dimmed
  const byId = new Map((state?.agents ?? []).map(a => [a.id, a]))
  const agents = {} as Record<AgentId, AgentPresentation>
  let workingCount = 0
  let hasError = false
  for (const id of AGENT_IDS) {
    const status: AgentStatus = live ? byId.get(id)?.status ?? 'idle' : 'idle'
    const working = status === 'working'
    const error = status === 'error'
    if (working) workingCount++
    if (error) hasError = true
    agents[id] = { id, status, working, error }
  }
  return {
    hasState: !!state,
    dimmed,
    live: live && state?.mode === 'live',
    agents,
    workingCount,
    coreActive: workingCount > 0,
    scanActive: agents.scanner.working || agents.analyst.working,
    hasError,
    openPositions: state?.portfolio.open_positions ?? 0,
    privacyRestricted: isPrivacyRestricted(state),
  }
}

/** Latest published event of this agent (events are already sorted newest first by the validator). */
export function lastEventFor(state: PublicState | null, id: AgentId): OfficeEvent | null {
  return state?.recent_events.find(e => e.agent === id) ?? null
}

/** Stable equality for presentations, so the 3D scene is only touched when something visible changed. */
export function samePresentation(a: ScenePresentation | null, b: ScenePresentation): boolean {
  if (!a) return false
  if (
    a.hasState !== b.hasState || a.dimmed !== b.dimmed || a.live !== b.live || a.hasError !== b.hasError ||
    a.openPositions !== b.openPositions || a.privacyRestricted !== b.privacyRestricted
  ) return false
  return AGENT_IDS.every(id => a.agents[id].status === b.agents[id].status)
}
