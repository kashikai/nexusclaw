'use client'

import { useReadContract } from 'wagmi'
import { STAKING_ADDRESS, STAKING_ABI, TOKEN_ADDRESS, TOKEN_ABI } from '@/config/contracts'
import { formatTokenShort } from '@/lib/utils'

export default function AnalyticsContent() {
  const { data: totalStaked } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStaked' })
  const { data: totalStakers } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStakers' })
  const { data: rewardPool } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPool' })
  const { data: totalSupply } = useReadContract({ address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'totalSupply' })
  const { data: runway } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPoolRunway' })

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-black tracking-tighter text-nc-blue leading-none mb-2">ANALYTICS</h1>
        <p className="font-mono-nc text-xs uppercase tracking-[0.3em] text-slate-500">Tokenomics Dashboard // Base Mainnet</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-nc-surface-hi p-6">
          <span className="font-mono-nc text-[10px] text-slate-500 uppercase tracking-widest">Total Supply</span>
          <h3 className="font-headline text-3xl font-bold tracking-tight text-nc-blue mt-2">{totalSupply ? formatTokenShort(totalSupply as bigint) : '0'}</h3>
          <p className="font-mono-nc text-[10px] text-slate-600 mt-1">$NEXUSCLAW tokens</p>
        </div>
        <div className="bg-nc-surface-hi p-6">
          <span className="font-mono-nc text-[10px] text-slate-500 uppercase tracking-widest">Total Staked</span>
          <h3 className="font-headline text-3xl font-bold tracking-tight text-nc-cyan mt-2">{totalStaked ? formatTokenShort(totalStaked as bigint) : '0'}</h3>
          <p className="font-mono-nc text-[10px] text-slate-600 mt-1">staked on Base</p>
        </div>
        <div className="bg-nc-surface-hi p-6">
          <span className="font-mono-nc text-[10px] text-slate-500 uppercase tracking-widest">Stakers</span>
          <h3 className="font-headline text-3xl font-bold tracking-tight text-nc-purple mt-2">{totalStakers?.toString() || '0'}</h3>
          <p className="font-mono-nc text-[10px] text-slate-600 mt-1">unique addresses</p>
        </div>
        <div className="bg-nc-surface-hi p-6">
          <span className="font-mono-nc text-[10px] text-slate-500 uppercase tracking-widest">Reward Pool</span>
          <h3 className="font-headline text-3xl font-bold tracking-tight text-nc-cyan mt-2">{rewardPool ? formatTokenShort(rewardPool as bigint) : '0'}</h3>
          <p className="font-mono-nc text-[10px] text-slate-600 mt-1">remaining</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-nc-surface border border-nc-blue/10 p-8">
          <h3 className="font-headline text-xl font-bold text-nc-blue mb-6">Tokenomics</h3>
          <div className="space-y-4">
            {[
              { label: 'LP / Airdrop Agents', pct: '50%', color: 'bg-nc-cyan' },
              { label: 'Treasury', pct: '20%', color: 'bg-nc-blue' },
              { label: 'Team (2y vest)', pct: '15%', color: 'bg-nc-purple' },
              { label: 'Burn / Rewards', pct: '15%', color: 'bg-nc-error' },
            ].map((t) => (
              <div key={t.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-300">{t.label}</span>
                  <span className="font-mono-nc text-xs text-nc-cyan">{t.pct}</span>
                </div>
                <div className="w-full h-2 bg-nc-surface-hi overflow-hidden">
                  <div className={`h-full ${t.color} opacity-60`} style={{ width: t.pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-nc-surface border border-nc-blue/10 p-8">
          <h3 className="font-headline text-xl font-bold text-nc-blue mb-6">Protocol Health</h3>
          <div className="space-y-3">
            {[
              { label: 'APY', value: '20%' },
              { label: 'Reward Runway', value: runway ? `${Number(runway) > 999 ? '999+' : Number(runway)}d` : '—' },
              { label: 'Staking', value: 'Active' },
              { label: 'Audit', value: 'Passed' },
              { label: 'Multisig', value: '3/5' },
              { label: 'Timelock', value: '24h' },
            ].map((h) => (
              <div key={h.label} className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-slate-300">{h.label}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-nc-cyan" />
                  <span className="font-mono-nc text-xs text-nc-blue">{h.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
