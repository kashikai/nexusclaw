'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TopNav } from '@/components/layout/TopNav'

const BASESCAN = 'https://basescan.org'
const GITHUB   = 'https://github.com/kashikai/nexusclaw'
const TELEGRAM = 'https://t.me/nexusclawofficial'

const TOKEN_ADDR   = '0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6'
const STAKING_ADDR = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe'
const MULTISIG_ADDR = '0x02320eCCB3B67e802C29f9e9F8703D5756535515'

const NAV = [
  { id: 'overview',    label: 'Overview' },
  { id: 'quickstart',  label: 'Quick Start' },
  { id: 'contracts',   label: 'Contracts' },
  { id: 'agent-v1',   label: 'Agent v1' },
  { id: 'security',    label: 'Security' },
  { id: 'faq',         label: 'FAQ' },
]

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-[#070707] border border-[#1e1e1e] rounded p-5 overflow-x-auto font-['JetBrains_Mono'] text-xs text-[#c1c6d6] leading-relaxed my-4">
      <code>{children}</code>
    </pre>
  )
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="font-['JetBrains_Mono'] text-xs text-[#00eefc] bg-[#070707] px-1.5 py-0.5 rounded">
      {children}
    </code>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-['Space_Grotesk'] text-2xl font-black uppercase tracking-tight mb-6 text-[#e5e2e1]">
      {children}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-['Space_Grotesk'] font-bold uppercase tracking-wide text-sm text-[#abc7ff] mt-8 mb-3">
      {children}
    </h3>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-['JetBrains_Mono'] text-xs text-[#8b919f] leading-relaxed mb-4">
      {children}
    </p>
  )
}

function AddrLink({ addr, label }: { addr: string; label?: string }) {
  return (
    <a
      href={`${BASESCAN}/address/${addr}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-['JetBrains_Mono'] text-xs text-[#abc7ff] hover:text-[#3A8BFF] transition-colors break-all"
    >
      {label ?? addr}
    </a>
  )
}

function Divider() {
  return <div className="border-t border-[#1e1e1e] my-8" />
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="w-6 h-6 rounded-full bg-[#00eefc]/10 border border-[#00eefc]/40 flex items-center justify-center font-['JetBrains_Mono'] text-[10px] text-[#00eefc] font-bold shrink-0">
        {n}
      </span>
      <div className="h-px flex-1 bg-[#1e1e1e]" />
    </div>
  )
}

function FnRow({ fn }: { fn: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#1a1a1a]">
      <span className="w-1 h-4 bg-[#00eefc]/40 rounded shrink-0" />
      <InlineCode>{fn}</InlineCode>
    </div>
  )
}

function EnvRow({ variable, description, def }: { variable: string; description: string; def: string }) {
  return (
    <tr className="border-b border-[#1a1a1a]">
      <td className="py-3 pr-4 align-top"><InlineCode>{variable}</InlineCode></td>
      <td className="py-3 pr-4 align-top font-['JetBrains_Mono'] text-[10px] text-[#8b919f]">{description}</td>
      <td className="py-3 align-top font-['JetBrains_Mono'] text-[10px] text-[#414754]">{def}</td>
    </tr>
  )
}

function ContractRow({ label, addr, status }: { label: string; addr: string; status: string }) {
  return (
    <tr className="border-b border-[#1a1a1a]">
      <td className="py-4 pr-6 font-['JetBrains_Mono'] text-xs text-[#c1c6d6] align-top whitespace-nowrap">{label}</td>
      <td className="py-4 pr-6 align-top"><AddrLink addr={addr} /></td>
      <td className="py-4 align-top font-['JetBrains_Mono'] text-xs text-[#4ddbc9]">{status}</td>
    </tr>
  )
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div className="py-5 border-b border-[#1a1a1a]">
      <p className="font-['Space_Grotesk'] font-bold text-sm uppercase tracking-wide text-[#e5e2e1] mb-2">{q}</p>
      <p className="font-['JetBrains_Mono'] text-xs text-[#8b919f] leading-relaxed">{a}</p>
    </div>
  )
}

function SectionOverview() {
  return (
    <div>
      <SectionHeading>NexusClaw Documentation</SectionHeading>
      <Body>
        NexusClaw is the economic layer for autonomous AI agents on Base Network.
        Agents stake tokens, earn rewards, and fund their own operations — without human intervention.
      </Body>

      <Divider />

      <SubHeading>Key Links</SubHeading>
      <div className="space-y-3">
        <div className="flex items-center gap-3 py-2 border-b border-[#1a1a1a]">
          <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] w-24 shrink-0">Website</span>
          <a href="https://nexusclaw.tech" target="_blank" rel="noopener noreferrer"
            className="font-['JetBrains_Mono'] text-xs text-[#abc7ff] hover:text-[#3A8BFF] transition-colors">
            nexusclaw.tech ↗
          </a>
        </div>
        <div className="flex items-center gap-3 py-2 border-b border-[#1a1a1a]">
          <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] w-24 shrink-0">GitHub</span>
          <a href={GITHUB} target="_blank" rel="noopener noreferrer"
            className="font-['JetBrains_Mono'] text-xs text-[#abc7ff] hover:text-[#3A8BFF] transition-colors">
            github.com/kashikai/nexusclaw ↗
          </a>
        </div>
        <div className="flex items-center gap-3 py-2 border-b border-[#1a1a1a]">
          <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] w-24 shrink-0">Contract</span>
          <AddrLink addr={STAKING_ADDR} label={`${STAKING_ADDR.slice(0, 10)}...${STAKING_ADDR.slice(-8)} ↗`} />
        </div>
      </div>

      <Divider />

      <SubHeading>What is NexusClaw?</SubHeading>
      <Body>
        The protocol lets AI agents operate financially on-chain. An agent can stake $NEXUSCLAW,
        earn 20% APY rewards, and use those rewards to fund API calls, compute costs, and other
        operational expenses — completely autonomously.
      </Body>
      <Body>
        Agent V1 is live on Base Mainnet and has been running continuously since April 2026.
        View it at <Link href="/proof" className="text-[#abc7ff] hover:text-[#e5e2e1] transition-colors">/proof</Link>.
      </Body>
    </div>
  )
}

function SectionQuickStart() {
  return (
    <div>
      <SectionHeading>Run Your First Agent in 3 Steps</SectionHeading>

      <StepBadge n={1} />
      <SubHeading>Get $NEXUSCLAW</SubHeading>
      <Body>
        Complete the X Challenge at{' '}
        <Link href="/start-agent" className="text-[#abc7ff] hover:text-[#e5e2e1] transition-colors">/start-agent</Link>
        {' '}to receive 1,000 $NEXUSCLAW free.
      </Body>

      <Divider />

      <StepBadge n={2} />
      <SubHeading>Configure</SubHeading>
      <Body>Clone the repo and set up your environment:</Body>
      <Code>{`git clone https://github.com/kashikai/nexusclaw
cd nexusclaw/agents/v1
cp .env.example .env
# Add your agent wallet private key`}</Code>

      <Divider />

      <StepBadge n={3} />
      <SubHeading>Run</SubHeading>
      <Code>{`npm install
node agent-core.js`}</Code>
      <Body>
        The agent will start polling every 5 minutes. Check the logs — it will print staked amount,
        pending rewards, and each action taken.
      </Body>
    </div>
  )
}

function SectionContracts() {
  return (
    <div>
      <SectionHeading>Deployed Contracts — Base Mainnet</SectionHeading>

      <div className="overflow-x-auto mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              <th className="text-left font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] pb-3 pr-6">Contract</th>
              <th className="text-left font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] pb-3 pr-6">Address</th>
              <th className="text-left font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <ContractRow label="$NEXUSCLAW Token"        addr={TOKEN_ADDR}    status="Verified ✅" />
            <ContractRow label="NexusClawStaking v10.3"  addr={STAKING_ADDR}  status="Verified ✅" />
            <ContractRow label="Safe Multisig 3/5"       addr={MULTISIG_ADDR} status="Active ✅" />
          </tbody>
        </table>
      </div>

      <Divider />

      <SubHeading>Key Functions</SubHeading>
      <div className="space-y-0">
        {[
          'stake(uint256 amount)',
          'unstake(uint256 amount)',
          'claimRewards()',
          'pendingReward(address user)',
          'getUserInfo(address user)',
          'rewardPoolRunway()',
          'emergencyWithdraw()',
        ].map((fn) => <FnRow key={fn} fn={fn} />)}
      </div>
    </div>
  )
}

function SectionAgentV1() {
  return (
    <div>
      <SectionHeading>AutoCompounder Agent v1</SectionHeading>
      <Body>
        Autonomous Node.js agent that stakes, claims rewards, and compounds automatically.
        Runs on a 5-minute polling loop with no human intervention required.
      </Body>

      <Divider />

      <SubHeading>Key Files</SubHeading>
      <div className="space-y-2 mb-6">
        {[
          { file: 'agent-core.js',              desc: 'Main loop and execution engine' },
          { file: 'config/agent.config.js',     desc: 'Configuration and constants' },
          { file: 'utils/logger.js',            desc: 'Structured logging' },
          { file: 'abis/',                      desc: 'Contract ABI definitions' },
        ].map(({ file, desc }) => (
          <div key={file} className="flex items-start gap-4 py-2 border-b border-[#1a1a1a]">
            <InlineCode>{file}</InlineCode>
            <span className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] mt-0.5">{desc}</span>
          </div>
        ))}
      </div>

      <Divider />

      <SubHeading>Environment Variables</SubHeading>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              <th className="text-left font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] pb-3 pr-4">Variable</th>
              <th className="text-left font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] pb-3 pr-4">Description</th>
              <th className="text-left font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] pb-3">Default</th>
            </tr>
          </thead>
          <tbody>
            <EnvRow variable="RPC_URL"                 description="Base Mainnet RPC endpoint"      def="mainnet.base.org" />
            <EnvRow variable="PRIVATE_KEY_AGENT"       description="Agent wallet private key"       def="required" />
            <EnvRow variable="STAKING_ADDRESS"         description="Staking contract address"       def="0xD209..." />
            <EnvRow variable="TOKEN_ADDRESS"           description="Token contract address"         def="0xFC68..." />
            <EnvRow variable="MIN_REWARD_CLAW"         description="Min rewards before claiming"    def="1" />
            <EnvRow variable="POLL_INTERVAL_MINUTES"   description="Check frequency in minutes"     def="5" />
            <EnvRow variable="MIN_ETH_BALANCE"         description="Stop if ETH drops below this"   def="0.0005" />
          </tbody>
        </table>
      </div>

      <Divider />

      <div className="bg-[#1a0a00] border-l-4 border-[#ffb4ab] p-5 rounded">
        <p className="font-['JetBrains_Mono'] text-xs text-[#ffb4ab] leading-relaxed">
          ⚠️ Never use your main wallet. Always create a dedicated agent wallet with only the funds needed for operation.
        </p>
      </div>
    </div>
  )
}

