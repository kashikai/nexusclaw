'use client'

import { StakingPanel } from '@/components/staking/StakingPanel'
import { TOKEN_ADDRESS, STAKING_ADDRESS, BASESCAN_URL } from '@/config/contracts'

export default function HomeContent() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline text-5xl font-black tracking-tighter text-nc-blue leading-none mb-2">NEXUS CLAW</h1>
        <p className="font-mono-nc text-xs uppercase tracking-[0.3em] text-slate-500">Worldwide Economic Layer for Autonomous AI Agents</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-nc-surface-hi p-6 border-l-4 border-nc-cyan">
          <span className="material-symbols-outlined text-nc-cyan text-3xl mb-3 block">bolt</span>
          <h3 className="font-headline text-xl font-bold text-nc-cyan mb-2">Stake & Earn</h3>
          <p className="text-sm text-slate-400">Stake $NEXUSCLAW on Base Mainnet and earn 20% APY rewards.</p>
        </div>
        <div className="bg-nc-surface-hi p-6 border-l-4 border-nc-blue">
          <span className="material-symbols-outlined text-nc-blue text-3xl mb-3 block">shield</span>
          <h3 className="font-headline text-xl font-bold text-nc-blue mb-2">Audited & Secure</h3>
          <p className="text-sm text-slate-400">4 critical fixes, timelock 24h, multisig 3/5. Verified on Basescan.</p>
        </div>
        <div className="bg-nc-surface-hi p-6 border-l-4 border-nc-purple">
          <span className="material-symbols-outlined text-nc-purple text-3xl mb-3 block">hub</span>
          <h3 className="font-headline text-xl font-bold text-nc-purple mb-2">Multi-Chain</h3>
          <p className="text-sm text-slate-400">Base, Solana, Arbitrum. Agent-to-agent marketplace coming soon.</p>
        </div>
      </div>
      <div className="mb-12">
        <h2 className="font-headline text-3xl font-black tracking-tighter text-nc-blue mb-6">STAKING DASHBOARD</h2>
        <StakingPanel />
      </div>
      <div className="bg-nc-surface border border-nc-blue/10 p-6">
        <h3 className="font-mono-nc text-[10px] uppercase text-slate-500 tracking-widest mb-4">Contracts — Base Mainnet</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono-nc text-xs">
          <a href={`${BASESCAN_URL}/address/${TOKEN_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-nc-blue hover:text-nc-cyan transition-colors">
            Token: {TOKEN_ADDRESS.slice(0, 10)}...{TOKEN_ADDRESS.slice(-8)}
          </a>
          <a href={`${BASESCAN_URL}/address/${STAKING_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-nc-blue hover:text-nc-cyan transition-colors">
            Staking: {STAKING_ADDRESS.slice(0, 10)}...{STAKING_ADDRESS.slice(-8)}
          </a>
        </div>
      </div>
    </div>
  )
}
