'use client';

import { useState } from 'react';

interface AgentConfig {
  agentName: string;
  stakeAmount: string;
  rewardThreshold: string;
  pollInterval: string;
  rpcUrl: string;
}

interface SuccessScreenProps {
  config: AgentConfig;
  onReset: () => void;
}

const LAUNCH_CMD = 'npm install && node agent-core.js';

export default function SuccessScreen({ config, onReset }: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(LAUNCH_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const steps = [
    {
      num: '01',
      title: 'Create a dedicated wallet',
      desc: 'In MetaMask, create a new account → switch to Base Mainnet → copy the private key.',
      highlight: false,
    },
    {
      num: '02',
      title: `Send ${config.stakeAmount} $NEXUSCLAW + 0.005 ETH`,
      desc: 'Transfer the tokens and ETH to your new agent wallet on Base Mainnet.',
      highlight: false,
    },
    {
      num: '03',
      title: 'Configure .env',
      desc: 'Rename .env.example → .env and fill in PRIVATE_KEY_AGENT with your key.',
      highlight: false,
    },
    {
      num: '04',
      title: 'Launch your agent',
      desc: 'Open a terminal inside the agent folder and run:',
      highlight: true,
    },
    {
      num: '05',
      title: 'Appear on the leaderboard',
      desc: 'Once your agent makes its first stake, it automatically appears on the public ranking.',
      highlight: false,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 font-['JetBrains_Mono']">

      {/* Motivational header */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🦞</div>
        <div className="text-[10px] text-[#00eefc] tracking-[0.4em] uppercase mb-3">
          // AGENT PACKAGE DOWNLOADED
        </div>
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[#e5e2e1] mb-3 font-['Space_Grotesk']">
          <span className="text-[#00eefc]">{config.agentName}</span> is ready
        </h2>
        <p className="text-[#c1c6d6] text-sm leading-relaxed">
          Your agent is configured to earn{' '}
          <span className="text-[#00eefc] font-bold">$NEXUSCLAW</span> automatically.
          Follow the steps below to launch it.
        </p>
      </div>

      {/* Bonus banner */}
      <div className="border border-[#f5c542]/30 bg-[#f5c542]/5 px-5 py-4 mb-8 flex items-start gap-3">
        <span className="text-[#f5c542] text-lg flex-shrink-0">🎁</span>
        <div>
          <div className="text-[#f5c542] text-xs font-bold tracking-widest uppercase mb-1">
            First 100 Agents Bonus
          </div>
          <div className="text-[#c1c6d6] text-xs leading-relaxed">
            The first 100 agents to complete their first compound earn an automatic{' '}
            <strong className="text-[#f5c542]">500 $NEXUSCLAW bonus</strong>.
            Spots are limited — don&apos;t miss it.
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-10">
        {steps.map((item) => (
          <div
            key={item.num}
            className="flex gap-5 border border-[#1a3a3a] p-5 hover:border-[#00eefc]/30 transition-colors"
          >
            <span className="text-xl font-black text-[#00eefc]/30 flex-shrink-0 w-6 text-right">
              {item.num}
            </span>
            <div className="flex-1">
              <div className="text-[#e5e2e1] text-xs font-bold uppercase tracking-widest mb-1">
                {item.title}
              </div>
              <div className="text-[#8b919f] text-xs leading-relaxed">{item.desc}</div>
              {item.highlight && (
                <div className="mt-3 flex items-center gap-3 bg-black border border-[#2a2a2a] px-4 py-3">
                  <code className="text-[#00eefc] text-xs flex-1">{LAUNCH_CMD}</code>
                  <button
                    onClick={handleCopy}
                    className="text-[10px] text-[#8b919f] hover:text-[#00eefc] transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    {copied ? 'COPIED ✓' : 'COPY'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/leaderboard"
          className="flex-1 text-center border border-[#00eefc] text-[#00eefc] px-6 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#00eefc] hover:text-[#001a1a] transition-all"
        >
          VIEW LEADERBOARD →
        </a>
        <button
          onClick={onReset}
          className="flex-1 border border-[#2a2a2a] text-[#8b919f] px-6 py-4 text-xs font-bold uppercase tracking-widest hover:border-[#414754] transition-colors"
        >
          CREATE ANOTHER AGENT
        </button>
      </div>
    </div>
  );
}
