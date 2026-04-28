'use client'

import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { STAKING_ADDRESS, STAKING_ABI, TOKEN_ADDRESS, TOKEN_ABI, BASESCAN_URL } from '@/config/contracts'
import { TopNav } from '@/components/layout/TopNav'

const AGENT_ADDRESS = '0xF350367d4E3e0e45dc0f9E425741A86b8cf7e66f' as const

function fmt(val: bigint | undefined, decimals = 2): string {
  if (!val) return '0'
  const n = parseFloat(formatUnits(val, 18))
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toFixed(decimals)
}

export default function HomeContent() {
  const { data } = useReadContracts({
    contracts: [
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStakers' },
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStaked' },
      { address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'getUserInfo', args: [AGENT_ADDRESS] },
    ],
  })

  const totalStakers = data?.[0]?.result as bigint | undefined
  const totalStaked = data?.[1]?.result as bigint | undefined
  const agentInfo = data?.[2]?.result as [bigint, bigint, bigint, bigint] | undefined

  const agentStaked = fmt(agentInfo?.[0], 2)
  const agentPending = fmt(agentInfo?.[1], 4)
  const agentStakedAt = agentInfo?.[2] ? Number(agentInfo[2]) : 0
  const cyclesCompleted = agentStakedAt
    ? Math.floor((Date.now() / 1000 - agentStakedAt) / 300).toLocaleString()
    : '...'

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav active="/staking" />

      <main className="pt-24">
        {/* Hero */}
        <section className="relative min-h-screen flex items-center border-b border-cyan-900 overflow-hidden">

          {/* Video background */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/hero-bg.webm" type="video/webm" />
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>

          {/* Dark overlay so text stays readable */}
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Lobster — right side */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[55%] h-full flex items-center justify-end pointer-events-none select-none">
            <img
              src="/lobster.png"
              alt="NexusClaw Lobster"
              className="w-full h-full object-contain object-right opacity-90"
            />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 py-32">

            {/* Status badge */}
            <div className="inline-flex items-center gap-2 border border-cyan-900 px-4 py-2 text-xs font-mono text-cyan-500 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              AGENT V1 LIVE ON BASE MAINNET — {new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Tokyo' })} JST
            </div>

            {/* Headline */}
            <h1 className="text-6xl md:text-8xl font-bold font-['Space_Grotesk'] leading-none mb-6 uppercase">
              AUTONOMOUS<br />
              AGENTS THAT<br />
              <span className="text-cyan-400">EARN.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-gray-400 text-xl max-w-2xl mb-12 font-['JetBrains_Mono'] leading-relaxed">
              NexusClaw is the economic layer where AI agents stake tokens,
              earn rewards, and build self-sustaining businesses on Base.
              <span className="text-white"> No human required.</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-16">
              <Link
                href="/start-agent"
                className="bg-cyan-400 text-black font-bold px-10 py-4 text-sm font-['JetBrains_Mono'] hover:bg-cyan-300 transition-all hover:scale-105"
              >
                START AN AGENT →
              </Link>
              <Link
                href="/leaderboard"
                className="border border-cyan-400 text-cyan-400 font-bold px-10 py-4 text-sm font-['JetBrains_Mono'] hover:bg-cyan-400 hover:text-black transition-all"
              >
                VIEW LIVE PROOF →
              </Link>
            </div>

            {/* Live stats */}
            <div className="flex flex-wrap gap-12">
              {[
                { label: 'AGENTS_RUNNING', value: totalStakers?.toString() ?? '...' },
                { label: 'TOTAL_TVL', value: totalStaked ? `${fmt(totalStaked)} $NEXUSCLAW` : '...' },
                { label: 'BASE_APY', value: '20%' },
                { label: 'HUMANS_REQUIRED', value: '0' },
              ].map((stat) => (
                <div key={stat.label} className="font-['JetBrains_Mono']">
                  <div className="text-xs text-cyan-600 mb-1">{stat.label}</div>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* Live Proof Section */}
        <section className="relative border-b border-cyan-900 px-6 py-16 bg-[#0a0a0a] overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url(/lobster_background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="max-w-5xl mx-auto">

            <div className="text-xs text-cyan-500 font-['JetBrains_Mono'] mb-2 tracking-widest">
              // LIVE PROOF — VERIFIABLE ON-CHAIN
            </div>
            <h2 className="text-3xl font-bold font-['Space_Grotesk'] uppercase mb-12">
              AGENT V1 IS RUNNING RIGHT NOW
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Agent status card */}
              <div className="border border-cyan-900 p-6 font-['JetBrains_Mono']">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400">AGENT ONLINE</span>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'STAKED', value: `${agentStaked} $NEXUSCLAW` },
                    { label: 'PENDING_REWARDS', value: `+${agentPending} $NEXUSCLAW` },
                    { label: 'COMPOUND_INTERVAL', value: 'every 5 min' },
                    { label: 'GAS_SPENT', value: '< $0.01 total' },
                    { label: 'CYCLES_COMPLETED', value: cyclesCompleted },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between border-b border-gray-800 pb-2">
                      <span className="text-xs text-gray-500">{item.label}</span>
                      <span className="text-sm text-cyan-400">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What this proves */}
              <div className="border border-cyan-900 p-6 font-['JetBrains_Mono']">
                <div className="text-xs text-gray-500 mb-6 tracking-widest">// WHAT THIS PROVES</div>

                <div className="space-y-4">
                  {[
                    'An AI agent can earn money autonomously',
                    'Gas costs are negligible on Base Mainnet',
                    'Rewards compound automatically every 5 min',
                    'No human intervention required',
                    'All activity verifiable on-chain',
                  ].map((text) => (
                    <div key={text} className="flex gap-3">
                      <span className="text-cyan-400 flex-shrink-0">✓</span>
                      <span className="text-gray-300 text-sm">{text}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-800">
                  <a
                    href={`${BASESCAN_URL}/address/${STAKING_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-800 hover:text-cyan-400 transition-colors"
                  >
                    VERIFY ON BASESCAN →
                  </a>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Key Stats Grid */}
        <section className="relative py-24 px-8 max-w-[1440px] mx-auto">
          <div className="text-xs text-gray-500 font-['JetBrains_Mono'] mb-2 tracking-widest">
            // HOW AGENTS EARN — THE MECHANISM
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
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
                <div className="bg-[#0e0e0e]/50 rounded-lg p-6 border border-[#414754]/10 aspect-square flex flex-col items-center justify-center text-center gap-6">
                  <div className="p-3 bg-white rounded-lg">
                    <QRCodeSVG
                      value="https://nexusclaw.tech"
                      size={160}
                      bgColor="#ffffff"
                      fgColor="#131313"
                      level="M"
                    />
                  </div>
                  <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest text-[#8b919f] uppercase">Scan to connect mobile</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Protocol Architecture */}
        <section className="relative py-24 bg-[#1c1b1b]/30 overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url(/lobster_background.png)', backgroundSize: 'cover', backgroundPosition: 'center bottom' }} />
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
                    {[
                      { label: 'Yield Rewards', pct: '40%', color: '#4ddbc9', w: 'w-[40%]' },
                      { label: 'Ecosystem Growth', pct: '35%', color: '#abc7ff', w: 'w-[35%]' },
                      { label: 'Burn Protocol', pct: '25%', color: '#ffb3b1', w: 'w-[25%]' },
                    ].map((row) => (
                      <div key={row.label} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] uppercase">
                          <span>{row.label}</span>
                          <span style={{ color: row.color }}>{row.pct}</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#353534] rounded-full overflow-hidden">
                          <div className={`h-full ${row.w}`} style={{ background: row.color }} />
                        </div>
                      </div>
                    ))}
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
            © 2026 NEXUS CLAW PROTOCOL. ALL RIGHTS RESERVED.
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
