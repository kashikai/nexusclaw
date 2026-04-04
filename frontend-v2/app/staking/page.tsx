'use client'

import { StakingPanel } from '@/components/staking/StakingPanel'

export default function StakingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-black tracking-tighter text-nc-blue leading-none mb-2">STAKING TERMINAL</h1>
        <p className="font-mono-nc text-xs uppercase tracking-[0.3em] text-slate-500">Secure Node Environment // Base Mainnet</p>
      </div>
      <StakingPanel />
    </div>
  )
}
