'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

const STAKING_ADDRESS = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe' as const;

const stakingAbi = [
  { inputs: [], name: 'totalStakers', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalStaked', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

interface HeroSectionProps {
  onCreateAgent: () => void;
}

export default function HeroSection({ onCreateAgent }: HeroSectionProps) {
  const [stats, setStats] = useState({ stakers: '2', tvl: '2,972', apy: '20%' });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [stakers, staked] = await Promise.all([
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'totalStakers' }),
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'totalStaked' }),
        ]);
        setStats({
          stakers: stakers.toString(),
          tvl: parseFloat(formatUnits(staked as bigint, 18)).toLocaleString('en-US', { maximumFractionDigits: 0 }),
          apy: '20%',
        });
      } catch {}
    }
    fetchStats();
  }, []);

  return (
    <div className="relative border-b border-cyan-900 px-6 py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-transparent pointer-events-none" />

      <div className="relative max-w-4xl">
        <div className="text-xs text-cyan-500 mb-4 tracking-widest font-mono">
          // NEXUSCLAW PROTOCOL — AGENT DEPLOYMENT
        </div>

        <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight font-mono">
          LAUNCH YOUR OWN<br />
          <span className="text-cyan-400">AUTONOMOUS AGENT</span>
        </h1>

        <p className="text-gray-400 text-xl mb-12 max-w-2xl">
          Create an agent that stakes, compounds, and operates within predefined rules.
          No human intervention required.
        </p>

        <div className="flex gap-12 mb-12">
          {[
            { label: 'ACTIVE_AGENTS', value: stats.stakers },
            { label: 'TOTAL_TVL', value: `${stats.tvl} $NEXUSCLAW` },
            { label: 'EST_APY', value: stats.apy },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-xs text-cyan-600 font-mono mb-1">{stat.label}</div>
              <div className="text-3xl font-bold font-mono">{stat.value}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onCreateAgent}
          className="bg-cyan-400 text-black font-bold px-12 py-4 text-lg font-mono hover:bg-cyan-300 transition-all hover:scale-105"
        >
          CREATE MY AGENT NOW →
        </button>
      </div>
    </div>
  );
}
