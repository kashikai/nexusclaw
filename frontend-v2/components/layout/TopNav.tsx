'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const NAV_ITEMS = [
  { href: '/staking', label: 'Staking' },
  { href: '/analytics', label: 'Tokenomics' },
  { href: '/analytics', label: 'Stats' },
  { href: '/governance', label: 'Governance' },
]

export function TopNav({ active }: { active?: string }) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#070707]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center px-8 py-4 max-w-[1440px] mx-auto">
        <Link href="/" className="text-2xl font-black tracking-tighter text-[#e5e2e1] italic font-['Space_Grotesk'] uppercase">
          NEXUS CLAW
        </Link>
        <div className="hidden md:flex items-center gap-10">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href
            const linkClass = isActive
              ? 'text-[#3A8BFF] border-b-2 border-[#3A8BFF] pb-1'
              : 'text-[#8b919f] hover:text-[#e5e2e1]'
            return (
              <Link key={item.href + item.label} href={item.href} className={`${linkClass} transition-colors font-['Space_Grotesk'] tracking-tighter uppercase text-sm font-bold`}>
                {item.label}
              </Link>
            )
          })}
          <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="text-[#8b919f] hover:text-[#e5e2e1] transition-colors font-['Space_Grotesk'] tracking-tighter uppercase text-sm font-bold">
            Docs
          </a>
        </div>
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain
            return (
              <div {...(!mounted && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                {connected ? (
                  <button onClick={openAccountModal} className="bg-gradient-to-r from-[#abc7ff] to-[#448fff] text-[#00285a] px-6 py-2 rounded-sm font-['Space_Grotesk'] font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all">
                    {account.displayName}
                  </button>
                ) : (
                  <button onClick={openConnectModal} className="bg-gradient-to-r from-[#abc7ff] to-[#448fff] text-[#00285a] px-6 py-2 rounded-sm font-['Space_Grotesk'] font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all">
                    Connect Wallet
                  </button>
                )}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
      <div className="bg-gradient-to-r from-transparent via-[#414754]/30 to-transparent h-[1px] w-full" />
    </nav>
  )
}
