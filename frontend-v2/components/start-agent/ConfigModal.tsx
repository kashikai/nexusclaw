'use client';

import { useState } from 'react';
import { generateAgentPackage } from '@/lib/generateAgent';

interface AgentConfig {
  agentName: string;
  stakeAmount: string;
  rewardThreshold: string;
  pollInterval: string;
  rpcUrl: string;
}

interface ConfigModalProps {
  agentType: 'staking' | 'marketing';
  onClose: () => void;
  onSuccess: (config: AgentConfig) => void;
}

const APY = 0.20;

function estimateDailyReward(stakeAmount: string): string {
  const amount = parseFloat(stakeAmount) || 0;
  const daily = (amount * APY) / 365;
  return daily.toFixed(2);
}

export default function ConfigModal({ agentType, onClose, onSuccess }: ConfigModalProps) {
  const [step, setStep] = useState<'config' | 'generating'>('config');
  const [config, setConfig] = useState<AgentConfig>({
    agentName: '',
    stakeAmount: '1000',
    rewardThreshold: '1',
    pollInterval: '5',
    rpcUrl: 'https://mainnet.base.org',
  });
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!config.agentName.trim()) {
      setError('Give your agent a name to continue.');
      return;
    }
    if (parseFloat(config.stakeAmount) < 100) {
      setError('Minimum stake is 100 $NEXUSCLAW.');
      return;
    }

    setStep('generating');
    setError('');

    try {
      await generateAgentPackage(config);
      onSuccess(config);
    } catch {
      setError('Failed to generate package. Please try again.');
      setStep('config');
    }
  }

  const dailyReward = estimateDailyReward(config.stakeAmount);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
      <div className="bg-[#0d0d0d] border border-[#1a3a3a] w-full max-w-lg font-['JetBrains_Mono'] my-auto shadow-[0_0_60px_rgba(0,238,252,0.08)]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a3a3a] px-6 py-4">
          <div>
            <div className="text-[10px] text-[#00eefc] tracking-[0.3em] uppercase mb-1">
              // CONFIGURE YOUR AGENT
            </div>
            <h2 className="font-bold text-base text-[#e5e2e1] tracking-tight">
              {agentType === 'staking' ? 'STAKING AGENT' : 'MARKETING AGENT'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#414754] hover:text-[#e5e2e1] transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {step === 'generating' ? (
          <div className="px-6 py-20 text-center">
            <div className="text-5xl mb-6 animate-bounce">🦞</div>
            <div className="text-[#00eefc] font-bold tracking-widest mb-2">BUILDING YOUR AGENT...</div>
            <div className="text-[#8b919f] text-xs">Assembling your personalized package</div>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-5">

            {/* Agent Name */}
            <div>
              <label className="text-[10px] text-[#8b919f] tracking-widest uppercase block mb-1">
                AGENT NAME
              </label>
              <p className="text-[10px] text-[#414754] mb-2">
                Identifier for your agent — appears on the leaderboard.
              </p>
              <input
                type="text"
                value={config.agentName}
                onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                placeholder="e.g. AlphaBot_01"
                className="w-full bg-black border border-[#2a2a2a] text-[#e5e2e1] px-4 py-3 text-sm focus:border-[#00eefc] focus:outline-none placeholder:text-[#414754]"
              />
            </div>

            {agentType === 'staking' && (
              <>
                {/* Stake Amount */}
                <div>
                  <label className="text-[10px] text-[#8b919f] tracking-widest uppercase block mb-1">
                    INITIAL STAKE ($NEXUSCLAW)
                  </label>
                  <p className="text-[10px] text-[#414754] mb-2">
                    How many tokens your agent will stake. More tokens = more daily rewards.
                  </p>
                  <input
                    type="number"
                    min="100"
                    value={config.stakeAmount}
                    onChange={(e) => setConfig({ ...config, stakeAmount: e.target.value })}
                    className="w-full bg-black border border-[#2a2a2a] text-[#e5e2e1] px-4 py-3 text-sm focus:border-[#00eefc] focus:outline-none"
                  />
                  {/* Daily reward estimate */}
                  <div className="mt-2 flex items-center gap-2 border border-[#00eefc]/20 bg-[#00eefc]/5 px-3 py-2">
                    <span className="text-[#00eefc] text-xs">⚡</span>
                    <span className="text-[10px] text-[#8b919f]">
                      Estimated daily reward:{' '}
                      <span className="text-[#00eefc] font-bold">~{dailyReward} $NEXUSCLAW/day</span>
                      <span className="text-[#414754]"> @ 20% APY</span>
                    </span>
                  </div>
                </div>

                {/* Reward Threshold */}
                <div>
                  <label className="text-[10px] text-[#8b919f] tracking-widest uppercase block mb-1">
                    AUTO-CLAIM THRESHOLD ($NEXUSCLAW)
                  </label>
                  <p className="text-[10px] text-[#414754] mb-2">
                    Your agent claims & re-stakes when pending rewards reach this amount. Lower = more frequent compounding (more gas). Default: 1.
                  </p>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={config.rewardThreshold}
                    onChange={(e) => setConfig({ ...config, rewardThreshold: e.target.value })}
                    className="w-full bg-black border border-[#2a2a2a] text-[#e5e2e1] px-4 py-3 text-sm focus:border-[#00eefc] focus:outline-none"
                  />
                </div>

                {/* Poll Interval */}
                <div>
                  <label className="text-[10px] text-[#8b919f] tracking-widest uppercase block mb-1">
                    CHECK INTERVAL
                  </label>
                  <p className="text-[10px] text-[#414754] mb-2">
                    How often your agent checks for claimable rewards. Every 5 min is optimal.
                  </p>
                  <select
                    value={config.pollInterval}
                    onChange={(e) => setConfig({ ...config, pollInterval: e.target.value })}
                    className="w-full bg-black border border-[#2a2a2a] text-[#e5e2e1] px-4 py-3 text-sm focus:border-[#00eefc] focus:outline-none"
                  >
                    <option value="5">Every 5 minutes (recommended)</option>
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every 60 minutes</option>
                  </select>
                </div>
              </>
            )}

            {/* Security warning */}
            <div className="border border-[#7a5c00] bg-[#7a5c00]/10 px-4 py-3 text-[10px] text-[#f5c542]">
              ⚠️ Create a <strong>dedicated MetaMask wallet</strong> for your agent.
              Never use your main wallet — keep agent funds isolated.
            </div>

            {error && (
              <p className="text-[#ff6b6b] text-xs border border-[#ff6b6b]/30 px-3 py-2 bg-[#ff6b6b]/5">
                {error}
              </p>
            )}

            {/* CTA */}
            <button
              onClick={handleGenerate}
              className="w-full bg-[#00eefc] text-[#001a1a] font-black py-5 text-sm tracking-widest uppercase hover:bg-[#00d4e0] hover:shadow-[0_0_30px_rgba(0,238,252,0.4)] transition-all"
            >
              ⚡ GENERATE & DOWNLOAD MY AGENT →
            </button>

            <p className="text-center text-[10px] text-[#414754]">
              Your private key never leaves your machine. Agent runs locally.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
