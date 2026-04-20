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
      setError('Please enter a name for your agent');
      return;
    }

    setStep('generating');
    setError('');

    try {
      await generateAgentPackage(config);
      onSuccess(config);
    } catch {
      setError('Failed to generate agent package. Please try again.');
      setStep('config');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-950 border border-cyan-900 w-full max-w-lg font-mono">

        <div className="flex items-center justify-between border-b border-cyan-900 px-6 py-4">
          <div>
            <div className="text-xs text-cyan-500 mb-1">// CONFIGURE YOUR AGENT</div>
            <h2 className="font-bold text-lg">
              {agentType === 'staking' ? 'STAKING AGENT' : 'MARKETING AGENT'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {step === 'generating' ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl mb-4 animate-pulse">🦞</div>
            <div className="text-cyan-400 font-bold mb-2">GENERATING YOUR AGENT...</div>
            <div className="text-gray-500 text-sm">Preparing your personalized package</div>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-5">
            <div>
              <label className="text-xs text-gray-500 block mb-2">AGENT NAME</label>
              <input
                type="text"
                value={config.agentName}
                onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                placeholder="e.g. MyStakingAgent"
                className="w-full bg-black border border-gray-800 text-white px-4 py-3 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {agentType === 'staking' && (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-2">
                    INITIAL STAKE AMOUNT ($NEXUSCLAW)
                  </label>
                  <input
                    type="number"
                    value={config.stakeAmount}
                    onChange={(e) => setConfig({ ...config, stakeAmount: e.target.value })}
                    className="w-full bg-black border border-gray-800 text-white px-4 py-3 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                  <p className="text-xs text-gray-600 mt-1">Minimum: 100 $NEXUSCLAW</p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-2">
                    REWARD THRESHOLD ($NEXUSCLAW)
                  </label>
                  <input
                    type="number"
                    value={config.rewardThreshold}
                    onChange={(e) => setConfig({ ...config, rewardThreshold: e.target.value })}
                    className="w-full bg-black border border-gray-800 text-white px-4 py-3 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Agent claims rewards when this amount is reached
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-2">
                    CHECK INTERVAL (MINUTES)
                  </label>
                  <select
                    value={config.pollInterval}
                    onChange={(e) => setConfig({ ...config, pollInterval: e.target.value })}
                    className="w-full bg-black border border-gray-800 text-white px-4 py-3 text-sm focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="5">Every 5 minutes (recommended)</option>
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every 60 minutes</option>
                  </select>
                </div>
              </>
            )}

            <div className="border border-yellow-900 bg-yellow-950/20 px-4 py-3 text-xs text-yellow-500">
              ⚠️ You will need a dedicated MetaMask wallet for your agent.
              Never use your main wallet private key.
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              onClick={handleGenerate}
              className="w-full bg-cyan-400 text-black font-bold py-4 hover:bg-cyan-300 transition-colors"
            >
              GENERATE & DOWNLOAD AGENT PACKAGE →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
