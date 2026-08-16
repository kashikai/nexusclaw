'use client'

import { use, useEffect, useRef, useState, type FormEvent } from 'react'
import type { CountyHunterCounty, CountyHunterSource } from '@/features/county-hunter/types'
import { SOURCE_STATUS_LABELS } from '@/features/county-hunter/types'
import { countyHunterApi } from '@/features/county-hunter/client/api'
import { Badge, Button, Card, ErrorState, Field, Input, LoadingState, PageHeader, SecondaryButton, Select, Textarea } from '@/features/county-hunter/components/ui'
import { useCountyHunterData } from '@/features/county-hunter/components/useCountyHunterData'

type Props = { params: Promise<{ countyId: string }> }

type SourceEditForm = {
  name: string
  source_type: string
  url: string
  is_official: boolean
  status: CountyHunterSource['status']
  coverage_percent: string
}

type SourceMutation = 'saving' | 'deleting'

const SOURCE_TYPE_OPTIONS = [
  { value: 'tax_sale', label: 'Tax sale' },
  { value: 'assessor', label: 'Assessor' },
  { value: 'gis', label: 'GIS' },
  { value: 'clerk', label: 'Clerk' },
  { value: 'legal_newspaper', label: 'Legal newspaper' },
  { value: 'other', label: 'Other' },
] as const

function sourceEditForm(source: CountyHunterSource): SourceEditForm {
  return {
    name: source.name,
    source_type: source.source_type,
    url: source.url ?? '',
    is_official: source.is_official,
    status: source.status,
    coverage_percent: String(source.coverage_percent),
  }
}

function withoutSource<T>(record: Record<string, T>, sourceId: string): Record<string, T> {
  const next = { ...record }
  delete next[sourceId]
  return next
}

