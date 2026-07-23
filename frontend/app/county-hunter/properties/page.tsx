'use client'

import Link from 'next/link'
import type { CountyHunterProperty } from '@/features/county-hunter/types'
import { Badge, DataTable, EmptyState, ErrorState, LoadingState, PageHeader, formatMoney } from '@/features/county-hunter/components/ui'
import { useCountyHunterData } from '@/features/county-hunter/components/useCountyHunterData'

export default function PropertiesPage() {
  const { data, loading, error } = useCountyHunterData<CountyHunterProperty[]>('/properties')
  return <>
    <PageHeader title="Properties" description="Normalized opportunities with explicit coverage, confidence and review status." />
    {loading && <LoadingState />}{error && <ErrorState message={error} />}
    {data?.length === 0 && <EmptyState title="No properties found" description="Properties will appear only after manual entry or a future audited discovery run." />}
    {data && data.length > 0 && <DataTable headers={['Parcel', 'Address', 'County', 'Opening bid', 'Max bid', 'Risk', 'Coverage', 'Status']}>
      {data.map((property) => <tr key={property.id} className="hover:bg-[#192029]">
        <td className="px-4 py-4"><Link className="font-['JetBrains_Mono'] text-xs text-[#abc7ff]" href={`/county-hunter/properties/${property.id}`}>{property.parcel_number ?? 'Unresolved'}</Link></td><td className="max-w-64 truncate px-4 py-4 text-sm">{property.address ?? 'Not confirmed'}</td><td className="px-4 py-4 text-sm text-[#aeb4bf]">{property.county?.name ?? 'Unconfirmed'}</td><td className="px-4 py-4 text-sm">{formatMoney(property.opening_bid)}</td><td className="px-4 py-4 text-sm">{formatMoney(property.max_bid)}</td><td className="px-4 py-4 text-sm">{property.risk_score ?? 'Inconclusive'}</td><td className="px-4 py-4 text-sm">{property.data_coverage}%</td><td className="px-4 py-4"><Badge tone={property.status === 'shortlisted' ? 'good' : property.human_review_required ? 'warning' : 'neutral'}>{property.status.replace('_', ' ')}</Badge></td>
      </tr>)}
    </DataTable>}
  </>
}
