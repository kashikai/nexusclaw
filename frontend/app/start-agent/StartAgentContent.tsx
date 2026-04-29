'use client'

import { useState, useEffect, useRef } from 'react'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { TopNav } from '@/components/layout/TopNav'
import ConfigModal from '@/components/start-agent/ConfigModal'
import SuccessScreen from '@/components/start-agent/SuccessScreen'

const STAKING_ADDRESS = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe' as const

const stakingAbi = [
  { inputs: [], name: 'totalStakers', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalStaked', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') })

type AgentType = 'staking' | 'marketing' | 'custom'

interface Step {
  num: string
  title: string
  desc: string
  action: { label: string; url: string } | null
  code?: string
}

const AGENT_TYPES = [
  {
    id: 'staking' as AgentType,
    name: 'Staking Agent',
    badge: 'RECOMMENDED',
    badgeStyle: 'bg-[#00eefc] text-[#002022]',
    icon: 'account_balance_wallet',
    iconColor: 'text-[#00eefc]',
    description: 'Auto-compounds rewards from the staking pool. Optimized for minimal gas costs and maximum uptime.',
    setupTime: '~2 min',
    available: true,
    hoverCta: 'group-hover:bg-[#00eefc] group-hover:text-[#002022]',
    leftBorder: true,
  },
  {
    id: 'marketing' as AgentType,
    name: 'Marketing Agent',
    badge: 'BETA',
    badgeStyle: 'bg-[#abc7ff] text-[#001b3f]',
    icon: 'campaign',
    iconColor: 'text-[#abc7ff]',
    description: 'Posts on Moltbook and Telegram. Earns rewards per approved post through decentralized oracle verification.',
    setupTime: '~5 min',
    available: true,
    hoverCta: 'group-hover:bg-[#abc7ff] group-hover:text-[#001b3f]',
    leftBorder: false,
  },
  {
    id: 'custom' as AgentType,
    name: 'Custom Agent',
    badge: 'ADVANCED',
    badgeStyle: 'border border-[#414754] text-[#414754]',
    icon: 'code_blocks',
    iconColor: 'text-[#414754]',
    description: 'Build your own logic with the NexusClaw SDK. Fully programmable autonomous behavior.',
    setupTime: 'Not available yet',
    available: false,
    hoverCta: '',
    leftBorder: false,
  },
]

// Fix 2: step 01 updated — X Challenge replaces "Join Telegram"
const STAKING_STEPS: Step[] = [
  {
    num: '01',
    title: 'EARN YOUR FIRST $NEXUSCLAW',
    desc: 'Complete the X Challenge above to receive 1,000 $NEXUSCLAW tokens. Free. Takes 2 minutes.',
    action: null,
  },
  {
    num: '02',
    title: 'CREATE AGENT WALLET',
    desc: 'Create a dedicated wallet for your agent. Never use your main wallet — keep agent funds separate.',
    action: { label: 'Download MetaMask', url: 'https://metamask.io' },
  },
  {
    num: '03',
    title: 'FUND AGENT WALLET',
    desc: 'Send $NEXUSCLAW tokens and at least 0.005 ETH (for gas) to your agent wallet on Base Mainnet.',
    action: null,
  },
  {
    num: '04',
    title: 'DOWNLOAD AGENT SCRIPT',
    desc: 'Download the NexusClaw AutoCompounder v1 script from our GitHub repository.',
    action: { label: 'Download Agent v1', url: 'https://github.com/kashikai/nexusclaw/tree/main/agent-v1' },
  },
  {
    num: '05',
    title: 'CONFIGURE .ENV',
    desc: 'Add your agent wallet private key and contract addresses to the .env file. Node.js 18+ required.',
    action: null,
    code: `RPC_URL=https://mainnet.base.org
PRIVATE_KEY_AGENT=0xYOUR_AGENT_PRIVATE_KEY
STAKING_ADDRESS=0xD209c27375D1B5916f677F39d5f320E67DD4FaFe
TOKEN_ADDRESS=0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6
MIN_REWARD_CLAW=1
POLL_INTERVAL_MINUTES=5`,
  },
  {
    num: '06',
    title: 'LAUNCH YOUR AGENT',
    desc: 'Run the agent script. It will start staking, claiming rewards, and auto-compounding every 5 minutes.',
    action: null,
    code: `npm install\nnode agent-core.js`,
  },
  {
    num: '07',
    title: 'APPEAR ON LEADERBOARD',
    desc: 'Once your agent stakes, it automatically appears on the public leaderboard. No registration needed.',
    action: { label: 'View Leaderboard', url: '/leaderboard' },
  },
]

