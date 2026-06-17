'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useReadContracts } from 'wagmi'
import { TopNav } from '@/components/layout/TopNav'
import { STAKING_ADDRESS, STAKING_ABI, BASESCAN_URL } from '@/config/contracts'
import { formatTokenShort } from '@/lib/utils'

// ── Supabase FIMATHE data ─────────────────────────────────────────────────────

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
        { label: 'Trades',   value: trades.length.toString(),                 accent: '#00eefc' },
        { label: 'Win Rate', value: `${winRate}%`,                            accent: winRate >= 50 ? '#4ddbc9' : '#ffb4ab' },
        { label: 'Total P&L',value: `¥${totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString('en-US')}`, accent: totalPnl >= 0 ? '#4ddbc9' : '#ffb4ab' },
        { label: 'Avg Pts',  value: `${avgPts >= 0 ? '+' : ''}${avgPts}pts`, accent: avgPts >= 0 ? '#4ddbc9' : '#ffb4ab' },
      ].map(s => (
        <div key={s.label} className="bg-[#131313] rounded-lg p-4 border border-[#00eefc]/10">
          <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] block mb-1">{s.label}</span>
          <span className="font-['JetBrains_Mono'] text-sm font-bold" style={{ color: s.accent }}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── FIMATHE trade row ─────────────────────────────────────────────────────────

function TradeRow({ t }: { t: FimateTrade }) {
  const isWin   = t.result === 'TP'
  const dt      = new Date(t.entry_time + 'Z')
  const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' })

  return (
    <div className="grid grid-cols-5 gap-2 py-2 border-b border-[#1a1a1a] text-[10px] font-['JetBrains_Mono']">
      <span className="text-[#8b919f]">{dateStr} <span className="text-[#414754]">{timeStr}</span></span>
      <span className={t.direction === 'BUY' ? 'text-[#4ddbc9]' : 'text-[#ffb4ab]'}>
        {t.direction}{t.was_reversal ? ' ↺' : ''}
      </span>
      <span className={isWin ? 'text-[#4ddbc9]' : 'text-[#ffb4ab]'}>{t.result}</span>
      <span className={isWin ? 'text-[#4ddbc9]' : 'text-[#ffb4ab]'}>
        {t.profit_pts >= 0 ? '+' : ''}{t.profit_pts}pts
      </span>
      <span className={isWin ? 'text-[#4ddbc9]' : 'text-[#ffb4ab]'}>
        ¥{t.profit_jpy >= 0 ? '+' : ''}{Math.round(t.profit_jpy).toLocaleString('en-US')}
      </span>
    </div>
  )
}

// ── FIMATHE card ──────────────────────────────────────────────────────────────

function FimateCard() {
  const { trades, latestParams, loading } = useFimatheData()

  return (
    <div className="bg-[#0e0e0e] rounded-lg p-8 border border-[#00eefc]/20 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-['Space_Grotesk'] font-black text-lg uppercase tracking-tight">FIMATHE BOT</h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00eefc]/10">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#00eefc]" />
              <span className="font-['JetBrains_Mono'] text-[8px] uppercase tracking-widest text-[#00eefc]">Live</span>
            </div>
          </div>
          <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] leading-relaxed max-w-sm">
            Autonomous FIMATHE trader running on XAUUSD M1. Self-optimizes parameters via Claude API after every 5 trades.
          </p>
        </div>
        <span className="font-['JetBrains_Mono'] text-[8px] uppercase tracking-widest px-2 py-1 rounded shrink-0 text-[#00eefc] border border-[#00eefc]/40 bg-[#00eefc]/10">
          TRADING
        </span>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="font-['JetBrains_Mono'] text-[10px] text-[#414754] animate-pulse">Loading trades…</div>
      ) : (
        <FimateStats trades={trades} />
      )}

      {/* Trade table */}
      {!loading && trades.length > 0 && (
        <div>
          <div className="grid grid-cols-5 gap-2 pb-1 mb-1 border-b border-[#414754]/30">
            {['Date (JST)', 'Side', 'Result', 'Points', 'P&L'].map(h => (
              <span key={h} className="font-['JetBrains_Mono'] text-[8px] uppercase tracking-widest text-[#414754]">{h}</span>
            ))}
          </div>
          {trades.slice(0, 10).map((t, i) => <TradeRow key={t.ticket ?? i} t={t} />)}
        </div>
      )}

      {!loading && trades.length === 0 && (
        <div className="font-['JetBrains_Mono'] text-[10px] text-[#414754]">No trades yet — bot is running.</div>
      )}

      {/* Agent reasoning */}
      {latestParams && (
        <div className="bg-[#131313] rounded px-4 py-3 border-l-2 border-[#00eefc]/40">
          <span className="font-['JetBrains_Mono'] text-[8px] uppercase tracking-widest text-[#414754] block mb-1">
            Last Agent Adjustment · Win rate {latestParams.win_rate?.toFixed(1)}% · {latestParams.sample_size} trades
          </span>
          <span className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] italic">{latestParams.reasoning}</span>
        </div>
      )}

      <div className="font-['JetBrains_Mono'] text-[8px] text-[#414754] uppercase tracking-widest">
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
    accent: '#00eefc',
  },
  {
    address: NEGA2,
    name: 'NEGA 2',
    strategy: 'STAKER',
    description: 'First external staker on NexusClaw Protocol.',
    accent: '#abc7ff',
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
      <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f]">{label}</span>
      <span className="font-['JetBrains_Mono'] text-xs font-bold" style={{ color: accent ?? '#e5e2e1' }}>{value}</span>
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
  const staked  = info?.staked   ?? 0n
  const pending = info?.pending  ?? 0n
  const stakedAt = info?.stakedAt ?? 0n
  const isActive = staked > 0n

  return (
    <div
      className="bg-[#0e0e0e] rounded-lg p-8 flex flex-col gap-6 border"
      style={{ borderColor: `${agent.accent}30` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-['Space_Grotesk'] font-black text-lg uppercase tracking-tight">{agent.name}</h3>
            {isActive && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: `${agent.accent}15` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: agent.accent }} />
                <span className="font-['JetBrains_Mono'] text-[8px] uppercase tracking-widest" style={{ color: agent.accent }}>Active</span>
              </div>
            )}
          </div>
          <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] leading-relaxed max-w-xs">{agent.description}</p>
        </div>
        <span
          className="font-['JetBrains_Mono'] text-[8px] uppercase tracking-widest px-2 py-1 rounded shrink-0"
          style={{ color: agent.accent, border: `1px solid ${agent.accent}40`, background: `${agent.accent}10` }}
        >
          {agent.strategy}
        </span>
      </div>

      {/* Address */}
      <div className="bg-[#131313] px-4 py-3 rounded flex items-center justify-between gap-4">
        <span className="font-['JetBrains_Mono'] text-[10px] text-[#414754] hidden sm:block">{agent.address}</span>
        <span className="font-['JetBrains_Mono'] text-[10px] text-[#414754] sm:hidden">{shortAddr(agent.address)}</span>
        <a
          href={`${BASESCAN_URL}/address/${agent.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest shrink-0 transition-colors"
          style={{ color: agent.accent }}
        >
          ↗
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b border-[#1a1a1a]">
        <StatCell
          label="Staked"
          value={dash ?? (staked > 0n ? formatTokenShort(staked) : '—')}
          accent={agent.accent}
        />
        <StatCell
          label="Pending"
          value={dash ?? (pending > 0n ? `+${formatTokenShort(pending)}` : '—')}
          accent="#4ddbc9"
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
        className="flex items-center gap-2 font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest transition-colors self-start"
        style={{ color: agent.accent }}
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
  const v1Raw  = data?.[1]?.result as [bigint, bigint, bigint, bigint] | undefined
  const negaRaw = data?.[2]?.result as [bigint, bigint, bigint, bigint] | undefined

  const agentInfos: (AgentInfo | undefined)[] = [
    v1Raw  ? { staked: v1Raw[0],  pending: v1Raw[1],  stakedAt: v1Raw[2]  } : undefined,
    negaRaw ? { staked: negaRaw[0], pending: negaRaw[1], stakedAt: negaRaw[2] } : undefined,
  ]

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav active="/agents" />

      <main className="pt-24 pb-24 px-4 md:px-8 max-w-[1440px] mx-auto">

        {/* ── HERO ── */}
        <section className="mt-12 mb-16">
          <div className="border-l-4 border-[#abc7ff] pl-6 py-2 mb-6">
            <h1 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-2">
              AGENTS
            </h1>
            <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#8b919f]">
              Autonomous agents running on NexusClaw Protocol.
            </p>
          </div>
          <div className="flex items-center gap-4 pl-7">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00eefc] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00eefc]" />
              </span>
              <span className="font-['JetBrains_Mono'] text-xs text-[#00eefc]">
                {isLoading ? '—' : (totalStakers?.toString() ?? '—')} agents active
              </span>
            </div>
            <span className="font-['JetBrains_Mono'] text-[10px] text-[#414754] uppercase tracking-widest">
              Each agent earns, compounds, and operates independently.
            </span>
          </div>
        </section>

        {/* ── ACTIVE AGENTS ── */}
        <section className="mb-16">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {KNOWN_AGENTS.map((agent, i) => (
              <AgentCard
                key={agent.address}
                agent={agent}
                info={agentInfos[i]}
                loading={isLoading}
              />
            ))}
          </div>
        </section>

        {/* ── COMING SOON ── */}
        <section className="mb-16">
          <h2 className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.25em] text-[#00eefc] mb-8">// More Agents Coming</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COMING_SOON.map((agent) => (
              <div
                key={agent.name}
                className="bg-[#0e0e0e] border border-[#414754]/20 rounded-lg p-8 opacity-40 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-['Space_Grotesk'] font-black text-base uppercase tracking-tight">{agent.name}</h3>
                  <span className="font-['JetBrains_Mono'] text-[8px] uppercase tracking-widest px-2 py-0.5 border border-[#414754]/60 rounded text-[#414754] shrink-0">
                    Coming Soon
                  </span>
                </div>
                <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] leading-relaxed">{agent.description}</p>
                <div className="mt-auto pt-4 border-t border-[#1a1a1a]">
                  <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#414754]">— — —</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── JOIN ── */}
        <section className="bg-[#0e0e0e] border border-[#414754]/20 rounded-lg p-12 text-center">
          <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl font-black uppercase tracking-tight mb-3">
            Want Your Agent Here?
          </h2>
          <p className="font-['JetBrains_Mono'] text-xs text-[#8b919f] uppercase tracking-widest mb-10">
            Launch your autonomous agent and appear on this page automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/start-agent"
              className="px-8 py-4 bg-gradient-to-r from-[#00eefc] to-[#448fff] text-[#050505] font-['Space_Grotesk'] font-black uppercase tracking-widest text-sm rounded hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Start an Agent →
            </Link>
            <Link
              href="/leaderboard"
              className="px-8 py-4 border border-[#414754]/40 text-[#c1c6d6] font-['Space_Grotesk'] font-bold uppercase tracking-widest text-sm rounded hover:border-[#abc7ff]/40 hover:text-[#e5e2e1] transition-all"
            >
              View Leaderboard →
            </Link>
          </div>
        </section>

      </main>
    </div>
  )
}
