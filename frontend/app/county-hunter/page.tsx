'use client'

import type { CountyHunterDashboard } from '@/features/county-hunter/types'
import { Card, ErrorState, LoadingState, PageHeader } from '@/features/county-hunter/components/ui'
import { useCountyHunterData } from '@/features/county-hunter/components/useCountyHunterData'

const METRICS: { key: keyof CountyHunterDashboard; label: string; icon: string }[] = [
  { key: 'counties', label: 'Counties monitored', icon: 'map' },
  { key: 'auctions', label: 'Auctions recorded', icon: 'gavel' },
  { key: 'properties', label: 'Properties found', icon: 'domain' },
  { key: 'shortlisted', label: 'Shortlisted', icon: 'bookmark' },
  { key: 'pendingReviews', label: 'Pending reviews', icon: 'fact_check' },
  { key: 'sourceErrors', label: 'Sources with errors', icon: 'link_off' },
  { key: 'changesLast24Hours', label: 'Changes in 24 hours', icon: 'difference' },
]

export default function CountyHunterDashboardPage() {
  const { data, loading, error } = useCountyHunterData<CountyHunterDashboard>('/dashboard')
  return (
    <>
      <PageHeader title="Investigation dashboard" description="Verified counts from your organization. Missing data remains visibly unconfirmed and no automated bidding is available." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map((metric) => (
            <Card key={metric.key}>
              <div className="flex items-start justify-between">
                <span className="material-symbols-outlined text-[#647080]">{metric.icon}</span>
                <span className="font-['JetBrains_Mono'] text-3xl font-semibold text-[#f0f1f4]">{data[metric.key]}</span>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#8b919f]">{metric.label}</p>
            </Card>
          ))}
          <Card className="sm:col-span-2 xl:col-span-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#abc7ff]">Operating boundary</p>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#a8aeb8]">County Hunter records sources, uncertainty, analysis and human decisions. It does not purchase property, place bids, move money or state that a title is clear.</p>
          </Card>
        </div>
      )}
    </>
  )
}
