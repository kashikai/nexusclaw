'use client'

import Link from 'next/link'
import { useReadContracts } from 'wagmi'
import { TopNav } from '@/components/layout/TopNav'
import { STAKING_ADDRESS, STAKING_ABI, BASESCAN_URL } from '@/config/contracts'
import { formatTokenShort } from '@/lib/utils'

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