function SectionSecurity() {
  return (
    <div>
      <SectionHeading>Security Overview</SectionHeading>
      <Body>
        Summary of key security properties. For full details, see the dedicated security page.
      </Body>

      <Divider />

      <div className="space-y-3 mb-8">
        {[
          'Verified contract on Basescan',
          '3/5 multisig admin — no single point of failure',
          'No external audit yet — planned Phase 5',
          'Emergency withdraw always available to users',
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-[#1a1a1a]">
            <span className="font-['JetBrains_Mono'] text-[#4ddbc9] text-xs shrink-0 mt-0.5">
              {i === 2 ? '⚠️' : '✅'}
            </span>
            <span className="font-['JetBrains_Mono'] text-xs text-[#c1c6d6]">{item}</span>
          </div>
        ))}
      </div>

      <Link
        href="/security"
        className="inline-flex items-center gap-2 px-5 py-3 bg-[#1c1b1b] border border-[#414754]/30 rounded font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#abc7ff] hover:border-[#abc7ff]/40 hover:text-[#e5e2e1] transition-all"
      >
        Full security details → /security
      </Link>
    </div>
  )
}

function SectionFaq() {
  return (
    <div>
      <SectionHeading>FAQ</SectionHeading>
      <div className="space-y-0">
        <FaqItem
          q="Do I need to code to run an agent?"
          a="No. Follow the Quick Start guide. Basic terminal knowledge required."
        />
        <FaqItem
          q="How much $NEXUSCLAW do I need?"
          a={<>Minimum 100 tokens recommended. Get free tokens via X Challenge at{' '}
            <Link href="/start-agent" className="text-[#abc7ff] hover:text-[#e5e2e1] transition-colors">/start-agent</Link>.</>}
        />
        <FaqItem
          q="Is my private key safe?"
          a="Your key never leaves your machine. We never have access to it."
        />
        <FaqItem
          q="What happens if agent stops?"
          a={<>Self-hosted: restart manually. Managed plan: we auto-restart. See{' '}
            <Link href="/pricing" className="text-[#abc7ff] hover:text-[#e5e2e1] transition-colors">/pricing</Link>.</>}
        />
        <FaqItem
          q="Where can I get help?"
          a={<>
            <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className="text-[#abc7ff] hover:text-[#e5e2e1] transition-colors">Telegram @nexusclawofficial</a>
            {' '}or open a{' '}
            <a href={GITHUB + '/issues'} target="_blank" rel="noopener noreferrer" className="text-[#abc7ff] hover:text-[#e5e2e1] transition-colors">GitHub issue</a>.
          </>}
        />
      </div>
    </div>
  )
}

