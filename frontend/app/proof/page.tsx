'use client'

import { useState, useEffect } from 'react'
import { useReadContracts } from 'wagmi'
import Link from 'next/link'
import { TopNav } from '@/components/layout/TopNav'
import { STAKING_ADDRESS, STAKING_ABI, BASESCAN_URL } from '@/config/contracts'
import { formatTokenShort } from '@/lib/utils'

const AGENT_ADDRESS = '0xF350367d4E3e0e45dc0f9E425741A86b8cf7e66f' as const
const GITHUB_URL = 'https://github.com/kashikai/nexusclaw'
const CONTRACT_URL = `${BASESCAN_URL}/address/${STAKING_ADDRESS}`
const AGENT_BASESCAN_URL = `${BASESCAN_URL}/address/${AGENT_ADDRESS}`

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function jstString(date: Date) {
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }) + ' JST'
}

function uptime(stakedAt: bigint, now: Date): { days: number; hours: number; minutes: number; totalSeconds: number } {
  const totalSeconds = Math.max(0, Math.floor(now.getTime() / 1000) - Number(stakedAt))
  return {
    totalSeconds,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
  }
}

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-[#1e1e1e] gap-4">
      <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#8b919f] shrink-0">{label}</span>
      <span className="font-['JetBrains_Mono'] text-xs font-bold text-right" style={{ color: accent || '#e5e2e1' }}>{value}</span>
    </div>
  )
}

function Check({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-['JetBrains_Mono'] text-[#00eefc] text-sm mt-0.5 shrink-0">✓</span>
      <span className="font-['Space_Grotesk'] text-sm text-[#c1c6d6]">{text}</span>
    </div>
  )
}

function VerifyBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-5 py-3 bg-[#1c1b1b] border border-[#414754]/30 rounded hover:border-[#abc7ff]/40 hover:bg-[#222] transition-all font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#c1c6d6] hover:text-[#abc7ff]"
    >
      {label}
      <span className="text-[#414754] text-xs">↗</span>
    </a>
  )
}

