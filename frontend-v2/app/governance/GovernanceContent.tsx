'use client'

export default function GovernanceContent() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-black tracking-tighter text-nc-blue leading-none mb-2">GOVERNANCE</h1>
        <p className="font-mono-nc text-xs uppercase tracking-[0.3em] text-slate-500">Multisig 3/5 Secure // Coming Soon</p>
      </div>
      <div className="bg-nc-surface border border-nc-blue/10 p-12 text-center">
        <span className="material-symbols-outlined text-nc-blue text-6xl mb-4 block">gavel</span>
        <h2 className="font-headline text-2xl font-bold text-nc-blue mb-4">Governance Portal</h2>
        <p className="text-slate-400 max-w-md mx-auto">On-chain governance via multisig 3/5. Proposal system coming in Phase 4.</p>
        <div className="mt-8 bg-nc-surface-hi p-6 inline-block">
          <div className="font-mono-nc text-[10px] uppercase text-slate-500 mb-2">Multisig Address</div>
          <a href="https://basescan.org/address/0x02320eCCB3B67e802C29f9e9F8703D5756535515" target="_blank" rel="noopener noreferrer" className="font-mono-nc text-sm text-nc-cyan hover:text-nc-blue">
            0x02320e...5515
          </a>
          <div className="font-mono-nc text-[10px] text-nc-cyan mt-2">● 3/5 threshold</div>
        </div>
      </div>
    </div>
  )
}
