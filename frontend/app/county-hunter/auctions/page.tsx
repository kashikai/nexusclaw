'use client'

import type { CountyHunterAuction } from '@/features/county-hunter/types'
import { Badge, DataTable, EmptyState, ErrorState, LoadingState, PageHeader, formatDate } from '@/features/county-hunter/components/ui'
import { useCountyHunterData } from '@/features/county-hunter/components/useCountyHunterData'

export default function AuctionsPage() {
  const { data, loading, error } = useCountyHunterData<CountyHunterAuction[]>('/auctions')
  return <>
    <PageHeader title="Auctions" description="Recorded tax sale events. Dates and formats remain unconfirmed until supported by an official source." />
    {loading && <LoadingState />}{error && <ErrorState message={error} />}
    {data?.length === 0 && <EmptyState title="No auctions recorded" description="Discovery processing is intentionally deferred. Auctions can be added through the authenticated API after confirmation." />}
    {data && data.length > 0 && <DataTable headers={['County', 'Sale date', 'Format', 'Properties', 'Withdrawn', 'Status']}>
      {data.map((auction) => <tr key={auction.id} className="hover:bg-[#192029]">
        <td className="px-4 py-4 font-semibold">{auction.county?.name ?? 'Unconfirmed'}</td><td className="px-4 py-4 text-sm text-[#aeb4bf]">{formatDate(auction.sale_date)}</td><td className="px-4 py-4 text-sm capitalize text-[#aeb4bf]">{auction.auction_type.replace('_', ' ')}</td><td className="px-4 py-4 text-sm">{auction.property_count}</td><td className="px-4 py-4 text-sm">{auction.withdrawn_count}</td><td className="px-4 py-4"><Badge tone={auction.status === 'confirmed' ? 'good' : auction.status === 'cancelled' ? 'danger' : 'warning'}>{auction.status}</Badge></td>
      </tr>)}
    </DataTable>}
  </>
}
