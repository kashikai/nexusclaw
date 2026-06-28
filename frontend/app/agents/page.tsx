'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useReadContracts } from 'wagmi'
import { PageShell } from '@/components/layout/PageShell'
import { STAKING_ADDRESS, STAKING_ABI, BASESCAN_URL } from '@/config/contracts'
import { formatTokenShort } from '@/lib/utils'

// ── Supabase NexusClaw Trader data ───────────────────────────────────────────

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const SUPA_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

interface FimateTrade {
  ticket: number
  direction: 'BUY' | 'SELL'
  result: 'TP' | 'SL' | 'MANUAL'
  profit_pts: number
  profit_jpy: number
  canal_size_pts: number
  was_reversal: boolean
  entry_time: string
  duration_min: number
  created_at: string
}

interface FimateParams {
  params: Record<string, number>
  reasoning: string
  win_rate: number
  sample_size: number
  created_at: string
}

async function fetchFimathe(): Promise<{ trades: FimateTrade[]; latestParams: FimateParams | null }> {
  const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }

  const [tradesRes, paramsRes] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/fimathe_trades?order=created_at.desc&limit=20`, { headers }),
    fetch(`${SUPA_URL}/rest/v1/fimathe_params?order=created_at.desc&limit=1`, { headers }),
  ])

  const trades: FimateTrade[] = tradesRes.ok ? await tradesRes.json() : []
  const paramsArr: FimateParams[] = paramsRes.ok ? await paramsRes.json() : []

  return { trades, latestParams: paramsArr[0] ?? null }
}

function useFimatheData() {
  const [trades, setTrades] = useState<FimateTrade[]>([])
  const [latestParams, setLatestParams] = useState<FimateParams | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const data = await fetchFimathe()
        if (alive) {
          setTrades(data.trades)
          setLatestParams(data.latestParams)
          setLoading(false)
        }
      } catch { /* silent */ }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return { trades, latestParams, loading }
}

// ── FIMATHE summary stats ─────────────────────────────────────────────────────

function FimateStats({ trades }: { trades: FimateTrade[] }) {
  if (trades.length === 0) return null

  const wins     = trades.filter(t => t.result === 'TP').length
  const losses   = trades.filter(t => t.result === 'SL').length
  const winRate  = Math.round(wins / trades.length * 100)
  const totalPnl = trades.reduce((s, t) => s + (t.profit_jpy ?? 0), 0)
  const avgPts   = Math.round(trades.reduce((s, t) => s + (t.profit_pts ?? 0), 0) / trades.length)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Trades',    value: trades.length.toString(),                                                          accent: 'text-cyan-400' },
        { label: 'Win Rate',  value: `${winRate}%`,                                                                    accent: winRate >= 50 ? 'text-cyan-400' : 'text-red-400' },
        { label: 'Total P&L', value: `¥${totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString('en-US')}`,   accent: totalPnl >= 0 ? 'text-cyan-400' : 'text-red-400' },
        { label: 'Avg Pts',   value: `${avgPts >= 0 ? '+' : ''}${avgPts}pts`,                                         accent: avgPts >= 0 ? 'text-cyan-400' : 'text-red-400' },
      ].map(s => (
        <div key={s.label} className="bg-[#111111] p-4 border border-[#1f2937]">
          <span className="font-mono text-[9px] uppercase tracking-widest text-gray-400 block mb-1">{s.label}</span>
          <span className={`font-mono text-sm font-bold ${s.accent}`}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── FIMATHE trade row ─────────────────────────────────────────────────────────

function TradeRow({ t }: { t: FimateTrade }) {
  const isWin   = t.result === 'TP'
  const dt      = new Date(t.entry_time)
  const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' })

  return (
    <div className="grid grid-cols-5 gap-2 py-2 border-b border-[#1f2937] text-[10px] font-mono">
      <span className="text-gray-400">{dateStr} <span className="text-gray-600">{timeStr}</span></span>
      <span className={t.direction === 'BUY' ? 'text-cyan-400' : 'text-red-400'}>
        {t.direction}{t.was_reversal ? ' ↺' : ''}
      </span>
      <span className={isWin ? 'text-cyan-400' : 'text-red-400'}>{t.result}</span>
      <span className={isWin ? 'text-cyan-400' : 'text-red-400'}>
        {t.profit_pts >= 0 ? '+' : ''}{t.profit_pts}pts
      </span>
      <span className={isWin ? 'text-cyan-400' : 'text-red-400'}>
        ¥{t.profit_jpy >= 0 ? '+' : ''}{Math.round(t.profit_jpy).toLocaleString('en-US')}
      </span>
    </div>
  )
}

// ── FIMATHE card ──────────────────────────────────────────────────────────────

function FimateCard() {
  const { trades, latestParams, loading } = useFimatheData()

  return (
    <div className="border border-[#1f2937] bg-[#111111] p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-mono font-black text-lg uppercase tracking-tight">NEXUSCLAW TRADER</h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 border border-cyan-900 bg-cyan-950/20">
              <span className="w-1.5 h-1.5 animate-pulse bg-cyan-400" />
              <span className="font-mono text-[8px] uppercase tracking-widest text-cyan-400">Live</span>
            </div>
          </div>
          <p className="font-mono text-[10px] text-gray-400 leading-relaxed max-w-sm">
            Autonomous trading agent on XAUUSD M1. Detects its own entries and self-optimizes parameters via Claude AI after every 5 trades.
          </p>
        </div>
        <span className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 shrink-0 text-cyan-400 border border-cyan-900 bg-cyan-950/20">
          TRADING
        </span>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="font-mono text-[10px] text-gray-600 animate-pulse">Loading trades…</div>
      ) : (
        <FimateStats trades={trades} />
      )}

      {/* Trade table */}
      {!loading && trades.length > 0 && (
        <div>
          <div className="grid grid-cols-5 gap-2 pb-1 mb-1 border-b border-[#1f2937]">
            {['Date (JST)', 'Side', 'Result', 'Points', 'P&L'].map(h => (
              <span key={h} className="font-mono text-[8px] uppercase tracking-widest text-gray-600">{h}</span>
            ))}
          </div>
          {trades.slice(0, 10).map((t, i) => <TradeRow key={t.ticket ?? i} t={t} />)}
        </div>
      )}

      {!loading && trades.length === 0 && (
        <div className="font-mono text-[10px] text-gray-600">No trades yet — bot is running.</div>
      )}

      {/* Agent reasoning */}
      {latestParams && (
        <div className="bg-[#0a0a0a] border border-[#1f2937] px-4 py-3 border-l-2 border-l-cyan-900">
          <span className="font-mono text-[8px] uppercase tracking-widest text-gray-600 block mb-1">
            Last Agent Adjustment · Win rate {latestParams.win_rate?.toFixed(1)}% · {latestParams.sample_size} trades
          </span>
          <span className="font-mono text-[10px] text-gray-400 italic">{latestParams.reasoning}</span>
        </div>
      )}

      <div className="font-mono text-[8px] text-gray-600 uppercase tracking-widest">
        XAUUSD · M1 · Auto-refreshes every 30s
      </div>
    </div>
  )
}

const AGENT_V1 = '0xF350367d4E3e0e45dc0f9E425741A86b8cf7e66f' as const
const NEGA2   = '0x5073190885B3717E99E9B5436EE67ae26B743f92' as const

const KNOWN_AGENTS = [
  {
    address: AGENT_V1,
    name: 'AGENT V1',
    strategy: 'AUTO-COMPOUND',
    description: 'Autonomous AutoCompounder. Stakes, claims, and compounds every 5 minutes.',
    accent: '#22d3ee',
  },
  {
    address: NEGA2,
    name: 'NEGA 2',
    strategy: 'STAKER',
    description: 'First external staker on NexusClaw Protocol.',
    accent: '#a78bfa',
  },
]

const COMING_SOON = [
  {
    name: 'MARKETING AGENT',
    description: 'Posts content autonomously on Moltbook and Telegram.',
  },
  {
    name: 'WORK AGENT',
    description: 'Executes real-world tasks and earns outside the ecosystem.',
  },
  {
    name: 'CUSTOM AGENT',
    description: 'Build your own agent logic with NexusClaw SDK.',
  },
]

function cycles(stakedAt: bigint): number {
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - Number(stakedAt))
  return Math.floor(elapsed / 300)
}

function sinceDate(stakedAt: bigint): string {
  if (!stakedAt || stakedAt === 0n) return '—'
  return new Date(Number(stakedAt) * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-widest text-gray-400">{label}</span>
      <span className="font-mono text-xs font-bold" style={{ color: accent ?? '#ffffff' }}>{value}</span>
    </div>
  )
}

interface AgentInfo {
  staked: bigint
  pending: bigint
  stakedAt: bigint
}

function AgentCard({
  agent,
  info,
  loading,
}: {
  agent: typeof KNOWN_AGENTS[number]
  info?: AgentInfo
  loading: boolean
}) {
  const dash = loading ? '—' : undefined
  const staked   = info?.staked   ?? 0n
  const pending  = info?.pending  ?? 0n
  const stakedAt = info?.stakedAt ?? 0n
  const isActive = staked > 0n

  return (
    <div className="border border-[#1f2937] bg-[#111111] p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-mono font-black text-lg uppercase tracking-tight">{agent.name}</h3>
            {isActive && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 border border-cyan-900 bg-cyan-950/20">
                <span className="w-1.5 h-1.5 animate-pulse" style={{ background: agent.accent }} />
                <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: agent.accent }}>Active</span>
              </div>
            )}
          </div>
          <p className="font-mono text-[10px] text-gray-400 leading-relaxed max-w-xs">{agent.description}</p>
        </div>
        <span
          className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 border border-cyan-900 text-cyan-400 bg-cyan-950/20 shrink-0"
        >
          {agent.strategy}
        </span>
      </div>

      {/* Address */}
      <div className="bg-[#0a0a0a] border border-[#1f2937] px-4 py-3 flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] text-gray-600 hidden sm:block">{agent.address}</span>
        <span className="font-mono text-[10px] text-gray-600 sm:hidden">{shortAddr(agent.address)}</span>
        <a
          href={`${BASESCAN_URL}/address/${agent.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] uppercase tracking-widest shrink-0 transition-colors text-cyan-400 hover:text-white"
        >
          ↗
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b border-[#1f2937]">
        <StatCell
          label="Staked"
          value={dash ?? (staked > 0n ? formatTokenShort(staked) : '—')}
          accent={agent.accent}
        />
        <StatCell
          label="Pending"
          value={dash ?? (pending > 0n ? `+${formatTokenShort(pending)}` : '—')}
          accent="#22d3ee"
        />
        <StatCell
          label="Since"
          value={dash ?? sinceDate(stakedAt)}
        />
        <StatCell
          label="Cycles"
          value={dash ?? (stakedAt > 0n ? cycles(stakedAt).toLocaleString('en-US') : '—')}
          accent={agent.accent}
        />
      </div>

      {/* Footer link */}
      <a
        href={`${BASESCAN_URL}/address/${agent.address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest transition-colors self-start text-cyan-400 hover:text-white"
      >
        View on Basescan
        <span>→</span>
      </a>
    </div>
  )
}

export default function AgentsPage() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStakers' },
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'getUserInfo', args: [AGENT_V1] },
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'getUserInfo', args: [NEGA2] },
    ],
    query: { refetchInterval: 60_000 },
  })

  const totalStakers = data?.[0]?.result as bigint | undefined
  const v1Raw   = data?.[1]?.result as [bigint, bigint, bigint, bigint] | undefined
  const negaRaw = data?.[2]?.result as [bigint, bigint, bigint, bigint] | undefined

  const agentInfos: (AgentInfo | undefined)[] = [
    v1Raw   ? { staked: v1Raw[0],   pending: v1Raw[1],   stakedAt: v1Raw[2]   } : undefined,
    negaRaw ? { staked: negaRaw[0], pending: negaRaw[1], stakedAt: negaRaw[2] } : undefined,
  ]

  return (
    <PageShell variant="public">

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 border border-cyan-900 bg-cyan-950/30 px-4 py-2 text-xs text-cyan-400 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {isLoading ? '—' : ((totalStakers ?? 0n) + 1n).toString()} AGENTS ACTIVE
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Agents</h1>
          <p className="text-gray-400 text-sm">Autonomous agents running on NexusClaw Protocol. Each earns, compounds, and operates independently.</p>
        </div>
      </section>

      {/* ── ACTIVE AGENTS ── */}
      <section className="border-t border-[#1f2937] px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-8">Active Agents</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            {KNOWN_AGENTS.map((agent, i) => (
              <AgentCard
                key={agent.address}
                agent={agent}
                info={agentInfos[i]}
                loading={isLoading}
              />
            ))}
          </div>
          <FimateCard />
          <div className="mt-4 text-right">
            <Link href="/trader" className="font-mono text-[10px] uppercase tracking-widest text-cyan-400 hover:text-white transition-colors">
              Full results + get NexusClaw Trader →
            </Link>
          </div>
        </div>
      </section>

      {/* ── COMING SOON ── */}
      <section className="border-t border-[#1f2937] px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-8">More Agents Coming</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COMING_SOON.map((agent) => (
              <div key={agent.name} className="border border-[#1f2937] bg-[#111111] p-6 opacity-60 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-sm">{agent.name}</h3>
                  <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 border border-yellow-700 text-yellow-500 shrink-0">Coming Soon</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOIN ── */}
      <section className="border-t border-[#1f2937] px-6 py-16 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Want Your Agent Here?</h2>
          <p className="text-gray-400 text-sm mb-10">Launch your autonomous agent and appear on this page automatically.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/start-agent" className="bg-cyan-400 text-black font-bold px-8 py-3 text-sm hover:bg-cyan-300 transition-all">
              Start an Agent →
            </Link>
            <Link href="/leaderboard" className="border border-[#1f2937] text-gray-400 px-8 py-3 text-sm hover:border-cyan-900 hover:text-cyan-400 transition-all">
              View Leaderboard →
            </Link>
          </div>
        </div>
      </section>

    </PageShell>
  )
}
