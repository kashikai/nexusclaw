'use client'

import { useState } from 'react'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { TopNav } from '@/components/layout/TopNav'

const STAKING_ADDRESS = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe' as const
const TOKEN_ADDRESS   = '0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6' as const
const STRIPE_LINK     = 'https://buy.stripe.com/00w9AM2y10wub4VfpC77O02'

const tokenAbi = [
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
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
  const bal    = balance as bigint
  const staked = (userInfo as readonly bigint[])[0]
  return {
    balance: formatUnits(bal, 18),
    staked: formatUnits(staked, 18),
    isHolder: bal >= MIN_HOLDER_BALANCE || staked > 0n,
    isStaker: staked > 0n,
  }
}

const FEATURES = [
  { icon: '⚡', title: 'TELEGRAM → MT5', desc: 'Reads signals from any Telegram channel and executes them on MetaTrader 5 automatically.' },
  { icon: '🎯', title: 'MULTI-TP SUPPORT', desc: 'Opens up to 4 separate positions for signals with multiple take-profit targets.' },
  { icon: '🛡️', title: 'SLIPPAGE PROTECTION', desc: 'Converts to pending order if price moved adversely more than 10 pips since signal.' },
  { icon: '🔄', title: 'RUNS 24/7', desc: 'Keeps running on VPS or local machine. Connects to MT5 terminal with no cloud dependency.' },
  { icon: '∞', title: 'UNLIMITED ACCOUNTS', desc: 'Run on as many MT5 accounts as you want. Competitors charge per account — we don\'t.' },
  { icon: '📈', title: 'MOVE SL AUTOMATICALLY', desc: 'Moves SL to entry when TP1 is hit. Moves to TP1 when TP2 is hit. Protects your profits.' },
]

const FAQ = [
  { q: 'Does it work with any Telegram signal channel?', a: 'Yes — public and private channels. You just need to be a member of the channel.' },
  { q: 'Does it work with any MT5 broker?', a: 'Yes — any broker that supports MetaTrader 5.' },
  { q: 'Do I need a VPS?', a: 'A VPS is recommended for 24/7 operation. You can also run it on your local PC, but it must stay on and connected.' },
  { q: 'What happens if I miss a signal?', a: 'The bot runs continuously and catches signals in real time. If your PC or VPS is off, signals during that time will be missed.' },
  { q: 'Can I run it on multiple accounts?', a: 'Yes — unlimited accounts at no extra cost.' },
  { q: 'Is my MT5 password safe?', a: 'Your credentials are stored locally in the .env file on your machine. We never have access to them.' },
  { q: 'What is the $NEXUSCLAW holder discount?', a: 'Hold 1,000 $NEXUSCLAW tokens and get 20% off permanently. Use coupon HOLDER20 at checkout. Get tokens free via the X Challenge at nexusclaw.tech/start-agent.' },
]

type HolderStatus = { balance: string; staked: string; isHolder: boolean; isStaker: boolean } | null

