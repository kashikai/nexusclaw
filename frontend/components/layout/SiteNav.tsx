'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { MobileBanner, isMobileDevice } from '@/components/MobileBanner'

function HexLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke="#22d3ee" strokeWidth="1.5" fill="none" />
      <polygon points="16,7 23,11 23,19 16,23 9,19 9,11" fill="#22d3ee" opacity="0.15" />
      <text x="16" y="20" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="monospace" fontWeight="bold">N</text>
    </svg>
  )
}

const NAV_LINKS = [
  { href: '/proof',   label: 'Proof' },
  { href: '/agents',  label: 'Agents' },
  { href: '/trader',  label: 'Trader' },
  { href: '/staking', label: 'Staking' },
  { href: '/docs',    label: 'Docs' },
]

interface SiteNavProps {
  variant?: 'public' | 'app'
  active?: string
}

export function SiteNav({ variant = 'public', active }: SiteNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileModalOpen, setMobileModalOpen] = useState(false)

  return (
    <>
      <MobileBanner forceOpen={mobileModalOpen} onForceClose={() => setMobileModalOpen(false)} />

      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#1f2937]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">

          <Link href="/" className="flex items-center gap-2.5">
            <HexLogo />
            <span className="font-bold text-base tracking-wider text-white font-mono">NexusClaw</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs font-mono uppercase tracking-widest transition-colors ${
                  active === item.href ? 'text-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {variant === 'app' ? (
              <ConnectButton.Custom>
                {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                  const connected = mounted && account && chain
                  return (
                    <div {...(!mounted && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                      {connected ? (
                        <button onClick={openAccountModal}
                          className="border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-mono hover:bg-cyan-400 hover:text-black transition-all">
                          {account.displayName}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const hasInjected = typeof window !== 'undefined' && !!(window as { ethereum?: unknown }).ethereum
                            if (isMobileDevice() && !hasInjected) {
                              setMobileModalOpen(true)
                            } else {
                              openConnectModal()
                            }
                          }}
                          className="border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-mono hover:bg-cyan-400 hover:text-black transition-all">
                          Connect Wallet
                        </button>
                      )}
                    </div>
                  )
                }}
              </ConnectButton.Custom>
            ) : (
              <Link href="/staking"
                className="border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-mono hover:bg-cyan-400 hover:text-black transition-all">
                Launch App →
              </Link>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px]"
              aria-label="Toggle menu">
              <span className={`block h-[2px] w-5 bg-white transition-all duration-200 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-[2px] w-5 bg-white transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-[2px] w-5 bg-white transition-all duration-200 origin-center ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>
          </div>
        </div>

        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-96' : 'max-h-0'}`}>
          <div className="bg-[#0a0a0a] border-t border-[#1f2937] px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className={`py-3 border-b border-[#1f2937] text-xs font-mono uppercase tracking-widest transition-colors ${
                  active === item.href ? 'text-cyan-400' : 'text-gray-400'
                }`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
