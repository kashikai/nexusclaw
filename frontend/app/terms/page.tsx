import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'

export const metadata = {
  title: 'Terms of Service — NexusClaw',
}

const LAST_UPDATED = 'May 14, 2026'

export default function TermsPage() {
  return (
    <PageShell variant="public">
      <main className="pb-24 px-4 md:px-8 max-w-3xl mx-auto">

        <section className="mt-12 mb-12">
          <div className="font-mono text-[10px] text-cyan-400 tracking-[0.4em] uppercase mb-4">
            // LEGAL — TERMS OF SERVICE
          </div>
          <h1 className="font-mono text-4xl font-black uppercase tracking-tighter mb-3 text-white">
            Terms of Service
          </h1>
          <p className="font-mono text-xs text-gray-400">Last updated: {LAST_UPDATED}</p>
        </section>

        <div className="space-y-10 font-mono text-sm text-gray-400 leading-relaxed">

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">1. Agreement</h2>
            <p>By accessing or using NexusClaw ("the Protocol", "the Service") at nexusclaw.tech, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">2. Operator</h2>
            <p>The Service is operated by an individual based in Japan. For inquiries, contact us at <a href="mailto:tiago.tekytrade@gmail.com" className="text-cyan-400 hover:underline">tiago.tekytrade@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">3. Products & Digital Goods</h2>
            <p className="mb-3">NexusClaw offers the following:</p>
            <ul className="space-y-2 list-none">
              {[
                'Autonomous staking agent software (free, open source)',
                'NexusClaw Trader — a digital software product sold for USD $49.90 (one-time payment)',
                '$NEXUSCLAW token rewards distributed through protocol participation',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-cyan-400 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">4. Risk Disclosure</h2>
            <p className="mb-3">Cryptocurrency, token trading, and automated trading involve significant financial risk. By using this Service you acknowledge:</p>
            <ul className="space-y-2 list-none">
              {[
                'Token values can go to zero. Past performance is not indicative of future results.',
                'Automated trading bots (including NexusClaw Trader) do not guarantee profits.',
                'You are solely responsible for your trading decisions and any resulting losses.',
                'NexusClaw Trader trades autonomously on XAUUSD. Automated trading does not guarantee profits and can result in losses.',
                'Smart contracts may contain bugs. Funds interacting with unaudited contracts are at risk.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-red-400 shrink-0">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">5. No Financial Advice</h2>
            <p>Nothing on this platform constitutes financial, investment, legal, or tax advice. Consult a qualified professional before making any financial decisions.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">6. Prohibited Use</h2>
            <p className="mb-3">You may not use the Service to:</p>
            <ul className="space-y-2 list-none">
              {[
                'Violate any applicable laws or regulations',
                'Engage in market manipulation or fraudulent activity',
                'Reverse engineer or redistribute paid software without authorization',
                'Access the platform from jurisdictions where such activity is prohibited',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-cyan-400 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">7. Intellectual Property</h2>
            <p>The NexusClaw Trader software is licensed for personal use only. You may not resell, redistribute, or sublicense it without written permission.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">8. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranty of any kind. We do not guarantee uninterrupted access, error-free operation, or fitness for any particular purpose.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by Japanese law, the operator shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to trading losses.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">10. Governing Law</h2>
            <p>These Terms are governed by the laws of Japan. Any disputes shall be subject to the exclusive jurisdiction of the Tokyo District Court.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">11. Changes</h2>
            <p>We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">12. Contact</h2>
            <p>For questions about these Terms, contact: <a href="mailto:tiago.tekytrade@gmail.com" className="text-cyan-400 hover:underline">tiago.tekytrade@gmail.com</a></p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-[#1f2937] flex gap-6 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          <Link href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link>
          <Link href="/refund" className="hover:text-cyan-400 transition-colors">Refund Policy</Link>
        </div>

      </main>
    </PageShell>
  )
}
