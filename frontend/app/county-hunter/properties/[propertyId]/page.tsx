'use client'

import type { CountyHunterProperty } from '@/features/county-hunter/types'
import { Badge, Card, ErrorState, LoadingState, PageHeader, formatDate, formatMoney } from '@/features/county-hunter/components/ui'
import { useCountyHunterData } from '@/features/county-hunter/components/useCountyHunterData'

export default function PropertyDetailPage({ params }: { params: { propertyId: string } }) {
  const { data, loading, error } = useCountyHunterData<CountyHunterProperty>(`/properties/${params.propertyId}`)
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!data) return null
  const items = [
    ['County', data.county?.name ?? 'Not confirmed'], ['Auction date', formatDate(data.auction?.sale_date)], ['Owner', data.owner_name ?? 'Not confirmed'], ['Property type', data.property_type.replace('_', ' ')], ['Opening bid', formatMoney(data.opening_bid)], ['Assessed value', formatMoney(data.assessed_value)], ['Estimated value', formatMoney(data.estimated_value)], ['Calculated max bid', formatMoney(data.max_bid)], ['Data coverage', `${data.data_coverage}%`], ['Confidence', `${data.confidence_score}%`], ['Risk score', data.risk_score?.toString() ?? 'Inconclusive'],
  ]
  return <>
    <PageHeader eyebrow="Property detail" title={data.parcel_number ?? 'Unresolved parcel'} description={data.address ?? 'Address has not been confirmed.'} action={<Badge tone={data.human_review_required ? 'warning' : 'neutral'}>{data.status.replace('_', ' ')}</Badge>} />
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="font-['Space_Grotesk'] text-lg font-semibold">Summary</h2><dl className="mt-4 divide-y divide-[#29313b]">{items.map(([label, value]) => <div key={label} className="flex justify-between gap-5 py-3 text-sm"><dt className="text-[#7f8794]">{label}</dt><dd className="text-right font-medium capitalize text-[#d2d5db]">{value}</dd></div>)}</dl></Card>
      <Card><h2 className="font-['Space_Grotesk'] text-lg font-semibold">Legal description</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#aeb4bf]">{data.legal_description ?? 'Information not confirmed. Human review is required before relying on the parcel identity.'}</p><div className="mt-6 rounded-lg border border-[#f5c542]/20 bg-[#f5c542]/5 p-4 text-sm leading-6 text-[#b6af98]">This record is investigative support only. Legal and title review remain mandatory.</div></Card>
    </div>
  </>
}
