'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/staking', label: 'Staking', icon: 'account_balance_wallet' },
  { href: '/governance', label: 'Governance', icon: 'gavel' },
  { href: '/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/trader', label: 'Trader', icon: 'monitoring' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <nav className="fixed left-0 top-0 h-full w-64 border-r border-nc-blue/15 bg-nc-bg/80 backdrop-blur-xl flex flex-col py-8 px-4 z-50">
      <div className="mb-12 px-2">
        <h1 className="text-xl font-black text-nc-blue tracking-widest uppercase">NEXUS CLAW</h1>
        <p className="text-[10px] text-nc-blue/60 tracking-tighter uppercase">Web3 Terminal</p>
      </div>
      <div className="flex-grow space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`group flex items-center gap-4 px-4 py-3 transition-all duration-300 ${
                isActive ? 'text-nc-cyan bg-nc-surface-hi border-r-2 border-nc-cyan font-bold' : 'text-slate-500 hover:text-nc-blue hover:bg-nc-surface-hi'
              }`}>
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span className="text-sm tracking-tighter uppercase">{item.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="mt-4">
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain
            return (
              <div {...(!mounted && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                {(() => {
                  if (!connected) return (
                    <button onClick={openConnectModal} className="w-full py-4 bg-nc-blue text-nc-bg font-bold uppercase tracking-widest text-sm hover:brightness-110 active:scale-95 transition-all">
                      Open Wallet
                    </button>
                  )
                  if (chain.unsupported) return (
                    <button onClick={openChainModal} className="w-full py-4 bg-red-500/20 text-red-400 font-bold uppercase tracking-widest text-sm">Wrong Network</button>
                  )
                  return (
                    <button onClick={openAccountModal} className="w-full py-3 bg-nc-surface-hi border border-nc-blue/20 text-nc-blue text-sm hover:bg-nc-surface transition-all">
                      <span className="font-mono-nc text-xs">{account.displayName}</span>
                    </button>
                  )
                })()}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    </nav>
  )
}