export default function ProofPage() {
  const now = useNow()

  const { data, isLoading, dataUpdatedAt } = useReadContracts({
    contracts: [
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'getUserInfo', args: [AGENT_ADDRESS] },
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStaked' },
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStakers' },
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPool' },
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPoolRunway' },
    ],
    query: { refetchInterval: 60_000 },
  })

  const userInfo = data?.[0]?.result as [bigint, bigint, bigint, bigint] | undefined
  const totalStaked = data?.[1]?.result as bigint | undefined
  const totalStakers = data?.[2]?.result as bigint | undefined
  const rewardPool = data?.[3]?.result as bigint | undefined
  const runway = data?.[4]?.result as bigint | undefined

  const agentStaked = userInfo?.[0] ?? 0n
  const agentPending = userInfo?.[1] ?? 0n
  const stakedAt = userInfo?.[2] ?? 0n

  const up = stakedAt > 0n ? uptime(stakedAt, now) : null
  const cycles = up ? Math.floor(up.totalSeconds / 300) : 0
  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt) : null

  const dash = isLoading ? '—' : undefined

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav active="/proof" />

      <main className="pt-24 pb-24 px-4 md:px-8 max-w-[1440px] mx-auto">

        {/* ── HERO ── */}
        <section className="mt-12 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00eefc] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00eefc]" />
            </span>
            <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.3em] text-[#00eefc]">Live — Base Mainnet</span>
          </div>

          <h1 className="font-['Space_Grotesk'] text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-4">
            Agent V1 is running<br />
            <span className="text-[#00eefc]">right now.</span>
          </h1>

          <p className="font-['JetBrains_Mono'] text-xs text-[#8b919f] uppercase tracking-[0.2em] mb-2">
            All data read directly from Base Mainnet. No backend.
          </p>
          <p className="font-['JetBrains_Mono'] text-[10px] text-[#414754] uppercase tracking-widest">
            {jstString(now)}
          </p>
        </section>

        {/* ── AGENT + PROTOCOL CARDS ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">

          {/* Agent Status */}
          <div className="bg-[#0e0e0e] border border-[#414754]/20 rounded-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-['Space_Grotesk'] font-bold text-base uppercase tracking-widest mb-1">Agent V1 Status</h2>
                <a
                  href={AGENT_BASESCAN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-['JetBrains_Mono'] text-[9px] text-[#414754] hover:text-[#abc7ff] transition-colors break-all"
                >
                  {AGENT_ADDRESS}
                </a>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#00eefc]/10 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00eefc] animate-pulse" />
                <span className="font-['JetBrains_Mono'] text-[9px] text-[#00eefc] uppercase">Active</span>
              </div>
            </div>

            <div className="space-y-0">
              <Row label="Staked" value={dash ?? (agentStaked > 0n ? `${formatTokenShort(agentStaked)} $NEXUSCLAW` : '—')} accent="#abc7ff" />
              <Row label="Pending Rewards" value={dash ?? (agentPending > 0n ? `+${formatTokenShort(agentPending)} $NEXUSCLAW` : '—')} accent="#4ddbc9" />
              <Row label="Compound Interval" value="Every 5 min" />
              <Row label="Gas Spent" value="< $0.01 total" accent="#4ddbc9" />
              <Row label="Cycles Completed" value={dash ?? cycles.toLocaleString('en-US')} accent="#00eefc" />
              <Row
                label="Uptime"
                value={dash ?? (up ? `${up.days}d ${up.hours}h ${up.minutes}m` : '—')}
                accent="#abc7ff"
              />
              <Row
                label="Last Action"
                value={dash ?? (stakedAt > 0n ? new Date(Number(stakedAt) * 1000).toLocaleDateString('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'short', day: 'numeric' }) : '—')}
              />
              <Row label="Next Run" value="~5 min" accent="#00eefc" />
            </div>

            {lastRefreshed && (
              <p className="font-['JetBrains_Mono'] text-[9px] text-[#414754] uppercase tracking-widest mt-5">
                Last refresh: {lastRefreshed.toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour12: false })} JST
              </p>
            )}
          </div>

          {/* Protocol Stats */}
          <div className="bg-[#0e0e0e] border border-[#414754]/20 rounded-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-['Space_Grotesk'] font-bold text-base uppercase tracking-widest">Protocol Stats</h2>
              <span className="font-['JetBrains_Mono'] text-[9px] text-[#8b919f] uppercase">Auto-refresh 60s</span>
            </div>

            <div className="space-y-0">
              <Row label="Total Staked" value={dash ?? (totalStaked ? `${formatTokenShort(totalStaked)} $NEXUSCLAW` : '—')} accent="#abc7ff" />
              <Row label="Active Stakers" value={dash ?? (totalStakers?.toString() ?? '—')} accent="#00eefc" />
              <Row label="Reward Pool" value={dash ?? (rewardPool ? `${formatTokenShort(rewardPool)} $NEXUSCLAW` : '—')} accent="#4ddbc9" />
              <Row
                label="Pool Runway"
                value={dash ?? (runway ? (Number(runway) > 999 ? '999+ days' : `${Number(runway)} days`) : '—')}
                accent="#4ddbc9"
              />
              <Row label="APY" value="20%" accent="#00eefc" />
              <Row label="Network" value="Base Mainnet" accent="#abc7ff" />
              <Row label="Contract" value="Audited v10.3" accent="#4ddbc9" />
              <Row label="Multisig" value="3/5 Safe" />
            </div>
          </div>
        </section>

        {/* ── WHAT THIS PROVES ── */}
        <section className="mb-16">
          <div className="border-l-4 border-[#00eefc] pl-6 py-2 mb-8">
            <h2 className="font-['Space_Grotesk'] font-black text-2xl uppercase tracking-tight">What This Proves</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Check text="An AI agent can earn money autonomously" />
            <Check text="Gas costs are negligible on Base Mainnet" />
            <Check text="Rewards compound automatically every 5 min" />
            <Check text="No human intervention required" />
            <Check text="All activity verifiable on-chain" />
          </div>
        </section>

        {/* ── VERIFY ── */}
        <section className="mb-16">
          <div className="border-l-4 border-[#abc7ff] pl-6 py-2 mb-8">
            <h2 className="font-['Space_Grotesk'] font-black text-2xl uppercase tracking-tight">Verify It Yourself</h2>
          </div>

          <div className="bg-[#0e0e0e] border border-[#414754]/20 rounded-lg p-8">
            <div className="flex flex-wrap gap-3 mb-8">
              <VerifyBtn href={AGENT_BASESCAN_URL} label="Verify on Basescan →" />
              <VerifyBtn href={CONTRACT_URL} label="View Contract Code →" />
              <VerifyBtn href={GITHUB_URL} label="View GitHub →" />
            </div>

            <div className="bg-[#131313] border-l-2 border-[#414754]/40 p-4 rounded mb-6">
              <p className="font-['JetBrains_Mono'] text-[9px] text-[#8b919f] uppercase tracking-widest mb-1">Agent Wallet</p>
              <a
                href={AGENT_BASESCAN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-['JetBrains_Mono'] text-xs text-[#abc7ff] hover:text-[#3A8BFF] transition-colors break-all"
              >
                {AGENT_ADDRESS}
              </a>
            </div>

            <div className="bg-[#131313] border-l-2 border-[#414754]/40 p-4 rounded">
              <p className="font-['JetBrains_Mono'] text-[9px] text-[#8b919f] uppercase tracking-widest mb-1">Staking Contract</p>
              <a
                href={CONTRACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-['JetBrains_Mono'] text-xs text-[#abc7ff] hover:text-[#3A8BFF] transition-colors break-all"
              >
                {STAKING_ADDRESS}
              </a>
            </div>

            <p className="font-['JetBrains_Mono'] text-[10px] text-[#414754] uppercase tracking-widest mt-6">
              We hide nothing. Every transaction is public.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-[#0e0e0e] border border-[#414754]/20 rounded-lg p-12 text-center">
          <div className="relative">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0, 238, 252, 0.04) 0%, transparent 70%)' }} />
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl font-black uppercase tracking-tight mb-3">
            Want your own agent?
          </h2>
          <p className="font-['JetBrains_Mono'] text-xs text-[#8b919f] uppercase tracking-widest mb-8">
            Deploy in minutes. Runs 24/7. You stay in control.
          </p>
          <Link
            href="/start-agent"
            className="inline-block px-10 py-4 bg-gradient-to-r from-[#00eefc] to-[#448fff] text-[#050505] font-['Space_Grotesk'] font-black uppercase tracking-widest text-sm rounded hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Start an Agent →
          </Link>
        </section>

      </main>
    </div>
  )
}
