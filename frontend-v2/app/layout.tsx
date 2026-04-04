import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NexusClaw Terminal | Staking Dashboard',
  description: 'Stake $NEXUSCLAW and earn rewards autonomously on Base',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#131313] text-[#e5e2e1] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

import dynamic from 'next/dynamic'

const Providers = dynamic(() => import('./Providers'), { ssr: false })
