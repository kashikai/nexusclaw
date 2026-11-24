import { COMING_SOON_DESKS } from './desks'
import { DESKS, type DeskId, type PublicState } from './types'
import type { OfficeView } from './useOfficeState'

/** What a bot is doing, as shown on the trading floor. */
export type Presence = 'working' | 'idle' | 'error' | 'offline' | 'soon' | 'loading'

export function deskPresence(desk: DeskId, view: OfficeView): Presence {
  if (COMING_SOON_DESKS.has(desk)) return 'soon'
  if (view.result.status === 'loading') return 'loading'
  const s = view.state
  if (!s || view.stale) return 'offline'
  if (s.agents.some(a => a.status === 'error')) return 'error'
  if (s.agents.some(a => a.status === 'working')) return 'working'
  return 'idle'
}

/** Real money vs demo: a desk counts toward the real totals only when it publishes mode=live. */
export function isRealAccount(state: PublicState): boolean {
  return state.mode === 'live'
}

export interface FloorTotals {
  totalPnl: number
  dailyPnl: number
  openPositions: number
  resolvedTrades: number
  currency: string
  /** Desks whose figures are included. */
  desks: number
}

export interface FloorSummary {
  real: FloorTotals | null
  demoDesks: DeskId[]
  online: number
  active: number
}

/**
 * Totals for the floor. Only real-account (mode=live) desks are summed, and only in one currency, so demo
 * results or a different account currency can never inflate the public figures.
 */
export function summarizeFloor(views: Record<DeskId, OfficeView>): FloorSummary {
  let real: FloorTotals | null = null
  const demoDesks: DeskId[] = []
  let online = 0
  let active = 0

  for (const d of DESKS) {
    if (COMING_SOON_DESKS.has(d)) continue
    active += 1
    const { state, stale } = views[d]
    if (!state) continue
    if (!stale) online += 1
    if (!isRealAccount(state)) {
      demoDesks.push(d)
      continue
    }
    const p = state.portfolio
    if (real === null) {
      real = { totalPnl: 0, dailyPnl: 0, openPositions: 0, resolvedTrades: 0, currency: p.pnl_currency, desks: 0 }
    }
    if (p.pnl_currency !== real.currency) continue
    real.totalPnl += p.total_pnl_usd
    real.dailyPnl += p.daily_pnl_usd
    real.openPositions += p.open_positions
    real.resolvedTrades += p.resolved_trades
    real.desks += 1
  }
  return { real, demoDesks, online, active }
}
