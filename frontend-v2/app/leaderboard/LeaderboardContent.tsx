'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { STAKING_ADDRESS, STAKING_ABI } from '@/config/contracts'
import { TopNav } from '@/components/layout/TopNav'

const DEPLOY_BLOCK = 44182433n

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
})

interface StakerInfo {
  address: `0x${string}`
  staked: bigint
  pending: bigint
  stakedAt: bigint
  effectiveAPY: bigint
}

interface ProtocolStats {
  totalStakers: bigint
  totalStaked: bigint
  runwayDays: bigint
}

function formatTokens(wei: bigint): string {
  const num = parseFloat(formatUnits(wei, 18))
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
  if (num >= 1_000) return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return num.toFixed(2)
}

function formatAddress(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function formatDate(ts: bigint): string {
  if (!ts || ts === 0n) return '—'
  const d = new Date(Number(ts) * 1000)
  return (
    d.getFullYear() +
    '.' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '.' +
    String(d.getDate()).padStart(2, '0')
  )
}

export default function LeaderboardContent() {
  const [stakers, setStakers] = useState<StakerInfo[]>([])
  const [stats, setStats] = useState<ProtocolStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayCount, setDisplayCount] = useState(20)
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const h = String(now.getUTCHours()).padStart(2, '0')
      const m = String(now.getUTCMinutes()).padStart(2, '0')
      const s = String(now.getUTCSeconds()).padStart(2, '0')
      setClock(`${h}:${m}:${s} UTC`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)

        // Protocol stats (parallel)
        const [totalStaked, totalStakersRaw, runwayRaw] = await Promise.all([
          publicClient.readContract({
            address: STAKING_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'totalStaked',
          }),
          publicClient.readContract({
            address: STAKING_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'totalStakers',
          }),
          publicClient.readContract({
            address: STAKING_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'rewardPoolRunway',
          }),
        ])

        setStats({
          totalStakers: totalStakersRaw as bigint,
          totalStaked: totalStaked as bigint,
          runwayDays: runwayRaw as bigint,
        })

        // Get staker addresses from StakerAdded events (chunked — RPC limit 10k blocks)
        const CHUNK = 9_999n
        const latestBlock = await publicClient.getBlockNumber()
        const stakerEvent = parseAbiItem('event StakerAdded(address indexed staker)')
        const logs: Array<{ args?: { staker?: `0x${string}` } }> = []
        for (let from = DEPLOY_BLOCK; from <= latestBlock; from += CHUNK + 1n) {
          const to = from + CHUNK > latestBlock ? latestBlock : from + CHUNK
          const chunk = await publicClient.getLogs({
            address: STAKING_ADDRESS,
            event: stakerEvent,
            fromBlock: from,
            toBlock: to,
          })
          logs.push(...chunk)
        }

        const uniqueAddrs = [
          ...new Set(
            logs
              .map((l) => l.args?.staker as `0x${string}` | undefined)
              .filter((a): a is `0x${string}` => !!a)
          ),
        ]

        if (uniqueAddrs.length === 0) {
          setStakers([])
          setLoading(false)
          return
        }

        // Batch getUserInfo via multicall
        const results = await publicClient.multicall({
          contracts: uniqueAddrs.map((addr) => ({
            address: STAKING_ADDRESS as `0x${string}`,
            abi: STAKING_ABI,
            functionName: 'getUserInfo' as const,
            args: [addr] as const,
          })),
          allowFailure: true,
        })

        const stakerList: StakerInfo[] = []
        for (let i = 0; i < uniqueAddrs.length; i++) {
          const r = results[i]
          if (r.status === 'success') {
            const [staked, pending, stakedAt, effectiveAPY] = r.result as readonly [
              bigint,
              bigint,
              bigint,
              bigint,
            ]
            if (staked > 0n) {
              stakerList.push({
                address: uniqueAddrs[i],
                staked,
                pending,
                stakedAt,
                effectiveAPY,
              })
            }
          }
        }

        // Sort by staked descending
        stakerList.sort((a, b) => (b.staked > a.staked ? 1 : b.staked < a.staked ? -1 : 0))
        setStakers(stakerList)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Failed to load on-chain data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function exportCSV() {
    const rows = ['Rank,Address,Staked ($NEXUS),Pending Rewards,Staking Since,Effective APY%'].concat(
      stakers.map((s, i) =>
        [
          i + 1,
          s.address,
          formatUnits(s.staked, 18),
          formatUnits(s.pending, 18),
          formatDate(s.stakedAt),
          (Number(s.effectiveAPY) / 100).toFixed(2),
        ].join(',')
      )
    )
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nexusclaw_leaderboard.csv'
    a.click()
  }

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav active="/leaderboard" />

      <main className="pt-20 min-h-screen relative overflow-hidden">
        {/* Background Lobster Watermark */}
        <div className="absolute right-[-10%] top-[10%] w-[700px] h-[700px] opacity-[0.07] pointer-events-none grayscale mix-blend-screen">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6b9x2p3ip6LCyg7x6d7tGAL5NMa2R9tqO4OXNKUgLN7hTPf0CzCVmF9WpEHUwrw49uHCxZstLyOWqgwbCP0NW4NBzkEG9XRteDDDJT-TTBPnr_vP_tbu99o22jt_hIUajDbvB0qnq7860VjsbP9CsWBqzThdNgHfdrjTcVGehcXJEmv_z835uEbmaiWBsecx0MeeOpWS9GL42JRcsi-VIVCGTZsTpmN8r8cT6DBaXFg9yCLsJLwVNoOzhvsZTkZSJcdn2o7Vk5159"
            alt="Mechanized Lobster"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="max-w-7xl mx-auto px-8 py-12 relative z-10">
          {/* Hero Section */}
          <header className="mb-16">
            <div className="flex items-baseline space-x-4 mb-2">
              <span className="text-[#abc7ff] text-sm font-['JetBrains_Mono'] tracking-tighter">
                /sys/nodes/ranking
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-[#414754] to-transparent" />
            </div>
            <h1 className="text-7xl font-black tracking-tighter text-[#e5e2e1] leading-none uppercase italic font-['Space_Grotesk']">
              AGENT_<span className="text-[#abc7ff]">LEADERBOARD</span>
            </h1>
            <p className="mt-4 text-[#8b919f] font-['JetBrains_Mono'] text-sm max-w-xl">
              Real-time synchronization of decentralized agent nodes across the NEXUS_CLAW protocol.
              Priority ranking based on staking density and uptime stability.
            </p>
          </header>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* Total Stakers */}
            <div
              className="p-8 border-l border-[#abc7ff]"
              style={{
                background: 'rgba(32,31,31,0.6)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 40px rgba(171,199,255,0.05)',
              }}
            >
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-[0.2em] text-[#8b919f]">
                  Total Active Agents
                </span>
                <span className="material-symbols-outlined text-[#abc7ff] text-sm">hub</span>
              </div>
              <div className="text-4xl font-bold font-['Space_Grotesk'] tracking-tighter">
                {loading ? (
                  <span className="text-[#414754]">—</span>
                ) : (
                  stats?.totalStakers.toString() ?? '—'
                )}
              </div>
              <div className="mt-2 text-[#00eefc] text-[10px] font-['JetBrains_Mono']">
                LIVE <span className="text-[#8b919f]">ON-CHAIN COUNT</span>
              </div>
            </div>

            {/* Total Staked */}
            <div
              className="p-8 border-l border-[#00eefc]"
              style={{
                background: 'rgba(32,31,31,0.6)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 40px rgba(171,199,255,0.05)',
              }}
            >
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-[0.2em] text-[#8b919f]">
                  Total Staked
                </span>
                <span className="material-symbols-outlined text-[#00eefc] text-sm">account_balance</span>
              </div>
              <div className="text-4xl font-bold font-['Space_Grotesk'] tracking-tighter">
                {loading ? (
                  <span className="text-[#414754]">—</span>
                ) : stats ? (
                  formatTokens(stats.totalStaked)
                ) : (
                  '—'
                )}
              </div>
              <div className="mt-2 text-[#00eefc] text-[10px] font-['JetBrains_Mono']">
                $NEXUS <span className="text-[#8b919f]">LOCKED</span>
              </div>
            </div>

            {/* Pool Runway */}
            <div
              className="p-8 border-l border-[#e04cff]"
              style={{
                background: 'rgba(32,31,31,0.6)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 40px rgba(171,199,255,0.05)',
              }}
            >
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-[0.2em] text-[#8b919f]">
                  Pool Runway
                </span>
                <span className="material-symbols-outlined text-[#e04cff] text-sm">speed</span>
              </div>
              <div className="text-4xl font-bold font-['Space_Grotesk'] tracking-tighter">
                {loading ? (
                  <span className="text-[#414754]">—</span>
                ) : stats ? (
                  `${stats.runwayDays.toString()} DAYS`
                ) : (
                  '—'
                )}
              </div>
              <div className="mt-2 text-[#00eefc] text-[10px] font-['JetBrains_Mono']">
                OPTIMAL <span className="text-[#8b919f]">CAPACITY</span>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div
            className="border border-[#414754]/30"
            style={{
              background: 'rgba(32,31,31,0.6)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 40px rgba(171,199,255,0.05)',
            }}
          >
            {/* Table Header Bar */}
            <div className="p-6 border-b border-[#414754]/30 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#abc7ff] animate-pulse" />
                <h2 className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest">
                  Live_Ranking_Feed
                </h2>
              </div>
              <div className="flex space-x-4">
                {!loading && stakers.length > 0 && (
                  <button
                    onClick={exportCSV}
                    className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#abc7ff] border border-[#abc7ff] px-3 py-1 hover:bg-[#abc7ff] hover:text-[#001b3f] transition-all"
                  >
                    Export_CSV
                  </button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              {loading && (
                <div className="py-24 text-center">
                  <div className="inline-flex items-center gap-3 text-[#8b919f] font-['JetBrains_Mono'] text-xs uppercase tracking-widest">
                    <div className="w-2 h-2 bg-[#abc7ff] animate-pulse" />
                    Synchronizing on-chain data...
                  </div>
                </div>
              )}

              {!loading && error && (
                <div className="py-24 text-center">
                  <p className="text-[#ff6b6b] font-['JetBrains_Mono'] text-xs uppercase tracking-widest">
                    Error: {error}
                  </p>
                </div>
              )}

              {!loading && !error && stakers.length === 0 && (
                <div className="py-24 text-center">
                  <p className="text-[#8b919f] font-['JetBrains_Mono'] text-xs uppercase tracking-widest">
                    No active stakers found
                  </p>
                </div>
              )}

              {!loading && !error && stakers.length > 0 && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#8b919f] border-b border-[#414754]/20">
                      <th className="px-8 py-4 font-medium">Rank</th>
                      <th className="px-8 py-4 font-medium">Address</th>
                      <th className="px-8 py-4 font-medium">Staked ($NEXUS)</th>
                      <th className="px-8 py-4 font-medium">Pending Rewards</th>
                      <th className="px-8 py-4 font-medium">Staking Since</th>
                      <th className="px-8 py-4 font-medium text-right">Effective APY</th>
                    </tr>
                  </thead>
                  <tbody className="font-['JetBrains_Mono'] text-sm">
                    {stakers.slice(0, displayCount).map((s, i) => (
                      <tr
                        key={s.address}
                        className="hover:bg-[#2a2a2a] transition-colors border-b border-[#414754]/10"
                      >
                        <td className="px-8 py-6">
                          <span className={i === 0 ? 'text-[#00eefc]' : 'text-[#8b919f]'}>
                            #{String(i + 1).padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <a
                            href={`https://basescan.org/address/${s.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#e5e2e1] hover:text-[#abc7ff] transition-colors"
                          >
                            {formatAddress(s.address)}
                          </a>
                        </td>
                        <td className="px-8 py-6 font-bold text-[#e5e2e1]">
                          {formatTokens(s.staked)}
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[#abc7ff]">+{formatTokens(s.pending)}</span>
                        </td>
                        <td className="px-8 py-6 text-[#8b919f]">{formatDate(s.stakedAt)}</td>
                        <td className="px-8 py-6 text-right">
                          <span className="bg-[#00eefc]/10 text-[#00eefc] px-2 py-1 text-[11px]">
                            {(Number(s.effectiveAPY) / 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Load More */}
            {!loading && stakers.length > displayCount && (
              <div className="p-6 flex justify-center border-t border-[#414754]/10">
                <button
                  onClick={() => setDisplayCount((c) => c + 20)}
                  className="flex items-center space-x-3 group"
                >
                  <span className="w-10 h-px bg-[#414754] group-hover:bg-[#abc7ff] group-hover:w-20 transition-all duration-300" />
                  <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-[0.3em] text-[#8b919f] group-hover:text-[#abc7ff] transition-colors">
                    Load_More_Nodes
                  </span>
                  <span className="w-10 h-px bg-[#414754] group-hover:bg-[#abc7ff] group-hover:w-20 transition-all duration-300" />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-20 flex flex-col md:flex-row justify-between items-start md:items-end border-t border-[#414754]/20 pt-10 pb-20 md:pb-10">
            <div className="max-w-md">
              <div className="text-[#abc7ff] font-black tracking-tighter text-lg mb-2 font-['Space_Grotesk']">
                NEXUS_CLAW
              </div>
              <p className="text-[#414754] text-[10px] font-['JetBrains_Mono'] leading-relaxed uppercase tracking-wider">
                Protocol security is maintained via shard-level encryption. All staking yields are
                subject to the Clawback Clause (Section 4.2). Total transparency is forced through
                decentralized ledger architecture.
              </p>
            </div>
            <div className="mt-8 md:mt-0 flex space-x-12">
              <div>
                <div className="text-[10px] font-['JetBrains_Mono'] text-[#8b919f] uppercase tracking-widest mb-2">
                  SYSTEM_CLOCK
                </div>
                <div className="text-sm font-['JetBrains_Mono'] text-[#e5e2e1]">
                  {clock || '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-['JetBrains_Mono'] text-[#8b919f] uppercase tracking-widest mb-2">
                  NETWORK
                </div>
                <div className="text-sm font-['JetBrains_Mono'] text-[#00eefc]">BASE</div>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 w-full border-t border-[#414754]/30 flex justify-around items-center py-4 z-50"
        style={{ background: 'rgba(32,31,31,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <Link href="/" className="flex flex-col items-center text-[#8b919f]">
          <span className="material-symbols-outlined">home</span>
          <span className="text-[8px] font-['JetBrains_Mono'] mt-1">HOME</span>
        </Link>
        <Link href="/staking" className="flex flex-col items-center text-[#8b919f]">
          <span className="material-symbols-outlined">monitoring</span>
          <span className="text-[8px] font-['JetBrains_Mono'] mt-1">STAKE</span>
        </Link>
        <Link href="/leaderboard" className="flex flex-col items-center text-[#abc7ff]">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            leaderboard
          </span>
          <span className="text-[8px] font-['JetBrains_Mono'] mt-1">RANK</span>
        </Link>
        <Link href="/staking" className="flex flex-col items-center text-[#8b919f]">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <span className="text-[8px] font-['JetBrains_Mono'] mt-1">WALLET</span>
        </Link>
      </nav>
    </div>
  )
}
