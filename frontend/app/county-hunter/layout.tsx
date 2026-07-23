import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { CountyHunterShell } from '@/features/county-hunter/components/CountyHunterShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'County Hunter | NexusClaw',
  description: 'Controlled intelligence and human preparation for Georgia tax sales.',
}

export default function CountyHunterLayout({ children }: { children: ReactNode }) {
  if (process.env.COUNTY_HUNTER_ENABLED !== 'true') notFound()
  return <CountyHunterShell>{children}</CountyHunterShell>
}
