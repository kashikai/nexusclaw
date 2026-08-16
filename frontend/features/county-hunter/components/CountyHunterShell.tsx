'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { CountyHunterWalletAuth } from './CountyHunterWalletAuth'

const NAVIGATION = [
  { href: '/county-hunter', label: 'Dashboard', icon: 'space_dashboard' },
  { href: '/county-hunter/counties', label: 'Counties', icon: 'map' },
  { href: '/county-hunter/auctions', label: 'Auctions', icon: 'gavel' },
  { href: '/county-hunter/properties', label: 'Properties', icon: 'domain' },
  { href: '/county-hunter/review-queue', label: 'Review Queue', icon: 'fact_check' },
  { href: '/county-hunter/discovery', label: 'Discovery', icon: 'travel_explore' },
  { href: '/county-hunter/settings', label: 'Settings', icon: 'tune' },
]

export function CountyHunterShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen bg-[#0b0e12] text-[#e5e2e1]">
      <header className="border-b border-[#252c35] bg-[#0d1117]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Back to NexusClaw"><Image src="/logo.png" alt="NexusClaw" width={180} height={56} className="h-10 w-auto" priority /></Link>
            <div className="h-8 w-px bg-[#343b47]" />
            <div>
              <p className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-[0.15em]">County Hunter</p>
              <p className="text-[10px] uppercase tracking-wider text-[#747c89]">Georgia intelligence workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CountyHunterWalletAuth />
            <Link href="/" className="text-xs font-semibold uppercase tracking-wider text-[#8b919f] hover:text-[#abc7ff]">Exit workspace</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1920px] min-w-0 grid-cols-1 md:min-h-[calc(100vh-73px)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="w-full min-w-0 max-w-full border-b border-[#252c35] bg-[#0d1117] lg:overflow-hidden lg:border-b-0 lg:border-r">
          <nav className="flex w-full min-w-0 gap-1 overflow-x-auto p-3 lg:grid lg:grid-cols-1 lg:overflow-x-visible lg:p-5">
            {NAVIGATION.map((item) => {
              const active = item.href === '/county-hunter' ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} className={`flex min-w-0 shrink-0 items-center gap-3 rounded-md px-3 py-3 text-xs font-bold uppercase tracking-wider transition lg:w-full lg:shrink ${active ? 'bg-[#abc7ff]/10 text-[#abc7ff]' : 'text-[#7f8794] hover:bg-[#171c23] hover:text-[#d5d7dc]'}`}>
                  <span className="material-symbols-outlined shrink-0 text-lg">{item.icon}</span>
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="m-5 hidden min-w-0 rounded-lg border border-[#f5c542]/20 bg-[#f5c542]/5 p-3 text-xs leading-5 text-[#a9a390] lg:block">
            Human approval is required. This workspace never places bids or moves funds.
          </div>
        </aside>
        <main className="w-full min-w-0 max-w-none p-5 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  )
}
