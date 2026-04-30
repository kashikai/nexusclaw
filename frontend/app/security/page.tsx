import Link from 'next/link'
import { TopNav } from '@/components/layout/TopNav'

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <TopNav active="/security" />
      <main className="pt-24 pb-16 px-8 max-w-[1440px] mx-auto">
        <div className="border-l-4 border-[#ffb4ab] pl-6 py-2 mb-12 mt-8">
          <h1 className="text-4xl md:text-5xl font-['Space_Grotesk'] font-black tracking-tighter uppercase leading-none mb-2">SECURITY</h1>
          <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#8b919f]">Audit Reports & Protocol Security Status</p>
        </div>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.3em] text-[#8b919f] mb-6">Status</span>
          <p className="font-['Space_Grotesk'] text-2xl font-bold text-[#e5e2e1] mb-2">Coming soon — building in public 🦞⚡</p>
          <p className="font-['JetBrains_Mono'] text-xs text-[#414754] mt-4 max-w-sm">Full audit history, multisig configuration, and real-time security status for the NexusClaw protocol.</p>
          <Link href="/" className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#abc7ff] hover:text-[#e5e2e1] transition-colors mt-12">← Back to Home</Link>
        </div>
      </main>
    </div>
  )
}
