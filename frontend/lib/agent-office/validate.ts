import {
  AGENT_IDS, AGENT_STATUSES, MODES, SURVIVAL_TIERS,
  type AgentId, type AgentState, type OfficeEvent, type Portfolio, type PublicState,
} from './types'

export const LABEL_MAX = 60
export const EVENT_TEXT_MAX = 140
export const EVENTS_MAX = 10

export class ValidationError extends Error {}

// Scanned against the raw file text, so secrets hidden in unknown fields are caught too.
// Keep in sync with FORBIDDEN_PATTERNS in the exporters: the signal bot (public_state.py) and Polyagent (public_export/build.py).
const FORBIDDEN_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /0x[0-9a-fA-F]{40}/, reason: '0x address or hash' },
  { re: /(?<![0-9a-fA-F])[0-9a-fA-F]{64}(?![0-9a-fA-F])/, reason: '64-char hex (private key / id)' },
  { re: /(?<!\d)\d{30,}(?!\d)/, reason: 'long numeric id (token / market id)' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, reason: 'PEM private key' },
  { re: /private[\s_-]?key|passphrase|mnemonic|seed[\s_-]?phrase|api[\s_-]?secret/i, reason: 'secret field name' },
  { re: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, reason: 'JWT' },
  { re: /sk-ant-[A-Za-z0-9_-]{8,}|\bsk-[A-Za-z0-9_-]{20,}/, reason: 'API secret key' },
  { re: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/, reason: 'Telegram bot token' },
  { re: /sb_secret_[A-Za-z0-9_-]{8,}/, reason: 'Supabase secret key' },
  { re: /\b(?:DRY|LIVE)_\d+_\d+\b/, reason: 'trade id' },
]

export function scanForSecrets(raw: string): void {
  for (const { re, reason } of FORBIDDEN_PATTERNS) {
    if (re.test(raw)) throw new ValidationError(`Rejected: file contains ${reason}`)
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function isoDate(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = Date.parse(v)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null
}

function num(v: unknown, field: string, opts: { min?: number; int?: boolean } = {}): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ValidationError(`portfolio.${field} must be a number`)
  if (opts.int && !Number.isInteger(v)) throw new ValidationError(`portfolio.${field} must be an integer`)
  if (opts.min !== undefined && v < opts.min) throw new ValidationError(`portfolio.${field} must be >= ${opts.min}`)
  return v
}

function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
}

function parseAgents(v: unknown): AgentState[] {
  const byId = new Map<AgentId, AgentState>()
  if (Array.isArray(v)) {
    for (const a of v) {
      if (!isObj(a)) continue
      const id = oneOf(a.id, AGENT_IDS)
      const status = oneOf(a.status, AGENT_STATUSES)
      if (!id || !status || byId.has(id)) continue
      byId.set(id, { id, status, label: cleanText(a.label, LABEL_MAX), last_event_at: isoDate(a.last_event_at) })
    }
  }
  return AGENT_IDS.map(id => byId.get(id) ?? { id, status: 'idle', label: '', last_event_at: null })
}

function parsePortfolio(v: unknown): Portfolio {
  if (!isObj(v)) throw new ValidationError('portfolio missing')
  const winRate = v.win_rate
  if (winRate !== null && (typeof winRate !== 'number' || winRate < 0 || winRate > 1)) {
    throw new ValidationError('portfolio.win_rate must be null or 0..1')
  }
  const total = num(v.total_trades, 'total_trades', { min: 0, int: true })
  const resolved = num(v.resolved_trades, 'resolved_trades', { min: 0, int: true })
  if (resolved > total) throw new ValidationError('resolved_trades > total_trades')
  return {
    total_pnl_usd: num(v.total_pnl_usd, 'total_pnl_usd'),
    daily_pnl_usd: num(v.daily_pnl_usd, 'daily_pnl_usd'),
    // Optional; anything that is not a plain 3-letter code falls back to USD.
    pnl_currency: typeof v.pnl_currency === 'string' && /^[A-Z]{3}$/.test(v.pnl_currency) ? v.pnl_currency : 'USD',
    total_trades: total,
    resolved_trades: resolved,
    win_rate: winRate as number | null,
    open_positions: num(v.open_positions, 'open_positions', { min: 0, int: true }),
    profits_transferred_usd: num(v.profits_transferred_usd, 'profits_transferred_usd', { min: 0 }),
  }
}

function parseEvents(v: unknown): OfficeEvent[] {
  if (!Array.isArray(v)) return []
  const out: OfficeEvent[] = []
  for (const e of v) {
    if (!isObj(e)) continue
    const ts = isoDate(e.ts)
    const agent = oneOf(e.agent, [...AGENT_IDS, 'system'] as const)
    const text = cleanText(e.text, EVENT_TEXT_MAX)
    if (ts && agent && text) out.push({ ts, agent, text })
  }
  return out.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)).slice(0, EVENTS_MAX)
}

/** Parses raw JSON text into a PublicState. Unknown fields are dropped; anything secret-looking rejects the file. */
export function parsePublicState(raw: string): PublicState {
  scanForSecrets(raw)
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new ValidationError('Not valid JSON')
  }
  if (!isObj(json)) throw new ValidationError('Root must be an object')

  const updated_at = isoDate(json.updated_at)
  if (!updated_at) throw new ValidationError('updated_at missing or invalid')
  const mode = oneOf(json.mode, MODES)
  if (!mode) throw new ValidationError('mode must be dry_run or live')
  const survival_tier = oneOf(json.survival_tier, SURVIVAL_TIERS)
  if (!survival_tier) throw new ValidationError('survival_tier invalid')

  return {
    updated_at,
    mode,
    survival_tier,
    agents: parseAgents(json.agents),
    portfolio: parsePortfolio(json.portfolio),
    recent_events: parseEvents(json.recent_events),
  }
}

// The bot republishes every 30s even when nothing happens, so a few missed heartbeats means it is offline.
export const STALE_AFTER_MS = 5 * 60 * 1000

export function isStale(state: PublicState, now: number): boolean {
  return now - Date.parse(state.updated_at) > STALE_AFTER_MS
}
