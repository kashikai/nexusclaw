import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'

export const metadata = {
  title: 'Privacy Policy — NexusClaw',
}

const LAST_UPDATED = 'May 14, 2026'

export default function PrivacyPage() {
  return (
    <PageShell variant="public">
      <main className="pb-24 px-4 md:px-8 max-w-3xl mx-auto">

        <section className="mt-12 mb-12">
          <div className="font-mono text-[10px] text-cyan-400 tracking-[0.4em] uppercase mb-4">
            // LEGAL — PRIVACY POLICY
          </div>
          <h1 className="font-mono text-4xl font-black uppercase tracking-tighter mb-3 text-white">
            Privacy Policy
          </h1>
          <p className="font-mono text-xs text-gray-400">Last updated: {LAST_UPDATED}</p>
        </section>

        <div className="space-y-10 font-mono text-sm text-gray-400 leading-relaxed">

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">1. Overview</h2>
            <p>NexusClaw ("we", "the Protocol") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights under the Act on the Protection of Personal Information (個人情報保護法, APPI) of Japan.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">2. Data We Collect</h2>
            <div className="space-y-4">
              <div className="border border-[#1f2937] p-4">
                <p className="text-cyan-400 uppercase text-[10px] tracking-widest mb-2">Blockchain Data (Public)</p>
                <p>Wallet addresses and on-chain transactions are public by nature. We do not control or store this data — it lives on the Base blockchain.</p>
              </div>
              <div className="border border-[#1f2937] p-4">
                <p className="text-cyan-400 uppercase text-[10px] tracking-widest mb-2">X Challenge Submissions</p>
                <p>When you submit the X Challenge, we collect your X post URL and Base wallet address. This is transmitted via Telegram for manual verification and is not stored in a database.</p>
              </div>
              <div className="border border-[#1f2937] p-4">
                <p className="text-cyan-400 uppercase text-[10px] tracking-widest mb-2">Payment Data</p>
                <p>Payments for NexusClaw Trader are processed by Stripe. We do not store credit card numbers or payment details. Stripe&apos;s privacy policy applies to payment processing.</p>
              </div>
              <div className="border border-[#1f2937] p-4">
                <p className="text-cyan-400 uppercase text-[10px] tracking-widest mb-2">Usage Data</p>
                <p>We may collect anonymized usage data (page views, errors) through standard web analytics. No personally identifiable information is linked to this data.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">3. How We Use Your Data</h2>
            <ul className="space-y-2 list-none">
              {[
                'To verify X Challenge submissions and distribute $NEXUSCLAW tokens',
                'To process payments and deliver purchased software',
                'To respond to support inquiries',
                'To improve the Service',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-cyan-400 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">4. Data Sharing</h2>
            <p className="mb-3">We do not sell your personal data. We may share data with:</p>
            <ul className="space-y-2 list-none">
              {[
                'Stripe — for payment processing',
                'Telegram — for internal operational notifications only',
                'Legal authorities — if required by Japanese law',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-cyan-400 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">5. Data Retention</h2>
            <p>X Challenge submissions are retained only as long as needed for verification. Payment records are retained as required by Japanese accounting law (generally 7 years).</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">6. Your Rights (APPI)</h2>
            <p className="mb-3">Under Japan&apos;s APPI, you have the right to:</p>
            <ul className="space-y-2 list-none">
              {[
                'Request disclosure of your personal data we hold',
                'Request correction of inaccurate data',
                'Request deletion of your data',
                'Object to the use of your data',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-cyan-400 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">To exercise these rights, contact: <a href="mailto:tiago.tekytrade@gmail.com" className="text-cyan-400 hover:underline">tiago.tekytrade@gmail.com</a></p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">7. Cookies</h2>
            <p>We use only essential cookies required for the application to function. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">8. Security</h2>
            <p>We implement reasonable technical measures to protect your data. However, no system is 100% secure. Use the Service at your own risk.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">9. Governing Law</h2>
            <p>This policy is governed by the laws of Japan, including the Act on the Protection of Personal Information (APPI).</p>
          </section>

          <section>
            <h2 className="font-mono font-bold uppercase text-white mb-3 tracking-tight">10. Contact</h2>
            <p>Privacy inquiries: <a href="mailto:tiago.tekytrade@gmail.com" className="text-cyan-400 hover:underline">tiago.tekytrade@gmail.com</a></p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-[#1f2937] flex gap-6 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          <Link href="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link>
          <Link href="/refund" className="hover:text-cyan-400 transition-colors">Refund Policy</Link>
        </div>

      </main>
    </PageShell>
  )
}
