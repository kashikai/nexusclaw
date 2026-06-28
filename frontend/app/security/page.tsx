import { PageShell } from '@/components/layout/PageShell'

const STAKING_ADDRESS = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe'
const MULTISIG_ADDRESS = '0x02320eCCB3B67e802C29f9e9F8703D5756535515'
const BASESCAN = 'https://basescan.org'
const GITHUB_URL = 'https://github.com/kashikai/nexusclaw'
const SECURITY_DOC_URL = 'https://github.com/kashikai/nexusclaw/blob/main/SECURITY_STATUS_CURRENT.md'
const TELEGRAM_URL = 'https://t.me/nexusclawofficial'

const FEATURES = [
  'ReentrancyGuard on all state-changing functions',
  'CEI pattern (Checks-Effects-Interactions)',
  'AccessControl with ADMIN_ROLE and FUNDER_ROLE',
  'Emergency withdraw always available',
  'recoverToken() protects against accidental sends',
  'MAX_STAKE_PER_USER = 10M (anti-whale)',
  'MAX_REWARD_POOL = 1B (overflow protection)',
  'launched flag prevents premature staking',
  '3/5 multisig controls all privileged operations',
]

const RISKS = [
  { risk: 'No external audit', severity: 'MEDIUM', color: '#f87171', mitigation: 'Multisig 3/5 controls all admin' },
  { risk: 'Reward pool is finite', severity: 'LOW', color: '#fbbf24', mitigation: 'rewardPoolRunway() monitored' },
  { risk: 'Token has 1% transfer fee', severity: 'LOW', color: '#fbbf24', mitigation: 'Agents account for burn' },
  { risk: 'No timelock on admin', severity: 'MEDIUM', color: '#f87171', mitigation: '3/5 threshold required' },
]

const FIXES = [
  { issue: 'Unstake reverts on empty pool', fix: 'Fixed v10.3' },
  { issue: 'rewardDebt not reset on emergencyWithdraw', fix: 'Fixed v10.3' },
  { issue: 'MAX_STAKE too restrictive', fix: 'Updated to 10M' },
  { issue: 'No staker counter', fix: 'Added totalStakers' },
  { issue: 'Missing launch control', fix: 'Added launched flag' },
  { issue: 'Pool overflow protection', fix: 'Added MAX_REWARD_POOL' },
  { issue: 'CEI pattern on unstake', fix: 'Enforced v10.3' },
  { issue: 'No token recovery', fix: 'Added recoverToken()' },
]

const ROADMAP = [
  'External audit by certified firm (Phase 5)',
  'Bug bounty program (community growth)',
  'Timelock implementation (Phase 5)',
]

function SectionTitle({ label }: { label: string }) {
  return (
    <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400 mb-6">{label}</h2>
  )
}

