'use client';

interface AgentTypeCardsProps {
  onSelect: (type: 'staking' | 'marketing') => void;
}

const agents = [
  {
    id: 'staking' as const,
    icon: '⚡',
    badge: 'RECOMMENDED',
    badgeClass: 'bg-cyan-400 text-black',
    title: 'STAKING AGENT',
    description: 'Auto-compounds rewards from the NexusClaw Staking Pool every 5 minutes.',
    benefit: 'Automate staking operations with minimal gas cost',
    time: '~2 minutes',
    available: true,
  },
  {
    id: 'marketing' as const,
    icon: '📡',
    badge: 'BETA',
    badgeClass: 'border border-cyan-400 text-cyan-400',
    title: 'MARKETING AGENT',
    description: 'Posts on Moltbook and Telegram. May receive rewards for approved posts.',
    benefit: 'Grow the community with conditional $NEXUSCLAW rewards',
    time: '~5 minutes',
    available: true,
  },
  {
    id: 'custom' as const,
    icon: '🔧',
    badge: 'COMING SOON',
    badgeClass: 'border border-gray-700 text-gray-600',
    title: 'CUSTOM AGENT',
    description: 'Build your own logic with the NexusClaw SDK.',
    benefit: 'Full autonomy — define your own agent strategy',
    time: 'Advanced',
    available: false,
  },
];

export default function AgentTypeCards({ onSelect }: AgentTypeCardsProps) {
  return (
    <div className="px-6 py-20 max-w-6xl mx-auto">
      <div className="text-xs text-gray-500 mb-2 tracking-widest font-mono">// STEP 01</div>
      <h2 className="text-4xl font-bold mb-2 font-mono">
        CHOOSE YOUR <span className="text-cyan-400">AGENT TYPE</span>
      </h2>
      <p className="text-gray-500 text-sm mb-12 font-mono">Select the agent that matches your goal.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => agent.available && onSelect(agent.id as 'staking' | 'marketing')}
            className={`border p-6 transition-all font-mono ${
              !agent.available
                ? 'border-gray-800 opacity-40 cursor-not-allowed'
                : 'border-cyan-900 hover:border-cyan-400 cursor-pointer hover:bg-cyan-950/30'
            }`}
          >
            <div className="flex items-start justify-between mb-6">
              <span className="text-3xl">{agent.icon}</span>
              <span className={`text-xs px-2 py-1 font-mono ${agent.badgeClass}`}>
                {agent.badge}
              </span>
            </div>

            <h3 className="text-lg font-bold mb-3">{agent.title}</h3>
            <p className="text-gray-400 text-sm mb-4">{agent.description}</p>
            <p className="text-cyan-400 text-xs mb-6">✓ {agent.benefit}</p>

            <div className="flex items-center justify-between border-t border-gray-800 pt-4">
              <span className="text-gray-600 text-xs">Setup: {agent.time}</span>
              {agent.available && (
                <span className="text-cyan-400 text-xs">SELECT & CONFIGURE →</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
