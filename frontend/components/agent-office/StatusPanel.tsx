import { formatMoney, pnlColor } from '@/lib/agent-office/format'
import type { Locale, Strings } from '@/lib/agent-office/strings'
import type { PublicState } from '@/lib/agent-office/types'

export const MIN_RESOLVED_FOR_WIN_RATE = 20

const TIER_COLOR: Record<PublicState['survival_tier'], string> = {
  normal: 'text-green-400',
  cautious: 'text-yellow-400',
  low_compute: 'text-orange-400',
  critical: 'text-red-400',
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#1f2937] last:border-b-0">
      <span className="text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{label}</span>
      <span className="text-sm font-bold text-right">{children}</span>
    </div>
  )
}

function Pnl({ label, value, currency, locale }: { label: string; value: number; currency: string; locale: Locale }) {
  // Same size and weight for gains and losses; only the colour changes.
  return (
    <div className="border border-[#1f2937] bg-[#0d0d0d] p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums break-words ${pnlColor(value)}`}>{formatMoney(value, locale, currency, true)}</div>
    </div>
  )
}

export function StatusPanel({ state, t, locale }: { state: PublicState; t: Strings; locale: Locale }) {
  const p = state.portfolio
  const winRate = p.resolved_trades < MIN_RESOLVED_FOR_WIN_RATE || p.win_rate === null
    ? <span className="text-gray-400 font-normal text-xs">{t.panel.insufficientData(p.resolved_trades)}</span>
    : <span className="text-white tabular-nums">{(p.win_rate * 100).toFixed(1)}%</span>

  return (
    <section className="border border-[#2a2a2a] bg-[#111111] p-4" aria-labelledby="ao-panel-title">
      <h2 id="ao-panel-title" className="text-xs uppercase tracking-widest text-[#f5c542] mb-3">{t.panel.title}</h2>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Pnl label={t.panel.totalPnl} value={p.total_pnl_usd} currency={p.pnl_currency} locale={locale} />
        <Pnl label={t.panel.dailyPnl} value={p.daily_pnl_usd} currency={p.pnl_currency} locale={locale} />
      </div>
      <Row label={t.panel.mode}>
        <span className={state.mode === 'live' ? 'text-red-400' : 'text-[#f5c542]'}>
          {state.mode === 'live' ? t.panel.modeLive : t.panel.modeDryRun}
        </span>
      </Row>
      <Row label={t.panel.tier}><span className={TIER_COLOR[state.survival_tier]}>{t.tiers[state.survival_tier]}</span></Row>
      <Row label={t.panel.trades}>
        <span className="text-white tabular-nums">{p.total_trades}</span>
        <span className="text-gray-500 font-normal"> · {p.resolved_trades} {t.panel.resolved}</span>
      </Row>
      <Row label={t.panel.winRate}>{winRate}</Row>
      <Row label={t.panel.openPositions}><span className="text-white tabular-nums">{p.open_positions}</span></Row>
      {p.profits_transferred_usd > 0 && (
        <Row label={t.panel.transferred}>
          <span className="text-white tabular-nums">{formatMoney(p.profits_transferred_usd, locale, p.pnl_currency)}</span>
        </Row>
      )}
      {state.mode === 'dry_run' && <p className="mt-3 text-[11px] text-[#f5c542]/80">{t.panel.simulatedNote}</p>}
    </section>
  )
}
