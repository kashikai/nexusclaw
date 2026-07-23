'use client'

import Link from 'next/link'
import type { CountyHunterCounty } from '@/features/county-hunter/types'
import { SOURCE_STATUS_LABELS } from '@/features/county-hunter/types'
import { Badge, DataTable, EmptyState, ErrorState, LoadingState, PageHeader, formatDate } from '@/features/county-hunter/components/ui'
import { useCountyHunterData } from '@/features/county-hunter/components/useCountyHunterData'

function statusTone(status: CountyHunterCounty['source_status']) {
  if (status === 'active') return 'good' as const
  if (status === 'degraded') return 'warning' as const
  if (status === 'unavailable') return 'danger' as const
  return 'neutral' as const
}

export default function CountiesPage() {
  const { data, loading, error } = useCountyHunterData<CountyHunterCounty[]>('/counties')
  return (
    <>
      <PageHeader title="County registry" description="Operational registry for official county sources. URLs remain empty until a human confirms them." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {data?.length === 0 && <EmptyState title="No counties provisioned" description="An administrator can provision the six approved Georgia counties from Settings. No source URLs will be invented." />}
      {data && data.length > 0 && (
        <DataTable headers={['County', 'State', 'Auction format', 'Source status', 'Last checked', 'Active']}>
          {data.map((county) => (
            <tr key={county.id} className="hover:bg-[#192029]">
              <td className="px-4 py-4"><Link href={`/county-hunter/counties/${county.id}`} className="font-semibold text-[#dce2eb] hover:text-[#abc7ff]">{county.name}</Link></td>
              <td className="px-4 py-4 text-sm text-[#8b919f]">{county.state?.code ?? 'Unconfirmed'}</td>
              <td className="px-4 py-4 text-sm capitalize text-[#aeb4bf]">{county.auction_type.replace('_', ' ')}</td>
              <td className="px-4 py-4"><Badge tone={statusTone(county.source_status)}>{SOURCE_STATUS_LABELS[county.source_status]}</Badge></td>
              <td className="px-4 py-4 text-sm text-[#8b919f]">{formatDate(county.last_checked_at)}</td>
              <td className="px-4 py-4"><Badge tone={county.active ? 'good' : 'neutral'}>{county.active ? 'Active' : 'Inactive'}</Badge></td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  )
}
