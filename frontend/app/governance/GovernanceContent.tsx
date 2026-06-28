'use client'

import { PageShell } from '@/components/layout/PageShell'

export default function GovernanceContent() {
  return (
    <PageShell variant="public">
      <main className="pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="border-l-4 border-cyan-400 pl-6 py-2 mb-12 mt-8">
          <h1 className="text-4xl md:text-5xl font-mono font-black tracking-tighter uppercase leading-none mb-2 text-white">GOVERNANCE</h1>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400">Multisig 3/5 Secure // Coming in Phase 4</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Multisig Info */}
          <div className="bg-[#111111] border border-[#1f2937] p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-cyan-400/10">
                <span className="material-symbols-outlined text-cyan-400" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              </div>
              <div>
                <h3 className="font-mono font-bold uppercase text-white">Safe Multisig</h3>
                <p className="text-xs text-white font-mono">3-of-5 threshold</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed font-mono">
              All protocol changes require approval from 3 out of 5 signers. This ensures no single point of failure while maintaining operational efficiency.
            </p>
            <div className="bg-[#0a0a0a] p-4 border-l-2 border-cyan-400">
              <span className="font-mono text-[10px] text-gray-500 block mb-1 uppercase">Address</span>
              <a href="https://basescan.org/address/0x02320eCCB3B67e802C29f9e9F8703D5756535515" target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs md:text-sm text-cyan-400 hover:text-white transition-colors break-all">
                0x02320eCCB3B67e802C29f9e9F8703D5756535515
              </a>
            </div>
          </div>

          {/* Security Features */}
          <div className="bg-[#111111] border border-[#1f2937] p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-cyan-400/10">
                <span className="material-symbols-outlined text-cyan-400" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <div>
                <h3 className="font-mono font-bold uppercase text-white">Security Features</h3>
                <p className="text-xs text-white font-mono">Audit v10.3 certified</p>
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
                <div key={f.label} className="flex items-center gap-3 p-3 bg-[#0a0a0a] hover:bg-[#0a0a0a] transition-colors border border-[#1f2937]">
                  <span className="material-symbols-outlined text-cyan-400 text-lg">{f.icon}</span>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase block text-white">{f.label}</span>
                    <span className="font-mono text-[10px] text-gray-400">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coming Soon Banner */}
        <div className="relative bg-[#0a0a0a] border border-[#1f2937] p-12 text-center overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.05) 0%, transparent 70%)' }} />
          <div className="relative">
            <span className="material-symbols-outlined text-cyan-400 text-6xl mb-4 block">gavel</span>
            <h2 className="font-mono text-2xl font-bold text-white mb-4 uppercase">On-Chain Governance — Phase 4</h2>
            <p className="text-gray-400 max-w-lg mx-auto font-mono text-sm">
              Proposal creation, voting, and execution will be available after the agent economy is proven. Focused on shipping first.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#111111] border border-[#1f2937] mt-6">
              <span className="w-2 h-2 bg-cyan-400 animate-pulse" />
              <span className="font-mono text-[10px] text-cyan-400 uppercase">Current: Multisig Governance</span>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  )
}
