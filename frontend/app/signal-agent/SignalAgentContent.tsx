'use client'

import { useState, useEffect } from 'react'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { TopNav } from '@/components/layout/TopNav'

// ── Constants ────────────────────────────────────────────────────────────────

const STAKING_ADDRESS = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe' as const
const TOKEN_ADDRESS   = '0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6' as const
const STRIPE_LINK     = 'https://buy.stripe.com/00w9AM2y10wub4VfpC77O02'
const SUPA_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const SUPA_KEY        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// ── Holder check ─────────────────────────────────────────────────────────────

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

const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') })
const MIN_HOLDER_BALANCE = 1000n * 10n ** 18n

async function checkHolderStatus(wallet: string) {
  const addr = wallet as `0x${string}`
  const [balance, userInfo] = await Promise.all([
    publicClient.readContract({ address: TOKEN_ADDRESS, abi: tokenAbi, functionName: 'balanceOf', args: [addr] }),
    publicClient.readContract({ address: STAKING_ADDRESS, abi: stakingUserAbi, functionName: 'getUserInfo', args: [addr] }).catch(() => [0n, 0n, 0n, 0n] as const),
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

// ── Supabase live data ────────────────────────────────────────────────────────

interface LiveTrade {
  ticket: number
  direction: 'BUY' | 'SELL'
  result: 'TP' | 'SL' | 'MANUAL'
  profit_pts: number
  profit_jpy: number
  was_reversal: boolean
  entry_time: string
  duration_min: number
}

interface StatTrade {
  result: 'TP' | 'SL' | 'MANUAL'
  profit_pts: number
  profit_jpy: number
}

interface LiveParams {
  reasoning: string
  win_rate: number
  sample_size: number
  created_at: string
}

function useLiveData() {
  const [trades, setTrades]             = useState<LiveTrade[]>([])
  const [allTrades, setAllTrades]       = useState<StatTrade[]>([])
  const [latestParams, setLatestParams] = useState<LiveParams | null>(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
        const [tr10, trAll, pr] = await Promise.all([
          fetch(`${SUPA_URL}/rest/v1/fimathe_trades?order=created_at.desc&limit=10`, { headers }),
          fetch(`${SUPA_URL}/rest/v1/fimathe_trades?order=created_at.desc&select=result,profit_jpy,profit_pts`, { headers }),
          fetch(`${SUPA_URL}/rest/v1/fimathe_params?order=created_at.desc&limit=1`, { headers }),
        ])
        if (alive) {
          setTrades(tr10.ok ? await tr10.json() : [])
          setAllTrades(trAll.ok ? await trAll.json() : [])
          const p = pr.ok ? await pr.json() : []
          setLatestParams(p[0] ?? null)
          setLoading(false)
        }
      } catch { /* silent */ }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return { trades, allTrades, latestParams, loading }
}

// ── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '🤖', title: 'FULLY AUTONOMOUS', desc: 'No signals needed. The bot detects its own entry zones, manages the trade, and resets — 24/7 without human input.' },
  { icon: '🧠', title: 'AI SELF-OPTIMIZATION', desc: 'Claude AI analyzes every closed trade and auto-adjusts parameters. The bot learns and improves with each operation.' },
  { icon: '📊', title: 'PUBLIC LIVE RESULTS', desc: 'Every trade logged in real time. Win rate, P&L and AI decisions are public — no cherry-picking, no backtest theater.' },
  { icon: '🎯', title: 'CHANNEL BREAKOUT LOGIC', desc: 'Waits for a confirmed 2-phase breakout before entering. Built-in Kit de Bengala filter avoids abnormal candles.' },
  { icon: '🛡️', title: 'HARD RISK CONTROLS', desc: 'SL always outside the channel. Fixed or percentage-based lot sizing. Max daily trades. Parameters capped at 20% change per AI cycle.' },
  { icon: '⚙️', title: 'RUNS ON YOUR MT5', desc: 'Runs locally or on VPS. Connects directly to MetaTrader 5. Your credentials never leave your machine.' },
]

const FAQ = [
  { q: 'What market does NexusClaw Trader trade?', a: 'XAUUSD (Gold) on the M1 timeframe. The channel strategy is tuned for Gold\'s intraday volatility patterns.' },
  { q: 'How does the AI optimization work?', a: 'After every 5 closed trades, Claude AI analyzes the results and suggests parameter adjustments. Each change is capped at 20% to avoid overfit. The core logic never changes.' },
  { q: 'Are the live results real?', a: 'Yes — every trade is logged automatically to a public database as it closes. You can see the raw data on this page in real time.' },
  { q: 'Do I need a Telegram signal provider?', a: 'No. NexusClaw Trader is fully autonomous — it reads the chart directly via MetaTrader 5 and decides entries on its own.' },
  { q: 'Do I need an Anthropic / Claude API key?', a: 'Yes — a free or paid Claude API key is required for the AI optimization feature. Without it, the bot still trades but won\'t self-optimize.' },
  { q: 'Does it work with any MT5 broker?', a: 'Yes — any broker that supports the MetaTrader 5 terminal on Windows.' },
  { q: 'What is the $NEXUSCLAW holder discount?', a: 'Hold 1,000 $NEXUSCLAW tokens and get 20% off permanently. Use coupon HOLDER20 at checkout.' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

type HolderStatus = { balance: string; staked: string; isHolder: boolean; isStaker: boolean } | null

function LiveResultsSection() {
  const { trades, allTrades, latestParams, loading } = useLiveData()

  const wins     = allTrades.filter(t => t.result === 'TP').length
  const winRate  = allTrades.length > 0 ? Math.round(wins / allTrades.length * 100) : 0
  const totalPnl = allTrades.reduce((s, t) => s + (t.profit_jpy ?? 0), 0)
  const avgPts   = allTrades.length > 0 ? Math.round(allTrades.reduce((s, t) => s + (t.profit_pts ?? 0), 0) / allTrades.length) : 0

  return (
    <section className="border-y border-[#1e1e1e] bg-[#0a0a0a] px-6 md:px-16 py-24">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase">// LIVE RESULTS</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 uppercase tracking-widest">Real account · Auto-refreshes every 30s</span>
          </div>
        </div>
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-12">
          No backtest theater.<br /><span className="text-[#f5c542]">Real trades. Live data.</span>
        </h2>

        {loading ? (
          <div className="text-[10px] text-[#414754] font-['JetBrains_Mono'] animate-pulse">Loading live data…</div>
        ) : allTrades.length === 0 ? (
          <div className="text-[10px] text-[#414754] font-['JetBrains_Mono']">Bot is running — first trades will appear here automatically.</div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[#1e1e1e] mb-8">
              {[
                { label: 'Total Trades',  value: allTrades.length.toString(),                                         color: '#e5e2e1' },
                { label: 'Win Rate',      value: `${winRate}%`,                                                   color: winRate >= 50 ? '#4ddbc9' : '#ffb4ab' },
                { label: 'Total P&L',     value: `¥${totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString('en-US')}`, color: totalPnl >= 0 ? '#4ddbc9' : '#ffb4ab' },
                { label: 'Avg Points',    value: `${avgPts >= 0 ? '+' : ''}${avgPts}pts`,                        color: avgPts >= 0 ? '#4ddbc9' : '#ffb4ab' },
              ].map(s => (
                <div key={s.label} className="bg-[#0c0c0c] p-8">
                  <div className="text-[9px] text-[#414754] uppercase tracking-widest font-['JetBrains_Mono'] mb-2">{s.label}</div>
                  <div className="text-3xl font-black font-['Space_Grotesk']" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Trade table */}
            <div className="bg-[#0c0c0c] border border-[#1e1e1e]">
              <div className="grid grid-cols-5 gap-2 px-6 py-3 border-b border-[#1e1e1e]">
                {['Date (JST)', 'Side', 'Result', 'Points', 'P&L (JPY)'].map(h => (
                  <span key={h} className="text-[8px] uppercase tracking-widest text-[#414754] font-['JetBrains_Mono']">{h}</span>
                ))}
              </div>
              {trades.slice(0, 10).map((t, i) => {
                const isWin = t.result === 'TP'
                const dt    = new Date(t.entry_time)
                return (
                  <div key={t.ticket ?? i} className="grid grid-cols-5 gap-2 px-6 py-3 border-b border-[#111] font-['JetBrains_Mono'] text-[10px]">
                    <span className="text-[#8b919f]">
                      {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Tokyo' })}
                      {' '}<span className="text-[#414754]">{dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' })}</span>
                    </span>
                    <span className={t.direction === 'BUY' ? 'text-[#4ddbc9]' : 'text-[#ffb4ab]'}>
                      {t.direction}{t.was_reversal ? ' ↺' : ''}
                    </span>
                    <span className={isWin ? 'text-[#4ddbc9]' : 'text-[#ffb4ab]'}>{t.result}</span>
                    <span className={isWin ? 'text-[#4ddbc9]' : 'text-[#ffb4ab]'}>{t.profit_pts >= 0 ? '+' : ''}{t.profit_pts}pts</span>
                    <span className={isWin ? 'text-[#4ddbc9]' : 'text-[#ffb4ab]'}>¥{t.profit_jpy >= 0 ? '+' : ''}{Math.round(t.profit_jpy).toLocaleString('en-US')}</span>
                  </div>
                )
              })}
            </div>

            {/* AI reasoning */}
            {latestParams && (
              <div className="mt-6 border-l-2 border-[#f5c542]/30 pl-6 py-2">
                <div className="text-[8px] text-[#414754] uppercase tracking-widest font-['JetBrains_Mono'] mb-1">
                  Last AI adjustment · {latestParams.win_rate?.toFixed(1)}% win rate · {latestParams.sample_size} trades analyzed
                </div>
                <div className="text-xs text-[#c1c6d6] font-['JetBrains_Mono'] italic">{latestParams.reasoning}</div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

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
      setHolderStatus(await checkHolderStatus(holderWallet))
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
      <TopNav active="/trader" />

      <main className="pt-24">

        {/* ── HERO ── */}
        <section className="relative px-6 md:px-16 py-20 md:py-32 max-w-[1200px] mx-auto">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(245,197,66,0.06)_0%,transparent_70%)]" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-green-500/40 bg-green-900/20 px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-[10px] uppercase tracking-[0.3em]">NEXUSCLAW TRADER — LIVE ON REAL ACCOUNT</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-[1.0] mb-6">
              NEXUSCLAW TRADER<br />
              <span className="text-[#f5c542]">TRADES ITSELF.</span>{' '}
              <span className="text-[#414754]">LEARNS ITSELF.</span>
            </h1>

            <p className="text-xl md:text-2xl font-black uppercase tracking-wide text-[#e5e2e1] mb-4">
              No signals. No emotions. Just math.
            </p>

            <p className="text-base md:text-lg text-[#c1c6d6] max-w-2xl leading-relaxed mb-10 font-light">
              NexusClaw Trader detects its own entries on XAUUSD, executes on MetaTrader 5, and self-optimizes parameters via Claude AI after every 5 trades — fully autonomous, 24/7.
            </p>

            <div className="space-y-3 mb-12">
              {[
                'Fully autonomous — no Telegram, no signal provider needed',
                'AI-powered self-optimization after every 5 trades',
                'Live results published publicly — real account, real data',
              ].map((point) => (
                <div key={point} className="flex items-center gap-3 text-sm text-[#c1c6d6]">
                  <span className="text-[#f5c542] font-bold">✓</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <a
                href={STRIPE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#f5c542] text-[#0c0c0c] px-10 py-5 text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all"
              >
                BUY NEXUSCLAW TRADER — $49.90 →
              </a>
            </div>
            <p className="text-[10px] text-[#8b919f] mt-3">$NEXUSCLAW holders pay $39.90 — check below</p>
          </div>
        </section>

        {/* ── LIVE RESULTS ── */}
        <LiveResultsSection />

        {/* ── HOW IT WORKS ── */}
        <section className="px-6 md:px-16 py-24 max-w-[1200px] mx-auto">
          <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// HOW IT WORKS</div>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-16">
            Three phases.<br /><span className="text-[#f5c542]">Zero manual work.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#1e1e1e]">
            {[
              { num: '01', title: 'DETECT', body: 'Bot forms a price channel using the last 4 candles. Waits for a clean 2-phase breakout. Kit de Bengala filter removes abnormal candles automatically.' },
              { num: '02', title: 'EXECUTE', body: 'On breakout confirmation, places the trade on MT5 with calculated SL and TP. Monitors the position until it closes.' },
              { num: '03', title: 'OPTIMIZE', body: 'Every 5 trades, Claude AI reviews the results and adjusts parameters. Max 20% change per cycle. Core logic never changes.' },
            ].map((step) => (
              <div key={step.num} className="bg-[#0c0c0c] p-10 hover:bg-[#111] transition-colors">
                <div className="text-5xl font-black text-[#f5c542]/20 mb-6">{step.num}</div>
                <div className="text-xs font-black uppercase tracking-widest text-[#f5c542] mb-3">{step.title}</div>
                <p className="text-sm text-[#c1c6d6] leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="border-y border-[#1e1e1e] bg-[#0a0a0a] px-6 md:px-16 py-24">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// FEATURES</div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-16">
              Built for consistency.<br /><span className="text-[#f5c542]">Not for hype.</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[#1e1e1e]">
              {FEATURES.map((f) => (
                <div key={f.title} className="bg-[#0a0a0a] p-8 hover:bg-[#0f0f0f] transition-colors">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <div className="text-xs font-black uppercase tracking-widest text-[#f5c542] mb-3">{f.title}</div>
                  <p className="text-sm text-[#c1c6d6] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT'S INCLUDED ── */}
        <section className="px-6 md:px-16 py-24 max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div>
              <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// WHAT&apos;S IN THE PACKAGE</div>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-10">
                Everything you need.<br /><span className="text-[#f5c542]">Nothing you don&apos;t.</span>
              </h2>
              <ul className="space-y-5">
                {[
                  { file: 'nexusclaw_trader.py',  desc: 'main autonomous trading bot' },
                  { file: 'strategy_agent.py',    desc: 'Claude AI parameter optimizer' },
                  { file: 'trade_logger.py',      desc: 'Supabase trade logging module' },
                  { file: '.env.template',         desc: 'pre-filled configuration file' },
                  { file: 'requirements.txt',      desc: 'Python dependencies' },
                  { file: 'setup_guide.pdf',       desc: 'step-by-step setup guide — EN + PT' },
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

            <div>
              <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// REQUIREMENTS</div>
              <div className="border border-[#f5c542]/20 bg-[#f5c542]/3 p-8">
                <ul className="space-y-4">
                  {[
                    'Windows VPS or local PC (MetaTrader5 Python package is Windows-only)',
                    'MetaTrader 5 terminal logged into a broker account (XAUUSD required)',
                    'Python 3.11+',
                    'Claude API key (Anthropic) — for AI self-optimization',
                    'Supabase account — free tier is enough for live result logging',
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
        <section className="border-y border-[#1e1e1e] bg-[#0a0a0a] px-6 md:px-16 py-24">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// NEXUSCLAW HOLDER DISCOUNT</div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">
              Hold tokens.<br /><span className="text-[#f5c542]">Pay less. Forever.</span>
            </h2>
            <p className="text-sm text-[#c1c6d6] max-w-xl mb-12 leading-relaxed">
              Hold 1,000 $NEXUSCLAW and get 20% off permanently. Verification is on-chain. No signup required.
            </p>

            <div className="max-w-2xl border border-[#414754]/40 bg-[#0c0c0c] p-8">
              {!holderStatus && (
                <div className="flex gap-8 items-center mb-8">
                  <div>
                    <div className="text-[10px] text-[#8b919f] uppercase tracking-widest mb-1">Regular</div>
                    <div className="text-3xl font-black text-[#e5e2e1]">$49.90</div>
                  </div>
                  <div className="text-[#414754] text-lg">vs</div>
                  <div>
                    <div className="text-[10px] text-[#f5c542] uppercase tracking-widest mb-1">Holder price</div>
                    <div className="text-3xl font-black text-[#f5c542]">$39.90</div>
                  </div>
                </div>
              )}

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
                    {holderChecking ? 'Checking...' : 'CHECK BALANCE'}
                  </button>
                </div>
              )}
              {holderError && <p className="text-xs text-[#ffb4ab] mt-3">{holderError}</p>}

              {holderStatus?.isHolder && (
                <div>
                  <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-600/40 text-green-400 text-[10px] uppercase tracking-widest px-3 py-1 mb-6">
                    ✓ NEXUSCLAW HOLDER VERIFIED
                  </div>
                  <p className="text-xs text-[#c1c6d6] mb-4">
                    Balance: <span className="text-[#e5e2e1]">{parseFloat(holderStatus.balance).toLocaleString('en-US', { maximumFractionDigits: 0 })} $NEXUSCLAW</span>
                    {holderStatus.isStaker && <span className="text-green-400 ml-2">+ staking active</span>}
                  </p>
                  <p className="text-[10px] text-green-500 mb-3">Apply at checkout:</p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 bg-black border border-green-600/40 px-6 py-4 text-2xl font-black text-green-400 tracking-[0.3em]">HOLDER20</div>
                    <button
                      onClick={copyCode}
                      className="px-4 py-4 border border-green-600/40 text-green-400 text-[10px] uppercase tracking-widest hover:bg-green-900/30 transition-all"
                    >
                      {copiedCode ? 'COPIED ✓' : 'COPY'}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#8b919f] mb-6">Saves $10 · Final price $39.90 · Enter at Stripe checkout</p>
                  <button onClick={() => { setHolderStatus(null); setHolderWallet('') }} className="text-[10px] text-[#414754] hover:text-[#8b919f] underline">
                    Check a different wallet
                  </button>
                </div>
              )}

              {holderStatus && !holderStatus.isHolder && (
                <div>
                  <div className="inline-flex items-center gap-2 bg-yellow-900/30 border border-yellow-600/40 text-yellow-400 text-[10px] uppercase tracking-widest px-3 py-1 mb-4">
                    ⚠ INSUFFICIENT BALANCE
                  </div>
                  <p className="text-xs text-[#c1c6d6] mb-2">
                    Your balance: <span className="text-[#e5e2e1]">{parseFloat(holderStatus.balance).toLocaleString('en-US', { maximumFractionDigits: 0 })} $NEXUSCLAW</span>
                    <span className="text-[#414754]"> / need 1,000</span>
                  </p>
                  <div className="w-full bg-[#1a1a1a] h-1 mb-6">
                    <div className="bg-[#f5c542] h-1 transition-all" style={{ width: `${Math.min(100, (parseFloat(holderStatus.balance) / 1000) * 100)}%` }} />
                  </div>
                  <div className="flex gap-4">
                    <a href="/start-agent" className="inline-flex items-center gap-2 border border-[#f5c542] text-[#f5c542] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#f5c542] hover:text-[#0c0c0c] transition-all">
                      COMPLETE X CHALLENGE →
                    </a>
                    <button onClick={() => { setHolderStatus(null); setHolderWallet('') }} className="text-[10px] text-[#414754] hover:text-[#8b919f] underline">
                      Try different wallet
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="px-6 md:px-16 py-24">
          <div className="max-w-[1200px] mx-auto max-w-2xl">
            <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// FAQ</div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-12">Common questions.</h2>
            <div className="space-y-[1px] bg-[#1e1e1e]">
              {FAQ.map((item, i) => (
                <div key={i} className="bg-[#0c0c0c]">
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

        {/* ── BUY ── */}
        <section className="border-t border-[#1e1e1e] bg-[#0a0a0a] px-6 md:px-16 py-24">
          <div className="max-w-[1200px] mx-auto max-w-2xl">
            <div className="text-[10px] text-[#f5c542] tracking-[0.4em] uppercase mb-4">// GET STARTED TODAY</div>
            <div className="border border-[#2a2a2a] bg-[#0c0c0c] p-10 mb-8">
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

              <a
                href={STRIPE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-full items-center justify-between gap-4 px-10 py-6 text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all mb-3 ${
                  isHolder ? 'bg-green-400 text-black' : 'bg-[#f5c542] text-[#0c0c0c]'
                }`}
              >
                <span>BUY NEXUSCLAW TRADER — {isHolder ? '$39.90 (HOLDER PRICE)' : '$49.90'} →</span>
                <span className="font-normal text-xs">SECURE · STRIPE</span>
              </a>

              <p className="text-[10px] text-[#414754] text-center">
                Download link delivered instantly by email ·{' '}
                <a href="/refund" className="hover:text-[#f5c542] transition-colors">See our Refund Policy</a>
              </p>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-[#1e1e1e] bg-[#070707] px-6 md:px-16 py-10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="text-[10px] text-[#414754] leading-relaxed max-w-lg">
            NexusClaw Trader · NexusClaw Protocol · nexusclaw.tech<br />
            Support: <a href="mailto:contato@nexusclaw.tech" className="hover:text-[#f5c542] transition-colors">contato@nexusclaw.tech</a><br />
            ⚠ This software does not guarantee profits. Trading involves risk. Use at your own discretion.
          </div>
          <div className="flex gap-8 text-[10px] uppercase tracking-widest">
            <a href="/terms"   className="text-[#414754] hover:text-[#f5c542] transition-colors">Terms</a>
            <a href="/privacy" className="text-[#414754] hover:text-[#f5c542] transition-colors">Privacy</a>
            <a href="/refund"  className="text-[#414754] hover:text-[#f5c542] transition-colors">Refund</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
