'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { MobileBanner } from '@/components/MobileBanner'

const COUNTY_HUNTER_ENABLED = process.env.NEXT_PUBLIC_COUNTY_HUNTER_ENABLED === 'true'

const NAV_ITEMS: { href: string; label: string; gold?: boolean }[] = [
  { href: '/proof', label: 'Proof' },
  { href: '/agents', label: 'Agents' },
  ...(COUNTY_HUNTER_ENABLED ? [{ href: '/county-hunter', label: 'County Hunter' }] : []),
  { href: '/start-agent', label: 'Start Agent' },
  { href: '/trader', label: 'Trader', gold: true },
  { href: '/staking', label: 'Staking' },
  { href: '/security', label: 'Security' },
  { href: '/docs', label: 'Docs' },
]

export function TopNav({ active }: { active?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const currentPath = pathname || active

  return (
    <>
      <MobileBanner />

      <nav className="fixed top-0 w-full z-50 bg-[#070707]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center px-6 py-4 max-w-[1440px] mx-auto">
          <Link href="/">
            <img src="/logo.png" alt="NexusClaw" className="h-10 md:h-14 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPath === item.href
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={`transition-colors font-['Space_Grotesk'] tracking-tighter uppercase text-sm font-bold ${
                    isActive
                      ? item.gold
                        ? 'text-[#f5c542] border-b-2 border-[#f5c542] pb-1'
                        : 'text-[#3A8BFF] border-b-2 border-[#3A8BFF] pb-1'
                      : item.gold
                      ? 'text-[#f5c542]/70 hover:text-[#f5c542]'
                      : 'text-[#8b919f] hover:text-[#e5e2e1]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-4">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, mounted }) => {
                const connected = mounted && account && chain
                return (
                  <div {...(!mounted && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                    {connected ? (
                      <button onClick={openAccountModal} className="bg-gradient-to-r from-[#abc7ff] to-[#448fff] text-[#00285a] px-6 py-2 rounded-sm font-['Space_Grotesk'] font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all">
                        {account.displayName}
                      </button>
                    ) : (
                      <Link
                        href="/proof"
                        className="block bg-gradient-to-r from-[#abc7ff] to-[#448fff] text-[#00285a] px-4 sm:px-6 py-2 rounded-sm font-['Space_Grotesk'] font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:brightness-110 transition-all"
                      >
                        <span className="hidden sm:inline">View Live Proof</span>
                        <span className="sm:hidden">Proof</span>
                      </Link>
                    )}
                  </div>
                )
              }}
            </ConnectButton.Custom>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[6px] group"
              aria-label="Toggle menu"
            >
              <span className={`block h-[2px] bg-[#e5e2e1] transition-all duration-300 origin-center ${menuOpen ? 'w-6 rotate-45 translate-y-2' : 'w-6'}`} />
              <span className={`block h-[2px] bg-[#e5e2e1] transition-all duration-300 ${menuOpen ? 'w-0 opacity-0' : 'w-6'}`} />
              <span className={`block h-[2px] bg-[#e5e2e1] transition-all duration-300 origin-center ${menuOpen ? 'w-6 -rotate-45 -translate-y-2' : 'w-6'}`} />
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-transparent via-[#414754]/30 to-transparent h-[1px] w-full" />

        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? 'max-h-[calc(100vh-73px)] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-[#070707] border-t border-b border-[#414754]/30 px-6 pt-5 pb-8 flex flex-col gap-1 shadow-2xl min-h-[calc(100vh-73px)] max-h-[calc(100vh-73px)] overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPath === item.href
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between py-4 border-b border-[#414754]/20 font-['Space_Grotesk'] uppercase text-sm font-bold tracking-widest transition-colors ${
                    isActive
                      ? item.gold ? 'text-[#f5c542]' : 'text-[#00eefc]'
                      : item.gold ? 'text-[#f5c542]/70 hover:text-[#f5c542]' : 'text-[#8b919f] hover:text-[#e5e2e1]'
                  }`}
                >
                  {item.label}
                  {isActive && <span className={`w-1.5 h-1.5 rounded-full ${item.gold ? 'bg-[#f5c542]' : 'bg-[#00eefc]'}`} />}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
