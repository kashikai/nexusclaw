export const AGENT_IDS = ['scanner', 'analyst', 'executor', 'reporter'] as const
export type AgentId = (typeof AGENT_IDS)[number]

export const AGENT_STATUSES = ['idle', 'working', 'error'] as const
export type AgentStatus = (typeof AGENT_STATUSES)[number]

export const MODES = ['dry_run', 'live'] as const
export type Mode = (typeof MODES)[number]

export const SURVIVAL_TIERS = ['normal', 'cautious', 'low_compute', 'critical'] as const
export type SurvivalTier = (typeof SURVIVAL_TIERS)[number]

export interface AgentState {
  id: AgentId
  status: AgentStatus
  label: string
  last_event_at: string | null
}

export interface Portfolio {
  total_pnl_usd: number
  daily_pnl_usd: number
  total_trades: number
  resolved_trades: number
  win_rate: number | null
  open_positions: number
  profits_transferred_usd: number
}

export interface OfficeEvent {
  ts: string
  agent: AgentId | 'system'
  text: string
}

export interface PublicState {
  updated_at: string
  mode: Mode
  survival_tier: SurvivalTier
  agents: AgentState[]
  portfolio: Portfolio
  recent_events: OfficeEvent[]
}

export const MOCK_SCENARIOS = ['idle', 'working', 'error', 'stale'] as const
export type MockScenario = (typeof MOCK_SCENARIOS)[number]

export type DataSource = { kind: 'live' } | { kind: 'mock'; scenario: MockScenario }

export type LoadResult =
  | { status: 'loading' }
  | { status: 'ok'; data: PublicState; fetchedAt: number }
  | { status: 'missing'; fetchedAt: number }
  | { status: 'invalid'; reason: string; fetchedAt: number }
  | { status: 'error'; reason: string; fetchedAt: number }
