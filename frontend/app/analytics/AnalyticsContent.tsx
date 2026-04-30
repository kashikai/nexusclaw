'use client'

import { useReadContract } from 'wagmi'
import { TopNav } from '@/components/layout/TopNav'
import { STAKING_ADDRESS, STAKING_ABI, TOKEN_ADDRESS, TOKEN_ABI, BASESCAN_URL } from '@/config/contracts'
import { formatTokenShort } from '@/lib/utils'

export default function AnalyticsContent() {
  const { data: totalStaked } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStaked' })
  const { data: totalStakers } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStakers' })
  const { data: rewardPool } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPool' })
  const { data: totalSupply } = useReadContract({ address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'totalSupply' })
  const { data: runway } = useReadContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'rewardPoolRunway' })

  const burned = totalSupply ? 100_000_000_000n * 10n ** 18n - (totalSupply as bigint) : 0n

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav active="/analytics" />

      <main className="pt-24 pb-16 px-8 max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="border-l-4 border-[#00eefc] pl-6 py-2 mb-12 mt-8">
          <h1 className="text-4xl md:text-5xl font-['Space_Grotesk'] font-black tracking-tighter uppercase leading-none mb-2">NEXUS TOKENOMICS</h1>
          <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#8b919f]">V3.0 Smart Emission Protocol // Allocation Readout</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total Supply" value={totalSupply ? formatTokenShort(totalSupply as bigint) : '0'} color="#abc7ff" />
          <StatCard label="Total Staked" value={totalStaked ? formatTokenShort(totalStaked as bigint) : '0'} color="#448fff" />
          <StatCard label="Active Stakers" value={totalStakers?.toString() || '0'} color="#00eefc" />
          <StatCard label="Reward Pool" value={rewardPool ? formatTokenShort(rewardPool as bigint) : '0'} color="#4ddbc9" />
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Token Allocation */}
          <div className="col-span-12 lg:col-span-7 bg-[#0e0e0e] border border-[#414754]/10 p-8 rounded-lg">
            <h3 className="font-['Space_Grotesk'] font-bold text-lg tracking-widest uppercase mb-8 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#abc7ff]" />
              Token Allocation
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              {/* Donut Chart */}
              <div className="relative w-56 h-56 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" fill="transparent" r="16" stroke="#2a2a2a" strokeWidth="3" />
                  <circle cx="18" cy="18" fill="transparent" r="16" stroke="#00eefc" strokeDasharray="50 100" strokeWidth="3" />
                  <circle cx="18" cy="18" fill="transparent" r="16" stroke="#448fff" strokeDasharray="20 100" strokeDashoffset="-50" strokeWidth="3" />
                  <circle cx="18" cy="18" fill="transparent" r="16" stroke="#abc7ff" strokeDasharray="15 100" strokeDashoffset="-70" strokeWidth="3" />
                  <circle cx="18" cy="18" fill="transparent" r="16" stroke="#353534" strokeDasharray="15 100" strokeDashoffset="-85" strokeWidth="3" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase">Total Cap</span>
                  <span className="font-['Space_Grotesk'] text-xl font-bold">100B</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-4">
                <AllocBar label="LP / Airdrop Agents" pct="50%" color="#00eefc" />
                <AllocBar label="Treasury Reserve" pct="20%" color="#448fff" />
                <AllocBar label="Team (2y vest)" pct="15%" color="#abc7ff" />
                <AllocBar label="Burn / Rewards" pct="15%" color="#353534" />
              </div>
            </div>
          </div>

          {/* Burn Tracker */}
          <div className="col-span-12 lg:col-span-5 bg-[#353534] p-8 rounded-lg flex flex-col justify-between border-b border-[#abc7ff]/20">
            <div>
              <h3 className="font-['Space_Grotesk'] font-bold text-lg tracking-widest uppercase mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb4ab]">local_fire_department</span>
                Burn Tracker
              </h3>
              <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase tracking-widest">Hyper-Deflationary Mechanism Active</p>
            </div>
            <div className="py-10 text-center">
              <div className="text-xs font-['JetBrains_Mono'] text-[#ffb4ab]/60 mb-2">TOTAL_BURNED.LOG</div>
              <div className="text-4xl font-black font-['Space_Grotesk'] tracking-tight" style={{ textShadow: '0 0 10px rgba(171, 199, 255, 0.5)' }}>
                {burned > 0n ? formatTokenShort(burned) : '0'}
              </div>
              <div className="text-sm font-['JetBrains_Mono'] text-[#abc7ff] mt-2">$NEXUSCLAW</div>
            </div>
            <div className="bg-[#0e0e0e] p-4 space-y-2 border-l-2 border-[#ffb4ab] rounded">
              <div className="flex justify-between font-['JetBrains_Mono'] text-[9px] uppercase">
                <span className="text-[#8b919f]">Transfer Burn Rate</span>
                <span className="text-[#ffb4ab]">1% Fee</span>
              </div>
              <div className="flex justify-between font-['JetBrains_Mono'] text-[9px] uppercase">
                <span className="text-[#8b919f]">Runway (days)</span>
                <span className="text-[#e5e2e1]">{runway ? (Number(runway) > 999 ? '999+' : Number(runway).toString()) : '—'}</span>
              </div>
            </div>
          </div>

          {/* Emissions Chart */}
          <div className="col-span-12 bg-[#0e0e0e] border border-[#414754]/10 p-8 rounded-lg">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="font-['Space_Grotesk'] font-bold text-lg tracking-widest uppercase mb-1">Emissions Schedule</h3>
                <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase tracking-widest">Projected Supply Unlock (48 Months)</p>
              </div>
              <div className="flex gap-4">
                <span className="flex items-center gap-2 font-['JetBrains_Mono'] text-[10px] text-[#8b919f]">
                  <span className="w-3 h-3 bg-[#00eefc]" /> CIRCULATING
                </span>
                <span className="flex items-center gap-2 font-['JetBrains_Mono'] text-[10px] text-[#8b919f]">
                  <span className="w-3 h-3 border border-[#00eefc]" /> TOTAL CAP
                </span>
              </div>
            </div>
            <div className="relative h-64 w-full flex items-end gap-[2px]">
              {[20, 25, 32, 38, 42, 48, 55, 60, 64, 68, 70, 72, 74, 76, 78].map((h, i) => (
                <div key={i} className={`h-[${h}%] w-full ${i >= 10 ? 'bg-[#00eefc] border-t-2 border-white' : i >= 7 ? 'bg-[#00eefc]/60 border-t border-[#00eefc]' : 'bg-[#00eefc]/20 border-t border-[#00eefc]'} transition-all`} />
              ))}
              <div className="absolute inset-0 border-b border-l border-[#414754]/30 pointer-events-none" />
              <div className="absolute -bottom-6 left-0 font-['JetBrains_Mono'] text-[9px] text-[#8b919f]">MONTH 0</div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-['JetBrains_Mono'] text-[9px] text-[#8b919f]">MONTH 24</div>
              <div className="absolute -bottom-6 right-0 font-['JetBrains_Mono'] text-[9px] text-[#8b919f]">MONTH 48</div>
            </div>
          </div>

          {/* Protocol Health */}
          <div className="col-span-12 lg:col-span-6 bg-[#0e0e0e] border border-[#414754]/10 p-8 rounded-lg">
            <h3 className="font-['Space_Grotesk'] font-bold text-lg tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#00eefc]" />
              Protocol Health
            </h3>
            <div className="space-y-3">
              {[
                { label: 'APY', value: '20%', active: true },
                { label: 'Reward Runway', value: runway ? `${Number(runway) > 999 ? '999+' : Number(runway)}d` : '—', active: true },
                { label: 'Staking', value: 'Active', active: true },
                { label: 'Audit', value: 'Passed (v10.3)', active: true },
                { label: 'Multisig', value: '3/5 Safe', active: true },
                { label: 'Timelock', value: '24h', active: true },
              ].map((h) => (
                <div key={h.label} className="flex justify-between items-center py-2 border-b border-[#414754]/10">
                  <span className="text-sm text-[#c1c6d6]">{h.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${h.active ? 'bg-[#00eefc]' : 'bg-[#ffb4ab]'}`} />
                    <span className="font-['JetBrains_Mono'] text-xs text-[#e5e2e1]">{h.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Contracts */}
          <div className="col-span-12 lg:col-span-6 bg-[#0e0e0e] border border-[#414754]/10 p-8 rounded-lg">
            <h3 className="font-['Space_Grotesk'] font-bold text-lg tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#abc7ff]" />
              Verified Contracts
            </h3>
            <div className="space-y-4">
              <ContractLink label="$NEXUSCLAW Token" address={TOKEN_ADDRESS} />
              <ContractLink label="Staking v10.3" address={STAKING_ADDRESS} />
              <ContractLink label="Multisig Safe (3/5)" address="0x02320eCCB3B67e802C29f9e9F8703D5756535515" />
            </div>
          </div>

          {/* Security Banner */}
          <div className="col-span-12 relative h-36 overflow-hidden bg-[#0e0e0e] rounded-lg">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(171, 199, 255, 0.05) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-['Space_Grotesk'] font-black text-2xl tracking-[0.5em] text-[#abc7ff]/30 uppercase">Security Over Everything</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1c1b1b] p-6 rounded-lg border-l-4" style={{ borderLeftColor: color }}>
      <span className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase tracking-widest block mb-2">{label}</span>
      <h3 className="font-['Space_Grotesk'] text-2xl font-bold" style={{ color }}>{value}</h3>
    </div>
  )
}

function AllocBar({ label, pct, color }: { label: string; pct: string; color: string }) {
  return (
    <div className="group cursor-pointer">
      <div className="flex justify-between items-center mb-1">
        <span className="font-['JetBrains_Mono'] text-xs uppercase text-[#8b919f]">{label}</span>
        <span className="font-['Space_Grotesk'] font-bold" style={{ color }}>{pct}</span>
      </div>
      <div className="h-1 bg-[#353534] w-full overflow-hidden">
        <div className="h-full transition-all duration-700 group-hover:opacity-80" style={{ width: pct, backgroundColor: color }} />
      </div>
    </div>
  )
}

function ContractLink({ label, address }: { label: string; address: string }) {
  return (
    <a href={`${BASESCAN_URL}/address/${address}`} target="_blank" rel="noopener noreferrer"
      className="flex items-center justify-between p-4 bg-[#131313]/50 rounded hover:bg-[#131313] transition-colors border border-[#414754]/5 group">
      <div>
        <span className="text-xs font-['Space_Grotesk'] font-bold uppercase block">{label}</span>
        <span className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f]">{address.slice(0, 10)}...{address.slice(-8)}</span>
      </div>
      <span className="material-symbols-outlined text-sm text-[#8b919f] group-hover:text-[#abc7ff] transition-colors">open_in_new</span>
    </a>
  )
}
