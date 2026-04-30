import Link from 'next/link'
import { TopNav } from '@/components/layout/TopNav'

const TELEGRAM_URL = 'https://t.me/nexusclawofficial'

const SELF_HOSTED_FEATURES = [
  'AutoCompounder Agent v1',
  'Open source code',
  'Base Mainnet ready',
  'Public leaderboard',
  'Community support',
]

const MANAGED_FEATURES = [
  'Everything in Self-hosted',
  'We deploy and configure',
  '24/7 monitoring',
  'Daily reports via Telegram',
  'Auto-restart if agent stops',
  'Performance alerts',
  'Priority support',
]

const LAUNCH_FEATURES = [
  'Everything in Managed',
  'Custom agent configuration',
  'Token integration',
  'Public agent profile page',
  'Custom dashboard',
  'Dedicated setup call',
]

const FAQS = [
  {
    q: 'Do I need $NEXUSCLAW to start?',
    a: 'Yes. You need $NEXUSCLAW tokens to stake. Get them via our X Challenge at /start-agent — free for early participants.',
  },
  {
    q: 'What is the Managed Agent?',
    a: 'We deploy, configure and monitor your AutoCompounder agent. You keep full custody of your wallet and tokens. We just run the infrastructure.',
  },
  {
    q: 'Is the smart contract audited?',
    a: 'The contract is verified on Basescan. No external audit yet — planned for Phase 5. See /security for full details.',
  },
  {
    q: 'Can I cancel the Managed plan?',
    a: 'Yes, anytime. No lock-in. You can always switch to self-hosted.',
  },
  {
    q: 'What happens if the agent stops?',
    a: 'On Managed plan, we auto-restart within minutes and notify you via Telegram.',
  },
]

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="font-['JetBrains_Mono'] text-[#00eefc] text-xs mt-0.5 shrink-0">✓</span>
      <span className="font-['JetBrains_Mono'] text-xs text-[#c1c6d6]">{text}</span>
    </div>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav active="/pricing" />

      <main className="pt-24 pb-24 px-4 md:px-8 max-w-[1440px] mx-auto">

        {/* ── HERO ── */}
        <section className="mt-12 mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#353534] rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab] animate-pulse" />
            <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#ffb4ab]">Beta — prices may change</span>
          </div>
          <h1 className="font-['Space_Grotesk'] text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none mb-4">
            Simple Pricing
          </h1>
          <p className="font-['JetBrains_Mono'] text-sm text-[#8b919f] uppercase tracking-[0.2em]">
            Start free. Scale when ready.
          </p>
        </section>

        {/* ── PRICING CARDS ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 items-stretch">

          {/* Card 1 — Self-hosted */}
          <div className="flex flex-col bg-[#0e0e0e] border border-[#00eefc]/20 rounded-lg p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] px-2 py-0.5 border border-[#414754]/40 rounded">Open Source</span>
              </div>
              <h2 className="font-['Space_Grotesk'] text-xl font-black uppercase tracking-tight mb-1">Self-Hosted</h2>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="font-['Space_Grotesk'] text-4xl font-black text-[#e5e2e1]">FREE</span>
              </div>
              <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase tracking-widest">Run the agent yourself. Full control.</p>
            </div>

            <div className="space-y-3 flex-1 mb-8">
              {SELF_HOSTED_FEATURES.map((f) => <Feature key={f} text={f} />)}
            </div>

            <Link
              href="/start-agent"
              className="block text-center py-3 border border-[#414754]/40 rounded font-['Space_Grotesk'] font-bold uppercase tracking-widest text-sm text-[#c1c6d6] hover:border-[#00eefc]/40 hover:text-[#e5e2e1] transition-all"
            >
              Download Agent
            </Link>
          </div>

          {/* Card 2 — Managed (highlighted) */}
          <div className="flex flex-col bg-[#0a1a1a] border border-[#00eefc]/60 rounded-lg p-8 relative shadow-[0_0_40px_rgba(0,238,252,0.08)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#050505] bg-[#00eefc] px-3 py-1 rounded-full font-bold">Most Popular</span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4 mt-2">
                <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#00eefc] px-2 py-0.5 border border-[#00eefc]/30 rounded">Beta</span>
              </div>
              <h2 className="font-['Space_Grotesk'] text-xl font-black uppercase tracking-tight mb-1">Managed Agent</h2>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="font-['Space_Grotesk'] text-4xl font-black text-[#00eefc]">$29</span>
                <span className="font-['JetBrains_Mono'] text-sm text-[#8b919f]">/mo</span>
              </div>
              <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase tracking-widest">We run and monitor your agent 24/7.</p>
            </div>

            <div className="space-y-3 flex-1 mb-8">
              {MANAGED_FEATURES.map((f) => <Feature key={f} text={f} />)}
            </div>

            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3 bg-gradient-to-r from-[#00eefc] to-[#448fff] text-[#050505] rounded font-['Space_Grotesk'] font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Apply for Beta
            </a>
          </div>

          {/* Card 3 — Agent Launch */}
          <div className="flex flex-col bg-[#0e0e0e] border border-[#00eefc]/20 rounded-lg p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#8b919f] px-2 py-0.5 border border-[#414754]/40 rounded">Setup Fee</span>
              </div>
              <h2 className="font-['Space_Grotesk'] text-xl font-black uppercase tracking-tight mb-1">Agent Launch</h2>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="font-['Space_Grotesk'] text-4xl font-black text-[#e5e2e1]">$199</span>
                <span className="font-['JetBrains_Mono'] text-sm text-[#8b919f]">one-time</span>
              </div>
              <p className="font-['JetBrains_Mono'] text-[10px] text-[#8b919f] uppercase tracking-widest">Launch your own agent economy.</p>
            </div>

            <div className="space-y-3 flex-1 mb-8">
              {LAUNCH_FEATURES.map((f) => <Feature key={f} text={f} />)}
            </div>

            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3 border border-[#414754]/40 rounded font-['Space_Grotesk'] font-bold uppercase tracking-widest text-sm text-[#c1c6d6] hover:border-[#00eefc]/40 hover:text-[#e5e2e1] transition-all"
            >
              Contact Us
            </a>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-20 max-w-3xl mx-auto">
          <div className="border-l-4 border-[#abc7ff] pl-6 py-2 mb-10">
            <h2 className="font-['Space_Grotesk'] font-black text-2xl uppercase tracking-tight">Common Questions</h2>
          </div>

          <div className="space-y-0">
            {FAQS.map((faq, i) => (
              <div key={i} className="py-6 border-b border-[#1e1e1e]">
                <h3 className="font-['Space_Grotesk'] font-bold text-sm uppercase tracking-wide text-[#e5e2e1] mb-3">
                  {faq.q}
                </h3>
                <p className="font-['JetBrains_Mono'] text-xs text-[#8b919f] leading-relaxed">
                  {faq.a.includes('/start-agent') ? (
                    <>
                      {faq.a.split('/start-agent')[0]}
                      <Link href="/start-agent" className="text-[#abc7ff] hover:text-[#e5e2e1] transition-colors">/start-agent</Link>
                      {faq.a.split('/start-agent')[1]}
                    </>
                  ) : faq.a.includes('/security') ? (
                    <>
                      {faq.a.split('/security')[0]}
                      <Link href="/security" className="text-[#abc7ff] hover:text-[#e5e2e1] transition-colors">/security</Link>
                      {faq.a.split('/security')[1]}
                    </>
                  ) : faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="bg-[#0e0e0e] border border-[#414754]/20 rounded-lg p-12 text-center">
          <h2 className="font-['Space_Grotesk'] text-2xl font-black uppercase tracking-tight mb-3">
            Not sure where to start?
          </h2>
          <p className="font-['JetBrains_Mono'] text-xs text-[#8b919f] uppercase tracking-widest mb-8">
            We respond within 24h
          </p>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-10 py-4 bg-gradient-to-r from-[#abc7ff] to-[#448fff] text-[#00285a] font-['Space_Grotesk'] font-black uppercase tracking-widest text-sm rounded hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Talk to us on Telegram
          </a>
        </section>

      </main>
    </div>
  )
}
