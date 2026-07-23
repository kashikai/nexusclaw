'use client'

import type { CountyHunterReviewTask } from '@/features/county-hunter/types'
import { Badge, DataTable, EmptyState, ErrorState, LoadingState, PageHeader, formatDate } from '@/features/county-hunter/components/ui'
import { useCountyHunterData } from '@/features/county-hunter/components/useCountyHunterData'

export default function ReviewQueuePage() {
  const { data, loading, error } = useCountyHunterData<CountyHunterReviewTask[]>('/review-tasks')
  return <><PageHeader title="Human review queue" description="Tasks that cannot be safely completed through automation remain assigned to a person." />{loading && <LoadingState />}{error && <ErrorState message={error} />}{data?.length === 0 && <EmptyState title="No pending reviews" description="Review tasks will be created when a source, parcel or rule requires human confirmation." />}{data && data.length > 0 && <DataTable headers={['Type', 'Priority', 'Description', 'Status', 'Due']}>
    {data.map((task) => <tr key={task.id} className="hover:bg-[#192029]"><td className="px-4 py-4 text-sm capitalize">{task.task_type.replace('_', ' ')}</td><td className="px-4 py-4"><Badge tone={task.priority === 'critical' ? 'danger' : task.priority === 'high' ? 'warning' : 'neutral'}>{task.priority}</Badge></td><td className="max-w-xl px-4 py-4 text-sm text-[#b7bbc3]">{task.description}</td><td className="px-4 py-4 text-sm capitalize">{task.status.replace('_', ' ')}</td><td className="px-4 py-4 text-sm text-[#8b919f]">{formatDate(task.due_at)}</td></tr>)}
  </DataTable>}</>
}
