'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { STAKING_ADDRESS, TOKEN_ADDRESS, BASESCAN_URL } from '@/config/contracts'

export default function HomeContent() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#070707]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center px-8 py-4 max-w-[1440px] mx-auto">
          <Link href="/" className="text-2xl font-black tracking-tighter text-[#e5e2e1] italic font-['Space_Grotesk'] uppercase">
            NEXUS CLAW
          </Link>
          <div className="hidden md:flex items-center gap-10">
            <Link href="/staking" className="text-[#3A8BFF] border-b-2 border-[#3A8BFF] pb-1 font-['Space_Grotesk'] tracking-tighter uppercase text-sm font-bold">
              Staking
            </Link>
            <Link href="/analytics" className="text-[#8b919f] hover:text-[#e5e2e1] transition-colors font-['Space_Grotesk'] tracking-tighter uppercase text-sm font-bold">
              Tokenomics
            </Link>
            <Link href="/analytics" className="text-[#8b919f] hover:text-[#e5e2e1] transition-colors font-['Space_Grotesk'] tracking-tighter uppercase text-sm font-bold">
              Stats
            </Link>
            <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="text-[#8b919f] hover:text-[#e5e2e1] transition-colors font-['Space_Grotesk'] tracking-tighter uppercase text-sm font-bold">
              Docs
            </a>
          </div>
          <div className="flex items-center gap-4">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain
                return (
                  <div {...(!mounted && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                    {connected ? (
                      <button onClick={openAccountModal} className="bg-gradient-to-r from-[#abc7ff] to-[#448fff] text-[#00285a] px-6 py-2 rounded-sm font-['Space_Grotesk'] font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all">
                        {account.displayName}
                      </button>
                    ) : (
                      <button onClick={openConnectModal} className="bg-gradient-to-r from-[#abc7ff] to-[#448fff] text-[#00285a] px-6 py-2 rounded-sm font-['Space_Grotesk'] font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all">
                        Connect Wallet
                      </button>
                    )}
                  </div>
                )
              }}
            </ConnectButton.Custom>
          </div>
        </div>
        <div className="bg-gradient-to-r from-transparent via-[#414754]/30 to-transparent h-[1px] w-full" />
      </nav>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative min-h-[870px] flex items-center justify-center px-6 overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(58, 139, 255, 0.15) 0%, transparent 70%)' }} />
          {/* Lobster Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[600px] text-white">deployed_code</span>
          </div>
          <div className="relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#353534] rounded-full mb-8 border border-[#414754]/20">
              <span className="flex h-2 w-2 rounded-full bg-[#4ddbc9] animate-pulse" />
              <span className="text-[10px] font-['JetBrains_Mono'] tracking-[0.2em] text-[#4ddbc9] uppercase">Network Status: Online</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black font-['Space_Grotesk'] tracking-tighter uppercase leading-[0.9] mb-6">
              Stake{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#abc7ff] via-[#448fff] to-[#4ddbc9]">
                $NEXUSCLAW
              </span>
            </h1>
            <p className="text-[#c1c6d6] max-w-2xl mx-auto text-lg mb-12 font-light leading-relaxed">
              Unleash the power of the deep. Access institutional-grade staking yields and deflationary mechanics on the most secure terminal in the ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/staking"
                className="px-10 py-5 bg-gradient-to-br from-[#abc7ff] to-[#448fff] text-[#00285a] font-['Space_Grotesk'] font-bold uppercase tracking-wider rounded-sm shadow-xl hover:shadow-[#abc7ff]/20 transition-all"
              >
                Launch Staking App
              </Link>
              <Link
                href="/analytics"
                className="px-10 py-5 bg-[#1c1b1b] border border-[#414754]/30 text-[#e5e2e1] font-['Space_Grotesk'] font-bold uppercase tracking-wider rounded-sm hover:bg-[#201f1f] transition-all"
              >
                View Analytics
              </Link>
            </div>
          </div>
          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
            <span className="text-[10px] font-['JetBrains_Mono'] tracking-widest uppercase">System Scroll</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-[#abc7ff] to-transparent" />
          </div>
        </section>

        {/* Key Stats Grid */}
        <section className="py-24 px-8 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1c1b1b] p-8 rounded-lg border-l-4 border-[#abc7ff] group hover:bg-[#201f1f] transition-colors">
              <div className="flex justify-between items-start mb-6">
                <span className="material-symbols-outlined text-[#abc7ff] text-3xl">trending_up</span>
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#8b919f] uppercase tracking-tighter">Live Yield</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-['Space_Grotesk'] font-black">20% APY</h3>
                <p className="text-[#c1c6d6] text-sm">Dynamic rewards distributed every 3 seconds to active stakers.</p>
              </div>
            </div>
            <div className="bg-[#1c1b1b] p-8 rounded-lg border-l-4 border-[#4ddbc9] group hover:bg-[#201f1f] transition-colors">
              <div className="flex justify-between items-start mb-6">
                <span className="material-symbols-outlined text-[#4ddbc9] text-3xl">local_fire_department</span>
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#8b919f] uppercase tracking-tighter">Token Burn</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-['Space_Grotesk'] font-black">1% Fee</h3>
                <p className="text-[#c1c6d6] text-sm">Every transaction contributes to manual buybacks and permanent burns.</p>
              </div>
            </div>
            <div className="bg-[#1c1b1b] p-8 rounded-lg border-l-4 border-[#ffb3b1] group hover:bg-[#201f1f] transition-colors">
              <div className="flex justify-between items-start mb-6">
                <span className="material-symbols-outlined text-[#ffb3b1] text-3xl">database</span>
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#8b919f] uppercase tracking-tighter">Circulation</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-['Space_Grotesk'] font-black">100B Supply</h3>
                <p className="text-[#c1c6d6] text-sm">Fixed cap architecture ensuring long-term scarcity and protocol value.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Connect Wallet / Interactive Section */}
        <section className="py-24 px-8">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#abc7ff]/20 via-[#4ddbc9]/20 to-[#abc7ff]/20 rounded-xl blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
            <div className="relative bg-[#1c1b1b]/70 backdrop-blur-xl rounded-xl border border-[#414754]/20 p-12 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-['Space_Grotesk'] font-bold mb-4 uppercase tracking-tight">Access Terminal</h2>
                  <p className="text-[#c1c6d6] mb-8 text-sm leading-relaxed">
                    Connect your decentralized wallet to view your $NEXUSCLAW balance, projected earnings, and governance weight.
                  </p>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-sm text-[#e5e2e1]">
                      <span className="material-symbols-outlined text-[#abc7ff] text-lg">verified_user</span>
                      Encrypted P2P Connection
                    </li>
                    <li className="flex items-center gap-3 text-sm text-[#e5e2e1]">
                      <span className="material-symbols-outlined text-[#abc7ff] text-lg">security</span>
                      Zero-Knowledge Auth
                    </li>
                    <li className="flex items-center gap-3 text-sm text-[#e5e2e1]">
                      <span className="material-symbols-outlined text-[#abc7ff] text-lg">shield</span>
                      Audited by Leading Firms
                    </li>
                  </ul>
                  <Link
                    href="/staking"
                    className="block w-full py-4 bg-[#abc7ff] text-[#00285a] font-['Space_Grotesk'] font-black uppercase tracking-widest rounded-sm text-center hover:brightness-110 transition-all"
                  >
                    Initialize Connection
                  </Link>
                </div>
                <div className="bg-[#0e0e0e]/50 rounded-lg p-6 border border-[#414754]/10 aspect-square flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-[#abc7ff] text-8xl mb-6 opacity-60">qr_code_2</span>
                  <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest text-[#8b919f] uppercase">Scan to connect mobile</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Protocol Architecture */}
        <section className="py-24 bg-[#1c1b1b]/30">
          <div className="max-w-[1440px] mx-auto px-8">
            <div className="mb-16">
              <h2 className="text-4xl font-['Space_Grotesk'] font-black uppercase tracking-tighter mb-2">Protocol Architecture</h2>
              <div className="h-1 w-24 bg-[#abc7ff]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left: Fee Breakdown */}
              <div className="lg:col-span-7 space-y-12">
                <div className="space-y-6">
                  <h3 className="text-xs font-['JetBrains_Mono'] uppercase tracking-[0.3em] text-[#4ddbc9]">Fee Distribution Breakdown</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] uppercase">
                        <span>Yield Rewards</span>
                        <span className="text-[#4ddbc9]">40%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#353534] rounded-full overflow-hidden">
                        <div className="h-full bg-[#4ddbc9] w-[40%]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] uppercase">
                        <span>Ecosystem Growth</span>
                        <span className="text-[#abc7ff]">35%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#353534] rounded-full overflow-hidden">
                        <div className="h-full bg-[#abc7ff] w-[35%]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] uppercase">
                        <span>Burn Protocol</span>
                        <span className="text-[#ffb3b1]">25%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#353534] rounded-full overflow-hidden">
                        <div className="h-full bg-[#ffb3b1] w-[25%]" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#201f1f] p-6 rounded border border-[#414754]/10">
                    <span className="text-[10px] font-['JetBrains_Mono'] text-[#8b919f] block mb-2 uppercase">Contracts</span>
                    <a href={`${BASESCAN_URL}/address/${TOKEN_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-lg font-['Space_Grotesk'] font-bold text-[#e5e2e1] hover:text-[#abc7ff] transition-colors">
                      $NEXUSCLAW Token
                    </a>
                  </div>
                  <div className="bg-[#201f1f] p-6 rounded border border-[#414754]/10">
                    <span className="text-[10px] font-['JetBrains_Mono'] text-[#8b919f] block mb-2 uppercase">Staking</span>
                    <a href={`${BASESCAN_URL}/address/${STAKING_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-lg font-['Space_Grotesk'] font-bold text-[#e5e2e1] hover:text-[#abc7ff] transition-colors">
                      Live on Base
                    </a>
                  </div>
                </div>
              </div>
              {/* Right: Security & Audit */}
              <div className="lg:col-span-5">
                <div className="bg-[#353534] p-8 rounded-lg border border-[#414754]/20">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-[#4ddbc9]/10 rounded">
                      <span className="material-symbols-outlined text-[#4ddbc9]" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                    </div>
                    <div>
                      <h4 className="font-['Space_Grotesk'] font-bold uppercase">Security Audit</h4>
                      <p className="text-xs text-[#c1c6d6] font-['JetBrains_Mono']">v10.3-certified</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#c1c6d6] mb-8 leading-relaxed">
                    Smart contracts undergo rigorous stress testing and multi-layer audits. Timelock 24h, multisig 3/5, and verified source code ensure protocol integrity.
                  </p>
                  <div className="space-y-3">
                    <a href={`${BASESCAN_URL}/address/${TOKEN_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-[#131313]/50 rounded hover:bg-[#131313] transition-colors border border-[#414754]/5">
                      <span className="text-xs font-['Space_Grotesk'] font-bold uppercase">Token Contract (Verified)</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                    <a href={`${BASESCAN_URL}/address/${STAKING_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-[#131313]/50 rounded hover:bg-[#131313] transition-colors border border-[#414754]/5">
                      <span className="text-xs font-['Space_Grotesk'] font-bold uppercase">Staking Contract (Verified)</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                    <a href="https://basescan.org/address/0x02320eCCB3B67e802C29f9e9F8703D5756535515" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-[#131313]/50 rounded hover:bg-[#131313] transition-colors border border-[#414754]/5">
                      <span className="text-xs font-['Space_Grotesk'] font-bold uppercase">Multisig Safe (3/5)</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#070707] border-t border-[#414754]/10">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-8 w-full max-w-[1440px] mx-auto">
          <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#8b919f] mb-6 md:mb-0">
            © 2024 NEXUS CLAW PROTOCOL. ALL RIGHTS RESERVED.
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            <a href={`${BASESCAN_URL}/address/${TOKEN_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#8b919f] hover:text-[#3A8BFF] transition-all opacity-80 hover:opacity-100">
              Security Audit
            </a>
            <a href="https://github.com/kashikai/nexusclaw" target="_blank" rel="noopener noreferrer" className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#8b919f] hover:text-[#3A8BFF] transition-all opacity-80 hover:opacity-100">
              GitHub
            </a>
            <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#8b919f] hover:text-[#3A8BFF] transition-all opacity-80 hover:opacity-100">
              Explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
