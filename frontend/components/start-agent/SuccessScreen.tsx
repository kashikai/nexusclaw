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

interface Step {
  num: string;
  title: string;
  desc: string;
  command?: string;
  note?: string;
}

export default function SuccessScreen({ config, onReset }: SuccessScreenProps) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const steps: Step[] = [
    {
      num: '01',
      title: 'Open a terminal in the agent folder',
      desc: 'Unzip the downloaded file, then open your terminal inside that folder.',
      command: 'cd nexusclaw-agent',
      note: 'On Windows: right-click the folder → "Open in Terminal"',
    },
    {
      num: '02',
      title: 'Run the setup wizard',
      desc: 'The wizard checks Node.js, installs dependencies, tests the connection, and generates your .env file.',
      command: 'node setup.js',
      note: 'Need Node.js? Download at nodejs.org (version 18 or higher)',
    },
    {
      num: '03',
      title: 'Add your private key to .env',
      desc: 'Open .env in any text editor and fill in your dedicated agent wallet private key.',
      note: 'MetaMask → Account menu → ⋮ → Account Details → Export Private Key',
    },
    {
      num: '04',
      title: 'Launch your agent',
      desc: 'Your agent will start staking, claiming rewards, and auto-compounding every ' + config.pollInterval + ' minutes.',
      command: 'node agent-core.js',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 font-['JetBrains_Mono']">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🦞</div>
        <div className="text-[10px] text-[#00eefc] tracking-[0.4em] uppercase mb-3">
          // AGENT PACKAGE DOWNLOADED
        </div>
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[#e5e2e1] mb-3 font-['Space_Grotesk']">
          <span className="text-[#00eefc]">{config.agentName}</span> is ready
        </h2>
        <p className="text-[#8b919f] text-sm leading-relaxed">
          Your personalized agent package has been downloaded.
          Follow these 4 steps to launch it.
        </p>
      </div>

      {/* Bonus banner */}
      <div className="border border-[#f5c542]/30 bg-[#f5c542]/5 px-5 py-4 mb-8 flex items-start gap-3">
        <span className="text-[#f5c542] text-lg flex-shrink-0">🎁</span>
        <div>
          <div className="text-[#f5c542] text-[10px] font-bold tracking-widest uppercase mb-1">
            First 100 Agents Bonus
          </div>
          <div className="text-[#c1c6d6] text-xs leading-relaxed">
            The first 100 agents to complete their first compound earn an automatic{' '}
            <strong className="text-[#f5c542]">500 $NEXUSCLAW bonus</strong>.
            Spots are limited.
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-10">
        {steps.map((s) => (
          <div key={s.num} className="border border-[#1a3a3a] p-5 hover:border-[#00eefc]/20 transition-colors">
            <div className="flex gap-5">
              <span className="text-xl font-black text-[#00eefc]/25 flex-shrink-0 w-6 text-right leading-none mt-0.5">
                {s.num}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[#e5e2e1] text-xs font-bold uppercase tracking-widest mb-1">
                  {s.title}
                </div>
                <div className="text-[#8b919f] text-xs leading-relaxed mb-3">{s.desc}</div>

                {s.command && (
                  <div className="flex items-center gap-3 bg-black border border-[#2a2a2a] px-4 py-3 mb-2">
                    <code className="text-[#00eefc] text-xs flex-1 font-['JetBrains_Mono']">
                      {s.command}
                    </code>
                    <button
                      onClick={() => copy(s.command!, s.num)}
                      className="text-[10px] text-[#414754] hover:text-[#00eefc] transition-colors whitespace-nowrap flex-shrink-0 uppercase tracking-widest"
                    >
                      {copied === s.num ? 'COPIED ✓' : 'COPY'}
                    </button>
                  </div>
                )}

                {s.note && (
                  <div className="text-[#414754] text-[10px] leading-relaxed">
                    ↳ {s.note}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security callout */}
      <div className="border border-[#414754]/30 bg-[#0a0a0a] px-5 py-4 mb-8 text-[10px] text-[#8b919f] leading-relaxed">
        <span className="text-[#e5e2e1] font-bold uppercase tracking-widest block mb-2">⚠ Security</span>
        Your private key never leaves your machine. The agent runs locally and talks directly
        to the NexusClaw smart contracts on Base. No server ever sees your key.
      </div>

      {/* Config summary */}
      <div className="border border-[#1a3a3a] px-5 py-4 mb-8 text-[10px]">
        <div className="text-[#8b919f] uppercase tracking-widest mb-3">Your configuration</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'STAKE', value: `${config.stakeAmount} $NCLAW` },
            { label: 'THRESHOLD', value: `${config.rewardThreshold} $NCLAW` },
            { label: 'INTERVAL', value: `${config.pollInterval} min` },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-[#414754] mb-1">{item.label}</div>
              <div className="text-[#00eefc] font-bold">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/leaderboard"
          className="flex-1 text-center border border-[#00eefc] text-[#00eefc] px-6 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#00eefc] hover:text-[#001a1a] transition-all"
        >
          VIEW LEADERBOARD →
        </a>
        <button
          onClick={onReset}
          className="flex-1 border border-[#2a2a2a] text-[#8b919f] px-6 py-4 text-[10px] font-bold uppercase tracking-widest hover:border-[#414754] transition-colors"
        >
          CREATE ANOTHER AGENT
        </button>
      </div>
    </div>
  );
}