function AddressLink({ address, label }: { address: string; label?: string }) {
  return (
    <a
      href={`${BASESCAN}/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-cyan-400 hover:text-white transition-colors break-all"
    >
      {label ?? address}
    </a>
  )
}

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-3 border-b border-[#1f2937] gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400 shrink-0 sm:w-32">{label}</span>
      <span className="font-mono text-xs text-white sm:text-right">{value}</span>
    </div>
  )
}

function VerifyBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-5 py-3 bg-[#111111] border border-[#1f2937] hover:border-cyan-400/40 hover:bg-[#111111] transition-all font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-cyan-400"
    >
      {label}
      <span className="text-gray-600">↗</span>
    </a>
  )
}

export default function SecurityPage() {
  return (
    <PageShell variant="public">
      <main className="pb-24 px-4 md:px-8 max-w-[1440px] mx-auto">

        {/* HERO */}
        <section className="mt-12 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-400/10 border border-cyan-400/30 mb-8">
            <span className="w-1.5 h-1.5 bg-cyan-400" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-400">Verified on Basescan</span>
          </div>
          <div className="border-l-4 border-red-400 pl-6 py-2">
            <h1 className="font-mono text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-2 text-white">
              SECURITY
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400">
              We hide nothing. Every risk is documented.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* CONTRACT STATUS */}
          <section className="bg-[#0a0a0a] border border-[#1f2937] p-8">
            <SectionTitle label="// Active Contract" />
            <div className="space-y-0">
              <StatusRow label="Contract" value="NexusClawStaking v10.3" />
              <StatusRow label="Address" value={<AddressLink address={STAKING_ADDRESS} />} />
              <StatusRow label="Network" value="Base Mainnet (Chain 8453)" />
              <StatusRow
                label="Status"
                value={
                  <span className="flex items-center gap-2 justify-end">
                    <span className="w-1.5 h-1.5 bg-cyan-400" />
                    <span className="text-cyan-400">Verified ✅</span>
                  </span>
                }
              />
              <StatusRow label="Admin" value="Safe Multisig 3/5" />
              <StatusRow label="Multisig" value={<AddressLink address={MULTISIG_ADDRESS} />} />
            </div>
          </section>

          {/* SECURITY FEATURES */}
          <section className="bg-[#0a0a0a] border border-[#1f2937] p-8">
            <SectionTitle label="// What Is Protected" />
            <div className="space-y-3">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <span className="text-cyan-400 text-sm shrink-0 mt-0.5">✅</span>
                  <span className="font-mono text-xs text-gray-400 leading-relaxed">{f}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* KNOWN RISKS */}
        <section className="bg-[#0a0a0a] border border-red-400/20 p-8 mb-6">
          <SectionTitle label="// Known Risks — We Are Honest" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f2937]">
                  <th className="text-left font-mono text-[9px] uppercase tracking-widest text-gray-400 pb-3 pr-6">Risk</th>
                  <th className="text-left font-mono text-[9px] uppercase tracking-widest text-gray-400 pb-3 pr-6">Severity</th>
                  <th className="text-left font-mono text-[9px] uppercase tracking-widest text-gray-400 pb-3">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {RISKS.map((r) => (
                  <tr key={r.risk} className="border-b border-[#1f2937]">
                    <td className="font-mono text-xs text-white py-4 pr-6 align-top">{r.risk}</td>
                    <td className="py-4 pr-6 align-top">
                      <span
                        className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5"
                        style={{ color: r.color, border: `1px solid ${r.color}30`, background: `${r.color}10` }}
                      >
                        {r.severity}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-gray-400 py-4 align-top">{r.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* ISSUES FIXED */}
          <section className="bg-[#0a0a0a] border border-[#1f2937] p-8">
            <SectionTitle label="// Resolved Since Pre-Mainnet" />
            <div className="space-y-0">
              {FIXES.map((f) => (
                <div key={f.issue} className="flex items-start justify-between gap-4 py-3 border-b border-[#1f2937]">
                  <span className="font-mono text-[10px] text-gray-400 leading-relaxed">{f.issue}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-400 shrink-0 mt-0.5">{f.fix}</span>
                </div>
              ))}
            </div>
          </section>

          {/* NEXT STEPS */}
          <section className="bg-[#0a0a0a] border border-[#1f2937] p-8">
            <SectionTitle label="// Roadmap" />
            <div className="space-y-4 mb-8">
              {ROADMAP.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="font-mono text-yellow-400 text-sm shrink-0 mt-0.5">⏳</span>
                  <span className="font-mono text-xs text-gray-400 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#111111] border-l-2 border-red-400/40 p-4 mt-6">
              <p className="font-mono text-[10px] text-gray-400 leading-relaxed uppercase tracking-wide">
                Found a vulnerability?{' '}
                <a href={GITHUB_URL + '/issues'} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-white transition-colors">Open a GitHub issue</a>
                {' '}or contact{' '}
                <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-white transition-colors">@nexusclawofficial</a>
                {' '}on Telegram.
              </p>
            </div>
          </section>
        </div>

        {/* VERIFY */}
        <section className="bg-[#0a0a0a] border border-[#1f2937] p-8">
          <SectionTitle label="// Verify" />
          <div className="flex flex-wrap gap-3">
            <VerifyBtn href={`${BASESCAN}/address/${STAKING_ADDRESS}`} label="View Contract on Basescan →" />
            <VerifyBtn href={GITHUB_URL} label="View Source Code on GitHub →" />
            <VerifyBtn href={SECURITY_DOC_URL} label="Read Full Security Doc →" />
          </div>
        </section>

      </main>
    </PageShell>
  )
}
