'use client'

import { useAccount } from 'wagmi'
import { shortenAddress } from '@/lib/utils'

export function TopBar() {
  const { address, isConnected } = useAccount()
  return (
    <header className="fixed top-0 left-64 right-0 h-16 border-b border-nc-blue/15 bg-nc-bg/50 backdrop-blur-lg flex justify-between items-center px-8 z-40">
      <div className="flex items-center gap-8 font-mono-nc text-xs tracking-widest">
        <span className="text-nc-cyan text-glow-cyan">BASE MAINNET</span>
        <span className="text-slate-400">$NEXUSCLAW</span>
        <span className="text-nc-cyan/60">● LIVE</span>
      </div>
      <div className="flex items-center gap-4 text-slate-400">
        <a href="https://basescan.org/address/0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6" target="_blank" rel="noopener noreferrer" className="hover:text-nc-cyan transition-colors">
          <span className="material-symbols-outlined text-lg">link</span>
        </a>
        {isConnected && <span className="font-mono-nc text-xs text-nc-blue">{shortenAddress(address!)}</span>}
      </div>
    </header>
  )
}