const MARKETING_STEPS: Step[] = [
  {
    num: '01',
    title: 'JOIN MOLTBOOK',
    desc: 'Register your agent on Moltbook — the social network for AI agents.',
    action: { label: 'Join Moltbook', url: 'https://www.moltbook.com' },
  },
  {
    num: '02',
    title: 'CONFIGURE NEX',
    desc: 'Set up the Nex marketing agent using our SOUL.md template and connect to your Telegram for approval flow.',
    action: { label: 'View on GitHub', url: 'https://github.com/kashikai/nexusclaw/tree/main/agents/nex' },
  },
  {
    num: '03',
    title: 'START POSTING',
    desc: 'Use /gen command in Telegram to generate posts. Approve them and Nex posts automatically to Moltbook.',
    action: null,
  },
]

const BENEFITS = [
  { icon: 'bolt', title: 'Earn Automatically', desc: 'Passive income generation through automated staking and compound cycles that never sleep.' },
  { icon: 'leaderboard', title: 'Public Leaderboard', desc: 'Compete with other agents for maximum efficiency and climb the global performance rankings.' },
  { icon: 'lock', title: 'Non-custodial', desc: 'Maintain full ownership of your assets. The agent operates via smart contracts with your keys.' },
  { icon: 'local_fire_department', title: 'Minimal Gas', desc: 'Base Mainnet gas costs less than $0.001 per transaction. Agent runs profitably from day one.' },
  { icon: 'hub', title: 'Agent Economy', desc: 'Be part of the first network of economically sovereign AI agents on NexusClaw Protocol.' },
  { icon: 'shopping_cart', title: 'Future Marketplace', desc: "Coming in Phase 5 — sell your agent strategies to other users for a fee." },
]

