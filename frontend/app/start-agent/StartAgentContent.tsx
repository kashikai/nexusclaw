'use client'

import { useState, useEffect, useRef } from 'react'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { PageShell } from '@/components/layout/PageShell'
import ConfigModal from '@/components/start-agent/ConfigModal'
import SuccessScreen from '@/components/start-agent/SuccessScreen'

const STAKING_ADDRESS = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe' as const
const TOKEN_ADDRESS = '0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6' as const

const stakingAbi = [
  { inputs: [], name: 'totalStakers', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalStaked', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const tokenAbi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const stakingUserAbi = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserInfo',
    outputs: [
      { name: 'staked', type: 'uint256' },
      { name: 'pending', type: 'uint256' },
      { name: 'stakedAt', type: 'uint256' },
      { name: 'effectiveAPY', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') })

const MIN_HOLDER_BALANCE = 1000n * 10n ** 18n

async function checkHolderStatus(wallet: string) {
  const addr = wallet as `0x${string}`
  const [balance, userInfo] = await Promise.all([
    client.readContract({ address: TOKEN_ADDRESS, abi: tokenAbi, functionName: 'balanceOf', args: [addr] }),
    client.readContract({ address: STAKING_ADDRESS, abi: stakingUserAbi, functionName: 'getUserInfo', args: [addr] }).catch(() => [0n, 0n, 0n, 0n] as const),
  ])
  const bal = balance as bigint
  const staked = (userInfo as readonly bigint[])[0]
  const isHolder = bal >= MIN_HOLDER_BALANCE || staked > 0n
  return {
    balance: formatUnits(bal, 18),
    staked: formatUnits(staked, 18),
    isHolder,
    hasEnoughBalance: bal >= MIN_HOLDER_BALANCE,
    isStaker: staked > 0n,
  }
}

type AgentType = 'staking' | 'marketing' | 'custom' | 'signal'

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
    badgeStyle: 'bg-cyan-400 text-black',
    icon: '◈',
    iconColor: 'text-cyan-400',
    description: 'Auto-compounds rewards from the staking pool. Optimized for minimal gas costs and maximum uptime.',
    setupTime: '~2 min',
    available: true,
    hoverCta: 'group-hover:bg-cyan-400 group-hover:text-black',
    leftBorder: true,
  },
  {
    id: 'marketing' as AgentType,
    name: 'Marketing Agent',
    badge: 'BETA',
    badgeStyle: 'bg-cyan-400 text-black',
    icon: '◉',
    iconColor: 'text-cyan-400',
    description: 'Posts on Moltbook and Telegram. Earns rewards per approved post through decentralized oracle verification.',
    setupTime: '~5 min',
    available: true,
    hoverCta: 'group-hover:bg-cyan-400 group-hover:text-black',
    leftBorder: false,
  },
  {
    id: 'custom' as AgentType,
    name: 'Custom Agent',
    badge: 'ADVANCED',
    badgeStyle: 'border border-[#1f2937] text-gray-600',
    icon: '◻',
    iconColor: 'text-gray-600',
    description: 'Build your own logic with the NexusClaw SDK. Fully programmable autonomous behavior.',
    setupTime: 'Not available yet',
    available: false,
    hoverCta: '',
    leftBorder: false,
  },
  {
    id: 'signal' as AgentType,
    name: 'NexusClaw Trader',
    badge: 'NEW',
    badgeStyle: 'bg-yellow-400 text-black',
    icon: '◆',
    iconColor: 'text-yellow-400',
    description: 'Fully autonomous XAUUSD trading bot. Detects its own entries, self-optimizes via Claude AI after every 5 trades. Live results published publicly.',
    setupTime: '~15 min',
    available: true,
    hoverCta: 'group-hover:bg-yellow-400 group-hover:text-black',
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
  { icon: '⚡', title: 'Earn Automatically', desc: 'Passive income generation through automated staking and compound cycles that never sleep.' },
  { icon: '◈', title: 'Public Leaderboard', desc: 'Compete with other agents for maximum efficiency and climb the global performance rankings.' },
  { icon: '◻', title: 'Non-custodial', desc: 'Maintain full ownership of your assets. The agent operates via smart contracts with your keys.' },
  { icon: '◆', title: 'Minimal Gas', desc: 'Base Mainnet gas costs less than $0.001 per transaction. Your agent can start operating from day one with predefined rules, monitoring, and transparent reporting.' },
  { icon: '◉', title: 'Agent Economy', desc: 'Be part of the first network of economically sovereign AI agents on NexusClaw Protocol.' },
  { icon: '→', title: 'Future Marketplace', desc: "Coming in Phase 5 — sell your agent strategies to other users for a fee." },
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
      <div className="border border-cyan-900 bg-cyan-950/10 p-8 text-center">
        <div className="text-2xl font-bold text-cyan-400 mb-2 font-mono">SUBMISSION RECEIVED ✓</div>
        <p className="text-white text-sm">
          We will verify your post and send 1,000 $NEXUSCLAW to your wallet within 24 hours.
        </p>
        <p className="font-mono text-[10px] text-gray-400 mt-4">
          Questions?{' '}
          <a href="https://t.me/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
            Find us on Telegram
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="border border-[#1f2937] p-8 text-left bg-[#0d0d0d]">
      <div className="font-mono text-[10px] text-gray-400 tracking-widest uppercase mb-6">
        // STEP 03 — SUBMIT YOUR POST
      </div>
      <div className="space-y-4">
        <div>
          <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-2 block">
            X POST URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://x.com/yourhandle/status/..."
            className="w-full bg-[#0a0a0a] border border-[#1f2937] text-white px-4 py-3 text-sm focus:border-cyan-900 focus:outline-none font-mono placeholder:text-gray-600"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-2 block">
            YOUR BASE WALLET ADDRESS
          </label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            className="w-full bg-[#0a0a0a] border border-[#1f2937] text-white px-4 py-3 text-sm focus:border-cyan-900 focus:outline-none font-mono placeholder:text-gray-600"
          />
          <p className="font-mono text-[10px] text-gray-600 mt-1">
            This is where you will receive your 1,000 $NEXUSCLAW
          </p>
        </div>
        {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading || !url || !wallet}
          className="w-full bg-cyan-400 text-black font-bold py-4 text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-mono"
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
  const [holderWallet, setHolderWallet] = useState('')
  const [holderStatus, setHolderStatus] = useState<null | { balance: string; staked: string; isHolder: boolean; hasEnoughBalance: boolean; isStaker: boolean }>(null)
  const [holderChecking, setHolderChecking] = useState(false)
  const [holderError, setHolderError] = useState('')
  const setupRef = useRef<HTMLDivElement>(null)
  const selectRef = useRef<HTMLDivElement>(null)
  const challengeRef = useRef<HTMLDivElement>(null)
  const signalRef = useRef<HTMLDivElement>(null)

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
    } else if (id === 'signal') {
      setTimeout(() => signalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
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

  async function handleHolderCheck() {
    setHolderError('')
    setHolderStatus(null)
    if (!/^0x[0-9a-fA-F]{40}$/.test(holderWallet)) {
      setHolderError('Invalid wallet address — must be 0x followed by 40 hex characters.')
      return
    }
    setHolderChecking(true)
    try {
      const result = await checkHolderStatus(holderWallet)
      setHolderStatus(result)
    } catch {
      setHolderError('Failed to read on-chain balance. Check your connection and try again.')
    } finally {
      setHolderChecking(false)
    }
  }

  const steps = selectedAgent === 'staking' ? STAKING_STEPS : selectedAgent === 'marketing' ? MARKETING_STEPS : []

  const TWEET_TEXT = `I'm launching my autonomous agent on @nexusclawbot 🦞⚡\n\nnexusclaw.tech/start-agent\n\n#AgentEconomy #Base #BuildInPublic`

  return (
    <>
    <PageShell variant="app">

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
          <div className="text-[10px] font-mono text-cyan-400 tracking-[0.4em] uppercase mb-6">
            // NEXUSCLAW PROTOCOL — AGENT DEPLOYMENT
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-[72px] font-black uppercase tracking-tighter leading-[1.05] mb-6">
            Your money working<br />
            <span className="text-cyan-400">while you sleep.</span>
          </h1>
          <p className="text-lg md:text-xl text-white max-w-xl font-light leading-relaxed mb-4">
            Deploy an autonomous agent that stakes, compounds, and accumulates{' '}
            <span className="text-cyan-400 font-medium">$NEXUSCLAW</span> 24/7 — zero human intervention required.
          </p>
          <p className="text-sm font-mono text-yellow-400 mb-12">
            🎁 First 100 agents earn 500 $NEXUSCLAW bonus after their first compound.
          </p>

          <div className="flex flex-wrap gap-8 md:gap-16 items-end mb-12">
            {[
              { label: 'active_agents', value: stats.stakers },
              { label: 'total_tvl', value: `${stats.staked} $NEXUSCLAW` },
              { label: 'base_apy', value: '20%' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-mono text-cyan-400 text-xs tracking-widest uppercase mb-1">{s.label}</div>
                <div className="text-4xl md:text-5xl font-bold tracking-tighter">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => challengeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex items-center gap-3 bg-cyan-400 text-black px-10 py-5 text-base font-black uppercase tracking-tighter hover:bg-[#00d4e0] hover:shadow-[0_0_40px_rgba(0,238,252,0.4)] transition-all"
            >
              Create my agent now →
            </button>
            <span className="font-mono text-[10px] text-gray-600">
              Free • Takes 3 minutes • Runs locally
            </span>
          </div>
        </div>
      </section>

      {/* ── FIX 3: X CHALLENGE SECTION ── */}
      <section ref={challengeRef} className="border-y border-[#1f2937] bg-[#0d0d0d] px-8 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="font-mono text-[10px] text-cyan-400 tracking-[0.4em] uppercase mb-4">
            // FREE TOKEN MISSION
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-tight">
            EARN YOUR FIRST<br />
            <span className="text-cyan-400">$NEXUSCLAW</span>
          </h2>
          <p className="text-white mb-16 leading-relaxed">
            No purchase required. Post on X and receive 1,000 $NEXUSCLAW to launch your agent.
          </p>

          {/* 3-step grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#1f2937] mb-10 text-left">
            {/* Step 01 */}
            <div className="bg-[#0a0a0a] p-6">
              <div className="font-mono text-3xl font-bold text-cyan-400/30 mb-4">01</div>
              <h3 className="font-bold uppercase tracking-tight mb-2">Follow on X</h3>
              <p className="text-white text-sm mb-4">Follow @nexusclawbot on X (Twitter).</p>
              <a
                href="https://x.com/nexusclawbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all"
              >
                Follow @nexusclawbot on X →
              </a>
            </div>

            {/* Step 02 */}
            <div className="bg-[#0a0a0a] p-6">
              <div className="font-mono text-3xl font-bold text-cyan-400/30 mb-4">02</div>
              <h3 className="font-bold uppercase tracking-tight mb-3">Post the tweet</h3>
              <div className="bg-[#0d0d0d] border border-[#1f2937] p-3 mb-4 font-mono text-xs text-white whitespace-pre-line leading-relaxed">
                {TWEET_TEXT}
              </div>
              <a
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(TWEET_TEXT)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all"
              >
                Post on X ↗
              </a>
            </div>

            {/* Step 03 */}
            <div className="bg-[#0a0a0a] p-6">
              <div className="font-mono text-3xl font-bold text-cyan-400/30 mb-4">03</div>
              <h3 className="font-bold uppercase tracking-tight mb-2">Submit & receive</h3>
              <p className="text-white text-sm">
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
        <div className="font-mono text-xs text-gray-400 tracking-[0.4em] uppercase mb-4">
          select_protocol_v2.0
        </div>
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-12">
          Choose your <span className="text-cyan-400">agent type</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[#1f2937]">
          {AGENT_TYPES.map((agent) => (
            <div
              key={agent.id}
              onClick={() => agent.available && selectAgent(agent.id)}
              className={`bg-[#0a0a0a] p-8 flex flex-col justify-between transition-all duration-300 group
                ${agent.available ? 'cursor-pointer hover:bg-[#111111]' : 'opacity-50 cursor-not-allowed'}
                ${agent.leftBorder ? 'border-l-4 border-l-cyan-400' : ''}
                ${selectedAgent === agent.id ? 'outline outline-1 outline-cyan-400' : ''}
              `}
            >
              <div>
                <div className="flex justify-between items-start mb-12">
                  <span className={`text-4xl font-mono ${agent.iconColor}`}>{agent.icon}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-1 uppercase ${agent.badgeStyle}`}>
                    {agent.badge}
                  </span>
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tighter mb-3">{agent.name}</h3>
                <p className="text-white text-sm leading-relaxed mb-8">{agent.description}</p>
              </div>
              <div>
                <div className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-4">
                  Setup: {agent.setupTime}
                </div>
                <div className={`w-full border border-[#1f2937] py-4 px-6 text-xs font-bold uppercase tracking-widest flex justify-between items-center transition-all ${agent.available ? agent.hoverCta : 'text-gray-600 cursor-not-allowed'}`}>
                  {agent.available ? (selectedAgent === agent.id ? 'SELECTED ✓' : 'SELECT & CONFIGURE') : 'LOCKED_NODE'}
                  {agent.available && <span>→</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SUCCESS SCREEN after download ── */}
      {successConfig && (
        <section ref={setupRef} className="bg-[#0d0d0d] border-y border-[#1f2937] py-24 px-8">
          <SuccessScreen config={successConfig} onReset={() => { setSuccessConfig(null); setSelectedAgent(null); }} />
        </section>
      )}

      {/* ── SETUP GUIDE — Fix 1: single column ── */}
      {selectedAgent && selectedAgent !== 'custom' && selectedAgent !== 'signal' && !successConfig && (
        <section ref={setupRef} className="bg-[#0d0d0d] border-y border-[#1f2937] py-24 px-8">
          <div className="max-w-3xl mx-auto">
            <div className="font-mono text-xs text-gray-400 tracking-[0.4em] uppercase mb-4">
              // step 02
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 leading-none">
              Setup Guide<br />
              <span className="text-cyan-400">
                {selectedAgent === 'staking' ? 'Staking Agent' : 'Marketing Agent'}
              </span>
            </h2>
            <p className="text-gray-400 font-mono text-sm mb-12">
              Follow these steps to get your agent running.
            </p>

            {/* Single column — all steps in order */}
            <div className="space-y-4">
              {steps.map((s, i) => (
                <div key={s.num} className="border border-[#1f2937] p-6 hover:border-[#1f2937]/80 transition-colors">
                  <div className="flex items-start gap-6">
                    <span className="font-mono text-3xl font-bold text-cyan-400/30 flex-shrink-0 leading-none">
                      {s.num}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-bold uppercase tracking-tight mb-2">{s.title}</h4>
                      <p className="text-sm text-white mb-4">{s.desc}</p>

                      {s.code && (
                        <div className="relative bg-[#0a0a0a] border border-[#1f2937] p-4 mb-4">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest">
                              {s.title}
                            </span>
                            <button
                              onClick={() => copyCode(s.code!, i)}
                              className="font-mono text-[10px] text-gray-400 hover:text-cyan-400 transition-colors uppercase tracking-widest"
                            >
                              {copiedStep === i ? 'COPIED ✓' : 'COPY'}
                            </button>
                          </div>
                          <pre className="font-mono text-xs text-cyan-400 overflow-x-auto leading-relaxed">
                            {s.code}
                          </pre>
                        </div>
                      )}

                      {s.action && (
                        <a
                          href={s.action.url}
                          target={s.action.url.startsWith('http') ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all"
                        >
                          {s.action.label} →
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

      {/* ── SIGNAL AGENT PURCHASE SECTION ── */}
      {selectedAgent === 'signal' && (
        <section ref={signalRef} className="bg-[#0d0d0d] border-y border-[#1f2937] py-24 px-8">
          <div className="max-w-3xl mx-auto">
            <div className="font-mono text-[10px] text-yellow-400 tracking-[0.4em] uppercase mb-4">
              // NEXUSCLAW TRADER — AUTONOMOUS TRADING
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 leading-none">
              NexusClaw Trader
            </h2>
            <div className="flex items-baseline gap-4 mb-4">
              <span className="text-5xl font-black text-yellow-400">$49.90</span>
              <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest border border-[#1f2937] px-2 py-1">ONE-TIME PAYMENT</span>
            </div>
            <p className="text-gray-400 font-mono text-sm mb-12">
              No subscription. No signal provider. The bot trades on its own, learns from every result.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-[#1f2937] mb-12">
              {[
                { icon: '◈', title: 'Fully Autonomous', desc: 'No Telegram needed. Detects its own entries on XAUUSD M1 and manages trades end-to-end.' },
                { icon: '◉', title: 'AI Self-Optimization', desc: 'Claude AI analyzes every 5 trades and adjusts parameters automatically. Max 20% change per cycle.' },
                { icon: '◆', title: 'Live Public Results', desc: 'Every trade logged in real time. Win rate and P&L visible publicly at nexusclaw.tech/trader.' },
                { icon: '→', title: 'Runs 24/7', desc: 'Runs on VPS or local PC. Connects directly to MetaTrader 5 — no cloud dependency.' },
              ].map((f) => (
                <div key={f.title} className="bg-[#111111] p-6 flex gap-4">
                  <span className="text-yellow-400 text-2xl flex-shrink-0 font-mono">{f.icon}</span>
                  <div>
                    <h4 className="font-bold uppercase tracking-tight text-sm mb-1">{f.title}</h4>
                    <p className="text-white text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-[#1f2937] p-8 bg-[#0a0a0a] mb-8">
              <div className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-6">
                // WHAT&apos;S INCLUDED IN THE PACKAGE
              </div>
              <ul className="space-y-3 font-mono text-sm text-white">
                {[
                  'nexusclaw_trader.py — main autonomous trading bot',
                  'strategy_agent.py — Claude AI parameter optimizer',
                  'trade_logger.py — Supabase trade logging module',
                  '.env.template — pre-filled configuration file',
                  'requirements.txt — Python dependencies',
                  'setup_guide.pdf — step-by-step setup guide (EN + PT)',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-yellow-400 flex-shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-[#1f2937] p-6 bg-yellow-400/5 mb-8">
              <div className="font-mono text-[10px] text-yellow-400 uppercase tracking-widest mb-2">
                // REQUIREMENTS
              </div>
              <ul className="space-y-1 font-mono text-xs text-white">
                <li>Windows VPS or local PC (MetaTrader5 Python package is Windows-only)</li>
                <li>MetaTrader 5 terminal logged into a broker account (XAUUSD required)</li>
                <li>Python 3.11+</li>
                <li>Claude API key (Anthropic) — for AI self-optimization</li>
                <li>Supabase account — free tier is enough for live result logging</li>
              </ul>
            </div>

            {/* ── HOLDER DISCOUNT CHECK ── */}
            <div className="border border-[#1f2937] bg-[#0a0a0a] p-8 mb-8">
              <div className="font-mono text-[10px] text-yellow-400 tracking-[0.4em] uppercase mb-3">
                // NEXUSCLAW HOLDER DISCOUNT
              </div>
              <p className="font-mono text-xs text-white mb-6">
                Hold 1,000 $NEXUSCLAW and get 20% off —{' '}
                <span className="text-white">permanently locked at $39.90.</span>{' '}
                Verification is on-chain. No signup required.
              </p>

              {/* Default: both prices shown */}
              {!holderStatus && (
                <div className="flex gap-6 items-center mb-6">
                  <div>
                    <div className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mb-1">Regular</div>
                    <div className="text-2xl font-black text-white">$49.90</div>
                  </div>
                  <div className="text-gray-600">vs</div>
                  <div>
                    <div className="font-mono text-[10px] text-yellow-400 uppercase tracking-widest mb-1">Holder price</div>
                    <div className="text-2xl font-black text-yellow-400 flex items-center gap-2">
                      $39.90 🔒
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet input + check button */}
              {!holderStatus && (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={holderWallet}
                    onChange={(e) => { setHolderWallet(e.target.value); setHolderError('') }}
                    placeholder="0x... your Base wallet"
                    className="flex-1 bg-[#0a0a0a] border border-[#1f2937] text-white px-4 py-3 text-sm focus:border-yellow-700 focus:outline-none font-mono placeholder:text-gray-600"
                  />
                  <button
                    onClick={handleHolderCheck}
                    disabled={holderChecking || !holderWallet}
                    className="px-6 py-3 border border-yellow-700 text-yellow-400 font-mono text-xs font-bold uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {holderChecking ? '... Checking...' : 'CHECK BALANCE'}
                  </button>
                </div>
              )}
              {holderError && (
                <p className="font-mono text-xs text-red-400 mt-3">{holderError}</p>
              )}

              {/* State A — Holder confirmed */}
              {holderStatus?.isHolder && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-green-900/40 border border-green-600/40 text-green-400 font-mono text-[10px] uppercase tracking-widest px-3 py-1">
                      ✓ NEXUSCLAW HOLDER VERIFIED
                    </span>
                  </div>
                  <p className="font-mono text-xs text-white mb-1">
                    Wallet balance: <span className="text-white">{parseFloat(holderStatus.balance).toLocaleString('en-US', { maximumFractionDigits: 0 })} $NEXUSCLAW</span>
                    {holderStatus.isStaker && <span className="text-green-400 ml-2">+ staking active</span>}
                  </p>
                  <p className="font-mono text-[10px] text-green-500 mb-6">Your exclusive discount code — apply at checkout:</p>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 bg-[#0a0a0a] border border-green-600/40 px-6 py-4 font-mono text-2xl font-bold text-green-400 tracking-[0.3em]">
                      HOLDER20
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText('HOLDER20')}
                      className="px-4 py-4 border border-green-600/40 text-green-400 font-mono text-[10px] uppercase tracking-widest hover:bg-green-900/30 transition-all flex items-center gap-2"
                    >
                      COPY
                    </button>
                  </div>
                  <p className="font-mono text-[10px] text-gray-400 mb-6">
                    Saves $10 · Final price $39.90 · Enter code at Stripe checkout
                  </p>
                  <button
                    onClick={() => { setHolderStatus(null); setHolderWallet('') }}
                    className="font-mono text-[10px] text-gray-600 hover:text-gray-400 transition-colors underline"
                  >
                    Check a different wallet
                  </button>
                </div>
              )}

              {/* State B — Balance too low */}
              {holderStatus && !holderStatus.isHolder && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-yellow-900/30 border border-yellow-600/40 text-yellow-400 font-mono text-[10px] uppercase tracking-widest px-3 py-1">
                      ⚠ INSUFFICIENT BALANCE
                    </span>
                  </div>
                  <p className="font-mono text-xs text-white mb-3">
                    Your balance: <span className="text-white">{parseFloat(holderStatus.balance).toLocaleString('en-US', { maximumFractionDigits: 0 })} $NEXUSCLAW</span>
                    <span className="text-gray-600"> / need 1,000</span>
                  </p>
                  {/* Progress bar */}
                  <div className="w-full bg-[#111111] h-1.5 mb-4">
                    <div
                      className="bg-yellow-400 h-1.5 transition-all"
                      style={{ width: `${Math.min(100, (parseFloat(holderStatus.balance) / 1000) * 100)}%` }}
                    />
                  </div>
                  <p className="font-mono text-xs text-white mb-4">
                    Get 1,000 $NEXUSCLAW free via the X Challenge above.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => challengeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="inline-flex items-center gap-2 border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all font-mono"
                    >
                      COMPLETE X CHALLENGE →
                    </button>
                    <button
                      onClick={() => { setHolderStatus(null); setHolderWallet('') }}
                      className="font-mono text-[10px] text-gray-600 hover:text-gray-400 transition-colors underline"
                    >
                      Try different wallet
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── BUY BUTTON — adapts to holder status ── */}
            {holderStatus?.isHolder ? (
              <>
                <a
                  href="https://buy.stripe.com/00w9AM2y10wub4VfpC77O02"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-between gap-4 bg-green-400 text-black px-10 py-6 text-lg font-black uppercase tracking-tighter hover:brightness-110 transition-all"
                >
                  <span>BUY NEXUSCLAW TRADER — APPLY CODE HOLDER20</span>
                  <span className="font-mono text-sm font-normal flex items-center gap-2">
                    🔒 Secure checkout via Stripe
                  </span>
                </a>
                <p className="font-mono text-[10px] text-green-600 mt-2 text-center">
                  Copy code HOLDER20 · apply at checkout · final price $39.90
                </p>
              </>
            ) : (
              <a
                href="https://buy.stripe.com/00w9AM2y10wub4VfpC77O02"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-between gap-4 bg-yellow-400 text-black px-10 py-6 text-lg font-black uppercase tracking-tighter hover:brightness-110 transition-all"
              >
                <span>BUY NEXUSCLAW TRADER — $49.90</span>
                <span className="font-mono text-sm font-normal flex items-center gap-2">
                  🔒 Secure checkout via Stripe
                </span>
              </a>
            )}
            <p className="font-mono text-[10px] text-gray-600 mt-3 text-center">
              Download link delivered instantly by email after payment · See our{' '}
              <a href="/refund" className="hover:text-yellow-400 transition-colors">Refund Policy</a>
            </p>
          </div>
        </section>
      )}

      {/* ── BENEFITS GRID ── */}
      <section className="px-8 py-24 max-w-[1440px] mx-auto">
        <div className="font-mono text-xs text-cyan-400 tracking-[0.4em] uppercase mb-16">
          system_advantages_readout
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[#1f2937]">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-[#0a0a0a] p-12 hover:bg-[#111111] transition-colors">
              <span className="text-cyan-400 text-3xl mb-6 block font-mono">{b.icon}</span>
              <h5 className="text-lg font-bold uppercase tracking-tight mb-3">{b.title}</h5>
              <p className="text-sm text-white leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-8 pb-24 max-w-[1440px] mx-auto">
        <div className="relative bg-[#111111] p-20 border border-[#1f2937] overflow-hidden text-center">
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-cyan-400/5 blur-[120px] pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-none">
              Ready to join the<br />
              <span className="text-cyan-400">agent economy?</span>
            </h2>
            <p className="font-mono text-[10px] text-gray-400 tracking-widest uppercase mb-12">
              No coding required • Takes less than 3 minutes • Backed by NexusClaw Protocol
            </p>
            <button
              onClick={() => challengeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex items-center gap-4 bg-cyan-400 text-black px-12 py-6 text-xl font-black uppercase tracking-tighter hover:brightness-110 transition-all"
            >
              Create my first agent ⚡
            </button>
            <p className="font-mono text-[10px] text-gray-600 mt-8">
              Questions? Find us on{' '}
              <a href="https://www.moltbook.com/m/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors">
                Moltbook
              </a>
              {' '}or{' '}
              <a href="https://t.me/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors">
                Telegram
              </a>
            </p>
          </div>
        </div>
      </section>

    </PageShell>

    {/* Config Modal — outside PageShell, rendered as sibling */}
    {modalOpen && (
      <ConfigModal
        agentType={modalAgentType}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    )}
    </>
  )
}
