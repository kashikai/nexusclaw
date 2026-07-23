'use client'

import { useEffect, useState, type FormEvent } from 'react'
import type { CountyHunterCounty, CountyHunterSource } from '@/features/county-hunter/types'
import { SOURCE_STATUS_LABELS } from '@/features/county-hunter/types'
import { countyHunterApi } from '@/features/county-hunter/client/api'
import { Badge, Button, Card, ErrorState, Field, Input, LoadingState, PageHeader, SecondaryButton, Select, Textarea } from '@/features/county-hunter/components/ui'
import { useCountyHunterData } from '@/features/county-hunter/components/useCountyHunterData'

type Props = { params: { countyId: string } }

export default function CountyDetailPage({ params }: Props) {
  const countyState = useCountyHunterData<CountyHunterCounty>(`/counties/${params.countyId}`)
  const sourcesState = useCountyHunterData<CountyHunterSource[]>(`/counties/${params.countyId}/sources`)
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sourceForm, setSourceForm] = useState({ name: '', source_type: 'tax_sale', url: '', is_official: true })

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
      const updated = await countyHunterApi<CountyHunterCounty>(`/counties/${params.countyId}`, { method: 'PATCH', body: JSON.stringify(form) })
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
      await countyHunterApi(`/counties/${params.countyId}/sources`, { method: 'POST', body: JSON.stringify(sourceForm) })
      setSourceForm({ name: '', source_type: 'tax_sale', url: '', is_official: true })
      await sourcesState.reload()
      setNotice('Source added. Automation has not been enabled.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to add source.')
    } finally { setSaving(false) }
  }

  if (countyState.loading) return <LoadingState />
  if (countyState.error) return <ErrorState message={countyState.error} />
  const county = countyState.data
  if (!county) return null

  return (
    <>
      <PageHeader eyebrow="County registry / Configuration" title={county.name} description="Only confirmed official information should be saved. Empty fields remain explicitly unconfirmed." />
      {notice && <Card className="mb-5"><p className="text-sm text-[#c4c7cf]">{notice}</p></Card>}
      <form onSubmit={saveCounty} className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-['Space_Grotesk'] text-lg font-semibold">Official configuration</h2>
          <Field label="Tax sale authority"><Input value={String(form.tax_sale_authority ?? '')} onChange={(e) => update('tax_sale_authority', e.target.value)} /></Field>
          <Field label="Official website (HTTPS only)"><Input type="url" value={String(form.official_website_url ?? '')} onChange={(e) => update('official_website_url', e.target.value)} /></Field>
          <Field label="Tax sale page"><Input type="url" value={String(form.tax_sale_page_url ?? '')} onChange={(e) => update('tax_sale_page_url', e.target.value)} /></Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Assessor"><Input type="url" value={String(form.assessor_url ?? '')} onChange={(e) => update('assessor_url', e.target.value)} /></Field>
            <Field label="GIS"><Input type="url" value={String(form.gis_url ?? '')} onChange={(e) => update('gis_url', e.target.value)} /></Field>
            <Field label="Clerk"><Input type="url" value={String(form.clerk_url ?? '')} onChange={(e) => update('clerk_url', e.target.value)} /></Field>
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-['Space_Grotesk'] text-lg font-semibold">Operational status</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Auction type"><Select value={String(form.auction_type ?? 'unknown')} onChange={(e) => update('auction_type', e.target.value)}><option value="unknown">Unknown</option><option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option></Select></Field>
            <Field label="Coverage status"><Select value={String(form.source_status ?? 'pending_manual_configuration')} onChange={(e) => update('source_status', e.target.value)}>{Object.entries(SOURCE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
          </div>
          <Field label="Typical schedule"><Input value={String(form.typical_schedule ?? '')} onChange={(e) => update('typical_schedule', e.target.value)} /></Field>
          <Field label="Payment rules"><Textarea value={String(form.payment_rules ?? '')} onChange={(e) => update('payment_rules', e.target.value)} /></Field>
          <Field label="Operational notes"><Textarea value={String(form.operational_notes ?? '')} onChange={(e) => update('operational_notes', e.target.value)} /></Field>
          <label className="flex items-center gap-3 text-sm text-[#b6bbc4]"><input type="checkbox" checked={Boolean(form.active)} onChange={(e) => update('active', e.target.checked)} /> Actively monitored</label>
        </Card>
        <div className="xl:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save county'}</Button></div>
      </form>

      <div className="mt-9">
        <PageHeader eyebrow="County sources" title="Configured sources" description="A source entry records provenance and coverage; it does not imply that automated access is available." />
        {sourcesState.loading && <LoadingState />}
        {sourcesState.error && <ErrorState message={sourcesState.error} />}
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            {sourcesState.data?.length === 0 && <Card><p className="text-sm text-[#8b919f]">No source configured.</p></Card>}
            {sourcesState.data?.map((source) => (
              <Card key={source.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-semibold">{source.name}</h3><p className="mt-1 text-xs text-[#78818e]">{source.source_type} · {source.url ?? 'URL not configured'}</p></div>
                  <Badge tone={source.status === 'active' ? 'good' : source.status === 'unavailable' ? 'danger' : 'warning'}>{SOURCE_STATUS_LABELS[source.status]}</Badge>
                </div>
              </Card>
            ))}
          </div>
          <Card>
            <h3 className="font-['Space_Grotesk'] font-semibold">Add source</h3>
            <form onSubmit={addSource} className="mt-4 space-y-4">
              <Field label="Name"><Input required value={sourceForm.name} onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} /></Field>
              <Field label="Type"><Select value={sourceForm.source_type} onChange={(e) => setSourceForm({ ...sourceForm, source_type: e.target.value })}><option value="tax_sale">Tax sale</option><option value="assessor">Assessor</option><option value="gis">GIS</option><option value="clerk">Clerk</option><option value="legal_newspaper">Legal newspaper</option><option value="other">Other</option></Select></Field>
              <Field label="Verified HTTPS URL"><Input type="url" value={sourceForm.url} onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })} /></Field>
              <label className="flex items-center gap-3 text-sm text-[#b6bbc4]"><input type="checkbox" checked={sourceForm.is_official} onChange={(e) => setSourceForm({ ...sourceForm, is_official: e.target.checked })} /> Official source</label>
              <SecondaryButton type="submit" disabled={saving}>Add without crawling</SecondaryButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  )
}