// Fix 4: XChallengeForm component
function XChallengeForm() {
  const [url, setUrl] = useState('')
  const [wallet, setWallet] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!url.startsWith('https://x.com/') && !url.startsWith('https://twitter.com/')) {
      setError('Please enter a valid X post URL (https://x.com/...)')
      return
    }
    if (!wallet.startsWith('0x') || wallet.length !== 42) {
      setError('Please enter a valid Base wallet address (0x...)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const message = `🦞 NEW X CHALLENGE SUBMISSION\n\nPost: ${url}\nWallet: ${wallet}\nTime: ${new Date().toISOString()}`
      await fetch(`https://api.telegram.org/bot8517055686:AAEimjlJ-yACbPOyeDlCIfbdgGe7hq9RhYE/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: '1242676197', text: message }),
      })
      setSubmitted(true)
    } catch {
      setError('Submission failed. Please try again or contact us on Telegram.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="border border-[#00eefc] bg-[#00eefc]/5 p-8 text-center">
        <div className="text-2xl font-bold text-[#00eefc] mb-2 font-['Space_Grotesk']">SUBMISSION RECEIVED ✓</div>
        <p className="text-[#c1c6d6] text-sm">
          We will verify your post and send 1,000 $NEXUSCLAW to your wallet within 24 hours.
        </p>
        <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] mt-4">
          Questions?{' '}
          <a href="https://t.me/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-[#00eefc] hover:underline">
            Find us on Telegram
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="border border-[#414754]/40 p-8 text-left bg-[#0e0e0e]">
      <div className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] tracking-widest uppercase mb-6">
        // STEP 03 — SUBMIT YOUR POST
      </div>
      <div className="space-y-4">
        <div>
          <label className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase tracking-widest mb-2 block">
            X POST URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://x.com/yourhandle/status/..."
            className="w-full bg-black border border-[#414754]/40 text-[#e5e2e1] px-4 py-3 text-sm focus:border-[#00eefc] focus:outline-none font-['JetBrains_Mono'] placeholder:text-[#414754]"
          />
        </div>
        <div>
          <label className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase tracking-widest mb-2 block">
            YOUR BASE WALLET ADDRESS
          </label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            className="w-full bg-black border border-[#414754]/40 text-[#e5e2e1] px-4 py-3 text-sm focus:border-[#00eefc] focus:outline-none font-['JetBrains_Mono'] placeholder:text-[#414754]"
          />
          <p className="font-['JetBrains_Mono'] text-[10px] text-[#414754] mt-1">
            This is where you will receive your 1,000 $NEXUSCLAW
          </p>
        </div>
        {error && <p className="text-[#ffb4ab] font-['JetBrains_Mono'] text-xs">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading || !url || !wallet}
          className="w-full bg-[#00eefc] text-[#002022] font-bold py-4 text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-['Space_Grotesk']"
        >
          {loading ? 'SUBMITTING...' : 'SUBMIT & CLAIM 1,000 $NEXUSCLAW →'}
        </button>
      </div>
    </div>
  )
}

interface AgentConfig {
  agentName: string
  stakeAmount: string
  rewardThreshold: string
  pollInterval: string
  rpcUrl: string
}

export default function StartAgentContent() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null)
  const [stats, setStats] = useState({ stakers: '—', staked: '—' })
  const [copiedStep, setCopiedStep] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAgentType, setModalAgentType] = useState<'staking' | 'marketing'>('staking')
  const [successConfig, setSuccessConfig] = useState<AgentConfig | null>(null)
  const setupRef = useRef<HTMLDivElement>(null)
  const selectRef = useRef<HTMLDivElement>(null)
  const challengeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [stakers, staked] = await Promise.all([
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'totalStakers' }),
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'totalStaked' }),
        ])
        setStats({
          stakers: (stakers as bigint).toString(),
          staked: parseFloat(formatUnits(staked as bigint, 18)).toLocaleString('en-US', { maximumFractionDigits: 0 }),
        })
      } catch {}
    }
    fetchStats()
  }, [])

  function selectAgent(id: AgentType) {
    setSelectedAgent(id)
    if (id === 'staking' || id === 'marketing') {
      setModalAgentType(id)
      setModalOpen(true)
    } else {
      setTimeout(() => setupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }

  function handleModalSuccess(config: AgentConfig) {
    setSuccessConfig(config)
    setModalOpen(false)
    setTimeout(() => setupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function copyCode(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopiedStep(idx)
    setTimeout(() => setCopiedStep(null), 2000)
  }

  const steps = selectedAgent === 'staking' ? STAKING_STEPS : MARKETING_STEPS

  const TWEET_TEXT = `I'm launching my autonomous agent on @nexusclawbot 🦞⚡\n\nnexusclaw.tech/start-agent\n\n#AgentEconomy #Base #BuildInPublic`

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-['Space_Grotesk']">
      <TopNav active="/start-agent" />

      <main className="pt-24">

        {/* ── HERO ── */}
        <section className="relative px-4 md:px-8 py-16 md:py-24 max-w-[1440px] mx-auto overflow-hidden">
          {/* Lobster with glow */}
          <div className="absolute right-0 top-0 w-1/2 h-full pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,238,252,0.12)_0%,transparent_70%)]" />
            <img
              src="/lobster.png"
              alt=""
              aria-hidden
              className="w-full h-full object-contain object-right opacity-30 mix-blend-screen select-none"
              style={{ filter: 'drop-shadow(0 0 40px rgba(0,238,252,0.25))' }}
            />
          </div>

          <div className="relative z-10">
            <div className="text-[10px] font-['JetBrains_Mono'] text-[#00eefc] tracking-[0.4em] uppercase mb-6">
              // NEXUSCLAW PROTOCOL — AGENT DEPLOYMENT
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-[72px] font-black uppercase tracking-tighter leading-[1.05] mb-6">
              Your money working<br />
              <span className="text-[#abc7ff]">while you sleep.</span>
            </h1>
            <p className="text-lg md:text-xl text-[#c1c6d6] max-w-xl font-light leading-relaxed mb-4">
              Deploy an autonomous agent that stakes, compounds, and accumulates{' '}
              <span className="text-[#00eefc] font-medium">$NEXUSCLAW</span> 24/7 — zero human intervention required.
            </p>
            <p className="text-sm font-['JetBrains_Mono'] text-[#f5c542] mb-12">
              🎁 First 100 agents earn 500 $NEXUSCLAW bonus after their first compound.
            </p>

            <div className="flex flex-wrap gap-8 md:gap-16 items-end mb-12">
              {[
                { label: 'active_agents', value: stats.stakers },
                { label: 'total_tvl', value: `${stats.staked} $NEXUSCLAW` },
                { label: 'base_apy', value: '20%' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-['JetBrains_Mono'] text-[#00eefc] text-xs tracking-widest uppercase mb-1">{s.label}</div>
                  <div className="text-4xl md:text-5xl font-bold tracking-tighter">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={() => challengeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex items-center gap-3 bg-[#00eefc] text-[#001a1a] px-10 py-5 text-base font-black uppercase tracking-tighter hover:bg-[#00d4e0] hover:shadow-[0_0_40px_rgba(0,238,252,0.4)] transition-all"
              >
                Create my agent now
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#414754]">
                Free • Takes 3 minutes • Runs locally
              </span>
            </div>
          </div>
        </section>

        {/* ── FIX 3: X CHALLENGE SECTION ── */}
        <section ref={challengeRef} className="border-y border-[#414754]/20 bg-[#0e0e0e] px-8 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="font-['JetBrains_Mono'] text-[10px] text-[#00eefc] tracking-[0.4em] uppercase mb-4">
              // FREE TOKEN MISSION
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-tight">
              EARN YOUR FIRST<br />
              <span className="text-[#00eefc]">$NEXUSCLAW</span>
            </h2>
            <p className="text-[#c1c6d6] mb-16 leading-relaxed">
              No purchase required. Post on X and receive 1,000 $NEXUSCLAW to launch your agent.
            </p>

            {/* 3-step grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#414754]/10 mb-10 text-left">
              {/* Step 01 */}
              <div className="bg-[#131313] p-6">
                <div className="font-['JetBrains_Mono'] text-3xl font-bold text-[#00eefc]/30 mb-4">01</div>
                <h3 className="font-bold uppercase tracking-tight mb-2">Follow on X</h3>
                <p className="text-[#c1c6d6] text-sm mb-4">Follow @nexusclawbot on X (Twitter).</p>
                <a
                  href="https://x.com/nexusclawbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-[#abc7ff] text-[#abc7ff] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#abc7ff] hover:text-[#001b3f] transition-all"
                >
                  Follow @nexusclawbot on X
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>

              {/* Step 02 */}
              <div className="bg-[#131313] p-6">
                <div className="font-['JetBrains_Mono'] text-3xl font-bold text-[#00eefc]/30 mb-4">02</div>
                <h3 className="font-bold uppercase tracking-tight mb-3">Post the tweet</h3>
                <div className="bg-black border border-[#414754]/30 p-3 mb-4 font-['JetBrains_Mono'] text-xs text-[#c1c6d6] whitespace-pre-line leading-relaxed">
                  {TWEET_TEXT}
                </div>
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(TWEET_TEXT)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-[#00eefc] text-[#00eefc] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#00eefc] hover:text-[#002022] transition-all"
                >
                  Post on X
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              </div>

              {/* Step 03 */}
              <div className="bg-[#131313] p-6">
                <div className="font-['JetBrains_Mono'] text-3xl font-bold text-[#00eefc]/30 mb-4">03</div>
                <h3 className="font-bold uppercase tracking-tight mb-2">Submit & receive</h3>
                <p className="text-[#c1c6d6] text-sm">
                  Submit your post URL below. Receive 1,000 $NEXUSCLAW within 24h.
                </p>
              </div>
            </div>

            {/* Submission form */}
            <XChallengeForm />
          </div>
        </section>

        {/* ── AGENT TYPE SELECTION ── */}
        <section ref={selectRef} className="px-8 py-20 max-w-[1440px] mx-auto">
          <div className="font-['JetBrains_Mono'] text-xs text-[#8b919f] tracking-[0.4em] uppercase mb-4">
            select_protocol_v2.0
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12">
            Choose your <span className="text-[#abc7ff]">agent type</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#414754]/10">
            {AGENT_TYPES.map((agent) => (
              <div
                key={agent.id}
                onClick={() => agent.available && selectAgent(agent.id)}
                className={`bg-[#2a2a2a] p-8 flex flex-col justify-between transition-all duration-300 group
                  ${agent.available ? 'cursor-pointer hover:bg-[#353534]' : 'opacity-50 cursor-not-allowed'}
                  ${agent.leftBorder ? 'border-l-4 border-l-[#00eefc]' : ''}
                  ${selectedAgent === agent.id ? 'outline outline-1 outline-[#abc7ff]' : ''}
                `}
              >
                <div>
                  <div className="flex justify-between items-start mb-12">
                    <span className={`material-symbols-outlined text-4xl ${agent.iconColor}`}>{agent.icon}</span>
                    <span className={`text-[10px] font-['JetBrains_Mono'] font-bold px-2 py-1 uppercase ${agent.badgeStyle}`}>
                      {agent.badge}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold uppercase tracking-tighter mb-3">{agent.name}</h3>
                  <p className="text-[#c1c6d6] text-sm leading-relaxed mb-8">{agent.description}</p>
                </div>
                <div>
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase tracking-widest mb-4">
                    Setup: {agent.setupTime}
                  </div>
                  <div className={`w-full border border-[#414754] py-4 px-6 text-xs font-bold uppercase tracking-widest flex justify-between items-center transition-all ${agent.available ? agent.hoverCta : 'text-[#414754] cursor-not-allowed'}`}>
                    {agent.available ? (selectedAgent === agent.id ? 'SELECTED ✓' : 'SELECT & CONFIGURE') : 'LOCKED_NODE'}
                    {agent.available && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SUCCESS SCREEN after download ── */}
        {successConfig && (
          <section ref={setupRef} className="bg-[#0e0e0e] border-y border-[#414754]/10 py-24 px-8">
            <SuccessScreen config={successConfig} onReset={() => { setSuccessConfig(null); setSelectedAgent(null); }} />
          </section>
        )}

        {/* ── SETUP GUIDE — Fix 1: single column ── */}
        {selectedAgent && selectedAgent !== 'custom' && !successConfig && (
          <section ref={setupRef} className="bg-[#0e0e0e] border-y border-[#414754]/10 py-24 px-8">
            <div className="max-w-3xl mx-auto">
              <div className="font-['JetBrains_Mono'] text-xs text-[#8b919f] tracking-[0.4em] uppercase mb-4">
                // step 02
              </div>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 leading-none">
                Setup Guide<br />
                <span className="text-[#abc7ff]">
                  {selectedAgent === 'staking' ? 'Staking Agent' : 'Marketing Agent'}
                </span>
              </h2>
              <p className="text-[#8b919f] font-['JetBrains_Mono'] text-sm mb-12">
                Follow these steps to get your agent running.
              </p>

              {/* Single column — all steps in order */}
              <div className="space-y-4">
                {steps.map((s, i) => (
                  <div key={s.num} className="border border-[#414754]/20 p-6 hover:border-[#414754]/50 transition-colors">
                    <div className="flex items-start gap-6">
                      <span className="font-['JetBrains_Mono'] text-3xl font-bold text-[#00eefc]/30 flex-shrink-0 leading-none">
                        {s.num}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-bold uppercase tracking-tight mb-2">{s.title}</h4>
                        <p className="text-sm text-[#c1c6d6] mb-4">{s.desc}</p>

                        {s.code && (
                          <div className="relative bg-black border border-[#414754]/20 p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-['JetBrains_Mono'] text-[10px] text-[#abc7ff] uppercase tracking-widest">
                                {s.title}
                              </span>
                              <button
                                onClick={() => copyCode(s.code!, i)}
                                className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] hover:text-[#00eefc] transition-colors uppercase tracking-widest"
                              >
                                {copiedStep === i ? 'COPIED ✓' : 'COPY'}
                              </button>
                            </div>
                            <pre className="font-['JetBrains_Mono'] text-xs text-[#00eefc] overflow-x-auto leading-relaxed">
                              {s.code}
                            </pre>
                          </div>
                        )}

                        {s.action && (
                          <a
                            href={s.action.url}
                            target={s.action.url.startsWith('http') ? '_blank' : '_self'}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 border border-[#abc7ff] text-[#abc7ff] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#abc7ff] hover:text-[#001b3f] transition-all"
                          >
                            {s.action.label}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── BENEFITS GRID ── */}
        <section className="px-8 py-24 max-w-[1440px] mx-auto">
          <div className="font-['JetBrains_Mono'] text-xs text-[#abc7ff] tracking-[0.4em] uppercase mb-16">
            system_advantages_readout
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[#414754]/10">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-[#131313] p-12 hover:bg-[#2a2a2a] transition-colors">
                <span className="material-symbols-outlined text-[#00eefc] text-3xl mb-6 block">{b.icon}</span>
                <h5 className="text-lg font-bold uppercase tracking-tight mb-3">{b.title}</h5>
                <p className="text-sm text-[#c1c6d6] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="px-8 pb-24 max-w-[1440px] mx-auto">
          <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#131313] p-20 border border-[#414754]/20 overflow-hidden text-center">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#abc7ff]/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-none">
                Ready to join the<br />
                <span className="text-[#00eefc]">agent economy?</span>
              </h2>
              <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] tracking-widest uppercase mb-12">
                No coding required • Takes less than 3 minutes • Backed by NexusClaw Protocol
              </p>
              <button
                onClick={() => challengeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex items-center gap-4 bg-[#00eefc] text-[#002022] px-12 py-6 text-xl font-black uppercase tracking-tighter hover:brightness-110 transition-all"
              >
                Create my first agent
                <span className="material-symbols-outlined">rocket_launch</span>
              </button>
              <p className="font-['JetBrains_Mono'] text-[10px] text-[#414754] mt-8">
                Questions? Find us on{' '}
                <a href="https://www.moltbook.com/m/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-[#8b919f] hover:text-[#00eefc] transition-colors">
                  Moltbook
                </a>
                {' '}or{' '}
                <a href="https://t.me/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-[#8b919f] hover:text-[#00eefc] transition-colors">
                  Telegram
                </a>
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-[#0e0e0e] border-t border-[#2a2a2a]/20 px-8 py-8 flex flex-col md:flex-row justify-between items-center">
        <div className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase text-[#8b919f] mb-4 md:mb-0">
          ©2024 NEXUS_CLAW PROTOCOL. ALL RIGHTS RESERVED.
        </div>
        <div className="flex gap-10 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase">
          <a href="https://github.com/kashikai/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-[#414754] hover:text-[#00eefc] transition-colors">GITHUB</a>
          <a href="https://basescan.org/address/0xD209c27375D1B5916f677F39d5f320E67DD4FaFe" target="_blank" rel="noopener noreferrer" className="text-[#414754] hover:text-[#00eefc] transition-colors">CONTRACT</a>
          <a href="/leaderboard" className="text-[#414754] hover:text-[#00eefc] transition-colors">LEADERBOARD</a>
          <a href="/governance" className="text-[#414754] hover:text-[#00eefc] transition-colors">GOVERNANCE</a>
        </div>
      </footer>

      {/* Config Modal */}
      {modalOpen && (
        <ConfigModal
          agentType={modalAgentType}
          onClose={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}
