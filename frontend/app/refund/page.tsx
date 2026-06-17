import Link from 'next/link'
import { TopNav } from '@/components/layout/TopNav'

export const metadata = {
  title: 'Refund Policy — NexusClaw',
}

const LAST_UPDATED = 'May 14, 2026'

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav />

      <main className="pt-24 pb-24 px-4 md:px-8 max-w-3xl mx-auto">

        <section className="mt-12 mb-12">
          <div className="font-['JetBrains_Mono'] text-[10px] text-[#4ddbc9] tracking-[0.4em] uppercase mb-4">
            // LEGAL — REFUND POLICY
          </div>
          <h1 className="font-['Space_Grotesk'] text-4xl font-black uppercase tracking-tighter mb-3">
            Refund Policy
          </h1>
          <p className="font-['JetBrains_Mono'] text-xs text-[#8b919f]">Last updated: {LAST_UPDATED}</p>
        </section>

        <div className="space-y-10 font-['JetBrains_Mono'] text-sm text-[#c1c6d6] leading-relaxed">

          <section>
            <h2 className="font-['Space_Grotesk'] font-bold uppercase text-[#e5e2e1] mb-3 tracking-tight">1. Digital Products</h2>
            <p>The Signal Agent is a digital software product delivered electronically. Due to the nature of digital goods, <span className="text-[#e5e2e1] font-bold">all sales are final</span> once the download link has been delivered.</p>
          </section>

          <section>
            <h2 className="font-['Space_Grotesk'] font-bold uppercase text-[#e5e2e1] mb-3 tracking-tight">2. Eligibility for Refund</h2>
            <p className="mb-4">We will issue a full refund in the following cases:</p>
            <ul className="space-y-3 list-none">
              {[
                { condition: 'Non-delivery', detail: 'You paid but did not receive the download link within 24 hours.' },
                { condition: 'Technical defect', detail: 'The software does not function as described and we are unable to resolve the issue within 7 business days.' },
                { condition: 'Duplicate charge', detail: 'You were charged more than once for the same purchase.' },
              ].map((item) => (
                <li key={item.condition} className="border border-[#414754]/30 p-4">
                  <p className="text-[#4ddbc9] text-[10px] uppercase tracking-widest mb-1">{item.condition}</p>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-['Space_Grotesk'] font-bold uppercase text-[#e5e2e1] mb-3 tracking-tight">3. Non-Refundable Cases</h2>
            <p className="mb-3">Refunds will not be issued for:</p>
            <ul className="space-y-2 list-none">
              {[
                'Change of mind after download',
                'Inability to configure the software due to user error',
                'Trading losses resulting from use of the Signal Agent',
                'Incompatibility with third-party services (MT5 broker, Anthropic API, Supabase)',
                'Purchases where the download link was accessed',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-[#ffb4ab] shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-['Space_Grotesk'] font-bold uppercase text-[#e5e2e1] mb-3 tracking-tight">4. How to Request a Refund</h2>
            <p className="mb-3">To request a refund, email us within <span className="text-[#e5e2e1]">7 days of purchase</span> with:</p>
            <ul className="space-y-2 list-none">
              {[
                'Your order/payment confirmation email',
                'Description of the issue',
                'Steps you have already taken to resolve it',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-[#4ddbc9] shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border border-[#4ddbc9]/30 p-4 bg-[#4ddbc9]/5">
              <p className="text-[#4ddbc9] text-[10px] uppercase tracking-widest mb-1">Refund Contact</p>
              <a href="mailto:tiago.tekytrade@gmail.com" className="text-[#00eefc] hover:underline">
                tiago.tekytrade@gmail.com
              </a>
            </div>
          </section>

          <section>
            <h2 className="font-['Space_Grotesk'] font-bold uppercase text-[#e5e2e1] mb-3 tracking-tight">5. Processing Time</h2>
            <p>Approved refunds are processed within <span className="text-[#e5e2e1]">5–10 business days</span> back to the original payment method via Stripe.</p>
          </section>

          <section>
            <h2 className="font-['Space_Grotesk'] font-bold uppercase text-[#e5e2e1] mb-3 tracking-tight">6. $NEXUSCLAW Tokens</h2>
            <p>Tokens distributed through the X Challenge are non-refundable as they are delivered on-chain and cannot be reversed.</p>
          </section>

          <section>
            <h2 className="font-['Space_Grotesk'] font-bold uppercase text-[#e5e2e1] mb-3 tracking-tight">7. Governing Law</h2>
            <p>This policy is governed by the laws of Japan. Consumer protection provisions under the Act on Specified Commercial Transactions (特定商取引法) apply where applicable.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-[#414754]/20 flex gap-6 font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8b919f]">
          <Link href="/terms" className="hover:text-[#00eefc] transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-[#00eefc] transition-colors">Privacy Policy</Link>
        </div>

      </main>
    </div>
  )
}