export default function CountyDetailPage({ params }: Props) {
  const { countyId } = use(params)
  const countyState = useCountyHunterData<CountyHunterCounty>(`/counties/${countyId}`)
  const sourcesState = useCountyHunterData<CountyHunterSource[]>(`/counties/${countyId}/sources`)
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sourceForm, setSourceForm] = useState({ name: '', source_type: 'tax_sale', url: '', is_official: true })
  const [sourceEdits, setSourceEdits] = useState<Record<string, SourceEditForm>>({})
  const [sourceDeleteConfirmations, setSourceDeleteConfirmations] = useState<Record<string, boolean>>({})
  const [sourceMutations, setSourceMutations] = useState<Record<string, SourceMutation>>({})
  const sourceMutationLocks = useRef(new Set<string>())

  useEffect(() => {
    if (!countyState.data) return
    const county = countyState.data
    setForm({
      tax_sale_authority: county.tax_sale_authority ?? '',
      official_website_url: county.official_website_url ?? '',
      tax_sale_page_url: county.tax_sale_page_url ?? '',
      assessor_url: county.assessor_url ?? '',
      gis_url: county.gis_url ?? '',
      clerk_url: county.clerk_url ?? '',
      auction_type: county.auction_type,
      typical_schedule: county.typical_schedule ?? '',
      payment_rules: county.payment_rules ?? '',
      operational_notes: county.operational_notes ?? '',
      source_status: county.source_status,
      active: county.active,
    })
  }, [countyState.data])

  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))

  async function saveCounty(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setNotice(null)
    try {
      const updated = await countyHunterApi<CountyHunterCounty>(`/counties/${countyId}`, { method: 'PATCH', body: JSON.stringify(form) })
      countyState.setData(updated)
      setNotice('County configuration saved and audited.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save county.')
    } finally { setSaving(false) }
  }

  async function addSource(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setNotice(null)
    try {
      await countyHunterApi(`/counties/${countyId}/sources`, { method: 'POST', body: JSON.stringify(sourceForm) })
      setSourceForm({ name: '', source_type: 'tax_sale', url: '', is_official: true })
      await sourcesState.reload()
      setNotice('Source added. Automation has not been enabled.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to add source.')
    } finally { setSaving(false) }
  }

  function beginSourceEdit(source: CountyHunterSource) {
    if (sourceMutationLocks.current.has(source.id)) return
    setSourceDeleteConfirmations((current) => withoutSource(current, source.id))
    setSourceEdits((current) => ({ ...current, [source.id]: sourceEditForm(source) }))
  }

  function cancelSourceEdit(sourceId: string) {
    if (sourceMutationLocks.current.has(sourceId)) return
    setSourceEdits((current) => withoutSource(current, sourceId))
  }

  function updateSourceEdit(sourceId: string, updates: Partial<SourceEditForm>) {
    setSourceEdits((current) => {
      const sourceEdit = current[sourceId]
      if (!sourceEdit) return current
      return { ...current, [sourceId]: { ...sourceEdit, ...updates } }
    })
  }

  function beginSourceDelete(sourceId: string) {
    if (sourceMutationLocks.current.has(sourceId)) return
    setSourceEdits((current) => withoutSource(current, sourceId))
    setSourceDeleteConfirmations((current) => ({ ...current, [sourceId]: true }))
  }

  function cancelSourceDelete(sourceId: string) {
    if (sourceMutationLocks.current.has(sourceId)) return
    setSourceDeleteConfirmations((current) => withoutSource(current, sourceId))
  }

  function startSourceMutation(sourceId: string, mutation: SourceMutation): boolean {
    if (sourceMutationLocks.current.has(sourceId)) return false
    sourceMutationLocks.current.add(sourceId)
    setSourceMutations((current) => ({ ...current, [sourceId]: mutation }))
    return true
  }

  function finishSourceMutation(sourceId: string) {
    sourceMutationLocks.current.delete(sourceId)
    setSourceMutations((current) => withoutSource(current, sourceId))
  }

  async function saveSource(event: FormEvent, sourceId: string) {
    event.preventDefault()
    const sourceEdit = sourceEdits[sourceId]
    if (!sourceEdit) return

    const coveragePercent = Number(sourceEdit.coverage_percent)
    if (
      sourceEdit.coverage_percent.trim() === '' ||
      !Number.isFinite(coveragePercent) ||
      coveragePercent < 0 ||
      coveragePercent > 100
    ) {
      setNotice('Coverage % must be a number between 0 and 100.')
      return
    }
    if (!startSourceMutation(sourceId, 'saving')) return

    setNotice(null)
    try {
      await countyHunterApi<CountyHunterSource>(`/sources/${sourceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: sourceEdit.name,
          source_type: sourceEdit.source_type,
          url: sourceEdit.url,
          is_official: sourceEdit.is_official,
          status: sourceEdit.status,
          coverage_percent: coveragePercent,
        }),
      })
      await sourcesState.reload()
      setSourceEdits((current) => withoutSource(current, sourceId))
      setNotice('Source changes saved. Discovery and crawling were not started.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save source changes.')
    } finally {
      finishSourceMutation(sourceId)
    }
  }

  async function deleteSource(sourceId: string) {
    if (!sourceDeleteConfirmations[sourceId] || !startSourceMutation(sourceId, 'deleting')) return

    setNotice(null)
    try {
      await countyHunterApi<void>(`/sources/${sourceId}`, { method: 'DELETE' })
      await sourcesState.reload()
      setSourceDeleteConfirmations((current) => withoutSource(current, sourceId))
      setSourceEdits((current) => withoutSource(current, sourceId))
      setNotice('Configured source deleted. County configuration and Discovery were not changed.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete source.')
    } finally {
      finishSourceMutation(sourceId)
    }
  }

  if (countyState.loading) return <LoadingState />
  if (countyState.error) return <ErrorState message={countyState.error} />
  const county = countyState.data
  if (!county) return null

  return (
    <>
      <PageHeader eyebrow="County registry / Configuration" title={county.name} description="Only confirmed official information should be saved. Empty fields remain explicitly unconfirmed." />
      {notice && <Card className="mb-5"><p className="text-sm text-[#c4c7cf]">{notice}</p></Card>}
      <form onSubmit={saveCounty} className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="w-full min-w-0">
          <h2 className="font-['Space_Grotesk'] text-lg font-semibold">Official configuration</h2>
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-5 [&_input]:min-w-0 [&_input]:max-w-full [&_label]:min-w-0 [&_label]:space-y-3">
            <Field label="Tax sale authority"><Input className="w-full" value={String(form.tax_sale_authority ?? '')} onChange={(e) => update('tax_sale_authority', e.target.value)} /></Field>
            <Field label="Official website (HTTPS only)"><Input className="w-full" type="url" value={String(form.official_website_url ?? '')} onChange={(e) => update('official_website_url', e.target.value)} /></Field>
            <Field label="Tax sale page"><Input className="w-full" type="url" value={String(form.tax_sale_page_url ?? '')} onChange={(e) => update('tax_sale_page_url', e.target.value)} /></Field>
            <Field label="Assessor"><Input className="w-full" type="url" value={String(form.assessor_url ?? '')} onChange={(e) => update('assessor_url', e.target.value)} /></Field>
            <Field label="GIS"><Input className="w-full" type="url" value={String(form.gis_url ?? '')} onChange={(e) => update('gis_url', e.target.value)} /></Field>
            <Field label="Clerk"><Input className="w-full" type="url" value={String(form.clerk_url ?? '')} onChange={(e) => update('clerk_url', e.target.value)} /></Field>
          </div>
        </Card>
        <Card className="w-full min-w-0">
          <h2 className="font-['Space_Grotesk'] text-lg font-semibold">Operational status</h2>
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-5 [&_input]:min-w-0 [&_input]:max-w-full [&_label]:min-w-0 [&_label]:space-y-3 [&_select]:min-w-0 [&_select]:max-w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full">
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-5">
              <Field label="Auction type"><Select className="w-full" value={String(form.auction_type ?? 'unknown')} onChange={(e) => update('auction_type', e.target.value)}><option value="unknown">Unknown</option><option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option></Select></Field>
              <Field label="Coverage status"><Select className="w-full" value={String(form.source_status ?? 'pending_manual_configuration')} onChange={(e) => update('source_status', e.target.value)}>{Object.entries(SOURCE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
            </div>
            <Field label="Typical schedule"><Input className="w-full" value={String(form.typical_schedule ?? '')} onChange={(e) => update('typical_schedule', e.target.value)} /></Field>
            <Field label="Payment rules"><Textarea className="w-full" value={String(form.payment_rules ?? '')} onChange={(e) => update('payment_rules', e.target.value)} /></Field>
            <Field label="Operational notes"><Textarea className="w-full" value={String(form.operational_notes ?? '')} onChange={(e) => update('operational_notes', e.target.value)} /></Field>
            <label className="flex min-w-0 items-center gap-3 text-sm text-[#b6bbc4]"><input type="checkbox" checked={Boolean(form.active)} onChange={(e) => update('active', e.target.checked)} /> Actively monitored</label>
          </div>
        </Card>
        <div className="min-w-0 xl:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save county'}</Button></div>
      </form>

      <div className="mt-9">
        <PageHeader eyebrow="County sources" title="Configured sources" description="A source entry records provenance and coverage; it does not imply that automated access is available." />
        {sourcesState.loading && <LoadingState />}
        {sourcesState.error && <ErrorState message={sourcesState.error} />}
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="min-w-0 space-y-3">
            {sourcesState.data?.length === 0 && <Card><p className="text-sm text-[#8b919f]">No source configured.</p></Card>}
            {sourcesState.data?.map((source) => {
              const sourceEdit = sourceEdits[source.id]
              const sourceMutation = sourceMutations[source.id]
              const deleteConfirmation = Boolean(sourceDeleteConfirmations[source.id])
              const sourceIsMutating = Boolean(sourceMutation)

              return (
                <Card key={source.id} className="min-w-0">
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{source.name}</h3>
                      <p className="mt-1 break-words text-xs text-[#78818e]">
                        {source.source_type} · <span className="break-all">{source.url ?? 'URL not configured'}</span>
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                      <Badge tone={source.status === 'active' ? 'good' : source.status === 'unavailable' ? 'danger' : 'warning'}>{SOURCE_STATUS_LABELS[source.status]}</Badge>
                      <SecondaryButton
                        type="button"
                        className="px-3 py-2"
                        disabled={sourceIsMutating}
                        aria-expanded={Boolean(sourceEdit)}
                        aria-controls={`source-edit-${source.id}`}
                        onClick={() => beginSourceEdit(source)}
                      >
                        Edit
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        className="border-[#ffb4ab]/40 px-3 py-2 text-[#ffb4ab] hover:border-[#ffb4ab] hover:text-[#ffd2cc]"
                        disabled={sourceIsMutating}
                        aria-expanded={deleteConfirmation}
                        aria-controls={`source-delete-${source.id}`}
                        onClick={() => beginSourceDelete(source.id)}
                      >
                        Delete
                      </SecondaryButton>
                    </div>
                  </div>

                  {sourceEdit && (
                    <form
                      id={`source-edit-${source.id}`}
                      onSubmit={(event) => saveSource(event, source.id)}
                      className="mt-5 grid min-w-0 grid-cols-1 gap-4 border-t border-[#2c3442] pt-5 md:grid-cols-2 [&_input]:min-w-0 [&_label]:min-w-0 [&_select]:min-w-0"
                    >
                      <Field label="Name"><Input className="w-full" required value={sourceEdit.name} onChange={(event) => updateSourceEdit(source.id, { name: event.target.value })} /></Field>
                      <Field label="Type">
                        <Select className="w-full" value={sourceEdit.source_type} onChange={(event) => updateSourceEdit(source.id, { source_type: event.target.value })}>
                          {!SOURCE_TYPE_OPTIONS.some((option) => option.value === sourceEdit.source_type) && <option value={sourceEdit.source_type}>{sourceEdit.source_type}</option>}
                          {SOURCE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </Select>
                      </Field>
                      <div className="min-w-0 md:col-span-2">
                        <Field label="Verified HTTPS URL"><Input className="w-full" type="url" value={sourceEdit.url} onChange={(event) => updateSourceEdit(source.id, { url: event.target.value })} /></Field>
                      </div>
                      <Field label="Status" hint="Active should only be used after the source has been operationally verified.">
                        <Select className="w-full" value={sourceEdit.status} onChange={(event) => updateSourceEdit(source.id, { status: event.target.value as CountyHunterSource['status'] })}>
                          {Object.entries(SOURCE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Coverage %">
                        <Input
                          className="w-full"
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          required
                          value={sourceEdit.coverage_percent}
                          onChange={(event) => updateSourceEdit(source.id, { coverage_percent: event.target.value })}
                        />
                      </Field>
                      <label className="flex min-w-0 items-center gap-3 text-sm text-[#b6bbc4] md:col-span-2">
                        <input type="checkbox" checked={sourceEdit.is_official} onChange={(event) => updateSourceEdit(source.id, { is_official: event.target.checked })} /> Official source
                      </label>
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row md:col-span-2">
                        <Button type="submit" disabled={sourceIsMutating}>{sourceMutation === 'saving' ? 'Saving…' : 'Save changes'}</Button>
                        <SecondaryButton type="button" disabled={sourceIsMutating} onClick={() => cancelSourceEdit(source.id)}>Cancel</SecondaryButton>
                      </div>
                    </form>
                  )}

                  {deleteConfirmation && (
                    <div id={`source-delete-${source.id}`} role="alert" className="mt-5 min-w-0 border-t border-[#ffb4ab]/20 pt-5">
                      <p className="text-sm leading-6 text-[#c8c9ce]">Delete this configured source? This removes the source record only. It does not run Discovery or modify the county configuration.</p>
                      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
                        <SecondaryButton type="button" disabled={sourceIsMutating} onClick={() => cancelSourceDelete(source.id)}>Cancel</SecondaryButton>
                        <SecondaryButton
                          type="button"
                          className="border-[#ffb4ab]/40 text-[#ffb4ab] hover:border-[#ffb4ab] hover:text-[#ffd2cc]"
                          disabled={sourceIsMutating}
                          onClick={() => deleteSource(source.id)}
                        >
                          {sourceMutation === 'deleting' ? 'Deleting…' : 'Delete source'}
                        </SecondaryButton>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
          <Card className="min-w-0">
            <h3 className="font-['Space_Grotesk'] font-semibold">Add source</h3>
            <form onSubmit={addSource} className="mt-4 min-w-0 space-y-4 [&_input]:min-w-0 [&_select]:min-w-0">
              <Field label="Name"><Input className="w-full" required value={sourceForm.name} onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} /></Field>
              <Field label="Type"><Select className="w-full" value={sourceForm.source_type} onChange={(e) => setSourceForm({ ...sourceForm, source_type: e.target.value })}>{SOURCE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
              <Field label="Verified HTTPS URL"><Input className="w-full" type="url" value={sourceForm.url} onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })} /></Field>
              <label className="flex items-center gap-3 text-sm text-[#b6bbc4]"><input type="checkbox" checked={sourceForm.is_official} onChange={(e) => setSourceForm({ ...sourceForm, is_official: e.target.checked })} /> Official source</label>
              <SecondaryButton type="submit" disabled={saving}>Add without crawling</SecondaryButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  )
}