export default function SignalAgentContent() {
  const [holderWallet,   setHolderWallet]   = useState('')
  const [holderStatus,   setHolderStatus]   = useState<HolderStatus>(null)
  const [holderChecking, setHolderChecking] = useState(false)
  const [holderError,    setHolderError]    = useState('')
  const [copiedCode,     setCopiedCode]     = useState(false)
  const [openFaq,        setOpenFaq]        = useState<number | null>(null)

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

  function copyCode() {
    navigator.clipboard.writeText('HOLDER20')
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const isHolder = holderStatus?.isHolder ?? false

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#e5e2e1] font-['JetBrains_Mono']">
      <TopNav active="/signal-agent" />

      <main className="pt-24">

        {/* ── HERO ── */}
        <section className="relative px-6 md:px-16 py-20 md:py-32 max-w-[1200px] mx-auto">
          {/* Gold glow bg */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(245,197,66,0.06)_0%,transparent_70%)]" />
          </div>

          <div className="relative z-10 max-w-3xl">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 border border-green-500/40 bg-green-900/20 px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-[10px] uppercase tracking-[0.3em]">LIVE — TESTED ON REAL ACCOUNT</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-[1.0] mb-8">
              COPY TELEGRAM SIGNALS<br />
              <span className="text-[#f5c542]">TO MT5.</span>{' '}
              <span className="text-[#414754]">AUTOMATICALLY.</span>
            </h1>

            <p className="text-base md:text-lg text-[#c1c6d6] max-w-2xl leading-relaxed mb-10 font-['JetBrains_Mono'] font-light">
              The Signal Agent monitors any Telegram channel and executes trades directly on MetaTrader 5 — entry, SL, and up to 4 TPs. No subscription. Unlimited accounts.
            </p>

            {/* Proof points */}
            <div className="space-y-3 mb-12">
              {[
                'Tested on real account — May 2026',
                'Unlimited MT5 accounts — competitors charge per account',
                'One-time payment — no monthly fees ever',
              ].map((point) => (
                <div key={point} className="flex items-center gap-3 text-sm text-[#c1c6d6]">
                  <span className="text-[#f5c542] font-bold">✓</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <a
                href={STRIPE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#f5c542] text-[#0c0c0c] px-10 py-5 text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all"
              >
                BUY SIGNAL AGENT — $49.90 →
              </a>
            </div>
            <p className="text-[10px] text-[#8b919f] mt-3">
              $NEXUSCLAW holders pay $39.90 — check below
            </p>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="border-y border-[#1e1e1e] bg-[#0a0a0a] px-6 md:px-16 py-24">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// HOW IT WORKS</div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-16 text-[#e5e2e1]">
              Three steps.<br /><span className="text-[#f5c542]">Fully automatic.</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#1e1e1e]">
              {[
                { num: '01', title: 'CONNECT', body: 'Point the bot to any Telegram signal channel. Works with public and private channels.' },
                { num: '02', title: 'PARSE', body: 'Bot reads BUY/SELL signals automatically. Detects entry, SL, and up to 4 TP targets.' },
                { num: '03', title: 'EXECUTE', body: 'Orders open instantly on your MT5 account. Slippage protection built in.' },
              ].map((step) => (
                <div key={step.num} className="bg-[#0c0c0c] p-10 hover:bg-[#111] transition-colors">
                  <div className="text-5xl font-black text-[#f5c542]/20 mb-6">{step.num}</div>
                  <div className="text-xs font-black uppercase tracking-widest text-[#f5c542] mb-3">{step.title}</div>
                  <p className="text-sm text-[#c1c6d6] leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section className="px-6 md:px-16 py-24 max-w-[1200px] mx-auto">
          <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// FEATURES</div>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-16">
            Built for traders.<br /><span className="text-[#f5c542]">Not for marketers.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[#1e1e1e]">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[#0c0c0c] p-8 hover:bg-[#111] transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <div className="text-xs font-black uppercase tracking-widest text-[#f5c542] mb-3">{f.title}</div>
                <p className="text-sm text-[#c1c6d6] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHAT'S INCLUDED ── */}
        <section className="border-y border-[#1e1e1e] bg-[#0a0a0a] px-6 md:px-16 py-24">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div>
              <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// WHAT&apos;S IN THE PACKAGE</div>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-10">
                Everything you need.<br /><span className="text-[#f5c542]">Nothing you don&apos;t.</span>
              </h2>
              <ul className="space-y-5">
                {[
                  { file: 'signal_copier.py', desc: 'the main bot script' },
                  { file: '.env.template', desc: 'pre-filled configuration file' },
                  { file: 'requirements.txt', desc: 'Python dependencies' },
                  { file: 'signal_agent_guide.pdf', desc: 'illustrated setup guide (9 steps) — EN + PT versions' },
                ].map((item) => (
                  <li key={item.file} className="flex gap-4 items-start">
                    <span className="text-[#f5c542] flex-shrink-0 mt-0.5">—</span>
                    <div>
                      <span className="text-[#e5e2e1] text-sm font-bold">{item.file}</span>
                      <span className="text-[#8b919f] text-sm"> — {item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div>
              <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// REQUIREMENTS</div>
              <div className="border border-[#f5c542]/20 bg-[#f5c542]/3 p-8">
                <ul className="space-y-4">
                  {[
                    'Windows VPS or local PC (MetaTrader5 Python package is Windows-only)',
                    'MetaTrader 5 terminal installed and logged into your broker account',
                    'Python 3.11+ installed',
                    'A Telegram account to connect to signal channels',
                  ].map((req) => (
                    <li key={req} className="flex gap-3 text-sm text-[#c1c6d6]">
                      <span className="text-[#f5c542] flex-shrink-0">›</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOLDER DISCOUNT ── */}
        <section className="px-6 md:px-16 py-24 max-w-[1200px] mx-auto">
          <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// NEXUSCLAW HOLDER DISCOUNT</div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">
            Hold tokens.<br /><span className="text-[#f5c542]">Pay less. Forever.</span>
          </h2>
          <p className="text-sm text-[#c1c6d6] max-w-xl mb-12 leading-relaxed">
            Hold 1,000 $NEXUSCLAW and get 20% off — permanently locked at $39.90. Verification is on-chain. No signup required.
          </p>

          <div className="max-w-2xl border border-[#414754]/40 bg-[#0a0a0a] p-8">
            {/* Price comparison */}
            {!holderStatus && (
              <div className="flex gap-8 items-center mb-8">
                <div>
                  <div className="text-[10px] text-[#8b919f] uppercase tracking-widest mb-1">Regular</div>
                  <div className="text-3xl font-black text-[#e5e2e1]">$49.90</div>
                </div>
                <div className="text-[#414754] text-lg">vs</div>
                <div>
                  <div className="text-[10px] text-[#f5c542] uppercase tracking-widest mb-1">Holder price</div>
                  <div className="text-3xl font-black text-[#f5c542] flex items-center gap-2">
                    $39.90
                    <span className="material-symbols-outlined text-base">lock</span>
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            {!holderStatus && (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={holderWallet}
                  onChange={(e) => { setHolderWallet(e.target.value); setHolderError('') }}
                  placeholder="0x... your Base wallet"
                  className="flex-1 bg-black border border-[#414754]/40 text-[#e5e2e1] px-4 py-3 text-sm focus:border-[#f5c542] focus:outline-none font-['JetBrains_Mono'] placeholder:text-[#414754]"
                />
                <button
                  onClick={handleHolderCheck}
                  disabled={holderChecking || !holderWallet}
                  className="px-6 py-3 border border-[#f5c542] text-[#f5c542] text-xs font-bold uppercase tracking-widest hover:bg-[#f5c542] hover:text-[#0c0c0c] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {holderChecking
                    ? <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Checking...</span>
                    : 'CHECK BALANCE'}
                </button>
              </div>
            )}
            {holderError && <p className="text-xs text-[#ffb4ab] mt-3">{holderError}</p>}

            {/* Holder confirmed */}
            {holderStatus?.isHolder && (
              <div>
                <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-600/40 text-green-400 text-[10px] uppercase tracking-widest px-3 py-1 mb-6">
                  ✓ NEXUSCLAW HOLDER VERIFIED
                </div>
                <p className="text-xs text-[#c1c6d6] mb-1">
                  Wallet balance:{' '}
                  <span className="text-[#e5e2e1]">
                    {parseFloat(holderStatus.balance).toLocaleString('en-US', { maximumFractionDigits: 0 })} $NEXUSCLAW
                  </span>
                  {holderStatus.isStaker && <span className="text-green-400 ml-2">+ staking active</span>}
                </p>
                <p className="text-[10px] text-green-500 mb-4">Apply at checkout:</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 bg-black border border-green-600/40 px-6 py-4 text-2xl font-black text-green-400 tracking-[0.3em]">
                    HOLDER20
                  </div>
                  <button
                    onClick={copyCode}
                    className="px-4 py-4 border border-green-600/40 text-green-400 text-[10px] uppercase tracking-widest hover:bg-green-900/30 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    {copiedCode ? 'COPIED ✓' : 'COPY'}
                  </button>
                </div>
                <p className="text-[10px] text-[#8b919f] mb-6">Saves $10 · Final price $39.90 · Enter code at Stripe checkout</p>
                <button
                  onClick={() => { setHolderStatus(null); setHolderWallet('') }}
                  className="text-[10px] text-[#414754] hover:text-[#8b919f] transition-colors underline"
                >
                  Check a different wallet
                </button>
              </div>
            )}

            {/* Not a holder */}
            {holderStatus && !holderStatus.isHolder && (
              <div>
                <div className="inline-flex items-center gap-2 bg-yellow-900/30 border border-yellow-600/40 text-yellow-400 text-[10px] uppercase tracking-widest px-3 py-1 mb-4">
                  ⚠ INSUFFICIENT BALANCE
                </div>
                <p className="text-xs text-[#c1c6d6] mb-2">
                  Your balance:{' '}
                  <span className="text-[#e5e2e1]">
                    {parseFloat(holderStatus.balance).toLocaleString('en-US', { maximumFractionDigits: 0 })} $NEXUSCLAW
                  </span>
                  <span className="text-[#414754]"> / need 1,000</span>
                </p>
                <div className="w-full bg-[#1a1a1a] h-1 mb-4">
                  <div
                    className="bg-[#f5c542] h-1 transition-all"
                    style={{ width: `${Math.min(100, (parseFloat(holderStatus.balance) / 1000) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[#c1c6d6] mb-6">
                  Get 1,000 $NEXUSCLAW free via the X Challenge at{' '}
                  <a href="/start-agent" className="text-[#f5c542] hover:underline">nexusclaw.tech/start-agent</a>
                </p>
                <div className="flex gap-4">
                  <a
                    href="/start-agent"
                    className="inline-flex items-center gap-2 border border-[#f5c542] text-[#f5c542] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#f5c542] hover:text-[#0c0c0c] transition-all"
                  >
                    COMPLETE X CHALLENGE →
                  </a>
                  <button
                    onClick={() => { setHolderStatus(null); setHolderWallet('') }}
                    className="text-[10px] text-[#414754] hover:text-[#8b919f] transition-colors underline"
                  >
                    Try different wallet
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-t border-[#1e1e1e] bg-[#0a0a0a] px-6 md:px-16 py-24">
          <div className="max-w-[1200px] mx-auto max-w-2xl">
            <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// FAQ</div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-12">
              Common questions.
            </h2>

            <div className="space-y-[1px] bg-[#1e1e1e]">
              {FAQ.map((item, i) => (
                <div key={i} className="bg-[#0a0a0a]">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex justify-between items-center p-6 text-left hover:bg-[#0f0f0f] transition-colors"
                  >
                    <span className="text-sm font-bold text-[#e5e2e1] pr-8">{item.q}</span>
                    <span className="text-[#f5c542] flex-shrink-0 text-lg">{openFaq === i ? '−' : '+'}</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-6">
                      <p className="text-sm text-[#c1c6d6] leading-relaxed border-l-2 border-[#f5c542]/30 pl-4">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BUY SECTION ── */}
        <section className="px-6 md:px-16 py-24 max-w-[1200px] mx-auto">
          <div className="max-w-2xl">
            <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// GET STARTED TODAY</div>

            <div className="border border-[#2a2a2a] bg-[#0a0a0a] p-10 mb-8">
              {isHolder ? (
                <>
                  <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-600/40 text-green-400 text-[10px] uppercase tracking-widest px-3 py-1 mb-6">
                    ✓ NEXUSCLAW HOLDER VERIFIED
                  </div>
                  <div className="flex items-baseline gap-4 mb-2">
                    <span className="text-5xl font-black text-[#f5c542]">$39.90</span>
                    <span className="text-[#414754] line-through text-xl">$49.90</span>
                    <span className="text-[10px] text-[#f5c542] uppercase tracking-widest border border-[#f5c542]/40 px-2 py-1">HOLDER PRICE</span>
                  </div>
                  <p className="text-[10px] text-[#8b919f] mb-2">Use code <span className="text-[#f5c542] font-bold">HOLDER20</span> at checkout · saves $10.00</p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-4 mb-2">
                    <span className="text-5xl font-black text-[#f5c542]">$49.90</span>
                    <span className="text-[10px] text-[#8b919f] uppercase tracking-widest border border-[#414754]/40 px-2 py-1">ONE-TIME PAYMENT</span>
                  </div>
                  <p className="text-[10px] text-[#8b919f] mb-2">No subscription · no monthly fees · yours forever</p>
                </>
              )}

              <div className="h-[1px] bg-[#1e1e1e] my-8" />

              {isHolder ? (
                <a
                  href={STRIPE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-between gap-4 bg-green-400 text-black px-10 py-6 text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all mb-3"
                >
                  <span>BUY SIGNAL AGENT — $39.90 (HOLDER PRICE) →</span>
                  <span className="flex items-center gap-2 font-normal text-xs">
                    <span className="material-symbols-outlined text-base">lock</span>
                    SECURE CHECKOUT VIA STRIPE
                  </span>
                </a>
              ) : (
                <a
                  href={STRIPE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-between gap-4 bg-[#f5c542] text-[#0c0c0c] px-10 py-6 text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all mb-3"
                >
                  <span>BUY SIGNAL AGENT — $49.90 →</span>
                  <span className="flex items-center gap-2 font-normal text-xs">
                    <span className="material-symbols-outlined text-base">lock</span>
                    SECURE CHECKOUT VIA STRIPE
                  </span>
                </a>
              )}

              <p className="text-[10px] text-[#414754] text-center">
                Download link delivered instantly by email after payment ·{' '}
                <a href="/refund" className="hover:text-[#f5c542] transition-colors">See our Refund Policy</a>
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER NOTE ── */}
      <footer className="border-t border-[#1e1e1e] bg-[#070707] px-6 md:px-16 py-10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="text-[10px] text-[#414754] leading-relaxed max-w-lg">
            Signal Agent v3.1 · NexusClaw Protocol · nexusclaw.tech<br />
            Support: <a href="mailto:contato@nexusclaw.tech" className="hover:text-[#f5c542] transition-colors">contato@nexusclaw.tech</a><br />
            <span className="text-[#2a2a2a]">⚠</span>{' '}
            This software does not guarantee profits. Trading involves risk. Use at your own discretion.
          </div>
          <div className="flex gap-8 text-[10px] uppercase tracking-widest">
            <a href="/terms"  className="text-[#414754] hover:text-[#f5c542] transition-colors">Terms</a>
            <a href="/privacy" className="text-[#414754] hover:text-[#f5c542] transition-colors">Privacy</a>
            <a href="/refund"  className="text-[#414754] hover:text-[#f5c542] transition-colors">Refund</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
