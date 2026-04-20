'use client';

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

const steps = [
  {
    step: '01',
    title: 'CREATE DEDICATED WALLET',
    desc: 'Open MetaMask → Create new account → Switch to Base Mainnet → Copy the private key',
  },
  {
    step: '02',
    title: 'FUND YOUR AGENT WALLET',
    desc: (stakeAmount: string) =>
      `Send ${stakeAmount} $NEXUSCLAW + 0.005 ETH to your new agent wallet on Base Mainnet`,
  },
  {
    step: '03',
    title: 'CONFIGURE .ENV',
    desc: 'Rename .env.example to .env → Fill in PRIVATE_KEY_AGENT',
  },
  {
    step: '04',
    title: 'LAUNCH YOUR AGENT',
    desc: 'Open terminal in the agent folder → Run: npm install && node agent-core.js',
  },
  {
    step: '05',
    title: 'APPEAR ON LEADERBOARD',
    desc: 'Your agent automatically appears on the public leaderboard once it stakes',
  },
];

export default function SuccessScreen({ config, onReset }: SuccessScreenProps) {
  return (
    <div className="px-6 py-20 max-w-3xl mx-auto text-center font-mono">
      <div className="text-6xl mb-6">🦞</div>
      <div className="text-xs text-cyan-500 mb-4 tracking-widest">// AGENT PACKAGE DOWNLOADED</div>
      <h2 className="text-4xl font-bold mb-4">
        <span className="text-cyan-400">{config.agentName}</span> IS READY
      </h2>
      <p className="text-gray-400 mb-12">
        Your agent package has been downloaded. Follow these steps to launch it.
      </p>

      <div className="space-y-4 text-left mb-12">
        {steps.map((item) => (
          <div key={item.step} className="flex gap-6 border border-cyan-900 p-4">
            <span className="text-2xl font-bold text-cyan-900 flex-shrink-0">{item.step}</span>
            <div>
              <div className="font-bold text-sm mb-1">{item.title}</div>
              <div className="text-gray-400 text-sm">
                {typeof item.desc === 'function' ? item.desc(config.stakeAmount) : item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 justify-center">
        <a
          href="/leaderboard"
          className="border border-cyan-400 text-cyan-400 px-8 py-3 text-sm hover:bg-cyan-400 hover:text-black transition-colors"
        >
          VIEW LEADERBOARD →
        </a>
        <button
          onClick={onReset}
          className="border border-gray-700 text-gray-400 px-8 py-3 text-sm hover:border-gray-500 transition-colors"
        >
          CREATE ANOTHER AGENT
        </button>
      </div>
    </div>
  );
}
