import { DESK_COLORS } from '@/lib/agent-office/desks'
import type { FloorSummary, Presence } from '@/lib/agent-office/floor'
import { formatMoney, formatRelative, pnlColor } from '@/lib/agent-office/format'
import type { Locale, Strings } from '@/lib/agent-office/strings'
import type { DeskId, PublicState } from '@/lib/agent-office/types'
import { MIN_RESOLVED_FOR_WIN_RATE } from './StatusPanel'

const PRESENCE_DOT: Record<Presence, string> = {
  working: 'bg-cyan-400 animate-pulse',
  idle: 'bg-green-400',
  error: 'bg-red-500',
  offline: 'bg-gray-600',
  soon: 'bg-gray-700',
  loading: 'bg-gray-600 animate-pulse',
}

function Kpi({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="border border-[#1f2937] bg-[#0d0d0d] p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-bold tabular-nums break-words">{children}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

/** Overall result of the real-account bots. Demo desks are named but never summed. */
export function FloorOverallPanel({ summary, t, locale }: { summary: FloorSummary; t: Strings; locale: Locale }) {
  const r = summary.real
  return (
    <section className="border border-[#3a3216] bg-[#111111] p-4" aria-labelledby="ao-floor-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 id="ao-floor-title" className="text-xs uppercase tracking-widest text-[#f5c542]">
          {t.floor.overallTitle} · {t.floor.realAccounts}
        </h2>
        {r && <span className="text-[10px] text-gray-500">{t.floor.tradesClosed(r.resolvedTrades)}</span>}
      </div>
      {r ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi label={t.floor.todayPnl}><span className={pnlColor(r.dailyPnl)}>{formatMoney(r.dailyPnl, locale, r.currency, true)}</span></Kpi>
          <Kpi label={t.floor.totalPnl}><span className={pnlColor(r.totalPnl)}>{formatMoney(r.totalPnl, locale, r.currency, true)}</span></Kpi>
          <Kpi label={t.floor.openTrades}><span className="text-white">{r.openPositions}</span></Kpi>
          <Kpi label={t.floor.botsOnline}>
            <span className={summary.online === summary.active ? 'text-green-400' : 'text-[#f5c542]'}>{summary.online}/{summary.active}</span>
          </Kpi>
        </div>
      ) : (
        <p className="text-xs text-gray-500">{t.floor.noRealData}</p>
      )}
      {summary.demoDesks.length > 0 && (
        <p className="mt-3 text-[11px] text-[#f5c542]/80">
          {summary.demoDesks.map(d => t.floor.demoLine(t.desks[d])).join(' ')}
        </p>
      )}
    </section>
  )
}

export interface BotCardData {
  desk: DeskId
  presence: Presence
  state: PublicState | null
}

/** One card per bot with its own results; selecting a card opens that bot's desk below. */
export function BotCards({ cards, selected, onSelect, now, t, locale }: {
  cards: BotCardData[]
  selected: DeskId
  onSelect: (desk: DeskId) => void
  now: number
  t: Strings
  locale: Locale
}) {
  return (
    <div role="tablist" aria-label={t.desks.switcherLabel} className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map(c => {
        const s = c.state
        const p = s?.portfolio
        const isSelected = c.desk === selected
        const showData = !!s && c.presence !== 'soon'
        const winRate = p && p.win_rate !== null && p.resolved_trades >= MIN_RESOLVED_FOR_WIN_RATE
          ? `${(p.win_rate * 100).toFixed(0)}%`
          : '—'
        return (
          <button
            key={c.desk}
            id={`desk-tab-${c.desk}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(c.desk)}
            className={`text-left border p-3 transition-colors min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] ${
              isSelected ? 'border-[#f5c542] bg-[#14120a]' : 'border-[#262626] bg-[#0d0d0d] hover:border-gray-500'
            } ${c.presence === 'soon' ? 'opacity-60' : ''}`}
            style={{ borderTopColor: DESK_COLORS[c.desk], borderTopWidth: 3 }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: DESK_COLORS[c.desk] }}>
                {t.desks[c.desk]}
              </span>
              {s && c.presence !== 'soon' && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                  s.mode === 'live' ? 'border-red-500 text-red-300' : 'border-[#f5c542] text-[#f5c542]'
                }`}>
                  {s.mode === 'live' ? t.floor.modeLive : t.floor.modeDemo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-2">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${PRESENCE_DOT[c.presence]}`} />
              {t.floor.presence[c.presence]}
            </div>
            {showData && p ? (
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                <dt className="text-gray-500">{t.floor.today}</dt>
                <dd className={`text-right font-bold tabular-nums ${pnlColor(p.daily_pnl_usd)}`}>{formatMoney(p.daily_pnl_usd, locale, p.pnl_currency, true)}</dd>
                <dt className="text-gray-500">{t.floor.total}</dt>
                <dd className={`text-right font-bold tabular-nums ${pnlColor(p.total_pnl_usd)}`}>{formatMoney(p.total_pnl_usd, locale, p.pnl_currency, true)}</dd>
                <dt className="text-gray-500">{t.floor.trades}</dt>
                <dd className="text-right text-gray-200 tabular-nums">{p.resolved_trades}</dd>
                <dt className="text-gray-500">{t.floor.winRate}</dt>
                <dd className="text-right text-gray-200 tabular-nums">{winRate}</dd>
              </dl>
            ) : (
              <p className="text-[11px] text-gray-600">{c.presence === 'soon' ? t.floor.comingSoonDetail : '—'}</p>
            )}
            {showData && s && (
              <div className="mt-2 text-[9px] text-gray-600">{t.floor.updated} {formatRelative(s.updated_at, now, locale)}</div>
            )}
          </button>
        )
      })}
    </div>
  )
}
