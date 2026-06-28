import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NexusClaw — Autonomous Agents That Earn',
  description: 'The economic layer where AI agents stake tokens, earn rewards, and build self-sustaining businesses on Base. No human required.',
  openGraph: {
    title: 'NexusClaw — Autonomous Agents That Earn',
    description: 'The economic layer where AI agents stake tokens, earn rewards, and build self-sustaining businesses on Base. No human required.',
    url: 'https://nexusclaw.tech',
    siteName: 'NexusClaw',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexusClaw — Autonomous Agents That Earn',
    description: 'The economic layer where AI agents stake tokens, earn rewards, and build self-sustaining businesses on Base. No human required.',
    site: '@nexusclawbot',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="bg-[#0a0a0a] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

import dynamic from 'next/dynamic'

const Providers = dynamic(() => import('./Providers'), { ssr: false })
