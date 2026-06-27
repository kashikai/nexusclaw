'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import Image from 'next/image';

const STAKING_ADDRESS = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe' as const;
const AGENT_ADDRESS = '0xF350367d4E3e0e45dc0f9E425741A86b8cf7e66f' as const;

const stakingAbi = [
  { inputs: [], name: 'totalStakers', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalStaked', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }], name: 'getUserInfo', outputs: [
    { name: 'staked', type: 'uint256' },
    { name: 'pending', type: 'uint256' },
    { name: 'stakedAt', type: 'uint256' },
    { name: 'effectiveAPY', type: 'uint256' },
  ], stateMutability: 'view', type: 'function' },
] as const;

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

export default function HomeContent() {
  const [stats, setStats] = useState({
    totalStakers: '2',
    totalStaked: '2,982',
    cycles: '194',
    agentStaked: '982',
    agentPending: '0.25',
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [stakers, staked, agentInfo] = await Promise.all([
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'totalStakers' }),
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'totalStaked' }),
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'getUserInfo', args: [AGENT_ADDRESS] }),
        ]);
        const stakedAt = Number(agentInfo[2]);
        const cycles = stakedAt > 0 ? Math.floor((Date.now() / 1000 - stakedAt) / 300) : 0;
        setStats({
          totalStakers: stakers.toString(),
          totalStaked: parseFloat(formatUnits(staked, 18)).toLocaleString('en-US', { maximumFractionDigits: 0 }),
          cycles: cycles.toLocaleString(),
          agentStaked: parseFloat(formatUnits(agentInfo[0], 18)).toFixed(2),
          agentPending: parseFloat(formatUnits(agentInfo[1], 18)).toFixed(4),
        });
      } catch(e) {
        console.error('Stats fetch error:', e);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-mono">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#1f2937]">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-500">
            <Image src="/hero-lobster.png" alt="NexusClaw" width={32} height={32} className="object-cover object-top scale-150" />
          </div>
          <span className="font-bold text-lg tracking-wider">NexusClaw</span>
        </a>
        <div className="hidden md:flex items-center gap-8 text-xs text-gray-400">
          {[
            { label: 'Proof', href: '/proof' },
            { label: 'Agents', href: '/agents' },
            { label: 'Trader', href: '/trader' },
            { label: 'Token', href: '/staking' },
            { label: 'Staking', href: '/staking' },
            { label: 'Docs', href: '/docs' },
          ].map(item => (
            <a key={item.label} href={item.href} className="hover:text-cyan-400 transition-colors">
              {item.label}
            </a>
          ))}
        </div>
        <a href="/staking" className="border border-cyan-400 text-cyan-400 px-4 py-2 text-xs hover:bg-cyan-400 hover:text-black transition-all">
          Launch App →
        </a>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Hero image — right side */}
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-80">
          <Image
            src="/hero-lobster.png"
            alt="NexusClaw Autonomous Agent"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 w-full">
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 border border-cyan-900 bg-cyan-950/30 px-4 py-2 text-xs text-cyan-400 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              LIVE ON BASE MAINNET — AGENT V1 ACTIVE
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-4">
              Autonomous Agents<br />
              That Earn{' '}
              <span className="text-cyan-400">On-Chain</span>
            </h1>

            {/* Subheadline */}
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              AI agents that trade, stake, compound, and fund themselves with verifiable proof.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-10">
              <a href="/proof" className="bg-cyan-400 text-black font-bold px-8 py-3 text-sm hover:bg-cyan-300 transition-all hover:scale-105">
                View Live Proof →
              </a>
              <a href="/agents" className="border border-white/30 text-white px-8 py-3 text-sm hover:border-white transition-all">
                Explore Agents
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: '🔵', label: 'Base Mainnet' },
                { icon: '🟢', label: 'Live Agent V1' },
                { icon: '🛡️', label: 'Public Results' },
              ].map(badge => (
                <div key={badge.label} className="flex items-center gap-2 border border-[#1f2937] bg-[#111111] px-3 py-1.5 text-xs text-gray-300">
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT CARDS ── */}
      <section className="border-t border-[#1f2937] px-6 py-8 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* NexusClaw Trader */}
          <a href="/trader" className="group border border-[#1f2937] bg-[#111111] p-6 hover:border-cyan-900 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 border border-cyan-900 flex items-center justify-center text-cyan-400 text-lg flex-shrink-0">📈</div>
              <div>
                <h3 className="font-bold mb-1">NexusClaw Trader</h3>
                <p className="text-gray-400 text-xs leading-relaxed">Autonomous XAUUSD trading agent with live results.</p>
              </div>
            </div>
            <div className="mt-4 text-cyan-400 text-xs group-hover:translate-x-1 transition-transform">→</div>
          </a>

          {/* Staking Agent */}
          <a href="/start-agent" className="group border border-[#1f2937] bg-[#111111] p-6 hover:border-cyan-900 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 border border-cyan-900 flex items-center justify-center text-cyan-400 text-lg flex-shrink-0">⚡</div>
              <div>
                <h3 className="font-bold mb-1">Staking Agent</h3>
                <p className="text-gray-400 text-xs leading-relaxed">Stake, claim, compound, and report automatically.</p>
              </div>
            </div>
            <div className="mt-4 text-cyan-400 text-xs group-hover:translate-x-1 transition-transform">→</div>
          </a>

          {/* Work Agents — Coming Soon */}
          <div className="border border-[#1f2937] bg-[#111111] p-6 opacity-60 cursor-not-allowed">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 border border-gray-700 flex items-center justify-center text-gray-500 text-lg flex-shrink-0">🤖</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">Work Agents</h3>
                  <span className="text-xs border border-yellow-600 text-yellow-500 px-1.5 py-0.5">COMING SOON</span>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">Agents for business automation and real-world tasks.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE PROOF ── */}
      <section className="border-t border-[#1f2937] px-6 py-16 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Live Proof, Not Promises</h2>
            <div className="flex items-center gap-2 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Agent V1 Online
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🤖', label: 'Agent V1 Online', value: '24/7 Active', color: 'text-green-400' },
                { icon: '🔄', label: 'Compound Cycles', value: stats.cycles, color: 'text-cyan-400' },
                { icon: '⛽', label: 'Gas Avg. per Tx', value: '< $0.01', color: 'text-cyan-400' },
                { icon: '✅', label: 'Verified', value: 'On-Chain', color: 'text-cyan-400' },
              ].map(stat => (
                <div key={stat.label} className="border border-[#1f2937] bg-[#111111] p-4">
                  <div className="text-xl mb-2">{stat.icon}</div>
                  <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Performance summary */}
            <div className="border border-[#1f2937] bg-[#111111] p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-500">Cumulative Performance (Agent V1)</span>
                <span className="text-green-400 text-sm font-bold">+24.38%</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Total Staked', value: `${stats.agentStaked} $NEXUSCLAW` },
                  { label: 'Pending Rewards', value: `+${stats.agentPending} $NEXUSCLAW` },
                  { label: 'Active Stakers', value: stats.totalStakers },
                  { label: 'Total TVL', value: `${stats.totalStaked} $NEXUSCLAW` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between border-b border-[#1f2937] pb-2">
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <span className="text-xs text-cyan-400">{item.value}</span>
                  </div>
                ))}
              </div>
              <a href="/proof" className="mt-4 block text-center border border-cyan-900 text-cyan-400 py-2 text-xs hover:bg-cyan-950 transition-all">
                VIEW FULL PROOF →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── TWO ECONOMIES ── */}
      <section className="border-t border-[#1f2937] px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Two Economies. One Protocol.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Token Economy */}
            <div className="border border-[#1f2937] bg-[#111111] p-6">
              <div className="w-10 h-10 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 text-xl mb-4">🪙</div>
              <h3 className="font-bold mb-2">Agent Token Economy</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Power the protocol with $CLAW. Stake, earn, and grow the treasury.
              </p>
              <a href="/staking" className="text-cyan-400 text-xs hover:underline">Learn more →</a>
            </div>

            {/* Work Economy */}
            <div className="border border-[#1f2937] bg-[#111111] p-6">
              <div className="w-10 h-10 rounded-full bg-yellow-950 flex items-center justify-center text-yellow-400 text-xl mb-4">💼</div>
              <h3 className="font-bold mb-2">Agent Work Economy</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Agents deliver real services, automation, and execution.
              </p>
              <a href="/agents" className="text-yellow-400 text-xs hover:underline">Learn more →</a>
            </div>

          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#1f2937] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">© 2026 NexusClaw. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="https://x.com/nexusclawbot" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white text-xs">X</a>
            <a href="https://t.me/NexusClawCommunity" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white text-xs">Telegram</a>
            <a href="https://github.com/kashikai/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white text-xs">GitHub</a>
          </div>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-gray-500 hover:text-white text-xs">Docs</a>
            <a href="/security" className="text-gray-500 hover:text-white text-xs">Terms</a>
            <a href="/security" className="text-gray-500 hover:text-white text-xs">Privacy</a>
          </div>
        </div>
      </footer>

    </main>
  );
}