const SECTIONS: Record<string, React.FC> = {
  overview:   SectionOverview,
  quickstart: SectionQuickStart,
  contracts:  SectionContracts,
  'agent-v1': SectionAgentV1,
  security:   SectionSecurity,
  faq:        SectionFaq,
}

export default function DocsPage() {
  const [active, setActive] = useState('overview')
  const Content = SECTIONS[active] ?? SectionOverview

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav active="/docs" />

      <div className="pt-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="flex gap-0 min-h-[calc(100vh-5rem)]">

          {/* ── SIDEBAR ── */}
          <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[#1e1e1e] pt-12 pr-6 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
            <p className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-[0.3em] text-[#414754] mb-6">Docs</p>
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={`text-left px-3 py-2 rounded font-['JetBrains_Mono'] text-xs uppercase tracking-widest transition-colors ${
                    active === item.id
                      ? 'text-[#00eefc] bg-[#00eefc]/5 border-l-2 border-[#00eefc]'
                      : 'text-[#8b919f] hover:text-[#e5e2e1] hover:bg-[#1c1b1b] border-l-2 border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-8 pb-8">
              <a
                href={GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#414754] hover:text-[#abc7ff] transition-colors"
              >
                GitHub ↗
              </a>
            </div>
          </aside>

          {/* ── MOBILE NAV ── */}
          <div className="md:hidden w-full pt-6 pb-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={`px-3 py-1.5 rounded font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest transition-colors whitespace-nowrap ${
                    active === item.id
                      ? 'text-[#00eefc] bg-[#00eefc]/10 border border-[#00eefc]/30'
                      : 'text-[#8b919f] border border-[#1e1e1e] hover:text-[#e5e2e1]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── CONTENT ── */}
          <main className="flex-1 min-w-0 pt-12 pb-24 md:pl-12">
            <Content />
          </main>
        </div>
      </div>
    </div>
  )
}
