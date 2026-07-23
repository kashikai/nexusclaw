'use client'

import { useState } from 'react'
import { countyHunterApi } from '@/features/county-hunter/client/api'
import { Badge, Button, Card, PageHeader } from '@/features/county-hunter/components/ui'

export default function SettingsPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  async function provision() {
    setLoading(true); setMessage(null)
    try {
      const result = await countyHunterApi<{ counties_created: number }>('/bootstrap', { method: 'POST' })
      setMessage(`Provisioning completed. ${result.counties_created} county record(s) created; official URLs remain unconfigured.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Provisioning failed.') }
    finally { setLoading(false) }
  }
  return <><PageHeader title="Settings" description="Module-specific configuration only. Existing NexusClaw agents, wallets and on-chain settings are not changed." />
    {message && <Card className="mb-5"><p className="text-sm leading-6 text-[#c4c7cf]">{message}</p></Card>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><div className="flex items-center justify-between"><h2 className="font-['Space_Grotesk'] text-lg font-semibold">Georgia county seed</h2><Badge tone="info">Idempotent</Badge></div><p className="mt-3 text-sm leading-6 text-[#8b919f]">Creates Georgia and the six approved counties for the organization in the existing session. No source URLs, auction dates or rules are invented.</p><Button className="mt-5" onClick={provision} disabled={loading}>{loading ? 'Provisioning…' : 'Provision approved counties'}</Button></Card>
      <Card><h2 className="font-['Space_Grotesk'] text-lg font-semibold">Required shared claims</h2><p className="mt-3 text-sm leading-6 text-[#8b919f]">Supabase Auth app metadata must provide a valid <code className="text-[#abc7ff]">organization_id</code> and one or more County Hunter permissions. This module does not create or modify authentication.</p><div className="mt-4 flex flex-wrap gap-2"><Badge>county_hunter.view</Badge><Badge>county_hunter.manage</Badge><Badge>county_hunter.admin</Badge></div></Card>
    </div>
  </>
}
