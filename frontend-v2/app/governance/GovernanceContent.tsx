'use client'

import { TopNav } from '@/components/layout/TopNav'

export default function GovernanceContent() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav active="/governance" />

      <main className="pt-24 pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-12 mt-8">
          <h1 className="text-4xl md:text-5xl font-['Space_Grotesk'] font-black tracking-tighter uppercase leading-none mb-2">GOVERNANCE</h1>
          <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#8b919f]">Multisig 3/5 Secure // Coming in Phase 4</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Multisig Info */}
          <div className="bg-[#1c1b1b] border border-[#414754]/20 p-8 rounded-lg">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[#abc7ff]/10 rounded-lg">
                <span className="material-symbols-outlined text-[#abc7ff]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              </div>
              <div>
                <h3 className="font-['Space_Grotesk'] font-bold uppercase">Safe Multisig</h3>
                <p className="text-xs text-[#c1c6d6] font-['JetBrains_Mono']">3-of-5 threshold</p>
              </div>
            </div>
            <p className="text-sm text-[#c1c6d6] mb-6 leading-relaxed">
              All protocol changes require approval from 3 out of 5 signers. This ensures no single point of failure while maintaining operational efficiency.
            </p>
            <div className="bg-[#131313] p-4 rounded border-l-2 border-[#abc7ff]">
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] block mb-1 uppercase">Address</span>
              <a href="https://basescan.org/address/0x02320eCCB3B67e802C29f9e9F8703D5756535515" target="_blank" rel="noopener noreferrer"
                className="font-['JetBrains_Mono'] text-xs md:text-sm text-[#abc7ff] hover:text-[#3A8BFF] transition-colors break-all">
                0x02320eCCB3B67e802C29f9e9F8703D5756535515
              </a>
            </div>
          </div>

          {/* Security Features */}
          <div className="bg-[#1c1b1b] border border-[#414754]/20 p-8 rounded-lg">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[#00eefc]/10 rounded-lg">
                <span className="material-symbols-outlined text-[#00eefc]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <div>
                <h3 className="font-['Space_Grotesk'] font-bold uppercase">Security Features</h3>
                <p className="text-xs text-[#c1c6d6] font-['JetBrains_Mono']">Audit v10.3 certified</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Timelock', desc: '24h delay on critical operations', icon: 'schedule' },
                { label: 'Reentrancy Guard', desc: 'Protection against reentrancy attacks', icon: 'lock' },
                { label: 'Access Control', desc: 'Role-based permissions (Admin/Funder)', icon: 'admin_panel_settings' },
                { label: 'Emergency Withdraw', desc: 'Users can always exit positions', icon: 'emergency' },
                { label: 'Token Recovery', desc: 'Admin can recover accidental sends', icon: 'restore' },
                { label: 'Staking Pause', desc: 'Emergency stop mechanism', icon: 'pause_circle' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 p-3 bg-[#131313]/50 rounded hover:bg-[#131313] transition-colors border border-[#414754]/5">
                  <span className="material-symbols-outlined text-[#00eefc] text-lg">{f.icon}</span>
                  <div>
                    <span className="text-xs font-['Space_Grotesk'] font-bold uppercase block">{f.label}</span>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f]">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coming Soon Banner */}
        <div className="relative bg-[#0e0e0e] border border-[#414754]/10 p-12 rounded-lg text-center overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(171, 199, 255, 0.05) 0%, transparent 70%)' }} />
          <div className="relative">
            <span className="material-symbols-outlined text-[#abc7ff] text-6xl mb-4 block">gavel</span>
            <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-[#e5e2e1] mb-4 uppercase">On-Chain Governance — Phase 4</h2>
            <p className="text-[#8b919f] max-w-lg mx-auto">
              Proposal creation, voting, and execution will be available after the agent economy is proven. Focused on shipping first.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#353534] rounded-full mt-6">
              <span className="w-2 h-2 rounded-full bg-[#4ddbc9] animate-pulse" />
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#4ddbc9] uppercase">Current: Multisig Governance</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
