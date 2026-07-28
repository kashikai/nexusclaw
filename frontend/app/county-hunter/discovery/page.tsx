'use client'

import { useState } from 'react'
import type { CountyHunterDiscoveryOverview } from '@/features/county-hunter/types'
import { countyHunterApi } from '@/features/county-hunter/client/api'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  formatDate,
  formatDateTime,
} from '@/features/county-hunter/components/ui'
import { useCountyHunterData } from '@/features/county-hunter/components/useCountyHunterData'

type RunResponse = {
  status: 'completed' | 'review_required'
  records: number
  added: number
  changed: number
  unchanged: number
  removed: number
}

function abbreviatedHash(value: string | null | undefined): string {
  return value ? `${value.slice(0, 12)}…` : 'Not available'
}

function statusTone(status: string | undefined) {
  if (status === 'completed' || status === 'active') return 'good' as const
  if (status === 'review_required' || status === 'degraded') return 'warning' as const
  if (status === 'failed' || status === 'unavailable') return 'danger' as const
  return 'neutral' as const
}

export default function DiscoveryPage() {
  const overview = useCountyHunterData<CountyHunterDiscoveryOverview>('/discovery')
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function runDiscovery() {
    setRunning(true)
    setNotice(null)
    try {
      const result = await countyHunterApi<RunResponse>('/discovery', { method: 'POST' })
      setNotice(
        `Discovery ${result.status}. ${result.records} record(s): ${result.added} added, ${result.changed} changed, ${result.unchanged} unchanged and ${result.removed} removed from the current source.`,
      )
      await overview.reload()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Discovery failed.')
    } finally {
      setRunning(false)
    }
  }

  async function replaySnapshot(snapshotId: string) {
    setRunning(true)
    setNotice(null)
    try {
      const result = await countyHunterApi<RunResponse>('/discovery/replay', {
        method: 'POST',
        body: JSON.stringify({ snapshotId }),
      })
      setNotice(
        `Snapshot replay ${result.status}. ${result.records} record(s): ${result.added} added, ${result.changed} changed, ${result.unchanged} unchanged and ${result.removed} absent from the preserved source.`,
      )
      await overview.reload()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Snapshot replay failed.')
    } finally {
      setRunning(false)
    }
  }

  if (overview.loading) return <LoadingState />
  if (overview.error) return <ErrorState message={overview.error} />
  const data = overview.data
  if (!data) return null
  const run = data.latestRun
  const source = data.source
  const documentSnapshot = data.snapshots.find(
    (snapshot) => snapshot.snapshot_kind === 'official_document',
  )

  return (
    <>
      <PageHeader
        eyebrow="County Hunter / Official discovery"
        title="Gwinnett County"
        description="Manual, deterministic discovery from the current property list published by the Gwinnett County Tax Commissioner. No bidding or on-chain action is available."
        action={
          data.canRun ? (
            <Button onClick={() => void runDiscovery()} disabled={running}>
              {running ? 'Running discovery…' : 'Run Discovery'}
            </Button>
          ) : undefined
        }
      />

      {notice && <Card className="mb-5"><p className="text-sm leading-6 text-[#c4c7cf]">{notice}</p></Card>}

      {!data.collectionEnabled && (
        <Card className="mb-5 border-[#f5c542]/30">
          <Badge tone="warning">Collection disabled</Badge>
          <p className="mt-3 text-sm leading-6 text-[#c8c9ce]">
            Manual Discovery and replay are disabled by the operator. Existing
            records and snapshots remain available for authorized read-only
            review.
          </p>
        </Card>
      )}

      <Card className="mb-5 border-[#abc7ff]/25">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#abc7ff]">
          Public-source notice
        </p>
        <div className="mt-3 grid gap-4 text-sm leading-6 text-[#aeb4bf] lg:grid-cols-2">
          <div>
            <p>
              These records are obtained from an official public county source
              and may change without notice. Always confirm the current record
              directly with Gwinnett County.
            </p>
            <p className="mt-2">
              <code>removed_from_current_source</code> does not mean sold,
              cancelled or otherwise resolved.
            </p>
          </div>
          <div>
            <p>
              Amounts are not market valuations. Nothing here is a title
              analysis, a guarantee that property is free of liens, or legal or
              financial advice.
            </p>
            <p className="mt-2">
              Last collection: {formatDateTime(source?.last_success_at)} ·
              Adapter: {source?.adapter_version ?? 'Not confirmed'} · Review:{' '}
              {run?.review_required ? 'required' : 'not currently required'}
            </p>
          </div>
        </div>
        {source?.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-semibold text-[#abc7ff] hover:underline"
          >
            Confirm with the official county source
          </a>
        ) : (
          <p className="mt-4 text-sm text-[#f5c542]">
            Official source link is not configured.
          </p>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#747c89]">Official agency</p>
              <h2 className="mt-2 font-['Space_Grotesk'] text-xl font-semibold">Gwinnett County Tax Commissioner</h2>
            </div>
            <Badge tone={statusTone(source?.status)}>{source?.status ?? 'Not configured'}</Badge>
          </div>
          <dl className="mt-6 grid gap-5 text-sm md:grid-cols-2">
            <div><dt className="text-[#747c89]">Detected tax sale</dt><dd className="mt-1 text-[#d7d9df]">{formatDate(run?.sale_date)}</dd></div>
            <div><dt className="text-[#747c89]">Last verification</dt><dd className="mt-1 text-[#d7d9df]">{formatDate(source?.last_attempt_at)}</dd></div>
            <div><dt className="text-[#747c89]">Last successful run</dt><dd className="mt-1 text-[#d7d9df]">{formatDate(source?.last_success_at)}</dd></div>
            <div><dt className="text-[#747c89]">Current document hash</dt><dd className="mt-1 font-['JetBrains_Mono'] text-[#abc7ff]">{abbreviatedHash(source?.last_document_hash)}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={source?.url ?? 'https://www.gwinnetttaxcommissioner.com/property-tax/delinquent_tax/tax-liens-tax-sales'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#abc7ff] hover:underline"
            >
              Official landing page
            </a>
            {source?.last_document_url && (
              <a
                href={source.last_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[#abc7ff] hover:underline"
              >
                Current official document
              </a>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#747c89]">Latest run</p>
          <div className="mt-3"><Badge tone={statusTone(run?.status)}>{run?.status ?? 'Not run'}</Badge></div>
          {run && (
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#747c89]">
              {run.run_type === 'snapshot_replay' ? 'Stored snapshot replay' : 'Official source collection'}
            </p>
          )}
          <p className="mt-5 text-4xl font-bold text-[#f0f1f4]">{run?.properties_found ?? 0}</p>
          <p className="mt-1 text-sm text-[#8b919f]">normalized source records</p>
          {run?.review_required && (
            <p className="mt-4 text-sm leading-6 text-[#f5d878]">
              Administrative review is required. The captured snapshots remain preserved.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {[
          ['Added', run?.added_count ?? 0],
          ['Changed', run?.changed_count ?? 0],
          ['Unchanged', run?.unchanged_count ?? 0],
          ['Removed', run?.removed_count ?? 0],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#747c89]">{label}</p>
            <p className="mt-3 text-3xl font-bold">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-['Space_Grotesk'] text-lg font-semibold">Snapshot provenance</h2>
          <Badge tone="info">{data.snapshots.length} captured</Badge>
        </div>
        {data.snapshots.length === 0 ? (
          <p className="mt-4 text-sm text-[#8b919f]">No snapshot has been captured for this tenant.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.snapshots.map((snapshot) => (
              <div key={snapshot.id} className="rounded-md border border-[#2c3442] bg-[#10141a] p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold capitalize">{snapshot.snapshot_kind.replace('_', ' ')}</span>
                  <span className="font-['JetBrains_Mono'] text-xs text-[#abc7ff]">{abbreviatedHash(snapshot.content_hash)}</span>
                </div>
                <p className="mt-2 text-xs text-[#78818e]">
                  {snapshot.content_type} · {snapshot.content_length.toLocaleString()} bytes · fetched {formatDate(snapshot.fetched_at)}
                </p>
              </div>
            ))}
          </div>
        )}
        {data.canRun && documentSnapshot && (
          <div className="mt-5 border-t border-[#2c3442] pt-5">
            <Button
              onClick={() => void replaySnapshot(documentSnapshot.id)}
              disabled={running}
            >
              {running ? 'Processing…' : 'Replay Stored Document'}
            </Button>
            <p className="mt-2 text-xs leading-5 text-[#78818e]">
              Reprocesses the preserved PDF without contacting the official source or changing the snapshot.
            </p>
          </div>
        )}
      </Card>
    </>
  )
}
