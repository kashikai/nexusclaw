'use client'

import { useState, useEffect } from 'react'
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { STAKING_ADDRESS, STAKING_ABI } from '@/config/contracts'
import { PageShell } from '@/components/layout/PageShell'

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
        const stakerEvent = parseAbiItem('event Staked(address indexed user, uint256 amount, uint256 autoClaimed)')
        const logs: Array<{ args?: { user?: `0x${string}` } }> = []
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
              .map((l) => l.args?.user as `0x${string}` | undefined)
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
    const rows = ['Rank,Address,Staked ($NEXUSCLAW),Pending Rewards,Staking Since,Effective APY%'].concat(
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
    <PageShell variant="public">
      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Agent Leaderboard</h1>
          <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">Real-time on-chain staker rankings // Base Mainnet</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="border border-cyan-900 bg-[#111111] p-6">
            <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-3">Total Active Agents</div>
            <div className="text-3xl font-bold text-cyan-400">
              {loading ? '—' : (stats?.totalStakers.toString() ?? '—')}
            </div>
            <div className="font-mono text-[10px] text-gray-600 mt-1">LIVE ON-CHAIN COUNT</div>
          </div>

          <div className="border border-[#1f2937] bg-[#111111] p-6">
            <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-3">Total Staked</div>
            <div className="text-3xl font-bold text-cyan-400">
              {loading ? '—' : stats ? formatTokens(stats.totalStaked) : '—'}
            </div>
            <div className="font-mono text-[10px] text-gray-600 mt-1">$NEXUSCLAW LOCKED</div>
          </div>

          <div className="border border-[#1f2937] bg-[#111111] p-6">
            <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-3">Pool Runway</div>
            <div className="text-3xl font-bold text-cyan-400">
              {loading ? '—' : stats ? `${stats.runwayDays > 9999n ? '999+' : stats.runwayDays.toString()} days` : '—'}
            </div>
            <div className="font-mono text-[10px] text-gray-600 mt-1">OPTIMAL CAPACITY</div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="border border-[#1f2937] bg-[#111111]">
          {/* Table header bar */}
          <div className="px-6 py-4 border-b border-[#1f2937] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-cyan-400 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-gray-400">Live Ranking Feed</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] text-gray-600">{clock}</span>
              {!loading && stakers.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="font-mono text-[10px] uppercase tracking-widest text-cyan-400 border border-cyan-900 px-3 py-1 hover:bg-cyan-950/30 transition-all"
                >
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="py-24 text-center">
              <div className="inline-flex items-center gap-3 text-gray-500 font-mono text-xs uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-cyan-400 animate-pulse" />
                Synchronizing on-chain data...
              </div>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="py-24 text-center">
              <p className="text-red-400 font-mono text-xs uppercase tracking-widest">Error: {error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && stakers.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">No active stakers found</p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && stakers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-widest text-gray-500 border-b border-[#1f2937]">
                    <th className="px-6 py-3 font-medium">Rank</th>
                    <th className="px-6 py-3 font-medium">Address</th>
                    <th className="px-6 py-3 font-medium">Staked</th>
                    <th className="px-6 py-3 font-medium">Pending</th>
                    <th className="px-6 py-3 font-medium">Since</th>
                    <th className="px-6 py-3 font-medium text-right">APY</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {stakers.slice(0, displayCount).map((s, i) => (
                    <tr key={s.address} className="hover:bg-[#0d0d0d] transition-colors border-b border-[#1f2937]">
                      <td className="px-6 py-4">
                        <span className={i === 0 ? 'text-cyan-400 font-bold' : 'text-gray-500'}>
                          #{String(i + 1).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={`https://basescan.org/address/${s.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-cyan-400 transition-colors"
                        >
                          {formatAddress(s.address)}
                        </a>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">{formatTokens(s.staked)}</td>
                      <td className="px-6 py-4">
                        <span className="text-cyan-400">+{formatTokens(s.pending)}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{formatDate(s.stakedAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="border border-cyan-900 bg-cyan-950/20 text-cyan-400 px-2 py-0.5 text-[11px] font-mono">
                          {(Number(s.effectiveAPY) / 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load more */}
          {!loading && stakers.length > displayCount && (
            <div className="px-6 py-4 border-t border-[#1f2937] text-center">
              <button
                onClick={() => setDisplayCount((c) => c + 20)}
                className="font-mono text-[10px] uppercase tracking-widest text-gray-400 hover:text-cyan-400 transition-colors"
              >
                Load More →
              </button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
