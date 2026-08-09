import type { Metadata } from 'next'
import { assertCountyHunterVercelRuntimeBoundary } from '@/features/county-hunter/server/production-environment'
import ClientProviders from './ClientProviders'
import './globals.css'

export const metadata: Metadata = {
  title: 'NexusClaw — Autonomous Agents With Verifiable Results',
  description: 'Autonomous agents that stake, trade, and operate within predefined rules on Base, with public activity available for verification.',
  openGraph: {
    title: 'NexusClaw — Autonomous Agents With Verifiable Results',
    description: 'Autonomous agents that stake, trade, and operate within predefined rules on Base, with public activity available for verification.',
    url: 'https://nexusclaw.tech',
    siteName: 'NexusClaw',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexusClaw — Autonomous Agents With Verifiable Results',
    description: 'Autonomous agents that stake, trade, and operate within predefined rules on Base, with public activity available for verification.',
    site: '@nexusclawbot',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  assertCountyHunterVercelRuntimeBoundary()

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="bg-[#0a0a0a] text-white antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
